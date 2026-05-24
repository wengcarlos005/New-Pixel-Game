import Phaser from 'phaser';
import { PLAYER_SPEED, PLAYER_RUN, STAMINA_MAX, HUNGER_MAX } from '../config/GameConfig.js';
import { State, Events, toast } from '../systems/GameState.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(10, 8).setOffset(3, 16);
    this.setDepth(y);
    this.dir = 'down';
    this.running = false;
    this.hungerAccum = 0;
    this.healAccum = 0;
  }

  update(dt, cursors, wasd, shift) {
    const left  = cursors.left.isDown  || wasd.A.isDown;
    const right = cursors.right.isDown || wasd.D.isDown;
    const up    = cursors.up.isDown    || wasd.W.isDown;
    const down  = cursors.down.isDown  || wasd.S.isDown;

    let vx = 0, vy = 0;
    if (left)  vx -= 1;
    if (right) vx += 1;
    if (up)    vy -= 1;
    if (down)  vy += 1;

    const moving = vx !== 0 || vy !== 0;
    const wantsRun = shift.isDown && State.player.stamina > 1 && moving;

    this.running = wantsRun;
    const speed = wantsRun ? PLAYER_RUN : PLAYER_SPEED;

    if (moving) {
      const len = Math.hypot(vx, vy);
      vx = (vx / len) * speed;
      vy = (vy / len) * speed;
      // Cardinal preference for animation
      if (Math.abs(vx) > Math.abs(vy)) this.dir = vx > 0 ? 'right' : 'left';
      else this.dir = vy > 0 ? 'down' : 'up';
    }
    this.setVelocity(vx, vy);
    this.setDepth(this.y + 12);

    const animKey = moving
      ? `player_walk_${this.dir}`
      : `player_idle_${this.dir}`;
    if (!this.anims.currentAnim || this.anims.currentAnim.key !== animKey) {
      this.anims.play(animKey, true);
    }

    // Stamina
    if (wantsRun) {
      State.player.stamina = Math.max(0, State.player.stamina - 18 * dt);
    } else if (!moving) {
      State.player.stamina = Math.min(STAMINA_MAX, State.player.stamina + 12 * dt);
    } else {
      State.player.stamina = Math.min(STAMINA_MAX, State.player.stamina + 4 * dt);
    }

    // Hunger drain
    this.hungerAccum += dt;
    if (this.hungerAccum >= 1) {
      this.hungerAccum -= 1;
      State.player.hunger = Math.max(0, State.player.hunger - 0.35);
      if (State.player.hunger <= 0) {
        State.player.hp = Math.max(0, State.player.hp - 0.5);
      }
    }

    // Slow regen if fed
    this.healAccum += dt;
    if (this.healAccum >= 2) {
      this.healAccum -= 2;
      if (State.player.hunger > 30 && State.player.hp < 100) {
        State.player.hp = Math.min(100, State.player.hp + 0.6);
      }
    }
  }

  eat(amount) {
    State.player.hunger = Math.min(HUNGER_MAX, State.player.hunger + amount);
    toast(`Comeu (+${amount} fome)`, '#a0e0a0');
  }

  facingTile() {
    const TILE = 32;
    const px = this.x, py = this.y + 8;
    const dx = this.dir === 'left' ? -TILE : this.dir === 'right' ? TILE : 0;
    const dy = this.dir === 'up'   ? -TILE : this.dir === 'down'  ? TILE : 0;
    const tx = Math.floor((px + dx) / TILE);
    const ty = Math.floor((py + dy) / TILE);
    return { tx, ty, wx: tx * TILE + TILE/2, wy: ty * TILE + TILE/2 };
  }
}
