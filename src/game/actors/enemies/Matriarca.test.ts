import { describe, expect, it, vi } from 'vitest';

// Her sounds are irrelevant here (and Node has no AudioContext).
vi.mock('../../sfx', () => ({ sfx: new Proxy({}, { get: () => () => {} }) }));

import { Matriarca } from './Matriarca';
import { Level } from '../../world/Level';

const dt = 1 / 60;

/** Her chamber, to scale: she hangs a good way below the ceiling and
 *  needs real air under her to fall through, so this hall is as tall
 *  as the room she actually fights in. */
function hall(): Level {
  return new Level([
    '####################',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '####################',
  ]);
}

describe('matriarca', () => {
  it('colgada es intocable, y su hilo es el único blanco', () => {
    const boss = new Matriarca(8 * 8, 1 * 8, hall());
    boss.update(dt, { x: 40, y: 60 });
    expect(boss.invulnerable).toBe(true);
    expect(boss.stompable).toBe(false);
    expect(boss.onStomp()).toBe(false);
    expect(boss.hp).toBe(3);
    // El hilo existe mientras cuelga, y va del techo a su cuerpo.
    const spot = boss.swingSpot();
    expect(spot).not.toBeNull();
    expect(spot!.h).toBeGreaterThan(8);
    expect(spot!.y).toBeLessThan(boss.y);
  });

  it('cortar el hilo la tira al suelo y AHÍ se pisa', () => {
    const boss = new Matriarca(8 * 8, 1 * 8, hall());
    const target = { x: 40, y: 60 };
    expect(boss.onSwingCut()).toBe(true);
    // Cae hasta el suelo y queda aturdida.
    let stunned = false;
    for (let i = 0; i < 60 * 3 && !stunned; i++) {
      boss.update(dt, target);
      if (boss.stompable) stunned = true;
    }
    expect(stunned).toBe(true);
    expect(boss.invulnerable).toBe(false);
    // Ya en el suelo, no queda hilo que cortar.
    expect(boss.swingSpot()).toBeNull();
    expect(boss.onSwingCut()).toBe(false);
    // Y el pisotón sí entra.
    expect(boss.onStomp()).toBe(false); // (no la mata: le quedan vidas)
    expect(boss.hp).toBe(2);
  });

  it('tres cortes con su pisotón la acaban, y entre medias vuelve al techo', () => {
    const boss = new Matriarca(8 * 8, 1 * 8, hall());
    const target = { x: 40, y: 60 };
    let hits = 0;
    let climbedBack = false;
    for (let i = 0; i < 60 * 60 && !boss.dead; i++) {
      boss.update(dt, target);
      if (boss.swingSpot()) {
        // Volvió a colgar del techo tras un golpe: el ciclo se reinicia.
        if (hits > 0) climbedBack = true;
        boss.onSwingCut();
      } else if (boss.stompable) {
        const before = boss.hp;
        boss.onStomp();
        if (boss.hp < before) hits++;
      }
    }
    expect(hits).toBe(3);
    expect(boss.dead).toBe(true);
    expect(climbedBack).toBe(true);
  });

  it('escupe veneno: sus gotas caen y son las únicas cajas que hieren', () => {
    const boss = new Matriarca(8 * 8, 1 * 8, hall());
    const target = { x: 70, y: 60 };
    let sawVenom = false;
    for (let i = 0; i < 60 * 6 && !sawVenom; i++) {
      boss.update(dt, target);
      if (boss.hazards().length > 0) sawVenom = true;
    }
    expect(sawVenom).toBe(true);
    // Y bajan: la gota avanza hacia el suelo frame a frame (y desaparece
    // al tocarlo, así que se mide mientras siga viva).
    const y0 = boss.hazards()[0].y;
    let y1 = y0;
    for (let i = 0; i < 6; i++) {
      boss.update(dt, target);
      const drops = boss.hazards();
      if (drops.length === 0) break;
      y1 = drops[0].y;
    }
    expect(y1).toBeGreaterThan(y0);
  });
});
