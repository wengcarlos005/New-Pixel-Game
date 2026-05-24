import Phaser from 'phaser';
import { TILE, WORLD, DAY_LENGTH_MS } from '../config/GameConfig.js';
import { T, SOLID } from '../data/tiles.js';
import { buildMap, SPAWNS, PLAYER_SPAWN } from '../data/map.js';
import { ITEMS } from '../data/items.js';
import { State, Events, toast, addItem, removeItem, removeAcross, totalCount, pickup, startingInventory, activeTool, activeSlot, timeOfDay, researchDayTick } from '../systems/GameState.js';
import Player from '../entities/Player.js';
import NPC from '../entities/NPC.js';
import ResourceNode from '../entities/ResourceNode.js';
import Crop from '../entities/Crop.js';
import Placeable from '../entities/Placeable.js';
import Generator from '../entities/Generator.js';

export default class WorldScene extends Phaser.Scene {
  constructor() { super('WorldScene'); }

  create() {
    startingInventory();

    this.gridTiles = buildMap(); // 2D array [row][col]
    this.cropsByKey = {};        // key = `${tx},${ty}`
    this.placeablesByKey = {};

    // Build a Phaser tilemap from a flat array
    const data = this.gridTiles.map(r => r.slice());
    this.map = this.make.tilemap({
      data,
      tileWidth: TILE, tileHeight: TILE,
    });
    const tileset = this.map.addTilesetImage('terrain', 'terrain', TILE, TILE, 0, 0);
    this.tileLayer = this.map.createLayer(0, tileset, 0, 0);

    // Collision for solid tiles
    this.tileLayer.setCollision([T.WATER_BAD, T.WATER_CLEAN]);

    // Groups
    this.resources  = this.physics.add.staticGroup();
    this.placeables = this.physics.add.staticGroup();
    this.npcs       = this.physics.add.group();
    this.crops      = this.add.group();
    this.interactables = []; // list of {x,y,interact(scene)}

    this.spawnFromList();

    // Player
    this.player = new Player(this, PLAYER_SPAWN.x, PLAYER_SPAWN.y);

    // Camera
    const worldW = WORLD.cols * TILE, worldH = WORLD.rows * TILE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player, true, 0.18, 0.18);
    this.cameras.main.setZoom(1.6);

    // Collisions
    this.physics.add.collider(this.player, this.tileLayer);
    this.physics.add.collider(this.player, this.resources);
    this.physics.add.collider(this.player, this.placeables);
    this.physics.add.collider(this.npcs, this.tileLayer);
    this.physics.add.collider(this.npcs, this.resources);
    this.physics.add.collider(this.npcs, this.placeables);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd    = this.input.keyboard.addKeys('W,A,S,D');
    this.keys    = this.input.keyboard.addKeys('E,I,C,B,ESC,ONE,TWO,THREE,FOUR,FIVE,SIX');
    this.shift   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    // Hotkey: 1-6 picks hotbar
    this.input.keyboard.on('keydown-ONE',   () => this.setHotbar(0));
    this.input.keyboard.on('keydown-TWO',   () => this.setHotbar(1));
    this.input.keyboard.on('keydown-THREE', () => this.setHotbar(2));
    this.input.keyboard.on('keydown-FOUR',  () => this.setHotbar(3));
    this.input.keyboard.on('keydown-FIVE',  () => this.setHotbar(4));
    this.input.keyboard.on('keydown-SIX',   () => this.setHotbar(5));

    this.input.keyboard.on('keydown-E', () => this.interactKey());
    this.input.keyboard.on('keydown-I', () => this.openInventory());
    this.input.keyboard.on('keydown-C', () => this.openCrafting());
    this.input.keyboard.on('keydown-B', () => this.openBuild());
    this.input.keyboard.on('keydown-R', () => this.openResearch());
    this.input.keyboard.on('keydown-ESC', () => this.openPause());

    // Right-click eats from hotbar food
    this.input.on('pointerdown', (p) => {
      if (p.rightButtonDown()) this.tryUseHotbar();
    });

    // Tinted night overlay (full-screen overlay scaled to camera)
    this.darkness = this.add.rectangle(worldW/2, worldH/2, worldW, worldH, 0x0a0a18, 0.0).setDepth(99999);

    // Lights container — placed entities can register a glow
    this.lightSprites = [];

    // Energy & world progression: listen
    Events.on('energy:online', () => this.onEnergyOnline());

    // Tick timers
    this.npcsTick = 0;
    this.cropTick = 0;

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  spawnFromList() {
    for (const s of SPAWNS) {
      if (s.type === 'tree' || s.type === 'rock' || s.type === 'scrap' || s.type === 'fiber' || s.type === 'ruin') {
        const node = new ResourceNode(this, s.x, s.y, s.type);
        this.resources.add(node);
        this.interactables.push({ obj: node, kind: s.type });
      } else if (s.type === 'npc') {
        const npc = new NPC(this, s.x, s.y, s.kind, s.name);
        this.npcs.add(npc);
        State.npcs.push(npc);
        this.interactables.push({ obj: npc, kind: 'npc' });
      } else if (s.type === 'generator') {
        const g = new Generator(this, s.x, s.y);
        this.placeables.add(g);
        this.generator = g;
        this.interactables.push({ obj: g, kind: 'generator' });
      } else if (s.type === 'chest_loot') {
        // Pre-populated chest (loot chest in world)
        const place = new Placeable(this, s.x, s.y - 16, 'chest');
        this.placeables.add(place);
        const tx = Math.floor(s.x / 32), ty = Math.floor(s.y / 32);
        this.placeablesByKey[`${tx},${ty}`] = place;
        this.interactables.push({ obj: place, kind: 'placed' });
        // Fill with loot
        if (s.items && place.storage) {
          for (const item of s.items) {
            addItem(place.storage, item.id, item.qty);
          }
        }
      }
    }
  }

  setHotbar(i) {
    State.hotbarIndex = i;
    Events.emit('hotbar:changed');
  }

  // ---------------------------------------------------------------- INTERACTION
  interactKey() {
    const { tx, ty, wx, wy } = this.player.facingTile();
    // 1) NPC right in front?
    const npc = this.findNearestNPC(wx, wy, 36);
    if (npc) {
      this.scene.launch('DialogueScene', { npc });
      this.scene.pause('WorldScene');
      return;
    }
    // 2) ResourceNode / Generator / Placeable
    let best = null, bestD = Infinity;
    for (const it of this.interactables) {
      const o = it.obj;
      if (!o || !o.active) continue;
      const d = Phaser.Math.Distance.Between(wx, wy, o.x, o.y - 8);
      if (d < 30 && d < bestD) { best = it; bestD = d; }
    }
    if (best) {
      const o = best.obj;
      const tool = activeTool();
      switch (best.kind) {
        case 'tree': case 'rock': case 'scrap': case 'fiber': case 'ruin':
          o.tryHarvest(tool);
          return;
        case 'generator':
          o.interact(this);
          return;
        case 'placed':
          o.interact(this, this.player);
          return;
      }
    }

    // 3) Crop right at facing tile?
    const cropKey = `${tx},${ty}`;
    if (this.cropsByKey[cropKey]) {
      this.cropsByKey[cropKey].harvest() && delete this.cropsByKey[cropKey];
      return;
    }

    // 4) Tile-based actions (hoe, water, plant)
    this.tileAction(tx, ty);
  }

  tileAction(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= WORLD.cols || ty >= WORLD.rows) return;
    const tile = this.gridTiles[ty][tx];
    const tool = activeTool();
    const slot = activeSlot();
    const def  = slot ? ITEMS[slot.id] : null;

    // Hoe: dirt -> tilled
    if (tool === 'hoe') {
      if (tile === T.DIRT || tile === T.GRASS_DRY || tile === T.GRASS_LUSH || tile === T.GRAVEL || tile === T.ASH) {
        this.setTile(tx, ty, T.SOIL_TILL);
        toast('Terra preparada', '#a0d8a0');
      } else if (tile === T.SOIL_TILL || tile === T.SOIL_WET) {
        toast('Já está preparada');
      } else {
        toast('Não dá pra arar aqui', '#e0a0a0');
      }
      return;
    }

    // Watering can: tilled -> wet, OR water nearby crop
    if (tool === 'water') {
      // Refill if standing on water clean tile
      if (tile === T.WATER_CLEAN) {
        addItem(State.inventory, 'water', 3);
        toast('+3 Água', '#a0d0f0'); return;
      }
      if (tile === T.WATER_BAD) {
        toast('A água está contaminada', '#e0a0a0'); return;
      }
      // Water tilled soil
      if (tile === T.SOIL_TILL) {
        if (!removeAcross('water', 1)) { toast('Sem água', '#e0a0a0'); return; }
        this.setTile(tx, ty, T.SOIL_WET);
        const c = this.cropsByKey[`${tx},${ty}`];
        if (c) c.water();
        toast('Regado', '#a0d0f0');
        return;
      }
      if (tile === T.SOIL_WET) {
        const c = this.cropsByKey[`${tx},${ty}`];
        if (c && c.water()) { removeAcross('water', 1); toast('Regado', '#a0d0f0'); }
        else toast('Já está úmido');
        return;
      }
      toast('Você precisa estar perto de água ou terra arada', '#e0a0a0');
      return;
    }

    // Seed planting
    if (def && def.kind === 'seed') {
      if (tile !== T.SOIL_TILL && tile !== T.SOIL_WET) {
        toast('Plante em terra arada', '#e0a0a0'); return;
      }
      if (this.cropsByKey[`${tx},${ty}`]) {
        toast('Já tem algo plantado aqui', '#e0a0a0'); return;
      }
      this.plantSeedAt(tx, ty, def.crop);
      removeAcross(slot.id, 1);
      return;
    }

    // Default: collect water by hand if standing next to clean water
    if (tile === T.WATER_CLEAN) {
      addItem(State.inventory, 'water', 1);
      toast('+1 Água', '#a0d0f0');
      return;
    }

    // No-op
  }

  plantSeedAt(tx, ty, crop) {
    const wx = tx * TILE + TILE/2, wy = ty * TILE + TILE/2;
    const c = new Crop(this, wx, wy, crop);
    this.cropsByKey[`${tx},${ty}`] = c;
    toast('Plantado', '#a0d8a0');
  }

  tryPlantAt(wx, wy, force=false) {
    // Used by canteiro placeable. Picks first seed in inventory.
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);
    const seeds = ['seed_potato','seed_wheat','seed_mushroom'];
    for (const s of seeds) {
      if (totalCount(s) > 0) {
        if (this.cropsByKey[`${tx},${ty}`]) { toast('Já plantado'); return; }
        this.plantSeedAt(tx, ty, ITEMS[s].crop);
        removeAcross(s, 1);
        return;
      }
    }
    toast('Sem sementes', '#e0a0a0');
  }

  setTile(tx, ty, idx) {
    this.gridTiles[ty][tx] = idx;
    this.tileLayer.putTileAt(idx, tx, ty);
  }

  findNearestNPC(wx, wy, range) {
    let best = null, bestD = range;
    for (const n of State.npcs) {
      const d = Phaser.Math.Distance.Between(wx, wy, n.x, n.y);
      if (d < bestD) { best = n; bestD = d; }
    }
    return best;
  }

  // ---------------------------------------------------------------- HOTBAR USE (right-click)
  tryUseHotbar() {
    const slot = activeSlot();
    if (!slot) return;
    const def = ITEMS[slot.id];
    if (def && def.kind === 'food') {
      removeAcross(slot.id, 1);
      this.player.eat(def.hunger || 15);
    } else if (def && def.kind === 'medicine') {
      removeAcross(slot.id, 1);
      const heal = def.heal || 40;
      this.player.heal(heal);
      toast(`+${heal} HP`, '#80e080');
    }
  }

  // ---------------------------------------------------------------- MENUS
  openInventory() { this.scene.launch('InventoryScene'); this.scene.pause('WorldScene'); }
  openCrafting()  { this.scene.launch('CraftingScene');  this.scene.pause('WorldScene'); }
  openBuild()     { this.scene.launch('BuildScene');     this.scene.pause('WorldScene'); }
  openResearch()  { this.scene.launch('ResearchScene');  this.scene.pause('WorldScene'); }
  openPause()     { this.scene.launch('PauseScene');     this.scene.pause('WorldScene'); }

  // ---------------------------------------------------------------- BUILD CALL
  // Called from BuildScene with a kind (e.g., 'campfire') after recipe paid.
  enterPlacement(kind) {
    this.placementKind = kind;
    this.placementGhost = this.add.image(this.player.x, this.player.y, getTextureForKind(kind))
      .setAlpha(0.55).setDepth(100000).setOrigin(0.5, 1);
    if (this.placementGhost.texture.key !== 'wall_tile' && this.placementGhost.texture.key !== 'floor_tile') {
      this.placementGhost.y += 16;
    } else {
      this.placementGhost.setOrigin(0.5);
    }
    toast('Clique para posicionar — ESC para cancelar', '#e6c98a');
    this.input.on('pointermove', this.movePlacement, this);
    this.input.on('pointerdown', this.confirmPlacement, this);
    this.input.keyboard.once('keydown-ESC', () => this.cancelPlacement());
  }

  movePlacement(p) {
    if (!this.placementGhost) return;
    const wx = this.cameras.main.worldView.x + p.x / this.cameras.main.zoom;
    const wy = this.cameras.main.worldView.y + p.y / this.cameras.main.zoom;
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    this.placementGhost.x = tx * TILE + TILE/2;
    this.placementGhost.y = ty * TILE + TILE/2 + (this.placementGhost.originY === 1 ? 16 : 0);
  }

  confirmPlacement(p) {
    if (!this.placementGhost) return;
    if (p.rightButtonDown()) { this.cancelPlacement(); return; }
    const wx = this.placementGhost.x;
    const wy = this.placementGhost.y - (this.placementGhost.originY === 1 ? 16 : 0);
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    if (tx < 0 || ty < 0 || tx >= WORLD.cols || ty >= WORLD.rows) return;
    // No overlap
    const key = `${tx},${ty}`;
    if (this.placeablesByKey[key]) { toast('Espaço ocupado', '#e0a0a0'); return; }
    // Place
    if (this.placementKind === 'floor_tile') {
      // floor: actually swap tile to METAL_CLEAN / floor-style
      this.setTile(tx, ty, T.METAL_CLEAN);
    } else if (this.placementKind === 'wall_tile') {
      // wall: tile becomes gravel + place a wall as static placeable
      const place = new Placeable(this, tx*TILE+TILE/2, ty*TILE+TILE/2 - 16, 'wall_tile');
      this.placeables.add(place);
      this.placeablesByKey[key] = place;
      this.interactables.push({ obj: place, kind: 'placed' });
    } else {
      const place = new Placeable(this, tx*TILE+TILE/2, ty*TILE+TILE/2 - 16, this.placementKind);
      this.placeables.add(place);
      this.placeablesByKey[key] = place;
      this.interactables.push({ obj: place, kind: 'placed' });
    }
    toast('Posicionado', '#cfe8a0');
    this.cancelPlacement();
  }

  cancelPlacement() {
    if (this.placementGhost) { this.placementGhost.destroy(); this.placementGhost = null; }
    this.input.off('pointermove', this.movePlacement, this);
    this.input.off('pointerdown', this.confirmPlacement, this);
    this.placementKind = null;
  }

  // ---------------------------------------------------------------- ENERGY EVENT
  onEnergyOnline() {
    // Swap dry grass tiles to lush grass progressively (cinematic)
    let count = 0;
    for (let r = 0; r < WORLD.rows; r++) {
      for (let c = 0; c < WORLD.cols; c++) {
        if (this.gridTiles[r][c] === T.GRASS_DRY) {
          this.time.delayedCall(count * 25, () => {
            this.setTile(c, r, T.GRASS_LUSH);
          });
          count++;
        }
        if (this.gridTiles[r][c] === T.WATER_BAD) {
          this.time.delayedCall(count * 25, () => this.setTile(c, r, T.WATER_CLEAN));
          count++;
        }
        if (this.gridTiles[r][c] === T.METAL) {
          this.time.delayedCall(count * 18, () => this.setTile(c, r, T.METAL_CLEAN));
          count++;
        }
      }
    }
    // Replace dead trees with lush trees gradually
    this.resources.children.iterate((node) => {
      if (!node) return;
      if (node.kind === 'tree') {
        this.time.delayedCall(Math.random() * 3000 + 600, () => {
          if (!node.active) return;
          node.setTexture('tree_lush');
        });
      }
    });

    // Spawn new survivor
    this.time.delayedCall(4000, () => this.spawnNewSurvivor());
  }

  spawnNewSurvivor() {
    const kinds = ['farmer','mechanic','explorer'];
    const kind = kinds[Phaser.Math.Between(0, kinds.length-1)];
    const names = ['Vex','Iolanda','Renzo','Marit','Kaen'];
    const name = names[Phaser.Math.Between(0, names.length-1)] + ' (Sobrevivente)';
    const x = 22*TILE + Phaser.Math.Between(-32, 64);
    const y = 20*TILE + Phaser.Math.Between(-32, 64);
    const npc = new NPC(this, x, y, kind, name);
    this.npcs.add(npc);
    State.npcs.push(npc);
    this.interactables.push({ obj: npc, kind: 'npc' });
    toast(`${name} chegou à colônia!`, '#fff0a0');
  }

  // ---------------------------------------------------------------- UPDATE
  update(time, delta) {
    if (this.placementKind) {
      // Don't move player while placing
      this.player.setVelocity(0, 0);
    } else {
      this.player.update(delta / 1000, this.cursors, this.wasd, this.shift);
    }

    // NPCs tick
    this.npcsTick += delta;
    if (this.npcsTick > 16) {
      const dt = this.npcsTick / 1000;
      this.npcs.children.iterate(n => { if (n) n.update(dt); });
      this.npcsTick = 0;
    }

    // Crops grow
    this.cropTick += delta;
    if (this.cropTick > 250) {
      for (const k in this.cropsByKey) this.cropsByKey[k].tick(this.cropTick);
      this.cropTick = 0;
    }

    // Day/night
    State.dayMs += delta;
    if (State.dayMs >= DAY_LENGTH_MS) {
      State.dayMs -= DAY_LENGTH_MS;
      State.dayCount += 1;
      toast(`Dia ${State.dayCount}`, '#e6c98a');
      // Daily NPC consumption
      this.npcsDailyEat();
      // Research tick
      researchDayTick();
    }
    this.applyDayNightTint();
  }

  npcsDailyEat() {
    // Each NPC eats one meal or crop per day. If nothing → lose hunger sharply.
    for (const n of State.npcs) {
      let fed = false;
      for (const id of ['meal','crop_potato','crop_wheat','crop_mushroom']) {
        if (totalCount(id) > 0) {
          removeAcross(id, 1);
          n.hunger = Math.min(100, n.hunger + (ITEMS[id].hunger || 20));
          fed = true; break;
        }
      }
      if (!fed) {
        n.hunger = Math.max(0, n.hunger - 30);
        n.morale = Math.max(0, n.morale - 20);
        toast(`${n.shortName()} passou fome!`, '#e0a0a0');
      }
    }
  }

  applyDayNightTint() {
    const t = timeOfDay(); // 0..1
    let alpha;
    // 0 sunrise -> 0.25 noon -> 0.5 sunset -> 0.75 night -> 1 sunrise
    if (t < 0.20)      alpha = Phaser.Math.Linear(0.55, 0.05, t / 0.20);          // pre-dawn → day
    else if (t < 0.45) alpha = 0.05;                                                // day
    else if (t < 0.55) alpha = Phaser.Math.Linear(0.05, 0.40, (t - 0.45) / 0.10);  // sunset
    else if (t < 0.75) alpha = Phaser.Math.Linear(0.40, 0.68, (t - 0.55) / 0.20);  // night
    else               alpha = Phaser.Math.Linear(0.68, 0.55, (t - 0.75) / 0.25);  // late night
    // Energy reduces darkness
    if (State.energyOnline) alpha = Math.min(alpha, 0.30);
    this.darkness.setFillStyle(State.energyOnline ? 0x0c1426 : 0x070a14, alpha);
  }
}

function getTextureForKind(kind) {
  const map = {
    campfire:'campfire', chest:'chest', water_tank:'water_tank',
    small_gen:'small_gen', planter:'planter',
    floor_tile:'floor_tile', wall_tile:'wall_tile',
    lab_bench:'lab_bench',
  };
  return map[kind] || 'chest';
}
