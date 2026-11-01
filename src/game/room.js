// Room generation: obstacles, pumpkins (with pre-rolled contents) and wall decor.
//
// buildRoom(level, roomIndex, profile, petMods) -> {
//   theme, wallDecor:[{type, x}], doorOpen:false, obstacles:[{type,x,y,r}], pumpkins:[pumpkin]
// }

import {
  WORLD, PLAYER, PUMPKIN, DROP_BASE, DIFFICULTY, LEVELS, OBSTACLE_TYPES, monsterWeights,
} from '../config.js';
import * as sprites from '../render/sprites.js';

const FALLBACK_DECOR = ['shelf', 'window', 'poster', 'pipes', 'clock', 'skull'];

const F = WORLD.FLOOR;
const DOOR = WORLD.DOOR;
const START = WORLD.PLAYER_START;

// Layout tuning (pixels).
const WALL_GAP = 40;          // free space between an obstacle and a wall (player is 36 wide)
const OBSTACLE_GAP = 48;      // free space between two obstacles
// Pumpkins: free space to each other and to obstacles. Never below MIN_GAP, so the player
// always fits between any two of them: with every gap wider than the player, no pocket can
// form (only a pumpkin pressed into a corner, with nothing behind it) and all is reachable.
const MIN_GAP = PLAYER.radius * 2 + 2;     // 38: the player (36 wide) + a little slack
const PUMPKIN_GAPS = [58, 50, 44, MIN_GAP]; // preferred spacing first, tighter when crowded
const PUMPKIN_OBST_GAP = MIN_GAP;
const PUMPKIN_WALL_X = 12;    // pumpkin edge to side wall
const PUMPKIN_WALL_TOP = 20;  // pumpkin edge to back wall
const PUMPKIN_WALL_BOTTOM = 12;
const LOOSE_MAX = 16;         // up to this many pumpkins: all placed at random
const LOOSE_MIN = 4;          // busier rooms: at least this many at random, the rest packed snugly
const GRID_STEP = 8;          // fallback scan when random tries fail
const SNUG_PICK = 4;          // fallback picks among this many snuggest free spots
const LAYOUT_TRIES = 8;       // re-roll obstacles if the pumpkins really don't fit
const LAYOUT_TRIES_FEWER = 3; // tries per step with one obstacle fewer (last resort)
const START_CLEAR = 100;      // nothing this close to the player start
const DOOR_CLEAR_Y = 110;     // keep the strip in front of the door free

let nextPumpkinId = 1;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/** Is (x, y) with radius r inside the area in front of the door? */
function blocksDoor(x, y, r) {
  return Math.abs(x - DOOR.x) < DOOR.w / 2 + r + 24 && y - r < F.y0 + DOOR_CLEAR_Y;
}

function blocksStart(x, y, r) {
  return dist(x, y, START.x, START.y) < START_CLEAR + r;
}

/** Weighted random key from { key: weight }. */
export function rollWeighted(weights) {
  let total = 0;
  for (const k in weights) total += Math.max(0, weights[k]);
  if (total <= 0) return Object.keys(weights)[0];
  let r = Math.random() * total;
  for (const k in weights) {
    r -= Math.max(0, weights[k]);
    if (r < 0) return k;
  }
  return Object.keys(weights)[0];
}

/** Content chances (percent) for a pumpkin, after difficulty/dog/owl adjustments. */
export function dropChances(difficulty, petMods) {
  const diff = DIFFICULTY[difficulty] || DIFFICULTY.normal;
  const mods = petMods || {};
  const shift = diff.coinShift || 0;
  const coinBonus = mods.coinBonus || 0;
  const clubBonus = mods.clubBonus || 0;
  const c = {
    coin: DROP_BASE.coin + shift + coinBonus,
    monster: DROP_BASE.monster - shift - coinBonus - clubBonus,
    club: DROP_BASE.club + clubBonus,
  };
  for (const k in c) c[k] = Math.max(0, c[k]);
  return c;
}

function placeObstacles(count) {
  const types = Object.keys(OBSTACLE_TYPES);
  const list = [];
  for (let i = 0; i < count; i++) {
    const type = pick(types);
    const r = OBSTACLE_TYPES[type].r;
    for (let attempt = 0; attempt < 200; attempt++) {
      const x = rand(F.x0 + r + WALL_GAP, F.x1 - r - WALL_GAP);
      const y = rand(F.y0 + r + WALL_GAP, F.y1 - r - WALL_GAP);
      if (blocksDoor(x, y, r) || blocksStart(x, y, r)) continue;
      if (list.some((o) => dist(x, y, o.x, o.y) < o.r + r + OBSTACLE_GAP)) continue;
      list.push({ type, x: Math.round(x), y: Math.round(y), r });
      break;
    }
  }
  return list;
}

/**
 * Place up to `count` pumpkins. Spacing starts generous and tightens when the room fills up,
 * but never below MIN_GAP. Random tries first; if those fail, scan the whole floor on a grid
 * and pick a random free spot, so a spot is only missed when there really is none.
 */
function placePumpkins(count, obstacles) {
  const r = PUMPKIN.radius;
  const list = [];
  const xMin = F.x0 + r + PUMPKIN_WALL_X, xMax = F.x1 - r - PUMPKIN_WALL_X;
  const yMin = F.y0 + r + PUMPKIN_WALL_TOP, yMax = F.y1 - r - PUMPKIN_WALL_BOTTOM;
  const ok = (x, y, g) => !blocksDoor(x, y, r) && !blocksStart(x, y, r) &&
    !obstacles.some((o) => dist(x, y, o.x, o.y) < o.r + r + PUMPKIN_OBST_GAP) &&
    !list.some((p) => dist(x, y, p.x, p.y) < p.r + r + g);
  // Free space left around (x, y): distance to the nearest pumpkin/obstacle/wall beyond its minimum.
  const slack = (x, y) => {
    let m = Math.min(x - xMin, xMax - x, y - yMin, yMax - y);
    for (const p of list) m = Math.min(m, dist(x, y, p.x, p.y) - p.r - r - MIN_GAP);
    for (const o of obstacles) m = Math.min(m, dist(x, y, o.x, o.y) - o.r - r - PUMPKIN_OBST_GAP);
    return m;
  };
  // Round to whole pixels first, so the checked spot is exactly the stored one.
  const tryAt = (x, y, g) => {
    x = Math.round(x); y = Math.round(y);
    if (!ok(x, y, g)) return false;
    list.push({ x, y, r });
    return true;
  };

  const looseCount = count <= LOOSE_MAX ? count : Math.max(LOOSE_MIN, 2 * LOOSE_MAX - count);
  for (let i = 0; i < count; i++) {
    let placed = false;
    // Busy rooms: only the first few go anywhere at random; the rest pack snugly (below).
    const gaps = i < looseCount ? PUMPKIN_GAPS : [];
    for (const g of gaps) {
      for (let attempt = 0; attempt < 60 && !placed; attempt++) placed = tryAt(rand(xMin, xMax), rand(yMin, yMax), g);
      if (placed) break;
    }
    if (placed) continue;
    // Crowded: scan every grid spot at the minimum gap and take one of the snuggest
    // (closest to its neighbours/walls), which packs much tighter than random spots.
    const free = [];
    const ox = rand(0, GRID_STEP), oy = rand(0, GRID_STEP);
    for (let y = yMin + oy; y <= yMax; y += GRID_STEP) {
      for (let x = xMin + ox; x <= xMax; x += GRID_STEP) {
        const rx = Math.round(x), ry = Math.round(y);
        if (ok(rx, ry, MIN_GAP)) free.push({ x: rx, y: ry, slack: slack(rx, ry) });
      }
    }
    if (!free.length) break;               // full: the caller may try another layout
    free.sort((a, b) => a.slack - b.slack);
    const c = free[Math.floor(Math.random() * Math.min(SNUG_PICK, free.length))];
    tryAt(c.x, c.y, MIN_GAP);
  }
  return list;
}

function makeWallDecor() {
  const types = Array.isArray(sprites.WALL_DECOR_TYPES) && sprites.WALL_DECOR_TYPES.length
    ? sprites.WALL_DECOR_TYPES : FALLBACK_DECOR;
  // Six slots, three on each side of the door; use 4-6 of them.
  const slots = [140, 262, 384, 640, 762, 884];
  const n = 4 + Math.floor(Math.random() * 3);
  const chosen = slots.slice().sort(() => Math.random() - 0.5).slice(0, n).sort((a, b) => a - b);
  const decor = [];
  let prev = null;
  for (const sx of chosen) {
    let type = pick(types);
    if (type === prev && types.length > 1) type = pick(types.filter((t) => t !== prev));
    prev = type;
    decor.push({ type, x: Math.round(sx + rand(-14, 14)) });
  }
  return decor;
}

export function buildRoom(level, roomIndex, profile, petMods) {
  const difficulty = (profile && profile.difficulty) || 'normal';
  const theme = (Math.max(1, level) - 1) % (LEVELS.themes || 5);

  // All pumpkins must fit. Busy rooms (up to 30 pumpkins + 6 obstacles) almost always do;
  // otherwise re-roll the obstacles, and as a last resort use one obstacle fewer (about 3% of
  // the rooms at level 9+, where 26-30 pumpkins share the floor with 6 obstacles).
  const wantPumpkins = LEVELS.pumpkins(level, roomIndex);
  const wantObstacles = LEVELS.obstacles(level, roomIndex);
  let obstacles = [], spots = [];
  for (let tries = 0, nObs = wantObstacles; spots.length < wantPumpkins && nObs >= 0; tries++) {
    if (tries >= LAYOUT_TRIES) { nObs--; tries = LAYOUT_TRIES - LAYOUT_TRIES_FEWER; }
    if (nObs < 0) break;
    const obs = placeObstacles(nObs);
    const sp = placePumpkins(wantPumpkins, obs);
    if (sp.length > spots.length || !obstacles.length) { obstacles = obs; spots = sp; }
  }

  const chances = dropChances(difficulty, petMods);
  const weights = monsterWeights(level, difficulty);
  const pumpkins = spots.map((s) => {
    const content = rollWeighted(chances);
    return {
      id: nextPumpkinId++,
      x: s.x, y: s.y, r: s.r,
      hp: PUMPKIN.hp, maxHp: PUMPKIN.hp,
      content,
      monsterType: content === 'monster' ? rollWeighted(weights) : null,
      hitFlash: 0,
      dead: false,
    };
  });

  return { theme, wallDecor: makeWallDecor(), doorOpen: false, obstacles, pumpkins };
}
