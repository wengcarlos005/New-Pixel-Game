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
function outline(px,W,x,y,w,h,r,g,b,a=255){
  for(let dx=0;dx<w;dx++){ sp(px,W,x+dx,y,r,g,b,a); sp(px,W,x+dx,y+h-1,r,g,b,a); }
  for(let dy=0;dy<h;dy++){ sp(px,W,x,y+dy,r,g,b,a); sp(px,W,x+w-1,y+dy,r,g,b,a); }
}
function noise2(x,y){ return ((x*2654435761^y*2246822519)>>>0)%256; }

// ─── Palette ──────────────────────────────────────────────────────────────────
const P = {
  // grounds
  grassDry:  [110,118, 78],
  grassDry2: [ 96,104, 68],
  grassDry3: [128,134, 92],
  grassLush: [ 88,156, 70],
  grassLush2:[ 70,134, 56],
  dirt:      [ 92, 80, 64],
  dirt2:     [ 76, 64, 50],
  soilTill:  [ 70, 54, 40],
  soilTill2: [ 56, 42, 30],
  soilWet:   [ 48, 34, 24],
  soilWet2:  [ 38, 26, 18],
  waterBad:  [ 60, 80, 90],
  waterBad2: [ 42, 64, 72],
  waterClean:[ 70,130,170],
  waterClean2:[100,170,220],
  gravel:    [108,104, 96],
  metal:     [ 78, 84, 92],
  metal2:    [ 60, 66, 74],
  metalClean:[148,156,168],
  ash:       [ 90, 86, 80],
  ash2:      [ 70, 66, 60],
  // objects
  woodBark:  [ 84, 60, 40],
  woodBark2: [ 60, 42, 28],
  woodLight: [120, 90, 56],
  leafDead:  [124,116, 70],
  leafLush:  [ 80,156, 72],
  leafLush2: [ 50,124, 58],
  rock:      [120,118,110],
  rock2:     [ 88, 86, 80],
  scrap:     [148,140,124],
  scrap2:    [ 96, 90, 80],
  scrapRust: [148, 86, 56],
  fiberStem: [120,138, 86],
  fiberLeaf: [156,176,110],
  // ruins
  ruinWall:  [ 96,100,108],
  ruinWall2: [ 70, 74, 84],
  ruinMoss:  [ 86,128, 84],
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
    const n=noise2(ox+x,oy+y)%12;
    const col = n<4 ? varyCol : (n<8 ? baseCol : vary2Col);
    sp(px,W,ox+x,oy+y, col[0],col[1],col[2]);
  }
}

function tGrassDry(px,W,ox,oy){
  tileBase(px,W,ox,oy, P.grassDry, P.grassDry3, P.grassDry2);
  for(let i=0;i<7;i++){
    const gx=ox+2+(noise2(ox+i,oy)%(S-4)), gy=oy+2+(noise2(oy+i,ox)%(S-4));
    sp(px,W,gx,gy,80,86,52); sp(px,W,gx,gy-1,90,96,56);
  }
}
function tGrassLush(px,W,ox,oy){
  tileBase(px,W,ox,oy, P.grassLush, P.grassLush2, [70,148,64]);
  for(let i=0;i<6;i++){
    const gx=ox+3+(noise2(ox+i+7,oy+3)%(S-6)), gy=oy+3+(noise2(oy+i+5,ox+1)%(S-6));
    sp(px,W,gx,gy,40,90,40); sp(px,W,gx+1,gy,180,210,90); sp(px,W,gx,gy-1,200,220,120);
  }
}
function tDirt(px,W,ox,oy){
  tileBase(px,W,ox,oy, P.dirt, P.dirt2, [104,92,72]);
  [[5,7],[18,14],[24,22],[10,25],[28,5]].forEach(([dx,dy])=>{
    sp(px,W,ox+dx,oy+dy, 60,52,40);
    sp(px,W,ox+dx+1,oy+dy, 68,58,46);
  });
}
function tSoilTill(px,W,ox,oy){
  tileBase(px,W,ox,oy, P.soilTill, P.soilTill2, [80,62,46]);
  for(let row=0; row<S; row+=8){
    for(let x=0;x<S;x++) sp(px,W,ox+x,oy+row, 40,28,18);
    for(let x=0;x<S;x++) sp(px,W,ox+x,oy+row+1, 92,72,52);
  }
}
function tSoilWet(px,W,ox,oy){
  tileBase(px,W,ox,oy, P.soilWet, P.soilWet2, [60,42,28]);
  for(let row=0; row<S; row+=8){
    for(let x=0;x<S;x++) sp(px,W,ox+x,oy+row, 24,16,10);
    for(let x=0;x<S;x++) sp(px,W,ox+x,oy+row+1, 70,52,36);
  }
  [[6,10],[22,18],[14,26]].forEach(([dx,dy])=>{
    sp(px,W,ox+dx,oy+dy, 90,130,170);
  });
}
function tWaterBad(px,W,ox,oy){
  fr(px,W,ox,oy,S,S, P.waterBad[0],P.waterBad[1],P.waterBad[2]);
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){
    if(((x+y*2)%14)<3) sp(px,W,ox+x,oy+y, P.waterBad2[0],P.waterBad2[1],P.waterBad2[2]);
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
    if(((x-y+5)%12)<3) sp(px,W,ox+x,oy+y, P.waterClean2[0],P.waterClean2[1],P.waterClean2[2]);
  }
  fr(px,W,ox+4,oy+8,8,2,180,220,250);
  fr(px,W,ox+18,oy+22,6,2,180,220,250);
}
function tGravel(px,W,ox,oy){
  tileBase(px,W,ox,oy, P.gravel, [90,88,82], [124,120,112]);
  for(let i=0;i<6;i++){
    const gx=ox+2+(noise2(ox+i,oy+i*3)%(S-4)), gy=oy+2+(noise2(oy+i,ox+i*2)%(S-4));
    fr(px,W,gx,gy,2,1, 60,58,52);
  }
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
  [[2,2],[28,2],[2,28],[28,28]].forEach(([dx,dy])=>{
    sp(px,W,ox+dx,oy+dy, 30,34,40);
  });
}
function tMetalClean(px,W,ox,oy){
  fr(px,W,ox,oy,S,S, P.metalClean[0],P.metalClean[1],P.metalClean[2]);
  for(let x=0;x<S;x++){ sp(px,W,ox+x,oy+15, 100,108,120); sp(px,W,ox+x,oy+16, 80,88,100); }
  for(let y=0;y<S;y++){ sp(px,W,ox+15,oy+y, 100,108,120); sp(px,W,ox+16,oy+y, 80,88,100); }
  [[2,2],[28,2],[2,28],[28,28]].forEach(([dx,dy])=>{
    sp(px,W,ox+dx,oy+dy, 60,68,80);
  });
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

function genTerrain() {
  const cols = TILES.length, rows = 1;
  const W = cols*S, H = rows*S;
  const px = blankPx(W,H);
  TILES.forEach((fn,i)=> fn(px,W, i*S, 0));
  return makePNG(W,H,px);
}

// ─── Player spritesheet ───────────────────────────────────────────────────────
// 16×24 frames. 4 directions × 3 frames (idle, step1, step2) = 12 frames.
// Layout: rows are [down, left, right, up], cols are 3 frames.
const PW = 16, PH = 24;

function drawHuman(px,W,ox,oy, dir, frame, palette){
  // palette: { skin, skinShade, shirt, shirtDark, pants, hair, hairDark, boots, outline }
  const o = palette.outline;
  // shadow
  fr(px,W,ox+3,oy+22,10,1, 10,12,16,140);

  // body bobs on step frames
  const bob = (frame===1 ? -1 : (frame===2 ? 0 : 0));
  const by = oy + bob;

  // Head (8x8)
  const hx = ox+4, hy = by+2;
  fr(px,W,hx,hy,8,8, palette.skin[0],palette.skin[1],palette.skin[2]);
  outline(px,W,hx,hy,8,8, o[0],o[1],o[2]);
  // hair cap
  fr(px,W,hx,hy,8,3, palette.hair[0],palette.hair[1],palette.hair[2]);
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
  fr(px,W,tx,ty,8,6, palette.shirt[0],palette.shirt[1],palette.shirt[2]);
  fr(px,W,tx,ty+5,8,1, palette.shirtDark[0],palette.shirtDark[1],palette.shirtDark[2]);
  outline(px,W,tx,ty,8,6, o[0],o[1],o[2]);
  // Belt
  fr(px,W,tx,ty+5,8,1, 40,32,24);

  // Arms
  if(dir==='down' || dir==='up'){
    const aOff = (frame===1?-1:(frame===2?1:0));
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
  fr(px,W,lx1,ly,2,6-leftLeg, palette.pants[0],palette.pants[1],palette.pants[2]);
  fr(px,W,lx2,ly,2,6-rightLeg, palette.pants[0],palette.pants[1],palette.pants[2]);
  // boots
  fr(px,W,lx1,ly+6-leftLeg-1,2,1, palette.boots[0],palette.boots[1],palette.boots[2]);
  fr(px,W,lx2,ly+6-rightLeg-1,2,1, palette.boots[0],palette.boots[1],palette.boots[2]);
}

const PLAYER_PALETTE = {
  skin:[225,190,150], skinShade:[180,140,100],
  shirt:[ 80,130,180], shirtDark:[ 50, 90,140],
  pants:[ 60, 56, 70], hair:[ 60, 40, 30], hairDark:[ 40, 24, 18],
  boots:[ 40, 30, 24], outline:[ 20, 18, 24]
};
const NPC_FARMER = {
  skin:[230,200,170], skinShade:[190,150,120],
  shirt:[170,140, 80], shirtDark:[120,100, 60],
  pants:[ 90, 70, 50], hair:[120, 90, 50], hairDark:[ 80, 60, 30],
  boots:[ 50, 40, 30], outline:[ 20, 18, 24]
};
const NPC_MECHANIC = {
  skin:[210,180,140], skinShade:[170,140,100],
  shirt:[180,100, 60], shirtDark:[130, 70, 40],
  pants:[ 50, 60, 80], hair:[ 50, 40, 40], hairDark:[ 30, 24, 24],
  boots:[ 60, 60, 60], outline:[ 20, 18, 24]
};
const NPC_EXPLORER = {
  skin:[200,170,140], skinShade:[160,130,100],
  shirt:[110,130,140], shirtDark:[ 70, 90,110],
  pants:[ 60, 70, 60], hair:[ 90, 70, 40], hairDark:[ 60, 50, 30],
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
  const W=32,H=48, px=blankPx(W,H);
  fr(px,W,8,40,16,2, 30,24,20,180); // shadow
  // trunk
  fr(px,W,14,16,4,28, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  fr(px,W,14,16,1,28, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  fr(px,W,17,16,1,28, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  // root flare
  fr(px,W,12,40,8,4, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  // dead branches
  fr(px,W,18,12,8,2, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  fr(px,W,24,8,2,6, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  fr(px,W,6,18,8,2, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  fr(px,W,4,12,2,8, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  fr(px,W,14,4,4,12, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  return makePNG(W,H,px);
}
function genLushTree(){
  const W=32,H=48, px=blankPx(W,H);
  fr(px,W,8,40,16,2, 30,24,20,180);
  fr(px,W,14,28,4,16, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  fr(px,W,14,28,1,16, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  // canopy
  fc(px,W,16,16,12, P.leafLush2[0],P.leafLush2[1],P.leafLush2[2]);
  fc(px,W,16,14,10, P.leafLush[0],P.leafLush[1],P.leafLush[2]);
  fc(px,W,12,10,4, P.leafLush[0],P.leafLush[1],P.leafLush[2]);
  fc(px,W,20,12,4, P.leafLush[0],P.leafLush[1],P.leafLush[2]);
  fc(px,W,18,8,3, 130,200,110);
  return makePNG(W,H,px);
}
function genRock(){
  const W=32,H=24, px=blankPx(W,H);
  fr(px,W,4,20,24,2, 30,30,34,180);
  // chunky rock
  fc(px,W,16,16,10, P.rock[0],P.rock[1],P.rock[2]);
  fc(px,W,12,14,7, P.rock[0],P.rock[1],P.rock[2]);
  fc(px,W,20,12,6, P.rock[0],P.rock[1],P.rock[2]);
  // shading
  fr(px,W,8,18,16,4, P.rock2[0],P.rock2[1],P.rock2[2]);
  // highlight
  fr(px,W,10,8,3,2, 160,158,150);
  fr(px,W,18,6,2,2, 160,158,150);
  return makePNG(W,H,px);
}
function genScrap(){
  const W=32,H=24, px=blankPx(W,H);
  fr(px,W,4,20,24,2, 30,30,34,180);
  // tangled metal sheets
  fr(px,W,6,12,12,6, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  fr(px,W,6,12,12,1, P.scrap[0],P.scrap[1],P.scrap[2]);
  fr(px,W,14,14,14,5, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  fr(px,W,14,14,14,1, P.scrap[0],P.scrap[1],P.scrap[2]);
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
  fr(px,W,4,16,16,2, 30,40,30,180);
  // bush
  fc(px,W,12,12,7, P.fiberStem[0],P.fiberStem[1],P.fiberStem[2]);
  fc(px,W,12,10,6, P.fiberLeaf[0],P.fiberLeaf[1],P.fiberLeaf[2]);
  // little fibers sticking out
  sp(px,W,5,7, 200,210,140); sp(px,W,6,8, 200,210,140);
  sp(px,W,18,9, 200,210,140); sp(px,W,17,10, 200,210,140);
  sp(px,W,12,4, 200,210,140); sp(px,W,13,5, 200,210,140);
  return makePNG(W,H,px);
}
function genRuinWall(){
  const W=32,H=40, px=blankPx(W,H);
  fr(px,W,4,36,24,2, 30,30,34,180);
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
  // broken top
  fr(px,W,18,4,6,4, P.ruinWall[0],P.ruinWall[1],P.ruinWall[2]);
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
  fr(px,W,6,26,20,2, 20,18,16,180);
  // stones ring
  fc(px,W,8,22,3, P.rock[0],P.rock[1],P.rock[2]);
  fc(px,W,24,22,3, P.rock[0],P.rock[1],P.rock[2]);
  fc(px,W,16,26,3, P.rock[0],P.rock[1],P.rock[2]);
  fc(px,W,16,18,3, P.rock[0],P.rock[1],P.rock[2]);
  // logs
  fr(px,W,10,20,12,2, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  fr(px,W,12,18,8,2, P.woodLight[0],P.woodLight[1],P.woodLight[2]);
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
  fr(px,W,4,28,24,2, 20,18,16,180);
  fr(px,W,4,12,24,16, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  fr(px,W,4,12,24,2, P.woodLight[0],P.woodLight[1],P.woodLight[2]);
  fr(px,W,4,16,24,1, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
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
  fr(px,W,6,36,20,2, 20,18,16,180);
  // tank body
  fr(px,W,6,12,20,24, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  fr(px,W,6,12,20,2, P.scrap[0],P.scrap[1],P.scrap[2]);
  fr(px,W,6,12,2,24, P.scrap2[0]-10,P.scrap2[1]-10,P.scrap2[2]-10);
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
  fr(px,W,4,28,24,2, 20,18,16,180);
  fr(px,W,4,10,24,18, P.scrap2[0],P.scrap2[1],P.scrap2[2]);
  fr(px,W,4,10,24,2, P.scrap[0],P.scrap[1],P.scrap[2]);
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
  fr(px,W,2,2,28,28, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  fr(px,W,2,2,28,2, P.woodLight[0],P.woodLight[1],P.woodLight[2]);
  fr(px,W,2,2,2,28, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  fr(px,W,28,2,2,28, P.woodBark2[0],P.woodBark2[1],P.woodBark2[2]);
  fr(px,W,4,4,24,24, P.soilTill[0],P.soilTill[1],P.soilTill[2]);
  for(let y=4;y<28;y++) for(let x=4;x<28;x++){
    const n=noise2(x,y)%8;
    if(n<2) sp(px,W,x,y, P.soilTill2[0],P.soilTill2[1],P.soilTill2[2]);
  }
  return makePNG(W,H,px);
}
function genWallTile(){
  const W=32,H=32, px=blankPx(W,H);
  fr(px,W,0,0,W,H, 80,80,90);
  outline(px,W,0,0,W,H, 40,40,50);
  // bricks
  for(let y=0;y<H;y+=8){
    for(let x=0;x<W;x++) sp(px,W,x,y, 40,40,50);
    const off = (y/8)%2===0 ? 0 : 16;
    sp(px,W,off,y+4,40,40,50);
    sp(px,W,off+16,y+4,40,40,50);
    for(let yy=y+1;yy<y+8 && yy<H;yy++){
      sp(px,W,off, yy, 60,60,70);
    }
  }
  return makePNG(W,H,px);
}
function genFloorTile(){
  // Simple buildable floor (warm wood plank)
  const W=32,H=32, px=blankPx(W,H);
  fr(px,W,0,0,W,H, 120,90,60);
  for(let y=0;y<H;y+=8){
    for(let x=0;x<W;x++) sp(px,W,x,y, 80,60,40);
  }
  for(let x=0;x<W;x++) for(let y=0;y<H;y++){
    if(noise2(x,y)%14===0) sp(px,W,x,y, 90,70,50);
  }
  outline(px,W,0,0,W,H, 60,46,30);
  return makePNG(W,H,px);
}

// ─── Crops (16x16, 4 stages × 3 types) ────────────────────────────────────────
function drawSeed(px,W,ox,oy){
  fr(px,W,ox+6,oy+12,4,2, P.soilTill2[0]-10,P.soilTill2[1]-10,P.soilTill2[2]-10);
  sp(px,W,ox+7,oy+11, 180,180,140);
  sp(px,W,ox+8,oy+11, 200,200,160);
}
function drawSprout(px,W,ox,oy){
  fr(px,W,ox+7,oy+10,2,5, P.leafLush2[0],P.leafLush2[1],P.leafLush2[2]);
  sp(px,W,ox+6,oy+11, P.leafLush[0],P.leafLush[1],P.leafLush[2]);
  sp(px,W,ox+9,oy+11, P.leafLush[0],P.leafLush[1],P.leafLush[2]);
  sp(px,W,ox+7,oy+9, P.leafLush[0],P.leafLush[1],P.leafLush[2]);
  sp(px,W,ox+8,oy+9, P.leafLush[0],P.leafLush[1],P.leafLush[2]);
}
function drawMidGrowth(px,W,ox,oy, leafCol){
  fr(px,W,ox+7,oy+6,2,9, P.woodBark[0],P.woodBark[1],P.woodBark[2]);
  fc(px,W,ox+8,oy+6,3, leafCol[0],leafCol[1],leafCol[2]);
  fc(px,W,ox+5,oy+9,2, leafCol[0],leafCol[1],leafCol[2]);
  fc(px,W,ox+11,oy+9,2, leafCol[0],leafCol[1],leafCol[2]);
}
function drawHarvestPotato(px,W,ox,oy){
  fr(px,W,ox+7,oy+8,2,7, P.fiberStem[0],P.fiberStem[1],P.fiberStem[2]);
  fc(px,W,ox+8,oy+6,3, P.fiberLeaf[0],P.fiberLeaf[1],P.fiberLeaf[2]);
  fc(px,W,ox+5,oy+8,2, P.fiberLeaf[0],P.fiberLeaf[1],P.fiberLeaf[2]);
  fc(px,W,ox+11,oy+8,2, P.fiberLeaf[0],P.fiberLeaf[1],P.fiberLeaf[2]);
  fc(px,W,ox+8,oy+12,2, 200,160,120);  // potato peeking
  sp(px,W,ox+9,oy+11, 220,180,140);
}
function drawHarvestWheat(px,W,ox,oy){
  for(let i=0;i<3;i++){
    const x=ox+5+i*3;
    fr(px,W,x,oy+8,1,7, 200,170,80);
    sp(px,W,x-1,oy+7, 240,220,120);
    sp(px,W,x+1,oy+7, 240,220,120);
    sp(px,W,x,oy+5, 240,220,120);
  }
}
function drawHarvestMushroom(px,W,ox,oy){
  fr(px,W,ox+7,oy+10,2,5, 220,210,180);
  fc(px,W,ox+8,oy+8,4, 200,80,60);
  fc(px,W,ox+8,oy+7,3, 220,100,80);
  sp(px,W,ox+6,oy+7, 240,220,200);
  sp(px,W,ox+10,oy+7, 240,220,200);
  sp(px,W,ox+8,oy+5, 240,220,200);
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

function write(name, buf){
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log('  ', name, '(', buf.length, 'bytes )');
}

console.log('Generating assets to', OUT);
write('terrain.png',       genTerrain());
write('player.png',        genHumanSheet(PLAYER_PALETTE));
write('npc_farmer.png',    genHumanSheet(NPC_FARMER));
write('npc_mechanic.png',  genHumanSheet(NPC_MECHANIC));
write('npc_explorer.png',  genHumanSheet(NPC_EXPLORER));
write('tree_dead.png',     genDeadTree());
write('tree_lush.png',     genLushTree());
write('rock.png',          genRock());
write('scrap.png',         genScrap());
write('fiber.png',         genFiber());
write('ruin_wall.png',     genRuinWall());
write('generator_broken.png', genBrokenGen());
write('generator_on.png',  genGenOn());
write('campfire.png',      genCampfire());
write('chest.png',         genChest());
write('water_tank.png',    genWaterTank());
write('small_gen.png',     genSmallGen());
write('planter.png',       genPlanter());
write('wall_tile.png',     genWallTile());
write('floor_tile.png',    genFloorTile());
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
console.log('Done.');
