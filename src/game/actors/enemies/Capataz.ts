// ============================================================
//  BOSS — the Iron Foreman (end of the forgotten mine)
// ------------------------------------------------------------
//  The mine's last warden, an iron-plated hulk behind a shovel as
//  wide as himself. He has NO projectiles and never hurries: he
//  MARCHES at you, and his front is a wall — stomp and pound both
//  glance off the raised shovel (invulnerable from ahead). His one
//  weak point is the LANTERN bolted to his back, and his one
//  weakness is how slowly he turns: slip behind him — the arena's
//  1-tile burrows are the only way past his blade — and stomp the
//  glass while he's still coming around. Getting hurt enrages him:
//  he faces you at once and marches faster. If you dance in his
//  face he ANSWERS: the shovel rises (the tell) and SLAMS the
//  ground ahead. Three lantern hits put the mine to rest.
//  While he lives, the door won't open.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { Level, TILE } from '../../world/Level';
import { drawGlow } from '../../art/glow';
import type { Enemy } from './Enemy';

const MARCH_SPEED = 26;   // px/s of the advance (base; rage raises it)
const NOTICE = 0.45;      // seconds registering you've crossed behind him
const TURN = 0.9;         // seconds the half-turn takes (THE window; ÷rage)
const TURN_REST = 0.3;    // seconds after a turn before he can notice again
const SWING_RANGE = 20;   // px ahead that trigger the shovel slam
const SWING_WINDUP = 0.42;// seconds the shovel hangs raised (the tell)
const SWING_SLAM = 0.25;  // seconds the slam hazard lives
const SWING_REST = 1.6;   // seconds between swings
const MAX_HP = 3;
const RAGE_STEP = 0.3;    // +30% pace (and faster turns) per lantern hit
const HIT_INVULN = 0.8;   // i-frames after a lantern stomp

type State = 'march' | 'notice' | 'turn' | 'windup' | 'slam';

export class Capataz implements Enemy {
  readonly layer = 'enemy' as const;
  x: number;
  y: number;
  readonly w = 12;
  readonly h = 19;
  dead = false;
  readonly isBoss = true;
  readonly hintKey = 'hud_lantern' as const; // his front shrugs off stomps
  readonly gooColors = ['#e08a4a', '#ffd9a0', '#8a837a'];
  hp = MAX_HP;

  private state: State = 'march';
  private stateTimer = 0;
  private facing: 1 | -1 = -1;
  private invuln = 0;
  private swingRest = 0;
  private noticeRest = 0;
  private lastPlayerX = 0;
  private t = 0;
  private stepPhase = 0;

  constructor(px: number, py: number, private level: Level) {
    this.x = px;
    this.y = py + (TILE - this.h); // feet flush with the floor
  }

  /** Which side of him the player is on (from the last update). */
  private playerSide(): 1 | -1 {
    return this.lastPlayerX < this.x + this.w / 2 ? -1 : 1;
  }

  /** Is his back to the player? Only then is the lantern in play. */
  private get exposed(): boolean {
    return this.playerSide() !== this.facing;
  }

  /** From the front the raised shovel is a wall: stomp AND pound both
   *  glance off (the medusa's rule, worn as armor). */
  get invulnerable(): boolean {
    return !this.exposed;
  }

  /** The lantern: stompable only from behind. */
  get stompable(): boolean {
    return this.exposed;
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  hazards(): Box[] {
    if (this.state !== 'slam') return [];
    // The shovel slamming the ground just ahead of him.
    const sx = this.facing === 1 ? this.x + this.w : this.x - SWING_RANGE + 4;
    return [{ x: sx, y: this.y + 4, w: SWING_RANGE - 4, h: this.h - 4 }];
  }

  onStomp(): boolean {
    if (!this.exposed || this.invuln > 0) return false;
    this.hp--;
    this.invuln = HIT_INVULN;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    // The hit ENRAGES him: he faces you at once (the window slams
    // shut) and every pace after this one is quicker.
    this.facing = this.playerSide();
    this.state = 'march';
    this.stateTimer = 0;
    this.noticeRest = TURN_REST;
    return false;
  }

  /** The rage: 1 at the start, grows with each lantern hit. */
  private rage(): number {
    return 1 + (MAX_HP - this.hp) * RAGE_STEP;
  }

  /** Is there a solid wall right ahead (at body height)? The burrow
   *  gaps at floor level don't fool him — he can't fit anyway. */
  private wallAhead(nextX: number): boolean {
    const aheadX = this.facing === 1 ? nextX + this.w : nextX;
    return (
      this.level.isSolidAt(aheadX, this.y + 2) ||
      this.level.isSolidAt(aheadX, this.y + this.h - 6)
    );
  }

  update(dt: number, target: { x: number; y: number }): void {
    this.t += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.swingRest = Math.max(0, this.swingRest - dt);
    this.noticeRest = Math.max(0, this.noticeRest - dt);
    this.lastPlayerX = target.x;
    const rage = this.rage();

    switch (this.state) {
      case 'march': {
        // He advances where he's LOOKING; noticing you elsewhere is slow.
        const next = this.x + this.facing * MARCH_SPEED * rage * dt;
        const blocked = this.wallAhead(next);
        if (!blocked) {
          this.x = next;
          this.stepPhase += dt * 3.2 * rage;
        }
        // Player right ahead at his height: the shovel answers.
        const ahead = this.exposed
          ? false
          : Math.abs(target.x - (this.facing === 1 ? this.x + this.w : this.x)) < SWING_RANGE &&
            target.y > this.y - 10;
        if (ahead && this.swingRest <= 0) {
          this.state = 'windup';
          this.stateTimer = SWING_WINDUP;
          break;
        }
        // Behind him, or marched into a wall: it slowly dawns on him.
        if (this.noticeRest <= 0 && (this.exposed || blocked)) {
          this.state = 'notice';
          this.stateTimer = NOTICE / rage;
        }
        break;
      }
      case 'notice': {
        // The helmet lamp blinks white: "...eh?" — still exposed.
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'turn';
          this.stateTimer = TURN / rage;
        }
        break;
      }
      case 'turn': {
        // The half-turn, shovel dragging: THE window stays open until
        // the very last frame (facing flips only at the end).
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.facing = (-this.facing) as 1 | -1;
          this.state = 'march';
          this.noticeRest = TURN_REST;
        }
        break;
      }
      case 'windup': {
        // Shovel raised high, trembling: get off his doorstep.
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'slam';
          this.stateTimer = SWING_SLAM;
        }
        break;
      }
      case 'slam': {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'march';
          this.swingRest = SWING_REST / rage;
        }
        break;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const turning = this.state === 'turn';
    const noticing = this.state === 'notice';
    const windup = this.state === 'windup';
    const slamming = this.state === 'slam';
    const shake = windup ? Math.round(Math.sin(this.t * 40)) : 0;
    const px = Math.round(this.x - camX) + shake;
    const py = Math.round(this.y - camY);
    const cx = px + this.w / 2;
    const flashing = this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0;
    const rageGlow = (MAX_HP - this.hp) * 0.08;

    drawGlow(ctx, cx, py + 4, 18, '#e08a4a', 0.3 + rageGlow);

    // Boots pumping with the march.
    const step = Math.sin(this.stepPhase) > 0 ? 1 : 0;
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(px + 1 + step, py + this.h - 3, 4, 3);
    ctx.fillRect(px + this.w - 5 - step, py + this.h - 3, 4, 3);

    // Iron body: riveted plate.
    ctx.fillStyle = flashing ? '#ffffff' : '#4a4440';
    ctx.fillRect(px + 1, py + 4, this.w - 2, this.h - 7);
    if (!flashing) {
      ctx.fillStyle = '#6a625a';
      ctx.fillRect(px + 1, py + 4, this.w - 2, 2);
      ctx.fillStyle = '#e08a4a'; // copper rivets
      ctx.fillRect(px + 2, py + 7, 1, 1);
      ctx.fillRect(px + this.w - 3, py + 7, 1, 1);
      ctx.fillRect(px + 2, py + 12, 1, 1);
      ctx.fillRect(px + this.w - 3, py + 12, 1, 1);
    }

    // Helmet with its mood lamp: amber marching, white "...eh?",
    // red while the shovel answers.
    ctx.fillStyle = flashing ? '#ffffff' : '#e08a4a';
    ctx.fillRect(px + 1, py, this.w - 2, 4);
    ctx.fillRect(px, py + 2, this.w, 2);
    if (!flashing) {
      const lampX = this.facing === 1 ? px + this.w - 2 : px;
      const lamp = noticing
        ? Math.sin(this.t * 24) > 0 ? '#ffffff' : '#ffd9a0'
        : windup || slamming
          ? '#ff5a3a'
          : '#ffd9a0';
      ctx.fillStyle = lamp;
      ctx.fillRect(lampX, py + 1, 2, 2);
      drawGlow(ctx, lampX + 1, py + 2, 6, lamp, 0.35);
    }

    // The SHOVEL: a blade as tall as himself, held at his front —
    // raised overhead in the windup, planted in the ground on the slam.
    if (!flashing) {
      const bladeSide = this.facing === 1 ? px + this.w : px - 4;
      ctx.fillStyle = '#6b4a2e'; // the haft, across the body
      ctx.fillRect(px + (this.facing === 1 ? 3 : 1), py + 9, this.w - 4, 2);
      ctx.fillStyle = '#8a837a';
      if (windup) {
        // Overhead: the whole blade hangs above him, trembling.
        ctx.fillRect(px - 1, py - 6, this.w + 2, 4);
        ctx.fillStyle = '#b8b0a4';
        ctx.fillRect(px - 1, py - 6, this.w + 2, 1);
      } else if (slamming) {
        // Planted ahead: dust kicks off the impact line.
        const bx = this.facing === 1 ? px + this.w : px - 6;
        ctx.fillRect(bx, py + this.h - 5, 6, 5);
        ctx.fillStyle = '#b8b0a4';
        ctx.fillRect(bx, py + this.h - 5, 6, 1);
        ctx.fillStyle = '#a87848';
        for (let i = 0; i < 3; i++) {
          const seed = Math.floor(this.t * 20) + i * 7;
          const dx = this.facing === 1 ? this.w + 2 + ((seed * 5) % 12) : -4 - ((seed * 5) % 12);
          ctx.fillRect(px + dx, py + this.h - 2 - ((seed * 3) % 5), 1, 1);
        }
      } else if (turning) {
        // Dragged across as he comes around: caught mid-swap.
        const p = 1 - this.stateTimer / (TURN / this.rage());
        const drag = Math.round((p - 0.5) * 2 * this.facing * -6);
        ctx.fillRect(cx - 2 + drag, py + 2, 4, this.h - 6);
      } else {
        // At his front: the wall you cannot stomp through.
        ctx.fillRect(bladeSide, py + 1, 4, this.h - 4);
        ctx.fillStyle = '#b8b0a4';
        ctx.fillRect(this.facing === 1 ? bladeSide : bladeSide + 3, py + 1, 1, this.h - 4);
      }
    }

    // The LANTERN on his back: the weak point, always visible — and
    // pulsing hard whenever your side of him is the open one.
    if (!flashing) {
      const lx = this.facing === 1 ? px - 2 : px + this.w - 1;
      const hot = this.exposed && !this.dead;
      const pulse = hot ? 0.5 + Math.sin(this.t * 8) * 0.25 : 0.25;
      drawGlow(ctx, lx + 1, py + 7, hot ? 10 : 6, '#ffd9a0', pulse);
      ctx.fillStyle = '#6b4a2e';
      ctx.fillRect(lx, py + 5, 3, 5);
      ctx.fillStyle = hot && Math.sin(this.t * 8) > 0 ? '#fff3c0' : '#ffd9a0';
      ctx.fillRect(lx, py + 6, 3, 3);
    }

    // Health pips over the helmet.
    for (let i = 0; i < MAX_HP; i++) {
      ctx.fillStyle = i < this.hp ? '#e08a4a' : '#3a3430';
      ctx.fillRect(cx - 7 + i * 5, py - 10, 3, 2);
    }
  }
}
