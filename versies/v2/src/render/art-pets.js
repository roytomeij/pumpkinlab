// The nine pets. Each draws in local coords facing right, ground at (0,0),
// and returns the top-of-head point used for level badges.
import { OUT, TAU, C, setTint, hash, ell, circ, rr, poly, fs, fillOnly, limb, starPath, sparkle, drawShadow } from './art-util.js';

const FLIERS = { owl: 1, bat: 1, raven: 1 };
const FRONTAL = { owl: 1, bat: 1 };
const HEAD = { x: 0, y: 0 };

function legs4(ctx, xs, top, wp, col, w = 5, amp = 3) {
  for (let i = 0; i < xs.length; i++) {
    const ph = wp + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0);
    const dx = Math.sin(ph) * amp, lift = Math.max(0, Math.cos(ph)) * 1.8;
    ctx.beginPath(); ctx.moveTo(xs[i], top); ctx.lineTo(xs[i] + dx, -lift - w / 2);
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUT; ctx.lineWidth = w + 3; ctx.stroke();
    ctx.strokeStyle = C(col); ctx.lineWidth = w; ctx.stroke();
  }
}
function eye(ctx, x, y, r = 2, closed = false) {
  if (closed) {
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    return;
  }
  ctx.fillStyle = C('#1d1328'); ell(ctx, x, y, r * 0.85, r * 1.1); ctx.fill();
  ctx.fillStyle = '#ffffff'; circ(ctx, x + r * 0.3, y - r * 0.4, r * 0.38); ctx.fill();
}
function setHead(x, y) { HEAD.x = x; HEAD.y = y; return HEAD; }

const PETS = {
  wolf(ctx, o, t) {
    const wp = o.walkPhase || 0, act = o.action || 0;
    const G = '#8e97a8', GD = '#6c7486', GL = '#d6dbe4';
    legs4(ctx, [-10, 8], -12, wp + 0.6, GD, 5);
    // tail
    const tw = Math.sin(t * 3) * 0.15;
    ctx.save(); ctx.translate(-13, -19); ctx.rotate(-0.9 + tw);
    ell(ctx, -8, 0, 10, 5); fs(ctx, G, 2.3);
    ell(ctx, -15, 0, 3.5, 3); fillOnly(ctx, GL);
    ctx.restore();
    ell(ctx, 0, -17, 15, 9.5); fs(ctx, G, 2.5);
    ell(ctx, 3, -12.5, 9, 4); fillOnly(ctx, GL);
    legs4(ctx, [-6, 12], -12, wp, G, 5);
    // head (rotates up when howling)
    ctx.save(); ctx.translate(12, -25); ctx.rotate(-0.75 * act);
    // ruff
    poly(ctx, [-6, -2, -9, 4, -4, 3, -5, 8, 0, 5, 2, 9, 4, 4]); fs(ctx, GL, 2);
    for (const [ex, ey, tx, ty] of [[-5, -5, -3, -16], [0, -6, 3, -15]]) {
      poly(ctx, [ex - 3, ey + 1, tx, ty, ex + 4, ey]); fs(ctx, G, 2);
      poly(ctx, [ex - 1, ey, tx + 0.5, ty + 4, ex + 2, ey]); fillOnly(ctx, '#e7a6b6');
    }
    ell(ctx, 0, -1, 8.5, 7.5); fs(ctx, G, 2.3);
    if (act > 0.05) {
      ell(ctx, 8.5, 1.5, 6.5, 3.6); fs(ctx, GL, 2);
      ell(ctx, 10, 5.5, 4, 2.5 + act * 1.5); fs(ctx, '#5a2030', 1.8);
      eye(ctx, 3, -3, 2, true);
    } else {
      ell(ctx, 8.5, 2, 6.5, 4.2); fs(ctx, GL, 2);
      eye(ctx, 3.5, -2.5, 2);
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(10, 4.5); ctx.quadraticCurveTo(11.5, 6, 13, 4.5); ctx.stroke();
    }
    ell(ctx, 14.5, 1.2, 2.3, 1.8); fillOnly(ctx, '#1d1328');
    ctx.restore();
    if (act > 0.05) {
      for (let i = 0; i < 3; i++) {
        const ph = (t * 1.6 + i / 3) % 1;
        ctx.strokeStyle = `rgba(230,240,255,${act * (1 - ph)})`; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(22, -38, 5 + ph * 16, -2.2, -0.5); ctx.stroke();
      }
    }
    return setHead(12, -37);
  },
  dog(ctx, o, t) {
    const wp = o.walkPhase || 0;
    const B = '#d99c56', BD = '#b57a3a', BL = '#f6dfba', EAR = '#8a5a2b';
    legs4(ctx, [-8, 8], -11, wp + 0.6, BD, 5);
    // wagging tail
    const wag = Math.sin(t * 14) * 5;
    limb(ctx, -11, -17, -19, -26 + wag * 0.4, 4, B);
    ell(ctx, 0, -15.5, 13, 8.5); fs(ctx, B, 2.5);
    ell(ctx, -4, -18, 5, 3.5); fillOnly(ctx, '#c3803e');
    ell(ctx, 8, -12, 5, 4); fillOnly(ctx, BL);
    legs4(ctx, [-4, 11], -11, wp, B, 5);
    ctx.save(); ctx.translate(12, -24);
    ell(ctx, 0, 0, 8, 7.5); fs(ctx, B, 2.3);
    ell(ctx, 7, 2.5, 5.5, 4); fs(ctx, BL, 2);
    ell(ctx, 12, 1, 2.3, 1.9); fillOnly(ctx, '#1d1328');
    // tongue
    ell(ctx, 8.5, 7, 1.8, 2.6); fs(ctx, '#ff7a9a', 1.4);
    eye(ctx, 3, -2, 2);
    // floppy ear
    const flop = Math.sin(wp * 2) * 0.15;
    ell(ctx, -3.5, 1, 3.5, 7, 0.35 + flop); fs(ctx, EAR, 2);
    ctx.restore();
    return setHead(11, -33);
  },
  bear(ctx, o, t) {
    const wp = o.walkPhase || 0, act = o.action || 0;
    const B = '#8b5a35', BD = '#6a4226', BL = '#d6a77a';
    legs4(ctx, [-11, 9], -14, wp + 0.6, BD, 8, 2.5);
    ell(ctx, -17, -18, 3.5, 3.5); fs(ctx, B, 2);
    ell(ctx, 0, -19, 18, 13); fs(ctx, B, 2.5);
    ell(ctx, 4, -14, 10, 6); fillOnly(ctx, '#a6703f');
    if (act > 0.05) { // swipe!
      ctx.save(); ctx.translate(12, -20); ctx.rotate(-1.4 * act);
      limb(ctx, 0, 0, 13, 0, 8, B);
      for (let k = -1; k <= 1; k++) { ctx.fillStyle = '#f4efe2'; circ(ctx, 17, k * 2.5, 1.2); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * act})`; ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(20, -22, 12 + k * 4, -1.2, 0.4); ctx.stroke(); }
      legs4(ctx, [-6], -14, wp, B, 8, 2.5);
    } else legs4(ctx, [-6, 13], -14, wp, B, 8, 2.5);
    ctx.save(); ctx.translate(15, -31);
    circ(ctx, -6, -8, 4.2); fs(ctx, B, 2); circ(ctx, 5, -9, 4.2); fs(ctx, B, 2);
    circ(ctx, -6, -8, 2); fillOnly(ctx, BL); circ(ctx, 5, -9, 2); fillOnly(ctx, BL);
    circ(ctx, 0, 0, 10); fs(ctx, B, 2.5);
    ell(ctx, 6.5, 3, 5.5, 4.2); fs(ctx, BL, 2);
    ell(ctx, 10, 1.5, 2.4, 1.9); fillOnly(ctx, '#1d1328');
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(7, 5); ctx.quadraticCurveTo(8.5, 6.5, 10, 5.5); ctx.stroke();
    eye(ctx, 2, -2.5, 2);
    ctx.fillStyle = 'rgba(255,130,150,0.5)'; ell(ctx, 1, 3, 2, 1.3); ctx.fill();
    ctx.restore();
    return setHead(15, -44);
  },
  cat(ctx, o, t) {
    const wp = o.walkPhase || 0;
    const K = '#2e2740', KL = '#57497a';
    legs4(ctx, [-8, 7], -10, wp + 0.6, '#231d33', 4);
    // tail curling up
    const sw = Math.sin(t * 2.5) * 3;
    ctx.beginPath(); ctx.moveTo(-10, -14); ctx.bezierCurveTo(-20, -16, -16, -32, -22 + sw, -36);
    ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 7.5; ctx.stroke(); ctx.strokeStyle = C(K); ctx.lineWidth = 4.5; ctx.stroke();
    ell(ctx, 0, -14, 12, 7.2); fs(ctx, K, 2.5);
    ctx.strokeStyle = C(KL); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, -14, 9, 4.5, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    legs4(ctx, [-4, 10], -10, wp, K, 4);
    ctx.save(); ctx.translate(11, -23);
    poly(ctx, [-6, -3, -6, -13, 0, -6]); fs(ctx, K, 2); poly(ctx, [1, -6, 6, -13, 7, -2]); fs(ctx, K, 2);
    poly(ctx, [-5, -5, -5, -10, -2, -6]); fillOnly(ctx, '#d48aa8');
    circ(ctx, 0, 0, 8); fs(ctx, K, 2.3);
    // glowing eyes
    const blink = Math.sin(t * 0.8 + 1) > 0.97 ? 0.15 : 1;
    ctx.fillStyle = 'rgba(190,255,80,0.35)'; circ(ctx, 2, -1, 7); ctx.fill();
    ctx.fillStyle = '#c8ff4d';
    ell(ctx, -0.5, -1, 2.3, 2.8 * blink); ctx.fill(); ell(ctx, 5, -1, 2.1, 2.6 * blink); ctx.fill();
    if (blink > 0.5) { ctx.fillStyle = '#1d1328'; ell(ctx, 0, -1, 0.7, 2); ctx.fill(); ell(ctx, 5.4, -1, 0.6, 1.9); ctx.fill(); }
    ctx.fillStyle = '#ff9ab8'; poly(ctx, [6.5, 2.5, 8.5, 2.5, 7.5, 3.8]); ctx.fill();
    ctx.strokeStyle = 'rgba(230,230,255,0.7)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(8, 3.5); ctx.lineTo(14, 2); ctx.moveTo(8, 4.2); ctx.lineTo(14, 5); ctx.stroke();
    ctx.restore();
    return setHead(11, -35);
  },
  owl(ctx, o, t) {
    const flap = Math.sin(t * 9);
    const B = '#a06a3a', BD = '#7a4d26', BL = '#ecd3a2';
    // wings
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 9, -18); ctx.rotate(s * (0.5 + flap * 0.55));
      ell(ctx, s * 8, 0, 10, 5); fs(ctx, BD, 2.2);
      ctx.strokeStyle = C('#5a3518'); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(s * 4, 1); ctx.lineTo(s * 14, 1); ctx.stroke();
      ctx.restore();
    }
    // feet
    ctx.strokeStyle = C('#f2a23a'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-3, -2); ctx.lineTo(-4, 1); ctx.moveTo(3, -2); ctx.lineTo(4, 1); ctx.stroke();
    // ear tufts
    poly(ctx, [-11, -26, -9, -36, -4, -28]); fs(ctx, BD, 2); poly(ctx, [11, -26, 9, -36, 4, -28]); fs(ctx, BD, 2);
    ell(ctx, 0, -15, 12, 14); fs(ctx, B, 2.5);
    ell(ctx, 0, -9, 7.5, 7.5); fillOnly(ctx, BL);
    ctx.strokeStyle = C('#b88a52'); ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) { ctx.moveTo(-4 + k * 3.5, -10 + (k % 2) * 3); ctx.lineTo(-3 + k * 3.5, -8.5 + (k % 2) * 3); ctx.lineTo(-2 + k * 3.5, -10 + (k % 2) * 3); }
    ctx.stroke();
    // eyes
    for (const s of [-1, 1]) {
      circ(ctx, s * 5, -21, 5.3); fs(ctx, '#fff8e6', 1.8);
      circ(ctx, s * 5, -21, 3.3); fillOnly(ctx, '#ffae2a');
      circ(ctx, s * 5, -21, 1.8); fillOnly(ctx, '#1d1328');
      ctx.fillStyle = '#fff'; circ(ctx, s * 5 + 0.8, -22, 0.7); ctx.fill();
    }
    poly(ctx, [-2.2, -16.5, 2.2, -16.5, 0, -12.5]); fs(ctx, '#f2b33a', 1.4);
    return setHead(0, -33);
  },
  bat(ctx, o, t) {
    const act = o.action || 0;
    const flap = Math.sin(t * 17) * (1 - act * 0.6);
    const B = '#3e2f56', WG = '#5b4380';
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 4, -12); ctx.scale(s, 1); ctx.rotate(-flap * 0.6 - act * 0.6);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(9, -8); ctx.lineTo(22, -5);
      ctx.quadraticCurveTo(19, 1, 16, 2); ctx.quadraticCurveTo(13, -1, 10, 4); ctx.quadraticCurveTo(7, 1, 2, 5); ctx.closePath();
      fs(ctx, WG, 2.2);
      ctx.strokeStyle = C('#3a2a58'); ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(9, -8); ctx.lineTo(10, 3); ctx.moveTo(9, -8); ctx.lineTo(16, 1); ctx.stroke();
      ctx.restore();
    }
    poly(ctx, [-6, -14, -6, -24, -1, -17]); fs(ctx, B, 2); poly(ctx, [6, -14, 6, -24, 1, -17]); fs(ctx, B, 2);
    poly(ctx, [-5, -16, -5, -21, -2.5, -17]); fillOnly(ctx, '#e88ab0'); poly(ctx, [5, -16, 5, -21, 2.5, -17]); fillOnly(ctx, '#e88ab0');
    ell(ctx, 0, -11, 7, 8); fs(ctx, B, 2.4);
    circ(ctx, -2.8, -13, 2.4); fillOnly(ctx, '#ffffff'); circ(ctx, 2.8, -13, 2.4); fillOnly(ctx, '#ffffff');
    circ(ctx, -2.4, -12.7, 1.2); fillOnly(ctx, '#1d1328'); circ(ctx, 3.2, -12.7, 1.2); fillOnly(ctx, '#1d1328');
    ctx.fillStyle = '#ffffff'; poly(ctx, [-2, -8.5, -1, -8.5, -1.5, -6.5]); ctx.fill(); poly(ctx, [1, -8.5, 2, -8.5, 1.5, -6.5]); ctx.fill();
    ctx.fillStyle = 'rgba(255,130,170,0.5)'; ell(ctx, -4.5, -9.5, 1.6, 1); ctx.fill(); ell(ctx, 4.5, -9.5, 1.6, 1); ctx.fill();
    return setHead(0, -24);
  },
  turtle(ctx, o, t) {
    const wp = o.walkPhase || 0;
    const SH = '#4f9a4a', SHD = '#36732f', SK = '#9ad46b';
    legs4(ctx, [-10, 9], -5, wp * 0.7, '#78b452', 6, 2);
    ell(ctx, -17, -6, 3.5, 2); fs(ctx, SK, 1.8); // tail
    // head (bobbing slowly)
    const hb = Math.sin(t * 2) * 1;
    ell(ctx, 18, -11 + hb, 6.5, 5.5); fs(ctx, SK, 2.2);
    eye(ctx, 20, -12.5 + hb, 1.8);
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(21, -9.5 + hb, 2, 0.2, 1.4); ctx.stroke();
    ctx.fillStyle = 'rgba(255,130,150,0.5)'; ell(ctx, 18, -8.5 + hb, 1.6, 1); ctx.fill();
    // shell
    ctx.beginPath(); ctx.ellipse(0, -8, 16, 17, 0, Math.PI, 0); ctx.closePath(); fs(ctx, SH, 2.5);
    ctx.strokeStyle = C(SHD); ctx.lineWidth = 1.8;
    ctx.beginPath();
    poly(ctx, [-5, -20, 5, -20, 8, -13, 5, -9, -5, -9, -8, -13]); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, -13); ctx.lineTo(-15, -12); ctx.moveTo(8, -13); ctx.lineTo(15, -12); ctx.moveTo(-5, -20); ctx.lineTo(-8, -24); ctx.moveTo(5, -20); ctx.lineTo(8, -24); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ell(ctx, -6, -19, 4, 2.2, -0.5); ctx.fill();
    rr(ctx, -17, -10, 34, 5, 2.5); fs(ctx, '#d6c27a', 2);
    legs4(ctx, [-6, 13], -5, wp * 0.7 + 1, SK, 6, 2);
    return setHead(0, -26);
  },
  hedgehog(ctx, o, t) {
    const wp = o.walkPhase || 0;
    legs4(ctx, [-6, 6], -5, wp, '#5a3a24', 3.5, 2);
    // body base
    ell(ctx, 0, -9, 14, 8); fs(ctx, '#c79a6a', 2.3);
    // spikes
    ctx.beginPath();
    const n = 9;
    ctx.moveTo(-15, -6);
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (i / n) * Math.PI * 0.82;
      const r1 = 15 + (i % 2 ? 0 : 6);
      ctx.lineTo(Math.cos(a) * r1 - 1, -8 + Math.sin(a) * r1 * 0.95);
    }
    ctx.lineTo(7, -10); ctx.quadraticCurveTo(-2, -6, -15, -6); ctx.closePath();
    fs(ctx, '#6e4a2c', 2.3);
    ctx.strokeStyle = C('#a07850'); ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = Math.PI + 0.3 + i * 0.4; ctx.moveTo(Math.cos(a) * 6 - 1, -9 + Math.sin(a) * 6); ctx.lineTo(Math.cos(a) * 13 - 1, -9 + Math.sin(a) * 12); }
    ctx.stroke();
    // face / snout
    ctx.beginPath(); ctx.moveTo(4, -17); ctx.quadraticCurveTo(14, -14, 19, -9); ctx.quadraticCurveTo(14, -4, 4, -4); ctx.closePath();
    fs(ctx, '#ecd0a6', 2.2);
    circ(ctx, 19, -9, 2.2); fillOnly(ctx, '#1d1328');
    eye(ctx, 10, -11.5, 1.8);
    ctx.fillStyle = 'rgba(255,130,150,0.55)'; ell(ctx, 10, -7, 1.8, 1.1); ctx.fill();
    circ(ctx, 5, -15.5, 2.2); fs(ctx, '#ecd0a6', 1.6);
    return setHead(-1, -25);
  },
  raven(ctx, o, t) {
    const flap = Math.sin(t * 8);
    const K = '#262338', KL = '#4a5a9a';
    // far wing
    ctx.save(); ctx.translate(-1, -15); ctx.rotate(-0.6 - flap * 0.6);
    ell(ctx, -9, 0, 11, 4.5); fs(ctx, '#1a1828', 2);
    ctx.restore();
    // tail
    poly(ctx, [-9, -12, -21, -16, -22, -9, -20, -6, -9, -8]); fs(ctx, K, 2.2);
    ell(ctx, 0, -12, 11, 7, -0.12); fs(ctx, K, 2.5);
    ctx.strokeStyle = C(KL); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, -12, 8, 4, -0.12, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
    // feet tucked
    ctx.strokeStyle = C('#e09a2a'); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-1, -5); ctx.lineTo(-3, -2); ctx.moveTo(3, -5); ctx.lineTo(2, -2); ctx.stroke();
    // head
    circ(ctx, 10, -18, 6.8); fs(ctx, K, 2.3);
    poly(ctx, [15, -20.5, 24, -17, 15, -14.5]); fs(ctx, '#f0a52a', 1.8);
    circ(ctx, 11.5, -19.5, 2.4); fillOnly(ctx, '#ffffff');
    circ(ctx, 12.3, -19.5, 1.3); fillOnly(ctx, '#1d1328');
    // near wing
    ctx.save(); ctx.translate(0, -15); ctx.rotate(-0.4 - flap * 0.75);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-8, -10, -20, -6); ctx.lineTo(-17, -3); ctx.lineTo(-20, -1); ctx.lineTo(-15, 1); ctx.lineTo(-16, 4); ctx.quadraticCurveTo(-6, 5, 0, 0); ctx.closePath();
    fs(ctx, '#332f4a', 2.2);
    ctx.restore();
    return setHead(10, -25);
  },
};

export const PET_LIST = Object.keys(PETS);

export function drawPet(ctx, id, x, y, o = {}) {
  const fn = PETS[id];
  if (!fn) return;
  const t = o.t || 0, level = o.level || 1;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  setTint(o.hitFlash || 0, 0);
  const seed = (id.charCodeAt(0) + id.length) * 1.7;
  let lift = 0;
  if (FLIERS[id]) {
    const base = o.icon ? 8 : id === 'bat' ? 30 - (o.action || 0) * 16 : 28;
    lift = base + Math.sin(t * 4 + seed) * 3;
    if (o.shadow) drawShadow(ctx, x, y, id === 'bat' ? 20 : 24, 0.8);
  } else {
    if (o.shadow) drawShadow(ctx, x, y, id === 'bear' ? 42 : 34);
  }
  ctx.translate(x, y - lift);
  const flip = o.dir === 'left' && !FRONTAL[id];
  if (flip) ctx.scale(-1, 1);
  // idle breathing bob for walkers
  if (!FLIERS[id]) ctx.translate(0, -Math.abs(Math.sin(o.walkPhase || 0)) * 1.2);
  const head = fn(ctx, o, t);
  if (level >= 2) {
    const hx = head.x, hy = head.y;
    if (level >= 3) {
      // tiny crown
      ctx.save(); ctx.translate(hx, hy + 2);
      poly(ctx, [-6, 0, -6, -7, -3, -3.5, 0, -8, 3, -3.5, 6, -7, 6, 0]); fs(ctx, '#ffd23a', 1.8);
      ctx.fillStyle = '#ff4a7a'; circ(ctx, 0, -2, 1.3); ctx.fill();
      ctx.restore();
    }
    // star badge floating behind the head
    const bob = Math.sin(t * 3 + seed) * 1.5;
    const bx = hx - 12, by = hy - 2 + bob;
    starPath(ctx, bx, by, 5.5, 2.5, 5); fs(ctx, level >= 3 ? '#ffd23a' : '#dfe7f0', 1.6);
    if (level >= 3) sparkle(ctx, bx + 5, by - 5, 2 + Math.sin(t * 6) * 1.2, '#fffbd0');
  }
  setTint(0, 0);
  ctx.restore();
}
