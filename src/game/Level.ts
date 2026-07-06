// ============================================================
//  EL NIVEL (una sala)
// ------------------------------------------------------------
//  El mapa es texto y vive en rooms/*.ts (un archivo por sala);
//  esta clase lo interpreta. Cada carácter es una celda de 8x8 px:
//    '#' = bloque sólido     '.' = aire
//    'o' = cristal           'P' = inicio del jugador
//    'D' = puerta (meta)      '-' = plataforma de un solo sentido
//    's' = slime   'b' = volador (murciélago)   'c' = cazador   'B' = jefe
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

/** Los tipos de enemigo, según el carácter del mapa. */
export type EnemyKind = 'slime' | 'flyer' | 'chaser' | 'boss';

const ENEMY_CHARS: Record<string, EnemyKind> = {
  s: 'slime',
  b: 'flyer',
  c: 'chaser',
  B: 'boss',
};

// Chars con significado estructural fijo (no son enemigos ni reliquias).
//   '#' sólido   '.' aire   '-' plataforma un-sentido
//   'o' cristal  'P' inicio 'D' puerta (meta)
const STRUCTURAL_CHARS = ['#', '.', '-', 'o', 'P', 'D'] as const;

/** Namespace ÚNICO de chars de mapa: cualquier char fuera de este set hace
 *  tirar Error en parse() (§8.6). Así un typo en un mapa dibujado a mano lo
 *  atrapa new World() (el smoke del harness), no el jugador con un piso que
 *  desaparece. Al sumar un char nuevo (hazard/agua/reliquia) hay que
 *  registrarlo en su tabla y quedará incluido acá automáticamente. */
const KNOWN_CHARS: ReadonlySet<string> = new Set<string>([
  ...STRUCTURAL_CHARS,
  ...Object.keys(ENEMY_CHARS),
  ...Object.keys(RELIC_CHARS),
]);

export class Level {
  readonly cols: number;
  readonly rows: number;
  readonly widthPx: number;
  readonly heightPx: number;

  private solid: boolean[][] = [];
  private oneWay: boolean[][] = [];
  readonly crystalCells: Spawn[] = [];
  readonly enemyCells: (Spawn & { kind: EnemyKind })[] = [];
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
        if (!KNOWN_CHARS.has(ch)) {
          throw new Error(`Char de mapa desconocido '${ch}' en fila ${row} col ${col}`);
        }
        this.solid[row][col] = ch === '#';
        this.oneWay[row][col] = ch === '-';
        const px = col * TILE;
        const py = row * TILE;
        if (ch === 'o') this.crystalCells.push({ x: px, y: py });
        else if (ENEMY_CHARS[ch]) this.enemyCells.push({ x: px, y: py, kind: ENEMY_CHARS[ch] });
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

  /** ¿Sólido? Fuera del mapa cuenta como sólido (no dibuja borde afuera). */
  private solidCell(row: number, col: number): boolean {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return true;
    return this.solid[row][col];
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
          this.drawSolidTile(ctx, row, col, col * TILE - camX, row * TILE - camY);
        } else if (this.oneWay[row][col]) {
          sprites.plank.draw(ctx, col * TILE - camX, row * TILE - camY);
        }
      }
    }
  }

  /** Dibuja un bloque sólido con auto-tiling: el relleno base más bordes
   *  biselados en las caras que dan al vacío. Luz desde arriba-izquierda:
   *  tope y lado izquierdo iluminados, derecha y base en sombra. */
  private drawSolidTile(
    ctx: CanvasRenderingContext2D,
    row: number,
    col: number,
    px: number,
    py: number,
  ): void {
    const up = !this.solidCell(row - 1, col);
    const down = !this.solidCell(row + 1, col);
    const left = !this.solidCell(row, col - 1);
    const right = !this.solidCell(row, col + 1);

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
}
