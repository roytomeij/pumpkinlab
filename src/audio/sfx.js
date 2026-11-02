// Procedural sound effects. Each entry: (ctx, out, shared, t, p) where p is a small
// random pitch factor (~0.95..1.05) so repeats don't sound identical.
import { mtof, tone, noise } from './synth.js';

const rnd = Math.random;

function bell(ctx, out, sh, t, f, vol, dur, send = 0.3) {
  tone(ctx, out, { t, dur, type: 'sine', f, vol, a: 0.002, send: send ? { node: sh.fx.input, amount: send } : null });
  tone(ctx, out, { t, dur: dur * 0.5, type: 'sine', f: f * 2.76, vol: vol * 0.3, a: 0.002 });
  tone(ctx, out, { t, dur: dur * 0.25, type: 'sine', f: f * 5.4, vol: vol * 0.12, a: 0.001 });
}

function brass(ctx, out, t, m, vol, len) {
  const f = mtof(m);
  tone(ctx, out, {
    t, dur: len, type: 'sawtooth', f, vol,
    env: [[0, 0], [0.02, vol], [Math.max(len - 0.06, 0.03), vol * 0.75], [len, 0]],
    filter: { type: 'lowpass', freq: [[0, 900], [0.05, 3200], [len, 1400]], Q: 1 },
    vib: len > 0.4 ? { rate: 5.5, depth: f * 0.012, delay: 0.2 } : null,
  });
  tone(ctx, out, {
    t, dur: len, type: 'square', f: f / 2, vol: vol * 0.35,
    env: [[0, 0], [0.02, vol * 0.35], [Math.max(len - 0.06, 0.03), vol * 0.25], [len, 0]],
    filter: { type: 'lowpass', f: 1200, Q: 0.5 },
  });
}

export const SFX = {
  swing(c, o, sh, t, p) {
    noise(c, o, sh, { t, dur: 0.2, vol: 0.55, a: 0.07, filter: { type: 'bandpass', freq: [[0, 500 * p], [0.09, 2400 * p], [0.2, 700 * p]], Q: 1.4 } });
  },

  hitPumpkin(c, o, sh, t, p) {
    tone(c, o, { t, dur: 0.18, type: 'sine', freq: [[0, 210 * p], [0.12, 65 * p]], vol: 0.75, a: 0.002 });
    tone(c, o, { t, dur: 0.07, type: 'triangle', freq: [[0, 420 * p], [0.06, 160 * p]], vol: 0.25, a: 0.001 });
    noise(c, o, sh, { t, dur: 0.06, vol: 0.35, a: 0.001, filter: { type: 'lowpass', f: 1000 * p, Q: 0.8 } });
  },

  smashPumpkin(c, o, sh, t, p) {
    noise(c, o, sh, { t, dur: 0.05, vol: 0.55, a: 0.001, filter: { type: 'highpass', f: 2500, Q: 0.7 } }); // crack
    tone(c, o, { t, dur: 0.14, type: 'square', freq: [[0, 320 * p], [0.12, 80 * p]], vol: 0.2, a: 0.001, filter: { type: 'lowpass', f: 700, Q: 1 } });
    tone(c, o, { t, dur: 0.28, type: 'sine', freq: [[0, 120 * p], [0.25, 40]], vol: 0.7, a: 0.002 }); // thump
    noise(c, o, sh, { t: t + 0.02, dur: 0.35, vol: 0.6, a: 0.01, filter: { type: 'bandpass', freq: [[0, 1500 * p], [0.3, 260 * p]], Q: 5 } }); // squelch
    noise(c, o, sh, { t: t + 0.11, dur: 0.22, vol: 0.4, a: 0.01, filter: { type: 'bandpass', freq: [[0, 950 * p], [0.2, 320 * p]], Q: 6 } });
  },

  coin(c, o, sh, t) {
    const v = 0.13;
    tone(c, o, { t, dur: 0.09, type: 'square', f: 988, vol: v, a: 0.001, filter: { type: 'lowpass', f: 5000 } });
    tone(c, o, { t: t + 0.075, dur: 0.38, type: 'square', f: 1319, vol: v, a: 0.001, filter: { type: 'lowpass', f: 5000 } });
    tone(c, o, { t: t + 0.075, dur: 0.38, type: 'sine', f: 2638, vol: 0.06, a: 0.001 });
  },

  clubUp(c, o, sh, t) {
    [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => {
      tone(c, o, { t: t + i * 0.055, dur: 0.28, type: 'triangle', f: mtof(m), vol: 0.22, a: 0.002, send: { node: sh.fx.input, amount: 0.25 } });
    });
    for (let i = 0; i < 7; i++) {
      tone(c, o, { t: t + 0.1 + rnd() * 0.45, dur: 0.12, type: 'sine', f: 2500 + rnd() * 3000, vol: 0.05, a: 0.002 });
    }
  },

  hitMonster(c, o, sh, t, p) {
    tone(c, o, { t, dur: 0.13, type: 'square', freq: [[0, 260 * p], [0.12, 105 * p]], vol: 0.22, a: 0.001, filter: { type: 'lowpass', f: 1800 } });
    noise(c, o, sh, { t, dur: 0.08, vol: 0.45, a: 0.001, filter: { type: 'bandpass', f: 1300 * p, Q: 1 } });
  },

  monsterDie(c, o, sh, t, p) {
    tone(c, o, { t, dur: 0.07, type: 'sine', freq: [[0, 800 * p], [0.06, 1600 * p]], vol: 0.18, a: 0.001 });
    tone(c, o, { t: t + 0.03, dur: 0.5, type: 'sawtooth', freq: [[0, 420 * p], [0.45, 50 * p]], vol: 0.25, a: 0.005, filter: { type: 'lowpass', freq: [[0, 1600], [0.45, 300]], Q: 2 } });
    noise(c, o, sh, { t: t + 0.03, dur: 0.45, vol: 0.35, a: 0.01, filter: { type: 'lowpass', freq: [[0, 1800], [0.4, 200]], Q: 0.7 } });
  },

  skeletonBreak(c, o, sh, t, p) {
    for (let i = 0; i < 8; i++) {
      const tt = t + i * 0.035 + rnd() * 0.025;
      const v = 0.5 * (1 - i * 0.08);
      noise(c, o, sh, { t: tt, dur: 0.04, vol: v, a: 0.001, filter: { type: 'bandpass', f: (1500 + rnd() * 2500) * p, Q: 6 } });
      tone(c, o, { t: tt, dur: 0.06, type: 'triangle', f: (500 + rnd() * 700) * p, vol: v * 0.35, a: 0.001 });
    }
  },

  zombieGroan(c, o, sh, t, p) {
    const env = [[0, 0], [0.18, 0.26], [0.7, 0.22], [1.0, 0]];
    const freq = [[0, 95 * p], [0.3, 108 * p], [1.0, 70 * p]];
    tone(c, o, { t, dur: 1.0, type: 'sawtooth', freq, env, vib: { rate: 7, depth: 3 }, filter: { type: 'bandpass', freq: [[0, 380], [0.4, 720], [1.0, 340]], Q: 3 } });
    tone(c, o, { t, dur: 1.0, type: 'sawtooth', freq, detune: 12, env: env.map(([d, v]) => [d, v * 0.5]), filter: { type: 'bandpass', freq: [[0, 900], [0.4, 1150], [1.0, 800]], Q: 5 } });
  },

  ghostWail(c, o, sh, t, p) {
    const freq = [[0, 520 * p], [0.35, 880 * p], [0.8, 700 * p], [1.2, 420 * p]];
    tone(c, o, { t, dur: 1.25, type: 'sine', freq, env: [[0, 0], [0.25, 0.14], [0.9, 0.12], [1.25, 0]], vib: { rate: 5.5, depth: 12 }, send: { node: sh.fx.input, amount: 0.45 } });
    tone(c, o, { t, dur: 1.25, type: 'sine', freq: freq.map(([d, f]) => [d, f * 2.01]), env: [[0, 0], [0.3, 0.03], [0.9, 0.025], [1.25, 0]], vib: { rate: 5.5, depth: 24 } });
  },

  ghostImmune(c, o, sh, t, p) {
    tone(c, o, { t, dur: 0.28, type: 'triangle', freq: [[0, 240 * p], [0.08, 620 * p], [0.26, 170 * p]], vol: 0.8, a: 0.01, filter: { type: 'bandpass', f: 700, Q: 2 } });
    noise(c, o, sh, { t, dur: 0.22, vol: 0.25, a: 0.03, filter: { type: 'bandpass', freq: [[0, 600], [0.1, 1400], [0.22, 500]], Q: 3 } });
  },

  howl(c, o, sh, t, p) {
    const freq = [[0, 300 * p], [0.25, 560 * p], [0.85, 540 * p], [1.2, 330 * p]];
    const env = [[0, 0], [0.12, 0.22], [0.9, 0.2], [1.25, 0]];
    tone(c, o, { t, dur: 1.25, type: 'sawtooth', freq, env, vib: { rate: 5.5, depth: 9, delay: 0.3 }, filter: { type: 'lowpass', freq: [[0, 700], [0.3, 1900], [1.2, 650]], Q: 4 }, send: { node: sh.fx.input, amount: 0.3 } });
    tone(c, o, { t, dur: 1.25, type: 'sine', freq, env: env.map(([d, v]) => [d, v * 0.7]), vib: { rate: 5.5, depth: 9, delay: 0.3 } });
  },

  hurt(c, o, sh, t, p) {
    tone(c, o, { t, dur: 0.2, type: 'square', freq: [[0, 640 * p], [0.18, 180 * p]], vol: 0.2, a: 0.002, filter: { type: 'lowpass', f: 2500 } });
    tone(c, o, { t, dur: 0.2, type: 'sine', freq: [[0, 640 * p], [0.18, 180 * p]], vol: 0.22, a: 0.002 });
  },

  shieldBlock(c, o, sh, t, p) {
    const f = 1100 * p;
    [[1, 0.22, 0.55], [2.76, 0.13, 0.4], [5.4, 0.07, 0.22], [8.93, 0.04, 0.12]].forEach(([r, v, d]) => {
      tone(c, o, { t, dur: d, type: 'sine', f: f * r, vol: v, a: 0.001, send: { node: sh.fx.input, amount: 0.2 } });
    });
    noise(c, o, sh, { t, dur: 0.03, vol: 0.3, a: 0.001, filter: { type: 'highpass', f: 5000 } });
  },

  gameOver(c, o, sh, t) {
    [[67, 0, 0.32], [66, 0.36, 0.32], [65, 0.72, 0.32], [64, 1.08, 1.1]].forEach(([m, d, len]) => brass(c, o, t + d, m, 0.18, len));
    tone(c, o, { t: t + 1.08, dur: 1.2, type: 'triangle', f: mtof(40), vol: 0.25, a: 0.02 });
  },

  roomClear(c, o, sh, t) {
    [[72, 0], [76, 0.08], [79, 0.16]].forEach(([m, d]) => tone(c, o, { t: t + d, dur: 0.14, type: 'square', f: mtof(m), vol: 0.1, a: 0.002, filter: { type: 'lowpass', f: 3500 } }));
    tone(c, o, { t: t + 0.24, dur: 0.55, type: 'square', f: mtof(84), vol: 0.11, a: 0.002, filter: { type: 'lowpass', f: 3500 }, send: { node: sh.fx.input, amount: 0.25 } });
    [72, 76, 79].forEach((m) => tone(c, o, { t: t + 0.24, dur: 0.55, type: 'triangle', f: mtof(m), vol: 0.09, a: 0.005 }));
  },

  levelComplete(c, o, sh, t) {
    [[67, 0, 0.11], [72, 0.12, 0.11], [76, 0.24, 0.11], [79, 0.36, 0.3], [76, 0.7, 0.12], [79, 0.84, 0.9]].forEach(([m, d, len]) => brass(c, o, t + d, m, 0.14, len));
    [72, 76, 84].forEach((m) => tone(c, o, { t: t + 0.84, dur: 1.0, type: 'triangle', f: mtof(m), vol: 0.08, a: 0.01 }));
    [[48, 0], [55, 0.36], [48, 0.84]].forEach(([m, d]) => tone(c, o, { t: t + d, dur: 0.4, type: 'triangle', f: mtof(m), vol: 0.28, a: 0.005 }));
    for (let i = 0; i < 8; i++) bell(c, o, sh, t + 0.9 + i * 0.07, mtof(96 + [0, 4, 7, 12][i % 4]), 0.035, 0.4, 0.2);
  },

  newPet(c, o, sh, t) {
    [84, 88, 91, 96, 100].forEach((m, i) => bell(c, o, sh, t + i * 0.08, mtof(m), 0.09, 0.9, 0.5));
    for (let i = 0; i < 8; i++) {
      tone(c, o, { t: t + 0.2 + rnd() * 0.6, dur: 0.15, type: 'sine', f: 3000 + rnd() * 3000, vol: 0.03, a: 0.002 });
    }
  },

  buy(c, o, sh, t) {
    noise(c, o, sh, { t, dur: 0.05, vol: 0.45, a: 0.001, filter: { type: 'bandpass', f: 2500, Q: 2 } }); // ka
    noise(c, o, sh, { t: t + 0.02, dur: 0.04, vol: 0.3, a: 0.001, filter: { type: 'bandpass', f: 1600, Q: 3 } });
    bell(c, o, sh, t + 0.07, 2093, 0.12, 0.6, 0.2); // ching
    bell(c, o, sh, t + 0.07, 2637, 0.09, 0.6, 0);
    noise(c, o, sh, { t: t + 0.07, dur: 0.25, vol: 0.12, a: 0.002, filter: { type: 'highpass', f: 6500 }, am: { rate: 30, depth: 0.6 } });
  },

  click(c, o, sh, t, p) {
    tone(c, o, { t, dur: 0.035, type: 'sine', f: 1800 * p, vol: 0.14, a: 0.001 });
    noise(c, o, sh, { t, dur: 0.015, vol: 0.08, a: 0.001, filter: { type: 'highpass', f: 4000 } });
  },

  doorOpen(c, o, sh, t) {
    tone(c, o, { t, dur: 0.7, type: 'sawtooth', freq: [[0, 70], [0.5, 140], [0.7, 120]], vol: 0.2, a: 0.05, filter: { type: 'lowpass', f: 900, Q: 2 }, am: { rate: 28, depth: 0.5 } });
    noise(c, o, sh, { t, dur: 0.65, vol: 0.12, a: 0.05, filter: { type: 'bandpass', freq: [[0, 400], [0.6, 900]], Q: 2 } });
    bell(c, o, sh, t + 0.62, mtof(88), 0.11, 0.7, 0.35);
    bell(c, o, sh, t + 0.74, mtof(93), 0.11, 0.9, 0.35);
  },

  bearRoar(c, o, sh, t, p) {
    tone(c, o, { t, dur: 0.65, type: 'sawtooth', freq: [[0, 115 * p], [0.15, 140 * p], [0.6, 70 * p]], vol: 0.35, a: 0.04, filter: { type: 'lowpass', freq: [[0, 600], [0.2, 1100], [0.65, 300]], Q: 3 }, am: { rate: 27, depth: 0.5 } });
    noise(c, o, sh, { t, dur: 0.6, vol: 0.22, a: 0.05, filter: { type: 'lowpass', f: 520, Q: 1 }, am: { rate: 23, depth: 0.5 } });
  },

  batSquee(c, o, sh, t, p) {
    tone(c, o, { t, dur: 0.08, type: 'sine', freq: [[0, 3200 * p], [0.04, 4800 * p], [0.07, 3600 * p]], vol: 0.11, a: 0.003 });
    tone(c, o, { t: t + 0.1, dur: 0.07, type: 'sine', freq: [[0, 3500 * p], [0.035, 5200 * p], [0.06, 3900 * p]], vol: 0.09, a: 0.003 });
  },

  rise(c, o, sh, t, p) {
    noise(c, o, sh, { t, dur: 1.0, env: [[0, 0], [0.3, 0.8], [0.8, 0.6], [1.0, 0]], filter: { type: 'lowpass', freq: [[0, 90], [0.9, 380 * p]], Q: 1 }, am: { rate: 12, depth: 0.4 } });
    tone(c, o, { t, dur: 1.0, type: 'sine', freq: [[0, 38 * p], [1.0, 58 * p]], env: [[0, 0], [0.3, 0.35], [1.0, 0]] });
    for (let i = 0; i < 6; i++) {
      noise(c, o, sh, { t: t + 0.25 + rnd() * 0.7, dur: 0.04, vol: 0.25, a: 0.001, filter: { type: 'bandpass', f: 300 + rnd() * 600, Q: 4 } });
    }
  },
};

// Voice management per effect (used by audio.js):
//   dur   seconds the effect sounds (dry part, used to know when a voice is done)
//   gap   the same effect cannot restart within this many seconds
//   max   simultaneous voices of this effect
//   steal true: at the limit the oldest voice is faded out quickly; false: the new one is skipped
//         (long jingles / creature calls should finish, short hits should stay snappy)
const M = (dur, gap, max, steal = true) => ({ dur, gap, max, steal });
export const SFX_META = {
  swing: M(0.2, 0.09, 1),
  hitPumpkin: M(0.18, 0.07, 2),
  smashPumpkin: M(0.46, 0.08, 2),
  coin: M(0.46, 0.06, 3),
  clubUp: M(0.75, 0.2, 1, false),
  hitMonster: M(0.13, 0.07, 2),
  monsterDie: M(0.53, 0.08, 2),
  skeletonBreak: M(0.37, 0.08, 2),
  zombieGroan: M(1.0, 0.3, 1, false),
  ghostWail: M(1.25, 0.3, 1, false),
  ghostImmune: M(0.28, 0.12, 1),
  howl: M(1.25, 0.3, 1, false),
  hurt: M(0.2, 0.09, 1),
  shieldBlock: M(0.55, 0.09, 2),
  gameOver: M(2.3, 1.0, 1, false),
  roomClear: M(0.8, 0.5, 1, false),
  levelComplete: M(1.9, 1.0, 1, false),
  newPet: M(1.25, 0.5, 1, false),
  buy: M(0.7, 0.08, 2),
  click: M(0.04, 0.05, 2),
  doorOpen: M(1.65, 0.5, 1, false),
  bearRoar: M(0.65, 0.3, 1, false),
  batSquee: M(0.17, 0.1, 1),
  rise: M(1.0, 0.15, 2, false),
};
export const SFX_DEFAULT_META = M(0.5, 0.07, 2);
