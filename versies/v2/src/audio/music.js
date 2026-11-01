// Procedural background music. Each track is a step sequencer:
//   track.stepDur        seconds per step
//   track.delayTime      echo time that suits the tempo
//   track.schedule(step, time)   schedules every note of that step at `time`
// `step` counts up forever; tracks derive the loop pass from it for variations.
import { mtof, tone, noise, parseBar, chord } from './synth.js';

const rnd = Math.random;
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// ---------- instruments ----------
function pluck(ctx, out, sh, t, m, vol, len = 0.35, send = 0) {
  const f = mtof(m);
  tone(ctx, out, {
    t, dur: len, type: 'sawtooth', f, vol, a: 0.003,
    filter: { type: 'lowpass', freq: [[0, Math.min(f * 7, 7000)], [len * 0.6, Math.max(f * 1.2, 200)]], Q: 3 },
    send: send ? { node: sh.fx.input, amount: send } : null,
  });
}

function uprightBass(ctx, out, t, m, vol, len) {
  tone(ctx, out, {
    t, dur: len, type: 'sawtooth', f: mtof(m), vol, a: 0.008,
    filter: { type: 'lowpass', freq: [[0, 900], [len, 220]], Q: 2 },
  });
  tone(ctx, out, { t, dur: len, type: 'sine', f: mtof(m), vol: vol * 0.8, a: 0.01 });
}

function theremin(ctx, out, sh, t, m, vol, len) {
  const f = mtof(m);
  tone(ctx, out, {
    t, dur: len + 0.12, type: 'sine', freq: [[0, f * 0.97], [0.06, f]], vol,
    env: [[0, 0], [0.04, vol], [len, vol * 0.7], [len + 0.12, 0]],
    vib: { rate: 6, depth: f * 0.012, delay: 0.08 },
    send: { node: sh.fx.input, amount: 0.35 },
  });
}

function kick(ctx, out, t, vol) {
  tone(ctx, out, { t, dur: 0.28, type: 'sine', freq: [[0, 150], [0.09, 48]], vol, a: 0.002 });
}

function snare(ctx, out, sh, t, vol) {
  noise(ctx, out, sh, { t, dur: 0.16, vol, a: 0.001, filter: { type: 'bandpass', f: 2200, Q: 0.7 } });
  tone(ctx, out, { t, dur: 0.09, type: 'triangle', freq: [[0, 210], [0.08, 140]], vol: vol * 0.7, a: 0.001 });
}

function brush(ctx, out, sh, t, vol) {
  noise(ctx, out, sh, { t, dur: 0.2, vol, a: 0.02, filter: { type: 'bandpass', f: 3500, Q: 0.6 } });
}

function hat(ctx, out, sh, t, vol, len = 0.04) {
  noise(ctx, out, sh, { t, dur: len, vol, a: 0.001, filter: { type: 'highpass', f: 7500, Q: 0.7 } });
}

function chip(ctx, out, sh, t, m, vol, len, type = 'square', send = 0.2) {
  const f = mtof(m);
  tone(ctx, out, {
    t, dur: len, type, f, vol,
    env: [[0, 0], [0.005, vol], [Math.max(len - 0.04, 0.01), vol * 0.75], [len, 0]],
    vib: len > 0.3 ? { rate: 6, depth: f * 0.01, delay: 0.15 } : null,
    filter: type === 'square' ? { type: 'lowpass', f: 3200, Q: 0.5 } : null,
    send: send ? { node: sh.fx.input, amount: send } : null,
  });
}

function blip(ctx, out, t, m, vol, len, type = 'square') {
  tone(ctx, out, { t, dur: len, type, f: mtof(m), vol, a: 0.002, filter: { type: 'lowpass', f: 2600, Q: 0.5 } });
}

function bubble(ctx, out, t) {
  const f = 300 + rnd() * 300;
  tone(ctx, out, { t, dur: 0.09, type: 'sine', freq: [[0, f], [0.08, f * 3.2]], vol: 0.07, a: 0.004 });
}

function musicBox(ctx, out, sh, t, m, vol) {
  const f = mtof(m);
  tone(ctx, out, { t, dur: 1.5, type: 'sine', f, vol, a: 0.002, send: { node: sh.fx.input, amount: 0.4 } });
  tone(ctx, out, { t, dur: 0.5, type: 'sine', f: f * 2, vol: vol * 0.28, a: 0.002 });
  tone(ctx, out, { t, dur: 0.12, type: 'sine', f: f * 4.2, vol: vol * 0.08, a: 0.001 });
}

function organ(ctx, out, sh, t, m, vol, len, attack = 0.03) {
  tone(ctx, out, {
    t, dur: len, wave: sh.organ, f: mtof(m), vol, detune: (rnd() - 0.5) * 8,
    env: [[0, 0], [attack, vol], [Math.max(len - 0.12, attack + 0.01), vol * 0.85], [len, 0]],
  });
}

// chord tones voiced upward from `base` octave (root first)
function voicing(c, base) {
  const r = base + c.pc;
  return c.ivs.map((iv) => r + iv);
}

// ======================= 0: Spookswing =======================
function makeSpookswing(ctx, out, sh) {
  const bpm = 132;
  const beat = 60 / bpm;
  const stepDur = beat / 2; // swung 8ths
  const chords = {
    A: ['Dm', 'Dm', 'Gm', 'Dm', 'Bb7', 'A7', 'Dm', 'A7'],
    B: ['Gm', 'Gm', 'Dm', 'Dm', 'Bb7', 'A7', 'Dm', 'Dm'],
  };
  const mel = {
    A: [
      'A4 . D5 . F5 - E5 D5',
      'C#5 D5 . A4 . . . .',
      'Bb4 . D5 . G5 - F5 D5',
      'F5 - E5 D5 A4 . . .',
      'Bb4 D5 F5 Ab5 G5 F5 D5 Bb4',
      'A4 C#5 E5 G5 F5 E5 C#5 A4',
      'D5 . F5 . A5 - G5 F5',
      'E5 . C#5 . A4 . . .',
    ],
    B: [
      'G5 - - D5 Bb4 . D5 .',
      'G5 A5 Bb5 A5 G5 . . .',
      'F5 - - D5 A4 . D5 .',
      'F5 E5 F5 G5 A5 . . .',
      'Ab5 - G5 F5 D5 . Bb4 .',
      'A4 . C#5 . E5 . G5 .',
      'F5 . E5 . D5 . A4 .',
      'D5 . . . . . . .',
    ],
  };
  const C = {}; for (const k in chords) C[k] = chords[k].map(chord);
  const M = {}; for (const k in mel) M[k] = mel[k].map(parseBar);
  const form = ['A', 'A', 'B', 'A'];
  const barsPerSec = 8;
  const total = form.length * barsPerSec * 8;
  const bassRoot = (c) => 38 + ((c.pc - 2 + 12) % 12); // D2..C#3
  let lastBass = 38;

  return {
    stepDur,
    delayTime: beat * 0.75,
    schedule(step, t) {
      const pass = Math.floor(step / total);
      const s = step % total;
      const bar = Math.floor(s / 8);
      const pos = s % 8;
      const secIdx = Math.floor(bar / barsPerSec);
      const sec = form[secIdx];
      const bi = bar % barsPerSec;
      const nextBar = (bar + 1) % (form.length * barsPerSec);
      const c = C[sec][bi];
      const nc = C[form[Math.floor(nextBar / barsPerSec)]][nextBar % barsPerSec];
      const tt = pos % 2 ? t + beat / 6 : t; // swing
      const lastBarOfForm = bar === form.length * barsPerSec - 1;

      // walking bass on every beat
      if (pos % 2 === 0) {
        const b = pos / 2;
        const r = bassRoot(c);
        let m;
        const alt = (bar + pass) % 2;
        if (b === 0) m = r;
        else if (b === 1) m = r + (alt ? c.ivs[2] : c.ivs[1]);
        else if (b === 2) m = alt ? r + 12 : r + c.ivs[2];
        else {
          const nr = bassRoot(nc);
          m = lastBass > nr ? nr + 1 : nr - 1;
        }
        lastBass = m;
        uprightBass(ctx, out, t, m, 0.32, beat * 0.92);
      }

      // drums: soft kick 1 & 3, brush on 2 & 4, swung ride
      if (pos === 0 || pos === 4) kick(ctx, out, t, 0.32);
      if (pos === 2 || pos === 6) { brush(ctx, out, sh, t, 0.06); hat(ctx, out, sh, t, 0.06, 0.03); }
      const ride = [0.07, 0, 0.08, 0.045, 0.07, 0, 0.08, 0.045][pos];
      if (ride) hat(ctx, out, sh, tt, ride, 0.12);
      else if (pass % 2 === 1 && rnd() < 0.25) hat(ctx, out, sh, tt, 0.025, 0.05);
      if (lastBarOfForm && pos >= 4) snare(ctx, out, sh, tt, 0.05 + 0.02 * (pos - 4));

      // comp stabs (Charleston: beat 1 and "and" of 2)
      if (pos === 0 || pos === 3) {
        const v = voicing(c, 60).slice(1);
        for (const m of v) pluck(ctx, out, sh, tt, m < 60 ? m + 12 : m, 0.045, 0.18);
      }

      // melody
      const n = M[sec][bi][pos];
      if (n) {
        const len = n.len * stepDur;
        if (sec === 'A' && pass % 2 === 1) {
          theremin(ctx, out, sh, tt, n.m, 0.13, len);
        } else {
          const oct = secIdx === 1 ? 12 : 0;
          pluck(ctx, out, sh, tt, n.m + oct, oct ? 0.15 : 0.2, Math.max(0.3, len), 0.25);
        }
      }
    },
  };
}

// ======================= 1: Labbeats =======================
function makeLabbeats(ctx, out, sh) {
  const bpm = 124;
  const beat = 60 / bpm;
  const stepDur = beat / 4; // 16ths
  const S = {
    I: { chords: ['Am', 'Am', 'F', 'E'], lead: null },
    A: {
      chords: ['Am', 'Am', 'F', 'F', 'Dm', 'Dm', 'E', 'E'],
      lead: [
        'A4 . C5 . E5 . A5 G5',
        'E5 . . C5 D5 . E5 .',
        'F5 . A5 . C6 . A5 F5',
        'G5 . . E5 F5 . G5 .',
        'A5 . F5 . D5 . F5 A5',
        'G5 F5 E5 D5 C5 . D5 .',
        'E5 . G#5 . B5 . G#5 E5',
        'B4 - - . E5 - - .',
      ],
    },
    B: {
      chords: ['Am', 'F', 'G', 'E'],
      lead: [
        'C6 . B5 A5 E5 . A5 .',
        'C6 . B5 A5 F5 . A5 .',
        'B5 . A5 G5 D5 . G5 .',
        'G#5 . E5 . B4 . E5 .',
      ],
    },
    C: {
      chords: ['Am', 'F', 'G', 'E'],
      lead: [
        'C6 . B5 A5 E5 . A5 .',
        'C6 . B5 A5 F5 . C6 .',
        'D6 . C6 B5 G5 . B5 .',
        'E6 - - - B5 - G#5 .',
      ],
    },
    K: { chords: ['Am', 'F', 'Dm', 'E'], lead: null },
  };
  for (const k in S) {
    S[k].C = S[k].chords.map(chord);
    S[k].L = S[k].lead ? S[k].lead.map(parseBar) : null;
  }
  const form = ['I', 'A', 'B', 'C', 'K', 'A'];
  const starts = [];
  let nb = 0;
  for (const k of form) { starts.push(nb); nb += S[k].chords.length; }
  const totalBars = nb;
  const total = totalBars * 16;
  const ARPS = [
    [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1],
    [0, 2, 4, 2, 1, 3, 5, 3, 0, 2, 4, 2, 1, 3, 5, 3],
    [0, 1, 2, 0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3],
  ];

  return {
    stepDur,
    delayTime: beat * 0.75,
    schedule(step, t) {
      const pass = Math.floor(step / total);
      const s = step % total;
      const bar = Math.floor(s / 16);
      const pos = s % 16;
      let secIdx = 0;
      while (secIdx + 1 < form.length && starts[secIdx + 1] <= bar) secIdx++;
      const key = form[secIdx];
      const sec = S[key];
      const bi = bar - starts[secIdx];
      const c = sec.C[bi];
      const lastBarOfSec = bi === sec.chords.length - 1;
      const full = key === 'A' || key === 'B' || key === 'C';

      // drums
      if (key === 'I') {
        if (bar > 0 && (pos === 0 || pos === 8)) kick(ctx, out, t, 0.45);
        if (pos % 4 === 2) hat(ctx, out, sh, t, 0.05);
      } else if (key === 'K') {
        if (pos === 0) kick(ctx, out, t, 0.4);
        if (pos === 12) snare(ctx, out, sh, t, 0.1);
        if (pos % 2 === 1) hat(ctx, out, sh, t, 0.025);
      } else {
        if (pos % 4 === 0) kick(ctx, out, t, 0.5);
        if (pos === 4 || pos === 12) snare(ctx, out, sh, t, 0.16);
        if (pos % 4 === 2) hat(ctx, out, sh, t, pos === 14 && key !== 'A' ? 0.06 : 0.055, pos === 14 && key !== 'A' ? 0.18 : 0.04);
        if (key === 'C' && pos % 2 === 1) hat(ctx, out, sh, t, 0.02);
        if (lastBarOfSec && pos >= 13) snare(ctx, out, sh, t, 0.06 + 0.03 * (pos - 13));
      }

      // bass: octave-bouncing 8ths
      const r = 45 + ((c.pc - 9 + 12) % 12) - (c.pc > 4 && c.pc < 9 ? 12 : 0);
      if (key === 'K') {
        if (pos === 0 || pos === 8) blip(ctx, out, t, r, 0.16, beat * 1.8, 'triangle');
      } else if (pos % 2 === 0 && !(key === 'I' && bar === 0)) {
        const m = (pos / 2) % 2 ? r + 12 : r;
        blip(ctx, out, t, m, 0.13, stepDur * 1.6, 'square');
      }

      // arpeggio
      const tones = voicing(c, 60 + (c.pc >= 5 ? -12 : 0));
      const triad = tones.slice(0, 3);
      const ap = ARPS[(secIdx + pass) % ARPS.length];
      const idx = ap[pos];
      const am = triad[idx % 3] + 12 * Math.floor(idx / 3);
      const arpVol = key === 'K' ? 0.06 : 0.04;
      blip(ctx, out, t, am, arpVol, stepDur * 0.9, pass % 2 ? 'triangle' : 'square');

      // lead
      if (sec.L && pos % 2 === 0) {
        const n = sec.L[bi][pos / 2];
        if (n) {
          const len = n.len * stepDur * 2 * 0.92;
          if (pass % 2 === 0) chip(ctx, out, sh, t, n.m, 0.085, len, 'square');
          else {
            chip(ctx, out, sh, t, n.m + (secIdx === 5 ? 12 : 0), 0.16, len, 'triangle');
            chip(ctx, out, sh, t, n.m - 12, 0.035, len, 'square', 0);
          }
        }
      }

      // mysterious lab extras
      if ((key === 'K' || key === 'I') && pos === 6 && rnd() < 0.6) bubble(ctx, out, t);
      if (key === 'K' && pos % 4 === 0 && rnd() < 0.3) blip(ctx, out, t, pick(triad) + 24, 0.035, 0.1, 'sine');
      if (!full && pass % 2 === 1 && pos === 10 && rnd() < 0.5) bubble(ctx, out, t);
    },
  };
}

// ======================= 2: Griezelwals =======================
function makeGriezelwals(ctx, out, sh) {
  const bpm = 138;
  const beat = 60 / bpm;
  const stepDur = beat / 2; // 8ths, 6 per bar (3/4)
  const S = {
    A: {
      chords: ['Em', 'Em', 'Am', 'Am', 'B7', 'B7', 'Em', 'Em'],
      mel: [
        'E5 - - - G5 -',
        'F#5 - E5 - B4 -',
        'C5 - - - E5 -',
        'A5 - G5 - E5 -',
        'D#5 - - - F#5 -',
        'A5 - F#5 - D#5 -',
        'E5 - B4 - G4 B4',
        'E5 - - - . .',
      ],
    },
    B: {
      chords: ['Em', 'Em', 'Am', 'Am', 'C', 'B7', 'Em', 'Em'],
      mel: [
        'G5 F#5 G5 - B5 -',
        'E5 - - - B4 -',
        'A5 G5 A5 - C6 -',
        'E5 - - - . .',
        'E5 F#5 G5 - E5 -',
        'F#5 G5 A5 - D#5 -',
        'E5 - G5 - B5 -',
        'E6 - - - . .',
      ],
    },
    C: {
      chords: ['C', 'C', 'Am', 'Am', 'F#dim', 'B7', 'Em', 'B7'],
      mel: [
        'G5 - - - E5 -',
        'C6 - B5 - G5 -',
        'A5 - - - E5 -',
        'C5 - B4 - A4 -',
        'F#5 - A5 - C6 -',
        'B5 - A5 - F#5 D#5',
        'E5 - - - . .',
        'D#5 - F#5 - B5 -',
      ],
    },
  };
  for (const k in S) { S[k].C = S[k].chords.map(chord); S[k].M = S[k].mel.map(parseBar); }
  const form = ['A', 'B', 'A', 'C'];
  const total = form.length * 8 * 6;

  return {
    stepDur,
    delayTime: beat,
    schedule(step, t) {
      const pass = Math.floor(step / total);
      const s = step % total;
      const bar = Math.floor(s / 6);
      const pos = s % 6;
      const secIdx = Math.floor(bar / 8);
      const key = form[secIdx];
      const sec = S[key];
      const bi = bar % 8;
      const c = sec.C[bi];

      // low bass on beat 1
      if (pos === 0) {
        const r = 40 + ((c.pc - 4 + 12) % 12);
        tone(ctx, out, { t, dur: beat * 2.6, type: 'sine', f: mtof(r), vol: 0.42, a: 0.01 });
        tone(ctx, out, { t, dur: beat * 1.2, type: 'triangle', f: mtof(r + 12), vol: 0.1, a: 0.01 });
        // sustained soft organ pad in B/C sections, and always on later passes
        if (key !== 'A' || pass % 2 === 1) {
          const v = voicing(c, 48 + (c.pc >= 7 ? -12 : 0));
          for (const m of v.slice(0, 3)) organ(ctx, out, sh, t, m + 12, 0.022, beat * 3, 0.35);
        }
      }
      // organ "pah pah" on beats 2 and 3
      if (pos === 2 || pos === 4) {
        let v = voicing(c, 52 - 4);
        if (v.length === 4) v = v.slice(1);
        for (const m of v) organ(ctx, out, sh, t, m < 52 ? m + 12 : m, 0.04, beat * 0.75);
      }
      // a soft tick on beats 2 and 3 to keep the waltz lilt
      if (pos === 2 || pos === 4) hat(ctx, out, sh, t, 0.025, 0.05);

      // music box melody
      const n = sec.M[bi][pos];
      if (n) {
        const up = secIdx === 2 && pass % 2 === 0 ? 12 : 0;
        if (n.len >= 3 && rnd() < 0.25) musicBox(ctx, out, sh, Math.max(0, t - 0.06), n.m + up + 2, 0.08); // grace note
        musicBox(ctx, out, sh, t, n.m + up, 0.2);
        if (pass % 2 === 1) {
          tone(ctx, out, {
            t, dur: n.len * stepDur + 0.1, type: 'triangle', f: mtof(n.m - 12), vol: 0.06,
            env: [[0, 0], [0.08, 0.06], [n.len * stepDur, 0.04], [n.len * stepDur + 0.1, 0]],
            vib: { rate: 5, depth: mtof(n.m - 12) * 0.01, delay: 0.1 },
          });
        }
      }
      // ghostly sigh at the end of each pass
      if (bar === form.length * 8 - 1 && pos === 3 && pass % 2 === 1) {
        tone(ctx, out, {
          t, dur: 1.0, type: 'sine', freq: [[0, 700], [0.5, 990], [1.0, 600]], vol: 0.05,
          env: [[0, 0], [0.3, 0.05], [1.0, 0]], vib: { rate: 5, depth: 10 }, send: { node: sh.fx.input, amount: 0.5 },
        });
      }
    },
  };
}

const MAKERS = [makeSpookswing, makeLabbeats, makeGriezelwals];
export const TRACK_COUNT = MAKERS.length;

export function createTrack(i, ctx, out, shared) {
  return MAKERS[i](ctx, out, shared);
}
