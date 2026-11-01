// Pets: modifiers for the engine, creation, following and active behaviour.
// The engine renders; this module only updates state + animation fields.
//
// Contract (DESIGN.md):
//   getPetModifiers(pets /*[{id, level}]*/) -> { coinBonus, clubBonus, shields, magnetRadius,
//        doubleCoinChance, catRevealRadius, spikeDamage, hasWolf }
//   createPet(id, level, x, y) -> pet
//   updatePet(p, dt, game)

import { PETS, PLAYER, WORLD } from '../config.js';

// Feel/tuning (balance numbers live in config.js).
const FLYERS = new Set(['owl', 'bat', 'raven']);
const PET_RADIUS = { wolf: 14, dog: 12, bear: 17, cat: 11, owl: 10, bat: 9, turtle: 12, hedgehog: 10, raven: 9 };
// Speeds relative to the player's (upgraded) speed, so pets keep up with fast shoes.
const FOLLOW_SPEED = 1.15;      // a bit faster than the player so they keep up
const BEAR_CHARGE_SPEED = 1.35;
const BAT_SPEED = 1.4;
const RAVEN_DART_SPEED = 1.5;
const IDLE_DIST = 8;            // close enough to the slot: stand still
const TELEPORT_DIST = 600;      // hopelessly stuck/far behind: snap back next to the player
const STRIDE = 0.13;            // walkPhase radians per pixel walked
const HOVER_Z = 18;             // base hover height for flyers (px, field p.z)
const BAT_RANGE = 350;          // bat looks for pumpkins this close to the player
const ACTION_DECAY = 1.6;       // p.action 1 -> 0 in ~0.6 s

// Formation slots in the player's local frame: +x = the way the player faces, +y = to the right.
// Behind, behind-left, behind-right, then a second row for the 4th/5th pet (pet-slot upgrades).
// Slots are >= 50 px apart (largest pets: bear 17 + wolf 14 + 4 separation = 35), so up to
// five pets never overlap.
const SLOTS = [
  { f: -58, s: 0 },
  { f: -34, s: -54 },
  { f: -34, s: 54 },
  { f: -100, s: -36 },
  { f: -100, s: 36 },
];

const rand = (a, b) => a + Math.random() * (b - a);
/** Pet speed: `k` times the player's current speed (playerStats, incl. shoes upgrade). */
const spd = (game, k) => k * ((game && game.stats && game.stats.speed) || PLAYER.speed);
const clampLevel = (l) => Math.max(1, Math.min(3, (l | 0) || 1));

/** Value of stat `key` for pet `id` at `level` (1..3), or `fallback` if missing. */
function stat(id, level, key, fallback = 0) {
  const def = PETS[id];
  const arr = def && def[key];
  if (!arr) return fallback;
  return arr[clampLevel(level) - 1] ?? arr[arr.length - 1];
}

// ---------------------------------------------------------------------------
// Modifiers
// ---------------------------------------------------------------------------

/** Passive effects of the pets in this room. Missing pet -> 0 / false. */
export function getPetModifiers(pets) {
  const lv = {};
  for (const e of pets || []) {
    if (!e) continue;
    const id = typeof e === 'string' ? e : e.id;          // tolerate bare id strings
    const level = typeof e === 'string' ? 1 : e.level;
    if (PETS[id]) lv[id] = Math.max(lv[id] || 0, clampLevel(level));
  }
  const get = (id, key) => (lv[id] ? stat(id, lv[id], key) : 0);
  return {
    coinBonus: get('dog', 'coinBonus'),
    clubBonus: get('owl', 'clubBonus'),
    shields: get('turtle', 'shields'),
    magnetRadius: get('raven', 'magnetRadius'),
    doubleCoinChance: get('raven', 'doubleChance'),
    catRevealRadius: get('cat', 'revealRadius'),
    spikeDamage: get('hedgehog', 'spikeDamage'),
    hasWolf: !!lv.wolf,
  };
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

export function createPet(id, level, x, y) {
  const flying = FLYERS.has(id);
  return {
    id,
    level: clampLevel(level),
    x, y,
    dir: 'down',
    walkPhase: Math.random() * Math.PI * 2,
    action: 0,
    cd: id === 'wolf' ? 1 : id === 'bat' ? stat('bat', level, 'cooldown', 2) * 0.5 : 0,
    target: null,
    // --- internal helpers (not part of the shared contract) ---
    r: PET_RADIUS[id] || 12,     // for game.resolveCollisions
    flying,
    z: flying ? HOVER_Z : 0,     // hover height for flyers (renderer may use it)
    vx: 0, vy: 0,
    headX: 0, headY: -1,         // smoothed player heading for the formation
    idleT: rand(2, 5),           // countdown to the next idle animation
    targetT: 0,                  // raven: time left on a coin dart
    seed: Math.random() * Math.PI * 2,
  };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export function updatePet(p, dt, game) {
  if (!p || !game || !game.player) return;
  const player = game.player;
  const t = game.t || 0;

  p.action = Math.max(0, p.action - dt * ACTION_DECAY);
  if (p.cd > 0) p.cd = Math.max(0, p.cd - dt);

  // Snap back if hopelessly far away (e.g. stuck behind obstacles).
  if (Math.hypot(player.x - p.x, player.y - p.y) > TELEPORT_DIST) {
    const s = slotTarget(p, game, 1);
    p.x = s.x; p.y = s.y; p.vx = p.vy = 0; p.target = null;
  }

  const ox = p.x, oy = p.y;
  let handled = false;    // true when the pet's own behaviour moved it this frame

  switch (p.id) {
    case 'wolf': wolfHowl(p, game); break;
    case 'bear': handled = bearUpdate(p, dt, game); break;
    case 'bat': handled = batUpdate(p, dt, game); break;
    case 'raven': handled = ravenUpdate(p, dt, game); break;
    default: break;
  }

  if (!handled) follow(p, dt, game);
  separatePets(p, game);
  keepInside(p, game);

  // Animation fields
  const mx = p.x - ox, my = p.y - oy;
  const moved = Math.hypot(mx, my);
  if (moved > 0.15) {
    p.dir = Math.abs(mx) > Math.abs(my) ? (mx < 0 ? 'left' : 'right') : (my < 0 ? 'up' : 'down');
  }
  if (p.flying) {
    // Wings flap continuously (faster when moving); body bobs up and down.
    p.walkPhase += dt * 9 + moved * 0.05;
    p.z = HOVER_Z + Math.sin(t * 3 + p.seed) * 4;
  } else {
    p.walkPhase += moved * STRIDE;
  }

  // Occasional idle animation for pets that are resting (dog wags, raven hops, ...).
  const idle = moved < 0.5 && p.action <= 0;
  if (idle) {
    p.idleT -= dt;
    if (p.idleT <= 0) {
      p.idleT = rand(2.5, 6);
      p.action = 1;
    }
  }
}

// ---------------------------------------------------------------------------
// Following
// ---------------------------------------------------------------------------

/** World position of this pet's formation slot. `smooth` (0..1) blends the heading. */
function slotTarget(p, game, smooth) {
  const player = game.player;
  // Player heading: facing vector, smoothed so the formation doesn't whip around.
  const f = player.facing || { x: 0, y: 1 };
  const fl = Math.hypot(f.x, f.y);
  if (fl > 0.01) {
    p.headX += (f.x / fl - p.headX) * smooth;
    p.headY += (f.y / fl - p.headY) * smooth;
  }
  let hx = p.headX, hy = p.headY;
  const hl = Math.hypot(hx, hy);
  if (hl < 0.01) { hx = 0; hy = 1; } else { hx /= hl; hy /= hl; }

  const idx = Math.max(0, (game.pets || []).indexOf(p));
  const slot = SLOTS[idx % SLOTS.length];
  // local -> world: forward = (hx, hy), right = (-hy, hx)
  return {
    x: player.x + hx * slot.f - hy * slot.s,
    y: player.y + hy * slot.f + hx * slot.s,
  };
}

/** Loose follow with smooth arrival; stands still when close to the slot. */
function follow(p, dt, game) {
  const s = slotTarget(p, game, 1 - Math.exp(-3 * dt));
  moveToward(p, s.x, s.y, spd(game, FOLLOW_SPEED), dt);
}

/**
 * Steer toward (tx, ty): speed eases down near the target, velocity is smoothed.
 * Returns the remaining distance.
 */
function moveToward(p, tx, ty, maxSpeed, dt, arriveDist = IDLE_DIST) {
  const dx = tx - p.x, dy = ty - p.y;
  const d = Math.hypot(dx, dy);
  let dvx = 0, dvy = 0;
  if (d > arriveDist) {
    const sp = Math.min(maxSpeed, d * 3.5);
    dvx = (dx / d) * sp; dvy = (dy / d) * sp;
  }
  const k = 1 - Math.exp(-10 * dt);
  p.vx += (dvx - p.vx) * k;
  p.vy += (dvy - p.vy) * k;
  if (Math.abs(p.vx) < 1 && Math.abs(p.vy) < 1 && d <= arriveDist) { p.vx = 0; p.vy = 0; }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  return d;
}

/** Soft push away from other pets (they never collide with monsters). */
function separatePets(p, game) {
  for (const o of game.pets || []) {
    if (o === p) continue;
    const dx = p.x - o.x, dy = p.y - o.y;
    const min = (p.r || 12) + (o.r || 12) + 4;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min) continue;
    let d = Math.sqrt(d2), nx, ny;
    if (d < 0.001) { const a = Math.random() * Math.PI * 2; nx = Math.cos(a); ny = Math.sin(a); d = 0; }
    else { nx = dx / d; ny = dy / d; }
    const push = (min - d) * 0.5;
    p.x += nx * push; p.y += ny * push;
  }
}

/** Walkers use the engine's collision; flyers just stay over the floor. */
function keepInside(p, game) {
  if (!p.flying && typeof game.resolveCollisions === 'function') {
    game.resolveCollisions(p);
    return;
  }
  const F = WORLD.FLOOR, r = p.r || 10;
  p.x = Math.max(F.x0 + r, Math.min(F.x1 - r, p.x));
  p.y = Math.max(F.y0 + r, Math.min(F.y1 - r, p.y));
}

// ---------------------------------------------------------------------------
// Active behaviours
// ---------------------------------------------------------------------------

/** Wolf: howl when a hidden ghost is near the wolf or the player and the cooldown is ready. */
function wolfHowl(p, game) {
  if (p.cd > 0) return;
  const player = game.player;
  const radius = stat('wolf', p.level, 'howlRadius', 220);
  const inRange = (m) =>
    m.type === 'ghost' && m.state !== 'dead' &&
    (dist(m, p) <= radius || dist(m, player) <= radius);

  // Trigger only on a ghost that is actively hunting (not rising, not already revealed).
  const trigger = (game.monsters || []).some((m) => m.state === 'chase' && inRange(m));
  if (!trigger) return;

  if (game.spawnEffect) game.spawnEffect('howl', p.x, p.y, { radius });
  if (game.sfx) game.sfx('howl');
  const revealTime = stat('wolf', p.level, 'revealTime', 3);
  for (const m of game.monsters) {
    if (!inRange(m) || m.state === 'rising') continue;
    m.state = 'revealed';
    m.stateT = revealTime;
    // Push away from the player.
    let dx = m.x - player.x, dy = m.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    m.kx = (m.kx || 0) + dx * 260;
    m.ky = (m.ky || 0) + dy * 260;
  }
  p.cd = stat('wolf', p.level, 'cooldown', 6);
  p.action = 1;
}

/** Bear: charge skeletons/zombies near the player and swat them. Returns true if it moved itself. */
function bearUpdate(p, dt, game) {
  const player = game.player;
  const radius = stat('bear', p.level, 'attackRadius', 110);
  const valid = (m) =>
    m && m.state === 'chase' && (m.type === 'skeleton' || m.type === 'zombie') &&
    m.hp > 0 && (game.monsters || []).includes(m);

  // Keep the current target while it stays reasonably close to the player (avoids flip-flopping).
  if (!(valid(p.target) && dist(p.target, player) <= radius * 1.4)) {
    p.target = findNearest(game, game.monsters, player.x, player.y,
      (m) => valid(m) && dist(m, player) <= radius);
  }
  const m = p.target;
  if (!m) return false;

  const reach = (p.r || 17) + m.r + 6;
  const d = moveToward(p, m.x, m.y, spd(game, BEAR_CHARGE_SPEED), dt, reach * 0.8);
  if (d <= reach && p.cd <= 0) {
    if (game.damageMonster) game.damageMonster(m, stat('bear', p.level, 'damage', 12), 'bear');
    if (Math.random() < 0.3 && game.sfx) game.sfx('bearRoar');
    if (game.spawnEffect) game.spawnEffect('hit', m.x, m.y, {});
    p.cd = stat('bear', p.level, 'cooldown', 1.5);
    p.action = 1;
    // Face the target while swatting.
    const dx = m.x - p.x, dy = m.y - p.y;
    p.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
  }
  return true;
}

/** Bat: hover over the nearest pumpkin near the player and nibble it. Returns true if it moved itself. */
function batUpdate(p, dt, game) {
  const player = game.player;
  const alive = (pu) => pu && !pu.dead && pu.hp > 0 && (game.pumpkins || []).includes(pu);

  if (!(alive(p.target) && dist(p.target, player) <= BAT_RANGE * 1.2)) {
    p.target = findNearest(game, game.pumpkins, player.x, player.y,
      (pu) => alive(pu) && dist(pu, player) <= BAT_RANGE);
  }
  const pu = p.target;
  if (!pu) return false;

  // Hover in a small circle just in front of the pumpkin (so it draws over it).
  const t = game.t || 0;
  const hx = pu.x + Math.cos(t * 2.5 + p.seed) * 10;
  const hy = pu.y + 4 + Math.sin(t * 2.5 + p.seed) * 5;
  const d = moveToward(p, hx, hy, spd(game, BAT_SPEED), dt, 4);
  if (d < 26 && p.cd <= 0) {
    if (game.damagePumpkin) game.damagePumpkin(pu, stat('bat', p.level, 'pumpkinDamage', 6), 'bat');
    if (Math.random() < 0.35 && game.sfx) game.sfx('batSquee');
    p.cd = stat('bat', p.level, 'cooldown', 2);
    p.action = 1;
  }
  return true;
}

/** Raven (flavour only): sometimes darts to a nearby coin, the engine does the real magnet. */
function ravenUpdate(p, dt, game) {
  const player = game.player;
  const coinOk = (c) => c && c.kind === 'coin' && (game.pickups || []).includes(c);

  if (p.target) {
    p.targetT -= dt;
    if (p.targetT <= 0 || !coinOk(p.target)) {
      p.target = null;
      p.cd = rand(3, 6);
    }
  } else if (p.cd <= 0) {
    const r = Math.max(120, stat('raven', p.level, 'magnetRadius', 120));
    const coin = findNearest(game, game.pickups, player.x, player.y,
      (c) => coinOk(c) && dist(c, player) <= r);
    if (coin && Math.random() < 0.5) {
      p.target = coin;
      p.targetT = 1.2;
      p.action = 1;
    } else {
      p.cd = rand(1, 2.5);   // look again a little later
    }
  }
  if (!p.target) return false;
  moveToward(p, p.target.x, p.target.y, spd(game, RAVEN_DART_SPEED), dt, 6);
  return true;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Uses game.nearest when available, otherwise a local linear search. */
function findNearest(game, list, x, y, filterFn) {
  if (!list || !list.length) return null;
  if (typeof game.nearest === 'function') return game.nearest(list, x, y, filterFn) || null;
  let best = null, bestD = Infinity;
  for (const it of list) {
    if (filterFn && !filterFn(it)) continue;
    const d = (it.x - x) ** 2 + (it.y - y) ** 2;
    if (d < bestD) { bestD = d; best = it; }
  }
  return best;
}
