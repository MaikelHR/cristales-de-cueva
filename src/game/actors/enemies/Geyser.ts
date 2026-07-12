// ============================================================
//  FIRE GEYSER (stage hazard)
// ------------------------------------------------------------
//  A stone nozzle set in the floor that erupts on a fixed cycle:
//  idle -> sputters (the warning) -> a 4-tile flame column. It's not
//  a creature but lives in the 'enemy' layer because its flame hurts
//  via hazards(), just like a projectile: zero new rules. It can't be
//  stomped or killed; getting past it is about READING its rhythm.
//  `offset` staggers the cycle between geysers.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { TILE } from '../../world/Level';
import { drawGlow } from '../../art/glow';
import type { Enemy } from './Enemy';

const QUIET = 2.1;  // seconds at rest (the window to get past)
const WARN = 0.55;  // warning sputter
const ERUPT = 0.9;  // eruption
const PERIOD = QUIET + WARN + ERUPT;
const FLAME_H = 4 * TILE; // the column rises 4 tiles from the nozzle

export class Geyser implements Enemy {
  readonly layer = 'enemy' as const;
  x: number;
  y: number;
  readonly w = TILE;
  readonly h = TILE;
  dead = false; // never dies: it's stone
  readonly stompable = false;
  readonly gooColors = ['#ff9a3a', '#ffd23a', '#ffe8c0'];

  private t: number;

  constructor(px: number, py: number, offset = 0) {
    this.x = px;
    this.y = py;
    this.t = offset;
  }

  /** The body doesn't hurt (you walk over the idle nozzle): the box
   *  lives outside the world and ALL damage goes through hazards(). */
  box(): Box {
    return { x: -99, y: -99, w: 0, h: 0 };
  }

  private phase(): { state: 'quiet' | 'warn' | 'erupt'; p: number } {
    const c = this.t % PERIOD;
    if (c < QUIET) return { state: 'quiet', p: c / QUIET };
    if (c < QUIET + WARN) return { state: 'warn', p: (c - QUIET) / WARN };
    return { state: 'erupt', p: (c - QUIET - WARN) / ERUPT };
  }

  /** Eruption height envelope: races up, holds, dies back down. */
  private eruptHeight(p: number): number {
    const env = Math.min(1, p / 0.08, (1 - p) / 0.12);
    return Math.max(4, Math.round(FLAME_H * env));
  }

  hazards(): Box[] {
    const { state, p } = this.phase();
    if (state !== 'erupt') return [];
    // The hitbox follows the visual envelope, so the flame never hurts
    // taller than it draws (it used to pop to full height instantly).
    const h = this.eruptHeight(p);
    return [{ x: this.x + 1, y: this.y - h, w: this.w - 2, h: h + 4 }];
  }

  update(dt: number): void {
    this.t += dt;
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const px = Math.round(this.x - camX);
    const py = Math.round(this.y - camY);
    const cx = px + this.w / 2;
    const { state, p } = this.phase();

    // The nozzle: a ring of dark stone with a red-hot mouth.
    ctx.fillStyle = '#38180c';
    ctx.fillRect(px, py + 4, this.w, 4);
    ctx.fillStyle = '#4e2814';
    ctx.fillRect(px + 1, py + 3, this.w - 2, 2);
    ctx.fillStyle = state === 'quiet' ? '#7a3416' : '#ff9a3a';
    ctx.fillRect(px + 2, py + 3, this.w - 4, 1);
    if (state === 'quiet' && Math.floor(this.t * 3) % 4 === 0) {
      // A lone ember winks in the mouth: asleep, not dead.
      ctx.fillStyle = '#c1521f';
      ctx.fillRect(px + 3 + (Math.floor(this.t * 7) % 3), py + 3, 1, 1);
    }

    if (state === 'warn') {
      // Sparks jumping from the mouth: "step aside".
      drawGlow(ctx, cx, py + 2, 8, '#ffb03a', 0.3 + p * 0.3);
      ctx.fillStyle = '#ffd23a';
      for (let i = 0; i < 3; i++) {
        const sx = cx - 2 + ((i * 3 + Math.floor(this.t * 14)) % 5);
        const sy = py + 1 - ((Math.floor(this.t * 20) + i * 2) % 4);
        ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
      }
    } else if (state === 'erupt') {
      // The column is ALIVE: it races up, whips side to side (harder near
      // the flared crown), its shades scroll upward like flow, tongues lick
      // off the tip and embers drift alongside. The old straight two-tone
      // stripes read as a painted wall in playtests.
      const h = this.eruptHeight(p);
      const topY = py - h;
      drawGlow(ctx, cx, py - h / 2, 18, '#ff9a3a', 0.45 + Math.sin(this.t * 22) * 0.12);
      for (let yy = 0; yy < h; yy += 2) {
        const taper = yy < 6 ? 0 : yy > h - 8 ? 2 : 1; // flared crown, tight base
        const off = Math.round(Math.sin(this.t * 13 + yy * 0.55) * (taper === 0 ? 2 : 1));
        const band = (((yy - Math.floor(this.t * 23) * 2) % 8) + 8) % 8;
        ctx.fillStyle = band < 3 ? '#ff9a3a' : '#ff7a2a';
        ctx.fillRect(px + 1 + taper + off, topY + yy, this.w - 2 - taper * 2, 2);
        const core = Math.round(Math.sin(this.t * 17 + yy * 0.4) * (taper === 0 ? 2 : 1));
        ctx.fillStyle = '#ffd23a';
        ctx.fillRect(Math.round(cx - 1 + core), topY + yy, 2, 2);
      }
      // White-hot jet at the mouth, tongues licking off the crown.
      ctx.fillStyle = '#ffe8c0';
      ctx.fillRect(Math.round(cx) - 1, py - 6, 2, 5);
      ctx.fillStyle = '#ffd23a';
      for (let i = 0; i < 3; i++) {
        const seed = Math.floor(this.t * 12) + i * 7;
        ctx.fillRect(
          Math.round(cx - 3 + ((seed * 13) % 7)),
          Math.round(topY - 2 - ((seed * 5) % 6)),
          1, 2,
        );
      }
      // Stray embers drifting up alongside the column.
      ctx.fillStyle = '#ff9a3a';
      for (let i = 0; i < 2; i++) {
        const ph = (this.t * (0.9 + i * 0.35)) % 1;
        const ex = cx + (i === 0 ? -6 : 5) + Math.sin(this.t * 6 + i * 3) * 1.5;
        ctx.fillRect(Math.round(ex), Math.round(py - ph * (h + 6)), 1, 1);
      }
    }
  }
}
