// ============================================================
//  VESTIGIO — what a secret is worth
// ------------------------------------------------------------
//  A relic of the Work left where nobody was meant to find it: an
//  amber shard, dimmer and older-looking than a crystal. Picking it
//  up is worth a lot of points and NOTHING ELSE.
//
//  That "nothing else" is the whole design of it. The door opens on
//  the crystal count, so a crystal behind a false wall would turn an
//  optional secret into a compulsory one and the level would be lying
//  about what it asks of you. An ability would be worse — it would
//  break every later level's assumption about what you arrive
//  knowing. Points are the one reward this game already has that is
//  purely for the player who wanted more: they feed the score record
//  and the leaderboard in your own save, and someone who never finds
//  a single vestigio can still finish everything.
//
//  It is drawn cool and unlit next to a crystal on purpose: you
//  should be able to tell, across a room, that this is not the thing
//  the door wants.
// ============================================================

import type { Box } from '../../../engine/canvas';
import type { Clock } from '../../clock';
import type { CollectContext, Pickup } from '../Actor';
import { drawGlow } from '../../art/glow';
import { sfx } from '../../sfx';

/** Points for finding one. Deliberately worth several enemies: it is
 *  the only thing in the game you have to go looking for. */
export const VESTIGIO_POINTS = 250;

const AMBER = '#c9a227';
const AMBER_LIT = '#ffe9a8';
const AMBER_DARK = '#7a6220';

export class Vestigio implements Pickup {
  readonly layer = 'pickup' as const;
  dead = false;
  readonly w = 6;
  readonly h = 6;

  constructor(
    public x: number,
    public y: number,
    private clock: Clock,
  ) {}

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(): void {
    // Idle: its animation is a pure function of the shared clock.
  }

  collect(ctx: CollectContext): void {
    this.dead = true;
    ctx.particles.burst(this.x + 3, this.y + 3, 20, [AMBER, AMBER_LIT, '#fff8e4']);
    sfx.pickup();
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const time = this.clock.t;
    // Slower and shallower than a crystal's bob: a heavier thing.
    const bob = Math.sin(time * 1.8 + this.x) * 1;
    const cx = Math.round(this.x + 3 - camX);
    const cy = Math.round(this.y + 3 - camY + bob);

    drawGlow(ctx, cx, cy, 11, AMBER, 0.3 + Math.sin(time * 2.2 + this.x) * 0.08);
    // A rough shard, not a cut gem — four rows, wider at the shoulder.
    ctx.fillStyle = AMBER_DARK;
    ctx.fillRect(cx - 2, cy - 3, 4, 7);
    ctx.fillRect(cx - 3, cy - 1, 6, 3);
    ctx.fillStyle = AMBER;
    ctx.fillRect(cx - 1, cy - 2, 3, 5);
    ctx.fillRect(cx - 2, cy - 1, 1, 3);
    ctx.fillStyle = AMBER_LIT;
    ctx.fillRect(cx - 1, cy - 2, 1, 2); // the one lit facet, top-left
  }
}
