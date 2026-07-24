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
//
//  '*' (the FALSE WALL) is the odd one in the other direction: it is
//  checked FIRST and deliberately drawn as ordinary rock, because a
//  secret that announces itself is not one. Everything that makes it
//  findable is in `drawSecretSeam`, and all of it is gated on the
//  player being close enough to have come over to look.
// ============================================================

import { Level, TILE } from '../world/Level';
import { sprites } from '../art/sprites';
import { tileSetFor, type TileSet } from '../art/tileSets';
import { debug } from '../debug';

export function drawLevelTiles(
  ctx: CanvasRenderingContext2D,
  level: Level,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  levelId = 'cavernas',
  /** The player's centre in WORLD px. Only the false walls read it:
   *  their seam is lit by how close you are, and nothing else. */
  playerX = -9999,
  playerY = -9999,
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
      if (level.secretCell(row, col)) {
        // A FALSE WALL is drawn as the rock beside it — that is the
        // whole point — and then given back the one thing that makes it
        // findable without flailing: a seam, lit only by your own lamp.
        drawSolidTile(ctx, level, set, row, col, col * TILE - camX, row * TILE - camY);
        drawSecretSeam(ctx, level, set, row, col, camX, camY, playerX, playerY, now);
      } else if (level.crackCell(row, col)) {
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

// How close (px) the player must be before a false wall's seam is
// visible at all, and how close before it is at full strength. Deliberately
// short: a seam you can read from across the room is a marked door, and
// a secret you can see coming is not one.
const SEAM_FAR = 46;
const SEAM_NEAR = 16;

/**
 * The seam around a false wall. The block itself is already drawn as
 * ordinary rock; this traces the OUTLINE of the hidden patch (only the
 * edges where it meets real rock, so a 3x2 false wall reads as one
 * doorway rather than six bricks) and fades it in with the player's
 * proximity.
 *
 * This is the whole fairness argument for the mechanic. Hollow Knight's
 * breakable walls are found by swinging at everything, which works
 * because swinging is free and constant; here breaking a wall costs a
 * pound or a dash, and "dash at every wall in thirteen levels" is not a
 * game. So the wall tells you — but only from arm's length, and only
 * because you came over to look.
 */
function drawSecretSeam(
  ctx: CanvasRenderingContext2D,
  level: Level,
  set: TileSet,
  row: number,
  col: number,
  camX: number,
  camY: number,
  playerX: number,
  playerY: number,
  now: number,
): void {
  const cx = col * TILE + TILE / 2;
  const cy = row * TILE + TILE / 2;
  // DEV: the mod menu's "Revelar muros" lights every seam in the room
  // from anywhere in it. Pretending the player is standing ON the tile
  // is the whole cheat — zero distance clears the cutoff below, makes
  // `glow` 1 and turns the dust on too, so there is no second code path
  // to keep in sync with the honest one.
  const d = import.meta.env.DEV && debug.secrets
    ? 0
    : Math.hypot(playerX - cx, playerY - cy);
  if (d >= SEAM_FAR) return;
  const glow = d <= SEAM_NEAR ? 1 : 1 - (d - SEAM_NEAR) / (SEAM_FAR - SEAM_NEAR);
  const px = col * TILE - camX;
  const py = row * TILE - camY;
  ctx.save();
  ctx.globalAlpha = glow * 0.5;
  ctx.fillStyle = set.rimL;
  // Only the edges that face real rock: the joint between the false
  // wall and the wall it is pretending to be part of.
  const openUp = !level.secretCell(row - 1, col);
  if (openUp) ctx.fillRect(px, py, TILE, 1);
  if (!level.secretCell(row + 1, col)) ctx.fillRect(px, py + TILE - 1, TILE, 1);
  if (!level.secretCell(row, col - 1)) ctx.fillRect(px, py, 1, TILE);
  if (!level.secretCell(row, col + 1)) ctx.fillRect(px + TILE - 1, py, 1, TILE);

  // Dust SIFTING OUT of the joint. This is the part that actually gets
  // noticed: a static hairline reads as texture and the eye discards
  // it, but movement in a still wall does not get discarded. It only
  // happens along the top joint, because that is where dust would come
  // from, and only this close — running past, you see nothing.
  if (openUp && glow > 0.35) {
    ctx.globalAlpha = glow * 0.45;
    for (let i = 0; i < 3; i++) {
      const phase = (now * 0.5 + i * 0.37 + col * 0.11) % 1;
      const dx = 1 + ((col * 3 + i * 3) % (TILE - 2));
      ctx.fillRect(px + dx, py - Math.round(phase * 5), 1, 1);
    }
  }
  ctx.restore();
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
  drawFacedTile(ctx, set, (r, c) => level.solidCell(r, c), row, col, px, py);
}

/**
 * The rock face itself, auto-tiled against whatever `solid` says its
 * neighbours are. Split out from `drawSolidTile` so a VEIL can borrow
 * the exact same drawing while lying about the neighbourhood: inside a
 * veil every cell claims to be rock, so the patch comes out continuous
 * with the real wall instead of as a rectangle sitting on top of it.
 */
function drawFacedTile(
  ctx: CanvasRenderingContext2D,
  set: TileSet,
  solid: (row: number, col: number) => boolean,
  row: number,
  col: number,
  px: number,
  py: number,
): void {
  // Outside the map counts as solid (draws no border out there).
  const up = !solid(row - 1, col);
  const down = !solid(row + 1, col);
  const left = !solid(row, col - 1);
  const right = !solid(row, col + 1);

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

// ============================================================
//  VEILS — a passage wearing the wall's face
// ------------------------------------------------------------
//  A veil hides a hole by drawing the biome's OWN ROCK over it, with
//  the same auto-tiling as the wall around it, so the patch is
//  continuous with its neighbours and there is nothing to spot. Then
//  it fades out as you walk into it, on the same distance rule the
//  foreground occluders use.
//
//  It shipped first as a near-black rectangle with a ragged hem — a
//  "curtain". That is exactly wrong: on a lit stone wall a black box
//  is the single most conspicuous thing you can draw, so the veil
//  announced every secret it was supposed to hide. Camouflage is not
//  a dark shape, it is the SAME shape as everything else.
//
//  This lives here rather than in foreground.ts because hiding
//  something behind rock means drawing rock, and `drawSolidTile` is
//  here. It is still a foreground pass: drawWorld calls it after the
//  player, with the occluders.
// ============================================================

import { playerFade } from './occlusion';

export function drawVeils(
  ctx: CanvasRenderingContext2D,
  level: Level,
  veils: readonly { x: number; y: number; w: number; h: number }[],
  camX: number,
  camY: number,
  levelId: string,
  playerX: number,
  playerY: number,
): void {
  if (veils.length === 0) return;
  const set = tileSetFor(levelId);
  ctx.save();
  for (const v of veils) {
    const c0 = Math.floor(v.x / TILE);
    const c1 = Math.floor((v.x + v.w - 1) / TILE);
    const r0 = Math.floor(v.y / TILE);
    const r1 = Math.floor((v.y + v.h - 1) / TILE);
    // The whole patch fades together — cell by cell it would tear open
    // in a ragged line and read as a glitch.
    const fade = playerFade(v.x, v.x + v.w, v.y, v.y + v.h, playerX, playerY);
    if (fade <= 0) continue;
    ctx.globalAlpha = fade;
    // A cell inside the veil counts as rock for the auto-tiling, so the
    // patch has no internal edges and its outer edges meet the real
    // wall exactly the way one rock tile meets another.
    const solid = (row: number, col: number): boolean =>
      (row >= r0 && row <= r1 && col >= c0 && col <= c1) || level.solidCell(row, col);
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        drawFacedTile(ctx, set, solid, row, col, col * TILE - camX, row * TILE - camY);
      }
    }
  }
  ctx.restore();
}
