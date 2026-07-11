// ============================================================
//  DIBUJO DE TILES (la cara visible de Level)
// ------------------------------------------------------------
//  Level es lógica pura; acá vive su dibujo: culling de lo visible
//  y auto-tiling de los bloques sólidos (relleno base más bordes
//  biselados en las caras que dan al vacío). Luz desde arriba-
//  izquierda: tope y lado izquierdo iluminados, derecha y base en
//  sombra.
// ============================================================

import { Level, TILE } from '../world/Level';
import { sprites } from '../art/sprites';

export function drawLevelTiles(
  ctx: CanvasRenderingContext2D,
  level: Level,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
): void {
  // Solo dibujamos los tiles visibles (culling) para que rinda bien.
  const c0 = Math.max(0, Math.floor(camX / TILE));
  const c1 = Math.min(level.cols - 1, Math.floor((camX + viewW) / TILE));
  const r0 = Math.max(0, Math.floor(camY / TILE));
  const r1 = Math.min(level.rows - 1, Math.floor((camY + viewH) / TILE));

  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (level.solidCell(row, col)) {
        drawSolidTile(ctx, level, row, col, col * TILE - camX, row * TILE - camY);
      } else if (level.oneWayCell(row, col)) {
        sprites.plank.draw(ctx, col * TILE - camX, row * TILE - camY);
      }
    }
  }
}

function drawSolidTile(
  ctx: CanvasRenderingContext2D,
  level: Level,
  row: number,
  col: number,
  px: number,
  py: number,
): void {
  // Fuera del mapa cuenta como sólido (no dibuja borde afuera).
  const up = !level.solidCell(row - 1, col);
  const down = !level.solidCell(row + 1, col);
  const left = !level.solidCell(row, col - 1);
  const right = !level.solidCell(row, col + 1);

  // Base: tope tallado si mira al vacío arriba; si no, relleno con variante.
  if (up) {
    sprites.tileTop.draw(ctx, px, py);
  } else {
    const v = (col * 7 + row * 13) % 9;
    const fill = v === 3 ? sprites.tileFill2 : v === 7 ? sprites.tileFill3 : sprites.tileFill;
    fill.draw(ctx, px, py);
  }

  // Rim-light: las caras expuestas llevan un borde iluminado que las
  // hace resaltar contra la cueva oscura (izquierda más brillante que
  // la derecha por la luz de arriba-izquierda). La base queda en sombra.
  const RIM_L = '#8064b0';
  const RIM_R = '#5f4790';
  const SHADOW = '#160b24';
  if (left) {
    ctx.fillStyle = RIM_L;
    ctx.fillRect(px, py, 1, TILE);
  }
  if (right) {
    ctx.fillStyle = RIM_R;
    ctx.fillRect(px + TILE - 1, py, 1, TILE);
  }
  if (down) {
    ctx.fillStyle = SHADOW;
    ctx.fillRect(px, py + TILE - 2, TILE, 2);
  }
  // Esquinas exteriores redondeadas (chaflán oscuro).
  ctx.fillStyle = SHADOW;
  if (up && left) ctx.fillRect(px, py, 1, 1);
  if (up && right) ctx.fillRect(px + TILE - 1, py, 1, 1);
  if (down && left) ctx.fillRect(px, py + TILE - 1, 1, 1);
  if (down && right) ctx.fillRect(px + TILE - 1, py + TILE - 1, 1, 1);
}
