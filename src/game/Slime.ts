// ============================================================
//  SLIME (enemigo simple)
// ------------------------------------------------------------
//  Camina de un lado a otro. Se da vuelta si choca una pared
//  o si llega al borde de la plataforma (para no caerse).
// ============================================================

import type { Box } from '../engine/canvas';
import { Level, TILE } from './Level';
import { sprites } from './art';

const SPEED = 26;

export class Slime {
  x: number;
  y: number;
  readonly w = 8;
  readonly h = 6;
  private dir: 1 | -1 = -1;
  private animTime = 0;

  constructor(cellX: number, cellY: number, private level: Level) {
    this.x = cellX;
    this.y = cellY + (TILE - this.h);
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt: number): void {
    const next = this.x + this.dir * SPEED * dt;
    // Pared adelante
    const aheadX = this.dir === 1 ? next + this.w : next;
    const wall = this.level.isSolidAt(aheadX, this.y + this.h / 2);
    // ¿Sigue habiendo piso adelante? (mira justo por delante de los pies)
    const footX = this.dir === 1 ? next + this.w + 1 : next - 1;
    const floor = this.level.isSolidAt(footX, this.y + this.h + 1);

    if (wall || !floor) {
      this.dir = (this.dir * -1) as 1 | -1;
    } else {
      this.x = next;
    }
    this.animTime += dt;
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    // Parpadea brevemente cada par de segundos
    const blink = this.animTime % 2.4 < 0.16;
    const sprite = blink ? sprites.slime2 : sprites.slime1;
    const drawX = this.x + this.w / 2 - sprite.w / 2;
    const drawY = this.y + this.h - sprite.h;
    sprite.draw(ctx, drawX - camX, drawY - camY, this.dir === 1);
  }
}
