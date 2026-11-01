// Winkel: aanbod berekenen en kopen.
//
// Item-vorm (alle items):
//   { id, kind: 'club'|'upgrade'|'petUpgrade'|'heart', section: 'clubs'|'upgrades'|'pets'|'hearts', ref, price,
//     available /* nu te koop én genoeg geld */, owned /* in bezit of maximaal */, locked /* level te laag */,
//     unlockLevel /* level waarop het open gaat, of 0 */ }
// Extra per soort:
//   club:       tier
//   upgrade:    level (huidig aantal gekocht), max, nextLevel (alleen als niet maximaal)
//   petUpgrade: level, nextLevel
//   heart:      full (hartjes al vol), max (playerStats(profile).maxHearts)
import { CLUBS, ECONOMY, PET_IDS, UPGRADES, UPGRADE_IDS, upgradeLevel, playerStats } from '../config.js';
import { saveProfile } from './save.js';

export const SHOP_SECTIONS = ['clubs', 'upgrades', 'pets', 'hearts'];

function totalCoins(profile, run) {
  return (run ? run.levelCoins || 0 : 0) + (profile.bankCoins || 0);
}

export function getShopItems(profile, run) {
  const items = [];
  const coins = totalCoins(profile, run);
  const tier = profile.clubTier || 0;
  const plevel = Math.max(1, profile.level | 0);

  // Knuppels (alle tiers boven hout). Elke hogere tier is koopbaar (je mag er een overslaan);
  // lager/gelijk = al in bezit. Een knuppel met minLevel zit op slot tot profile.level dat haalt.
  for (let i = 1; i < CLUBS.length; i++) {
    const c = CLUBS[i];
    const owned = i <= tier;
    const unlockLevel = c.minLevel || 0;
    const locked = !owned && plevel < unlockLevel;
    items.push({
      id: 'club:' + c.id, kind: 'club', section: 'clubs', ref: c.id, tier: i, price: c.price,
      owned, locked, unlockLevel, available: !owned && !locked && coins >= c.price,
    });
  }

  // Permanente upgrades: telkens de volgende stap.
  for (const id of UPGRADE_IDS) {
    const u = UPGRADES[id];
    const n = upgradeLevel(profile, id);
    if (n >= u.max) {
      items.push({
        id: 'upgrade:' + id, kind: 'upgrade', section: 'upgrades', ref: id, level: n, max: u.max,
        price: 0, owned: true, locked: false, unlockLevel: 0, available: false,
      });
      continue;
    }
    const price = u.prices[n];
    const unlockLevel = u.minLevel[n] || 0;
    const locked = plevel < unlockLevel;
    items.push({
      id: 'upgrade:' + id, kind: 'upgrade', section: 'upgrades', ref: id, level: n, nextLevel: n + 1, max: u.max,
      price, owned: false, locked, unlockLevel, available: !locked && coins >= price,
    });
  }

  // Dier-upgrades
  const owned = (profile.ownedPets || []).slice().sort((a, b) => PET_IDS.indexOf(a) - PET_IDS.indexOf(b));
  for (const id of owned) {
    const lvl = (profile.petLevels && profile.petLevels[id]) || 1;
    if (lvl >= 3) {
      items.push({
        id: 'pet:' + id, kind: 'petUpgrade', section: 'pets', ref: id, level: lvl, price: 0,
        owned: true, locked: false, unlockLevel: 0, available: false,
      });
      continue;
    }
    const price = ECONOMY.petUpgradePrice[lvl];
    items.push({
      id: 'pet:' + id, kind: 'petUpgrade', section: 'pets', ref: id, level: lvl, nextLevel: lvl + 1, price,
      owned: false, locked: false, unlockLevel: 0, available: coins >= price,
    });
  }

  // +1 hartje (alleen tijdens een run)
  if (run) {
    const max = playerStats(profile).maxHearts;
    const canUse = run.hearts < max;
    items.push({
      id: 'heart', kind: 'heart', section: 'hearts', ref: 'heart', price: ECONOMY.heartPrice, max,
      owned: false, full: !canUse, locked: false, unlockLevel: 0, available: canUse && coins >= ECONOMY.heartPrice,
    });
  }

  return items;
}

function pay(price, profile, run) {
  if (totalCoins(profile, run) < price) return false;
  let rest = price;
  if (run) {
    const fromLevel = Math.min(run.levelCoins || 0, rest);
    run.levelCoins = (run.levelCoins || 0) - fromLevel;
    rest -= fromLevel;
  }
  profile.bankCoins = (profile.bankCoins || 0) - rest;
  return true;
}

export function buy(itemId, profile, run) {
  const item = getShopItems(profile, run).find((i) => i.id === itemId);
  if (!item || !item.available || item.locked) return false;
  if (!pay(item.price, profile, run)) return false;
  if (item.kind === 'club') {
    profile.clubTier = Math.max(profile.clubTier || 0, item.tier);
  } else if (item.kind === 'upgrade') {
    if (!profile.upgrades || typeof profile.upgrades !== 'object') profile.upgrades = {};
    profile.upgrades[item.ref] = item.nextLevel;
    // Een extra max-hartje vult meteen ook een hartje bij.
    if (item.ref === 'maxHeart' && run) {
      run.hearts = Math.min(playerStats(profile).maxHearts, (run.hearts | 0) + 1);
    }
  } else if (item.kind === 'petUpgrade') {
    if (!profile.petLevels) profile.petLevels = {};
    profile.petLevels[item.ref] = item.nextLevel;
    if (run && Array.isArray(run.pets)) {
      for (const p of run.pets) if (p.id === item.ref) p.level = item.nextLevel;
    }
  } else if (item.kind === 'heart') {
    run.hearts = Math.min(playerStats(profile).maxHearts, run.hearts + 1);
  }
  profile.hasProgress = true;
  saveProfile(profile);
  return true;
}
