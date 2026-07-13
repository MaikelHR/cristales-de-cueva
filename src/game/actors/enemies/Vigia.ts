// ============================================================
//  VIGÍA — the sanctum's sentry eye
// ------------------------------------------------------------
//  A floating rune-eye left behind to watch the threshold. It never
//  moves from its post: it TRACKS you, and when you step into its
//  gaze it CHARGES (the iris flares white, wider and wider — the
//  telegraph) and fires ONE straight bolt at where you were when it
//  loosed. The game's first straight shooter (the spitter lobs arcs):
//  it teaches reading a bullet's line before the Custodio demands it.
//  One stomp puts it out.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { Level } from '../../world/Level';
import { drawGlow } from '../../art/glow';
import type { Enemy } from './Enemy';

const RANGE = 104;       // px of gaze (13 tiles: outside it, it only watches)
const CHARGE = 0.65;     // seconds of iris flare before the shot
const COOLDOWN = 2.3;    // seconds between shots
const BOLT_SPEED = 78;   // px/s of the bolt
const BOLT_LIFE = 4;     // seconds a bolt lives if it hits nothing

interface Bolt { x: number; y: number; vx: number; vy: number; life: number; }

export class Vigia implements Enemy {
  readonly layer = 'enemy' as const;
  x: number;
  y: number;
  readonly w = 10;
  readonly h = 10;
  dead = false;
  readonly stompable = true;
  readonly gooColors = ['#e9d6ff', '#ffd76a', '#b98bff'];

  private readonly baseY: number;
  private t = 0;
  private charge = 0;    // >0 = charging (counts down to the shot)
  private cooldown = 0;
  private eyeDX = 0;
  private eyeDY = 0;
  private bolts: Bolt[] = [];

  constructor(px: number, py: number, private level: Level) {
    this.x = px;
    this.y = py;
    this.baseY = py;
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  hazards(): Box[] {
    return this.bolts.map((b) => ({ x: b.x - 2, y: b.y - 2, w: 4, h: 4 }));
  }

  update(dt: number, target: { x: number; y: number }): void {
    this.t += dt;
    this.y = this.baseY + Math.sin(this.t * 1.8) * 2; // it breathes on its post
    this.cooldown = Math.max(0, this.cooldown - dt);

    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const dx = target.x - cx;
    const dy = target.y - cy;
    this.eyeDX = Math.sign(dx);
    this.eyeDY = Math.sign(dy);

    if (this.charge > 0) {
      this.charge -= dt;
      if (this.charge <= 0) {
        // The shot: one straight bolt at where you are RIGHT now —
        // released, it never corrects. Move after the flare, not before.
        const d = Math.hypot(dx, dy) || 1;
        this.bolts.push({
          x: cx,
          y: cy,
          vx: (dx / d) * BOLT_SPEED,
          vy: (dy / d) * BOLT_SPEED,
          life: BOLT_LIFE,
        });
        this.cooldown = COOLDOWN;
      }
    } else if (this.cooldown <= 0 && Math.hypot(dx, dy) < RANGE) {
      this.charge = CHARGE;
    }

    for (const b of this.bolts) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }
    this.bolts = this.bolts.filter((b) => b.life > 0 && !this.level.isSolidAt(b.x, b.y));
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    // Bolts: a hot core with a short tail showing their line.
    for (const b of this.bolts) {
      drawGlow(ctx, b.x - camX, b.y - camY, 6, '#ffd76a', 0.7);
      ctx.fillStyle = '#fff3c0';
      ctx.fillRect(Math.round(b.x - camX) - 1, Math.round(b.y - camY) - 1, 2, 2);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(
        Math.round(b.x - b.vx * 0.05 - camX) - 1,
        Math.round(b.y - b.vy * 0.05 - camY) - 1,
        2, 2,
      );
      ctx.globalAlpha = 1;
    }

    const px = Math.round(this.x - camX);
    const py = Math.round(this.y - camY);
    const cx = px + this.w / 2;
    const cy = py + this.h / 2;
    const charging = this.charge > 0;
    const flare = charging ? 1 - this.charge / CHARGE : 0;

    drawGlow(ctx, cx, cy, charging ? 14 : 9, '#ffd76a', 0.25 + flare * 0.5);

    // The gold ring (the carved socket it floats in).
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(px + 2, py, this.w - 4, 1);
    ctx.fillRect(px + 2, py + this.h - 1, this.w - 4, 1);
    ctx.fillRect(px, py + 2, 1, this.h - 4);
    ctx.fillRect(px + this.w - 1, py + 2, 1, this.h - 4);
    ctx.fillStyle = '#ffd76a';
    ctx.fillRect(px + 2, py, 2, 1);
    ctx.fillRect(px + this.w - 1, py + 2, 1, 2);

    // The eye: violet sclera, iris tracking you; charging, it flares
    // white and swells — the wider the flare, the closer the shot.
    ctx.fillStyle = '#241436';
    ctx.fillRect(px + 1, py + 1, this.w - 2, this.h - 2);
    ctx.fillStyle = '#4a2e70';
    ctx.fillRect(px + 2, py + 2, this.w - 4, this.h - 4);
    const ir = charging ? 2 + Math.round(flare * 2) : 2;
    ctx.fillStyle = charging ? '#ffffff' : '#e9d6ff';
    ctx.fillRect(cx - ir / 2 + this.eyeDX, cy - ir / 2 + this.eyeDY, ir, ir);
    if (!charging) {
      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(cx - 1 + this.eyeDX, cy - 1 + this.eyeDY, 1, 1);
    }
  }
}
