import { describe, expect, it } from 'vitest';
import { Zapatero } from './Zapatero';
import { Cisterna } from '../devices/Cisterna';
import { Level, TILE } from '../../world/Level';

/** Una sala de 12x12 con un depósito hueco de la fila 3 a la 9. */
function sala(): Level {
  const rows = ['############'];
  for (let r = 1; r <= 10; r++) rows.push('#..........#');
  rows.push('############');
  return new Level(rows);
}

const correr = (segundos: number, ...cosas: { update: (dt: number) => void }[]) => {
  for (let i = 0; i < segundos * 60; i++) for (const c of cosas) c.update(1 / 60);
};

describe('Zapatero (el que patina sobre la marea)', () => {
  it('sin agua se queda varado en el suelo', () => {
    const level = sala();
    const z = new Zapatero(5 * TILE, 3 * TILE, 3, level);
    correr(2, z);
    expect(z.onWater).toBe(false);
    expect(z.y + z.h).toBe(11 * TILE); // posado sobre la fila 11
  });

  it('cuando el depósito se llena, SUBE con el agua', () => {
    const level = sala();
    const tanque = new Cisterna(1 * TILE, 3 * TILE, 10, 8, 12, 0, level);
    const z = new Zapatero(5 * TILE, 3 * TILE, 3, level);
    correr(2, z);
    const varado = z.y;
    correr(3, tanque, z);      // el reloj lo va llenando
    expect(z.onWater).toBe(true);
    expect(z.y).toBeLessThan(varado); // ha subido con la superficie
  });

  it('patina de un extremo a otro de su tramo, sin salirse', () => {
    const level = sala();
    const tanque = new Cisterna(1 * TILE, 3 * TILE, 10, 8, 12, 0, level);
    const z = new Zapatero(5 * TILE, 5 * TILE, 2, level);
    correr(3, tanque, z);      // que haya agua bajo él
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < 600; i++) {
      tanque.update(1 / 60); z.update(1 / 60);
      if (z.onWater) { min = Math.min(min, z.x); max = Math.max(max, z.x); }
    }
    expect(min).toBeGreaterThanOrEqual(5 * TILE - 2 * TILE - 0.01);
    expect(max).toBeLessThanOrEqual(5 * TILE + 2 * TILE + 0.01);
    expect(max - min).toBeGreaterThan(TILE); // se mueve de verdad
  });

  it('se puede pisar: es la única forma de recuperar corazones en el nivel', () => {
    const z = new Zapatero(5 * TILE, 5 * TILE, 2, sala());
    expect(z.stompable).toBe(true);
  });

  it('al vaciarse el depósito vuelve a caer al fondo', () => {
    const level = sala();
    const tanque = new Cisterna(1 * TILE, 3 * TILE, 10, 8, 12, 0, level);
    const z = new Zapatero(5 * TILE, 4 * TILE, 2, level);
    correr(4, tanque, z);
    expect(z.onWater).toBe(true);
    correr(8, tanque, z);      // el ciclo lo vacía
    expect(z.onWater).toBe(false);
    expect(z.y + z.h).toBe(11 * TILE);
  });
});
