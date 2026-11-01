// Shared drawing helpers for the Art module (Canvas 2D only, no assets).

export const OUT = '#1d1328';       // dark outline colour used everywhere
export const TAU = Math.PI * 2;

// ---- Tint (hit flash = mix to white, hurt = mix to red) -------------------
let tintFlash = 0, tintRed = 0;
export function setTint(flash = 0, red = 0) {
  tintFlash = flash > 0 ? Math.min(1, flash) : 0;
  tintRed = red > 0 ? Math.min(1, red) : 0;
}

const rgbCache = new Map();
export function parseHex(h) {
  let v = rgbCache.get(h);
  if (v) return v;
  let s = h.slice(1);
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const n = parseInt(s, 16);
  v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  rgbCache.set(h, v);
  return v;
}

const mixCache = new Map();
/** Colour with the current tint applied (only '#hex' colours are tinted). */
export function C(hex) {
  if ((tintFlash === 0 && tintRed === 0) || hex[0] !== '#') return hex;
  const f = Math.round(tintFlash * 8), r = Math.round(tintRed * 8);
  if (!f && !r) return hex;
  const key = hex + '|' + f + '|' + r;
  let out = mixCache.get(key);
  if (out) return out;
  let [R, G, B] = parseHex(hex);
  if (r) { const k = (r / 8) * 0.55; R += (255 - R) * k; G += (60 - G) * k; B += (60 - B) * k; }
  if (f) { const k = (f / 8) * 0.85; R += (255 - R) * k; G += (255 - G) * k; B += (255 - B) * k; }
  out = `rgb(${R | 0},${G | 0},${B | 0})`;
  mixCache.set(key, out);
  return out;
}

export function mix(a, b, k) {
  const A = parseHex(a), B = parseHex(b);
  return `rgb(${(A[0] + (B[0] - A[0]) * k) | 0},${(A[1] + (B[1] - A[1]) * k) | 0},${(A[2] + (B[2] - A[2]) * k) | 0})`;
}
export function rgba(hex, a) {
  const A = parseHex(hex);
  return `rgba(${A[0]},${A[1]},${A[2]},${a})`;
}

// ---- Deterministic pseudo random -------------------------------------------
export function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
export function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

// ---- Path helpers ------------------------------------------------------------
export function ell(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx > 0.1 ? rx : 0.1, ry > 0.1 ? ry : 0.1, rot, 0, TAU);
}
export function circ(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r > 0.1 ? r : 0.1, 0, TAU);
}
export function rrPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  rrPath(ctx, x, y, w, h, r);
}
export function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
}
/** Fill the current path (tinted) and stroke it with the dark outline. */
export function fs(ctx, fill, lw = 2.5) {
  ctx.fillStyle = C(fill);
  ctx.fill();
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke(); }
}
export function fillOnly(ctx, fill) { ctx.fillStyle = C(fill); ctx.fill(); }
export function strokeC(ctx, col, lw) { ctx.strokeStyle = C(col); ctx.lineWidth = lw; ctx.stroke(); }

/** A thick outlined line (limb). */
export function limb(ctx, x1, y1, x2, y2, w, col) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT; ctx.lineWidth = w + 3; ctx.stroke();
  ctx.strokeStyle = C(col); ctx.lineWidth = w; ctx.stroke();
}

export function starPath(ctx, x, y, r1, r2, n = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1, a = rot + (i * Math.PI) / n;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}
/** 4-point twinkle. */
export function sparkle(ctx, x, y, r, col) {
  if (r <= 0.2) return;
  const k = r * 0.28;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + k, y - k, x + r, y);
  ctx.quadraticCurveTo(x + k, y + k, x, y + r);
  ctx.quadraticCurveTo(x - k, y + k, x - r, y);
  ctx.quadraticCurveTo(x - k, y - k, x, y - r);
  ctx.fillStyle = col;
  ctx.fill();
}

/** Soft elliptical ground shadow; w = width in px. */
export function drawShadow(ctx, x, y, w, alpha = 1) {
  if (w <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = 'rgba(12,4,24,0.16)';
  ell(ctx, x, y, w * 0.56, w * 0.2);
  ctx.fill();
  ctx.fillStyle = 'rgba(12,4,24,0.22)';
  ell(ctx, x, y, w * 0.42, w * 0.14);
  ctx.fill();
  ctx.restore();
}

/** Cartoon bone (used by skeleton, effects, icons). */
export function bone(ctx, x1, y1, x2, y2, w, col = '#f4efe2') {
  const a = Math.atan2(y2 - y1, x2 - x1), px = -Math.sin(a) * w * 0.45, py = Math.cos(a) * w * 0.45;
  const kr = w * 0.55;
  ctx.lineCap = 'round';
  // outline pass
  ctx.strokeStyle = OUT; ctx.fillStyle = OUT;
  ctx.lineWidth = w + 3;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  for (const [x, y] of [[x1, y1], [x2, y2]]) {
    circ(ctx, x + px, y + py, kr + 1.5); ctx.fill();
    circ(ctx, x - px, y - py, kr + 1.5); ctx.fill();
  }
  ctx.strokeStyle = C(col); ctx.fillStyle = C(col);
  ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  for (const [x, y] of [[x1, y1], [x2, y2]]) {
    circ(ctx, x + px, y + py, kr); ctx.fill();
    circ(ctx, x - px, y - py, kr); ctx.fill();
  }
}

export function easeOut(p) { return 1 - (1 - p) * (1 - p); }
