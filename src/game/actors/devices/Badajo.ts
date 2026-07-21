// ============================================================
//  BADAJO — the swinging censer of the crypt (stage device)
// ------------------------------------------------------------
//  A bronze weight hanging from the vault on a rigid rod, swinging
//  forever on a fixed period. You RIDE it: its cap is a floor like any
//  moving platform's, one-way, and it carries whoever stands on it.
//
//  It is the crypt's own kind of movement, and it is deliberately the
//  mirror of the silk anchor: there YOU were the pendulum and the rope
//  obeyed your pumping; here the pendulum has its own beat and you are
//  the one who has to fit into it. Nothing to aim, nothing to charge —
//  just be standing on the cap at the right moment, and get off at the
//  right one.
//
//  Everything about it is readable in advance, which is the whole
//  requirement for a timed device: the rod is drawn full length so the
//  ARC is visible before you step on, it slows at the extremes the way
//  a real pendulum does (the sine does it for free), and the censer
//  breathes embers at each end of the swing so the turn has a beat you
//  can hear coming.
//  `arc` is its half-swing in tenths of a radian, `period` the seconds
//  of a full round trip, and `offset` staggers a row of them into a
//  wave — the same knobs as the geysers and the blink slabs.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { TILE } from '../../world/Level';
import type { Actor } from '../Actor';
import { drawGlow } from '../../art/glow';

const BRASS = '#8a6a2a';
const BRASS_LIT = '#e8c86a';
const CHAIN = '#6b6250';
const EMBER = '#ffb84a';

export class Badajo implements Actor {
  readonly layer = 'device' as const;
  dead = false; // it never stops; the field is part of Actor
  /** Head box (top-left), recomputed every step. */
  x = 0;
  y = 0;
  readonly w = TILE * 3;
  readonly h = TILE;
  /** How much it moved this step: the rider is carried by exactly this. */
  dx = 0;
  dy = 0;
  /** Set by systems/devices when someone is standing on the cap. */
  rider = false;

  private readonly ax: number;
  private readonly ay: number;
  private readonly len: number;
  private readonly arc: number;
  private readonly period: number;
  private t: number;
  private angle = 0;

  constructor(
    px: number,
    py: number,
    lengthTiles: number,
    arcTenths: number,
    period: number,
    offset: number,
  ) {
    this.ax = px + TILE / 2; // it hangs from the middle of its cell...
    this.ay = py + TILE;     // ...starting at the cell's bottom edge
    this.len = lengthTiles * TILE;
    this.arc = arcTenths / 10;
    this.period = period;
    this.t = offset;
    this.place();
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  /** Where the rod's tip is right now (the drawing and the tests read it). */
  get tip(): { x: number; y: number } {
    return {
      x: this.ax + Math.sin(this.angle) * this.len,
      y: this.ay + Math.cos(this.angle) * this.len,
    };
  }

  /** The angle at time t. Pure: the test reads the swing without a clock. */
  angleAt(t: number): number {
    return this.arc * Math.sin((2 * Math.PI * t) / this.period);
  }

  private place(): void {
    this.angle = this.angleAt(this.t);
    const tip = this.tip;
    this.x = tip.x - this.w / 2;
    this.y = tip.y - this.h / 2;
  }

  update(dt: number): void {
    const beforeX = this.x;
    const beforeY = this.y;
    this.t += dt;
    this.place();
    this.dx = this.x - beforeX;
    this.dy = this.y - beforeY;
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const ax = Math.round(this.ax - camX);
    const ay = Math.round(this.ay - camY);
    const tip = this.tip;
    const tx = Math.round(tip.x - camX);
    const ty = Math.round(tip.y - camY);

    // The bolt in the vault.
    ctx.fillStyle = BRASS;
    ctx.fillRect(ax - 3, ay - 3, 6, 3);
    ctx.fillStyle = BRASS_LIT;
    ctx.fillRect(ax - 2, ay - 3, 2, 1);

    // The rod: links drawn along the whole arc radius, so the swing you
    // are about to take is visible before you commit to it.
    const steps = Math.max(2, Math.round(this.len / 4));
    for (let i = 1; i < steps; i++) {
      const k = i / steps;
      const x = Math.round(ax + (tx - ax) * k);
      const y = Math.round(ay + (ty - ay) * k);
      ctx.fillStyle = i % 2 === 0 ? CHAIN : BRASS;
      ctx.fillRect(x, y, 1, 2);
    }

    // The censer: a bronze cap you can stand on, and its bowl beneath.
    const bx = Math.round(this.x - camX);
    const by = Math.round(this.y - camY);
    drawGlow(ctx, bx + this.w / 2, by + 6, 12, EMBER, 0.22);
    ctx.fillStyle = BRASS;
    ctx.fillRect(bx, by, this.w, this.h);
    ctx.fillStyle = BRASS_LIT;
    ctx.fillRect(bx, by, this.w, 1);
    ctx.fillRect(bx + 1, by + this.h - 1, this.w - 2, 1);
    ctx.fillStyle = '#4a3a18';
    ctx.fillRect(bx + 3, by + this.h, this.w - 6, 3);
    ctx.fillStyle = EMBER;
    ctx.fillRect(bx + 5, by + this.h + 1, 2, 1);
    ctx.fillRect(bx + this.w - 8, by + this.h + 2, 2, 1);

    // Embers shed at the ends of the swing: the turn, made audible-looking.
    const swinging = Math.abs(this.angle) > this.arc * 0.82;
    if (swinging) {
      ctx.fillStyle = EMBER;
      const drift = Math.sign(this.angle);
      ctx.fillRect(bx + this.w / 2 - drift * 5, by + this.h + 5, 1, 1);
      ctx.fillRect(bx + this.w / 2 - drift * 8, by + this.h + 8, 1, 1);
    }
  }
}
