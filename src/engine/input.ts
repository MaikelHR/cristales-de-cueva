// ============================================================
//  ENTRADA (input) del teclado
// ------------------------------------------------------------
//  Traducimos teclas físicas a "acciones" (left, right, jump...).
//  Así el resto del juego nunca pregunta por una tecla concreta,
//  sino por la intención. Cambiar los controles = cambiar este mapa.
// ============================================================

type Action = 'left' | 'right' | 'jump' | 'restart';

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
  r: 'restart',
  R: 'restart',
};

const down = new Set<Action>();
const pressedThisStep = new Set<Action>();

export function initInput(): void {
  window.addEventListener('keydown', (e) => {
    const action = KEY_TO_ACTION[e.key];
    if (!action) return;
    e.preventDefault();
    if (!down.has(action)) pressedThisStep.add(action);
    down.add(action);
  });

  window.addEventListener('keyup', (e) => {
    const action = KEY_TO_ACTION[e.key];
    if (action) down.delete(action);
  });
}

/** ¿La acción está siendo mantenida en este instante? */
export function isDown(action: Action): boolean {
  return down.has(action);
}

/** ¿La acción se acaba de presionar en este paso de lógica? */
export function justPressed(action: Action): boolean {
  return pressedThisStep.has(action);
}

/** Llamar al final de cada paso de lógica para limpiar los "recién presionados". */
export function endStep(): void {
  pressedThisStep.clear();
}
