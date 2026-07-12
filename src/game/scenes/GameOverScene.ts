// ============================================================
//  SCENE: GAME OVER
// ------------------------------------------------------------
//  The world frozen after death stays in the background, darkened.
//  Confirm/jump returns to the level map; R retries the level
//  instantly (make retrying as cheap as possible).
// ============================================================

import { justPressed } from '../../engine/input';
import type { GameSession } from '../session';
import { drawWorld } from '../render/drawWorld';
import { drawHud } from '../ui/hud';
import { drawMinimap } from '../ui/minimap';
import { drawGameOverOverlay } from '../ui/screens';
import type { Scene, SceneManager, UiState } from './Scene';
import { OverworldScene } from './OverworldScene';
import { GameplayScene } from './GameplayScene';

export class GameOverScene implements Scene {
  readonly ui: UiState = { state: 'gameover', paused: false };

  constructor(
    private session: GameSession,
    private scenes: SceneManager,
  ) {}

  update(dt: number): void {
    this.session.ambientUpdate(dt, true);
    if (justPressed('restart')) {
      this.session.reset(); // same level and mode, from scratch
      this.scenes.replace(new GameplayScene(this.session, this.scenes));
      return;
    }
    if (justPressed('confirm') || justPressed('jump')) {
      this.scenes.replace(new OverworldScene(this.session, this.scenes));
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawWorld(ctx, this.session);
    drawHud(ctx, this.session, false);
    drawMinimap(ctx, this.session);
    drawGameOverOverlay(ctx, this.session);
  }
}
