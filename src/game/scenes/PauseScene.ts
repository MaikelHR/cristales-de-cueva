// ============================================================
//  SCENE: PAUSE (the in-game menu)
// ------------------------------------------------------------
//  Lives STACKED over the game: the game doesn't update but is
//  still drawn underneath, so it stays frozen exactly as it was.
//  The menu: resume, restart the level, fullscreen, language and
//  exit to map. The shortcuts stay live: pause resumes and R
//  restarts. On touch the menu is DOM buttons (touch.ts); its
//  "exit to map" button arrives as the 'quit' action.
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
    // Usual shortcuts: pause (or the pad's B/○ "back") resumes, R restarts.
    if (justPressed('pause') || justPressed('back')) {
      this.scenes.pop(); // resume exactly where it was
      return;
    }
    if (justPressed('restart')) {
      this.session.reset();
      this.scenes.pop(); // back to the game, now fresh
      return;
    }
    // "Exit to map" from the touch menu (DOM button) arrives as 'quit'.
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

  /** Abandon the run and return to the level map (no records). */
  private exitToMap(): void {
    this.scenes.replace(new OverworldScene(this.session, this.scenes));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // The frozen game was already drawn underneath (scene stack).
    drawPauseOverlay(ctx, this.session, this.items, this.selected);
  }
}
