// ============================================================
//  ENEMY — the common enemy interface
// ------------------------------------------------------------
//  An enemy is an Actor on the 'enemy' layer with everything combat
//  needs to know about it. The game treats them all the same; adding
//  a type (one that flies, chases, shoots) = create a class that
//  implements this and register it in Room, without touching the rules.
// ============================================================

import type { Box } from '../../../engine/canvas';
import type { Actor } from '../Actor';

export interface Enemy extends Actor {
  readonly layer: 'enemy';
  /** can it be defeated by stomping it from above? */
  readonly stompable: boolean;
  /** colors of the burst when defeated. */
  readonly gooColors: readonly string[];
  /** bosses block the door until defeated. */
  readonly isBoss?: boolean;
  /** true = a stomp AND a pound both bounce off harmlessly and hurt
   *  the player instead (the jellyfish: route around it, don't fight it).
   *  Where the erizo only punished a stomp, this can't be touched at all. */
  readonly invulnerable?: boolean;
  /** true only while the dash-lunge can defeat it (the stunned eel):
   *  combat's isDashKill turns a dashing contact into a kill. */
  readonly dashVulnerable?: boolean;
  /** own dangerous boxes (e.g. projectiles) that hurt the player. */
  hazards?(): Box[];
  /** Own reaction to a stomp (for enemies with several hits).
   *  Returns true if the stomp defeated it. If absent, a stomp
   *  kills it in one. */
  onStomp?(): boolean;
}
