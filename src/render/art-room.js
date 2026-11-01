// Room rendering: floor, walls, wall decor, door. Static parts are cached per theme/layout.
import { WORLD } from '../config.js';
import { OUT, TAU, hash, ell, circ, rr, poly, mix, rgba, sparkle, starPath } from './art-util.js';

export const WALL_DECOR_TYPES = ['shelf', 'window', 'poster', 'pipes', 'clock', 'skull'];

const W = WORLD.W, H = WORLD.H, F = WORLD.FLOOR, D = WORLD.DOOR;
const FLARE = 20;                 // floor widens towards the viewer (3/4 perspective)
const WALL_TOP = 0, WALL_BOT = F.y0;
const DOOR_X0 = D.x - D.w / 2, DOOR_X1 = D.x + D.w / 2, DOOR_TOP = 46;

const THEMES = [
  { // 0 toxic green lab
    wallA: '#3a5e44', wallB: '#30513a', mortar: '#1f3527', style: 'brick', trim: '#5c8350', base: '#203427',
    floorA: '#3f5446', floorB: '#4c6553', grout: '#24342a', side: '#2d4935', sideTop: '#15251a',
    front: '#2c4634', frontTop: '#557a5c', accent: '#8dff5c', puddle: '#6fe03f', dot: '#c2ff86', door: '#6f7d80',
  },
  { // 1 purple potion lab
    wallA: '#4e3876', wallB: '#422f66', mortar: '#2a1d44', style: 'panel', trim: '#7756aa', base: '#271a3f',
    floorA: '#4a3d66', floorB: '#5b4c7b', grout: '#2b2142', side: '#3d2c5e', sideTop: '#1f1533',
    front: '#3b2c5b', frontTop: '#6a539a', accent: '#e07dff', puddle: '#c25cff', dot: '#f5b3ff', door: '#7a7290',
  },
  { // 2 orange pumpkin storage
    wallA: '#80502c', wallB: '#704424', mortar: '#3e230f', style: 'plank', trim: '#a96f3b', base: '#3b2311',
    floorA: '#6c5034', floorB: '#7b5d3e', grout: '#3d2a1a', side: '#613d21', sideTop: '#34200e',
    front: '#5d3b20', frontTop: '#93653a', accent: '#ffa53a', puddle: '#ff9426', dot: '#ffd98a', door: '#7c6a5c',
  },
  { // 3 icy-blue cryo lab
    wallA: '#3f6a90', wallB: '#365f83', mortar: '#1f3b57', style: 'metal', trim: '#86b8dc', base: '#1f3a55',
    floorA: '#6789a6', floorB: '#7a9fbb', grout: '#3d5c78', side: '#305576', sideTop: '#1a3249',
    front: '#2f5779', frontTop: '#93bfdf', accent: '#8ff3ff', puddle: '#c4f7ff', dot: '#e4fdff', door: '#8094a8',
  },
  { // 4 crimson lab
    wallA: '#5e2433', wallB: '#501d2b', mortar: '#2b0c14', style: 'brick', trim: '#86384a', base: '#290b13',
    floorA: '#482832', floorB: '#57323d', grout: '#28121a', side: '#451b26', sideTop: '#22090f',
    front: '#461f2a', frontTop: '#753746', accent: '#ff5a5a', puddle: '#e8344f', dot: '#ffa0a0', door: '#7a6468',
  },
];

// ---- floor projection helpers ------------------------------------------------
function fxp(u, v) { const xl = F.x0 - FLARE * v, xr = F.x1 + FLARE * v; return xl + (xr - xl) * u; }
function fyp(v) { return F.y0 + (F.y1 - F.y0) * v; }

// ---- cache --------------------------------------------------------------------
const cache = new Map();

function getCache(room, scale) {
  const theme = ((room.theme | 0) % THEMES.length + THEMES.length) % THEMES.length;
  const decor = room.wallDecor || [];
  let key = theme + '|' + scale + '|';
  for (let i = 0; i < decor.length; i++) key += decor[i].type + '@' + Math.round(decor[i].x) + ',';
  let entry = cache.get(key);
  if (entry) return entry;
  const cv = document.createElement('canvas');
  cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
  const c = cv.getContext('2d');
  c.scale(scale, scale);
  c.lineJoin = 'round'; c.lineCap = 'round';
  const th = THEMES[theme];
  const anim = buildStatic(c, th, theme, decor);
  entry = { canvas: cv, th, anim, decor };
  cache.set(key, entry);
  if (cache.size > 3) cache.delete(cache.keys().next().value);
  return entry;
}

function buildStatic(c, th, theme, decor) {
  const seed = theme * 101 + 7;
  // base
  c.fillStyle = th.sideTop; c.fillRect(0, 0, W, H);
  drawBackWall(c, th, theme, seed);
  drawSideWalls(c, th);
  const dots = drawFloor(c, th, theme, seed);
  drawFrontWall(c, th);
  drawCobwebs(c);
  drawDoorFrame(c, th);
  const animDecor = [];
  for (const d of decor) {
    const fn = DECOR_STATIC[d.type];
    if (fn) fn(c, d.x, th, theme);
    if (DECOR_ANIM[d.type]) animDecor.push(d);
  }
  return { dots, animDecor };
}

// ---- back wall -----------------------------------------------------------------
function drawBackWall(c, th, theme, seed) {
  const x0 = F.x0, x1 = F.x1;
  c.save();
  c.beginPath(); c.rect(x0, WALL_TOP, x1 - x0, WALL_BOT - WALL_TOP); c.clip();
  c.fillStyle = th.wallA; c.fillRect(x0, 0, x1 - x0, WALL_BOT);
  if (th.style === 'brick') {
    const bh = 18, bw = 44;
    for (let row = 0, y = 10; y < WALL_BOT; row++, y += bh) {
      const off = row % 2 ? bw / 2 : 0;
      for (let x = x0 - off, i = 0; x < x1; x += bw, i++) {
        const h = hash(seed + row * 31 + i * 7.7);
        c.fillStyle = mix(th.wallA, th.wallB, h);
        c.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
        c.fillStyle = 'rgba(255,255,255,0.07)';
        c.fillRect(x + 1.5, y + 1.5, bw - 3, 3);
        if (h > 0.85) { // chipped brick
          c.fillStyle = th.mortar; c.beginPath(); c.arc(x + bw * 0.7, y + 6, 3, 0, TAU); c.fill();
        }
      }
      c.fillStyle = th.mortar; c.fillRect(x0, y - 1.5, x1 - x0, 3);
    }
    c.fillStyle = th.mortar;
    for (let row = 0, y = 10; y < WALL_BOT; row++, y += bh) {
      const off = row % 2 ? bw / 2 : 0;
      for (let x = x0 - off; x < x1; x += bw) c.fillRect(x - 1.5, y, 3, bh);
    }
  } else if (th.style === 'panel') {
    const pw = 112, ph = 64;
    for (let row = 0, y = 12; y < WALL_BOT; row++, y += ph) {
      for (let x = x0, i = 0; x < x1; x += pw, i++) {
        const h = hash(seed + row * 13 + i * 3.1);
        c.fillStyle = mix(th.wallA, th.wallB, h * 0.8);
        c.fillRect(x + 3, y + 3, pw - 6, ph - 6);
        c.fillStyle = 'rgba(255,255,255,0.09)'; c.fillRect(x + 3, y + 3, pw - 6, 3); c.fillRect(x + 3, y + 3, 3, ph - 6);
        c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x + 3, y + ph - 6, pw - 6, 3); c.fillRect(x + pw - 6, y + 3, 3, ph - 6);
        // inset diamond ornament
        c.strokeStyle = 'rgba(255,255,255,0.07)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x + pw / 2, y + 14); c.lineTo(x + pw / 2 + 16, y + ph / 2); c.lineTo(x + pw / 2, y + ph - 14); c.lineTo(x + pw / 2 - 16, y + ph / 2); c.closePath(); c.stroke();
        c.fillStyle = th.mortar;
        for (const [rx, ry] of [[x + 9, y + 9], [x + pw - 9, y + 9], [x + 9, y + ph - 9], [x + pw - 9, y + ph - 9]]) { c.beginPath(); c.arc(rx, ry, 2, 0, TAU); c.fill(); }
      }
    }
  } else if (th.style === 'plank') {
    const ph = 20;
    for (let row = 0, y = 10; y < WALL_BOT; row++, y += ph) {
      let x = x0 - hash(seed + row) * 120;
      let i = 0;
      while (x < x1) {
        const len = 110 + hash(seed + row * 9 + i) * 120;
        const h = hash(seed + row * 17 + i * 5.3);
        c.fillStyle = mix(th.wallA, th.wallB, h);
        c.fillRect(x + 1, y + 1, len - 2, ph - 2);
        c.strokeStyle = 'rgba(0,0,0,0.13)'; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(x + 6, y + 7 + h * 4); c.bezierCurveTo(x + len * 0.3, y + 4, x + len * 0.6, y + 13, x + len - 6, y + 8); c.stroke();
        c.fillStyle = th.mortar;
        c.fillRect(x - 1, y, 2, ph);
        c.beginPath(); c.arc(x + 6, y + ph / 2, 1.6, 0, TAU); c.arc(x + len - 6, y + ph / 2, 1.6, 0, TAU); c.fill();
        x += len; i++;
      }
      c.fillStyle = th.mortar; c.fillRect(x0, y - 1, x1 - x0, 2);
      c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(x0, y + 1, x1 - x0, 2);
    }
  } else { // metal cryo panels
    const pw = 128, ph = 76;
    for (let row = 0, y = 10; y < WALL_BOT; row++, y += ph) {
      for (let x = x0 - (row % 2) * 64, i = 0; x < x1; x += pw, i++) {
        const h = hash(seed + row * 11 + i * 2.3);
        const g = c.createLinearGradient(x, y, x + pw, y + ph);
        g.addColorStop(0, mix(th.wallA, '#ffffff', 0.08 + h * 0.05));
        g.addColorStop(1, th.wallB);
        c.fillStyle = g; c.fillRect(x + 2, y + 2, pw - 4, ph - 4);
        c.fillStyle = th.mortar;
        for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + 8 + (k % 2) * (pw - 16), y + 8 + (k >> 1) * (ph - 16), 2.2, 0, TAU); c.fill(); }
        c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x + 20, y + 24); c.lineTo(x + pw - 20, y + 24); c.moveTo(x + 20, y + 32); c.lineTo(x + pw - 40, y + 32); c.stroke();
      }
      c.fillStyle = th.mortar; c.fillRect(x0, y - 1.5, x1 - x0, 3);
    }
    // frost creeping up the bottom
    const g = c.createLinearGradient(0, WALL_BOT - 40, 0, WALL_BOT);
    g.addColorStop(0, 'rgba(220,250,255,0)'); g.addColorStop(1, 'rgba(220,250,255,0.35)');
    c.fillStyle = g; c.fillRect(x0, WALL_BOT - 40, x1 - x0, 40);
    c.fillStyle = 'rgba(235,252,255,0.55)';
    for (let i = 0; i < 40; i++) {
      const fx = x0 + hash(seed + i * 4.1) * (x1 - x0), r = 3 + hash(seed + i * 2.9) * 8;
      c.beginPath(); c.arc(fx, WALL_BOT - 12 + hash(i + 3.3) * 6, r, Math.PI, 0); c.fill();
    }
  }
  // lighting: darker at the top, soft light pools
  let g = c.createLinearGradient(0, 0, 0, WALL_BOT);
  g.addColorStop(0, 'rgba(0,0,0,0.38)'); g.addColorStop(0.5, 'rgba(0,0,0,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0.12)');
  c.fillStyle = g; c.fillRect(x0, 0, x1 - x0, WALL_BOT);
  for (const lx of [x0 + (x1 - x0) * 0.22, x0 + (x1 - x0) * 0.78]) {
    g = c.createRadialGradient(lx, 30, 0, lx, 60, 170);
    g.addColorStop(0, rgba(th.accent, 0.13)); g.addColorStop(1, rgba(th.accent, 0));
    c.fillStyle = g; c.fillRect(lx - 180, 0, 360, WALL_BOT);
  }
  // corner shading
  g = c.createLinearGradient(x0, 0, x0 + 70, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(x0, 0, 70, WALL_BOT);
  g = c.createLinearGradient(x1, 0, x1 - 70, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(x1 - 70, 0, 70, WALL_BOT);
  c.restore();
  // top trim
  c.fillStyle = th.trim; c.fillRect(x0, 0, x1 - x0, 10);
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x0, 8, x1 - x0, 3);
  // baseboard
  c.fillStyle = th.base; c.fillRect(x0, WALL_BOT - 14, x1 - x0, 14);
  c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(x0, WALL_BOT - 14, x1 - x0, 2);
  c.fillStyle = OUT; c.fillRect(x0, WALL_BOT - 15.5, x1 - x0, 1.5);
  // corner lines
  c.strokeStyle = OUT; c.lineWidth = 2;
  c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0, WALL_BOT); c.moveTo(x1, 0); c.lineTo(x1, WALL_BOT); c.stroke();
}

// ---- side walls --------------------------------------------------------------
function drawSideWalls(c, th) {
  for (const out of [-1, 1]) {                         // outward direction: left -1, right +1
    const xi0 = out < 0 ? F.x0 : F.x1;                 // floor edge at the back (y=160)
    const xi1 = xi0 + out * FLARE;                     // floor edge at the front (y=608)
    const xo = out < 0 ? 0 : W;
    const edgeX = (y) => xi0 + out * FLARE * Math.max(0, (y - WALL_BOT) / (F.y1 - WALL_BOT));
    const face = () => {
      c.beginPath();
      c.moveTo(xi0, 0); c.lineTo(xi0, WALL_BOT); c.lineTo(xi1, F.y1); c.lineTo(xi1, H); c.lineTo(xo, H); c.lineTo(xo, 0); c.closePath();
    };
    face();
    const g = c.createLinearGradient(xi0, 0, xo, 0);
    g.addColorStop(0, mix(th.side, '#ffffff', 0.1)); g.addColorStop(0.7, th.side); g.addColorStop(1, th.sideTop);
    c.fillStyle = g; c.fill();
    c.save(); face(); c.clip();
    // brick courses: bands parallel to the floor edge
    const bw = 15;
    for (let k = 0; k < 5; k++) {
      // staggered joints inside the band
      c.strokeStyle = 'rgba(0,0,0,0.32)'; c.lineWidth = 2;
      for (let y = (k % 2) * 13 + 4; y < H; y += 26) {
        const xe = edgeX(y) + out * k * bw;
        c.beginPath(); c.moveTo(xe, y); c.lineTo(xe + out * bw, y + 5); c.stroke();
      }
      const off = out * (k + 1) * bw;
      c.strokeStyle = 'rgba(0,0,0,0.38)'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(xi0 + off, 0); c.lineTo(xi0 + off, WALL_BOT); c.lineTo(xi1 + off, H); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(xi0 + off - out * 2.5, 0); c.lineTo(xi0 + off - out * 2.5, WALL_BOT); c.lineTo(xi1 + off - out * 2.5, H); c.stroke();
    }
    // baseboard strip along the floor edge
    c.fillStyle = th.base;
    c.beginPath(); c.moveTo(xi0, WALL_BOT - 14); c.lineTo(xi0, WALL_BOT); c.lineTo(xi1, F.y1); c.lineTo(xi1, H); c.lineTo(xi1 + out * 9, H); c.lineTo(xi1 + out * 9, F.y1 - 6); c.lineTo(xi0 + out * 9, WALL_BOT - 20); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.1)';
    c.beginPath(); c.moveTo(xi0 + out * 9, WALL_BOT - 20); c.lineTo(xi1 + out * 9, F.y1 - 6); c.lineTo(xi1 + out * 11, F.y1 - 6); c.lineTo(xi0 + out * 11, WALL_BOT - 20); c.closePath(); c.fill();
    // light falloff: darker towards the viewer and the outer edge
    const vg = c.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, 'rgba(0,0,0,0.05)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    c.restore();
    // top cap (wall thickness) at the screen edge
    c.fillStyle = th.sideTop;
    c.beginPath();
    c.moveTo(xo, 0); c.lineTo(xo - out * 14, 0); c.lineTo(xo - out * 5, H); c.lineTo(xo, H); c.closePath(); c.fill();
    c.strokeStyle = OUT; c.lineWidth = 2;
    c.beginPath(); c.moveTo(xo - out * 14, 0); c.lineTo(xo - out * 5, H); c.stroke();
    // corner + floor edge lines
    c.beginPath(); c.moveTo(xi0, 0); c.lineTo(xi0, WALL_BOT); c.lineTo(xi1, F.y1); c.stroke();
  }
}

// ---- floor -----------------------------------------------------------------
function drawFloor(c, th, theme, seed) {
  const cols = Math.round((F.x1 - F.x0) / WORLD.TILE), rows = Math.round((F.y1 - F.y0) / WORLD.TILE);
  c.save();
  c.beginPath();
  c.moveTo(fxp(0, 0), fyp(0)); c.lineTo(fxp(1, 0), fyp(0)); c.lineTo(fxp(1, 1), fyp(1)); c.lineTo(fxp(0, 1), fyp(1)); c.closePath();
  c.clip();
  c.fillStyle = th.grout; c.fillRect(0, F.y0, W, F.y1 - F.y0);
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < cols; q++) {
      const u0 = q / cols, u1 = (q + 1) / cols, v0 = r / rows, v1 = (r + 1) / rows;
      const h = hash(seed + r * 37.3 + q * 5.7);
      const base = (r + q) % 2 ? th.floorA : th.floorB;
      const col = mix(base, h > 0.5 ? '#ffffff' : '#000000', Math.abs(h - 0.5) * 0.12);
      const g = 2;
      const ax = fxp(u0, v0) + g, ay = fyp(v0) + g, bx = fxp(u1, v0) - g, cx = fxp(u1, v1) - g, cy = fyp(v1) - g, dx = fxp(u0, v1) + g;
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, ay); c.lineTo(cx, cy); c.lineTo(dx, cy); c.closePath();
      c.fillStyle = col; c.fill();
      // bevel: light top edge, dark bottom edge
      c.fillStyle = 'rgba(255,255,255,0.08)';
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, ay); c.lineTo(bx, ay + 4); c.lineTo(ax, ay + 4); c.closePath(); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.16)';
      c.beginPath(); c.moveTo(dx, cy - 5); c.lineTo(cx, cy - 5); c.lineTo(cx, cy); c.lineTo(dx, cy); c.closePath(); c.fill();
      // stone speckles
      c.fillStyle = 'rgba(0,0,0,0.12)';
      for (let k = 0; k < 3; k++) {
        const sx = ax + 8 + hash(h * 99 + k) * (bx - ax - 16), sy = ay + 8 + hash(h * 77 + k * 3) * (cy - ay - 16);
        c.beginPath(); c.arc(sx, sy, 1 + hash(h * 13 + k), 0, TAU); c.fill();
      }
      if (theme === 2 && h > 0.6) { // wood-grain-ish streaks in storage room
        c.strokeStyle = 'rgba(0,0,0,0.1)'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(ax + 6, ay + 20 + h * 20); c.quadraticCurveTo((ax + bx) / 2, ay + 10 + h * 30, bx - 6, ay + 24 + h * 14); c.stroke();
      }
    }
  }
  // cracks
  c.strokeStyle = 'rgba(10,0,20,0.45)'; c.lineWidth = 1.6;
  for (let i = 0; i < 11; i++) {
    let x = F.x0 + 40 + hash(seed + i * 3.3) * (F.x1 - F.x0 - 80), y = F.y0 + 30 + hash(seed + i * 5.1) * (F.y1 - F.y0 - 60);
    c.beginPath(); c.moveTo(x, y);
    const n = 3 + Math.floor(hash(seed + i) * 3);
    for (let k = 0; k < n; k++) {
      x += (hash(seed + i * 9 + k) - 0.3) * 18; y += (hash(seed + i * 7 + k * 2) - 0.5) * 12;
      c.lineTo(x, y);
      if (k === 1) { c.moveTo(x, y); c.lineTo(x + 6, y + 7); c.moveTo(x, y); }
    }
    c.stroke();
  }
  // slime / liquid puddles
  for (let i = 0; i < 5; i++) {
    const px = F.x0 + 70 + hash(seed + i * 11.1) * (F.x1 - F.x0 - 140), py = F.y0 + 60 + hash(seed + i * 13.7) * (F.y1 - F.y0 - 110);
    const rx = 16 + hash(seed + i * 2.2) * 22, ry = rx * 0.42;
    // smooth blob through 8 jittered points
    c.beginPath();
    const N = 8, P = [];
    for (let k = 0; k < N; k++) {
      const a = (k / N) * TAU, r2 = 0.8 + hash(seed + i * 5 + k) * 0.4;
      P.push(px + Math.cos(a) * rx * r2, py + Math.sin(a) * ry * r2);
    }
    c.moveTo((P[0] + P[2]) / 2, (P[1] + P[3]) / 2);
    for (let k = 1; k <= N; k++) {
      const j = (k % N) * 2, n2 = ((k + 1) % N) * 2;
      c.quadraticCurveTo(P[j], P[j + 1], (P[j] + P[n2]) / 2, (P[j + 1] + P[n2 + 1]) / 2);
    }
    c.closePath();
    c.fillStyle = rgba(th.puddle, 0.45); c.fill();
    c.strokeStyle = rgba(th.puddle, 0.75); c.lineWidth = 1.5; c.stroke();
    c.fillStyle = rgba(th.puddle, 0.35);
    ell(c, px + 2, py + 1, rx * 0.55, ry * 0.5); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    ell(c, px - rx * 0.35, py - ry * 0.3, rx * 0.22, ry * 0.2); c.fill();
    c.fillStyle = rgba(th.puddle, 0.55);
    for (let k = 0; k < 3; k++) {
      const a = hash(seed + i * 3 + k * 7) * TAU;
      circ(c, px + Math.cos(a) * (rx + 7 + k * 3), py + Math.sin(a) * (ry + 5 + k * 2), 1.6 + hash(k + i) * 1.6); c.fill();
    }
  }
  if (theme === 3) { // frost patches
    for (let i = 0; i < 8; i++) {
      const px = F.x0 + hash(seed + i * 8.8) * (F.x1 - F.x0), py = F.y0 + hash(seed + i * 6.6) * (F.y1 - F.y0);
      const g = c.createRadialGradient(px, py, 0, px, py, 50);
      g.addColorStop(0, 'rgba(240,253,255,0.35)'); g.addColorStop(1, 'rgba(240,253,255,0)');
      c.fillStyle = g; ell(c, px, py, 60, 26); c.fill();
    }
  }
  if (theme === 2) { // pumpkin seeds and straw
    for (let i = 0; i < 30; i++) {
      const px = F.x0 + hash(seed + i * 4.4) * (F.x1 - F.x0), py = F.y0 + 10 + hash(seed + i * 9.2) * (F.y1 - F.y0 - 20);
      if (i % 2) { c.fillStyle = '#f2e3b3'; ell(c, px, py, 2.6, 1.6, hash(i) * 3); c.fill(); }
      else { c.strokeStyle = 'rgba(240,200,90,0.55)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(px, py); c.lineTo(px + 10 * (hash(i + 1) - 0.5), py + 4 * (hash(i + 2) - 0.5)); c.stroke(); }
    }
  }
  // glowing dots (base, animated glow on top)
  const dots = [];
  for (let i = 0; i < 16; i++) {
    const px = F.x0 + 30 + hash(seed + i * 21.3) * (F.x1 - F.x0 - 60), py = F.y0 + 20 + hash(seed + i * 17.9) * (F.y1 - F.y0 - 40);
    dots.push({ x: px, y: py, ph: hash(seed + i) * TAU, s: 1 + hash(seed + i * 1.7) * 1.4 });
    c.fillStyle = rgba(th.dot, 0.35); c.beginPath(); c.arc(px, py, 1.6, 0, TAU); c.fill();
  }
  // lighting: dark band under the back wall, vignette at the sides/front
  let g = c.createLinearGradient(0, F.y0, 0, F.y0 + 60);
  g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, F.y0, W, 60);
  g = c.createRadialGradient(W / 2, 380, 120, W / 2, 380, 620);
  g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
  c.fillStyle = g; c.fillRect(0, F.y0, W, F.y1 - F.y0);
  c.restore();
  return dots;
}

function drawFrontWall(c, th) {
  const y0 = F.y1;
  c.fillStyle = th.front; c.fillRect(0, y0, W, H - y0);
  // hazard stripes on the face
  c.save();
  c.beginPath(); c.rect(0, y0 + 10, W, H - y0 - 10); c.clip();
  c.fillStyle = 'rgba(255,205,60,0.16)';
  for (let x = -40; x < W + 40; x += 36) {
    c.beginPath(); c.moveTo(x, H); c.lineTo(x + 18, H); c.lineTo(x + 40, y0 + 10); c.lineTo(x + 22, y0 + 10); c.closePath(); c.fill();
  }
  c.restore();
  // top cap
  c.fillStyle = th.frontTop; c.fillRect(0, y0, W, 10);
  c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(0, y0, W, 2);
  c.strokeStyle = OUT; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, y0); c.lineTo(W, y0); c.moveTo(0, y0 + 10); c.lineTo(W, y0 + 10); c.stroke();
  c.fillStyle = 'rgba(0,0,0,0.35)';
  for (let x = 40; x < W; x += 96) { c.beginPath(); c.arc(x, y0 + 21, 2.5, 0, TAU); c.fill(); }
}

function drawCobwebs(c) {
  c.strokeStyle = 'rgba(235,235,255,0.35)'; c.lineWidth = 1;
  for (const [cx, sx] of [[F.x0, 1], [F.x1, -1]]) {
    const cy = 10;
    for (let k = 0; k < 5; k++) {
      const a = (k / 4) * (Math.PI / 2);
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + sx * Math.cos(a) * 52, cy + Math.sin(a) * 52); c.stroke();
    }
    for (let r = 12; r <= 48; r += 12) {
      c.beginPath();
      for (let k = 0; k <= 4; k++) {
        const a = (k / 4) * (Math.PI / 2), X = cx + sx * Math.cos(a) * r, Y = cy + Math.sin(a) * r;
        if (k === 0) c.moveTo(X, Y);
        else {
          const am = ((k - 0.5) / 4) * (Math.PI / 2);
          c.quadraticCurveTo(cx + sx * Math.cos(am) * r * 0.82, cy + Math.sin(am) * r * 0.82, X, Y);
        }
      }
      c.stroke();
    }
  }
  // a tiny friendly spider dangling on the left
  c.strokeStyle = 'rgba(235,235,255,0.5)';
  c.beginPath(); c.moveTo(F.x0 + 34, 30); c.lineTo(F.x0 + 34, 58); c.stroke();
  c.fillStyle = '#231a30'; c.beginPath(); c.arc(F.x0 + 34, 62, 5, 0, TAU); c.fill();
  c.strokeStyle = '#231a30'; c.lineWidth = 1.4;
  for (let k = 0; k < 3; k++) {
    c.beginPath(); c.moveTo(F.x0 + 30, 61 + k * 2); c.lineTo(F.x0 + 25, 58 + k * 4);
    c.moveTo(F.x0 + 38, 61 + k * 2); c.lineTo(F.x0 + 43, 58 + k * 4); c.stroke();
  }
  c.fillStyle = '#fff'; c.fillRect(F.x0 + 32, 61, 1.6, 1.6); c.fillRect(F.x0 + 35, 61, 1.6, 1.6);
}

// ---- door ----------------------------------------------------------------------
function drawDoorFrame(c, th) {
  // frame
  rr(c, DOOR_X0 - 12, DOOR_TOP - 12, D.w + 24, WALL_BOT - DOOR_TOP + 12, 6);
  c.fillStyle = mix(th.trim, '#000000', 0.15); c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.5; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(DOOR_X0 - 9, DOOR_TOP - 9, D.w + 18, 3);
  // bolts on the frame
  c.fillStyle = OUT;
  for (let y = DOOR_TOP; y < WALL_BOT - 6; y += 22) {
    c.beginPath(); c.arc(DOOR_X0 - 6, y + 4, 1.8, 0, TAU); c.arc(DOOR_X1 + 6, y + 4, 1.8, 0, TAU); c.fill();
  }
  // lamp housing above door
  rr(c, D.x - 11, 14, 22, 16, 5); c.fillStyle = '#3a3a48'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
}

function drawDoor(ctx, th, open, t) {
  const x0 = DOOR_X0, y0 = DOOR_TOP, w = D.w, h = WALL_BOT - DOOR_TOP;
  if (!open) {
    rr(ctx, x0, y0, w, h + 2, 4);
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, mix(th.door, '#ffffff', 0.15)); g.addColorStop(0.5, th.door); g.addColorStop(1, mix(th.door, '#000000', 0.25));
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
    // center seam (double door)
    ctx.strokeStyle = OUT; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(D.x, y0 + 2); ctx.lineTo(D.x, WALL_BOT); ctx.stroke();
    // hazard band
    ctx.save(); ctx.beginPath(); ctx.rect(x0 + 2, WALL_BOT - 26, w - 4, 16); ctx.clip();
    ctx.fillStyle = '#f6c53a'; ctx.fillRect(x0, WALL_BOT - 26, w, 16);
    ctx.fillStyle = '#2a2230';
    for (let x = x0 - 20; x < x0 + w + 20; x += 16) { ctx.beginPath(); ctx.moveTo(x, WALL_BOT - 10); ctx.lineTo(x + 8, WALL_BOT - 10); ctx.lineTo(x + 16, WALL_BOT - 26); ctx.lineTo(x + 8, WALL_BOT - 26); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.strokeRect(x0 + 2, WALL_BOT - 26, w - 4, 16);
    // portholes
    for (const px of [D.x - 22, D.x + 22]) {
      circ(ctx, px, y0 + 30, 11); ctx.fillStyle = '#4d5562'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
      circ(ctx, px, y0 + 30, 7.5);
      const gg = ctx.createRadialGradient(px, y0 + 30, 1, px, y0 + 30, 8);
      gg.addColorStop(0, rgba(th.accent, 0.8)); gg.addColorStop(1, '#14201a');
      ctx.fillStyle = gg; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, y0 + 30, 5, -2.6, -1.6); ctx.stroke();
    }
    // handles
    ctx.fillStyle = '#cfd5dc';
    rr(ctx, D.x - 9, y0 + 56, 5, 18, 2); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.stroke();
    rr(ctx, D.x + 4, y0 + 56, 5, 18, 2); ctx.fill(); ctx.stroke();
    // rivets
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let y = y0 + 8; y < WALL_BOT - 30; y += 14) {
      ctx.beginPath(); ctx.arc(x0 + 6, y, 1.6, 0, TAU); ctx.arc(x0 + w - 6, y, 1.6, 0, TAU); ctx.fill();
    }
    // red light (blinking)
    const blink = 0.55 + 0.45 * (Math.sin(t * 4) > 0 ? 1 : 0.25);
    const rg = ctx.createRadialGradient(D.x, 22, 0, D.x, 22, 26);
    rg.addColorStop(0, `rgba(255,60,60,${0.55 * blink})`); rg.addColorStop(1, 'rgba(255,60,60,0)');
    ctx.fillStyle = rg; ctx.fillRect(D.x - 26, 0, 52, 48);
    circ(ctx, D.x, 22, 5.5); ctx.fillStyle = blink > 0.8 ? '#ff4a4a' : '#a02a30'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(D.x - 1.8, 20.5, 1.4, 0, TAU); ctx.fill();
  } else {
    // dark doorway with green glow
    rr(ctx, x0, y0, w, h + 2, 4);
    const g = ctx.createLinearGradient(0, y0, 0, WALL_BOT);
    g.addColorStop(0, '#07110b'); g.addColorStop(1, '#173a22');
    ctx.fillStyle = g; ctx.fill();
    const pulse = 0.75 + 0.25 * Math.sin(t * 3);
    const rg = ctx.createRadialGradient(D.x, WALL_BOT - 20, 4, D.x, WALL_BOT - 30, 90);
    rg.addColorStop(0, `rgba(150,255,120,${0.75 * pulse})`); rg.addColorStop(0.5, `rgba(90,220,90,${0.3 * pulse})`); rg.addColorStop(1, 'rgba(60,200,80,0)');
    ctx.fillStyle = rg; ctx.fill();
    // corridor floor lines (perspective into the dark)
    ctx.strokeStyle = 'rgba(160,255,140,0.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = -2; k <= 2; k++) { ctx.moveTo(D.x + k * 22, WALL_BOT); ctx.lineTo(D.x + k * 7, WALL_BOT - 34); }
    ctx.moveTo(x0 + 14, WALL_BOT - 12); ctx.lineTo(x0 + w - 14, WALL_BOT - 12);
    ctx.moveTo(x0 + 24, WALL_BOT - 24); ctx.lineTo(x0 + w - 24, WALL_BOT - 24);
    ctx.stroke();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; rr(ctx, x0, y0, w, h + 2, 4); ctx.stroke();
    // open door leaves folded to the sides
    for (const s of [-1, 1]) {
      const ex = s < 0 ? x0 : x0 + w;
      poly(ctx, [ex, y0, ex + s * -10, y0 + 6, ex + s * -10, WALL_BOT - 4, ex, WALL_BOT]);
      ctx.fillStyle = th.door; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
    }
    // light spilling onto the floor
    const lg = ctx.createLinearGradient(0, WALL_BOT, 0, WALL_BOT + 110);
    lg.addColorStop(0, `rgba(140,255,120,${0.32 * pulse})`); lg.addColorStop(1, 'rgba(140,255,120,0)');
    ctx.fillStyle = lg;
    poly(ctx, [x0 + 6, WALL_BOT, x0 + w - 6, WALL_BOT, x0 + w + 34, WALL_BOT + 110, x0 - 34, WALL_BOT + 110]);
    ctx.fill();
    // sparkles drifting up out of the doorway
    for (let i = 0; i < 7; i++) {
      const ph = (t * 0.45 + hash(i * 3.7)) % 1;
      const sx = x0 + 12 + hash(i * 5.1) * (w - 24) + Math.sin(t * 2 + i) * 4;
      const sy = WALL_BOT - 4 - ph * (h - 14);
      const a = Math.sin(ph * Math.PI);
      sparkle(ctx, sx, sy, 2 + 3 * a, `rgba(220,255,200,${0.85 * a})`);
    }
    // bouncing arrow on the floor pointing into the door
    const bob = Math.sin(t * 5) * 6;
    const ay = WALL_BOT + 38 + bob;
    ctx.save();
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(t * 5 + 1);
    ctx.beginPath();
    ctx.moveTo(D.x, ay - 20); ctx.lineTo(D.x + 20, ay); ctx.lineTo(D.x + 9, ay); ctx.lineTo(D.x + 9, ay + 14);
    ctx.lineTo(D.x - 9, ay + 14); ctx.lineTo(D.x - 9, ay); ctx.lineTo(D.x - 20, ay); ctx.closePath();
    ctx.fillStyle = '#9dff6e'; ctx.fill(); ctx.strokeStyle = '#1d4a22'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
    // green lamp
    const lg2 = ctx.createRadialGradient(D.x, 22, 0, D.x, 22, 28);
    lg2.addColorStop(0, `rgba(120,255,120,${0.6 * pulse})`); lg2.addColorStop(1, 'rgba(120,255,120,0)');
    ctx.fillStyle = lg2; ctx.fillRect(D.x - 28, 0, 56, 50);
    circ(ctx, D.x, 22, 5.5); ctx.fillStyle = '#6dff6d'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.stroke();
  }
}

// ---- wall decor (static part) ------------------------------------------------
const DECOR_STATIC = {
  shelf(c, x, th) {
    const y = 84;
    // brackets
    c.fillStyle = '#4a3428';
    for (const bx of [x - 36, x + 36]) { poly(c, [bx - 3, y + 6, bx + 3, y + 6, bx + 3, y + 22, bx - 3, y + 10]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.5; c.stroke(); }
    // items
    // round flask
    c.strokeStyle = OUT; c.lineWidth = 2;
    rr(c, x - 39, y - 32, 7, 12, 2); c.fillStyle = '#cfe8f0'; c.fill(); c.stroke();
    circ(c, x - 35.5, y - 11, 11); c.fillStyle = 'rgba(210,240,255,0.5)'; c.fill(); c.stroke();
    c.save(); circ(c, x - 35.5, y - 11, 10); c.clip();
    c.fillStyle = th.accent; c.fillRect(x - 47, y - 13, 24, 14);
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(x - 47, y - 13, 24, 2.5);
    c.restore();
    circ(c, x - 35.5, y - 11, 11); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.7)'; ell(c, x - 40, y - 15, 2, 3.2, 0.5); c.fill();
    // tall bottle with cork
    rr(c, x - 19, y - 30, 12, 30, 3); c.fillStyle = '#7e3cc9'; c.fill(); c.stroke();
    rr(c, x - 16, y - 37, 6, 8, 2); c.fillStyle = '#c99a62'; c.fill(); c.stroke();
    rr(c, x - 18, y - 22, 10, 9, 1); c.fillStyle = '#f3ead2'; c.fill(); c.lineWidth = 1; c.stroke(); c.lineWidth = 2;
    c.fillStyle = OUT; c.beginPath(); c.arc(x - 13, y - 18, 1.6, 0, TAU); c.fill();
    // jar with a floating eyeball
    rr(c, x - 3, y - 24, 18, 24, 4); c.fillStyle = 'rgba(160,255,200,0.55)'; c.fill(); c.stroke();
    rr(c, x - 4, y - 28, 20, 5, 2); c.fillStyle = '#7c6a5c'; c.fill(); c.stroke();
    circ(c, x + 6, y - 12, 5); c.fillStyle = '#ffffff'; c.fill(); c.lineWidth = 1.5; c.stroke();
    circ(c, x + 7.5, y - 12, 2.2); c.fillStyle = '#3a8ad8'; c.fill();
    circ(c, x + 8, y - 12, 1); c.fillStyle = OUT; c.fill();
    // books
    const bc = ['#d24a4a', '#e6b13a', '#3f8ad0'];
    for (let i = 0; i < 3; i++) {
      rr(c, x + 20 + i * 7, y - 22 + (i === 1 ? 4 : 0), 7, 22 - (i === 1 ? 4 : 0), 1.5);
      c.fillStyle = bc[i]; c.fill(); c.lineWidth = 1.6; c.stroke();
    }
    // plank (in front of the item bottoms)
    rr(c, x - 50, y, 100, 8, 2); c.fillStyle = '#8a5a3a'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(x - 48, y + 1.5, 96, 2);
  },
  window(c, x, th, theme) {
    const x0 = x - 34, x1 = x + 34, y0 = 26, y1 = 104;
    const path = () => { c.beginPath(); c.moveTo(x0, y1); c.lineTo(x0, y0 + 34); c.arc(x, y0 + 34, 34, Math.PI, 0); c.lineTo(x1, y1); c.closePath(); };
    // frame
    c.save(); c.translate(0, 0);
    c.beginPath(); c.moveTo(x0 - 7, y1 + 4); c.lineTo(x0 - 7, y0 + 34); c.arc(x, y0 + 34, 41, Math.PI, 0); c.lineTo(x1 + 7, y1 + 4); c.closePath();
    c.fillStyle = '#4b3a34'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.5; c.stroke();
    path();
    const g = c.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#0b1230'); g.addColorStop(1, '#2d3478');
    c.fillStyle = g; c.fill();
    c.save(); path(); c.clip();
    // stars
    c.fillStyle = '#fff8d0';
    for (let i = 0; i < 12; i++) { c.globalAlpha = 0.5 + hash(i * 3.1 + x) * 0.5; c.fillRect(x0 + hash(i * 7.3 + x) * 68, y0 + hash(i * 1.9 + x) * 60, 1.6, 1.6); }
    c.globalAlpha = 1;
    // moon
    const mg = c.createRadialGradient(x + 12, y0 + 26, 4, x + 12, y0 + 26, 30);
    mg.addColorStop(0, 'rgba(255,245,200,0.5)'); mg.addColorStop(1, 'rgba(255,245,200,0)');
    c.fillStyle = mg; c.fillRect(x0, y0, 68, 70);
    circ(c, x + 12, y0 + 26, 12); c.fillStyle = '#fff2b8'; c.fill();
    c.fillStyle = 'rgba(200,180,120,0.45)';
    circ(c, x + 8, y0 + 22, 3); c.fill(); circ(c, x + 16, y0 + 31, 2.4); c.fill(); circ(c, x + 15, y0 + 20, 1.5); c.fill();
    // clouds + bat silhouette
    c.fillStyle = 'rgba(120,130,190,0.55)';
    ell(c, x - 12, y0 + 46, 18, 5); c.fill(); ell(c, x + 4, y0 + 49, 14, 4); c.fill();
    c.fillStyle = '#0a0d1e';
    c.beginPath(); const bx = x - 14, by = y0 + 24;
    c.moveTo(bx, by); c.quadraticCurveTo(bx - 5, by - 5, bx - 10, by - 2); c.quadraticCurveTo(bx - 7, by + 1, bx - 6, by + 3); c.quadraticCurveTo(bx - 3, by + 1, bx, by + 3);
    c.quadraticCurveTo(bx + 3, by + 1, bx + 6, by + 3); c.quadraticCurveTo(bx + 7, by + 1, bx + 10, by - 2); c.quadraticCurveTo(bx + 5, by - 5, bx, by); c.fill();
    // hill silhouette with a spooky tree
    c.fillStyle = '#121633';
    c.beginPath(); c.moveTo(x0, y1); c.quadraticCurveTo(x - 10, y1 - 22, x1, y1 - 8); c.lineTo(x1, y1); c.closePath(); c.fill();
    c.strokeStyle = '#121633'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(x + 18, y1 - 10); c.lineTo(x + 20, y1 - 28); c.lineTo(x + 14, y1 - 36); c.moveTo(x + 20, y1 - 26); c.lineTo(x + 27, y1 - 33); c.stroke();
    c.restore();
    // glass sheen
    c.fillStyle = 'rgba(255,255,255,0.08)';
    poly(c, [x0 + 6, y1, x0 + 22, y0 + 10, x0 + 30, y0 + 8, x0 + 14, y1]); c.fill();
    // mullions
    c.strokeStyle = '#4b3a34'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.moveTo(x0, y0 + 50); c.lineTo(x1, y0 + 50); c.stroke();
    path(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
    // sill
    rr(c, x0 - 11, y1 + 2, 90, 8, 2); c.fillStyle = '#6b5246'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
    c.restore();
  },
  poster(c, x, th) {
    const v = Math.floor(hash(x * 0.37) * 3);
    const rot = (hash(x * 0.71) - 0.5) * 0.12;
    c.save(); c.translate(x, 64); c.rotate(rot);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(-27 + 3, -36 + 4, 54, 72);
    c.fillStyle = '#f1e6c8'; c.fillRect(-27, -36, 54, 72);
    c.strokeStyle = OUT; c.lineWidth = 2; c.strokeRect(-27, -36, 54, 72);
    // header squiggle "text"
    c.strokeStyle = '#7a5a40'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-18, -28); c.lineTo(18, -28); c.moveTo(-12, -22); c.lineTo(12, -22); c.stroke();
    c.lineWidth = 2;
    if (v === 0) { // pumpkin anatomy
      ell(c, 0, 4, 15, 12); c.fillStyle = '#f08a24'; c.fill(); c.strokeStyle = OUT; c.stroke();
      c.beginPath(); c.moveTo(-5, -7); c.quadraticCurveTo(-8, 4, -5, 15); c.moveTo(5, -7); c.quadraticCurveTo(8, 4, 5, 15); c.strokeStyle = '#b8560e'; c.stroke();
      rr(c, -2, -12, 4, 6, 1); c.fillStyle = '#5a8a2a'; c.fill();
      c.strokeStyle = '#3a6ad0'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(14, -2); c.lineTo(22, -10); c.moveTo(-12, 10); c.lineTo(-22, 20); c.stroke();
      c.fillStyle = '#7a5a40'; c.fillRect(-22, 24, 20, 2); c.fillRect(4, 24, 18, 2);
    } else if (v === 1) { // bat chart
      c.fillStyle = '#3a2a52';
      c.beginPath(); c.moveTo(0, -2); c.quadraticCurveTo(-8, -12, -20, -6); c.quadraticCurveTo(-14, -1, -14, 4); c.quadraticCurveTo(-8, 1, -5, 6);
      c.quadraticCurveTo(0, 3, 5, 6); c.quadraticCurveTo(8, 1, 14, 4); c.quadraticCurveTo(14, -1, 20, -6); c.quadraticCurveTo(8, -12, 0, -2); c.fill();
      circ(c, 0, 0, 5); c.fill();
      c.fillStyle = '#ffcf3a'; c.fillRect(-2.5, -1.5, 1.6, 1.6); c.fillRect(1, -1.5, 1.6, 1.6);
      c.strokeStyle = '#d24a4a'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-20, 28); c.lineTo(-10, 18); c.lineTo(-2, 24); c.lineTo(8, 12); c.lineTo(20, 16); c.stroke();
    } else { // potion recipe
      c.beginPath(); c.moveTo(-5, -14); c.lineTo(-5, -4); c.lineTo(-14, 14); c.lineTo(14, 14); c.lineTo(5, -4); c.lineTo(5, -14); c.closePath();
      c.fillStyle = 'rgba(160,240,255,0.6)'; c.fill(); c.strokeStyle = OUT; c.stroke();
      poly(c, [-10, 6, 10, 6, 14, 14, -14, 14]); c.fillStyle = th.accent; c.fill();
      c.fillStyle = '#fff'; circ(c, -2, 2, 2); c.fill(); circ(c, 3, -2, 1.4); c.fill();
      c.fillStyle = '#7a5a40'; for (let i = 0; i < 3; i++) c.fillRect(-20, 20 + i * 5, 40 - i * 8, 2);
    }
    // tape
    c.fillStyle = 'rgba(240,240,210,0.75)';
    c.save(); c.translate(-25, -36); c.rotate(-0.7); c.fillRect(-7, -3, 14, 6); c.restore();
    c.save(); c.translate(25, -36); c.rotate(0.7); c.fillRect(-7, -3, 14, 6); c.restore();
    c.restore();
  },
  pipes(c, x, th) {
    const cols = ['#c67b3f', '#9aa6b2'];
    const px = [x - 14, x + 12];
    for (let i = 0; i < 2; i++) {
      const X = px[i], wpx = i ? 10 : 13;
      const g = c.createLinearGradient(X - wpx / 2, 0, X + wpx / 2, 0);
      g.addColorStop(0, mix(cols[i], '#ffffff', 0.35)); g.addColorStop(0.5, cols[i]); g.addColorStop(1, mix(cols[i], '#000000', 0.35));
      c.fillStyle = g; c.fillRect(X - wpx / 2, 10, wpx, WALL_BOT - 26);
      c.strokeStyle = OUT; c.lineWidth = 2; c.strokeRect(X - wpx / 2, 10, wpx, WALL_BOT - 26);
      for (const jy of [30, 92, WALL_BOT - 22]) { rr(c, X - wpx / 2 - 3, jy, wpx + 6, 7, 2); c.fillStyle = mix(cols[i], '#000000', 0.15); c.fill(); c.stroke(); }
    }
    // horizontal connector with valve
    const g = c.createLinearGradient(0, 56, 0, 66);
    g.addColorStop(0, '#e0a06a'); g.addColorStop(1, '#8a4f22');
    c.fillStyle = g; c.fillRect(x - 14, 56, 30, 10); c.strokeStyle = OUT; c.strokeRect(x - 14, 56, 30, 10);
    circ(c, x, 61, 9); c.strokeStyle = OUT; c.lineWidth = 5; c.stroke(); c.strokeStyle = '#d63c3c'; c.lineWidth = 3; c.stroke();
    c.lineWidth = 2; c.strokeStyle = '#d63c3c';
    c.beginPath(); c.moveTo(x - 9, 61); c.lineTo(x + 9, 61); c.moveTo(x, 52); c.lineTo(x, 70); c.stroke();
    circ(c, x, 61, 2.5); c.fillStyle = '#d63c3c'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.5; c.stroke();
    // gauge on the right pipe
    rr(c, x + 16, 104, 10, 4, 1); c.fillStyle = '#9aa6b2'; c.fill(); c.stroke();
    circ(c, x + 34, 106, 11); c.fillStyle = '#d9dfe6'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.5; c.stroke();
    circ(c, x + 34, 106, 8); c.fillStyle = '#fbf7ea'; c.fill();
    c.strokeStyle = '#d63c3c'; c.lineWidth = 2; c.beginPath(); c.arc(x + 34, 106, 6, -0.6, 0.2); c.stroke();
    // leak drip spot
    c.fillStyle = rgba(th.accent, 0.6); ell(c, x - 14, 112, 3, 2); c.fill();
  },
  clock(c, x) {
    const y = 64;
    // bat wings
    c.fillStyle = '#3a2a52'; c.strokeStyle = OUT; c.lineWidth = 2;
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(x + s * 18, y - 8); c.quadraticCurveTo(x + s * 36, y - 22, x + s * 46, y - 6);
      c.quadraticCurveTo(x + s * 38, y - 4, x + s * 37, y + 4); c.quadraticCurveTo(x + s * 31, y, x + s * 28, y + 6);
      c.quadraticCurveTo(x + s * 24, y + 2, x + s * 18, y + 8); c.closePath(); c.fill(); c.stroke();
    }
    circ(c, x, y, 24); c.fillStyle = '#6b3f2a'; c.fill(); c.lineWidth = 2.5; c.stroke();
    circ(c, x, y, 19); c.fillStyle = '#fbf2d6'; c.fill(); c.lineWidth = 2; c.stroke();
    c.strokeStyle = OUT;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU, r0 = i % 3 ? 15.5 : 13.5;
      c.lineWidth = i % 3 ? 1.2 : 2.2;
      c.beginPath(); c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); c.lineTo(x + Math.cos(a) * 17.5, y + Math.sin(a) * 17.5); c.stroke();
    }
    // tiny pumpkin at 12
    circ(c, x, y - 7, 3); c.fillStyle = '#f08a24'; c.fill();
  },
  skull(c, x) {
    const y = 96;
    // little shelf
    rr(c, x - 30, y, 60, 7, 2); c.fillStyle = '#6b4a36'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#4a3428'; poly(c, [x - 4, y + 7, x + 4, y + 7, x, y + 18]); c.fill(); c.stroke();
    // skull
    const sx = x - 8;
    c.beginPath(); c.arc(sx, y - 20, 15, Math.PI * 0.85, Math.PI * 0.15); c.lineTo(sx + 9, y - 2); c.lineTo(sx - 9, y - 2); c.closePath();
    c.fillStyle = '#f1ead6'; c.fill(); c.stroke();
    rr(c, sx - 9, y - 6, 18, 6, 2); c.fillStyle = '#e4dcc4'; c.fill(); c.stroke();
    c.strokeStyle = OUT; c.lineWidth = 1.2;
    c.beginPath(); for (let k = -1; k <= 1; k++) { c.moveTo(sx + k * 4.5, y - 6); c.lineTo(sx + k * 4.5, y); } c.stroke();
    c.fillStyle = '#2a1d34';
    ell(c, sx - 6, y - 19, 4.5, 5); c.fill(); ell(c, sx + 6, y - 19, 4.5, 5); c.fill();
    poly(c, [sx, y - 13, sx - 2.5, y - 9, sx + 2.5, y - 9]); c.fill();
    c.fillStyle = '#ffffff'; circ(c, sx - 5, y - 21, 1.3); c.fill(); circ(c, sx + 7, y - 21, 1.3); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)'; ell(c, sx - 7, y - 30, 4, 2, -0.4); c.fill();
    // candle
    rr(c, x + 14, y - 22, 9, 22, 2); c.fillStyle = '#f6efe0'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#f6efe0'; ell(c, x + 15, y - 14, 2, 4); c.fill();
    c.strokeStyle = OUT; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 18.5, y - 22); c.lineTo(x + 18.5, y - 26); c.stroke();
  },
};

// ---- wall decor (animated part) ----------------------------------------------
const DECOR_ANIM = {
  shelf(ctx, x, t, th) {
    const y = 84;
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.9 + i / 3) % 1;
      ctx.fillStyle = `rgba(255,255,255,${0.75 * (1 - ph)})`;
      circ(ctx, x - 35.5 + Math.sin(t * 3 + i * 2) * 3, y - 6 - ph * 30, 1.2 + ph * 1.6); ctx.fill();
    }
  },
  window(ctx, x, t) {
    for (let i = 0; i < 3; i++) {
      const a = 0.5 + 0.5 * Math.sin(t * (2 + i) + i * 2);
      sparkle(ctx, x - 22 + i * 13 + hash(i + x) * 6, 36 + hash(i * 2 + x) * 20, 1.5 + 2.2 * a, `rgba(255,250,220,${0.9 * a})`);
    }
  },
  pipes(ctx, x, t, th) {
    // needle wobble
    const a = -0.9 + Math.sin(t * 1.3) * 0.5 + Math.sin(t * 9) * 0.06;
    ctx.strokeStyle = '#d63c3c'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(x + 34, 106); ctx.lineTo(x + 34 + Math.cos(a) * 7, 106 + Math.sin(a) * 7); ctx.stroke();
    circ(ctx, x + 34, 106, 1.6); ctx.fillStyle = OUT; ctx.fill();
    // drip
    const ph = (t * 0.7) % 1;
    const dy = ph < 0.4 ? 0 : (ph - 0.4) / 0.6;
    ctx.fillStyle = rgba(th.accent, 0.9);
    ell(ctx, x - 14, 116 + dy * dy * 30, 2, 2.8); ctx.fill();
  },
  clock(ctx, x, t) {
    const y = 64, am = t * 0.6, ah = t * 0.05;
    ctx.strokeStyle = OUT; ctx.lineCap = 'round';
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(ah) * 9, y - Math.cos(ah) * 9); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(am) * 14, y - Math.cos(am) * 14); ctx.stroke();
    circ(ctx, x, y, 2.4); ctx.fillStyle = '#d63c3c'; ctx.fill();
  },
  skull(ctx, x, t) {
    const y = 96, fx = x + 18.5, fy = y - 31;
    const f = 0.8 + 0.2 * Math.sin(t * 17) * Math.sin(t * 7.3);
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 30 * f);
    g.addColorStop(0, 'rgba(255,200,90,0.35)'); g.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = g; ctx.fillRect(fx - 32, fy - 32, 64, 64);
    ctx.beginPath();
    ctx.moveTo(fx, fy - 7 * f); ctx.quadraticCurveTo(fx + 4, fy, fx, fy + 4); ctx.quadraticCurveTo(fx - 4, fy, fx, fy - 7 * f);
    ctx.fillStyle = '#ffb030'; ctx.fill();
    ell(ctx, fx, fy + 1, 1.5, 2.5); ctx.fillStyle = '#fff6c0'; ctx.fill();
  },
};

// ---- public ------------------------------------------------------------------
export function drawRoom(ctx, room, t = 0) {
  room = room || {};
  let scale = 1;
  if (ctx.getTransform) {
    const m = ctx.getTransform();
    scale = Math.min(3, Math.max(1, Math.ceil(Math.hypot(m.a, m.b) * 2) / 2));
  }
  const entry = getCache(room, scale);
  const th = entry.th;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.drawImage(entry.canvas, 0, 0, W, H);
  // animated decor
  for (const d of entry.anim.animDecor) DECOR_ANIM[d.type](ctx, d.x, t, th);
  // glowing floor dots
  for (const d of entry.anim.dots) {
    const a = 0.5 + 0.5 * Math.sin(t * 1.7 + d.ph);
    ctx.fillStyle = rgba(th.dot, 0.12 * a);
    circ(ctx, d.x, d.y, 5 * d.s); ctx.fill();
    ctx.fillStyle = rgba(th.dot, 0.35 + 0.6 * a);
    circ(ctx, d.x, d.y, 1.2 * d.s); ctx.fill();
  }
  drawDoor(ctx, th, !!room.doorOpen, t);
  // very subtle flickering ceiling light
  const fl = Math.sin(t * 23) * Math.sin(t * 3.1) * Math.sin(t * 0.7);
  if (fl > 0.6) {
    ctx.fillStyle = `rgba(0,0,10,${(fl - 0.6) * 0.12})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}
