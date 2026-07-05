// ============================================================
//  ENEMY — la interfaz común de los enemigos
// ------------------------------------------------------------
//  Todo enemigo sabe hacer tres cosas: avanzar en el tiempo,
//  dibujarse y decir qué caja ocupa (para las colisiones).
//  El juego los trata a todos por igual a través de esta interfaz;
//  agregar un tipo nuevo (que vuela, que persigue) = crear una
//  clase más que la implemente, sin tocar el orquestador.
// ============================================================

import type { Box } from '../../engine/canvas';

export interface Enemy {
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void;
  box(): Box;
}
