// ============================================================
//  ACTOR — lo mínimo que es "una cosa que vive en una sala"
// ------------------------------------------------------------
//  Enemigos y objetos recogibles comparten esta forma: avanzar en
//  el tiempo, dibujarse, decir qué caja ocupan y en qué CAPA de
//  colisión están. La capa decide qué regla se le aplica al tocar
//  al jugador (dañar vs. recoger); sumar una capa nueva (p. ej.
//  'trigger' o 'playerAttack') es agregar su regla en systems/,
//  sin tocar a los actores existentes.
// ============================================================

import type { Box } from '../../engine/canvas';
import type { Player } from './Player';
import type { Particles } from '../effects/Particles';

export type ActorLayer = 'enemy' | 'pickup';

export interface Actor {
  readonly layer: ActorLayer;
  /** true cuando ya no está en juego (derrotado / recogido):
   *  el mundo lo ignora y deja de dibujarlo. */
  dead: boolean;
  /** target = posición del jugador (para los que persiguen o apuntan). */
  update(dt: number, target: { x: number; y: number }): void;
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void;
  box(): Box;
}

/** Lo que un recogible puede tocar del juego al ser recogido. */
export interface CollectContext {
  player: Player;
  particles: Particles;
  /** Muestra el aviso grande en pantalla (p. ej. "¡DASH!"). */
  announce(text: string): void;
}

export interface Pickup extends Actor {
  readonly layer: 'pickup';
  collect(ctx: CollectContext): void;
}
