import type { RoomData } from '../../RoomData';

/** Level 4, room 3 — The chalices: the glide exam.
 *  You enter from up HIGH. The whole gorge is a bed of spikes; the
 *  master line is a flight with two relays: glide from the ledge to
 *  the first updraft, rise, glide again to the second and drop onto
 *  the door's plateau (a crystal floats right on the line). The
 *  second reading, for the time trial: the teeth flush with the
 *  spikes chain together with dash — faster, no net, with its own
 *  crystal and a spitter watching it. Falling onto clear ground
 *  (below the plateau) has a rescue: you climb its wall. Behind the
 *  door, a pit hides the last crystal — you walk down and come back
 *  up by wall-jumping (the exam quotes level 2). */
export const copas: RoomData = {
  id: 'copas',
  mapPos: { x: 2, y: 0 },
  exits: { left: 'colonia' },
  tiles: [
    '################################################################',
    '#..............................................................#',
    '#..............................................................#',
    '...............................................................#',
    '...............................................................#',
    '...............................................................#',
    '#########......................................................#',
    '#########......................................................#',
    '#...................................................#######....#',
    '#...................................................#######....#',
    '#...................................................#######....#',
    '#....---............................................#######....#',
    '#...................................................#######....#',
    '#...................................................#######....#',
    '#...................................................#######....#',
    '#.---...............................................#######....#',
    '#.............##.....##.....##......##.....##.......#######....#',
    '#.............##.....##.....##......##.....##.......#######....#',
    '#.............##.....##.....##......##.....##.......############',
    '#...........^^##^^^^^##^^^^^##^^^^^^##^^^^^##^^.....############',
    '################################################################',
  ],
  entities: [
    { type: 'vent', x: 28, y: 15, height: 11 },
    { type: 'vent', x: 43, y: 15, height: 11 },
    { type: 'spitter', x: 21, y: 15 },
    { type: 'spitter', x: 49, y: 19 },
    { type: 'crystal', x: 35, y: 7 },
    { type: 'crystal', x: 32, y: 15 },
    { type: 'crystal', x: 61, y: 15 },
    { type: 'door', x: 55, y: 7 },
  ],
};
