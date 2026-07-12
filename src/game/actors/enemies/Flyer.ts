// ============================================================
//  FLYER (crystal bat)
// ------------------------------------------------------------
//  Floats ignoring gravity: patrols horizontally within a radius
//  and bobs with a sine. Hurts on contact; can be stomped.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { frameAt } from '../../../engine/animation';
import { Level, TILE } from '../../world/Level';
import { sprites } from '../../art/sprites';
import type { Enemy } from './Enemy';

const SPEED = 34;      // px/s horizontal
const RANGE = 44;      // px to each side of the origin before turning
const BOB_AMP = 5;     // vertical bob amplitude
const BOB_SPEED = 3;   // rad/s of the bob

export class Flyer implements Enemy {
  readonly layer = 'enemy' as const;
  x: number;
  y: number;
  readonly w = 7;
  readonly h = 6;
  dead = false;
  readonly stompable = true;
  readonly gooColors = ['#b98bff', '#7ce0ff', '#e9d6ff'];

  private readonly spawnX: number;
  private readonly spawnY: number;
  private dir: 1 | -1 = 1;
  private t = Math.random() * Math.PI * 2; // varied initial phase

  constructor(px: number, py: number, private level: Level) {
    this.spawnX = px + (TILE - this.w) / 2;
    this.spawnY = py + 1;
    this.x = this.spawnX;
    this.y = this.spawnY;
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt: number): void {
    this.t += dt;
    const next = this.x + this.dir * SPEED * dt;
    const aheadX = this.dir === 1 ? next + this.w : next;
    const wall = this.level.isSolidAt(aheadX, this.y + this.h / 2);
    if (wall || Math.abs(next - this.spawnX) > RANGE) {
      this.dir = (this.dir * -1) as 1 | -1;
    } else {
      this.x = next;
    }
    this.y = this.spawnY + Math.sin(this.t * BOB_SPEED) * BOB_AMP;
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const sprite = frameAt([sprites.flyer1, sprites.flyer2], 6, this.t);
    const drawX = this.x + this.w / 2 - sprite.w / 2;
    const drawY = this.y + this.h / 2 - sprite.h / 2;
    sprite.draw(ctx, drawX - camX, drawY - camY, this.dir === 1);
  }
}
