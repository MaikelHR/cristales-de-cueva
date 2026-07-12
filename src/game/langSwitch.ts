// ============================================================
//  LANGUAGE SELECTOR (ES / EN) — touch only
// ------------------------------------------------------------
//  A pair of fixed buttons (top left) to switch between Spanish
//  and English WITHOUT a keyboard: they only exist for touch
//  mode, and only in menus or on pause —never during the
//  run—. On desktop/gamepad the language lives inside the game
//  menus (title and pause), like a real game.
//  The CSS also hides them in portrait (there the rotate notice rules).
// ============================================================

import { isTouchMode } from '../engine/input';
import { getLang, setLang, onLangChange, type Lang } from './i18n';

let container: HTMLDivElement | null = null;
let esBtn: HTMLButtonElement | null = null;
let enBtn: HTMLButtonElement | null = null;

/** Builds the selector and adds it to the DOM. Idempotent. */
export function initLangSwitch(): void {
  if (container) return;
  const wrap = document.createElement('div');
  wrap.className = 'lang-switch';
  wrap.dataset.show = '0'; // on touch it starts hidden; syncLangSwitch decides.
  esBtn = makeButton('ES', 'es');
  enBtn = makeButton('EN', 'en');
  wrap.append(esBtn, enBtn);
  document.body.appendChild(wrap);
  container = wrap;

  paint();
  onLangChange(paint); // reflect the active button when the language changes.
}

/**
 * Shows the selector only in touch mode and only when NOT
 * playing (menus) or on pause. Never on desktop: there the language
 * is changed from the game menus. Cheap: only touches the DOM when
 * the show state changes.
 */
export function syncLangSwitch(ui: { state: string; paused: boolean }): void {
  if (!container) return;
  const show = isTouchMode() && (ui.state !== 'playing' || ui.paused);
  const val = show ? '1' : '0';
  if (container.dataset.show !== val) container.dataset.show = val;
}

function makeButton(text: string, lang: Lang): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'lang-btn';
  b.textContent = text;
  b.setAttribute('aria-label', lang === 'es' ? 'Español' : 'English');
  // pointerdown as well as click: immediate response on touch.
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    setLang(lang);
  });
  b.addEventListener('click', () => setLang(lang));
  return b;
}

/** Highlights the active language's button. */
function paint(): void {
  const l = getLang();
  for (const [btn, lang] of [
    [esBtn, 'es'],
    [enBtn, 'en'],
  ] as const) {
    if (!btn) continue;
    const on = l === lang;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', String(on));
  }
}
