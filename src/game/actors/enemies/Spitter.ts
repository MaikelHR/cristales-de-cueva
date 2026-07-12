// ============================================================
//  ESPORERO (hongo centinela)
// ------------------------------------------------------------
//  No camina: vigila su parcela. Cuando el jugador entra en rango
//  se INFLA (el aviso) y escupe una espora en arco hacia él; la
//  espora cae con su propia gravedad y revienta al tocar roca.
//  Se lo puede pisar. Se dibuja con primitivas (tallo + sombrero).
// ============================================================

import type { Box } from '../../../engine/canvas';
import { Level, TILE } from '../../world/Level';
import { drawGlow } from '../../art/glow';
import type { Enemy } from './Enemy';

const RANGE_X = 104;      // rango horizontal de vigilancia (px)
const RANGE_Y = 64;       // tolerancia vertical
const SHOOT_EVERY = 2.4;  // segundos entre escupidas
const PUFF_TIME = 0.45;   // cuánto se infla antes de escupir (el aviso)
const SPORE_VX = 52;      // px/s horizontal de la espora
const SPORE_VY = -118;    // impulso vertical inicial (arco)
const SPORE_G = 260;      // gravedad propia (más floja: flota)
const SPORE_LIFE = 3.2;   // segundos de vida

interface Spore {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export class Spitter implements Enemy {
  readonly layer = 'enemy' as const;
  x: number;
  y: number;
  readonly w = 8;
  readonly h = 8;
  dead = false;
  readonly stompable = true;
  readonly gooColors = ['#6ee08a', '#33a843', '#d6ffe2'];

  private t = 0;
  private shootTimer = SHOOT_EVERY;
  private puffTimer = 0; // >0 = inflándose para escupir
  private facing: 1 | -1 = -1;
  private spores: Spore[] = [];

  constructor(px: number, py: number, private level: Level) {
    this.x = px;
    this.y = py + (TILE - this.h);
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  hazards(): Box[] {
    return this.spores.map((s) => ({ x: s.x - 2, y: s.y - 2, w: 4, h: 4 }));
  }

  update(dt: number, target: { x: number; y: number }): void {
    this.t += dt;
    const cx = this.x + this.w / 2;
    const dx = target.x - cx;
    const inRange = Math.abs(dx) < RANGE_X && Math.abs(target.y - this.y) < RANGE_Y;
    if (dx !== 0) this.facing = (dx < 0 ? -1 : 1) as 1 | -1;

    // El ciclo de escupida: espera -> se infla (aviso) -> dispara.
    this.shootTimer -= dt;
    if (this.puffTimer > 0) {
      this.puffTimer -= dt;
      if (this.puffTimer <= 0) {
        this.spores.push({
          x: cx,
          y: this.y + 1,
          vx: this.facing * SPORE_VX,
          vy: SPORE_VY,
          life: SPORE_LIFE,
        });
        this.shootTimer = SHOOT_EVERY;
      }
    } else if (inRange && this.shootTimer <= 0) {
      this.puffTimer = PUFF_TIME;
    }

    // Las esporas vuelan en arco y revientan contra la roca.
    for (const s of this.spores) {
      s.vy += SPORE_G * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (this.level.isSolidAt(s.x, s.y)) s.life = 0;
    }
    this.spores = this.spores.filter((s) => s.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    // Esporas: motas verdes con halo.
    for (const s of this.spores) {
      drawGlow(ctx, s.x - camX, s.y - camY, 5, '#6ee08a', 0.6);
      ctx.fillStyle = '#d6ffe2';
      ctx.fillRect(Math.round(s.x - camX) - 1, Math.round(s.y - camY) - 1, 2, 2);
    }

    const cx = Math.round(this.x + this.w / 2 - camX);
    const baseY = Math.round(this.y + this.h - camY);
    // Inflado: el sombrero crece 1px y el brillo sube (el aviso se lee).
    const puffed = this.puffTimer > 0;
    const breathe = puffed ? 1 : Math.sin(this.t * 2.5 + this.x) > 0 ? 1 : 0;

    drawGlow(ctx, cx, baseY - 6, 10, '#6ee08a', puffed ? 0.55 : 0.25);

    // Tallo pálido con la base en sombra.
    ctx.fillStyle = '#beffc8';
    ctx.fillRect(cx - 1, baseY - 4, 3, 4);
    ctx.fillStyle = '#33a843';
    ctx.fillRect(cx - 1, baseY - 1, 3, 1);
    // Sombrero: dos franjas verdes con pecas claras.
    ctx.fillStyle = '#2e8038';
    ctx.fillRect(cx - 4, baseY - 5 - breathe, 9, 2);
    ctx.fillStyle = '#5ce06a';
    ctx.fillRect(cx - 3, baseY - 6 - breathe, 7, 1);
    ctx.fillRect(cx - 2, baseY - 7 - breathe, 5, 1);
    ctx.fillStyle = '#d6ffe2';
    ctx.fillRect(cx - 2, baseY - 6 - breathe, 1, 1);
    ctx.fillRect(cx + 2, baseY - 5 - breathe, 1, 1);
    // Ojos: miran hacia donde va a escupir.
    ctx.fillStyle = '#11091a';
    ctx.fillRect(cx - 1 + this.facing, baseY - 3, 1, 1);
    ctx.fillRect(cx + 1 + this.facing, baseY - 3, 1, 1);
  }
}
