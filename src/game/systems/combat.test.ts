import { describe, expect, it } from 'vitest';
import { isStomp } from './combat';

// The stomp-vs-hurt decision is THE combat rule: its edge cases are
// pinned down here so a physics tweak can't break it.
describe('isStomp', () => {
  const DT = 1 / 60;

  it('cayendo desde arriba del enemigo es pisotón', () => {
    // Feet barely inside the enemy, came from above the previous frame.
    expect(isStomp(true, 120, 102, DT, 100)).toBe(true);
  });

  it('subiendo (golpe desde abajo) nunca es pisotón', () => {
    expect(isStomp(true, -50, 102, DT, 100)).toBe(false);
  });

  it('de costado (sin caer) no es pisotón', () => {
    expect(isStomp(true, 0, 110, DT, 100)).toBe(false);
  });

  it('si los pies ya venían muy hundidos, es golpe de costado', () => {
    // prevFeetY = 118 - 120/60 = 116 > top + 4: came from the side.
    expect(isStomp(true, 120, 118, DT, 100)).toBe(false);
  });

  it('la tolerancia de 4px perdona hundimientos chicos', () => {
    // prevFeetY = 106 - 120/60 = 104 = top + 4: right at the limit.
    expect(isStomp(true, 120, 106, DT, 100)).toBe(true);
  });

  it('un enemigo no pisable jamás se pisa', () => {
    expect(isStomp(false, 120, 102, DT, 100)).toBe(false);
  });

  it('el azotón pisa incluso a los enemigos con púas (no pisables)', () => {
    // Same fall from above as before, but mid-pound dive.
    expect(isStomp(false, 340, 102, DT, 100, true)).toBe(true);
  });

  it('el azotón no convierte un golpe de costado en pisotón', () => {
    // Even when marked pounding, no falling from above means no stomp.
    expect(isStomp(false, 0, 110, DT, 100, true)).toBe(false);
    expect(isStomp(false, 340, 118, DT, 100, true)).toBe(false); // came in deep
  });
});
