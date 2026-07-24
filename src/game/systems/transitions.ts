// ============================================================
//  TRANSITIONS — crossing from one room to another
// ------------------------------------------------------------
//  If the player crossed a border with an exit, the world changes
//  rooms; here we update everything that depends on that: collisions,
//  camera, checkpoint and minimap.
// ============================================================

import type { GameSession } from '../session';
import { markSecret, writeSave } from '../save';
import { t } from '../i18n';
import { sfx } from '../sfx';

export function handleRoomTransition(session: GameSession): boolean {
  if (!session.world.tryTransition(session.player)) return false;
  const room = session.world.current;
  session.player.setLevel(room.level);
  session.makeCamera();
  // The mouth you entered through is your new respawn point.
  session.saveCheckpoint();
  session.visited.add(room.data.id);
  // Walking into a hidden room IS finding it — there is nothing to
  // collect and no switch to hit. Say so once, ever: the announcement
  // is for the first time you find it, in any run.
  if (room.data.secret && markSecret(session.save, room.data.id)) {
    writeSave(session.save);
    session.announce(t('secret_found'));
    // The RELIC sting, not the win fanfare: this is "you found
    // something", not "the level is over", and win() is the sound the
    // door makes. Getting that wrong would tell the player the run had
    // ended every time they squeezed through a crack.
    sfx.relic();
  }
  return true;
}
