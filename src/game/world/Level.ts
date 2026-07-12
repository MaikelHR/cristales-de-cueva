// ============================================================
//  THE LEVEL (the geometry of a room)
// ------------------------------------------------------------
//  Interprets RoomData's tile rows ('#' solid, '.' air, '-' one-way
//  plank, '^' spikes, '%' cracked block, '~' ice, '=' water) and
//  answers collision queries. Each cell is 8x8 px. Cracked blocks and
//  ice ARE solid; they also carry their own mark: the cracked one can
//  be broken (pound / charge) and ice is slippery underfoot. Water is
//  NOT solid — it's a body volume the player floats on and dives into
//  (the swim physics live in the Player); here it's just a marked cell.
//
//  This module is PURE LOGIC: it doesn't draw or touch the DOM, so it
//  can be tested in Node. The tile drawing lives in
//  render/levelTiles.ts.
// ============================================================

import type { Box } from '../../engine/canvas';

export const TILE = 8;

export class Level {
  readonly cols: number;
  readonly rows: number;
  readonly widthPx: number;
  readonly heightPx: number;

  private solid: boolean[][] = [];
  private oneWay: boolean[][] = [];
  private spike: boolean[][] = [];
  private crack: boolean[][] = [];
  private icy: boolean[][] = [];
  private wet: boolean[][] = [];

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
      this.icy[y] = [];
      this.wet[y] = [];
      for (let x = 0; x < this.cols; x++) {
        const ch = row[x];
        if (
          ch !== '#' && ch !== '.' && ch !== '-' &&
          ch !== '^' && ch !== '%' && ch !== '~' && ch !== '='
        ) {
          throw new Error(`Mapa inválido: carácter desconocido '${ch}' en (${x}, ${y})`);
        }
        // Water ('=') is deliberately absent here: it is NOT solid.
        this.solid[y][x] = ch === '#' || ch === '%' || ch === '~';
        this.oneWay[y][x] = ch === '-';
        this.spike[y][x] = ch === '^';
        this.crack[y][x] = ch === '%';
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
    this.solid[row][col] = false;
    return true;
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
