import { describe, expect, it } from 'vitest';
import { isDashKill, isStomp } from './combat';
import { Player } from '../actors/Player';
import { Level } from '../world/Level';
import { Particles } from '../effects/Particles';

// A scrap of floor and an empty particle pool: all the Player needs
// to exist here (we only exercise its health arithmetic).
const newPlayer = (): Player => new Player(new Level(['....', '####']), new Particles());

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

  it('un enemigo invulnerable no se pisa ni se azota (la medusa)', () => {
    // Same fall-from-above that would stomp, but invulnerable: never a stomp.
    expect(isStomp(true, 120, 102, DT, 100, false, true)).toBe(false);
    // Not even the pound (which beats spikes) can touch it.
    expect(isStomp(false, 340, 102, DT, 100, true, true)).toBe(false);
  });
});

// The dash-lunge is the cenote's combat lesson: only a DASHING player
// finishes an enemy while it's dash-vulnerable (the stunned eel). Pinned
// here so a physics tweak can't quietly break the rule.
describe('isDashKill', () => {
  it('embestir con dash a un enemigo vulnerable lo derrota', () => {
    expect(isDashKill(true, true)).toBe(true);
  });

  it('sin dash no hay embestida, aunque esté vulnerable', () => {
    expect(isDashKill(true, false)).toBe(false);
  });

  it('un enemigo no vulnerable a la embestida aguanta el dash', () => {
    expect(isDashKill(false, true)).toBe(false);
  });
});

// Defeating an enemy gives a heart back: a hurt run can be nursed
// back by fighting well. The cap is the whole rule — it can never
// overheal, and at full hearts it's a no-op (the caller uses the
// return value to skip the popup and the sound).
describe('Player.heal (el corazón que devuelve un enemigo derrotado)', () => {
  it('devuelve un corazón si falta alguno', () => {
    const player = newPlayer();
    player.health = 1;
    expect(player.heal()).toBe(true);
    expect(player.health).toBe(2);
  });

  it('nunca pasa del máximo: a vida llena no cura (ni celebra)', () => {
    const player = newPlayer();
    expect(player.health).toBe(player.maxHealth);
    expect(player.heal()).toBe(false);
    expect(player.health).toBe(player.maxHealth);
  });

  it('curarse de a un corazón repone una vida perdida, no más', () => {
    const player = newPlayer();
    player.health = 1;
    player.heal();
    player.heal();
    player.heal(); // this one finds it already full
    expect(player.health).toBe(player.maxHealth);
  });
});
