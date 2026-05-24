import Phaser from 'phaser';
import { State, Events, toast, removeAcross, totalCount } from '../systems/GameState.js';
import { ITEMS } from '../data/items.js';

// Simple finite-state NPC. Wanders home base, eats from chest/storage when hungry.
// If hunger low → morale low → stops working.
export default class NPC extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, kind, name) {
    const tex = `npc_${kind}`;
    super(scene, x, y, tex, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(10, 8).setOffset(3, 16);
    this.kind = kind;
    this.npcName = name;
    this.tex = tex;
    this.dir = 'down';
    this.hunger = 80 + Math.random() * 20;
    this.morale = 80;
    this.fed = 0;     // last fed timestamp (sec)
    this.state = 'wander';
    this.target = { x, y };
    this.spawnX = x; this.spawnY = y;
    this.changeIn = 0;
    this.acc = 0;
    this.lineIdx = 0;

    this.label = scene.add.text(x, y - 22, this.shortName(), {
      fontFamily: 'monospace', fontSize: '10px', color: '#cfd6df',
      backgroundColor: '#10141c80', padding: { x: 2, y: 1 }
    }).setOrigin(0.5);
    this.indicator = scene.add.text(x, y - 30, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffcf60',
    }).setOrigin(0.5);
  }

  shortName() {
    return this.npcName.split(' ')[0];
  }

  pickTarget() {
    const radius = 80;
    const ang = Math.random() * Math.PI * 2;
    const r = 20 + Math.random() * radius;
    this.target.x = this.spawnX + Math.cos(ang) * r;
    this.target.y = this.spawnY + Math.sin(ang) * r;
    this.changeIn = 2 + Math.random() * 3;
  }

  update(dt) {
    // Hunger ticks
    this.acc += dt;
    if (this.acc >= 1) {
      this.acc -= 1;
      this.hunger = Math.max(0, this.hunger - 0.4);
      // Morale follows hunger
      if (this.hunger < 30) this.morale = Math.max(0, this.morale - 0.3);
      else if (this.hunger > 60) this.morale = Math.min(100, this.morale + 0.15);
    }

    // Try to feed itself from inventory if very hungry
    if (this.hunger < 40 && totalCount('meal') > 0) {
      removeAcross('meal', 1);
      this.hunger = Math.min(100, this.hunger + 45);
      this.morale = Math.min(100, this.morale + 5);
      toast(`${this.shortName()} comeu uma refeição`, '#a0e0a0');
    } else if (this.hunger < 25) {
      // try a raw crop
      for (const id of ['crop_potato','crop_wheat','crop_mushroom']) {
        if (totalCount(id) > 0) {
          removeAcross(id, 1);
          this.hunger = Math.min(100, this.hunger + (ITEMS[id].hunger || 15));
          toast(`${this.shortName()} comeu ${ITEMS[id].name}`, '#a0e0a0');
          break;
        }
      }
    }

    // Movement
    this.changeIn -= dt;
    if (this.changeIn <= 0) this.pickTarget();

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const speed = this.morale > 40 ? 36 : 18; // tired NPCs walk slower
    if (dist < 4) {
      this.setVelocity(0, 0);
    } else {
      this.setVelocity((dx / dist) * speed, (dy / dist) * speed);
      if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? 'right' : 'left';
      else this.dir = dy > 0 ? 'down' : 'up';
    }
    const moving = this.body.velocity.lengthSq() > 1;
    const key = moving ? `${this.tex}_walk_${this.dir}` : `${this.tex}_idle_${this.dir}`;
    if (!this.anims.currentAnim || this.anims.currentAnim.key !== key) {
      this.anims.play(key, true);
    }

    this.setDepth(this.y + 12);
    this.label.setPosition(this.x, this.y - 22);
    this.indicator.setPosition(this.x, this.y - 30);

    // Indicator
    if (this.hunger < 30) this.indicator.setText('!');
    else if (this.morale < 30) this.indicator.setText('…');
    else this.indicator.setText('');
  }

  dialogueLine() {
    const lines = {
      farmer: [
        'A terra está cansada, mas ainda dá fruto.',
        'Se eu tivesse mais sementes, plantaria tudo isso.',
        'A água do lago não serve. Precisa ser filtrada.',
        'Sem energia, não posso usar a estufa antiga.',
      ],
      mechanic: [
        'Aquele gerador antigo ainda pode funcionar. Precisamos de células.',
        'Sucata é tudo. Não jogue nada fora.',
        'Quando a luz voltar, monto um sistema de bombeamento.',
        'Cuidado com os fios expostos perto das ruínas.',
      ],
      explorer: [
        'Vi pegadas no leste. Talvez mais sobreviventes.',
        'As ruínas escondem coisas — vale revirar a sucata.',
        'O cogumelo dali cresce bem na sombra.',
        'Vou marcar o caminho para o lago, fica perigoso à noite.',
      ],
    };
    const arr = lines[this.kind] || ['…'];
    const line = arr[this.lineIdx % arr.length];
    this.lineIdx++;
    return line;
  }

  feedMe() {
    // Manual feed from player. Prefer meal, then crops.
    if (totalCount('meal') > 0) {
      removeAcross('meal', 1);
      this.hunger = Math.min(100, this.hunger + 45);
      this.morale = Math.min(100, this.morale + 6);
      toast(`Você alimentou ${this.shortName()}`, '#a0e0a0');
      return true;
    }
    for (const id of ['crop_potato','crop_wheat','crop_mushroom']) {
      if (totalCount(id) > 0) {
        removeAcross(id, 1);
        this.hunger = Math.min(100, this.hunger + (ITEMS[id].hunger || 15));
        this.morale = Math.min(100, this.morale + 2);
        toast(`Você alimentou ${this.shortName()}`, '#a0e0a0');
        return true;
      }
    }
    toast('Sem comida no inventário', '#e09090');
    return false;
  }
}
