// Engine: main loop, canvas, and the game flow (title -> level -> rooms -> shop -> ...).
// The per-room simulation lives in world.js, drawing in draw.js, room generation in room.js.

import {
  ECONOMY, LEVELS, FIRST_PET, PET_IDS, MAX_BOOST_TIER, playerStats,
} from '../config.js';
import * as I18n from '../ui/i18n.js';
import * as Save from '../ui/save.js';
import * as Pets from './pets.js';
import { buildRoom } from './room.js';
import { createWorld, EMPTY_MODS, warnOnce } from './world.js';
import { drawWorld } from './draw.js';
import { setupScreen } from './screen.js';

const MAX_DT = 0.05;
const PAUSE_GUARD = 0.25;     // s after resuming in which a pause key is ignored (no instant re-pause)

/**
 * A shared one-shot gate for one overlay: wrap every way out of it (its buttons and the
 * engine's fallback) so only the first one ever runs, even if the UI throws half-way.
 */
function gate() {
  let done = false;
  return (fn) => (...args) => {
    if (done) return undefined;
    done = true;
    return fn && fn(...args);
  };
}

export function createEngine({ canvas, ui, audio, input }) {
  const screen = setupScreen(canvas);

  let profile = null;
  let run = null;
  // 'boot' | 'title' | 'overlay' | 'play' | 'paused' | 'dying' | 'transition'
  let mode = 'boot';
  let timers = [];
  let pauseGuard = 0;
  let lastHud = '';
  let last = 0;
  let currentTrack = null;      // music track that is (or will be) playing

  const world = createWorld({ sfx, toast, onRoomCleared, onPlayerDied });
  const game = world.game;

  // ------------------------------------------------------------ small wrappers

  function t(key, params) {
    try { return typeof I18n.t === 'function' ? I18n.t(key, params) : key; } catch { return key; }
  }

  function sfx(name) {
    try { audio && audio.sfx && audio.sfx(name); } catch (err) { warnOnce('audio.sfx', err); }
  }

  function toast(key, params) {
    try { ui.toast && ui.toast(t(key, params)); } catch (err) { warnOnce('ui.toast', err); }
  }

  /** Show a UI overlay; if the UI lacks it (or throws), run `fallback` so the flow never stalls. */
  function overlay(name, opts, fallback) {
    try {
      if (typeof ui[name] === 'function') { ui[name](opts); return; }
      warnOnce('ui.' + name, 'missing');
    } catch (err) {
      warnOnce('ui.' + name, err);
    }
    if (fallback) fallback();
  }

  function hideAll() {
    try { ui.hideAll && ui.hideAll(); } catch (err) { warnOnce('ui.hideAll', err); }
  }

  function later(sec, fn) { timers.push({ t: sec, fn }); }

  function blurFocus() {
    const el = document.activeElement;
    if (el && el !== document.body && typeof el.blur === 'function') el.blur();
  }

  /** Effective volumes: a switch that is off (musicOn/sfxOn === false) means volume 0. */
  function applyAudioSettings() {
    const vol = (on, v) => (on === false ? 0 : (typeof v === 'number' ? v : 1));
    try {
      audio.setMusicVolume && audio.setMusicVolume(vol(profile.musicOn, profile.musicVolume));
      audio.setSfxVolume && audio.setSfxVolume(vol(profile.sfxOn, profile.sfxVolume));
    } catch (err) { warnOnce('audio.volume', err); }
  }

  /** Player numbers including the bought upgrades (hearts, speed, reach, pet slots, ...). */
  function stats() { return playerStats(profile); }

  function save() {
    try { Save.saveProfile(profile); } catch (err) { warnOnce('saveProfile', err); }
  }

  /** Bought club + this level's pumpkin boost: 0..CLUBS.length-1 (4 = diamond). Same rule as world.clubTier(). */
  function effectiveTier() {
    if (!run) return profile ? profile.clubTier || 0 : 0;
    return world.clubTier();
  }

  // ------------------------------------------------------------ boot + settings

  function boot() {
    let p = null;
    try { p = Save.loadProfile(); } catch (err) { warnOnce('loadProfile', err); }
    profile = p || Save.defaultProfile();
    try { I18n.setLang(profile.lang); } catch (err) { warnOnce('setLang', err); }
    applyAudioSettings();
    currentTrack = profile.musicTrack;
    setupAudioUnlock();
    setupTouchDetection();
    // Switching apps/tabs mid-room: pause instead of letting monsters roam unseen.
    document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') openPause(); });
    goTitle();
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function setupAudioUnlock() {
    let musicStarted = false;
    const EVENTS = ['pointerdown', 'keydown', 'touchend', 'click'];
    const unlock = (e) => {
      // A click/touchend/keydown is a full user gesture (also on iOS): after that the audio
      // module keeps the context alive itself, so stop calling unlock() on every input.
      if (e && e.type !== 'pointerdown') {
        for (const ev of EVENTS) window.removeEventListener(ev, unlock, { capture: true });
      }
      try {
        audio.unlock && audio.unlock();
        if (!musicStarted) {
          musicStarted = true;
          currentTrack = profile.musicTrack;
          audio.playMusic && audio.playMusic(currentTrack);
        }
      } catch (err) { warnOnce('audio.unlock', err); }
    };
    // Keep listening a little: iOS only really unlocks on touchend/click.
    for (const ev of EVENTS) {
      window.addEventListener(ev, unlock, { capture: true, passive: true });
    }
  }

  function setupTouchDetection() {
    const show = () => {
      try { ui.setTouchControls && ui.setTouchControls(true); } catch (err) { warnOnce('ui.setTouchControls', err); }
    };
    if ('ontouchstart' in window) show();
    else window.addEventListener('touchstart', show, { once: true, passive: true });
  }

  function onSettingsChange(p) {
    if (p && p !== profile) Object.assign(profile, p);
    try { I18n.setLang(profile.lang); } catch (err) { warnOnce('setLang', err); }
    applyAudioSettings();
    if (profile.musicTrack !== currentTrack) {
      currentTrack = profile.musicTrack;
      try { audio.playMusic && audio.playMusic(currentTrack); } catch (err) { warnOnce('audio.playMusic', err); }
    }
    save();
  }

  // ------------------------------------------------------------ title

  function goTitle() {
    timers = [];
    run = null;
    mode = 'title';
    hideAll();
    showcaseRoom();
    const g = gate();
    overlay('showTitle', {
      profile,
      hasSave: !!profile.hasProgress,
      onNewGame: g(() => {
        try { profile = Save.resetProgress(profile) || profile; } catch (err) { warnOnce('resetProgress', err); }
        save();
        startLevel(1);
      }),
      onContinue: g(() => startLevel(Math.max(1, profile.level || 1))),
      onSettingsChange,
    });
  }

  /** A calm, static room behind the title screen. */
  function showcaseRoom() {
    const level = Math.max(1, profile.level || 1);
    const roomData = buildRoom(level, 0, profile, EMPTY_MODS);
    const dummyRun = { level, room: 0, levelCoins: 0, hearts: stats().maxHearts, clubBoost: 0, pets: [] };
    world.setupRoom({ profile, run: dummyRun, mods: EMPTY_MODS, roomData, speedMul: 1 });
  }

  // ------------------------------------------------------------ levels + rooms

  function startLevel(L) {
    timers = [];
    hideAll();
    run = { level: L, room: 0, levelCoins: 0, hearts: stats().maxHearts, clubBoost: 0, pets: [] };
    enterRoom();          // the levelStart toast comes with the first room (not over the pet select)
  }

  function enterRoom() {
    mode = 'overlay';
    const owned = (profile.ownedPets || []).filter((id) => PET_IDS.includes(id));
    if (!owned.length) { beginRoom([]); return; }
    const slots = stats().petSlots;
    const preselected = (profile.lastPets || []).filter((id) => owned.includes(id)).slice(0, slots);
    const g = gate();
    overlay('showPetSelect', {
      profile,
      preselected,
      max: slots,
      level: run.level,
      room: run.room,                // 0-based; the UI shows room + 1
      onConfirm: g((ids) => {
        const chosen = [...new Set(Array.isArray(ids) ? ids : [])]
          .filter((id) => owned.includes(id)).slice(0, slots);
        profile.lastPets = chosen;
        save();
        beginRoom(chosen);
      }),
    }, g(() => beginRoom(preselected)));
  }

  function beginRoom(petIds) {
    run.pets = petIds.map((id) => ({ id, level: (profile.petLevels && profile.petLevels[id]) || 1 }));
    let mods = EMPTY_MODS;
    try { mods = { ...EMPTY_MODS, ...Pets.getPetModifiers(run.pets) }; } catch (err) { warnOnce('getPetModifiers', err); }
    const L = run.level;
    const speedMul = L > LEVELS.storyLevels ? 1 + (L - LEVELS.storyLevels) * LEVELS.endlessSpeedPerLevel : 1;
    const roomData = buildRoom(L, run.room, profile, mods);
    world.setupRoom({ profile, run, mods, roomData, speedMul });
    hideAll();
    toast('toast.roomStart', { level: L, room: run.room + 1 });
    if (run.room === 0) toast('toast.levelStart', { level: L });
    resumePlay();
  }

  function resumePlay() {
    mode = 'play';
    input.clear && input.clear();
    pauseGuard = PAUSE_GUARD;
    blurFocus();
  }

  function onRoomCleared() {
    mode = 'transition';
    run.levelCoins += ECONOMY.roomClearBonus;
    sfx('roomClear');
    if (game.player) game.floatText('+' + ECONOMY.roomClearBonus, game.player.x, game.player.y - 60, '#ffd23f');
    later(0.7, afterRoom);
  }

  function afterRoom() {
    if (run.room < LEVELS.roomsPerLevel - 1) {
      mode = 'overlay';
      const g = gate();
      const nextRoom = g(() => { run.room++; enterRoom(); });
      overlay('showShop', { profile, run, onClose: nextRoom }, nextRoom);
    } else {
      levelComplete();
    }
  }

  function pickNewPet(L) {
    const owned = profile.ownedPets || [];
    if (L === 1 && !owned.includes(FIRST_PET)) return FIRST_PET;
    const left = PET_IDS.filter((id) => !owned.includes(id));
    return left.length ? left[Math.floor(Math.random() * left.length)] : null;
  }

  function levelComplete() {
    mode = 'overlay';
    const L = run.level;
    let bonusCoins = ECONOMY.levelClearBonus;
    const newPet = pickNewPet(L);
    if (newPet) {
      profile.ownedPets = [...(profile.ownedPets || []), newPet];
      profile.petLevels = { ...(profile.petLevels || {}), [newPet]: 1 };
    } else {
      bonusCoins += ECONOMY.allPetsOwnedBonus;
    }
    run.levelCoins += bonusCoins;
    const coinsEarned = run.levelCoins;
    profile.bankCoins = (profile.bankCoins || 0) + run.levelCoins;
    run.levelCoins = 0;                    // banked; the shop now pays from the bank
    run.hearts = stats().maxHearts;        // hearts refill next level anyway
    profile.level = L + 1;
    profile.hasProgress = true;
    save();

    sfx('levelComplete');
    // A new pet is celebrated (with the 'newPet' sound) by showLevelComplete itself.

    const next = () => startLevel(L + 1);
    const shopThenNext = () => {
      const g = gate();
      overlay('showShop', { profile, run, onClose: g(next) }, g(next));
    };
    const gl = gate();
    overlay('showLevelComplete', {
      level: L, coinsEarned, newPet, bonusCoins,
      onNext: gl(() => {
        if (L === LEVELS.storyLevels) {
          const gv = gate();
          overlay('showVictory', { onContinue: gv(shopThenNext), onQuit: gv(goTitle) }, gv(shopThenNext));
        } else {
          shopThenNext();
        }
      }),
    }, gl(shopThenNext));
  }

  function onPlayerDied() {
    mode = 'dying';
    later(1.0, gameOver);
  }

  function gameOver() {
    mode = 'overlay';
    const L = run.level;
    sfx('gameOver');
    const g = gate();
    overlay('showGameOver', {
      level: L,
      coinsLost: run.levelCoins,
      onRetry: g(() => startLevel(L)),
      onQuit: g(goTitle),
    }, g(() => startLevel(L)));
  }

  // ------------------------------------------------------------ pause

  function openPause() {
    mode = 'paused';
    const g = gate();
    overlay('showPause', {
      profile,
      onResume: g(resumeFromPause),
      onQuit: g(goTitle),
      onSettingsChange,
    }, g(resumeFromPause));
  }

  function resumeFromPause() {
    if (mode !== 'paused') return;
    hideAll();
    resumePlay();
  }

  // ------------------------------------------------------------ loop

  function runTimers(dt) {
    if (!timers.length) return;
    const due = [];
    for (const tm of timers) { tm.t -= dt; if (tm.t <= 0) due.push(tm); }
    timers = timers.filter((tm) => tm.t > 0);
    for (const tm of due) tm.fn();
  }

  function step(dt) {
    if (mode !== 'paused') runTimers(dt);

    if (mode === 'play') {
      pauseGuard = Math.max(0, pauseGuard - dt);
      if (input.consumePause() && pauseGuard <= 0) { openPause(); return; }
      world.update(dt, input);
    } else if (mode === 'paused') {
      if (input.consumePause() && pauseGuard <= 0) resumeFromPause();
    } else {
      // Menus/transitions: keep the scene softly alive, drop game input.
      input.consumePause();
      input.consumeAttack();
      world.updateVisuals(dt);
    }
  }

  function updateHud() {
    if (!run || mode === 'title' || !game.player) return;
    const tier = effectiveTier();
    const hud = {
      hearts: run.hearts,
      maxHearts: stats().maxHearts,
      shields: game.player.shields,
      coins: (profile.bankCoins || 0) + (run.levelCoins || 0),   // total; UI shows levelCoins separately
      levelCoins: run.levelCoins,
      level: run.level,
      room: run.room,                // 0-based; the UI shows room + 1
      roomsPerLevel: LEVELS.roomsPerLevel,
      clubTier: tier,
      boosted: (run.clubBoost || 0) > 0 && tier > (profile.clubTier || 0),
      pets: run.pets,
    };
    const key = JSON.stringify(hud);
    if (key === lastHud) return;
    lastHud = key;
    try { ui.updateHUD && ui.updateHUD(hud); } catch (err) { warnOnce('ui.updateHUD', err); }
  }

  function render() {
    const ctx = screen.begin();
    const tier = effectiveTier();
    drawWorld(ctx, game, {
      clubTier: tier,
      boosted: !!run && (run.clubBoost || 0) > 0 && tier > (profile.clubTier || 0),
      // What a club pickup would give: one tier up, but a pumpkin club never goes past gold.
      nextTier: Math.min(MAX_BOOST_TIER, tier + 1),
    });
  }

  function frame(now) {
    const dt = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
    last = now;
    try { step(dt); } catch (err) { warnOnce('step', err); }
    try { updateHud(); } catch (err) { warnOnce('hud', err); }
    try { render(); } catch (err) { warnOnce('render', err); }
    requestAnimationFrame(frame);
  }

  return { boot, game, get mode() { return mode; } };
}
