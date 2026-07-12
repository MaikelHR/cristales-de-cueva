import type { RoomData } from '../../RoomData';

/** Level 5, room 2 — La grieta: this is where you earn the POUND.
 *  Relic on a pedestal, and the cheap lesson right after: the table has
 *  a pit capped by TWO cracked layers — the pound chains them
 *  (breaks, keeps falling, breaks) down to the crystal at the bottom; you exit
 *  with a double jump. The combat practice: an erizo prowls the ice
 *  bridge — jumping and pounding on it is its only death (and below the
 *  bridge hangs another crystal, for whoever dares the ditch). At
 *  the end, the ice ledge sits RIGHT above a cracked pocket:
 *  dropping onto it with a pound opens it — slippery floor and floor
 *  that bursts, combined. A second erizo guards the exit. */
export const grieta: RoomData = {
  id: 'grieta',
  mapPos: { x: 1, y: 0 },
  exits: { left: 'ventisca', right: 'espejo' },
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
    '#........................................................#',
    '#.............###%%####...~~~~~~~~~......................#',
    '#.............###..####...............~~~~~~~............#',
    '.......##.....###%%####...................................',
    '.......##.....###..####...................................',
    '.......##.....###..####...................................',
    '########################################%%%###############',
    '########################################...###############',
    '##########################################################',
  ],
  entities: [
    { type: 'relic', ability: 'pound', x: 7, y: 13 },
    { type: 'crystal', x: 17, y: 16 },
    { type: 'erizo', x: 30, y: 12 },
    { type: 'crystal', x: 30, y: 15 },
    { type: 'crystal', x: 41, y: 19 },
    { type: 'erizo', x: 49, y: 17 },
  ],
};
