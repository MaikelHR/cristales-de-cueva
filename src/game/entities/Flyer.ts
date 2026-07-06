// ============================================================
//  VOLADOR (murciélago de cristal)
// ------------------------------------------------------------
//  Flota ignorando la gravedad: patrulla horizontal dentro de un
//  radio y cabecea con un seno. Daña al tocarlo; se lo puede pisar.
// ============================================================

import type { Box } from '../../engine/canvas';
import { Level, TILE } from '../Level';
import { sprites } from '../art';
import type { Enemy } from './Enemy';

const SPEED = 34;      // px/s horizontal
const RANGE = 44;      // px a cada lado del origen antes de girar
const BOB_AMP = 5;     // amplitud del cabeceo vertical
const BOB_SPEED = 3;   // rad/s del cabeceo

export class Flyer implements Enemy {
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
  private t = Math.random() * Math.PI * 2; // fase inicial variada

  constructor(cellX: number, cellY: number, private level: Level) {
    this.spawnX = cellX + (TILE - this.w) / 2;
    this.spawnY = cellY + 1;
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
    const flap = Math.floor(this.t * 6) % 2 === 0;
    const sprite = flap ? sprites.flyer1 : sprites.flyer2;
    const drawX = this.x + this.w / 2 - sprite.w / 2;
    const drawY = this.y + this.h / 2 - sprite.h / 2;
    sprite.drawOutlined(ctx, drawX - camX, drawY - camY, this.dir === 1);
  }
}
