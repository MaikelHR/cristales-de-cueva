// ============================================================
//  ENEMY — la interfaz común de los enemigos
// ------------------------------------------------------------
//  Todo enemigo sabe avanzar en el tiempo, dibujarse y decir qué
//  caja ocupa. El juego los trata a todos por igual; sumar un tipo
//  (que vuela, que persigue, que dispara) = crear una clase que
//  implemente esto, sin tocar el orquestador.
// ============================================================

import type { Box } from '../../engine/canvas';

export interface Enemy {
  /** target = posición del jugador (para los que persiguen o apuntan). */
  update(dt: number, target: { x: number; y: number }): void;
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void;
  box(): Box;
  /** true cuando fue derrotado: el juego lo ignora y deja de dibujarlo. */
  dead: boolean;
  /** ¿se lo puede derrotar pisándolo desde arriba? */
  readonly stompable: boolean;
  /** colores del estallido al derrotarlo. */
  readonly gooColors: readonly string[];
  /** los jefes bloquean la puerta hasta ser derrotados. */
  readonly isBoss?: boolean;
  /** cajas peligrosas propias (p. ej. proyectiles) que dañan al jugador. */
  hazards?(): Box[];
}
