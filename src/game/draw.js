// Draws one frame of the world with the sprite functions from sprites.js.
// Every sprite call is guarded: a missing or throwing sprite draws a simple fallback
// shape instead (and logs once), so the game loop never dies on an art bug.

import { WORLD, MONSTER_RISE_TIME } from '../config.js';
import * as S from '../render/sprites.js';
import { warnOnce } from './world.js';

const { W, H, FLOOR: F, DOOR } = WORLD;

/** Call sprites[name](ctx, ...args) safely; run `fallback()` if it is missing or throws. */
function sprite(ctx, name, args, fallback) {
  const fn = S[name];
  if (typeof fn === 'function') {
    ctx.save();
    try {
      fn(ctx, ...args);
      ctx.restore();
      return;
    } catch (err) {
      ctx.restore();
      warnOnce('sprites.' + name, err);
    }
  } else {
    warnOnce('sprites.' + name, 'missing export');
  }
  if (!fallback) return;
  ctx.save();
  try { fallback(); } catch (err) { /* fallback must never break the frame */ }
  ctx.restore();
}

function circle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function fallbackRoom(ctx, room) {
  ctx.fillStyle = '#2d2442';
  ctx.fillRect(0, 0, W, F.y0);
  ctx.fillStyle = '#3b3550';
  ctx.fillRect(0, F.y0, W, H - F.y0);
  ctx.fillStyle = '#4a4363';
  ctx.fillRect(F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0);
  ctx.fillStyle = room.doorOpen ? '#9cff9c' : '#5a3a22';
  ctx.fillRect(DOOR.x - DOOR.w / 2, F.y0 - 110, DOOR.w, 110);
}

const MONSTER_COLORS = { skeleton: '#eee', zombie: '#7cbf5a', ghost: '#cfe8ff' };

/** Draw outlined floating text, rising and fading. */
function drawFloat(ctx, f) {
  const k = f.t / f.dur;
  ctx.save();
  ctx.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
  ctx.font = 'bold 24px "Trebuchet MS", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#1a1020';
  const y = f.y - k * 40;
  ctx.strokeText(f.text, f.x, y);
  ctx.fillStyle = f.color;
  ctx.fillText(f.text, f.x, y);
  ctx.restore();
}

/**
 * Render the scene. `extra` = { clubTier, boosted } for the player sprite.
 */
export function drawWorld(ctx, game, extra = {}) {
  const t = game.t;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  if (game.shake > 0) {
    const a = 10 * Math.min(1, game.shake / 0.35);
    ctx.translate((Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
  }

  sprite(ctx, 'drawRoom', [game.room, t], () => fallbackRoom(ctx, game.room));

  // Collect everything with a ground point, then draw shadows first and sprites y-sorted.
  const items = [];
  for (const o of game.obstacles) items.push({ kind: 'obstacle', o, y: o.y, sw: o.r * 2 });
  for (const p of game.pumpkins) if (!p.dead) items.push({ kind: 'pumpkin', o: p, y: p.y, sw: 46 });
  for (const m of game.monsters) {
    if (m.state === 'dead') continue;
    let sw = 34, sa = m.type === 'ghost' ? 0.5 * (m.alpha ?? 1) : 1;
    if (m.state === 'rising') sw *= Math.max(0.3, 1 - (m.stateT || 0) / MONSTER_RISE_TIME);
    items.push({ kind: 'monster', o: m, y: m.y, sw, sa });
  }
  for (const p of game.pets) items.push({ kind: 'pet', o: p, y: p.y, sw: 28 });
  for (const p of game.pickups) {
    const base = p.kind === 'club' ? 28 : 16;
    items.push({ kind: 'pickup', o: p, y: p.y, sw: base * Math.max(0.5, 1 - (p.z || 0) / 120) });
  }
  if (game.player) items.push({ kind: 'player', o: game.player, y: game.player.y, sw: 34 });
  items.sort((a, b) => a.y - b.y);

  for (const it of items) {
    ctx.save();
    if (it.sa != null) ctx.globalAlpha = it.sa;
    sprite(ctx, 'drawShadow', [it.o.x, it.o.y, it.sw]);
    ctx.restore();
  }

  const peekR = game.mods.catRevealRadius || 0;
  const cat = peekR > 0 ? (game.pets.find((p) => p.id === 'cat') || game.player) : null;

  for (const it of items) {
    const o = it.o;
    switch (it.kind) {
      case 'obstacle':
        sprite(ctx, 'drawObstacle', [o.type, o.x, o.y, t], () => circle(ctx, o.x, o.y - o.r, o.r, '#777'));
        break;
      case 'pumpkin': {
        const peek = cat && Math.hypot(cat.x - o.x, cat.y - o.y) <= peekR ? o.content : null;
        sprite(ctx, 'drawPumpkin', [o.x, o.y, { hpFrac: o.hp / o.maxHp, hitFlash: o.hitFlash, peek, t }],
          () => circle(ctx, o.x, o.y - o.r, o.r, '#f08a24'));
        break;
      }
      case 'monster':
        sprite(ctx, 'drawMonster', [o.type, o.x, o.y, {
          dir: o.dir, walkPhase: o.walkPhase, hitFlash: o.hitFlash, state: o.state,
          stateT: o.stateT, alpha: o.alpha, t,
        }], () => {
          ctx.globalAlpha = o.alpha ?? 1;
          circle(ctx, o.x, o.y - o.r, o.r, MONSTER_COLORS[o.type] || '#f0f');
        });
        break;
      case 'pet':
        sprite(ctx, 'drawPet', [o.id, o.x, o.y, {
          dir: o.dir, walkPhase: o.walkPhase, action: o.action, level: o.level, t,
        }], () => circle(ctx, o.x, o.y - 14, 14, '#a0703c'));
        break;
      case 'pickup':
        sprite(ctx, 'drawPickup', [o.kind, o.x, o.y, { z: o.z, t, tier: extra.nextTier ?? 1 }],
          () => circle(ctx, o.x, o.y - 8 - (o.z || 0), 8, o.kind === 'coin' ? '#ffd23f' : '#9b6b3a'));
        break;
      case 'player': {
        ctx.save();
        if (o.invuln > 0 && Math.floor(o.invuln * 14) % 2 === 0) ctx.globalAlpha = 0.4;
        sprite(ctx, 'drawPlayer', [o.x, o.y, {
          dir: o.dir, walkPhase: o.walkPhase, swingT: o.swingT,
          clubTier: extra.clubTier ?? 0, boosted: !!extra.boosted, hurt: o.invuln > 0, t,
        }], () => circle(ctx, o.x, o.y - 28, 18, '#4fa3ff'));
        ctx.restore();
        break;
      }
    }
  }

  // world.js keeps e.t as the age of the effect; drawEffect expects e.t = spawn time.
  for (const e of game.effects) sprite(ctx, 'drawEffect', [{ ...e, t: t - e.t }, t]);
  for (const f of game.floats) drawFloat(ctx, f);

  ctx.restore();
}
