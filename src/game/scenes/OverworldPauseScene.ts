// ============================================================
//  SCENE: OVERWORLD PAUSE (the level-map menu)
// ------------------------------------------------------------
//  Stacked OVER the overworld map, which stays frozen underneath
//  (like PauseScene over gameplay). On the map there's no run to
//  restart or abandon, so the menu is lighter: resume, fullscreen,
//  language and "main menu" (back to the title). This exists so the
//  map's pause button opens options (notably fullscreen on touch)
//  instead of dumping the player straight to the title.
//  On touch the menu is the same DOM buttons (touch.ts) shown in the
//  'overworld' pause context; its "main menu" button arrives as the
//  'quit' action.
// ============================================================

import { justPressed } from '../../engine/input';
import type { GameSession } from '../session';
import { drawPauseOverlay, type MenuItem } from '../ui/screens';
import { getLang, setLang } from '../i18n';
import { fullscreenAvailable, toggleFullscreen } from '../fullscreen';
import { sfx } from '../sfx';
import type { Scene, SceneManager, UiState } from './Scene';
import { TitleScene } from './TitleScene';

export class OverworldPauseScene implements Scene {
  readonly ui: UiState = { state: 'overworld', paused: true };

  private readonly items: MenuItem[] = fullscreenAvailable()
    ? ['resume', 'fullscreen', 'language', 'mainmenu']
    : ['resume', 'language', 'mainmenu'];
  private selected = 0;

  constructor(
    private session: GameSession,
    private scenes: SceneManager,
  ) {}

  update(): void {
    // Pause resumes the map; the touch "main menu" button arrives as 'quit'.
    if (justPressed('pause')) {
      this.scenes.pop();
      return;
    }
    if (justPressed('quit')) {
      this.toTitle();
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
      case 'fullscreen':
        toggleFullscreen();
        break;
      case 'language':
        setLang(getLang() === 'es' ? 'en' : 'es');
        sfx.pickup();
        break;
      case 'mainmenu':
        this.toTitle();
        break;
    }
  }

  /** Leave the map for the title screen (the "main menu"). */
  private toTitle(): void {
    this.scenes.replace(new TitleScene(this.session, this.scenes));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // The frozen map was already drawn underneath (scene stack).
    drawPauseOverlay(ctx, this.session, this.items, this.selected);
  }
}
