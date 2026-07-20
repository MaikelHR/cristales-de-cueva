// ============================================================
//  SCENE: THE ENDING (world 1 completed)
// ------------------------------------------------------------
//  Beating the last level is not "another level done", so it doesn't
//  get the level-win card: the door gives way, light floods the cave
//  and the game tallies the whole grotto. It keeps its own clock so
//  the overlay can stage itself line by line, and it swallows input
//  for a beat — otherwise the key that finished the fight would skip
//  the ending before anyone reads it.
// ============================================================

import { justPressed } from '../../engine/input';
import type { GameSession } from '../session';
import { drawWorld } from '../render/drawWorld';
import { drawEndingOverlay } from '../ui/screens';
import type { Scene, SceneManager, UiState } from './Scene';
import { OverworldScene } from './OverworldScene';

/** Seconds before any key is listened to (the ending has to land). */
const INPUT_LOCK = 1.2;

export class EndingScene implements Scene {
  readonly ui: UiState = { state: 'ending', paused: false };
  private t = 0;

  constructor(
    private session: GameSession,
    private scenes: SceneManager,
  ) {}

  update(dt: number): void {
    this.t += dt;
    this.session.ambientUpdate(dt, true);
    if (this.t < INPUT_LOCK) return;
    if (justPressed('confirm') || justPressed('restart') || justPressed('jump')) {
      this.scenes.replace(new OverworldScene(this.session, this.scenes));
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // No HUD and no minimap here: the run is over, this is the curtain.
    drawWorld(ctx, this.session);
    drawEndingOverlay(ctx, this.session, this.t);
  }
}
