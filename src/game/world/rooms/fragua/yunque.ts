import type { RoomData } from '../../RoomData';

/** Level 6, room 2 — The anvil: here you earn the SMASH.
 *  Relic on a pedestal and the lesson-tunnel right after: two cracked
 *  partitions that the dash shatters without slowing (the ceiling is
 *  so high you can't jump over). A little pit pays off later.
 *  The practice combines fire and crack: a geyser guards a cracked
 *  gate three thick — you smash through between eruptions. The hollow
 *  anvil hides a crystal behind a cracked band three thick (one smash
 *  goes clean through; bands always span the FULL thickness of the
 *  wall, never framed by rock on the sides). The exit tower only opens
 *  through its cracked portal, and the chimney beside it quotes the
 *  level 2 exam: wall-jump up to the crystal above. */
export const yunque: RoomData = {
  id: 'yunque',
  mapPos: { x: 1, y: 0 },
  exits: { left: 'crisol', right: 'nucleo' },
  tiles: [
    '############################################################',
    '#....................................................##....#',
    '#.............................................###....##....#',
    '#.............................................###....##....#',
    '#.............................................###....##....#',
    '#.............................................###....##....#',
    '#............#########........................###....##....#',
    '#............#########........................###....##....#',
    '#............#########........................###....##....#',
    '#............#########..........###...........###....##....#',
    '#............#########..........###...........###....##....#',
    '#............#########..........###...........###....##....#',
    '#............#########..........###.....#########....##....#',
    '#............#########..........###.....#########....##....#',
    '#............#########..........###.....#########..........#',
    '.......##....#########..........###.....###...###...........',
    '.......##......%...%............%%%.....%%%...%%%...........',
    '.......##......%...%............%%%.....%%%...%%%...........',
    '#######################..###################################',
    '#######################..###################################',
    '############################################################',
  ],
  entities: [
    { type: 'relic', ability: 'smash', x: 7, y: 13 },
    { type: 'crystal', x: 23, y: 19 },
    { type: 'geyser', x: 29, y: 17 },
    { type: 'crystal', x: 44, y: 15 },
    { type: 'crystal', x: 50, y: 3 },
  ],
};
