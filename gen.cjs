'use strict';
// Pure-Node PNG generator for Ressurgir — Colônia Pós-Apocalipse.
// No native deps. Produces all sprites/tilesheets/icons under public/assets/.

const fs   = require('fs');
const zlib = require('zlib');
const path = require('path');

// ─── PNG encoder (RGBA) ───────────────────────────────────────────────────────
function u32be(v) { const b=Buffer.alloc(4); b.writeUInt32BE(v,0); return b; }
function chunk(type, data) {
  const t=Buffer.from(type,'ascii'), d=Buffer.isBuffer(data)?data:Buffer.from(data);
  let crc=0xffffffff;
  for (const b of [...t,...d]) { crc^=b; for(let i=0;i<8;i++) crc=(crc>>>1)^(crc&1?0xedb88320:0); }
  return Buffer.concat([u32be(d.length),t,d,u32be((crc^0xffffffff)>>>0)]);
}
function makePNG(w,h,pixels) {
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4);
  ihdr[8]=8; ihdr[9]=6;
  const rowLen=w*4, raw=Buffer.alloc(h*(1+rowLen));
  for(let y=0;y<h;y++){
    raw[y*(1+rowLen)]=0;
    for(let x=0;x<w;x++){
      const pi=(y*w+x)*4, ri=y*(1+rowLen)+1+x*4;
      raw[ri]=pixels[pi]; raw[ri+1]=pixels[pi+1]; raw[ri+2]=pixels[pi+2]; raw[ri+3]=pixels[pi+3];
    }
  }
  const sig=Buffer.from([137,80,78,71,13,10,26,10]);
  return Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:6})),chunk('IEND',Buffer.alloc(0))]);
}
function blankPx(w,h){ return Buffer.alloc(w*h*4); }

// ─── Pixel helpers ────────────────────────────────────────────────────────────
function sp(px,W,x,y,r,g,b,a=255){ if(x<0||y<0||x>=W||y>=(px.length/(W*4))) return; const i=(y*W+x)*4; px[i]=r;px[i+1]=g;px[i+2]=b;px[i+3]=a; }
function fr(px,W,x,y,w,h,r,g,b,a=255){ for(let dy=0;dy<h;dy++) for(let dx=0;dx<w;dx++) sp(px,W,x+dx,y+dy,r,g,b,a); }
function fc(px,W,cx,cy,rad,r,g,b,a=255){ for(let dy=-rad;dy<=rad;dy++) for(let dx=-rad;dx<=rad;dx++) if(dx*dx+dy*dy<=rad*rad) sp(px,W,cx+dx,cy+dy,r,g,b,a); }
function fe(px,W,cx,cy,rx,ry,r,g,b,a=255){ for(let dy=-ry;dy<=ry;dy++) for(let dx=-rx;dx<=rx;dx++) if((dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)<=1) sp(px,W,cx+dx,cy+dy,r,g,b,a); }
function line(px,W,x0,y0,x1,y1,r,g,b,a=255){
  let dx=Math.abs(x1-x0), sx=x0<x1?1:-1, dy=-Math.abs(y1-y0), sy=y0<y1?1:-1, err=dx+dy;
  while(true){
    sp(px,W,x0,y0,r,g,b,a);
    if(x0===x1 && y0===y1) break;
    const e2=2*err;
    if(e2>=dy){ err+=dy; x0+=sx; }
    if(e2<=dx){ err+=dx; y0+=sy; }
  }
}
function outline(px,W,x,y,w,h,r,g,b,a=255){
  for(let dx=0;dx<w;dx++){ sp(px,W,x+dx,y,r,g,b,a); sp(px,W,x+dx,y+h-1,r,g,b,a); }
  for(let dy=0;dy<h;dy++){ sp(px,W,x,y+dy,r,g,b,a); sp(px,W,x+w-1,y+dy,r,g,b,a); }
}
function noise2(x,y){ return ((x*2654435761^y*2246822519)>>>0)%256; }
function shade(col, amt){ return col.map(v=>Math.max(0, Math.min(255, v + amt))); }
function grassTuft(px,W,x,y,dark,mid,light){
  line(px,W,x,y,x-1,y-4, dark[0],dark[1],dark[2]);
  line(px,W,x+1,y,x+1,y-5, mid[0],mid[1],mid[2]);
  line(px,W,x+2,y,x+4,y-3, dark[0],dark[1],dark[2]);
  sp(px,W,x+1,y-5, light[0],light[1],light[2]);
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const P = {
  // grounds
  grassDry:  [166,148, 68],
  grassDry2: [128,120, 62],
  grassDry3: [196,170, 80],
  grassLush: [104,196, 62],
  grassLush2:[ 42,144, 58],
  dirt:      [178,124, 62],
  dirt2:     [122, 78, 44],
  soilTill:  [130, 78, 44],
  soilTill2: [ 82, 46, 30],
  soilWet:   [ 82, 44, 30],
  soilWet2:  [ 46, 26, 20],
  waterBad:  [ 72, 94, 96],
  waterBad2: [ 48, 70, 78],
  waterClean:[ 42,158,196],
  waterClean2:[100,218,232],
  gravel:    [198,154, 82],
  metal:     [ 88, 94,104],
  metal2:    [ 58, 64, 74],
  metalClean:[154,166,176],
  ash:       [104,100, 90],
  ash2:      [ 74, 70, 64],
  // objects
  woodBark:  [136, 78, 36],
  woodBark2: [ 74, 42, 24],
  woodLight: [204,132, 54],
  leafDead:  [172,124, 52],
  leafLush:  [ 68,184, 54],
  leafLush2: [ 16,112, 48],
  rock:      [146,140,126],
  rock2:     [ 86, 84, 78],
  scrap:     [166,158,136],
  scrap2:    [100, 98, 92],
  scrapRust: [174, 88, 52],
  fiberStem: [ 76,154, 68],
  fiberLeaf: [170,222, 80],
  // ruins
  ruinWall:  [120,122,126],
  ruinWall2: [ 76, 78, 86],
  ruinMoss:  [ 72,138, 82],
  // ui
  uiBg:      [ 18, 22, 30],
  uiSlot:    [ 36, 42, 54],
  uiSlot2:   [ 24, 28, 38],
  uiSlotHi:  [200,170, 80],
  uiText:    [220,224,232],
  uiAccent:  [255,170, 80],
  hpRed:     [200, 70, 70],
  hungerOrg: [220,150, 70],
  staminaYl: [220,210, 90],
  energyBl:  [120,180,240],
};
const c = (col, a) => [col[0], col[1], col[2], a === undefined ? 255 : a];

// ─── Terrain tiles ────────────────────────────────────────────────────────────
const S = 32;

function tileBase(px,W,ox,oy, baseCol, varyCol, vary2Col){
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){
    const n=(noise2(ox+x,oy+y)+noise2(Math.floor((ox+x)/3),Math.floor((oy+y)/3)))%18;
    const col = n<5 ? varyCol : (n<13 ? baseCol : vary2Col);
    sp(px,W,ox+x,oy+y, col[0],col[1],col[2]);
  }
}

function tGrassDry(px,W,ox,oy){
  tileBase(px,W,ox,oy, P.grassDry, P.grassDry3, P.grassDry2);
  for(let i=0;i<15;i++){
    const gx=ox+2+(noise2(ox+i,oy)%(S-4)), gy=oy+2+(noise2(oy+i,ox)%(S-4));
    grassTuft(px,W,gx,gy, [98,92,44], [178,150,60], [236,194,86]);
  }
  [[6,6],[23,11],[12,24],[27,27]].forEach(([dx,dy])=>{
    flower(px,W,ox+dx,oy+dy, [234,118,78]);
  });
  tileEdgeShade(px,W,ox,oy);
}
function flower(px,W,x,y,petal=[236,210,120]){
  sp(px,W,x,y, 70,130,52);
  sp(px,W,x,y-1, 242,226,126);
  sp(px,W,x-1,y-1, petal[0],petal[1],petal[2]);
  sp(px,W,x+1,y-1, petal[0],petal[1],petal[2]);
}
function leafCluster(px,W,x,y,dark,mid,light){
  fc(px,W,x,y,2, dark[0],dark[1],dark[2]);
  sp(px,W,x,y-2, mid[0],mid[1],mid[2]);
  sp(px,W,x-1,y-1, mid[0],mid[1],mid[2]);
  sp(px,W,x+1,y-1, mid[0],mid[1],mid[2]);
  sp(px,W,x,y-3, light[0],light[1],light[2]);
}
function pebble(px,W,x,y,light,shadow){
  sp(px,W,x,y, light[0],light[1],light[2]);
  sp(px,W,x+1,y, shadow[0],shadow[1],shadow[2]);
}
function soilRows(px,W,ox,oy,shadow,mid,hi){
  for(let row=4; row<S; row+=7){
    for(let x=2;x<S-2;x++){
      const wiggle = (noise2(ox+x,row)%5)===0 ? 1 : 0;
      sp(px,W,ox+x,oy+row+wiggle, shadow[0],shadow[1],shadow[2]);
      if(x%2===0) sp(px,W,ox+x,oy+row+1+wiggle, mid[0],mid[1],mid[2]);
    }
  }
  [[6,9],[18,15],[25,25]].forEach(([dx,dy])=>sp(px,W,ox+dx,oy+dy, hi[0],hi[1],hi[2]));
}
function waterSparkle(px,W,ox,oy,dx,dy){
  sp(px,W,ox+dx,oy+dy, 210,238,250);
  sp(px,W,ox+dx+1,oy+dy, 156,210,238);
  sp(px,W,ox+dx,oy+dy+1, 156,210,238);
}
function metalBolt(px,W,x,y){
  sp(px,W,x,y, 34,38,44);
  sp(px,W,x+1,y, 124,132,144);
}
function tileEdgeShade(px,W,ox,oy){
  for(let x=0;x<S;x++){
    sp(px,W,ox+x,oy+S-1, 0,0,0,35);
    sp(px,W,ox+x,oy, 255,255,255,18);
  }
}
function tGrassLush(px,W,ox,oy){
  tileBase(px,W,ox,oy, P.grassLush, P.grassLush2, [150,222,82]);
  for(let i=0;i<18;i++){
    const gx=ox+3+(noise2(ox+i+7,oy+3)%(S-6)), gy=oy+3+(noise2(oy+i+5,ox+1)%(S-6));
    grassTuft(px,W,gx,gy, [12,104,42], [72,186,56], [204,246,92]);
  }
  [[8,8],[21,20],[26,9]].forEach(([dx,dy])=>flower(px,W,ox+dx,oy+dy, [246,174,88]));
  tileEdgeShade(px,W,ox,oy);
}
function tDirt(px,W,ox,oy){
  tileBase(px,W,ox,oy, P.dirt, P.dirt2, [146,106,72]);
  [[5,7],[18,14],[24,22],[10,25],[28,5],[14,4],[6,20]].forEach(([dx,dy])=>{
    pebble(px,W,ox+dx,oy+dy, [152,116,82], [82,58,42]);
  });
}
function tSoilTill(px,W,ox,oy){
  tileBase(px,W,ox,oy, P.soilTill, P.soilTill2, [130,86,56]);
  soilRows(px,W,ox,oy, [48,30,22], [134,88,58], [160,104,66]);
}
function tSoilWet(px,W,ox,oy){
  tileBase(px,W,ox,oy, P.soilWet, P.soilWet2, [84,52,36]);
  soilRows(px,W,ox,oy, [28,18,14], [82,54,38], [108,76,54]);
  [[6,10],[22,18],[14,26]].forEach(([dx,dy])=>{
    sp(px,W,ox+dx,oy+dy, 90,136,174);
    sp(px,W,ox+dx+1,oy+dy, 52,86,122);
  });
}
function tWaterBad(px,W,ox,oy){
  fr(px,W,ox,oy,S,S, P.waterBad[0],P.waterBad[1],P.waterBad[2]);
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){
    if(((x+y*2)%14)<3) sp(px,W,ox+x,oy+y, P.waterBad2[0],P.waterBad2[1],P.waterBad2[2]);
    if(((x-y+3)%21)===0) sp(px,W,ox+x,oy+y, 98,120,94);
  }
  // sludge bubbles
  [[4,8],[19,14],[25,24]].forEach(([dx,dy])=>{
    sp(px,W,ox+dx,oy+dy, 120,140,80);
    sp(px,W,ox+dx+1,oy+dy, 130,150,90);
  });
}
function tWaterClean(px,W,ox,oy){
  fr(px,W,ox,oy,S,S, P.waterClean[0],P.waterClean[1],P.waterClean[2]);
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){
    if(((x-y+5)%12)<3) sp(px,W,ox+x,oy+y, P.waterClean2[0],P.waterClean2[1],P.waterClean2[2],210);
    if(((x+y)%23)===0) sp(px,W,ox+x,oy+y, 44,104,154);
  }
  waterSparkle(px,W,ox,oy,5,8);
  waterSparkle(px,W,ox,oy,20,22);
  waterSparkle(px,W,ox,oy,14,14);
}
function tGravel(px,W,ox,oy){
  tileBase(px,W,ox,oy, P.gravel, [224,174, 88], [168,120, 66]);
  for(let i=0;i<12;i++){
    const gx=ox+2+(noise2(ox+i,oy+i*3)%(S-4)), gy=oy+2+(noise2(oy+i,ox+i*2)%(S-4));
    fe(px,W,gx,gy,2,1, 154,138,108);
    sp(px,W,gx-1,gy-1, 226,202,154);
  }
  [[4,26],[14,12],[24,20]].forEach(([dx,dy])=>grassTuft(px,W,ox+dx,oy+dy,[104,112,44],[164,146,58],[230,190,78]));
}
function tMetalFloor(px,W,ox,oy){
  fr(px,W,ox,oy,S,S, P.metal[0],P.metal[1],P.metal[2]);
  // grid lines
  for(let x=0;x<S;x++){ sp(px,W,ox+x,oy+15, P.metal2[0],P.metal2[1],P.metal2[2]); sp(px,W,ox+x,oy+16, 40,46,54); }
  for(let y=0;y<S;y++){ sp(px,W,ox+15,oy+y, P.metal2[0],P.metal2[1],P.metal2[2]); sp(px,W,ox+16,oy+y, 40,46,54); }
  // rust streaks
  [[3,5],[22,7],[8,20],[26,24]].forEach(([dx,dy])=>{
    sp(px,W,ox+dx,oy+dy, 148,86,56);
    sp(px,W,ox+dx,oy+dy+1, 110,60,38);
  });
  // bolts
  [[2,2],[28,2],[2,28],[28,28]].forEach(([dx,dy])=>metalBolt(px,W,ox+dx,oy+dy));
}
function tMetalClean(px,W,ox,oy){
  fr(px,W,ox,oy,S,S, P.metalClean[0],P.metalClean[1],P.metalClean[2]);
  for(let x=0;x<S;x++){ sp(px,W,ox+x,oy+15, 100,108,120); sp(px,W,ox+x,oy+16, 80,88,100); }
  for(let y=0;y<S;y++){ sp(px,W,ox+15,oy+y, 100,108,120); sp(px,W,ox+16,oy+y, 80,88,100); }
  [[2,2],[28,2],[2,28],[28,28]].forEach(([dx,dy])=>metalBolt(px,W,ox+dx,oy+dy));
  // glow accents
  fr(px,W,ox+12,oy+12,8,8, 60,140,200,90);
}
function tAsh(px,W,ox,oy){
  tileBase(px,W,ox,oy, P.ash, P.ash2, [110,106,100]);
  for(let i=0;i<5;i++){
    const gx=ox+(noise2(ox+i+1,oy)%S), gy=oy+(noise2(oy+i+2,ox)%S);
    sp(px,W,gx,gy, 40,38,34);
  }
}

const TILES = [
  tGrassDry,    // 0
  tGrassLush,   // 1
  tDirt,        // 2
  tSoilTill,    // 3
  tSoilWet,     // 4
  tWaterBad,    // 5
  tWaterClean,  // 6
  tGravel,      // 7
  tMetalFloor,  // 8
  tMetalClean,  // 9
  tAsh,         // 10
];
const TILE_KEYS = [
  'grass_dry',
  'grass_lush',
  'dirt',
  'soil_till',
  'soil_wet',
  'water_bad',
  'water_clean',
  'gravel_path',
  'metal_floor',
  'metal_clean',
  'ash',
];

function genTerrain() {
  const cols = TILES.length, rows = 1;
  const W = cols*S, H = rows*S;
  const px = blankPx(W,H);
  TILES.forEach((fn,i)=> fn(px,W, i*S, 0));
  return makePNG(W,H,px);
}
function genTilePng(i) {
  const px = blankPx(S,S);
  TILES[i](px,S,0,0);
  return makePNG(S,S,px);
}

// ─── Player spritesheet ───────────────────────────────────────────────────────
// 16×24 frames. 4 directions × 3 frames (idle, step1, step2) = 12 frames.
// Layout: rows are [down, left, right, up], cols are 3 frames.
const PW = 16, PH = 24;

function drawHuman(px,W,ox,oy, dir, frame, palette){
  // palette: { skin, skinShade, shirt, shirtDark, pants, hair, hairDark, boots, outline }
  const o = palette.outline;
  // shadow
  fr(px,W,ox+3,oy+22,10,2, 10,12,16,120);

  // body bobs on step frames
  const bob = (frame===1 ? -1 : (frame===2 ? 0 : 0));
  const by = oy + bob;

  // Head (8x8)
  const hx = ox+4, hy = by+1;
  fr(px,W,hx-1,hy+2,10,7, o[0],o[1],o[2]);
  fr(px,W,hx,hy,8,8, palette.skin[0],palette.skin[1],palette.skin[2]);
  fr(px,W,hx+6,hy+2,1,5, palette.skinShade[0],palette.skinShade[1],palette.skinShade[2]);
  sp(px,W,hx+2,hy+1, shade(palette.skin,24)[0],shade(palette.skin,24)[1],shade(palette.skin,24)[2]);
  // hair cap
  fr(px,W,hx-1,hy,10,3, palette.hairDark[0],palette.hairDark[1],palette.hairDark[2]);
  fr(px,W,hx,hy,8,3, palette.hair[0],palette.hair[1],palette.hair[2]);
  sp(px,W,hx+1,hy, shade(palette.hair,34)[0],shade(palette.hair,34)[1],shade(palette.hair,34)[2]);
  if(dir==='down'||dir==='up') fr(px,W,hx,hy+3,8,1, palette.hairDark[0],palette.hairDark[1],palette.hairDark[2]);
  // face: only show eyes on down/left/right
  if(dir==='down'){
    sp(px,W,hx+2,hy+5,20,20,30);
    sp(px,W,hx+5,hy+5,20,20,30);
    sp(px,W,hx+3,hy+7, palette.skinShade[0],palette.skinShade[1],palette.skinShade[2]);
  } else if(dir==='left'){
    sp(px,W,hx+2,hy+5,20,20,30);
    sp(px,W,hx+2,hy+7, palette.skinShade[0],palette.skinShade[1],palette.skinShade[2]);
  } else if(dir==='right'){
    sp(px,W,hx+5,hy+5,20,20,30);
    sp(px,W,hx+5,hy+7, palette.skinShade[0],palette.skinShade[1],palette.skinShade[2]);
  }

  // Torso (8x6)
  const tx = ox+4, ty = by+10;
  fr(px,W,tx-1,ty,10,7, o[0],o[1],o[2]);
  fr(px,W,tx,ty,8,6, palette.shirt[0],palette.shirt[1],palette.shirt[2]);
  fr(px,W,tx+1,ty+1,2,1, shade(palette.shirt,35)[0],shade(palette.shirt,35)[1],shade(palette.shirt,35)[2]);
  fr(px,W,tx,ty+5,8,1, palette.shirtDark[0],palette.shirtDark[1],palette.shirtDark[2]);
  // Belt
  fr(px,W,tx,ty+5,8,1, 40,32,24);

  // Arms
  if(dir==='down' || dir==='up'){
    const aOff = (frame===1?-1:(frame===2?1:0));
    fr(px,W,ox+1,ty+1+aOff,1,5, o[0],o[1],o[2]);
    fr(px,W,ox+14,ty+1-aOff,1,5, o[0],o[1],o[2]);
    fr(px,W,ox+2,ty+1+aOff,2,4, palette.shirt[0],palette.shirt[1],palette.shirt[2]);
    fr(px,W,ox+12,ty+1-aOff,2,4, palette.shirt[0],palette.shirt[1],palette.shirt[2]);
    fr(px,W,ox+2,ty+5+aOff,2,1, palette.skin[0],palette.skin[1],palette.skin[2]);
    fr(px,W,ox+12,ty+5-aOff,2,1, palette.skin[0],palette.skin[1],palette.skin[2]);
  } else if(dir==='left'){
    fr(px,W,ox+2,ty+1,2,5, palette.shirt[0],palette.shirt[1],palette.shirt[2]);
    sp(px,W,ox+2,ty+6, palette.skin[0],palette.skin[1],palette.skin[2]);
  } else if(dir==='right'){
    fr(px,W,ox+12,ty+1,2,5, palette.shirt[0],palette.shirt[1],palette.shirt[2]);
    sp(px,W,ox+13,ty+6, palette.skin[0],palette.skin[1],palette.skin[2]);
  }

  // Legs (4x6, two of them) - step animation
  const lx1 = ox+5, lx2 = ox+9, ly = by+16;
  const leftLeg  = (frame===1 ? 1 : 0);
  const rightLeg = (frame===2 ? 1 : 0);
  fr(px,W,lx1-1,ly,4,6-leftLeg, o[0],o[1],o[2]);
  fr(px,W,lx2-1,ly,4,6-rightLeg, o[0],o[1],o[2]);
  fr(px,W,lx1,ly,2,6-leftLeg, palette.pants[0],palette.pants[1],palette.pants[2]);
  fr(px,W,lx2,ly,2,6-rightLeg, palette.pants[0],palette.pants[1],palette.pants[2]);
  sp(px,W,lx1,ly, shade(palette.pants,26)[0],shade(palette.pants,26)[1],shade(palette.pants,26)[2]);
  // boots
  fr(px,W,lx1-1,ly+6-leftLeg-1,4,2, palette.boots[0],palette.boots[1],palette.boots[2]);
  fr(px,W,lx2-1,ly+6-rightLeg-1,4,2, palette.boots[0],palette.boots[1],palette.boots[2]);
}

const PLAYER_PALETTE = {
  skin:[230,190,146], skinShade:[176,126, 88],
  shirt:[ 66,134,178], shirtDark:[ 38, 82,126],
  pants:[ 62, 58, 82], hair:[ 74, 46, 28], hairDark:[ 42, 26, 18],
  boots:[ 40, 30, 24], outline:[ 20, 18, 24]
};
const NPC_FARMER = {
  skin:[234,198,166], skinShade:[184,142,110],
  shirt:[186,146, 76], shirtDark:[128, 92, 48],
  pants:[ 98, 74, 50], hair:[134, 88, 44], hairDark:[ 82, 52, 28],
  boots:[ 50, 40, 30], outline:[ 20, 18, 24]
};
const NPC_MECHANIC = {
  skin:[218,178,136], skinShade:[164,126, 90],
  shirt:[194, 96, 58], shirtDark:[128, 58, 36],
  pants:[ 48, 64, 92], hair:[ 58, 46, 42], hairDark:[ 30, 24, 24],
  boots:[ 60, 60, 60], outline:[ 20, 18, 24]
};
const NPC_EXPLORER = {
  skin:[204,168,136], skinShade:[154,120, 92],
  shirt:[102,136,132], shirtDark:[ 62, 90, 98],
  pants:[ 62, 78, 56], hair:[104, 72, 38], hairDark:[ 62, 44, 26],
  boots:[ 50, 50, 50], outline:[ 20, 18, 24]
};

function genHumanSheet(palette){
  // 3 frames × 4 dirs => 3 cols × 4 rows
  const W = 3*PW, H = 4*PH;
  const px = blankPx(W,H);
  const dirs = ['down','left','right','up'];
  for(let r=0;r<4;r++){
    for(let c=0;c<3;c++){
      drawHuman(px,W, c*PW, r*PH, dirs[r], c, palette);
    }
  }
  return makePNG(W,H,px);
}

// ─── Props ────────────────────────────────────────────────────────────────────
function genDeadTree(){
  const W=48,H=64, px=blankPx(W,H);
  fe(px,W,24,58,16,4, 30,24,20,150);
  // trunk
  fr(px,W,20,22,8,34, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  fr(px,W,19,25,2,31, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  fr(px,W,27,24,2,30, 58,34,22);
  line(px,W,23,22,21,54, 174,96,44);
  line(px,W,26,24,28,52, 88,48,28);
  // root flare
  fr(px,W,16,53,16,5, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  line(px,W,20,54,12,60, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  line(px,W,28,54,37,60, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  // dead branches
  line(px,W,27,25,42,13, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  line(px,W,39,15,45,7, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  line(px,W,21,30,7,20, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  line(px,W,8,20,4,11, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  line(px,W,24,23,22,6, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  line(px,W,22,9,15,3, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  [[15,38],[31,39],[11,48],[36,30],[24,16]].forEach(([x,y])=>leafCluster(px,W,x,y,[116,82,40],P.leafDead,[222,164,70]));
  return makePNG(W,H,px);
}
function genLushTree(){
  const W=48,H=64, px=blankPx(W,H);
  fe(px,W,24,58,17,4, 30,24,20,145);
  fr(px,W,20,37,8,19, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  fr(px,W,19,39,2,17, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  fr(px,W,27,39,2,15, 68,38,24);
  line(px,W,24,38,18,52, 208,122,54);
  line(px,W,24,37,34,31, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  line(px,W,23,38,13,32, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  // dark silhouette first, then leafy clumps for a softer hand-pixeled crown.
  fe(px,W,24,25,22,19, 10,78,36);
  fc(px,W,11,27,10, 10,78,36);
  fc(px,W,37,26,10, 10,78,36);
  fc(px,W,24,12,12, 10,78,36);
  fc(px,W,24,35,13, 10,78,36);
  fe(px,W,24,26,19,16, P.leafLush2[0],P.leafLush2[1],P.leafLush2[2]);
  fc(px,W,12,25,9, 34,146,52);
  fc(px,W,36,24,9, 34,150,56);
  fc(px,W,24,13,10, 74,194,58);
  fc(px,W,23,31,10, 58,166,54);
  fc(px,W,19,22,8, P.leafLush[0],P.leafLush[1],P.leafLush[2]);
  [[13,16],[23,9],[34,18],[17,31],[30,30],[25,20],[9,27],[38,27]].forEach(([x,y])=>sp(px,W,x,y, 206,248,88));
  [[15,25],[33,23],[25,32]].forEach(([x,y])=>{
    fc(px,W,x,y,2, 198,42,34);
    sp(px,W,x-1,y-1, 246,98,66);
  });
  return makePNG(W,H,px);
}
function genRock(){
  const W=32,H=24, px=blankPx(W,H);
  fe(px,W,16,21,12,2, 30,30,34,150);
  // chunky rock
  fc(px,W,16,16,10, P.rock2[0],P.rock2[1],P.rock2[2]);
  fc(px,W,12,14,7, P.rock[0],P.rock[1],P.rock[2]);
  fc(px,W,20,12,6, shade(P.rock,10)[0],shade(P.rock,10)[1],shade(P.rock,10)[2]);
  // shading
  fr(px,W,8,18,16,4, P.rock2[0],P.rock2[1],P.rock2[2]);
  // highlight
  line(px,W,9,9,14,7, 184,180,162);
  line(px,W,18,6,22,8, 184,180,162);
  sp(px,W,12,15, 78,74,68);
  sp(px,W,21,15, 70,68,64);
  return makePNG(W,H,px);
}
function genScrap(){
  const W=32,H=24, px=blankPx(W,H);
  fe(px,W,16,21,12,2, 30,30,34,150);
  // tangled metal sheets
  fr(px,W,6,12,12,6, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  fr(px,W,6,12,12,1, P.scrap[0],P.scrap[1],P.scrap[2]);
  fr(px,W,14,14,14,5, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  fr(px,W,14,14,14,1, P.scrap[0],P.scrap[1],P.scrap[2]);
  line(px,W,7,18,18,10, 70,72,78);
  line(px,W,14,7,25,18, 190,176,146);
  // pipe / wire
  fr(px,W,10,6,2,8, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  fr(px,W,12,6,8,2, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  // rust
  fr(px,W,8,14,3,2, P.scrapRust[0],P.scrapRust[1],P.scrapRust[2]);
  fr(px,W,22,16,3,2, P.scrapRust[0],P.scrapRust[1],P.scrapRust[2]);
  // bolts
  sp(px,W,8,13, 20,18,18); sp(px,W,16,13, 20,18,18); sp(px,W,24,15, 20,18,18);
  return makePNG(W,H,px);
}
function genFiber(){
  const W=24,H=20, px=blankPx(W,H);
  fe(px,W,12,17,9,2, 30,40,30,150);
  // bush
  fc(px,W,12,12,7, 26,116,48);
  fc(px,W,9,11,5, P.fiberStem[0],P.fiberStem[1],P.fiberStem[2]);
  fc(px,W,14,9,6, P.fiberLeaf[0],P.fiberLeaf[1],P.fiberLeaf[2]);
  fc(px,W,7,14,4, 44,150,54);
  fc(px,W,18,13,4, 68,178,60);
  line(px,W,7,15,5,7, 76,134,62);
  line(px,W,13,16,14,4, 82,146,68);
  line(px,W,17,15,20,8, 74,130,60);
  // little fibers sticking out
  sp(px,W,5,7, 200,210,140); sp(px,W,6,8, 200,210,140);
  sp(px,W,18,9, 200,210,140); sp(px,W,17,10, 200,210,140);
  sp(px,W,12,4, 200,210,140); sp(px,W,13,5, 200,210,140);
  return makePNG(W,H,px);
}
function genRuinWall(){
  const W=32,H=40, px=blankPx(W,H);
  fe(px,W,16,37,13,2, 30,30,34,150);
  // broken column
  fr(px,W,8,8,16,28, P.ruinWall[0],P.ruinWall[1],P.ruinWall[2]);
  fr(px,W,8,8,16,2, P.ruinWall2[0],P.ruinWall2[1],P.ruinWall2[2]);
  fr(px,W,8,8,2,28, P.ruinWall2[0],P.ruinWall2[1],P.ruinWall2[2]);
  // bricks
  for(let y=10;y<36;y+=6){ for(let x=8;x<24;x++) sp(px,W,x,y, 60,64,72); }
  for(let x=10;x<24;x+=8){ for(let y=8;y<36;y++) sp(px,W,x,y, 60,64,72); }
  // moss/vines
  fr(px,W,8,30,16,6, P.ruinMoss[0],P.ruinMoss[1],P.ruinMoss[2]);
  sp(px,W,10,28, P.ruinMoss[0],P.ruinMoss[1],P.ruinMoss[2]);
  sp(px,W,14,26, P.ruinMoss[0],P.ruinMoss[1],P.ruinMoss[2]);
  sp(px,W,20,28, P.ruinMoss[0],P.ruinMoss[1],P.ruinMoss[2]);
  line(px,W,11,29,11,35, 46,104,56);
  line(px,W,20,26,19,34, 46,104,56);
  sp(px,W,12,31, 150,196,96);
  sp(px,W,18,30, 150,196,96);
  // broken top
  fr(px,W,18,4,6,4, P.ruinWall[0],P.ruinWall[1],P.ruinWall[2]);
  fr(px,W,8,6,6,2, P.ruinWall[0],P.ruinWall[1],P.ruinWall[2]);
  sp(px,W,22,7, 188,190,190);
  return makePNG(W,H,px);
}

function genBrokenGen(){
  // 64×64 — the big anchor object
  const W=64, H=64, px=blankPx(W,H);
  fr(px,W,8,58,48,3, 20,22,28,180);
  // base
  fr(px,W,12,48,40,12, 60,66,78);
  fr(px,W,12,48,40,2, 90,96,108);
  fr(px,W,12,58,40,2, 30,32,40);
  // tower
  fr(px,W,22,16,20,32, 80,86,98);
  fr(px,W,22,16,20,2, 110,118,130);
  fr(px,W,22,16,2,32, 60,66,78);
  fr(px,W,40,16,2,32, 50,56,68);
  // rust streaks
  for(let i=0;i<8;i++){
    const x=24+i*2, y=22+(noise2(i,3)%20);
    fr(px,W,x,y,1,6, P.scrapRust[0],P.scrapRust[1],P.scrapRust[2]);
  }
  // cracked display (dead screen)
  fr(px,W,26,24,12,8, 24,24,30);
  fr(px,W,27,25,10,6, 40,40,48);
  sp(px,W,30,28, 80,80,90); sp(px,W,32,29,80,80,90); sp(px,W,34,27,80,80,90);
  // antenna (broken)
  fr(px,W,31,4,2,12, 60,66,78);
  fr(px,W,28,4,8,2, 60,66,78);
  fr(px,W,34,2,6,2, 60,66,78);
  // wire spillage
  fr(px,W,8,52,6,2, 160,90,50);
  fr(px,W,50,54,6,2, 50,90,160);
  fr(px,W,18,46,2,4, 220,180,60);
  // moss climbing
  fr(px,W,22,40,3,8, P.ruinMoss[0],P.ruinMoss[1],P.ruinMoss[2]);
  fr(px,W,39,38,3,10, P.ruinMoss[0],P.ruinMoss[1],P.ruinMoss[2]);
  return makePNG(W,H,px);
}
function genGenOn(){
  const W=64,H=64, px=blankPx(W,H);
  fr(px,W,8,58,48,3, 20,22,28,180);
  fr(px,W,12,48,40,12, 100,110,128);
  fr(px,W,12,48,40,2, 150,160,180);
  fr(px,W,12,58,40,2, 60,66,78);
  fr(px,W,22,16,20,32, 130,140,160);
  fr(px,W,22,16,20,2, 170,180,200);
  fr(px,W,22,16,2,32, 100,110,128);
  fr(px,W,40,16,2,32, 90,100,118);
  // screen alive
  fr(px,W,26,24,12,8, 20,28,40);
  fr(px,W,27,25,10,6, 40,80,140);
  fr(px,W,28,27,8,2, 120,200,240);
  fr(px,W,28,29,3,1, 200,240,255);
  fr(px,W,33,29,3,1, 200,240,255);
  // glow lamps
  fc(px,W,16,52,2, 120,240,180);
  fc(px,W,48,52,2, 120,240,180);
  // antenna repaired
  fr(px,W,31,4,2,12, 100,110,128);
  fr(px,W,28,4,8,2, 100,110,128);
  fr(px,W,30,0,4,2, 240,200,80);
  return makePNG(W,H,px);
}

// ─── Placeables (32×32) ───────────────────────────────────────────────────────
function genCampfire(){
  const W=32,H=32, px=blankPx(W,H);
  fe(px,W,16,27,11,2, 20,18,16,150);
  // stones ring
  fc(px,W,8,22,3, P.rock[0],P.rock[1],P.rock[2]);
  fc(px,W,24,22,3, P.rock[0],P.rock[1],P.rock[2]);
  fc(px,W,16,26,3, P.rock[0],P.rock[1],P.rock[2]);
  fc(px,W,16,18,3, P.rock[0],P.rock[1],P.rock[2]);
  // logs
  line(px,W,9,22,22,18, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  line(px,W,10,18,23,23, P.woodLight[0],P.woodLight[1],P.woodLight[2]);
  // flame
  fc(px,W,16,14,4, 230,90,30);
  fc(px,W,16,12,3, 250,170,50);
  fc(px,W,16,10,2, 255,230,140);
  sp(px,W,14,8,255,200,80);
  sp(px,W,18,7,255,200,80);
  return makePNG(W,H,px);
}
function genChest(){
  const W=32,H=32, px=blankPx(W,H);
  fe(px,W,16,29,13,2, 20,18,16,150);
  fr(px,W,4,13,24,15, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  fr(px,W,5,12,22,5, P.woodLight[0],P.woodLight[1],P.woodLight[2]);
  fr(px,W,5,16,22,1, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  for(let x=7;x<27;x+=6) line(px,W,x,13,x,27, 76,46,30);
  // metal bands
  fr(px,W,4,20,24,2, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  fr(px,W,4,24,24,2, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  // lock
  fr(px,W,14,18,4,4, P.scrap[0],P.scrap[1],P.scrap[2]);
  sp(px,W,16,20, 20,18,16);
  outline(px,W,4,12,24,16, 30,24,20);
  return makePNG(W,H,px);
}
function genWaterTank(){
  const W=32,H=40, px=blankPx(W,H);
  fe(px,W,16,37,11,2, 20,18,16,150);
  // tank body
  fr(px,W,6,12,20,24, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  fr(px,W,6,12,20,2, P.scrap[0],P.scrap[1],P.scrap[2]);
  fr(px,W,6,12,2,24, P.scrap2[0]-10,P.scrap2[1]-10,P.scrap2[2]-10);
  fr(px,W,24,14,1,20, 62,64,66);
  for(let y=18;y<34;y+=7) fr(px,W,7,y,18,1, 146,138,120);
  // water gauge
  fr(px,W,12,16,8,16, 60,90,120);
  fr(px,W,13,18,6,12, 120,170,210);
  fr(px,W,13,22,6,8, 90,140,180);
  // tap
  fr(px,W,14,32,4,4, P.scrap[0],P.scrap[1],P.scrap[2]);
  fr(px,W,15,36,2,2, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  // top dome
  fc(px,W,16,12,5, P.scrap[0],P.scrap[1],P.scrap[2]);
  fc(px,W,16,12,4, P.scrap2[0]+10,P.scrap2[1]+10,P.scrap2[2]+10);
  return makePNG(W,H,px);
}
function genSmallGen(){
  const W=32,H=32, px=blankPx(W,H);
  fe(px,W,16,29,13,2, 20,18,16,150);
  fr(px,W,4,10,24,18, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  fr(px,W,4,10,24,2, P.scrap[0],P.scrap[1],P.scrap[2]);
  fr(px,W,5,11,1,16, 64,64,68);
  fr(px,W,26,12,1,15, 52,54,60);
  // panel
  fr(px,W,8,14,16,10, 40,46,54);
  // dials
  fc(px,W,12,18,2, 220,80,40);
  fc(px,W,12,18,1, 250,220,100);
  fc(px,W,20,18,2, 60,140,80);
  fc(px,W,20,18,1, 200,255,200);
  // pipe
  fr(px,W,6,4,4,8, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  fr(px,W,6,4,4,2, 100,110,120);
  // wires
  fr(px,W,24,24,2,8, 200,100,40);
  return makePNG(W,H,px);
}
function genPlanter(){
  // empty planter tile 32x32
  const W=32,H=32, px=blankPx(W,H);
  fe(px,W,16,30,14,2, 20,18,16,120);
  fr(px,W,2,4,28,25, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  fr(px,W,2,4,28,3, P.woodLight[0],P.woodLight[1],P.woodLight[2]);
  fr(px,W,2,4,2,25, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  fr(px,W,28,4,2,25, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  fr(px,W,5,7,22,20, P.soilTill[0],P.soilTill[1],P.soilTill[2]);
  for(let row=10; row<26; row+=5){
    for(let x=6; x<26; x++){
      const wiggle = (noise2(x,row)%5)===0 ? 1 : 0;
      sp(px,W,x,row+wiggle, 48,30,22);
      if(x%2===0) sp(px,W,x,row+1+wiggle, 128,84,54);
    }
  }
  for(let y=7;y<27;y++) for(let x=5;x<27;x++){
    const n=noise2(x,y)%8;
    if(n<2) sp(px,W,x,y, P.soilTill2[0],P.soilTill2[1],P.soilTill2[2]);
  }
  fr(px,W,4,6,24,2, 190,126,66);
  outline(px,W,2,4,28,25, 54,32,22);
  return makePNG(W,H,px);
}
function genWallTile(){
  const W=32,H=32, px=blankPx(W,H);
  fr(px,W,0,0,W,H, 108,104,100);
  outline(px,W,0,0,W,H, 54,50,52);
  // bricks
  for(let y=0;y<H;y+=8){
    for(let x=0;x<W;x++) sp(px,W,x,y, 62,58,60);
    const off = (y/8)%2===0 ? 0 : 16;
    sp(px,W,off,y+4,62,58,60);
    sp(px,W,off+16,y+4,62,58,60);
    for(let yy=y+1;yy<y+8 && yy<H;yy++){
      sp(px,W,off, yy, 78,74,76);
    }
  }
  [[4,3],[18,12],[27,24]].forEach(([x,y])=>sp(px,W,x,y, 146,142,132));
  return makePNG(W,H,px);
}
function genFloorTile(){
  // Simple buildable floor (warm wood plank)
  const W=32,H=32, px=blankPx(W,H);
  fr(px,W,0,0,W,H, 146, 94, 50);
  for(let y=0;y<H;y+=8){
    for(let x=0;x<W;x++) sp(px,W,x,y, 82,52,32);
    for(let x=0;x<W;x+=11) sp(px,W,x,y+4, 82,52,32);
  }
  for(let x=0;x<W;x++) for(let y=0;y<H;y++){
    if(noise2(x,y)%14===0) sp(px,W,x,y, 106,68,42);
    if(noise2(x+5,y)%31===0) sp(px,W,x,y, 190,128,68);
  }
  outline(px,W,0,0,W,H, 60,46,30);
  return makePNG(W,H,px);
}

// ─── Crops (16x16, 4 stages × 3 types) ────────────────────────────────────────
function drawSeed(px,W,ox,oy){
  fe(px,W,ox+8,oy+13,4,1, P.soilTill2[0]-10,P.soilTill2[1]-10,P.soilTill2[2]-10);
  sp(px,W,ox+7,oy+11, 180,180,140);
  sp(px,W,ox+8,oy+11, 200,200,160);
}
function drawSprout(px,W,ox,oy){
  fr(px,W,ox+7,oy+10,2,5, P.leafLush2[0],P.leafLush2[1],P.leafLush2[2]);
  sp(px,W,ox+6,oy+11, P.leafLush[0],P.leafLush[1],P.leafLush[2]);
  sp(px,W,ox+9,oy+11, P.leafLush[0],P.leafLush[1],P.leafLush[2]);
  sp(px,W,ox+7,oy+9, P.leafLush[0],P.leafLush[1],P.leafLush[2]);
  sp(px,W,ox+8,oy+9, P.leafLush[0],P.leafLush[1],P.leafLush[2]);
  sp(px,W,ox+8,oy+8, 186,226,122);
}
function drawMidGrowth(px,W,ox,oy, leafCol){
  fr(px,W,ox+7,oy+6,2,9, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  fc(px,W,ox+8,oy+6,3, leafCol[0],leafCol[1],leafCol[2]);
  fc(px,W,ox+5,oy+9,2, leafCol[0],leafCol[1],leafCol[2]);
  fc(px,W,ox+11,oy+9,2, leafCol[0],leafCol[1],leafCol[2]);
  fc(px,W,ox+8,oy+11,2, shade(leafCol,-28)[0],shade(leafCol,-28)[1],shade(leafCol,-28)[2]);
  sp(px,W,ox+7,oy+4, shade(leafCol,32)[0],shade(leafCol,32)[1],shade(leafCol,32)[2]);
}
function drawHarvestPotato(px,W,ox,oy){
  fr(px,W,ox+7,oy+8,2,7, P.fiberStem[0],P.fiberStem[1],P.fiberStem[2]);
  fc(px,W,ox+8,oy+6,4, P.fiberLeaf[0],P.fiberLeaf[1],P.fiberLeaf[2]);
  fc(px,W,ox+5,oy+8,3, 88,182,62);
  fc(px,W,ox+11,oy+8,3, 88,182,62);
  fc(px,W,ox+8,oy+12,2, 200,160,120);  // potato peeking
  sp(px,W,ox+9,oy+11, 220,180,140);
  sp(px,W,ox+6,oy+6, 190,228,116);
}
function drawHarvestWheat(px,W,ox,oy){
  for(let i=0;i<4;i++){
    const x=ox+4+i*3;
    fr(px,W,x,oy+8,1,7, 210,150,52);
    sp(px,W,x-1,oy+7, 240,220,120);
    sp(px,W,x+1,oy+7, 240,220,120);
    sp(px,W,x,oy+5, 240,220,120);
    sp(px,W,x,oy+4, 255,238,150);
  }
}
function drawHarvestMushroom(px,W,ox,oy){
  fr(px,W,ox+7,oy+10,2,5, 220,210,180);
  fc(px,W,ox+8,oy+8,5, 196,54,92);
  fc(px,W,ox+8,oy+7,4, 226,74,116);
  fc(px,W,ox+4,oy+11,2, 180,50,88);
  sp(px,W,ox+6,oy+7, 240,220,200);
  sp(px,W,ox+10,oy+7, 240,220,200);
  sp(px,W,ox+8,oy+5, 240,220,200);
  sp(px,W,ox+11,oy+9, 250,230,210);
}

function genCrops(){
  // 4 stages × 3 crops = 4 cols × 3 rows × 16
  const T=16, cols=4, rows=3;
  const W=cols*T, H=rows*T;
  const px=blankPx(W,H);
  // row 0: potato
  drawSeed(px,W, 0,0);
  drawSprout(px,W, T,0);
  drawMidGrowth(px,W, 2*T,0, P.fiberLeaf);
  drawHarvestPotato(px,W, 3*T,0);
  // row 1: wheat
  drawSeed(px,W, 0,T);
  drawSprout(px,W, T,T);
  drawMidGrowth(px,W, 2*T,T, [180,180,80]);
  drawHarvestWheat(px,W, 3*T,T);
  // row 2: mushroom
  drawSeed(px,W, 0,2*T);
  drawSprout(px,W, T,2*T);
  drawMidGrowth(px,W, 2*T,2*T, [180,140,140]);
  drawHarvestMushroom(px,W, 3*T,2*T);
  return makePNG(W,H,px);
}
const CROP_KEYS = ['potato','wheat','mushroom'];
const CROP_DRAWERS = [
  [drawSeed, drawSprout, (px,W,ox,oy)=>drawMidGrowth(px,W,ox,oy, P.fiberLeaf), drawHarvestPotato],
  [drawSeed, drawSprout, (px,W,ox,oy)=>drawMidGrowth(px,W,ox,oy, [206,188,66]), drawHarvestWheat],
  [drawSeed, drawSprout, (px,W,ox,oy)=>drawMidGrowth(px,W,ox,oy, [184,126,150]), drawHarvestMushroom],
];
function genCropPng(cropIndex, stage) {
  const T=16, px=blankPx(T,T);
  CROP_DRAWERS[cropIndex][stage](px,T,0,0);
  return makePNG(T,T,px);
}

// ─── Items (16x16 icons) ──────────────────────────────────────────────────────
function iWood(px,W,ox,oy){
  fr(px,W,ox+2,oy+5,12,6, P.woodLight[0],P.woodLight[1],P.woodLight[2]);
  fr(px,W,ox+2,oy+5,12,1, P.woodBark[0]+30,P.woodBark[1]+20,P.woodBark[2]+10);
  fr(px,W,ox+2,oy+10,12,1, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  fc(px,W,ox+3,oy+8,1, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  fc(px,W,ox+13,oy+8,1, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  outline(px,W,ox+2,oy+5,12,6, 40,30,20);
}
function iScrap(px,W,ox,oy){
  fr(px,W,ox+2,oy+8,12,5, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  fr(px,W,ox+2,oy+8,12,1, P.scrap[0],P.scrap[1],P.scrap[2]);
  fr(px,W,ox+5,oy+3,6,5, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  fr(px,W,ox+5,oy+3,6,1, P.scrap[0],P.scrap[1],P.scrap[2]);
  fr(px,W,ox+4,oy+10,2,2, P.scrapRust[0],P.scrapRust[1],P.scrapRust[2]);
  fr(px,W,ox+10,oy+5,1,2, P.scrapRust[0],P.scrapRust[1],P.scrapRust[2]);
  outline(px,W,ox+2,oy+8,12,5, 30,30,34);
  outline(px,W,ox+5,oy+3,6,5, 30,30,34);
}
function iStone(px,W,ox,oy){
  fc(px,W,ox+8,oy+9,5, P.rock[0],P.rock[1],P.rock[2]);
  fc(px,W,ox+6,oy+7,3, P.rock[0],P.rock[1],P.rock[2]);
  fr(px,W,ox+4,oy+10,9,3, P.rock2[0],P.rock2[1],P.rock2[2]);
  sp(px,W,ox+6,oy+6, 160,158,150);
}
function iFiber(px,W,ox,oy){
  for(let i=0;i<5;i++){
    const x=ox+3+i*2;
    fr(px,W,x,oy+4,1,9, 200,210,140);
  }
  fr(px,W,ox+3,oy+10,10,2, P.fiberStem[0],P.fiberStem[1],P.fiberStem[2]);
}
function iWater(px,W,ox,oy){
  fr(px,W,ox+4,oy+3,8,11, P.waterClean[0],P.waterClean[1],P.waterClean[2]);
  fr(px,W,ox+4,oy+3,8,2, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  fr(px,W,ox+5,oy+5,6,8, P.waterClean2[0],P.waterClean2[1],P.waterClean2[2]);
  fr(px,W,ox+6,oy+6,1,1, 220,240,250);
  outline(px,W,ox+4,oy+3,8,11, 20,40,60);
}
function iSeed(px,W,ox,oy,col){
  fc(px,W,ox+8,oy+8,3, col[0],col[1],col[2]);
  fc(px,W,ox+8,oy+8,2, col[0]+20,col[1]+20,col[2]+20);
  outline(px,W,ox+5,oy+5,7,7, 30,30,30,0);
}
function iCropPotato(px,W,ox,oy){
  fc(px,W,ox+8,oy+9,4, 200,160,120);
  fc(px,W,ox+7,oy+8,3, 220,180,140);
  sp(px,W,ox+6,oy+7, 240,200,160);
  sp(px,W,ox+10,oy+11, 160,120,80);
  outline(px,W,ox+4,oy+5,9,9, 80,50,30,0);
}
function iCropWheat(px,W,ox,oy){
  fr(px,W,ox+7,oy+3,2,10, 200,170, 80);
  for(let i=0;i<3;i++){
    sp(px,W,ox+5,oy+4+i*3, 240,220,120);
    sp(px,W,ox+11,oy+4+i*3, 240,220,120);
    sp(px,W,ox+7,oy+3+i*3, 240,220,120);
  }
}
function iCropMushroom(px,W,ox,oy){
  fr(px,W,ox+7,oy+9,2,5, 220,210,180);
  fc(px,W,ox+8,oy+7,4, 200,80,60);
  sp(px,W,ox+6,oy+5, 240,220,200);
  sp(px,W,ox+10,oy+5, 240,220,200);
}
function iAxe(px,W,ox,oy){
  fr(px,W,ox+8,oy+3,2,10, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  fr(px,W,ox+4,oy+2,7,4, P.scrap[0],P.scrap[1],P.scrap[2]);
  fr(px,W,ox+4,oy+2,7,1, 200,210,220);
  fr(px,W,ox+4,oy+5,7,1, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  outline(px,W,ox+4,oy+2,7,4, 30,30,34);
}
function iPickaxe(px,W,ox,oy){
  fr(px,W,ox+8,oy+4,2,10, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  fr(px,W,ox+3,oy+3,12,2, P.scrap[0],P.scrap[1],P.scrap[2]);
  sp(px,W,ox+3,oy+2, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  sp(px,W,ox+14,oy+2, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  outline(px,W,ox+3,oy+3,12,2, 30,30,34);
}
function iHoe(px,W,ox,oy){
  fr(px,W,ox+8,oy+3,2,10, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  fr(px,W,ox+4,oy+2,7,3, P.scrap[0],P.scrap[1],P.scrap[2]);
  outline(px,W,ox+4,oy+2,7,3, 30,30,34);
}
function iWateringCan(px,W,ox,oy){
  fr(px,W,ox+4,oy+6,8,8, P.scrap[0],P.scrap[1],P.scrap[2]);
  fr(px,W,ox+4,oy+6,8,1, 200,210,220);
  fr(px,W,ox+11,oy+8,2,2, P.scrap[0],P.scrap[1],P.scrap[2]);
  fr(px,W,ox+1,oy+5,3,2, P.scrap[0],P.scrap[1],P.scrap[2]); // spout
  fr(px,W,ox+5,oy+3,4,3, P.scrap2[0],P.scrap2[1],P.scrap2[2]); // handle
  outline(px,W,ox+4,oy+6,8,8, 30,30,34);
}
function iScythe(px,W,ox,oy){
  fr(px,W,ox+8,oy+4,2,10, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  for(let i=0;i<6;i++) sp(px,W,ox+9+i,oy+4-Math.floor(i/2), P.scrap[0],P.scrap[1],P.scrap[2]);
}
function iMeal(px,W,ox,oy){
  fc(px,W,ox+8,oy+10,5, P.scrap[0],P.scrap[1],P.scrap[2]);
  fc(px,W,ox+8,oy+9,4, P.scrap2[0]+30,P.scrap2[1]+20,P.scrap2[2]+10);
  fc(px,W,ox+8,oy+8,3, 200,150,80);
  sp(px,W,ox+6,oy+8, 240,200,120);
  sp(px,W,ox+9,oy+6, 230,180,100);
}
function iEnergyCell(px,W,ox,oy){
  fr(px,W,ox+5,oy+3,6,10, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  fr(px,W,ox+6,oy+4,4,8, 30,80,140);
  fr(px,W,ox+6,oy+5,4,2, 80,180,240);
  fr(px,W,ox+6,oy+9,4,2, 80,180,240);
  fr(px,W,ox+7,oy+1,2,2, P.scrap[0],P.scrap[1],P.scrap[2]);
  outline(px,W,ox+5,oy+3,6,10, 20,20,30);
}

const ICONS = [
  iWood, iScrap, iStone, iFiber, iWater,
  (px,W,ox,oy)=>iSeed(px,W,ox,oy, [180,140,90]),   // seed_potato
  (px,W,ox,oy)=>iSeed(px,W,ox,oy, [200,180,90]),   // seed_wheat
  (px,W,ox,oy)=>iSeed(px,W,ox,oy, [200,90,60]),    // seed_mushroom
  iCropPotato, iCropWheat, iCropMushroom,
  iAxe, iPickaxe, iHoe, iWateringCan, iScythe,
  iMeal, iEnergyCell,
];
const ICON_KEYS = [
  'wood','scrap','stone','fiber','water',
  'seed_potato','seed_wheat','seed_mushroom',
  'crop_potato','crop_wheat','crop_mushroom',
  'axe','pickaxe','hoe','watering_can','scythe',
  'meal','energy_cell'
];

function genIcons(){
  const T=16, cols=ICONS.length, rows=1;
  const W=cols*T, H=rows*T;
  const px=blankPx(W,H);
  ICONS.forEach((fn,i)=> fn(px,W, i*T, 0));
  return makePNG(W,H,px);
}
function genIconPng(i) {
  const T=16, px=blankPx(T,T);
  ICONS[i](px,T,0,0);
  return makePNG(T,T,px);
}

// ─── UI panels ────────────────────────────────────────────────────────────────
function genUiSlot(){
  const W=36,H=36, px=blankPx(W,H);
  fr(px,W,0,0,W,H, P.uiSlot[0],P.uiSlot[1],P.uiSlot[2]);
  fr(px,W,2,2,W-4,H-4, P.uiSlot2[0],P.uiSlot2[1],P.uiSlot2[2]);
  outline(px,W,0,0,W,H, 10,12,18);
  outline(px,W,2,2,W-4,H-4, 60,68,84);
  return makePNG(W,H,px);
}
function genUiSlotHi(){
  const W=36,H=36, px=blankPx(W,H);
  fr(px,W,0,0,W,H, P.uiSlotHi[0],P.uiSlotHi[1],P.uiSlotHi[2]);
  fr(px,W,2,2,W-4,H-4, P.uiSlot2[0],P.uiSlot2[1],P.uiSlot2[2]);
  outline(px,W,0,0,W,H, 80,60,20);
  outline(px,W,2,2,W-4,H-4, P.uiSlotHi[0],P.uiSlotHi[1],P.uiSlotHi[2]);
  return makePNG(W,H,px);
}
function genUiBg(){
  const W=4,H=4, px=blankPx(W,H);
  fr(px,W,0,0,W,H, P.uiBg[0],P.uiBg[1],P.uiBg[2], 230);
  return makePNG(W,H,px);
}

// ─── Particle dot ────────────────────────────────────────────────────────────
function genDot(){
  const W=4,H=4, px=blankPx(W,H);
  fc(px,W,2,2,2, 255,255,255,255);
  return makePNG(W,H,px);
}
function genGlow(){
  const W=48,H=48, px=blankPx(W,H);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const dx=x-24, dy=y-24, d=Math.sqrt(dx*dx+dy*dy);
    if(d<24){
      const a = Math.max(0, 200*(1-d/24));
      sp(px,W,x,y, 255,200,120, a);
    }
  }
  return makePNG(W,H,px);
}

// ─── Title splash ─────────────────────────────────────────────────────────────
function genTitleBg(){
  const W=480,H=270, px=blankPx(W,H);
  // gradient sky
  for(let y=0;y<H;y++){
    const t = y/H;
    const r = Math.floor(20 + 40*t);
    const g = Math.floor(22 + 30*t);
    const b = Math.floor(34 + 24*t);
    for(let x=0;x<W;x++) sp(px,W,x,y, r,g,b);
  }
  // stars
  for(let i=0;i<60;i++){
    const x = noise2(i,7)%W, y = noise2(i,3)%(H/2);
    sp(px,W,x,y, 200,210,230);
    if(noise2(i,9)%4===0){ sp(px,W,x+1,y, 220,230,250); }
  }
  // silhouette of ruins
  fr(px,W,0,H-60,W,60, 14,14,18);
  // jagged ruin tops
  for(let x=0;x<W;x++){
    const h = 60 + (noise2(x,4)%24);
    fr(px,W,x,H-h,1,h, 14,14,18);
  }
  // generator tower silhouette center
  fr(px,W,220,H-120,40,60, 18,18,24);
  fr(px,W,228,H-180,24,60, 18,18,24);
  // light spark
  fc(px,W,240,H-180,2, 255,200,100);
  return makePNG(W,H,px);
}

// ─── Write everything ─────────────────────────────────────────────────────────
const OUT = path.join(__dirname, 'public', 'assets');
fs.mkdirSync(OUT, { recursive: true });
const SOURCE_OUT = path.join(OUT, 'source');
const TILE_OUT = path.join(SOURCE_OUT, 'tiles');
const CROP_OUT = path.join(SOURCE_OUT, 'crops');
const ICON_OUT = path.join(SOURCE_OUT, 'icons');
const OBJECT_OUT = path.join(SOURCE_OUT, 'objects');
[SOURCE_OUT, TILE_OUT, CROP_OUT, ICON_OUT, OBJECT_OUT].forEach(dir => fs.mkdirSync(dir, { recursive: true }));

function write(name, buf){
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log('  ', name, '(', buf.length, 'bytes )');
}
function writeAt(dir, name, buf){
  fs.writeFileSync(path.join(dir, name), buf);
}
function writeSourceAsset(group, name, buf){
  const dir = group === 'objects' ? OBJECT_OUT : group === 'tiles' ? TILE_OUT : group === 'crops' ? CROP_OUT : ICON_OUT;
  writeAt(dir, name, buf);
}

console.log('Generating assets to', OUT);
TILE_KEYS.forEach((key, i) => writeSourceAsset('tiles', `${String(i).padStart(2,'0')}_${key}.png`, genTilePng(i)));
for (let c=0;c<CROP_KEYS.length;c++) {
  for (let s=0;s<4;s++) writeSourceAsset('crops', `${CROP_KEYS[c]}_${s}.png`, genCropPng(c,s));
}
ICON_KEYS.forEach((key, i) => writeSourceAsset('icons', `${String(i).padStart(2,'0')}_${key}.png`, genIconPng(i)));

const objectAssets = {
  player: genHumanSheet(PLAYER_PALETTE),
  npc_farmer: genHumanSheet(NPC_FARMER),
  npc_mechanic: genHumanSheet(NPC_MECHANIC),
  npc_explorer: genHumanSheet(NPC_EXPLORER),
  tree_dead: genDeadTree(),
  tree_lush: genLushTree(),
  rock: genRock(),
  scrap: genScrap(),
  fiber: genFiber(),
  ruin_wall: genRuinWall(),
  generator_broken: genBrokenGen(),
  generator_on: genGenOn(),
  campfire: genCampfire(),
  chest: genChest(),
  water_tank: genWaterTank(),
  small_gen: genSmallGen(),
  planter: genPlanter(),
  wall_tile: genWallTile(),
  floor_tile: genFloorTile(),
};
Object.entries(objectAssets).forEach(([key, buf]) => writeSourceAsset('objects', `${key}.png`, buf));

write('terrain.png',       genTerrain());
write('player.png',        objectAssets.player);
write('npc_farmer.png',    objectAssets.npc_farmer);
write('npc_mechanic.png',  objectAssets.npc_mechanic);
write('npc_explorer.png',  objectAssets.npc_explorer);
write('tree_dead.png',     objectAssets.tree_dead);
write('tree_lush.png',     objectAssets.tree_lush);
write('rock.png',          objectAssets.rock);
write('scrap.png',         objectAssets.scrap);
write('fiber.png',         objectAssets.fiber);
write('ruin_wall.png',     objectAssets.ruin_wall);
write('generator_broken.png', objectAssets.generator_broken);
write('generator_on.png',  objectAssets.generator_on);
write('campfire.png',      objectAssets.campfire);
write('chest.png',         objectAssets.chest);
write('water_tank.png',    objectAssets.water_tank);
write('small_gen.png',     objectAssets.small_gen);
write('planter.png',       objectAssets.planter);
write('wall_tile.png',     objectAssets.wall_tile);
write('floor_tile.png',    objectAssets.floor_tile);
write('crops.png',         genCrops());
write('icons.png',         genIcons());
write('ui_slot.png',       genUiSlot());
write('ui_slot_hi.png',    genUiSlotHi());
write('ui_bg.png',         genUiBg());
write('dot.png',           genDot());
write('glow.png',          genGlow());
write('title_bg.png',      genTitleBg());

// Save manifest of icon order so JS can lookup
fs.writeFileSync(path.join(OUT, 'icons.json'), JSON.stringify({ order: ICON_KEYS, size: 16 }, null, 2));
fs.writeFileSync(path.join(SOURCE_OUT, 'manifest.json'), JSON.stringify({
  note: 'Source PNGs generated one-by-one. Runtime sheets such as terrain.png, crops.png, and icons.png are packed from these stable asset slots for Phaser.',
  tileSize: 32,
  cropSize: 16,
  iconSize: 16,
  tiles: TILE_KEYS.map((key, i) => ({ index: i, key, file: `tiles/${String(i).padStart(2,'0')}_${key}.png` })),
  crops: CROP_KEYS.flatMap((key, c) => [0,1,2,3].map(stage => ({ key, stage, file: `crops/${key}_${stage}.png` }))),
  icons: ICON_KEYS.map((key, i) => ({ index: i, key, file: `icons/${String(i).padStart(2,'0')}_${key}.png` })),
  objects: Object.keys(objectAssets).map(key => ({ key, file: `objects/${key}.png` })),
}, null, 2));
console.log('Done.');
