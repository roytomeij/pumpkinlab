// The simulation: the `game` object from DESIGN.md plus its per-frame update.
// Flow (menus, levels, saving) lives in engine.js; this module only knows about one room.

import {
  WORLD, PLAYER, CLUBS, MONSTERS, ECONOMY, DIFFICULTY, SPAWNER, MAX_BOOST_TIER, playerStats,
} from '../config.js';
import * as Monsters from './monsters.js';
import * as Pets from './pets.js';
import { rollWeighted } from './room.js';

const F = WORLD.FLOOR;
const DOOR = WORLD.DOOR;

const EFFECT_DUR = {
  smash: 0.7, poof: 0.6, howl: 1.0, hit: 0.3, bones: 0.9,
  coinSparkle: 0.5, shield: 0.6, spikes: 0.5, ghostVanish: 0.8,
};
const KNOCKBACK = 320;          // px/s given to a monster when hit (monsters.js decays it)
const COIN_GRAVITY = 820;       // px/s^2 for the coin hop
const ATTACK_BUFFER = 0.2;      // s: a press just before the cooldown ends still counts
const CLUB_MAX_COINS = 5;       // club pickup when the club can't get better
const DOOR_DEPTH = 24;          // how far (px) the player can step into the open doorway
const SPAWN_RETRY = 0.5;        // s: try again this soon when no free spawn spot was found
const SPAWN_CLEAR = 10;         // px free space around a spawned monster (obstacles, pumpkins, monsters)

export const EMPTY_MODS = Object.freeze({
  coinBonus: 0, clubBonus: 0, shields: 0, magnetRadius: 0, doubleCoinChance: 0,
  catRevealRadius: 0, spikeDamage: 0, hasWolf: false,
});

// Log an error once per key so a broken module doesn't flood the console.
const warned = new Set();
export function warnOnce(key, err) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[pompoenlab] ${key}:`, err);
}

/** Remove items matching `pred` from `arr` in place (keeps the array identity). */
function removeIf(arr, pred) {
  let j = 0;
  for (let i = 0; i < arr.length; i++) if (!pred(arr[i])) arr[j++] = arr[i];
  arr.length = j;
}

const isDead = (o) => !o || o.dead || o.state === 'dead';
const randIn = ([a, b]) => a + Math.random() * (b - a);

export function createPlayer(x, y) {
  return {
    x, y, r: PLAYER.radius, vx: 0, vy: 0,
    facing: { x: 0, y: -1 }, dir: 'up', walkPhase: 0, swingT: -1,
    attackCd: 0, invuln: 0, shields: 0,
  };
}

/**
 * hooks: { sfx(name), toast(key, params), onRoomCleared(), onPlayerDied() }
 */
export function createWorld(hooks) {
  let attackBuf = 0;
  let ghostToastShown = false;
  let spawnT = SPAWNER.firstDelay;   // s until the next spawner monster

  const game = {
    t: 0, dt: 0,
    player: null, pumpkins: [], monsters: [], pets: [], pickups: [], obstacles: [], effects: [],
    floats: [],                  // floating texts (engine-only)
    run: null, profile: null,
    diff: DIFFICULTY.normal, speedMul: 1, mods: { ...EMPTY_MODS },
    stats: playerStats(null),    // playerStats(profile): hearts, speed, cooldown, range, pickup, ...
    room: { theme: 0, wallDecor: [], doorOpen: false },
    shake: 0,                    // seconds of screen shake left
    over: false,                 // player died / room finished: stop reacting
    cleared: false,

    damageMonster, damagePumpkin, onMonsterContact, hurtPlayer,
    spawnEffect, floatText, resolveCollisions, nearest,
    sfx: (name) => hooks.sfx(name),
  };

  // ---------------------------------------------------------------- helpers

  /**
   * Effective club: bought tier + this level's pumpkin boost, 0..CLUBS.length-1. The boost never
   * lifts the club past MAX_BOOST_TIER (gold), also not when a better club was bought mid-level
   * (gold bought + boost must stay gold); a bought diamond stays diamond.
   */
  function clubTier() {
    const base = (game.profile && game.profile.clubTier) || 0;
    const boost = (game.run && game.run.clubBoost) || 0;
    const boosted = Math.max(base, Math.min(MAX_BOOST_TIER, base + boost));
    return Math.max(0, Math.min(CLUBS.length - 1, boosted));
  }

  function spawnEffect(type, x, y, data) {
    const dur = (data && data.dur) || EFFECT_DUR[type] || 0.6;
    game.effects.push({ type, x, y, t: 0, dur, data: data || null });
  }

  function floatText(text, x, y, color) {
    game.floats.push({ text: String(text), x, y, t: 0, dur: 1.0, color: color || '#fff' });
  }

  function nearest(list, x, y, filterFn) {
    let best = null, bestD = Infinity;
    if (!list) return null;
    for (const o of list) {
      if (isDead(o)) continue;
      if (filterFn && !filterFn(o)) continue;
      const d = (o.x - x) ** 2 + (o.y - y) ** 2;
      if (d < bestD) { bestD = d; best = o; }
    }
    return best;
  }

  /**
   * Push a circle entity out of obstacles and solid pumpkins, keep it on the floor.
   * Only the player may step into the open doorway (between the door posts).
   */
  function resolveCollisions(e) {
    if (!e) return;
    const r = e.r || 10;
    for (let pass = 0; pass < 2; pass++) {
      for (const o of game.obstacles) pushOut(e, r, o.x, o.y, o.r);
      for (const p of game.pumpkins) if (!p.dead && p !== e) pushOut(e, r, p.x, p.y, p.r);
    }
    e.x = Math.max(F.x0 + r, Math.min(F.x1 - r, e.x));
    e.y = Math.min(F.y1 - r * 0.5, e.y);

    const top = F.y0 + r;                       // lowest y the centre may have on the floor
    if (e.y >= top) return;
    const half = DOOR.w / 2 - r * 0.5;          // centre range inside the door opening
    const out = Math.abs(e.x - DOOR.x) - half;  // > 0: (partly) in front of the wall next to the door
    if (e === game.player && game.room.doorOpen && out < top - e.y) {
      // In (or stepping into) the open doorway: stay between the door posts. When only a few
      // pixels past a post, slide into the opening (shortest way out) instead of popping back.
      if (out > 0) e.x = DOOR.x + Math.sign(e.x - DOOR.x) * half;
      e.y = Math.max(F.y0 - DOOR_DEPTH, e.y);
    } else {
      // Against the back wall: only push back down. (v1 bug: the x was clamped to the door
      // posts *before* this check, so pushing into the wall anywhere — e.g. a top corner —
      // teleported the player to the door in the middle.)
      e.y = top;
    }
  }

  function pushOut(e, r, ox, oy, or) {
    const dx = e.x - ox, dy = e.y - oy;
    const min = r + or;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min) return;
    const d = Math.sqrt(d2);
    if (d < 0.001) { e.y += min; return; }
    e.x = ox + (dx / d) * min;
    e.y = oy + (dy / d) * min;
  }

  // ---------------------------------------------------------------- combat

  function damagePumpkin(p, dmg, source) {
    if (!p || p.dead || game.over) return false;
    p.hp -= dmg;
    p.hitFlash = 1;
    spawnEffect('hit', p.x, p.y - 24);
    if (p.hp <= 0) breakPumpkin(p);
    else hooks.sfx('hitPumpkin');
    return true;
  }

  function breakPumpkin(p) {
    p.dead = true;
    p.hp = 0;
    spawnEffect('smash', p.x, p.y);
    hooks.sfx('smashPumpkin');
    if (p.content === 'coin') {
      spawnCoins(p.x, p.y, ECONOMY.coinDrop(game.run.level) + (game.stats.coinBonus || 0));
    } else if (p.content === 'club') {
      game.pickups.push(makePickup('club', p.x, p.y, 0, 0, 0, 230));
    } else if (p.content === 'monster') {
      spawnMonster(p.monsterType || 'skeleton', p.x, p.y);
    }
  }

  function spawnMonster(type, x, y, spawned = false) {
    try {
      const m = Monsters.createMonster(type, x, y, game);
      if (!m) return null;
      if (m.id == null) m.id = Math.random();
      m.spawned = !!spawned;          // spawner monsters never block the door
      game.monsters.push(m);
      hooks.sfx('rise');
      return m;
    } catch (err) {
      warnOnce('createMonster', err);
      return null;
    }
  }

  // ---------------------------------------------------------------- spawner

  /** A random free floor spot at least SPAWNER.minDistFromPlayer from the player, or null. */
  function findSpawnSpot(r) {
    const p = game.player;
    const minD = SPAWNER.minDistFromPlayer;
    const free = (x, y) => {
      if (p && Math.hypot(x - p.x, y - p.y) < minD) return false;
      for (const o of game.obstacles) if (Math.hypot(x - o.x, y - o.y) < o.r + r + SPAWN_CLEAR) return false;
      for (const q of game.pumpkins) if (!q.dead && Math.hypot(x - q.x, y - q.y) < q.r + r + SPAWN_CLEAR) return false;
      for (const m of game.monsters) if (!isDead(m) && Math.hypot(x - m.x, y - m.y) < m.r + r + SPAWN_CLEAR) return false;
      return true;
    };
    const x0 = F.x0 + r + 6, x1 = F.x1 - r - 6, y0 = F.y0 + r + 16, y1 = F.y1 - r - 6;
    for (let i = 0; i < 60; i++) {
      const x = x0 + Math.random() * (x1 - x0), y = y0 + Math.random() * (y1 - y0);
      if (free(x, y)) return { x, y };
    }
    return null;
  }

  function updateSpawner(dt) {
    spawnT -= dt;
    if (spawnT > 0) return;
    const diffKey = (game.profile && game.profile.difficulty) || 'normal';
    spawnT = randIn(SPAWNER.interval[diffKey] || SPAWNER.interval.normal);
    const level = (game.run && game.run.level) || 1;
    const alive = game.monsters.filter((m) => m.spawned && !isDead(m)).length;
    if (alive >= SPAWNER.maxAlive(level)) return;
    const type = rollWeighted(level <= 1 ? SPAWNER.weightsLevel1 : SPAWNER.weights);
    const spot = findSpawnSpot((MONSTERS[type] && MONSTERS[type].radius) || 18);
    if (!spot) { spawnT = SPAWN_RETRY; return; }
    spawnMonster(type, Math.round(spot.x), Math.round(spot.y), true);
  }

  function damageMonster(m, dmg, source) {
    if (isDead(m) || game.over) return false;
    if (m.type === 'ghost' && m.state !== 'revealed') return false;   // only after the wolf howled
    m.hp -= dmg;
    m.hitFlash = 1;
    // Knock away from the player (bear/spikes too: it reads well and keeps things simple).
    const pl = game.player;
    if (pl) {
      const dx = m.x - pl.x, dy = m.y - pl.y;
      const d = Math.hypot(dx, dy) || 1;
      m.kx = (dx / d) * KNOCKBACK;
      m.ky = (dy / d) * KNOCKBACK;
    }
    spawnEffect('hit', m.x, m.y - 26);
    if (m.hp <= 0) killMonster(m);
    else hooks.sfx('hitMonster');
    return true;
  }

  function killMonster(m) {
    m.hp = 0;
    m.state = 'dead';
    if (m.type === 'skeleton') { spawnEffect('bones', m.x, m.y); hooks.sfx('skeletonBreak'); }
    else if (m.type === 'ghost') { spawnEffect('ghostVanish', m.x, m.y); hooks.sfx('monsterDie'); }
    else { spawnEffect('poof', m.x, m.y); hooks.sfx('monsterDie'); }
    const stats = MONSTERS[m.type];
    if (stats && Math.random() < (stats.coinChance || 0)) spawnCoins(m.x, m.y, 1);
  }

  function onMonsterContact(m) {
    const p = game.player;
    if (!p || game.over || p.invuln > 0 || isDead(m)) return;
    if (game.mods.spikeDamage > 0 && (m.type !== 'ghost' || m.state === 'revealed')) {
      spawnEffect('spikes', p.x, p.y);
      // A skeleton always breaks on the hedgehog's spikes.
      damageMonster(m, m.type === 'skeleton' ? m.hp + 1 : game.mods.spikeDamage, 'spikes');
    }
    const stats = MONSTERS[m.type];
    hurtPlayer(m.damage || (stats && stats.damage) || 1);
  }

  function hurtPlayer(amount = 1) {
    const p = game.player;
    if (!p || game.over || p.invuln > 0) return false;
    p.invuln = PLAYER.invulnTime;
    if (p.shields > 0) {
      p.shields--;
      spawnEffect('shield', p.x, p.y);
      hooks.sfx('shieldBlock');
      hooks.toast('toast.shieldBlock');
      return false;
    }
    game.run.hearts = Math.max(0, game.run.hearts - amount);
    hooks.sfx('hurt');
    spawnEffect('hit', p.x, p.y - 30);
    game.shake = 0.35;
    if (game.run.hearts <= 0) {
      game.over = true;
      hooks.onPlayerDied();
    }
    return true;
  }

  // ---------------------------------------------------------------- pickups

  function makePickup(kind, x, y, value, vx, vy, vz) {
    return { kind, x, y, value, t: 0, vx, vy, z: 0, vz, r: 8 };
  }

  function spawnCoins(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 70 + Math.random() * 90;
      game.pickups.push(makePickup('coin', x, y, 1, Math.cos(a) * s, Math.sin(a) * s * 0.8,
        200 + Math.random() * 90));
    }
  }

  function updatePickups(dt) {
    const p = game.player;
    const magnetR = Math.max(game.stats.pickupRadius || PLAYER.pickupRadius, game.mods.magnetRadius || 0);
    for (const pk of game.pickups) {
      pk.t += dt;
      // Hop: z is height above the floor.
      if (pk.z > 0 || pk.vz > 0) {
        pk.vz -= COIN_GRAVITY * dt;
        pk.z += pk.vz * dt;
        if (pk.z <= 0) {
          pk.z = 0;
          pk.vz = pk.vz < -80 ? -pk.vz * 0.4 : 0;
        }
      }
      pk.x += pk.vx * dt;
      pk.y += pk.vy * dt;
      const fr = Math.exp(-(pk.z > 0 ? 1.5 : 7) * dt);
      pk.vx *= fr; pk.vy *= fr;
      resolveCollisions(pk);
      if (!p) continue;

      const dx = p.x - pk.x, dy = p.y - pk.y;
      const d = Math.hypot(dx, dy);
      // Once the door is open, everything left on the floor flies to the player.
      const vacuum = game.room.doorOpen;
      if ((pk.kind === 'coin' || vacuum) && pk.t > 0.35 && (d < magnetR || vacuum) && d > 0.01) {
        const pull = (vacuum && d >= magnetR ? 560 : 220 + (1 - d / magnetR) * 520) * dt;
        const step = Math.min(pull, d);
        pk.x += (dx / d) * step;
        pk.y += (dy / d) * step;
        pk.vx *= 0.5; pk.vy *= 0.5;
      }
      const reach = pk.kind === 'coin' ? p.r + 10 : p.r + 18;
      if (pk.t > 0.25 && Math.hypot(p.x - pk.x, p.y - pk.y) < reach) collect(pk);
    }
    removeIf(game.pickups, (pk) => pk.collected);
  }

  function collect(pk) {
    pk.collected = true;
    const run = game.run;
    if (pk.kind === 'coin') {
      let v = pk.value || 1;
      if (Math.random() < (game.mods.doubleCoinChance || 0)) v *= 2;
      run.levelCoins += v;
      spawnEffect('coinSparkle', pk.x, pk.y - 10);
      hooks.sfx('coin');
      floatText('+' + v, pk.x, pk.y - 30, v > 1 ? '#ffe680' : '#ffd23f');
      return;
    }
    // Club item: +1 tier for this level up to MAX_BOOST_TIER (gold), otherwise coins.
    const atMax = clubTier() >= MAX_BOOST_TIER;
    spawnEffect('coinSparkle', pk.x, pk.y - 10);
    if (atMax) {
      run.levelCoins += CLUB_MAX_COINS;
      hooks.sfx('coin');
      hooks.toast('toast.clubMaxCoins');
      floatText('+' + CLUB_MAX_COINS, pk.x, pk.y - 30, '#ffd23f');
    } else {
      run.clubBoost = (run.clubBoost || 0) + 1;     // each pickup: +1 tier for this level
      hooks.sfx('clubUp');
      hooks.toast('toast.clubUp');
      floatText('⬆', pk.x, pk.y - 40, '#9ff07a');
    }
  }

  // ---------------------------------------------------------------- player

  function canHit(m) {
    return !isDead(m) && (m.type !== 'ghost' || m.state === 'revealed');
  }

  function updatePlayer(dt, input) {
    const p = game.player;
    const A = PLAYER.attack;
    const mv = input ? input.getMove() : { x: 0, y: 0 };
    const mag = Math.hypot(mv.x, mv.y);

    const ox = p.x, oy = p.y;
    const speed = game.stats.speed || PLAYER.speed;
    p.vx = mv.x * speed;
    p.vy = mv.y * speed;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    resolveCollisions(p);

    if (mag > 0.15 && p.swingT < 0) {
      p.facing = { x: mv.x / mag, y: mv.y / mag };
      p.dir = dirOf(p.facing.x, p.facing.y);
    }
    const moved = Math.hypot(p.x - ox, p.y - oy);
    p.walkPhase = moved > 0.05 ? p.walkPhase + moved * 0.055 : 0;

    p.invuln = Math.max(0, p.invuln - dt);
    p.attackCd = Math.max(0, p.attackCd - dt);
    if (p.swingT >= 0) {
      p.swingT += dt / A.swingTime;
      if (p.swingT >= 1) p.swingT = -1;
    }

    attackBuf = Math.max(0, attackBuf - dt);
    if (input && input.consumeAttack()) attackBuf = ATTACK_BUFFER;
    if (attackBuf > 0 && p.attackCd <= 0) {
      attackBuf = 0;
      swing();
    }
  }

  function swing() {
    const p = game.player;
    const A = PLAYER.attack;
    const range = game.stats.attackRange || A.range;

    // Soft auto-aim: turn toward the nearest thing we can hit.
    let aim = null, aimD = Infinity;
    const consider = (o) => {
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d <= range + o.r && d < aimD) { aim = o; aimD = d; }
    };
    for (const pk of game.pumpkins) if (!pk.dead) consider(pk);
    for (const m of game.monsters) if (canHit(m)) consider(m);
    if (aim && aimD > 0.01) {
      p.facing = { x: (aim.x - p.x) / aimD, y: (aim.y - p.y) / aimD };
      p.dir = dirOf(p.facing.x, p.facing.y);
    }

    p.swingT = 0;
    p.attackCd = game.stats.attackCooldown || A.cooldown;
    hooks.sfx('swing');

    const dmg = CLUBS[clubTier()].damage;
    const cosHalf = Math.cos((A.arcDeg / 2) * Math.PI / 180);
    const inArc = (o) => {
      const dx = o.x - p.x, dy = o.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > range + o.r) return false;
      if (d < p.r + o.r) return true;                     // touching: always hit
      return (dx * p.facing.x + dy * p.facing.y) / d >= cosHalf;
    };

    // Collect first, then apply (breaking pumpkins adds monsters to the list).
    const pumpkins = game.pumpkins.filter((pk) => !pk.dead && inArc(pk));
    const monsters = game.monsters.filter((m) => !isDead(m) && inArc(m));
    for (const pk of pumpkins) damagePumpkin(pk, dmg, 'player');
    let immune = null;
    for (const m of monsters) {
      if (canHit(m)) damageMonster(m, dmg, 'player');
      else if (m.type === 'ghost') immune = m;
    }
    if (immune) {
      floatText('?', immune.x, immune.y - 56, '#c8f7ff');
      hooks.sfx('ghostImmune');
      if (!ghostToastShown) { ghostToastShown = true; hooks.toast('toast.ghostImmune'); }
    }
  }

  // ---------------------------------------------------------------- room

  function checkDoor() {
    if (game.room.doorOpen) {
      const p = game.player;
      if (!game.cleared && p.y < F.y0 + 2 && Math.abs(p.x - DOOR.x) < DOOR.w / 2) {
        game.cleared = true;
        // Pickups that didn't reach the player yet still count.
        for (const pk of game.pickups) if (!pk.collected) collect(pk);
        removeIf(game.pickups, (pk) => pk.collected);
        game.over = true;
        hooks.onRoomCleared();
      }
      return;
    }
    if (game.pumpkins.some((p) => !p.dead)) return;
    // Only skeletons/zombies from pumpkins block the door (not ghosts, not spawner monsters).
    if (game.monsters.some((m) => !isDead(m) && m.type !== 'ghost' && !m.spawned)) return;
    game.room.doorOpen = true;
    hooks.sfx('doorOpen');
    hooks.toast('toast.doorOpen');
  }

  /**
   * Set up a fresh room. `roomData` comes from buildRoom().
   */
  function setupRoom({ profile, run, mods, roomData, speedMul }) {
    game.profile = profile;
    game.run = run;
    game.diff = DIFFICULTY[profile.difficulty] || DIFFICULTY.normal;
    game.speedMul = speedMul || 1;
    game.mods = { ...EMPTY_MODS, ...(mods || {}) };
    game.stats = playerStats(profile);
    game.room = { theme: roomData.theme, wallDecor: roomData.wallDecor, doorOpen: false };
    game.obstacles = roomData.obstacles;
    game.pumpkins = roomData.pumpkins;
    game.monsters = [];
    game.pickups = [];
    game.effects = [];
    game.floats = [];
    game.shake = 0;
    game.over = false;
    game.cleared = false;
    ghostToastShown = false;
    attackBuf = 0;
    spawnT = SPAWNER.firstDelay;

    const S = WORLD.PLAYER_START;
    game.player = createPlayer(S.x, S.y);
    game.player.shields = game.mods.shields || 0;

    game.pets = [];
    const offsets = [[-52, 6], [52, 6], [0, 34], [-96, 20], [96, 20]];
    (run.pets || []).forEach((pt, i) => {
      const [ox, oy] = offsets[i % offsets.length];
      try {
        const pet = Pets.createPet(pt.id, pt.level, S.x + ox, Math.min(F.y1 - 12, S.y + oy));
        if (pet) game.pets.push(pet);
      } catch (err) {
        warnOnce('createPet', err);
      }
    });
  }

  // ---------------------------------------------------------------- update

  function updateEffects(dt) {
    for (const e of game.effects) e.t += dt;
    removeIf(game.effects, (e) => e.t >= e.dur);
    for (const f of game.floats) f.t += dt;
    removeIf(game.floats, (f) => f.t >= f.dur);
    game.shake = Math.max(0, game.shake - dt);
  }

  function update(dt, input) {
    game.dt = dt;
    game.t += dt;
    if (!game.player) return;

    if (!game.over) {
      updatePlayer(dt, input);
      updateSpawner(dt);
    }

    for (const m of game.monsters) {
      if (isDead(m)) continue;
      try { Monsters.updateMonster(m, dt, game); } catch (err) { warnOnce('updateMonster', err); }
    }
    for (const pet of game.pets) {
      try { Pets.updatePet(pet, dt, game); } catch (err) { warnOnce('updatePet', err); }
    }
    for (const pk of game.pumpkins) if (pk.hitFlash > 0) pk.hitFlash = Math.max(0, pk.hitFlash - dt * 5);

    removeIf(game.monsters, isDead);
    removeIf(game.pumpkins, (p) => p.dead);
    updatePickups(dt);
    updateEffects(dt);
    if (!game.over) checkDoor();
  }

  /** While dying/transitioning: only let effects and texts play out. */
  function updateVisuals(dt) {
    game.dt = dt;
    game.t += dt;
    updateEffects(dt);
  }

  return { game, setupRoom, update, updateVisuals, clubTier };
}

function dirOf(x, y) {
  return Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
}
