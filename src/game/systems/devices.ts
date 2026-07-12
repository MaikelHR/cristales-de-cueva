// ============================================================
//  DEVICES — the rules of the 'device' layer
// ------------------------------------------------------------
//  Springs, moving platforms and updrafts interact with the
//  player's PHYSICS, so their order within the step matters:
//   1. carryAndAdvanceDevices — BEFORE the player's physics:
//      platforms move and carry their rider along.
//   2. resolveDeviceContacts — AFTER physics: landing on
//      platforms (they behave like one-way planks), stepping on
//      springs (launch upward) and receiving the push of an
//      updraft (only if the player GLIDES inside it).
// ============================================================

import { overlaps } from '../../engine/canvas';
import type { GameSession } from '../session';
import { MovingPlatform } from '../actors/devices/MovingPlatform';
import { Spring, SPRING_SPEED } from '../actors/devices/Spring';
import { Vent, VENT_ACCEL, VENT_RISE } from '../actors/devices/Vent';
import { sfx } from '../sfx';

const DUST_COLORS = ['#9b86c4', '#6f5a9e', '#d7c9ec'];

/** Step 1: move the platforms and carry the rider along with them. */
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

/** Step 2: landings on platforms and spring launches. */
export function resolveDeviceContacts(session: GameSession, dt: number): void {
  const player = session.player;
  const pbox = player.box();
  const feet = pbox.y + pbox.h;
  // Last frame's feet: if they came from ABOVE the top, it's a
  // legitimate landing (same idea as one-way planks).
  const prevFeet = feet - Math.max(0, player.vy) * dt;

  for (const d of session.world.current.devices) {
    const b = d.box();
    const xOverlap = pbox.x < b.x + b.w && pbox.x + pbox.w > b.x;

    if (d instanceof MovingPlatform) {
      d.rider = false;
      if (player.vy < 0 || !xOverlap) continue; // moving up passes through
      // Landed this step, or still standing on top (gravity sinks it
      // a hair each frame; the margin absorbs it and re-seats it).
      if (feet >= b.y && prevFeet <= b.y + 3) {
        player.y = b.y - player.h;
        player.vy = 0;
        player.onGround = true;
        d.rider = true;
      }
    } else if (d instanceof Spring) {
      // Step on the bellows band with the feet (falling or walking).
      if (player.vy < 0 || !xOverlap) continue;
      if (feet >= b.y && feet <= b.y + b.h + 1) {
        d.trigger();
        player.springLaunch(SPRING_SPEED);
        session.particles.puff(b.x + b.w / 2, b.y + b.h, 6, DUST_COLORS);
        sfx.spring();
      }
    } else if (d instanceof Vent) {
      // The updraft only pushes whoever glides inside the column:
      // releasing jump lets go of the wind (and drops at will).
      if (player.glideHeld && overlaps(player.box(), b)) {
        player.liftBy(dt, VENT_ACCEL, VENT_RISE);
      }
    }
  }
}
