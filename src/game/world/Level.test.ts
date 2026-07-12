import { describe, expect, it } from 'vitest';
import { Level, TILE } from './Level';

// A small test map: closed box with a plank inside.
const TILES = [
  '#####',
  '#...#',
  '#.-.#',
  '#...#',
  '#####',
];

describe('Level', () => {
  it('mide el mapa en celdas y píxeles', () => {
    const level = new Level(TILES);
    expect(level.cols).toBe(5);
    expect(level.rows).toBe(5);
    expect(level.widthPx).toBe(5 * TILE);
    expect(level.heightPx).toBe(5 * TILE);
  });

  it('rechaza filas de largos distintos', () => {
    expect(() => new Level(['###', '##'])).toThrow(/fila 1/);
  });

  it('rechaza caracteres desconocidos (entidades que quedaron en el mapa)', () => {
    expect(() => new Level(['#s#'])).toThrow(/'s'/);
  });

  it('consulta sólidos por píxel, y fuera del mapa cuenta como sólido', () => {
    const level = new Level(TILES);
    expect(level.isSolidAt(1, 1)).toBe(true);    // edge
    expect(level.isSolidAt(12, 12)).toBe(false); // interior
    expect(level.isSolidAt(-5, 12)).toBe(true);  // outside the map
    expect(level.isSolidAt(12, 999)).toBe(true); // outside the map
  });

  it('los tablones no son sólidos: van por su propia grilla', () => {
    const level = new Level(TILES);
    expect(level.isSolidAt(2 * TILE + 1, 2 * TILE + 1)).toBe(false);
    expect(level.oneWayCell(2, 2)).toBe(true);
    expect(level.oneWayCell(0, 0)).toBe(false);  // '#' is not a plank
    expect(level.oneWayCell(-1, 2)).toBe(false); // outside the map
  });

  it('devuelve los tiles sólidos que tocan una caja', () => {
    const level = new Level(TILES);
    // Box hugging the top-left corner of the interior:
    // touches the top wall and the left one.
    const boxes = level.solidTilesIn({ x: 6, y: 6, w: 4, h: 4 });
    expect(boxes).toContainEqual({ x: 0, y: 0, w: TILE, h: TILE });
    expect(boxes).toContainEqual({ x: 0, y: TILE, w: TILE, h: TILE });
    expect(boxes).toContainEqual({ x: TILE, y: 0, w: TILE, h: TILE });
    // Box in the middle of the air: nothing.
    expect(level.solidTilesIn({ x: 9, y: 9, w: 2, h: 2 })).toEqual([]);
  });

  it('oneWayTilesIn encuentra el tablón', () => {
    const level = new Level(TILES);
    const boxes = level.oneWayTilesIn({ x: 2 * TILE, y: 2 * TILE, w: 4, h: 4 });
    expect(boxes).toEqual([{ x: 2 * TILE, y: 2 * TILE, w: TILE, h: TILE }]);
  });

  it('las púas no son sólidas y tienen su propia grilla', () => {
    const level = new Level(['#####', '#.^.#', '#####']);
    expect(level.isSolidAt(2 * TILE + 1, TILE + 1)).toBe(false);
    expect(level.spikeCell(1, 2)).toBe(true);
    expect(level.spikeCell(1, 1)).toBe(false);
    expect(level.spikeCell(-1, 2)).toBe(false); // outside the map
  });

  it('touchesSpike castiga pisar la púa pero perdona rozar la celda', () => {
    const level = new Level(['#####', '#.^.#', '#####']);
    // Feet inside the bottom half of the spike cell: it stabs.
    expect(level.touchesSpike({ x: 2 * TILE + 2, y: TILE + 6, w: 6, h: 11 })).toBe(true);
    // Passing through the top half of the cell (jumping): no stab.
    expect(level.touchesSpike({ x: 2 * TILE + 2, y: TILE - 11, w: 6, h: 11 })).toBe(false);
    // In the neighboring cell, at the same height: no stab.
    expect(level.touchesSpike({ x: TILE + 1, y: TILE + 6, w: 6, h: 11 })).toBe(false);
  });

  it('los bloques agrietados son sólidos hasta que se rompen', () => {
    const level = new Level(['#####', '#.%.#', '#####']);
    expect(level.crackCell(1, 2)).toBe(true);
    expect(level.solidCell(1, 2)).toBe(true); // cracked = solid
    expect(level.breakCrack(1, 2)).toBe(true);
    expect(level.crackCell(1, 2)).toBe(false); // broken = air
    expect(level.solidCell(1, 2)).toBe(false);
    expect(level.breakCrack(1, 2)).toBe(false); // doesn't break twice
    expect(level.breakCrack(1, 1)).toBe(false); // air doesn't break
    expect(level.breakCrack(0, 0)).toBe(false); // nor does rock
    expect(level.crackCell(-1, 2)).toBe(false); // outside the map, no
  });

  it('el hielo es sólido y lleva su propia marca', () => {
    const level = new Level(['#####', '#.~.#', '#####']);
    expect(level.icyCell(1, 2)).toBe(true);
    expect(level.solidCell(1, 2)).toBe(true); // ice = solid
    expect(level.icyCell(0, 0)).toBe(false);  // rock doesn't slip
    expect(level.icyCell(-1, 2)).toBe(false); // outside the map, no
  });
});
