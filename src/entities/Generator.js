import Phaser from 'phaser';
import { State, Events, toast, removeAcross, totalCount } from '../systems/GameState.js';

// The keystone broken generator. Repair stages, then world energy comes online.
export default class Generator extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'generator_broken');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setOrigin(0.5, 1);
    this.y = y + 32;
    this.setDepth(this.y);
    const bw = 56, bh = 18;
    this.body.setSize(bw, bh);
    this.body.setOffset((this.width - bw)/2, this.height - bh - 2);
    this.repairs = 0;            // 0..3 stages required
    this.needed = [
      { scrap: 5, wood: 2 },
      { scrap: 5, energy_cell: 1 },
      { scrap: 3, energy_cell: 2 },
    ];
    this.label = scene.add.text(x, y - 70, 'Gerador Antigo (E)', {
      fontFamily: 'monospace', fontSize: '11px', color: '#cfd6df',
      backgroundColor: '#10141c80', padding:{x:3,y:2}
    }).setOrigin(0.5);
  }

  interact(scene) {
    if (State.energyOnline) {
      toast('Energia já restaurada', '#cfe8a0');
      return;
    }
    if (this.repairs >= this.needed.length) {
      // last step: turn on
      this.activate(scene);
      return;
    }
    const cost = this.needed[this.repairs];
    // Check
    for (const [k, v] of Object.entries(cost)) {
      if (totalCount(k) < v) {
        const need = Object.entries(cost).map(([k2, v2]) => `${v2} ${k2}`).join(', ');
        toast(`Faltam materiais: ${need}`, '#e0a0a0');
        return;
      }
    }
    for (const [k, v] of Object.entries(cost)) removeAcross(k, v);
    this.repairs += 1;
    toast(`Reparo ${this.repairs}/${this.needed.length} concluído`, '#cfe8a0');
    scene.cameras.main.shake(120, 0.003);
    if (this.repairs >= this.needed.length) {
      toast('Pressione E novamente para ligar', '#fff0a0');
    }
  }

  activate(scene) {
    State.energyOnline = true;
    this.setTexture('generator_on');
    toast('A energia voltou! O mundo desperta.', '#fff0a0');
    scene.cameras.main.flash(800, 240, 220, 160);
    Events.emit('energy:online');
    if (this.glow) this.glow.destroy();
    this.glow = scene.add.sprite(this.x, this.y - 32, 'glow').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6).setScale(2.5).setDepth(this.y - 1);
    scene.tweens.add({ targets: this.glow, alpha: 0.4, scale: 2.8, duration: 1400, yoyo: true, repeat: -1 });
  }
}
