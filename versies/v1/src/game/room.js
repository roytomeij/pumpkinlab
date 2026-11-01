// Room generation: obstacles, pumpkins (with pre-rolled contents) and wall decor.
//
// buildRoom(level, roomIndex, profile, petMods) -> {
//   theme, wallDecor:[{type, x}], doorOpen:false, obstacles:[{type,x,y,r}], pumpkins:[pumpkin]
// }

import {
  WORLD, PUMPKIN, DROP_BASE, DIFFICULTY, LEVELS, OBSTACLE_TYPES, monsterWeights,
} from '../config.js';
import * as sprites from '../render/sprites.js';

const FALLBACK_DECOR = ['shelf', 'window', 'poster', 'pipes', 'clock', 'skull'];

const F = WORLD.FLOOR;
const DOOR = WORLD.DOOR;
const START = WORLD.PLAYER_START;

// Layout tuning (pixels).
const WALL_GAP = 52;          // free space between an obstacle and a wall
const OBSTACLE_GAP = 72;      // free space between two obstacles (player is 36 wide)
const PUMPKIN_GAP = 30;       // free space between two pumpkins
const PUMPKIN_OBST_GAP = 34;  // free space between a pumpkin and an obstacle
const START_CLEAR = 120;      // nothing this close to the player start
const DOOR_CLEAR_Y = 130;     // keep the strip in front of the door free

let nextPumpkinId = 1;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/** Is (x, y) with radius r inside the area in front of the door? */
function blocksDoor(x, y, r) {
  return Math.abs(x - DOOR.x) < DOOR.w / 2 + r + 36 && y - r < F.y0 + DOOR_CLEAR_Y;
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

function placePumpkins(count, obstacles) {
  const r = PUMPKIN.radius;
  const list = [];
  let gap = PUMPKIN_GAP;
  for (let i = 0; i < count; i++) {
    let placed = false;
    // Relax spacing a bit if the room gets crowded.
    for (let round = 0; round < 4 && !placed; round++) {
      const g = gap * (1 - round * 0.3);
      for (let attempt = 0; attempt < 150; attempt++) {
        const x = rand(F.x0 + r + 26, F.x1 - r - 26);
        const y = rand(F.y0 + r + 34, F.y1 - r - 22);
        if (blocksDoor(x, y, r) || blocksStart(x, y, r)) continue;
        if (obstacles.some((o) => dist(x, y, o.x, o.y) < o.r + r + PUMPKIN_OBST_GAP)) continue;
        if (list.some((p) => dist(x, y, p.x, p.y) < p.r + r + g)) continue;
        list.push({ x: Math.round(x), y: Math.round(y), r });
        placed = true;
        break;
      }
    }
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

  const obstacles = placeObstacles(LEVELS.obstacles(level, roomIndex));
  const spots = placePumpkins(LEVELS.pumpkins(level, roomIndex), obstacles);

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
