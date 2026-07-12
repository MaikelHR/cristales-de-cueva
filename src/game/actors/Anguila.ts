// ============================================================
//  ANGUILA (crystal eel)
// ------------------------------------------------------------
//  Lurks along a single lane (a horizontal or vertical corridor).
//  Step into the lane and it COILS with a crackle (the ~0.5s tell),
//  then DARTS the length of the lane, then drifts STUNNED ~1s. You
//  can't stomp it and you can't pound it (invulnerable): the ONLY way
//  to finish it is the dash-lunge, and only while it's dazed. That's
//  the level's combat lesson — the lunge is a weapon. Drawn with
//  primitives (a segmented, wobbling body), palette-consistent.
// ============================================================

import type { Box } from '../../engine/canvas';
import { Level, TILE } from '../world/Level';
import { drawGlow } from '../art/glow';
import { sfx } from '../sfx';
import type { Enemy } from './enemies/Enemy';

const IDLE_SPEED = 14;   // slow lurking patrol along the lane
const DART_SPEED = 210;  // the fast strike
const COIL_TIME = 0.5;   // coils + crackles before striking (the telegraph)
const STUN_TIME = 1.0;   // drifts dazed after the strike (the opening)
const REARM = 0.7;       // a beat before it can trigger again
const LANE_BAND = 11;    // px: how close to the lane axis counts as "in the lane"

type State = 'idle' | 'coil' | 'dart' | 'stun';

export class Anguila implements Enemy {
  readonly layer = 'enemy' as const;
  x = 0;
  y = 0;
  readonly w: number;
  readonly h: number;
  dead = false;
  readonly stompable = false;   // no stomping the eel...
  readonly invulnerable = true; // ...and no pounding it: the lunge is its ONLY counter
  readonly gooColors = ['#7ce0ff', '#b98bff', '#f5fcff'];

  private readonly home: number;  // spawn coord along the lane axis
  private readonly lo: number;    // lane bounds along the axis
  private readonly hi: number;
  private readonly fixed: number; // the constant (perpendicular) coord
  private along: number;          // current position along the axis
  private dir: 1 | -1 = 1;
  private state: State = 'idle';
  private stateTimer = 0;
  private rearm = 0;
  private t = 0;

  constructor(
    px: number,
    py: number,
    private axis: 'x' | 'y',
    rangeTiles: number,
    private level: Level,
  ) {
    // Long along its lane, slim across it.
    this.w = axis === 'x' ? 16 : 6;
    this.h = axis === 'x' ? 6 : 16;
    const rangePx = rangeTiles * TILE;
    if (axis === 'x') {
      this.home = px;
      this.fixed = py;
    } else {
      this.home = py;
      this.fixed = px;
    }
    this.lo = this.home - rangePx;
    this.hi = this.home + rangePx;
    this.along = this.home;
    this.syncXY();
  }

  /** true = it can be finished off right now (a dashing lunge lands). */
  get dashVulnerable(): boolean {
    return this.state === 'stun';
  }

  private syncXY(): void {
    if (this.axis === 'x') {
      this.x = this.along;
      this.y = this.fixed;
    } else {
      this.x = this.fixed;
      this.y = this.along;
    }
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  /** Is the player inside the strike lane (aligned AND within reach)? */
  private playerInLane(tx: number, ty: number): boolean {
    if (this.axis === 'x') {
      return Math.abs(ty - this.fixed) < LANE_BAND && tx > this.lo && tx < this.hi + this.w;
    }
    return Math.abs(tx - this.fixed) < LANE_BAND && ty > this.lo && ty < this.hi + this.h;
  }

  update(dt: number, target: { x: number; y: number }): void {
    this.t += dt;
    this.rearm = Math.max(0, this.rearm - dt);

    switch (this.state) {
      case 'idle': {
        // Lurks, patrolling its lane slowly, until the player steps in.
        this.along += this.dir * IDLE_SPEED * dt;
        if (this.along <= this.lo) {
          this.along = this.lo;
          this.dir = 1;
        } else if (this.along >= this.hi) {
          this.along = this.hi;
          this.dir = -1;
        }
        if (this.rearm === 0 && this.playerInLane(target.x, target.y)) {
          const aim = this.axis === 'x' ? target.x : target.y;
          this.state = 'coil';
          this.stateTimer = COIL_TIME;
          this.dir = (aim < this.along ? -1 : 1) as 1 | -1; // strike toward the prey
          sfx.crackle();
        }
        break;
      }
      case 'coil': {
        // Reels back, crackling: the wind-up you read to get clear.
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this.state = 'dart';
        break;
      }
      case 'dart': {
        const next = this.along + this.dir * DART_SPEED * dt;
        if (this.wallAhead(next) || next <= this.lo || next >= this.hi) {
          this.along = Math.max(this.lo, Math.min(this.hi, next));
          this.state = 'stun';
          this.stateTimer = STUN_TIME;
        } else {
          this.along = next;
        }
        break;
      }
      case 'stun': {
        // Dazed drift: the ONLY window to finish it (a dash-lunge).
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'idle';
          this.rearm = REARM;
        }
        break;
      }
    }

    this.syncXY();
  }

  /** Solid rock right ahead of the strike (stops the dart)? */
  private wallAhead(nextAlong: number): boolean {
    if (this.axis === 'x') {
      const aheadX = this.dir === 1 ? nextAlong + this.w : nextAlong;
      return this.level.isSolidAt(aheadX, this.fixed + this.h / 2);
    }
    const aheadY = this.dir === 1 ? nextAlong + this.h : nextAlong;
    return this.level.isSolidAt(this.fixed + this.w / 2, aheadY);
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const horiz = this.axis === 'x';
    const ax = horiz ? 1 : 0;
    const ay = horiz ? 0 : 1;
    const length = horiz ? this.w : this.h;
    const thick = horiz ? this.h : this.w;

    const stunned = this.state === 'stun';
    const coiling = this.state === 'coil';
    const darting = this.state === 'dart';

    // Coil recoil: the whole body eases back opposite the strike.
    const recoil = coiling ? -this.dir * 2 : 0;
    const ox = Math.round(this.x - camX + ax * recoil);
    const oy = Math.round(this.y - camY + ay * recoil);
    const ccx = this.x + this.w / 2 - camX + ax * recoil;
    const ccy = this.y + this.h / 2 - camY + ay * recoil;

    // Aura: electric-bright while coiling, faint while dazed.
    const glowA = coiling ? 0.45 + Math.sin(this.t * 34) * 0.2 : stunned ? 0.18 : 0.26;
    drawGlow(ctx, ccx, ccy, 12, coiling ? '#d6f7ff' : '#7ce0ff', glowA);

    // Crackle sparks orbiting the coil — the electric wind-up you SEE.
    if (coiling) {
      ctx.fillStyle = '#f5fcff';
      for (let i = 0; i < 5; i++) {
        const a = this.t * 12 + i * 1.6;
        ctx.fillRect(Math.round(ccx + Math.cos(a) * 8), Math.round(ccy + Math.sin(a) * 8), 1, 1);
      }
    }

    // Speed streaks trailing a dart.
    if (darting) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#7ce0ff';
      for (let i = 1; i <= 3; i++) {
        const sx = ccx - this.dir * ax * (length / 2 + i * 3);
        const sy = ccy - this.dir * ay * (length / 2 + i * 3);
        ctx.fillRect(Math.round(sx), Math.round(sy), horiz ? 2 : 1, horiz ? 1 : 2);
      }
      ctx.globalAlpha = 1;
    }

    // Body: a chain of segments with a swimming wobble across the lane.
    const segs = 7;
    const wobAmp = coiling ? 0 : stunned ? 0.6 : darting ? 0.7 : 1.3;
    const wobRate = darting ? 22 : 6;
    for (let i = 0; i < segs; i++) {
      const f = i / (segs - 1);
      const d = Math.round(f * (length - 2));
      const wob = Math.round(Math.sin(this.t * wobRate - f * 2.4) * wobAmp);
      const lead = this.dir === 1 ? f : 1 - f; // 1 near the head
      ctx.fillStyle = stunned
        ? lead > 0.6
          ? '#7ea8c4'
          : '#4a6a86'
        : lead > 0.6
          ? '#b98bff'
          : lead > 0.35
            ? '#7ce0ff'
            : '#3f9ad0';
      if (horiz) ctx.fillRect(ox + d, oy + 1 + wob, 3, thick - 2);
      else ctx.fillRect(ox + 1 + wob, oy + d, thick - 2, 3);
    }

    // Head: the leading end, with an eye toward the strike.
    const headAlong = this.dir === 1 ? length - 3 : 0;
    const hx = horiz ? ox + headAlong : ox + 1;
    const hy = horiz ? oy + 1 : oy + headAlong;
    ctx.fillStyle = stunned ? '#8fb4cf' : '#d6f7ff';
    ctx.fillRect(hx, hy, horiz ? 3 : thick - 2, horiz ? thick - 2 : 3);
    if (stunned) {
      // "Finish me" gold rim + dizzy stars: the lunge window reads.
      const p = Math.sin(this.t * 8) > 0;
      ctx.fillStyle = p ? '#fff7c9' : '#ffd23a';
      if (horiz) ctx.fillRect(hx, hy - 1, 3, 1);
      else ctx.fillRect(hx - 1, hy, 1, 3);
      ctx.fillStyle = '#f5fcff';
      for (let i = 0; i < 3; i++) {
        const a = this.t * 5 + (i * Math.PI * 2) / 3;
        ctx.fillRect(
          Math.round(ccx + Math.cos(a) * 6),
          Math.round(ccy - thick / 2 - 2 + Math.sin(a) * 1.5),
          1,
          1,
        );
      }
    } else {
      ctx.fillStyle = '#11091a';
      ctx.fillRect(hx + (horiz ? 1 : 0), hy + (horiz ? 1 : 0), 1, 1);
    }
  }
}
