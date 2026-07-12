// ============================================================
//  ESCENA: PAUSA (el menú dentro de la partida)
// ------------------------------------------------------------
//  Vive APILADA sobre la partida: la partida no se actualiza pero
//  sí se dibuja debajo, así que queda congelada tal cual estaba.
//  El menú: continuar, reiniciar el nivel, pantalla completa,
//  idioma y salir al mapa. Los atajos siguen vivos: pausa reanuda
//  y R reinicia. En táctil el menú es de botones DOM (touch.ts);
//  su botón "salir al mapa" llega como la acción 'quit'.
// ============================================================

import { justPressed } from '../../engine/input';
import type { GameSession } from '../session';
import { drawPauseOverlay, type MenuItem } from '../ui/screens';
import { getLang, setLang } from '../i18n';
import { fullscreenAvailable, toggleFullscreen } from '../fullscreen';
import { sfx } from '../sfx';
import type { Scene, SceneManager, UiState } from './Scene';
import { OverworldScene } from './OverworldScene';

export class PauseScene implements Scene {
  readonly ui: UiState = { state: 'playing', paused: true };

  private readonly items: MenuItem[] = fullscreenAvailable()
    ? ['resume', 'restart', 'fullscreen', 'language', 'exit']
    : ['resume', 'restart', 'language', 'exit'];
  private selected = 0;

  constructor(
    private session: GameSession,
    private scenes: SceneManager,
  ) {}

  update(): void {
    // Atajos de siempre: pausa reanuda, R reinicia el nivel.
    if (justPressed('pause')) {
      this.scenes.pop(); // reanudar exactamente donde estaba
      return;
    }
    if (justPressed('restart')) {
      this.session.reset();
      this.scenes.pop(); // de vuelta a la partida, ya fresca
      return;
    }
    // "Salir al mapa" del menú táctil (botón DOM) llega como 'quit'.
    if (justPressed('quit')) {
      this.exitToMap();
      return;
    }

    if (justPressed('up')) {
      this.selected = (this.selected + this.items.length - 1) % this.items.length;
      sfx.pickup();
    } else if (justPressed('down')) {
      this.selected = (this.selected + 1) % this.items.length;
      sfx.pickup();
    }

    const item = this.items[this.selected];
    if (item === 'language' && (justPressed('left') || justPressed('right'))) {
      setLang(getLang() === 'es' ? 'en' : 'es');
      sfx.pickup();
      return;
    }
    if (!justPressed('confirm')) return;
    switch (item) {
      case 'resume':
        this.scenes.pop();
        break;
      case 'restart':
        this.session.reset();
        this.scenes.pop();
        break;
      case 'fullscreen':
        toggleFullscreen();
        break;
      case 'language':
        setLang(getLang() === 'es' ? 'en' : 'es');
        sfx.pickup();
        break;
      case 'exit':
        this.exitToMap();
        break;
    }
  }

  /** Abandonar la corrida y volver al mapa de niveles (sin récords). */
  private exitToMap(): void {
    this.scenes.replace(new OverworldScene(this.session, this.scenes));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // La partida congelada ya se dibujó debajo (pila de escenas).
    drawPauseOverlay(ctx, this.session, this.items, this.selected);
  }
}
