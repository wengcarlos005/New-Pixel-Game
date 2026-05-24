'use strict';
// gen-craftpixel.cjs — Extract sprites from the craftpixel PNG sheets and write
// them into public/assets/, replacing the procedurally-generated placeholders.
//
// Run:  node gen-craftpixel.cjs
//
// Source directory: public/assets/craftpixel/PNG/
// Output directory: public/assets/
//
// ─── Sheet layout reference ────────────────────────────────────────────────
//  Trees_animation.png  576×1040  |  48-px columns, 80-px rows
//    12 columns → 6 trees per row (each tree = 2 cols = 96 px wide)
//    13 rows    → 13 animation stages (row 0 = static/idle frame)
//    Tree A col 0: x=0,   y=0   → lush oak/maple
//    Tree B col 2: x=192, y=0   → second lush variant
//    Tree C col 4: x=384, y=0   → third variant (pine?)
//    Tree D col 6: x=480, y=0   → fourth variant
//    (Adjust x offset if the first columns look like a dead/bare tree instead)
//
//  exterior.png         240×800  |  16-px tile grid (15 cols × 50 rows)
//    Boulders (large): y ≈ 624, x=0  →  48-64 px wide rocks
//    Small rocks:      y ≈ 720, x=0  →  32 px rocks
//    Round bushes:     y ≈ 192, x=0  →  32 px bushes (fiber stand-in)
//    Campfire:         y ≈  80, x=?  →  16-32 px
//    Mushrooms:        y ≈ 560, x=0
//
//  walls_floor.png      144×176  |  16-px tile grid (9 cols × 11 rows)
//    Stone wall:  y=0,   row 0-4
//    Dark floor:  y=128, row 8-10

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const SRC = path.join(__dirname, 'public/assets/craftpixel/PNG');
const OUT = path.join(__dirname, 'public/assets');

// ─── PNG decoder (identical to gen.cjs) ──────────────────────────────────────
function readPNG(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`Not a PNG: ${file}`);
  let pos = 8, w = 0, h = 0, bitDepth = 0, colorType = 0;
  let palette = null, transparency = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos); pos += 4;
    const type = buf.toString('ascii', pos, pos + 4); pos += 4;
    const data = buf.subarray(pos, pos + len); pos += len + 4;
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'PLTE') {
      palette = data;
    } else if (type === 'tRNS') {
      transparency = data;
    } else if (type === 'IEND') break;
  }
  if (bitDepth !== 8 || ![2, 3, 6].includes(colorType))
    throw new Error(`Unsupported PNG: ${file} (bitDepth=${bitDepth} colorType=${colorType})`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const stride = w * bpp;
  const recon = Buffer.alloc(h * stride);
  let rp = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[rp++];
    for (let x = 0; x < stride; x++) {
      const val = raw[rp++];
      const left   = x >= bpp ? recon[y * stride + x - bpp] : 0;
      const up     = y > 0 ? recon[(y - 1) * stride + x] : 0;
      const upLeft = (y > 0 && x >= bpp) ? recon[(y - 1) * stride + x - bpp] : 0;
      let v = val;
      if (filter === 1) v = val + left;
      else if (filter === 2) v = val + up;
      else if (filter === 3) v = val + Math.floor((left + up) / 2);
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
        v = val + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
      }
      recon[y * stride + x] = v & 255;
    }
  }
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const di = (y * w + x) * 4;
    if (colorType === 6) {
      const si = y * stride + x * 4;
      out[di] = recon[si]; out[di+1] = recon[si+1]; out[di+2] = recon[si+2]; out[di+3] = recon[si+3];
    } else if (colorType === 2) {
      const si = y * stride + x * 3;
      out[di] = recon[si]; out[di+1] = recon[si+1]; out[di+2] = recon[si+2]; out[di+3] = 255;
    } else {
      if (!palette) throw new Error(`Indexed PNG missing PLTE: ${file}`);
      const idx = recon[y * stride + x], pi = idx * 3;
      out[di] = palette[pi]; out[di+1] = palette[pi+1]; out[di+2] = palette[pi+2];
      out[di+3] = transparency && idx < transparency.length ? transparency[idx] : 255;
    }
  }
  return { w, h, pixels: out };
}

// ─── PNG encoder (RGBA) ───────────────────────────────────────────────────────
function u32be(v) { const b = Buffer.alloc(4); b.writeUInt32BE(v, 0); return b; }
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  let crc = 0xffffffff;
  for (const b of [...t, ...d]) { crc ^= b; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return Buffer.concat([u32be(d.length), t, d, u32be((crc ^ 0xffffffff) >>> 0)]);
}
function writePNG(file, w, h, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const rowLen = w * 4, raw = Buffer.alloc(h * (1 + rowLen));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + rowLen)] = 0;
    for (let x = 0; x < w; x++) {
      const pi = (y * w + x) * 4, ri = y * (1 + rowLen) + 1 + x * 4;
      raw[ri] = pixels[pi]; raw[ri+1] = pixels[pi+1]; raw[ri+2] = pixels[pi+2]; raw[ri+3] = pixels[pi+3];
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(file, png);
  console.log(`  wrote ${path.basename(file)} (${w}×${h})`);
}

// ─── Sprite helpers ───────────────────────────────────────────────────────────

/** Extract a rectangular region from a decoded image. Returns a new image object. */
function crop(img, sx, sy, sw, sh) {
  const pixels = Buffer.alloc(sw * sh * 4);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const px = sx + x, py = sy + y;
    if (px < 0 || py < 0 || px >= img.w || py >= img.h) continue;
    const si = (py * img.w + px) * 4;
    const di = (y * sw + x) * 4;
    pixels[di] = img.pixels[si]; pixels[di+1] = img.pixels[si+1];
    pixels[di+2] = img.pixels[si+2]; pixels[di+3] = img.pixels[si+3];
  }
  return { w: sw, h: sh, pixels };
}

/** Nearest-neighbour scale to (dw × dh). Preserves pixel art crispness. */
function scaleNN(img, dw, dh) {
  const pixels = Buffer.alloc(dw * dh * 4);
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
    const sx = Math.min(img.w - 1, Math.floor(x * img.w / dw));
    const sy = Math.min(img.h - 1, Math.floor(y * img.h / dh));
    const si = (sy * img.w + sx) * 4;
    const di = (y * dw + x) * 4;
    pixels[di] = img.pixels[si]; pixels[di+1] = img.pixels[si+1];
    pixels[di+2] = img.pixels[si+2]; pixels[di+3] = img.pixels[si+3];
  }
  return { w: dw, h: dh, pixels };
}

/** Extract and optionally scale. If dw/dh are 0 keep source dimensions. */
function extract(img, sx, sy, sw, sh, dw = 0, dh = 0) {
  const cropped = crop(img, sx, sy, sw, sh);
  if (dw && dh && (dw !== sw || dh !== sh)) return scaleNN(cropped, dw, dh);
  return cropped;
}

/** Flip image horizontally (for mirroring tree variants) */
function flipH(img) {
  const pixels = Buffer.alloc(img.w * img.h * 4);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const si = (y * img.w + (img.w - 1 - x)) * 4;
    const di = (y * img.w + x) * 4;
    pixels[di] = img.pixels[si]; pixels[di+1] = img.pixels[si+1];
    pixels[di+2] = img.pixels[si+2]; pixels[di+3] = img.pixels[si+3];
  }
  return { w: img.w, h: img.h, pixels };
}

/** Write a cropped/scaled sprite directly to public/assets/ */
function emit(filename, img) {
  writePNG(path.join(OUT, filename), img.w, img.h, img.pixels);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log('gen-craftpixel: extracting sprites…\n');

// Load all source sheets
const trees = readPNG(path.join(SRC, 'Trees_animation.png'));
const ext   = readPNG(path.join(SRC, 'exterior.png'));
const wf    = readPNG(path.join(SRC, 'walls_floor.png'));
const ground = readPNG(path.join(SRC, 'ground_grass_details.png'));

console.log(`Trees_animation : ${trees.w}×${trees.h}`);
console.log(`exterior        : ${ext.w}×${ext.h}`);
console.log(`walls_floor     : ${wf.w}×${wf.h}`);
console.log(`ground_grass    : ${ground.w}×${ground.h}`);
console.log('');

// ─── Trees ───────────────────────────────────────────────────────────────────
// Trees_animation.png — 12 cols of 48 px → 6 trees/row (each tree = 96 px wide)
//   Row 0 (y=0):   first set of tree variants, frame 0 (idle)
//   Use first two cols (0-95) for tree_lush.
//   Use cols 2-3 (96-191) as a second lush variant, or try a row offset for dead.
console.log('── trees');

// Lush tree: column group 0 (x=0..95), row 0 (y=0..79)
const treeLushRaw = extract(trees, 0, 0, 96, 80);
emit('tree_lush.png', treeLushRaw);

// Dead tree: column group 2 (x=192..287), row 0
// If this still looks lush, try x=288 or x=384 for a sparser variant.
const treeDeadRaw = extract(trees, 192, 0, 96, 80);
emit('tree_dead.png', treeDeadRaw);

// ─── Rock ────────────────────────────────────────────────────────────────────
// exterior.png — 16-px tile grid
//   Large boulders start around y=624; pick a 3×3-tile (48×48) region.
//   If this looks wrong, adjust: y=640 for the second boulder row, or
//   try y=720 for a smaller 2×2-tile (32×32) rock.
console.log('── rocks / props');

const rock48 = extract(ext, 0, 624, 48, 48);
emit('rock.png', rock48);

// Ruin wall: pull a 48×32 stone-ruin section.
// In exterior.png ruins/walls tend to be in the mid-section around y=320-400.
// Try y=336 for a crumbled stone section (3×2 tiles).
const ruinRaw = extract(ext, 0, 336, 48, 32);
emit('ruin_wall.png', ruinRaw);

// Fiber/bush: round shrubs typically sit around y=192 in exterior.png.
// 2×2 tiles = 32×32 px.
const fiberRaw = extract(ext, 0, 192, 32, 32);
emit('fiber.png', fiberRaw);

// Scrap pile: look around y=240 (misc debris area) — 2×2 tiles.
// If this is wrong, try y=256 or y=288.
const scrapRaw = extract(ext, 32, 240, 32, 32);
emit('scrap.png', scrapRaw);

// ─── Walls / floors ──────────────────────────────────────────────────────────
// walls_floor.png — 16-px tile grid
//   Stone walls fill the upper portion (roughly rows 0-5, y=0-95).
//   Dark floor fills the lower portion (rows 8-10, y=128-175).
console.log('── walls / floors');

// wall_tile: 2×2 tile (32×32) stone wall from top-left of sheet
const wallRaw = extract(wf, 0, 0, 32, 32);
emit('wall_tile.png', wallRaw);

// floor_tile: 2×2 tile dark floor from bottom section
const floorY = Math.max(0, wf.h - 48); // last 3 rows
const floorRaw = extract(wf, 0, floorY, 32, 32);
emit('floor_tile.png', floorRaw);

// ─── Generator sprites ────────────────────────────────────────────────────────
// There's no exact generator/engine sprite in the craftpixel pack, so skip for now.
// gen.cjs procedural fallbacks remain for: generator_broken, generator_on, campfire,
// chest, water_tank, small_gen, planter.

console.log('\nDone! Re-run "npm run gen" only if you also want to refresh the terrain/crop sheets.');
console.log('The replaced assets (tree_lush, tree_dead, rock, fiber, scrap, ruin_wall,');
console.log('wall_tile, floor_tile) are written directly to public/assets/.');
