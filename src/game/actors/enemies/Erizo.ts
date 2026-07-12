// ============================================================
//  FROST ERIZO (spiky enemy)
// ------------------------------------------------------------
//  Walks slow like the slime, but its back is all spikes:
//  STOMPING IT HURTS (stompable = false). The answer is the POUND:
//  a pound bursts it from above (the rule lives in combat.ts,
//  isStomp with pounding). Going around it or waiting still works.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { Level, TILE } from '../../world/Level';
import { drawGlow } from '../../art/glow';
import type { Enemy } from './Enemy';

const SPEED = 17; // slow: it's a walking wall, not a hunter

export class Erizo implements Enemy {
  readonly layer = 'enemy' as const;
  x: number;
  y: number;
  readonly w = 8;
  readonly h = 7;
  dead = false;
  readonly stompable = false; // stomping it with a normal jump HURTS
  readonly gooColors = ['#bfeaff', '#7ab0d8', '#ffffff'];

  private dir: 1 | -1 = -1;
  private t = 0;

  constructor(px: number, py: number, private level: Level) {
    this.x = px;
    this.y = py + (TILE - this.h);
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt: number): void {
    const next = this.x + this.dir * SPEED * dt;
    const aheadX = this.dir === 1 ? next + this.w : next;
    const wall = this.level.isSolidAt(aheadX, this.y + this.h / 2);
    const footX = this.dir === 1 ? next + this.w + 1 : next - 1;
    const floor = this.level.isSolidAt(footX, this.y + this.h + 1);
    const spikes = this.level.touchesSpike({ x: footX, y: this.y, w: 1, h: this.h + 2 });
    if (wall || !floor || spikes) {
      this.dir = (this.dir * -1) as 1 | -1;
    } else {
      this.x = next;
    }
    this.t += dt;
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const cx = Math.round(this.x + this.w / 2 - camX);
    const baseY = Math.round(this.y + this.h - camY);
    const step = Math.sin(this.t * 6) > 0 ? 1 : 0; // little steps

    drawGlow(ctx, cx, baseY - 3, 8, '#bfeaff', 0.2);

    // Body: half-ball of dark ice.
    ctx.fillStyle = '#2a4c66';
    ctx.fillRect(cx - 4, baseY - 4, 8, 4);
    ctx.fillRect(cx - 3, baseY - 5, 6, 1);
    // The spiky back: pale needles — the "don't stomp me" warning.
    ctx.fillStyle = '#eafaff';
    ctx.fillRect(cx - 3, baseY - 7, 1, 2);
    ctx.fillRect(cx - 1, baseY - 8, 1, 3);
    ctx.fillRect(cx + 1, baseY - 7, 1, 2);
    ctx.fillRect(cx + 3, baseY - 6, 1, 1);
    ctx.fillRect(cx - 5 - step, baseY - 4, 1, 1); // side spike
    ctx.fillRect(cx + 4 + step, baseY - 4, 1, 1);
    // Little face below: two eyes peeking out under the spikes.
    ctx.fillStyle = '#11091a';
    ctx.fillRect(cx - 2 + this.dir, baseY - 3, 1, 1);
    ctx.fillRect(cx + 1 + this.dir, baseY - 3, 1, 1);
    // Little feet
    ctx.fillStyle = '#7ab0d8';
    ctx.fillRect(cx - 3 + step, baseY - 1, 2, 1);
    ctx.fillRect(cx + 1 - step, baseY - 1, 2, 1);
  }
}
