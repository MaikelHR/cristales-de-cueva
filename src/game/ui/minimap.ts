// ============================================================
//  MINIMAP (top right)
// ------------------------------------------------------------
//  Rooms are revealed as they're visited; the current one is
//  highlighted and shows a dot with the player's position.
// ============================================================

import { clamp } from '../../engine/canvas';
import { isTouchMode } from '../../engine/input';
import type { GameSession } from '../session';

export function drawMinimap(ctx: CanvasRenderingContext2D, session: GameSession): void {
  const rooms = session.world.allRooms;
  const maxX = Math.max(...rooms.map((r) => r.data.mapPos.x));
  // The minimap grows with the level, and a twelve-room one used to
  // reach the middle of the screen and sit on top of the CLOCK. It gets
  // an allowance of the right-hand side and shrinks its cells to fit
  // inside it, however long the level is.
  const allowance = session.viewW * 0.4;
  let cellW = 12;
  let cellH = 8;
  let gap = 2;
  const needed = (maxX + 1) * cellW + maxX * gap;
  if (needed > allowance) {
    gap = 1;
    cellW = Math.max(3, Math.floor((allowance - maxX * gap) / (maxX + 1)));
    cellH = Math.max(3, Math.round(cellW * 0.66));
  }
  // On touch we keep the top-right corner clear (the on-screen pause
  // button goes there), so we shift the minimap further left.
  const inset = isTouchMode() ? 44 : 6;
  const baseX = session.viewW - inset - ((maxX + 1) * cellW + maxX * gap);
  const baseY = 6;

  for (const room of rooms) {
    if (!session.visited.has(room.data.id)) continue;
    const x = baseX + room.data.mapPos.x * (cellW + gap);
    const y = baseY + room.data.mapPos.y * (cellH + gap);
    const isCurrent = room === session.world.current;
    // Cell frame and background
    ctx.fillStyle = isCurrent ? '#ffe25a' : '#4a2e70';
    ctx.fillRect(x, y, cellW, cellH);
    ctx.fillStyle = isCurrent ? '#3a2456' : '#241638';
    ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
    // Player dot inside the current room
    if (isCurrent) {
      const rel = clamp(session.player.x / room.level.widthPx, 0, 1);
      ctx.fillStyle = '#7ce0ff';
      ctx.fillRect(x + 1 + Math.round(rel * (cellW - 4)), y + cellH / 2 - 1, 2, 2);
    }
  }
}
