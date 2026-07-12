// ============================================================
//  SPRING (stage device)
// ------------------------------------------------------------
//  A crystal bellows resting on the floor: stepping on it (or
//  landing on it) launches the player much higher than a jump.
//  It's not solid: the launch rule lives in systems/devices.ts;
//  here it's only the visual state (compressing when it fires)
//  and the drawing.
// ============================================================

import type { Box } from '../../../engine/canvas';
import type { Clock } from '../../clock';
import type { Actor } from '../Actor';
import { drawGlow } from '../../art/glow';

/** Vertical launch velocity (px/s): ~9 tiles high, well above
 *  the normal jump (~4) and the double jump (~7). */
export const SPRING_SPEED = 320;

const COMPRESS_TIME = 0.22; // seconds it stays compressed after firing

export class Spring implements Actor {
  readonly layer = 'device' as const;
  dead = false; // springs never die; the field is part of Actor
  readonly w = 6;
  readonly h = 4;
  x: number;
  y: number;
  private compressTimer = 0;

  constructor(px: number, py: number, private clock: Clock) {
    // Occupies the bottom third of its cell, centered (a short bellows).
    this.x = px + 1;
    this.y = py + 4;
  }

  /** The trigger band: stepping on it with the feet launches upward. */
  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  /** Visual firing effect (the impulse is applied by systems/devices). */
  trigger(): void {
    this.compressTimer = COMPRESS_TIME;
  }

  update(dt: number): void {
    this.compressTimer = Math.max(0, this.compressTimer - dt);
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const cx = Math.round(this.x + this.w / 2 - camX);
    const baseY = Math.round(this.y + this.h - camY); // resting on the floor
    const compressed = this.compressTimer > 0;
    // Breathes: the bellows stretches 1px with the shared clock, inviting
    // you to step on it; when compressed it sits flush with the floor a moment.
    const breathe = Math.sin(this.clock.t * 3 + this.x) > 0 ? 1 : 0;
    const coilH = compressed ? 1 : 3 + breathe;

    drawGlow(ctx, cx, baseY - 2, 10, '#7ce0ff', compressed ? 0.7 : 0.35);

    // Bellows: alternating rungs (zigzag hinted with rectangles).
    ctx.fillStyle = '#5f4790';
    for (let i = 0; i < coilH; i++) {
      const wob = i % 2 === 0 ? -1 : 1;
      ctx.fillRect(cx - 2 + wob, baseY - 1 - i, 4, 1);
    }
    // Lit top plate: the part you step on.
    ctx.fillStyle = '#7ce0ff';
    ctx.fillRect(cx - 3, baseY - 1 - coilH, 6, 1);
    ctx.fillStyle = '#f5fcff';
    ctx.fillRect(cx - 1, baseY - 1 - coilH, 2, 1);
  }
}
