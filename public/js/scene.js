// 16-bit style market scene drawn on a 320x180 canvas and scaled up with crisp pixels.
// Characters are built from simple shapes, then get an automatic dark outline like classic sprites.
export const W = 320;
export const H = 180;
const GROUND = 152; // feet line
const OUTLINE = '#2a1a12';

const R = (c, x, y, w, h, col) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

function ellipse(c, cx, cy, rx, ry, col) {
  c.fillStyle = col;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const dy = (y + 0.5 - cy) / ry;
    if (Math.abs(dy) > 1) continue;
    const half = rx * Math.sqrt(1 - dy * dy);
    const x0 = Math.round(cx - half);
    const x1 = Math.round(cx + half);
    if (x1 > x0) c.fillRect(x0, y, x1 - x0, 1);
  }
}

// rows from y0 to y1 whose width goes from w0 to w1, centered on cx
function trap(c, cx, y0, y1, w0, w1, col) {
  c.fillStyle = col;
  for (let y = y0; y <= y1; y++) {
    const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
    const w = Math.round(w0 + (w1 - w0) * t);
    c.fillRect(Math.round(cx - w / 2), y, w, 1);
  }
}

function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  return [cv, c];
}

// Adds a 1px outline around every opaque pixel (4-neighbour), like hand-drawn sprites.
function addOutline(cv, col = OUTLINE) {
  const c = cv.getContext('2d');
  const { width: w, height: h } = cv;
  const src = c.getImageData(0, 0, w, h);
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src.data[(y * w + x) * 4 + 3]);
  c.fillStyle = col;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (a(x, y) === 0 && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) c.fillRect(x, y, 1, 1);
    }
  }
  return cv;
}

/* ---------------- Characters ---------------- */

const VENDOR_FACE = {
  eyeL: [13, 19], eyeR: [20, 19], browY: 17, brow: '#8e8780',
  mouth: [15, 23, 4], mouthCol: '#8a4a3a', cheekY: 21, cheekL: 10, cheekR: 21,
  fx: [26, 6], w: 34, h: 60,
};
const PLAYER_FACE = {
  eyeL: [12, 16], eyeR: [17, 16], browY: 14, brow: '#3a2416',
  mouth: [14, 20, 2], mouthCol: '#a0604a', cheekY: 18, cheekL: 9, cheekR: 18,
  fx: [23, 5], w: 30, h: 53,
};

function drawVendor() {
  const [cv, c] = makeCanvas(VENDOR_FACE.w, VENDOR_FACE.h);
  const cx = 16.5;
  const hair = '#e6e2dc', hairS = '#b8b1a8', hairD = '#8e8780';
  const skin = '#e6ad82', skinS = '#c4855c';
  const bl = '#f4ead2', blS = '#d3c29c', trim = '#c9a15a';
  const sa = '#9c2f3a', saD = '#6b1c28', gold = '#e0b454', teal = '#2f6a63';

  // hair bun + hair
  ellipse(c, cx + 0.5, 5, 4, 3.2, hairS);
  ellipse(c, cx, 4.5, 3.5, 2.8, hair);
  R(c, 15, 3, 2, 1, '#ffffff');
  ellipse(c, cx + 0.5, 15.5, 9, 8, hairS);
  ellipse(c, cx, 15, 8.5, 7.5, hair);
  // face
  ellipse(c, cx + 0.5, 19, 6.8, 7.2, skinS);
  ellipse(c, cx, 18.5, 6.3, 6.8, skin);
  // hair over the forehead (middle part)
  ellipse(c, cx, 11.5, 8, 3.6, hair);
  R(c, 16, 9, 1, 5, hairS);
  R(c, 11, 10, 3, 1, '#ffffff');
  // ears
  R(c, 9, 18, 1, 3, skin);
  R(c, 24, 18, 1, 3, skinS);
  // wrinkles / smile lines / crow's feet
  R(c, 12, 22, 1, 2, skinS);
  R(c, 21, 22, 1, 2, skinS);
  R(c, 14, 15, 5, 1, '#d99c72');
  R(c, 15, 16, 3, 1, '#d99c72');
  R(c, 10, 19, 1, 1, skinS);
  R(c, 23, 19, 1, 1, skinS);
  R(c, 16, 21, 2, 1, skinS);
  R(c, 13, 25, 7, 1, skinS);
  // neck
  R(c, 14, 25, 5, 3, skinS);

  // arms (long sleeves) behind the body edge
  R(c, 6, 29, 4, 8, blS);
  R(c, 24, 29, 4, 8, blS);
  // blouse body
  trap(c, cx + 0.5, 27, 41, 15, 20, blS);
  trap(c, cx, 27, 40, 14, 18, bl);
  R(c, 6, 28, 3, 8, bl);
  R(c, 24, 28, 3, 7, bl);
  // scoop neckline with trim
  R(c, 13, 27, 7, 1, trim);
  R(c, 14, 28, 5, 1, skin);
  R(c, 14, 29, 5, 1, trim);
  // sleeves bending in, hands clasped in front
  R(c, 8, 36, 4, 2, blS);
  R(c, 21, 36, 4, 2, blS);
  R(c, 11, 37, 4, 2, bl);
  R(c, 18, 37, 4, 2, blS);
  R(c, 14, 37, 6, 3, skinS);
  R(c, 14, 37, 5, 2, skin);
  R(c, 10, 30, 1, 6, blS);
  R(c, 23, 30, 1, 6, blS);

  // sarong (pha thung) with woven bands
  trap(c, cx, 41, 54, 18, 17, sa);
  R(c, 8, 41, 18, 2, saD);
  R(c, 8, 42, 18, 1, gold);
  for (const yy of [45, 49]) {
    for (let x = 9; x < 25; x += 3) {
      R(c, x, yy, 1, 1, gold);
      R(c, x + 1, yy + 1, 1, 1, teal);
      R(c, x, yy + 2, 1, 1, gold);
    }
  }
  R(c, 8, 52, 18, 1, gold);
  R(c, 8, 53, 18, 2, saD);
  R(c, 22, 43, 3, 9, saD);
  // feet in sandals
  R(c, 11, 55, 3, 1, skinS);
  R(c, 19, 55, 3, 1, skinS);
  R(c, 10, 56, 5, 2, skin);
  R(c, 18, 56, 5, 2, skin);
  R(c, 10, 58, 6, 1, '#6b4226');
  R(c, 18, 58, 6, 1, '#6b4226');
  return addOutline(cv);
}

function drawPlayer() {
  const [cv, c] = makeCanvas(PLAYER_FACE.w, PLAYER_FACE.h);
  const hair = '#4a2e1c', hairL = '#70462c';
  const skin = '#f2c6a0', skinS = '#d39c72';
  const sh = '#f7f5f0', shS = '#cdc7bb';
  const pa = '#5b4430', paD = '#3e2e20';

  // shopping bag in his right hand (screen left)
  R(c, 2, 36, 1, 4, '#8a7d66');
  R(c, 6, 36, 1, 4, '#8a7d66');
  R(c, 2, 35, 5, 1, '#8a7d66');
  R(c, 1, 39, 8, 10, '#efe9dc');
  R(c, 7, 39, 2, 10, '#cfc6b2');
  R(c, 3, 42, 3, 4, '#6f9a5a');
  R(c, 4, 43, 1, 2, '#9cc47e');

  // head
  ellipse(c, 15, 15, 7, 7.6, skinS);
  ellipse(c, 14.5, 14.5, 6.6, 7, skin);
  R(c, 7, 14, 1, 3, skin);
  R(c, 22, 14, 1, 3, skinS);
  // hair with a messy fringe
  ellipse(c, 15, 8.5, 8.2, 5.2, hair);
  R(c, 7, 9, 2, 7, hair);
  R(c, 21, 9, 2, 6, hair);
  for (const [x, len] of [[9, 4], [11, 3], [13, 5], [16, 3], [18, 4], [20, 2]]) R(c, x, 10, 2, len, hair);
  R(c, 10, 5, 6, 1, hairL);
  R(c, 9, 6, 2, 1, hairL);
  R(c, 17, 4, 2, 1, hairL);
  R(c, 14, 2, 3, 2, hair);
  // neck
  R(c, 12, 21, 5, 3, skinS);

  // forearms
  R(c, 4, 30, 3, 7, skinS);
  R(c, 5, 30, 2, 6, skin);
  R(c, 23, 30, 3, 7, skinS);
  R(c, 23, 30, 2, 6, skin);
  R(c, 4, 36, 3, 2, skin);
  R(c, 23, 36, 3, 2, skinS);
  // shirt with short sleeves and collar
  trap(c, 15, 23, 37, 16, 15, shS);
  trap(c, 14.5, 23, 36, 15, 14, sh);
  R(c, 3, 24, 6, 6, sh);
  R(c, 21, 24, 6, 6, shS);
  R(c, 3, 29, 6, 1, shS);
  R(c, 21, 29, 6, 1, '#b8b1a4');
  R(c, 11, 23, 3, 2, shS);
  R(c, 16, 23, 3, 2, shS);
  R(c, 14, 24, 2, 1, skinS);
  R(c, 15, 25, 1, 8, shS);
  R(c, 9, 25, 1, 8, shS);
  R(c, 20, 25, 1, 8, shS);
  // pants and shoes
  R(c, 8, 37, 14, 6, pa);
  R(c, 8, 37, 14, 1, paD);
  R(c, 8, 43, 6, 6, pa);
  R(c, 16, 43, 6, 6, pa);
  R(c, 12, 43, 2, 6, paD);
  R(c, 20, 43, 2, 6, paD);
  R(c, 8, 49, 6, 1, skinS);
  R(c, 16, 49, 6, 1, skinS);
  R(c, 7, 50, 7, 2, '#3a2a20');
  R(c, 16, 50, 7, 2, '#3a2a20');
  R(c, 8, 50, 2, 1, '#5a4636');
  R(c, 17, 50, 2, 1, '#5a4636');
  return addOutline(cv);
}

const EYE = '#2a1a12';
function drawFace(c, x, y, f, { mood, talking, blink, t }) {
  const P = (dx, dy, w = 1, h = 1, col = EYE) => R(c, x + dx, y + dy, w, h, col);
  const [lx, ey] = f.eyeL;
  const rx = f.eyeR[0];
  const by = f.browY;
  const [mx, my, mw] = f.mouth;

  // eyes
  if (blink) {
    P(lx - 1, ey + 1, 2, 1);
    P(rx, ey + 1, 2, 1);
  } else if (mood === 'happy') {
    P(lx - 1, ey + 1); P(lx, ey); P(lx + 1, ey + 1);
    P(rx - 1, ey + 1); P(rx, ey); P(rx + 1, ey + 1);
  } else if (mood === 'stressed') {
    P(lx, ey + 1);
    P(rx, ey + 1);
  } else {
    P(lx, ey, 1, 2);
    P(rx, ey, 1, 2);
  }

  // brows
  if (mood === 'angry') {
    P(lx - 1, by - 1, 1, 1, f.brow); P(lx, by, 2, 1, f.brow);
    P(rx + 1, by - 1, 1, 1, f.brow); P(rx - 1, by, 2, 1, f.brow);
  } else if (mood === 'stressed') {
    P(lx - 1, by, 1, 1, f.brow); P(lx, by - 1, 2, 1, f.brow);
    P(rx + 1, by, 1, 1, f.brow); P(rx - 1, by - 1, 2, 1, f.brow);
  } else {
    P(lx - 1, by, 2, 1, f.brow);
    P(rx, by, 2, 1, f.brow);
  }

  // cheeks
  if (mood === 'happy' || mood === 'angry') {
    const col = mood === 'happy' ? '#f29a8a' : '#e0604f';
    P(f.cheekL, f.cheekY, 2, 1, col);
    P(f.cheekR, f.cheekY, 2, 1, col);
  }

  // mouth
  if (talking && Math.floor(t / 110) % 2 === 0) {
    P(mx, my, mw, 2, '#5a2020');
    P(mx, my + 1, mw, 1, '#c0504a');
  } else if (mood === 'happy') {
    P(mx - 1, my); P(mx + mw, my); P(mx, my + 1, mw, 1);
  } else if (mood === 'angry') {
    P(mx, my, mw, 1); P(mx - 1, my + 1); P(mx + mw, my + 1);
  } else if (mood === 'stressed') {
    for (let i = 0; i < mw + 2; i++) P(mx - 1 + i, my + (i % 2));
  } else {
    P(mx, my, mw, 1, f.mouthCol);
  }
}

function moodFx(c, x, y, mood, t) {
  if (mood === 'angry') {
    const s = Math.floor(t / 250) % 2;
    const col = '#e8352a';
    R(c, x + s, y, 2, 4, col);
    R(c, x + 4 + s, y, 2, 4, col);
    R(c, x - 1 + s, y + 1, 8, 2, col);
    R(c, x + 2 + s, y + 1, 2, 2, '#ff8a70');
  } else if (mood === 'stressed') {
    const bob = Math.floor(t / 300) % 3;
    R(c, x + 1, y + bob, 1, 1, '#bfe8ff');
    R(c, x, y + 1 + bob, 3, 2, '#6ec6ff');
    R(c, x + 1, y + 3 + bob, 1, 1, '#3f9ad8');
  } else if (mood === 'happy') {
    const k = (t / 800) % 1;
    const sy = y - 2 - k * 10;
    const col = k < 0.75 ? '#ffe066' : '#fff6c0';
    R(c, x, sy, 1, 3, col);
    R(c, x - 1, sy + 1, 3, 1, col);
    const k2 = (k + 0.5) % 1;
    R(c, x - 22, y + 4 - k2 * 10, 1, 1, '#ffe066');
  }
}

/* ---------------- Background ---------------- */

function drawSky(c) {
  const bands = ['#6fbde8', '#7cc4eb', '#8acbee', '#98d2f0', '#a8daf2', '#b9e2f4', '#cbe9f5', '#dcf0f6', '#e8f5f6'];
  bands.forEach((col, i) => R(c, 0, i * 12, W, 12, col));
  R(c, 0, 108, W, 72, '#e8f5f6');
}

function cloud(c, x, y, s = 1) {
  ellipse(c, x + 12 * s, y + 6 * s, 10 * s, 5 * s, '#d8ecf4');
  ellipse(c, x + 12 * s, y + 5 * s, 10 * s, 5 * s, '#ffffff');
  ellipse(c, x + 24 * s, y + 3 * s, 8 * s, 6 * s, '#ffffff');
  ellipse(c, x + 34 * s, y + 7 * s, 8 * s, 4 * s, '#d8ecf4');
  ellipse(c, x + 34 * s, y + 6 * s, 8 * s, 4 * s, '#ffffff');
}

function mango(c, x, y, col, hi, dark) {
  R(c, x + 1, y, 3, 1, col);
  R(c, x, y + 1, 5, 2, col);
  R(c, x + 1, y + 3, 3, 1, dark);
  R(c, x + 4, y + 2, 1, 1, dark);
  R(c, x + 1, y + 1, 1, 1, hi);
}

function crate(c, x, y, w, h, fruit) {
  const [col, hi, dark] = fruit;
  // pile of fruit on top (3 rows, shrinking)
  for (let row = 0; row < 3; row++) {
    const inset = row * 3;
    for (let fx = x + 1 + inset; fx <= x + w - 6 - inset; fx += 4) mango(c, fx, y - 4 - row * 3, col, hi, dark);
  }
  R(c, x, y, w, h, '#9a6a3e');
  R(c, x, y, w, 2, '#c08a52');
  for (let yy = y + 5; yy < y + h - 1; yy += 5) R(c, x, yy, w, 1, '#6b4226');
  R(c, x, y, 2, h, '#5a3720');
  R(c, x + w - 2, y, 2, h, '#5a3720');
  R(c, x, y + h - 1, w, 1, '#3e2414');
  R(c, x + 3, y + 7, 1, 1, '#3e2414');
  R(c, x + w - 4, y + 7, 1, 1, '#3e2414');
}

function basket(c, x, y, w, fruit) {
  const [col, hi, dark] = fruit;
  for (let fx = x + 1; fx <= x + w - 6; fx += 4) mango(c, fx, y - 3, col, hi, dark);
  trap(c, x + w / 2, y, y + 6, w, w - 4, '#b8874f');
  for (let yy = y + 1; yy < y + 7; yy += 2) {
    for (let xx = x + ((yy >> 1) % 2) * 2; xx < x + w; xx += 4) R(c, xx, yy, 2, 1, '#8e6234');
  }
  R(c, x, y, w, 1, '#d4a468');
}

function hangingBunch(c, x, ropeLen, kind) {
  R(c, x, 32, 1, ropeLen, '#3e2414');
  const y = 32 + ropeLen;
  if (kind === 'banana') {
    for (let i = 0; i < 4; i++) {
      R(c, x - 5 + i * 3, y + 1 + (i % 2), 2, 9, '#f2d34a');
      R(c, x - 5 + i * 3, y + 1 + (i % 2), 1, 9, '#fff0a0');
      R(c, x - 4 + i * 3, y + 9 + (i % 2), 1, 2, '#6b5020');
    }
    R(c, x - 1, y, 3, 2, '#7a9a3a');
  } else {
    for (const [dx, dy] of [[-3, 0], [1, 1], [-5, 4], [-1, 5], [3, 5], [-3, 9], [1, 10]]) {
      mango(c, x + dx, y + dy, '#8cc43c', '#d4f0a0', '#5a8a24');
    }
  }
}

function shophouse(c, x, y, w, h, wall, roof, rnd) {
  // pitched tin/wood roof
  trap(c, x + w / 2, y - 9, y, w - 10, w + 8, roof);
  R(c, x - 4, y, w + 8, 2, '#5a3d2e');
  R(c, x, y + 2, w, h, wall);
  // upper floor shutters
  for (let wx = x + 4; wx < x + w - 8; wx += 12) {
    R(c, wx, y + 6, 8, 10, '#6a4a36');
    R(c, wx + 1, y + 7, 3, 8, '#8a6a50');
    R(c, wx + 4, y + 7, 3, 8, '#7c5c44');
    R(c, wx - 1, y + 16, 10, 1, '#5a3d2e');
  }
  // balcony rail
  R(c, x, y + 19, w, 2, '#7a5a44');
  for (let bx = x + 2; bx < x + w; bx += 4) R(c, bx, y + 21, 1, 4, '#7a5a44');
  // shop front
  R(c, x + 3, y + 27, w - 6, h - 25, '#4e3a2e');
  for (let fx = x + 5; fx < x + w - 5; fx += 5) R(c, fx, y + 27, 1, h - 25, '#6a5040');
  if (rnd() < 0.7) {
    R(c, x + 2, y + 25, w - 4, 3, rnd() < 0.5 ? '#6f8f9a' : '#b0664a');
  }
}

function drawScene(c) {
  const rnd = seeded(11);

  // distant hills / treeline
  for (let x = 0; x < W; x++) {
    const h = 16 + Math.round(4 * Math.sin(x / 11) + 3 * Math.sin(x / 4.3));
    R(c, x, 100 - h, 1, h + 14, '#8fc08e');
  }
  // big tree behind the street
  R(c, 203, 60, 4, 40, '#6b4a33');
  for (const [ex, ey, rx, ry, col] of [
    [205, 58, 20, 14, '#4a8a3c'], [192, 64, 12, 10, '#4a8a3c'], [218, 66, 12, 9, '#4a8a3c'],
    [203, 54, 16, 10, '#5f9e4a'], [196, 60, 8, 6, '#78b85a'], [212, 52, 7, 5, '#78b85a'],
  ]) ellipse(c, ex, ey, rx, ry, col);

  // old wooden shophouses down the street
  shophouse(c, 150, 70, 38, 44, '#c9ae8c', '#8a5e46', rnd);
  shophouse(c, 190, 76, 34, 38, '#b99c80', '#7b5444', rnd);
  shophouse(c, 226, 68, 34, 46, '#c7b092', '#94664c', rnd);
  R(c, 146, 56, 120, 60, 'rgba(225,242,248,.22)');

  // utility pole and sagging wires
  R(c, 255, 18, 3, 98, '#5b4a3e');
  R(c, 247, 24, 20, 2, '#5b4a3e');
  R(c, 249, 30, 16, 2, '#5b4a3e');
  for (let x = 0; x < W; x++) {
    const left = x < 256;
    const d = left ? (x - 128) / 128 : (x - 288) / 32;
    const sag = left ? 12 : 4;
    const k = 1 - d * d;
    R(c, x, 26 + Math.round(sag * k), 1, 1, '#3a3230');
    R(c, x, 32 + Math.round(sag * k), 1, 1, '#3a3230');
    if (left) R(c, x, 20 + Math.round(9 * k), 1, 1, '#3a3230');
  }

  // ground and dirt road with perspective
  R(c, 0, 112, W, 40, '#d2b385');
  R(c, 0, 112, W, 3, '#c4a576');
  for (let y = 114; y < GROUND; y++) {
    const t = (y - 112) / 40;
    const half = 10 + t * 80;
    R(c, 205 - half, y, half * 2, 1, '#dfc496');
  }
  for (let i = 0; i < 260; i++) {
    R(c, rnd() * W, 114 + rnd() * 38, 1, 1, rnd() < 0.5 ? '#b9966a' : '#ead3aa');
  }
  for (let i = 0; i < 10; i++) {
    const sx = 160 + rnd() * 100;
    const sy = 120 + rnd() * 28;
    R(c, sx, sy, 3, 2, '#b8a488');
    R(c, sx, sy, 2, 1, '#d8c8aa');
  }

  // ---------- left stall (Som Sri's) ----------
  R(c, 0, 30, 152, 90, '#5a3920');
  for (let x = 0; x < 152; x += 8) {
    R(c, x, 30, 1, 90, '#472c18');
    R(c, x + 1, 30, 1, 90, '#6a4428');
    if (rnd() < 0.5) R(c, x + 2, 34 + rnd() * 70, 4, 10, '#654026');
    for (let g = 0; g < 4; g++) R(c, x + 2 + Math.floor(rnd() * 5), 34 + rnd() * 80, 1, 3 + rnd() * 5, '#4c3019');
    R(c, x + 4, 60, 1, 1, '#2e1c10');
    R(c, x + 4, 96, 1, 1, '#2e1c10');
  }
  // back shelf with baskets
  R(c, 6, 76, 140, 4, '#8a5a36');
  R(c, 6, 76, 140, 1, '#a8744a');
  R(c, 6, 80, 140, 1, '#2e1c10');
  basket(c, 10, 70, 18, ['#f4c430', '#fff2a8', '#c7901a']);
  basket(c, 34, 70, 16, ['#8cc43c', '#d4f0a0', '#5a8a24']);
  basket(c, 104, 70, 16, ['#f08c2a', '#ffd08a', '#b85a14']);
  basket(c, 124, 70, 18, ['#f4c430', '#fff2a8', '#c7901a']);
  // counter behind the vendor
  R(c, 6, 106, 142, 4, '#a8744a');
  R(c, 6, 110, 142, 42, '#6b4226');
  for (let x = 12; x < 148; x += 10) R(c, x, 110, 1, 42, '#553319');
  R(c, 6, 110, 142, 2, '#3e2414');
  // posts
  for (const px of [0, 147]) {
    R(c, px, 28, 6, 124, '#4a2d19');
    R(c, px + 1, 28, 2, 124, '#6b4226');
  }
  // shingled wooden roof
  for (let x = 0; x < 160; x++) {
    const top = Math.round(2 + x * 0.1);
    R(c, x, top, 1, 28 - top, '#8a5234');
  }
  for (let row = 0; row < 7; row++) {
    const y = 4 + row * 4;
    for (let x = (row % 2) * 5; x < 160; x += 10) {
      if (y < 2 + x * 0.1) continue;
      R(c, x, y, 9, 3, row % 2 ? '#9c6040' : '#a86a44');
      R(c, x, y + 3, 9, 1, '#6e3f26');
    }
  }
  R(c, 0, 26, 162, 4, '#4a2c18');
  R(c, 0, 26, 162, 1, '#7a4a2c');
  // shade under the roof fading downwards
  for (let i = 0; i < 8; i++) R(c, 0, 30 + i * 3, 147, 3, `rgba(20,10,5,${0.42 - i * 0.05})`);
  // chili and garlic strings
  for (const [sx, col, hi] of [[50, '#d2322a', '#ff7a5a'], [100, '#efe6d0', '#ffffff']]) {
    R(c, sx, 32, 1, 18, '#3e2414');
    for (let k = 0; k < 5; k++) {
      R(c, sx - 1, 36 + k * 3, 3, 2, col);
      R(c, sx - 1, 36 + k * 3, 1, 1, hi);
    }
  }
  // hanging produce
  hangingBunch(c, 18, 4, 'banana');
  hangingBunch(c, 38, 8, 'mango');
  hangingBunch(c, 112, 6, 'mango');
  hangingBunch(c, 134, 3, 'banana');
  // price sign
  R(c, 62, 32, 1, 5, '#3e2414');
  R(c, 90, 32, 1, 5, '#3e2414');
  R(c, 56, 37, 40, 15, '#ecd6a6');
  R(c, 56, 37, 40, 1, '#fbecc8');
  R(c, 56, 51, 40, 1, '#8a6238');
  R(c, 56, 37, 1, 15, '#8a6238');
  R(c, 95, 37, 1, 15, '#8a6238');
  R(c, 60, 41, 14, 2, '#6b1c28');
  R(c, 60, 45, 20, 1, '#6b1c28');
  R(c, 78, 40, 13, 5, '#b8423a');
  R(c, 80, 41, 2, 3, '#ecd6a6');
  R(c, 84, 41, 2, 3, '#ecd6a6');
  R(c, 60, 48, 28, 1, '#8a6238');
  // crates of mangoes in front
  const yellow = ['#f4c430', '#fff2a8', '#c7901a'];
  const green = ['#8cc43c', '#d4f0a0', '#5a8a24'];
  const orange = ['#f08c2a', '#ffd08a', '#b85a14'];
  crate(c, 6, 130, 28, 22, yellow);
  crate(c, 34, 134, 24, 18, green);
  crate(c, 102, 132, 26, 20, orange);
  crate(c, 128, 136, 24, 16, yellow);
  basket(c, 150, 144, 16, green);
  // pineapples and a watermelon on the counter behind
  for (const px of [14, 24, 120, 130]) {
    R(c, px, 99, 6, 7, '#d69a2a');
    for (let k = 0; k < 3; k++) R(c, px + (k % 2) * 2, 100 + k * 2, 2, 1, '#9a6618');
    R(c, px + 1, 94, 1, 5, '#4f8a34');
    R(c, px + 3, 93, 1, 6, '#6aa84a');
    R(c, px + 5, 95, 1, 4, '#4f8a34');
  }
  ellipse(c, 44, 102, 7, 4.5, '#2f6a2a');
  for (let k = 0; k < 4; k++) R(c, 39 + k * 3, 98, 1, 8, '#4f9a44');
  R(c, 40, 99, 2, 1, '#8ad07a');
  // crates by the player, like the stall across the street
  crate(c, 268, 140, 22, 12, orange);
  basket(c, 196, 146, 14, yellow);

  // ---------- right stall ----------
  R(c, 262, 52, 58, 8, '#7b4b32');
  R(c, 262, 52, 58, 1, '#a8694a');
  R(c, 266, 74, 54, 78, '#6b4a33');
  for (let x = 266; x < W; x += 7) R(c, x, 74, 1, 78, '#5a3d29');
  for (const sy of [96, 118]) {
    R(c, 268, sy, 52, 3, '#9a6a3e');
    R(c, 268, sy + 3, 52, 1, '#3e2414');
    for (let jx = 271; jx < 316; jx += 7) {
      const col = ['#c9e3e8', '#e7b04b', '#d06a4a', '#9fc76a', '#f2ede3'][Math.floor(rnd() * 5)];
      R(c, jx, sy - 8, 5, 8, col);
      R(c, jx, sy - 9, 5, 1, '#5a3d29');
      R(c, jx + 1, sy - 7, 1, 4, 'rgba(255,255,255,.45)');
      R(c, jx + 4, sy - 8, 1, 8, 'rgba(0,0,0,.18)');
    }
  }
  for (const px of [264, 316]) R(c, px, 60, 3, 92, '#4a2d19');
  // striped awning with scalloped edge
  R(c, 260, 60, 60, 1, '#7a2a24');
  for (let x = 260; x < W; x++) {
    const col = Math.floor((x - 260) / 7) % 2 ? '#f2ede3' : '#c8423a';
    R(c, x, 61, 1, 13, col);
    const k = (x - 260) % 7;
    if (k >= 1 && k <= 5) R(c, x, 74, 1, 1, col);
    if (k >= 2 && k <= 4) R(c, x, 75, 1, 1, col);
  }
  R(c, 260, 66, 60, 1, 'rgba(0,0,0,.08)');
  // hanging bag sign
  R(c, 293, 76, 1, 4, '#3e2414');
  R(c, 287, 80, 13, 11, '#efe8d8');
  R(c, 287, 90, 13, 1, '#b9ad96');
  R(c, 291, 83, 5, 5, '#6f9a5a');
  // rice sacks and clay pots
  for (const [sx, sw] of [[268, 16], [284, 14]]) {
    R(c, sx, 132, sw, 20, '#c9a877');
    R(c, sx, 132, sw, 3, '#b08e5c');
    R(c, sx + sw - 3, 135, 3, 17, '#a8865a');
    R(c, sx + 3, 140, sw - 7, 3, '#7a5a3a');
  }
  for (const [px, py, pw] of [[300, 132, 14], [312, 138, 10]]) {
    R(c, px + 2, py, pw - 4, 2, '#8a4527');
    R(c, px, py + 2, pw, GROUND - py - 3, '#b5653a');
    R(c, px + 2, py + 3, 2, GROUND - py - 7, '#d58a58');
    R(c, px + pw - 3, py + 3, 2, GROUND - py - 6, '#94502e');
    R(c, px + 2, GROUND - 1, pw - 4, 1, '#6e3520');
  }
  // grass tufts
  for (const gx of [160, 176, 246, 258]) {
    R(c, gx, 148, 1, 4, '#6f9e4a');
    R(c, gx + 2, 146, 1, 6, '#86b85a');
    R(c, gx + 4, 149, 1, 3, '#6f9e4a');
  }

  // ---------- brick pavement ----------
  R(c, 0, GROUND, W, H - GROUND, '#a8714c');
  for (let r = 0; r * 6 + GROUND < H; r++) {
    const y = GROUND + r * 6;
    const off = (r % 2) * 7;
    R(c, 0, y + 5, W, 1, '#7a4e33');
    for (let x = -off; x < W; x += 14) {
      R(c, x, y, 1, 5, '#7a4e33');
      R(c, x + 1, y, 12, 1, '#c08a64');
      if (rnd() < 0.3) R(c, x + 3, y + 2, 4, 2, '#9c6844');
    }
  }
  R(c, 0, GROUND, W, 2, '#d8a67a');
  R(c, 0, GROUND + 2, W, 1, '#8a5a3a');
}

/* ---------------- Scene controller ---------------- */

export function createScene(canvas) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const [sky, skyCtx] = makeCanvas(W, H);
  drawSky(skyCtx);
  const [scene, sceneCtx] = makeCanvas(W, H);
  drawScene(sceneCtx);

  const vendor = { sprite: drawVendor(), f: VENDOR_FACE, x: 66, mood: 'neutral', talking: false, moodAt: 0, isVendor: true };
  const player = { sprite: drawPlayer(), f: PLAYER_FACE, x: 225, mood: 'neutral', talking: false, hopAt: -1e9, isVendor: false };

  const blinkAt = (t, period, offset) => (t + offset) % period < 130;

  function drawCharacter(ch, t) {
    let x = ch.x;
    let y = GROUND - ch.f.h + 1;
    y += Math.floor((t + (ch.isVendor ? 0 : 400)) / 700) % 2;
    if (ch.isVendor && ch.mood === 'angry' && t - ch.moodAt < 700) x += Math.floor(t / 50) % 2 ? 1 : -1;
    if (ch.isVendor && ch.mood === 'happy' && t - ch.moodAt < 900) y -= Math.floor((t - ch.moodAt) / 150) % 2 ? 2 : 0;
    if (!ch.isVendor) {
      const k = (t - ch.hopAt) / 320;
      if (k >= 0 && k < 1) y -= Math.round(Math.sin(k * Math.PI) * 4);
    }

    // soft shadow
    ellipse(ctx, ch.x + ch.f.w / 2, GROUND, ch.f.w / 2 - 3, 2.5, 'rgba(40,20,10,.25)');
    ctx.drawImage(ch.sprite, x, y);
    drawFace(ctx, x, y, ch.f, {
      mood: ch.mood,
      talking: ch.talking,
      blink: blinkAt(t, ch.isVendor ? 3700 : 4300, ch.isVendor ? 0 : 1500),
      t,
    });
    if (ch.isVendor || ch.mood === 'stressed') moodFx(ctx, x + ch.f.fx[0], y + ch.f.fx[1], ch.mood, t);
  }

  function frame(t) {
    ctx.drawImage(sky, 0, 0);
    const span = W + 100;
    const drift = t / 300;
    cloud(ctx, ((30 + drift) % span) - 50, 8, 1);
    cloud(ctx, ((170 + drift * 0.7) % span) - 50, 2, 0.8);
    cloud(ctx, ((260 + drift * 0.85) % span) - 50, 20, 0.6);
    // a couple of birds gliding across
    const bx = ((t / 60) % (W + 200)) - 100;
    const flap = Math.floor(t / 200) % 2;
    for (const [dx, dy] of [[0, 30], [9, 26]]) {
      R(ctx, bx + dx, dy + flap, 2, 1, '#3a3a44');
      R(ctx, bx + dx + 2, dy + 1 - flap, 1, 1, '#3a3a44');
      R(ctx, bx + dx + 3, dy + flap, 2, 1, '#3a3a44');
    }
    ctx.drawImage(scene, 0, 0);
    drawCharacter(vendor, t);
    drawCharacter(player, t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    setMood(mood) {
      if (mood !== vendor.mood) vendor.moodAt = performance.now();
      vendor.mood = mood;
      // the player reacts a little to the vendor's mood
      player.mood = mood === 'angry' ? 'stressed' : mood === 'happy' ? 'happy' : 'neutral';
    },
    setTalking(who, on) {
      (who === 'npc' ? vendor : player).talking = on;
    },
    hop() {
      player.hopAt = performance.now();
    },
  };
}
