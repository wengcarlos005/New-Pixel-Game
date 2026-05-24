import Phaser from 'phaser';

export default class PauseScene extends Phaser.Scene {
  constructor() { super('PauseScene'); }

  create() {
    const w = this.scale.width, h = this.scale.height;
    this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.65);
    this.add.text(w/2, h/2 - 60, 'PAUSADO', {
      fontFamily:'serif', fontSize:'42px', color:'#e6c98a'
    }).setOrigin(0.5);

    this.btn(w/2, h/2,       'Continuar',  () => this.resume());
    this.btn(w/2, h/2 + 50,  'Menu',       () => {
      this.scene.stop('WorldScene'); this.scene.stop('HudScene'); this.scene.stop();
      this.scene.start('MainMenuScene');
    });

    this.input.keyboard.on('keydown-ESC', () => this.resume());
  }
  resume() { this.scene.stop(); this.scene.resume('WorldScene'); }
  btn(x, y, t, cb) {
    const bg = this.add.rectangle(x, y, 220, 40, 0x10141c).setStrokeStyle(2, 0x4a5260).setInteractive({ useHandCursor: true });
    this.add.text(x, y, t, { fontFamily:'monospace', fontSize:'16px', color:'#cfd6df' }).setOrigin(0.5);
    bg.on('pointerdown', cb);
    bg.on('pointerover', () => bg.setFillStyle(0x1c2532));
    bg.on('pointerout',  () => bg.setFillStyle(0x10141c));
  }
}
