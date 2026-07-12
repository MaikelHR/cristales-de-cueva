// ============================================================
//  APARATOS — las reglas de la capa 'device'
// ------------------------------------------------------------
//  Resortes y plataformas móviles interactúan con la FÍSICA del
//  jugador, así que su orden dentro del paso importa:
//   1. carryAndAdvanceDevices — ANTES de la física del jugador:
//      las plataformas se mueven y arrastran a su pasajero.
//   2. resolveDeviceContacts — DESPUÉS de la física: aterrizar en
//      plataformas (se comportan como tablones de un sentido) y
//      pisar resortes (lanzan hacia arriba).
// ============================================================

import type { GameSession } from '../session';
import { MovingPlatform } from '../actors/devices/MovingPlatform';
import { Spring, SPRING_SPEED } from '../actors/devices/Spring';
import { sfx } from '../sfx';

const DUST_COLORS = ['#9b86c4', '#6f5a9e', '#d7c9ec'];

/** Paso 1: mover las plataformas y llevar al pasajero con ellas. */
export function carryAndAdvanceDevices(session: GameSession, dt: number): void {
  const player = session.player;
  for (const d of session.world.current.devices) {
    d.update(dt, player);
    if (d instanceof MovingPlatform && d.rider) {
      player.x += d.dx;
      player.y += d.dy;
    }
  }
}

/** Paso 2: aterrizajes en plataformas y disparos de resorte. */
export function resolveDeviceContacts(session: GameSession, dt: number): void {
  const player = session.player;
  const pbox = player.box();
  const feet = pbox.y + pbox.h;
  // Los pies del frame anterior: si venían de ARRIBA del tope, es un
  // aterrizaje legítimo (misma idea que los tablones de un sentido).
  const prevFeet = feet - Math.max(0, player.vy) * dt;

  for (const d of session.world.current.devices) {
    const b = d.box();
    const xOverlap = pbox.x < b.x + b.w && pbox.x + pbox.w > b.x;

    if (d instanceof MovingPlatform) {
      d.rider = false;
      if (player.vy < 0 || !xOverlap) continue; // subiendo se atraviesa
      // Aterrizó este paso, o sigue parado encima (la gravedad lo hunde
      // una pizca cada frame; el margen la absorbe y lo re-apoya).
      if (feet >= b.y && prevFeet <= b.y + 3) {
        player.y = b.y - player.h;
        player.vy = 0;
        player.onGround = true;
        d.rider = true;
      }
    } else if (d instanceof Spring) {
      // Pisar la banda del fuelle con los pies (cayendo o caminando).
      if (player.vy < 0 || !xOverlap) continue;
      if (feet >= b.y && feet <= b.y + b.h + 1) {
        d.trigger();
        player.springLaunch(SPRING_SPEED);
        session.particles.puff(b.x + b.w / 2, b.y + b.h, 6, DUST_COLORS);
        sfx.spring();
      }
    }
  }
}
