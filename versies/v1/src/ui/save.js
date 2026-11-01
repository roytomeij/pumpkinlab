// Opslag van profiel (instellingen + voortgang) in localStorage.
import { PET_IDS } from '../config.js';

const KEY = 'pompoenlab.v1';

export function defaultProfile() {
  return {
    lang: 'nl', difficulty: 'normal', musicTrack: 0,
    musicVolume: 0.5, sfxVolume: 0.8,
    bankCoins: 0, clubTier: 0,
    ownedPets: [], petLevels: {},
    level: 1, lastPets: [],
    hasProgress: false,
  };
}

const SETTINGS_KEYS = ['lang', 'difficulty', 'musicTrack', 'musicVolume', 'sfxVolume'];

function sanitize(p) {
  const d = defaultProfile();
  if (!['nl', 'en'].includes(p.lang)) p.lang = d.lang;
  if (!['easy', 'normal', 'hard'].includes(p.difficulty)) p.difficulty = d.difficulty;
  if (![0, 1, 2].includes(p.musicTrack)) p.musicTrack = d.musicTrack;
  for (const k of ['musicVolume', 'sfxVolume']) {
    if (typeof p[k] !== 'number' || !isFinite(p[k])) p[k] = d[k];
    p[k] = Math.max(0, Math.min(1, p[k]));
  }
  for (const k of ['bankCoins', 'clubTier', 'level']) {
    if (typeof p[k] !== 'number' || !isFinite(p[k])) p[k] = d[k];
  }
  p.clubTier = Math.max(0, Math.min(3, Math.floor(p.clubTier)));
  p.level = Math.max(1, Math.floor(p.level));
  p.bankCoins = Math.max(0, Math.floor(p.bankCoins));
  if (!Array.isArray(p.ownedPets)) p.ownedPets = [];
  if (!Array.isArray(p.lastPets)) p.lastPets = [];
  // Alleen bekende dieren, geen dubbele.
  p.ownedPets = [...new Set(p.ownedPets)].filter((id) => PET_IDS.includes(id));
  p.lastPets = [...new Set(p.lastPets)].filter((id) => p.ownedPets.includes(id));
  if (!p.petLevels || typeof p.petLevels !== 'object' || Array.isArray(p.petLevels)) p.petLevels = {};
  const levels = {};
  for (const id of p.ownedPets) {
    const l = Math.floor(Number(p.petLevels[id]) || 1);
    levels[id] = Math.max(1, Math.min(3, l));
  }
  p.petLevels = levels;
  p.hasProgress = !!p.hasProgress;
  return p;
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return sanitize({ ...defaultProfile(), ...data });
  } catch (e) {
    return null;
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
    return true;
  } catch (e) {
    return false;
  }
}

// Houdt de instellingen, wist de voortgang. Wijzigt het object zelf en geeft het terug.
export function resetProgress(profile) {
  const d = defaultProfile();
  const keep = {};
  for (const k of SETTINGS_KEYS) if (profile && profile[k] !== undefined) keep[k] = profile[k];
  const fresh = sanitize({ ...d, ...keep });
  if (profile && typeof profile === 'object') {
    for (const k of Object.keys(profile)) delete profile[k];
    Object.assign(profile, fresh);
    saveProfile(profile);
    return profile;
  }
  saveProfile(fresh);
  return fresh;
}
