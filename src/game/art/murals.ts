// ============================================================
//  MURALS — the story with no words in it
// ------------------------------------------------------------
//  Painted on the BACK WALL (render/backWall.ts's plane), behind the
//  play plane, so they read as something the room HAS rather than
//  something placed in it. You cannot touch one, collect one, or be
//  hurt by one; you walk past and it is there.
//
//  A mural carries what an inscription cannot, which is SCALE — how
//  many of them there were, how big the door is, what the Custodio
//  was before it was a boss fight. Words can tell you a hundred
//  people climbed; only a picture can show you the line of them.
//
//  Drawn as flat silhouettes in the biome's own back-wall tones, at
//  one alpha, with no outline: at 8px a tile, any attempt at
//  modelling turns to mud. They are figures on a wall, and figures on
//  a wall is exactly what a mural is.
// ============================================================

import { TILE } from '../world/Level';
import { tileSetFor } from '../art/tileSets';
import type { MuralName } from '../lore';
import { drawGlow } from './glow';

/** Grids are drawn at 3px per cell, so a 20x12 grid is 60x36px on a
 *  320x176 view — about a sixth of the screen.
 *
 *  It was 2px and the figures were unreadable: at that size a person is
 *  five pixels tall and every mural read as a smear of speckle, which is
 *  worse than no mural at all. If a picture on the wall cannot be told
 *  from noise it is noise. */
const PX = 3;

/** '#' paints, '.' is the wall showing through, '+' is the accent
 *  (the light the makers were climbing toward — the one colour a
 *  mural is allowed besides its own shadow). */
const GRIDS: Record<MuralName, string[]> = {
  // A LINE OF PEOPLE all facing the same way, with a light carried
  // above them. It says: there were many of us, and we were going
  // somewhere together, and we were going UP.
  procesion: [
    '....................',
    '.........+..........',
    '........+++.........',
    '.........+..........',
    '.........#..........',
    '.#...#...#...#...#..',
    '###.###.###.###.###.',
    '###.###.###.###.###.',
    '.#...#...#...#...#..',
    '.#...#...#...#...#..',
    '#.#.#.#.#.#.#.#.#.#.',
    '....................',
  ],
  // THE DOOR, seen from its foot, with one figure at the bottom for
  // scale. It says: this is not a door in a wall. It is the size of
  // the wall, and somebody built it that way on purpose.
  puerta: [
    '####################',
    '#..................#',
    '#.################.#',
    '#.#..............#.#',
    '#.#....++++++....#.#',
    '#.#...++++++++...#.#',
    '#.#...++++++++...#.#',
    '#.#....++++++....#.#',
    '#.#..............#.#',
    '#.################.#',
    '#..................#',
    '####.....###....####',
  ],
  // THE WARDEN BEING MADE: a shape on a slab, two figures bent over it.
  // It says the Custodio did not come from anywhere. It was cast, by
  // hands, on a table, by people who are also in the other murals.
  custodio: [
    '....................',
    '....#..........#....',
    '...###........###...',
    '...###........###...',
    '....#.#......#.#....',
    '....................',
    '...++++++++++++++...',
    '..################..',
    '..################..',
    '....##........##....',
    '....##........##....',
    '....................',
  ],
  // THE CLIMB THAT FAILED: a line going up, figures on it, and a gap
  // where the line stops — with one shape falling away from it. The
  // only mural that says what happened, and it says it with the gap.
  caida: [
    '.........##.........',
    '.........##.........',
    '........####........',
    '.........##.........',
    '.........##.........',
    '.........##.........',
    '....###..##.........',
    '.........##.........',
    '....................',
    '....................',
    '..##................',
    '.####...............',
  ],
};

/** Mixes two hex colours into a css rgb(). */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number): number =>
    Math.round(((pa >> s) & 0xff) + ((((pb >> s) & 0xff) - ((pa >> s) & 0xff)) * t));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/** The width and height a mural occupies, in tiles — so a room can be
 *  laid out around one without opening this file. */
export function muralSize(art: MuralName): { w: number; h: number } {
  const g = GRIDS[art];
  return { w: Math.ceil((g[0].length * PX) / TILE), h: Math.ceil((g.length * PX) / TILE) };
}

export function drawMurals(
  ctx: CanvasRenderingContext2D,
  murals: readonly { art: MuralName; x: number; y: number }[],
  camX: number,
  camY: number,
  levelId: string,
  time: number,
): void {
  if (murals.length === 0) return;
  const set = tileSetFor(levelId);
  // A shade lighter than the wall it is painted on — pigment, not
  // another recess — and the accent is the biome's own rim light.
  const paint = mix(set.rimR, set.shadow, 0.3);
  const accent = set.rimL;

  ctx.save();
  for (const m of murals) {
    const g = GRIDS[m.art];
    const ox = Math.round(m.x - camX);
    const oy = Math.round(m.y - camY);
    if (ox + g[0].length * PX < 0 || ox > ctx.canvas.width) continue;
    // Murals sit on the back wall, so they are dimmer than anything in
    // the play plane and they do not compete with it.
    ctx.globalAlpha = 0.62;
    for (let r = 0; r < g.length; r++) {
      for (let c = 0; c < g[r].length; c++) {
        const ch = g[r][c];
        if (ch === '.') continue;
        ctx.fillStyle = ch === '+' ? accent : paint;
        ctx.fillRect(ox + c * PX, oy + r * PX, PX, PX);
      }
    }
    // The accent breathes very slightly, so a mural is not quite dead.
    ctx.globalAlpha = 1;
    drawGlow(
      ctx,
      ox + (g[0].length * PX) / 2, oy + (g.length * PX) / 2,
      18, accent, 0.05 + Math.sin(time * 0.9 + m.x) * 0.02,
    );
  }
  ctx.restore();
}
