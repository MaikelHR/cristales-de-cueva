import type { RoomData } from '../../RoomData';

/** Level 9, room 1 — El telar: the nest introduces itself.
 *  Safe entry ground, and the first thing you meet is a TEJEDORA — the
 *  game's first ceiling dweller. It hangs still until you cross the air
 *  beneath it; then its thread SHIVERS (the tell) and it drops, paying
 *  out silk ALL THE WAY TO THE FLOOR, right through the lane you were
 *  walking. Read the beat and wait, or stomp its back as it hangs.
 *  The cheap lesson follows: a 5-wide spike pit a plain jump clears,
 *  its crystal on the jump line. Then the promise: a bead of silk sways
 *  over the wide pit, and eleven tiles up — past anything a double jump
 *  reaches — a crystal hangs in the web. Touch the bead today and
 *  nothing happens. The pit itself is crossable (this room is all one
 *  tall cavern, so the glide still carries you over), so the way onward
 *  never depends on it: what the crystal needs is the arc, the one move
 *  that ENDS HIGHER than it began. You come back through this mouth. */
export const telar: RoomData = {
  id: 'telar',
  mapPos: { x: 0, y: 0 },
  exits: { right: 'cuna' },
  tiles: [
    '############################################################',
    '############################################################',
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
    '#..........................................................#',
    '#..........................................................#',
    '#...........................................................',
    '#...........................................................',
    '###################.....#########.............##############',
    '###################.....#########.............##############',
    '###################^^^^^#########^^^^^^^^^^^^^##############',
    '############################################################',
  ],
  entities: [
    { type: 'playerSpawn', x: 3, y: 15 },
    { type: 'tejedora', x: 12, y: 3 },          // drops all the way to the floor
    { type: 'crystal', x: 21, y: 14 },          // #1: over the cheap pit, on the jump line
    { type: 'ancla', length: 11, x: 39, y: 3 }, // the promise: a bead that does nothing yet
    { type: 'crystal', x: 33, y: 5 },           // #2: eleven tiles up — arc only
  ],
};
