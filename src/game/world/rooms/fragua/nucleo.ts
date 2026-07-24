import type { RoomData } from '../../RoomData';

/** Level 6, room 3 — The core: the Ariete Ígneo and the door.
 *  A GROUND arena, nothing like the sanctuary: the boss patrols
 *  and CHARGES along the floor. The stone threshold (left) and the
 *  door's altar (right) are its crash walls — that's where it gets
 *  stunned and stomped. The two cracked barricades in the middle are
 *  shelter... until a charge smashes them to bits: the arena keeps
 *  getting stripped bare as the fight goes on. The high ledge on the
 *  left is the only fixed shelter (its crystal asks for one more
 *  jump), but the ember rain from every slam reaches everywhere.
 *  Dodging = jumping over it or climbing onto something; hurting it
 *  = stomping it ONLY while stunned (the red-hot plate burns, as the
 *  erizo taught). */
export const nucleo: RoomData = {
  id: 'nucleo',
  mapPos: { x: 2, y: 0 },
  exits: { left: 'yunque' },
  tiles: [
    '##########################################################',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#.........#####..........................................#',
    '#........................................................#',
    '#...............................................#**#######',
    '................................................#.......##',
    '.....#..............%%...............%%.........#.......##',
    '.....#..............%%...............%%.........#.......##',
    '##########################################################',
    '##########################################################',
    '##########################################################',
  ],
  entities: [
    { type: 'ariete', x: 30, y: 17 },
    { type: 'crystal', x: 12, y: 8 },
    { type: 'door', x: 51, y: 13 },
    // THE ALTAR IS HOLLOW. You climb onto it at its west lip to reach
    // the door, and two tiles of its top are false floor: the seam
    // lights and dust sifts while you walk the last three steps of the
    // level. Pound it and the forge's own ledger is underneath — the
    // list of everything cast here, and the picture of the one thing on
    // it that has no name. The ram never finds it: its charge only
    // breaks what is in rows 16-17, and column 48 (its crash wall)
    // stays solid rock all the way down.
    { type: 'mural', art: 'custodio', x: 49, y: 15 },
    { type: 'glifo', lore: 'fra_cuenta', x: 51, y: 17 },
    { type: 'vestigio', x: 55, y: 17 },
  ],
};
