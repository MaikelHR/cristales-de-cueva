// ============================================================
//  TRANSICIONES — cruzar de una sala a otra
// ------------------------------------------------------------
//  Si el jugador cruzó un borde con salida, el mundo cambia de
//  sala; acá se actualiza todo lo que depende de eso: colisiones,
//  cámara, checkpoint y minimapa.
// ============================================================

import type { GameSession } from '../session';

export function handleRoomTransition(session: GameSession): boolean {
  if (!session.world.tryTransition(session.player)) return false;
  session.player.setLevel(session.world.current.level);
  session.makeCamera();
  // La boca por la que entraste es tu nuevo punto de reaparición.
  session.saveCheckpoint();
  session.visited.add(session.world.current.data.id);
  return true;
}
