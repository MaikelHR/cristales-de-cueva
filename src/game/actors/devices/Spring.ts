// ============================================================
//  RESORTE (aparato del escenario)
// ------------------------------------------------------------
//  Un fuelle de cristal apoyado en el piso: pisarlo (o caerle
//  encima) lanza al jugador mucho más alto que un salto. No es
//  sólido: la regla de lanzamiento vive en systems/devices.ts;
//  acá solo el estado visual (comprimirse al disparar) y el dibujo.
// ============================================================

import type { Box } from '../../../engine/canvas';
import type { Clock } from '../../clock';
import type { Actor } from '../Actor';
import { drawGlow } from '../../art/glow';

/** Velocidad vertical del lanzamiento (px/s): ~9 tiles de altura,
 *  bien por encima del salto normal (~4) y del doble (~7). */
export const SPRING_SPEED = 320;

const COMPRESS_TIME = 0.22; // segundos que se ve comprimido tras disparar

export class Spring implements Actor {
  readonly layer = 'device' as const;
  dead = false; // los resortes no mueren; el campo es parte de Actor
  readonly w = 6;
  readonly h = 4;
  x: number;
  y: number;
  private compressTimer = 0;

  constructor(px: number, py: number, private clock: Clock) {
    // Ocupa el tercio de abajo de su celda, centrado (un fuelle bajito).
    this.x = px + 1;
    this.y = py + 4;
  }

  /** La banda que dispara: pisarla con los pies lanza hacia arriba. */
  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  /** Efecto visual del disparo (el impulso lo aplica systems/devices). */
  trigger(): void {
    this.compressTimer = COMPRESS_TIME;
  }

  update(dt: number): void {
    this.compressTimer = Math.max(0, this.compressTimer - dt);
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const cx = Math.round(this.x + this.w / 2 - camX);
    const baseY = Math.round(this.y + this.h - camY); // apoyado en el piso
    const compressed = this.compressTimer > 0;
    // Respira: el fuelle se estira 1px con el reloj compartido, invitando
    // a pisarlo; comprimido queda a ras del piso un instante.
    const breathe = Math.sin(this.clock.t * 3 + this.x) > 0 ? 1 : 0;
    const coilH = compressed ? 1 : 3 + breathe;

    drawGlow(ctx, cx, baseY - 2, 10, '#7ce0ff', compressed ? 0.7 : 0.35);

    // Fuelle: peldaños alternados (zigzag insinuado con rectángulos).
    ctx.fillStyle = '#5f4790';
    for (let i = 0; i < coilH; i++) {
      const wob = i % 2 === 0 ? -1 : 1;
      ctx.fillRect(cx - 2 + wob, baseY - 1 - i, 4, 1);
    }
    // Plato superior iluminado: la parte que se pisa.
    ctx.fillStyle = '#7ce0ff';
    ctx.fillRect(cx - 3, baseY - 1 - coilH, 6, 1);
    ctx.fillStyle = '#f5fcff';
    ctx.fillRect(cx - 1, baseY - 1 - coilH, 2, 1);
  }
}
