// ============================================================
//  EL NIVEL (la geometría de una sala)
// ------------------------------------------------------------
//  Interpreta las filas de tiles de RoomData ('#' sólido, '.' aire,
//  '-' tablón de un sentido, '^' púas) y responde consultas de
//  colisión. Cada celda mide 8x8 px.
//
//  Este módulo es LÓGICA PURA: no dibuja ni toca el DOM, así que
//  se puede testear en Node. El dibujo de los tiles vive en
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
      for (let x = 0; x < this.cols; x++) {
        const ch = row[x];
        if (ch !== '#' && ch !== '.' && ch !== '-' && ch !== '^') {
          throw new Error(`Mapa inválido: carácter desconocido '${ch}' en (${x}, ${y})`);
        }
        this.solid[y][x] = ch === '#';
        this.oneWay[y][x] = ch === '-';
        this.spike[y][x] = ch === '^';
      }
    });
  }

  /** ¿Hay sólido en este píxel del mundo? */
  isSolidAt(px: number, py: number): boolean {
    return this.solidCell(Math.floor(py / TILE), Math.floor(px / TILE));
  }

  /** ¿Sólido en esta celda? Fuera del mapa cuenta como sólido. */
  solidCell(row: number, col: number): boolean {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return true;
    return this.solid[row][col];
  }

  /** ¿Tablón de un solo sentido en esta celda? Fuera del mapa, no. */
  oneWayCell(row: number, col: number): boolean {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
    return this.oneWay[row][col];
  }

  /** ¿Púas en esta celda? Fuera del mapa, no. */
  spikeCell(row: number, col: number): boolean {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
    return this.spike[row][col];
  }

  /**
   * ¿La caja toca alguna púa? La caja de daño de cada púa es más
   * chica que su celda (la mitad de abajo, con 1px de margen a los
   * lados): rozar el borde de la celda no castiga, pisarla sí.
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

  /** Devuelve las cajas de los tiles sólidos que tocan una caja dada. */
  solidTilesIn(box: Box): Box[] {
    return this.tilesIn(box, this.solid);
  }

  /** Ídem, pero con las plataformas de un solo sentido. */
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
