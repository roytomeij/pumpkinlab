// Monsters: creation, AI, movement and player contact.
// The engine renders; this module only updates state + animation fields.
//
// Contract (DESIGN.md):
//   createMonster(type, x, y, game) -> monster   (starts in state 'rising')
//   updateMonster(m, dt, game)                   (AI + movement + touch)

import { MONSTERS, MONSTER_RISE_TIME, MONSTER_TOUCH_COOLDOWN, WORLD } from '../config.js';

let nextMonsterId = 1;

// Tuning that is purely about "feel" (balance numbers live in config.js).
const KNOCKBACK_DECAY = 7;        // per second, exponential decay of kx/ky (px/s)
const STRIDE = 0.11;              // walkPhase radians per pixel moved
const SEPARATION = 0.9;           // fraction of (r1 + r2) monsters keep apart
const GHOST_ALPHA = 0.55;

const rand = (a, b) => a + Math.random() * (b - a);

/** Create a monster of `type` ('skeleton'|'zombie'|'ghost') at (x, y). */
export function createMonster(type, x, y, game) {
  const stats = MONSTERS[type] || MONSTERS.skeleton;
  const isGhost = type === 'ghost';
  return {
    id: nextMonsterId++,
    type: MONSTERS[type] ? type : 'skeleton',
    x, y,
    r: stats.radius,
    hp: stats.hp,
    maxHp: stats.hp,
    speed: stats.speed,          // base speed; difficulty/endless multipliers applied per frame
    dir: 'down',
    walkPhase: 0,
    hitFlash: 0,
    state: 'rising',
    stateT: MONSTER_RISE_TIME,   // counts down to 0, then -> 'chase'
    alpha: isGhost ? GHOST_ALPHA : 1,
    touchCd: 0,
    kx: 0, ky: 0,                // knockback velocity (px/s), decays over time
    // --- internal helpers (not part of the shared contract) ---
    seed: Math.random() * Math.PI * 2, // de-syncs sway/bob between monsters
    gait: Math.random() * Math.PI,     // gait oscillator for speed pulses
    jitT: 0, jitA: 0,                  // skeleton heading jitter
    sfxT: rand(3, 10),                 // countdown to next ambient groan/wail
    bob: 0,                            // ghost float offset in px (renderer may use it)
  };
}

/** Per-frame update: rising -> chase (-> revealed for ghosts), movement, touch. */
export function updateMonster(m, dt, game) {
  if (!m || m.state === 'dead') return;
  const t = (game && game.t) || 0;
  const player = game && game.player;
  const isGhost = m.type === 'ghost';

  // Timers
  if (m.touchCd > 0) m.touchCd = Math.max(0, m.touchCd - dt);
  if (m.hitFlash > 0) m.hitFlash = Math.max(0, m.hitFlash - dt * 4);

  // Ghost look: half transparent with a gentle shimmer and a float bob.
  if (isGhost) {
    m.bob = Math.sin(t * 2.4 + m.seed) * 4;
    if (m.state !== 'revealed') m.alpha = GHOST_ALPHA + Math.sin(t * 3 + m.seed) * 0.06;
  }

  // --- Rising: stand still and harmless ---
  if (m.state === 'rising') {
    m.stateT -= dt;
    if (m.stateT <= 0) { m.state = 'chase'; m.stateT = 0; }
    applyKnockback(m, dt);
    keepInside(m, game, isGhost);
    return;
  }

  // --- Revealed ghost: stand still, fully opaque, count down ---
  if (m.state === 'revealed') {
    m.alpha = 1;
    m.stateT -= dt;
    if (m.stateT <= 0) { m.state = 'chase'; m.stateT = 0; m.alpha = GHOST_ALPHA; }
    applyKnockback(m, dt);
    separate(m, game);
    keepInside(m, game, isGhost);
    return;
  }

  // --- Chase ---
  const ox = m.x, oy = m.y;
  let vx = 0, vy = 0;

  if (player) {
    const dx = player.x - m.x, dy = player.y - m.y;
    const dist = Math.hypot(dx, dy);
    // Stop a little inside touching range so we don't sit on top of the player.
    const stopDist = (m.r + (player.r || 18)) * 0.7;
    if (dist > stopDist && dist > 0.001) {
      let nx = dx / dist, ny = dy / dist;
      const diffMul = (game.diff && game.diff.monsterSpeed) || 1;
      const endlessMul = game.speedMul || 1;
      let speed = m.speed * diffMul * endlessMul;

      if (m.type === 'skeleton') {
        // Fast, slightly jerky: speed pulses with each step + small random heading twitches.
        m.gait += dt * 9;
        speed *= 0.7 + 0.45 * Math.abs(Math.sin(m.gait));
        m.jitT -= dt;
        if (m.jitT <= 0) { m.jitT = rand(0.12, 0.3); m.jitA = rand(-0.3, 0.3); }
        [nx, ny] = rotate(nx, ny, m.jitA);
      } else if (m.type === 'zombie') {
        // Slow shuffle: drag-step speed pulse + side-to-side sway.
        m.gait += dt * 4;
        const s = Math.sin(m.gait);
        speed *= 0.55 + 0.75 * s * s;
        const sway = Math.sin(t * 2.2 + m.seed) * 0.35;
        [nx, ny] = bend(nx, ny, sway);
      } else if (isGhost) {
        // Floaty wave sideways while drifting toward the player.
        const wave = Math.sin(t * 1.6 + m.seed) * 0.45;
        [nx, ny] = bend(nx, ny, wave);
      }

      // Don't overshoot the stop distance in one frame.
      const step = Math.min(speed * dt, dist - stopDist);
      vx = nx * step; vy = ny * step;
      m.x += vx; m.y += vy;
    }
  }

  applyKnockback(m, dt);
  separate(m, game);
  keepInside(m, game, isGhost);

  // Animation fields from actual displacement (after collisions).
  const mx = m.x - ox, my = m.y - oy;
  const moved = Math.hypot(mx, my);
  if (moved > 0.01) {
    // Facing follows intended walk direction (knockback shouldn't flip sprites around).
    const fx = vx || mx, fy = vy || my;
    m.dir = Math.abs(fx) > Math.abs(fy) ? (fx < 0 ? 'left' : 'right') : (fy < 0 ? 'up' : 'down');
  }
  m.walkPhase += isGhost ? dt * 3 + moved * STRIDE * 0.5 : moved * STRIDE;

  // Ambient sounds (rare and random).
  if (m.type === 'zombie' || isGhost) {
    m.sfxT -= dt;
    if (m.sfxT <= 0) {
      m.sfxT = isGhost ? rand(9, 20) : rand(7, 16);
      if (Math.random() < 0.6 && game.sfx) game.sfx(isGhost ? 'ghostWail' : 'zombieGroan');
    }
  }

  // Touch the player.
  if (player && m.state === 'chase' && m.touchCd <= 0) {
    const d = Math.hypot(player.x - m.x, player.y - m.y);
    if (d < m.r + (player.r || 18)) {
      m.touchCd = MONSTER_TOUCH_COOLDOWN;
      if (game.onMonsterContact) game.onMonsterContact(m);
    }
  }
}

// ---------------------------------------------------------------------------

function rotate(x, y, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [x * c - y * s, x * s + y * c];
}

/** Add a sideways (perpendicular) component of strength k to a unit vector, renormalized. */
function bend(nx, ny, k) {
  const bx = nx - ny * k, by = ny + nx * k;
  const l = Math.hypot(bx, by) || 1;
  return [bx / l, by / l];
}

/** Move by knockback velocity and let it decay. */
function applyKnockback(m, dt) {
  if (!m.kx && !m.ky) return;
  m.x += m.kx * dt;
  m.y += m.ky * dt;
  const k = Math.exp(-KNOCKBACK_DECAY * dt);
  m.kx *= k; m.ky *= k;
  if (Math.abs(m.kx) < 2) m.kx = 0;
  if (Math.abs(m.ky) < 2) m.ky = 0;
}

/**
 * Push this monster away from overlapping monsters so they don't stack.
 * Ghosts only separate from ghosts (they float through walkers); walkers from walkers.
 * Rising monsters are not pushed, but others are pushed off them.
 */
function separate(m, game) {
  const list = game && game.monsters;
  if (!list || m.state === 'rising') return;
  const ghost = m.type === 'ghost';
  for (const o of list) {
    if (o === m || o.state === 'dead' || (o.type === 'ghost') !== ghost) continue;
    const dx = m.x - o.x, dy = m.y - o.y;
    const min = (m.r + o.r) * SEPARATION;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min) continue;
    let d = Math.sqrt(d2), nx, ny;
    if (d < 0.001) { const a = Math.random() * Math.PI * 2; nx = Math.cos(a); ny = Math.sin(a); d = 0; }
    else { nx = dx / d; ny = dy / d; }
    // Each monster moves half; the other one does its half in its own update.
    const push = (min - d) * (o.state === 'rising' ? 1 : 0.5);
    m.x += nx * push; m.y += ny * push;
  }
}

/** Walkers collide with obstacles/walls via the engine; ghosts just stay on the floor area. */
function keepInside(m, game, isGhost) {
  if (!isGhost && game && typeof game.resolveCollisions === 'function') {
    game.resolveCollisions(m);
    return;
  }
  const F = WORLD.FLOOR;
  const pad = isGhost ? 4 : m.r;
  m.x = Math.max(F.x0 + pad, Math.min(F.x1 - pad, m.x));
  m.y = Math.max(F.y0 + pad, Math.min(F.y1 - pad, m.y));
}
