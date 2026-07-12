// ============================================================
//  CRYSTAL (main pickup)
// ------------------------------------------------------------
//  Floats with a gentle bob, glows with a pulsing halo and
//  twinkles now and then. Collecting them all (plus defeating the
//  boss) opens the door. Animation phases are offset by position
//  so two neighboring crystals don't glow in sync.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { frameAt } from '../../../engine/animation';
import type { Clock } from '../../clock';
import type { CollectContext, Pickup } from '../Actor';
import { sprites } from '../../art/sprites';
import { drawGlow } from '../../art/glow';
import { sfx } from '../../sfx';

export class Crystal implements Pickup {
  readonly layer = 'pickup' as const;
  dead = false; // collected
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
    // Its animation is idle: reads the shared clock in draw().
  }

  collect(ctx: CollectContext): void {
    this.dead = true;
    // Golden sparks from the center of the crystal
    ctx.particles.burst(this.x + 3, this.y + 4, 14, ['#ffd23a', '#fff7c9', '#ffe25a']);
    sfx.pickup();
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const time = this.clock.t;
    const bob = Math.sin(time * 3 + this.x) * 1.5;
    const cx = this.x + 3 - camX;
    const cy = this.y + 4 - camY + bob;
    // Pulsing halo
    const pulse = 0.45 + Math.sin(time * 4 + this.x) * 0.15;
    drawGlow(ctx, cx, cy, 12, '#ffe25a', pulse);
    // Crystal with a glint sweeping across the facets (offset by position)
    const frames = [sprites.crystal, sprites.crystal2, sprites.crystal3, sprites.crystal4];
    const spr = frameAt(frames, 7, time, this.x * 0.5);
    spr.draw(ctx, cx - spr.w / 2, cy - spr.h / 2);
    // Twinkle: a little star that sparkles now and then, top right
    if ((time * 1.6 + this.x * 0.7) % 2.2 < 0.2) {
      const sx = Math.round(cx + 4);
      const sy = Math.round(cy - 4);
      ctx.fillStyle = '#fff7c9';
      ctx.fillRect(sx, sy - 1, 1, 3);
      ctx.fillRect(sx - 1, sy, 3, 1);
    }
  }
}
