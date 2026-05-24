import Phaser from 'phaser';
import { State, Events, toast, removeAcross, totalCount, pickup } from '../systems/GameState.js';
import { ITEMS } from '../data/items.js';

const TASK_INTERVAL = 10; // seconds between auto-work attempts

export default class NPC extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, kind, name) {
    const tex = `npc_${kind}`;
    super(scene, x, y, tex, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(10, 8).setOffset(3, 16);
    this.kind       = kind;
    this.npcName    = name;
    this.tex        = tex;
    this.dir        = 'down';
    this.hunger     = 80 + Math.random() * 20;
    this.morale     = 80;
    this.state      = 'wander';
    this.target     = { x, y };
    this.spawnX     = x;
    this.spawnY     = y;
    this.changeIn   = 0;
    this.acc        = 0;
    this.lineIdx    = 0;
    // Tool assignment
    this.assignedTool = null;    // item id e.g. 'axe'
    this.taskTimer    = Phaser.Math.Between(5, TASK_INTERVAL); // stagger start

    this.label = scene.add.text(x, y - 22, this.shortName(), {
      fontFamily: 'monospace', fontSize: '10px', color: '#cfd6df',
      backgroundColor: '#10141c80', padding: { x: 2, y: 1 }
    }).setOrigin(0.5);

    this.indicator = scene.add.text(x, y - 32, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffcf60',
    }).setOrigin(0.5);
  }

  shortName() { return this.npcName.split(' ')[0]; }

  // ── Tool assignment ────────────────────────────────────────────────────────
  assignTool(toolId) {
    this.assignedTool = toolId;
    State.quests.toolsGiven = (State.quests.toolsGiven || 0) + 1;
    const toolName = ITEMS[toolId] ? ITEMS[toolId].name : toolId;
    toast(`${this.shortName()} recebeu ${toolName} e vai trabalhar!`, '#a0e8c0');
    Events.emit('inv:changed');
  }

  removeTool() {
    if (!this.assignedTool) return;
    pickup(this.assignedTool, 1); // return to player
    this.assignedTool = null;
  }

  // ── Auto-work (called from WorldScene every tick) ─────────────────────────
  doTask(dt, scene) {
    if (!this.assignedTool) return;
    this.taskTimer -= dt;
    if (this.taskTimer > 0) return;
    this.taskTimer = TASK_INTERVAL + Phaser.Math.Between(0, 4);
    if (this.hunger < 20 || this.morale < 20) return; // too worn out

    const toolDef = ITEMS[this.assignedTool];
    if (!toolDef) return;
    const tool = toolDef.tool;

    if (tool === 'axe') {
      const node = scene.findNearestResource(this.x, this.y, 'tree', 320);
      if (node) {
        this._walkAndHarvest(scene, node, 'axe');
      } else {
        // No tree nearby — just drop some scavenged wood
        pickup('wood', 1);
        toast(`${this.shortName()} catou madeira`, '#c0dfc0');
      }
    } else if (tool === 'pickaxe') {
      const rock = scene.findNearestResource(this.x, this.y, 'rock', 320) ||
                   scene.findNearestResource(this.x, this.y, 'ruin', 320);
      if (rock) {
        this._walkAndHarvest(scene, rock, 'pickaxe');
      } else {
        pickup('stone', 1);
        toast(`${this.shortName()} extraiu pedra`, '#c0dfc0');
      }
    } else if (tool === 'scythe') {
      const fiber = scene.findNearestResource(this.x, this.y, 'fiber', 260);
      if (fiber) {
        this._walkAndHarvest(scene, fiber, 'scythe');
      } else {
        pickup('fiber', 1);
        toast(`${this.shortName()} coletou fibra`, '#c0dfc0');
      }
    } else if (tool === 'hoe' || tool === 'water') {
      // Farmer role: harvest ready crops, or water unwatered ones
      let acted = false;
      for (const key in scene.cropsByKey) {
        const crop = scene.cropsByKey[key];
        if (!crop || !crop.active) continue;
        if (crop.isReady()) {
          const ok = crop.harvest();
          if (ok) { delete scene.cropsByKey[key]; acted = true; break; }
        } else if (!crop.watered && tool === 'water') {
          crop.water();
          acted = true;
          toast(`${this.shortName()} regou a plantação`, '#a0d0f0');
          break;
        }
      }
      if (!acted) toast(`${this.shortName()} está cuidando do canteiro`, '#c0dfc0');
    }
  }

  _walkAndHarvest(scene, node, tool) {
    this.target.x = node.x + Phaser.Math.Between(-8, 8);
    this.target.y = node.y - 10;
    this.changeIn = 3;
    scene.time.delayedCall(2200, () => {
      if (!this.active || !node.active) return;
      const d = Phaser.Math.Distance.Between(this.x, this.y, node.x, node.y);
      if (d < 80) {
        node.tryHarvest(tool);
        toast(`${this.shortName()} trabalhou!`, '#a0e8c0');
      }
    });
  }

  // ── Per-frame update ───────────────────────────────────────────────────────
  pickTarget() {
    const radius = 80;
    const ang = Math.random() * Math.PI * 2;
    const r   = 20 + Math.random() * radius;
    this.target.x = this.spawnX + Math.cos(ang) * r;
    this.target.y = this.spawnY + Math.sin(ang) * r;
    this.changeIn = 2 + Math.random() * 3;
  }

  update(dt) {
    // Hunger tick
    this.acc += dt;
    if (this.acc >= 1) {
      this.acc -= 1;
      this.hunger = Math.max(0, this.hunger - 0.4);
      if (this.hunger < 30) this.morale = Math.max(0, this.morale - 0.3);
      else if (this.hunger > 60) this.morale = Math.min(100, this.morale + 0.15);
    }

    // Self-feed if very hungry
    if (this.hunger < 40 && totalCount('meal') > 0) {
      removeAcross('meal', 1);
      this.hunger = Math.min(100, this.hunger + 45);
      this.morale = Math.min(100, this.morale + 5);
      toast(`${this.shortName()} comeu uma refeição`, '#a0e0a0');
    } else if (this.hunger < 25) {
      for (const id of ['crop_potato','crop_wheat','crop_mushroom','crop_corn']) {
        if (totalCount(id) > 0) {
          removeAcross(id, 1);
          this.hunger = Math.min(100, this.hunger + (ITEMS[id]?.hunger || 15));
          toast(`${this.shortName()} comeu ${ITEMS[id].name}`, '#a0e0a0');
          break;
        }
      }
    }

    // Movement
    this.changeIn -= dt;
    if (this.changeIn <= 0) this.pickTarget();

    const dx   = this.target.x - this.x;
    const dy   = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const speed = this.morale > 40 ? 38 : 18;
    if (dist < 4) {
      this.setVelocity(0, 0);
    } else {
      this.setVelocity((dx / dist) * speed, (dy / dist) * speed);
      if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? 'right' : 'left';
      else this.dir = dy > 0 ? 'down' : 'up';
    }
    const moving = this.body.velocity.lengthSq() > 1;
    const key    = moving ? `${this.tex}_walk_${this.dir}` : `${this.tex}_idle_${this.dir}`;
    if (!this.anims.currentAnim || this.anims.currentAnim.key !== key) this.anims.play(key, true);

    this.setDepth(this.y + 12);
    this.label.setPosition(this.x, this.y - 22);
    this.indicator.setPosition(this.x, this.y - 33);

    // Status indicator
    const toolName = this.assignedTool ? (ITEMS[this.assignedTool]?.name || '') : '';
    if (this.hunger < 30) this.indicator.setText('!').setColor('#ff8080');
    else if (this.assignedTool) this.indicator.setText(`[${toolName}]`).setColor('#a0e8c0');
    else if (this.morale < 30) this.indicator.setText('…').setColor('#ffcf60');
    else this.indicator.setText('').setColor('#ffcf60');
  }

  // ── Dialogue / interaction ────────────────────────────────────────────────
  dialogueLine() {
    const lines = {
      farmer: [
        'A terra ainda está fértil. Só precisa de cuidado.',
        'Me dá uma enxada ou regador e cuido das plantações por você.',
        'A água do lago não serve. Filtre antes de usar.',
        'Sem comida, a colônia não sobrevive.',
      ],
      mechanic: [
        'Aquele gerador pode voltar a funcionar com células de energia.',
        'Me dá uma picareta — extraio pedra e metal enquanto você explora.',
        'Sucata é ouro. Não jogue nada fora.',
        'Com circuitos posso montar um sistema de bombeamento.',
      ],
      explorer: [
        'Vi recursos nas ruínas ao sudeste — vale explorar.',
        'Com um machado eu corto árvores enquanto você faz outra coisa.',
        'O cogumelo cresce na sombra do bosque a noroeste.',
        'Vou marcar o caminho pro lago. Perigoso à noite.',
      ],
    };
    const arr  = lines[this.kind] || ['…'];
    const line = arr[this.lineIdx % arr.length];
    this.lineIdx++;
    return line;
  }

  feedMe() {
    if (totalCount('meal') > 0) {
      removeAcross('meal', 1);
      this.hunger = Math.min(100, this.hunger + 45);
      this.morale = Math.min(100, this.morale + 6);
      State.quests.fedNPC = true;
      toast(`Você alimentou ${this.shortName()}`, '#a0e0a0');
      return true;
    }
    for (const id of ['crop_potato','crop_wheat','crop_mushroom','crop_corn']) {
      if (totalCount(id) > 0) {
        removeAcross(id, 1);
        this.hunger = Math.min(100, this.hunger + (ITEMS[id]?.hunger || 15));
        this.morale = Math.min(100, this.morale + 2);
        State.quests.fedNPC = true;
        toast(`Você alimentou ${this.shortName()}`, '#a0e0a0');
        return true;
      }
    }
    toast('Sem comida no inventário', '#e09090');
    return false;
  }
}
