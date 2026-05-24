import Phaser from 'phaser';
import { State, Events, timeOfDay } from '../systems/GameState.js';
import { ITEMS } from '../data/items.js';
import { HEALTH_MAX, HUNGER_MAX, STAMINA_MAX } from '../config/GameConfig.js';

export default class HudScene extends Phaser.Scene {
  constructor() { super('HudScene'); }

  create() {
    const w = this.scale.width, h = this.scale.height;

    // ── Top-left status bars
    const padX = 12, padY = 12, barW = 160, barH = 12;
    this.add.rectangle(padX, padY, 200, 96, 0x10141c, 0.7).setOrigin(0).setStrokeStyle(1, 0x3a4150);
    this.add.text(padX + 8, padY + 4, 'Você', { fontFamily:'monospace', fontSize:'12px', color:'#cfd6df' });

    this.hpBarBg = this.add.rectangle(padX + 32, padY + 24, barW, barH, 0x1a1d24).setOrigin(0);
    this.hpBar   = this.add.rectangle(padX + 32, padY + 24, barW, barH, 0xc84646).setOrigin(0);
    this.add.text(padX + 8, padY + 24, 'HP', { fontFamily:'monospace', fontSize:'10px', color:'#cfd6df' });

    this.hgBarBg = this.add.rectangle(padX + 32, padY + 44, barW, barH, 0x1a1d24).setOrigin(0);
    this.hgBar   = this.add.rectangle(padX + 32, padY + 44, barW, barH, 0xd8a050).setOrigin(0);
    this.add.text(padX + 8, padY + 44, 'F',  { fontFamily:'monospace', fontSize:'10px', color:'#cfd6df' });

    this.stBarBg = this.add.rectangle(padX + 32, padY + 64, barW, barH, 0x1a1d24).setOrigin(0);
    this.stBar   = this.add.rectangle(padX + 32, padY + 64, barW, barH, 0xd8d050).setOrigin(0);
    this.add.text(padX + 8, padY + 64, 'E',  { fontFamily:'monospace', fontSize:'10px', color:'#cfd6df' });

    // ── Top-right time-of-day + dia + energia
    this.timeText = this.add.text(w - 12, 12, '', {
      fontFamily:'monospace', fontSize:'14px', color:'#cfd6df',
      backgroundColor:'#10141c', padding:{x:8,y:6}
    }).setOrigin(1, 0);

    // ── Hotbar (bottom center)
    this.hotSlots = [];
    const sw = 40, sh = 40, slots = 6;
    const startX = (w - (slots * sw)) / 2;
    const hy = h - sh - 12;
    for (let i = 0; i < slots; i++) {
      const x = startX + i * sw + sw/2;
      const slot = this.add.image(x, hy + sh/2, 'ui_slot').setDisplaySize(sw, sh);
      const icon = this.add.image(x, hy + sh/2, 'icons', 0).setVisible(false).setScale(1.6);
      const qty  = this.add.text(x + sw/2 - 4, hy + sh - 4, '', { fontFamily:'monospace', fontSize:'10px', color:'#fff' }).setOrigin(1, 1);
      const key  = this.add.text(x - sw/2 + 4, hy + 2, String(i + 1), { fontFamily:'monospace', fontSize:'10px', color:'#9aa3b2' }).setOrigin(0);
      this.hotSlots.push({ slot, icon, qty, key, x });
    }
    this.activeBox = this.add.image(this.hotSlots[0].x, hy + sh/2, 'ui_slot_hi').setDisplaySize(sw, sh);

    // Bottom hint
    this.add.text(w/2, h - sh - 30, '1–6 ferramenta · E interagir · I inventário · C craftar · B construir', {
      fontFamily:'monospace', fontSize:'11px', color:'#8a93a2'
    }).setOrigin(0.5);

    // Toast container (top center)
    this.toastY = 56;
    Events.on('toast', this.showToast, this);
    Events.on('inv:changed', this.refresh, this);
    Events.on('hotbar:changed', this.refresh, this);

    this.refresh();
  }

  showToast({ text, color }) {
    const w = this.scale.width;
    const t = this.add.text(w/2, this.toastY, text, {
      fontFamily:'monospace', fontSize:'14px', color, backgroundColor:'#10141ce0',
      padding:{x:8,y:5}, align:'center'
    }).setOrigin(0.5).setDepth(99999);
    this.tweens.add({
      targets: t, alpha: 0, y: this.toastY - 18, duration: 2200,
      onComplete: () => t.destroy(),
    });
    this.toastY += 22;
    this.time.delayedCall(2300, () => { this.toastY = Math.max(56, this.toastY - 22); });
  }

  refresh() {
    // Bars
    const W = 160;
    this.hpBar.width = (State.player.hp / HEALTH_MAX) * W;
    this.hgBar.width = (State.player.hunger / HUNGER_MAX) * W;
    this.stBar.width = (State.player.stamina / STAMINA_MAX) * W;

    // Hotbar
    for (let i = 0; i < this.hotSlots.length; i++) {
      const s = this.hotSlots[i];
      const item = State.hotbar[i];
      if (item) {
        const def = ITEMS[item.id];
        s.icon.setFrame(def.icon).setVisible(true);
        s.qty.setText(item.qty > 1 ? String(item.qty) : '');
      } else {
        s.icon.setVisible(false);
        s.qty.setText('');
      }
    }
    this.activeBox.x = this.hotSlots[State.hotbarIndex].x;
  }

  update() {
    this.refresh();
    // Time
    const t = timeOfDay();
    const totalMin = Math.floor(t * 24 * 60);
    const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const mm = String(totalMin % 60).padStart(2, '0');
    const phase = (t < 0.20) ? 'amanhecer' : (t < 0.45) ? 'dia' : (t < 0.55) ? 'pôr-do-sol' : (t < 0.75) ? 'noite' : 'madrugada';
    const energy = State.energyOnline ? '⚡ Energia ON' : 'sem energia';
    this.timeText.setText(`Dia ${State.dayCount}  ${hh}:${mm}  ${phase}\n${energy}  ·  Colônia: ${State.npcs.length}`);
  }
}
