// ============================================================
//  ESCENA: PERSONAJE (la pantalla de personalización)
// ------------------------------------------------------------
//  Se llega desde el menú del título. Dos ejes: COLOR (la skin
//  mineral) y ACCESORIO (gorro, corona, antena...), cada uno una
//  fila que se recorre con izquierda/derecha (o confirmar, que
//  avanza en rueda); la vista previa grande refleja cada cambio
//  al instante. VOLVER (o ESC / el botón de pausa del pad)
//  regresa al título. En táctil no se navega esta escena: los
//  chips DOM (color y accesorio) cumplen su papel en los menús.
// ============================================================

import { justPressed } from '../../engine/input';
import type { GameSession } from '../session';
import { drawWorld } from '../render/drawWorld';
import { drawCharacterOverlay, type CharacterRow } from '../ui/screens';
import { cycleSkin } from '../skins';
import { cycleAccessory } from '../accessories';
import { sfx } from '../sfx';
import type { Scene, SceneManager, UiState } from './Scene';
import { TitleScene } from './TitleScene';

export class CharacterScene implements Scene {
  readonly ui: UiState = { state: 'title', paused: false };

  private readonly rows: CharacterRow[] = ['color', 'accessory', 'back'];
  private selected = 0;

  constructor(
    private session: GameSession,
    private scenes: SceneManager,
  ) {}

  update(dt: number): void {
    this.session.ambientUpdate(dt);

    if (justPressed('up')) {
      this.selected = (this.selected + this.rows.length - 1) % this.rows.length;
      sfx.pickup();
    } else if (justPressed('down')) {
      this.selected = (this.selected + 1) % this.rows.length;
      sfx.pickup();
    }

    // Salida rápida desde cualquier fila (ESC / pausa del pad).
    if (justPressed('pause') || justPressed('quit')) {
      this.exit();
      return;
    }

    const row = this.rows[this.selected];
    const dir = justPressed('left') ? -1 : justPressed('right') ? 1 : 0;
    if (row === 'color' && (dir !== 0 || justPressed('confirm'))) {
      cycleSkin(dir === 0 ? 1 : dir);
      sfx.pickup();
    } else if (row === 'accessory' && (dir !== 0 || justPressed('confirm'))) {
      cycleAccessory(dir === 0 ? 1 : dir);
      sfx.pickup();
    } else if (row === 'back' && justPressed('confirm')) {
      this.exit();
    }
  }

  private exit(): void {
    this.scenes.replace(new TitleScene(this.session, this.scenes));
    sfx.pickup();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawWorld(ctx, this.session);
    drawCharacterOverlay(ctx, this.session, this.rows, this.selected);
  }
}
