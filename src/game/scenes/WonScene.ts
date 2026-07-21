// ============================================================
//  SCENE: VICTORY (level completed)
// ------------------------------------------------------------
//  The won level keeps animating in the background (particles and
//  popups finish out their life). A key returns to the level map,
//  where the win already left its mark (and maybe a newly opened node).
// ============================================================

import { justPressed } from '../../engine/input';
import type { GameSession } from '../session';
import { drawWorld } from '../render/drawWorld';
import { drawHud } from '../ui/hud';
import { drawProgress } from '../ui/progress';
import { drawWinOverlay } from '../ui/screens';
import type { Scene, SceneManager, UiState } from './Scene';
import { OverworldScene } from './OverworldScene';

export class WonScene implements Scene {
  readonly ui: UiState = { state: 'won', paused: false };

  constructor(
    private session: GameSession,
    private scenes: SceneManager,
  ) {}

  update(dt: number): void {
    this.session.ambientUpdate(dt, true);
    if (justPressed('confirm') || justPressed('restart') || justPressed('jump')) {
      this.scenes.replace(new OverworldScene(this.session, this.scenes));
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawWorld(ctx, this.session);
    drawHud(ctx, this.session, false);
    drawProgress(ctx, this.session);
    drawWinOverlay(ctx, this.session);
  }
}
