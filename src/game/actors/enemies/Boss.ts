// ============================================================
//  BOSS — Crystal guardian (end of zone)
// ------------------------------------------------------------
//  Floats over the altar bobbing, fires shards at the player and
//  takes 3 stomps (with invulnerability between each one). While
//  it lives, the door stays shut. Drawn with primitives (a diamond
//  with an eye that follows you), not with a grid.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { drawGlow } from '../../art/glow';
import type { Enemy } from './Enemy';

const MOVE_SPEED = 28;    // px/s of lateral sway
const MOVE_RANGE = 44;    // px to each side of the origin (stays over the altar)
const BOB_AMP = 6;        // vertical bob
const BOB_SPEED = 1.6;
const SHOOT_EVERY = 1.8;  // seconds between shots
const PROJ_SPEED = 72;    // shard speed
const PROJ_LIFE = 4.5;    // seconds each shard lives
const HIT_INVULN = 0.7;   // boss i-frames after a stomp
const MAX_HP = 3;

interface Proj {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export class Boss implements Enemy {
  readonly layer = 'enemy' as const;
  x: number;
  y: number;
  readonly w = 18;
  readonly h = 14;
  dead = false;
  readonly stompable = true;
  readonly isBoss = true;
  readonly gooColors = ['#b98bff', '#7ce0ff', '#ff5a7a'];
  hp = MAX_HP;

  private readonly spawnX: number;
  private readonly spawnY: number;
  private dir: 1 | -1 = 1;
  private t = 0;
  private shootTimer = SHOOT_EVERY;
  private invuln = 0;
  private eyeDX = 0;
  private eyeDY = 0;
  private projectiles: Proj[] = [];

  constructor(px: number, py: number) {
    this.spawnX = px;
    this.spawnY = py;
    this.x = px;
    this.y = py;
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  hazards(): Box[] {
    return this.projectiles.map((p) => ({ x: p.x - 2, y: p.y - 2, w: 4, h: 4 }));
  }

  /** Stomp: if not invulnerable, it loses a hit. Returns true only
   *  if that stomp defeated it (for the big burst). */
  onStomp(): boolean {
    if (this.invuln > 0) return false;
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

    // Lateral sway + bob
    const next = this.x + this.dir * MOVE_SPEED * dt;
    if (Math.abs(next - this.spawnX) > MOVE_RANGE) this.dir = (this.dir * -1) as 1 | -1;
    else this.x = next;
    this.y = this.spawnY + Math.sin(this.t * BOB_SPEED) * BOB_AMP;

    // The eye looks at the player
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    this.eyeDX = Math.sign(target.x - cx);
    this.eyeDY = Math.sign(target.y - cy);

    // Periodic shot aimed at the player
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = SHOOT_EVERY;
      const dx = target.x - cx;
      const dy = target.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      this.projectiles.push({
        x: cx,
        y: cy,
        vx: (dx / d) * PROJ_SPEED,
        vy: (dy / d) * PROJ_SPEED,
        life: PROJ_LIFE,
      });
    }

    // Move shards and discard expired ones
    for (const p of this.projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.projectiles = this.projectiles.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    // Shards (behind the body)
    for (const p of this.projectiles) {
      drawGlow(ctx, p.x - camX, p.y - camY, 6, '#ff7ab0', 0.7);
      ctx.fillStyle = '#ffd0e0';
      ctx.fillRect(Math.round(p.x - camX) - 1, Math.round(p.y - camY) - 1, 2, 2);
    }

    const cx = Math.round(this.x + this.w / 2 - camX);
    const cy = Math.round(this.y + this.h / 2 - camY);
    const hw = this.w / 2;
    const hh = this.h / 2;

    // Pulsing aura
    const pulse = 0.4 + Math.sin(this.t * 4) * 0.12;
    drawGlow(ctx, cx, cy, 24, '#b98bff', pulse);

    const flashing = this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0;

    // Body: crystal diamond with dark edge (white when hit)
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fillStyle = flashing ? '#ffffff' : '#241436';
    ctx.fill();

    if (!flashing) {
      // Upper facet lit and lower one in shadow (overhead light).
      ctx.fillStyle = '#8a5fd0';
      ctx.beginPath();
      ctx.moveTo(cx, cy - hh + 2);
      ctx.lineTo(cx + hw - 2, cy);
      ctx.lineTo(cx - hw + 2, cy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#472a6e';
      ctx.beginPath();
      ctx.moveTo(cx - hw + 2, cy);
      ctx.lineTo(cx + hw - 2, cy);
      ctx.lineTo(cx, cy + hh - 2);
      ctx.closePath();
      ctx.fill();

      // Glint at the top vertex (crystal).
      ctx.fillStyle = '#e9d6ff';
      ctx.fillRect(cx - 1, cy - hh + 1, 2, 2);

      // Eye: white with a red pupil that looks at the player
      ctx.fillStyle = '#f5fcff';
      ctx.fillRect(cx - 3, cy - 2, 6, 4);
      ctx.fillStyle = '#ff3a5a';
      ctx.fillRect(cx - 1 + this.eyeDX, cy - 1 + this.eyeDY, 2, 2);
    }

    // Health pips above the head
    for (let i = 0; i < MAX_HP; i++) {
      ctx.fillStyle = i < this.hp ? '#ff5a7a' : '#4a2e70';
      ctx.fillRect(cx - 7 + i * 5, cy - hh - 5, 3, 2);
    }
  }
}
