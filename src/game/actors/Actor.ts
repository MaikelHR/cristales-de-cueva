// ============================================================
//  ACTOR — the minimum for "a thing that lives in a room"
// ------------------------------------------------------------
//  Enemies, pickups and devices share this shape: advance in time,
//  draw themselves, say what box they occupy and which collision
//  LAYER they're on. The layer decides which rule applies when they
//  touch the player (hurt vs. collect vs. push); adding a new layer
//  (e.g. 'trigger' or 'playerAttack') means adding its rule in
//  systems/, without touching existing actors.
// ============================================================

import type { Box } from '../../engine/canvas';
import type { Player } from './Player';
import type { Particles } from '../effects/Particles';

/** 'device' = stage apparatus (springs, moving platforms): they
 *  don't hurt or get collected; they interact with player physics. */
export type ActorLayer = 'enemy' | 'pickup' | 'device';

export interface Actor {
  readonly layer: ActorLayer;
  /** true when it's no longer in play (defeated / collected):
   *  the world ignores it and stops drawing it. */
  dead: boolean;
  /** target = player position (for those that chase or aim). */
  update(dt: number, target: { x: number; y: number }): void;
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void;
  box(): Box;
}

/** What a pickup can touch in the game when collected. */
export interface CollectContext {
  player: Player;
  particles: Particles;
  /** Shows the big on-screen notice (e.g. "¡DASH!"). */
  announce(text: string): void;
}

export interface Pickup extends Actor {
  readonly layer: 'pickup';
  collect(ctx: CollectContext): void;
}
