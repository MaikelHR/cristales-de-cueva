// ============================================================
//  UPDRAFT (stage device)
// ------------------------------------------------------------
//  A rock nozzle that exhales a column of air and spores.
//  ONLY pushes the player who GLIDES inside the column (hold
//  jump): releasing jump lets go of the wind. The rule lives in
//  systems/devices.ts; here the column's box and the drawing (motes
//  rising in a loop, deterministic over the shared clock).
// ============================================================

import type { Box } from '../../../engine/canvas';
import { TILE } from '../../world/Level';
import type { Clock } from '../../clock';
import type { Actor } from '../Actor';
import { drawGlow } from '../../art/glow';

/** Push acceleration (px/s²): must beat gravity (680). */
export const VENT_ACCEL = 1500;
/** Max rise speed inside the column (px/s). */
export const VENT_RISE = 88;

export class Vent implements Actor {
  readonly layer = 'device' as const;
  dead = false; // updrafts never die; the field is part of Actor
  x: number;
  y: number;
  readonly w = TILE;
  private readonly heightPx: number;
  private readonly baseY: number; // top of the nozzle (where the air is born)

  constructor(
    px: number,
    py: number,
    heightTiles: number,
    private clock: Clock,
  ) {
    this.x = px;
    this.baseY = py + TILE; // the air is born from the top of the nozzle cell
    this.heightPx = heightTiles * TILE;
    this.y = this.baseY - this.heightPx;
  }

  /** The full air column: from the nozzle upward. */
  box(): Box {
    return { x: this.x + 1, y: this.y, w: this.w - 2, h: this.heightPx };
  }

  update(): void {
    // Its animation is idle: reads the shared clock in draw().
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const time = this.clock.t;
    const cx = Math.round(this.x + this.w / 2 - camX);
    const baseY = this.baseY - camY;
    const topY = baseY - this.heightPx;

    // The column's veil: a faint wash over the whole shaft, so the
    // "air blows here" reads at a glance, not by guessing.
    const wash = ctx.createLinearGradient(0, topY, 0, baseY);
    wash.addColorStop(0, 'rgba(110, 224, 138, 0)');
    wash.addColorStop(1, 'rgba(110, 224, 138, 0.14)');
    ctx.fillStyle = wash;
    ctx.fillRect(cx - 4, topY, 9, this.heightPx);

    // Two current lines: streaks that TRAVEL up the column in
    // single file (the motion that gives away the air's direction).
    for (const side of [-2.5, 2.5]) {
      for (let k = 0; k < 4; k++) {
        const p = (time * 0.9 + k * 0.25 + (side > 0 ? 0.12 : 0)) % 1;
        const ly = baseY - 4 - p * (this.heightPx - 8);
        ctx.globalAlpha = (1 - p) * 0.35 + 0.08;
        ctx.fillStyle = '#a8ffd0';
        ctx.fillRect(Math.round(cx + side), Math.round(ly), 1, 4);
      }
    }

    // Spore motes, many and trailing: each with its own phase,
    // speed and sway — the column is ALIVE.
    for (let i = 0; i < 14; i++) {
      const p = (time * (0.5 + (i % 5) * 0.11) + i * 0.13) % 1;
      const my = baseY - 4 - p * (this.heightPx - 6);
      const sway = Math.sin(time * 2.4 + i * 2.1 + p * 6) * 3;
      ctx.globalAlpha = (1 - p) * 0.7 + 0.2;
      ctx.fillStyle = i % 2 === 0 ? '#d6ffe2' : '#a8ffd0';
      ctx.fillRect(Math.round(cx + sway), Math.round(my), 1, i % 3 === 0 ? 3 : 2);
      ctx.globalAlpha = 1;
    }

    // The nozzle: a mound of rock that EXHALES (pulses as it breathes).
    const puff = Math.sin(time * 3 + this.x) * 0.5 + 0.5;
    ctx.fillStyle = '#3a2456';
    ctx.fillRect(cx - 4, Math.round(baseY) - 3, 8, 3);
    ctx.fillStyle = '#8064b0';
    ctx.fillRect(cx - 3, Math.round(baseY) - 4, 6, 1);
    ctx.fillStyle = '#d6ffe2';
    ctx.fillRect(cx - 1, Math.round(baseY) - 4 - Math.round(puff), 2, 1);
    drawGlow(ctx, cx, baseY - 5, 10, '#6ee08a', 0.35 + puff * 0.2);
  }
}
