// ============================================================
//  CRUMBLE PLANK (stage device)
// ------------------------------------------------------------
//  A rotten mine board resting on two fixed stone corbels. Unlike
//  the blink slab (a fixed cycle you READ), the crumble REACTS to
//  you: step on it and it shudders — the grace window to get off —
//  then snaps loose, falls away in two halves and, a while later,
//  dust gathers back onto the corbels and the board re-forms. The
//  corbels never vanish: you always know where a board lives, even
//  while it's gone (the device-telegraph standard). Its landing
//  rule (one-way, like the movers) lives in systems/devices.ts.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { TILE } from '../../world/Level';
import type { Actor } from '../Actor';
import { drawGlow } from '../../art/glow';
import { sfx } from '../../sfx';

const SHAKE = 0.45;   // seconds of shudder after the first step
const FALL = 0.7;     // seconds the halves take to drop out of sight
const REBUILD = 2.6;  // seconds absent (dust gathers in the last 0.45)
const GATHER = 0.45;  // the tail of REBUILD when motes converge
const FALL_G = 420;   // px/s^2 pulling the loose halves down

// Board colors sit a full step BRIGHTER than the mine's rock and the
// gully dark behind them: a board that blends into the pit it bridges
// is a board nobody reads (the first in-browser check proved it).
const WOOD = '#8a6238';
const WOOD_LIT = '#d9a860';
const WOOD_DARK = '#3a2415';
const NAIL = '#ffb86a';
const STONE = '#413226';
const STONE_LIT = '#6b5540';
const DUST = '#c9985f';

type State = 'intact' | 'shaking' | 'falling' | 'gone';

export class Crumble implements Actor {
  readonly layer = 'device' as const;
  dead = false; // never dies; the field is part of Actor
  readonly w = TILE * 2;
  readonly h = 5;
  x: number;
  y: number;
  /** Was the player standing on top last step? (set by systems). */
  rider = false;

  private state: State = 'intact';
  private timer = 0;   // time inside the current state
  private t = 0;       // own clock (drives the shudder)
  private fallY = 0;   // how far the halves have dropped
  private fallV = 0;

  constructor(px: number, py: number) {
    this.x = px;
    // FLUSH with its row (no +1 like the floating slabs): boards bridge
    // gaps at floor level, and a 1px lip would stop a walker dead — the
    // engine has no step-assist.
    this.y = py;
  }

  /** Can it still be stood on? (the landing rule asks this). */
  get solid(): boolean {
    return this.state === 'intact' || this.state === 'shaking';
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  /** First footfall: the board starts shuddering (its only warning). */
  trigger(): void {
    if (this.state !== 'intact') return;
    this.state = 'shaking';
    this.timer = 0;
    sfx.creak();
  }

  update(dt: number): void {
    this.t += dt;
    this.timer += dt;
    switch (this.state) {
      case 'shaking':
        if (this.timer >= SHAKE) {
          this.state = 'falling';
          this.timer = 0;
          this.fallY = 0;
          this.fallV = 30;
          sfx.snap();
        }
        break;
      case 'falling':
        this.fallV += FALL_G * dt;
        this.fallY += this.fallV * dt;
        if (this.timer >= FALL) {
          this.state = 'gone';
          this.timer = 0;
        }
        break;
      case 'gone':
        if (this.timer >= REBUILD) {
          // Re-forming is safe by construction: the board is one-way, so
          // a player inside the gap just isn't caught by it.
          this.state = 'intact';
          this.timer = 0;
        }
        break;
    }
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const px = Math.round(this.x - camX);
    const py = Math.round(this.y - camY);

    // The corbels: two stone brackets fixed in the walls of time.
    // They stay through every state — the board's address.
    ctx.fillStyle = STONE;
    ctx.fillRect(px - 1, py + 2, 3, 3);
    ctx.fillRect(px + this.w - 2, py + 2, 3, 3);
    ctx.fillStyle = STONE_LIT;
    ctx.fillRect(px - 1, py + 2, 3, 1);
    ctx.fillRect(px + this.w - 2, py + 2, 3, 1);

    if (this.state === 'intact' || this.state === 'shaking') {
      // A faint lamplight sheen, like the movers' glow: reads as "a
      // device you stand on", not a stripe of terrain.
      drawGlow(ctx, px + this.w / 2, py + 2, 12, '#e0a050', 0.12);
      // Shudder: side-to-side jitter that quickens as the snap nears.
      let ox = 0;
      if (this.state === 'shaking') {
        const p = this.timer / SHAKE;
        ox = Math.round(Math.sin(this.t * (30 + p * 40)));
        // Dust shaken loose from the underside.
        ctx.fillStyle = DUST;
        const seed = Math.floor(this.t * 16);
        ctx.fillRect(px + 2 + ((seed * 7) % (this.w - 4)), py + this.h + ((seed * 3) % 3), 1, 1);
      }
      this.drawBoard(ctx, px + ox, py, 1);
    } else if (this.state === 'falling') {
      // The two halves drop apart, fading as they go.
      const alpha = Math.max(0, 1 - this.timer / FALL);
      ctx.globalAlpha = alpha;
      const drop = Math.round(this.fallY);
      this.drawHalf(ctx, px, py + drop, 0);
      this.drawHalf(ctx, px + TILE, py + Math.round(this.fallY * 0.8) + 1, 1);
      ctx.globalAlpha = 1;
    } else {
      // Gone: the gap is honest — and dust gathers just before it returns.
      const until = REBUILD - this.timer;
      if (until < GATHER) {
        const p = 1 - until / GATHER; // 0..1 as the return nears
        ctx.fillStyle = DUST;
        for (let i = 0; i < 4; i++) {
          const a = this.t * 3 + (i * Math.PI) / 2;
          const r = (1 - p) * 10 + 2;
          ctx.globalAlpha = 0.3 + p * 0.6;
          ctx.fillRect(
            Math.round(px + this.w / 2 + Math.cos(a) * r),
            Math.round(py + 2 + Math.sin(a) * r * 0.4),
            1, 1,
          );
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  /** The whole board: rotten wood, lit top, copper nails, open cracks. */
  private drawBoard(ctx: CanvasRenderingContext2D, px: number, py: number, alpha: number): void {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = WOOD;
    ctx.fillRect(px, py, this.w, this.h - 1);
    ctx.fillStyle = WOOD_LIT;
    ctx.fillRect(px, py, this.w, 1);
    ctx.fillStyle = WOOD_DARK;
    // A ragged underside and two open cracks: this wood is DONE.
    ctx.fillRect(px + 3, py + this.h - 2, 2, 1);
    ctx.fillRect(px + this.w - 6, py + this.h - 2, 3, 1);
    ctx.fillRect(px + 6, py + 1, 1, 3);
    ctx.fillRect(px + this.w - 5, py, 1, 3);
    ctx.fillStyle = NAIL;
    ctx.fillRect(px + 1, py + 1, 1, 1);
    ctx.fillRect(px + this.w - 2, py + 1, 1, 1);
    ctx.globalAlpha = 1;
  }

  /** One falling half (they part at the middle crack). */
  private drawHalf(ctx: CanvasRenderingContext2D, px: number, py: number, side: 0 | 1): void {
    ctx.fillStyle = WOOD;
    ctx.fillRect(px, py, TILE, this.h - 1);
    ctx.fillStyle = WOOD_LIT;
    ctx.fillRect(px, py, TILE, 1);
    ctx.fillStyle = WOOD_DARK;
    ctx.fillRect(px + (side === 0 ? TILE - 1 : 0), py, 1, this.h - 1);
  }
}
