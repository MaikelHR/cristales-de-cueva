import { describe, expect, it } from 'vitest';
import { clamp, overlaps } from './canvas';

describe('overlaps (AABB)', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };

  it('detecta solapamiento real', () => {
    expect(overlaps(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
  });

  it('tocarse solo en el borde NO cuenta (bordes abiertos)', () => {
    expect(overlaps(a, { x: 10, y: 0, w: 5, h: 5 })).toBe(false);
    expect(overlaps(a, { x: 0, y: 10, w: 5, h: 5 })).toBe(false);
  });

  it('separados no se solapan', () => {
    expect(overlaps(a, { x: 20, y: 20, w: 5, h: 5 })).toBe(false);
  });
});

describe('clamp', () => {
  it('recorta por abajo, por arriba y deja pasar el medio', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(5, 0, 10)).toBe(5);
  });
});
