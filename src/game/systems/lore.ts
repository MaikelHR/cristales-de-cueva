// ============================================================
//  LORE — the rule of the 'lore' layer
// ------------------------------------------------------------
//  Walk up to an inscription and press DOWN, and it says its piece.
//  Press down again, or walk away, and it stops.
//
//  IT MUST BE A PRESS. The first version read an inscription when you
//  simply stood still beside it long enough, on the theory that this
//  needed no button. It does not survive contact with playing the
//  game: you stop for half a second to look at a jump, and a wall of
//  text opens over the floor you were looking at. Text the player did
//  not ask for is an interruption no matter how good the text is. So
//  reading is now something you DO.
//
//  WHY 'down' AND NOT 'up'. Hollow Knight reads its tablets with up.
//  Here ↑/W is bound to jump AND up at once (input.ts maps one key to
//  several actions), so an up-to-read glyph would launch you off the
//  plaque. 'confirm' shares its key with jump too, and 'back' is ESC,
//  which is also pause. 'down' is the only action that is exactly
//  itself on the keyboard, the d-pad and the touch pad alike — and it
//  is already this game's "do the thing at your feet" button.
//
//  It costs no new binding, which is the project's standing rule for
//  every verb added after the first.
// ============================================================

import { justPressed } from '../../engine/input';
import { overlaps } from '../../engine/canvas';
import type { GameSession } from '../session';
import { Glifo, REACH } from '../actors/Glifo';
import { markLore, writeSave } from '../save';
import { sfx } from '../sfx';

export function readNearbyLore(session: GameSession): void {
  const player = session.player;
  // The body, grown by the reach on every side — one overlap test
  // instead of a distance per glyph, and it treats a tall glyph and a
  // wide one alike.
  const b = player.box();
  const halo = { x: b.x - REACH, y: b.y - REACH, w: b.w + REACH * 2, h: b.h + REACH * 2 };
  // You read standing on your feet, at full size. Not mid-jump, not
  // mid-dash, and not while swimming — 'down' means something else in
  // every one of those states.
  const canRead = player.onGround && !player.shrunk && !player.swimming;
  const pressed = canRead && justPressed('down');

  let anyNear = false;
  let open: Glifo | null = null;
  for (const actor of session.world.current.actors) {
    if (!(actor instanceof Glifo)) continue;
    const near = overlaps(halo, actor.box());
    actor.near = near;
    if (!near) {
      actor.open = false; // walking away always closes it
      continue;
    }
    anyNear = true;
    if (pressed) actor.open = !actor.open;
    if (!actor.open) continue;
    if (!actor.read) {
      actor.read = true;
      if (markLore(session.save, actor.lore)) {
        // Saved the instant it is read: a run can end in a pit, and
        // what the cave told you on the way should not die with it.
        writeSave(session.save);
        sfx.pickup();
      }
    }
    open = actor;
  }

  session.readingLore = open?.lore ?? null;
  // The cue only shows while you are beside one and NOT reading it —
  // which is exactly the moment someone needs telling what to press.
  session.loreNear = anyNear && !open;
  // Standing at a plaque, 'down' is for reading it. Shrinking is the
  // other thing 'down' does on the ground, and the two would fight —
  // the same kind of priority the plank-drop already takes over it.
  // Set here, read by the player's NEXT step, which is a frame later
  // and imperceptible.
  player.atInscription = anyNear;
}
