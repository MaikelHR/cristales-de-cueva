// ============================================================
//  RECOGIBLES — la regla de la capa 'pickup'
// ------------------------------------------------------------
//  Tocar un recogible vivo lo recoge. Qué pasa al recogerlo lo
//  decide cada actor (Crystal, Relic) en su collect().
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
