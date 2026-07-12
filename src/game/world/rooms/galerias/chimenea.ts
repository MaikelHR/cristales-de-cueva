import type { RoomData } from '../../RoomData';

/** Level 2, room 2 — The chimney: this is where you earn the wall jump.
 *  Double-height room: you enter on a mid-height ledge and the only
 *  way forward is to LET YOURSELF DROP to the bottom of the pit, where
 *  the relic waits (impossible to miss). The climb back up is the
 *  lesson: a narrow 30-tile chimney scaled by pure wall jumping, with
 *  a plank to catch your breath (and its crystal) and a flyer playing
 *  goalkeeper. The plank covers HALF the gap: hugging the right wall
 *  leaves the lane to drop back down. Exit up and to the right.
 *  The left channel (where you fall in on entry) is CAPPED at the top:
 *  it's not a shortcut to the exit. But you CAN climb up to the entry
 *  ledge — a rib of rock forms the chimney back to cornisas, for the
 *  crystal left pending over there (visible in passing and it demands
 *  a wall jump). In the bottom chamber, a chaser guards the other
 *  crystal. */
export const chimenea: RoomData = {
  id: 'chimenea',
  mapPos: { x: 1, y: 0 },
  exits: { left: 'cornisas', right: 'salida' },
  tiles: [
    '####################################',
    '#..................................#',
    '#..................................#',
    '#...................................',
    '#...................................',
    '#...................................',
    '############.....###################',
    '############.....###################',
    '#.........##....##.................#',
    '#.........##....##.................#',
    '#.........##....##.................#',
    '#.........##....##.................#',
    '#.........##....##.................#',
    '#.........##....##.................#',
    '#.........##....##.................#',
    '#.........##....##.................#',
    '..........##....##.................#',
    '..........##....##.................#',
    '..........##....##.................#',
    '#######...##....##.................#',
    '#######...##....##.................#',
    '#.........##....##.................#',
    '#.........##....##.................#',
    '#.........##....##.................#',
    '#.........##--..##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#.........##....##.................#',
    '#............##....................#',
    '#............##....................#',
    '####################################',
    '####################################',
    '####################################',
  ],
  entities: [
    { type: 'relic', ability: 'wallJump', x: 13, y: 37 },
    { type: 'crystal', x: 13, y: 22 },
    { type: 'flyer', x: 13, y: 30 },
    { type: 'crystal', x: 27, y: 38 },
    { type: 'chaser', x: 30, y: 41 },
  ],
};
