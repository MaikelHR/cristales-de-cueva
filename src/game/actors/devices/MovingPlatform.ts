// ============================================================
//  MOVING PLATFORM (stage device)
// ------------------------------------------------------------
//  A crystal slab that travels back and forth along one axis ('x' or 'y')
//  within its range. It's not part of the collision grid:
//  the "stand on top and ride along" rule lives in
//  systems/devices.ts. Here: the movement (triangle wave, no
//  error accumulation) and the drawing.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { TILE } from '../../world/Level';
import type { Actor } from '../Actor';
import { drawGlow } from '../../art/glow';

const DEFAULT_SPEED = 28; // px/s, comfortable to hop onto while moving

export class MovingPlatform implements Actor {
  readonly layer = 'device' as const;
  dead = false; // platforms never die; the field is part of Actor
  readonly w = TILE * 3;
  readonly h = 6;
  x: number;
  y: number;
  /** How much it moved last step (to carry the rider). */
  dx = 0;
  dy = 0;
  /** Was the player standing on top last step? (set by systems). */
  rider = false;

  private readonly baseX: number;
  private readonly baseY: number;
  private readonly rangePx: number; // signed: which way it starts
  private readonly speed: number;
  private t = 0;

  constructor(
    px: number,
    py: number,
    private readonly axis: 'x' | 'y',
    rangeTiles: number,
    speed?: number,
  ) {
    this.baseX = px;
    this.baseY = py + 1; // leaves 1px of air: reads as a floating slab
    this.x = this.baseX;
    this.y = this.baseY;
    this.rangePx = rangeTiles * TILE;
    this.speed = speed ?? DEFAULT_SPEED;
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt: number): void {
    this.t += dt;
    // Triangle wave over total time: position is a function of t,
    // so no error accumulates and the back-and-forth is perfectly periodic.
    const span = Math.abs(this.rangePx);
    const period = (2 * span) / this.speed;
    const phase = (this.t % period) / period; // 0..1
    const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2; // 0..1..0
    const offset = tri * this.rangePx;
    const nx = this.axis === 'x' ? this.baseX + offset : this.baseX;
    const ny = this.axis === 'y' ? this.baseY + offset : this.baseY;
    this.dx = nx - this.x;
    this.dy = ny - this.y;
    this.x = nx;
    this.y = ny;
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const px = Math.round(this.x - camX);
    const py = Math.round(this.y - camY);
    drawGlow(ctx, px + this.w / 2, py + this.h / 2, 16, '#b98bff', 0.25);
    // Slab: dark body, lit top (that's where you step) and shadowed base.
    ctx.fillStyle = '#3a2456';
    ctx.fillRect(px, py, this.w, this.h);
    ctx.fillStyle = '#8064b0';
    ctx.fillRect(px, py, this.w, 1);
    ctx.fillStyle = '#160b24';
    ctx.fillRect(px, py + this.h - 1, this.w, 1);
    // Guide gems on the tips: they read as "this is crystal tech".
    ctx.fillStyle = '#7ce0ff';
    ctx.fillRect(px + 1, py + 2, 2, 2);
    ctx.fillRect(px + this.w - 3, py + 2, 2, 2);
  }
}
