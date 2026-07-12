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
  const cellW = 12;
  const cellH = 8;
  const gap = 2;
  const rooms = session.world.allRooms;
  const maxX = Math.max(...rooms.map((r) => r.data.mapPos.x));
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
