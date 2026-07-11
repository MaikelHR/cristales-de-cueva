// ============================================================
//  ENTRADA (input): teclado + gamepad
// ------------------------------------------------------------
//  Traducimos entradas físicas a "acciones" (left, right, jump...).
//  Así el resto del juego nunca pregunta por una tecla o botón
//  concreto, sino por la intención. El teclado llega por eventos;
//  el gamepad se SONDEA cada frame (la API del navegador no avisa,
//  hay que preguntarle el estado). Ambos alimentan las mismas
//  acciones, así que el juego no distingue de dónde viene la orden.
//
//  Además recordamos el ÚLTIMO dispositivo usado para que la interfaz
//  muestre los controles correctos (teclas o botones) al instante.
// ============================================================

type Action = 'left' | 'right' | 'jump' | 'dash' | 'restart' | 'confirm' | 'pause';

/** Qué estuvo usando el jugador de último: define qué controles mostrar. */
export type InputDevice = 'keyboard' | 'gamepad' | 'touch';

const KEY_TO_ACTION: Record<string, Action> = {
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
  ArrowUp: 'jump',
  w: 'jump',
  W: 'jump',
  ' ': 'jump',
  Shift: 'dash',
  x: 'dash',
  X: 'dash',
  r: 'restart',
  R: 'restart',
  Enter: 'confirm',
  Escape: 'pause',
  p: 'pause',
  P: 'pause',
};

// Estado del TECLADO (por eventos).
const down = new Set<Action>();
const pressedThisStep = new Set<Action>();

// Estado del GAMEPAD (por sondeo). Lo mantenemos aparte y lo mezclamos
// en las consultas, porque el teclado se enciende/apaga con eventos y
// el gamepad se reconstruye entero en cada sondeo.
const gpDown = new Set<Action>();
const gpPressed = new Set<Action>();
let gpPrev = new Set<Action>();

let lastDevice: InputDevice = 'keyboard';

// Capacidad táctil FIJA del dispositivo (no cambia una vez detectada).
// El módulo táctil la enciende al arrancar si el aparato tiene pantalla
// táctil; el resto del juego la consulta para decidir el layout móvil.
let touchMode = false;

export function initInput(): void {
  window.addEventListener('keydown', (e) => {
    const action = KEY_TO_ACTION[e.key];
    if (!action) return;
    e.preventDefault();
    if (!down.has(action)) pressedThisStep.add(action);
    down.add(action);
    lastDevice = 'keyboard';
  });

  window.addEventListener('keyup', (e) => {
    const action = KEY_TO_ACTION[e.key];
    if (action) down.delete(action);
  });
}

// Mapeo de botones del gamepad (layout estándar, tipo Xbox):
//   0 = A   1 = B   2 = X   3 = Y   9 = Start
//   12/13/14/15 = d-pad arriba/abajo/izquierda/derecha
//   axes[0] = stick izquierdo horizontal
const STICK_DEADZONE = 0.4;

/** Sondea el primer gamepad conectado y traduce su estado a acciones.
 *  Llamar una vez por paso de lógica, antes de leer las acciones. */
export function pollGamepad(): void {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let pad: Gamepad | null = null;
  for (const p of pads) {
    if (p) {
      pad = p;
      break;
    }
  }

  gpPressed.clear();
  gpDown.clear();
  if (!pad) {
    gpPrev.clear();
    return;
  }

  const b = pad.buttons;
  const on = (i: number): boolean => !!b[i]?.pressed;
  const axX = pad.axes[0] ?? 0;

  const next = new Set<Action>();
  if (on(14) || axX < -STICK_DEADZONE) next.add('left');
  if (on(15) || axX > STICK_DEADZONE) next.add('right');
  if (on(0) || on(12)) next.add('jump'); // A o d-pad arriba
  if (on(2)) next.add('dash'); // X
  if (on(0) || on(9)) next.add('confirm'); // A o Start (para menús)
  if (on(9)) next.add('pause'); // Start
  if (on(3)) next.add('restart'); // Y

  for (const a of next) {
    gpDown.add(a);
    if (!gpPrev.has(a)) gpPressed.add(a); // flanco de subida = "recién presionado"
  }
  gpPrev = next;
  if (next.size > 0) lastDevice = 'gamepad';
}

/** ¿La acción está siendo mantenida en este instante? (teclado o gamepad) */
export function isDown(action: Action): boolean {
  return down.has(action) || gpDown.has(action);
}

/** ¿La acción se acaba de presionar en este paso de lógica? (teclado o gamepad) */
export function justPressed(action: Action): boolean {
  return pressedThisStep.has(action) || gpPressed.has(action);
}

/** El último dispositivo que usó el jugador (para mostrar los controles). */
export function inputDevice(): InputDevice {
  return lastDevice;
}

/** Llamar al final de cada paso de lógica para limpiar los "recién presionados". */
export function endStep(): void {
  pressedThisStep.clear();
}

// ------------------------------------------------------------
//  ENTRADA TÁCTIL (botones en pantalla)
// ------------------------------------------------------------
//  Los controles táctiles reutilizan EXACTAMENTE los mismos sets que
//  el teclado (down y pressedThisStep), así que el juego no distingue
//  el origen: un botón en pantalla "presiona" y "suelta" una acción
//  igual que una tecla. El módulo game/touch.ts llama estas funciones
//  desde los eventos de puntero.

/** Presiona (isDownNow=true) o suelta (isDownNow=false) una acción táctil.
 *  Al presionar por primera vez marca el flanco de subida (recién presionado)
 *  y la deja mantenida; al soltar solo la quita de las mantenidas. */
export function touchButton(action: Action, isDownNow: boolean): void {
  if (isDownNow) {
    if (!down.has(action)) pressedThisStep.add(action);
    down.add(action);
  } else {
    down.delete(action);
  }
  lastDevice = 'touch';
}

/** Suelta TODO lo que estuviera mantenido (al perder foco o cambiar de pestaña). */
export function releaseAll(): void {
  down.clear();
}

/** Fuerza el último dispositivo usado (para sincronizar qué controles mostrar). */
export function setDevice(d: InputDevice): void {
  lastDevice = d;
}

/** ¿El aparato tiene capacidad táctil? (flag fijo detectado al arrancar). */
export function isTouchMode(): boolean {
  return touchMode;
}

/** Enciende/apaga el flag de capacidad táctil (lo fija el módulo táctil). */
export function setTouchMode(v: boolean): void {
  touchMode = v;
}
