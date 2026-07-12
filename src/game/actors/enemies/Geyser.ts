// ============================================================
//  GÉISER DE FUEGO (peligro del escenario)
// ------------------------------------------------------------
//  Una boquilla de piedra clavada en el piso que entra en erupción
//  en ciclo fijo: quieto -> chisporrotea (el aviso) -> columna de
//  llama de 4 tiles. No es un bicho pero vive en la capa 'enemy'
//  porque su llama daña vía hazards(), igual que un proyectil: cero
//  reglas nuevas. No se lo puede pisar ni matar; pasarlo es cuestión
//  de LEER su ritmo. `offset` desfasa el ciclo entre géiseres.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { TILE } from '../../world/Level';
import { drawGlow } from '../../art/glow';
import type { Enemy } from './Enemy';

const QUIET = 2.1;  // segundos en reposo (la ventana para pasar)
const WARN = 0.55;  // chisporroteo de aviso
const ERUPT = 0.9;  // erupción
const PERIOD = QUIET + WARN + ERUPT;
const FLAME_H = 4 * TILE; // la columna sube 4 tiles desde la boquilla

export class Geyser implements Enemy {
  readonly layer = 'enemy' as const;
  x: number;
  y: number;
  readonly w = TILE;
  readonly h = TILE;
  dead = false; // nunca muere: es piedra
  readonly stompable = false;
  readonly gooColors = ['#ff9a3a', '#ffd23a', '#ffe8c0'];

  private t: number;

  constructor(px: number, py: number, offset = 0) {
    this.x = px;
    this.y = py;
    this.t = offset;
  }

  /** El cuerpo no daña (se camina por encima de la boquilla quieta):
   *  la caja vive fuera del mundo y TODO el daño va por hazards(). */
  box(): Box {
    return { x: -99, y: -99, w: 0, h: 0 };
  }

  private phase(): { state: 'quiet' | 'warn' | 'erupt'; p: number } {
    const c = this.t % PERIOD;
    if (c < QUIET) return { state: 'quiet', p: c / QUIET };
    if (c < QUIET + WARN) return { state: 'warn', p: (c - QUIET) / WARN };
    return { state: 'erupt', p: (c - QUIET - WARN) / ERUPT };
  }

  hazards(): Box[] {
    if (this.phase().state !== 'erupt') return [];
    return [{ x: this.x + 1, y: this.y - FLAME_H, w: this.w - 2, h: FLAME_H + 4 }];
  }

  update(dt: number): void {
    this.t += dt;
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const px = Math.round(this.x - camX);
    const py = Math.round(this.y - camY);
    const cx = px + this.w / 2;
    const { state, p } = this.phase();

    // La boquilla: un anillo de piedra oscura con la boca al rojo.
    ctx.fillStyle = '#38180c';
    ctx.fillRect(px, py + 4, this.w, 4);
    ctx.fillStyle = '#4e2814';
    ctx.fillRect(px + 1, py + 3, this.w - 2, 2);
    ctx.fillStyle = state === 'quiet' ? '#7a3416' : '#ff9a3a';
    ctx.fillRect(px + 2, py + 3, this.w - 4, 1);

    if (state === 'warn') {
      // Chispas que saltan de la boca: "apártate".
      drawGlow(ctx, cx, py + 2, 8, '#ffb03a', 0.3 + p * 0.3);
      ctx.fillStyle = '#ffd23a';
      for (let i = 0; i < 3; i++) {
        const sx = cx - 2 + ((i * 3 + Math.floor(this.t * 14)) % 5);
        const sy = py + 1 - ((Math.floor(this.t * 20) + i * 2) % 4);
        ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
      }
    } else if (state === 'erupt') {
      // La columna: núcleo claro, lenguas que serpentean, glow fuerte.
      const topY = py - FLAME_H;
      drawGlow(ctx, cx, py - FLAME_H / 2, 18, '#ff9a3a', 0.55);
      for (let yy = 0; yy < FLAME_H; yy += 2) {
        const wob = Math.sin(this.t * 18 + yy * 0.5) > 0 ? 1 : -1;
        const taper = yy < 6 ? 0 : yy > FLAME_H - 8 ? 2 : 1;
        ctx.fillStyle = '#ff7a2a';
        ctx.fillRect(px + 1 + taper, topY + yy, this.w - 2 - taper * 2, 2);
        ctx.fillStyle = '#ffd23a';
        ctx.fillRect(Math.round(cx - 1 + wob * (taper === 0 ? 1 : 0)), topY + yy, 2, 2);
      }
      ctx.fillStyle = '#ffe8c0';
      ctx.fillRect(Math.round(cx) - 1, py - 6, 2, 5);
      // La punta parpadea al morir la erupción.
      if (p > 0.75) {
        ctx.fillStyle = '#ff7a2a';
        ctx.fillRect(Math.round(cx), topY - 2, 1, 2);
      }
    }
  }
}
