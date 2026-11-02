// PumpkinLab audio: procedural music + sound effects with the Web Audio API.
// API: audio.unlock(), playMusic(i), stopMusic(), setMusicVolume(v), setSfxVolume(v), sfx(name), debug()
// Before unlock() every call is a silent no-op (requested track and volumes are remembered).
//
// Music: exactly one scheduler (a single setInterval) drives at most one live player; a replaced
// player only fades out, and anything that was already fading is cut short, so switching tracks
// quickly never stacks loops. Each player owns its echo, so its tail fades with it. When the music
// volume is 0 (switch off) nothing is scheduled at all; turning it back on starts the track afresh.
// Sfx: per-effect restart gap + voice limit (see SFX_META), a global voice cap, and a little
// ducking when several effects start in the same instant.
import { createChain, createShared } from './synth.js';
import { createTrack, TRACK_COUNT } from './music.js';
import { SFX, SFX_META, SFX_DEFAULT_META } from './sfx.js';

const FADE = 0.6;          // crossfade time (s)
const CUT = 0.08;          // fast fade for players that were already fading (s)
const TICK_MS = 25;        // scheduler interval
const LOOKAHEAD = 0.1;     // schedule notes this far ahead (s)
const MAX_VOICES = 14;     // all sfx together
const BURST_WIN = 0.04;    // effects starting within this window count as "at once" (s)

let ctx = null;
let chain = null;
let sfxShared = null;
let wantedTrack = -1;
let musicVol = 0.7;
let sfxVol = 0.9;
let current = null;        // live player (not fading), or null
const players = [];        // live + fading players
let timer = null;
let resumeListeners = false;
const lastSfx = new Map(); // name -> ctx time of the last start
let voices = [];           // { name, start, end, gain, stolen }
const stats = { musicSteps: 0, playersCreated: 0, timersCreated: 0, sfxPlayed: {}, sfxSkipped: {}, sfxStolen: 0, maxPlayers: 0, maxVoices: 0 };

const clamp01 = (v) => Math.min(1, Math.max(0, Number(v) || 0));
const curve = (v) => v * v; // perceptual-ish volume curve
const MUSIC_TRIM = 0.75;    // music sits a bit below the sfx
const bump = (obj, k) => { obj[k] = (obj[k] || 0) + 1; };

function setBus(node, v) {
  if (!node) return;
  const now = ctx.currentTime;
  node.gain.cancelScheduledValues(now);
  node.gain.setTargetAtTime(curve(v) * (node === chain.music ? MUSIC_TRIM : 1), now, 0.03);
}

function lookahead() {
  // background tabs throttle timers to ~1 s; schedule further ahead there
  return typeof document !== 'undefined' && document.hidden ? 1.5 : LOOKAHEAD;
}

// ---------------------------------------------------------------- music

function dropPlayer(p) {
  try { p.gain.disconnect(); } catch (e) { /* ignore */ }
  try { p.shared.fx.dispose(); } catch (e) { /* ignore */ }
}

function tick() {
  if (!ctx) return;
  const now = ctx.currentTime;
  const horizon = now + lookahead();
  for (let i = players.length - 1; i >= 0; i--) {
    const p = players[i];
    if (p.stopAt !== null && now > p.stopAt + 0.05) {
      dropPlayer(p);
      players.splice(i, 1);
      continue;
    }
    if (p.nextTime < now - 0.2) p.nextTime = now + 0.05; // fell behind (tab throttled / context suspended)
    while (p.nextTime < horizon && (p.stopAt === null || p.nextTime < p.stopAt)) {
      try { p.track.schedule(p.step, p.nextTime); } catch (e) { /* never break the loop */ }
      stats.musicSteps++;
      p.step++;
      p.nextTime += p.track.stepDur;
    }
  }
  if (!players.length) stopTimer();
}

function ensureTimer() {
  if (timer === null) { timer = setInterval(tick, TICK_MS); stats.timersCreated++; }
}

function stopTimer() {
  if (timer !== null) { clearInterval(timer); timer = null; }
}

function fadeOut(p, time = FADE) {
  if (!p) return;
  const now = ctx.currentTime;
  if (p.stopAt !== null && p.stopAt <= now + time) return; // already ending sooner
  const g = p.gain.gain;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.linearRampToValueAtTime(0, now + time);
  p.stopAt = now + time;
}

function startTrack(i) {
  if (current && current.index === i) return;
  // Only the player we are replacing may crossfade; older leftovers are cut right away.
  for (const p of players) if (p !== current) fadeOut(p, CUT);
  fadeOut(current);
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(1, now + (current ? FADE : 0.25));
  gain.connect(chain.music);
  // Own echo per player (inside its gain): when the player fades, its echo tail fades too.
  const shared = createShared(ctx, gain, { delay: 0.34, feedback: 0.28, wet: 0.3 });
  const track = createTrack(i, ctx, gain, shared);
  shared.fx.delay.delayTime.value = track.delayTime;
  current = { index: i, track, gain, shared, step: 0, nextTime: now + 0.06, stopAt: null };
  players.push(current);
  stats.playersCreated++;
  stats.maxPlayers = Math.max(stats.maxPlayers, players.length);
  ensureTimer();
  tick();
}

/** The one place that decides what plays: wanted track, unless music is off (volume 0). */
function syncMusic() {
  if (!ctx) return;
  const want = wantedTrack >= 0 && musicVol > 0 ? wantedTrack : -1;
  if (want >= 0) { startTrack(want); return; }
  if (current) { fadeOut(current); current = null; }
}

// ---------------------------------------------------------------- sfx

function pruneVoices(now) {
  if (!voices.length) return;
  voices = voices.filter((v) => {
    if (now < v.end + 0.05) return true;
    try { v.gain.disconnect(); } catch (e) { /* ignore */ }
    return false;
  });
}

function steal(v, now) {
  if (v.stolen) return;
  v.stolen = true;
  const g = v.gain.gain;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.linearRampToValueAtTime(0, now + 0.025);
  v.end = Math.min(v.end, now + 0.03);
  stats.sfxStolen++;
}

function playSfx(name) {
  const meta = SFX_META[name] || SFX_DEFAULT_META;
  const now = ctx.currentTime;
  pruneVoices(now);
  const last = lastSfx.get(name);
  if (last !== undefined && now >= last && now - last < meta.gap) { bump(stats.sfxSkipped, name); return; }
  const live = voices.filter((v) => !v.stolen && v.end > now);
  const same = live.filter((v) => v.name === name);
  if (same.length >= meta.max) {
    if (!meta.steal) { bump(stats.sfxSkipped, name); return; }
    steal(same[0], now);
    live.splice(live.indexOf(same[0]), 1);
  }
  if (live.length >= MAX_VOICES) steal(live.shift(), now);
  // several effects in the same instant (swing + crack + coins): each a bit softer
  const burst = live.filter((v) => now - v.start < BURST_WIN).length;
  const gain = ctx.createGain();
  gain.gain.value = 1 / Math.sqrt(1 + 0.5 * burst);
  gain.connect(chain.sfx);
  lastSfx.set(name, now);
  const t = now + 0.005;
  voices.push({ name, start: now, end: t + meta.dur, gain, stolen: false });
  stats.maxVoices = Math.max(stats.maxVoices, voices.filter((v) => !v.stolen).length);
  bump(stats.sfxPlayed, name);
  SFX[name](ctx, gain, sfxShared, t, 1 + (Math.random() * 2 - 1) * 0.05);
}

function addResumeListeners() {
  if (resumeListeners || typeof window === 'undefined') return;
  resumeListeners = true;
  // iOS can suspend/interrupt the context later (calls, app switch); resume on the next gesture.
  // This only resumes the context; it never (re)starts music.
  const resume = () => {
    if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(() => {});
  };
  for (const ev of ['pointerdown', 'touchend', 'keydown', 'mousedown']) {
    window.addEventListener(ev, resume, { capture: true, passive: true });
  }
}

export const audio = {
  unlock() {
    try {
      if (!ctx) {
        const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
        if (!AC) return;
        try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = new AC(); }
        chain = createChain(ctx);
        sfxShared = createShared(ctx, chain.sfx, { delay: 0.22, feedback: 0.25, wet: 0.3 });
        chain.music.gain.value = curve(musicVol) * MUSIC_TRIM;
        chain.sfx.gain.value = curve(sfxVol);
        addResumeListeners();
      }
      if (ctx.state !== 'running' && ctx.state !== 'closed') {
        const pr = ctx.resume();
        if (pr && pr.catch) pr.catch(() => {});
      }
      // iOS Safari: playing a (silent) buffer inside the gesture fully unlocks output
      const b = ctx.createBuffer(1, 1, 22050);
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.connect(ctx.destination);
      s.onended = () => { try { s.disconnect(); } catch (e) { /* ignore */ } };
      s.start(0);
      syncMusic(); // idempotent: repeated unlocks never start a second loop
    } catch (e) {
      // audio unavailable: stay silent
    }
  },

  playMusic(i) {
    i = Number(i);
    if (!Number.isInteger(i) || i < 0 || i >= TRACK_COUNT) return;
    wantedTrack = i;
    try { syncMusic(); } catch (e) { /* ignore */ }
  },

  stopMusic() {
    wantedTrack = -1;
    try { syncMusic(); } catch (e) { /* ignore */ }
  },

  setMusicVolume(v) {
    musicVol = clamp01(v);
    if (!ctx) return;
    try { setBus(chain.music, musicVol); syncMusic(); } catch (e) { /* ignore */ }
  },

  setSfxVolume(v) {
    sfxVol = clamp01(v);
    if (ctx) try { setBus(chain.sfx, sfxVol); } catch (e) { /* ignore */ }
  },

  sfx(name) {
    if (!ctx || ctx.state !== 'running' || sfxVol <= 0) return;
    if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(SFX, name)) return;
    try { playSfx(name); } catch (e) { /* ignore */ }
  },

  /** Snapshot for tests / the console: scheduler, players, voices and counters. */
  debug() {
    const now = ctx ? ctx.currentTime : 0;
    const live = voices.filter((v) => !v.stolen && v.end > now);
    const byName = {};
    for (const v of live) bump(byName, v.name);
    return {
      state: ctx ? ctx.state : 'none',
      schedulers: timer !== null ? 1 : 0,
      players: players.length,
      livePlayers: players.filter((p) => p.stopAt === null).length,
      audiblePlayers: players.filter((p) => p.gain.gain.value > 0.05).length,
      crossfading: players.filter((p) => p.stopAt !== null && p.stopAt - now > CUT + 0.01).length,
      track: current ? current.index : -1,
      wantedTrack,
      stepDur: current ? current.track.stepDur : 0,
      voices: live.length,
      voicesByName: byName,
      ...JSON.parse(JSON.stringify(stats)),
    };
  },
};

export default audio;
