// Low-level WebAudio helpers shared by music.js and sfx.js.
// Everything is generated procedurally; no audio files.

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

// "C#5" -> 73
export function noteNum(name) {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error('bad note ' + name);
  return PC[m[1]] + (parseInt(m[2], 10) + 1) * 12;
}

// "Bb7" -> { pc: 10, ivs: [0,4,7,10] }
export function chord(name) {
  const m = /^([A-G][#b]?)(.*)$/.exec(name);
  const q = m[2];
  const ivs = q === 'm' ? [0, 3, 7]
    : q === '7' ? [0, 4, 7, 10]
    : q === 'm7' ? [0, 3, 7, 10]
    : q === 'dim' ? [0, 3, 6, 9]
    : q === 'm7b5' ? [0, 3, 6, 10]
    : [0, 4, 7];
  return { pc: PC[m[1]], ivs };
}

// Parse a bar written as slots: "A4 . D5 - F5" ('.' = rest, '-' = hold previous).
// Returns an array with one entry per slot: null or { m: midi, len: slots }.
export function parseBar(str) {
  const toks = str.trim().split(/\s+/);
  const out = new Array(toks.length).fill(null);
  let last = null;
  toks.forEach((tk, i) => {
    if (tk === '-') { if (last) last.len++; return; }
    if (tk === '.') { last = null; return; }
    last = { m: noteNum(tk), len: 1 };
    out[i] = last;
  });
  return out;
}

// ---------- shared resources ----------
const noiseCache = new WeakMap();
const organCache = new WeakMap();

function getNoise(ctx) {
  let b = noiseCache.get(ctx);
  if (!b) {
    const len = Math.floor(ctx.sampleRate * 2);
    b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, b);
  }
  return b;
}

function getOrgan(ctx) {
  let w = organCache.get(ctx);
  if (!w) {
    // drawbar-ish harmonics: 1, 2, 3, 4, 6, 8
    const real = new Float32Array([0, 1, 0.55, 0.3, 0.22, 0, 0.1, 0, 0.06]);
    const imag = new Float32Array(real.length);
    w = ctx.createPeriodicWave(real, imag);
    organCache.set(ctx, w);
  }
  return w;
}

// Simple feedback delay (echo) used as a cheap "space" effect.
function createDelay(ctx, dest, time, feedback, wet) {
  const input = ctx.createGain();
  const delay = ctx.createDelay(1.5);
  delay.delayTime.value = time;
  const fb = ctx.createGain();
  fb.gain.value = feedback;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2600;
  const out = ctx.createGain();
  out.gain.value = wet;
  input.connect(delay);
  delay.connect(lp);
  lp.connect(fb);
  fb.connect(delay);
  lp.connect(out);
  out.connect(dest);
  return { input, delay };
}

export function createShared(ctx, dest, { delay = 0.3, feedback = 0.3, wet = 0.35 } = {}) {
  return { noise: getNoise(ctx), organ: getOrgan(ctx), fx: createDelay(ctx, dest, delay, feedback, wet) };
}

// Master chain: music + sfx buses -> master -> compressor -> soft clipper -> destination.
export function createChain(ctx) {
  const music = ctx.createGain();
  const sfx = ctx.createGain();
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 10;
  comp.ratio.value = 4;
  comp.attack.value = 0.004;
  comp.release.value = 0.2;
  // Soft clipper: linear up to 0.6, then tanh knee; output never exceeds ~0.91.
  const clip = ctx.createWaveShaper();
  const n = 2048;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const ax = Math.abs(x);
    const y = ax < 0.6 ? ax : 0.6 + 0.4 * Math.tanh((ax - 0.6) / 0.4);
    curve[i] = Math.sign(x) * y;
  }
  clip.curve = curve;
  music.connect(master);
  sfx.connect(master);
  master.connect(comp);
  comp.connect(clip);
  clip.connect(ctx.destination);
  return { music, sfx, master };
}

// ---------- voices ----------
function cleanupOn(src, nodes) {
  src.onended = () => {
    for (const n of nodes) { try { n.disconnect(); } catch (e) { /* ignore */ } }
  };
}

// pts: [[dt, value], ...]
function setPath(param, t, pts, exp) {
  param.setValueAtTime(pts[0][1], t + pts[0][0]);
  for (let i = 1; i < pts.length; i++) {
    const tt = t + pts[i][0];
    if (exp) param.exponentialRampToValueAtTime(Math.max(pts[i][1], 1e-4), tt);
    else param.linearRampToValueAtTime(pts[i][1], tt);
  }
}

function applyEnv(g, o) {
  const t = o.t;
  if (o.env) { setPath(g.gain, t, o.env, false); return; }
  const a = o.a ?? 0.005;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(o.vol, t + a);
  g.gain.exponentialRampToValueAtTime(1e-4, t + Math.max(o.dur, a + 0.01));
}

// Builds: src -> [filter] -> [am] -> gain(env) -> dest (+ optional send)
function finishVoice(ctx, dest, src, o, nodes) {
  let last = src;
  const stopAt = o.t + o.dur + 0.03;
  if (o.filter) {
    const f = ctx.createBiquadFilter();
    f.type = o.filter.type || 'lowpass';
    const fr = o.filter.freq ?? [[0, o.filter.f]];
    setPath(f.frequency, o.t, fr, o.filter.exp !== false);
    f.Q.value = o.filter.Q ?? 1;
    last.connect(f); last = f; nodes.push(f);
  }
  if (o.am) {
    const am = ctx.createGain();
    am.gain.value = 1 - o.am.depth;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = o.am.rate;
    const lg = ctx.createGain();
    lg.gain.value = o.am.depth;
    lfo.connect(lg); lg.connect(am.gain);
    lfo.start(o.t); lfo.stop(stopAt);
    last.connect(am); last = am; nodes.push(am, lfo, lg);
  }
  const g = ctx.createGain();
  applyEnv(g, o);
  last.connect(g);
  g.connect(dest);
  nodes.push(g);
  if (o.send && o.send.node) {
    const s = ctx.createGain();
    s.gain.value = o.send.amount;
    g.connect(s); s.connect(o.send.node);
    nodes.push(s);
  }
  src.start(o.t, o.offset || 0);
  src.stop(stopAt);
  cleanupOn(src, nodes);
}

// o: { t, dur, vol, a, env, type|wave, f|freq:[[dt,f]..], freqLinear, detune, vib:{rate,depth,delay}, filter, am, send }
export function tone(ctx, dest, o) {
  if (o.t < 0) o.t = 0;
  if (!o.freq && o.f > ctx.sampleRate * 0.45) return null; // inaudible / above Nyquist
  const osc = ctx.createOscillator();
  if (o.wave) osc.setPeriodicWave(o.wave); else osc.type = o.type || 'sine';
  if (o.freq) setPath(osc.frequency, o.t, o.freq, !o.freqLinear);
  else osc.frequency.setValueAtTime(o.f, o.t);
  if (o.detune) osc.detune.value = o.detune;
  const nodes = [osc];
  if (o.vib) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = o.vib.rate;
    const lg = ctx.createGain();
    const d = o.vib.delay || 0;
    lg.gain.setValueAtTime(0, o.t);
    lg.gain.linearRampToValueAtTime(0, o.t + d);
    lg.gain.linearRampToValueAtTime(o.vib.depth, o.t + d + 0.15);
    lfo.connect(lg); lg.connect(osc.frequency);
    lfo.start(o.t); lfo.stop(o.t + o.dur + 0.03);
    nodes.push(lfo, lg);
  }
  finishVoice(ctx, dest, osc, o, nodes);
  return osc;
}

// o: { t, dur, vol, a, env, filter, am, rate, send }
export function noise(ctx, dest, shared, o) {
  if (o.t < 0) o.t = 0;
  const src = ctx.createBufferSource();
  src.buffer = shared.noise;
  src.loop = true;
  if (o.rate) src.playbackRate.value = o.rate;
  o.offset = Math.random() * 1.5;
  finishVoice(ctx, dest, src, o, [src]);
  return src;
}
