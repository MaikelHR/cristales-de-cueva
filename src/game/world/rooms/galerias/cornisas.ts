import type { RoomData } from '../../RoomData';

/** Level 2, room 1 — Las cornisas: spikes and spring, introduced.
 *  A short strip of spikes you jump (the cheap lesson, with its
 *  crystal on top: jumping it well IS the payout), a spike field you
 *  cross by hopping stone to stone with a flyer above, and at
 *  the end a 9-tile table no jump reaches: the spring at
 *  its base does the demo on its own.
 *  Next to the exit, a 4-tile slot hangs from the ceiling with a
 *  crystal inside: you see it going by and can NOT reach it — it asks for the
 *  wall jump waiting in the chimney. It's the level's promise: coming
 *  back with the relic, the slot sits right above the entrance.
 *  The 11-wide table the spring serves is the only blank rock face in
 *  the room, and the spike gauntlet dead-ends against its foot — which
 *  is where the spring drops you, over and over, while you work out
 *  the crystal above. There is a veil across two of those columns. */
export const cornisas: RoomData = {
  id: 'cornisas',
  mapPos: { x: 0, y: 0 },
  exits: { right: 'chimenea' },
  tiles: [
    '################################################################',
    '#........................................................##....#',
    '#........................................................##....#',
    '#........................................................##....#',
    '#........................................................##....#',
    '#........................................................##....#',
    '#........................................................##....#',
    '#........................................................##....#',
    '#........................................................##....#',
    '#........................................................##....#',
    '#............................................########....##....#',
    '#............................................########..........#',
    '#............................................########..........#',
    '#............................................########..........#',
    '#............................................###########.......#',
    '#............................##..............###########.......#',
    '#........................##..##..##..........###########........',
    '#........................##..##..##.................####........',
    '#..........^^^.........^^##^^##^^##.................####........',
    '################################################################',
    '################################################################',
    '################################################################',
  ],
  entities: [
    { type: 'playerSpawn', x: 3, y: 17 },
    { type: 'crystal', x: 12, y: 15 },
    { type: 'flyer', x: 29, y: 11 },
    { type: 'spring', x: 43, y: 18 },
    { type: 'crystal', x: 48, y: 8 },
    { type: 'crystal', x: 61, y: 4 },
    // The curtain over the alcove at the table's foot, two tiles from
    // where the spring keeps setting you down.
    { type: 'velo', x: 45, y: 17, w: 2, h: 2 },
    { type: 'vestigio', x: 48, y: 18 },
    // The back wall of the alcove. Somebody sat in here and wrote down
    // the rumour, which is the first time the game says out loud that
    // there is anything above this cave at all.
    { type: 'glifo', x: 52, y: 18, lore: 'gal_rumor' },
  ],
};
