// Canvas sizing: logical 1024x640 world, letterboxed into the window, sharp on HiDPI.

import { WORLD } from '../config.js';

export function setupScreen(canvas) {
  const ctx = canvas.getContext('2d');
  const { W, H } = WORLD;

  // Black bars around the letterboxed canvas.
  document.documentElement.style.background = '#000';
  document.body.style.background = '#000';
  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';

  function resize() {
    const vw = window.innerWidth || W;
    const vh = window.innerHeight || H;
    const scale = Math.min(vw / W, vh / H);
    const cssW = Math.max(1, Math.floor(W * scale));
    const cssH = Math.max(1, Math.floor(H * scale));
    const dpr = Math.min(3, window.devicePixelRatio || 1);

    Object.assign(canvas.style, {
      position: 'fixed',
      left: Math.floor((vw - cssW) / 2) + 'px',
      top: Math.floor((vh - cssH) / 2) + 'px',
      width: cssW + 'px',
      height: cssH + 'px',
      display: 'block',
      touchAction: 'none',
    });
    const pw = Math.round(cssW * dpr), ph = Math.round(cssH * dpr);
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;
  }

  /** Reset the transform so drawing code works in logical pixels. */
  function begin() {
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.imageSmoothingEnabled = true;
    return ctx;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 100));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  resize();

  return { ctx, resize, begin };
}
