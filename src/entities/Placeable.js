import Phaser from 'phaser';
import { State, Events, toast, addItem, totalCount, removeAcross } from '../systems/GameState.js';
import { ITEMS } from '../data/items.js';
import { makeInv } from '../systems/GameState.js';

// Generic placed object. Some interact (chest open, fogueira light, water tank give water).
const SPEC = {
  campfire:   { texture:'campfire',    label:'Fogueira',         interact:'cook',     origin:[0.5,1] },
  chest:      { texture:'chest',       label:'Caixa',            interact:'chest',    origin:[0.5,1] },
  water_tank: { texture:'water_tank',  label:'Reservatório',     interact:'water',    origin:[0.5,1] },
  small_gen:  { texture:'small_gen',   label:'Gerador Pequeno',  interact:'gen',      origin:[0.5,1] },
  planter:    { texture:'planter',     label:'Canteiro',         interact:'plant',    origin:[0.5,1] },
  floor_tile: { texture:'floor_tile',  label:'Piso',             interact:null,       origin:[0.5,0.5], passable:true },
  wall_tile:  { texture:'wall_tile',   label:'Parede',           interact:null,       origin:[0.5,0.5], blocking:true },
  lab_bench:  { texture:'lab_bench',   label:'Bancada de Lab',   interact:'research', origin:[0.5,1] },
};

export default class Placeable extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, kind) {
    const s = SPEC[kind];
    super(scene, x, y, s.texture);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.kind = kind;
    this.spec = s;
    this.setOrigin(...s.origin);
    if (s.origin[1] === 1) { this.y = y + 16; }
    this.setDepth(this.y || y);
    // Storage (only for chests)
    this.storage = kind === 'chest' ? makeInv(12) : null;
    // For fogueira: lit?
    this.lit = (kind === 'campfire');
    if (kind === 'campfire') {
      this.fireGlow = scene.add.sprite(x, y - 8, 'glow').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7).setScale(1.2).setDepth(this.y - 1);
      scene.tweens.add({ targets: this.fireGlow, alpha: 0.5, scale: 1.3, duration: 800, yoyo: true, repeat: -1 });
    }
    if (kind === 'small_gen') {
      this.energyTimer = 0;
    }
    if (s.passable) { this.body.checkCollision.none = true; }
    // Body covers footprint
    if (!s.passable) {
      const bw = Math.min(this.width - 4, 28);
      const bh = Math.min(12, this.height/2);
      this.body.setSize(bw, bh);
      this.body.setOffset((this.width - bw)/2, this.height - bh - 2);
    }
  }

  interact(scene, player) {
    switch (this.spec.interact) {
      case 'chest':
        scene.scene.launch('InventoryScene', { chest: this });
        scene.scene.pause('WorldScene');
        return;
      case 'water':
        if (totalCount('water') >= 99) { toast('Estoque de água cheio'); return; }
        addItem(State.inventory, 'water', 2);
        toast('+2 Água Filtrada', '#a0d0f0');
        return;
      case 'cook':
        // Open crafting filtered to fogueira recipes
        scene.scene.launch('CraftingScene', { needs: 'campfire' });
        scene.scene.pause('WorldScene');
        return;
      case 'gen':
        // Each small gen contributes to world energy gradually (also lets player charge cells)
        toast('Gerador ligado, energia local', '#cfe8a0');
        return;
      case 'plant':
        // Open seed picker -> plant into canteiro
        scene.tryPlantAt(this.x, this.y, true);
        return;
      case 'research':
        // Mark lab as built so research is available, then open research scene
        State.research.labBuilt = true;
        scene.scene.launch('ResearchScene');
        scene.scene.pause('WorldScene');
        return;
    }
  }
}
