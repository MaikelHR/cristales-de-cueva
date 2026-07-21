import { describe, expect, it } from 'vitest';
import { Cisterna } from './Cisterna';
import { Level, TILE } from '../../world/Level';

/** A 10x10 room: rock frame, hollow inside. The tank lives in the hollow. */
function room(): Level {
  const rows = [
    '##########',
    '#........#',
    '#........#',
    '#........#',
    '#........#',
    '#........#',
    '#........#',
    '#........#',
    '#........#',
    '##########',
  ];
  return new Level(rows);
}

/** Tank of 6x6 tiles at (2,2), a 12 s cycle. */
function tank(level: Level, offset = 0): Cisterna {
  return new Cisterna(2 * TILE, 2 * TILE, 6, 6, 12, offset, level);
}

const wetRows = (level: Level): number =>
  [2, 3, 4, 5, 6, 7].filter((r) => level.wetCell(r, 3)).length;

describe('Cisterna (la marea del reloj de agua)', () => {
  it('arranca vacía y no moja nada', () => {
    const level = room();
    tank(level);
    expect(wetRows(level)).toBe(0);
  });

  it('se llena hasta el borde y vuelve a vaciarse dentro de un ciclo', () => {
    const level = room();
    const c = tank(level);
    const vistos = new Set<number>();
    for (let t = 0; t < 12; t += 0.1) {
      c.update(0.1);
      vistos.add(wetRows(level));
    }
    // Pasa por todos los niveles, incluidos vacío del todo y lleno del todo.
    expect(vistos.has(0)).toBe(true);
    expect(vistos.has(6)).toBe(true);
    expect(vistos.size).toBe(7);
  });

  it('sube de una fila por vez: nunca salta un peldaño', () => {
    const level = room();
    const c = tank(level);
    let previo = wetRows(level);
    for (let t = 0; t < 24; t += 1 / 60) {
      c.update(1 / 60);
      const ahora = wetRows(level);
      expect(Math.abs(ahora - previo)).toBeLessThanOrEqual(1);
      previo = ahora;
    }
  });

  it('descansa lleno y vacío: los dos extremos son ventanas, no un instante', () => {
    const c = tank(room());
    const lleno = [];
    const vacio = [];
    for (let i = 0; i < 1200; i++) {
      const t = (i / 1200) * 12;
      const f = (2 + 6 - c.surfaceAt(t)) / 6;
      if (f === 1) lleno.push(t);
      if (f === 0) vacio.push(t);
    }
    // Cada extremo dura más de un segundo entero.
    expect(lleno[lleno.length - 1] - lleno[0]).toBeGreaterThan(1);
    expect(vacio.length / 100).toBeGreaterThan(1);
  });

  it('la roca nunca se moja: las paredes del depósito siguen secas', () => {
    const level = room();
    const c = tank(level);
    for (let t = 0; t < 6; t += 0.1) c.update(0.1);
    expect(level.wetCell(5, 0)).toBe(false); // muro izquierdo
    expect(level.wetCell(9, 3)).toBe(false); // suelo
  });

  it('`offset` desfasa dos depósitos: uno sube mientras el otro baja', () => {
    const nivelA = room();
    const nivelB = room();
    const a = tank(nivelA);
    const b = tank(nivelB, 6); // medio ciclo por delante
    const correr = (seg: number) => {
      for (let i = 0; i < seg * 60; i++) {
        a.update(1 / 60);
        b.update(1 / 60);
      }
    };
    correr(1);
    const a1 = wetRows(nivelA);
    const b1 = wetRows(nivelB);
    correr(1);
    expect(wetRows(nivelA)).toBeGreaterThan(a1); // A se llena
    expect(wetRows(nivelB)).toBeLessThan(b1);    // B se vacía a la vez
  });
});
