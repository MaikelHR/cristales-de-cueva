// ============================================================
//  SELECTOR DE IDIOMA (ES / EN)
// ------------------------------------------------------------
//  Un par de botones fijos (arriba a la izquierda) para cambiar
//  entre español e inglés. En escritorio están siempre visibles;
//  en móvil (táctil) solo aparecen en los menús o en pausa —nunca
//  durante la partida, para no tapar el juego— y el CSS los oculta
//  en retrato (ahí manda el aviso de rotar).
// ============================================================

import { getLang, setLang, onLangChange, type Lang } from './i18n';

let container: HTMLDivElement | null = null;
let esBtn: HTMLButtonElement | null = null;
let enBtn: HTMLButtonElement | null = null;

/** Construye el selector y lo agrega al DOM. Idempotente. */
export function initLangSwitch(): void {
  if (container) return;
  const wrap = document.createElement('div');
  wrap.className = 'lang-switch';
  wrap.dataset.show = '0'; // en táctil arranca oculto; syncLangSwitch decide.
  esBtn = makeButton('ES', 'es');
  enBtn = makeButton('EN', 'en');
  wrap.append(esBtn, enBtn);
  document.body.appendChild(wrap);
  container = wrap;

  paint();
  onLangChange(paint); // reflejar el botón activo cuando cambie el idioma.
}

/**
 * En táctil, muestra el selector solo cuando NO se está jugando (menús)
 * o en pausa. En escritorio el CSS lo deja visible siempre. Barato: solo
 * toca el DOM cuando cambia el estado a mostrar.
 */
export function syncLangSwitch(ui: { state: string; paused: boolean }): void {
  if (!container) return;
  const show = ui.state !== 'playing' || ui.paused;
  const val = show ? '1' : '0';
  if (container.dataset.show !== val) container.dataset.show = val;
}

function makeButton(text: string, lang: Lang): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'lang-btn';
  b.textContent = text;
  b.setAttribute('aria-label', lang === 'es' ? 'Español' : 'English');
  // pointerdown además de click: respuesta inmediata en táctil.
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    setLang(lang);
  });
  b.addEventListener('click', () => setLang(lang));
  return b;
}

/** Resalta el botón del idioma activo. */
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
