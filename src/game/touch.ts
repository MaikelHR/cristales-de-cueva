// ============================================================
//  CONTROLES TÁCTILES (touch): mando en pantalla para móvil
// ------------------------------------------------------------
//  En pantallas táctiles no hay teclado ni gamepad, así que
//  dibujamos un mando por encima del canvas: cruceta a la
//  izquierda, salto/dash a la derecha y un botón de pausa. Cada
//  botón traduce el toque a las mismas ACCIONES que el resto del
//  juego (left, jump...), reutilizando el input existente; el
//  juego jamás se entera de que la orden vino de un dedo.
//
//  Dos familias de botón:
//    - HOLD (mover/saltar/dash): valen mientras se mantengan.
//    - TAP  (pausa/continuar/reiniciar): valen un instante.
//  Usamos Pointer Events con captura por dedo (setPointerCapture)
//  para permitir multitáctil real: sostener "izquierda" y tocar
//  "saltar" a la vez sin que un dedo le robe el evento al otro.
//
//  En escritorio este módulo NO hace absolutamente nada: si el
//  puntero no es "coarse" (táctil), salimos antes de tocar el DOM.
// ============================================================

import { touchButton, releaseAll, setDevice, setTouchMode } from '../engine/input';

/** Estado de interfaz que nos pasa el juego para decidir qué mostrar. */
type TouchUI = { state: 'title' | 'playing' | 'won' | 'gameover'; paused: boolean };

/** Modo de visibilidad del mando; el CSS decide qué se ve en cada uno. */
type TouchMode = 'play' | 'paused' | 'menu';

// Guardamos el último estado conocido para dos cosas: para no tocar
// el DOM si no cambió (data-mode) y para saber, cuando se toca el
// canvas, si estamos en un menú (tap = confirmar) o jugando (se ignora).
let currentUi: TouchUI = { state: 'title', paused: false };
let container: HTMLDivElement | null = null;
let currentMode: TouchMode | null = null;
// Cada botón HOLD registra aquí un "soltador forzado" que limpia su
// estado (dedos apoyados + resaltado). Lo usa el pánico (perder foco)
// para no dejar nada trabado sin depender de un evento del navegador.
const holdResetters: Array<() => void> = [];

/** Acciones que el módulo táctil sabe emitir. */
type TouchAction = 'left' | 'right' | 'jump' | 'dash' | 'confirm' | 'pause' | 'restart' | 'map';

/**
 * Construye el mando táctil y cablea sus eventos. Es idempotente en
 * la práctica: si no es un dispositivo táctil, sale sin dejar rastro.
 */
export function initTouchControls(canvas: HTMLCanvasElement): void {
  // --- Detección de capacidad táctil ---
  // "pointer: coarse" = puntero impreciso (dedo). maxTouchPoints cubre
  // navegadores que no reportan bien la media query. En un móvil/tablet
  // esto ya es true al cargar, así que construimos el mando de una.
  const coarse =
    window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  if (coarse) {
    buildTouchControls(canvas);
    return;
  }

  // Si al cargar NO parece táctil (escritorio, o el navegador todavía no
  // emula touch), nos quedamos al acecho: en cuanto llegue un toque REAL
  // encendemos el mando en ese instante. Así también aparece al activar la
  // emulación táctil de las DevTools sin recargar, y en equipos híbridos
  // (portátil con pantalla táctil) el primer dedo lo revela.
  const onFirstTouch = (e: PointerEvent): void => {
    if (e.pointerType !== 'touch') return; // ratón/lápiz de precisión: seguimos en escritorio.
    window.removeEventListener('pointerdown', onFirstTouch, true);
    buildTouchControls(canvas);
  };
  window.addEventListener('pointerdown', onFirstTouch, true); // captura: antes que nadie.
}

/**
 * Construye el mando táctil y lo enciende. Sólo se llama cuando ya
 * decidimos que el dispositivo es táctil (al cargar o al primer toque).
 */
function buildTouchControls(canvas: HTMLCanvasElement): void {
  if (container) return; // ya construido: no dupliques el DOM ni los eventos.

  // Marcamos capacidad táctil (flag fijo) y arrancamos en modo táctil.
  setTouchMode(true);
  setDevice('touch');
  document.body.classList.add('touch');

  // --- Construcción del DOM (clases FIJAS: el CSS depende de ellas) ---
  const tc = document.createElement('div');
  tc.className = 'tc';
  tc.id = 'tc';
  tc.dataset.mode = 'menu';

  // Cada botón lleva su glifo/rótulo VISIBLE (lo que se ve) y un
  // aria-label (lo que anuncia un lector de pantalla).
  // Botón de pausa (arriba-derecha).
  const btnPause = makeButton('tc-btn tc-pause', 'Pausa', '‖');
  // Botón de mapa (arriba-izquierda).
  const btnMap = makeButton('tc-btn tc-map', 'Mapa', 'MAPA');
  // Cruceta de movimiento (abajo-izquierda).
  const pad = document.createElement('div');
  pad.className = 'tc-pad';
  const btnLeft = makeButton('tc-btn tc-left', 'Izquierda', '◀');
  const btnRight = makeButton('tc-btn tc-right', 'Derecha', '▶');
  pad.append(btnLeft, btnRight);
  // Acciones (abajo-derecha).
  const actions = document.createElement('div');
  actions.className = 'tc-actions';
  const btnDash = makeButton('tc-btn tc-dash', 'Dash', 'DASH');
  const btnJump = makeButton('tc-btn tc-jump', 'Saltar', 'SALTO');
  actions.append(btnDash, btnJump);
  // Menú de pausa (centro).
  const menu = document.createElement('div');
  menu.className = 'tc-menu';
  const btnResume = makeButton('tc-btn tc-mbtn tc-resume', 'Continuar', 'Continuar');
  const btnFs = makeButton('tc-btn tc-mbtn tc-fs', 'Pantalla completa', 'Pantalla completa');
  const btnRestart = makeButton('tc-btn tc-mbtn tc-restart', 'Reiniciar', 'Reiniciar');
  menu.append(btnResume, btnFs, btnRestart);

  tc.append(btnPause, btnMap, pad, actions, menu);
  document.body.appendChild(tc);
  container = tc;

  // --- Cableado de eventos ---
  // HOLD: valen mientras el dedo se mantenga apoyado.
  bindHold(btnLeft, 'left');
  bindHold(btnRight, 'right');
  bindHold(btnJump, 'jump');
  bindHold(btnDash, 'dash');

  // TAP: valen un instante (un flanco de "recién presionado").
  bindTap(btnPause, 'pause');
  bindTap(btnMap, 'map'); // abre/cierra el mapa completo
  bindTap(btnResume, 'pause'); // "Continuar" alterna la misma pausa.
  bindTap(btnRestart, 'restart');

  // Pantalla completa: sólo si el navegador la soporta para elementos.
  bindFullscreen(btnFs);

  // Tap sobre el canvas en modo menú -> confirmar (title/won/gameover).
  bindCanvasConfirm(canvas);

  // Evitar el menú contextual (mantener pulsado) sobre el mando.
  tc.addEventListener('contextmenu', (e) => e.preventDefault());

  // Red de seguridad: si perdemos el foco o la pestaña se oculta,
  // soltamos TODO lo mantenido para que no quede un botón "trabado".
  const panic = (): void => {
    releaseAll();
    for (const reset of holdResetters) reset(); // vacía los dedos por botón.
    clearActiveClasses();
  };
  window.addEventListener('blur', panic);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) panic();
  });
}

/**
 * Sincroniza qué parte del mando se ve según el estado del juego.
 * Sólo toca el DOM si el modo cambió (evita trabajo por frame).
 */
export function syncTouchUI(ui: TouchUI): void {
  currentUi = ui;
  const mode: TouchMode =
    ui.state === 'playing' ? (ui.paused ? 'paused' : 'play') : 'menu';
  if (mode === currentMode) return;
  currentMode = mode;
  if (container) container.dataset.mode = mode;
}

// ------------------------------------------------------------
//  Ayudantes internos
// ------------------------------------------------------------

/** Crea un botón accesible: `text` es el glifo/rótulo visible y `label`
 *  el nombre accesible que anuncian los lectores de pantalla. */
function makeButton(className: string, label: string, text: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.textContent = text;
  b.setAttribute('aria-label', label);
  return b;
}

/**
 * Botón HOLD (mover/saltar/dash): la acción vale mientras el dedo
 * siga apoyado. Capturamos el puntero para que, aunque el dedo se
 * salga del botón, sigamos recibiendo su "up" y no quede pegado.
 */
function bindHold(el: HTMLButtonElement, action: TouchAction): void {
  // Un mismo botón puede tener VARIOS dedos encima a la vez (captura por
  // puntero). Contamos los punteros activos y sólo soltamos la acción
  // cuando se levanta el ÚLTIMO: así, si un dedo se va, el otro la mantiene.
  const pointers = new Set<number>();
  const press = (e: PointerEvent): void => {
    e.preventDefault(); // corta zoom/scroll; NO cancela la activación de usuario.
    pointers.add(e.pointerId);
    touchButton(action, true);
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Algunos navegadores rechazan la captura; no es crítico.
    }
    el.classList.add('is-active');
  };
  const release = (e: PointerEvent): void => {
    pointers.delete(e.pointerId);
    if (pointers.size > 0) return; // aún queda al menos un dedo apoyado.
    touchButton(action, false);
    el.classList.remove('is-active');
  };
  el.addEventListener('pointerdown', press);
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release); // gesto del sistema, etc.
  el.addEventListener('lostpointercapture', release); // red de seguridad.
  // Soltador forzado (para el pánico): vacía los dedos y suelta la acción.
  holdResetters.push(() => {
    pointers.clear();
    touchButton(action, false);
    el.classList.remove('is-active');
  });
  // Nunca stopPropagation: dejamos que el evento siga su curso normal.
}

/**
 * Botón TAP (pausa/continuar/reiniciar): un toque = un flanco de
 * "recién presionado". Es un flanco PURO: presionamos y soltamos en el
 * mismo pointerdown, así la acción nunca queda en "down" esperando un
 * pointerup que puede perderse cuando el botón se auto-oculta al actuar
 * (p. ej. al pausar, tc-pause pasa a display:none antes de levantar el
 * dedo). El "recién presionado" queda marcado igual y dispara una vez.
 */
function bindTap(el: HTMLButtonElement, action: TouchAction): void {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    touchButton(action, true);
    touchButton(action, false);
  });
}

/**
 * Botón de pantalla completa. Feature-detect: si el navegador no
 * expone requestFullscreen sobre elementos (típico iPhone Safari),
 * escondemos el botón. Se activa al levantar el dedo (gesto real).
 */
function bindFullscreen(el: HTMLButtonElement): void {
  const root = document.documentElement;
  if (typeof root.requestFullscreen !== 'function') {
    el.style.display = 'none';
    return;
  }
  el.addEventListener('pointerup', (e) => {
    e.preventDefault();
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void root.requestFullscreen().catch(() => {});
    }
  });
}

/**
 * Tap sobre el canvas cuando NO estamos jugando (title/won/gameover):
 * cuenta como "confirmar". Escuchamos el "up" a nivel window para
 * soltar aunque el dedo se levante fuera del canvas.
 */
function bindCanvasConfirm(canvas: HTMLCanvasElement): void {
  canvas.addEventListener('pointerdown', (e) => {
    if (currentUi.state === 'playing') return; // jugando: el canvas no confirma.
    e.preventDefault();
    touchButton('confirm', true);
  });
  const release = (): void => {
    touchButton('confirm', false);
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
}

/** Quita el resaltado "is-active" de todos los botones del mando. */
function clearActiveClasses(): void {
  if (!container) return;
  for (const el of container.querySelectorAll('.is-active')) {
    el.classList.remove('is-active');
  }
}
