import type { RoomData } from '../../RoomData';

/** Level 8, room 1 — La bocamina: the mine teaches its two dangers.
 *  You land on the old entrance platform and step down into the
 *  gallery. First lesson, CHEAP: a single CRUMBLE board over a
 *  knee-deep ditch — it shudders underfoot and drops you one tile (a
 *  lesson, not a wound). Then the same lesson for keeps: a board
 *  bridge with gaps over a SPIKE pit — hop board to board without
 *  stalling, because each one snaps loose behind you and the fall
 *  bites (a death returns you to the last firm ground you stood on).
 *  Its crystal floats over the second gap: grabbed mid-crossing. The
 *  long raised bench is the TOPO's stretch: all you see is the mound
 *  tracking your feet; stand still and it quakes, then bursts. Its
 *  crystal floats over the middle of the stretch — a deliberate jump
 *  inside its territory. The level's promise sits right at the exit:
 *  a 1-tile burrow glowing in the bench's flank with a crystal deep
 *  inside — nothing full-sized fits through. The SHRINK is earned
 *  next door, and you re-enter one step from this very slot. */
export const bocamina: RoomData = {
  id: 'bocamina',
  mapPos: { x: 0, y: 0 },
  exits: { right: 'veta' },
  tiles: [
    '############################################################',
    '############################################################',
    '############################################################',
    '############################################################',
    '############################################################',
    '############################################################',
    '############################################################',
    '#............#...............#....................#........#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#########..................................................#',
    '#########..................................................#',
    '###########....................################.............',
    '###########....................###########..................',
    '#################..##........###############################',
    '#################..##........###############################',
    '#####################^^^^^^^^###############################',
    '############################################################',
  ],
  entities: [
    { type: 'playerSpawn', x: 3, y: 12 },
    { type: 'crumble', x: 17, y: 17 }, // the cheap lesson: one board, one tile
    { type: 'crumble', x: 21, y: 17 }, // the bridge with gaps...
    { type: 'crumble', x: 24, y: 17 },
    { type: 'crumble', x: 27, y: 17 },
    { type: 'crystal', x: 26, y: 15 }, // #1: over the second gap, mid-crossing
    { type: 'topo', x: 38, y: 14 },    // the bench is its stretch
    { type: 'crystal', x: 38, y: 12 }, // #2: a deliberate jump inside its territory
    { type: 'crystal', x: 43, y: 16 }, // #3 foreshadow: deep in the 1-tile burrow (shrink-only)
  ],
};
