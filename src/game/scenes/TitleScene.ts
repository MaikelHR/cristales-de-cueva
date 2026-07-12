// ============================================================
//  ESCENA: TÍTULO (la portada del juego)
// ------------------------------------------------------------
//  El mundo se anima de fondo bajo el título y un menú de verdad:
//  JUGAR (al mapa de niveles), PANTALLA COMPLETA e IDIOMA. Se
//  navega con arriba/abajo y se confirma con ENTER/espacio o el
//  botón de confirmar del pad. En táctil no hay menú que navegar:
//  un tap arranca y el idioma tiene su propio botón (langSwitch).
// ============================================================

import { justPressed } from '../../engine/input';
import type { GameSession } from '../session';
import { drawWorld } from '../render/drawWorld';
import { drawTitleOverlay, type MenuItem } from '../ui/screens';
import { getLang, setLang } from '../i18n';
import { fullscreenAvailable, toggleFullscreen } from '../fullscreen';
import { sfx } from '../sfx';
import type { Scene, SceneManager, UiState } from './Scene';
import { OverworldScene } from './OverworldScene';
import { CharacterScene } from './CharacterScene';

export class TitleScene implements Scene {
  readonly ui: UiState = { state: 'title', paused: false };

  private readonly items: MenuItem[] = fullscreenAvailable()
    ? ['play', 'character', 'fullscreen', 'language']
    : ['play', 'character', 'language'];
  private selected = 0;

  constructor(
    private session: GameSession,
    private scenes: SceneManager,
  ) {}

  update(dt: number): void {
    this.session.ambientUpdate(dt);

    if (justPressed('up')) {
      this.selected = (this.selected + this.items.length - 1) % this.items.length;
      sfx.pickup();
    } else if (justPressed('down')) {
      this.selected = (this.selected + 1) % this.items.length;
      sfx.pickup();
    }

    const item = this.items[this.selected];
    // Sobre IDIOMA, izquierda/derecha también alternan (se siente natural).
    if (item === 'language' && (justPressed('left') || justPressed('right'))) {
      setLang(getLang() === 'es' ? 'en' : 'es');
      sfx.pickup();
      return;
    }
    if (!justPressed('confirm')) return;
    switch (item) {
      case 'play':
        this.scenes.replace(new OverworldScene(this.session, this.scenes));
        sfx.pickup();
        break;
      case 'character':
        // La personalización tiene su propia pantalla (color + accesorio).
        this.scenes.replace(new CharacterScene(this.session, this.scenes));
        sfx.pickup();
        break;
      case 'fullscreen':
        toggleFullscreen();
        break;
      case 'language':
        setLang(getLang() === 'es' ? 'en' : 'es');
        sfx.pickup();
        break;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawWorld(ctx, this.session);
    drawTitleOverlay(ctx, this.session, this.items, this.selected);
  }
}
