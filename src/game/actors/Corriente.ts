// ============================================================
//  CORRIENTE (underwater current jet)
// ------------------------------------------------------------
//  A vent of water that pushes a SUBMERGED swimmer along its length
//  (up / left / right). Like the updraft, the gate is a player STATE:
//  it only shoves you while you're diving — a floater feels nothing.
//  The rule lives in systems/devices.ts; here live the jet's box and
//  its telegraph. And the telegraph IS the design (the vent playtest
//  lesson): a DENSE bubble stream travelling the full jet + algae
//  swaying at the mouth, always animating, so "the water pushes here"
//  reads at a glance. Its strength ~ the vent: ride-able, and an
//  opposing jet is a gate you route around, not a wall you overpower.
// ============================================================

import type { Box } from '../../engine/canvas';
import { TILE } from '../world/Level';
import type { Clock } from '../clock';
import type { Actor } from './Actor';

export class Corriente implements Actor {
  readonly layer = 'device' as const;
  dead = false; // jets never die; the field is part of Actor
  readonly x: number;
  readonly y: number;
  /** push direction, read by systems/devices.ts -> player.currentPush(). */
  readonly dirX: -1 | 0 | 1;
  readonly dirY: -1 | 0 | 1;

  private readonly lengthPx: number;
  private readonly jet: Box;

  constructor(
    px: number,
    py: number,
    private dir: 'up' | 'left' | 'right',
    lengthTiles: number,
    private clock: Clock,
  ) {
    this.x = px;
    this.y = py;
    this.lengthPx = lengthTiles * TILE;
    if (dir === 'up') {
      this.dirX = 0;
      this.dirY = -1;
      this.jet = { x: px + 1, y: py + TILE - this.lengthPx, w: TILE - 2, h: this.lengthPx };
    } else if (dir === 'left') {
      this.dirX = -1;
      this.dirY = 0;
      this.jet = { x: px + TILE - this.lengthPx, y: py + 1, w: this.lengthPx, h: TILE - 2 };
    } else {
      this.dirX = 1;
      this.dirY = 0;
      this.jet = { x: px, y: py + 1, w: this.lengthPx, h: TILE - 2 };
    }
  }

  /** The full jet column: from the mouth along `length` toward `dir`. */
  box(): Box {
    return this.jet;
  }

  update(): void {
    // Idle: its animation reads the shared clock in draw().
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const time = this.clock.t;
    const len = this.lengthPx;
    const cx = this.x + TILE / 2;
    const cy = this.y + TILE / 2;
    const ax = this.dirX; // flow direction
    const ay = this.dirY;
    const perpX = -ay; // across the flow (for sway / algae roots)
    const perpY = ax;

    // Mouth = the origin edge the jet blows FROM.
    let mouthX: number;
    let mouthY: number;
    if (this.dir === 'up') {
      mouthX = cx;
      mouthY = this.y + TILE;
    } else if (this.dir === 'left') {
      mouthX = this.x + TILE;
      mouthY = cy;
    } else {
      mouthX = this.x;
      mouthY = cy;
    }

    // Faint directional wash so the current reads even when still.
    const wash = ctx.createLinearGradient(
      mouthX - camX,
      mouthY - camY,
      mouthX + ax * len - camX,
      mouthY + ay * len - camY,
    );
    wash.addColorStop(0, 'rgba(124, 224, 255, 0.16)');
    wash.addColorStop(1, 'rgba(124, 224, 255, 0)');
    ctx.fillStyle = wash;
    ctx.fillRect(this.jet.x - camX, this.jet.y - camY, this.jet.w, this.jet.h);

    // Dense bubble stream travelling WITH the flow (the motion that
    // gives the direction away — many motes, each its own phase).
    for (let i = 0; i < 18; i++) {
      const p = (time * (0.55 + (i % 5) * 0.08) + i * 0.11) % 1;
      const d = p * len;
      const sway = Math.sin(time * 3 + i * 1.7 + p * 5) * 2;
      const bx = mouthX + ax * d + perpX * sway;
      const by = mouthY + ay * d + perpY * sway;
      ctx.globalAlpha = (1 - p) * 0.7 + 0.15;
      ctx.fillStyle = i % 3 === 0 ? '#d6f7ff' : '#7ce0ff';
      const sz = i % 4 === 0 ? 2 : 1;
      ctx.fillRect(Math.round(bx - camX), Math.round(by - camY), sz, sz);
    }
    ctx.globalAlpha = 1;

    // Algae rooted at the mouth, trailing downstream and swaying — the
    // idle "something blows here" tell when no player is riding.
    for (let a = 0; a < 4; a++) {
      const rootOff = (a - 1.5) * 2;
      const rx = mouthX + perpX * rootOff;
      const ry = mouthY + perpY * rootOff;
      ctx.fillStyle = a % 2 === 0 ? '#5ce06a' : '#2f9655';
      for (let seg = 0; seg < 4; seg++) {
        const s = Math.sin(time * 2 + a * 1.1 + seg * 0.7) * (seg + 1) * 0.6;
        const fx = rx + ax * seg * 1.5 + perpX * s;
        const fy = ry + ay * seg * 1.5 + perpY * s;
        ctx.fillRect(Math.round(fx - camX), Math.round(fy - camY), 1, 1);
      }
    }
  }
}
