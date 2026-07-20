// ============================================================
//  SILK ANCHOR (stage device)
// ------------------------------------------------------------
//  A thread of old silk fixed to the ceiling with a BEAD of resin at
//  its tip. The bead is the whole device: touch it in mid-air and you
//  tie on, becoming a pendulum (the physics live in the Player). Its
//  interaction telegraphs the way the repo demands — the thread is
//  drawn full length so you can SEE the exact arc you'll swing, and
//  the bead pulses and glints, saying "grab me". While it holds you,
//  the thread bends to your body instead of hanging straight, so the
//  rope you're on is always the rope you see.
//  `length` (tiles) is the rope: it decides the size of the arc, so a
//  room's swings are designed by choosing lengths, not by luck.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { TILE } from '../../world/Level';
import type { Actor } from '../Actor';
import { drawGlow } from '../../art/glow';

// The grab box is a full tile — deliberately BIGGER than the bead
// drawn at the tip. Catching the silk is the whole level, and the
// playtest was clear: a jump that passes two pixels wide of a 5px
// bead reads as the game cheating, not as the player missing.
const BEAD = 9;          // px: the grab box (a fat, honest target)
const SILK = '#c9bcd8';
const SILK_LIT = '#e8e0f0';
const BEAD_CORE = '#fdfbff';
const BEAD_GLOW = '#d9c8ff';

export class Ancla implements Actor {
  readonly layer = 'device' as const;
  dead = false; // never dies; the field is part of Actor
  /** Ceiling point it hangs from (world px). */
  readonly x: number;
  readonly y: number;
  /** Rope length in px: the radius of the arc. */
  readonly len: number;
  /** Is the player hanging from THIS anchor? (set by systems). */
  holding = false;
  /** Where the player's body is while held (to bend the thread). */
  holdX = 0;
  holdY = 0;

  private t = 0;

  constructor(px: number, py: number, lengthTiles: number) {
    this.x = px + TILE / 2; // the thread hangs from the middle of its cell
    this.y = py + TILE;     // ...and starts at the cell's bottom edge
    this.len = lengthTiles * TILE;
  }

  /** The bead at the tip: the only part you can catch. */
  box(): Box {
    return { x: this.x - BEAD / 2, y: this.y + this.len - BEAD / 2, w: BEAD, h: BEAD };
  }

  update(dt: number): void {
    this.t += dt;
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const ax = Math.round(this.x - camX);
    const ay = Math.round(this.y - camY);
    // The knot that ties it to the rock.
    ctx.fillStyle = SILK_LIT;
    ctx.fillRect(ax - 2, ay - 2, 4, 2);
    ctx.fillStyle = SILK;
    ctx.fillRect(ax - 3, ay - 1, 6, 1);

    if (this.holding) {
      // Held: the thread bends to the body — taut, and lit along its span.
      const bx = this.holdX - camX;
      const by = this.holdY - camY;
      ctx.strokeStyle = SILK_LIT;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ax + 0.5, ay + 0.5);
      ctx.lineTo(Math.round(bx) + 0.5, Math.round(by) + 0.5);
      ctx.stroke();
      return;
    }

    // Idle: the thread hangs straight, swaying a hair, with the bead
    // pulsing at its tip — the arc you would ride, drawn in advance.
    const tipY = ay + this.len;
    for (let yy = 0; yy < this.len; yy += 2) {
      const sway = Math.sin(this.t * 1.4 + yy * 0.08) * (yy / this.len) * 1.5;
      ctx.fillStyle = yy % 8 < 4 ? SILK : SILK_LIT;
      ctx.fillRect(Math.round(ax + sway), ay + yy, 1, 2);
    }
    const sway = Math.sin(this.t * 1.4 + this.len * 0.08) * 1.5;
    const bx = Math.round(ax + sway);
    const pulse = 0.3 + (Math.sin(this.t * 3) + 1) * 0.15;
    drawGlow(ctx, bx, tipY, 9, BEAD_GLOW, pulse);
    ctx.fillStyle = SILK_LIT;
    ctx.fillRect(bx - 2, tipY - 2, 4, 4);
    ctx.fillStyle = BEAD_CORE;
    ctx.fillRect(bx - 1, tipY - 2, 2, 2);
  }
}
