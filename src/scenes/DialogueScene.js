import Phaser from 'phaser';
import { toast } from '../systems/GameState.js';

export default class DialogueScene extends Phaser.Scene {
  constructor() { super('DialogueScene'); }
  init(data) { this.npc = data.npc; }

  create() {
    const w = this.scale.width, h = this.scale.height;
    this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.45);
    const pw = 560, ph = 220;
    const px = w/2 - pw/2, py = h - ph - 32;
    this.add.rectangle(w/2, py + ph/2, pw, ph, 0x10141c, 0.96).setStrokeStyle(2, 0x4a5260);

    // Portrait box
    this.add.rectangle(px + 60, py + ph/2, 96, 96, 0x1c2230).setStrokeStyle(1, 0x4a5260);
    this.add.sprite(px + 60, py + ph/2, this.npc.tex, 0).setScale(3);

    this.add.text(px + 130, py + 18, this.npc.npcName, {
      fontFamily:'monospace', fontSize:'16px', color:'#e6c98a'
    });

    const stats = `Fome: ${Math.round(this.npc.hunger)}    Moral: ${Math.round(this.npc.morale)}`;
    this.add.text(px + 130, py + 42, stats, { fontFamily:'monospace', fontSize:'12px', color:'#9ba6b4' });

    const line = this.npc.dialogueLine();
    this.lineText = this.add.text(px + 130, py + 70, '"' + line + '"', {
      fontFamily:'serif', fontSize:'15px', color:'#cfd6df',
      wordWrap: { width: pw - 160 }
    });

    // Buttons
    this.makeButton(px + 130, py + ph - 30, 'Alimentar', () => {
      if (this.npc.feedMe()) this.close();
    });
    this.makeButton(px + 260, py + ph - 30, 'Próxima fala', () => {
      this.lineText.setText('"' + this.npc.dialogueLine() + '"');
    });
    this.makeButton(px + pw - 100, py + ph - 30, 'Fechar', () => this.close());

    this.input.keyboard.on('keydown-ESC', () => this.close());
  }

  makeButton(x, y, label, cb) {
    const w = label.length * 9 + 24;
    const bg = this.add.rectangle(x, y, w, 28, 0x1a1f28).setStrokeStyle(1, 0x4a5260).setInteractive({ useHandCursor: true });
    bg.setOrigin(0, 0.5);
    this.add.text(x + 12, y, label, { fontFamily:'monospace', fontSize:'12px', color:'#cfd6df' }).setOrigin(0, 0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x252b38));
    bg.on('pointerout',  () => bg.setFillStyle(0x1a1f28));
    bg.on('pointerdown', cb);
  }

  close() { this.scene.stop(); this.scene.resume('WorldScene'); }
}
