// ============================================================
//  MEDUSA (crystal jellyfish)
// ------------------------------------------------------------
//  Drifts up and down in the water on a slow, readable sine while its
//  bell breathes a big glow. It's a PURE hazard: touching it hurts and
//  NOTHING defeats it — not a stomp, not a pound (invulnerable). The
//  erizo escalated the slime by punishing a stomp; the medusa escalates
//  the erizo by being untouchable: you read its bob and route around it.
//  Drawn with primitives (bell + swaying tentacles), palette-consistent.
// ============================================================

import type { Box } from '../../engine/canvas';
import { TILE } from '../world/Level';
import { drawGlow } from '../art/glow';
import type { Enemy } from './enemies/Enemy';

const BOB_SPEED = 1.2;   // rad/s of the vertical drift (slow: predictable)
const PULSE_SPEED = 2.6; // rad/s of the bell + glow pulse

export class Medusa implements Enemy {
  readonly layer = 'enemy' as const;
  x: number;
  y: number;
  readonly w = 8;
  readonly h = 9;
  dead = false;
  readonly stompable = false;   // you can't stomp it...
  readonly invulnerable = true; // ...and a pound can't kill it either
  readonly gooColors = ['#7ce0ff', '#b98bff', '#d6f7ff'];

  private readonly baseY: number;
  private readonly amp: number; // bob amplitude in px
  private t: number;

  constructor(px: number, py: number, rangeTiles: number) {
    this.x = px;
    this.baseY = py;
    this.amp = rangeTiles * TILE;
    // Deterministic initial phase from position so a cluster doesn't
    // pulse in lockstep (no Math.random in data).
    this.t = (px * 0.7 + py * 0.3) % (Math.PI * 2);
    this.y = this.baseY;
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt: number): void {
    this.t += dt;
    this.y = this.baseY + Math.sin(this.t * BOB_SPEED) * this.amp;
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const cx = Math.round(this.x + this.w / 2 - camX);
    const topY = Math.round(this.y - camY);
    const pulse = Math.sin(this.t * PULSE_SPEED) * 0.5 + 0.5; // 0..1

    // The beacon: a big soft glow that breathes — "don't touch me".
    drawGlow(ctx, cx, topY + 3, 12 + pulse * 4, '#7ce0ff', 0.28 + pulse * 0.24);

    // Bell: a violet-teal dome that squashes as it pulses.
    const squash = Math.round(pulse);
    ctx.fillStyle = '#b98bff';
    ctx.fillRect(cx - 4, topY + 1 - squash, 8, 3 + squash);
    ctx.fillStyle = '#7ce0ff';
    ctx.fillRect(cx - 3, topY - squash, 6, 2);
    ctx.fillStyle = '#d6f7ff';
    ctx.fillRect(cx - 2, topY - 1 - squash, 4, 1); // top gleam
    // Rim under the bell.
    ctx.fillStyle = '#5a9fd4';
    ctx.fillRect(cx - 4, topY + 4, 8, 1);

    // Tentacles: wavy strands that sway out of phase.
    ctx.fillStyle = '#7ce0ff';
    for (let i = 0; i < 4; i++) {
      const tx = cx - 3 + i * 2;
      const sway = Math.round(Math.sin(this.t * 3 + i * 1.3) * 1.5);
      ctx.fillRect(tx + sway, topY + 5, 1, 2);
      ctx.fillRect(tx + Math.round(sway * 0.5), topY + 7, 1, 2);
    }
  }
}
