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

// Fiber: draw procedural spiky wild-plant sprite matching the reference icon.
// Style: dense radiating pointed leaves, dark-to-bright green, 48×48.
(function drawFiber(){
  const W = 48, H = 48;
  const px = Buffer.alloc(W * H * 4);

  function dot(x, y, r, g, b, a=255){
    if(x<0||y<0||x>=W||y>=H) return;
    const i=(y*W+x)*4; px[i]=r; px[i+1]=g; px[i+2]=b; px[i+3]=a;
  }
  function ln(x0,y0,x1,y1,r,g,b,thick=1){
    let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;
    for(;;){
      for(let ty=-Math.floor(thick/2);ty<=Math.floor(thick/2);ty++)
        for(let tx=-Math.floor(thick/2);tx<=Math.floor(thick/2);tx++)
          dot(x0+tx,y0+ty,r,g,b);
      if(x0===x1&&y0===y1) break;
      const e2=2*err;
      if(e2>=dy){err+=dy;x0+=sx;}
      if(e2<=dx){err+=dx;y0+=sy;}
    }
  }

  const D1=[10, 40, 10];    // very dark green
  const D2=[18, 72, 18];    // dark green
  const M =[32,120, 32];    // mid green
  const L =[56,168, 48];    // bright green
  const TIP=[88,210, 60];   // light tip

  const cx=24, cy=28; // plant base slightly below center

  // ── Ground cluster of stems
  ln(cx-3,H-1,cx-4,cy+6, D1[0],D1[1],D1[2],2);
  ln(cx,  H-1,cx,  cy+4, D2[0],D2[1],D2[2],2);
  ln(cx+3,H-1,cx+4,cy+6, D1[0],D1[1],D1[2],2);

  // ── Helper: draw one spiky leaf arm (base→mid→tip with 3 segments)
  function spike(bx,by, mx,my, tx,ty, thick){
    ln(bx,by,mx,my, D2[0],D2[1],D2[2],thick);
    ln(mx,my,tx,ty, M[0],M[1],M[2],Math.max(1,thick-1));
    dot(tx,ty, TIP[0],TIP[1],TIP[2]);
    // add a parallel highlight pixel along each segment
    dot(Math.round((bx+mx)/2)+1, Math.round((by+my)/2), L[0],L[1],L[2]);
    dot(Math.round((mx+tx)/2),   Math.round((my+ty)/2)-1, L[0],L[1],L[2]);
  }

  // 12 leaf arms radiating from the plant center
  const arms = [
    // [bx,by, mx,my, tx,ty, thick]
    [cx,cy, cx-2,cy-8,  cx-4,cy-16, 3],  // top-left big
    [cx,cy, cx+2,cy-8,  cx+5,cy-16, 3],  // top-right big
    [cx,cy, cx-8,cy-4,  cx-16,cy-6, 2],  // far left
    [cx,cy, cx+8,cy-4,  cx+16,cy-6, 2],  // far right
    [cx,cy, cx-6,cy-6,  cx-11,cy-13,2],  // upper-left mid
    [cx,cy, cx+6,cy-6,  cx+11,cy-13,2],  // upper-right mid
    [cx,cy, cx-4,cy-2,  cx-14,cy-2, 2],  // left flat
    [cx,cy, cx+4,cy-2,  cx+14,cy-2, 2],  // right flat
    [cx,cy, cx-8,cy+2,  cx-15,cy+6, 2],  // lower-left droop
    [cx,cy, cx+8,cy+2,  cx+15,cy+6, 2],  // lower-right droop
    [cx,cy, cx-1,cy-4,  cx-3,cy-20, 2],  // tall center-left
    [cx,cy, cx+1,cy-4,  cx+3,cy-20, 2],  // tall center-right
  ];
  arms.forEach(([bx,by,mx,my,tx,ty,th]) => spike(bx,by,mx,my,tx,ty,th));

  // ── Inner fill to make it look dense (dark green clump around base)
  for(let dy=-5;dy<=5;dy++) for(let dx=-5;dx<=5;dx++){
    if(dx*dx+dy*dy<=9) dot(cx+dx,cy+dy, D2[0],D2[1],D2[2]);
    if(dx*dx+dy*dy<=4) dot(cx+dx,cy+dy, M[0],M[1],M[2]);
  }

  writePNG(path.join(OUT,'fiber.png'), W, H, px);
  console.log('  drew fiber.png procedurally (48×48, spiky plant)');
})();

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

// ─── Title background (960×540 post-apocalyptic night scene) ──────────────────
console.log('── title_bg');
(function drawTitleBg(){
  const W = 960, H = 540;
  const px = Buffer.alloc(W * H * 4);

  function dot(x,y,r,g,b,a=255){
    if(x<0||y<0||x>=W||y>=H) return;
    const i=(y*W+x)*4; px[i]=r;px[i+1]=g;px[i+2]=b;px[i+3]=a;
  }
  function rect(x,y,w,h,r,g,b,a=255){
    for(let dy=0;dy<h;dy++) for(let dx=0;dx<w;dx++) dot(x+dx,y+dy,r,g,b,a);
  }
  function hline(y,r,g,b){ for(let x=0;x<W;x++) dot(x,y,r,g,b); }

  // ── Sky gradient: near-black top → deep navy bottom half
  for(let y=0;y<H;y++){
    const t=y/H;
    const r=Math.round(4 + t*12);
    const g=Math.round(4 + t*14);
    const b=Math.round(14 + t*30);
    hline(y,r,g,b);
  }

  // ── Moon — large, dim, top-right
  const mx=820, my=90, mr=52;
  for(let dy=-mr;dy<=mr;dy++) for(let dx=-mr;dx<=mr;dx++){
    if(dx*dx+dy*dy<=mr*mr){
      const dist=Math.sqrt(dx*dx+dy*dy)/mr;
      const brightness=Math.round(180-dist*60);
      dot(mx+dx,my+dy, brightness,brightness,brightness-20);
    }
  }
  // Moon shadow crescent (slightly shifted dark circle)
  const mox=18, moy=10, mcr=mr-4;
  for(let dy=-mcr;dy<=mcr;dy++) for(let dx=-mcr;dx<=mcr;dx++){
    if(dx*dx+dy*dy<=mcr*mcr) dot(mx+mox+dx,my+moy+dy, 10,12,28);
  }

  // ── Stars
  const starPos=[[120,30],[200,55],[340,18],[480,40],[600,22],[700,48],[160,80],[440,70],
    [720,35],[760,90],[850,140],[50,60],[280,100],[900,50],[920,110],[640,85],[380,60]];
  starPos.forEach(([sx,sy])=>{
    const s=Math.random()<0.5?1:2;
    dot(sx,sy,220,220,200); if(s===2){dot(sx-1,sy,160,160,140);dot(sx+1,sy,160,160,140);}
  });

  // ── Distant ruined building silhouettes (y=240-420)
  function buildingBlock(bx,bw,bh,floors=1){
    // Main block
    const by=H-bh-80;
    rect(bx,by, bw,bh, 8,9,14);
    // Windows (dark slightly lighter)
    const winRows=Math.floor(bh/24), winCols=Math.floor(bw/18);
    for(let wr=0;wr<winRows;wr++) for(let wc=0;wc<winCols;wc++){
      const wx=bx+wc*18+5, wy=by+wr*24+6;
      const lit=Math.random()<0.15;
      if(lit) rect(wx,wy,8,10, 120,90,40);
      else    rect(wx,wy,8,10, 14,15,24);
    }
  }
  // Background buildings (lighter, further)
  buildingBlock(40,  60,160);
  buildingBlock(100,  40,120);
  buildingBlock(140,  80,200);
  buildingBlock(220,  50,140);
  buildingBlock(260,  70,170);
  buildingBlock(330,  45,110);
  buildingBlock(370,  90,240);
  buildingBlock(460,  55,130);
  buildingBlock(510,  80,180);
  buildingBlock(590,  50,150);
  buildingBlock(640,  70,190);
  buildingBlock(710,  40,120);
  buildingBlock(750,  90,210);
  buildingBlock(840,  55,145);
  buildingBlock(900,  60,165);

  // Foreground ruined walls (jagged tops, at bottom)
  const wallY=H-90;
  function ruinWall(x,ww,wh){
    // Base block
    rect(x,wallY-wh,ww,wh, 10,11,16);
    // Jagged top
    for(let dx=0;dx<ww;dx+=4){
      const jag=Math.floor(Math.random()*12);
      rect(x+dx,wallY-wh-jag,3,jag,10,11,16);
    }
    // Wall texture
    for(let dy=2;dy<wh;dy+=8) for(let dx=1;dx<ww;dx+=12){
      rect(x+dx,wallY-wh+dy,10,2, 8,9,14);
    }
  }
  ruinWall(0,   140, 60);
  ruinWall(150,  80, 45);
  ruinWall(240, 110, 70);
  ruinWall(400,  90, 55);
  ruinWall(520, 130, 65);
  ruinWall(680, 100, 50);
  ruinWall(810, 150, 75);

  // ── Dead tree silhouettes on sides
  function deadTree(tx,ty,h,spread){
    // trunk
    for(let dy=0;dy<h;dy++) dot(tx,ty-dy,22,16,10);
    // branches
    for(let i=1;i<=4;i++){
      const brY=ty-Math.round(h*(0.3+i*0.12));
      const dir=i%2===0?1:-1;
      for(let d=0;d<spread-i*4;d++){
        dot(tx+dir*d,brY-Math.round(d*0.4),22,16,10);
        if(d>spread/3) dot(tx+dir*d,brY-Math.round(d*0.5)-d/4,16,12,8);
      }
    }
  }
  deadTree(80, H-85, 130, 50);
  deadTree(30, H-85, 90, 38);
  deadTree(880,H-85, 140, 52);
  deadTree(930,H-85, 100, 40);

  // ── Overgrown vegetation strip at very bottom
  for(let y=H-82;y<H;y++) for(let x=0;x<W;x++){
    const t=(y-(H-82))/82;
    const r=Math.round(6+t*8), g=Math.round(18+t*24), b=Math.round(8+t*10);
    dot(x,y,r,g,b);
  }
  // Grass tufts
  function tuft(tx,ty,c){ for(let d=-3;d<=3;d++) for(let k=0;k<5+Math.abs(d);k++) dot(tx+d,ty-k,c[0],c[1],c[2]);}
  const GT=[18,52,16];
  for(let t=0;t<W;t+=14+Math.round(Math.random()*12)) tuft(t, H-82+Math.round(Math.random()*6), GT);

  // ── Ambient haze/fog near horizon (y=H-90 band)
  for(let y=wallY-20;y<wallY+10;y++) for(let x=0;x<W;x++){
    const a=Math.round(18*(1-Math.abs(y-(wallY-5))/25));
    const ci=(y*W+x)*4;
    px[ci]=Math.min(255,px[ci]+a); px[ci+1]=Math.min(255,px[ci+1]+a); px[ci+2]=Math.min(255,px[ci+2]+a+6);
    px[ci+3]=255;
  }

  writePNG(path.join(OUT,'title_bg.png'), W, H, px);
  console.log(`  drew title_bg.png (${W}×${H}, post-apoc night scene)`);
})();

console.log('\nDone! Re-run "npm run gen" only if you also want to refresh the terrain/crop sheets.');
console.log('The replaced assets (tree_lush, tree_dead, rock, fiber, scrap, ruin_wall,');
console.log('wall_tile, floor_tile, title_bg) are written directly to public/assets/.');
