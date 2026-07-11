import { describe, expect, it } from 'vitest';
import { Level, TILE } from './Level';

// Un mapa chico de prueba: caja cerrada con un tablón adentro.
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
    expect(level.isSolidAt(1, 1)).toBe(true);    // borde
    expect(level.isSolidAt(12, 12)).toBe(false); // interior
    expect(level.isSolidAt(-5, 12)).toBe(true);  // fuera del mapa
    expect(level.isSolidAt(12, 999)).toBe(true); // fuera del mapa
  });

  it('los tablones no son sólidos: van por su propia grilla', () => {
    const level = new Level(TILES);
    expect(level.isSolidAt(2 * TILE + 1, 2 * TILE + 1)).toBe(false);
    expect(level.oneWayCell(2, 2)).toBe(true);
    expect(level.oneWayCell(0, 0)).toBe(false);  // '#' no es tablón
    expect(level.oneWayCell(-1, 2)).toBe(false); // fuera del mapa
  });

  it('devuelve los tiles sólidos que tocan una caja', () => {
    const level = new Level(TILES);
    // Caja pegada a la esquina superior izquierda del interior:
    // toca la pared de arriba y la de la izquierda.
    const boxes = level.solidTilesIn({ x: 6, y: 6, w: 4, h: 4 });
    expect(boxes).toContainEqual({ x: 0, y: 0, w: TILE, h: TILE });
    expect(boxes).toContainEqual({ x: 0, y: TILE, w: TILE, h: TILE });
    expect(boxes).toContainEqual({ x: TILE, y: 0, w: TILE, h: TILE });
    // Caja en el centro del aire: nada.
    expect(level.solidTilesIn({ x: 9, y: 9, w: 2, h: 2 })).toEqual([]);
  });

  it('oneWayTilesIn encuentra el tablón', () => {
    const level = new Level(TILES);
    const boxes = level.oneWayTilesIn({ x: 2 * TILE, y: 2 * TILE, w: 4, h: 4 });
    expect(boxes).toEqual([{ x: 2 * TILE, y: 2 * TILE, w: TILE, h: TILE }]);
  });
});
