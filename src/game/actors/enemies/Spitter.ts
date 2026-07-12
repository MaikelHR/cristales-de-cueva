// ============================================================
//  SPORER (sentinel mushroom)
// ------------------------------------------------------------
//  Doesn't walk: it watches its patch. When the player enters range
//  it INFLATES (the telegraph) and spits an arcing spore at them; the
//  spore falls under its own gravity and bursts on hitting rock.
//  It's stompable. Drawn with primitives (stem + cap).
// ============================================================

import type { Box } from '../../../engine/canvas';
import { Level, TILE } from '../../world/Level';
import { drawGlow } from '../../art/glow';
import type { Enemy } from './Enemy';

const RANGE_X = 104;      // horizontal watch range (px)
const RANGE_Y = 64;       // vertical tolerance
const SHOOT_EVERY = 2.4;  // seconds between spits
const PUFF_TIME = 0.45;   // how long it inflates before spitting (the telegraph)
const SPORE_VX = 52;      // spore horizontal px/s
const SPORE_VY = -118;    // initial vertical impulse (arc)
const SPORE_G = 260;      // own gravity (weaker: it floats)
const SPORE_LIFE = 3.2;   // seconds of life

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
  private puffTimer = 0; // >0 = inflating to spit
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

    // The spit cycle: wait -> inflate (telegraph) -> fire.
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

    // Spores fly in an arc and burst against rock.
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
    // Spores: green specks with a halo.
    for (const s of this.spores) {
      drawGlow(ctx, s.x - camX, s.y - camY, 5, '#6ee08a', 0.6);
      ctx.fillStyle = '#d6ffe2';
      ctx.fillRect(Math.round(s.x - camX) - 1, Math.round(s.y - camY) - 1, 2, 2);
    }

    const cx = Math.round(this.x + this.w / 2 - camX);
    const baseY = Math.round(this.y + this.h - camY);
    // Inflated: the cap grows 1px and the glow rises (the telegraph reads).
    const puffed = this.puffTimer > 0;
    const breathe = puffed ? 1 : Math.sin(this.t * 2.5 + this.x) > 0 ? 1 : 0;

    drawGlow(ctx, cx, baseY - 6, 10, '#6ee08a', puffed ? 0.55 : 0.25);

    // Pale stem with the base in shadow.
    ctx.fillStyle = '#beffc8';
    ctx.fillRect(cx - 1, baseY - 4, 3, 4);
    ctx.fillStyle = '#33a843';
    ctx.fillRect(cx - 1, baseY - 1, 3, 1);
    // Cap: two green bands with light freckles.
    ctx.fillStyle = '#2e8038';
    ctx.fillRect(cx - 4, baseY - 5 - breathe, 9, 2);
    ctx.fillStyle = '#5ce06a';
    ctx.fillRect(cx - 3, baseY - 6 - breathe, 7, 1);
    ctx.fillRect(cx - 2, baseY - 7 - breathe, 5, 1);
    ctx.fillStyle = '#d6ffe2';
    ctx.fillRect(cx - 2, baseY - 6 - breathe, 1, 1);
    ctx.fillRect(cx + 2, baseY - 5 - breathe, 1, 1);
    // Eyes: they look toward where it's about to spit.
    ctx.fillStyle = '#11091a';
    ctx.fillRect(cx - 1 + this.facing, baseY - 3, 1, 1);
    ctx.fillRect(cx + 1 + this.facing, baseY - 3, 1, 1);
  }
}
