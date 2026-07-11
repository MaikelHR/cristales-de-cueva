import { describe, expect, it } from 'vitest';
import { isStomp } from './combat';

// La decisión pisotón-vs-golpe es LA regla de combate: acá quedan
// clavados sus casos borde para que un ajuste de física no la rompa.
describe('isStomp', () => {
  const DT = 1 / 60;

  it('cayendo desde arriba del enemigo es pisotón', () => {
    // Pies apenas dentro del enemigo, venían por encima el frame anterior.
    expect(isStomp(true, 120, 102, DT, 100)).toBe(true);
  });

  it('subiendo (golpe desde abajo) nunca es pisotón', () => {
    expect(isStomp(true, -50, 102, DT, 100)).toBe(false);
  });

  it('de costado (sin caer) no es pisotón', () => {
    expect(isStomp(true, 0, 110, DT, 100)).toBe(false);
  });

  it('si los pies ya venían muy hundidos, es golpe de costado', () => {
    // prevFeetY = 118 - 120/60 = 116 > top + 4: venía de costado.
    expect(isStomp(true, 120, 118, DT, 100)).toBe(false);
  });

  it('la tolerancia de 4px perdona hundimientos chicos', () => {
    // prevFeetY = 106 - 120/60 = 104 = top + 4: justo en el límite.
    expect(isStomp(true, 120, 106, DT, 100)).toBe(true);
  });

  it('un enemigo no pisable jamás se pisa', () => {
    expect(isStomp(false, 120, 102, DT, 100)).toBe(false);
  });
});
