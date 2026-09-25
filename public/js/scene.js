// 16-bit style market scene drawn on a tiny 192x108 canvas and scaled up with crisp pixels.
export const W = 192;
export const H = 108;
const GROUND = 92;

const R = (c, x, y, w, h, col) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};

function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeLayer() {
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  return [cv, cv.getContext('2d')];
}

/* ---------------- Sprites ---------------- */

const VENDOR = [
  '........kkkk........',
  '.......khhhhk.......',
  '.......khHHhk.......',
  '......kkhhhhkk......',
  '....kkhhhhhhhhkk....',
  '...khhhhhhhhhhhhk...',
  '...khhsssssssshhk...',
  '...khsssssssssshk...',
  '...kssssssssssssk...',
  '...kssssssssssssk...',
  '...kssssssssssssk...',
  '....kssssssssssk....',
  '....kSssssssssSk....',
  '.....kkSSSSSSkk.....',
  '........kssk........',
  '..kkwwwwwwwwwwwwkk..',
  '..kwwwwwwyywwwwwwk..',
  '.kwkwwwwwwwwwwwwkwk.',
  '.kwkwwwwwwyywwwwkwk.',
  '.kwkwwwwwwwwwwwwkwk.',
  '.kwkWwwwwwwwwwwWkwk.',
  '.kskWWWWWWWWWWWWksk.',
  '.kkkrrrrrrrrrrrrkkk.',
  '...krrrrrrrrrrrrk...',
  '...kyyyyyyyyyyyyk...',
  '...krRrRrRrRrRrRk...',
  '...krrrrrrrrrrrrk...',
  '...kRrRrRrRrRrRrk...',
  '...krrrrrrrrrrrrk...',
  '...kyyyyyyyyyyyyk...',
  '...kRRRRRRRRRRRRk...',
  '....kssk....kssk....',
  '...kbbbbk..kbbbbk...',
  '...kkkkkk..kkkkkk...',
];
const VENDOR_PAL = {
  k: '#2b1d16', h: '#d8d4cf', H: '#9d9892', s: '#e8b48a', S: '#c98f66',
  w: '#f3e6c8', W: '#d8c49c', y: '#d9a441', r: '#a8323a', R: '#6e1f2a', b: '#5a3a22',
};

const PLAYER = [
  '......kkkkkkk.......',
  '.....knnnnnnnkk.....',
  '....knnnnnnnnnnk....',
  '...knnnNnnnnNnnnk...',
  '...knnnnnnnnnnnnk...',
  '...knnnnnnnnnnnnk...',
  '...knsssnnssssnnk...',
  '...knssssssssssnk...',
  '...kssssssssssssk...',
  '...kssssssssssssk...',
  '...kssssssssssssk...',
  '....kssssssssssk....',
  '....kSssssssssSk....',
  '.....kkSSSSSSkk.....',
  '........kssk........',
  '..kkwwwwwwwwwwwwkk..',
  '..kwwwwwwkkwwwwwwk..',
  '.kwkwwwwwwwwwwwwkwk.',
  '.kwkwwwwwwwwwwwwkwk.',
  '.kwkwwwwwwwwwwwwkwk.',
  '.kskWWWWWWWWWWWWksk.',
  '...kppppppppppppk...',
  '...kppppppppppppk...',
  '...kpppppkkpppppk...',
  '...kppppk..kppppk...',
  '...kppppk..kppppk...',
  '...kPPPPk..kPPPPk...',
  '...kbbbbk..kbbbbk...',
  '..kbbbbbk..kbbbbbk..',
  '..kkkkkkk..kkkkkkk..',
];
const PLAYER_PAL = {
  k: '#231812', n: '#5b3a24', N: '#3d2616', s: '#f0c39a', S: '#d19c72',
  w: '#f4f1ea', W: '#cfc8ba', p: '#6b4a2e', P: '#4a321f', b: '#3a2a20',
};

function bakeSprite(rows, pal) {
  const cv = document.createElement('canvas');
  cv.width = rows[0].length;
  cv.height = rows.length;
  const c = cv.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => pal[ch] && R(c, x, y, 1, 1, pal[ch])));
  return cv;
}

/* ---------------- Background ---------------- */

function drawSky(c) {
  const bands = ['#6fbfe8', '#80c8ec', '#92d1ef', '#a6daf2', '#bce4f5', '#d2edf6', '#e4f4f6'];
  bands.forEach((col, i) => R(c, 0, i * 10, W, 10, col));
  R(c, 0, 70, W, 38, '#e4f4f6');
}

function cloud(c, x, y) {
  R(c, x + 5, y, 9, 2, '#ffffff');
  R(c, x + 14, y - 2, 6, 3, '#ffffff');
  R(c, x + 2, y + 2, 20, 3, '#ffffff');
  R(c, x, y + 5, 24, 2, '#ffffff');
  R(c, x + 2, y + 7, 20, 1, '#cfe8f3');
}

function crate(c, x, y, w, h, fruit, hi) {
  for (let fx = x + 2; fx < x + w - 3; fx += 3) {
    R(c, fx, y - 5, 3, 3, fruit);
    R(c, fx, y - 5, 1, 1, hi);
  }
  for (let fx = x + 1; fx < x + w - 2; fx += 3) {
    R(c, fx, y - 3, 3, 3, fruit);
    R(c, fx, y - 3, 1, 1, hi);
    R(c, fx + 2, y - 1, 1, 1, 'rgba(0,0,0,.25)');
  }
  R(c, x, y, w, h, '#9a6a3e');
  R(c, x, y, w, 1, '#c08a52');
  for (let yy = y + 3; yy < y + h - 1; yy += 4) R(c, x, yy, w, 1, '#6b4226');
  R(c, x, y, 1, h, '#5a3720');
  R(c, x + w - 1, y, 1, h, '#5a3720');
  R(c, x, y + h - 1, w, 1, '#3e2414');
}

function hanging(c, x, len, col, dark) {
  R(c, x, 20, 1, len, '#3e2414');
  const y = 20 + len;
  R(c, x - 2, y, 5, 2, col);
  R(c, x - 3, y + 2, 7, 3, col);
  R(c, x - 2, y + 5, 5, 2, col);
  R(c, x - 1, y + 7, 3, 1, dark);
  R(c, x - 2, y + 2, 1, 1, '#ffffff66');
}

function drawScene(c) {
  const rnd = seeded(7);

  // distant treeline
  for (let x = 0; x < W; x++) {
    const h = 10 + Math.round(3 * Math.sin(x / 7) + 2 * Math.sin(x / 3.1));
    R(c, x, 62 - h, 1, h + 10, '#86b98a');
  }

  // distant buildings (hazy)
  const bld = (x, y, w, h, wall, roof, win) => {
    R(c, x - 2, y - 5, w + 4, 5, roof);
    R(c, x, y - 7, w, 2, roof);
    R(c, x, y, w, h, wall);
    for (let wx = x + 3; wx < x + w - 3; wx += 6) R(c, wx, y + 4, 3, 4, win);
    R(c, x + (w >> 1) - 2, y + h - 8, 5, 8, win);
  };
  bld(86, 46, 24, 26, '#c3a98a', '#8f6a55', '#7a6252');
  bld(112, 50, 28, 22, '#b59c84', '#846151', '#6f5a4d');
  bld(142, 44, 14, 28, '#c7ad90', '#94705a', '#7a6252');
  R(c, 80, 36, 80, 38, 'rgba(225,242,248,.28)');

  // utility pole + sagging wires
  R(c, 146, 12, 2, 62, '#5b4a3e');
  R(c, 141, 16, 12, 1, '#5b4a3e');
  for (let x = 0; x < W; x++) {
    const d = x < 146 ? (x - 73) / 73 : (x - 169) / 23;
    const sag = x < 146 ? 7 : 3;
    R(c, x, 17 + Math.round(sag * (1 - d * d)), 1, 1, '#3a3230');
    R(c, x, 22 + Math.round(sag * (1 - d * d)), 1, 1, '#3a3230');
  }

  // ground + road
  R(c, 0, 70, W, 22, '#d2b182');
  R(c, 0, 70, W, 2, '#c4a374');
  for (let y = 72; y < GROUND; y++) {
    const t = (y - 70) / 22;
    const half = 6 + t * 54;
    R(c, 114 - half, y, half * 2, 1, '#dcbe90');
  }
  for (let i = 0; i < 120; i++) {
    R(c, rnd() * W, 72 + rnd() * 20, 1, 1, rnd() < 0.5 ? '#b9966a' : '#e6cda3');
  }

  // ---------- left stall (Som Sri's) ----------
  R(c, 0, 20, 84, 52, '#5e3b22');
  for (let x = 0; x < 84; x += 6) {
    R(c, x, 20, 1, 52, '#4a2d19');
    if (rnd() < 0.5) R(c, x + 2, 22 + rnd() * 40, 1, 6, '#6e4629');
  }
  // back shelf with baskets
  R(c, 4, 46, 76, 3, '#8a5a36');
  R(c, 4, 49, 76, 1, '#3e2414');
  [[8, '#f4c430'], [22, '#9ccc3a'], [60, '#f08c2a'], [72, '#f4c430']].forEach(([bx, col]) => {
    R(c, bx, 41, 3, 3, col);
    R(c, bx + 3, 40, 3, 3, col);
    R(c, bx + 1, 43, 7, 3, '#b8874f');
    R(c, bx + 1, 45, 7, 1, '#7a5230');
  });
  // counter behind the vendor
  R(c, 4, 64, 80, 3, '#9a6a3e');
  R(c, 4, 67, 80, 25, '#6b4226');
  for (let x = 8; x < 84; x += 8) R(c, x, 67, 1, 25, '#553319');
  // posts
  R(c, 0, 18, 4, 74, '#4a2d19');
  R(c, 1, 18, 1, 74, '#6b4226');
  R(c, 82, 18, 4, 74, '#4a2d19');
  R(c, 83, 18, 1, 74, '#6b4226');
  // roof (sloped planks)
  for (let x = 0; x < 90; x++) {
    const top = Math.round(2 + x * 0.1);
    R(c, x, top, 1, 18 - top, x % 5 === 0 ? '#6e3f2a' : '#8a5238');
    R(c, x, top, 1, 1, '#a8694a');
  }
  R(c, 0, 18, 90, 2, '#4a2d19');
  R(c, 0, 20, 90, 1, '#2e1c10');
  // hanging produce
  hanging(c, 12, 6, '#f2d34a', '#b89a20');
  hanging(c, 28, 10, '#9ccc3a', '#5f8a1e');
  hanging(c, 66, 8, '#f2d34a', '#b89a20');
  // price sign
  R(c, 42, 24, 20, 9, '#e9d3a4');
  R(c, 42, 24, 20, 1, '#f7e8c6');
  R(c, 42, 32, 20, 1, '#7a5230');
  R(c, 45, 27, 6, 1, '#6e1f2a');
  R(c, 45, 29, 10, 1, '#6e1f2a');
  R(c, 54, 27, 4, 1, '#2b1d16');
  R(c, 47, 21, 1, 3, '#3e2414');
  R(c, 57, 21, 1, 3, '#3e2414');
  // front crates
  crate(c, 3, 77, 18, 15, '#f4c430', '#fff2a8');
  crate(c, 20, 80, 16, 12, '#9ccc3a', '#dff5a0');
  crate(c, 63, 78, 17, 14, '#f08c2a', '#ffd08a');
  crate(c, 79, 82, 12, 10, '#f4c430', '#fff2a8');

  // ---------- right stall ----------
  R(c, 150, 30, 42, 6, '#7b4b32');
  R(c, 150, 30, 42, 1, '#a8694a');
  R(c, 152, 44, 40, 48, '#6b4a33');
  for (let x = 152; x < W; x += 6) R(c, x, 44, 1, 48, '#5a3d29');
  [56, 68].forEach((sy) => {
    R(c, 154, sy, 38, 2, '#9a6a3e');
    for (let jx = 156; jx < 190; jx += 5) {
      const col = ['#c9e3e8', '#e7b04b', '#d06a4a', '#9fc76a'][Math.floor(rnd() * 4)];
      R(c, jx, sy - 5, 3, 5, col);
      R(c, jx, sy - 6, 3, 1, '#5a3d29');
      R(c, jx, sy - 5, 1, 2, '#ffffff55');
    }
  });
  R(c, 150, 36, 2, 56, '#4a2d19');
  R(c, 190, 36, 2, 56, '#4a2d19');
  R(c, 148, 35, 44, 1, '#7a2a24');
  for (let x = 148; x < W; x++) {
    const col = Math.floor((x - 148) / 5) % 2 ? '#f2ede3' : '#c8423a';
    R(c, x, 36, 1, 8, col);
    const k = (x - 148) % 5;
    if (k >= 1 && k <= 3) R(c, x, 44, 1, 1, col);
    if (k === 2) R(c, x, 45, 1, 1, col);
  }
  // clay pots
  [[158, 80, 10], [171, 83, 8], [181, 79, 9]].forEach(([px, py, pw]) => {
    R(c, px + 1, py, pw - 2, 1, '#8a4527');
    R(c, px, py + 1, pw, GROUND - py - 2, '#b5653a');
    R(c, px + 1, py + 2, 1, GROUND - py - 5, '#d58a58');
    R(c, px + 1, GROUND - 1, pw - 2, 1, '#6e3520');
  });
  // hanging bag sign
  R(c, 174, 46, 1, 3, '#3e2414');
  R(c, 171, 49, 8, 7, '#efe8d8');
  R(c, 171, 55, 8, 1, '#b9ad96');
  R(c, 173, 51, 4, 3, '#6f9a5a');

  // ---------- brick pavement ----------
  R(c, 0, GROUND, W, H - GROUND, '#a8714c');
  for (let r = 0; r * 4 + GROUND < H; r++) {
    const y = GROUND + r * 4;
    const off = (r % 2) * 5;
    R(c, 0, y + 3, W, 1, '#7e5236');
    for (let x = -off; x < W; x += 10) {
      R(c, x, y, 1, 3, '#7e5236');
      R(c, x + 1, y, 8, 1, '#bd8762');
    }
  }
  R(c, 0, GROUND, W, 1, '#d09d72');
}

/* ---------------- Faces & effects ---------------- */

const EYE = '#2b1d16';
function face(c, x, y, { mood, talking, blink, isVendor, t }) {
  const P = (px, py, w = 1, h = 1, col = EYE) => R(c, x + px, y + py, w, h, col);
  const brow = isVendor ? '#8f8a85' : '#3d2616';

  // eyes
  if (blink) {
    P(6, 9, 2, 1);
    P(12, 9, 2, 1);
  } else if (mood === 'happy') {
    P(6, 9); P(7, 8); P(8, 9);
    P(11, 9); P(12, 8); P(13, 9);
  } else if (mood === 'stressed') {
    P(7, 8, 1, 1);
    P(12, 8, 1, 1);
  } else {
    P(7, 8, 1, 2);
    P(12, 8, 1, 2);
  }

  // brows
  if (mood === 'angry') {
    P(6, 6, 1, 1, brow); P(7, 7, 2, 1, brow);
    P(13, 6, 1, 1, brow); P(11, 7, 2, 1, brow);
  } else if (mood === 'stressed') {
    P(6, 7, 1, 1, brow); P(7, 6, 2, 1, brow);
    P(13, 7, 1, 1, brow); P(11, 6, 2, 1, brow);
  } else if (isVendor) {
    P(6, 7, 2, 1, brow);
    P(12, 7, 2, 1, brow);
  }

  // cheeks
  if (mood === 'happy') {
    P(5, 10, 2, 1, '#f09a8a');
    P(13, 10, 2, 1, '#f09a8a');
  } else if (mood === 'angry') {
    P(5, 10, 2, 1, '#e0604f');
    P(13, 10, 2, 1, '#e0604f');
  }

  // mouth
  if (talking && Math.floor(t / 110) % 2 === 0) {
    P(9, 11, 2, 2, '#5a2020');
  } else if (mood === 'happy') {
    P(8, 11); P(11, 11); P(9, 12, 2, 1);
  } else if (mood === 'angry') {
    P(9, 11, 2, 1); P(8, 12); P(11, 12);
  } else if (mood === 'stressed') {
    P(8, 12); P(9, 11); P(10, 12); P(11, 11);
  } else {
    P(9, 11, 2, 1, isVendor ? '#8a4a3a' : '#9a5a44');
  }
}

function moodFx(c, x, y, mood, t) {
  if (mood === 'angry') {
    const s = Math.floor(t / 250) % 2;
    const col = '#e8352a';
    R(c, x + 16 + s, y + 1, 1, 3, col);
    R(c, x + 19 + s, y + 1, 1, 3, col);
    R(c, x + 16 + s, y + 1, 4, 1, col);
    R(c, x + 16 + s, y + 3, 4, 1, col);
  } else if (mood === 'stressed') {
    const bob = Math.floor(t / 300) % 3;
    R(c, x + 17, y + 3 + bob, 1, 1, '#9fdcff');
    R(c, x + 16, y + 4 + bob, 3, 2, '#6ec6ff');
    R(c, x + 17, y + 6 + bob, 1, 1, '#3f9ad8');
  } else if (mood === 'happy') {
    const k = (t / 700) % 1;
    const sy = y - 2 - k * 8;
    const col = k < 0.8 ? '#ffe066' : '#fff6c0';
    R(c, x + 18, sy, 1, 3, col);
    R(c, x + 17, sy + 1, 3, 1, col);
    const sy2 = y + 2 - ((k + 0.5) % 1) * 8;
    R(c, x - 1, sy2, 1, 1, '#ffe066');
  }
}

/* ---------------- Scene controller ---------------- */

export function createScene(canvas) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const [sky, skyCtx] = makeLayer();
  drawSky(skyCtx);
  const [scene, sceneCtx] = makeLayer();
  drawScene(sceneCtx);
  const vendorSprite = bakeSprite(VENDOR, VENDOR_PAL);
  const playerSprite = bakeSprite(PLAYER, PLAYER_PAL);

  const vendor = { x: 40, y: GROUND - VENDOR.length, mood: 'neutral', talking: false, moodAt: 0 };
  const player = { x: 134, y: GROUND - PLAYER.length, mood: 'neutral', talking: false, hopAt: -1e9 };

  const blinkAt = (t, period, offset) => (t + offset) % period < 130;

  function drawCharacter(sprite, ch, t, isVendor) {
    let { x, y } = ch;
    const breathe = Math.floor((t + (isVendor ? 0 : 400)) / 650) % 2;
    y += breathe;
    if (isVendor && ch.mood === 'angry' && t - ch.moodAt < 700) x += Math.floor(t / 50) % 2 ? 1 : -1;
    if (isVendor && ch.mood === 'happy' && t - ch.moodAt < 900) y -= Math.floor((t - ch.moodAt) / 150) % 2 ? 2 : 0;
    if (!isVendor) {
      const k = (t - ch.hopAt) / 300;
      if (k >= 0 && k < 1) y -= Math.round(Math.sin(k * Math.PI) * 3);
    }

    R(ctx, ch.x + 3, GROUND - 1, 14, 2, 'rgba(40,20,10,.28)');
    R(ctx, ch.x + 5, GROUND + 1, 10, 1, 'rgba(40,20,10,.18)');
    ctx.drawImage(sprite, x, y);
    face(ctx, x, y, {
      mood: ch.mood,
      talking: ch.talking,
      blink: blinkAt(t, isVendor ? 3700 : 4300, isVendor ? 0 : 1500),
      isVendor,
      t,
    });

    if (isVendor) {
      moodFx(ctx, x, y, ch.mood, t);
    } else {
      // shopping bag in the player's right hand (screen left)
      R(ctx, x - 3, y + 19, 1, 3, '#8a7d66');
      R(ctx, x + 1, y + 19, 1, 3, '#8a7d66');
      R(ctx, x - 3, y + 18, 5, 1, '#8a7d66');
      R(ctx, x - 4, y + 21, 7, 8, '#f2efe6');
      R(ctx, x - 4, y + 28, 7, 1, '#b9b09b');
      R(ctx, x - 2, y + 23, 3, 3, '#6f9a5a');
      if (ch.mood === 'stressed') moodFx(ctx, x, y, 'stressed', t);
    }
  }

  function frame(t) {
    ctx.drawImage(sky, 0, 0);
    const drift = (t / 400) % (W + 60);
    cloud(ctx, ((20 + drift) % (W + 60)) - 30, 6);
    cloud(ctx, ((110 + drift * 0.7) % (W + 60)) - 30, 2);
    cloud(ctx, ((170 + drift * 0.85) % (W + 60)) - 30, 13);
    ctx.drawImage(scene, 0, 0);
    drawCharacter(vendorSprite, vendor, t, true);
    drawCharacter(playerSprite, player, t, false);
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
