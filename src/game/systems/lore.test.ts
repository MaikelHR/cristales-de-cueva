import { afterEach, describe, expect, it } from 'vitest';
import { readNearbyLore } from './lore';
import { Glifo, REACH } from '../actors/Glifo';
import { Player } from '../actors/Player';
import { Level, TILE } from '../world/Level';
import { Particles } from '../effects/Particles';
import { LORE_IDS } from '../lore';
import { SAVE_VERSION, type SaveData } from '../save';
import { endStep, releaseAll, touchButton } from '../../engine/input';
import type { Actor } from '../actors/Actor';
import type { GameSession } from '../session';

// READING IS A PRESS, and that is the point of these tests. The first
// version read an inscription whenever you happened to stand still
// beside one, and it opened a wall of text over the floor while the
// player was doing something else entirely. Text nobody asked for is an
// interruption however good it is, so the rule is now "walk up and press
// down", and it is pinned down here — including the two ways it could
// quietly regress: firing without the button, or firing in mid-air.
//
// ON THE STAND-IN SESSION. A real GameSession cannot be built under
// Node: its constructor builds a World, which builds every actor of the
// room, and the actors bake their sprites with document.createElement().
// readNearbyLore doesn't need any of that — it reads the player's body
// and stance, the current room's actors and the save, and writes some
// flags back. So the CONTAINER is an object literal and everything
// inside it is the shipped thing: a real Player on a real Level, real
// Glifos, a real SaveData, and the REAL input module driven through its
// touch entry point. Nothing is mocked.
type LoreSession = Pick<GameSession, 'player' | 'save' | 'readingLore' | 'loreNear'> & {
  world: { current: { actors: Actor[] } };
};

const DT = 1 / 60;

/** A scrap of floor, a player standing on it, and one plaque `gap` px
 *  to the right of the body (0 = right in front of it). */
function makeScene(gap = 0) {
  const level = new Level(['........', '........', '########']);
  const player = new Player(level, new Particles());
  player.respawnAt(2 * TILE, TILE);
  player.onGround = true; // respawnAt drops you; here you have landed
  const glifo = new Glifo(2 * TILE + gap, TILE, LORE_IDS[0], { t: 0 });
  const session: LoreSession = {
    player,
    save: { version: SAVE_VERSION, levels: {}, lore: [], secrets: [] } as SaveData,
    readingLore: null,
    loreNear: false,
    world: { current: { actors: [glifo] } },
  };
  return { session, player, glifo };
}

const run = (session: LoreSession): void =>
  readNearbyLore(session as unknown as GameSession);

/** One tap of 'down', through the real input module. `endStep` is what
 *  the main loop calls, so "just pressed" lasts exactly one step here
 *  the same way it does in the game. */
function tapDown(session: LoreSession): void {
  touchButton('down', true);
  run(session);
  endStep();
  touchButton('down', false);
  endStep();
}

afterEach(() => {
  releaseAll();
  endStep();
});

describe('readNearbyLore', () => {
  it('no dice nada hasta que la lees: estar al lado no alcanza', () => {
    const { session, glifo } = makeScene();
    for (let i = 0; i < 60; i++) run(session); // a full second of standing there
    expect(session.readingLore).toBeNull();
    expect(glifo.read).toBe(false);
    // But the cue is up, because this is the moment you need telling.
    expect(session.loreNear).toBe(true);
  });

  it('apretar abajo la lee, y se guarda al instante', () => {
    const { session, glifo } = makeScene();
    tapDown(session);
    expect(session.readingLore).toBe(glifo.lore);
    expect(glifo.read).toBe(true);
    expect(glifo.open).toBe(true);
    // The cue is for someone who ISN'T reading, so it goes away.
    expect(session.loreNear).toBe(false);
    // A run can end in a pit; what the cave told you must survive it.
    expect(session.save.lore).toEqual([glifo.lore]);
  });

  it('apretar abajo otra vez la cierra', () => {
    const { session, glifo } = makeScene();
    tapDown(session);
    expect(session.readingLore).toBe(glifo.lore);
    tapDown(session);
    expect(session.readingLore).toBeNull();
    expect(glifo.open).toBe(false);
    expect(glifo.read).toBe(true); // sigue leída: cerrar no es olvidar
  });

  it('alejarse la cierra sola', () => {
    const { session, player, glifo } = makeScene();
    tapDown(session);
    expect(session.readingLore).toBe(glifo.lore);
    player.x += REACH * 4 + TILE; // te fuiste
    run(session);
    expect(session.readingLore).toBeNull();
    expect(glifo.open).toBe(false);
  });

  it('en el aire no se lee: pasar saltando y apretar abajo es el golpe', () => {
    const { session, player, glifo } = makeScene();
    player.onGround = false;
    tapDown(session);
    expect(glifo.open).toBe(false);
    expect(session.readingLore).toBeNull();
    // Near it all the same, so the cue still says the verb exists.
    expect(session.loreNear).toBe(true);
  });

  it('de lejos no dice nada, ni siquiera avisa', () => {
    const { session, glifo } = makeScene(REACH * 3 + TILE);
    tapDown(session);
    expect(glifo.near).toBe(false);
    expect(session.readingLore).toBeNull();
    expect(session.loreNear).toBe(false);
  });

  it('releerla no la guarda dos veces', () => {
    const { session, glifo } = makeScene();
    tapDown(session);
    tapDown(session); // close
    tapDown(session); // and read again
    expect(session.readingLore).toBe(glifo.lore);
    expect(session.save.lore).toEqual([glifo.lore]);
  });

  it('estar frente a una inscripción le gana al menguar', () => {
    // 'down' on the ground is also the shrink. The plaque wins while you
    // are standing at one, the same way the plank-drop already does.
    const { session, player } = makeScene();
    run(session);
    expect(player.atInscription).toBe(true);
    player.x += REACH * 4 + TILE;
    run(session);
    expect(player.atInscription).toBe(false);
  });
});
