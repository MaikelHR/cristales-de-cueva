// ============================================================
//  PLATAFORMA MÓVIL (aparato del escenario)
// ------------------------------------------------------------
//  Una losa de cristal que viaja en vaivén por un eje ('x' o 'y')
//  dentro de su rango. No forma parte de la grilla de colisión:
//  la regla de "pararse encima y viajar con ella" vive en
//  systems/devices.ts. Acá el movimiento (onda triangular, sin
//  acumulación de error) y el dibujo.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { TILE } from '../../world/Level';
import type { Actor } from '../Actor';
import { drawGlow } from '../../art/glow';

const DEFAULT_SPEED = 28; // px/s, cómodo para subirse en marcha

export class MovingPlatform implements Actor {
  readonly layer = 'device' as const;
  dead = false; // las plataformas no mueren; el campo es parte de Actor
  readonly w = TILE * 3;
  readonly h = 6;
  x: number;
  y: number;
  /** Cuánto se movió en el último paso (para llevar al pasajero). */
  dx = 0;
  dy = 0;
  /** ¿El jugador iba parado encima en el último paso? (lo marca systems). */
  rider = false;

  private readonly baseX: number;
  private readonly baseY: number;
  private readonly rangePx: number; // con signo: hacia dónde arranca
  private readonly speed: number;
  private t = 0;

  constructor(
    px: number,
    py: number,
    private readonly axis: 'x' | 'y',
    rangeTiles: number,
    speed?: number,
  ) {
    this.baseX = px;
    this.baseY = py + 1; // deja 1px de aire: se lee como losa flotante
    this.x = this.baseX;
    this.y = this.baseY;
    this.rangePx = rangeTiles * TILE;
    this.speed = speed ?? DEFAULT_SPEED;
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt: number): void {
    this.t += dt;
    // Onda triangular sobre el tiempo total: la posición es función de t,
    // así no se acumula error y el vaivén es perfectamente periódico.
    const span = Math.abs(this.rangePx);
    const period = (2 * span) / this.speed;
    const phase = (this.t % period) / period; // 0..1
    const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2; // 0..1..0
    const offset = tri * this.rangePx;
    const nx = this.axis === 'x' ? this.baseX + offset : this.baseX;
    const ny = this.axis === 'y' ? this.baseY + offset : this.baseY;
    this.dx = nx - this.x;
    this.dy = ny - this.y;
    this.x = nx;
    this.y = ny;
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const px = Math.round(this.x - camX);
    const py = Math.round(this.y - camY);
    drawGlow(ctx, px + this.w / 2, py + this.h / 2, 16, '#b98bff', 0.25);
    // Losa: cuerpo oscuro, tope iluminado (es donde se pisa) y base en sombra.
    ctx.fillStyle = '#3a2456';
    ctx.fillRect(px, py, this.w, this.h);
    ctx.fillStyle = '#8064b0';
    ctx.fillRect(px, py, this.w, 1);
    ctx.fillStyle = '#160b24';
    ctx.fillRect(px, py + this.h - 1, this.w, 1);
    // Gemas guía en las puntas: leen como "esto es tecnología de cristal".
    ctx.fillStyle = '#7ce0ff';
    ctx.fillRect(px + 1, py + 2, 2, 2);
    ctx.fillRect(px + this.w - 3, py + 2, 2, 2);
  }
}
