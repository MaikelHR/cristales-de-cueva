// ============================================================
//  THE LEVEL (the geometry of a room)
// ------------------------------------------------------------
//  Interprets RoomData's tile rows ('#' solid, '.' air, '-' one-way
//  plank, '^' spikes, '%' cracked block, '*' FALSE WALL, '~' ice,
//  '=' water) and answers collision queries. Each cell is 8x8 px.
//  Cracked blocks, false walls and ice ARE solid; they also carry
//  their own mark: the cracked one can be broken (pound / charge),
//  ice is slippery underfoot. Water is NOT solid — it's a body volume
//  the player floats on and dives into (the swim physics live in the
//  Player); here it's just a marked cell.
//
//  A FALSE WALL is a cracked block wearing ordinary rock's face: it
//  breaks by exactly the same rule (so nothing in the Player had to
//  learn a new verb), but the renderer must never give it the '%'
//  fissure — the whole point is that it looks like the wall next to
//  it. `secretCell` is what tells the two apart.
//
//  It also answers HOW DEEP a cell sits inside the room's hollow
//  (`depthCell`): 0 on rock, 1 for the air touching it, growing
//  toward the middle of a chamber. Nothing in the physics reads it —
//  it exists so the renderer can shade a back wall that recedes, and
//  it lives here because it is a pure fact about the geometry.
//
//  This module is PURE LOGIC: it doesn't draw or touch the DOM, so it
//  can be tested in Node. The tile drawing lives in
//  render/levelTiles.ts.
// ============================================================

import type { Box } from '../../engine/canvas';

export const TILE = 8;

/** Deepest reading `depthCell` reports. Past this the back wall has
 *  already faded out entirely, so measuring further buys nothing. */
export const DEPTH_MAX = 7;

export class Level {
  readonly cols: number;
  readonly rows: number;
  readonly widthPx: number;
  readonly heightPx: number;

  private solid: boolean[][] = [];
  private oneWay: boolean[][] = [];
  private spike: boolean[][] = [];
  private crack: boolean[][] = [];
  private secret: boolean[][] = [];
  private icy: boolean[][] = [];
  private wet: boolean[][] = [];
  /** Distance-to-rock field, built on first use and thrown away
   *  whenever the rock changes (see breakCrack). */
  private depth: number[][] | null = null;

  constructor(tiles: string[]) {
    this.rows = tiles.length;
    this.cols = tiles[0].length;
    this.widthPx = this.cols * TILE;
    this.heightPx = this.rows * TILE;

    tiles.forEach((row, y) => {
      if (row.length !== this.cols) {
        throw new Error(
          `Mapa inválido: la fila ${y} tiene ${row.length} caracteres y la fila 0 tiene ${this.cols}`,
        );
      }
      this.solid[y] = [];
      this.oneWay[y] = [];
      this.spike[y] = [];
      this.crack[y] = [];
      this.secret[y] = [];
      this.icy[y] = [];
      this.wet[y] = [];
      for (let x = 0; x < this.cols; x++) {
        const ch = row[x];
        if (
          ch !== '#' && ch !== '.' && ch !== '-' && ch !== '^' &&
          ch !== '%' && ch !== '*' && ch !== '~' && ch !== '='
        ) {
          throw new Error(`Mapa inválido: carácter desconocido '${ch}' en (${x}, ${y})`);
        }
        // Water ('=') is deliberately absent here: it is NOT solid.
        this.solid[y][x] = ch === '#' || ch === '%' || ch === '*' || ch === '~';
        this.oneWay[y][x] = ch === '-';
        this.spike[y][x] = ch === '^';
        // A false wall IS a cracked block as far as every rule goes —
        // it just doesn't wear the fissure.
        this.crack[y][x] = ch === '%' || ch === '*';
        this.secret[y][x] = ch === '*';
        this.icy[y][x] = ch === '~';
        this.wet[y][x] = ch === '=';
      }
    });
  }

  /** Is there solid at this world pixel? */
  isSolidAt(px: number, py: number): boolean {
    return this.solidCell(Math.floor(py / TILE), Math.floor(px / TILE));
  }

  /** Solid at this cell? Outside the map counts as solid. */
  solidCell(row: number, col: number): boolean {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return true;
    return this.solid[row][col];
  }

  /** One-way plank at this cell? Outside the map, no. */
  oneWayCell(row: number, col: number): boolean {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
    return this.oneWay[row][col];
  }

  /** Spikes at this cell? Outside the map, no. */
  spikeCell(row: number, col: number): boolean {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
    return this.spike[row][col];
  }

  /** Cracked (breakable) block at this cell? Outside the map, no. */
  crackCell(row: number, col: number): boolean {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
    return this.crack[row][col];
  }

  /** A FALSE WALL at this cell? (a breakable block disguised as plain
   *  rock). Only the renderer cares: everything else already sees it
   *  as the cracked block it is. Outside the map, no. */
  secretCell(row: number, col: number): boolean {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
    return this.secret[row][col];
  }

  /** Ice (slippery solid) at this cell? Outside the map, no. */
  icyCell(row: number, col: number): boolean {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
    return this.icy[row][col];
  }

  /** Water (non-solid body volume) at this cell? Outside the map, no. */
  wetCell(row: number, col: number): boolean {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
    return this.wet[row][col];
  }

  /**
   * Breaks a cracked block: the cell becomes air. Returns true if there
   * was something to break. The state lives in THIS instance (one per
   * room per run): on restarting the level, the blocks come back.
   */
  breakCrack(row: number, col: number): boolean {
    if (!this.crackCell(row, col)) return false;
    this.crack[row][col] = false;
    this.secret[row][col] = false;
    this.solid[row][col] = false;
    // The hollow just got bigger: the back wall has to be re-measured,
    // or the hole you opened keeps the shading of the rock that was
    // there — the one visible seam that would give a secret away
    // AFTER it stopped being one.
    this.depth = null;
    return true;
  }

  /**
   * How deep inside the room's hollow this cell sits, in CELLS and with
   * a fraction: 0 on rock, 1 for air that touches rock, rising toward
   * the middle of a chamber and capped at DEPTH_MAX. Outside the map
   * reads as rock, same as `solidCell` — so a room's edges are a wall,
   * which is what the renderer wants to shade against.
   *
   * Nothing in the physics uses this. It's the back wall's field: the
   * shading that makes a corridor look carved OUT of the rock instead
   * of painted on it.
   */
  depthCell(row: number, col: number): number {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return 0;
    return (this.depth ??= this.buildDepth())[row][col];
  }

  /**
   * Distance to the nearest solid, by the standard two-pass chamfer:
   * one sweep down-right carrying the best answer from the cells
   * already visited, one sweep back up-left. O(cells), which is why it
   * can be thrown away and rebuilt whenever a block breaks.
   *
   * The step weights are 3 orthogonally and 4 diagonally, divided back
   * down by 3 — the classic cheap stand-in for real Euclidean distance,
   * within a couple of percent of it. The obvious alternative, counting
   * a diagonal as one step (Chebyshev), is a whole line shorter and was
   * what shipped first: it makes distance-from-the-wall identical all
   * the way around a rectangular room, so the back wall drawn from it
   * came out as a set of perfectly concentric RECTANGLES. It read as
   * exactly what it was — a computed field — rather than as rock.
   */
  private buildDepth(): number[][] {
    const CAP = DEPTH_MAX * 3;
    const d: number[][] = [];
    for (let row = 0; row < this.rows; row++) {
      d[row] = [];
      for (let col = 0; col < this.cols; col++) {
        d[row][col] = this.solid[row][col] ? 0 : CAP;
      }
    }
    // Out of bounds is rock, so a cell on the map's edge is already one
    // step from a wall whatever its neighbours say.
    const at = (row: number, col: number): number =>
      row < 0 || row >= this.rows || col < 0 || col >= this.cols ? 0 : d[row][col];

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (d[row][col] === 0) continue;
        d[row][col] = Math.min(
          d[row][col],
          at(row - 1, col - 1) + 4, at(row - 1, col) + 3,
          at(row - 1, col + 1) + 4, at(row, col - 1) + 3,
        );
      }
    }
    for (let row = this.rows - 1; row >= 0; row--) {
      for (let col = this.cols - 1; col >= 0; col--) {
        if (d[row][col] === 0) continue;
        d[row][col] = Math.min(
          d[row][col],
          at(row + 1, col + 1) + 4, at(row + 1, col) + 3,
          at(row + 1, col - 1) + 4, at(row, col + 1) + 3,
        );
      }
    }
    // Back into cells, capped.
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        d[row][col] = Math.min(DEPTH_MAX, d[row][col] / 3);
      }
    }
    return d;
  }

  /**
   * Floods or drains a cell. The water clock's tide moves its surface at
   * runtime, and since the water grid is read LIVE by both the physics
   * (touchesWater, waterSurfaceY) and the tile renderer, moving it here
   * moves everything — floating, diving, the animated waterline —
   * without another line of code anywhere else.
   * Rock is never flooded: a tank's own walls stay dry.
   */
  setWet(row: number, col: number, on: boolean): void {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
    if (on && this.solid[row][col]) return;
    this.wet[row][col] = on;
  }

  /**
   * The water's surface in this column, in world px, or null if the column
   * is dry. Anything that RIDES the waterline (the skater) asks for it
   * every frame, because with the tide the answer changes constantly.
   */
  waterSurfaceAt(px: number): number | null {
    const col = Math.floor(px / TILE);
    if (col < 0 || col >= this.cols) return null;
    for (let row = 0; row < this.rows; row++) {
      if (this.wet[row][col]) return row * TILE;
    }
    return null;
  }

  /**
   * Does the box touch any spike? Each spike's hurt box is smaller
   * than its cell (the bottom half, with 1px margin on the sides):
   * grazing the cell's edge doesn't punish, stepping on it does.
   */
  touchesSpike(box: Box): boolean {
    const c0 = Math.max(0, Math.floor(box.x / TILE));
    const c1 = Math.min(this.cols - 1, Math.floor((box.x + box.w) / TILE));
    const r0 = Math.max(0, Math.floor(box.y / TILE));
    const r1 = Math.min(this.rows - 1, Math.floor((box.y + box.h) / TILE));
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        if (!this.spike[row][col]) continue;
        const hx = col * TILE + 1;
        const hy = row * TILE + 4;
        if (box.x < hx + TILE - 2 && box.x + box.w > hx && box.y < hy + 4 && box.y + box.h > hy) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Does the box overlap any water cell? Water fills its whole cell
   * (no sub-box like the spikes), so any cell the box spans is enough.
   * The Player uses it to decide it's swimming.
   */
  touchesWater(box: Box): boolean {
    const c0 = Math.max(0, Math.floor(box.x / TILE));
    const c1 = Math.min(this.cols - 1, Math.floor((box.x + box.w) / TILE));
    const r0 = Math.max(0, Math.floor(box.y / TILE));
    const r1 = Math.min(this.rows - 1, Math.floor((box.y + box.h) / TILE));
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        if (this.wet[row][col]) return true;
      }
    }
    return false;
  }

  /** Returns the boxes of the solid tiles that touch a given box. */
  solidTilesIn(box: Box): Box[] {
    return this.tilesIn(box, this.solid);
  }

  /** Same, but with the one-way platforms. */
  oneWayTilesIn(box: Box): Box[] {
    return this.tilesIn(box, this.oneWay);
  }

  private tilesIn(box: Box, grid: boolean[][]): Box[] {
    const result: Box[] = [];
    const c0 = Math.max(0, Math.floor(box.x / TILE));
    const c1 = Math.min(this.cols - 1, Math.floor((box.x + box.w) / TILE));
    const r0 = Math.max(0, Math.floor(box.y / TILE));
    const r1 = Math.min(this.rows - 1, Math.floor((box.y + box.h) / TILE));
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        if (grid[row][col]) {
          result.push({ x: col * TILE, y: row * TILE, w: TILE, h: TILE });
        }
      }
    }
    return result;
  }
}
