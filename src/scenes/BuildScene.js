import Phaser from 'phaser';
import { State, totalCount, removeAcross, toast } from '../systems/GameState.js';
import { ITEMS } from '../data/items.js';
import { RECIPES } from '../data/recipes.js';


// BuildScene = crafting filtered to placeable recipes
export default class BuildScene extends Phaser.Scene {
  constructor() { super('BuildScene'); }

  create() {
    const w = this.scale.width, h = this.scale.height;
    this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.55);
    const pw = 720, ph = 420;
    const px = w/2 - pw/2, py = h/2 - ph/2;
    this.add.rectangle(w/2, h/2, pw, ph, 0x10141c, 0.96).setStrokeStyle(2, 0x4a5260);
    this.add.text(w/2, py + 18, 'CONSTRUÇÃO', { fontFamily:'monospace', fontSize:'18px', color:'#e6c98a' }).setOrigin(0.5);

    const completed = State.research ? State.research.completed : [];
    const placeables = RECIPES.filter(r => r.kind === 'placeable' && (!r.tech || completed.includes(r.tech)));
    placeables.forEach((r, i) => {
      const cols = 3, col = i % cols, row = Math.floor(i / cols);
      const cellW = 220, cellH = 120;
      const x = px + 30 + col * (cellW + 10);
      const y = py + 56 + row * (cellH + 10);

      const bg = this.add.rectangle(x, y, cellW, cellH, 0x1a1f28).setOrigin(0).setStrokeStyle(1, 0x33394a)
        .setInteractive({ useHandCursor: true });

      // Preview
      const tex = previewKey(r.result.kind);
      this.add.image(x + 36, y + 60, tex).setOrigin(0.5).setScale(1.0);

      this.add.text(x + 76, y + 12, r.name, { fontFamily:'monospace', fontSize:'14px', color:'#cfd6df' });
      const costs = Object.entries(r.cost).map(([k, v]) => `${ITEMS[k].name} x${v} (${totalCount(k)})`).join('\n');
      const ok = canAfford(r);
      this.add.text(x + 76, y + 36, costs, {
        fontFamily:'monospace', fontSize:'11px',
        color: ok ? '#a0e0a0' : '#e0a0a0'
      });

      bg.on('pointerdown', () => {
        if (!canAfford(r)) { toast('Sem recursos', '#e0a0a0'); return; }
        for (const [k, v] of Object.entries(r.cost)) removeAcross(k, v);
        this.scene.stop();
        this.scene.resume('WorldScene');
        const world = this.scene.get('WorldScene');
        world.enterPlacement(r.result.kind);
      });
    });

    this.add.text(w/2, py + ph - 18, 'ESC fecha · Clique para escolher e posicionar', {
      fontFamily:'monospace', fontSize:'11px', color:'#8a93a2'
    }).setOrigin(0.5);
    this.input.keyboard.on('keydown-ESC', () => this.closeMe());
    this.input.keyboard.on('keydown-B',   () => this.closeMe());
  }

  closeMe() { this.scene.stop(); this.scene.resume('WorldScene'); }
}

function canAfford(r) {
  for (const [k, v] of Object.entries(r.cost)) if (totalCount(k) < v) return false;
  return true;
}
function previewKey(kind) {
  const map = {
    campfire:'campfire', chest:'chest', water_tank:'water_tank',
    small_gen:'small_gen', planter:'planter',
    floor_tile:'floor_tile', wall_tile:'wall_tile',
    lab_bench:'lab_bench',
  };
  return map[kind] || 'chest';
}
