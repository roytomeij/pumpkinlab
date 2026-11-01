// Pumpkins, obstacles and small icon glyphs.
import {
  OUT, TAU, C, setTint, hash, ell, circ, rr, poly, fs, fillOnly, starPath, sparkle, drawShadow, rgba,
} from './art-util.js';
import { drawClub } from './art-actors.js';

// ---------------------------------------------------------------------------
// Small glyphs (used in peek bubbles, pickups and icons). Centered at 0,0.
// ---------------------------------------------------------------------------
export function coinGlyph(ctx, r, spin = 1) {
  const w = Math.max(0.12, Math.abs(spin));
  const front = spin >= 0;
  // edge (thickness when turned)
  if (w < 0.98) { ell(ctx, (1 - w) * r * 0.25, 0, r * w + 1.5, r); fs(ctx, '#c9851a', 2); }
  ell(ctx, 0, 0, r * w, r); fs(ctx, front ? '#ffcf3a' : '#f2b52a', 2.2);
  ell(ctx, 0, 0, r * w * 0.72, r * 0.72); ctx.strokeStyle = C('#d9921c'); ctx.lineWidth = 1.6; ctx.stroke();
  if (w > 0.35) {
    ctx.save(); ctx.scale(w, 1);
    if (front) { starPath(ctx, 0, 0.5, r * 0.45, r * 0.2, 5); fillOnly(ctx, '#f29a1a'); }
    else { ell(ctx, 0, 0, r * 0.3, r * 0.3); fillOnly(ctx, '#e0901a'); }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ell(ctx, -r * 0.35 * w, -r * 0.45, r * 0.2 * w, r * 0.13, -0.6); ctx.fill();
  }
}

export function skullGlyph(ctx, r) {
  ctx.beginPath(); ctx.arc(0, -r * 0.15, r, Math.PI * 0.8, Math.PI * 0.2); ctx.lineTo(r * 0.55, r * 0.85); ctx.lineTo(-r * 0.55, r * 0.85); ctx.closePath();
  fs(ctx, '#f4efe2', 2);
  ctx.fillStyle = OUT;
  ell(ctx, -r * 0.38, -r * 0.1, r * 0.27, r * 0.32); ctx.fill(); ell(ctx, r * 0.38, -r * 0.1, r * 0.27, r * 0.32); ctx.fill();
  poly(ctx, [0, r * 0.25, -r * 0.12, r * 0.45, r * 0.12, r * 0.45]); ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.6); ctx.lineTo(-r * 0.2, r * 0.85); ctx.moveTo(r * 0.2, r * 0.6); ctx.lineTo(r * 0.2, r * 0.85); ctx.stroke();
}

export function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.25, y + s * 0.05, x - s * 1.0, y - s * 0.95, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 1.0, y - s * 0.95, x + s * 1.25, y + s * 0.05, x, y + s * 0.9);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Pumpkin (~50 px wide). (x,y) = ground point.
// ---------------------------------------------------------------------------
export function drawPumpkin(ctx, x, y, o = {}) {
  const t = o.t || 0, hf = o.hitFlash > 0 ? Math.min(1, o.hitFlash) : 0;
  const hp = typeof o.hpFrac === 'number' ? o.hpFrac : 1;
  const seed = x * 0.173 + y * 0.311;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (o.shadow) drawShadow(ctx, x, y, 50);
  ctx.translate(x, y);
  // inner glow light on floor
  const fl = 0.75 + 0.25 * Math.sin(t * 11 + seed) * Math.sin(t * 6.7 + seed * 2);
  ctx.fillStyle = `rgba(255,170,60,${0.12 * fl})`; ell(ctx, 0, 2, 30, 9); ctx.fill();
  ctx.scale(1 + 0.14 * hf, 1 - 0.14 * hf);
  setTint(hf * 0.9, 0);
  const cy = -20;
  // back ribs/lobes
  ell(ctx, -13, cy, 13, 18); fs(ctx, '#e0701a', 2.5);
  ell(ctx, 13, cy, 13, 18); fs(ctx, '#e0701a', 2.5);
  ell(ctx, 0, cy, 15, 19.5); fs(ctx, '#f6922a', 2.5);
  // lobe shading
  ctx.strokeStyle = C('#c95d12'); ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-20, cy - 12); ctx.quadraticCurveTo(-25, cy, -20, cy + 12);
  ctx.moveTo(20, cy - 12); ctx.quadraticCurveTo(25, cy, 20, cy + 12);
  ctx.stroke();
  // highlight
  ctx.fillStyle = 'rgba(255,240,200,0.45)';
  ell(ctx, -5, cy - 11, 5, 3, -0.4); ctx.fill();
  // stem
  ctx.beginPath(); ctx.moveTo(-3, cy - 17); ctx.quadraticCurveTo(-4, cy - 26, 2, cy - 28); ctx.lineTo(5, cy - 25); ctx.quadraticCurveTo(2, cy - 22, 3, cy - 17); ctx.closePath();
  fs(ctx, '#5f8a2a', 2.2);
  ctx.strokeStyle = C('#4e7a22'); ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(3, cy - 20); ctx.quadraticCurveTo(10, cy - 26, 13, cy - 20); ctx.quadraticCurveTo(10, cy - 18, 12, cy - 15); ctx.stroke();
  // carved face (glowing)
  const glow = `rgb(255,${(200 + 40 * fl) | 0},${(60 + 60 * fl) | 0})`;
  const inner = '#c24a0a';
  const face = (fill) => {
    ctx.fillStyle = fill;
    poly(ctx, [-11, cy - 4, -4, cy - 4, -7.5, cy - 11]); ctx.fill();
    poly(ctx, [11, cy - 4, 4, cy - 4, 7.5, cy - 11]); ctx.fill();
    poly(ctx, [-2, cy + 1, 2, cy + 1, 0, cy - 2.5]); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-13, cy + 3); ctx.quadraticCurveTo(0, cy + 7, 13, cy + 3);
    ctx.quadraticCurveTo(10, cy + 13, 0, cy + 14); ctx.quadraticCurveTo(-10, cy + 13, -13, cy + 3); ctx.closePath(); ctx.fill();
  };
  face(C(inner));
  ctx.save(); ctx.translate(0, 0.8); ctx.scale(0.86, 0.86); ctx.translate(0, cy * (1 / 0.86 - 1)); face(C(glow)); ctx.restore();
  // teeth
  ctx.fillStyle = C('#f6922a');
  rr(ctx, -6, cy + 4.5, 4, 4, 1); ctx.fill(); rr(ctx, 3, cy + 4.5, 4, 4, 1); ctx.fill(); rr(ctx, -1.5, cy + 10, 4, 4.5, 1); ctx.fill();
  // cracks
  const stage = hp >= 0.999 ? 0 : hp > 0.66 ? 1 : hp > 0.33 ? 2 : 3;
  if (stage) {
    ctx.strokeStyle = C('#5a2408'); ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-17, cy - 12); ctx.lineTo(-13, cy - 8); ctx.lineTo(-16, cy - 4); ctx.lineTo(-12, cy);
    if (stage >= 2) {
      ctx.moveTo(18, cy - 6); ctx.lineTo(14, cy - 1); ctx.lineTo(17, cy + 4); ctx.lineTo(13, cy + 9); ctx.moveTo(14, cy - 1); ctx.lineTo(10, cy - 2);
      ctx.moveTo(-6, cy - 18); ctx.lineTo(-3, cy - 14); ctx.lineTo(-6, cy - 12);
    }
    if (stage >= 3) {
      ctx.moveTo(-20, cy + 6); ctx.lineTo(-15, cy + 9); ctx.lineTo(-17, cy + 14); ctx.moveTo(4, cy + 16); ctx.lineTo(7, cy + 12); ctx.lineTo(5, cy + 9);
      ctx.moveTo(22, cy - 12); ctx.lineTo(17, cy - 13); ctx.lineTo(15, cy - 9);
    }
    ctx.stroke();
    if (stage >= 3) { // chunk missing
      poly(ctx, [16, cy - 14, 22, cy - 9, 18, cy - 4, 13, cy - 8]); fs(ctx, '#7a2a06', 1.5);
      ctx.fillStyle = `rgba(255,220,90,${0.7 * fl})`; poly(ctx, [16.5, cy - 11, 19, cy - 9, 17.5, cy - 7, 15.5, cy - 8.5]); ctx.fill();
    }
  }
  if (hf > 0) {
    ctx.fillStyle = `rgba(255,255,255,${0.35 * hf})`;
    ell(ctx, 0, cy, 26, 20); ctx.fill();
  }
  setTint(0, 0);
  ctx.restore();
  if (o.peek) drawPeek(ctx, x, y, o.peek, t, seed);
}

function drawPeek(ctx, x, y, kind, t, seed) {
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const by = y - 66 + Math.sin(t * 3 + seed) * 2.5;
  ctx.translate(x, by);
  ctx.globalAlpha *= 0.95;
  // bubble
  circ(ctx, 0, 0, 13.5); fs(ctx, '#ffffff', 2.2);
  circ(ctx, -3, 17, 3); fs(ctx, '#ffffff', 1.8);
  circ(ctx, -1, 23, 1.8); fs(ctx, '#ffffff', 1.5);
  ctx.fillStyle = 'rgba(200,190,255,0.3)'; ell(ctx, 3, 4, 8, 6); ctx.fill();
  if (kind === 'coin') coinGlyph(ctx, 8, 1);
  else if (kind === 'monster') { ctx.translate(0, -0.5); skullGlyph(ctx, 8); }
  else if (kind === 'club') { ctx.save(); ctx.rotate(-0.8); ctx.translate(-11, 0); ctx.scale(0.7, 0.7); drawClub(ctx, 0, 32, false, t); ctx.restore(); }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Obstacles
// ---------------------------------------------------------------------------
let SELF_SHADOW = false;
export function drawObstacle(ctx, type, x, y, t = 0, o = null) {
  SELF_SHADOW = !!(o && o.shadow);
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  setTint(0, 0);
  const fn = OBST[type];
  if (fn) fn(ctx, x, y, t);
  ctx.restore();
}

function bubbles(ctx, cx, cy, wdt, hgt, t, n, col, seed) {
  for (let i = 0; i < n; i++) {
    const ph = (t * (0.6 + hash(seed + i) * 0.5) + hash(seed + i * 3.3)) % 1;
    const bx = cx + (hash(seed + i * 7.7) - 0.5) * wdt + Math.sin(t * 4 + i) * 1.5;
    const by = cy - ph * hgt;
    ctx.fillStyle = col; ctx.globalAlpha = 1 - ph * 0.7;
    circ(ctx, bx, by, 1.2 + ph * 1.5); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

const OBST = {
  table(ctx, x, y, t) {
    drawShadow(ctx, x, y + 8, 104, 0.45); // wide table: extra soft shadow beyond the engine's r*2 one
    ctx.translate(x, y);
    const top = -50, front = -16, legB = 18;
    // back legs
    rr(ctx, -40, top + 8, 6, 30, 2); fs(ctx, '#4b3a3a', 2);
    rr(ctx, 34, top + 8, 6, 30, 2); fs(ctx, '#4b3a3a', 2);
    // front legs
    rr(ctx, -44, front, 8, legB - front, 2); fs(ctx, '#5d4646', 2.2);
    rr(ctx, 36, front, 8, legB - front, 2); fs(ctx, '#5d4646', 2.2);
    // lower shelf
    rr(ctx, -40, 4, 80, 5, 2); fs(ctx, '#6a4c3e', 2);
    // table top surface + front edge
    rr(ctx, -46, top, 92, front - top, 5); fs(ctx, '#9b6b43', 2.5);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-42, top + 3, 84, 3);
    rr(ctx, -46, front - 4, 92, 10, 3); fs(ctx, '#7a5133', 2.5);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-43, front + 3, 86, 2);
    // drawer knob
    circ(ctx, 0, front + 1, 2); fillOnly(ctx, '#e6c07a');
    // stains
    ctx.fillStyle = 'rgba(120,255,90,0.25)'; ell(ctx, 18, top + 26, 9, 3); ctx.fill();
    // items (bottoms at ~ top+24)
    const by = top + 22;
    // test tube rack
    rr(ctx, -40, by - 6, 26, 7, 2); fs(ctx, '#c9a67a', 1.8);
    const tc = ['#ff5aa5', '#5ad1ff', '#ffe14a'];
    for (let i = 0; i < 3; i++) {
      const tx = -35 + i * 8;
      rr(ctx, tx - 2.5, by - 22, 5, 18, 2.5); ctx.fillStyle = 'rgba(220,240,255,0.6)'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.stroke();
      rr(ctx, tx - 1.5, by - 13 + i * 2, 3, 8 - i * 2, 1.5); fillOnly(ctx, tc[i]);
    }
    rr(ctx, -40, by - 8, 26, 4, 1.5); fs(ctx, '#b48d5f', 1.6);
    // bubbling erlenmeyer flask (green)
    const fx = -2;
    ctx.beginPath();
    ctx.moveTo(fx - 4, by - 30); ctx.lineTo(fx - 4, by - 20); ctx.lineTo(fx - 13, by - 2); ctx.quadraticCurveTo(fx, by + 1, fx + 13, by - 2); ctx.lineTo(fx + 4, by - 20); ctx.lineTo(fx + 4, by - 30); ctx.closePath();
    ctx.fillStyle = 'rgba(220,245,255,0.55)'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx - 8.5, by - 11); ctx.lineTo(fx - 13, by - 2); ctx.quadraticCurveTo(fx, by + 1, fx + 13, by - 2); ctx.lineTo(fx + 8.5, by - 11); ctx.closePath();
    ctx.fillStyle = '#7dff5a'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(fx - 8, by - 11, 16, 1.5);
    bubbles(ctx, fx, by - 4, 12, 9, t, 4, '#eaffda', 3);
    // vapour puffs
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.5 + i / 3) % 1;
      ctx.fillStyle = `rgba(170,255,140,${0.45 * (1 - ph)})`;
      circ(ctx, fx + Math.sin(t * 2 + i * 2) * 4, by - 32 - ph * 22, 2.5 + ph * 4); ctx.fill();
    }
    rr(ctx, fx - 5.5, by - 33, 11, 4, 1.5); fs(ctx, '#d9e6ee', 1.6);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ell(ctx, fx - 6, by - 7, 1.5, 3, 0.4); ctx.fill();
    // round potion (purple)
    circ(ctx, 24, by - 9, 9); ctx.fillStyle = 'rgba(220,245,255,0.55)'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); circ(ctx, 24, by - 9, 8); ctx.clip(); ctx.fillStyle = '#b35cff'; ctx.fillRect(14, by - 10 + Math.sin(t * 2) * 0.8, 20, 12); ctx.restore();
    circ(ctx, 24, by - 9, 9); ctx.stroke();
    rr(ctx, 21, by - 24, 6, 8, 1.5); ctx.fillStyle = 'rgba(220,245,255,0.6)'; ctx.fill(); ctx.stroke();
    rr(ctx, 20.5, by - 27, 7, 4, 1.5); fs(ctx, '#c99a62', 1.6);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ell(ctx, 20.5, by - 12, 1.6, 2.4, 0.5); ctx.fill();
    // notebook
    poly(ctx, [32, by - 2, 44, by - 2, 42, by + 6, 30, by + 6]); fs(ctx, '#f1e6c8', 1.6);
  },
  cauldron(ctx, x, y, t) {
    if (SELF_SHADOW) drawShadow(ctx, x, y + 4, 74);
    ctx.translate(x, y);
    // glow on the floor
    const gl = 0.8 + 0.2 * Math.sin(t * 3);
    ctx.fillStyle = `rgba(120,255,90,${0.12 * gl})`; ell(ctx, 0, 0, 44, 14); ctx.fill();
    // fire logs + flames under the pot
    rr(ctx, -16, -4, 32, 6, 3); fs(ctx, '#6b4226', 1.8);
    for (let i = 0; i < 3; i++) {
      const fx = -9 + i * 9, f = 0.8 + 0.3 * Math.sin(t * 12 + i * 2);
      ctx.beginPath(); ctx.moveTo(fx - 4, -2); ctx.quadraticCurveTo(fx - 4, -9 * f, fx, -13 * f); ctx.quadraticCurveTo(fx + 4, -9 * f, fx + 4, -2); ctx.closePath();
      ctx.fillStyle = '#ff9a2a'; ctx.fill();
    }
    // legs
    for (const lx of [-20, 20]) { poly(ctx, [lx - 3, -10, lx + 3, -10, lx + (lx < 0 ? -2 : 2), 2]); fs(ctx, '#2a2632', 2); }
    // pot body
    const g = ctx.createRadialGradient(-10, -30, 4, 0, -24, 34);
    g.addColorStop(0, '#5a5470'); g.addColorStop(1, '#25222f');
    ell(ctx, 0, -24, 30, 22); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ell(ctx, -15, -30, 4, 7, 0.4); ctx.fill();
    // slime drips over rim
    ctx.fillStyle = '#6ae04a';
    for (const [dx, dl] of [[-18, 10], [-6, 6], [12, 13]]) { rr(ctx, dx - 2.5, -42, 5, dl, 2.5); ctx.fill(); circ(ctx, dx, -42 + dl, 3); ctx.fill(); }
    // rim
    ell(ctx, 0, -42, 29, 9); fs(ctx, '#4a4558', 2.5);
    ell(ctx, 0, -42, 23, 6); ctx.fillStyle = '#1b1822'; ctx.fill();
    // liquid
    const lg = ctx.createRadialGradient(0, -41, 2, 0, -41, 22);
    lg.addColorStop(0, '#d6ff9a'); lg.addColorStop(1, '#5ad63a');
    ell(ctx, 0, -40.5, 22, 5.3); ctx.fillStyle = lg; ctx.fill();
    // glow above
    ctx.fillStyle = `rgba(150,255,110,${0.18 * gl})`; ell(ctx, 0, -50, 26, 16); ctx.fill();
    // surface bubbles that pop
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.8 + hash(i * 5.3)) % 1;
      const bx = (hash(i * 2.7) - 0.5) * 30, r = 1.5 + ph * 3.5;
      if (ph < 0.85) { circ(ctx, bx, -41 - r * 0.4, r); ctx.fillStyle = '#b8ff8a'; ctx.fill(); ctx.strokeStyle = '#3aa02a'; ctx.lineWidth = 1.2; ctx.stroke(); }
      else { ctx.strokeStyle = 'rgba(200,255,170,0.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(bx, -42, r + 2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    }
    // steam
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.35 + i / 3) % 1;
      ctx.fillStyle = `rgba(190,255,170,${0.35 * (1 - ph)})`;
      circ(ctx, -8 + i * 8 + Math.sin(t * 1.5 + i) * 5, -48 - ph * 34, 4 + ph * 6); ctx.fill();
    }
    // handles
    ctx.strokeStyle = OUT; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.arc(-31, -34, 5, Math.PI * 0.5, Math.PI * 1.5); ctx.moveTo(31, -39); ctx.arc(31, -34, 5, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    ctx.strokeStyle = '#6a6480'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-31, -34, 5, Math.PI * 0.5, Math.PI * 1.5); ctx.moveTo(31, -39); ctx.arc(31, -34, 5, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
  },
  coffin(ctx, x, y, t) {
    const upright = hash(Math.round(x) * 0.13 + Math.round(y) * 0.71) > 0.5;
    const WOOD = '#6e4a3f', WOOD_D = '#4e3029', WOOD_L = '#8d6252';
    if (upright) {
      if (SELF_SHADOW) drawShadow(ctx, x, y + 2, 60);
      ctx.translate(x, y);
      const P = [-14, -86, 14, -86, 23, -62, 15, 6, -15, 6, -23, -62];
      // side depth (right)
      poly(ctx, [14, -86, 20, -90, 29, -66, 21, 2, 15, 6, 23, -62]); fs(ctx, WOOD_D, 2.2);
      // open interior
      poly(ctx, P); fs(ctx, '#1a1020', 2.5);
      // glowing eyes in the gap
      const blink = Math.sin(t * 0.9) > 0.95 ? 0.2 : 1;
      ctx.fillStyle = '#ffe14a';
      ell(ctx, 12, -58, 1.8, 2.4 * blink); ctx.fill(); ell(ctx, 17, -57, 1.6, 2.2 * blink); ctx.fill();
      // lid slightly ajar (rotated around left hinge)
      ctx.save(); ctx.translate(-23, -62); ctx.rotate(-0.05); ctx.translate(23, 62); ctx.translate(-6, 0);
      poly(ctx, P); fs(ctx, WOOD, 2.5);
      poly(ctx, [-9, -78, 9, -78, 15, -60, 9, -2, -9, -2, -15, -60]); ctx.strokeStyle = WOOD_L; ctx.lineWidth = 2; ctx.stroke();
      // bat emblem
      ctx.fillStyle = '#e8c25a';
      ctx.beginPath(); const bx = 0, by = -50;
      ctx.moveTo(bx, by + 2); ctx.quadraticCurveTo(bx - 4, by - 4, bx - 10, by - 1); ctx.quadraticCurveTo(bx - 7, by + 1, bx - 7, by + 4); ctx.quadraticCurveTo(bx - 3, by + 2, bx, by + 5);
      ctx.quadraticCurveTo(bx + 3, by + 2, bx + 7, by + 4); ctx.quadraticCurveTo(bx + 7, by + 1, bx + 10, by - 1); ctx.quadraticCurveTo(bx + 4, by - 4, bx, by + 2); ctx.fill();
      // hinges
      ctx.fillStyle = '#c9b28a'; rr(ctx, -24, -74, 5, 7, 1); ctx.fill(); rr(ctx, -21, -20, 5, 7, 1); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; poly(ctx, [-12, -84, -4, -84, -16, -40, -20, -60]); ctx.fill();
      ctx.restore();
    } else {
      if (SELF_SHADOW) drawShadow(ctx, x, y + 4, 92);
      ctx.translate(x, y);
      const h = 16;
      const top = [-42, -2, -30, -18, 42, -12, 42, 10, -30, 16]; // pentagon-ish (head on left), top-down
      // front sides
      poly(ctx, [-42, -2 - h, -30, 16 - h, 42, 10 - h, 42, 10, -30, 16, -42, -2]); fs(ctx, WOOD_D, 2.5);
      ctx.strokeStyle = OUT; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-30, 16 - h); ctx.lineTo(-30, 16); ctx.stroke();
      // handles
      ctx.fillStyle = '#c9b28a';
      for (const hx of [-16, 6, 26]) { rr(ctx, hx - 4, 4 - h * 0.1 + (hx < -20 ? 2 : 0), 8, 3, 1.5); ctx.fill(); }
      // box interior (visible through the gap)
      const lifted = top.map((v, i) => (i % 2 ? v - h : v));
      poly(ctx, lifted); fs(ctx, '#1a1020', 2.5);
      const blink = Math.sin(t * 1.1 + 2) > 0.95 ? 0.2 : 1;
      ctx.fillStyle = '#ffe14a';
      ell(ctx, 30, -h + 6, 1.8, 1.8 * blink); ctx.fill(); ell(ctx, 35, -h + 5, 1.6, 1.6 * blink); ctx.fill();
      // lid, shifted to reveal a gap
      ctx.save(); ctx.translate(-7, -5); ctx.rotate(-0.04);
      poly(ctx, lifted); fs(ctx, WOOD, 2.5);
      poly(ctx, [-34, -2 - h, -26, -12 - h, 36, -8 - h, 36, 6 - h, -26, 11 - h]); ctx.strokeStyle = WOOD_L; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; poly(ctx, [-38, -3 - h, -30, -15 - h, 10, -12 - h, -10, -6 - h]); ctx.fill();
      // little pumpkin emblem
      ell(ctx, 4, -h - 1, 6, 4.5); fs(ctx, '#f08a24', 1.6);
      ctx.restore();
    }
  },
  tubes(ctx, x, y, t) {
    if (SELF_SHADOW) drawShadow(ctx, x, y + 4, 70);
    ctx.translate(x, y);
    // base platform
    rr(ctx, -32, -12, 64, 16, 5); fs(ctx, '#5b6372', 2.5);
    ell(ctx, 0, -12, 32, 7); fs(ctx, '#7c8596', 2.2);
    ctx.fillStyle = '#ff5a5a'; circ(ctx, -22, -2, 2); ctx.fill();
    ctx.fillStyle = Math.sin(t * 5) > 0 ? '#7dff5a' : '#2f6a2a'; circ(ctx, -15, -2, 2); ctx.fill();
    const tubes = [
      { x: -15, h: 54, col: '#7dff5a', y0: -16 },
      { x: 15, h: 50, col: '#ff6ad5', y0: -16 },
      { x: 0, h: 66, col: '#5ae0ff', y0: -10 },
    ];
    // top connection bar
    rr(ctx, -21, -16 - 66, 42, 6, 3); fs(ctx, '#7c8596', 2);
    for (const tb of tubes) {
      const top = tb.y0 - tb.h, w = 15;
      // glow
      ctx.fillStyle = rgba(tb.col, 0.18); ell(ctx, tb.x, tb.y0 - tb.h / 2, 13, tb.h / 2 + 6); ctx.fill();
      // glass
      rr(ctx, tb.x - w / 2, top, w, tb.h, 7); ctx.fillStyle = 'rgba(210,240,255,0.35)'; ctx.fill();
      // liquid
      const lvl = top + tb.h * 0.28 + Math.sin(t * 2 + tb.x) * 1.5;
      ctx.save(); rr(ctx, tb.x - w / 2 + 2, top + 2, w - 4, tb.h - 4, 5.5); ctx.clip();
      ctx.fillStyle = tb.col; ctx.fillRect(tb.x - w, lvl, w * 2, tb.y0 - lvl);
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(tb.x - w, lvl, w * 2, 2);
      bubbles(ctx, tb.x, tb.y0 - 4, 8, tb.y0 - 4 - lvl, t, 4, 'rgba(255,255,255,0.85)', tb.x + 9);
      ctx.restore();
      rr(ctx, tb.x - w / 2, top, w, tb.h, 7); ctx.strokeStyle = OUT; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; rr(ctx, tb.x - w / 2 + 3, top + 6, 2.5, tb.h - 16, 1.2); ctx.fill();
      // caps
      rr(ctx, tb.x - w / 2 - 2, top - 3, w + 4, 6, 2); fs(ctx, '#9aa3b0', 2);
      rr(ctx, tb.x - w / 2 - 2, tb.y0 - 4, w + 4, 6, 2); fs(ctx, '#9aa3b0', 2);
    }
    // cable
    ctx.strokeStyle = OUT; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(21, -79); ctx.quadraticCurveTo(40, -70, 32, -40); ctx.stroke();
    ctx.strokeStyle = '#ffcf3a'; ctx.lineWidth = 2; ctx.stroke();
    // tiny sparks at the top
    const sp = (Math.sin(t * 7) + 1) / 2;
    sparkle(ctx, 0, -86, 2 + sp * 3, `rgba(200,255,255,${0.5 + sp * 0.5})`);
  },
};
