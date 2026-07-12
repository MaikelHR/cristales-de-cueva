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
    '#...............................................##########',
    '................................................##########',
    '.....#..............%%...............%%.........##########',
    '.....#..............%%...............%%.........##########',
    '##########################################################',
    '##########################################################',
    '##########################################################',
  ],
  entities: [
    { type: 'ariete', x: 30, y: 17 },
    { type: 'crystal', x: 12, y: 8 },
    { type: 'door', x: 51, y: 13 },
  ],
};
