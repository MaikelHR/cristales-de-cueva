import type { RoomData } from '../../RoomData';

/** Level 3, room 3 — The sanctuary: the guardian and the door.
 *  A clean arena of solid floor (the fight is already plenty): two
 *  side ledges for gaining height and a plank springboard centered
 *  WELL above the guardian's patrol — two full tiles of air between
 *  the plank and its highest bob, so the diving stomp lands clean
 *  and the plank never "catches" the jump (a plank stuck to the boss
 *  eats the stomp arc). The last crystal floats above the plank —
 *  claiming it is part of the duel. From the plank, down + jump drops
 *  through it: the diving stomp lands straight onto the guardian's
 *  patrol. The door waits on the altar, closed until the end.
 *  And the altar is HOLLOW. Forty tiles of dead-flat arena run east
 *  into a blank twelve-wide face, and the last two rows of it are a
 *  curtain: the alcove behind sits directly under the door, which is
 *  where the people who left something minding this place wrote down
 *  what they had done. This level has no pound and no smash, so the
 *  way in is a veil — walk at it and it parts. */
export const santuario: RoomData = {
  id: 'santuario',
  mapPos: { x: 2, y: 0 },
  exits: { left: 'abismo' },
  tiles: [
    '########################################################',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#.......................--------.......................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '...........######...................######.............#',
    '.......................................................#',
    '................................................########',
    '########........................................########',
    '########....................................############',
    '#..................................................#####',
    '#..................................................#####',
    '########################################################',
    '########################################################',
    '########################################################',
  ],
  entities: [
    { type: 'boss', x: 26, y: 9 },
    { type: 'crystal', x: 27, y: 3 },
    { type: 'door', x: 50, y: 13 },
    // The curtain at the foot of the altar, right where the climb to
    // the door starts.
    { type: 'velo', x: 44, y: 17, w: 2, h: 2 },
    { type: 'vestigio', x: 47, y: 18 },
    // The back wall of the alcove, under the door itself.
    { type: 'glifo', x: 51, y: 18, lore: 'cor_ensayo' },
  ],
};
