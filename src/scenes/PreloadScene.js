import Phaser from 'phaser';
import { ICON_KEYS } from '../data/items.js';

export default class PreloadScene extends Phaser.Scene {
  constructor() { super('PreloadScene'); }

  preload() {
    const w = this.scale.width, h = this.scale.height;
    const barBg = this.add.rectangle(w/2, h/2, 360, 24, 0x1a1f28).setStrokeStyle(2, 0x3a4150);
    const bar   = this.add.rectangle(w/2 - 178, h/2, 4, 16, 0xe0a050).setOrigin(0, 0.5);
    const label = this.add.text(w/2, h/2 - 36, 'Carregando ressurgir…', {
      fontFamily: 'monospace', fontSize: '16px', color: '#cfd6df'
    }).setOrigin(0.5);

    this.load.on('progress', (v) => { bar.width = Math.max(4, v * 352); });
    this.load.on('complete', () => { label.setText('Pronto'); });

    this.load.image('terrain', 'assets/terrain.png');
    this.load.spritesheet('player', 'assets/player.png', { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('npc_farmer',   'assets/npc_farmer.png',   { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('npc_mechanic', 'assets/npc_mechanic.png', { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('npc_explorer', 'assets/npc_explorer.png', { frameWidth: 16, frameHeight: 24 });

    this.load.image('tree_dead', 'assets/tree_dead.png');
    this.load.image('tree_lush', 'assets/tree_lush.png');
    this.load.image('rock',      'assets/rock.png');
    this.load.image('scrap',     'assets/scrap.png');
    this.load.image('fiber',     'assets/fiber.png');
    this.load.image('ruin_wall', 'assets/ruin_wall.png');
    this.load.image('generator_broken', 'assets/generator_broken.png');
    this.load.image('generator_on',     'assets/generator_on.png');
    this.load.image('campfire',  'assets/campfire.png');
    this.load.image('chest',     'assets/chest.png');
    this.load.image('water_tank','assets/water_tank.png');
    this.load.image('small_gen', 'assets/small_gen.png');
    this.load.image('planter',   'assets/planter.png');
    this.load.image('wall_tile', 'assets/wall_tile.png');
    this.load.image('floor_tile','assets/floor_tile.png');

    this.load.spritesheet('crops', 'assets/crops.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('icons', 'assets/icons.png', { frameWidth: 16, frameHeight: 16 });

    this.load.image('ui_slot',    'assets/ui_slot.png');
    this.load.image('ui_slot_hi', 'assets/ui_slot_hi.png');
    this.load.image('ui_bg',      'assets/ui_bg.png');
    this.load.image('dot',        'assets/dot.png');
    this.load.image('glow',       'assets/glow.png');
    this.load.image('title_bg',   'assets/title_bg.png');
  }

  create() {
    this.createPlayerAnims('player');
    this.createPlayerAnims('npc_farmer');
    this.createPlayerAnims('npc_mechanic');
    this.createPlayerAnims('npc_explorer');
    this.scene.start('MainMenuScene');
  }

  createPlayerAnims(key) {
    // sheet layout: 3 cols × 4 rows  ->  rows: 0 down, 1 left, 2 right, 3 up
    const dirs = ['down', 'left', 'right', 'up'];
    dirs.forEach((d, row) => {
      const base = row * 3;
      this.anims.create({
        key: `${key}_idle_${d}`,
        frames: [{ key, frame: base }],
        frameRate: 1, repeat: -1,
      });
      this.anims.create({
        key: `${key}_walk_${d}`,
        frames: [
          { key, frame: base },
          { key, frame: base + 1 },
          { key, frame: base },
          { key, frame: base + 2 },
        ],
        frameRate: 8, repeat: -1,
      });
    });
  }
}
