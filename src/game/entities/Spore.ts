// ============================================================
//  ESPORA (enemigo del Jardín)
// ------------------------------------------------------------
//  Flota apenas sobre el piso latiendo. Si el jugador se acerca, se
//  HINCHA (telegrafía con un temblor creciente) y ESTALLA en una nube
//  breve que daña. Se la puede pisar: un pisotón la revienta ANTES de
//  que suelte la nube (recompensa a quien la ve venir). Tras estallar,
//  muere. Dibujada con primitivas (bulbo bioluminiscente + nube).
// ============================================================

import type { Box } from '../../engine/canvas';
import { Level, TILE } from '../Level';
import { drawGlow } from '../art';
import type { Enemy } from './Enemy';

const DETECT = 40;       // px: distancia a la que empieza a hincharse
const SWELL_TIME = 0.9;  // segundos de hinchado antes de estallar
const CLOUD_TIME = 0.55; // segundos que dura la nube dañina
const CLOUD_R = 13;      // radio de la nube al estallar
const BOB_SPEED = 2.4;

export class Spore implements Enemy {
  x: number;
  y: number;
  readonly w = 8;
  readonly h = 8;
  dead = false;
  readonly stompable = true;
  readonly gooColors = ['#c8ff9a', '#7ad86a', '#e0ffc8'];

  private readonly spawnY: number;
  private t = Math.random() * Math.PI * 2;
  private swell = 0;       // 0..SWELL_TIME mientras se hincha
  private cloud = 0;       // >0 mientras la nube dañina está activa
  private cx = 0;          // centro de la nube al estallar
  private cy = 0;

  constructor(cellX: number, cellY: number, private level: Level) {
    this.x = cellX;
    this.y = cellY + (TILE - this.h);
    this.spawnY = this.y;
    void this.level;
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  /** Mientras la nube está activa, es una caja peligrosa alrededor del bulbo. */
  hazards(): Box[] {
    if (this.cloud <= 0) return [];
    return [{ x: this.cx - CLOUD_R, y: this.cy - CLOUD_R, w: CLOUD_R * 2, h: CLOUD_R * 2 }];
  }

  /** Pisotón: la revienta sin soltar nube (muere limpia). */
  onStomp(): boolean {
    this.dead = true;
    return true;
  }

  update(dt: number, target: { x: number; y: number }): void {
    this.t += dt;

    // Nube en curso: contar hacia abajo y morir al disiparse.
    if (this.cloud > 0) {
      this.cloud -= dt;
      if (this.cloud <= 0) this.dead = true;
      return;
    }

    this.y = this.spawnY + Math.sin(this.t * BOB_SPEED) * 1.5;

    // ¿El jugador está cerca? Se hincha; si no, se desinfla despacio.
    const dx = target.x - (this.x + this.w / 2);
    const dy = target.y - (this.y + this.h / 2);
    const near = Math.hypot(dx, dy) < DETECT;
    this.swell = near ? Math.min(SWELL_TIME, this.swell + dt) : Math.max(0, this.swell - dt * 0.6);

    if (this.swell >= SWELL_TIME) {
      // Estalla: fija la nube en el centro actual.
      this.cx = this.x + this.w / 2;
      this.cy = this.y + this.h / 2;
      this.cloud = CLOUD_TIME;
    }
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    if (this.cloud > 0) {
      // Nube expandiéndose que se desvanece.
      const p = 1 - this.cloud / CLOUD_TIME;
      const r = 4 + p * CLOUD_R;
      drawGlow(ctx, this.cx - camX, this.cy - camY, r, '#9cff7a', 0.5 * (1 - p));
      ctx.fillStyle = `rgba(160,255,140,${0.35 * (1 - p)})`;
      ctx.beginPath();
      ctx.arc(this.cx - camX, this.cy - camY, r, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const cx = Math.round(this.x + this.w / 2 - camX);
    const cy = Math.round(this.y + this.h / 2 - camY);
    // Temblor creciente conforme se hincha (telegrafía el estallido).
    const swellP = this.swell / SWELL_TIME;
    const shake = swellP > 0 ? Math.sin(this.t * 30) * swellP * 1.5 : 0;
    const r = 3 + swellP * 2;
    // Halo bioluminiscente que late más fuerte al hincharse.
    drawGlow(ctx, cx, cy, 8 + swellP * 6, '#9cff7a', 0.35 + swellP * 0.4);
    // Bulbo.
    ctx.fillStyle = swellP > 0.7 && Math.floor(this.t * 20) % 2 === 0 ? '#f0ffd8' : '#7ad86a';
    ctx.beginPath();
    ctx.arc(cx + shake, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Brillo cenital (arriba-izquierda).
    ctx.fillStyle = '#e0ffc8';
    ctx.fillRect(cx - 1 + Math.round(shake), cy - 2, 1, 1);
    // Tallo/esporas colgantes.
    ctx.fillStyle = '#4a8a3a';
    ctx.fillRect(cx - 1, cy + Math.round(r), 2, 2);
  }
}
