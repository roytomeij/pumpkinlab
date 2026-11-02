// Entry point: wire input, UI, audio and the engine together, then boot.

import { createInput, installZoomGuard } from './game/input.js';
import { createEngine } from './game/engine.js';
import { createUI } from './ui/ui.js';
import { audio } from './audio/audio.js';

installZoomGuard();

const canvas = document.getElementById('game');
const input = createInput(canvas);
const ui = createUI({ root: document.getElementById('ui-root'), input, audio });
const engine = createEngine({ canvas, ui, audio, input });

engine.boot();

// Handy for debugging in the browser console.
window.pompoenlab = engine;
