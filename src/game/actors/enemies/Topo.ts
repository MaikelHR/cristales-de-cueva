// ============================================================
//  TOPO — the mine's tunneling stalker
// ------------------------------------------------------------
//  It swims through the SOLID floor: all you ever see while it hunts
//  is the mound of loose earth rippling along the surface, tracking
//  your feet. Stop above it and it stops too — the mound QUAKES and
//  pebbles jump (the tell) — then it BURSTS out in a short leap.
//  After the leap it wobbles dizzy on the surface: that's the only
//  window to stomp it. Then it digs back under and the hunt resumes.
//  Under the floor it is UNTOUCHABLE (its box lives outside the
//  world, geyser-style): the lesson is reading the GROUND, not
//  fighting it. It never leaves its own stretch of floor.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { Level, TILE } from '../../world/Level';
import { drawGlow } from '../../art/glow';
import { sfx } from '../../sfx';
import type { Enemy } from './Enemy';

const BURROW_SPEED = 34;  // px/s the mound tracks you underground
const QUAKE = 0.6;        // seconds of hard shudder before bursting out
const LEAP_V = 170;       // burst velocity (peaks ~3.6 tiles over the floor)
const LEAP_G = 500;       // gravity on the airborne mole
const TIRED = 1.2;        // seconds dizzy on the surface (the stomp window)
const DIG = 0.4;          // seconds sinking back under (already untouchable)
const COOLDOWN = 1.4;     // seconds hunting again before the next burst
const NEAR_X = 7;         // px: "right under you" — close enough to burst
const NEAR_Y = 44;        // px over the floor: higher than this, you're safe

type State = 'burrow' | 'quake' | 'leap' | 'tired' | 'dig';

export class Topo implements Enemy {
  readonly layer = 'enemy' as const;
  x: number;
  y: number;
  readonly w = 10;
  readonly h = 9;
  dead = false;
  readonly gooColors = ['#8a5a30', '#c9885a', '#6b4a2e'];

  private state: State = 'burrow';
  private timer = 0;
  private cooldown = 0;
  private vy = 0;
  private t = 0;
  private facing: 1 | -1 = 1;
  /** Top pixel of the floor row it swims in (found under its spawn). */
  private readonly surfaceY: number;
  private readonly surfaceRow: number;

  constructor(px: number, py: number, private level: Level) {
    this.x = px;
    // The entity sits in the air cell over its floor: find that floor.
    let row = Math.floor(py / TILE);
    while (row < this.level.rows && !this.level.solidCell(row, Math.floor(px / TILE))) row++;
    this.surfaceRow = row;
    this.surfaceY = row * TILE;
    this.y = this.surfaceY + 2; // resting under the skin of the floor
  }

  /** Only the burst and the dizzy spell put its body in play. */
  get stompable(): boolean {
    return this.state === 'leap' || this.state === 'tired';
  }

  /** Underground (and while sinking) nothing can touch it — the box
   *  lives outside the world, like the geyser's stone nozzle. */
  box(): Box {
    if (this.state === 'leap' || this.state === 'tired') {
      return { x: this.x, y: this.y, w: this.w, h: this.h };
    }
    return { x: -99, y: -99, w: 0, h: 0 };
  }

  /** Can the mound live under this column? (solid floor, air above).
   *  It walls the mole into its own stretch: pits and rock ends it. */
  private canSwimTo(px: number): boolean {
    const col = Math.floor((px + this.w / 2) / TILE);
    return (
      this.level.solidCell(this.surfaceRow, col) &&
      !this.level.solidCell(this.surfaceRow - 1, col)
    );
  }

  update(dt: number, target: { x: number; y: number }): void {
    this.t += dt;
    this.timer += dt;
    const cx = this.x + this.w / 2;
    const dx = target.x - cx;

    switch (this.state) {
      case 'burrow': {
        this.cooldown = Math.max(0, this.cooldown - dt);
        // The mound tracks your feet — but never leaves its stretch.
        if (Math.abs(dx) > 2) {
          this.facing = dx < 0 ? -1 : 1;
          const next = this.x + this.facing * BURROW_SPEED * dt;
          if (this.canSwimTo(next)) this.x = next;
        }
        // You stopped right above it, low enough: the quake begins.
        const overFloor = target.y > this.surfaceY - NEAR_Y;
        if (this.cooldown <= 0 && Math.abs(dx) < NEAR_X && overFloor) {
          this.state = 'quake';
          this.timer = 0;
        }
        break;
      }
      case 'quake': {
        if (this.timer >= QUAKE) {
          // The burst: straight up from the mound, dirt flying.
          this.state = 'leap';
          this.timer = 0;
          this.y = this.surfaceY - this.h;
          this.vy = -LEAP_V;
          sfx.emerge();
        }
        break;
      }
      case 'leap': {
        this.vy += LEAP_G * dt;
        this.y += this.vy * dt;
        if (this.vy > 0 && this.y + this.h >= this.surfaceY) {
          this.y = this.surfaceY - this.h;
          this.state = 'tired';
          this.timer = 0;
        }
        break;
      }
      case 'tired': {
        if (this.timer >= TIRED) {
          this.state = 'dig';
          this.timer = 0;
        }
        break;
      }
      case 'dig': {
        this.y += 16 * dt; // sinking back into the floor
        if (this.timer >= DIG) {
          this.state = 'burrow';
          this.timer = 0;
          this.cooldown = COOLDOWN;
          this.y = this.surfaceY + 2;
        }
        break;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const sy = this.surfaceY - camY;

    if (this.state === 'burrow' || this.state === 'quake') {
      // The mound: a ripple of loose earth over the floor line.
      const quaking = this.state === 'quake';
      const ox = quaking ? Math.round(Math.sin(this.t * 34)) : 0;
      const px = Math.round(this.x - camX) + ox;
      const lift = quaking ? 4 : 3;
      ctx.fillStyle = '#4c3a2a';
      ctx.fillRect(px + 1, sy - lift + 1, this.w - 2, lift - 1);
      ctx.fillStyle = '#6b4a2e';
      ctx.fillRect(px + 2, sy - lift, this.w - 4, 1);
      ctx.fillStyle = '#2c2118';
      ctx.fillRect(px, sy - 1, 1, 1);
      ctx.fillRect(px + this.w - 1, sy - 1, 1, 1);
      // Pebbles hop off the mound — frantic during the quake.
      const hops = quaking ? 4 : 2;
      ctx.fillStyle = quaking ? '#c9885a' : '#8a5a30';
      for (let i = 0; i < hops; i++) {
        const seed = Math.floor(this.t * (quaking ? 22 : 9)) + i * 5;
        const hx = px + 1 + ((seed * 7) % (this.w - 2));
        const hy = sy - lift - 1 - ((seed * 3) % (quaking ? 5 : 2));
        ctx.fillRect(Math.round(hx), Math.round(hy), 1, 1);
      }
      if (quaking) {
        drawGlow(ctx, px + this.w / 2, sy - 2, 8, '#c9885a', 0.2 + (this.timer / QUAKE) * 0.2);
      }
      return;
    }

    // Out of the ground: the mole itself (clipped while it sinks back,
    // so it never draws THROUGH the floor tiles painted under it).
    const px = Math.round(this.x - camX);
    const py = Math.round(this.y - camY);
    ctx.save();
    if (this.state === 'dig') {
      ctx.beginPath();
      ctx.rect(px - 4, py - 6, this.w + 8, Math.max(0, sy - (py - 6)));
      ctx.clip();
    }

    const flip = this.facing === -1;
    const nose = flip ? px : px + this.w - 2;
    // Body and belly.
    ctx.fillStyle = '#5a4028';
    ctx.fillRect(px, py + 2, this.w, this.h - 2);
    ctx.fillStyle = '#7a5a38';
    ctx.fillRect(px + 2, py + this.h - 2, this.w - 4, 2);
    // The miner's helmet: a copper cap with its little lamp.
    ctx.fillStyle = '#e08a4a';
    ctx.fillRect(px + 1, py, this.w - 2, 2);
    ctx.fillRect(px, py + 1, this.w, 1);
    ctx.fillStyle = '#ffd9a0';
    ctx.fillRect(flip ? px + 1 : px + this.w - 2, py, 1, 1);
    // Snout and claws on the leading side.
    ctx.fillStyle = '#d9907a';
    ctx.fillRect(nose, py + 3, 2, 2);
    ctx.fillStyle = '#c9885a';
    ctx.fillRect(flip ? px : px + this.w - 3, py + this.h - 1, 3, 1);
    // Eyes: shut while dizzy, a dark bead otherwise.
    ctx.fillStyle = '#1a0e06';
    const eyeX = flip ? px + 3 : px + this.w - 5;
    if (this.state === 'tired') {
      ctx.fillRect(eyeX - 1, py + 3, 3, 1);
    } else {
      ctx.fillRect(eyeX, py + 3, 1, 2);
    }

    if (this.state === 'tired') {
      // Dizzy stars orbiting the helmet: THIS is the window.
      ctx.fillStyle = '#ffd9a0';
      for (let i = 0; i < 3; i++) {
        const a = this.t * 4 + (i * Math.PI * 2) / 3;
        ctx.fillRect(
          Math.round(px + this.w / 2 + Math.cos(a) * 7),
          Math.round(py - 3 + Math.sin(a) * 2),
          1, 1,
        );
      }
    }
    if (this.state === 'leap') {
      // Dirt spray trailing the burst.
      ctx.fillStyle = '#6b4a2e';
      for (let i = 0; i < 3; i++) {
        const seed = Math.floor(this.t * 20) + i * 7;
        ctx.fillRect(
          Math.round(px + 1 + ((seed * 5) % (this.w - 2))),
          Math.round(sy - 2 - ((seed * 3) % 6)),
          1, 1,
        );
      }
    }
    ctx.restore();
  }
}
