import Phaser from 'phaser';
import { State, Events, totalCount, removeAcross, toast } from '../systems/GameState.js';
import { ITEMS } from '../data/items.js';

export default class DialogueScene extends Phaser.Scene {
  constructor() { super('DialogueScene'); }
  init(data) { this.npc = data.npc; }

  create() {
    const w = this.scale.width, h = this.scale.height;
    this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.50);
    const pw = 580, ph = 260;
    const px = w/2 - pw/2, py = h - ph - 28;
    this.panel = this.add.rectangle(w/2, py + ph/2, pw, ph, 0x10141c, 0.97)
      .setStrokeStyle(2, 0x4a5260);

    // Portrait
    this.add.rectangle(px + 56, py + ph/2, 88, 88, 0x1c2230).setStrokeStyle(1, 0x4a5260);
    this.add.sprite(px + 56, py + ph/2, this.npc.tex, 0).setScale(3);

    this.add.text(px + 112, py + 16, this.npc.npcName, {
      fontFamily:'monospace', fontSize:'15px', color:'#e6c98a'
    });

    const hpText = `HP ${Math.round(this.npc.hunger)}%  Moral ${Math.round(this.npc.morale)}%` +
      (this.npc.assignedTool ? `  [${ITEMS[this.npc.assignedTool]?.name}]` : '');
    this.add.text(px + 112, py + 38, hpText, {
      fontFamily:'monospace', fontSize:'11px', color:'#9ba6b4'
    });

    const line = this.npc.dialogueLine();
    this.lineText = this.add.text(px + 112, py + 62, `"${line}"`, {
      fontFamily:'serif', fontSize:'14px', color:'#cfd6df',
      wordWrap: { width: pw - 150 }
    });

    // ── Buttons ──────────────────────────────────────────────────────────────
    const btnY = py + ph - 26;
    this.makeBtn(px + 112,       btnY, 'Alimentar',      () => { if (this.npc.feedMe()) this.close(); });
    this.makeBtn(px + 240,       btnY, 'Próxima fala',   () => this.lineText.setText(`"${this.npc.dialogueLine()}"`));
    this.makeBtn(px + 370,       btnY, 'Dar Ferramenta', () => this.openToolPicker());
    this.makeBtn(px + pw - 68,   btnY, 'Fechar',         () => this.close());

    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.toolPicker = null;
  }

  // ── Tool picker sub-panel ─────────────────────────────────────────────────
  openToolPicker() {
    if (this.toolPicker) { this.toolPicker.forEach(o => o.destroy()); this.toolPicker = null; return; }

    const tools = ['axe','pickaxe','hoe','watering_can','scythe'];
    const available = tools.filter(id => totalCount(id) > 0);
    if (available.length === 0) {
      toast('Sem ferramentas no inventário', '#e0a0a0');
      return;
    }

    const w = this.scale.width, h = this.scale.height;
    const pw = 320, ph = 40 + available.length * 36;
    const px = w/2 - pw/2, py = h - ph - 300;
    const objs = [];

    objs.push(this.add.rectangle(w/2, py + ph/2, pw, ph, 0x0e1218, 0.98).setStrokeStyle(2, 0x6a7590));
    objs.push(this.add.text(w/2, py + 14, 'Escolha a ferramenta:', {
      fontFamily:'monospace', fontSize:'12px', color:'#e6c98a'
    }).setOrigin(0.5));

    available.forEach((id, i) => {
      const def  = ITEMS[id];
      const by   = py + 38 + i * 36;
      const bg   = this.add.rectangle(w/2, by + 14, pw - 20, 30, 0x1a2030).setStrokeStyle(1,0x4a5260).setInteractive({ useHandCursor:true });
      const txt  = this.add.text(w/2, by + 14, def.name, {
        fontFamily:'monospace', fontSize:'13px', color:'#cfd6df'
      }).setOrigin(0.5);
      bg.on('pointerover', () => bg.setFillStyle(0x2a3040));
      bg.on('pointerout',  () => bg.setFillStyle(0x1a2030));
      bg.on('pointerdown', () => {
        removeAcross(id, 1);
        this.npc.assignTool(id);
        this.toolPicker?.forEach(o => o.destroy());
        this.toolPicker = null;
        this.close();
      });
      objs.push(bg, txt);
    });

    // Also: take tool back
    if (this.npc.assignedTool) {
      const by = py + 38 + available.length * 36;
      const bg = this.add.rectangle(w/2, by + 14, pw - 20, 30, 0x301010).setStrokeStyle(1,0x804040).setInteractive({ useHandCursor:true });
      const txt= this.add.text(w/2, by + 14, `Retirar ${ITEMS[this.npc.assignedTool]?.name || ''}`, {
        fontFamily:'monospace', fontSize:'12px', color:'#e08080'
      }).setOrigin(0.5);
      bg.on('pointerdown', () => {
        this.npc.removeTool();
        this.toolPicker?.forEach(o => o.destroy());
        this.toolPicker = null;
        this.close();
      });
      objs.push(bg, txt);
    }

    this.toolPicker = objs;
  }

  makeBtn(x, y, label, cb) {
    const bw = label.length * 8 + 22;
    const bg = this.add.rectangle(x, y, bw, 26, 0x1a2030).setStrokeStyle(1, 0x4a5260).setInteractive({ useHandCursor: true }).setOrigin(0, 0.5);
    this.add.text(x + 11, y, label, { fontFamily:'monospace', fontSize:'12px', color:'#cfd6df' }).setOrigin(0, 0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x252b3a));
    bg.on('pointerout',  () => bg.setFillStyle(0x1a2030));
    bg.on('pointerdown', cb);
    return bg;
  }

  close() {
    this.toolPicker?.forEach(o => o.destroy());
    this.scene.stop();
    this.scene.resume('WorldScene');
  }
}
