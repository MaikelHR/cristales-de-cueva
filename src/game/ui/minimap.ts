// ============================================================
//  MINIMAPA (arriba a la derecha)
// ------------------------------------------------------------
//  Las salas se revelan al visitarlas; la actual se resalta y
//  muestra un puntito con la posición del jugador.
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
  // En táctil dejamos libre la esquina superior derecha (ahí va el botón
  // de pausa en pantalla), así que corremos el minimapa más a la izquierda.
  const inset = isTouchMode() ? 44 : 6;
  const baseX = session.viewW - inset - ((maxX + 1) * cellW + maxX * gap);
  const baseY = 6;

  for (const room of rooms) {
    if (!session.visited.has(room.data.id)) continue;
    const x = baseX + room.data.mapPos.x * (cellW + gap);
    const y = baseY + room.data.mapPos.y * (cellH + gap);
    const isCurrent = room === session.world.current;
    // Marco y fondo de la celda
    ctx.fillStyle = isCurrent ? '#ffe25a' : '#4a2e70';
    ctx.fillRect(x, y, cellW, cellH);
    ctx.fillStyle = isCurrent ? '#3a2456' : '#241638';
    ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
    // Puntito del jugador dentro de la sala actual
    if (isCurrent) {
      const rel = clamp(session.player.x / room.level.widthPx, 0, 1);
      ctx.fillStyle = '#7ce0ff';
      ctx.fillRect(x + 1 + Math.round(rel * (cellW - 4)), y + cellH / 2 - 1, 2, 2);
    }
  }
}
