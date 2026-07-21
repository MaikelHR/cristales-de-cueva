// ============================================================
//  ZAPATERO — the water strider that rides the tide
// ------------------------------------------------------------
//  The only thing alive in the water clock, and the tide owns it: it
//  skates ON THE SURFACE, so it goes up and down with the water and is
//  always exactly at the height where a floating player is. That is the
//  whole idea — the level's hazard sits in the level's mechanic instead
//  of being bolted on beside it.
//
//  It has two states, and the clock decides which:
//   - AFLOAT: it patrols its stretch of waterline, legs dimpling the
//     surface, and it hurts to touch. A plain stomp kills it (no hint
//     needed: it is the game's default verb).
//   - STRANDED: when its column runs dry it drops to the floor and lies
//     there twitching, dangerous to brush but going nowhere. Low tide
//     turns a patrol into a row of sitting ducks — and killing one is
//     how you get a heart back, which in this level is the only way.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { Level, TILE } from '../../world/Level';
import { drawGlow } from '../../art/glow';
import type { Enemy } from './Enemy';

const SPEED = 26;        // px/s skating (unhurried: it is read, not chased)
const GRAVITY = 520;     // px/s^2 while stranded and falling
const SKIM = 3;          // px of body sitting above the waterline
const BODY = '#3d5a52';
const BODY_LIT = '#7fd8c0';
const LEG = '#2a3f3a';
const EYE = '#ffe9a0';

export class Zapatero implements Enemy {
  readonly layer = 'enemy' as const;
  x: number;
  y: number;
  readonly w = 12;
  readonly h = 6;
  dead = false;
  readonly stompable = true;
  readonly gooColors = ['#7fd8c0', '#3d5a52', '#dffbff'];

  private readonly minX: number;
  private readonly maxX: number;
  private dir: 1 | -1 = 1;
  private vy = 0;
  private t = 0;
  private afloat = false;

  constructor(px: number, py: number, range: number, private level: Level) {
    this.x = px;
    this.y = py;
    this.minX = px - range * TILE;
    this.maxX = px + range * TILE;
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  /** Is it skating right now? (the drawing changes completely). */
  get onWater(): boolean {
    return this.afloat;
  }

  update(dt: number): void {
    this.t += dt;
    const cx = this.x + this.w / 2;
    const surface = this.level.waterSurfaceAt(cx);

    if (surface !== null) {
      // Afloat: it sits ON the line, wherever the clock has put it, and
      // skates its stretch. Snapping straight to the surface is right —
      // the water arrives in whole-tile notches and so does it.
      this.afloat = true;
      this.vy = 0;
      this.y = surface - this.h + SKIM;
      this.x += this.dir * SPEED * dt;
      if (this.x <= this.minX) { this.x = this.minX; this.dir = 1; }
      if (this.x >= this.maxX) { this.x = this.maxX; this.dir = -1; }
      // A wall stops it too (a tank's own gauge rail, a weir).
      if (this.level.isSolidAt(this.dir > 0 ? this.x + this.w + 1 : this.x - 1, this.y + this.h - 1)) {
        this.dir = this.dir > 0 ? -1 : 1;
      }
      return;
    }

    // Stranded: the water left, and so did its footing.
    this.afloat = false;
    this.vy = Math.min(this.vy + GRAVITY * dt, 300);
    const next = this.y + this.vy * dt;
    if (this.level.isSolidAt(cx, next + this.h)) {
      this.y = Math.floor((next + this.h) / TILE) * TILE - this.h;
      this.vy = 0;
    } else {
      this.y = next;
    }
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const px = Math.round(this.x - camX);
    const py = Math.round(this.y - camY);
    const beat = Math.sin(this.t * (this.afloat ? 6 : 14));

    // Legs: long and splayed on the water (with the dimples they press
    // into it), tucked and twitching when stranded.
    ctx.fillStyle = LEG;
    if (this.afloat) {
      const kick = Math.round(beat * 1.5);
      ctx.fillRect(px - 3, py + 2, 4, 1);
      ctx.fillRect(px - 4, py + 3 + kick, 2, 1);
      ctx.fillRect(px + this.w - 1, py + 2, 4, 1);
      ctx.fillRect(px + this.w + 2, py + 3 - kick, 2, 1);
      // the dimples its feet make on the surface
      ctx.fillStyle = 'rgba(223,251,255,0.5)';
      ctx.fillRect(px - 5, py + 5, 3, 1);
      ctx.fillRect(px + this.w + 2, py + 5, 3, 1);
    } else {
      const twitch = Math.round(beat);
      ctx.fillRect(px - 2, py + 4 + twitch, 3, 1);
      ctx.fillRect(px + this.w - 1, py + 4 - twitch, 3, 1);
    }

    drawGlow(ctx, px + this.w / 2, py + 3, 8, BODY_LIT, this.afloat ? 0.22 : 0.12);

    // Body: a long dark seed with a lit back.
    ctx.fillStyle = BODY;
    ctx.fillRect(px, py + 1, this.w, 4);
    ctx.fillRect(px + 1, py, this.w - 2, 1);
    ctx.fillStyle = BODY_LIT;
    ctx.fillRect(px + 2, py + 1, this.w - 4, 1);
    ctx.fillStyle = EYE;
    const front = this.dir > 0 ? px + this.w - 3 : px + 1;
    ctx.fillRect(front, py + 2, 2, 1);
  }
}
