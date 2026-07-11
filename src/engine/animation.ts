// ============================================================
//  ANIMACIÓN: ciclos de frames por tiempo
// ------------------------------------------------------------
//  Un solo lugar para la aritmética de "¿qué frame toca ahora?".
//  frameAt(frames, fps, t) recorre la lista en bucle; `phase`
//  desfasa el ciclo (p. ej. por posición, para que dos cristales
//  vecinos no brillen sincronizados).
//  Si más adelante hacen falta clips con eventos por frame
//  ("en el frame 3 nace el hitbox"), este es el módulo a crecer.
// ============================================================

export function frameAt<T>(
  frames: readonly T[],
  fps: number,
  t: number,
  phase = 0,
): T {
  return frames[Math.floor(t * fps + phase) % frames.length];
}
