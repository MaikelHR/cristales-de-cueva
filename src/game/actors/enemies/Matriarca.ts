// ============================================================
//  BOSS — the Matriarch (end of the silk nest)
// ------------------------------------------------------------
//  She never touches the floor and you can never stand above her, so
//  no stomp reaches her where she lives: she hangs from the ceiling
//  on a thread of her own, walks it left and right, and spits venom
//  down at you. Her fight has its own verb, and it is the level's:
//  the weak point is not her body, it is her THREAD. Swing through
//  it — the arc is the only thing that reaches that height — and the
//  silk parts: she drops, cracks against the floor and lies there
//  stunned, and only THEN is she stompable. Then she climbs a fresh
//  thread somewhere else and you go find another anchor.
//  Nothing like the ram (stunned on walls), the axolotl (breaching
//  from water), the foreman (flanked on the ground) or the Custodio
//  (bullet hell): here you cut the rope and then you land the hit.
// ============================================================

import type { Box } from '../../../engine/canvas';
import type { StrKey } from '../../i18n';
import { Level, TILE } from '../../world/Level';
import { drawGlow } from '../../art/glow';
import { sfx } from '../../sfx';
import type { Enemy } from './Enemy';

const MAX_HP = 3;
// She strolls. An arc takes the better part of a second to reach her,
// so a brisk walk turned every cut into a coin flip — and a boss window
// you can only hit by luck is not a window. She also stands STILL while
// winding up a spit, which is the beat the fight is really built on.
const WALK_SPEED = 16;     // px/s along the ceiling (base; rage raises it)
// She hangs LOW on purpose: her thread has to be long enough that a
// vigorous arc (~60°, not a perfect one) crosses it. Combat resolves
// the cut BEFORE body contact, so an arc that grazes her while
// cutting still counts as a hit — reaching her is the challenge, not
// threading a two-pixel needle.
const HANG_DEPTH = 52;     // px her body hangs below the ceiling line
const SPIT_EVERY = 2.4;    // seconds between venom drops (base)
const SPIT_WINDUP = 0.5;   // abdomen swells before spitting (the tell)
const VENOM_SPEED = 92;    // px/s the drop falls
const VENOM_LIFE = 4;
const FALL_G = 620;        // px/s^2 while she drops after the cut
const STUNNED = 2.6;       // seconds on the floor: the stomp window
const CLIMB_SPEED = 54;    // px/s reeling back up to the ceiling
const RAGE_STEP = 0.3;     // +30% pace per hit taken
const HIT_INVULN = 0.7;
/** The cut box is generous on purpose: a swing passes FAST, and a
 *  boss window you can only hit by luck is not a window. */
const THREAD_W = 12;

const SILK = '#c9bcd8';
const SILK_LIT = '#e8e0f0';
const BODY = '#40304e';
const BODY_LIT = '#6b5580';
const MARK = '#ffb0d0';
const VENOM = '#b6ff6a';

interface Venom { x: number; y: number; }
type State = 'hang' | 'windup' | 'falling' | 'stunned' | 'climb';

export class Matriarca implements Enemy {
  readonly layer = 'enemy' as const;
  x: number;
  y: number;
  readonly w = 18;
  readonly h = 14;
  dead = false;
  readonly isBoss = true;
  readonly gooColors = ['#e8e0f0', '#40304e', '#ffb0d0'];
  hp = MAX_HP;

  /** The HUD says what to do, and it CHANGES the moment she falls:
   *  "cut her thread" while she hangs, "now jump on her" while she's
   *  down. Without it the fight reads as unwinnable (playtest). */
  get hintKey(): StrKey {
    return this.state === 'stunned' ? 'hud_stomp_fallen' : 'hud_cut_thread';
  }

  /** Ceiling line her thread is tied to, and the floor she smashes on. */
  private readonly ceilY: number;
  private readonly floorY: number;
  private readonly minX: number;
  private readonly maxX: number;

  private state: State = 'hang';
  private timer = 0;
  private spitTimer = SPIT_EVERY;
  private dir: 1 | -1 = 1;
  private vy = 0;
  private invuln = 0;
  private t = 0;
  private venom: Venom[] = [];

  constructor(px: number, py: number, private level: Level) {
    this.x = px;
    this.ceilY = py;
    this.y = py + HANG_DEPTH;
    // Find the floor under her: that's where a cut thread drops her.
    let row = Math.floor(this.y / TILE);
    while (row < this.level.rows && !this.level.solidCell(row, Math.floor(px / TILE))) row++;
    this.floorY = row * TILE;
    // She walks the ceiling within the open span around her spawn — and
    // the span is measured at the row her BODY hangs in, not at the
    // ceiling: up there the rock is open end to end, and reading that
    // row let her stroll clean out of her own chamber (found in play).
    const bodyRow = Math.floor(this.y / TILE);
    let left = Math.floor(px / TILE);
    while (left > 1 && !this.level.solidCell(bodyRow, left - 1)) left--;
    let right = Math.floor(px / TILE);
    while (right < this.level.cols - 2 && !this.level.solidCell(bodyRow, right + 1)) right++;
    this.minX = left * TILE;
    this.maxX = right * TILE;
  }

  /** Only the crash floor exposes her back. */
  get stompable(): boolean {
    return this.state === 'stunned';
  }

  /** Hanging, her body is armored by height itself: contact hurts. */
  get invulnerable(): boolean {
    return this.state !== 'stunned';
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  /** The thread she hangs from: only a swinging player reaches that
   *  height, and crossing it CUTS it (combat's swingSpot rule).
   *  The box runs from the ceiling down THROUGH the top of her back, so
   *  an arc that passes over her — or grazes her shoulders — counts.
   *  Aiming at a hairline while swinging is not a fight, it's a lottery
   *  (playtest: "I jumped on her and just got hurt"). */
  swingSpot(): Box | null {
    if (this.state !== 'hang' && this.state !== 'windup') return null;
    const cx = this.x + this.w / 2;
    const bottom = this.y + 6; // the thread, plus her back
    return { x: cx - THREAD_W / 2, y: this.ceilY, w: THREAD_W, h: bottom - this.ceilY };
  }

  /** The arc crossed her thread: the silk parts and she drops. */
  onSwingCut(): boolean {
    if (this.state !== 'hang' && this.state !== 'windup') return false;
    this.state = 'falling';
    this.timer = 0;
    this.vy = 0;
    sfx.snap();
    return true;
  }

  hazards(): Box[] {
    return this.venom.map((v) => ({ x: v.x - 2, y: v.y - 2, w: 5, h: 5 }));
  }

  onStomp(): boolean {
    if (this.state !== 'stunned' || this.invuln > 0) return false;
    this.hp--;
    this.invuln = HIT_INVULN;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    // Straight back up the moment she's hit: find another anchor.
    this.state = 'climb';
    this.timer = 0;
    return false;
  }

  private rage(): number {
    return 1 + (MAX_HP - this.hp) * RAGE_STEP;
  }

  update(dt: number, target: { x: number; y: number }): void {
    this.t += dt;
    this.timer += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    const rage = this.rage();

    switch (this.state) {
      case 'hang': {
        // Walks her ceiling, turning at the ends of the span.
        this.x += this.dir * WALK_SPEED * rage * dt;
        if (this.x <= this.minX) { this.x = this.minX; this.dir = 1; }
        if (this.x + this.w >= this.maxX) { this.x = this.maxX - this.w; this.dir = -1; }
        this.y = this.ceilY + HANG_DEPTH + Math.sin(this.t * 1.5) * 2;
        this.spitTimer -= dt * rage;
        if (this.spitTimer <= 0) {
          this.state = 'windup';
          this.timer = 0;
        }
        break;
      }
      case 'windup': {
        // Abdomen swelling: the drop is coming, right under her.
        this.y = this.ceilY + HANG_DEPTH + Math.sin(this.t * 1.5) * 2;
        if (this.timer >= SPIT_WINDUP) {
          this.venom.push({ x: this.x + this.w / 2, y: this.y + this.h });
          this.spitTimer = SPIT_EVERY;
          this.state = 'hang';
          this.timer = 0;
        }
        break;
      }
      case 'falling': {
        this.vy += FALL_G * dt;
        this.y += this.vy * dt;
        if (this.y + this.h >= this.floorY) {
          this.y = this.floorY - this.h;
          this.state = 'stunned';
          this.timer = 0;
        }
        break;
      }
      case 'stunned': {
        if (this.timer >= STUNNED) {
          this.state = 'climb';
          this.timer = 0;
        }
        break;
      }
      case 'climb': {
        // Reels up to a NEW spot on the ceiling: the next cut is a new
        // problem, at a different anchor.
        this.y -= CLIMB_SPEED * rage * dt;
        this.x += this.dir * WALK_SPEED * rage * dt;
        if (this.x <= this.minX || this.x + this.w >= this.maxX) {
          this.dir = (-this.dir) as 1 | -1;
        }
        if (this.y <= this.ceilY + HANG_DEPTH) {
          this.y = this.ceilY + HANG_DEPTH;
          this.state = 'hang';
          this.timer = 0;
          this.spitTimer = SPIT_EVERY / rage;
        }
        break;
      }
    }

    // Venom: falls straight, dies against rock or old age.
    for (const v of this.venom) v.y += VENOM_SPEED * dt;
    this.venom = this.venom.filter(
      (v) => !this.level.isSolidAt(v.x, v.y) && v.y < this.floorY + TILE * 2,
    );
    if (this.venom.length > 12) this.venom.splice(0, this.venom.length - 12);
    void VENOM_LIFE;
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    // The venom drops, with their warning glow.
    for (const v of this.venom) {
      drawGlow(ctx, v.x - camX, v.y - camY, 6, VENOM, 0.6);
      ctx.fillStyle = VENOM;
      ctx.fillRect(Math.round(v.x - camX) - 1, Math.round(v.y - camY) - 2, 2, 4);
      ctx.fillStyle = '#e8ffd0';
      ctx.fillRect(Math.round(v.x - camX) - 1, Math.round(v.y - camY) - 2, 1, 1);
    }

    const px = Math.round(this.x - camX);
    const py = Math.round(this.y - camY);
    const cx = px + this.w / 2;
    const hanging = this.state === 'hang' || this.state === 'windup';
    const windup = this.state === 'windup';
    const stunned = this.state === 'stunned';
    const flashing = this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0;

    // THE THREAD: her lifeline and her weak point — thick, lit, and it
    // pulses so you read it as a target, not as scenery.
    if (hanging || this.state === 'climb') {
      const topY = Math.round(this.ceilY - camY);
      const pulse = 0.2 + (Math.sin(this.t * 4) + 1) * 0.12;
      drawGlow(ctx, cx, (topY + py) / 2, 14, SILK_LIT, pulse);
      for (let yy = 0; yy < py - topY; yy += 2) {
        const sway = Math.round(Math.sin(this.t * 2 + yy * 0.1) * 1.2);
        ctx.fillStyle = yy % 6 < 3 ? SILK_LIT : SILK;
        ctx.fillRect(cx + sway, topY + yy, 2, 2);
      }
      // The knot at the ceiling.
      ctx.fillStyle = SILK_LIT;
      ctx.fillRect(cx - 3, topY, 6, 2);
    }

    drawGlow(ctx, cx, py + 7, 22, MARK, stunned ? 0.5 : 0.25 + (MAX_HP - this.hp) * 0.06);

    // Eight long legs, arched over the body like a cage.
    ctx.fillStyle = flashing ? '#ffffff' : BODY;
    const legPhase = Math.sin(this.t * (stunned ? 8 : 2));
    for (let i = 0; i < 4; i++) {
      const ly = py + 2 + i * 3;
      const span = 7 - Math.abs(i - 1.5) * 1.5;
      const w = Math.round(span + legPhase * (stunned ? 2 : 1));
      ctx.fillRect(px - w, ly, w, 2);
      ctx.fillRect(px + this.w, ly - Math.round(legPhase), w, 2);
    }

    // Abdomen: swells while winding up, pale hourglass on its back.
    const swell = windup ? Math.round((this.timer / SPIT_WINDUP) * 3) : 0;
    ctx.fillStyle = flashing ? '#ffffff' : BODY;
    ctx.fillRect(px - swell / 2, py + 1, this.w + swell, this.h - 2);
    if (!flashing) {
      ctx.fillStyle = BODY_LIT;
      ctx.fillRect(px + 1, py + 1, this.w - 2, 3); // the back — the stomp face
      ctx.fillStyle = windup ? VENOM : SILK_LIT;
      ctx.fillRect(cx - 2, py + 5, 4, 2);
      ctx.fillRect(cx - 3, py + 7, 6, 2);
      ctx.fillRect(cx - 2, py + 9, 4, 2);
      // Eyes: a row of pink beads; shut and dizzy while stunned.
      ctx.fillStyle = MARK;
      if (stunned) {
        ctx.fillRect(px + 3, py + 3, 3, 1);
        ctx.fillRect(px + this.w - 6, py + 3, 3, 1);
        // Dizzy sparks orbiting: THIS is the window.
        ctx.fillStyle = SILK_LIT;
        for (let i = 0; i < 3; i++) {
          const a = this.t * 4 + (i * Math.PI * 2) / 3;
          ctx.fillRect(Math.round(cx + Math.cos(a) * 10), Math.round(py - 4 + Math.sin(a) * 2), 1, 1);
        }
      } else {
        ctx.fillRect(px + 3, py + 2, 2, 2);
        ctx.fillRect(px + this.w - 5, py + 2, 2, 2);
        ctx.fillRect(px + 6, py + 3, 1, 1);
        ctx.fillRect(px + this.w - 7, py + 3, 1, 1);
      }
    }

    // Health pips over her back.
    for (let i = 0; i < MAX_HP; i++) {
      ctx.fillStyle = i < this.hp ? MARK : '#3a2f42';
      ctx.fillRect(cx - 7 + i * 5, py - 6, 3, 2);
    }
  }
}
