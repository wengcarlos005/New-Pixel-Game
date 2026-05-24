import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }

  create() {
    const w = this.scale.width, h = this.scale.height;
    this.add.image(w/2, h/2, 'title_bg').setDisplaySize(w, h);

    // Dim overlay
    this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.45);

    this.add.text(w/2, 110, 'RESSURGIR', {
      fontFamily: 'serif', fontSize: '64px', color: '#e6c98a',
      stroke: '#1a1208', strokeThickness: 6,
    }).setOrigin(0.5).setShadow(2, 4, '#000', 6);

    this.add.text(w/2, 168, 'Colônia Pós-Apocalipse', {
      fontFamily: 'monospace', fontSize: '20px', color: '#cfd6df',
    }).setOrigin(0.5);

    this.add.text(w/2, 200,
      'A natureza tomou as ruínas. A energia se foi. Plante. Construa. Reacenda o mundo.',
      { fontFamily: 'monospace', fontSize: '14px', color: '#9ba6b4',
        align: 'center', wordWrap: { width: 600 } }
    ).setOrigin(0.5);

    this.makeButton(w/2, h - 200, 'Começar', () => {
      this.scene.start('WorldScene');
      this.scene.launch('HudScene');
    });

    this.makeButton(w/2, h - 145, 'Como Jogar', () => this.showHelp());

    this.add.text(w/2, h - 24, 'WASD: mover  ·  Shift: correr  ·  E: interagir  ·  I: inventário  ·  C: craftar  ·  B: construir', {
      fontFamily: 'monospace', fontSize: '12px', color: '#7a8392'
    }).setOrigin(0.5);

    // Subtle pulsing star
    const star = this.add.circle(240, 96, 2, 0xfff0c0).setAlpha(0.9);
    this.tweens.add({ targets: star, alpha: 0.3, duration: 1400, yoyo: true, repeat: -1 });
  }

  makeButton(x, y, label, cb) {
    const bg = this.add.rectangle(x, y, 220, 44, 0x12181f, 0.95).setStrokeStyle(2, 0x4a5260).setInteractive({ useHandCursor: true });
    const tx = this.add.text(x, y, label, { fontFamily: 'monospace', fontSize: '18px', color: '#e6c98a' }).setOrigin(0.5);
    bg.on('pointerover', () => { bg.setFillStyle(0x1c2530, 1); tx.setColor('#fff0c0'); });
    bg.on('pointerout',  () => { bg.setFillStyle(0x12181f, 0.95); tx.setColor('#e6c98a'); });
    bg.on('pointerdown', cb);
    return bg;
  }

  showHelp() {
    const w = this.scale.width, h = this.scale.height;
    const panel = this.add.rectangle(w/2, h/2, 560, 360, 0x10141c, 0.96).setStrokeStyle(2, 0x4a5260);
    const txt = this.add.text(w/2, h/2 - 140,
      'COMO JOGAR\n\n' +
      '• WASD ou setas para mover, Shift para correr.\n' +
      '• E para interagir com objetos (árvores, sucata, NPCs, geradores).\n' +
      '• 1–6 selecionam ferramentas da hotbar.\n' +
      '• I abre o inventário, C abre o crafting, B entra no modo construção.\n' +
      '• Use a enxada na terra → plante semente → regue → colha.\n' +
      '• Alimente seus sobreviventes. Eles trabalham se estiverem comendo.\n' +
      '• Repare o gerador antigo para mudar o mundo: luzes acendem, plantas crescem, novos sobreviventes aparecem.\n\n' +
      'Clique para fechar.', {
        fontFamily: 'monospace', fontSize: '14px', color: '#cfd6df',
        wordWrap: { width: 520 }, align: 'left'
      }).setOrigin(0.5, 0);
    panel.setInteractive();
    panel.on('pointerdown', () => { panel.destroy(); txt.destroy(); });
    txt.setInteractive();
    txt.on('pointerdown', () => { panel.destroy(); txt.destroy(); });
  }
}
