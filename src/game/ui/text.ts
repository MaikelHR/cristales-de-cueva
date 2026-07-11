// ============================================================
//  TEXTO — la letra del juego y formateos compartidos
// ------------------------------------------------------------
//  Un solo lugar para la tipografía del canvas: cambiar la fuente
//  del juego es cambiarla acá.
// ============================================================

/** La fuente del juego en un tamaño dado (px). */
export function font(sizePx: number): string {
  return `${sizePx}px "JetBrains Mono", ui-monospace, monospace`;
}

/** Formatea segundos como m:ss (p. ej. 83.4 -> "1:23"). */
export function formatTime(seconds: number): string {
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
