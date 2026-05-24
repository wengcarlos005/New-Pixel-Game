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
// Trees_animation.png (576×1040) — 12 cols of 48 px, rows of 80 px
//   Each tree = 2 cols = 96 px wide. 6 trees per row, 13 animation rows.
//   Row 0 (y=0): static/idle frame for all 6 tree variants — ALL lush green apple trees.
//   The craftpixel pack has NO dead/bare tree — tree_dead must be supplied externally.
console.log('── trees');

// Lush tree: column group 0 (x=0..95), row 0 (y=0..79) — confirmed lush apple tree ✓
const treeLushRaw = extract(trees, 0, 0, 96, 80);
emit('tree_lush.png', treeLushRaw);

// tree_dead.png: craftpixel has no bare/dead tree — draw procedurally.
// Style matches the pixel art reference: brown trunk ~6px wide, bare upswept branches,
// orange highlights, dark outline.  48×80 px (same canvas as tree_lush for consistency).
(function drawDeadTree(){
  const W = 48, H = 80;
  const px = Buffer.alloc(W * H * 4); // transparent

  function dot(x, y, r, g, b, a=255){
    if (x<0||y<0||x>=W||y>=H) return;
    const i=(y*W+x)*4; px[i]=r; px[i+1]=g; px[i+2]=b; px[i+3]=a;
  }
  function rect(x, y, w, h, r, g, b){
    for(let dy=0;dy<h;dy++) for(let dx=0;dx<w;dx++) dot(x+dx,y+dy,r,g,b);
  }
  // Bresenham line
  function ln(x0,y0,x1,y1,r,g,b,thick=1){
    let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;
    while(true){
      for(let ty=-Math.floor(thick/2);ty<=Math.floor(thick/2);ty++)
        for(let tx=-Math.floor(thick/2);tx<=Math.floor(thick/2);tx++)
          dot(x0+tx,y0+ty,r,g,b);
      if(x0===x1&&y0===y1) break;
      const e2=2*err;
      if(e2>=dy){err+=dy;x0+=sx;}
      if(e2<=dx){err+=dx;y0+=sy;}
    }
  }

  const DARK  = [72, 38, 14];   // very dark brown (outline/shadow)
  const MID   = [112, 58, 22];  // mid brown (main trunk)
  const LIGHT = [155, 88, 38];  // lighter brown (highlight)
  const WARM  = [190,110, 45];  // warm orange-brown (edge highlight)

  const cx = 24; // trunk center X

  // ── Ground roots / base (y 72-79)
  ln(cx-4, 79, cx-7, 73, DARK[0],DARK[1],DARK[2], 2);
  ln(cx+4, 79, cx+7, 73, DARK[0],DARK[1],DARK[2], 2);
  ln(cx-1, 79, cx-1, 73, MID[0],MID[1],MID[2], 2);
  ln(cx+1, 79, cx+2, 73, MID[0],MID[1],MID[2], 2);

  // ── Main trunk (y 20-73), 5px wide with shading
  rect(cx-3, 20, 6, 53, DARK[0],DARK[1],DARK[2]);   // shadow left edge
  rect(cx-2, 20, 4, 53, MID[0],MID[1],MID[2]);       // mid body
  rect(cx,   20, 2, 53, LIGHT[0],LIGHT[1],LIGHT[2]); // highlight right

  // ── Large branch LEFT  (y≈35, goes out-left then up)
  ln(cx-2, 45, cx-12, 38, DARK[0],DARK[1],DARK[2], 2);
  ln(cx-2, 45, cx-11, 37, MID[0],MID[1],MID[2], 2);
  ln(cx-11,37, cx-10, 28, MID[0],MID[1],MID[2], 2);
  // twig tips left
  ln(cx-10,28, cx-14, 22, DARK[0],DARK[1],DARK[2]);
  ln(cx-10,28, cx-6,  20, MID[0],MID[1],MID[2]);
  ln(cx-14,22, cx-16, 18, DARK[0],DARK[1],DARK[2]);

  // ── Large branch RIGHT (y≈30, goes out-right then up)
  ln(cx+2, 38, cx+13, 30, DARK[0],DARK[1],DARK[2], 2);
  ln(cx+2, 38, cx+12, 29, MID[0],MID[1],MID[2], 2);
  ln(cx+12,29, cx+11, 20, MID[0],MID[1],MID[2], 2);
  // twig tips right
  ln(cx+11,20, cx+16, 14, DARK[0],DARK[1],DARK[2]);
  ln(cx+11,20, cx+7,  13, MID[0],MID[1],MID[2]);
  ln(cx+16,14, cx+18, 10, DARK[0],DARK[1],DARK[2]);

  // ── Mid branch LEFT (y≈28)
  ln(cx-2, 30, cx-8,  24, MID[0],MID[1],MID[2]);
  ln(cx-8, 24, cx-11, 18, DARK[0],DARK[1],DARK[2]);
  ln(cx-8, 24, cx-5,  17, MID[0],MID[1],MID[2]);

  // ── Top of trunk splits into two leaders
  ln(cx-1, 20, cx-3, 10, MID[0],MID[1],MID[2], 2);
  ln(cx+1, 20, cx+3, 10, MID[0],MID[1],MID[2]);
  ln(cx-3, 10, cx-4,  4, DARK[0],DARK[1],DARK[2]);
  ln(cx-3, 10, cx-1,  5, MID[0],MID[1],MID[2]);
  ln(cx+3, 10, cx+5,  4, DARK[0],DARK[1],DARK[2]);

  // ── Warm highlight flecks on trunk edges
  for(let y=22;y<70;y+=4) dot(cx+2,y, WARM[0],WARM[1],WARM[2]);
  for(let y=25;y<60;y+=6) dot(cx-3,y, DARK[0],DARK[1],DARK[2]);

  writePNG(path.join(OUT,'tree_dead.png'), W, H, px);
  console.log('  drew tree_dead.png procedurally (48×80, bare brown trunk)');
})();

// ─── Rock ────────────────────────────────────────────────────────────────────
// exterior.png (240×800) — 16-px tile grid, confirmed layout:
//   r41-44 (y=656..703): Large rounded beige/grey boulders, 4×4 tiles = 64×64 px
//   r45-47 (y=720..751): Medium grey-brown stone chunks, 3×3 tiles = 48×48 px
//   r48-49 (y=768..783): Small blue-grey pointed rocks, clusters of 4
//   r25-28 (y=400..447): Brown earthen rock piles (for ruins/rubble)
//   r11-16 (y=176..255): Large round green bushes (perfect for fiber)
//   r17-18 (y=272..287): Tree stumps (for post-harvest)
console.log('── rocks / props');

// Large boulder (r41-44): x=0, y=656, 64×64 — the main "rock" resource node
const rockRaw = extract(ext, 0, 656, 64, 64);
emit('rock.png', rockRaw);

// Ruin wall: use the brown earthen rock rubble pile at r25-28 (y=400, 48×48)
// Looks like crumbled stone/ruins — 3×3 tile region.
const ruinRaw = extract(ext, 0, 400, 48, 48);
emit('ruin_wall.png', ruinRaw);

// Fiber/bush: large round green bush at r11-14 (y=176, 64×64) — confirmed ✓
// Two overlapping round canopies; looks like a wild shrub perfect for fiber.
const fiberRaw = extract(ext, 0, 176, 64, 64);
emit('fiber.png', fiberRaw);

// Scrap pile: small brown pebble cluster at r7 (y=112) — closest to debris in this pack.
// 3×2 tile region (48×32). For better scrap art supply a custom sprite.
const scrapRaw = extract(ext, 80, 112, 48, 32);
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
