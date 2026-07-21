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
import { BlinkPlatform } from '../actors/devices/Blink';
import { Crumble } from '../actors/devices/Crumble';
import { Ancla } from '../actors/devices/Ancla';
import { Compuerta } from '../actors/devices/Compuerta';
import { Contrapeso } from '../actors/devices/Contrapeso';
import { Spring, SPRING_SPEED } from '../actors/devices/Spring';
import { Vent, VENT_ACCEL, VENT_RISE } from '../actors/devices/Vent';
import { Corriente } from '../actors/Corriente';
import { sfx } from '../sfx';

const DUST_COLORS = ['#9b86c4', '#6f5a9e', '#d7c9ec'];
const VALVE_COLORS = ['#ffb84a', '#e0be62', '#fff3c0'];
const SILK_COLORS = ['#e8e0f0', '#c9bcd8', '#fdfbff'];

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
    } else if (d instanceof BlinkPlatform) {
      // Same one-way landing as the mover, but only while the slab is
      // THERE: when it phases out underfoot, the rider simply falls.
      d.rider = false;
      if (!d.solid || player.vy < 0 || !xOverlap) continue;
      if (feet >= b.y && prevFeet <= b.y + 3) {
        player.y = b.y - player.h;
        player.vy = 0;
        player.onGround = true;
        d.rider = true;
      }
    } else if (d instanceof Crumble) {
      // One-way while the board holds — and the very footfall that lands
      // on it starts the shudder (it reacts to you, it has no cycle).
      d.rider = false;
      if (!d.solid || player.vy < 0 || !xOverlap) continue;
      if (feet >= b.y && prevFeet <= b.y + 3) {
        player.y = b.y - player.h;
        player.vy = 0;
        player.onGround = true;
        d.rider = true;
        d.trigger();
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
    } else if (d instanceof Contrapeso) {
      // Both plates land like one-way planks, and whichever one you're
      // standing on is the one that sinks — hauling its twin up by the
      // same amount. Landing is checked per plate, since the pair is a
      // single actor with two boxes.
      d.rider = null;
      if (player.vy < 0) continue; // going up: pass through both
      for (const side of ['left', 'right'] as const) {
        const plate = side === 'left' ? d.leftBox() : d.rightBox();
        const over = pbox.x < plate.x + plate.w && pbox.x + pbox.w > plate.x;
        if (!over) continue;
        if (feet >= plate.y && prevFeet <= plate.y + 4) {
          player.y = plate.y - player.h;
          player.vy = 0;
          player.onGround = true;
          d.rider = side;
          break;
        }
      }
    } else if (d instanceof Compuerta) {
      // The valve answers ONLY to the pound: it is a thing you hit from
      // above, so it can never be thrown by brushing past it on a ledge.
      if (player.pounding && overlaps(player.box(), b)) {
        if (d.throwIt()) session.particles.puff(b.x + b.w / 2, b.y, 6, VALVE_COLORS);
      }
    } else if (d instanceof Ancla) {
      // The bead catches a player in the air (like the vent's glide gate,
      // it only grips someone in the right state), and keeps holding
      // until the Player's pendulum lets go on its own.
      d.holding = player.swinging && player.heldBy(d.x, d.y);
      if (d.holding) {
        d.holdX = player.x + player.w / 2;
        d.holdY = player.y + player.h / 2;
      } else if (player.canGrabFrom(d.x, d.y) && overlaps(player.box(), b)) {
        player.grabAnchor(d.x, d.y, d.len);
        d.holding = true;
        d.holdX = player.x + player.w / 2;
        d.holdY = player.y + player.h / 2;
        session.particles.puff(b.x + b.w / 2, b.y, 5, SILK_COLORS);
      }
    } else if (d instanceof Corriente) {
      // The current only shoves a SUBMERGED swimmer (a state gate, just
      // like the vent's glide gate): a floater at the surface drifts past.
      if (player.submerged && overlaps(player.box(), b)) {
        player.currentPush(dt, d.dirX, d.dirY);
      }
    }
  }
}
