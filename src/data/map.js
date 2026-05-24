import { T } from './tiles.js';
import { WORLD } from '../config/GameConfig.js';

// Build the initial tile grid procedurally. Six regions:
//  - central wasteland (ash / gravel) with ruins
//  - abandoned farm (dirt patches) — top-right quadrant
//  - power station (metal floor) — bottom-right
//  - contaminated lake — bottom-left
//  - ruins cluster — left middle
//  - dense forest — far top-left (lush after generator activated)
//  - river — far right
//  - research ruins — far bottom-right corner
export function buildMap() {
  const { cols, rows } = WORLD;
  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid.push(new Array(cols).fill(T.GRASS_DRY));
  }

  // ── Dense forest zone (top-left, cols 0-14, rows 0-14)
  for (let r = 0; r < 14; r++) {
    for (let c = 0; c < 16; c++) {
      // Trees placed in WorldScene; tiles go lush grass + some dirt
      const n = ((c*13+r*17) % 7);
      if (n < 5) grid[r][c] = T.GRASS_LUSH;
    }
  }
  // Small forest clearing stream (clean water trickle)
  for (let c = 4; c < 12; c++) grid[10][c] = T.WATER_CLEAN;
  for (let r = 8; r < 14; r++) grid[r][8] = T.WATER_CLEAN;

  // ── Bands of ash near center
  for (let r = 8; r < 28; r++) {
    for (let c = 12; c < 36; c++) {
      const d = Math.abs(r - 18) + Math.abs(c - 24);
      if (d < 8 && ((c * 17 + r * 13) % 9) < 6) grid[r][c] = T.ASH;
    }
  }

  // ── Abandoned farm — top-right (cols 30-50, rows 3-12)
  for (let r = 3; r < 12; r++) {
    for (let c = 30; c < 52; c++) {
      if (c >= cols) break;
      if (((c + r) % 3) !== 0) grid[r][c] = T.DIRT;
    }
  }
  // pre-tilled rows to hint the mechanic
  for (let c = 34; c < 42; c++) { grid[6][c] = T.SOIL_TILL; grid[8][c] = T.SOIL_TILL; }

  // ── Power station — bottom-right (metal floor, cols 30-46, rows 22-34)
  for (let r = 22; r < 35; r++) {
    for (let c = 30; c < 48; c++) {
      if (c >= cols) break;
      grid[r][c] = T.METAL;
    }
  }
  // Gravel approach to station
  for (let r = 20; r < 22; r++) for (let c = 30; c < 48; c++) { if (c<cols) grid[r][c] = T.GRAVEL; }

  // ── Contaminated lake — bottom-left (cols 2-14, rows 24-35)
  for (let r = 24; r < 36; r++) {
    for (let c = 2; c < 15; c++) {
      if (r >= rows) break;
      const dx = c - 8.5, dy = r - 29;
      if (dx * dx * 1.3 + dy * dy * 1.7 < 32) grid[r][c] = T.WATER_BAD;
    }
  }
  // ash shore around lake
  for (let r = 23; r < Math.min(rows,36); r++) for (let c = 2; c < 15; c++) {
    if (grid[r][c] === T.GRASS_DRY) {
      const dx = c - 8.5, dy = r - 29;
      if (dx * dx * 1.3 + dy * dy * 1.7 < 60) grid[r][c] = T.ASH;
    }
  }

  // ── Ruins area — left middle (cols 2-12, rows 10-22)
  for (let r = 10; r < 22; r++) for (let c = 2; c < 12; c++) {
    if (((c * 7 + r * 11) % 5) === 0) grid[r][c] = T.GRAVEL;
  }

  // ── River — far right (cols 50-55, rows 0-30) [only within world]
  for (let r = 0; r < Math.min(rows, 30); r++) {
    const riverC = Math.min(cols-1, 50 + Math.floor(Math.sin(r * 0.4) * 2));
    grid[r][riverC] = T.WATER_CLEAN;
    if (riverC+1 < cols) grid[r][riverC+1] = T.WATER_CLEAN;
    // sandy banks
    for (let dc = -2; dc <= 3; dc++) {
      const c = riverC + dc;
      if (c >= 0 && c < cols && grid[r][c] === T.GRASS_DRY) grid[r][c] = T.GRAVEL;
    }
  }

  // ── Research lab ruins — bottom-right corner (cols 38-50, rows 26-36)
  for (let r = 26; r < Math.min(rows, 37); r++) {
    for (let c = 38; c < Math.min(cols, 52); c++) {
      if (grid[r][c] === T.METAL) {
        // inside station - skip
        if (c < 48 && r < 35) continue;
      }
      const n = ((c * 11 + r * 7) % 6);
      if (n < 3) grid[r][c] = T.GRAVEL;
      else if (n < 4) grid[r][c] = T.ASH;
    }
  }
  // Clean metal floor for lab area
  for (let r = 28; r < Math.min(rows, 34); r++) {
    for (let c = 40; c < Math.min(cols, 48); c++) {
      grid[r][c] = T.METAL_CLEAN;
    }
  }

  // ── Gravel paths between zones
  for (let c = 20; c < 32; c++) grid[10][c] = T.GRAVEL;  // home → farm
  for (let r = 18; r < 25; r++) grid[r][30] = T.GRAVEL;  // home → station
  for (let c = 8; c < 20; c++) grid[16][c] = T.GRAVEL;   // home → ruins
  for (let r = 18; r < 26; r++) grid[r][14] = T.GRAVEL;  // home → lake
  for (let c = 14; c < 22; c++) grid[5][c] = T.GRAVEL;   // forest → farm
  for (let r = 5; r < 12; r++) grid[r][14] = T.GRAVEL;   // forest path south

  // ── Tiny central clearing (home base)
  for (let r = 16; r < 22; r++) for (let c = 20; c < 28; c++) {
    if (grid[r][c] === T.ASH) grid[r][c] = T.GRAVEL;
  }

  return grid;
}

// Spawn definitions for non-tile entities:
//  type ∈ {'tree','rock','scrap','fiber','ruin','generator','npc','chest_loot'}
export const SPAWNS = [
  // Generator (the keystone, near power station)
  { type:'generator', x: 37 * 32 + 16, y: 27 * 32 + 16 },

  // NPCs initial (around home base)
  { type:'npc', kind:'farmer',   x: 22 * 32 + 16, y: 17 * 32 + 16, name:'Lia (Agricultora)' },
  { type:'npc', kind:'mechanic', x: 24 * 32 + 16, y: 19 * 32 + 16, name:'Bram (Mecânico)' },
  { type:'npc', kind:'explorer', x: 26 * 32 + 16, y: 17 * 32 + 16, name:'Nyra (Exploradora)' },

  // ── Forest zone trees (dense — top-left)
  { type:'tree', x: 2  * 32 + 16, y: 2  * 32 + 16 },
  { type:'tree', x: 5  * 32 + 16, y: 3  * 32 + 16 },
  { type:'tree', x: 9  * 32 + 16, y: 2  * 32 + 16 },
  { type:'tree', x: 12 * 32 + 16, y: 4  * 32 + 16 },
  { type:'tree', x: 2  * 32 + 16, y: 7  * 32 + 16 },
  { type:'tree', x: 6  * 32 + 16, y: 8  * 32 + 16 },
  { type:'tree', x: 11 * 32 + 16, y: 7  * 32 + 16 },
  { type:'tree', x: 3  * 32 + 16, y: 12 * 32 + 16 },
  { type:'tree', x: 7  * 32 + 16, y: 13 * 32 + 16 },

  // ── Trees in other zones
  { type:'tree', x: 16 * 32 + 16, y: 3  * 32 + 16 },
  { type:'tree', x: 20 * 32 + 16, y: 4  * 32 + 16 },
  { type:'tree', x: 14 * 32 + 16, y: 30 * 32 + 16 },
  { type:'tree', x: 18 * 32 + 16, y: 32 * 32 + 16 },
  { type:'tree', x: 23 * 32 + 16, y: 30 * 32 + 16 },
  { type:'tree', x: 40 * 32 + 16, y: 14 * 32 + 16 },
  { type:'tree', x: 43 * 32 + 16, y: 18 * 32 + 16 },
  { type:'tree', x: 6  * 32 + 16, y: 22 * 32 + 16 },

  // ── Rocks
  { type:'rock', x: 5  * 32 + 16, y: 14 * 32 + 16 },
  { type:'rock', x: 30 * 32 + 16, y: 6  * 32 + 16 },
  { type:'rock', x: 12 * 32 + 16, y: 26 * 32 + 16 },
  { type:'rock', x: 33 * 32 + 16, y: 18 * 32 + 16 },
  { type:'rock', x: 8  * 32 + 16, y: 32 * 32 + 16 },
  { type:'rock', x: 4  * 32 + 16, y: 20 * 32 + 16 },  // near ruins
  { type:'rock', x: 10 * 32 + 16, y: 13 * 32 + 16 },  // forest edge

  // ── Scrap (ruins / power station / research area)
  { type:'scrap', x: 7  * 32 + 16, y: 12 * 32 + 16 },
  { type:'scrap', x: 9  * 32 + 16, y: 18 * 32 + 16 },
  { type:'scrap', x: 32 * 32 + 16, y: 25 * 32 + 16 },
  { type:'scrap', x: 41 * 32 + 16, y: 26 * 32 + 16 },
  { type:'scrap', x: 35 * 32 + 16, y: 30 * 32 + 16 },
  { type:'scrap', x: 44 * 32 + 16, y: 29 * 32 + 16 }, // research ruins
  { type:'scrap', x: 46 * 32 + 16, y: 31 * 32 + 16 }, // research ruins

  // ── Fibers (more scattered)
  { type:'fiber', x: 18 * 32 + 16, y: 8  * 32 + 16 },
  { type:'fiber', x: 26 * 32 + 16, y: 6  * 32 + 16 },
  { type:'fiber', x: 14 * 32 + 16, y: 13 * 32 + 16 },
  { type:'fiber', x: 30 * 32 + 16, y: 14 * 32 + 16 },
  { type:'fiber', x: 18 * 32 + 16, y: 25 * 32 + 16 },
  { type:'fiber', x: 7  * 32 + 16, y: 27 * 32 + 16 },
  { type:'fiber', x: 13 * 32 + 16, y: 6  * 32 + 16 }, // forest
  { type:'fiber', x: 4  * 32 + 16, y: 5  * 32 + 16 }, // forest
  { type:'fiber', x: 10 * 32 + 16, y: 11 * 32 + 16 }, // forest

  // ── Ruins (decorative + light cover)
  { type:'ruin', x: 5  * 32 + 16, y: 16 * 32 + 16 },
  { type:'ruin', x: 9  * 32 + 16, y: 14 * 32 + 16 },
  { type:'ruin', x: 11 * 32 + 16, y: 19 * 32 + 16 },
  { type:'ruin', x: 34 * 32 + 16, y: 22 * 32 + 16 },
  { type:'ruin', x: 41 * 32 + 16, y: 31 * 32 + 16 },
  { type:'ruin', x: 42 * 32 + 16, y: 28 * 32 + 16 }, // research area
  { type:'ruin', x: 45 * 32 + 16, y: 32 * 32 + 16 }, // research area
  { type:'ruin', x: 3  * 32 + 16, y: 16 * 32 + 16 }, // west ruins

  // ── Loot chest in research ruins (has energy_cell + circuit)
  { type:'chest_loot', x: 43 * 32 + 16, y: 30 * 32 + 16,
    items: [{ id:'energy_cell', qty:1 }, { id:'circuit', qty:2 }, { id:'research_data', qty:3 }] },
  // Forest loot chest (has seeds + fiber)
  { type:'chest_loot', x: 3 * 32 + 16, y: 4 * 32 + 16,
    items: [{ id:'seed_potato', qty:4 }, { id:'fiber', qty:6 }, { id:'research_data', qty:1 }] },
];

// Convenient spawn point for the player
export const PLAYER_SPAWN = { x: 24 * 32, y: 18 * 32 };
