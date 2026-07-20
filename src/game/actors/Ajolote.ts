// ============================================================
//  AJOLOTE — Abyssal axolotl (the cenote boss)
// ------------------------------------------------------------
//  Its verb is BREACH-TIMING — nothing like the flyer-boss (float &
//  shoot) or the ariete (ground charge). It CIRCLES underwater where
//  its body burns but the water doesn't; then bubbles BOIL converging
//  under the spot you're standing (~1s tell) and it BREACHES up in an
//  arc. Its gold crystal crest is stompable ONLY mid-breach; its violet
//  flanks always burn. Three stomps snuff it, and each one enrages it:
//  faster circling, a shorter boil and one more medusa loosed into the
//  pool. While it lives the door stays shut. Drawn with primitives.
// ============================================================

import type { Box } from '../../engine/canvas';
import type { StrKey } from '../i18n';
import { TILE } from '../world/Level';
import { drawGlow } from '../art/glow';
import { sfx } from '../sfx';
import type { Enemy } from './enemies/Enemy';
import { Medusa } from './Medusa';

const MAX_HP = 3;
const CIRCLE_SPEED = 1.5; // rad/s base angular speed of the circling
const CIRCLE_RX = 42;     // px horizontal radius
const CIRCLE_RY = 9;      // px vertical radius (shallow: it stays just under)
const REST = 1.3;         // circling time before an attack (base; rage shortens)
const BOIL_TIME = 1.0;    // bubble-boil telegraph under the target (base)
const BREACH_V = 200;     // initial upward breach speed (px/s)
const BREACH_G = 360;     // breach gravity — arcs it back down (px/s^2)
const HIT_INVULN = 0.7;   // i-frames after a valid stomp
const RAGE_STEP = 0.3;    // +30% speed / shorter tells per hit taken

type State = 'circle' | 'boil' | 'breach' | 'return';

interface Bubble { x: number; y: number; vy: number; life: number; }

export class Ajolote implements Enemy {
  readonly layer = 'enemy' as const;
  x: number;
  y: number;
  readonly w = 20;
  readonly h = 16;
  dead = false;
  readonly isBoss = true;
  readonly gooColors = ['#7ce0ff', '#b98bff', '#d6f7ff'];
  hp = MAX_HP;

  private readonly homeCX: number; // circling center (the pool center)
  private readonly homeCY: number;
  private cx: number; // current body center
  private cy: number;
  private state: State = 'circle';
  private stateTimer = REST;
  private angle = 0;
  private targetX = 0;   // the boiled column the breach rises through
  private breachVy = 0;
  private invuln = 0;
  private t = 0;
  private boilAccum = 0;
  private bubbles: Bubble[] = [];
  private spawned: Medusa[] = [];

  constructor(px: number, py: number) {
    // The spawn cell is the pool center: the boss circles around it.
    this.homeCX = px + TILE / 2;
    this.homeCY = py + TILE / 2;
    this.cx = this.homeCX + CIRCLE_RX;
    this.cy = this.homeCY;
    this.x = this.cx - this.w / 2;
    this.y = this.cy - this.h / 2;
  }

  /** The crest opens ONLY during the breach — that's the stomp window. */
  get stompable(): boolean {
    return this.state === 'breach';
  }

  /** Only its crest, only mid-breach: the HUD says so, because its
   *  violet flanks look just as stompable and are not. */
  get hintKey(): StrKey {
    return this.state === 'breach' ? 'hud_stomp_now' : 'hud_crest';
  }

  private rage(): number {
    return 1 + (MAX_HP - this.hp) * RAGE_STEP;
  }

  box(): Box {
    if (this.state === 'breach') {
      // Only the gold crest (top-center) is the stompable body mid-breach.
      return { x: this.cx - 5, y: this.y, w: 10, h: 5 };
    }
    // Underwater the whole body burns on contact (it isn't stompable).
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  hazards(): Box[] {
    // The loosed jellyfish are moving hazards for the rest of the fight.
    const hz: Box[] = this.spawned.map((m) => m.box());
    if (this.state === 'breach') {
      // The violet flanks burn — only the crest between them is safe to hit.
      hz.push({ x: this.x, y: this.y + 2, w: 7, h: this.h - 2 });
      hz.push({ x: this.x + this.w - 7, y: this.y + 2, w: 7, h: this.h - 2 });
    }
    return hz;
  }

  onStomp(): boolean {
    if (this.state !== 'breach' || this.invuln > 0) return false;
    this.hp--;
    this.invuln = HIT_INVULN;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    // Enraged: crash-dives at once and looses another jellyfish. The dive
    // is physical — gravity plus a hard downward shove until the splashdown
    // (teleporting home read as a glitch in playtests).
    this.spawnMedusa();
    this.breachVy = Math.max(this.breachVy, BREACH_V * 0.9);
    return false;
  }

  /** Hits the water: spray burst, then re-join the circuit where it landed
   *  (never a position snap — the angle is re-seeded so the circle point
   *  starts exactly under the splash and 'return' eases the last few px). */
  private splashdown(rage: number): void {
    this.cy = this.homeCY;
    this.breachVy = 0;
    const cos = Math.max(-1, Math.min(1, (this.cx - this.homeCX) / CIRCLE_RX));
    this.angle = Math.acos(cos); // sin >= 0: the underwater half of the circle
    this.state = 'return';
    this.stateTimer = REST / rage;
    for (let i = 0; i < 10; i++) {
      this.bubbles.push({
        x: this.cx + ((i * 13) % 17) - 8,
        y: this.homeCY - 3,
        vy: 40 + ((i * 29) % 30),
        life: 0.5,
      });
    }
  }

  private spawnMedusa(): void {
    const n = this.spawned.length;
    const side = n % 2 === 0 ? -1 : 1;
    const off = 20 + (n >> 1) * 14;
    // Loosed into the pool, a little below the surface so its bob stays wet.
    this.spawned.push(new Medusa(this.homeCX + side * off - 4, this.homeCY + 4, 1.5));
  }

  private emitBoil(dt: number): void {
    this.boilAccum += dt;
    while (this.boilAccum > 0.03) {
      this.boilAccum -= 0.03;
      const k = this.bubbles.length + Math.floor(this.t * 60);
      const spread = ((k * 37) % 22) - 11; // fan that CONVERGES as it rises
      this.bubbles.push({
        x: this.targetX + spread,
        y: this.homeCY - 2,
        vy: 34 + (k % 22),
        life: 0.8,
      });
    }
  }

  update(dt: number, target: { x: number; y: number }): void {
    this.t += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    const rage = this.rage();

    switch (this.state) {
      case 'circle': {
        this.angle += CIRCLE_SPEED * rage * dt;
        this.cx = this.homeCX + Math.cos(this.angle) * CIRCLE_RX;
        this.cy = this.homeCY + Math.sin(this.angle) * CIRCLE_RY;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'boil';
          this.stateTimer = BOIL_TIME / rage;
          this.targetX = Math.max(
            this.homeCX - CIRCLE_RX,
            Math.min(this.homeCX + CIRCLE_RX, target.x),
          );
          sfx.breach(); // the boil roar: "it's coming up HERE"
        }
        break;
      }
      case 'boil': {
        // Slide under the target and settle to the launch line, boiling.
        this.cx += (this.targetX - this.cx) * Math.min(1, 6 * dt);
        this.cy += (this.homeCY - this.cy) * Math.min(1, 6 * dt);
        this.emitBoil(dt);
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'breach';
          this.breachVy = -BREACH_V;
          this.cx = this.targetX;
        }
        break;
      }
      case 'breach': {
        this.breachVy += BREACH_G * dt;
        this.cy += this.breachVy * dt;
        this.cx = this.targetX;
        if (this.cy >= this.homeCY) this.splashdown(rage);
        break;
      }
      case 'return': {
        // Sink back onto the circuit point it splashed nearest to. The point
        // holds STILL while it settles (chasing an advancing point never
        // converges — the ease lags it forever); circling resumes from that
        // exact spot, and the rest clock keeps ticking so pacing matches
        // the old instant re-join.
        const tx = this.homeCX + Math.cos(this.angle) * CIRCLE_RX;
        const ty = this.homeCY + Math.sin(this.angle) * CIRCLE_RY;
        const k = Math.min(1, 6 * dt);
        this.cx += (tx - this.cx) * k;
        this.cy += (ty - this.cy) * k;
        this.stateTimer = Math.max(0, this.stateTimer - dt);
        if (Math.abs(tx - this.cx) < 1.5 && Math.abs(ty - this.cy) < 1.5) {
          this.cx = tx;
          this.cy = ty;
          this.state = 'circle';
        }
        break;
      }
    }

    // Rising boil bubbles converge toward the target and fade.
    for (const b of this.bubbles) {
      b.y -= b.vy * dt;
      b.x += (this.targetX - b.x) * Math.min(1, 3 * dt);
      b.life -= dt;
    }
    this.bubbles = this.bubbles.filter((b) => b.life > 0);

    this.x = this.cx - this.w / 2;
    this.y = this.cy - this.h / 2;

    for (const m of this.spawned) m.update(dt);
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    // Loosed jellyfish (drawn as part of the boss: they aren't room actors).
    for (const m of this.spawned) m.draw(ctx, camX, camY);

    // Boil bubbles: the converging tell.
    for (const b of this.bubbles) {
      ctx.globalAlpha = Math.min(1, b.life) * 0.7;
      ctx.fillStyle = '#d6f7ff';
      ctx.fillRect(Math.round(b.x - camX), Math.round(b.y - camY), 1, 1);
    }
    ctx.globalAlpha = 1;
    if (this.state === 'boil') {
      const p = Math.sin(this.t * 18) * 0.5 + 0.5;
      drawGlow(ctx, this.targetX - camX, this.homeCY - camY, 8, '#7ce0ff', 0.2 + p * 0.2);
    }

    const px = Math.round(this.x - camX);
    const py = Math.round(this.y - camY);
    const cx = px + this.w / 2;
    const breaching = this.state === 'breach';
    const flashing = this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0;

    // Underwater aura (dim), or the two-tone breach beacon (gold crest / violet flanks).
    drawGlow(ctx, cx, py + this.h / 2, 20, '#7ce0ff', breaching ? 0.5 : 0.3);
    if (breaching) {
      drawGlow(ctx, px + 3, py + this.h / 2, 9, '#b98bff', 0.5); // left flank
      drawGlow(ctx, px + this.w - 3, py + this.h / 2, 9, '#b98bff', 0.5); // right flank
    }

    // Frilly gills: three fronds each side of the head (the axolotl silhouette).
    ctx.fillStyle = flashing ? '#ffffff' : '#b98bff';
    for (let i = 0; i < 3; i++) {
      const fy = py + 3 + i * 4;
      const wig = Math.round(Math.sin(this.t * 4 + i) * 1.5);
      ctx.fillRect(px - 2, fy + wig, 3, 1);
      ctx.fillRect(px + this.w - 1, fy - wig, 3, 1);
    }

    // Body: a rounded organic blob (NOT a diamond, NOT a block).
    ctx.fillStyle = flashing ? '#ffffff' : '#2d5c94';
    ctx.fillRect(px + 2, py + 2, this.w - 4, this.h - 4);
    ctx.fillRect(px + 1, py + 4, this.w - 2, this.h - 8);
    ctx.fillRect(px + 4, py + 1, this.w - 8, this.h - 2);
    if (!flashing) {
      // Lit back, shadowed belly (light from above).
      ctx.fillStyle = '#5a9fd4';
      ctx.fillRect(px + 4, py + 3, this.w - 8, 3);
      ctx.fillStyle = '#16283d';
      ctx.fillRect(px + 3, py + this.h - 4, this.w - 6, 2);

      // Flanks: violet & lit ONLY when breaching (the "don't touch the sides").
      if (breaching) {
        ctx.fillStyle = '#b98bff';
        ctx.fillRect(px + 1, py + 4, 3, this.h - 7);
        ctx.fillRect(px + this.w - 4, py + 4, 3, this.h - 7);
      }

      // Eyes.
      ctx.fillStyle = '#11242e';
      ctx.fillRect(cx - 4, py + 6, 2, 2);
      ctx.fillRect(cx + 2, py + 6, 2, 2);
      ctx.fillStyle = '#d6f7ff';
      ctx.fillRect(cx - 4, py + 6, 1, 1);
      ctx.fillRect(cx + 2, py + 6, 1, 1);
    }

    // The crystal crest on top: gold & glowing when it's the stomp target.
    if (breaching) {
      const pulse = Math.sin(this.t * 12) > 0;
      ctx.fillStyle = pulse ? '#fff7c9' : '#ffd23a';
      ctx.fillRect(cx - 5, py - 2, 10, 3);
      ctx.fillRect(cx - 3, py - 3, 6, 1);
      drawGlow(ctx, cx, py - 1, 10, '#ffd23a', 0.6);
    } else {
      // Dormant crown: a few dim crystal nubs (reads as "not yet").
      ctx.fillStyle = '#3f9ad0';
      ctx.fillRect(cx - 4, py, 2, 2);
      ctx.fillRect(cx - 1, py - 1, 2, 2);
      ctx.fillRect(cx + 2, py, 2, 2);
    }

    // Health pips above.
    for (let i = 0; i < MAX_HP; i++) {
      ctx.fillStyle = i < this.hp ? '#7ce0ff' : '#2d5c94';
      ctx.fillRect(cx - 7 + i * 5, py - 7, 3, 2);
    }
  }
}
