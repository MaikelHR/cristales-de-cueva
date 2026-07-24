// ============================================================
//  PROGRESS BAR (top right)
// ------------------------------------------------------------
//  Every level in this game is LINEAR: the rooms sit in one row
//  (mapPos.y is always 0), so a 2D minimap never had a second
//  dimension to show — it was a strip of cells saying "you're on
//  room N", and on the long challenge levels (12/15/18 rooms) the
//  cells shrank to 3px to fit and read as noise. This replaces it
//  with what it always really was: a progress bar of FIXED-SIZE
//  segments — same footprint whether the level has 3 rooms or 18 —
//  past rooms lit, the current one glowing, the rest still to come.
// ============================================================

import { isTouchMode } from '../../engine/input';
import { t } from '../i18n';
import { font } from './text';
import type { GameSession } from '../session';

const DONE = '#7c5cb0';    // a room already visited
const TODO = '#3a2456';    // still ahead
const HERE = '#ffe25a';    // the room you're in (glows, taller)
const RAIL = '#241638';    // backing, so the bar reads as one piece

export function drawProgress(ctx: CanvasRenderingContext2D, session: GameSession): void {
  // SECRET rooms are not on the bar. The bar counts the rooms you must
  // cross, so a hidden chamber must not lengthen it — and there is a
  // sharper reason than tidiness: `idByCol` below is built last-writer-
  // wins, and a secret sharing its host's column would otherwise STEAL
  // that column's id, leaving the host's segment unlit forever.
  const rooms = session.world.allRooms.filter((r) => !r.data.secret);
  const total = Math.max(...rooms.map((r) => r.data.mapPos.x)) + 1;
  if (total <= 1) return; // a single-room level has no progress to show
  const currentIdx = session.world.current.data.mapPos.x;
  const idByCol = new Map(rooms.map((r) => [r.data.mapPos.x, r.data.id]));

  // Fixed segment size, so the bar keeps its footprint however long the
  // level is. It only tightens if a very long level wouldn't otherwise
  // fit its right-hand allowance. On touch the corner is the pause
  // button's, so we shift further left (same inset the minimap used).
  const inset = isTouchMode() ? 44 : 6;
  const allowance = session.viewW * 0.42;
  const gap = 1;
  let segW = 7;
  const span = (w: number) => total * (w + gap) - gap;
  if (span(segW) > allowance) segW = Math.max(3, Math.floor((allowance - (total - 1) * gap) / total));
  const barW = span(segW);
  const segH = 6;
  const baseX = session.viewW - inset - barW;
  const baseY = 7;

  ctx.fillStyle = RAIL;
  ctx.fillRect(baseX - 1, baseY - 1, barW + 2, segH + 2);

  for (let i = 0; i < total; i++) {
    const x = baseX + i * (segW + gap);
    if (i === currentIdx) {
      ctx.fillStyle = HERE;
      ctx.fillRect(x, baseY - 1, segW, segH + 2); // a touch taller: it's you
    } else {
      ctx.fillStyle = session.visited.has(idByCol.get(i) ?? '') ? DONE : TODO;
      ctx.fillRect(x, baseY, segW, segH);
    }
  }

  // "SALA 7/18" under the bar, right-aligned to its end.
  ctx.font = font(6);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#9b86c4';
  ctx.fillText(`${t('hud_room')} ${currentIdx + 1}/${total}`, baseX + barW, baseY + segH + 3);
  ctx.textAlign = 'left'; // leave the context as we found it
}
