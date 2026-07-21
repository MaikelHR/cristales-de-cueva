// ============================================================
//  CONTRAPESO (stage device) — the chain the level is named after
// ------------------------------------------------------------
//  Two plates hanging from one chain over a pulley: your weight on
//  one drives it DOWN and hauls the other UP by exactly as much.
//  Step off and they drift back to level. Nothing else in the game
//  works this way — springs and vents push you, blink slabs come and
//  go on a clock, but the balance is the first device you OPERATE:
//  the way up is to ride one plate down, get off, and cross to the
//  one your own weight just lifted.
//  It's one actor with TWO boxes (systems/devices.ts lands the
//  player on either), because the pair is a single machine: the
//  whole point is that the plates can't move independently.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { TILE } from '../../world/Level';
import type { Actor } from '../Actor';
import { drawGlow } from '../../art/glow';

const PLATE_W = TILE * 3;
const PLATE_H = 5;
const TRAVEL = 40;   // px each plate can run from the level line (5 tiles)
const RIDE = 34;     // px/s it sinks under your weight

const CHAIN = '#6d7c90';
const CHAIN_LIT = '#a8bccf';
const PLATE = '#4a5464';
const PLATE_LIT = '#8fa6bd';
const GEM = '#9fd8ff';

export class Contrapeso implements Actor {
  readonly layer = 'device' as const;
  dead = false;
  readonly w = PLATE_W;
  readonly h = PLATE_H;
  /** Left plate's column and right plate's column (world px). */
  readonly leftX: number;
  readonly rightX: number;
  /** The level line both plates hang from. */
  readonly restY: number;
  /** Ceiling the chains run up to (for drawing the pulleys). */
  readonly topY: number;
  /** Offset of the LEFT plate from the rest line (+down). The right
   *  plate is always its mirror: that IS the chain. */
  private offset = 0;
  /** Which plate the player rode this frame (set by systems). */
  rider: 'left' | 'right' | null = null;

  constructor(px: number, py: number, rightCol: number, ceilRow: number) {
    this.leftX = px;
    this.rightX = rightCol * TILE;
    this.restY = py;
    this.topY = ceilRow * TILE;
  }

  /** Where each plate is right now. */
  leftBox(): Box {
    return { x: this.leftX, y: this.restY + this.offset, w: PLATE_W, h: PLATE_H };
  }

  rightBox(): Box {
    return { x: this.rightX, y: this.restY - this.offset, w: PLATE_W, h: PLATE_H };
  }

  /** Actor's box: the left plate (the pair is drawn and landed on
   *  explicitly by the device rules, which know about both). */
  box(): Box {
    return this.leftBox();
  }

  /** How far the plate the player is NOT on has travelled, in px —
   *  the level designer's number: that's the lift you earn. */
  get lift(): number {
    return Math.abs(this.offset);
  }

  /**
   * Only your weight moves it, and where you leave it is where it
   * STAYS. That's the whole puzzle: a chain that sprang back would
   * undo the lift the moment you stepped off to go use it, which made
   * the machine unplayable for one player (found while building the
   * level). Now you set it, walk around, and climb the plate you
   * raised — and riding the other one is what resets it.
   */
  update(dt: number): void {
    if (this.rider === 'left') {
      this.offset = Math.min(TRAVEL, this.offset + RIDE * dt);
    } else if (this.rider === 'right') {
      this.offset = Math.max(-TRAVEL, this.offset - RIDE * dt);
    }
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const top = Math.round(this.topY - camY);
    for (const [bx, isLeft] of [[this.leftBox(), true], [this.rightBox(), false]] as const) {
      const px = Math.round(bx.x - camX);
      const py = Math.round(bx.y - camY);
      const cx = px + PLATE_W / 2;

      // The chain: links running up to the pulley, brighter the more
      // taut it is (the plate that's being hauled up).
      const hauled = isLeft ? this.offset < 0 : this.offset > 0;
      for (let yy = top; yy < py; yy += 4) {
        ctx.fillStyle = hauled && ((yy >> 2) & 1) === 0 ? CHAIN_LIT : CHAIN;
        ctx.fillRect(cx - 1, yy, 2, 3);
      }
      // The pulley it hangs from.
      ctx.fillStyle = CHAIN;
      ctx.fillRect(cx - 3, top - 2, 6, 3);
      ctx.fillStyle = CHAIN_LIT;
      ctx.fillRect(cx - 2, top - 2, 4, 1);

      // The plate: a slab of dark iron with a lit top edge (that's
      // where you stand) and a crystal bead at each corner.
      ctx.fillStyle = PLATE;
      ctx.fillRect(px, py, PLATE_W, PLATE_H);
      ctx.fillStyle = PLATE_LIT;
      ctx.fillRect(px, py, PLATE_W, 1);
      ctx.fillStyle = '#20262e';
      ctx.fillRect(px, py + PLATE_H - 1, PLATE_W, 1);
      ctx.fillStyle = GEM;
      ctx.fillRect(px + 1, py + 1, 2, 2);
      ctx.fillRect(px + PLATE_W - 3, py + 1, 2, 2);
      if (hauled) drawGlow(ctx, cx, py + 2, 12, GEM, 0.18);
    }
  }
}
