// ============================================================
//  THE LORE PLATE — what an inscription says, on screen
// ------------------------------------------------------------
//  It is a SCREEN-space panel, not a speech bubble in the world. On a
//  320x176 canvas a world-space plaque next to the glyph would be
//  clipped by the room's own ceiling half the time (the crypt's rooms
//  are 32 rows tall and the camera sits low), and a three-line text in
//  a 40px gap is unreadable anyway.
//
//  It fades rather than pops, and it holds the SAME rectangle whatever
//  the text is, so walking a wall of inscriptions doesn't make the
//  screen jump. It does move between the top and bottom halves — see
//  below; that is the one thing worth the jump.
//
//  The panel never blocks input and never pauses anything. You opened
//  it with a press of 'down' and you close it the same way, or by
//  walking off. That is the whole interaction contract.
// ============================================================

import type { GameSession } from '../session';
import { loreText, type LoreId } from '../lore';
import { t } from '../i18n';
import { font } from './text';

const PLATE_H = 46;
const MARGIN = 10;

/** Seconds the panel takes to come up and go down. */
const FADE = 0.16;
let shown = 0; // 0..1, eased over frames — module state, like the dust
/** The last inscription shown, kept so the panel can still draw itself
 *  while it fades OUT after the player has already walked away. */
let lastId: LoreId | null = null;

const GOLD = '#e8dcb4';
const GOLD_DIM = '#a2946e';
// Nearly opaque: the plate sits over the room, and at 0.86 the tiles
// and the dust behind it fought the text at 8px.
const BACK = 'rgba(9, 6, 14, 0.94)';

/** Snaps the plate shut with no fade. Called when a run starts: this
 *  module's state outlives a GameSession (it is module-level, like the
 *  dust), so without it the first frames of a fresh run play the
 *  fade-OUT of whatever inscription the last run happened to end on. */
export function resetLorePlate(): void {
  shown = 0;
  lastId = null;
}

export function drawLorePlate(ctx: CanvasRenderingContext2D, session: GameSession): void {
  const id = session.readingLore;
  if (id) lastId = id;
  // Standing beside one without reading it: the cue that teaches the
  // verb. It is one dim line low on the screen, not a prompt box —
  // you are meant to notice it, not obey it.
  if (session.loreNear) {
    ctx.save();
    ctx.font = font(7);
    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD_DIM;
    ctx.globalAlpha = 0.55 + Math.sin(session.time * 3) * 0.15;
    ctx.fillText(t('lore_hint'), session.viewW / 2, session.viewH - 14);
    ctx.restore();
    ctx.textAlign = 'left';
  }
  // Fade toward wherever we should be. Frame-rate tied on purpose: this
  // is cosmetic, it runs in draw(), and the fixed-step loop keeps draw
  // and update in lockstep anyway.
  const target = id ? 1 : 0;
  const step = 1 / 60 / FADE;
  shown += Math.sign(target - shown) * Math.min(Math.abs(target - shown), step);
  if (shown <= 0.001 || !lastId) return;

  const { title, lines } = loreText(lastId);
  const w = session.viewW - MARGIN * 2;
  const x = MARGIN;
  // The plate goes on the OPPOSITE half of the screen from the player.
  // It wants to be at the bottom — that is where a caption belongs —
  // but the camera clamps, so in a room exactly as tall as the view the
  // player stands in the bottom third and a bottom plate buries them
  // and the floor they are standing on. Reading an inscription must
  // never mean losing sight of yourself.
  // 44 rather than the top edge: the HUD's hearts, counters and boss
  // hint own everything above ~41px, and two stacks of text fighting
  // for the same rows is worse than either of them alone.
  const playerLow = session.player.y + session.player.h / 2 - session.camera.y > session.viewH / 2;
  const y = playerLow ? 44 : session.viewH - PLATE_H - 8;

  ctx.save();
  ctx.globalAlpha = shown;

  // The plate: a dark recess with a hairline gold edge, like the
  // plaques themselves.
  ctx.fillStyle = BACK;
  ctx.fillRect(x, y, w, PLATE_H);
  ctx.fillStyle = GOLD_DIM;
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y + PLATE_H - 1, w, 1);
  // Corner ticks, so it reads as cut stone and not as a dialog box.
  ctx.fillStyle = GOLD;
  for (const cx of [x, x + w - 3]) {
    ctx.fillRect(cx, y, 3, 1);
    ctx.fillRect(cx, y + PLATE_H - 1, 3, 1);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const mid = session.viewW / 2;

  ctx.font = font(7);
  ctx.fillStyle = GOLD_DIM;
  ctx.fillText(title.toUpperCase(), mid, y + 5);

  ctx.font = font(8);
  ctx.fillStyle = GOLD;
  lines.forEach((line, i) => {
    ctx.fillText(line, mid, y + 16 + i * 9);
  });

  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
