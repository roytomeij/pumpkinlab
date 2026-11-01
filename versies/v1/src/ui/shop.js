// Winkel: aanbod berekenen en kopen.
import { CLUBS, ECONOMY, PLAYER, PET_IDS } from '../config.js';
import { saveProfile } from './save.js';

function totalCoins(profile, run) {
  return (run ? run.levelCoins || 0 : 0) + (profile.bankCoins || 0);
}

export function getShopItems(profile, run) {
  const items = [];
  const coins = totalCoins(profile, run);
  const tier = profile.clubTier || 0;

  // +1 hartje
  if (run) {
    const canUse = run.hearts < PLAYER.maxHearts;
    items.push({
      id: 'heart', kind: 'heart', ref: 'heart', price: ECONOMY.heartPrice,
      owned: false, full: !canUse, available: canUse && coins >= ECONOMY.heartPrice,
    });
  }

  // Knuppels (alle tiers boven hout; lager/gelijk = al in bezit)
  for (let i = 1; i < CLUBS.length; i++) {
    const c = CLUBS[i];
    const owned = i <= tier;
    // Elke hogere tier is koopbaar (je mag er een overslaan); lagere/gelijke = al in bezit
    items.push({
      id: 'club:' + c.id, kind: 'club', ref: c.id, tier: i, price: c.price,
      owned, available: !owned && coins >= c.price,
    });
  }

  // Dier-upgrades
  const owned = (profile.ownedPets || []).slice().sort((a, b) => PET_IDS.indexOf(a) - PET_IDS.indexOf(b));
  for (const id of owned) {
    const lvl = (profile.petLevels && profile.petLevels[id]) || 1;
    if (lvl >= 3) {
      items.push({ id: 'pet:' + id, kind: 'petUpgrade', ref: id, level: lvl, price: 0, owned: true, available: false });
      continue;
    }
    const price = ECONOMY.petUpgradePrice[lvl];
    items.push({
      id: 'pet:' + id, kind: 'petUpgrade', ref: id, level: lvl, nextLevel: lvl + 1, price,
      owned: false, available: coins >= price,
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
  if (!item || !item.available) return false;
  if (!pay(item.price, profile, run)) return false;
  if (item.kind === 'club') {
    profile.clubTier = Math.max(profile.clubTier || 0, item.tier);
  } else if (item.kind === 'petUpgrade') {
    if (!profile.petLevels) profile.petLevels = {};
    profile.petLevels[item.ref] = item.nextLevel;
    if (run && Array.isArray(run.pets)) {
      for (const p of run.pets) if (p.id === item.ref) p.level = item.nextLevel;
    }
  } else if (item.kind === 'heart') {
    run.hearts = Math.min(PLAYER.maxHearts, run.hearts + 1);
  }
  profile.hasProgress = true;
  saveProfile(profile);
  return true;
}
