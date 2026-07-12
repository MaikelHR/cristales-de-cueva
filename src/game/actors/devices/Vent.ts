// ============================================================
//  CORRIENTE ASCENDENTE (aparato del escenario)
// ------------------------------------------------------------
//  Una boquilla de roca que exhala una columna de aire y esporas.
//  SOLO empuja al jugador que PLANEA dentro de la columna (sostener
//  saltar): soltar saltar es soltarse del viento. La regla vive en
//  systems/devices.ts; acá la caja de la columna y el dibujo (motas
//  que suben en bucle, deterministas sobre el reloj compartido).
// ============================================================

import type { Box } from '../../../engine/canvas';
import { TILE } from '../../world/Level';
import type { Clock } from '../../clock';
import type { Actor } from '../Actor';
import { drawGlow } from '../../art/glow';

/** Aceleración del empuje (px/s²): debe ganarle a la gravedad (680). */
export const VENT_ACCEL = 1500;
/** Velocidad máxima de ascenso dentro de la columna (px/s). */
export const VENT_RISE = 88;

export class Vent implements Actor {
  readonly layer = 'device' as const;
  dead = false; // las corrientes no mueren; el campo es parte de Actor
  x: number;
  y: number;
  readonly w = TILE;
  private readonly heightPx: number;
  private readonly baseY: number; // tope de la boquilla (donde nace el aire)

  constructor(
    px: number,
    py: number,
    heightTiles: number,
    private clock: Clock,
  ) {
    this.x = px;
    this.baseY = py + TILE; // el aire nace del tope de la celda-boquilla
    this.heightPx = heightTiles * TILE;
    this.y = this.baseY - this.heightPx;
  }

  /** La columna de aire completa: de la boquilla hacia arriba. */
  box(): Box {
    return { x: this.x + 1, y: this.y, w: this.w - 2, h: this.heightPx };
  }

  update(): void {
    // Su animación es de reposo: lee el reloj compartido en draw().
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const time = this.clock.t;
    const cx = Math.round(this.x + this.w / 2 - camX);
    const baseY = this.baseY - camY;
    const topY = baseY - this.heightPx;

    // El velo de la columna: un lavado tenue de todo el conducto, para
    // que el "acá sopla aire" se lea de una mirada, no se adivine.
    const wash = ctx.createLinearGradient(0, topY, 0, baseY);
    wash.addColorStop(0, 'rgba(110, 224, 138, 0)');
    wash.addColorStop(1, 'rgba(110, 224, 138, 0.14)');
    ctx.fillStyle = wash;
    ctx.fillRect(cx - 4, topY, 9, this.heightPx);

    // Dos líneas de corriente: rayas que RECORREN la columna hacia
    // arriba en fila (el movimiento que delata la dirección del aire).
    for (const side of [-2.5, 2.5]) {
      for (let k = 0; k < 4; k++) {
        const p = (time * 0.9 + k * 0.25 + (side > 0 ? 0.12 : 0)) % 1;
        const ly = baseY - 4 - p * (this.heightPx - 8);
        ctx.globalAlpha = (1 - p) * 0.35 + 0.08;
        ctx.fillStyle = '#a8ffd0';
        ctx.fillRect(Math.round(cx + side), Math.round(ly), 1, 4);
      }
    }

    // Motas de espora, muchas y con estela: cada una con su fase,
    // su velocidad y su vaivén — la columna está VIVA.
    for (let i = 0; i < 14; i++) {
      const p = (time * (0.5 + (i % 5) * 0.11) + i * 0.13) % 1;
      const my = baseY - 4 - p * (this.heightPx - 6);
      const sway = Math.sin(time * 2.4 + i * 2.1 + p * 6) * 3;
      ctx.globalAlpha = (1 - p) * 0.7 + 0.2;
      ctx.fillStyle = i % 2 === 0 ? '#d6ffe2' : '#a8ffd0';
      ctx.fillRect(Math.round(cx + sway), Math.round(my), 1, i % 3 === 0 ? 3 : 2);
      ctx.globalAlpha = 1;
    }

    // La boquilla: un montículo de roca que EXHALA (late al respirar).
    const puff = Math.sin(time * 3 + this.x) * 0.5 + 0.5;
    ctx.fillStyle = '#3a2456';
    ctx.fillRect(cx - 4, Math.round(baseY) - 3, 8, 3);
    ctx.fillStyle = '#8064b0';
    ctx.fillRect(cx - 3, Math.round(baseY) - 4, 6, 1);
    ctx.fillStyle = '#d6ffe2';
    ctx.fillRect(cx - 1, Math.round(baseY) - 4 - Math.round(puff), 2, 1);
    drawGlow(ctx, cx, baseY - 5, 10, '#6ee08a', 0.35 + puff * 0.2);
  }
}
