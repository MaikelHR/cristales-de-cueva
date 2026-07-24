import type { RoomData } from '../../RoomData';

/** Level 10, room 6 — The lintel: the Custodio and the great door.
 *  You enter on a high ledge and watch the arena before dropping in:
 *  the warden sleeps mid-air until you come close. The fight is the
 *  sanctum's danmaku turned against you — rings, spirals, curtains
 *  with one walking gap — and its halo names the verb each life
 *  demands (gold stomp, cyan dash-lunge, violet pound). The three
 *  blink platforms are how you reach it: the cyan daze hangs in
 *  MID-AIR, so you dash from a slab that may vanish under you
 *  mid-approach. The door waits on the altar at the right; a
 *  smash-crack under it hides the last crystal, and the one over the
 *  center slab asks a jump off a platform that is only sometimes
 *  there. Falling anywhere lands on the arena floor; the entry wall
 *  climbs back out (wall jumps). */
export const dintel: RoomData = {
  id: 'dintel',
  mapPos: { x: 5, y: 0 },
  exits: { left: 'capilla' },
  tiles: [
    '########################################################',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '.......................................................#',
    '.......................................................#',
    '.......................................................#',
    '#########..............................................#',
    '#########..............................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#............................................###########',
    '#............................................###########',
    '#............................................###########',
    '#............................................###########',
    '#............................................%......####',
    '#............................................%......####',
    '########################################################',
    '########################################################',
    '########################################################',
    '########################################################',
  ],
  entities: [
    { type: 'blink', x: 12, y: 14 },
    { type: 'blink', x: 24, y: 11, offset: 2.2 },
    { type: 'blink', x: 36, y: 14, offset: 1.1 },
    { type: 'crystal', x: 25, y: 9 },
    { type: 'custodio', x: 26, y: 13 },
    { type: 'crystal', x: 49, y: 18 },
    // The last thing written on this side, and it is on the OUTSIDE
    // face of the door's own wall — head height above the cracked block
    // you smash for the final crystal, so you stand under it anyway.
    // Not past the door: crossing that ends the run, and an inscription
    // nobody can reach is a blank wall.
    { type: 'glifo', lore: 'pue_dintel', x: 45, y: 17 },
    { type: 'door', x: 52, y: 12 },
  ],
};
