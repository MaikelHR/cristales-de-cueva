// ============================================================
//  CISTERNA — the water clock's tide (stage device)
// ------------------------------------------------------------
//  A tank that FILLS and EMPTIES on a fixed cycle. It owns a rectangle
//  of the map and rewrites its water cells as the surface climbs, one
//  NOTCH (one tile) at a time. The Level's water grid is read live by
//  the physics and by the tile renderer, so moving it moves everything
//  at once — swimming, floating, diving, the animated waterline — with
//  no special case anywhere else. That is the whole trick.
//
//  Moving in whole tiles is not a compromise, it's the identity: this
//  is a CLOCK, and it should tick. Every notch surges foam, throws
//  bubbles and drops a bronze note.
//
//  It telegraphs the way this repo demands, because a tide you can't
//  predict is just a trap: a bronze gauge runs up both walls of the
//  tank with a tick per notch, and a marker sits at the current level
//  pointing the way it's GOING — up while it fills, down while it
//  drains, still while it rests. You can read the next ten seconds
//  from across the room.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { TILE, type Level } from '../../world/Level';
import type { Actor } from '../Actor';
import { sfx } from '../../sfx';

// Shape of one cycle, as fractions of the period: it fills, holds full
// (the window to swim high), drains, and rests empty (the window to
// cross the floor). The holds are what make it playable — a triangle
// wave gives you a single frame at each end and reads as unfair.
const RISE = 0.34;
const FULL = 0.16;
const FALL = 0.34;
// (the remaining 0.16 is the empty hold)

const SPLASH = 0.4; // seconds of foam after a notch

const BRASS = '#8a6a2a';
const BRASS_LIT = '#e0be62';
const HELD = '#ffb84a';
const FOAM = '#dffbff';
const BUBBLE = 'rgba(190,244,255,0.75)';

export class Cisterna implements Actor {
  readonly layer = 'device' as const;
  dead = false; // the tide never dies; the field is part of Actor
  readonly x: number;
  readonly y: number;

  private readonly col0: number;
  private readonly colN: number;
  private readonly row0: number;
  private readonly rowN: number;
  /** Current surface ROW. row0 = brim full; row0+rowN = bone dry. */
  private surface: number;
  private t: number;
  private splash = 0;
  private dir: -1 | 0 | 1 = 0; // -1 draining, 1 filling, 0 resting
  /** Stopped by a compuerta: the water stays exactly where it was. */
  frozen = false;

  constructor(
    px: number,
    py: number,
    wTiles: number,
    hTiles: number,
    private readonly period: number,
    offset: number,
    private readonly level: Level,
  ) {
    this.x = px;
    this.y = py;
    this.col0 = Math.round(px / TILE);
    this.colN = wTiles;
    this.row0 = Math.round(py / TILE);
    this.rowN = hTiles;
    this.t = offset;
    this.surface = this.surfaceAt(this.t);
    this.apply();
  }

  /** The whole tank (systems don't use it; Actor asks for a box). */
  box(): Box {
    return { x: this.x, y: this.y, w: this.colN * TILE, h: this.rowN * TILE };
  }

  /** Where the surface sits at time t, in rows. Pure: the test reads it. */
  surfaceAt(t: number): number {
    const p = (((t % this.period) + this.period) % this.period) / this.period;
    let frac: number;
    if (p < RISE) frac = p / RISE;
    else if (p < RISE + FULL) frac = 1;
    else if (p < RISE + FULL + FALL) frac = 1 - (p - RISE - FULL) / FALL;
    else frac = 0;
    return this.row0 + this.rowN - Math.round(frac * this.rowN);
  }

  /** How full it is right now, 0..1 (the gauge and the tests read it). */
  get fill(): number {
    return (this.row0 + this.rowN - this.surface) / this.rowN;
  }

  /** The water line in world px (rooms are designed against this). */
  get surfaceY(): number {
    return this.surface * TILE;
  }

  /** The sluice throws the pin: the clock stops, or starts again. */
  toggleFreeze(): void {
    this.frozen = !this.frozen;
  }

  update(dt: number, target?: { x: number; y: number }): void {
    if (this.frozen) { this.dir = 0; if (this.splash > 0) this.splash -= dt; return; }
    this.t += dt;
    const next = this.surfaceAt(this.t);
    if (next !== this.surface) {
      this.dir = next < this.surface ? 1 : -1;
      this.surface = next;
      this.splash = SPLASH;
      this.apply();
      // Only the tank you are standing IN gets to tick. A room with three
      // of them fired four notches a second between the lot and the
      // metronome turned into a rattle — and worse, you could no longer
      // tell which gauge the sound belonged to.
      if (!target || this.nearTo(target.x)) sfx.tick();
    } else if (this.splash <= 0) {
      this.dir = 0;
    }
    if (this.splash > 0) this.splash -= dt;
  }

  /** Is that x inside this tank (with a tile of margin either side)? */
  private nearTo(px: number): boolean {
    return px >= (this.col0 - 1) * TILE && px <= (this.col0 + this.colN + 1) * TILE;
  }

  /** Writes the tank's water into the level grid. */
  private apply(): void {
    for (let r = this.row0; r < this.row0 + this.rowN; r++) {
      for (let c = this.col0; c < this.col0 + this.colN; c++) {
        this.level.setWet(r, c, r >= this.surface);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const left = Math.round(this.x - camX);
    const right = Math.round(this.x + this.colN * TILE - camX) - 1;
    const top = Math.round(this.y - camY);

    // The gauge: a brass rail up both walls with a tick per notch.
    for (const rail of [left, right]) {
      ctx.fillStyle = BRASS;
      ctx.fillRect(rail, top, 1, this.rowN * TILE);
      ctx.fillStyle = BRASS_LIT;
      for (let n = 0; n <= this.rowN; n++) {
        const y = top + n * TILE;
        ctx.fillRect(rail - (n % 5 === 0 ? 2 : 1), y, n % 5 === 0 ? 3 : 2, 1);
      }
    }

    // Frozen, the gauge goes amber: the level you see is the level that
    // stays, and that has to be legible without hunting for the valve.
    const held = this.frozen;
    // The marker, at the current notch, pointing where the tide is headed.
    const my = Math.round(this.surface * TILE - camY);
    ctx.fillStyle = held ? HELD : BRASS_LIT;
    for (const [rail, side] of [[left, 1], [right, -1]] as const) {
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(rail + side * (i + 1), my - 1 + (this.dir === 0 ? 0 : 0), 1, 3 - i);
      }
      if (this.dir !== 0) {
        // A tiny chevron above/below the marker: the direction, at a glance.
        const dy = this.dir === 1 ? -3 : 3;
        ctx.fillRect(rail + side, my + dy, 1, 1);
        ctx.fillRect(rail + side * 2, my + dy - this.dir, 1, 1);
      }
    }

    // The tide's DIRECTION, repeated along the waterline itself. The
    // gauge rails live at the tank's two edges, and in a tank forty
    // columns wide both of them are off-screen exactly where you have to
    // decide — so the surface carries its own reading: chevrons pointing
    // the way it is going, and amber pins when a valve is holding it.
    if (this.surface < this.row0 + this.rowN) {
      const held = this.frozen;
      ctx.fillStyle = held ? HELD : BRASS_LIT;
      for (let c = 4; c < this.colN; c += 10) {
        const x = left + c * TILE + 4;
        if (held) {
          ctx.fillRect(x - 2, my - 3, 5, 1);
          ctx.fillRect(x, my - 5, 1, 2);
        } else if (this.dir !== 0) {
          const up = this.dir === 1;
          const y = my - (up ? 5 : 2);
          ctx.fillRect(x - 1, y + (up ? 2 : 0), 3, 1);
          ctx.fillRect(x, y + (up ? 0 : 2), 1, 1);
          ctx.fillRect(x - 2, y + (up ? 3 : -1), 5, 1);
        }
      }
    }

    // Foam and bubbles on the notch itself: the tick you SEE.
    if (this.splash > 0 && this.surface < this.row0 + this.rowN) {
      const k = this.splash / SPLASH;
      ctx.globalAlpha = k;
      ctx.fillStyle = FOAM;
      for (let c = 0; c < this.colN; c++) {
        const x = left + c * TILE + ((c * 5) % TILE);
        ctx.fillRect(x, my - (this.dir === 1 ? 1 : 0), 2, 1);
      }
      ctx.fillStyle = BUBBLE;
      for (let i = 0; i < this.colN; i += 2) {
        const x = left + i * TILE + ((i * 3) % TILE);
        ctx.fillRect(x, my + Math.round((1 - k) * 6) + 2, 1, 1);
      }
      ctx.globalAlpha = 1;
    }
  }
}
