// ============================================================
//  SCREENS — the overlays for each scene
// ------------------------------------------------------------
//  Title, pause, win and game over: each darkens the world
//  (which keeps drawing behind) and writes on top. They're pure
//  drawing functions: the flow between screens lives in scenes/.
// ============================================================

import { frameAt } from '../../engine/animation';
import { inputDevice, padLabels } from '../../engine/input';
import type { GameSession } from '../session';
import { LEVELS } from '../world/rooms';
import { levelRecord } from '../save';
import { sprites } from '../art/sprites';
import { playerSprites } from '../art/playerSkins';
import { currentSkin } from '../skins';
import { currentAccessory } from '../accessories';
import { drawGlow } from '../art/glow';
import { t, type StrKey } from '../i18n';
import { LORE_IDS, loreText, type LoreId } from '../lore';
import { font, formatTime } from './text';
import { OW_NODES } from './owMap';

/** The items that can appear in the game's menus; each scene
 *  builds its own list and this module only labels and paints them. */
export type MenuItem =
  | 'play'
  | 'resume'
  | 'restart'
  | 'character'
  | 'archive'
  | 'fullscreen'
  | 'language'
  | 'exit'
  | 'mainmenu';

const MENU_LABEL: Record<MenuItem, StrKey> = {
  play: 'menu_play',
  resume: 'menu_resume',
  restart: 'menu_restart',
  character: 'menu_character',
  archive: 'menu_archive',
  fullscreen: 'menu_fullscreen',
  language: 'menu_language',
  exit: 'menu_exit',
  mainmenu: 'menu_mainmenu',
};


/** Vertical menu list: the selected item glows gold with its
 *  little arrows; the rest stays dim violet. */
function drawMenuList(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  items: readonly MenuItem[],
  selected: number,
  startY: number,
  gap = 14,
): void {
  const cx = session.viewW / 2;
  ctx.textAlign = 'center';
  items.forEach((item, i) => {
    const active = i === selected;
    const y = startY + i * gap;
    ctx.font = font(active ? 10 : 9);
    ctx.fillStyle = active ? '#ffe25a' : '#8a76b4';
    const label = t(MENU_LABEL[item]);
    ctx.fillText(label, cx, y);
    if (active) {
      // Little arrows that breathe on either side of the selected item.
      const w = ctx.measureText(label).width;
      const sway = Math.sin(session.time * 5) * 1.5;
      ctx.fillText('▸', cx - w / 2 - 8 - sway, y);
      ctx.fillText('◂', cx + w / 2 + 8 + sway, y);
    }
  });
}

/** The "how to navigate the menu" line, based on keyboard or gamepad. */
function drawMenuNavHint(ctx: CanvasRenderingContext2D, session: GameSession, y: number): void {
  const gp = inputDevice() === 'gamepad';
  ctx.textAlign = 'center';
  ctx.font = font(7);
  ctx.fillStyle = '#6f5a94';
  ctx.fillText(gp ? t('nav_gp', padLabels()) : t('nav_kb'), session.viewW / 2, y);
}

/** Start menu: the game title over the world, with a floating crystal
 *  and the menu (play / fullscreen / language). On touch there's no
 *  navigable menu: a tap starts and language goes through its button. */
export function drawTitleOverlay(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  items: readonly MenuItem[],
  selected: number,
): void {
  const { viewW, viewH, time, save } = session;
  ctx.fillStyle = 'rgba(17,9,26,0.72)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;

  // The menu keeps growing (CHARACTER, then ARCHIVE) and the two hint
  // lines at the bottom are fixed, so at five items the list ran into
  // them. Rather than let the menu creep down over its own hints, the
  // WHOLE cover lifts and the rows close up: the crystal has headroom
  // to spare up top, the hints do not.
  const touch = inputDevice() === 'touch';
  const tall = !touch && items.length > 4;
  const lift = tall ? 10 : 0;

  // A big crystal floating above the title, with its halo.
  const bob = Math.sin(time * 2) * 2;
  const frames = [sprites.crystal, sprites.crystal2, sprites.crystal3, sprites.crystal4];
  const spr = frameAt(frames, 6, time);
  const cy = viewH / 2 - 52 - lift + bob;
  drawGlow(ctx, cx, cy, 20, '#ffe25a', 0.5 + Math.sin(time * 4) * 0.15);
  // Crystal at double size, centered on (cx, cy).
  spr.drawStretched(ctx, cx, cy + spr.h, 2, 2);

  // The character (with its skin) admiring the crystal: the live
  // customization preview — switching skins shows up instantly.
  const skin = playerSprites();
  const hero = time % 3.3 < 0.15 ? skin.blink : frameAt([skin.idle, skin.idle2], 1.6, time);
  const heroFeet = viewH / 2 - 52 - lift + spr.h; // the crystal's floor, without the bob
  drawGlow(ctx, cx - 34, heroFeet - 16, 14, currentSkin().glow, 0.3);
  hero.drawStretched(ctx, cx - 34, heroFeet, 2, 2);

  ctx.textAlign = 'center';
  // Title in two lines so it fits nicely in 320px.
  ctx.fillStyle = '#e9d6ff';
  ctx.font = font(18);
  ctx.fillText(t('title_line1'), cx, viewH / 2 - 16 - lift);
  ctx.fillStyle = '#b98bff';
  ctx.font = font(11);
  ctx.fillText(t('title_line2'), cx, viewH / 2 - lift);

  // Saved progress (only if you've already completed a level).
  ctx.font = font(8);
  const completed = LEVELS.filter((l) => levelRecord(save, l.id).completions > 0).length;
  if (completed > 0) {
    ctx.fillStyle = '#5ce06a';
    ctx.fillText(
      t('title_progress', { n: completed, m: OW_NODES.length }),
      cx,
      viewH / 2 + 14 - lift,
    );
  }

  if (touch) {
    // On touch: pulsing prompt to start (the whole canvas is the button).
    const blink = 0.55 + Math.sin(time * 4) * 0.45;
    ctx.globalAlpha = blink;
    ctx.fillStyle = '#ffe25a';
    ctx.fillText(t('start_touch'), cx, viewH / 2 + 40);
    ctx.globalAlpha = 1;
  } else {
    // With 4+ items the menu moves up and compacts so it doesn't overlap the prompts.
    const four = items.length > 3;
    const startY = viewH / 2 + (four ? 26 : 32) - lift;
    drawMenuList(ctx, session, items, selected, startY, tall ? 11 : four ? 12 : 14);
    drawMenuNavHint(ctx, session, viewH - 8);
  }

  // The game's controls reminder, small and at the bottom.
  const gp = inputDevice() === 'gamepad';
  ctx.font = font(7);
  ctx.fillStyle = '#57457a';
  ctx.fillText(
    touch ? t('hint_touch') : gp ? t('hint_gp', padLabels()) : t('hint_kb'),
    cx,
    viewH - 18,
  );
  ctx.textAlign = 'left';
}

/** Pause menu: the run stays frozen behind. On touch the menu is
 *  DOM buttons (touch.ts); here just the veil and the title. */
export function drawPauseOverlay(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  items: readonly MenuItem[],
  selected: number,
): void {
  const { viewW, viewH } = session;
  ctx.fillStyle = 'rgba(17,9,26,0.68)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e9d6ff';
  ctx.font = font(18);
  ctx.fillText(t('pause_title'), cx, viewH / 2 - 42);
  if (inputDevice() === 'touch') {
    ctx.fillStyle = '#9b86c4';
    ctx.font = font(8);
    ctx.fillText(t('pause_resume_touch'), cx, viewH / 2 - 24);
  } else {
    drawMenuList(ctx, session, items, selected, viewH / 2 - 22);
    drawMenuNavHint(ctx, session, viewH - 10);
  }
  ctx.textAlign = 'left';
}

/** Win screen: the completed level, with score and time in normal
 *  mode or the stopwatch verdict in time-trial. */
export function drawWinOverlay(ctx: CanvasRenderingContext2D, session: GameSession): void {
  const { viewW, viewH, time, save, runFlags } = session;
  const rec = levelRecord(save, session.level.id);
  ctx.fillStyle = 'rgba(17,9,26,0.78)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd36e';
  ctx.font = font(16);
  ctx.fillText(t('win_title'), cx, viewH / 2 - 36);
  ctx.font = font(8);
  ctx.fillStyle = '#b98bff';
  ctx.fillText(t(session.level.nameKey), cx, viewH / 2 - 24);

  if (session.mode === 'trial') {
    // Time-trial: the time IS the result.
    ctx.fillStyle = '#7ce0ff';
    ctx.font = font(12);
    ctx.fillText(formatTime(session.runTime), cx, viewH / 2 - 6);
    ctx.font = font(8);
    if (runFlags.newBestTrial) {
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(time * 8) * 0.4;
      ctx.fillStyle = '#ffe25a';
      ctx.fillText(t('trial_new_best'), cx, viewH / 2 + 9);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffd36e';
      ctx.fillText(t('trial_best', { t: formatTime(rec.bestTrialTime) }), cx, viewH / 2 + 9);
    }
  } else {
    ctx.fillStyle = '#ffe25a';
    ctx.fillText(t('win_points', { n: session.score }), cx, viewH / 2 - 10);
    ctx.fillStyle = '#7ce0ff';
    ctx.fillText(t('win_time', { t: formatTime(session.runTime) }), cx, viewH / 2 + 1);
    // Time record (the speedrun metric): if you beat it, a pulsing
    // celebration; if not, your best mark to compare against.
    if (runFlags.newBestTime) {
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(time * 8) * 0.4;
      ctx.fillStyle = '#ffe25a';
      ctx.fillText(t('win_new_best_time'), cx, viewH / 2 + 13);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffd36e';
      ctx.fillText(t('best_time', { t: formatTime(rec.bestTime) }), cx, viewH / 2 + 13);
    }
  }

  ctx.fillStyle = '#9b86c4';
  ctx.font = font(8);
  ctx.fillText(backToMenuText(), cx, viewH / 2 + 28);
  ctx.textAlign = 'left';
}

/** Game over screen: the world frozen after death, darkened, with
 *  the score achieved and the prompt to retry. */
export function drawGameOverOverlay(ctx: CanvasRenderingContext2D, session: GameSession): void {
  const { viewW, viewH, time } = session;
  ctx.fillStyle = 'rgba(26,6,10,0.8)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5a7a';
  ctx.font = font(18);
  ctx.fillText(t('gameover_title'), cx, viewH / 2 - 20);
  ctx.fillStyle = '#ffd0dc';
  ctx.font = font(8);
  ctx.fillText(t('win_points', { n: session.score }), cx, viewH / 2 - 4);
  drawRecordLine(ctx, session, cx, viewH / 2 + 8);
  const blink = 0.55 + Math.sin(time * 4) * 0.45;
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#9b86c4';
  ctx.fillText(backToMenuText(), cx, viewH / 2 + 22);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

/** The rows of the character screen: each is a customization axis
 *  (or the exit); the scene navigates, here they're painted. */
export type CharacterRow = 'color' | 'accessory' | 'back';

/** Character screen: the chosen look at large size (breathing, with
 *  its halo) and the COLOR / ACCESSORY / BACK rows. Changes show up
 *  instantly in the preview: THAT'S the whole point. */
export function drawCharacterOverlay(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  rows: readonly CharacterRow[],
  selected: number,
): void {
  const { viewW, viewH, time } = session;
  ctx.fillStyle = 'rgba(17,9,26,0.78)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;
  ctx.textAlign = 'center';

  ctx.fillStyle = '#e9d6ff';
  ctx.font = font(16);
  ctx.fillText(t('cust_title'), cx, 24);

  // The preview: the character at triple size, alive (breathes and blinks).
  const s = playerSprites();
  const spr = time % 3.3 < 0.15 ? s.blink : frameAt([s.idle, s.idle2], 1.6, time);
  drawGlow(ctx, cx, 78, 24, currentSkin().glow, 0.4 + Math.sin(time * 3) * 0.08);
  spr.drawStretched(ctx, cx, 98, 3, 3);

  const label: Record<CharacterRow, string> = {
    color: t('cust_color', { s: t(currentSkin().nameKey) }),
    accessory: t('cust_accessory', { s: t(currentAccessory().nameKey) }),
    back: t('cust_back'),
  };
  rows.forEach((row, i) => {
    const active = i === selected;
    const y = 120 + i * 14;
    ctx.font = font(active ? 10 : 9);
    ctx.fillStyle = active ? '#ffe25a' : '#8a76b4';
    ctx.fillText(label[row], cx, y);
    if (active) {
      const w = ctx.measureText(label[row]).width;
      const sway = Math.sin(time * 5) * 1.5;
      ctx.fillText('▸', cx - w / 2 - 8 - sway, y);
      ctx.fillText('◂', cx + w / 2 + 8 + sway, y);
    }
  });

  drawMenuNavHint(ctx, session, viewH - 8);
  ctx.textAlign = 'left';
}

// ------------------------------------------------------------
//  THE ARCHIVE — every inscription, in one place
// ------------------------------------------------------------
//  The colours are the LORE PLATE's, not the menus': parchment gold on
//  a dark recess, with the same hairline edges and corner ticks. That
//  is deliberate — the panel down here has to read as the same object
//  the player met on a cave wall, or the screen becomes a stats page
//  about inscriptions instead of a place to read them. (The plate is
//  redrawn rather than shared: ui/lorePlate.ts owns a fading, fixed
//  rectangle for the run, this one is static and sized by the layout.)
const LORE_GOLD = '#e8dcb4';
const LORE_GOLD_DIM = '#a2946e';
const LORE_BACK = 'rgba(10, 7, 16, 0.86)';

/** A row of the Archive list. Level headers are structure and are never
 *  selectable; entries are the inscriptions themselves (read or not);
 *  BACK is the visible way out — see CLAUDE.md on menus you can enter
 *  and not leave. The scene builds the list, this module paints it. */
export type ArchiveRow =
  | { kind: 'level'; levelId: string }
  | { kind: 'entry'; id: LoreId }
  | { kind: 'back' };

/** Rows of the list visible at once. The scene scrolls the window with
 *  the selection, so it needs the number the layout was cut for. */
export const ARCHIVE_ROWS = 7;

const AR_MARGIN = 10;
const AR_LIST_Y = 37; // baseline of the first visible row
const AR_ROW_GAP = 11;
const AR_PLATE_H = 52; // room for four lines, and it never resizes

/** The visible name of a level (its i18n key), or the raw id if the
 *  inscription belongs to a level that isn't registered yet. */
function levelTitle(levelId: string): string {
  const level = LEVELS.find((l) => l.id === levelId);
  return level ? t(level.nameKey) : levelId.toUpperCase();
}

/**
 * ARCHIVE screen: the list of every inscription on top, the selected
 * one written out on the plate below.
 *
 * Unread entries are LISTED, not hidden: the gaps are the point — they
 * are what tells a player there is something left in a level they
 * thought they had finished. `shown` is the last entry the cursor sat
 * on (the scene remembers it), so moving down onto BACK doesn't blank
 * the text you were in the middle of reading.
 */
export function drawArchiveOverlay(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  rows: readonly ArchiveRow[],
  selected: number,
  scroll: number,
  shown: LoreId | null,
): void {
  const { viewW, viewH, time, save } = session;
  // Darker than the other overlays: this one is read, not glanced at.
  ctx.fillStyle = 'rgba(17,9,26,0.86)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;
  const right = viewW - AR_MARGIN;

  // --- header: what this is, and how much of it you have ---
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e9d6ff';
  ctx.font = font(12);
  ctx.fillText(t('archive_title'), cx, 13);

  const read = LORE_IDS.filter((id) => save.lore.includes(id)).length;
  ctx.font = font(7);
  ctx.fillStyle = LORE_GOLD_DIM;
  ctx.textAlign = 'left';
  ctx.fillText(t('archive_progress', { n: read, m: LORE_IDS.length }), AR_MARGIN, 22);
  ctx.textAlign = 'right';
  ctx.fillText(t('archive_secrets', { n: save.secrets.length }), right, 22);
  ctx.fillStyle = 'rgba(162,148,110,0.3)';
  ctx.fillRect(AR_MARGIN, 26, viewW - AR_MARGIN * 2, 1);

  // --- the list ---
  // Per-group tally in one pass, keyed by the header's own row (a level
  // heading twice in the list would still count only its own entries).
  const tally = new Map<number, { got: number; total: number }>();
  let head = -1;
  rows.forEach((row, i) => {
    if (row.kind === 'level') {
      head = i;
      tally.set(i, { got: 0, total: 0 });
    } else if (row.kind === 'entry') {
      const g = tally.get(head);
      if (!g) return;
      g.total++;
      if (save.lore.includes(row.id)) g.got++;
    }
  });

  const sway = Math.sin(time * 5) * 1.5;
  ctx.textAlign = 'left';
  for (let i = scroll; i < Math.min(rows.length, scroll + ARCHIVE_ROWS); i++) {
    const row = rows[i];
    const y = AR_LIST_Y + (i - scroll) * AR_ROW_GAP;
    const active = i === selected;

    if (row.kind === 'level') {
      // The level name, dim, with its own tally: "2/3" needs no
      // translation and answers "is anything left in here?" at a glance.
      const name = levelTitle(row.levelId);
      const g = tally.get(i) ?? { got: 0, total: 0 };
      const count = `${g.got}/${g.total}`;
      ctx.font = font(7);
      ctx.fillStyle = '#8a76b4';
      ctx.fillText(name, AR_MARGIN + 2, y);
      ctx.textAlign = 'right';
      ctx.fillText(count, right - 4, y);
      ctx.textAlign = 'left';
      // A hairline joining the two, so the row reads as a section rule.
      // Both ends are MEASURED: the level names are translated and the
      // tallies grow, and a rule cut to a guessed length ran into the
      // "1/3" the moment a name was one letter longer.
      const ruleX = AR_MARGIN + 6 + ctx.measureText(name).width;
      const ruleW = right - 8 - ctx.measureText(count).width - ruleX;
      ctx.fillStyle = 'rgba(138,118,180,0.28)';
      if (ruleW > 0) ctx.fillRect(ruleX, y - 3, ruleW, 1);
      continue;
    }

    const label =
      row.kind === 'back'
        ? t('archive_back')
        : save.lore.includes(row.id)
          ? loreText(row.id).title.toUpperCase()
          : t('archive_locked');
    ctx.font = font(active ? 9 : 8);
    ctx.fillStyle = active
      ? '#ffe25a'
      : row.kind === 'back'
        ? '#8a76b4'
        : save.lore.includes(row.id)
          ? LORE_GOLD
          : '#6f5a94';
    ctx.fillText(label, AR_MARGIN + 12, y);
    if (active) ctx.fillText('▸', AR_MARGIN + 2 + sway, y);
  }

  // The scroll thumb: the list is longer than the window, and a screen
  // whose whole job is showing you what you are missing must not hide
  // that there is more of it below.
  if (rows.length > ARCHIVE_ROWS) {
    const trackY = AR_LIST_Y - 7;
    const trackH = ARCHIVE_ROWS * AR_ROW_GAP;
    const thumbH = Math.max(4, Math.round((trackH * ARCHIVE_ROWS) / rows.length));
    const span = (trackH - thumbH) * (scroll / (rows.length - ARCHIVE_ROWS));
    ctx.fillStyle = 'rgba(162,148,110,0.22)';
    ctx.fillRect(viewW - 6, trackY, 1, trackH);
    ctx.fillStyle = LORE_GOLD_DIM;
    ctx.fillRect(viewW - 6, trackY + Math.round(span), 1, thumbH);
  }

  // --- the plate: the inscription itself ---
  const px = AR_MARGIN;
  const py = viewH - 16 - AR_PLATE_H;
  const pw = viewW - AR_MARGIN * 2;
  ctx.fillStyle = LORE_BACK;
  ctx.fillRect(px, py, pw, AR_PLATE_H);
  ctx.fillStyle = LORE_GOLD_DIM;
  ctx.fillRect(px, py, pw, 1);
  ctx.fillRect(px, py + AR_PLATE_H - 1, pw, 1);
  ctx.fillStyle = LORE_GOLD;
  for (const tick of [px, px + pw - 3]) {
    ctx.fillRect(tick, py, 3, 1);
    ctx.fillRect(tick, py + AR_PLATE_H - 1, 3, 1);
  }

  // Only a READ inscription has words: an unread one shows what the
  // list already said (locked) over the line about the cave not having
  // talked yet, so the panel is never blank and never a spoiler.
  const entry = shown !== null && save.lore.includes(shown) ? loreText(shown) : null;
  const title = entry ? entry.title : shown === null ? '' : t('archive_locked');
  const lines = entry ? entry.lines : [t('archive_empty')];

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  if (title) {
    ctx.font = font(7);
    ctx.fillStyle = LORE_GOLD_DIM;
    ctx.fillText(title.toUpperCase(), cx, py + 5);
  }
  // The body is centered in what's left of the plate instead of hanging
  // from a fixed offset: the rectangle is cut for the longest
  // inscription, so a short one would otherwise sit up against the lid.
  ctx.font = font(8);
  ctx.fillStyle = entry ? LORE_GOLD : '#6f5a94';
  const bodyTop = py + 15;
  const bodyH = AR_PLATE_H - 15 - 4;
  const start = bodyTop + Math.round(Math.max(0, (bodyH - lines.length * 9) / 2));
  lines.forEach((line, i) => ctx.fillText(line, cx, start + i * 9));
  ctx.textBaseline = 'alphabetic';

  // Navigation AND the way out, on the one line the layout leaves:
  // drawMenuNavHint says only half of it, and a screen this deep in the
  // menus is exactly where a player needs to be told how to get back.
  const dev = inputDevice();
  const pad = padLabels();
  const nav = dev === 'gamepad' ? t('nav_gp', pad) : t('nav_kb');
  const out =
    dev === 'touch'
      ? t('ow_back_touch')
      : dev === 'gamepad'
        ? t('ow_back_gp', pad)
        : t('ow_back_kb');
  ctx.font = font(7);
  ctx.fillStyle = '#6f5a94';
  ctx.fillText(`${nav} · ${out}`, cx, viewH - 6);
  ctx.textAlign = 'left';
}

/** The text to return to the map, based on keyboard, gamepad or touch. */
function backToMenuText(): string {
  const dev = inputDevice();
  if (dev === 'touch') return t('back_touch');
  return dev === 'gamepad' ? t('back_gp', padLabels()) : t('back_kb');
}

/** Record line under the score: if you beat your level mark, a pulsing
 *  "NEW RECORD!"; if not, your best score to compare against. */
function drawRecordLine(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  cx: number,
  y: number,
): void {
  ctx.font = font(8);
  if (session.runFlags.newBestScore) {
    ctx.save();
    ctx.globalAlpha = 0.6 + Math.sin(session.time * 8) * 0.4;
    ctx.fillStyle = '#ffe25a';
    ctx.fillText(t('new_record'), cx, y);
    ctx.restore();
  } else {
    const best = levelRecord(session.save, session.level.id).bestScore;
    ctx.fillStyle = '#ffd36e';
    ctx.fillText(t('best_score_short', { n: best }), cx, y);
  }
}

/**
 * THE ENDING (world 1 completed). The great door has just given way, so
 * the screen does what the door does: light floods it. Everything is a
 * function of `t` (seconds since the win) so the moment BREATHES —
 * the glow swells, the title lands, the tally writes itself line by
 * line — instead of dumping a card on screen the way a level win does.
 * The run's numbers aren't the point here; the whole grotto is, so it
 * tallies the world: levels, crystals and the sum of every best time.
 */
export function drawEndingOverlay(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  t0: number,
): void {
  const { viewW, viewH, time, save } = session;
  const cx = viewW / 2;
  const cy = viewH / 2;

  // The light coming through the door: it swells over the first two
  // seconds and then just breathes, washing the cave out behind it.
  const flood = Math.min(1, t0 / 2.2);
  ctx.fillStyle = `rgba(26,16,40,${0.55 + flood * 0.4})`;
  ctx.fillRect(0, 0, viewW, viewH);
  const rays = ctx.createRadialGradient(cx, cy - 6, 4, cx, cy - 6, viewH * (0.35 + flood * 0.5));
  rays.addColorStop(0, `rgba(255,231,160,${0.32 * flood})`);
  rays.addColorStop(1, 'rgba(255,214,106,0)');
  ctx.fillStyle = rays;
  ctx.fillRect(0, 0, viewW, viewH);

  // Motes of light drifting up through the doorway.
  for (let i = 0; i < 14; i++) {
    const p = ((time * 0.35 + i * 0.137) % 1);
    const mx = cx + Math.sin(time * 0.6 + i * 2.1) * (24 + i * 5);
    const my = viewH - p * (viewH + 12);
    ctx.globalAlpha = Math.sin(p * Math.PI) * 0.55 * flood;
    ctx.fillStyle = i % 3 === 0 ? '#fff3c0' : '#ffd76a';
    ctx.fillRect(Math.round(mx), Math.round(my), i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  // Each line waits its turn, so the ending reads like a curtain call.
  const line = (delay: number, draw: () => void): void => {
    if (t0 < delay) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (t0 - delay) * 2.5);
    draw();
    ctx.restore();
  };

  line(0.5, () => {
    drawGlow(ctx, cx, cy - 44, 40, '#ffd76a', 0.3 + Math.sin(time * 2) * 0.08);
    ctx.fillStyle = '#ffe25a';
    ctx.font = font(20);
    ctx.fillText(t('end_title'), cx, cy - 38);
  });
  line(1.1, () => {
    ctx.fillStyle = '#fff3c0';
    ctx.font = font(9);
    ctx.fillText(t('end_sub'), cx, cy - 22);
  });

  // The tally of the whole grotto, not of the last run.
  const done = LEVELS.filter((l) => levelRecord(save, l.id).completions > 0).length;
  const crystals = LEVELS.reduce(
    (n, l) => n + l.rooms.reduce((r, room) => r + room.entities.filter((e) => e.type === 'crystal').length, 0),
    0,
  );
  const totalTime = LEVELS.reduce((s, l) => s + levelRecord(save, l.id).bestTime, 0);
  line(1.7, () => {
    ctx.fillStyle = '#7ce0ff';
    ctx.font = font(8);
    ctx.fillText(t('end_levels', { n: done, m: LEVELS.length }), cx, cy - 4);
  });
  line(2.1, () => {
    ctx.fillStyle = '#b98bff';
    ctx.font = font(8);
    ctx.fillText(t('end_crystals', { n: crystals }), cx, cy + 8);
  });
  line(2.5, () => {
    ctx.fillStyle = '#ffd36e';
    ctx.font = font(8);
    ctx.fillText(t('end_total_time', { t: formatTime(totalTime) }), cx, cy + 20);
  });
  line(3.2, () => {
    ctx.fillStyle = '#e9d6ff';
    ctx.font = font(7);
    ctx.fillText(t('end_flavor'), cx, cy + 38);
  });
  line(4, () => {
    const dev = inputDevice();
    const back = dev === 'touch'
      ? t('end_back_touch')
      : dev === 'gamepad'
        ? t('end_back_gp', padLabels())
        : t('end_back');
    ctx.globalAlpha *= 0.55 + Math.sin(time * 4) * 0.45;
    ctx.fillStyle = '#9b86c4';
    ctx.font = font(8);
    ctx.fillText(back, cx, cy + 54);
  });
  ctx.textAlign = 'left';
}
