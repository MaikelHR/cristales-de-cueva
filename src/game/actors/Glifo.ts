// ============================================================
//  GLIFO — a carved inscription on the wall
// ------------------------------------------------------------
//  The cave's voice: one tile of rune-cut rock that sits in the wall
//  doing nothing at all until you walk up and press DOWN.
//
//  The rule of the reading lives in systems/lore.ts, including why the
//  button is 'down' and why it is a button at all. What lives HERE is
//  the face: unread it barely breathes, lit it holds a steady light,
//  and being able to see at a glance which ones you have already read
//  — across a whole level — is most of what makes hunting them a
//  thing a player can actually do.
// ============================================================

import type { Box } from '../../engine/canvas';
import type { Actor } from './Actor';
import type { Clock } from '../clock';
import type { LoreId } from '../lore';
import { TILE } from '../world/Level';
import { drawGlow } from '../art/glow';

/** How close your body has to be, in px, measured box to box. */
export const REACH = 12;

export class Glifo implements Actor {
  readonly layer = 'lore' as const;
  /** Inscriptions are never consumed: dead would mean "gone", and a
   *  read glyph stays on the wall, lit, for the rest of the run. */
  dead = false;
  /** Is it speaking right now? Toggled by 'down' (systems/lore.ts). */
  open = false;
  /** Has it been read — this run, or in some earlier one? */
  read = false;
  /** Is the player in front of it right now (drives the glow). */
  near = false;

  constructor(
    readonly x: number,
    readonly y: number,
    readonly lore: LoreId,
    private clock: Clock,
  ) {}

  update(): void {
    // Nothing of its own: systems/lore.ts drives it, because whether
    // you are close enough and pressing the button is a fact about the
    // player, not about the wall.
  }

  box(): Box {
    return { x: this.x, y: this.y, w: TILE, h: TILE };
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const px = Math.round(this.x - camX);
    const py = Math.round(this.y - camY);
    const t = this.clock.t;
    // Unread it barely breathes; read it holds a steady light. Being
    // ABLE to see which ones you have already read, across a whole
    // level, is most of what makes hunting them a thing you can do.
    const lit = this.read ? 0.42 : 0.16 + (Math.sin(t * 1.5 + this.x) + 1) * 0.05;
    // Close enough to read it, and while it is speaking, it brightens —
    // the plate answering you is the confirmation that the button did
    // something, which a text panel alone at the far side of the screen
    // does not really give.
    const glow = lit + (this.near ? 0.16 : 0) + (this.open ? 0.3 : 0);

    drawGlow(ctx, px + TILE / 2, py + TILE / 2, 12, GOLD, glow * 0.8);

    // The plaque: a recessed panel, darker than the rock around it.
    ctx.fillStyle = '#1a1424';
    ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
    ctx.fillStyle = '#0d0914';
    ctx.fillRect(px + 1, py + 1, TILE - 2, 1);
    ctx.fillRect(px + 1, py + 1, 1, TILE - 2);

    // The cut runes. Three short strokes: enough to read as writing at
    // 8px, and deliberately not a symbol anyone could try to decode.
    ctx.globalAlpha = Math.min(1, 0.45 + glow);
    ctx.fillStyle = this.read ? GOLD_LIT : GOLD;
    ctx.fillRect(px + 2, py + 2, 4, 1);
    ctx.fillRect(px + 2, py + 4, 3, 1);
    ctx.fillRect(px + 2, py + 6, 4, 1);
    ctx.fillRect(px + 6, py + 3, 1, 3);
    ctx.globalAlpha = 1;

    // Speaking: the plate's own edges light up, so it is obvious WHICH
    // inscription the panel at the other end of the screen belongs to.
    if (this.open) {
      ctx.fillStyle = GOLD_LIT;
      ctx.fillRect(px + 1, py + 1, 1, TILE - 2);
      ctx.fillRect(px + TILE - 2, py + 1, 1, TILE - 2);
    }
  }
}

const GOLD = '#d8cfae';
const GOLD_LIT = '#fff8e4';
