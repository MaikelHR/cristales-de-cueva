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
import { font, formatTime } from './text';
import { OW_NODES } from './overworld';

/** The items that can appear in the game's menus; each scene
 *  builds its own list and this module only labels and paints them. */
export type MenuItem =
  | 'play'
  | 'resume'
  | 'restart'
  | 'character'
  | 'fullscreen'
  | 'language'
  | 'exit';

const MENU_LABEL: Record<MenuItem, StrKey> = {
  play: 'menu_play',
  resume: 'menu_resume',
  restart: 'menu_restart',
  character: 'menu_character',
  fullscreen: 'menu_fullscreen',
  language: 'menu_language',
  exit: 'menu_exit',
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

  // A big crystal floating above the title, with its halo.
  const bob = Math.sin(time * 2) * 2;
  const frames = [sprites.crystal, sprites.crystal2, sprites.crystal3, sprites.crystal4];
  const spr = frameAt(frames, 6, time);
  const cy = viewH / 2 - 52 + bob;
  drawGlow(ctx, cx, cy, 20, '#ffe25a', 0.5 + Math.sin(time * 4) * 0.15);
  // Crystal at double size, centered on (cx, cy).
  spr.drawStretched(ctx, cx, cy + spr.h, 2, 2);

  // The character (with its skin) admiring the crystal: the live
  // customization preview — switching skins shows up instantly.
  const skin = playerSprites();
  const hero = time % 3.3 < 0.15 ? skin.blink : frameAt([skin.idle, skin.idle2], 1.6, time);
  const heroFeet = viewH / 2 - 52 + spr.h; // the crystal's floor, without the bob
  drawGlow(ctx, cx - 34, heroFeet - 16, 14, currentSkin().glow, 0.3);
  hero.drawStretched(ctx, cx - 34, heroFeet, 2, 2);

  ctx.textAlign = 'center';
  // Title in two lines so it fits nicely in 320px.
  ctx.fillStyle = '#e9d6ff';
  ctx.font = font(18);
  ctx.fillText(t('title_line1'), cx, viewH / 2 - 16);
  ctx.fillStyle = '#b98bff';
  ctx.font = font(11);
  ctx.fillText(t('title_line2'), cx, viewH / 2);

  // Saved progress (only if you've already completed a level).
  ctx.font = font(8);
  const completed = LEVELS.filter((l) => levelRecord(save, l.id).completions > 0).length;
  if (completed > 0) {
    ctx.fillStyle = '#5ce06a';
    ctx.fillText(t('title_progress', { n: completed, m: OW_NODES.length }), cx, viewH / 2 + 14);
  }

  const touch = inputDevice() === 'touch';
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
    drawMenuList(ctx, session, items, selected, viewH / 2 + (four ? 26 : 32), four ? 12 : 14);
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
