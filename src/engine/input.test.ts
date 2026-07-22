import { describe, it, expect } from 'vitest';
import { stickVertical } from './input';

// 'abajo' en el aire es el GOLPE: si el stick lo dispara al correr en
// diagonal, el juego te mata en los pinchos por moverte rápido.
describe('la vertical del stick', () => {
  it('un empujón claro hacia abajo (o arriba) cuenta', () => {
    expect(stickVertical(0, 1)).toBe(1);
    expect(stickVertical(0, -1)).toBe(-1);
    expect(stickVertical(0.35, 0.94)).toBe(1); // abajo, algo inclinado
  });

  it('la diagonal de correr NO cuenta', () => {
    expect(stickVertical(0.7, 0.7)).toBe(0); // la esquina del stick
    expect(stickVertical(-0.7, 0.7)).toBe(0);
    expect(stickVertical(1, 0.65)).toBe(0); // corriendo con caída de pulgar
  });

  it('un roce no cuenta', () => {
    expect(stickVertical(0, 0.45)).toBe(0);
    expect(stickVertical(0, -0.45)).toBe(0);
    expect(stickVertical(0, 0)).toBe(0);
  });
});
