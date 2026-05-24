import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }

  create() {
    const w = this.scale.width, h = this.scale.height;

    // ── Background image (post-apoc night scene)
    this.add.image(w / 2, h / 2, 'title_bg').setDisplaySize(w, h);

    // ── Dim vignette — edges darker than center
    const vign = this.add.graphics();
    vign.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.7, 0.7, 0, 0);
    vign.fillRect(0, 0, w, h / 2);
    vign.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.55, 0.55);
    vign.fillRect(0, h / 2, w, h / 2);

    // ── Floating ash particles
    this._spawnParticles(w, h);

    // ── Title glow behind text
    const glow = this.add.ellipse(w / 2, 118, 520, 90, 0x4a7830, 0.18);
    this.tweens.add({ targets: glow, alpha: { from: 0.10, to: 0.25 }, scaleX: { from: 0.95, to: 1.05 }, duration: 2800, yoyo: true, repeat: -1 });

    // ── Title text
    const title = this.add.text(w / 2, 108, 'RESSURGIR', {
      fontFamily: 'serif',
      fontSize: '72px',
      color: '#e8d070',
      stroke: '#0a0804',
      strokeThickness: 8,
    }).setOrigin(0.5).setShadow(0, 3, '#000000', 10, true);

    // Subtle title pulse
    this.tweens.add({ targets: title, scaleX: { from: 1, to: 1.012 }, scaleY: { from: 1, to: 1.012 }, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // ── Subtitle
    this.add.text(w / 2, 174, 'Colônia Pós-Apocalipse', {
      fontFamily: 'monospace', fontSize: '22px', color: '#a8c8e0', letterSpacing: 3,
    }).setOrigin(0.5);

    // ── Tagline
    this.add.text(w / 2, 210,
      'A natureza tomou as ruínas.  A energia se foi.\nPlante. Construa. Reacenda o mundo.',
      { fontFamily: 'monospace', fontSize: '14px', color: '#7a9aac', align: 'center', lineSpacing: 6 }
    ).setOrigin(0.5);

    // ── Separator line
    const sep = this.add.graphics();
    sep.lineStyle(1, 0x4a6a50, 0.6);
    sep.beginPath(); sep.moveTo(w / 2 - 220, 238); sep.lineTo(w / 2 + 220, 238); sep.strokePath();

    // ── Buttons
    const btnStart = this._makeButton(w / 2, h - 160, 'Começar  ▶', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('WorldScene');
        this.scene.launch('HudScene');
      });
    });

    this._makeButton(w / 2, h - 100, 'Como Jogar', () => this.showHelp());

    // ── "Press Enter" hint
    const hint = this.add.text(w / 2, h - 46, '[ Enter ] para começar', {
      fontFamily: 'monospace', fontSize: '13px', color: '#5a7060',
    }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: { from: 0.4, to: 1 }, duration: 1100, yoyo: true, repeat: -1 });

    // ── Controls strip at very bottom
    this.add.text(w / 2, h - 14,
      'WASD: mover  ·  Shift: correr  ·  E: interagir  ·  I: inventário  ·  C: craftar  ·  B: construir',
      { fontFamily: 'monospace', fontSize: '11px', color: '#3a4850' }
    ).setOrigin(0.5);

    // ── Enter key shortcut
    this.input.keyboard.once('keydown-ENTER', () => {
      if (!this.scene.isActive('WorldScene')) {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('WorldScene');
          this.scene.launch('HudScene');
        });
      }
    });

    // Camera fade in
    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── Floating ash/dust particle system
  _spawnParticles(w, h) {
    const count = 55;
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(0, w);
      const y = Phaser.Math.Between(0, h);
      const size = Phaser.Math.FloatBetween(0.8, 2.4);
      const alpha = Phaser.Math.FloatBetween(0.08, 0.35);
      const speed = Phaser.Math.FloatBetween(18, 55);
      const drift = Phaser.Math.FloatBetween(-12, 12);
      const col = Phaser.Math.RND.pick([0x9ab090, 0xc0c8a8, 0x707860, 0xb0b898]);

      const p = this.add.circle(x, y, size, col).setAlpha(alpha);

      // Drift upward with slight horizontal wobble
      this.tweens.add({
        targets: p,
        y: y - h - 20,
        x: x + drift * 4,
        alpha: 0,
        duration: (h / speed) * 1000,
        delay: Phaser.Math.Between(0, 6000),
        ease: 'Linear',
        onComplete: () => {
          // Respawn at bottom
          p.y = h + 5;
          p.x = Phaser.Math.Between(0, w);
          p.setAlpha(alpha);
          this.tweens.add({
            targets: p, y: p.y - h - 20, x: p.x + drift * 4, alpha: 0,
            duration: (h / speed) * 1000, ease: 'Linear', repeat: -1,
            onRepeat: () => { p.y = h + 5; p.x = Phaser.Math.Between(0, w); p.setAlpha(alpha); }
          });
        }
      });
    }

    // A few larger glowing embers
    for (let i = 0; i < 8; i++) {
      const ex = Phaser.Math.Between(0, w);
      const ey = Phaser.Math.Between(h * 0.5, h);
      const emb = this.add.circle(ex, ey, Phaser.Math.FloatBetween(1.5, 3), 0xe08030).setAlpha(0.6);
      this.tweens.add({
        targets: emb,
        y: ey - Phaser.Math.Between(200, 400),
        x: ex + Phaser.Math.Between(-40, 40),
        alpha: 0,
        duration: Phaser.Math.Between(3000, 7000),
        delay: Phaser.Math.Between(0, 5000),
        ease: 'Cubic.easeOut',
        repeat: -1,
        onRepeat: () => {
          emb.x = Phaser.Math.Between(0, w);
          emb.y = Phaser.Math.Between(h * 0.5, h);
          emb.setAlpha(0.6);
        }
      });
    }
  }

  // ── Button factory
  _makeButton(x, y, label, cb) {
    const bg = this.add.rectangle(x, y, 240, 48, 0x0c1318, 0.92)
      .setStrokeStyle(1, 0x3a5040)
      .setInteractive({ useHandCursor: true });

    // Accent bar on left edge
    const accent = this.add.rectangle(x - 119, y, 3, 40, 0x6a9060, 1);

    const tx = this.add.text(x + 4, y, label, {
      fontFamily: 'monospace', fontSize: '19px', color: '#c8d8a8',
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x182820, 1).setStrokeStyle(1, 0x7ab870);
      accent.setFillStyle(0xaadd88);
      tx.setColor('#f0ffd8');
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x0c1318, 0.92).setStrokeStyle(1, 0x3a5040);
      accent.setFillStyle(0x6a9060);
      tx.setColor('#c8d8a8');
    });
    bg.on('pointerdown', cb);
    return bg;
  }

  showHelp() {
    const w = this.scale.width, h = this.scale.height;
    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.55);
    const panel = this.add.rectangle(w / 2, h / 2, 580, 390, 0x0c1318, 0.98).setStrokeStyle(1, 0x4a6050);

    const lines = [
      '─── COMO JOGAR ───────────────────────────────',
      '',
      '  WASD / Setas  →  Mover       Shift  →  Correr',
      '  E             →  Interagir com objetos e NPCs',
      '  1–6           →  Selecionar ferramenta da hotbar',
      '  I             →  Inventário   C  →  Crafting',
      '  B             →  Modo construção',
      '',
      '─── DICAS ────────────────────────────────────',
      '',
      '  • Enxada na terra → plante semente → regue → colha.',
      '  • Alimente os sobreviventes para mantê-los produtivos.',
      '  • Conserte o Gerador Antigo para transformar o mundo:',
      '    luzes acendem, plantas crescem, novos sobreviventes',
      '    aparecem e o mapa muda.',
      '',
      '              [ Clique para fechar ]',
    ].join('\n');

    const txt = this.add.text(w / 2, h / 2 - 175, lines, {
      fontFamily: 'monospace', fontSize: '13px', color: '#b0c8b0',
      lineSpacing: 4, align: 'left',
    }).setOrigin(0.5, 0);

    [overlay, panel, txt].forEach(o => {
      o.setInteractive();
      o.on('pointerdown', () => { overlay.destroy(); panel.destroy(); txt.destroy(); });
    });
  }
}
