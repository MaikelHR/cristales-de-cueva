// ============================================================
//  ENEMY — la interfaz común de los enemigos
// ------------------------------------------------------------
//  Un enemigo es un Actor de la capa 'enemy' con lo que el combate
//  necesita saber de él. El juego los trata a todos por igual; sumar
//  un tipo (que vuela, que persigue, que dispara) = crear una clase
//  que implemente esto y registrarla en Room, sin tocar las reglas.
// ============================================================

import type { Box } from '../../../engine/canvas';
import type { Actor } from '../Actor';

export interface Enemy extends Actor {
  readonly layer: 'enemy';
  /** ¿se lo puede derrotar pisándolo desde arriba? */
  readonly stompable: boolean;
  /** colores del estallido al derrotarlo. */
  readonly gooColors: readonly string[];
  /** los jefes bloquean la puerta hasta ser derrotados. */
  readonly isBoss?: boolean;
  /** cajas peligrosas propias (p. ej. proyectiles) que dañan al jugador. */
  hazards?(): Box[];
  /** Reacción propia al pisotón (para enemigos con varios golpes).
   *  Devuelve true si el pisotón lo derrotó. Si no está, un pisotón
   *  lo mata de una. */
  onStomp?(): boolean;
}
