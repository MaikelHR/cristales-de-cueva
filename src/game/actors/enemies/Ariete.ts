// ============================================================
//  BOSS — Igneous Ariete (end of the fragua)
// ------------------------------------------------------------
//  No floating and shooting: this boss LIVES ON THE GROUND. It
//  paces the arena, rears up (the tell) and CHARGES — smashing
//  apart any cracked barricades in its path. Its back is red-hot
//  obsidian plate: touching it BURNS, from above too (the erizo's
//  lesson); only the pound bounces off the plate without hurting
//  anyone. The only window: when it slams into a wall it's left
//  STUNNED, the plate opens and the core glows — that's when you
//  stomp it. Each slam shakes embers from the ceiling and enrages
//  it (charges more often and faster). Three stomps snuff it out.
//  While it lives, the door won't open.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { Level, TILE } from '../../world/Level';
import { drawGlow } from '../../art/glow';
import type { Enemy } from './Enemy';

const PACE_SPEED = 22;     // px/s while pacing
const CHARGE_SPEED = 168;  // px/s while charging (base; rage raises it)
const CHARGE_EVERY = 2.7;  // seconds between charges (base)
const TELEGRAPH = 0.55;    // rears up before charging (the tell)
const STUN = 2.3;          // seconds stunned after slamming
const MAX_HP = 3;
const RAGE_STEP = 0.28;    // +28% pace per hit taken
const HIT_INVULN = 0.6;    // i-frames after a valid stomp

const EMBER_G = 320;       // gravity of the raining embers
const EMBER_SPREAD = [-132, -84, -38, 12, 64, 118]; // fan across the arena

interface Ember { x: number; y: number; vy: number; }
interface Debris { x: number; y: number; vx: number; vy: number; life: number; }

type State = 'pace' | 'telegraph' | 'charge' | 'stun';

export class Ariete implements Enemy {
  readonly layer = 'enemy' as const;
  x: number;
  y: number;
  readonly w = 20;
  readonly h = 13;
  dead = false;
  readonly isBoss = true;
  readonly gooColors = ['#ff9a3a', '#ffd23a', '#ff5a3a'];
  hp = MAX_HP;

  private state: State = 'pace';
  private stateTimer = 0;
  private chargeTimer = CHARGE_EVERY;
  private dir: 1 | -1 = -1;
  private invuln = 0;
  private t = 0;
  private legPhase = 0;
  private hits = 0; // slammed charges (varies the ember rain)
  private embers: Ember[] = [];
  private debris: Debris[] = [];

  constructor(px: number, py: number, private level: Level) {
    this.x = px;
    this.y = py + (TILE - this.h); // feet flush with the floor
  }

  /** Only the stun opens the plate: the rest of the time, stomping it
   *  bounces off without hurting it (and touching its side burns, as always). */
  get stompable(): boolean {
    return this.state === 'stun';
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  hazards(): Box[] {
    return this.embers.map((e) => ({ x: e.x - 2, y: e.y - 2, w: 4, h: 4 }));
  }

  onStomp(): boolean {
    if (this.state !== 'stun' || this.invuln > 0) return false;
    this.hp--;
    this.invuln = HIT_INVULN;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    // Recovers ENRAGED: the next charge arrives sooner.
    this.state = 'pace';
    this.chargeTimer = CHARGE_EVERY * 0.6;
    return false;
  }

  /** The rage: 1 at the start, grows with each hit taken. */
  private rage(): number {
    return 1 + (MAX_HP - this.hp) * RAGE_STEP;
  }

  update(dt: number, target: { x: number; y: number }): void {
    this.t += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    const rage = this.rage();

    switch (this.state) {
      case 'pace': {
        // Paces facing the player, unhurried: the clock is the threat.
        const dx = target.x - (this.x + this.w / 2);
        if (Math.abs(dx) > 6) this.dir = (dx < 0 ? -1 : 1) as 1 | -1;
        const next = this.x + this.dir * PACE_SPEED * dt;
        if (!this.wallAhead(next)) this.x = next;
        this.legPhase += dt * 4;
        this.chargeTimer -= dt * rage;
        if (this.chargeTimer <= 0) {
          this.state = 'telegraph';
          this.stateTimer = TELEGRAPH / rage;
        }
        break;
      }
      case 'telegraph': {
        // Reared up, trembling: get out of the way or climb onto something.
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this.state = 'charge';
        break;
      }
      case 'charge': {
        const speed = CHARGE_SPEED * rage;
        const next = this.x + this.dir * speed * dt;
        this.smashAhead(next); // cracked barricades blow apart
        if (this.wallAhead(next)) {
          // BAM! Into the wall: stunned, plate open, embers rain down.
          this.state = 'stun';
          this.stateTimer = STUN;
          this.hits++;
          this.rainEmbers();
          for (let i = 0; i < 10; i++) {
            this.spawnDebris(this.dir === 1 ? this.x + this.w : this.x, this.y + 4 + (i % 5) * 2);
          }
        } else {
          this.x = next;
          this.legPhase += dt * 14;
        }
        break;
      }
      case 'stun': {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'pace';
          this.chargeTimer = CHARGE_EVERY / rage;
        }
        break;
      }
    }

    // Embers from the ceiling: fall accelerating and die against the floor.
    for (const e of this.embers) {
      e.vy += EMBER_G * dt;
      e.y += e.vy * dt;
    }
    this.embers = this.embers.filter((e) => !this.level.isSolidAt(e.x, e.y + 2));

    // Decorative debris from the barricades and the wall slam.
    for (const d of this.debris) {
      d.vy += 500 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt;
    }
    this.debris = this.debris.filter((d) => d.life > 0);
  }

  /** Is there a solid wall right ahead (at body height)? */
  private wallAhead(nextX: number): boolean {
    const aheadX = this.dir === 1 ? nextX + this.w : nextX;
    return (
      this.level.isSolidAt(aheadX, this.y + 2) ||
      this.level.isSolidAt(aheadX, this.y + this.h - 2)
    );
  }

  /** Mid-charge, the cracked column ahead bursts. */
  private smashAhead(nextX: number): void {
    const aheadX = this.dir === 1 ? nextX + this.w + 1 : nextX - 1;
    const col = Math.floor(aheadX / TILE);
    const r0 = Math.floor((this.y + 1) / TILE);
    const r1 = Math.floor((this.y + this.h - 1) / TILE);
    for (let row = r0; row <= r1; row++) {
      if (this.level.breakCrack(row, col)) {
        for (let i = 0; i < 6; i++) this.spawnDebris(col * TILE + 4, row * TILE + 4);
      }
    }
  }

  private spawnDebris(px: number, py: number): void {
    // Deterministic over its own clock: no Math.random in data.
    const k = this.debris.length + Math.floor(this.t * 60);
    this.debris.push({
      x: px,
      y: py,
      vx: ((k * 37) % 90) - 45 - this.dir * 20,
      vy: -60 - ((k * 53) % 70),
      life: 0.5 + ((k * 29) % 30) / 100,
    });
  }

  /** The wall slam shakes the ceiling: embers scattered across the arena. */
  private rainEmbers(): void {
    const cx = this.x + this.w / 2;
    EMBER_SPREAD.forEach((off, i) => {
      const jitter = (((this.hits * 31 + i * 17) % 21) - 10);
      this.embers.push({ x: cx + off + jitter, y: 10, vy: 20 + ((i * 13) % 40) });
    });
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    // Falling embers (with their warning glow).
    for (const e of this.embers) {
      drawGlow(ctx, e.x - camX, e.y - camY, 6, '#ff9a3a', 0.7);
      ctx.fillStyle = '#ffe8c0';
      ctx.fillRect(Math.round(e.x - camX) - 1, Math.round(e.y - camY) - 1, 2, 2);
    }
    // Barricade debris.
    ctx.fillStyle = '#8064b0';
    for (const d of this.debris) {
      ctx.fillRect(Math.round(d.x - camX), Math.round(d.y - camY), 1, 1);
    }

    const stunned = this.state === 'stun';
    const charging = this.state === 'charge';
    const rearing = this.state === 'telegraph';
    // Reared up: recoils and trembles; the whole body warns.
    const shake = rearing ? Math.round(Math.sin(this.t * 40)) : 0;
    const px = Math.round(this.x - camX) + shake - (rearing ? this.dir * 2 : 0);
    const py = Math.round(this.y - camY);
    const cx = px + this.w / 2;

    // Charge trail: speed lines behind.
    if (charging) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ff9a3a';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(px + (this.dir === 1 ? -6 - i * 4 : this.w + 3 + i * 4), py + 3 + i * 4, 4, 1);
      }
      ctx.globalAlpha = 1;
    }

    drawGlow(ctx, cx, py + 6, 20, '#ff9a3a', stunned ? 0.65 : 0.35 + (MAX_HP - this.hp) * 0.08);

    const flashing = this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0;

    // Legs: four stubs that pump as it moves.
    const step = Math.sin(this.legPhase) > 0 ? 1 : 0;
    ctx.fillStyle = '#140a06';
    ctx.fillRect(px + 2 + step, py + this.h - 3, 3, 3);
    ctx.fillRect(px + 7 - step, py + this.h - 3, 3, 3);
    ctx.fillRect(px + 11 + step, py + this.h - 3, 3, 3);
    ctx.fillRect(px + 15 - step, py + this.h - 3, 3, 3);

    // Body: block of obsidian with a red-hot belly.
    ctx.fillStyle = flashing ? '#ffffff' : '#1c0d08';
    ctx.fillRect(px, py + 2, this.w, this.h - 4);
    ctx.fillRect(px + 1, py + 1, this.w - 2, this.h - 2);
    if (!flashing) {
      ctx.fillStyle = '#3d2419';
      ctx.fillRect(px + 1, py + 2, this.w - 2, 2);
      // Side magma veins, fiercer with the rage.
      const vein = Math.sin(this.t * (4 + (MAX_HP - this.hp) * 3)) > 0 ? '#ffd23a' : '#d0662a';
      ctx.fillStyle = vein;
      ctx.fillRect(px + 4, py + 6, 2, 1);
      ctx.fillRect(px + 9, py + 8, 3, 1);
      ctx.fillRect(px + 15, py + 6, 2, 1);

      if (stunned) {
        // The plate opens: the exposed core glows — STOMP IT NOW.
        const pulse = Math.sin(this.t * 10) > 0;
        ctx.fillStyle = pulse ? '#ffe8c0' : '#ffd23a';
        ctx.fillRect(px + 5, py, this.w - 10, 3);
        drawGlow(ctx, cx, py + 1, 10, '#ffd23a', 0.6);
        // Little dizzy stars orbiting the head.
        ctx.fillStyle = '#ffe8c0';
        for (let i = 0; i < 3; i++) {
          const a = this.t * 4 + (i * Math.PI * 2) / 3;
          ctx.fillRect(
            Math.round(cx + Math.cos(a) * 8),
            Math.round(py - 4 + Math.sin(a) * 2),
            1, 1,
          );
        }
      } else {
        // The armored plate: smooth obsidian back with a red-hot edge.
        ctx.fillStyle = '#0f0503';
        ctx.fillRect(px + 2, py, this.w - 4, 2);
        ctx.fillStyle = '#d0662a';
        ctx.fillRect(px + 3, py, this.w - 6, 1);
      }

      // Brow and eye: looks toward where it's about to charge.
      const headX = this.dir === 1 ? px + this.w - 5 : px + 1;
      ctx.fillStyle = '#0f0503';
      ctx.fillRect(headX, py + 3, 4, 6);
      ctx.fillStyle = stunned ? '#ffd23a' : '#ff3a1a';
      ctx.fillRect(headX + (this.dir === 1 ? 2 : 1), py + 5, 1, stunned ? 1 : 2);
    }

    // Health pips over the back.
    for (let i = 0; i < MAX_HP; i++) {
      ctx.fillStyle = i < this.hp ? '#ff9a3a' : '#4e2814';
      ctx.fillRect(cx - 7 + i * 5, py - 7, 3, 2);
    }
  }
}
