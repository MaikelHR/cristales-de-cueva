// ============================================================
//  COMPUERTA — the sluice that stops the clock (stage device)
// ------------------------------------------------------------
//  A bronze valve wheel bolted to the tank wall. AZOTARLA (the ground
//  pound: the only verb in the game that hits DOWNWARD onto a thing you
//  are standing over) drops its pin and the cistern it feeds FREEZES
//  where it is — mid-fill, brim full, half empty, wherever you caught
//  it. Pound it again and the clock resumes.
//
//  That is the whole second half of the level: up to here the tide was
//  a rhythm you obeyed, and from here it is a height you CHOOSE. The
//  puzzles stop being "wait for the right moment" and become "leave the
//  water where you'll need it, then go around and use it".
//
//  It telegraphs its two states the way this repo demands: running, the
//  wheel TURNS (and turns faster the faster the water is moving);
//  locked, it stops dead, the pin bites and the whole thing glows amber.
//  A device whose state you can't read from across the room is a trap.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { TILE } from '../../world/Level';
import type { Actor } from '../Actor';
import { drawGlow } from '../../art/glow';
import { sfx } from '../../sfx';
import type { Cisterna } from './Cisterna';

const BRASS = '#8a6a2a';
const BRASS_LIT = '#e0be62';
const PIN_LOCKED = '#ffb84a';
const PIN_FREE = '#5fd0c0';

export class Compuerta implements Actor {
  readonly layer = 'device' as const;
  dead = false; // valves never die; the field is part of Actor
  readonly x: number;
  readonly y: number;
  /** The tank it commands. Room.ts links it after building the actors. */
  tank: Cisterna | null = null;
  /** Seconds before it can be thrown again (one pound = one throw). */
  private cooldown = 0;
  private spin = 0;

  constructor(px: number, py: number) {
    this.x = px;
    this.y = py;
  }

  /** The wheel: a full tile, so a dive lands on it without pixel-hunting. */
  box(): Box {
    return { x: this.x, y: this.y, w: TILE, h: TILE };
  }

  get locked(): boolean {
    return this.tank?.frozen ?? false;
  }

  /** Thrown by systems/devices when a pounding player lands on it. */
  throwIt(): boolean {
    if (this.cooldown > 0 || !this.tank) return false;
    this.tank.toggleFreeze();
    this.cooldown = 0.35;
    sfx.snap();
    return true;
  }

  update(dt: number): void {
    if (this.cooldown > 0) this.cooldown -= dt;
    // The wheel turns with the water it lets through, and stops when locked.
    if (!this.locked) this.spin += dt * 2.4;
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const px = Math.round(this.x - camX);
    const py = Math.round(this.y - camY);
    const cx = px + 4;
    const cy = py + 4;
    const locked = this.locked;

    drawGlow(ctx, cx, cy, locked ? 13 : 10, locked ? PIN_LOCKED : PIN_FREE, locked ? 0.55 : 0.4);

    // A post rising from the platform with the wheel on top. It draws
    // TALLER than its box on purpose: an 8px pin on a ledge is a thing
    // nobody notices, and this is the key to half the level.
    ctx.fillStyle = '#3a2e18';
    ctx.fillRect(px + 3, py + 6, 2, 8);
    ctx.fillStyle = BRASS;
    ctx.fillRect(px + 2, py + 12, 4, 2);
    ctx.fillStyle = '#3a2e18';
    ctx.fillRect(px, py + 1, 8, 6);

    // The wheel: four spokes rotating (two positions is enough at 8px —
    // any more and it just reads as flicker).
    const step = Math.floor(this.spin) % 2;
    ctx.fillStyle = BRASS;
    ctx.fillRect(px + 1, cy - 1, 6, 2);
    ctx.fillRect(cx - 1, py + 1, 2, 6);
    ctx.fillStyle = BRASS_LIT;
    if (step === 0) {
      ctx.fillRect(px + 1, cy - 1, 2, 1);
      ctx.fillRect(px + 5, cy, 2, 1);
    } else {
      ctx.fillRect(cx - 1, py + 1, 1, 2);
      ctx.fillRect(cx, py + 5, 1, 2);
    }

    // The pin: bitten and amber when locked, loose and cold when running.
    ctx.fillStyle = locked ? PIN_LOCKED : PIN_FREE;
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
    if (locked) {
      ctx.fillRect(px + 3, py, 2, 1);
      ctx.fillRect(px + 3, py + 7, 2, 1);
    }
  }
}
