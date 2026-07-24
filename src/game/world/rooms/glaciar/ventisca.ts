import type { RoomData } from '../../RoomData';

/** Level 5, room 1 — La ventisca: learn to walk on ice.
 *  Start on firm rock; the first icy lane teaches the sliding
 *  without punishment. The pit pays (crystal inside). In the second lane
 *  the first ERIZO patrols: stomping it hurts and there's no answer yet
 *  — you wait it out, jump it on ice (risky) or cross
 *  via the plank bridge (safe): two readings. The chimney of
 *  icy pillars quotes the wall jump with a reward up top. The
 *  level's bait: next to the exit, a glint leaks through a
 *  cracked floor that nothing you carry breaks — the POUND is
 *  learned in the next room and the return trip is three steps. */
export const ventisca: RoomData = {
  id: 'ventisca',
  mapPos: { x: 0, y: 0 },
  exits: { right: 'grieta' },
  tiles: [
    '##########################################################',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................~~....~~........#',
    '#........................................~~....~~........#',
    '#........................................~~....~~........#',
    '#........................................~~....~~........#',
    '#........................................~~....~~........#',
    '#........................................~~....~~........#',
    '#............................-------.....~~....~~........#',
    '#........................................~~....~~.........',
    '#.........................................................',
    '#......................................#..................',
    '###########~~~~~~~~~~~~~....~~~~~~~~~~~#########***#%%%###',
    '########################....####################...#...###',
    '##########################################################',
  ],
  entities: [
    { type: 'playerSpawn', x: 3, y: 17 },
    { type: 'crystal', x: 25, y: 19 },
    { type: 'erizo', x: 33, y: 17 },
    // At the foot of the frozen pillars, on the flat rock everyone
    // crosses to reach the exit: the one place in the level where the
    // ice is a thing that KEEPS something.
    { type: 'glifo', lore: 'gla_ventisca', x: 41, y: 17 },
    { type: 'crystal', x: 44, y: 7 },
    { type: 'crystal', x: 53, y: 19 },
    // TWO HOLLOWS IN THE SAME FLOOR AND ONLY ONE OF THEM SAYS SO. Two
    // tiles west of the level's advertised cracked floor — the one you
    // are walking back here to open, with the pound you just earned —
    // the rock does the same thing and wears no fissure. You cross it
    // both ways, so the seam lights under your feet coming and going.
    // (Deliberately NOT in grieta's crack chain: a pound that shatters
    // its whole footing keeps diving, so a false floor under those two
    // taught layers would open itself on the room's own lesson.)
    { type: 'vestigio', x: 49, y: 19 },
  ],
};
