// ============================================================
//  BLINK PLATFORM (stage device)
// ------------------------------------------------------------
//  A crystal slab that PHASES on a fixed cycle: present, then gone.
//  Its interaction telegraphs both ways (the device standard): while
//  solid it sputters and flickers before vanishing, and while absent
//  a faint ghost outline stays visible and gold motes converge just
//  before it returns — you always know WHERE it will be and WHEN.
//  It's not part of the collision grid: the "land on top while solid"
//  rule lives in systems/devices.ts, like the moving platform's.
//  `offset` staggers the cycle so a chain of blinks becomes a rhythm.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { TILE } from '../../world/Level';
import type { Actor } from '../Actor';
import { drawGlow } from '../../art/glow';

const SOLID = 2.8;  // seconds present (the last WARN of them, sputtering)
const WARN = 0.7;   // sputter before vanishing
const GONE = 1.6;   // seconds absent (motes gather in the last 0.5)
const PERIOD = SOLID + GONE;

export class BlinkPlatform implements Actor {
  readonly layer = 'device' as const;
  dead = false; // never dies; the field is part of Actor
  readonly w = TILE * 3;
  readonly h = 6;
  x: number;
  y: number;
  /** Was the player standing on top last step? (set by systems). */
  rider = false;

  private t: number;

  constructor(px: number, py: number, offset = 0) {
    this.x = px;
    this.y = py + 1; // 1px of air: reads as a floating slab, like the mover
    this.t = offset;
  }

  /** Is the slab there right now? (the landing rule asks this). */
  get solid(): boolean {
    return this.t % PERIOD < SOLID;
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt: number): void {
    this.t += dt;
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const px = Math.round(this.x - camX);
    const py = Math.round(this.y - camY);
    const c = this.t % PERIOD;

    if (this.solid) {
      // Sputter: in the last WARN seconds it flickers faster and faster.
      const warnP = (c - (SOLID - WARN)) / WARN; // <0 while calm
      const flicker = warnP > 0 && Math.sin(this.t * (20 + warnP * 40)) < warnP * 1.2;
      ctx.globalAlpha = flicker ? 0.25 : 1;
      drawGlow(ctx, px + this.w / 2, py + this.h / 2, 16, '#ffd76a', flicker ? 0.1 : 0.3);
      // Slab: dark body, gold-lit top (that's where you step).
      ctx.fillStyle = '#4a3a2a';
      ctx.fillRect(px, py, this.w, this.h);
      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(px, py, this.w, 1);
      ctx.fillStyle = '#1a1206';
      ctx.fillRect(px, py + this.h - 1, this.w, 1);
      // Guide gems on the tips: same "crystal tech" language as the mover.
      ctx.fillStyle = '#ffe25a';
      ctx.fillRect(px + 1, py + 2, 2, 2);
      ctx.fillRect(px + this.w - 3, py + 2, 2, 2);
      ctx.globalAlpha = 1;
    } else {
      // Absent: a ghost outline holds the spot...
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = '#ffd76a';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, this.w - 1, this.h - 1);
      ctx.globalAlpha = 1;
      // ...and motes converge on it just before it re-forms.
      const until = GONE - (c - SOLID); // seconds until it returns
      if (until < 0.5) {
        const p = 1 - until / 0.5; // 0..1 as the return nears
        ctx.fillStyle = '#ffe9a8';
        for (let i = 0; i < 4; i++) {
          const a = this.t * 3 + (i * Math.PI) / 2;
          const r = (1 - p) * 12 + 2;
          ctx.globalAlpha = 0.3 + p * 0.6;
          ctx.fillRect(
            Math.round(px + this.w / 2 + Math.cos(a) * r),
            Math.round(py + this.h / 2 + Math.sin(a) * r * 0.5),
            1, 1,
          );
        }
        ctx.globalAlpha = 1;
        drawGlow(ctx, px + this.w / 2, py + this.h / 2, 10, '#ffd76a', p * 0.25);
      }
    }
  }
}
