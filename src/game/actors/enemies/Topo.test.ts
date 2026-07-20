import { describe, expect, it, vi } from 'vitest';

// The mole's sounds are irrelevant here (and Node has no AudioContext).
vi.mock('../../sfx', () => ({ sfx: new Proxy({}, { get: () => () => {} }) }));

import { Topo } from './Topo';
import { Level } from '../../world/Level';

const dt = 1 / 60;

/** A flat test gallery: air over one long floor row. */
function gallery(): Level {
  return new Level([
    '....................',
    '....................',
    '....................',
    '####################',
  ]);
}

describe('topo', () => {
  it('bajo tierra es intocable; emerge sobre quien se detiene y solo entonces se pisa', () => {
    const level = gallery();
    const topo = new Topo(5 * 8, 2 * 8, level);
    const target = { x: 5 * 8, y: 2 * 8 }; // standing right above it, on the floor

    // Hunting underground: no box, no stomp — nothing to touch.
    expect(topo.stompable).toBe(false);
    expect(topo.box().w).toBe(0);

    // Stand still: quake (still untouchable), then the burst.
    let sawLeap = false;
    let sawTired = false;
    for (let i = 0; i < 60 * 6 && !sawTired; i++) {
      topo.update(dt, target);
      if (topo.stompable && topo.box().w > 0) {
        sawLeap = true;
        // Wait out the arc until it lies dizzy on the surface.
        if (topo.box().y + topo.box().h >= 3 * 8 - 1) sawTired = true;
      }
    }
    expect(sawLeap).toBe(true);
    expect(sawTired).toBe(true);

    // The dizzy spell is the window: a stomp puts it out.
    expect(topo.stompable).toBe(true);
    topo.dead = true; // (combat kills one-stomp enemies by setting dead)
    expect(topo.dead).toBe(true);
  });

  it('vuelve a hundirse tras el mareo y queda intocable otra vez', () => {
    const level = gallery();
    const topo = new Topo(5 * 8, 2 * 8, level);
    const near = { x: 5 * 8, y: 2 * 8 };
    // Ride the full cycle: burrow → quake → leap → tired → dig → burrow.
    let wasOut = false;
    let backUnder = false;
    for (let i = 0; i < 60 * 8 && !backUnder; i++) {
      topo.update(dt, near);
      if (topo.box().w > 0) wasOut = true;
      else if (wasOut) backUnder = true;
    }
    expect(wasOut).toBe(true);
    expect(backUnder).toBe(true);
    expect(topo.stompable).toBe(false);
  });

  it('nunca abandona su franja de suelo (los bordes lo encierran)', () => {
    // Floor only under columns 2..7: the mole is walled into it.
    const level = new Level([
      '..........',
      '..........',
      '..######..',
      '##########',
    ]);
    const topo = new Topo(4 * 8, 1 * 8, level);
    const farRight = { x: 9 * 8, y: 1 * 8 };
    for (let i = 0; i < 60 * 4; i++) {
      topo.update(dt, farRight);
      const cx = topo.x + 5; // body is 10 wide
      expect(cx).toBeLessThan(8 * 8);
      expect(cx).toBeGreaterThan(2 * 8 - 8);
    }
  });
});
