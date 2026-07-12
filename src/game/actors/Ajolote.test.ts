import { describe, expect, it, vi } from 'vitest';

// The boss's sounds are irrelevant here (and Node has no AudioContext).
vi.mock('../sfx', () => ({ sfx: new Proxy({}, { get: () => () => {} }) }));

import { Ajolote } from './Ajolote';

describe('ajolote', () => {
  it('se mueve continuo: nunca salta más de unos px por frame, ni tras un pisotón', () => {
    // Playtest bug: rejoining the circle after a breach (and after a stomp)
    // snapped the position — a visible teleport. The whole fight must be
    // continuous: splashdown where it lands, then SWIM back on-circuit.
    const boss = new Ajolote(100, 100);
    const dt = 1 / 60;
    const target = { x: 130, y: 80 };
    let px = boss.x;
    let py = boss.y;
    let stomps = 0;
    for (let i = 0; i < 60 * 40 && !boss.dead; i++) {
      // Stomp the crest the moment each breach window opens (i-frames may
      // reject the call, so count landed hits by the hp actually dropping).
      if (boss.stompable && stomps < 3) {
        const before = boss.hp;
        boss.onStomp();
        if (boss.hp < before) stomps++;
      }
      boss.update(dt, target);
      const step = Math.hypot(boss.x - px, boss.y - py);
      expect(step, `frame ${i} (tras ${stomps} golpes)`).toBeLessThan(7);
      px = boss.x;
      py = boss.y;
    }
    expect(stomps).toBe(3);
    expect(boss.dead).toBe(true);
  });
});
