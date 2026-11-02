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

// ---------------------------------------------------------------- iOS zoom guard
// iOS Safari ignores `user-scalable=no` and does not honour `touch-action` everywhere (root element,
// gaps, freshly shown/transformed elements), so rapid taps on the hit button could double-tap-zoom.
// CSS (style.css) is the first layer; this is the second one.
const DOUBLE_TAP_MS = 350;
const TAP_SLOP = 12;   // px: a touch that moved further is a swipe, not a tap
const FORM_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA', 'OPTION']);

function isFormControl(el) {
  return !!el && (FORM_TAGS.has(el.tagName) || el.isContentEditable);
}

// Inside a list the player scrolls (shop, pet grid): leave the touch alone.
function inScrollable(el) {
  for (let n = el; n && n.nodeType === 1 && n !== document.body; n = n.parentElement) {
    if (n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1) {
      const cs = getComputedStyle(n);
      if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX)) return true;
    }
  }
  return false;
}

/** Install once: blocks pinch (gesture*), dblclick and the iOS double-tap zoom without losing taps. */
export function installZoomGuard(win = window) {
  const doc = win.document;
  if (!doc || win.__zoomGuard) return;
  win.__zoomGuard = true;

  const block = (e) => { if (e.cancelable) e.preventDefault(); };
  // Non-standard WebKit pinch events (iOS); harmless elsewhere.
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) doc.addEventListener(ev, block, { passive: false });
  doc.addEventListener('dblclick', (e) => { if (!isFormControl(e.target)) block(e); }, { passive: false });

  const starts = new Map(); // touch identifier -> [x, y]
  let lastTapEnd = -1e9;
  doc.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) starts.set(t.identifier, [t.clientX, t.clientY]);
  }, { passive: true, capture: true });
  doc.addEventListener('touchcancel', (e) => {
    for (const t of e.changedTouches) starts.delete(t.identifier);
  }, { passive: true, capture: true });

  doc.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    if (!t) return;
    const s = starts.get(t.identifier);
    for (const c of e.changedTouches) starts.delete(c.identifier);
    if (s && Math.hypot(t.clientX - s[0], t.clientY - s[1]) > TAP_SLOP) return; // swipe/drag
    const now = performance.now();
    const quick = now - lastTapEnd < DOUBLE_TAP_MS;
    lastTapEnd = now;
    if (!quick || !e.cancelable) return;
    const el = e.target && e.target.nodeType === 1 ? e.target : e.target && e.target.parentElement;
    if (!el || isFormControl(el) || inScrollable(el)) return;
    // Second quick tap: cancel the zoom. That also cancels the synthesized click, so fire it
    // ourselves for UI controls. The joystick/hit button work on pointer events and need nothing.
    e.preventDefault();
    const ctl = el.closest('button, a[href], label, [role="button"], [role="switch"]');
    if (ctl && !ctl.disabled && !ctl.closest('.touch')) ctl.click();
  }, { passive: false });
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
