import Phaser from 'phaser';
import { State, Events, timeOfDay } from '../systems/GameState.js';
import { ITEMS } from '../data/items.js';
import { HEALTH_MAX, HUNGER_MAX, STAMINA_MAX } from '../config/GameConfig.js';
import { getActiveQuest, QUEST_LIST } from '../systems/QuestSystem.js';

export default class HudScene extends Phaser.Scene {
  constructor() { super('HudScene'); }

  create() {
    const w = this.scale.width, h = this.scale.height;

    // Top-left status panel
    const padX = 10, padY = 10;
    this.add.rectangle(padX, padY, 192, 90, 0x0a0d14, 0.82).setOrigin(0).setStrokeStyle(1, 0x3a4255);
    this.add.text(padX + 8, padY + 5, 'JOGADOR', { fontFamily:'monospace', fontSize:'9px', color:'#6a7590' });

    const barW = 128, barH = 11, bx = padX + 52, gap = 22;

    this.add.text(padX + 8, padY + 20, 'HP',    { fontFamily:'monospace', fontSize:'10px', color:'#e87070' });
    this.hpBarBg = this.add.rectangle(bx, padY + 20, barW, barH, 0x1a0e0e).setOrigin(0);
    this.hpBar   = this.add.rectangle(bx, padY + 20, barW, barH, 0xd45050).setOrigin(0);

    this.add.text(padX + 8, padY + 20 + gap, 'Fome', { fontFamily:'monospace', fontSize:'10px', color:'#e0a850' });
    this.hgBarBg = this.add.rectangle(bx, padY + 20 + gap, barW, barH, 0x1a1408).setOrigin(0);
    this.hgBar   = this.add.rectangle(bx, padY + 20 + gap, barW, barH, 0xc88030).setOrigin(0);

    this.add.text(padX + 8, padY + 20 + gap*2, 'Vigor', { fontFamily:'monospace', fontSize:'10px', color:'#80b030' });
    this.stBarBg = this.add.rectangle(bx, padY + 20 + gap*2, barW, barH, 0x0e1408).setOrigin(0);
    this.stBar   = this.add.rectangle(bx, padY + 20 + gap*2, barW, barH, 0x70a020).setOrigin(0);

    this.hpVal = this.add.text(bx + barW + 3, padY + 20,         '', { fontFamily:'monospace', fontSize:'9px', color:'#e87070' });
    this.hgVal = this.add.text(bx + barW + 3, padY + 20 + gap,   '', { fontFamily:'monospace', fontSize:'9px', color:'#e0a850' });
    this.stVal = this.add.text(bx + barW + 3, padY + 20 + gap*2, '', { fontFamily:'monospace', fontSize:'9px', color:'#80b030' });

    // Top-right clock
    this.timeText = this.add.text(w - 10, 10, '', {
      fontFamily:'monospace', fontSize:'12px', color:'#cfd6df',
      backgroundColor:'#0a0d14dd', padding:{x:8,y:6}, align:'right',
    }).setOrigin(1, 0);

    // Objectives panel (right side, below clock)
    this.questContainer = this.add.container(w - 10, 72);
    this.questBg    = this.add.rectangle(0, 0, 222, 104, 0x0a0d14, 0.88).setOrigin(1,0).setStrokeStyle(1, 0x3a4255);
    this.questTitle = this.add.text(-212, 7,  'OBJETIVO ATUAL', { fontFamily:'monospace', fontSize:'9px', color:'#6a7590' });
    this.questIcon  = this.add.text(-212, 22, '', { fontFamily:'monospace', fontSize:'14px' });
    this.questName  = this.add.text(-192, 24, '', { fontFamily:'monospace', fontSize:'11px', color:'#ffffff' });
    this.questDesc  = this.add.text(-212, 44, '', { fontFamily:'monospace', fontSize:'9px', color:'#8a93a2', wordWrap:{width:208} });
    this.questDots  = QUEST_LIST.map((_, i) =>
      this.add.text(-212 + i * 24, 86, 'o', { fontFamily:'monospace', fontSize:'11px', color:'#3a4255' })
    );
    this.questContainer.add([this.questBg, this.questTitle, this.questIcon, this.questName, this.questDesc, ...this.questDots]);

    // Hotbar (bottom center)
    this.hotSlots = [];
    const sw = 42, sh = 42, slots = 6;
    const startX = (w - (slots * sw)) / 2;
    const hy = h - sh - 10;
    for (let i = 0; i < slots; i++) {
      const x  = startX + i * sw + sw/2;
      const sl = this.add.image(x, hy + sh/2, 'ui_slot').setDisplaySize(sw, sh);
      const ic = this.add.image(x, hy + sh/2, 'icons', 0).setVisible(false).setScale(1.8);
      const qt = this.add.text(x + sw/2 - 3, hy + sh - 3, '', { fontFamily:'monospace', fontSize:'9px', color:'#fff' }).setOrigin(1,1);
      const kl = this.add.text(x - sw/2 + 3, hy + 3, String(i+1), { fontFamily:'monospace', fontSize:'9px', color:'#6a7590' }).setOrigin(0);
      this.hotSlots.push({ slot:sl, icon:ic, qty:qt, key:kl, x });
    }
    this.activeBox = this.add.image(this.hotSlots[0].x, hy + sh/2, 'ui_slot_hi').setDisplaySize(sw+4, sh+4);
    this.toolLabel = this.add.text(w/2, hy - 14, '', {
      fontFamily:'monospace', fontSize:'11px', color:'#e6c98a',
      backgroundColor:'#0a0d1488', padding:{x:6,y:2}
    }).setOrigin(0.5);

    // Bottom hint
    this.add.rectangle(w/2, h - 7, w, 16, 0x0a0d14, 0.80).setOrigin(0.5, 1);
    this.add.text(w/2, h - 5,
      'WASD mover  |  E interagir  |  1-6 ferramenta  |  I inventario  |  C crafting  |  B construcao  |  R pesquisa  |  clique-dir usar item',
      { fontFamily:'monospace', fontSize:'9px', color:'#5a6375' }).setOrigin(0.5, 1);

    Events.on('toast',          this.showToast,    this);
    Events.on('inv:changed',    this.refresh,      this);
    Events.on('hotbar:changed', this.refresh,      this);
    Events.on('quest:updated',  this.refreshQuest, this);

    this.toastY = 60;
    this.refresh();
    this.refreshQuest();
  }

  showToast({ text, color }) {
    const w = this.scale.width;
    const t = this.add.text(w/2, this.toastY, text, {
      fontFamily:'monospace', fontSize:'13px', color,
      backgroundColor:'#0a0d14e0', padding:{x:8,y:5}, align:'center'
    }).setOrigin(0.5).setDepth(99999);
    this.tweens.add({ targets:t, alpha:0, y:this.toastY - 20, duration:2500, onComplete:() => t.destroy() });
    this.toastY += 22;
    this.time.delayedCall(2600, () => { this.toastY = Math.max(60, this.toastY - 22); });
  }

  refreshQuest() {
    const q = getActiveQuest();
    if (!q) {
      this.questIcon.setText('>');
      this.questName.setText('Tudo concluido!');
      this.questDesc.setText('Voce dominou a colonia.');
    } else {
      this.questIcon.setText(q.icon);
      this.questName.setText(q.title);
      this.questDesc.setText(q.desc);
    }
    const done = State.quests ? (State.quests.completed || []) : [];
    this.questDots.forEach((dot, i) => {
      const completed = done.includes(QUEST_LIST[i].id);
      dot.setText(completed ? '*' : 'o').setColor(completed ? '#ffd070' : '#3a4255');
    });
  }

  refresh() {
    const W = 128;
    this.hpBar.width = Math.max(0, (State.player.hp      / HEALTH_MAX)  * W);
    this.hgBar.width = Math.max(0, (State.player.hunger  / HUNGER_MAX)  * W);
    this.stBar.width = Math.max(0, (State.player.stamina / STAMINA_MAX) * W);
    this.hpVal.setText(Math.round(State.player.hp)      + '');
    this.hgVal.setText(Math.round(State.player.hunger)  + '');
    this.stVal.setText(Math.round(State.player.stamina) + '');

    for (let i = 0; i < this.hotSlots.length; i++) {
      const s    = this.hotSlots[i];
      const item = State.hotbar[i];
      if (item) {
        s.icon.setFrame(ITEMS[item.id].icon).setVisible(true);
        s.qty.setText(item.qty > 1 ? String(item.qty) : '');
      } else {
        s.icon.setVisible(false);
        s.qty.setText('');
      }
    }
    this.activeBox.x = this.hotSlots[State.hotbarIndex].x;
    const slot = State.hotbar[State.hotbarIndex];
    this.toolLabel.setText(slot ? (ITEMS[slot.id] ? ITEMS[slot.id].name : '') : '');
  }

  update() {
    this.refresh();
    const t   = timeOfDay();
    const min = Math.floor(t * 24 * 60);
    const hh  = String(Math.floor(min / 60)).padStart(2, '0');
    const mm  = String(min % 60).padStart(2, '0');
    const phase  = t < 0.20 ? 'Amanhecer' : t < 0.45 ? 'Dia' : t < 0.55 ? 'Por-do-sol' : t < 0.75 ? 'Noite' : 'Madrugada';
    const energy = State.energyOnline ? 'Energia ON' : 'sem energia';
    const workers = State.npcs.filter(n => n.assignedTool).length;
    const wStr = workers > 0 ? ('  Trabalhando: ' + workers) : '';
    this.timeText.setText('Dia ' + State.dayCount + '  ' + hh + ':' + mm + '  ' + phase + '\n' + energy + '  Col: ' + State.npcs.length + wStr);
  }
}
