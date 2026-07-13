import { describe, expect, it, vi } from 'vitest';

// The boss's sounds are irrelevant here (and Node has no AudioContext).
vi.mock('../../sfx', () => ({ sfx: new Proxy({}, { get: () => () => {} }) }));

import { Custodio } from './Custodio';
import { Level } from '../../world/Level';

// A bare arena: open air over a flat floor, like the lintel's.
const arena = new Level([
  ...Array.from({ length: 20 }, () => '.'.repeat(56)),
  '#'.repeat(56),
  '#'.repeat(56),
]);

describe('custodio', () => {
  it('cada vida exige su verbo, y solo los tres verbos lo apagan', () => {
    // The whole fight is the contract: outside a window NOTHING lands;
    // inside one, the flags must name exactly one verb per life —
    // gold stomp (3), cyan dash-lunge (2), violet pound (1).
    const boss = new Custodio(208, 104, arena);
    const dt = 1 / 60;
    const target = { x: 220, y: 150 };
    let hits = 0;

    for (let i = 0; i < 60 * 120 && !boss.dead; i++) {
      boss.update(dt, target);

      // The flags never contradict the verb of the current life.
      if (boss.stompable) {
        expect(boss.hp, `frame ${i}`).toBe(3);
        expect(boss.invulnerable, `frame ${i}`).toBe(false);
      }
      if (boss.dashVulnerable) {
        expect(boss.hp, `frame ${i}`).toBe(2);
        // Untouchable from above: only the lunge gets through.
        expect(boss.invulnerable, `frame ${i}`).toBe(true);
      }
      if (boss.hp === 1 && !boss.invulnerable) {
        // The dome: a plain stomp must NOT qualify — pound only.
        expect(boss.stompable, `frame ${i}`).toBe(false);
      }

      const windowOpen = boss.stompable || boss.dashVulnerable || !boss.invulnerable;
      const before = boss.hp;
      const defeated = boss.onStomp();
      if (windowOpen) {
        if (boss.hp < before) hits++;
        if (defeated) break;
      } else {
        // Outside a window the hit never lands, ever.
        expect(defeated, `frame ${i}`).toBe(false);
        expect(boss.hp, `frame ${i}`).toBe(before);
      }
    }

    expect(hits).toBe(3);
    expect(boss.dead).toBe(true);
  });

  it('duerme hasta que te acercas, y al despertar se disuelve (sin cuerpo)', () => {
    const boss = new Custodio(208, 104, arena);
    // Asleep it has a body you could read from the ledge...
    expect(boss.box().w).toBeGreaterThan(0);
    // ...and a far player never wakes it.
    for (let i = 0; i < 60; i++) boss.update(1 / 60, { x: 40, y: 150 });
    expect(boss.box().w).toBeGreaterThan(0);
    // Coming close wakes it: it dissolves (no body while gathering)…
    boss.update(1 / 60, { x: 180, y: 150 });
    expect(boss.box().w).toBe(0);
    // …and re-forms with a real body.
    for (let i = 0; i < 60; i++) boss.update(1 / 60, { x: 180, y: 150 });
    expect(boss.box().w).toBeGreaterThan(0);
  });
});
