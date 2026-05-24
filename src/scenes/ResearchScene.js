import Phaser from 'phaser';
import { State, Events, totalCount, removeAcross, canResearch, startResearch, toast } from '../systems/GameState.js';
import { ITEMS } from '../data/items.js';
import { TECH_TREE } from '../data/recipes.js';

export default class ResearchScene extends Phaser.Scene {
  constructor() { super('ResearchScene'); }

  create() {
    const w = this.scale.width, h = this.scale.height;

    // Backdrop
    this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.65);
    const pw = 860, ph = 480;
    const px = w/2 - pw/2, py = h/2 - ph/2;
    this.add.rectangle(w/2, h/2, pw, ph, 0x0c1020, 0.97).setStrokeStyle(2, 0x2a4060);

    // Header
    this.add.text(w/2, py + 20, '🔬  CENTRO DE PESQUISA', {
      fontFamily: 'monospace', fontSize: '18px', color: '#80c8ff',
    }).setOrigin(0.5);

    // Lab status
    const labText = State.research.labBuilt
      ? 'Bancada instalada ✓'
      : 'Você precisa de uma Bancada de Lab (B para construir)';
    this.add.text(w/2, py + 44, labText, {
      fontFamily: 'monospace', fontSize: '12px',
      color: State.research.labBuilt ? '#80e080' : '#e0a060',
    }).setOrigin(0.5);

    // In-progress indicator
    if (State.research.inProgress) {
      const ip = State.research.inProgress;
      const tech = TECH_TREE.find(t => t.id === ip.id);
      const pct = Math.round((1 - ip.daysLeft / ip.totalDays) * 100);
      this.add.text(w/2, py + 64, `Pesquisando: ${tech ? tech.name : ip.id} — ${pct}% (${ip.daysLeft} dia${ip.daysLeft !== 1 ? 's' : ''} restante${ip.daysLeft !== 1 ? 's' : ''})`, {
        fontFamily: 'monospace', fontSize: '12px', color: '#b0d8ff',
      }).setOrigin(0.5);
    }

    // Tech tree grid
    const cols = 3;
    const cellW = 260, cellH = 130;
    const startX = px + 20;
    const startY = py + 90;

    TECH_TREE.forEach((tech, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx = startX + col * (cellW + 10);
      const cy = startY + row * (cellH + 10);

      const done = State.research.completed.includes(tech.id);
      const active = State.research.inProgress && State.research.inProgress.id === tech.id;
      const available = canResearch(tech);
      const locked = !done && !active && !available;

      // Card background
      const cardColor = done ? 0x0a2010 : (active ? 0x0a1830 : (available ? 0x101828 : 0x0a0c10));
      const strokeColor = done ? 0x30a050 : (active ? 0x3060c0 : (available ? 0x2a3a50 : 0x1a1a20));
      const bg = this.add.rectangle(cx, cy, cellW, cellH, cardColor, 0.95)
        .setOrigin(0).setStrokeStyle(1, strokeColor);

      if (available && !done && !active) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => bg.setStrokeStyle(2, 0x60a0e0));
        bg.on('pointerout',  () => bg.setStrokeStyle(1, strokeColor));
        bg.on('pointerdown', () => this.tryResearch(tech));
      }

      // Status badge
      const badge = done ? '✓ Concluído' : (active ? '⏳ Em andamento' : (locked ? '🔒 Bloqueado' : '▶ Disponível'));
      const badgeColor = done ? '#40c060' : (active ? '#4080c0' : (locked ? '#504050' : '#80b040'));
      this.add.text(cx + cellW - 6, cy + 6, badge, {
        fontFamily: 'monospace', fontSize: '10px', color: badgeColor,
      }).setOrigin(1, 0);

      // Icon + name
      this.add.text(cx + 8, cy + 8, tech.icon, { fontSize: '22px' });
      this.add.text(cx + 36, cy + 10, tech.name, {
        fontFamily: 'monospace', fontSize: '13px',
        color: done ? '#60d080' : (locked ? '#404050' : '#c0d8f0'),
      });

      // Description
      this.add.text(cx + 8, cy + 36, tech.desc, {
        fontFamily: 'monospace', fontSize: '11px',
        color: locked ? '#303040' : '#8090a0',
        wordWrap: { width: cellW - 16 },
      });

      // Cost
      if (!done) {
        const costStr = Object.entries(tech.cost).map(([k, v]) => {
          const have = totalCount(k);
          const name = ITEMS[k] ? ITEMS[k].name : k;
          const ok = have >= v;
          return { text: `${name} x${v} (${have})`, ok };
        });
        let costY = cy + 80;
        costStr.forEach(({ text, ok }) => {
          this.add.text(cx + 8, costY, text, {
            fontFamily: 'monospace', fontSize: '10px',
            color: locked ? '#303040' : (ok ? '#60c060' : '#c06060'),
          });
          costY += 13;
        });

        // Time
        this.add.text(cx + cellW - 6, cy + cellH - 14, `${tech.timeDays} dia${tech.timeDays !== 1 ? 's' : ''}`, {
          fontFamily: 'monospace', fontSize: '10px', color: '#506070',
        }).setOrigin(1, 0);
      }

      // Unlocks preview
      if (done) {
        this.add.text(cx + 8, cy + 68, 'Desbloqueado:', {
          fontFamily: 'monospace', fontSize: '10px', color: '#40a050',
        });
        tech.unlocks.slice(0, 2).forEach((u, ui) => {
          this.add.text(cx + 8, cy + 80 + ui * 13, `• ${u}`, {
            fontFamily: 'monospace', fontSize: '10px', color: '#306040',
          });
        });
      }
    });

    // Footer
    this.add.text(w/2, py + ph - 18, 'ESC fecha · Clique em uma pesquisa disponível para iniciar', {
      fontFamily: 'monospace', fontSize: '11px', color: '#3a4860',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-ESC', () => this.closeMe());
    this.input.keyboard.on('keydown-R',   () => this.closeMe());
  }

  tryResearch(tech) {
    if (!State.research.labBuilt) {
      toast('Construa uma Bancada de Lab primeiro (B → Bancada Lab.)', '#e0a060');
      return;
    }
    if (State.research.inProgress) {
      toast('Já há uma pesquisa em andamento', '#e0a0a0');
      return;
    }

    // Check requirements
    for (const req of tech.requires) {
      if (!State.research.completed.includes(req)) {
        const reqTech = TECH_TREE.find(t => t.id === req);
        toast(`Requer: ${reqTech ? reqTech.name : req}`, '#e0a0a0');
        return;
      }
    }

    // Check cost
    for (const [k, v] of Object.entries(tech.cost)) {
      if (totalCount(k) < v) {
        toast(`Sem ${ITEMS[k] ? ITEMS[k].name : k}`, '#e0a0a0');
        return;
      }
    }

    // Pay cost
    for (const [k, v] of Object.entries(tech.cost)) {
      removeAcross(k, v);
    }

    startResearch(tech);
    this.scene.restart();
  }

  closeMe() {
    this.scene.stop();
    this.scene.resume('WorldScene');
  }
}
