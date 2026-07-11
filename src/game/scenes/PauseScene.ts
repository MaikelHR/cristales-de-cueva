// ============================================================
//  ESCENA: PAUSA
// ------------------------------------------------------------
//  Vive APILADA sobre la partida: la partida no se actualiza pero
//  sí se dibuja debajo, así que queda congelada tal cual estaba.
//  Volver a pulsar pausa reanuda; R (o el botón táctil de
//  reiniciar) arranca un mundo nuevo.
// ============================================================

import { justPressed } from '../../engine/input';
import type { GameSession } from '../session';
import { drawPauseOverlay } from '../ui/screens';
import type { Scene, SceneManager, UiState } from './Scene';

export class PauseScene implements Scene {
  readonly ui: UiState = { state: 'playing', paused: true };

  constructor(
    private session: GameSession,
    private scenes: SceneManager,
  ) {}

  update(): void {
    // Reiniciar también vale desde la pausa (tecla R / botón táctil).
    if (justPressed('restart')) {
      this.session.reset();
      this.scenes.pop(); // de vuelta a la partida, ya fresca
      return;
    }
    if (justPressed('pause')) {
      this.scenes.pop(); // reanudar exactamente donde estaba
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // La partida congelada ya se dibujó debajo (pila de escenas).
    drawPauseOverlay(ctx, this.session);
  }
}
