// Keyboard + touch input, merged into one simple interface.
//
// Contract (DESIGN.md):
//   createInput(canvas) -> { getMove, consumeAttack, consumePause, setTouchMove, triggerAttack, triggerPause }
// Extra (engine only): clear() drops queued presses, e.g. when an overlay closes.

const MOVE_KEYS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};
const ATTACK_KEYS = new Set(['Space', 'KeyZ', 'KeyJ']);
const PAUSE_KEYS = new Set(['Escape', 'KeyP']);
const NO_SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

// Keys typed into buttons/fields belong to the UI, not to the game.
function isUiTarget(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' ||
    tag === 'A' || el.isContentEditable;
}

// Some browsers report an empty `code` (virtual keyboards); fall back on `key`.
function keyCode(e) {
  if (e.code) return e.code;
  const k = e.key;
  if (k === ' ' || k === 'Spacebar') return 'Space';
  if (k === 'Esc') return 'Escape';
  if (k && k.length === 1) return 'Key' + k.toUpperCase();
  return k || '';
}

export function createInput(canvas) {
  const held = new Set();          // currently pressed key codes
  let attackQueued = false;
  let pauseQueued = false;
  let touchX = 0, touchY = 0;

  function onKeyDown(e) {
    const code = keyCode(e);
    if (isUiTarget(e.target)) return;
    if (NO_SCROLL_KEYS.has(code)) e.preventDefault();
    held.add(code);
    if (e.repeat) return;
    if (ATTACK_KEYS.has(code)) attackQueued = true;
    if (PAUSE_KEYS.has(code)) pauseQueued = true;
  }

  function onKeyUp(e) {
    held.delete(keyCode(e));
  }

  function clearKeys() {
    held.clear();
    touchX = 0; touchY = 0;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', clearKeys);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearKeys(); });
  // Long-press on the canvas should not open a context menu on tablets.
  if (canvas) canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    /** Normalized movement vector (keyboard + touch joystick), length <= 1. */
    getMove() {
      let kx = 0, ky = 0;
      for (const code of held) {
        const v = MOVE_KEYS[code];
        if (v) { kx += v[0]; ky += v[1]; }
      }
      const kl = Math.hypot(kx, ky);
      if (kl > 0) { kx /= kl; ky /= kl; }
      let x = kx + touchX, y = ky + touchY;
      const l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
      return { x, y };
    },

    /** True once per attack press. Holding an attack key keeps attacking (engine applies the cooldown). */
    consumeAttack() {
      const q = attackQueued;
      attackQueued = false;
      if (q) return true;
      for (const code of ATTACK_KEYS) if (held.has(code)) return true;
      return false;
    },

    consumePause() {
      const q = pauseQueued;
      pauseQueued = false;
      return q;
    },

    /** Analog joystick vector from the touch UI; components -1..1. */
    setTouchMove(dx, dy) {
      touchX = Number.isFinite(dx) ? dx : 0;
      touchY = Number.isFinite(dy) ? dy : 0;
    },

    triggerAttack() { attackQueued = true; },
    triggerPause() { pauseQueued = true; },

    /** Drop queued presses (not the joystick, the finger may still be down). */
    clear() {
      attackQueued = false;
      pauseQueued = false;
      for (const code of [...held]) if (ATTACK_KEYS.has(code) || PAUSE_KEYS.has(code)) held.delete(code);
    },
  };
}
