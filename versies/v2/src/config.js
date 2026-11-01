// Gedeelde spelgetallen. ALLE modules lezen hieruit; niemand hardcodeert balans-waarden elders.

export const WORLD = {
  W: 1024, H: 640, TILE: 64,
  // Loopbare vloer (logische pixels). Achtermuur boven de vloer (y 0..160), dunne voormuur onder (608..640).
  FLOOR: { x0: 64, y0: 160, x1: 960, y1: 608 },
  DOOR: { x: 512, y: 160, w: 96 },          // uitgang in het midden van de achtermuur
  PLAYER_START: { x: 512, y: 560 },
};

export const PLAYER = {
  speed: 220, radius: 18, maxHearts: 5, invulnTime: 1.0,
  attack: { range: 80, arcDeg: 140, cooldown: 0.35, swingTime: 0.2 },
  pickupRadius: 40,
};

// Knuppels: aantal slagen voor een pompoen (hp 60): hout 5, steen 4, ijzer 3, goud 2, diamant 1.
// minLevel: pas te koop in de winkel vanaf dit level (profile.level). Pompoen-items geven max goud (tier 3).
export const CLUBS = [
  { id: 'wood',    damage: 12, price: 0 },
  { id: 'stone',   damage: 15, price: 20 },
  { id: 'iron',    damage: 20, price: 50 },
  { id: 'gold',    damage: 30, price: 100 },
  { id: 'diamond', damage: 60, price: 300, minLevel: 8 },
];
export const MAX_BOOST_TIER = 3;   // een knuppel uit een pompoen brengt je hooguit tot goud

export const PUMPKIN = { hp: 60, radius: 22 };

export const MONSTERS = {
  skeleton: { hp: 1,  speed: 70, radius: 16, damage: 1, coinChance: 0 },   // 1 klap, valt uit elkaar
  zombie:   { hp: 36, speed: 55, radius: 18, damage: 1, coinChance: 0.5 }, // 3 klappen met hout
  ghost:    { hp: 1,  speed: 60, radius: 18, damage: 1, coinChance: 0.5,   // alleen raakbaar na wolf-gehuil
              phasing: true },
};
export const MONSTER_RISE_TIME = 0.6;     // monster klimt uit pompoen, nog ongevaarlijk
export const MONSTER_TOUCH_COOLDOWN = 1.0;

// Inhoud pompoen (procenten). Hond/uil schuiven kans weg bij 'monster'.
export const DROP_BASE = { coin: 30, monster: 60, club: 10 };

// Monstersoort per level (gewichten). Geesten pas vanaf level 2.
export function monsterWeights(level, difficulty) {
  if (level <= 1) return { skeleton: 50, zombie: 50, ghost: 0 };
  const w = { skeleton: 35, zombie: 40, ghost: 25 };
  if (difficulty === 'hard') { w.ghost = 32; w.skeleton = 28; }
  if (difficulty === 'easy') { w.ghost = 18; w.skeleton = 45; w.zombie = 37; }
  return w;
}

export const DIFFICULTY = {
  easy:   { monsterSpeed: 0.8,  coinShift: +10 }, // +10 munt, -10 monster
  normal: { monsterSpeed: 1.0,  coinShift: 0 },
  hard:   { monsterSpeed: 1.25, coinShift: -10 }, // -10 munt, +10 monster
};

export const ECONOMY = {
  coinDrop: (level) => 1 + Math.floor(Math.random() * 3) + (level - 1), // munten per munt-pompoen
  roomClearBonus: 3,
  levelClearBonus: 10,
  allPetsOwnedBonus: 25,          // als er geen nieuw dier meer te krijgen is
  heartPrice: 8,                  // +1 hartje in de winkel (max 5)
  petUpgradePrice: [0, 25, 60],   // prijs om naar level 2 resp. 3 te gaan (index = huidig level)
};

export const LEVELS = {
  storyLevels: 5,                 // na level 5: overwinning, daarna optioneel eindeloos doorspelen
  roomsPerLevel: 3,
  // v2: ongeveer 2x zoveel als v1, en groeit sneller per level. Level 1: 10/12/14, level 5: 18/20/22, max 30.
  pumpkins: (level, room) => Math.min(30, 10 + 2 * (level - 1) + 2 * room),   // room 0..2
  obstacles: (level, room) => Math.min(6, 2 + Math.floor((level + room) / 2)),
  endlessSpeedPerLevel: 0.05,     // boven level 5: monsters +5% sneller per level
  themes: 5,                      // kamerthema 0..4, thema = (level-1) % 5
};

export const OBSTACLE_TYPES = {
  table:    { r: 34 },  // labtafel met flesjes
  cauldron: { r: 28 },  // borrelende ketel
  coffin:   { r: 30 },  // doodskist
  tubes:    { r: 26 },  // glazen buizen met groene vloeistof
};

// v2: monsters die vanzelf verschijnen (los van de pompoenen). Ze blokkeren de deur NIET (m.spawned = true).
export const SPAWNER = {
  interval: { easy: [7, 12], normal: [5, 10], hard: [4, 8] },  // seconden tussen spawns (willekeurig)
  firstDelay: 5,                                  // eerste spawn na zoveel seconden in de kamer
  weights: { zombie: 55, skeleton: 30, ghost: 15 },
  weightsLevel1: { zombie: 65, skeleton: 35, ghost: 0 },   // geen geesten in level 1 (je hebt dan nog geen wolf)
  maxAlive: (level) => Math.min(8, 4 + Math.floor(level / 2)), // max tegelijk levende gespawnde monsters
  minDistFromPlayer: 260,
};

// v2: permanente upgrades in de winkel. profile.upgrades[id] = aantal keer gekocht (0..max).
// prices[i] en minLevel[i] gelden voor de (i+1)-de aankoop. minLevel vergelijkt met profile.level.
export const UPGRADES = {
  petSlot:  { max: 2, prices: [150, 400], minLevel: [7, 12] },  // 4e en 5e dierplek
  maxHeart: { max: 2, prices: [60, 150],  minLevel: [3, 6] },   // max hartjes 6, 7
  shoes:    { max: 2, prices: [40, 90],   minLevel: [2, 4] },   // +12% loopsnelheid per stap
  swing:    { max: 2, prices: [50, 110],  minLevel: [2, 5] },   // slagpauze x0.8 per stap
  reach:    { max: 2, prices: [45, 100],  minLevel: [3, 6] },   // +15 px slagbereik per stap
  magnet:   { max: 2, prices: [30, 70],   minLevel: [1, 4] },   // +40 px opraapafstand per stap
  luck:     { max: 2, prices: [80, 160],  minLevel: [4, 8] },   // +1 munt per munt-pompoen per stap
};
export const UPGRADE_IDS = Object.keys(UPGRADES);

export function upgradeLevel(profile, id) {
  const n = (profile && profile.upgrades && profile.upgrades[id]) | 0;
  return Math.max(0, Math.min(UPGRADES[id].max, n));
}

// Effectieve spelerwaarden inclusief upgrades. Engine en UI gebruiken ALLEEN deze functie.
export function playerStats(profile) {
  const u = (id) => upgradeLevel(profile, id);
  return {
    maxHearts: PLAYER.maxHearts + u('maxHeart'),
    speed: PLAYER.speed * (1 + 0.12 * u('shoes')),
    attackCooldown: PLAYER.attack.cooldown * Math.pow(0.8, u('swing')),
    attackRange: PLAYER.attack.range + 15 * u('reach'),
    pickupRadius: PLAYER.pickupRadius + 40 * u('magnet'),
    coinBonus: u('luck'),
    petSlots: MAX_PETS_IN_ROOM + u('petSlot'),
  };
}

export const MAX_PETS_IN_ROOM = 3;   // basis; met upgrades tot 5 (zie playerStats().petSlots)
export const FIRST_PET = 'wolf';  // altijd beloning na level 1; daarna willekeurig uit de rest

// Dieren. Waarden zijn arrays per dier-level [L1, L2, L3].
export const PETS = {
  wolf:     { howlRadius: [220, 280, 360], cooldown: [6, 4.5, 3], revealTime: [3, 4, 5] },
  dog:      { coinBonus: [10, 15, 20] },                       // procentpunten van monster -> munt
  bear:     { attackRadius: [110, 130, 160], damage: [12, 18, 24], cooldown: [1.5, 1.2, 0.9] },
  cat:      { revealRadius: [180, 300, 9999] },                 // toont inhoud van pompoenen
  owl:      { clubBonus: [5, 8, 12] },                          // procentpunten van monster -> knuppel
  bat:      { pumpkinDamage: [6, 9, 12], cooldown: [2, 1.6, 1.2] }, // vleermuis hakt mee op pompoenen
  turtle:   { shields: [1, 2, 3] },                             // schild vangt klappen op, per kamer
  hedgehog: { spikeDamage: [12, 18, 30] },                      // monsters die je raken krijgen schade; skelet breekt
  raven:    { magnetRadius: [120, 200, 320], doubleChance: [0.1, 0.2, 0.3] }, // trekt munten aan
};
export const PET_IDS = Object.keys(PETS);
