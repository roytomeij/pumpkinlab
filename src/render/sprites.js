// Art module: every visual of PumpkinLab, drawn in code with the Canvas 2D API.
// All draw functions use logical world pixels; (x, y) is the ground/feet point.
//
//   drawRoom(ctx, room, t)            room = { theme:0..4, wallDecor:[{type, x}], doorOpen }
//   drawObstacle(ctx, type, x, y, t)  'table'|'cauldron'|'coffin'|'tubes'
//   drawPlayer(ctx, x, y, { dir, walkPhase, swingT, clubTier (0..4), boosted, hurt, t })
//   drawPumpkin(ctx, x, y, { hpFrac, hitFlash, peek, t })
//   drawMonster(ctx, type, x, y, { dir, walkPhase, hitFlash, state, stateT, alpha, t })
//   drawPet(ctx, id, x, y, { dir, walkPhase, action, level, t })
//   drawPickup(ctx, kind, x, y, { z, t, tier (0..4) })
//   drawEffect(ctx, effect, t)
//   drawShadow(ctx, x, y, w)
//   renderIcon(kind, id, size[, opts]) -> HTMLCanvasElement
//     kind: 'pet'|'club'|'coin'|'heart'|'shield'|'monster'|'upgrade'|'lock'
//     club ids: 'wood'|'stone'|'iron'|'gold'|'diamond' or tier 0..4
//     upgrade ids: 'petSlot'|'maxHeart'|'shoes'|'swing'|'reach'|'luck' (unknown -> '?' tile)
//     'lock' (id ignored): padlock; with the frame it sits on a round badge (for locked shop items)
//     opts: { frame (default true), t, level (pets), boosted (clubs) }
//   WALL_DECOR_TYPES
//
// Ground shadows are NOT drawn by the entity functions (the engine draws them first with
// drawShadow so they never cover other sprites). Pass { shadow: true } in the opts (or as the
// 6th arg of drawObstacle) to let a function draw its own shadow, e.g. in UI previews.

import { OUT, TAU, C, setTint, ell, circ, fs, rrPath, rr, poly, sparkle, drawShadow, rgba, hash } from './art-util.js';
import { drawRoom, WALL_DECOR_TYPES } from './art-room.js';
import { drawPlayer, drawMonster, drawClub, CLUB_PAL, clubTierOf } from './art-actors.js';
import { drawPumpkin, drawObstacle, coinGlyph, heartPath } from './art-props.js';
import { drawPet } from './art-pets.js';
import { drawEffect } from './art-fx.js';

export {
  drawRoom, WALL_DECOR_TYPES, drawPlayer, drawMonster, drawPumpkin, drawObstacle, drawPet, drawEffect, drawShadow,
};

// ---------------------------------------------------------------------------
// Pickups
// ---------------------------------------------------------------------------
export function drawPickup(ctx, kind, x, y, o = {}) {
  const t = o.t || 0, z = Math.max(0, o.z || 0);
  const seed = x * 0.37 + y * 0.11;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  setTint(0, 0);
  if (kind === 'coin') {
    if (o.shadow) drawShadow(ctx, x, y, 18 * (1 - Math.min(z, 40) / 80));
    ctx.translate(x, y - z - 10);
    coinGlyph(ctx, 8.5, Math.cos(t * 5 + seed));
    const tw = Math.sin(t * 4 + seed);
    if (tw > 0.3) sparkle(ctx, 7, -8, (tw - 0.3) * 7, '#fffbe0');
  } else if (kind === 'club') {
    const tier = clubTierOf(o.tier || 0);
    const P = CLUB_PAL[tier];
    const bob = Math.sin(t * 3 + seed) * 3;
    if (o.shadow) drawShadow(ctx, x, y, 26 * (1 - Math.min(z, 40) / 80));
    ctx.translate(x, y - z - 22 - bob);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
    g.addColorStop(0, rgba(P.glow, 0.75)); g.addColorStop(1, rgba(P.glow, 0));
    ctx.fillStyle = g; circ(ctx, 0, 0, 24); ctx.fill();
    // rotating light rays
    ctx.save(); ctx.rotate(t * 0.8);
    ctx.fillStyle = rgba(P.glow, 0.25);
    for (let i = 0; i < 6; i++) {
      ctx.rotate(TAU / 6);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(24, -3.5); ctx.lineTo(24, 3.5); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    if (tier === 4) { // diamond: extra icy halo ring + orbiting twinkles
      ctx.strokeStyle = `rgba(200,250,255,${0.45 + 0.25 * Math.sin(t * 4 + seed)})`; ctx.lineWidth = 2;
      circ(ctx, 0, 0, 19 + Math.sin(t * 3 + seed) * 1.5); ctx.stroke();
    }
    ctx.save(); ctx.rotate(-0.85 + Math.sin(t * 2 + seed) * 0.12); ctx.translate(-15, 0);
    drawClub(ctx, tier, 32, false, t);
    ctx.restore();
    if (tier === 4) {
      for (let i = 0; i < 4; i++) {
        const a = t * 1.6 + (i * TAU) / 4, tw = 0.5 + 0.5 * Math.sin(t * 6 + i * 1.9);
        sparkle(ctx, Math.cos(a) * 22, Math.sin(a) * 15, 1.5 + tw * 3, `rgba(235,253,255,${0.5 + 0.5 * tw})`);
      }
    }
    // little up-arrow badge
    ctx.translate(13, 9);
    circ(ctx, 0, 0, 6.5); fs(ctx, '#5ad15a', 2);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(3.5, 0.5); ctx.lineTo(1.3, 0.5); ctx.lineTo(1.3, 3.5); ctx.lineTo(-1.3, 3.5); ctx.lineTo(-1.3, 0.5); ctx.lineTo(-3.5, 0.5); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Icons for the UI
// ---------------------------------------------------------------------------
const ICON_BG = {
  pet: ['#7a5cc8', '#3b2a6b'],
  club: ['#e0a050', '#6b3a1a'],
  coin: ['#ffd76a', '#b8761a'],
  heart: ['#ff8aa0', '#8a1f3a'],
  shield: ['#7ad8ff', '#1d4f7a'],
  monster: ['#8fd16a', '#2a4a2a'],
  clubDiamond: ['#a6f0ff', '#1d3a7a'],
  unknown: ['#b8b0c8', '#4a4458'],
};
// Upgrade tiles get their own colour so the shop row reads at a glance.
const UPGRADE_BG = {
  petSlot: ['#a07ae8', '#3b2a6b'],
  maxHeart: ['#ff8aa0', '#8a1f3a'],
  shoes: ['#6fd0ff', '#1d4f8a'],
  swing: ['#ffb45a', '#7a3a12'],
  reach: ['#5fd8c0', '#155a5a'],
  luck: ['#ff9ad0', '#7a2a6b'],
};
const UPGRADE_DRAW = {
  petSlot: drawPetSlotIcon, maxHeart: drawMaxHeartIcon, shoes: drawShoesIcon, swing: drawSwingIcon,
  reach: drawReachIcon, luck: drawLuckIcon,
};

export function renderIcon(kind, id, size = 64, opts = {}) {
  const dpr = Math.max(1, Math.min(3, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const cv = document.createElement('canvas');
  cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr);
  cv.style.width = size + 'px'; cv.style.height = size + 'px';
  const ctx = cv.getContext('2d');
  ctx.scale((size * dpr) / 100, (size * dpr) / 100);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const t = opts.t || 0.35;
  const known = kind !== 'upgrade' || Object.prototype.hasOwnProperty.call(UPGRADE_DRAW, id);
  if (kind === 'lock') {
    drawLockIcon(ctx, opts.frame !== false);
    return cv;
  }
  // frame
  let bg = ICON_BG[kind] || ICON_BG.pet;
  if (kind === 'club' && clubTierOf(id) === 4) bg = ICON_BG.clubDiamond;
  else if (kind === 'upgrade') bg = known ? UPGRADE_BG[id] : ICON_BG.unknown;
  if (opts.frame !== false) {
    const g = ctx.createRadialGradient(42, 36, 6, 50, 50, 50);
    g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
    ctx.beginPath(); rrPath(ctx, 4, 4, 92, 92, 24);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.beginPath(); rrPath(ctx, 9, 9, 82, 82, 20);
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke();
    // soft floor
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ell(ctx, 50, 80, 34, 9); ctx.fill();
  }
  ctx.save();
  if (kind === 'pet') {
    // per pet: [scale, x offset (in pet px), ground y in icon px]
    const fit = { bear: [1.5, -1, 80], wolf: [1.42, 1, 79], dog: [1.5, 3, 79], cat: [1.5, 4, 80], turtle: [1.7, -1, 77],
      hedgehog: [1.8, -2, 77], owl: [1.75, 0, 88], bat: [1.75, 0, 84], raven: [1.75, 1, 86] };
    const [s, ox, gy] = fit[id] || [1.6, 0, 80];
    ctx.translate(50, gy); ctx.scale(s, s); ctx.translate(ox, 0);
    drawPet(ctx, id, 0, 0, { dir: 'right', walkPhase: 0, action: 0, level: opts.level || 1, t, icon: true });
  } else if (kind === 'club') {
    const tier = clubTierOf(id);
    if (tier === 4) { ctx.translate(45, 62); ctx.rotate(-0.8); ctx.scale(1.6, 1.6); ctx.translate(-15, 0); }
    else { ctx.translate(50, 52); ctx.rotate(-0.8); ctx.scale(1.9, 1.9); ctx.translate(-16, 0); }
    drawClub(ctx, tier, 34, !!opts.boosted, t);
  } else if (kind === 'upgrade') {
    if (known) UPGRADE_DRAW[id](ctx, t);
    else drawUnknownIcon(ctx);
  } else if (kind === 'coin') {
    ctx.translate(50, 50); ctx.scale(3.4, 3.4);
    coinGlyph(ctx, 9.5, 1);
    sparkle(ctx, 8, -8, 4, '#fffbe0');
  } else if (kind === 'heart') {
    heartPath(ctx, 50, 52, 30); fs(ctx, '#ff4d6d', 4.5);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ell(ctx, 37, 40, 8, 5, -0.6); ctx.fill();
    ctx.fillStyle = 'rgba(160,0,40,0.25)'; heartPath(ctx, 54, 58, 18); ctx.fill();
  } else if (kind === 'shield') {
    drawShieldIcon(ctx);
  } else if (kind === 'monster') {
    ctx.translate(50, 86); ctx.scale(1.35, 1.35);
    drawMonster(ctx, id, 0, 0, { dir: 'down', walkPhase: 0, state: 'chase', alpha: 0.95, t });
  }
  ctx.restore();
  setTint(0, 0);
  return cv;
}

function drawShieldIcon(ctx) {
  // a turtle-shell shield
  ctx.beginPath();
  ctx.moveTo(50, 14); ctx.quadraticCurveTo(68, 22, 82, 20); ctx.quadraticCurveTo(84, 62, 50, 88);
  ctx.quadraticCurveTo(16, 62, 18, 20); ctx.quadraticCurveTo(32, 22, 50, 14); ctx.closePath();
  fs(ctx, '#4fb85a', 4.5);
  ctx.save(); ctx.clip();
  ctx.strokeStyle = '#2f7f3a'; ctx.lineWidth = 3;
  const hex = (cx, cy, r) => { ctx.beginPath(); for (let k = 0; k <= 6; k++) { const a = (k / 6) * TAU + Math.PI / 6; k ? ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } ctx.stroke(); };
  hex(50, 48, 13);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; hex(50 + Math.cos(a) * 24, 48 + Math.sin(a) * 24, 11); }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ell(ctx, 36, 30, 8, 4, -0.5); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(50, 14); ctx.quadraticCurveTo(68, 22, 82, 20); ctx.quadraticCurveTo(84, 62, 50, 88);
  ctx.quadraticCurveTo(16, 62, 18, 20); ctx.quadraticCurveTo(32, 22, 50, 14); ctx.closePath();
  ctx.strokeStyle = '#d6c27a'; ctx.lineWidth = 3; ctx.stroke();
}

// ---------------------------------------------------------------------------
// Upgrade / lock icons (100x100 icon space)
// ---------------------------------------------------------------------------
/** Green round badge with a white plus (= "one more"). */
function plusBadge(ctx, x, y, r) {
  circ(ctx, x, y, r); fs(ctx, '#5ad15a', 4);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ell(ctx, x - r * 0.3, y - r * 0.45, r * 0.45, r * 0.25, -0.4); ctx.fill();
  const a = r * 0.58, w = r * 0.22;
  ctx.beginPath();
  ctx.moveTo(x - w, y - a); ctx.lineTo(x + w, y - a); ctx.lineTo(x + w, y - w); ctx.lineTo(x + a, y - w); ctx.lineTo(x + a, y + w);
  ctx.lineTo(x + w, y + w); ctx.lineTo(x + w, y + a); ctx.lineTo(x - w, y + a); ctx.lineTo(x - w, y + w); ctx.lineTo(x - a, y + w);
  ctx.lineTo(x - a, y - w); ctx.lineTo(x - w, y - w); ctx.closePath();
  ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
}

function drawPetSlotIcon(ctx) {
  const col = '#ffe2b8';
  ctx.save(); ctx.translate(44, 50); ctx.rotate(-0.12);
  // main pad
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.bezierCurveTo(12, -4, 20, 8, 18, 15); ctx.bezierCurveTo(16, 22, 6, 20, 0, 19);
  ctx.bezierCurveTo(-6, 20, -16, 22, -18, 15); ctx.bezierCurveTo(-20, 8, -12, -4, 0, -4);
  ctx.closePath(); fs(ctx, col, 4);
  // toes
  for (const [tx, ty, rx, ry, rot] of [[-21, -8, 6.5, 8.5, -0.5], [-8, -19, 7, 9, -0.15], [8, -19, 7, 9, 0.15], [21, -8, 6.5, 8.5, 0.5]]) {
    ell(ctx, tx, ty, rx, ry, rot); fs(ctx, col, 4);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ell(ctx, -6, 3, 6, 3, -0.3); ctx.fill();
  ctx.fillStyle = 'rgba(190,110,60,0.25)'; ell(ctx, 4, 13, 10, 4); ctx.fill();
  ctx.restore();
  plusBadge(ctx, 73, 72, 15);
}

function drawMaxHeartIcon(ctx) {
  heartPath(ctx, 45, 46, 27); fs(ctx, '#ff4d6d', 4.5);
  ctx.fillStyle = 'rgba(160,0,40,0.25)'; heartPath(ctx, 49, 52, 15); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ell(ctx, 33, 35, 7, 4.5, -0.6); ctx.fill();
  plusBadge(ctx, 73, 72, 15);
}

function drawShoesIcon(ctx, t) {
  // speed lines behind the heel
  ctx.lineCap = 'round';
  ctx.translate(50, 54); ctx.scale(0.86, 0.86); ctx.translate(-50, -56);
  for (const [y, x0, x1] of [[44, 12, 26], [56, 7, 24], [68, 13, 24]]) {
    ctx.strokeStyle = OUT; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5; ctx.stroke();
  }
  ctx.save(); ctx.translate(2, 0);
  // sole
  ctx.beginPath();
  ctx.moveTo(28, 64); ctx.lineTo(84, 64); ctx.quadraticCurveTo(92, 66, 90, 72); ctx.quadraticCurveTo(88, 77, 80, 77);
  ctx.lineTo(32, 77); ctx.quadraticCurveTo(26, 77, 26, 71); ctx.closePath();
  fs(ctx, '#ffffff', 4);
  ctx.strokeStyle = '#c8c0d8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(32, 72); ctx.lineTo(84, 72); ctx.stroke();
  // upper
  ctx.beginPath();
  ctx.moveTo(29, 65); ctx.lineTo(30, 40); ctx.quadraticCurveTo(31, 33, 38, 33); ctx.lineTo(48, 34);
  ctx.quadraticCurveTo(52, 40, 58, 44); ctx.quadraticCurveTo(74, 48, 84, 55); ctx.quadraticCurveTo(90, 60, 87, 65);
  ctx.closePath();
  fs(ctx, '#3fc46a', 4);
  // toe cap + heel tab
  ctx.beginPath(); ctx.moveTo(72, 51); ctx.quadraticCurveTo(84, 54, 87, 63); ctx.lineTo(74, 64); ctx.quadraticCurveTo(70, 58, 72, 51); ctx.closePath();
  fs(ctx, '#2a9a50', 2.5);
  rr(ctx, 27, 38, 7, 16, 3); fs(ctx, '#ffd23a', 2.5);
  // stripe
  ctx.beginPath(); ctx.moveTo(40, 60); ctx.quadraticCurveTo(52, 50, 64, 56); ctx.strokeStyle = OUT; ctx.lineWidth = 7.5; ctx.stroke();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.stroke();
  // laces
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
  ctx.beginPath(); for (const [lx, ly] of [[47, 40], [53, 44], [59, 47]]) { ctx.moveTo(lx - 3, ly + 3); ctx.lineTo(lx + 3, ly - 3); } ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ell(ctx, 38, 44, 4, 6, 0.2); ctx.fill();
  ctx.restore();
  // dust puff at the heel
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  circ(ctx, 22, 78, 5); ctx.fill(); circ(ctx, 14, 75, 3.5); ctx.fill();
}

function swooshArc(ctx, cx, cy, r, a0, a1, w) {
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1);
  ctx.strokeStyle = OUT; ctx.lineWidth = w + 4; ctx.stroke();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = w; ctx.stroke();
}

function drawSwingIcon(ctx, t) {
  const px = 36, py = 76;
  // double motion arcs
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, 50, -2.2, -0.62); ctx.closePath(); ctx.fill();
  swooshArc(ctx, px, py, 52, -2.15, -1.05, 5);
  swooshArc(ctx, px, py, 41, -2.0, -1.2, 4);
  // ghost club (previous position) + club
  ctx.save(); ctx.globalAlpha = 0.3; ctx.translate(px, py); ctx.rotate(-1.75); ctx.scale(1.25, 1.25);
  drawClub(ctx, 0, 34, false, t); ctx.restore();
  ctx.save(); ctx.translate(px, py); ctx.rotate(-0.62); ctx.scale(1.3, 1.3);
  drawClub(ctx, 0, 34, false, t); ctx.restore();
  // fist
  circ(ctx, px, py, 8); fs(ctx, '#f6c9a0', 3.5);
  sparkle(ctx, 84, 30, 6, '#fffbe0');
}

function drawReachIcon(ctx, t) {
  // long purple sleeve + hand holding a club, arrow showing the extra reach
  ctx.save(); ctx.translate(2, -2);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(14, 84); ctx.lineTo(30, 62);
  ctx.strokeStyle = OUT; ctx.lineWidth = 17; ctx.stroke(); ctx.strokeStyle = '#8a4fe0'; ctx.lineWidth = 12; ctx.stroke();
  ctx.save(); ctx.translate(31, 61); ctx.rotate(-0.785); ctx.scale(1.25, 1.25);
  drawClub(ctx, 2, 34, false, t); ctx.restore();
  circ(ctx, 31, 61, 7.5); fs(ctx, '#f6c9a0', 3.5);
  ctx.restore();
  // fat arrow beyond the club tip (pointing up-right)
  ctx.save(); ctx.translate(74, 26); ctx.rotate(-0.785);
  ctx.beginPath();
  ctx.moveTo(14, 0); ctx.lineTo(0, -12); ctx.lineTo(0, -5.5); ctx.lineTo(-14, -5.5); ctx.lineTo(-14, 5.5); ctx.lineTo(0, 5.5); ctx.lineTo(0, 12);
  ctx.closePath(); fs(ctx, '#ffe14a', 3.5);
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; rr(ctx, -11, -3.5, 10, 2.5, 1.2); ctx.fill();
  ctx.restore();
  // whoosh ticks beside the arrow
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(84, 44); ctx.lineTo(90, 38); ctx.moveTo(56, 16); ctx.lineTo(62, 10); ctx.stroke();
}

function drawLuckIcon(ctx, t) {
  const cx = 46, cy = 44;
  // stem
  ctx.beginPath(); ctx.moveTo(cx, cy + 4); ctx.quadraticCurveTo(cx + 4, cy + 26, cx + 16, cy + 40);
  ctx.strokeStyle = OUT; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = '#3a9a44'; ctx.lineWidth = 5; ctx.stroke();
  // four heart-shaped leaves
  const s = 13.5;
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 4 + (i * Math.PI) / 2;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a + Math.PI / 2);
    heartPath(ctx, 0, -s * 0.9, s); fs(ctx, i === 0 ? '#5ed66a' : '#4fc45a', 4);
    ctx.strokeStyle = '#2f8a3a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, -s * 1.15); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ell(ctx, -s * 0.45, -s * 1.3, s * 0.25, s * 0.16, -0.5); ctx.fill();
    ctx.restore();
  }
  circ(ctx, cx, cy, 3.5); fs(ctx, '#3a9a44', 2);
  sparkle(ctx, 80, 20, 11, '#ffffff');
  sparkle(ctx, 84, 40, 5, '#fff3a0');
  sparkle(ctx, 18, 22, 5, '#fff3a0');
}

function drawUnknownIcon(ctx) {
  ctx.font = '900 62px "Trebuchet MS", system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 9; ctx.strokeStyle = OUT; ctx.strokeText('?', 50, 52);
  ctx.fillStyle = '#ffffff'; ctx.fillText('?', 50, 52);
}

/** Padlock; framed = sitting on a round dark badge (overlay for locked shop items). */
function drawLockIcon(ctx, framed) {
  if (framed) {
    circ(ctx, 50, 50, 45); ctx.fillStyle = '#3b2a6b'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.stroke();
    circ(ctx, 50, 50, 39); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke();
    ctx.translate(50, 52); ctx.scale(0.78, 0.78); ctx.translate(-50, -52);
  }
  // shackle
  ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(32, 50); ctx.lineTo(32, 34); ctx.arc(50, 34, 18, Math.PI, 0); ctx.lineTo(68, 50);
  ctx.strokeStyle = OUT; ctx.lineWidth = 15; ctx.stroke();
  ctx.strokeStyle = '#c3ccd8'; ctx.lineWidth = 8; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(50, 34, 18, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
  // body
  rr(ctx, 20, 44, 60, 46, 10); fs(ctx, '#ffcc33', 5);
  ctx.fillStyle = '#d19a1c'; rr(ctx, 24, 78, 52, 8, 4); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; rr(ctx, 26, 49, 26, 5, 2.5); ctx.fill();
  // keyhole
  circ(ctx, 50, 62, 6.5); ctx.fillStyle = OUT; ctx.fill();
  poly(ctx, [46.5, 64, 53.5, 64, 55, 78, 45, 78]); ctx.fill();
}
