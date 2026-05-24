import Phaser from 'phaser';
import { State, Events, addItem } from '../systems/GameState.js';
import { ITEMS } from '../data/items.js';

export default class InventoryScene extends Phaser.Scene {
  constructor() { super('InventoryScene'); }

  init(data) { this.chest = data && data.chest ? data.chest : null; }

  create() {
    const w = this.scale.width, h = this.scale.height;
    // dim
    this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.55);

    const panelW = this.chest ? 720 : 480;
    const panelH = 380;
    const px = w/2 - panelW/2, py = h/2 - panelH/2;
    this.add.rectangle(w/2, h/2, panelW, panelH, 0x10141c, 0.96).setStrokeStyle(2, 0x4a5260);

    // Title
    this.add.text(w/2, py + 18, this.chest ? 'INVENTÁRIO  ↔  CAIXA' : 'INVENTÁRIO', {
      fontFamily:'monospace', fontSize:'18px', color:'#e6c98a'
    }).setOrigin(0.5);

    // Inventory grid (left)
    const invX = px + 24, invY = py + 56;
    this.drawGrid('Bolsa', invX, invY, 6, 4, State.inventory, 'inv');

    // Chest grid (right)
    if (this.chest) {
      const chX = px + panelW - 24 - 6 * 44;
      this.drawGrid('Caixa', chX, invY, 6, 2, this.chest.storage, 'chest');
    }

    // Hotbar (bottom)
    this.add.text(invX, py + panelH - 84, 'Hotbar', { fontFamily:'monospace', fontSize:'12px', color:'#cfd6df' });
    this.drawGrid(null, invX, py + panelH - 68, 6, 1, State.hotbar, 'hot');

    // Tooltip
    this.tip = this.add.text(0, 0, '', {
      fontFamily:'monospace', fontSize:'12px', color:'#cfd6df',
      backgroundColor:'#10141ce8', padding:{x:6,y:4}
    }).setDepth(100).setVisible(false);

    this.add.text(w/2, py + panelH - 18, 'Clique p/ mover hotbar↔bolsa' + (this.chest ? '↔caixa' : '') + '   ·   ESC fecha', {
      fontFamily:'monospace', fontSize:'11px', color:'#8a93a2'
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-ESC', () => this.closeMe());
    this.input.keyboard.on('keydown-I',   () => this.closeMe());
  }

  drawGrid(title, x, y, cols, rows, grid, tag) {
    const cell = 40, gap = 4;
    if (title) {
      this.add.text(x, y - 14, title, { fontFamily:'monospace', fontSize:'12px', color:'#cfd6df' });
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (i >= grid.length) continue;
        const sx = x + c * (cell + gap), sy = y + r * (cell + gap);
        const bg = this.add.image(sx + cell/2, sy + cell/2, 'ui_slot').setDisplaySize(cell, cell)
          .setInteractive({ useHandCursor: true });
        const item = grid[i];
        if (item) {
          const def = ITEMS[item.id];
          this.add.image(sx + cell/2, sy + cell/2, 'icons', def.icon).setScale(1.6);
          if (item.qty > 1) {
            this.add.text(sx + cell - 4, sy + cell - 4, String(item.qty), {
              fontFamily:'monospace', fontSize:'10px', color:'#fff'
            }).setOrigin(1, 1);
          }
        }
        bg.on('pointerover', () => {
          if (item) {
            this.tip.setText(`${ITEMS[item.id].name}  x${item.qty}`).setPosition(sx + cell + 8, sy).setVisible(true);
          }
        });
        bg.on('pointerout', () => this.tip.setVisible(false));
        bg.on('pointerdown', (p) => this.moveItem(tag, i));
      }
    }
  }

  moveItem(tag, idx) {
    const src = tag === 'hot' ? State.hotbar : (tag === 'chest' ? this.chest.storage : State.inventory);
    const item = src[idx];
    if (!item) return;
    // Move policy:
    //  hot   -> inv (or chest if open)
    //  inv   -> hot (if free) else chest if open
    //  chest -> inv
    let dest;
    if (tag === 'hot') dest = this.chest ? this.chest.storage : State.inventory;
    else if (tag === 'inv') dest = (State.hotbar.indexOf(null) >= 0 ? State.hotbar : (this.chest ? this.chest.storage : State.inventory));
    else dest = State.inventory;
    const left = addItem(dest, item.id, item.qty);
    item.qty = left;
    if (item.qty <= 0) src[idx] = null;
    Events.emit('inv:changed');
    this.scene.restart({ chest: this.chest });
  }

  closeMe() {
    this.scene.stop();
    this.scene.resume('WorldScene');
  }
}
