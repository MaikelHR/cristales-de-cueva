// ============================================================
//  CONTACT SHADING (where the rock meets the air)
// ------------------------------------------------------------
//  The thin, hard-edged shading along every boundary between rock and
//  air: the shadow under a ledge, the lit face on one side of an
//  opening and the dim one on the other, a little bounced light off a
//  floor. It is the same top-left light the tiles are already drawn
//  with (levelTiles' rim-light), continued onto the air side of the
//  seam, so a ledge reads as a thing with a THICKNESS rather than a
//  shape stamped on a backdrop.
//
//  WHAT THIS FILE USED TO BE, AND WHY IT ISN'T. It shipped first as a
//  full BACK WALL: a textured plane at parallax 0.88 filling every air
//  cell, faded by distance-to-rock so tunnels closed in and halls
//  stayed open. On paper that is the right way to get depth out of a
//  2D room. In practice, at this resolution and this palette, a broad
//  semi-transparent fill over the parallax does not read as a wall
//  behind you — it reads as a SHADOW SMEARED around the platforms, and
//  it buried six carefully-built parallax layers to do it. Two rounds
//  of retuning made it dimmer without making it read any better,
//  because the problem was the idea and not the numbers.
//
//  So the fill is gone and only the seam survives, which was always
//  the part doing honest work: it is one to three pixels wide, it is
//  hard-edged, it sits exactly on geometry the player can see, and it
//  costs nothing. Depth in this game now comes from the layers that
//  actually move — the six parallax layers behind, the foreground
//  plane in front (foreground.ts), and the player's own light.
//
//  Colours are derived from the biome's own TileSet, so every level —
//  including ones added later — gets this for free without declaring
//  anything.
// ============================================================

import { TILE, type Level } from '../world/Level';
import { tileSetFor } from '../art/tileSets';
import { drawGlow } from '../art/glow';

/** Mixes two hex colours, returning a css rgb(). */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number): number => {
    const va = (pa >> shift) & 0xff;
    const vb = (pb >> shift) & 0xff;
    return Math.round(va + (vb - va) * t);
  };
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

interface Contact { under: string; faceLit: string; faceDim: string; bounce: string; }
const contacts = new Map<string, Contact>();

function contactFor(levelId: string): Contact {
  const cached = contacts.get(levelId);
  if (cached) return cached;
  const set = tileSetFor(levelId);
  const c: Contact = {
    under: mix(set.shadow, '#000000', 0.4),
    faceLit: mix(set.rimL, set.shadow, 0.55),
    faceDim: mix(set.rimR, set.shadow, 0.75),
    bounce: mix(set.rimL, set.shadow, 0.7),
  };
  contacts.set(levelId, c);
  return c;
}

/** How strongly the seam is drawn. Low: this is a hint of thickness,
 *  not a second set of tiles. */
const UNDER = 0.5;
const FACE = 0.42;
const BOUNCE = 0.18;

/**
 * Draws the seam. Goes AFTER the parallax background and BEFORE the
 * tiles: it lives on the air side of every boundary, and the tiles
 * then sit on top of it.
 */
export function drawBackWall(
  ctx: CanvasRenderingContext2D,
  level: Level,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  levelId = 'cavernas',
): void {
  const c = contactFor(levelId);
  // Same culling as the tile pass: only what the camera can see.
  const c0 = Math.max(0, Math.floor(camX / TILE));
  const c1 = Math.min(level.cols - 1, Math.floor((camX + viewW) / TILE));
  const r0 = Math.max(0, Math.floor(camY / TILE));
  const r1 = Math.min(level.rows - 1, Math.floor((camY + viewH) / TILE));

  ctx.save();
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      // Only AIR cells touching rock have a seam — one cell deep, which
      // is what keeps this a seam and not a wash.
      if (level.solidCell(row, col)) continue;
      const up = level.solidCell(row - 1, col);
      const down = level.solidCell(row + 1, col);
      const left = level.solidCell(row, col - 1);
      const right = level.solidCell(row, col + 1);
      if (!up && !down && !left && !right) continue;
      const px = col * TILE - camX;
      const py = row * TILE - camY;

      if (up) {
        // Under a ledge: the deepest shadow in the room, and the single
        // cue that does most of the work.
        ctx.globalAlpha = UNDER;
        ctx.fillStyle = c.under;
        ctx.fillRect(px, py, TILE, 2);
      }
      if (down) {
        ctx.globalAlpha = BOUNCE; // a little light off the floor
        ctx.fillStyle = c.bounce;
        ctx.fillRect(px, py + TILE - 1, TILE, 1);
      }
      // The light comes from the top-left, so the face on the LEFT of an
      // opening is the one that catches it.
      ctx.globalAlpha = FACE;
      if (left) {
        ctx.fillStyle = c.faceLit;
        ctx.fillRect(px, py, 1, TILE);
      }
      if (right) {
        ctx.fillStyle = c.faceDim;
        ctx.fillRect(px + TILE - 1, py, 1, TILE);
      }
    }
  }
  ctx.restore();
}

/**
 * The light the player casts on the room. It is what makes the space
 * move as you move through it, and it is also the only thing that ever
 * picks out a false wall's seam — so it is not decoration; see the
 * secret seam in levelTiles.
 */
export function drawPlayerLight(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string,
  time: number,
): void {
  // Two halos: a tight bright core and a wide, slow breath around it.
  drawGlow(ctx, cx, cy, 30, color, 0.1 + Math.sin(time * 1.7) * 0.015);
  drawGlow(ctx, cx, cy, 12, color, 0.14);
}
