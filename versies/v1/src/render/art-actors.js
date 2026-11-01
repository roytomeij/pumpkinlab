// Player, clubs and monsters.
import { MONSTER_RISE_TIME } from '../config.js';
import {
  OUT, TAU, C, setTint, hash, clamp01, ell, circ, rr, poly, fs, fillOnly, limb, starPath, sparkle,
  drawShadow, bone, easeOut,
} from './art-util.js';

// ---------------------------------------------------------------------------
// Clubs
// ---------------------------------------------------------------------------
export const CLUB_PAL = [
  { id: 'wood',  handle: '#8a5530', head: '#b9773c', dark: '#7a4a22', light: '#dca46a', glow: '#ffcf8a' },
  { id: 'stone', handle: '#8a5530', head: '#9ea6b0', dark: '#6c737d', light: '#d0d6dc', glow: '#d8e4f0' },
  { id: 'iron',  handle: '#3c4250', head: '#7f8b9b', dark: '#525c6b', light: '#c3ccd8', glow: '#a8c8ff' },
  { id: 'gold',  handle: '#b8862a', head: '#ffcc33', dark: '#d19a1c', light: '#fff1a6', glow: '#ffe66a' },
];
export function clubTierOf(id) {
  if (typeof id === 'number') return Math.max(0, Math.min(3, id | 0));
  const i = CLUB_PAL.findIndex((p) => p.id === id);
  return i < 0 ? 0 : i;
}

/** Club drawn along +x: grip at 0, tip at len. */
export function drawClub(ctx, tier, len, boosted, t) {
  const P = CLUB_PAL[tier] || CLUB_PAL[0];
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (boosted) {
    ctx.fillStyle = 'rgba(255,240,150,0.35)';
    circ(ctx, len * 0.78, 0, 14 + Math.sin(t * 10) * 1.5); ctx.fill();
  }
  // handle
  rr(ctx, -7, -2.6, len * 0.55 + 7, 5.2, 2.6); fs(ctx, P.handle, 2.2);
  // grip wrap
  ctx.strokeStyle = C(tier === 2 ? '#20242e' : '#5a3418'); ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) { ctx.moveTo(-4 + k * 4, -2.4); ctx.lineTo(-2 + k * 4, 2.4); }
  ctx.stroke();
  const hx0 = len * 0.36, hx1 = len * 0.86;
  if (tier === 1) {
    // stone head lashed onto the stick
    ctx.beginPath();
    const cx = len * 0.76, r = 9.5;
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * TAU, rr2 = r * (0.82 + hash(k * 3.1) * 0.3);
      const X = cx + Math.cos(a) * rr2 * 1.25, Y = Math.sin(a) * rr2;
      k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.closePath(); fs(ctx, P.head, 2.4);
    ctx.fillStyle = C(P.light); ell(ctx, cx - 3, -4, 4, 2, -0.2); ctx.fill();
    ctx.fillStyle = C(P.dark); circ(ctx, cx + 5, 3, 1.8); ctx.fill(); circ(ctx, cx - 2, 4, 1.2); ctx.fill();
    // rope
    ctx.strokeStyle = C('#d8b77a'); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(cx - 12, -5); ctx.lineTo(cx - 6, 6); ctx.moveTo(cx - 8, -7); ctx.lineTo(cx - 13, 5); ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(hx0, -3);
    ctx.quadraticCurveTo(len * 0.62, -4.5, hx1, -7.5);
    ctx.arc(hx1, 0, 7.5, -Math.PI / 2, Math.PI / 2);
    ctx.quadraticCurveTo(len * 0.62, 4.5, hx0, 3);
    ctx.closePath();
    fs(ctx, P.head, 2.4);
    // highlight
    ctx.strokeStyle = C(P.light); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hx0 + 4, -2); ctx.quadraticCurveTo(len * 0.65, -3, hx1 + 1, -5); ctx.stroke();
    if (tier === 0) {
      ctx.fillStyle = C(P.dark);
      ell(ctx, len * 0.62, 1.5, 2, 1.4); ctx.fill(); ell(ctx, len * 0.84, 2.5, 1.6, 1.2); ctx.fill();
    } else if (tier === 2) {
      // band + studs
      ctx.fillStyle = C(P.dark); rr(ctx, len * 0.52, -5, 4, 10, 1); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
      for (const [sx, sy] of [[len * 0.72, -6.5], [len * 0.88, -8.2], [len * 0.92, 7.5], [hx1 + 7.5, 0], [len * 0.75, 6.2]]) {
        circ(ctx, sx, sy, 2.1); fs(ctx, P.light, 1.3);
      }
    } else if (tier === 3) {
      // gold shine + gem
      circ(ctx, hx1, 0, 2.8); fs(ctx, '#ff4a7a', 1.3);
      const tw = 0.5 + 0.5 * Math.sin(t * 6);
      sparkle(ctx, hx1 - 3, -8, 3 + tw * 3, `rgba(255,255,255,${0.6 + 0.4 * tw})`);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(len * 0.5, -1.5); ctx.lineTo(len * 0.58, -2.5); ctx.stroke();
    }
  }
  if (boosted) {
    for (let i = 0; i < 3; i++) {
      const a = t * 4 + (i * TAU) / 3;
      const s = 2.5 + 1.5 * Math.sin(t * 8 + i * 2);
      sparkle(ctx, len * 0.75 + Math.cos(a) * 14, Math.sin(a) * 11, s, '#fffbd0');
    }
  }
}

// ---------------------------------------------------------------------------
// Player (~56 px tall). Kid in a purple bat-ear hoodie with a headlamp.
// ---------------------------------------------------------------------------
const SKIN = '#f6c9a0', HOOD = '#8a4fe0', HOOD_D = '#6634b4', HOOD_L = '#b48cf5', PANTS = '#34405f',
  SHOE = '#3fc46a', HAIR = '#6b3a1d', LAMP = '#ffe066';
const FACE_ANG = { down: Math.PI / 2, up: -Math.PI / 2, right: 0, left: 0 };

export function drawPlayer(ctx, x, y, o = {}) {
  const dir = o.dir || 'down', wp = o.walkPhase || 0, t = o.t || 0;
  const tier = clubTierOf(o.clubTier || 0);
  const swing = typeof o.swingT === 'number' && o.swingT >= 0 && o.swingT <= 1 ? o.swingT : -1;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (o.shadow) drawShadow(ctx, x, y, 36);
  ctx.translate(x, y);
  // headlamp light pool on the floor
  const lp = { down: [0, 30, 26, 11], up: null, right: [38, 2, 22, 10], left: [-38, 2, 22, 10] }[dir];
  if (lp) { ctx.fillStyle = 'rgba(255,240,150,0.10)'; ell(ctx, lp[0], lp[1], lp[2], lp[3]); ctx.fill(); }
  if (dir === 'left') ctx.scale(-1, 1);
  const hurt = typeof o.hurt === 'number' ? o.hurt : o.hurt ? 1 : 0;
  setTint(0, hurt);
  const bob = Math.abs(Math.sin(wp)) * 1.6;

  // club geometry
  let hx, hy, ang;
  const sh = { x: dir === 'up' ? -6 : dir === 'down' ? 6 : 2, y: -28 + bob * -1 };
  if (swing >= 0) {
    const e = easeOut(swing);
    const phi = FACE_ANG[dir];
    ang = phi - 1.22 + 2.44 * e;
    hx = sh.x + Math.cos(ang) * 12; hy = sh.y + Math.sin(ang) * 10;
  } else {
    if (dir === 'down') { hx = 13; hy = -18; ang = -1.15; }
    else if (dir === 'up') { hx = -13; hy = -18; ang = -2.0; }
    else { hx = 7; hy = -18; ang = -0.95; }
    hy -= bob;
    ang += Math.sin(wp) * 0.08;
  }
  const clubLen = 34;
  const drawClubNow = () => {
    if (swing >= 0) drawTrail(ctx, sh, FACE_ANG[dir] - 1.22, ang, swing, tier);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang); drawClub(ctx, tier, clubLen, !!o.boosted, t); ctx.restore();
    // hand holding it
    circ(ctx, hx, hy, 3.8); fs(ctx, SKIN, 2);
  };
  const clubBehind = dir === 'up';
  if (clubBehind) { limb(ctx, sh.x, sh.y, hx, hy, 5.5, HOOD); drawClubNow(); }

  ctx.save(); ctx.translate(0, -bob);
  if (dir === 'down' || dir === 'up') drawKidFrontBack(ctx, dir, wp, bob);
  else drawKidSide(ctx, wp, bob);
  ctx.restore();

  if (!clubBehind) { limb(ctx, sh.x, sh.y, hx, hy, 5.5, HOOD); drawClubNow(); }
  setTint(0, 0);
  ctx.restore();
}

function drawTrail(ctx, sh, a0, a1, swing, tier) {
  if (a1 - a0 < 0.05) return;
  const al = 1 - swing;
  const col = tier === 3 ? '255,230,120' : '255,255,255';
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.strokeStyle = `rgba(${col},${0.22 * al})`; ctx.lineWidth = 16;
  ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 36, 30, 0, a0, a1); ctx.stroke();
  ctx.strokeStyle = `rgba(${col},${0.65 * al})`; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 44, 37, 0, Math.max(a0, a1 - 1.6), a1); ctx.stroke();
  ctx.restore();
}

function legsFront(ctx, wp) {
  const l1 = Math.max(0, Math.sin(wp)) * 3, l2 = Math.max(0, -Math.sin(wp)) * 3;
  for (const [lx, lift] of [[-5, l1], [5, l2]]) {
    rr(ctx, lx - 3.8, -15 - lift, 7.6, 13, 3); fs(ctx, PANTS, 2.2);
    ell(ctx, lx + (lx < 0 ? -1 : 1), -2.5 - lift, 5.2, 3.4); fs(ctx, SHOE, 2.2);
  }
}

function drawKidFrontBack(ctx, dir, wp, bob) {
  const front = dir === 'down';
  legsFront(ctx, wp);
  // free arm (screen left for down, screen right for up)
  const ax = front ? -12.5 : 12.5, swingA = Math.sin(wp) * 2;
  limb(ctx, ax * 0.85, -28, ax, -17 + swingA, 5.5, HOOD);
  circ(ctx, ax, -16 + swingA, 3.6); fs(ctx, SKIN, 2);
  // torso
  rr(ctx, -11, -34, 22, 22, 7); fs(ctx, HOOD, 2.5);
  rr(ctx, -11, -16, 22, 4.5, 2); fs(ctx, HOOD_D, 2);
  if (front) {
    rr(ctx, -7, -24, 14, 7, 3); ctx.strokeStyle = C(HOOD_D); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.strokeStyle = C(HOOD_L); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(0, -25); ctx.stroke();
    // hood strings
    ctx.strokeStyle = C('#f3f0ff'); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-3.5, -33); ctx.lineTo(-4, -26); ctx.moveTo(3.5, -33); ctx.lineTo(4, -26); ctx.stroke();
  } else {
    ell(ctx, 0, -31, 9, 5); fs(ctx, HOOD_D, 2);
  }
  // head
  const hy = -44;
  for (const s of [-1, 1]) { // bat ears on the hood
    poly(ctx, [s * 7, hy - 10, s * 16, hy - 20, s * 14, hy - 6]); fs(ctx, HOOD_D, 2.2);
  }
  circ(ctx, 0, hy, 15); fs(ctx, HOOD, 2.5);
  if (front) {
    ell(ctx, 0, hy + 2, 10.8, 10.2); fs(ctx, SKIN, 2.2);
    // hair bangs
    ctx.beginPath();
    ctx.moveTo(-10.5, hy - 1); ctx.quadraticCurveTo(-9, hy - 10, 0, hy - 9.5); ctx.quadraticCurveTo(9, hy - 10, 10.5, hy - 1);
    ctx.quadraticCurveTo(6, hy - 5, 2, hy - 4); ctx.lineTo(0, hy - 6); ctx.quadraticCurveTo(-4, hy - 3, -10.5, hy - 1);
    fillOnly(ctx, HAIR);
    // eyes
    ctx.fillStyle = C('#1d1328');
    ell(ctx, -4, hy + 2, 1.9, 2.6); ctx.fill(); ell(ctx, 4, hy + 2, 1.9, 2.6); ctx.fill();
    ctx.fillStyle = '#ffffff'; circ(ctx, -3.4, hy + 1, 0.8); ctx.fill(); circ(ctx, 4.6, hy + 1, 0.8); ctx.fill();
    ctx.fillStyle = C('#ff8fa3'); ell(ctx, -7, hy + 6, 2.2, 1.4); ctx.fill(); ell(ctx, 7, hy + 6, 2.2, 1.4); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, hy + 5.5, 2.8, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();
    // headlamp
    ctx.strokeStyle = C('#2b2b3a'); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-14, hy - 4); ctx.quadraticCurveTo(0, hy - 11, 14, hy - 4); ctx.stroke();
    rr(ctx, -4.5, hy - 13, 9, 6.5, 2); fs(ctx, '#5a5f6e', 1.8);
    ctx.fillStyle = 'rgba(255,240,150,0.35)'; circ(ctx, 0, hy - 9.5, 6); ctx.fill();
    circ(ctx, 0, hy - 9.8, 2.4); ctx.fillStyle = LAMP; ctx.fill();
  } else {
    // back of hood seam + headlamp strap
    ctx.strokeStyle = C(HOOD_D); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, hy - 14); ctx.quadraticCurveTo(2, hy, 0, hy + 13); ctx.stroke();
    ctx.strokeStyle = C('#2b2b3a'); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-14.5, hy - 3); ctx.quadraticCurveTo(0, hy + 1, 14.5, hy - 3); ctx.stroke();
    rr(ctx, -3, hy - 3, 6, 4, 1.5); fs(ctx, '#5a5f6e', 1.4);
  }
}

function drawKidSide(ctx, wp, bob) {
  // legs (side): rotate around hip
  const s = Math.sin(wp) * 0.55;
  for (const [a, col] of [[-s, '#2a344f'], [s, PANTS]]) {
    ctx.save(); ctx.translate(0, -13); ctx.rotate(a);
    rr(ctx, -3.6, -1, 7.2, 12.5, 3); fs(ctx, col, 2.2);
    ell(ctx, 2.5, 11.5, 5.5, 3.2); fs(ctx, SHOE, 2.2);
    ctx.restore();
  }
  // back arm
  const ab = -Math.sin(wp) * 3;
  limb(ctx, -2, -28, -5 + ab, -17, 5, HOOD_D);
  // torso
  rr(ctx, -8.5, -34, 17, 22, 7); fs(ctx, HOOD, 2.5);
  rr(ctx, -8.5, -16, 17, 4.5, 2); fs(ctx, HOOD_D, 2);
  rr(ctx, 1, -24, 7, 6, 2.5); ctx.strokeStyle = C(HOOD_D); ctx.lineWidth = 1.5; ctx.stroke();
  // head
  const hy = -44;
  poly(ctx, [-6, hy - 10, -13, hy - 21, -12, hy - 6]); fs(ctx, HOOD_D, 2.2);
  circ(ctx, -1, hy, 14.5); fs(ctx, HOOD, 2.5);
  ell(ctx, 4.5, hy + 2, 8.2, 9.6); fs(ctx, SKIN, 2.2);
  ctx.beginPath();
  ctx.moveTo(-3, hy - 6); ctx.quadraticCurveTo(4, hy - 11, 12.5, hy - 2); ctx.quadraticCurveTo(7, hy - 5, 3, hy - 3); ctx.closePath();
  fillOnly(ctx, HAIR);
  ctx.fillStyle = C('#1d1328'); ell(ctx, 7.5, hy + 2, 1.9, 2.6); ctx.fill();
  ctx.fillStyle = '#ffffff'; circ(ctx, 8, hy + 1, 0.8); ctx.fill();
  ctx.fillStyle = C('#ff8fa3'); ell(ctx, 5, hy + 6.5, 2.2, 1.4); ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(9, hy + 6, 2.2, 0.3 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  // headlamp
  ctx.strokeStyle = C('#2b2b3a'); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-14, hy - 2); ctx.quadraticCurveTo(0, hy - 10, 10, hy - 8); ctx.stroke();
  rr(ctx, 8, hy - 13, 6.5, 8, 2); fs(ctx, '#5a5f6e', 1.8);
  ctx.fillStyle = 'rgba(255,240,150,0.35)'; circ(ctx, 15, hy - 9, 6); ctx.fill();
  ell(ctx, 14.5, hy - 9, 1.5, 2.6); ctx.fillStyle = LAMP; ctx.fill();
}

// ---------------------------------------------------------------------------
// Monsters
// ---------------------------------------------------------------------------
const BONE = '#f4efe2';

export function drawMonster(ctx, type, x, y, o = {}) {
  const state = o.state || 'chase';
  if (state === 'dead') return;
  const t = o.t || 0;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  let rise = 1;
  if (state === 'rising') {
    // stateT counts down from MONSTER_RISE_TIME to 0 (like 'revealed'); also accept counting up.
    const st = o.stateT || 0;
    rise = clamp01(1 - st / MONSTER_RISE_TIME);
    if (o.riseUp) rise = clamp01(st / MONSTER_RISE_TIME);
  }
  if (type === 'ghost') drawGhostMonster(ctx, x, y, o, rise, t);
  else {
    ctx.translate(x, y);
    if (state === 'rising') drawRiseDebris(ctx, rise, t, false);
    if (o.shadow) drawShadow(ctx, 0, 0, type === 'zombie' ? 34 : 30, state === 'rising' ? rise : 1);
    ctx.save();
    if (state === 'rising') {
      ctx.beginPath(); ctx.rect(-60, -120, 120, 120 + RIM_Y + 2 + (rise > 0.8 ? ((rise - 0.8) / 0.2) * 12 : 0)); ctx.clip();
      ctx.translate(0, (1 - easeOut(rise)) * 58);
    }
    setTint(o.hitFlash || 0, 0);
    if (type === 'zombie') drawZombie(ctx, o, t);
    else drawSkeleton(ctx, o, t);
    setTint(0, 0);
    ctx.restore();
    if (state === 'rising') drawRiseDebris(ctx, rise, t, true);
  }
  ctx.restore();
}

/** Broken pumpkin bowl the monster climbs out of (back half before, front half after the monster). */
const RIM_Y = -9;
function drawRiseDebris(ctx, p, t, front) {
  const fade = p > 0.8 ? (1 - p) / 0.2 : 1;
  ctx.save();
  ctx.globalAlpha *= fade;
  if (!front) {
    // back wall of the shell + dark inside
    ctx.beginPath();
    ctx.moveTo(-21, RIM_Y);
    ctx.lineTo(-17, RIM_Y - 9); ctx.lineTo(-12, RIM_Y - 4); ctx.lineTo(-7, RIM_Y - 12); ctx.lineTo(-1, RIM_Y - 5);
    ctx.lineTo(5, RIM_Y - 13); ctx.lineTo(10, RIM_Y - 5); ctx.lineTo(16, RIM_Y - 10); ctx.lineTo(21, RIM_Y);
    ctx.closePath();
    fs(ctx, '#e0701a', 2.2);
    ell(ctx, 0, RIM_Y, 20, 6.5); fs(ctx, '#7a2e08', 2);
    ell(ctx, 0, RIM_Y + 1, 15, 4.2); ctx.fillStyle = '#3a1404'; ctx.fill();
    // glow from inside
    ctx.fillStyle = `rgba(255,190,80,${0.35 * (1 - p)})`; ell(ctx, 0, RIM_Y - 4, 16, 9); ctx.fill();
  } else {
    // front half bowl with a jagged rim
    ctx.beginPath();
    ctx.moveTo(-21, RIM_Y);
    ctx.lineTo(-15, RIM_Y + 4); ctx.lineTo(-10, RIM_Y + 1); ctx.lineTo(-5, RIM_Y + 6); ctx.lineTo(0, RIM_Y + 3);
    ctx.lineTo(5, RIM_Y + 7); ctx.lineTo(10, RIM_Y + 2); ctx.lineTo(15, RIM_Y + 5); ctx.lineTo(21, RIM_Y);
    ctx.ellipse(0, RIM_Y, 21, 9 - RIM_Y * 0.1 + 1, 0, 0, Math.PI, false);
    ctx.closePath();
    fs(ctx, '#f6922a', 2.4);
    ctx.strokeStyle = C('#c95d12'); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-9, RIM_Y + 5); ctx.quadraticCurveTo(-11, RIM_Y + 9, -9, RIM_Y + 12); ctx.moveTo(9, RIM_Y + 5); ctx.quadraticCurveTo(11, RIM_Y + 9, 9, RIM_Y + 12); ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,200,0.4)'; ell(ctx, -12, RIM_Y + 6, 3, 1.6, -0.3); ctx.fill();
    // shards + seeds popping out at the start
    if (p < 0.6) {
      const q = p / 0.6;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (hash(i * 3.3) - 0.5) * 2.6, d = q * (22 + hash(i) * 18);
        const px = Math.cos(a) * d, py = RIM_Y - 6 + Math.sin(a) * d * 0.9 + q * q * 34;
        ctx.globalAlpha = fade * (1 - q);
        if (i % 2) { ell(ctx, px, py, 2.4, 1.5, a); ctx.fillStyle = '#f7ecc4'; ctx.fill(); }
        else { poly(ctx, [px - 3, py - 2, px + 3, py - 3, px + 1, py + 3]); ctx.fillStyle = '#f08a24'; ctx.fill(); }
      }
    }
  }
  ctx.restore();
}

function faceOffset(dir) { return dir === 'left' ? -3.5 : dir === 'right' ? 3.5 : 0; }

function drawSkeleton(ctx, o, t) {
  const dir = o.dir || 'down', wp = o.walkPhase || 0;
  const rattle = Math.sin(t * 31) * 0.7;
  const fo = faceOffset(dir), back = dir === 'up';
  const lean = dir === 'left' ? -0.06 : dir === 'right' ? 0.06 : 0;
  const s = Math.sin(wp);
  // legs
  bone(ctx, -4, -16, -5 + s * 3, -3 - Math.max(0, s) * 2, 3.2, BONE);
  bone(ctx, 4, -16, 5 - s * 3, -3 - Math.max(0, -s) * 2, 3.2, BONE);
  ell(ctx, -6 + s * 3, -2 - Math.max(0, s) * 2, 4.5, 2.6); fs(ctx, BONE, 2);
  ell(ctx, 6 - s * 3, -2 - Math.max(0, -s) * 2, 4.5, 2.6); fs(ctx, BONE, 2);
  ctx.save(); ctx.rotate(lean); ctx.translate(rattle * 0.4, 0);
  // pelvis
  ell(ctx, 0, -17, 8, 4); fs(ctx, BONE, 2.2);
  // spine
  limb(ctx, 0, -18, 0, -28, 3, BONE);
  // ribcage
  ctx.beginPath(); ctx.moveTo(-9, -36); ctx.quadraticCurveTo(-11, -26, -5, -22); ctx.lineTo(5, -22); ctx.quadraticCurveTo(11, -26, 9, -36); ctx.closePath();
  fs(ctx, BONE, 2.3);
  ctx.strokeStyle = C('#9a8f80'); ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) { ctx.moveTo(-8 + k * 0.8, -33 + k * 3.5); ctx.lineTo(8 - k * 0.8, -33 + k * 3.5); }
  ctx.stroke();
  ctx.strokeStyle = C('#9a8f80'); ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(0, -23); ctx.stroke();
  // arms (dangly, swinging)
  const as = Math.sin(wp + 1) * 4;
  bone(ctx, -9, -34, -13, -24 + as * 0.3, 2.6, BONE);
  bone(ctx, -13, -24 + as * 0.3, -12 + as, -15, 2.4, BONE);
  bone(ctx, 9, -34, 13, -24 - as * 0.3, 2.6, BONE);
  bone(ctx, 13, -24 - as * 0.3, 12 - as, -15, 2.4, BONE);
  circ(ctx, -12 + as, -14, 2.6); fs(ctx, BONE, 1.8);
  circ(ctx, 12 - as, -14, 2.6); fs(ctx, BONE, 1.8);
  // skull (big, cute)
  ctx.translate(rattle * 0.6, Math.abs(rattle) * -0.5);
  const hy = -47;
  rr(ctx, -7 + fo * 0.5, hy + 7, 14, 7, 3); fs(ctx, BONE, 2.2); // jaw
  circ(ctx, 0, hy, 12.5); fs(ctx, BONE, 2.5);
  if (!back) {
    ctx.fillStyle = C('#2a1d34');
    ell(ctx, -4.5 + fo, hy + 1, 3.8, 4.3); ctx.fill(); ell(ctx, 4.5 + fo, hy + 1, 3.8, 4.3); ctx.fill();
    ctx.fillStyle = C('#8dff7a'); circ(ctx, -4 + fo, hy + 1.5, 1.4); ctx.fill(); circ(ctx, 5 + fo, hy + 1.5, 1.4); ctx.fill();
    poly(ctx, [fo, hy + 5, fo - 1.6, hy + 8, fo + 1.6, hy + 8]); ctx.fillStyle = C('#2a1d34'); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-5 + fo * 0.5, hy + 10.5); ctx.lineTo(5 + fo * 0.5, hy + 10.5);
    for (let k = -1; k <= 1; k++) { ctx.moveTo(k * 2.8 + fo * 0.5, hy + 8.5); ctx.lineTo(k * 2.8 + fo * 0.5, hy + 12.5); }
    ctx.stroke();
  } else {
    ctx.strokeStyle = C('#cfc6b4'); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-3, hy - 9); ctx.lineTo(0, hy - 4); ctx.lineTo(3, hy - 7); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ell(ctx, -5, hy - 7, 3.5, 2, -0.5); ctx.fill();
  ctx.restore();
}

function drawZombie(ctx, o, t) {
  const dir = o.dir || 'down', wp = o.walkPhase || 0;
  const SK = '#8fd16a', SKD = '#5f9a44', SHIRT = '#4f7fb0', PANT = '#6a5240';
  const sway = Math.sin(wp) * 0.06;
  const side = dir === 'left' || dir === 'right';
  if (dir === 'left') ctx.scale(-1, 1);
  const s = Math.sin(wp);
  if (side) {
    // legs shuffle
    for (const [a, col] of [[-s * 0.35, '#4f3c2e'], [s * 0.35, PANT]]) {
      ctx.save(); ctx.translate(0, -16); ctx.rotate(a);
      rr(ctx, -4, -1, 8, 15, 2); fs(ctx, col, 2.2);
      poly(ctx, [-4, 12, -2, 14, 0, 12, 2, 14, 4, 12, 4, 14, -4, 14]); fillOnly(ctx, SK);
      ell(ctx, 2, 15, 6, 3.2); fs(ctx, '#3a2f2a', 2);
      ctx.restore();
    }
    ctx.save(); ctx.rotate(sway);
    // back arm reaching forward
    limb(ctx, 2, -38, 20, -36 + Math.sin(t * 3) * 1.5, 5.5, SKD);
    // torso
    ctx.beginPath(); ctx.moveTo(-9, -42); ctx.lineTo(9, -42); ctx.lineTo(10, -20);
    ctx.lineTo(6, -16); ctx.lineTo(3, -20); ctx.lineTo(0, -15); ctx.lineTo(-4, -19); ctx.lineTo(-7, -15); ctx.lineTo(-10, -20); ctx.closePath();
    fs(ctx, SHIRT, 2.5);
    ctx.fillStyle = C(SK); poly(ctx, [2, -30, 6, -27, 3, -24]); ctx.fill();
    // head
    zombieHead(ctx, 3, -52, true);
    // front arm
    limb(ctx, 0, -37, 22, -33 + Math.sin(t * 3 + 1) * 1.5, 6, SHIRT);
    limb(ctx, 14, -34.5, 22, -33 + Math.sin(t * 3 + 1) * 1.5, 5.5, SK);
    circ(ctx, 24, -33 + Math.sin(t * 3 + 1) * 1.5, 3.8); fs(ctx, SK, 2);
    ctx.restore();
  } else {
    const back = dir === 'up';
    for (const [lx, lift] of [[-5, Math.max(0, s) * 2.5], [5, Math.max(0, -s) * 2.5]]) {
      rr(ctx, lx - 4, -18 - lift, 8, 15, 2); fs(ctx, PANT, 2.2);
      ell(ctx, lx, -2.5 - lift, 5.5, 3.3); fs(ctx, '#3a2f2a', 2);
    }
    ctx.save(); ctx.rotate(sway);
    if (back) { // arms reaching away: behind body
      limb(ctx, -9, -38, -8, -50, 5.5, SK); limb(ctx, 9, -38, 8, -50, 5.5, SK);
    }
    ctx.beginPath(); ctx.moveTo(-11, -42); ctx.lineTo(11, -42); ctx.lineTo(12, -20);
    ctx.lineTo(8, -16); ctx.lineTo(4, -20); ctx.lineTo(0, -15); ctx.lineTo(-4, -19); ctx.lineTo(-8, -15); ctx.lineTo(-12, -20); ctx.closePath();
    fs(ctx, SHIRT, 2.5);
    if (!back) {
      ctx.fillStyle = C(SK); poly(ctx, [-6, -32, -1, -29, -5, -25]); ctx.fill();
      ctx.strokeStyle = C('#2f557c'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(4, -40); ctx.lineTo(5, -26); ctx.stroke();
    }
    zombieHead(ctx, 0, -52, false, back);
    if (!back) { // arms stretched towards the viewer
      const a = Math.sin(t * 3) * 1.5;
      for (const sx of [-1, 1]) {
        limb(ctx, sx * 11, -39, sx * 9, -27 + a * sx, 6, SHIRT);
        circ(ctx, sx * 8.5, -24 + a * sx, 5); fs(ctx, SK, 2.2);
        ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(sx * 8.5 - 2, -21 + a * sx); ctx.lineTo(sx * 8.5 - 2, -19.5 + a * sx); ctx.moveTo(sx * 8.5 + 1.5, -21 + a * sx); ctx.lineTo(sx * 8.5 + 1.5, -19.5 + a * sx); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function zombieHead(ctx, hx, hy, side, back = false) {
  const SK = '#8fd16a';
  rr(ctx, hx - 12, hy - 12, 24, 23, 9); fs(ctx, SK, 2.5);
  // messy hair
  ctx.beginPath();
  ctx.moveTo(hx - 12, hy - 3); ctx.lineTo(hx - 10, hy - 12); ctx.lineTo(hx - 3, hy - 15); ctx.lineTo(hx, hy - 10);
  ctx.lineTo(hx + 4, hy - 16); ctx.lineTo(hx + 8, hy - 11); ctx.lineTo(hx + 12, hy - 12); ctx.lineTo(hx + 12, hy - 5);
  ctx.quadraticCurveTo(hx, hy - 9, hx - 12, hy - 3); ctx.closePath();
  fs(ctx, '#3d2c3a', 2);
  if (back) return;
  if (side) {
    circ(ctx, hx + 5, hy + 0, 4.4); fs(ctx, '#fffbe8', 1.8);
    circ(ctx, hx + 6.5, hy + 0.5, 1.7); ctx.fillStyle = C(OUT); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(hx + 2, hy + 7); ctx.lineTo(hx + 11, hy + 6); ctx.stroke();
    rr(ctx, hx + 6, hy + 6.5, 2.5, 3, 0.5); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = C('#3d6b2c'); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(hx - 6, hy - 4); ctx.lineTo(hx - 6, hy + 4); for (let k = 0; k < 3; k++) { ctx.moveTo(hx - 8, hy - 2 + k * 3); ctx.lineTo(hx - 4, hy - 2 + k * 3); } ctx.stroke();
  } else {
    circ(ctx, hx - 5, hy + 0, 4.6); fs(ctx, '#fffbe8', 1.8);
    circ(ctx, hx + 5.5, hy + 0.5, 3); fs(ctx, '#fffbe8', 1.8);
    ctx.fillStyle = C(OUT); circ(ctx, hx - 4.5, hy + 1, 1.8); ctx.fill(); circ(ctx, hx + 5.5, hy + 1.2, 1.2); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(hx - 5, hy + 7.5); ctx.quadraticCurveTo(hx, hy + 5.5, hx + 5, hy + 8); ctx.stroke();
    rr(ctx, hx - 1, hy + 6.5, 2.6, 3, 0.5); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = C('#3d6b2c'); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(hx + 2, hy - 8); ctx.lineTo(hx + 9, hy - 5); for (let k = 0; k < 3; k++) { ctx.moveTo(hx + 3 + k * 2.5, hy - 9 + k); ctx.lineTo(hx + 2 + k * 2.5, hy - 5 + k); } ctx.stroke();
  }
}

/** Ghost body (sheet with wavy bottom); origin = bottom center of the sheet. */
export function ghostShape(ctx, t, w = 17, h = 44) {
  ctx.beginPath();
  ctx.moveTo(-w, -h + w);
  ctx.arc(0, -h + w, w, Math.PI, 0);
  ctx.quadraticCurveTo(w + 1, -h * 0.35, w + 3, -2);
  const n = 4;
  for (let i = 0; i < n; i++) {
    const x0 = w + 3 - ((i + 1) * (2 * w + 6)) / n, xm = x0 + (2 * w + 6) / n / 2;
    const yy = Math.sin(t * 6 + i * 1.7) * 2.5;
    ctx.quadraticCurveTo(xm, -9 + yy, x0, (i % 2 ? -1 : 3) + yy * 0.6);
  }
  ctx.quadraticCurveTo(-w - 1, -h * 0.35, -w, -h + w);
  ctx.closePath();
}

function drawGhostMonster(ctx, x, y, o, rise, t) {
  const state = o.state || 'chase', dir = o.dir || 'down';
  const revealed = state === 'revealed';
  let alpha = typeof o.alpha === 'number' ? o.alpha : 0.55;
  if (revealed) alpha = 1;
  alpha *= rise;
  const hover = 10 + Math.sin(t * 3 + x * 0.05) * 3 + (1 - rise) * -10;
  if (o.shadow) drawShadow(ctx, x, y, 30 - hover * 0.4, 0.4 + alpha * 0.6);
  ctx.translate(x, y - hover);
  ctx.globalAlpha *= alpha;
  setTint(o.hitFlash || 0, 0);
  const tilt = dir === 'left' ? -0.08 : dir === 'right' ? 0.08 : 0;
  ctx.rotate(tilt + Math.sin(t * 2.3) * 0.04);
  if (revealed) {
    ctx.fillStyle = 'rgba(160,220,255,0.35)';
    ell(ctx, 0, -24, 26, 30); ctx.fill();
  }
  ghostShape(ctx, t);
  fs(ctx, revealed ? '#ffffff' : '#eef0ff', 2.6);
  // little arms
  const wave = Math.sin(t * 4) * 2;
  ell(ctx, -17, -22 + wave, 5, 3.5, 0.5); fs(ctx, '#eef0ff', 2);
  ell(ctx, 17, -22 - wave, 5, 3.5, -0.5); fs(ctx, '#eef0ff', 2);
  ctx.fillStyle = 'rgba(180,170,230,0.35)';
  ell(ctx, 6, -16, 8, 10); ctx.fill();
  if (dir !== 'up') {
    const fo = faceOffset(dir) * 1.3;
    if (revealed) {
      // scared / dizzy face
      circ(ctx, -6 + fo, -32, 5); fs(ctx, '#ffffff', 2); circ(ctx, 6 + fo, -32, 5); fs(ctx, '#ffffff', 2);
      ctx.fillStyle = OUT; circ(ctx, -6 + fo + Math.sin(t * 9) * 1.5, -32, 1.5); ctx.fill(); circ(ctx, 6 + fo - Math.sin(t * 9) * 1.5, -32, 1.5); ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(-6 + fo, -22);
      for (let k = 1; k <= 4; k++) ctx.lineTo(-6 + fo + k * 3, -22 + (k % 2 ? -2 : 0));
      ctx.stroke();
      ctx.fillStyle = 'rgba(120,200,255,0.8)'; ell(ctx, 13 + fo, -38, 1.8, 3); ctx.fill(); // sweat drop
    } else {
      ctx.fillStyle = C('#1d1328');
      ell(ctx, -6 + fo, -31, 3.4, 5); ctx.fill(); ell(ctx, 6 + fo, -31, 3.4, 5); ctx.fill();
      ctx.fillStyle = '#ffffff'; circ(ctx, -5 + fo, -33, 1.2); ctx.fill(); circ(ctx, 7 + fo, -33, 1.2); ctx.fill();
      ell(ctx, fo, -21, 3.2, 4 + Math.sin(t * 5) * 0.8); ctx.fillStyle = C('#1d1328'); ctx.fill();
      ctx.fillStyle = 'rgba(255,140,170,0.5)'; ell(ctx, -11 + fo, -25, 2.5, 1.5); ctx.fill(); ell(ctx, 11 + fo, -25, 2.5, 1.5); ctx.fill();
    }
  }
  setTint(0, 0);
  ctx.rotate(-(tilt + Math.sin(t * 2.3) * 0.04));
  if (revealed) { // dizzy stars circling the head
    for (let i = 0; i < 3; i++) {
      const a = t * 4 + (i * TAU) / 3;
      const sx = Math.cos(a) * 16, sy = -50 + Math.sin(a) * 5;
      starPath(ctx, sx, sy, 4.5, 2, 5, a); fs(ctx, '#ffe14a', 1.5);
    }
  }
  if (state === 'rising') {
    for (let i = 0; i < 4; i++) {
      const ph = (rise + i * 0.25) % 1;
      sparkle(ctx, Math.cos(i * 2.1) * 18, -10 - ph * 40, 3 * (1 - ph), 'rgba(220,230,255,0.9)');
    }
  }
}
