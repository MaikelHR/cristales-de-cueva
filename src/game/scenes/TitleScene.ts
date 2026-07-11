// ============================================================
//  ESCENA: TÍTULO (el "hub" desde donde arranca cada partida)
// ------------------------------------------------------------
//  El mundo se anima de fondo y esperamos a que el jugador
//  confirme para EMPEZAR UNA PARTIDA NUEVA. (Saltar también sirve.)
// ============================================================

import { justPressed } from '../../engine/input';
import type { GameSession } from '../session';
import { drawWorld } from '../render/drawWorld';
import { drawTitleOverlay } from '../ui/screens';
import { sfx } from '../sfx';
import type { Scene, SceneManager, UiState } from './Scene';
import { GameplayScene } from './GameplayScene';

export class TitleScene implements Scene {
  readonly ui: UiState = { state: 'title', paused: false };

  constructor(
    private session: GameSession,
    private scenes: SceneManager,
  ) {}

  update(dt: number): void {
    this.session.ambientUpdate(dt);
    if (justPressed('confirm') || justPressed('jump')) {
      this.session.reset(); // mundo fresco -> a jugar
      this.scenes.replace(new GameplayScene(this.session, this.scenes));
      sfx.relic();
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawWorld(ctx, this.session);
    drawTitleOverlay(ctx, this.session);
  }
}
