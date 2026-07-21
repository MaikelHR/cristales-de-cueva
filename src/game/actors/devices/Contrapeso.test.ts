import { describe, expect, it } from 'vitest';

import { Contrapeso } from './Contrapeso';

const dt = 1 / 60;

function advance(c: Contrapeso, seconds: number): void {
  for (let t = 0; t < seconds; t += dt) c.update(dt);
}

/** Plates at row 12, columns 4 and 14, hanging from row 3. */
const build = (): Contrapeso => new Contrapeso(4 * 8, 12 * 8, 14, 3);

describe('contrapeso', () => {
  it('en reposo los dos platos están a la misma altura', () => {
    const c = build();
    expect(c.leftBox().y).toBe(c.rightBox().y);
    expect(c.lift).toBe(0);
  });

  it('el plato que pisas BAJA y sube el otro exactamente igual', () => {
    const c = build();
    const y0 = c.leftBox().y;
    c.rider = 'left';
    advance(c, 0.6);
    const down = c.leftBox().y - y0;
    const up = y0 - c.rightBox().y;
    expect(down).toBeGreaterThan(4);       // se hundió de verdad
    expect(up).toBeCloseTo(down, 5);       // y el otro subió lo mismo: es UNA cadena
    expect(c.lift).toBeCloseTo(down, 5);
  });

  it('funciona igual desde el plato derecho, en espejo', () => {
    const c = build();
    const y0 = c.rightBox().y;
    c.rider = 'right';
    advance(c, 0.6);
    expect(c.rightBox().y).toBeGreaterThan(y0); // el pisado baja
    expect(c.leftBox().y).toBeLessThan(y0);     // el otro sube
  });

  it('no se hunde sin fondo: la cadena tiene su límite', () => {
    const c = build();
    c.rider = 'left';
    advance(c, 30);
    const far = c.lift;
    advance(c, 10);
    expect(c.lift).toBeCloseTo(far, 5);
  });

  it('donde la dejas, se queda: por eso se puede ir a usar el plato alto', () => {
    // Una cadena que volviera sola al equilibrio desharía la subida en
    // cuanto te bajas para ir a aprovecharla — el puzzle sería
    // imposible para un jugador solo.
    const c = build();
    c.rider = 'left';
    advance(c, 1);
    const lifted = c.lift;
    expect(lifted).toBeGreaterThan(0);
    c.rider = null;
    advance(c, 8);
    expect(c.lift).toBeCloseTo(lifted, 5);
  });

  it('montar el otro plato es lo que la devuelve', () => {
    const c = build();
    c.rider = 'left';
    advance(c, 1.5);
    expect(c.leftBox().y).toBeGreaterThan(c.rightBox().y);
    c.rider = 'right';
    advance(c, 3);
    expect(c.rightBox().y).toBeGreaterThan(c.leftBox().y); // se invirtió
  });
});
