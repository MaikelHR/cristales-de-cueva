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
import { sprites, biomeOf, tilesFor, type TileSet, type Biome } from './art';

export const TILE = 8;

export interface Spawn {
  x: number;
  y: number;
}

/** Las habilidades que existen en el juego (banderas del jugador). */
export type AbilityName = 'doubleJump' | 'dash' | 'wallJump' | 'glide';

const RELIC_CHARS: Record<string, AbilityName> = {
  j: 'doubleJump',
  k: 'dash',
  w: 'wallJump',
  g: 'glide',
};

/** Los tipos de enemigo, según el carácter del mapa. */
export type EnemyKind = 'slime' | 'flyer' | 'chaser' | 'boss' | 'spore' | 'fundidor';

const ENEMY_CHARS: Record<string, EnemyKind> = {
  s: 'slime',
  b: 'flyer',
  c: 'chaser',
  B: 'boss',
  e: 'spore', // espora que se hincha y explota
  F: 'fundidor', // jefe: cargador de las Forjas
};

// Chars con significado estructural fijo (no son enemigos ni reliquias).
//   '#' sólido   '.' aire   '-' plataforma un-sentido
//   'o' cristal  'P' inicio 'D' puerta (meta)
const STRUCTURAL_CHARS = ['#', '.', '-', 'o', 'P', 'D'] as const;

/** Hazards estáticos: tiles que dañan al tocarlos (NO son sólidos: no se
 *  colisiona contra ellos, solo lastiman). 'x' púas, 'L' lava. */
export const HAZARD = { NONE: 0, SPIKE: 1, LAVA: 2 } as const;
const HAZARD_CHARS: Record<string, number> = { x: HAZARD.SPIKE, L: HAZARD.LAVA };

/** Corrientes de viento: zonas que empujan al jugador (no sólidas, no dañan).
 *  '^' corriente ascendente. Con PLANEO, te elevan; sin él, solo frenan la
 *  caída un poco. Las lee el Player. */
const WIND_CHARS: Record<string, boolean> = { '^': true };

/** GATES: chars-tile que bloquean el paso hasta tener la habilidad que los
 *  abre (pared rajada -> breakDash, agua profunda -> gill, viento -> glide).
 *  Lo lee el fixpoint del harness (§4.5) para verificar completitud: un char
 *  de gate en un mapa exige que su habilidad se haya conseguido antes de
 *  cruzarlo. Vacío por ahora; se llena al crear cada gate en P2. */
export const GATE_ABILITY: Record<string, AbilityName> = {};

/** Namespace ÚNICO de chars de mapa: cualquier char fuera de este set hace
 *  tirar Error en parse() (§8.6). Así un typo en un mapa dibujado a mano lo
 *  atrapa new World() (el smoke del harness), no el jugador con un piso que
 *  desaparece. Al sumar un char nuevo (hazard/agua/reliquia/gate) hay que
 *  registrarlo en su tabla y quedará incluido acá automáticamente. */
const KNOWN_CHARS: ReadonlySet<string> = new Set<string>([
  ...STRUCTURAL_CHARS,
  ...Object.keys(ENEMY_CHARS),
  ...Object.keys(RELIC_CHARS),
  ...Object.keys(GATE_ABILITY),
  ...Object.keys(HAZARD_CHARS),
  ...Object.keys(WIND_CHARS),
]);

export class Level {
  readonly cols: number;
  readonly rows: number;
  readonly widthPx: number;
  readonly heightPx: number;

  private solid: boolean[][] = [];
  private oneWay: boolean[][] = [];
  private hazard: number[][] = []; // 0 nada, 1 púas, 2 lava (ver HAZARD)
  private wind: boolean[][] = [];  // corriente ascendente ('^')
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
      this.hazard[row] = [];
      this.wind[row] = [];
      for (let col = 0; col < this.cols; col++) {
        const ch = this.map[row][col];
        if (!KNOWN_CHARS.has(ch)) {
          throw new Error(`Char de mapa desconocido '${ch}' en fila ${row} col ${col}`);
        }
        this.solid[row][col] = ch === '#';
        this.oneWay[row][col] = ch === '-';
        this.hazard[row][col] = HAZARD_CHARS[ch] ?? HAZARD.NONE;
        this.wind[row][col] = !!WIND_CHARS[ch];
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

  /** ¿Hay corriente de viento ascendente en este píxel? (fuera del mapa: no). */
  isWindAt(px: number, py: number): boolean {
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
    return this.wind[row][col];
  }

  /** Devuelve las cajas de los tiles sólidos que tocan una caja dada. */
  solidTilesIn(box: Box): Box[] {
    return this.tilesIn(box, this.solid);
  }

  /** Ídem, pero con las plataformas de un solo sentido. */
  oneWayTilesIn(box: Box): Box[] {
    return this.tilesIn(box, this.oneWay);
  }

  /** Cajas de los tiles-hazard que tocan una caja dada. Las púas se achican un
   *  poco (dañan cerca de la punta, no al rozar el borde del tile) para no
   *  matar de forma injusta; la lava ocupa el tile entero. */
  hazardTilesIn(box: Box): Box[] {
    const result: Box[] = [];
    const c0 = Math.max(0, Math.floor(box.x / TILE));
    const c1 = Math.min(this.cols - 1, Math.floor((box.x + box.w) / TILE));
    const r0 = Math.max(0, Math.floor(box.y / TILE));
    const r1 = Math.min(this.rows - 1, Math.floor((box.y + box.h) / TILE));
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const kind = this.hazard[row][col];
        if (kind === HAZARD.NONE) continue;
        if (kind === HAZARD.SPIKE) {
          // Zona letal: la mitad inferior del tile (donde están las puntas).
          result.push({ x: col * TILE + 1, y: row * TILE + 3, w: TILE - 2, h: TILE - 3 });
        } else {
          result.push({ x: col * TILE, y: row * TILE + 1, w: TILE, h: TILE - 1 });
        }
      }
    }
    return result;
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

  draw(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    viewW: number,
    viewH: number,
    biomeName?: string,
    time = 0,
  ): void {
    const tiles = tilesFor(biomeName);
    const biome = biomeOf(biomeName);
    // Solo dibujamos los tiles visibles (culling) para que rinda bien.
    const c0 = Math.max(0, Math.floor(camX / TILE));
    const c1 = Math.min(this.cols - 1, Math.floor((camX + viewW) / TILE));
    const r0 = Math.max(0, Math.floor(camY / TILE));
    const r1 = Math.min(this.rows - 1, Math.floor((camY + viewH) / TILE));

    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const px = col * TILE - camX;
        const py = row * TILE - camY;
        if (this.solid[row][col]) {
          this.drawSolidTile(ctx, row, col, px, py, tiles, biome);
        } else if (this.oneWay[row][col]) {
          tiles.plank.draw(ctx, px, py);
        } else if (this.hazard[row][col] === HAZARD.SPIKE) {
          sprites.spike.draw(ctx, px, py);
        } else if (this.hazard[row][col] === HAZARD.LAVA) {
          // Lava: dos frames que "hierven" con un desfase por columna.
          const boil = Math.floor(time * 4 + col * 0.7) % 2 === 0;
          (boil ? sprites.lava1 : sprites.lava2).draw(ctx, px, py);
        } else if (this.wind[row][col]) {
          this.drawWindCell(ctx, px, py, col, row, time);
        }
      }
    }
  }

  /** Corriente de viento: rayitas verticales claras que suben, con desfase por
   *  celda para dar sensación de flujo ascendente. Sumadas con 'lighter'. */
  private drawWindCell(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    col: number,
    row: number,
    time: number,
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#c8ffe0';
    for (let k = 0; k < 2; k++) {
      const seed = col * 3 + row * 7 + k * 11;
      const sx = px + 2 + ((seed * 5) % (TILE - 3));
      // La raya sube y da la vuelta dentro del tile (mod).
      const sy = py + (TILE - ((time * 26 + seed * 4) % TILE));
      ctx.fillRect(Math.round(sx), Math.round(sy), 1, 3);
    }
    ctx.restore();
  }

  /** Dibuja un bloque sólido con auto-tiling: el relleno base más bordes
   *  biselados en las caras que dan al vacío. Luz desde arriba-izquierda:
   *  tope y lado izquierdo iluminados, derecha y base en sombra. Los tiles
   *  y los rim-lights vienen del bioma (identidad visual por región). */
  private drawSolidTile(
    ctx: CanvasRenderingContext2D,
    row: number,
    col: number,
    px: number,
    py: number,
    tiles: TileSet,
    biome: Biome,
  ): void {
    const up = !this.solidCell(row - 1, col);
    const down = !this.solidCell(row + 1, col);
    const left = !this.solidCell(row, col - 1);
    const right = !this.solidCell(row, col + 1);

    // Base: tope tallado si mira al vacío arriba; si no, relleno con variante.
    if (up) {
      tiles.top.draw(ctx, px, py);
    } else {
      const v = (col * 7 + row * 13) % 9;
      const fill = v === 3 ? tiles.fill2 : v === 7 ? tiles.fill3 : tiles.fill;
      fill.draw(ctx, px, py);
    }

    // Rim-light: las caras expuestas llevan un borde iluminado que las
    // hace resaltar contra la cueva oscura (izquierda más brillante que
    // la derecha por la luz de arriba-izquierda). La base queda en sombra.
    const RIM_L = biome.rimL;
    const RIM_R = biome.rimR;
    const SHADOW = biome.shadow;
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
