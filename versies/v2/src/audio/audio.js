// Pompoenlab audio: procedural music + sound effects with the Web Audio API.
// API: audio.unlock(), playMusic(i), stopMusic(), setMusicVolume(v), setSfxVolume(v), sfx(name)
// Before unlock() every call is a silent no-op (requested track and volumes are remembered).
import { createChain, createShared } from './synth.js';
import { createTrack, TRACK_COUNT } from './music.js';
import { SFX } from './sfx.js';

const FADE = 0.6;          // crossfade time (s)
const TICK_MS = 25;        // scheduler interval
const LOOKAHEAD = 0.1;     // schedule notes this far ahead (s)
const SFX_MIN_GAP = 0.04;  // rate limit per sfx name (s)

let ctx = null;
let chain = null;
let musicShared = null;
let sfxShared = null;
let wantedTrack = -1;
let musicVol = 0.7;
let sfxVol = 0.9;
let current = null;        // active player
const players = [];        // active + fading players
let timer = null;
let resumeListeners = false;
const lastSfx = new Map();

const clamp01 = (v) => Math.min(1, Math.max(0, Number(v) || 0));
const curve = (v) => v * v; // perceptual-ish volume curve
const MUSIC_TRIM = 0.75;    // music sits a bit below the sfx

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

function tick() {
  if (!ctx) return;
  const now = ctx.currentTime;
  const horizon = now + lookahead();
  for (let i = players.length - 1; i >= 0; i--) {
    const p = players[i];
    if (p.stopAt !== null && now > p.stopAt + 0.3) {
      try { p.gain.disconnect(); } catch (e) { /* ignore */ }
      players.splice(i, 1);
      continue;
    }
    if (p.nextTime < now - 0.2) p.nextTime = now + 0.05; // fell behind (tab throttled / context suspended)
    while (p.nextTime < horizon && (p.stopAt === null || p.nextTime < p.stopAt)) {
      try { p.track.schedule(p.step, p.nextTime); } catch (e) { /* never break the loop */ }
      p.step++;
      p.nextTime += p.track.stepDur;
    }
  }
  if (!players.length && timer !== null) { clearInterval(timer); timer = null; }
}

function ensureTimer() {
  if (timer === null) timer = setInterval(tick, TICK_MS);
}

function fadeOut(p) {
  if (!p || p.stopAt !== null) return;
  const now = ctx.currentTime;
  const g = p.gain.gain;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.linearRampToValueAtTime(0, now + FADE);
  p.stopAt = now + FADE;
}

function startTrack(i) {
  if (current && current.index === i) return;
  fadeOut(current);
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(1, now + (current ? FADE : 0.25));
  gain.connect(chain.music);
  const track = createTrack(i, ctx, gain, musicShared);
  musicShared.fx.delay.delayTime.setTargetAtTime(track.delayTime, now, 0.2);
  current = { index: i, track, gain, step: 0, nextTime: now + 0.06, stopAt: null };
  players.push(current);
  ensureTimer();
  tick();
}

function addResumeListeners() {
  if (resumeListeners || typeof window === 'undefined') return;
  resumeListeners = true;
  // iOS can suspend/interrupt the context later (calls, app switch); resume on the next gesture.
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
        musicShared = createShared(ctx, chain.music, { delay: 0.34, feedback: 0.28, wet: 0.3 });
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
      if (wantedTrack >= 0) startTrack(wantedTrack);
    } catch (e) {
      // audio unavailable: stay silent
    }
  },

  playMusic(i) {
    i = Number(i);
    if (!Number.isInteger(i) || i < 0 || i >= TRACK_COUNT) return;
    wantedTrack = i;
    if (!ctx) return;
    try { startTrack(i); } catch (e) { /* ignore */ }
  },

  stopMusic() {
    wantedTrack = -1;
    if (!ctx) return;
    try { fadeOut(current); } catch (e) { /* ignore */ }
    current = null;
  },

  setMusicVolume(v) {
    musicVol = clamp01(v);
    if (ctx) try { setBus(chain.music, musicVol); } catch (e) { /* ignore */ }
  },

  setSfxVolume(v) {
    sfxVol = clamp01(v);
    if (ctx) try { setBus(chain.sfx, sfxVol); } catch (e) { /* ignore */ }
  },

  sfx(name) {
    if (!ctx || ctx.state !== 'running' || sfxVol <= 0) return;
    if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(SFX, name)) return;
    const now = ctx.currentTime;
    const last = lastSfx.get(name);
    if (last !== undefined && now - last < SFX_MIN_GAP && now >= last) return;
    lastSfx.set(name, now);
    try {
      SFX[name](ctx, chain.sfx, sfxShared, now + 0.005, 1 + (Math.random() * 2 - 1) * 0.05);
    } catch (e) { /* ignore */ }
  },
};

export default audio;
