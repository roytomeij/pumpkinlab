// Short-lived effects. Deterministic per effect (seeded from x,y), no allocations per frame.
import { OUT, TAU, hash, ell, circ, poly, fs, starPath, sparkle, bone, easeOut, setTint } from './art-util.js';
import { ghostShape } from './art-actors.js';
import { skullGlyph } from './art-props.js';

export function drawEffect(ctx, e, t) {
  if (!e) return;
  const dur = e.dur > 0 ? e.dur : 0.6;
  const p = (t - (e.t || 0)) / dur;
  if (!(p >= 0 && p <= 1)) return;
  const fn = FX[e.type];
  if (!fn) return;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  setTint(0, 0);
  fn(ctx, e.x, e.y, p, (e.x || 0) * 0.137 + (e.y || 0) * 0.731, e.data || null, t);
  ctx.restore();
}

function fadeOut(p, from = 0.7) { return p < from ? 1 : 1 - (p - from) / (1 - from); }

const FX = {
  smash(ctx, x, y, p, s) {
    const cx = x, cy = y - 20;
    if (p < 0.35) {
      const q = p / 0.35;
      ctx.fillStyle = `rgba(255,220,120,${0.6 * (1 - q)})`;
      circ(ctx, cx, cy, 12 + 30 * q); ctx.fill();
    }
    ctx.globalAlpha = fadeOut(p, 0.65);
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * TAU + hash(s + i) * 0.5;
      const sp = 45 + hash(s + i * 2.3) * 55;
      const px = cx + Math.cos(a) * sp * p;
      const py = cy + Math.sin(a) * sp * 0.6 * p - 70 * p + 120 * p * p;
      const groundY = y + Math.sin(a) * sp * 0.25;
      const yy = Math.min(py, groundY);
      const r = 4 + hash(s + i * 4.1) * 4;
      ctx.save(); ctx.translate(px, yy); ctx.rotate(a + p * (hash(s + i) - 0.5) * 14);
      poly(ctx, [-r, -r * 0.5, r, -r * 0.7, r * 0.3, r * 0.8]);
      fs(ctx, i % 3 ? '#f6922a' : '#e0701a', 1.6);
      if (i % 4 === 0) { ctx.fillStyle = '#ffd23a'; poly(ctx, [-r * 0.3, -r * 0.3, r * 0.4, -r * 0.4, 0, r * 0.2]); ctx.fill(); }
      ctx.restore();
    }
    // seeds
    for (let i = 0; i < 8; i++) {
      const a = hash(s + i * 7.7) * TAU, sp = 25 + hash(s + i * 3.9) * 35;
      const px = cx + Math.cos(a) * sp * p, py = Math.min(cy + Math.sin(a) * sp * 0.5 * p - 50 * p + 90 * p * p, y + 4);
      ctx.fillStyle = '#f7ecc4'; ell(ctx, px, py, 2.4, 1.5, a); ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 0.8; ctx.stroke();
    }
    // stem flying up
    const stx = x + (hash(s) - 0.5) * 20 * p, sty = cy - 20 - 60 * p + 110 * p * p;
    ctx.save(); ctx.translate(stx, Math.min(sty, y)); ctx.rotate(p * 8);
    poly(ctx, [-2.5, -5, 2.5, -5, 3, 4, -3, 4]); fs(ctx, '#5f8a2a', 1.6);
    ctx.restore();
  },
  poof(ctx, x, y, p, s) {
    const a = 1 - p;
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * TAU + hash(s + i);
      const d = 6 + 18 * easeOut(p);
      const r = (7 + hash(s + i * 3) * 5) * (0.6 + p * 0.8);
      ctx.fillStyle = `rgba(222,214,240,${0.85 * a})`;
      circ(ctx, x + Math.cos(ang) * d, y - 16 + Math.sin(ang) * d * 0.7 - p * 10, r); ctx.fill();
      ctx.strokeStyle = `rgba(150,135,185,${0.6 * a})`; ctx.lineWidth = 1.5; ctx.stroke();
    }
  },
  howl(ctx, x, y, p, s, data) {
    const R = (data && data.radius) || 220;
    for (let k = 0; k < 3; k++) {
      const q = p * 1.35 - k * 0.17;
      if (q <= 0 || q >= 1) continue;
      const r = R * easeOut(q), a = (1 - q);
      ctx.strokeStyle = `rgba(200,225,255,${0.7 * a})`; ctx.lineWidth = 2 + 5 * a;
      ell(ctx, x, y - 10, r, r * 0.55); ctx.stroke();
      ctx.strokeStyle = `rgba(150,190,255,${0.25 * a})`; ctx.lineWidth = 10 * a + 1;
      ell(ctx, x, y - 10, r * 0.96, r * 0.53); ctx.stroke();
    }
    // music-ish notes floating up
    for (let i = 0; i < 3; i++) {
      const q = Math.min(1, p * 1.5 - i * 0.1);
      if (q <= 0) continue;
      const nx = x + (i - 1) * 16 + Math.sin(q * 6 + i) * 4, ny = y - 50 - q * 40;
      ctx.globalAlpha = 1 - q;
      ell(ctx, nx, ny, 3.5, 2.6, -0.4); fs(ctx, '#e8f0ff', 1.4);
      ctx.strokeStyle = '#e8f0ff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(nx + 3, ny - 1); ctx.lineTo(nx + 3, ny - 11); ctx.lineTo(nx + 7, ny - 8); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },
  hit(ctx, x, y, p, s) {
    const cy = y - 26, a = 1 - p, sc = easeOut(Math.min(1, p * 2.5));
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * TAU + hash(s) * 0.8, r0 = 10 + 14 * sc, r1 = r0 + 8 * a;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); ctx.lineTo(x + Math.cos(ang) * r1, cy + Math.sin(ang) * r1); ctx.stroke();
    }
    starPath(ctx, x, cy, 6 + 12 * sc, 3 + 5 * sc, 5, -Math.PI / 2 + p);
    fs(ctx, '#ffe14a', 2.2);
    starPath(ctx, x, cy, 3 + 5 * sc, 1.5 + 2 * sc, 5, -Math.PI / 2 + p);
    ctx.fillStyle = '#ffffff'; ctx.fill();
  },
  bones(ctx, x, y, p, s) {
    ctx.globalAlpha = fadeOut(p, 0.75);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + hash(s + i) * 0.6;
      const sp = 30 + hash(s + i * 2.1) * 30;
      const q = Math.min(1, p * 1.6);
      const px = x + Math.cos(a) * sp * q, gy = y + Math.sin(a) * sp * 0.35 * q;
      const h = Math.sin(Math.PI * q) * (30 + hash(s + i * 5) * 20) + (q < 1 ? 0 : 0);
      ctx.save(); ctx.translate(px, gy - h - 4); ctx.rotate(a + q * (hash(s + i * 3) - 0.5) * 12);
      bone(ctx, -6, 0, 6, 0, 2.6);
      ctx.restore();
    }
    // skull hops
    const q = Math.min(1, p * 1.3);
    const sx = x + (hash(s + 9) - 0.5) * 30 * q, sy = y - 8 - Math.abs(Math.sin(q * Math.PI * 2)) * 26 * (1 - q * 0.5);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate((hash(s + 4) - 0.5) * q * 3);
    skullGlyph(ctx, 9);
    ctx.restore();
  },
  coinSparkle(ctx, x, y, p, s) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + hash(s + i);
      const d = 6 + 20 * easeOut(p);
      const sz = Math.sin(Math.PI * Math.min(1, p * 1.2 + hash(s + i * 2) * 0.2)) * 5;
      sparkle(ctx, x + Math.cos(a) * d, y - 14 + Math.sin(a) * d * 0.7 - p * 18, sz, i % 2 ? '#fff6b0' : '#ffd23a');
    }
  },
  shield(ctx, x, y, p, s) {
    const a = 1 - p, r = 28 + 12 * easeOut(p), cy = y - 26;
    ctx.fillStyle = `rgba(110,220,255,${0.25 * a})`;
    ell(ctx, x, cy, r, r * 1.05); ctx.fill();
    ctx.strokeStyle = `rgba(170,240,255,${0.95 * a})`; ctx.lineWidth = 3;
    ctx.stroke();
    // hex pattern
    ctx.strokeStyle = `rgba(200,250,255,${0.45 * a})`; ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * TAU, hx = x + Math.cos(ang) * r * 0.5, hy = cy + Math.sin(ang) * r * 0.5;
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) { const b = (k / 6) * TAU; const X = hx + Math.cos(b) * r * 0.22, Y = hy + Math.sin(b) * r * 0.22; k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
      ctx.stroke();
    }
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * a})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, cy, r * 0.75, r * 0.78, 0, -2.6, -1.7); ctx.stroke();
  },
  spikes(ctx, x, y, p, s) {
    const a = fadeOut(p, 0.5), cy = y - 20;
    ctx.globalAlpha = a;
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * TAU + hash(s) * 0.6;
      const d = 8 + 30 * easeOut(p);
      const px = x + Math.cos(ang) * d, py = cy + Math.sin(ang) * d * 0.8;
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
      poly(ctx, [-4, -3, -4, 3, 10, 0]); fs(ctx, '#7a5636', 1.6);
      ctx.fillStyle = '#e8d2a8'; poly(ctx, [5, -1, 5, 1, 10, 0]); ctx.fill();
      ctx.restore();
    }
  },
  ghostVanish(ctx, x, y, p, s, data, t) {
    const a = 1 - p;
    ctx.save();
    ctx.translate(x, y - 12 - 60 * easeOut(p));
    ctx.globalAlpha = a * 0.9;
    const sc = 1 - 0.35 * p;
    ctx.scale(sc, sc * (1 + p * 0.3));
    ghostShape(ctx, t);
    fs(ctx, '#ffffff', 2.4);
    ctx.fillStyle = OUT;
    ell(ctx, -6, -31, 3, 1.2); ctx.fill(); ell(ctx, 6, -31, 3, 1.2); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -23, 3, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * TAU + p * 4 + hash(s + i);
      const d = 10 + 26 * p;
      const sz = 2 + 3 * Math.sin(Math.PI * Math.min(1, p + hash(s + i * 3) * 0.3));
      sparkle(ctx, x + Math.cos(ang) * d, y - 30 - 50 * p + Math.sin(ang) * d * 0.6, sz, i % 2 ? `rgba(200,240,255,${a})` : `rgba(255,255,255,${a})`);
    }
  },
};
