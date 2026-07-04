// ============================================================
//  EL NIVEL (una sala)
// ------------------------------------------------------------
//  El mapa es texto y vive en rooms/*.ts (un archivo por sala);
//  esta clase lo interpreta. Cada carácter es una celda de 8x8 px:
//    '#' = bloque sólido     '.' = aire
//    'o' = cristal           's' = slime (enemigo)
//    'P' = inicio del jugador 'D' = puerta (meta)
//    '-' = plataforma de un solo sentido (subís atravesándola)
//    'j' / 'k' / 'w' = reliquia de doble salto / dash / wall jump
//  Para diseñar niveles, editás ese texto. Así de directo.
// ============================================================

import type { Box } from '../engine/canvas';
import { sprites } from './art';

export const TILE = 8;

export interface Spawn {
  x: number;
  y: number;
}

/** Las habilidades que existen en el juego (banderas del jugador). */
export type AbilityName = 'doubleJump' | 'dash' | 'wallJump';

const RELIC_CHARS: Record<string, AbilityName> = {
  j: 'doubleJump',
  k: 'dash',
  w: 'wallJump',
};

export class Level {
  readonly cols: number;
  readonly rows: number;
  readonly widthPx: number;
  readonly heightPx: number;

  private solid: boolean[][] = [];
  private oneWay: boolean[][] = [];
  readonly crystalCells: Spawn[] = [];
  readonly slimeCells: Spawn[] = [];
  readonly relicCells: (Spawn & { ability: AbilityName })[] = [];
  playerSpawn: Spawn = { x: 0, y: 0 };
  doorBox: Box | null = null; // solo en la sala que tiene 'D'

  constructor(private readonly map: string[]) {
    this.rows = map.length;
    this.cols = map[0].length;
    map.forEach((row, i) => {
      if (row.length !== this.cols) {
        throw new Error(
          `Mapa inválido: la fila ${i} tiene ${row.length} caracteres y la fila 0 tiene ${this.cols}`,
        );
      }
    });
    this.widthPx = this.cols * TILE;
    this.heightPx = this.rows * TILE;
    this.parse();
  }

  private parse(): void {
    for (let row = 0; row < this.rows; row++) {
      this.solid[row] = [];
      this.oneWay[row] = [];
      for (let col = 0; col < this.cols; col++) {
        const ch = this.map[row][col];
        this.solid[row][col] = ch === '#';
        this.oneWay[row][col] = ch === '-';
        const px = col * TILE;
        const py = row * TILE;
        if (ch === 'o') this.crystalCells.push({ x: px, y: py });
        else if (ch === 's') this.slimeCells.push({ x: px, y: py });
        else if (RELIC_CHARS[ch]) this.relicCells.push({ x: px, y: py, ability: RELIC_CHARS[ch] });
        else if (ch === 'P') this.playerSpawn = { x: px, y: py };
        else if (ch === 'D') this.doorBox = { x: px, y: py + 2, w: TILE, h: TILE * 2 - 2 };
      }
    }
  }

  /** ¿Hay sólido en este píxel del mundo? */
  isSolidAt(px: number, py: number): boolean {
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return true;
    return this.solid[row][col];
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

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number, viewW: number, viewH: number): void {
    // Solo dibujamos los tiles visibles (culling) para que rinda bien.
    const c0 = Math.max(0, Math.floor(camX / TILE));
    const c1 = Math.min(this.cols - 1, Math.floor((camX + viewW) / TILE));
    const r0 = Math.max(0, Math.floor(camY / TILE));
    const r1 = Math.min(this.rows - 1, Math.floor((camY + viewH) / TILE));

    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        if (this.solid[row][col]) {
          const exposedTop = row > 0 && !this.solid[row - 1][col];
          // Variantes de bloque elegidas por posición (siempre la misma
          // para la misma celda): rompen la repetición sin aleatoriedad.
          const v = (col * 7 + row * 13) % 9;
          const sprite = exposedTop
            ? sprites.tileTop
            : v === 3
              ? sprites.tileFill2
              : v === 7
                ? sprites.tileFill3
                : sprites.tileFill;
          sprite.draw(ctx, col * TILE - camX, row * TILE - camY);
        } else if (this.oneWay[row][col]) {
          sprites.plank.draw(ctx, col * TILE - camX, row * TILE - camY);
        }
      }
    }
  }
}
