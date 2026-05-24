import Phaser from 'phaser';
import { CROPS } from '../data/recipes.js';
import { pickup, toast } from '../systems/GameState.js';

// 4 stages × 5 crops in crops.png:
//  row 0: potato, row 1: wheat, row 2: mushroom, row 3: corn, row 4: herb
//  col 0..3: stage 0..3
const ROWS = { potato: 0, wheat: 1, mushroom: 2, corn: 3, herb: 4 };

export default class Crop extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, kind) {
    const cfg = CROPS[kind];
    super(scene, x, y - 4, 'crops', ROWS[kind] * 4);
    scene.add.existing(this);
    this.kind = kind;
    this.cfg = cfg;
    this.stage = 0;
    this.watered = false;
    this.growMs = cfg.growMs;
    this.elapsed = 0;
    this.setDepth(y + 8);
    this.setScale(1);
    this.update = this.update.bind(this);
  }

  water() {
    if (this.watered) return false;
    this.watered = true;
    this.setTint(0xb0c8ff);
    return true;
  }

  tick(dtMs) {
    if (this.stage >= this.cfg.stages - 1) return;
    if (!this.watered) return;
    this.elapsed += dtMs;
    const stageMs = this.growMs / (this.cfg.stages - 1);
    if (this.elapsed >= stageMs) {
      this.elapsed = 0;
      this.stage += 1;
      this.setFrame(ROWS[this.kind] * 4 + this.stage);
      // watered stays true — crop grows through all stages once watered
    }
  }

  isReady() { return this.stage >= this.cfg.stages - 1; }

  harvest() {
    if (!this.isReady()) {
      toast('Ainda não está pronto', '#cfd6df');
      return false;
    }
    pickup(this.cfg.produces, this.cfg.yield);
    // Rare chance of extra seed back
    if (Math.random() < 0.45) {
      const seedId = `seed_${this.kind}`;
      pickup(seedId, 1);
    }
    this.destroy();
    return true;
  }
}
