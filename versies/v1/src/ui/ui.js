// Pompoenlab UI: DOM-overlays boven het canvas (titel, dieren kiezen, winkel, level klaar,
// game over, overwinning, pauze), HUD, toasts en touch-besturing.
import { t, setLang, getLang, onLangChange } from './i18n.js';
import { getShopItems, buy } from './shop.js';
import * as sprites from '../render/sprites.js';
import { CLUBS, PET_IDS, PLAYER, PUMPKIN, MAX_PETS_IN_ROOM, LEVELS } from '../config.js';

// ------------------------------------------------------------------ helpers

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const [sk, sv] of Object.entries(v)) {
          if (sk.startsWith('--')) el.style.setProperty(sk, sv);
          else el.style[sk] = sv;
        }
      } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, kids);
  return el;
}

function append(el, kids) {
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
}

const EMOJI = {
  pet: { wolf: '🐺', dog: '🐶', bear: '🐻', cat: '🐱', owl: '🦉', bat: '🦇', turtle: '🐢', hedgehog: '🦔', raven: '🐦' },
  club: { wood: '🏏', stone: '🪨', iron: '🔨', gold: '🏆' },
  monster: { skeleton: '💀', zombie: '🧟', ghost: '👻' },
  coin: '🪙', heart: '❤️', shield: '🛡️',
};

function emojiFor(kind, id) {
  const e = EMOJI[kind];
  if (!e) return '❔';
  if (typeof e === 'string') return e;
  return e[id] || '❔';
}

const iconCache = new Map();

// Icoon via sprites.renderIcon (gecachet), met emoji-terugval als Art nog niet klaar is of faalt.
// renderIcon regelt zelf devicePixelRatio; `frame` (4e argument, optioneel) = tegel-achtergrond aan/uit.
function icon(kind, id, size, cls, frame = false) {
  const wrap = h('span', { class: `icon icon-${kind}${cls ? ' ' + cls : ''}`, style: { '--icon': size + 'px' }, 'aria-hidden': 'true' });
  const key = `${kind}|${id}|${size}|${frame ? 1 : 0}`;
  let src = iconCache.get(key);
  if (src === undefined) {
    src = null;
    try {
      const fn = sprites && sprites.renderIcon;
      if (typeof fn === 'function') {
        const c = fn(kind, id, size, { frame });
        if (c && c.width > 0 && c.height > 0) src = c;
      }
    } catch (e) {
      console.warn('renderIcon failed', kind, id, e);
    }
    iconCache.set(key, src);
  }
  if (src) {
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    try { c.getContext('2d').drawImage(src, 0, 0); wrap.append(c); }
    catch (e) { wrap.classList.add('is-emoji'); wrap.append(h('span', { class: 'icon-emoji' }, emojiFor(kind, id))); }
  } else {
    wrap.classList.add('is-emoji');
    wrap.append(h('span', { class: 'icon-emoji' }, emojiFor(kind, id)));
  }
  return wrap;
}

function stars(level, max = 3) {
  const s = h('span', { class: 'stars', 'aria-label': `${level}/${max}` });
  for (let i = 0; i < max; i++) s.append(h('span', { class: i < level ? 'star on' : 'star' }, '★'));
  return s;
}

// CSS-pompoen (logo, game over, overwinning)
function cssPumpkin(variant = '') {
  return h('div', { class: `pumpkin ${variant}`, 'aria-hidden': 'true' },
    h('div', { class: 'pk-stem' }), h('div', { class: 'pk-leaf' }),
    h('div', { class: 'pk-body' },
      h('div', { class: 'pk-face' },
        h('span', { class: 'pk-eye l' }), h('span', { class: 'pk-eye r' }), h('span', { class: 'pk-mouth' }))));
}

function confetti(n = 36) {
  const colors = ['#ff8a1f', '#ffd34d', '#7cff6b', '#b67dff', '#ff5ab4', '#5ad8ff'];
  const box = h('div', { class: 'confetti', 'aria-hidden': 'true' });
  for (let i = 0; i < n; i++) {
    box.append(h('i', {
      style: {
        left: (Math.random() * 100).toFixed(1) + '%',
        background: colors[i % colors.length],
        animationDelay: (Math.random() * 2.5).toFixed(2) + 's',
        animationDuration: (2.6 + Math.random() * 2).toFixed(2) + 's',
        '--rot': Math.round(Math.random() * 720 - 360) + 'deg',
        '--drift': Math.round(Math.random() * 120 - 60) + 'px',
      },
    }));
  }
  return box;
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex="0"]';

// ------------------------------------------------------------------ createUI

export function createUI({ root, input, audio } = {}) {
  root = root || document.getElementById('ui-root') || document.body;
  root.classList.add('ui');

  const A = (fn, ...args) => {
    try { const f = audio && audio[fn]; if (typeof f === 'function') return f.apply(audio, args); } catch (e) { /* stil */ }
    return undefined;
  };
  const sfx = (name) => A('sfx', name);
  let unlocked = false;
  const unlock = () => { if (!unlocked) { unlocked = true; A('unlock'); } };

  const callInput = (fn, ...args) => {
    try { const f = input && input[fn]; if (typeof f === 'function') f.apply(input, args); } catch (e) { /* stil */ }
  };

  // Knop met klikgeluid
  function btn(label, onClick, opts = {}) {
    const { variant = 'orange', fk, autofocus, cls = '', disabled, sound = 'click', aria } = opts;
    const b = h('button', {
      type: 'button', class: `btn btn-${variant} ${cls}`.trim(),
      'data-fk': fk, 'data-autofocus': autofocus ? '1' : null, disabled: !!disabled, 'aria-label': aria,
    }, label);
    b.addEventListener('click', (e) => {
      unlock();
      if (sound) sfx(sound);
      onClick && onClick(e);
    });
    return b;
  }

  // ---------------------------------------------------------------- lagen
  const hudEl = h('div', { class: 'hud hidden' });
  const touchEl = h('div', { class: 'touch hidden' });
  const screensEl = h('div', { class: 'screens' });
  const toastEl = h('div', { class: 'toasts', 'aria-live': 'polite' });
  root.replaceChildren(hudEl, touchEl, screensEl, toastEl);

  // ---------------------------------------------------------------- schermen
  let current = null; // { name, el, state, build, onKey, timers: [] }

  function isOverlayOpen() { return !!current; }

  function openScreen(name, state, build, onKey) {
    closeScreen();
    const el = h('div', { class: `screen screen-${name}`, role: 'dialog', 'aria-modal': 'true' });
    screensEl.append(el);
    current = { name, el, state, build, onKey, timers: [] };
    // In-game toasts (e.g. "De deur is open!") would otherwise float over the new screen.
    for (const c of [...toastEl.children]) fadeToast(c);
    renderScreen(true);
    refreshVisibility();
    return current;
  }

  function later(fn, ms) {
    if (!current) return;
    const scr = current;
    const id = setTimeout(() => { if (current === scr) fn(); }, ms);
    scr.timers.push(id);
  }

  function renderScreen(first = false) {
    if (!current) return;
    const { el, state, build } = current;
    const act = document.activeElement;
    const fk = state.focusAfter || (act && el.contains(act) ? act.dataset.fk : null);
    state.focusAfter = null;
    el.classList.toggle('rerender', !first);
    el.replaceChildren(build());
    const scope = el.querySelector('.modal') || el;
    let target = fk ? scope.querySelector(`[data-fk="${CSS.escape(fk)}"]:not([disabled])`) : null;
    if (!target) target = scope.querySelector('[data-autofocus]:not([disabled])') || scope.querySelector(FOCUSABLE);
    if (target) { try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); } }
  }

  function closeScreen() {
    if (!current) return;
    for (const id of current.timers) clearTimeout(id);
    current.el.remove();
    current = null;
  }

  function hideAll() {
    closeScreen();
    refreshVisibility();
  }

  // Sluit het scherm en roept de callback aan (één keer).
  const finish = (cb, ...args) => { hideAll(); try { cb && cb(...args); } catch (e) { console.error(e); } };

  // Panel-opbouw
  function panel(cls, ...kids) { return h('div', { class: `panel ${cls || ''}`.trim() }, kids); }
  function modal(state, title, body, footer, { closable = true } = {}) {
    const back = h('div', { class: 'modal-back' });
    if (closable) {
      back.addEventListener('pointerdown', (e) => { if (e.target === back) { state.modal = null; renderScreen(); } });
    }
    back.append(h('div', { class: 'panel modal anim-in' },
      h('h2', { class: 'panel-title' }, title),
      h('div', { class: 'modal-body' }, body),
      footer ? h('div', { class: 'row center' }, footer) : null));
    return back;
  }

  // ---------------------------------------------------------------- instellingen
  function settingsModal(state, profile, onSettingsChange, returnFk) {
    const changed = () => { try { onSettingsChange && onSettingsChange(profile); } catch (e) { console.error(e); } };
    const seg = (label, fkPrefix, options, current, pick) => h('div', { class: 'set-row' },
      h('div', { class: 'set-label' }, label),
      h('div', { class: 'seg', role: 'group', 'aria-label': label },
        options.map((o) => {
          const b = h('button', {
            type: 'button', class: 'seg-btn', 'aria-pressed': String(current === o.v), 'data-fk': fkPrefix + o.v,
          }, o.label);
          b.addEventListener('click', () => { unlock(); sfx('click'); pick(o.v); });
          return b;
        })));

    const slider = (label, key, fk, apply, previewSfx) => {
      const pct = () => Math.round(profile[key] * 100) + '%';
      const val = h('span', { class: 'set-val' }, pct());
      const inp = h('input', {
        type: 'range', min: 0, max: 100, step: 5, value: Math.round(profile[key] * 100), 'data-fk': fk, 'aria-label': label,
        class: 'slider', style: { '--p': Math.round(profile[key] * 100) + '%' },
      });
      inp.addEventListener('input', () => {
        unlock();
        const v = Math.max(0, Math.min(1, Number(inp.value) / 100));
        profile[key] = v;
        val.textContent = pct();
        inp.style.setProperty('--p', Math.round(v * 100) + '%');
        apply(v);
        changed();
      });
      if (previewSfx) inp.addEventListener('change', () => sfx(previewSfx));
      return h('div', { class: 'set-row' }, h('div', { class: 'set-label' }, label), h('div', { class: 'slider-wrap' }, inp, val));
    };

    const body = [
      seg(t('settings.language'), 'lang-', [{ v: 'nl', label: 'Nederlands' }, { v: 'en', label: 'English' }], profile.lang,
        (v) => { profile.lang = v; changed(); if (getLang() !== v) setLang(v); else renderScreen(); }),
      seg(t('settings.difficulty'), 'diff-', ['easy', 'normal', 'hard'].map((v) => ({ v, label: t('difficulty.' + v) })), profile.difficulty,
        (v) => { profile.difficulty = v; changed(); renderScreen(); }),
      seg(t('settings.music'), 'music-', [0, 1, 2].map((v) => ({ v, label: h('span', null, h('b', { class: 'num' }, v + 1), ' ', t('music.' + v)) })), profile.musicTrack,
        (v) => { profile.musicTrack = v; A('playMusic', v); changed(); renderScreen(); }),
      slider(t('settings.musicVolume'), 'musicVolume', 'vol-music', (v) => A('setMusicVolume', v)),
      slider(t('settings.sfxVolume'), 'sfxVolume', 'vol-sfx', (v) => A('setSfxVolume', v), 'coin'),
    ];
    return modal(state, t('settings.title'), body,
      btn(t('settings.close'), () => { state.modal = null; state.focusAfter = returnFk; renderScreen(); }, { variant: 'green', fk: 'settings-done' }));
  }

  function howToModal(state, returnFk) {
    const keys = (...k) => h('span', { class: 'keys' }, k.map((x) => h('kbd', null, x)));
    const line = (ic, text) => h('li', null, h('span', { class: 'howto-ic' }, ic), h('span', null, text));
    const list = h('ul', { class: 'howto' },
      line(keys('↑', '←', '↓', '→'), t('howto.move')),
      line(keys(getLang() === 'nl' ? 'spatie' : 'space'), t('howto.hit')),
      line(icon('coin', 'coin', 40), t('howto.pumpkins')),
      line(icon('monster', 'skeleton', 40), t('howto.door')),
      line(icon('monster', 'ghost', 40), t('howto.ghosts')),
      line(icon('pet', 'wolf', 40), t('howto.pets')),
      line(icon('club', 'iron', 40), t('howto.shop')),
      line(icon('heart', 'full', 40), t('howto.hearts')));
    return modal(state, t('howto.title'), list,
      btn(t('howto.close'), () => { state.modal = null; state.focusAfter = returnFk; renderScreen(); }, { variant: 'green', fk: 'howto-done' }));
  }

  function confirmModal(state, title, text, yesLabel, noLabel, onYes, returnFk) {
    return modal(state, title, h('p', { class: 'confirm-text' }, text), [
      btn(noLabel, () => { state.modal = null; state.focusAfter = returnFk; renderScreen(); }, { variant: 'purple', fk: 'confirm-no', autofocus: true }),
      btn(yesLabel, onYes, { variant: 'danger', fk: 'confirm-yes' }),
    ]);
  }

  // ---------------------------------------------------------------- titel
  function showTitle({ profile, hasSave, onNewGame, onContinue, onSettingsChange } = {}) {
    profile = profile || {};
    if (profile.lang && profile.lang !== getLang()) setLang(profile.lang);
    hudHasData = false;
    const state = { modal: null };
    const canContinue = !!(hasSave && profile.hasProgress);
    openScreen('title', state, () => {
      const logoWord = 'Pompoenlab';
      const logo = h('h1', { class: 'logo', 'aria-label': logoWord },
        [...logoWord].map((ch, i) => h('span', { class: 'logo-l', 'data-l': ch, style: { '--i': i } }, ch)));
      const menu = h('div', { class: 'menu' },
        canContinue ? btn([h('span', null, t('title.continue')), h('small', null, t('title.continueLevel', { level: profile.level || 1 }))],
          () => finish(onContinue), { variant: 'orange', fk: 'continue', cls: 'btn-big btn-stack', autofocus: true }) : null,
        btn(t('title.newGame'), () => {
          if (canContinue) { state.modal = 'confirm'; renderScreen(); } else finish(onNewGame);
        }, { variant: canContinue ? 'green' : 'orange', fk: 'new', cls: canContinue ? '' : 'btn-big', autofocus: !canContinue }),
        h('div', { class: 'row' },
          btn(t('title.settings'), () => { state.modal = 'settings'; renderScreen(); }, { variant: 'purple', fk: 'settings' }),
          btn(t('title.howTo'), () => { state.modal = 'howto'; renderScreen(); }, { variant: 'purple', fk: 'howto' })));
      const frag = h('div', { class: 'title-wrap' },
        h('div', { class: 'title-deco', 'aria-hidden': 'true' },
          cssPumpkin('deco d1'), cssPumpkin('deco d2'), h('div', { class: 'fog' }), h('div', { class: 'twinkles' })),
        h('div', { class: 'title-main' },
          h('div', { class: 'logo-box' }, cssPumpkin('hero'), logo, h('p', { class: 'subtitle' }, t('game.subtitle'))),
          menu));
      if (state.modal === 'settings') frag.append(settingsModal(state, profile, onSettingsChange, 'settings'));
      if (state.modal === 'howto') frag.append(howToModal(state, 'howto'));
      if (state.modal === 'confirm') {
        frag.append(confirmModal(state, t('title.confirmNew'), t('title.confirmNewText'), t('title.confirmYes'), t('title.confirmNo'),
          () => finish(onNewGame), 'new'));
      }
      return frag;
    }, (e) => {
      if (e.key === 'Escape' && state.modal) {
        const back = { settings: 'settings', howto: 'howto', confirm: 'new' }[state.modal];
        state.modal = null; state.focusAfter = back; renderScreen(); return true;
      }
      return false;
    });
  }

  // ---------------------------------------------------------------- dieren kiezen
  function showPetSelect({ profile, preselected, max, level, room, onConfirm } = {}) {
    profile = profile || {};
    max = max || MAX_PETS_IN_ROOM;
    const owned = PET_IDS.filter((id) => (profile.ownedPets || []).includes(id));
    const sel = [];
    for (const id of preselected || []) if (owned.includes(id) && !sel.includes(id) && sel.length < max) sel.push(id);
    const state = { sel, pop: null, nope: null };
    openScreen('pets', state, () => {
      const cards = owned.map((id) => {
        const on = state.sel.includes(id);
        const lvl = (profile.petLevels && profile.petLevels[id]) || 1;
        const card = h('button', {
          type: 'button', class: `pet-card${on ? ' on' : ''}${state.pop === id ? ' pop' : ''}${state.nope === id ? ' nope' : ''}`,
          'aria-pressed': String(on), 'data-fk': 'pet-' + id,
        },
        h('span', { class: 'check', 'aria-hidden': 'true' }, '✓'),
        icon('pet', id, 72, 'pet-ic', true),
        h('span', { class: 'pet-name' }, t(`pet.${id}.name`)),
        stars(lvl),
        h('span', { class: 'pet-desc' }, t(`pet.${id}.desc`)));
        card.addEventListener('click', () => {
          unlock();
          const i = state.sel.indexOf(id);
          state.pop = null; state.nope = null;
          if (i >= 0) { state.sel.splice(i, 1); sfx('click'); }
          else if (state.sel.length < max) { state.sel.push(id); state.pop = id; sfx('click'); }
          else { state.nope = id; sfx('ghostImmune'); }
          renderScreen();
          state.pop = null; state.nope = null;
        });
        return card;
      });
      const full = state.sel.length >= max;
      return panel('pets-panel anim-in',
        h('div', { class: 'panel-head' },
          h('h2', { class: 'panel-title' }, t('pets.title')),
          h('p', { class: 'panel-sub' }, t('pets.subtitle', { level: level || 1, room: roomNum(room), max })),
          // Geesten bestaan vanaf level 2; zonder wolf zijn ze niet te raken.
          (level || 1) >= 2 && owned.includes('wolf') && !state.sel.includes('wolf')
            ? h('p', { class: 'note wolf-hint' }, '👻 ', t('pets.wolfHint')) : null),
        h('div', { class: 'pet-grid' }, cards),
        h('div', { class: 'panel-foot' },
          h('div', { class: `counter${full ? ' full' : ''}${state.nope ? ' shake' : ''}` },
            h('span', { class: 'counter-dots' }, Array.from({ length: max }, (_, i) => h('i', { class: i < state.sel.length ? 'on' : '' }))),
            t('pets.count', { n: state.sel.length, max })),
          btn(state.sel.length ? t('pets.start') : t('pets.none') + ' – ' + t('pets.start'),
            () => finish(onConfirm, state.sel.slice()), { variant: 'green', fk: 'start', cls: 'btn-big', autofocus: state.sel.length > 0 })));
    });
  }

  // run.room is 0..2; we tonen 1..3
  function roomNum(room) {
    const n = Number(room) || 0;
    return Math.min(LEVELS.roomsPerLevel, n + 1);
  }

  // ---------------------------------------------------------------- winkel
  function showShop({ profile, run, onClose } = {}) {
    profile = profile || {};
    const state = { bought: null };
    openScreen('shop', state, () => {
      const levelCoins = run ? run.levelCoins || 0 : 0;
      const total = (profile.bankCoins || 0) + levelCoins;
      const items = getShopItems(profile, run || null);
      const cards = items.map((it) => shopCard(it, profile, run, state));
      const bought = state.bought;
      state.bought = null;
      return panel('shop-panel anim-in',
        h('div', { class: 'panel-head shop-head' },
          h('h2', { class: 'panel-title' }, t('shop.title')),
          h('div', { class: `wallet${bought ? ' bump' : ''}` },
            icon('coin', 'coin', 40),
            h('div', { class: 'wallet-txt' },
              h('span', { class: 'wallet-label' }, t('shop.coins')),
              h('b', { class: 'wallet-n' }, total)))),
        levelCoins > 0 ? h('p', { class: 'note' }, '⚠ ', t('shop.levelNote', { n: levelCoins })) : null,
        items.length ? h('div', { class: 'shop-grid' }, cards) : h('p', { class: 'note' }, t('shop.empty')),
        h('div', { class: 'panel-foot end' },
          btn(t('shop.continue'), () => finish(onClose), { variant: 'green', fk: 'continue', cls: 'btn-big' })));
    });
  }

  function shopCard(it, profile, run, state) {
    let ic, name, desc, extra = null;
    if (it.kind === 'club') {
      const c = CLUBS.find((x) => x.id === it.ref) || CLUBS[0];
      ic = icon('club', it.ref, 64, null, true);
      name = t('club.' + it.ref);
      desc = t('shop.clubDesc', { hits: Math.ceil(PUMPKIN.hp / c.damage) });
    } else if (it.kind === 'petUpgrade') {
      const lvl = it.level || 1;
      ic = icon('pet', it.ref, 64, null, true);
      name = it.owned ? t(`pet.${it.ref}.name`) : t('shop.petUpgrade', { name: t(`pet.${it.ref}.name`), level: lvl + 1 });
      desc = null;
      extra = h('span', { class: 'upgrade-stars' }, stars(lvl), it.owned ? null : h('span', { class: 'arrow' }, '→'), it.owned ? null : stars(lvl + 1));
    } else {
      ic = icon('heart', 'full', 64, null, true);
      name = t('shop.heart');
      desc = t('shop.heartDesc');
      if (run) extra = h('span', { class: 'heart-count' }, `${run.hearts}/${PLAYER.maxHearts}`);
    }
    const isBought = state.bought === it.id;
    let label, disabled = !it.available;
    if (it.owned) label = it.kind === 'club' ? t('shop.owned') : t('shop.maxed');
    else if (it.full) label = t('shop.full');
    else if (!it.available) label = t('shop.tooExpensive');
    else label = t('shop.buy');
    const b = btn(label, () => {
      unlock();
      if (buy(it.id, profile, run || null)) {
        sfx('buy');
        state.bought = it.id;
        syncHudFrom(profile, run);
        renderScreen();
      }
    }, { variant: it.owned ? 'ghost' : 'green', fk: 'buy-' + it.id, disabled, sound: null, cls: 'buy-btn' });
    return h('div', { class: `shop-card${it.owned ? ' owned' : ''}${disabled && !it.owned ? ' locked' : ''}${isBought ? ' bought' : ''}` },
      h('div', { class: 'shop-ic' }, ic, isBought ? h('span', { class: 'bought-pop' }, t('shop.bought')) : null),
      h('div', { class: 'shop-info' },
        h('span', { class: 'shop-name' }, name),
        extra,
        desc ? h('span', { class: 'shop-desc' }, desc) : null),
      h('div', { class: 'shop-buy' },
        it.owned ? h('span', { class: 'price owned-tag' }, '✓') : h('span', { class: 'price' }, icon('coin', 'coin', 24), it.price),
        b));
  }

  // ---------------------------------------------------------------- level klaar
  function showLevelComplete({ level, coinsEarned, newPet, bonusCoins, onNext } = {}) {
    const state = {};
    openScreen('complete', state, () => {
      let reveal;
      if (newPet) {
        reveal = h('div', { class: 'reveal' },
          h('div', { class: 'reveal-stage' },
            h('div', { class: 'rays', 'aria-hidden': 'true' }),
            h('div', { class: 'reveal-glow', 'aria-hidden': 'true' }),
            h('div', { class: 'reveal-icon anim-in' }, icon('pet', newPet, 180)),
            h('div', { class: 'sparkles', 'aria-hidden': 'true' }, Array.from({ length: 6 }, (_, i) => h('i', { style: { '--i': i } }, '✦')))),
          h('h3', { class: 'reveal-name anim-in' }, t('level.newPet', { name: t(`pet.${newPet}.name`) })),
          h('p', { class: 'reveal-desc anim-in' }, t(`pet.${newPet}.desc`)));
      } else if (bonusCoins) {
        reveal = h('div', { class: 'reveal' },
          h('p', { class: 'reveal-desc' }, t('level.allPets')),
          h('div', { class: 'reveal-stage small' },
            h('div', { class: 'rays', 'aria-hidden': 'true' }),
            h('div', { class: 'reveal-icon anim-in' }, icon('coin', 'coin', 120))),
          h('h3', { class: 'reveal-name anim-in' }, t('level.bonusCoins', { n: bonusCoins })));
      }
      return h('div', { class: 'celebrate' },
        confetti(),
        panel('complete-panel anim-in',
          h('h2', { class: 'big-title bounce' }, t('level.complete', { level: level || 1 })),
          coinsEarned != null ? h('div', { class: 'chip coin-chip' }, icon('coin', 'coin', 28), t('level.coinsEarned', { n: coinsEarned })) : null,
          reveal,
          h('div', { class: 'panel-foot center' },
            btn(t('level.next'), () => finish(onNext), { variant: 'green', fk: 'next', cls: 'btn-big late-in', autofocus: true }))));
    });
    if (newPet) later(() => sfx('newPet'), 650);
  }

  // ---------------------------------------------------------------- game over
  function showGameOver({ level, coinsLost, onRetry, onQuit } = {}) {
    openScreen('gameover', {}, () => panel('gameover-panel anim-in',
      cssPumpkin('sad'),
      h('h2', { class: 'big-title danger' }, t('gameover.title')),
      h('p', { class: 'lead' }, t('gameover.text', { level: level || 1 })),
      coinsLost > 0 ? h('div', { class: 'chip lost-chip' }, icon('coin', 'coin', 26), '−' + coinsLost) : null,
      h('p', { class: 'note' }, coinsLost > 0 ? t('gameover.lost', { n: coinsLost }) + ' ' : '', t('gameover.kept')),
      h('div', { class: 'panel-foot center' },
        btn(t('gameover.quit'), () => finish(onQuit), { variant: 'purple', fk: 'quit' }),
        btn(t('gameover.retry'), () => finish(onRetry), { variant: 'orange', fk: 'retry', cls: 'btn-big', autofocus: true }))));
  }

  // ---------------------------------------------------------------- overwinning
  function showVictory({ onContinue, onQuit } = {}) {
    openScreen('victory', {}, () => h('div', { class: 'celebrate' },
      confetti(60),
      h('div', { class: 'fireworks', 'aria-hidden': 'true' }, Array.from({ length: 5 }, (_, i) => h('i', { style: { '--i': i } }))),
      panel('victory-panel anim-in',
        h('div', { class: 'crown-pumpkin' }, h('div', { class: 'crown', 'aria-hidden': 'true' }), cssPumpkin('happy')),
        h('h2', { class: 'big-title gold bounce' }, t('victory.title')),
        h('p', { class: 'lead' }, t('victory.text')),
        h('div', { class: 'panel-foot center' },
          btn(t('victory.quit'), () => finish(onQuit), { variant: 'purple', fk: 'quit' }),
          btn(t('victory.continue'), () => finish(onContinue), { variant: 'orange', fk: 'continue', cls: 'btn-big', autofocus: true })))));
  }

  // ---------------------------------------------------------------- pauze
  function showPause({ profile, onResume, onQuit, onSettingsChange } = {}) {
    profile = profile || {};
    const state = { modal: null };
    openScreen('pause', state, () => {
      const frag = h('div', { class: 'pause-wrap' },
        panel('pause-panel anim-in',
          h('h2', { class: 'big-title' }, t('pause.title')),
          h('div', { class: 'menu' },
            btn(t('pause.resume'), () => finish(onResume), { variant: 'green', fk: 'resume', cls: 'btn-big', autofocus: true }),
            btn(t('pause.settings'), () => { state.modal = 'settings'; renderScreen(); }, { variant: 'purple', fk: 'settings' }),
            btn(t('pause.quit'), () => { state.modal = 'confirm'; renderScreen(); }, { variant: 'danger', fk: 'quit' }))));
      if (state.modal === 'settings') frag.append(settingsModal(state, profile, onSettingsChange, 'settings'));
      if (state.modal === 'confirm') {
        frag.append(confirmModal(state, t('pause.quit'), t('pause.confirmQuit'), t('pause.confirmYes'), t('pause.confirmNo'),
          () => finish(onQuit), 'quit'));
      }
      return frag;
    }, (e) => {
      if (e.key === 'Escape' || e.code === 'KeyP') {
        if (state.modal) { const back = state.modal; state.modal = null; state.focusAfter = back === 'confirm' ? 'quit' : 'settings'; renderScreen(); }
        else finish(onResume);
        return true;
      }
      return false;
    });
  }

  // ---------------------------------------------------------------- toetsenbord
  function spatialMove(dir) {
    if (!current) return;
    const scope = current.el.querySelector('.modal') || current.el;
    const items = [...scope.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const act = document.activeElement;
    if (!act || !items.includes(act)) { items[0].focus(); return; }
    const r0 = act.getBoundingClientRect();
    const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    let best = null, bestScore = Infinity;
    for (const el of items) {
      if (el === act) continue;
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const dx = x - cx, dy = y - cy;
      let main, side;
      if (dir === 'left') { main = -dx; side = Math.abs(dy); }
      else if (dir === 'right') { main = dx; side = Math.abs(dy); }
      else if (dir === 'up') { main = -dy; side = Math.abs(dx); }
      else { main = dy; side = Math.abs(dx); }
      if (main <= 4) continue;
      const score = main + side * 2.5;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) { best.focus(); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }

  window.addEventListener('keydown', (e) => {
    if (!current) return;
    unlock();
    // Toetsen horen bij het scherm; het spel krijgt ze niet.
    e.stopPropagation();
    if (current.onKey && current.onKey(e)) { e.preventDefault(); return; }
    const dirs = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    const dir = dirs[e.key];
    if (dir) {
      const act = document.activeElement;
      if (act && act.type === 'range' && (dir === 'left' || dir === 'right')) return;
      e.preventDefault();
      spatialMove(dir);
    } else if (e.key === 'Tab') {
      // focus binnen het scherm houden
      const scope = current.el.querySelector('.modal') || current.el;
      const items = [...scope.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const i = items.indexOf(document.activeElement);
      const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i < 0 || i === items.length - 1 ? 0 : i + 1);
      e.preventDefault();
      items[next].focus();
    }
  }, true);

  // ---------------------------------------------------------------- HUD
  let hudHasData = false;
  let hudForced = null; // null = automatisch, true/false = via showHUD
  const hudPrev = {};
  let lastHud = null;

  const hudHearts = h('div', { class: 'hud-hearts' });
  const hudShields = h('div', { class: 'hud-shields hidden' });
  const hudLevel = h('div', { class: 'hud-level' });
  const hudCoinN = h('b', { class: 'hud-coin-n' }, '0');
  const hudLevelCoins = h('span', { class: 'hud-levelcoins hidden' });
  const hudCoins = h('div', { class: 'hud-coins hud-pill' }, icon('coin', 'coin', 32), h('span', { class: 'hud-coin-txt' }, hudCoinN, hudLevelCoins));
  const hudClub = h('div', { class: 'hud-club hud-pill' });
  const hudPets = h('div', { class: 'hud-pets hud-pill' });
  const pauseBtn = h('button', { type: 'button', class: 'hud-pause', 'aria-label': t('hud.pause'), 'data-fk': 'pause' }, h('span', { class: 'pause-bars' }));
  pauseBtn.addEventListener('click', () => { unlock(); sfx('click'); callInput('triggerPause'); pauseBtn.blur(); });
  hudEl.append(
    h('div', { class: 'hud-left' }, h('div', { class: 'hud-pill hud-life' }, hudHearts, hudShields)),
    h('div', { class: 'hud-mid' }, hudLevel),
    h('div', { class: 'hud-right' }, hudCoins, hudClub, hudPets, pauseBtn));

  function updateHUD(d = {}) {
    lastHud = { ...lastHud, ...d };
    d = lastHud;
    hudHasData = true;
    const maxHearts = d.maxHearts || PLAYER.maxHearts;
    const hearts = Math.max(0, d.hearts | 0);
    if (hudPrev.hearts !== hearts || hudPrev.maxHearts !== maxHearts) {
      const lost = hudPrev.hearts != null && hearts < hudPrev.hearts;
      const gained = hudPrev.hearts != null && hearts > hudPrev.hearts;
      hudHearts.replaceChildren(...Array.from({ length: Math.max(maxHearts, hearts) }, (_, i) => {
        const full = i < hearts;
        const cls = `hud-heart ${full ? 'full' : 'empty'}${lost && i >= hearts && i < hudPrev.hearts ? ' lost' : ''}${gained && full && i >= hudPrev.hearts ? ' gained' : ''}`;
        return icon('heart', 'full', 32, cls);
      }));
      hudPrev.hearts = hearts; hudPrev.maxHearts = maxHearts;
    }
    const shields = d.shields | 0;
    if (hudPrev.shields !== shields) {
      hudShields.classList.toggle('hidden', shields <= 0);
      hudShields.replaceChildren(icon('shield', 'shield', 28), h('b', null, '×' + shields));
      if (hudPrev.shields != null && shields < hudPrev.shields) bump(hudShields);
      hudPrev.shields = shields;
    }
    const coins = d.coins | 0, levelCoins = d.levelCoins | 0;
    if (hudPrev.coins !== coins) {
      hudCoinN.textContent = coins;
      if (hudPrev.coins != null && coins > hudPrev.coins) bump(hudCoins);
      hudPrev.coins = coins;
    }
    if (hudPrev.levelCoins !== levelCoins || hudPrev.lang !== getLang()) {
      hudLevelCoins.textContent = t('hud.levelCoins', { n: levelCoins });
      hudLevelCoins.classList.toggle('hidden', levelCoins <= 0);
      hudPrev.levelCoins = levelCoins;
    }
    const lvlText = t('hud.level', { level: d.level || 1, room: roomNum(d.room), rooms: d.roomsPerLevel || LEVELS.roomsPerLevel });
    if (hudPrev.lvlText !== lvlText) { hudLevel.textContent = lvlText; hudPrev.lvlText = lvlText; }
    const tier = Math.max(0, Math.min(CLUBS.length - 1, d.clubTier | 0));
    const boosted = !!d.boosted;
    if (hudPrev.tier !== tier || hudPrev.boosted !== boosted) {
      hudClub.replaceChildren(...[icon('club', CLUBS[tier].id, 32), boosted ? h('span', { class: 'sparkle', 'aria-hidden': 'true' }, '✦') : null].filter(Boolean));
      hudClub.classList.toggle('boosted', boosted);
      hudClub.title = t('club.' + CLUBS[tier].id);
      if (hudPrev.tier != null && tier > hudPrev.tier) bump(hudClub);
      hudPrev.tier = tier; hudPrev.boosted = boosted;
    }
    const pets = (d.pets || []).map((p) => (typeof p === 'string' ? { id: p, level: 1 } : p)).filter((p) => p && p.id);
    const petSig = pets.map((p) => p.id + ':' + (p.level || 1)).join(',');
    if (hudPrev.petSig !== petSig) {
      hudPets.replaceChildren(...pets.map((p) => h('span', { class: 'hud-pet', title: t(`pet.${p.id}.name`) }, icon('pet', p.id, 32))));
      hudPets.classList.toggle('hidden', pets.length === 0);
      hudPrev.petSig = petSig;
    }
    hudPrev.lang = getLang();
    refreshVisibility();
  }

  function bump(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  // Na een aankoop in de winkel de HUD bijwerken (hartjes/munten/knuppel).
  function syncHudFrom(profile, run) {
    if (!lastHud) return;
    const patch = { coins: (profile.bankCoins || 0) + (run ? run.levelCoins || 0 : 0) };
    if (run) {
      patch.levelCoins = run.levelCoins || 0;
      patch.hearts = run.hearts;
      patch.clubTier = Math.min(CLUBS.length - 1, (profile.clubTier || 0) + (run.clubBoost || 0));
      if (Array.isArray(run.pets)) patch.pets = run.pets;
    }
    updateHUD(patch);
  }

  function showHUD(visible) {
    hudForced = visible == null ? null : !!visible;
    refreshVisibility();
  }

  // ---------------------------------------------------------------- touch
  let touchWanted = false;
  let touchAuto = false;
  const joyKnob = h('div', { class: 'joy-knob' });
  const joy = h('div', { class: 'joy', 'aria-hidden': 'true' }, h('div', { class: 'joy-ring' }), joyKnob);
  const hitBtn = h('button', { type: 'button', class: 'hit-btn', tabindex: '-1', 'aria-label': t('hud.attack') },
    h('span', { class: 'hit-ic' }), h('span', { class: 'hit-label' }, t('hud.attack')));
  touchEl.append(joy, hitBtn);

  let joyId = null, joyCx = 0, joyCy = 0, joyMax = 1;
  const DEAD = 0.18;
  function joyMove(e) {
    let dx = e.clientX - joyCx, dy = e.clientY - joyCy;
    const dist = Math.hypot(dx, dy);
    if (dist > joyMax) { dx = dx / dist * joyMax; dy = dy / dist * joyMax; }
    joyKnob.style.transform = `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px))`;
    const mag = Math.min(1, dist / joyMax);
    if (mag < DEAD || dist === 0) { callInput('setTouchMove', 0, 0); return; }
    // richting genormaliseerd, lengte loopt op van 0 (dode zone) tot 1 (rand)
    const len = (mag - DEAD) / (1 - DEAD);
    const l = Math.hypot(dx, dy);
    callInput('setTouchMove', dx / l * len, dy / l * len);
  }
  function joyRelease() {
    joyId = null;
    joy.classList.remove('active');
    joyKnob.style.transform = '';
    callInput('setTouchMove', 0, 0);
  }
  joy.addEventListener('pointerdown', (e) => {
    if (joyId !== null) return;
    e.preventDefault();
    unlock();
    joyId = e.pointerId;
    try { joy.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    const r = joy.getBoundingClientRect();
    joyCx = r.left + r.width / 2; joyCy = r.top + r.height / 2;
    joyMax = r.width * 0.36;
    joy.classList.add('active');
    joyMove(e);
  });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) { e.preventDefault(); joyMove(e); } });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    joy.addEventListener(ev, (e) => { if (e.pointerId === joyId) joyRelease(); });
  }

  let hitId = null, hitTimer = null;
  hitBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (hitId !== null) return;
    unlock();
    hitId = e.pointerId;
    try { hitBtn.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    hitBtn.classList.add('pressed');
    callInput('triggerAttack');
    hitTimer = setInterval(() => callInput('triggerAttack'), 350);
  });
  function hitRelease() {
    hitId = null;
    clearInterval(hitTimer); hitTimer = null;
    hitBtn.classList.remove('pressed');
  }
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    hitBtn.addEventListener(ev, (e) => { if (e.pointerId === hitId) hitRelease(); });
  }
  hitBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  joy.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && !touchAuto) { touchAuto = true; refreshVisibility(); }
  }, true);

  function setTouchControls(visible) {
    touchWanted = !!visible;
    refreshVisibility();
  }

  // ---------------------------------------------------------------- zichtbaarheid
  function refreshVisibility() {
    const onTitle = current && current.name === 'title';
    const hudOn = hudForced === null ? hudHasData && !onTitle : hudForced;
    hudEl.classList.toggle('hidden', !hudOn);
    const touchOn = (touchWanted || touchAuto) && hudOn && !current;
    if (!touchOn) {
      if (joyId !== null) joyRelease();
      if (hitId !== null) hitRelease();
    }
    touchEl.classList.toggle('hidden', !touchOn);
    root.classList.toggle('overlay-open', !!current);
  }

  // ---------------------------------------------------------------- toasts
  const TOAST_MS = 2300;
  function toast(text) {
    if (text == null || text === '') return;
    text = String(text);
    const live = [...toastEl.children].filter((c) => !c.classList.contains('out'));
    const same = live.find((c) => c.dataset.text === text);
    if (same) {
      clearTimeout(same._timer);
      same._timer = setTimeout(() => fadeToast(same), TOAST_MS);
      bump(same);
      return;
    }
    while (live.length >= 3) fadeToast(live.pop());
    const el = h('div', { class: 'toast', 'data-text': text }, text);
    toastEl.prepend(el);
    el._timer = setTimeout(() => fadeToast(el), TOAST_MS);
  }
  function fadeToast(el) {
    if (!el || el.classList.contains('out')) return;
    clearTimeout(el._timer);
    el.classList.add('out');
    setTimeout(() => el.remove(), 400);
  }

  // ---------------------------------------------------------------- taal
  onLangChange(() => {
    if (current) renderScreen();
    pauseBtn.setAttribute('aria-label', t('hud.pause'));
    hitBtn.setAttribute('aria-label', t('hud.attack'));
    hitBtn.querySelector('.hit-label').textContent = t('hud.attack');
    if (lastHud) { hudPrev.lvlText = null; hudPrev.lang = null; hudPrev.tier = null; hudPrev.petSig = null; updateHUD({}); }
  });

  refreshVisibility();

  return {
    showTitle, showPetSelect, showShop, showLevelComplete, showGameOver, showVictory, showPause,
    hideAll, toast, updateHUD, setTouchControls,
    // extra's
    showHUD, isOverlayOpen,
  };
}
