// Tile index in terrain.png (1 row of 11 tiles, 32 px each).
export const T = {
  GRASS_DRY:   0,
  GRASS_LUSH:  1,
  DIRT:        2,
  SOIL_TILL:   3,
  SOIL_WET:    4,
  WATER_BAD:   5,
  WATER_CLEAN: 6,
  GRAVEL:      7,
  METAL:       8,
  METAL_CLEAN: 9,
  ASH:        10,
};
// Tiles you cannot walk on (collision)
export const SOLID = new Set([T.WATER_BAD, T.WATER_CLEAN]);
