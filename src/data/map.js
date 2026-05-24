import { T } from './tiles.js';
import { WORLD } from '../config/GameConfig.js';

// Build the initial tile grid procedurally. Five regions:
//  - central wasteland (ash / gravel) with ruins
//  - abandoned farm (dirt patches) — top-right
//  - power station (metal floor) — bottom-right
//  - contaminated lake — bottom-left
//  - ruins cluster — left
export function buildMap() {
  const { cols, rows } = WORLD;
  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid.push(new Array(cols).fill(T.GRASS_DRY));
  }

  // Bands of ash near center
  for (let r = 8; r < 28; r++) {
    for (let c = 12; c < 36; c++) {
      const d = Math.abs(r - 18) + Math.abs(c - 24);
      if (d < 8 && ((c * 17 + r * 13) % 9) < 6) grid[r][c] = T.ASH;
    }
  }

  // Abandoned farm — top-right
  for (let r = 3; r < 11; r++) {
    for (let c = 30; c < 44; c++) {
      if (((c + r) % 3) !== 0) grid[r][c] = T.DIRT;
    }
  }
  // a few patches already tilled to hint the mechanic
  for (let c = 34; c < 40; c++) grid[6][c] = T.SOIL_TILL;
  for (let c = 34; c < 40; c++) grid[8][c] = T.SOIL_TILL;

  // Power station — bottom-right (metal floor)
  for (let r = 23; r < 33; r++) {
    for (let c = 30; c < 44; c++) {
      grid[r][c] = T.METAL;
    }
  }
  // Gravel approach
  for (let r = 21; r < 23; r++) for (let c = 30; c < 44; c++) grid[r][c] = T.GRAVEL;

  // Contaminated lake — bottom-left
  for (let r = 24; r < 34; r++) {
    for (let c = 3; c < 14; c++) {
      const dx = c - 8.5, dy = r - 29;
      if (dx * dx * 1.3 + dy * dy * 1.7 < 32) grid[r][c] = T.WATER_BAD;
    }
  }
  // sand/ash shore around lake
  for (let r = 23; r < 35; r++) for (let c = 2; c < 15; c++) {
    if (grid[r][c] === T.GRASS_DRY) {
      const dx = c - 8.5, dy = r - 29;
      if (dx * dx * 1.3 + dy * dy * 1.7 < 60) grid[r][c] = T.ASH;
    }
  }

  // Ruins area — left middle
  for (let r = 10; r < 20; r++) for (let c = 3; c < 12; c++) {
    if (((c * 7 + r * 11) % 5) === 0) grid[r][c] = T.GRAVEL;
  }

  // Paths between zones (gravel)
  // home base center -> farm
  for (let c = 20; c < 32; c++) grid[10][c] = T.GRAVEL;
  // home base -> power station
  for (let r = 18; r < 25; r++) grid[r][30] = T.GRAVEL;
  // home base -> ruins
  for (let c = 8; c < 20; c++) grid[16][c] = T.GRAVEL;
  // home base -> lake
  for (let r = 18; r < 26; r++) grid[r][14] = T.GRAVEL;

  // Tiny central clearing (home base)
  for (let r = 16; r < 22; r++) for (let c = 20; c < 28; c++) {
    if (grid[r][c] === T.ASH) grid[r][c] = T.GRAVEL;
  }

  return grid;
}

// Spawn definitions for non-tile entities:
//  type ∈ {'tree','rock','scrap','fiber','ruin','generator','npc'}
export const SPAWNS = [
  // Generator (the keystone, near power station)
  { type:'generator', x: 37 * 32 + 16, y: 27 * 32 + 16 },

  // NPCs initial (around home base)
  { type:'npc', kind:'farmer',   x: 22 * 32 + 16, y: 17 * 32 + 16, name:'Lia (Agricultora)' },
  { type:'npc', kind:'mechanic', x: 24 * 32 + 16, y: 19 * 32 + 16, name:'Bram (Mecânico)' },
  { type:'npc', kind:'explorer', x: 26 * 32 + 16, y: 17 * 32 + 16, name:'Nyra (Exploradora)' },

  // Trees around perimeter
  { type:'tree', x: 5  * 32 + 16, y: 6  * 32 + 16 },
  { type:'tree', x: 9  * 32 + 16, y: 4  * 32 + 16 },
  { type:'tree', x: 16 * 32 + 16, y: 6  * 32 + 16 },
  { type:'tree', x: 20 * 32 + 16, y: 4  * 32 + 16 },
  { type:'tree', x: 14 * 32 + 16, y: 30 * 32 + 16 },
  { type:'tree', x: 18 * 32 + 16, y: 32 * 32 + 16 },
  { type:'tree', x: 23 * 32 + 16, y: 30 * 32 + 16 },
  { type:'tree', x: 40 * 32 + 16, y: 14 * 32 + 16 },
  { type:'tree', x: 43 * 32 + 16, y: 18 * 32 + 16 },
  { type:'tree', x: 6  * 32 + 16, y: 22 * 32 + 16 },

  // Rocks
  { type:'rock', x: 5  * 32 + 16, y: 14 * 32 + 16 },
  { type:'rock', x: 30 * 32 + 16, y: 6  * 32 + 16 },
  { type:'rock', x: 12 * 32 + 16, y: 26 * 32 + 16 },
  { type:'rock', x: 33 * 32 + 16, y: 18 * 32 + 16 },
  { type:'rock', x: 8  * 32 + 16, y: 32 * 32 + 16 },

  // Scrap (ruins / power station)
  { type:'scrap', x: 7  * 32 + 16, y: 12 * 32 + 16 },
  { type:'scrap', x: 9  * 32 + 16, y: 18 * 32 + 16 },
  { type:'scrap', x: 32 * 32 + 16, y: 25 * 32 + 16 },
  { type:'scrap', x: 41 * 32 + 16, y: 26 * 32 + 16 },
  { type:'scrap', x: 35 * 32 + 16, y: 30 * 32 + 16 },

  // Fibers
  { type:'fiber', x: 18 * 32 + 16, y: 8  * 32 + 16 },
  { type:'fiber', x: 26 * 32 + 16, y: 6  * 32 + 16 },
  { type:'fiber', x: 14 * 32 + 16, y: 13 * 32 + 16 },
  { type:'fiber', x: 30 * 32 + 16, y: 14 * 32 + 16 },
  { type:'fiber', x: 18 * 32 + 16, y: 25 * 32 + 16 },
  { type:'fiber', x: 7  * 32 + 16, y: 27 * 32 + 16 },

  // Ruins (decorative + light cover)
  { type:'ruin', x: 5  * 32 + 16, y: 16 * 32 + 16 },
  { type:'ruin', x: 9  * 32 + 16, y: 14 * 32 + 16 },
  { type:'ruin', x: 11 * 32 + 16, y: 19 * 32 + 16 },
  { type:'ruin', x: 34 * 32 + 16, y: 22 * 32 + 16 },
  { type:'ruin', x: 41 * 32 + 16, y: 31 * 32 + 16 },
];

// Convenient spawn point for the player
export const PLAYER_SPAWN = { x: 24 * 32, y: 18 * 32 };
