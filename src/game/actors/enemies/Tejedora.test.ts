import { describe, expect, it } from 'vitest';

import { Tejedora } from './Tejedora';
import { Level } from '../../world/Level';

const dt = 1 / 60;

function shaft(): Level {
  return new Level([
    '##########',
    '#........#',
    '#........#',
    '#........#',
    '#........#',
    '#........#',
    '##########',
  ]);
}

describe('tejedora', () => {
  it('espera arriba hasta que cruzas por debajo, y entonces se descuelga', () => {
    const spider = new Tejedora(4 * 8, 1 * 8, shaft(), 3);
    const away = { x: 60, y: 40 }; // lejos, en su columna no
    const top = spider.y;
    for (let i = 0; i < 60 * 2; i++) spider.update(dt, away);
    expect(spider.y).toBe(top); // no se ha movido

    const under = { x: 4 * 8 + 4, y: 5 * 8 }; // justo debajo
    let dropped = false;
    for (let i = 0; i < 60 * 3 && !dropped; i++) {
      spider.update(dt, under);
      if (spider.y > top + 8) dropped = true;
    }
    expect(dropped).toBe(true);
  });

  it('no baja más allá de su alcance y vuelve a trepar', () => {
    const spider = new Tejedora(4 * 8, 1 * 8, shaft(), 3);
    const under = { x: 4 * 8 + 4, y: 5 * 8 };
    const top = spider.y;
    let lowest = top;
    for (let i = 0; i < 60 * 4; i++) {
      spider.update(dt, under);
      lowest = Math.max(lowest, spider.y);
    }
    // Su caída se detiene en el alcance pedido (3 tiles), con margen.
    expect(lowest - top).toBeLessThanOrEqual(3 * 8 + 2);
    // Y termina volviendo a su percha.
    let back = false;
    for (let i = 0; i < 60 * 6 && !back; i++) {
      spider.update(dt, { x: 60, y: 40 });
      if (Math.abs(spider.y - top) < 1) back = true;
    }
    expect(back).toBe(true);
  });

  it('se pisa desde arriba (es un enemigo normal, no un muro)', () => {
    const spider = new Tejedora(4 * 8, 1 * 8, shaft(), 3);
    expect(spider.stompable).toBe(true);
    expect(spider.box().w).toBeGreaterThan(0);
  });
});
