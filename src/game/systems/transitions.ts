// ============================================================
//  TRANSITIONS — crossing from one room to another
// ------------------------------------------------------------
//  If the player crossed a border with an exit, the world changes
//  rooms; here we update everything that depends on that: collisions,
//  camera, checkpoint and minimap.
// ============================================================

import type { GameSession } from '../session';

export function handleRoomTransition(session: GameSession): boolean {
  if (!session.world.tryTransition(session.player)) return false;
  session.player.setLevel(session.world.current.level);
  session.makeCamera();
  // The mouth you entered through is your new respawn point.
  session.saveCheckpoint();
  session.visited.add(session.world.current.data.id);
  return true;
}
