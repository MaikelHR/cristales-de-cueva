// ============================================================
//  ESCENA: VICTORIA (nivel completado)
// ------------------------------------------------------------
//  El nivel ganado sigue animándose de fondo (partículas y popups
//  terminan su vida). Una tecla vuelve al mapa de niveles, donde
//  la victoria ya dejó su marca (y quizás un nodo nuevo abierto).
// ============================================================

import { justPressed } from '../../engine/input';
import type { GameSession } from '../session';
import { drawWorld } from '../render/drawWorld';
import { drawHud } from '../ui/hud';
import { drawMinimap } from '../ui/minimap';
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
    drawMinimap(ctx, this.session);
    drawWinOverlay(ctx, this.session);
  }
}
