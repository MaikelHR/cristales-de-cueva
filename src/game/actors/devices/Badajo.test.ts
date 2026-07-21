import { describe, expect, it } from 'vitest';
import { Badajo } from './Badajo';
import { TILE } from '../../world/Level';

/** Un badajo colgado en (10, 2), varilla de 8 tiles, arco ±0,9 rad, 4 s. */
const nuevo = (offset = 0) => new Badajo(10 * TILE, 2 * TILE, 8, 9, 4, offset);

describe('Badajo (el incensario de la cripta)', () => {
  it('oscila de un lado a otro y vuelve: es un ciclo cerrado', () => {
    const b = nuevo();
    const inicio = b.tip.x;
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < 4 * 60; i++) {
      b.update(1 / 60);
      min = Math.min(min, b.tip.x);
      max = Math.max(max, b.tip.x);
    }
    expect(max - min).toBeGreaterThan(6 * TILE);   // barre de verdad
    expect(Math.abs(b.tip.x - inicio)).toBeLessThan(2); // y cierra el ciclo
  });

  it('el arco es simétrico respecto a la vertical', () => {
    const b = nuevo();
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < 4 * 60; i++) { b.update(1 / 60); min = Math.min(min, b.tip.x); max = Math.max(max, b.tip.x); }
    const centro = 10 * TILE + TILE / 2;
    expect(Math.abs((centro - min) - (max - centro))).toBeLessThan(1);
  });

  it('se frena en los extremos, como un péndulo de verdad', () => {
    const b = nuevo();
    // velocidad en el punto bajo (t=0) contra la del extremo (t = T/4)
    const paso = 1 / 60;
    const vBajo = Math.abs(b.angleAt(paso) - b.angleAt(0));
    const vExtremo = Math.abs(b.angleAt(1 + paso) - b.angleAt(1));
    expect(vExtremo).toBeLessThan(vBajo * 0.2);
  });

  it('`dx`/`dy` son el movimiento del paso: con eso se acarrea al pasajero', () => {
    const b = nuevo();
    const antes = { x: b.x, y: b.y };
    b.update(1 / 60);
    expect(b.dx).toBeCloseTo(b.x - antes.x, 6);
    expect(b.dy).toBeCloseTo(b.y - antes.y, 6);
    expect(Math.abs(b.dx)).toBeGreaterThan(0);
  });

  it('`offset` desfasa dos badajos: uno va cuando el otro viene', () => {
    const a = nuevo(0);
    const b = nuevo(2); // medio ciclo
    for (let i = 0; i < 30; i++) { a.update(1 / 60); b.update(1 / 60); }
    expect(Math.sign(a.dx)).toBe(-Math.sign(b.dx));
  });

  it('la cabeza mide tres tiles: es un suelo, no una chincheta', () => {
    const b = nuevo();
    expect(b.box().w).toBe(3 * TILE);
  });
});
