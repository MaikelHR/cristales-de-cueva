import type { RoomData } from '../../RoomData';

/** Level 6, room 1 — El crisol: learn to read the fire.
 *  First a gentle refresher: a cracked pocket with a crystal (the
 *  pound isn't forgotten). Then the GEYSERS: three staggered mouths
 *  that sputter before erupting — you pass by reading
 *  the rhythm down low (fast) or via the plank path up
 *  top (slow and safe, with a flyer prowling): two readings.
 *  The crystal above the second geyser is stolen between eruptions — or
 *  by dropping off the plank with down + jump. The level's bait: a
 *  floating chamber with a side-facing cracked face that no pound
 *  opens — the RAM is earned in the next room. */
export const crisol: RoomData = {
  id: 'crisol',
  mapPos: { x: 0, y: 0 },
  exits: { right: 'yunque' },
  tiles: [
    '############################################################',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#....................-----------....................#####..#',
    '#...................................................#####..#',
    '#...................................................%..##..#',
    '#...................................................%..##..#',
    '#...................................................#####...',
    '#...........................................................',
    '#...........................................................',
    '##########%%%###############################################',
    '##########...###############################################',
    '############################################################',
  ],
  entities: [
    { type: 'playerSpawn', x: 3, y: 17 },
    { type: 'crystal', x: 11, y: 19 },
    { type: 'geyser', x: 18, y: 17 },
    { type: 'geyser', x: 26, y: 17, offset: 1.2 },
    { type: 'geyser', x: 34, y: 17, offset: 2.4 },
    { type: 'crystal', x: 26, y: 12 },
    { type: 'flyer', x: 30, y: 7 },
    { type: 'crystal', x: 53, y: 13 },
  ],
};
