// ============================================================
//  SCENE: TITLE (the game's cover)
// ------------------------------------------------------------
//  The world animates in the background beneath the title and a real
//  menu: PLAY (to the level map), CHARACTER, ARCHIVE (the inscriptions
//  found so far), FULLSCREEN and LANGUAGE. Navigate
//  with up/down and confirm with ENTER/space or the pad's confirm
//  button. On touch there's no menu to navigate: a tap starts and
//  language has its own button (langSwitch).
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
import { ArchiveScene } from './ArchiveScene';

export class TitleScene implements Scene {
  readonly ui: UiState = { state: 'title', paused: false };

  private readonly items: MenuItem[] = fullscreenAvailable()
    ? ['play', 'character', 'archive', 'fullscreen', 'language']
    : ['play', 'character', 'archive', 'language'];
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
    // On LANGUAGE, left/right also toggle (feels natural).
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
        // Customization has its own screen (color + accessory).
        this.scenes.replace(new CharacterScene(this.session, this.scenes));
        sfx.pickup();
        break;
      case 'archive':
        // Everything the cave has said so far, kept between runs.
        this.scenes.replace(new ArchiveScene(this.session, this.scenes));
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
