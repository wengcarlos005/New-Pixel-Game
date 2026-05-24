import Phaser from 'phaser';

export const GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  width: 960,
  height: 540,
  backgroundColor: '#0a0d12',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  fps: { forceSetTimeOut: true, target: 60 },
  pauseOnBlur: false,
  disableContextMenu: true,
};

// Tunables
export const TILE = 32;
export const WORLD = { cols: 48, rows: 36 };
export const PLAYER_SPEED = 110;
export const PLAYER_RUN = 175;
export const STAMINA_MAX = 100;
export const HUNGER_MAX = 100;
export const HEALTH_MAX = 100;
export const DAY_LENGTH_MS = 8 * 60 * 1000; // 8 real minutes per in-game day
