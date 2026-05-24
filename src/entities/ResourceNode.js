import Phaser from 'phaser';
import { pickup } from '../systems/GameState.js';
import { toast } from '../systems/GameState.js';

// Generic harvestable: tree (axe → wood), rock (pickaxe → stone), scrap (any → scrap),
// fiber (any/scythe → fiber).
const TABLE = {
  tree:  { texture:'tree_dead', tool:'axe',     drop:'wood',  qty:[2,4], hits:3, label:'Árvore morta' },
  rock:  { texture:'rock',      tool:'pickaxe', drop:'stone', qty:[1,3], hits:3, label:'Pedra' },
  scrap: { texture:'scrap',     tool:null,      drop:'scrap', qty:[1,2], hits:2, label:'Sucata' },
  fiber: { texture:'fiber',     tool:null,      drop:'fiber', qty:[1,2], hits:1, label:'Mato fibroso' },
  ruin:  { texture:'ruin_wall', tool:'pickaxe', drop:'stone', qty:[2,3], hits:4, label:'Ruína' },
};

export default class ResourceNode extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, kind, onHarvested) {
    const cfg = TABLE[kind];
    super(scene, x, y, cfg.texture);
    this.kind = kind;
    this.cfg = cfg;
    this.onHarvested = onHarvested || null;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    // Visual offset: anchor at base
    this.setOrigin(0.5, 1);
    this.y = y + 16;
    this.hits = cfg.hits;
    this.setDepth(this.y);
    // Body covers feet only
    const bw = Math.min(20, this.width - 4);
    const bh = 8;
    this.body.setSize(bw, bh);
    this.body.setOffset((this.width - bw) / 2, this.height - bh - 1);
  }

  tryHarvest(toolNeeded) {
    if (this.cfg.tool && this.cfg.tool !== toolNeeded) {
      toast(`Você precisa de ${toolLabel(this.cfg.tool)}`, '#e0a0a0');
      return false;
    }
    this.hits -= 1;
    this.scene.tweens.add({
      targets: this, x: this.x + (Math.random()*4-2), duration: 60, yoyo: true,
    });
    if (this.hits <= 0) {
      const [lo, hi] = this.cfg.qty;
      const n = Phaser.Math.Between(lo, hi);
      pickup(this.cfg.drop, n);
      // Tree drops sometimes a stick (fiber) bonus
      if (this.kind === 'tree' && Math.random() < 0.3) pickup('fiber', 1);
      // Scrap chance for energy cell
      if (this.kind === 'scrap' && Math.random() < 0.15) pickup('energy_cell', 1);
      if (this.onHarvested) this.onHarvested(this.kind, this.x, this.y - 16);
      this.destroy();
    }
    return true;
  }
}

function toolLabel(t) {
  if (t === 'axe') return 'machado';
  if (t === 'pickaxe') return 'picareta';
  if (t === 'hoe') return 'enxada';
  if (t === 'water') return 'regador';
  if (t === 'scythe') return 'foice';
  return t;
}
