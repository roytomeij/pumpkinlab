// Art module: every visual of Pompoenlab, drawn in code with the Canvas 2D API.
// All draw functions use logical world pixels; (x, y) is the ground/feet point.
//
//   drawRoom(ctx, room, t)            room = { theme:0..4, wallDecor:[{type, x}], doorOpen }
//   drawObstacle(ctx, type, x, y, t)  'table'|'cauldron'|'coffin'|'tubes'
//   drawPlayer(ctx, x, y, { dir, walkPhase, swingT, clubTier, boosted, hurt, t })
//   drawPumpkin(ctx, x, y, { hpFrac, hitFlash, peek, t })
//   drawMonster(ctx, type, x, y, { dir, walkPhase, hitFlash, state, stateT, alpha, t })
//   drawPet(ctx, id, x, y, { dir, walkPhase, action, level, t })
//   drawPickup(ctx, kind, x, y, { z, t, tier })
//   drawEffect(ctx, effect, t)
//   drawShadow(ctx, x, y, w)
//   renderIcon(kind, id, size[, opts]) -> HTMLCanvasElement
//   WALL_DECOR_TYPES
//
// Ground shadows are NOT drawn by the entity functions (the engine draws them first with
// drawShadow so they never cover other sprites). Pass { shadow: true } in the opts (or as the
// 6th arg of drawObstacle) to let a function draw its own shadow, e.g. in UI previews.

import { OUT, TAU, C, setTint, ell, circ, fs, rrPath, rr, sparkle, drawShadow, rgba, hash } from './art-util.js';
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
    ctx.save(); ctx.rotate(-0.85 + Math.sin(t * 2 + seed) * 0.12); ctx.translate(-15, 0);
    drawClub(ctx, tier, 32, false, t);
    ctx.restore();
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
  // frame
  const bg = ICON_BG[kind] || ICON_BG.pet;
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
    ctx.translate(50, 52); ctx.rotate(-0.8); ctx.scale(1.9, 1.9); ctx.translate(-16, 0);
    drawClub(ctx, tier, 34, !!opts.boosted, t);
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
