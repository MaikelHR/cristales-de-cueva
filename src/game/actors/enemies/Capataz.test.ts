import { describe, expect, it } from 'vitest';

import { Capataz } from './Capataz';
import { Level } from '../../world/Level';

const dt = 1 / 60;

/** A tall flat arena: air rows over one floor row, walled by the map edge. */
function arena(): Level {
  return new Level([
    '........................',
    '........................',
    '........................',
    '........................',
    '########################',
  ]);
}

describe('capataz', () => {
  it('de frente es intocable (ni stomp ni azotón); la espalda expone el farol', () => {
    const level = arena();
    const boss = new Capataz(10 * 8, 3 * 8, level);
    // He starts facing left: a player on his left is FRONT.
    boss.update(dt, { x: 4 * 8, y: 3 * 8 });
    expect(boss.invulnerable).toBe(true);
    expect(boss.stompable).toBe(false);
    expect(boss.onStomp()).toBe(false);
    expect(boss.hp).toBe(3);
    // The same player crossing to his right is suddenly BEHIND him
    // (the half-turn takes seconds — that lag is the whole window).
    boss.update(dt, { x: 20 * 8, y: 3 * 8 });
    expect(boss.invulnerable).toBe(false);
    expect(boss.stompable).toBe(true);
  });

  it('la ventana del giro dura: sigue expuesto un buen rato tras cruzarlo', () => {
    const level = arena();
    const boss = new Capataz(10 * 8, 3 * 8, level);
    const behind = { x: 20 * 8, y: 3 * 8 };
    // Half a second after you cross, he is STILL coming around.
    for (let i = 0; i < 30; i++) boss.update(dt, behind);
    expect(boss.stompable).toBe(true);
    // Eventually the turn completes and the shovel faces you again.
    for (let i = 0; i < 60 * 3; i++) boss.update(dt, behind);
    expect(boss.stompable).toBe(false);
  });

  it('tres faroles rotos lo apagan, y cada golpe lo hace encararte al instante', () => {
    const level = arena();
    const boss = new Capataz(10 * 8, 3 * 8, level);
    let stomps = 0;
    // Play the honest loop: whenever the shovel faces us, cross to his
    // other side; whenever the lantern shows (and i-frames allow), stomp.
    let myX = boss.x - 60;
    for (let i = 0; i < 60 * 40 && !boss.dead; i++) {
      if (boss.invulnerable) {
        myX = myX < boss.x ? boss.x + boss.w + 48 : boss.x - 48;
      }
      boss.update(dt, { x: myX, y: 3 * 8 });
      if (boss.stompable) {
        const before = boss.hp;
        boss.onStomp();
        if (boss.hp < before) {
          stomps++;
          // The hit spins him around to face us: window slammed shut.
          if (!boss.dead) expect(boss.invulnerable).toBe(true);
        }
      }
    }
    expect(stomps).toBe(3);
    expect(boss.dead).toBe(true);
  });

  it('marcha sin atravesar los muros del socavón', () => {
    const level = arena();
    const boss = new Capataz(10 * 8, 3 * 8, level);
    // Bait him left and right for a long while: he must stay in bounds.
    for (let i = 0; i < 60 * 20; i++) {
      const t = i % 600 < 300 ? { x: 0, y: 3 * 8 } : { x: 23 * 8, y: 3 * 8 };
      boss.update(dt, t);
      expect(boss.x).toBeGreaterThanOrEqual(0);
      expect(boss.x + boss.w).toBeLessThanOrEqual(24 * 8);
    }
  });
});
