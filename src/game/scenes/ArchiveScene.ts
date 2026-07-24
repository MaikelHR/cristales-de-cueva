// ============================================================
//  SCENE: ARCHIVE (everything the cave has told you)
// ------------------------------------------------------------
//  Reached from the title menu. Every inscription in the game, in
//  LORE_IDS order and grouped by the level that carries it: the ones
//  you have read by their heading, the ones you haven't as a locked
//  row. The list NEVER hides what is missing — that gap is the whole
//  reason to go back into a level you thought you had finished — and
//  the selected inscription is written out on the plate below, in the
//  same cut-stone panel it wore on the cave wall.
//
//  Navigation is up/down (the list and nothing else) with left/right
//  as a level-skip, because two dozen entries one row at a time is a
//  chore. BACK is the last row AND the 'back' action, per CLAUDE.md:
//  a menu you can enter and not leave is a trap.
//
//  Like CharacterScene, this screen isn't reachable on touch: the
//  title menu isn't navigable there (a tap starts the game). If the
//  Archive ever needs to be, it wants a DOM chip like the language
//  one, not up/down on a phone.
// ============================================================

import { justPressed } from '../../engine/input';
import type { GameSession } from '../session';
import { drawWorld } from '../render/drawWorld';
import { drawArchiveOverlay, ARCHIVE_ROWS, type ArchiveRow } from '../ui/screens';
import { LORE, LORE_IDS, type LoreId } from '../lore';
import { sfx } from '../sfx';
import type { Scene, SceneManager, UiState } from './Scene';
import { TitleScene } from './TitleScene';

/**
 * The list: LORE_IDS in their own order, with a header wherever the
 * level changes. Walking the ids (instead of walking LEVELS and asking
 * for each one's lore) means the Archive shows the table exactly as it
 * was written, and an inscription hung on a level that doesn't exist
 * yet still gets listed instead of silently vanishing.
 */
function buildRows(): ArchiveRow[] {
  const rows: ArchiveRow[] = [];
  let level = '';
  for (const id of LORE_IDS) {
    const owner = LORE[id].level;
    if (owner !== level) {
      level = owner;
      rows.push({ kind: 'level', levelId: owner });
    }
    rows.push({ kind: 'entry', id });
  }
  rows.push({ kind: 'back' });
  return rows;
}

export class ArchiveScene implements Scene {
  readonly ui: UiState = { state: 'title', paused: false };

  private readonly rows: ArchiveRow[] = buildRows();
  private selected = 0;
  /** First row of the visible window. */
  private scroll = 0;
  /** The last entry the cursor sat on. The plate keeps showing it when
   *  the selection moves onto BACK, so stepping down doesn't blank the
   *  text you were reading. */
  private shown: LoreId | null = null;

  constructor(
    private session: GameSession,
    private scenes: SceneManager,
  ) {
    // Headers aren't selectable, so the cursor starts on the first row
    // that is (the first inscription, or BACK if there are none yet).
    this.selected = this.rows.findIndex((r) => r.kind !== 'level');
    this.sync();
  }

  update(dt: number): void {
    this.session.ambientUpdate(dt);

    // 'pause' FIRST: a pad's START reports as both 'pause' and 'confirm'.
    if (justPressed('pause') || justPressed('back') || justPressed('quit')) {
      this.exit();
      return;
    }

    if (justPressed('up')) this.move(-1);
    else if (justPressed('down')) this.move(1);
    else if (justPressed('left')) this.skipLevel(-1);
    else if (justPressed('right')) this.skipLevel(1);

    // Confirm only means anything on BACK: an entry is already open on
    // the plate the moment the cursor reaches it — there is nothing to
    // "enter", which is why up/down is the whole interaction.
    if (justPressed('confirm') && this.rows[this.selected]?.kind === 'back') this.exit();
  }

  /** One row up or down, skipping the level headings, wrapping around. */
  private move(dir: 1 | -1): void {
    let i = this.selected;
    for (let n = 0; n < this.rows.length; n++) {
      i = (i + dir + this.rows.length) % this.rows.length;
      if (this.rows[i].kind !== 'level') break;
    }
    this.selected = i;
    this.sync();
    sfx.pickup();
  }

  /** Left/right jump a whole level, the way a track skip does: back
   *  goes to the top of the current group first, then to the previous. */
  private skipLevel(dir: 1 | -1): void {
    const heads: number[] = [];
    this.rows.forEach((row, i) => {
      if (row.kind === 'level') heads.push(i);
    });
    if (heads.length === 0) return;
    let g = 0;
    for (let i = 0; i < heads.length; i++) if (heads[i] < this.selected) g = i;
    const atTop = this.selected === heads[g] + 1;
    const target =
      dir < 0 ? (atTop ? Math.max(0, g - 1) : g) : Math.min(heads.length - 1, g + 1);
    // A header is always followed by at least one entry (it only exists
    // because one asked for it), so +1 is always a selectable row.
    this.selected = heads[target] + 1;
    this.sync();
    sfx.pickup();
  }

  /** Keep the selection inside the window and the plate on the right
   *  inscription, after any move. */
  private sync(): void {
    const row = this.rows[this.selected];
    if (row?.kind === 'entry') this.shown = row.id;
    // Drag the level heading along when the cursor climbs onto the first
    // entry of a group: an inscription you can't see the level of is an
    // inscription you can't go looking for.
    const top =
      this.selected > 0 && this.rows[this.selected - 1]?.kind === 'level'
        ? this.selected - 1
        : this.selected;
    if (top < this.scroll) this.scroll = top;
    if (this.selected >= this.scroll + ARCHIVE_ROWS) {
      this.scroll = this.selected - ARCHIVE_ROWS + 1;
    }
    this.scroll = Math.max(0, Math.min(this.scroll, Math.max(0, this.rows.length - ARCHIVE_ROWS)));
  }

  private exit(): void {
    this.scenes.replace(new TitleScene(this.session, this.scenes));
    sfx.pickup();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawWorld(ctx, this.session);
    drawArchiveOverlay(ctx, this.session, this.rows, this.selected, this.scroll, this.shown);
  }
}
