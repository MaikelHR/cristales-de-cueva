// ============================================================
//  DIBUJO DE TILES (la cara visible de Level)
// ------------------------------------------------------------
//  Level es lógica pura; acá vive su dibujo: culling de lo visible
//  y auto-tiling de los bloques sólidos (relleno base más bordes
//  biselados en las caras que dan al vacío). Luz desde arriba-
//  izquierda: tope y lado izquierdo iluminados, derecha y base en
//  sombra. La roca se dibuja con el TileSet del bioma (tileSets.ts);
//  los tiles-lenguaje (tablón, púas, '%', '~') son iguales en todos.
// ============================================================

import { Level, TILE } from '../world/Level';
import { sprites } from '../art/sprites';
import { tileSetFor, type TileSet } from '../art/tileSets';

export function drawLevelTiles(
  ctx: CanvasRenderingContext2D,
  level: Level,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  levelId = 'cavernas',
): void {
  const set = tileSetFor(levelId);
  // Solo dibujamos los tiles visibles (culling) para que rinda bien.
  const c0 = Math.max(0, Math.floor(camX / TILE));
  const c1 = Math.min(level.cols - 1, Math.floor((camX + viewW) / TILE));
  const r0 = Math.max(0, Math.floor(camY / TILE));
  const r1 = Math.min(level.rows - 1, Math.floor((camY + viewH) / TILE));

  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (level.crackCell(row, col)) {
        drawCrackTile(ctx, col * TILE - camX, row * TILE - camY);
      } else if (level.icyCell(row, col)) {
        drawIceTile(ctx, level, row, col, col * TILE - camX, row * TILE - camY);
      } else if (level.solidCell(row, col)) {
        drawSolidTile(ctx, level, set, row, col, col * TILE - camX, row * TILE - camY);
      } else if (level.oneWayCell(row, col)) {
        sprites.plank.draw(ctx, col * TILE - camX, row * TILE - camY);
      } else if (level.spikeCell(row, col)) {
        drawSpikeTile(ctx, col * TILE - camX, row * TILE - camY);
      }
    }
  }
}

/** Bloque agrietado: roca con una fisura pálida en Y — se lee de un
 *  vistazo como "esto se rompe" (azotón desde arriba, embestida de
 *  costado). El mismo dibujo en todos los biomas: es un lenguaje. */
function drawCrackTile(ctx: CanvasRenderingContext2D, px: number, py: number): void {
  ctx.fillStyle = '#241638';
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = '#3a2456';
  ctx.fillRect(px, py, TILE, 1);
  ctx.fillRect(px, py, 1, TILE);
  ctx.fillStyle = '#160b24';
  ctx.fillRect(px, py + TILE - 1, TILE, 1);
  ctx.fillRect(px + TILE - 1, py, 1, TILE);
  // La fisura: una Y de píxeles claros con su núcleo brillante.
  ctx.fillStyle = '#8064b0';
  ctx.fillRect(px + 3, py + 1, 1, 2);
  ctx.fillRect(px + 4, py + 3, 1, 2);
  ctx.fillRect(px + 3, py + 5, 1, 2);
  ctx.fillRect(px + 1, py + 3, 2, 1);
  ctx.fillRect(px + 5, py + 5, 2, 1);
  ctx.fillStyle = '#d7c9ec';
  ctx.fillRect(px + 4, py + 4, 1, 1);
}

/** Hielo: bloque pálido con destello en el tope (donde se patina)
 *  y la panza en azul hondo. */
function drawIceTile(
  ctx: CanvasRenderingContext2D,
  level: Level,
  row: number,
  col: number,
  px: number,
  py: number,
): void {
  const up = !level.solidCell(row - 1, col);
  ctx.fillStyle = '#4a7ca8';
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = '#7ab0d8';
  ctx.fillRect(px + 1, py + 1, TILE - 2, 3);
  if (up) {
    // Tope pulido: la franja clara que dice "acá se resbala".
    ctx.fillStyle = '#d6f7ff';
    ctx.fillRect(px, py, TILE, 1);
    ctx.fillStyle = '#eafaff';
    ctx.fillRect(px + ((col * 5 + row * 3) % 5), py, 2, 1);
  }
  ctx.fillStyle = '#2e5878';
  ctx.fillRect(px, py + TILE - 2, TILE, 2);
  // Un reflejo interior en diagonal, distinto por celda.
  ctx.fillStyle = '#a8d8f0';
  const dx = (col * 7 + row * 11) % 4;
  ctx.fillRect(px + 2 + dx, py + 3, 1, 2);
  ctx.fillRect(px + 3 + dx, py + 5, 1, 1);
}

/** Púas: dos agujas de roca clavadas en el piso, con la punta clara.
 *  El dibujo llena la celda pero la caja de daño (Level.touchesSpike)
 *  es más chica: lo que se ve amenaza un poco más de lo que pincha. */
function drawSpikeTile(ctx: CanvasRenderingContext2D, px: number, py: number): void {
  ctx.fillStyle = '#5f4790';
  for (const base of [0, 4]) {
    // Triángulo en escalera: ancho 4 en la base, 2 al medio, 1 en la punta.
    ctx.fillRect(px + base, py + 6, 4, 2);
    ctx.fillRect(px + base + 1, py + 3, 2, 3);
    ctx.fillStyle = '#8064b0';
    ctx.fillRect(px + base + 1, py + 1, 1, 2);
    ctx.fillStyle = '#5f4790';
  }
  // Puntas iluminadas: se leen de un vistazo como "esto pincha".
  ctx.fillStyle = '#d7c9ec';
  ctx.fillRect(px + 1, py + 1, 1, 1);
  ctx.fillRect(px + 5, py + 1, 1, 1);
}

function drawSolidTile(
  ctx: CanvasRenderingContext2D,
  level: Level,
  set: TileSet,
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
    set.top.draw(ctx, px, py);
  } else {
    const v = (col * 7 + row * 13) % 9;
    const fill = v === 3 ? set.fill2 : v === 7 ? set.fill3 : set.fill;
    fill.draw(ctx, px, py);
  }

  // Rim-light: las caras expuestas llevan un borde iluminado que las
  // hace resaltar contra la cueva oscura (izquierda más brillante que
  // la derecha por la luz de arriba-izquierda). La base queda en sombra.
  if (left) {
    ctx.fillStyle = set.rimL;
    ctx.fillRect(px, py, 1, TILE);
  }
  if (right) {
    ctx.fillStyle = set.rimR;
    ctx.fillRect(px + TILE - 1, py, 1, TILE);
  }
  if (down) {
    ctx.fillStyle = set.shadow;
    ctx.fillRect(px, py + TILE - 2, TILE, 2);
  }
  // Esquinas exteriores redondeadas (chaflán oscuro).
  ctx.fillStyle = set.shadow;
  if (up && left) ctx.fillRect(px, py, 1, 1);
  if (up && right) ctx.fillRect(px + TILE - 1, py, 1, 1);
  if (down && left) ctx.fillRect(px, py + TILE - 1, 1, 1);
  if (down && right) ctx.fillRect(px + TILE - 1, py + TILE - 1, 1, 1);
}
