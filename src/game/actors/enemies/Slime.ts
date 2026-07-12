// ============================================================
//  SLIME (simple enemy)
// ------------------------------------------------------------
//  Walks back and forth. Turns around if it hits a wall or
//  reaches the edge of the platform (to avoid falling off).
// ============================================================

import type { Box } from '../../../engine/canvas';
import { Level, TILE } from '../../world/Level';
import { sprites } from '../../art/sprites';
import type { Enemy } from './Enemy';

const SPEED = 26;

export class Slime implements Enemy {
  readonly layer = 'enemy' as const;
  x: number;
  y: number;
  readonly w = 8;
  readonly h = 6;
  dead = false;
  readonly stompable = true;
  readonly gooColors = ['#5ce06a', '#33a843', '#beffc8'];
  private dir: 1 | -1 = -1;
  private animTime = 0;

  constructor(px: number, py: number, private level: Level) {
    this.x = px;
    this.y = py + (TILE - this.h);
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt: number): void {
    const next = this.x + this.dir * SPEED * dt;
    // Wall ahead
    const aheadX = this.dir === 1 ? next + this.w : next;
    const wall = this.level.isSolidAt(aheadX, this.y + this.h / 2);
    // Is there still floor ahead? (checks just in front of the feet)
    const footX = this.dir === 1 ? next + this.w + 1 : next - 1;
    const floor = this.level.isSolidAt(footX, this.y + this.h + 1);
    // Spikes ahead: treats them like an edge (nothing walks over spikes)
    const spikes = this.level.touchesSpike({ x: footX, y: this.y, w: 1, h: this.h + 2 });

    if (wall || !floor || spikes) {
      this.dir = (this.dir * -1) as 1 | -1;
    } else {
      this.x = next;
    }
    this.animTime += dt;
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    // Blinks briefly every couple of seconds
    const blink = this.animTime % 2.4 < 0.16;
    const sprite = blink ? sprites.slime2 : sprites.slime1;
    const drawX = this.x + this.w / 2 - sprite.w / 2;
    const drawY = this.y + this.h - sprite.h;
    sprite.draw(ctx, drawX - camX, drawY - camY, this.dir === 1);
  }
}
