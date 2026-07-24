import type { RoomData } from '../../RoomData';

/** Level 1, room 3 — The threshold: the level's exam.
 *  The entry is safe ground: the chaser stalks the middle ledge,
 *  on the far side of the first pit — you see it coming, you pick
 *  the moment (stomp it on the way down or dodge it). Two real pits
 *  (falling costs a heart), a high plank over the second one that
 *  asks for the freshly learned double jump, and a flyer prowling
 *  the crossing. The door waits above the altar… and the last
 *  crystal glints in the gap BEHIND it: senda's ditch already
 *  taught that peeking into gaps pays off. */
export const umbral: RoomData = {
  id: 'umbral',
  mapPos: { x: 2, y: 0 },
  exits: { left: 'galeria' },
  tiles: [
    '########################################################',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#..........................---..............########...#',
    '............................................########...#',
    '........................................############...#',
    '........................................################',
    '#############....########.......########################',
    '#############....########.......########################',
    '#############....########.......########################',
  ],
  entities: [
    { type: 'chaser', x: 21, y: 18 },
    { type: 'flyer', x: 35, y: 13 },
    { type: 'crystal', x: 53, y: 16 },
    { type: 'door', x: 47, y: 14 },
    // In the seam behind the door, on the rock face the last crystal
    // hides against: the level's own account of how any of this
    // started. You read it standing in the gap you came here to peek
    // into, with the door already in sight above you.
    { type: 'glifo', x: 51, y: 17, lore: 'cav_umbral' },
  ],
};
