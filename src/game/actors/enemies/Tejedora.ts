// ============================================================
//  TEJEDORA — the nest's hanging spider
// ------------------------------------------------------------
//  The first thing in the game that lives on the CEILING. It hangs
//  from its own thread, high and out of the way, until you cross the
//  air beneath it: then the thread TENSES and shivers (the tell) and
//  the spider DROPS, fast, straight down through the space you were
//  about to swing through. It hangs there a moment, then reels itself
//  back up. It is not a wall you fight, it is a beat you time — and
//  because it drops into the arc lane, it makes you release EARLY or
//  wait for the reel. One stomp on its back and it falls for good.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { Level, TILE } from '../../world/Level';
import { drawGlow } from '../../art/glow';
import type { Enemy } from './Enemy';

const WATCH_X = 22;    // px of horizontal window that triggers the drop
const TENSE = 0.5;     // seconds of shivering thread before it falls
const DROP_SPEED = 210; // px/s of the fall
const HANG = 0.8;      // seconds waiting at the bottom
const CLIMB_SPEED = 46; // px/s reeling back up
const REST = 0.7;      // seconds up top before it can drop again

const SILK = '#c9bcd8';
const SILK_LIT = '#e8e0f0';
const BODY = '#4a3a58';
const BODY_LIT = '#6b5580';
const EYES = '#ffb0d0';

type State = 'perched' | 'tense' | 'drop' | 'hang' | 'climb';

export class Tejedora implements Enemy {
  readonly layer = 'enemy' as const;
  x: number;
  y: number;
  readonly w = 10;
  readonly h = 8;
  dead = false;
  readonly stompable = true;
  readonly gooColors = ['#e8e0f0', '#4a3a58', '#ffb0d0'];

  /** Ceiling point its thread is tied to. */
  private readonly topY: number;
  /** How far down it drops (px). */
  private readonly reach: number;
  private state: State = 'perched';
  private timer = 0;
  private t = 0;

  constructor(px: number, py: number, private level: Level, dropTiles?: number) {
    this.x = px;
    this.topY = py;
    this.y = py;
    // No reach given = it pays out thread all the way to the FLOOR.
    // A spider that stops in mid-air above the lane you walk is just
    // scenery (playtest: "they don't reach me, so they do nothing").
    this.reach = dropTiles ? dropTiles * TILE : this.dropToFloor(px, py);
  }

  /** Thread long enough to put its feet on the ground below its perch. */
  private dropToFloor(px: number, py: number): number {
    const col = Math.floor((px + this.w / 2) / TILE);
    let row = Math.floor(py / TILE) + 1;
    while (row < this.level.rows && !this.level.solidCell(row, col)) row++;
    return Math.max(TILE * 2, row * TILE - py - 1);
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt: number, target: { x: number; y: number }): void {
    this.t += dt;
    this.timer += dt;
    const cx = this.x + this.w / 2;

    switch (this.state) {
      case 'perched': {
        // Watching. You crossing its column is what sets it off.
        if (this.timer >= REST && Math.abs(target.x - cx) < WATCH_X && target.y > this.topY) {
          this.state = 'tense';
          this.timer = 0;
        }
        break;
      }
      case 'tense': {
        if (this.timer >= TENSE) {
          this.state = 'drop';
          this.timer = 0;
        }
        break;
      }
      case 'drop': {
        this.y += DROP_SPEED * dt;
        // It stops at its reach — or sooner, if there's floor in the way.
        const feet = this.y + this.h;
        if (feet - this.topY >= this.reach || this.level.isSolidAt(cx, feet + 1)) {
          this.y = Math.min(this.y, this.topY + this.reach - this.h);
          this.state = 'hang';
          this.timer = 0;
        }
        break;
      }
      case 'hang': {
        if (this.timer >= HANG) {
          this.state = 'climb';
          this.timer = 0;
        }
        break;
      }
      case 'climb': {
        this.y -= CLIMB_SPEED * dt;
        if (this.y <= this.topY) {
          this.y = this.topY;
          this.state = 'perched';
          this.timer = 0;
        }
        break;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const px = Math.round(this.x - camX);
    const py = Math.round(this.y - camY);
    const topY = Math.round(this.topY - camY);
    const cx = px + this.w / 2;
    const tense = this.state === 'tense';

    // The thread it hangs by: it SHIVERS while tensing (the tell).
    for (let yy = 0; yy < py - topY; yy += 2) {
      const shake = tense ? Math.round(Math.sin(this.t * 40 + yy) * 1.5) : 0;
      ctx.fillStyle = tense ? SILK_LIT : SILK;
      ctx.fillRect(cx + shake, topY + yy, 1, 2);
    }

    if (tense) drawGlow(ctx, cx, py + 4, 12, EYES, 0.15 + (this.timer / TENSE) * 0.25);

    // Legs: eight of them, splayed wide; they tuck in during the fall.
    const tuck = this.state === 'drop' ? 2 : 0;
    const wiggle = Math.round(Math.sin(this.t * (tense ? 22 : 3)) * (tense ? 1 : 0.6));
    ctx.fillStyle = BODY;
    for (let i = 0; i < 4; i++) {
      const ly = py + 1 + i * 2;
      const span = 5 - tuck - Math.abs(i - 1.5);
      ctx.fillRect(px - span + 1, ly + wiggle, span, 1);
      ctx.fillRect(px + this.w - 1, ly - wiggle, span, 1);
    }

    // Body: a fat abdomen with a pale hourglass, and the eyes on top.
    ctx.fillStyle = BODY;
    ctx.fillRect(px + 1, py + 1, this.w - 2, this.h - 1);
    ctx.fillStyle = BODY_LIT;
    ctx.fillRect(px + 1, py + 1, this.w - 2, 2); // the back you stomp
    ctx.fillStyle = SILK_LIT;
    ctx.fillRect(cx - 1, py + 4, 2, 1);
    ctx.fillRect(cx - 2, py + 5, 4, 1);
    ctx.fillStyle = EYES;
    ctx.fillRect(px + 2, py + 2, 1, 1);
    ctx.fillRect(px + this.w - 3, py + 2, 1, 1);
    if (tense) {
      ctx.fillRect(px + 3, py + 3, 1, 1);
      ctx.fillRect(px + this.w - 4, py + 3, 1, 1);
    }
  }
}
