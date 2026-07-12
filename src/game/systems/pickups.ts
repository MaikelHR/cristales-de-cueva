// ============================================================
//  PICKUPS — the 'pickup' layer rule
// ------------------------------------------------------------
//  Touching a live pickup collects it. What happens on collect is
//  decided by each actor (Crystal, Relic) in its collect().
// ============================================================

import { overlaps } from '../../engine/canvas';
import type { GameSession } from '../session';

export function collectPickups(session: GameSession): void {
  const pbox = session.player.box();
  for (const p of session.world.current.pickups) {
    if (p.dead) continue;
    if (!overlaps(pbox, p.box())) continue;
    p.collect({
      player: session.player,
      particles: session.particles,
      announce: (text) => session.announce(text),
    });
  }
}
