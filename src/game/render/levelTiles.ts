// ============================================================
//  TILE DRAWING (the visible face of Level)
// ------------------------------------------------------------
//  Level is pure logic; here lives its drawing: culling of the
//  visible tiles and auto-tiling of the solid blocks (base fill plus
//  beveled edges on the faces that meet the void). Light from the
//  top-left: top and left side lit, right and bottom in shadow. Rock
//  is drawn with the biome's TileSet (tileSets.ts); the language
//  tiles (plank, spikes, '%', '~', and '=' water) are the same across
//  all of them. Water is the odd one out: NON-solid, so it falls
//  through the solid/plank/spike branches and needs its own.
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
  const now = performance.now() / 1000; // drives the water's animation
  // Only draw the visible tiles (culling) so it performs well.
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
      } else if (level.wetCell(row, col)) {
        drawWaterTile(ctx, level, row, col, col * TILE - camX, row * TILE - camY, now);
      }
    }
  }
}

/** Cracked block: rock with a pale Y-shaped fissure — reads at a
 *  glance as "this breaks" (pound from above, charge from the side).
 *  The same drawing across all biomes: it's a language. */
function drawCrackTile(ctx: CanvasRenderingContext2D, px: number, py: number): void {
  ctx.fillStyle = '#241638';
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = '#3a2456';
  ctx.fillRect(px, py, TILE, 1);
  ctx.fillRect(px, py, 1, TILE);
  ctx.fillStyle = '#160b24';
  ctx.fillRect(px, py + TILE - 1, TILE, 1);
  ctx.fillRect(px + TILE - 1, py, 1, TILE);
  // The fissure: a Y of light pixels with its bright core.
  ctx.fillStyle = '#8064b0';
  ctx.fillRect(px + 3, py + 1, 1, 2);
  ctx.fillRect(px + 4, py + 3, 1, 2);
  ctx.fillRect(px + 3, py + 5, 1, 2);
  ctx.fillRect(px + 1, py + 3, 2, 1);
  ctx.fillRect(px + 5, py + 5, 2, 1);
  ctx.fillStyle = '#d7c9ec';
  ctx.fillRect(px + 4, py + 4, 1, 1);
}

/** Ice: pale block with a gleam on top (where you slip) and its
 *  underside in deep blue. */
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
    // Polished top: the light band that says "you slip here".
    ctx.fillStyle = '#d6f7ff';
    ctx.fillRect(px, py, TILE, 1);
    ctx.fillStyle = '#eafaff';
    ctx.fillRect(px + ((col * 5 + row * 3) % 5), py, 2, 1);
  }
  ctx.fillStyle = '#2e5878';
  ctx.fillRect(px, py + TILE - 2, TILE, 2);
  // An interior diagonal reflection, different per cell.
  ctx.fillStyle = '#a8d8f0';
  const dx = (col * 7 + row * 11) % 4;
  ctx.fillRect(px + 2 + dx, py + 3, 1, 2);
  ctx.fillRect(px + 3 + dx, py + 5, 1, 1);
}

/** Spikes: two rock needles driven into the floor, with light tips.
 *  The drawing fills the cell but the hurt box (Level.touchesSpike)
 *  is smaller: what you see threatens a bit more than it pricks. */
function drawSpikeTile(ctx: CanvasRenderingContext2D, px: number, py: number): void {
  ctx.fillStyle = '#5f4790';
  for (const base of [0, 4]) {
    // Stair-stepped triangle: width 4 at the base, 2 mid, 1 at the tip.
    ctx.fillRect(px + base, py + 6, 4, 2);
    ctx.fillRect(px + base + 1, py + 3, 2, 3);
    ctx.fillStyle = '#8064b0';
    ctx.fillRect(px + base + 1, py + 1, 1, 2);
    ctx.fillStyle = '#5f4790';
  }
  // Lit tips: read at a glance as "this pricks".
  ctx.fillStyle = '#d7c9ec';
  ctx.fillRect(px + 1, py + 1, 1, 1);
  ctx.fillRect(px + 5, py + 1, 1, 1);
}

// Water ('='): turquoise translucency. rgba fills TINT the depth
// drawn behind (so you read pools as deep) and never touch the canvas
// alpha state, so no tile after this one is stained.
const WATER_FILL = 'rgba(34,116,132,0.42)'; // the body
const WATER_CAUSTIC = 'rgba(122,222,224,0.30)'; // light bent by the surface
const WATER_LINE = 'rgba(154,238,244,0.72)'; // the bright waterline
const WATER_LINE_SOFT = 'rgba(70,178,190,0.5)'; // a softer band under it
const WATER_GLINT = 'rgba(224,250,255,0.9)'; // sparkles running the surface

/** Water: a flooded, NON-solid cell. The top row of a body (open air
 *  above — not another water cell and not solid rock) gets an animated
 *  bright waterline with travelling glints; the rest is a translucent
 *  teal body with a slow caustic drifting through it. */
function drawWaterTile(
  ctx: CanvasRenderingContext2D,
  level: Level,
  row: number,
  col: number,
  px: number,
  py: number,
  time: number,
): void {
  // Open surface = neither water nor rock directly above (a submerged
  // tunnel's rock ceiling must not sprout a false waterline).
  const surface = !level.wetCell(row - 1, col) && !level.solidCell(row - 1, col);
  // Translucent body: the parallax behind shows through, reading as depth.
  ctx.fillStyle = WATER_FILL;
  ctx.fillRect(px, py, TILE, TILE);
  // A caustic dash drifting slowly, offset per cell so it never tiles.
  const cx = px + 1 + Math.round((Math.sin(time * 1.3 + col * 0.8 + row) + 1) * (TILE - 3) * 0.5);
  ctx.fillStyle = WATER_CAUSTIC;
  ctx.fillRect(cx, py + 3 + ((row + col) % 3), 2, 1);
  if (surface) {
    ctx.fillStyle = WATER_LINE;
    ctx.fillRect(px, py, TILE, 1);
    ctx.fillStyle = WATER_LINE_SOFT;
    ctx.fillRect(px, py + 1, TILE, 1);
    // A glint that runs along the surface (phased by col => it travels).
    if (Math.sin(time * 3 + col * 0.7) > 0.6) {
      ctx.fillStyle = WATER_GLINT;
      ctx.fillRect(px + 2 + ((col * 3 + Math.floor(time * 6)) % (TILE - 3)), py, 1, 1);
    }
  }
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
  // Outside the map counts as solid (draws no border out there).
  const up = !level.solidCell(row - 1, col);
  const down = !level.solidCell(row + 1, col);
  const left = !level.solidCell(row, col - 1);
  const right = !level.solidCell(row, col + 1);

  // Base: carved top if it faces the void above; otherwise fill with a variant.
  if (up) {
    set.top.draw(ctx, px, py);
  } else {
    const v = (col * 7 + row * 13) % 9;
    const fill = v === 3 ? set.fill2 : v === 7 ? set.fill3 : set.fill;
    fill.draw(ctx, px, py);
  }

  // Rim-light: the exposed faces get a lit edge that makes them stand
  // out against the dark cave (left brighter than right due to the
  // top-left light). The bottom stays in shadow.
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
  // Rounded outer corners (dark chamfer).
  ctx.fillStyle = set.shadow;
  if (up && left) ctx.fillRect(px, py, 1, 1);
  if (up && right) ctx.fillRect(px + TILE - 1, py, 1, 1);
  if (down && left) ctx.fillRect(px, py + TILE - 1, 1, 1);
  if (down && right) ctx.fillRect(px + TILE - 1, py + TILE - 1, 1, 1);
}
