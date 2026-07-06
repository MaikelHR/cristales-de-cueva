// ============================================================
//  EL FUNDIDOR — Jefe de Las Forjas de Escoria
// ------------------------------------------------------------
//  Un coloso de basalto y escoria que EMBISTE. Ciclo claro y
//  telegrafiado:
//    1) ACECHA: se mece mirando al jugador.
//    2) TELEGRAFÍA: se planta, tiembla y destella (aviso de carga).
//    3) EMBISTE: se lanza en horizontal a toda velocidad.
//    4) Al chocar contra la pared: ATURDIDO (ventana para pisarlo) y
//       suelta una ONDA EXPANSIVA a ras del piso (dos cajas, una a cada
//       lado). Aguanta 3 pisotones, con invulnerabilidad entre cada uno.
//  Mientras viva, la puerta no abre. Dibujado con primitivas.
// ============================================================

import type { Box } from '../../engine/canvas';
import { Level, TILE } from '../Level';
import { drawGlow } from '../art';
import type { Enemy } from './Enemy';

const MAX_HP = 3;
const STALK_TIME = 1.4;     // segundos acechando antes de telegrafiar
const TELEGRAPH_TIME = 0.7; // aviso antes de embestir
const CHARGE_SPEED = 190;   // px/s de la embestida
const STUN_TIME = 1.3;      // aturdido tras chocar (ventana de pisotón)
const HIT_INVULN = 0.7;     // i-frames tras un pisotón
const SHOCK_TIME = 0.35;    // duración de la onda expansiva
const SHOCK_REACH = 34;     // alcance de la onda a cada lado
const BOB_AMP = 3;

type Phase = 'stalk' | 'telegraph' | 'charge' | 'stunned';

export class Fundidor implements Enemy {
  x: number;
  y: number;
  readonly w = 20;
  readonly h = 18;
  dead = false;
  readonly isBoss = true;
  readonly gooColors = ['#ff8a2a', '#ffd23a', '#7a2408'];
  hp = MAX_HP;

  // No es pisable de costado durante la carga; solo cuando está aturdido.
  // Exponemos stompable dinámico vía getter.
  get stompable(): boolean {
    return this.phase === 'stunned';
  }

  private readonly floorY: number;
  private phase: Phase = 'stalk';
  private timer = STALK_TIME;
  private dir: 1 | -1 = -1;
  private t = 0;
  private invuln = 0;
  private shock = 0;        // >0 mientras la onda expansiva daña
  private facingTarget: 1 | -1 = -1;

  constructor(cellX: number, cellY: number, private level: Level) {
    this.x = cellX;
    // Anclado al piso de su celda.
    this.y = cellY + (TILE - this.h);
    this.floorY = this.y;
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  hazards(): Box[] {
    if (this.shock <= 0) return [];
    // Dos cajas a ras del piso, una a cada lado del cuerpo.
    const baseY = this.y + this.h - 6;
    const p = this.shock / SHOCK_TIME; // 1 -> 0
    const reach = SHOCK_REACH * (1 - p) + 6;
    return [
      { x: this.x - reach, y: baseY, w: reach, h: 6 },
      { x: this.x + this.w, y: baseY, w: reach, h: 6 },
    ];
  }

  /** Solo lo derrota (o daña) el pisotón cuando está ATURDIDO. */
  onStomp(): boolean {
    if (this.phase !== 'stunned' || this.invuln > 0) return false;
    this.hp--;
    this.invuln = HIT_INVULN;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  update(dt: number, target: { x: number; y: number }): void {
    this.t += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.shock = Math.max(0, this.shock - dt);
    this.timer -= dt;

    const cx = this.x + this.w / 2;

    switch (this.phase) {
      case 'stalk': {
        // Se mece y mira al jugador.
        this.facingTarget = target.x < cx ? -1 : 1;
        this.dir = this.facingTarget;
        this.y = this.floorY + Math.sin(this.t * 2) * BOB_AMP;
        if (this.timer <= 0) {
          this.phase = 'telegraph';
          this.timer = TELEGRAPH_TIME;
        }
        break;
      }
      case 'telegraph': {
        // Plantado, temblando: el aviso. Fija la dirección de la embestida.
        this.y = this.floorY;
        if (this.timer <= 0) {
          this.phase = 'charge';
          this.dir = this.facingTarget;
        }
        break;
      }
      case 'charge': {
        this.y = this.floorY;
        const next = this.x + this.dir * CHARGE_SPEED * dt;
        // ¿Pared adelante? (mira a la altura media, por delante del morro)
        const aheadX = this.dir === 1 ? next + this.w + 1 : next - 1;
        const wall = this.level.isSolidAt(aheadX, this.y + this.h / 2);
        if (wall) {
          // Choca: aturdido + onda expansiva.
          this.phase = 'stunned';
          this.timer = STUN_TIME;
          this.shock = SHOCK_TIME;
        } else {
          this.x = next;
        }
        break;
      }
      case 'stunned': {
        // Sacudida de aturdimiento; vuelve a acechar al terminar.
        this.y = this.floorY + Math.sin(this.t * 24) * 1;
        if (this.timer <= 0) {
          this.phase = 'stalk';
          this.timer = STALK_TIME;
        }
        break;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y - camY);
    const cx = x + this.w / 2;

    // Onda expansiva (detrás del cuerpo).
    if (this.shock > 0) {
      const p = 1 - this.shock / SHOCK_TIME;
      const reach = SHOCK_REACH * p;
      const baseY = y + this.h - 3;
      ctx.fillStyle = `rgba(255,170,60,${0.5 * (1 - p)})`;
      ctx.fillRect(x - reach, baseY, reach, 3);
      ctx.fillRect(x + this.w, baseY, reach, 3);
      drawGlow(ctx, x - reach, baseY, 6, '#ffb03a', 0.4 * (1 - p));
      drawGlow(ctx, x + this.w + reach, baseY, 6, '#ffb03a', 0.4 * (1 - p));
    }

    // Temblor durante la telegrafía o el aturdimiento.
    const shakeX =
      this.phase === 'telegraph'
        ? Math.sin(this.t * 40) * 1.5
        : this.phase === 'stunned'
          ? Math.sin(this.t * 24) * 1
          : 0;
    const bx = Math.round(x + shakeX);

    // Aura de calor pulsante; roja intensa al telegrafiar.
    const hot = this.phase === 'telegraph';
    const pulse = 0.35 + Math.sin(this.t * (hot ? 12 : 4)) * 0.15;
    drawGlow(ctx, cx, y + this.h / 2, 26, hot ? '#ff5a2a' : '#ff8a2a', pulse);

    const flashing = this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0;
    const stunned = this.phase === 'stunned';

    // Cuerpo: bloque de basalto con vetas de escoria incandescente.
    ctx.fillStyle = flashing ? '#ffffff' : stunned ? '#4a2a1a' : '#2a1810';
    ctx.fillRect(bx, y, this.w, this.h);
    if (!flashing) {
      // Cara superior iluminada (luz cenital).
      ctx.fillStyle = '#5a3420';
      ctx.fillRect(bx, y, this.w, 3);
      // Vetas de lava (más brillantes al telegrafiar).
      ctx.fillStyle = hot ? '#ffd23a' : '#ff8a2a';
      ctx.fillRect(bx + 3, y + 6, this.w - 6, 2);
      ctx.fillRect(bx + 5, y + 11, this.w - 10, 2);
      // Ojos: dos brasas mirando en la dirección de la carga.
      const eo = this.dir === 1 ? 2 : -2;
      ctx.fillStyle = stunned ? '#8a5a3a' : '#ffe25a';
      ctx.fillRect(bx + 5 + eo, y + 4, 3, 2);
      ctx.fillRect(bx + this.w - 8 + eo, y + 4, 3, 2);
      // Aturdido: estrellitas girando arriba.
      if (stunned) {
        ctx.fillStyle = '#ffe25a';
        const a = this.t * 6;
        for (let i = 0; i < 3; i++) {
          const sa = a + (i * Math.PI * 2) / 3;
          ctx.fillRect(
            Math.round(cx + Math.cos(sa) * 7) - 1,
            Math.round(y - 3 + Math.sin(sa) * 2) - 1,
            2,
            2,
          );
        }
      }
    }

    // Pips de vida sobre la cabeza.
    for (let i = 0; i < MAX_HP; i++) {
      ctx.fillStyle = i < this.hp ? '#ff8a2a' : '#4a2e2a';
      ctx.fillRect(cx - 8 + i * 6, y - 6, 4, 2);
    }
  }
}
