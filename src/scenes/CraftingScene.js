import Phaser from 'phaser';
import { State, Events, addItem, removeAcross, totalCount, toast } from '../systems/GameState.js';
// Filter: recipe with .tech field only shows if that tech is in research.completed
import { ITEMS } from '../data/items.js';
import { RECIPES } from '../data/recipes.js';

export default class CraftingScene extends Phaser.Scene {
  constructor() { super('CraftingScene'); }
  init(data) { this.filter = data && data.needs ? data.needs : null; }

  create() {
    const w = this.scale.width, h = this.scale.height;
    this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.55);

    const pw = 720, ph = 460;
    const px = w/2 - pw/2, py = h/2 - ph/2;
    this.add.rectangle(w/2, h/2, pw, ph, 0x10141c, 0.96).setStrokeStyle(2, 0x4a5260);
    this.add.text(w/2, py + 18, this.filter ? `CRAFT — ${this.filter.toUpperCase()}` : 'CRAFT', {
      fontFamily:'monospace', fontSize:'18px', color:'#e6c98a'
    }).setOrigin(0.5);

    // List recipes (filter by campfire needs AND tech unlock)
    const completed = State.research ? State.research.completed : [];
    const recipes = RECIPES.filter(r => {
      if (r.kind === 'placeable') return false; // placeable handled by BuildScene
      if (this.filter && r.needs !== this.filter) return false;
      if (!this.filter && r.needs) return false; // campfire recipes shown only at campfire
      if (r.tech && !completed.includes(r.tech)) return false;
      return true;
    });
    this.rows = [];
    const rowH = 40, startY = py + 56;
    recipes.forEach((r, i) => {
      const y = startY + i * rowH;
      const bg = this.add.rectangle(px + 24, y, pw - 48, rowH - 4, 0x1a1f28, 0.85)
        .setOrigin(0).setStrokeStyle(1, 0x33394a).setInteractive({ useHandCursor: true });

      // Recipe name
      this.add.text(px + 36, y + 8, r.name, { fontFamily:'monospace', fontSize:'14px', color:'#cfd6df' });

      // Cost text
      const costs = Object.entries(r.cost).map(([k, v]) => `${ITEMS[k].name} x${v} (${totalCount(k)})`).join('  ·  ');
      const ok = canAfford(r);
      this.add.text(px + 240, y + 10, costs, {
        fontFamily:'monospace', fontSize:'12px', color: ok ? '#a0e0a0' : '#e0a0a0'
      });

      // Craft button
      const btn = this.add.rectangle(px + pw - 70, y + rowH/2 - 2, 90, 26, ok ? 0x2a4636 : 0x3a2828)
        .setStrokeStyle(1, ok ? 0x4c8a60 : 0x8a4040)
        .setInteractive({ useHandCursor: ok });
      this.add.text(px + pw - 70, y + rowH/2 - 2, ok ? 'Craftar' : '...', {
        fontFamily:'monospace', fontSize:'12px', color: ok ? '#cfe8a0' : '#e0a0a0'
      }).setOrigin(0.5);
      btn.on('pointerdown', () => {
        if (!canAfford(r)) { toast('Sem recursos', '#e0a0a0'); return; }
        // Pay
        for (const [k, v] of Object.entries(r.cost)) removeAcross(k, v);
        // Result
        if (r.kind === 'item') {
          for (const [k, v] of Object.entries(r.result)) {
            const left = addItem(State.hotbar, k, v);
            if (left > 0) addItem(State.inventory, k, left);
          }
          toast(`Criou: ${r.name}`, '#cfe8a0');
          this.scene.restart({ needs: this.filter });
        } else if (r.kind === 'placeable') {
          // Enter placement mode in WorldScene
          this.scene.stop();
          this.scene.resume('WorldScene');
          const world = this.scene.get('WorldScene');
          world.enterPlacement(r.result.kind);
        }
      });
    });

    this.add.text(w/2, py + ph - 18, 'ESC fecha · Posicione próximo aos materiais', {
      fontFamily:'monospace', fontSize:'11px', color:'#8a93a2'
    }).setOrigin(0.5);
    this.input.keyboard.on('keydown-ESC', () => this.closeMe());
    this.input.keyboard.on('keydown-C',   () => this.closeMe());
  }

  closeMe() { this.scene.stop(); this.scene.resume('WorldScene'); }
}

function canAfford(r) {
  for (const [k, v] of Object.entries(r.cost)) {
    if (totalCount(k) < v) return false;
  }
  return true;
}
