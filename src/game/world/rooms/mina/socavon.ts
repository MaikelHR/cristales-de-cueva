import type { RoomData } from '../../RoomData';

/** Level 8, room 3 — El socavón: the exam, the Foreman and the door.
 *  The gauntlet quotes the level in two pits before the arena: first a
 *  SPIKE pit crossed on boards that snap loose behind you (no stalling
 *  — a fall costs a heart and returns you to the last firm ground),
 *  then a breather, then the TOPO's open pit, which you cross on foot
 *  reading the mound. The arena's doorway is a 3-tile burrow you enter
 *  SHRUNKEN — the room is entered small, on purpose.
 *  Inside, the mine's great low gallery: 32 tiles of fighting floor
 *  under a 5-tile roof with rock teeth hanging from it, so there's air
 *  to run, jump and bait, but never a clean flight over him. The
 *  CAPATAZ DE HIERRO marches; he never hurries. His shovel front
 *  shrugs off stomp and pound alike, and the lantern on his back is
 *  the only thing that breaks. The entry burrow and the far-wall
 *  tunnel are the flanking routes: shrink in, let him grind past, slip
 *  out BEHIND him while he takes his slow half-turn — that turn is the
 *  whole window, and each hit enrages him. A crystal hangs between two
 *  ceiling teeth mid-arena (a jump across his lane); past the far
 *  tunnel, the door's tall chamber holds the last one, a double jump
 *  up. The door opens when the lantern goes dark. */
export const socavon: RoomData = {
  id: 'socavon',
  mapPos: { x: 2, y: 0 },
  exits: { left: 'veta' },
  tiles: [
    '############################################################################',
    '############################################################################',
    '############################################################################',
    '############################################################################',
    '############################################################################',
    '############################################################################',
    '############################################################################',
    '#.............................##############################################',
    '#.............................##############################################',
    '#.............................#####################################........#',
    '#.............................#####################################........#',
    '#.............................#####################################........#',
    '#.............................###.....#.....#.....#.....#.....#..##........#',
    '#.............................###................................##........#',
    '#.............................###................................##........#',
    '..............................###................................##........#',
    '......................................................................##...#',
    '######........####..........################################################',
    '######........##############################################################',
    '######^^^^^^^^##############################################################',
    '############################################################################',
  ],
  entities: [
    { type: 'crumble', x: 6, y: 17 },  // the spike pit, board by board...
    { type: 'crumble', x: 9, y: 17 },
    { type: 'crumble', x: 12, y: 17 },
    { type: 'topo', x: 22, y: 17 },    // ...and then the mole's open pit
    { type: 'capataz', x: 48, y: 16 }, // the boss, mid-gallery
    { type: 'crystal', x: 47, y: 13 }, // #7: between two ceiling teeth, across his lane
    { type: 'crystal', x: 72, y: 10 }, // #8: the chamber, a double jump up
    { type: 'door', x: 70, y: 15 },
  ],
};
