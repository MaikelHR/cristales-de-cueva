// ============================================================
//  CAZADOR (bola con púas que persigue)
// ------------------------------------------------------------
//  Patrulla lento como el slime, pero si el jugador se acerca se
//  lanza hacia él, acelerando. Nunca se cae ni atraviesa paredes:
//  gira en los bordes incluso persiguiendo. Se lo puede pisar.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { frameAt } from '../../../engine/animation';
import { Level, TILE } from '../../world/Level';
import { sprites } from '../../art/sprites';
import type { Enemy } from './Enemy';

const PATROL_SPEED = 20; // px/s cuando no ve al jugador
const CHASE_SPEED = 60;  // px/s cuando persigue
const DETECT_X = 92;     // rango horizontal de detección
const DETECT_Y = 40;     // tolerancia vertical de detección

export class Chaser implements Enemy {
  readonly layer = 'enemy' as const;
  x: number;
  y: number;
  readonly w = 8;
  readonly h = 7;
  dead = false;
  readonly stompable = true;
  readonly gooColors = ['#ff5a7a', '#b83a5a', '#ff9a5a'];

  private dir: 1 | -1 = -1;
  private animTime = 0;

  constructor(px: number, py: number, private level: Level) {
    this.x = px;
    this.y = py + (TILE - this.h);
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt: number, target: { x: number; y: number }): void {
    const dx = target.x - (this.x + this.w / 2);
    const dy = Math.abs(target.y - this.y);
    const chasing = Math.abs(dx) < DETECT_X && dy < DETECT_Y;
    let speed = PATROL_SPEED;
    if (chasing) {
      this.dir = (dx < 0 ? -1 : 1) as 1 | -1;
      speed = CHASE_SPEED;
    }

    const next = this.x + this.dir * speed * dt;
    const aheadX = this.dir === 1 ? next + this.w : next;
    const wall = this.level.isSolidAt(aheadX, this.y + this.h / 2);
    const footX = this.dir === 1 ? next + this.w + 1 : next - 1;
    const floor = this.level.isSolidAt(footX, this.y + this.h + 1);
    if (wall || !floor) {
      this.dir = (this.dir * -1) as 1 | -1;
    } else {
      this.x = next;
    }
    this.animTime += dt * (chasing ? 2 : 1); // patea más rápido persiguiendo
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const sprite = frameAt([sprites.chaser1, sprites.chaser2], 8, this.animTime);
    const drawX = this.x + this.w / 2 - sprite.w / 2;
    const drawY = this.y + this.h - sprite.h;
    sprite.draw(ctx, drawX - camX, drawY - camY, this.dir === 1);
  }
}
