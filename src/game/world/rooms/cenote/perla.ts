import type { RoomData } from '../../RoomData';

/** Level 7, room 2 — La perla: here you earn the DIVE.
 *  First half dry: climb the shelves to the lip and POUND down a chain of
 *  cracked floors, plunging into the flooded vault below. The Perla Abisal
 *  floats just under the surface — grab it as a floater and the depths open.
 *  The shaft you fell down is a 4-wide wall-jump chimney, so anyone who
 *  wants back out before diving still can. Onward there is exactly one door:
 *  a rock curtain drops into the water, and the ONLY way past is to DIVE
 *  under it (a floater can't reach the gap; the dive IS the exit). The second
 *  half is all underwater: ride the CORRIENTE loop for the third crystal, time
 *  a MEDUSA gate in the flow, then a wide ANGUILA lane with room to dodge its
 *  dart — the stun after it begs the first dash-lunge kill (the lunge is a
 *  weapon). The fourth crystal sits atop an up-jet you can't swim down against:
 *  route around, in from the deep tunnel, and let the current lift you to it. */
export const perla: RoomData = {
  id: 'perla',
  mapPos: { x: 1, y: 0 },
  exits: { left: 'orilla', right: 'guarida' },
  tiles: [
    '############################################################',
    '#..............#........##.................................#',
    '#..............#........##.................................#',
    '#..............#........##.................................#',
    '#..............#........##.................................#',
    '#..............#........##.................................#',
    '#..............#........##.................................#',
    '#..............#........##.................................#',
    '#..............#........##.................................#',
    '#.......###....#........##.................................#',
    '........###....#........##..................................',
    '.....######%%%%#........##..................................',
    '.....######....#........##..................................',
    '###########%%%%.........##........................##########',
    '###########=============##========================##########',
    '###########=============##==================#=#===##########',
    '###########=============##==================#=#===##########',
    '###########=============##==================#=#===##########',
    '###########=======================================##########',
    '###########=======================================##########',
    '############################################################',
  ],
  entities: [
    { type: 'relic', ability: 'dive', x: 16, y: 14 }, // the Perla Abisal
    { type: 'corriente', dir: 'up', length: 4, x: 28, y: 18 },
    { type: 'corriente', dir: 'right', length: 4, x: 29, y: 15 },
    { type: 'crystal', x: 31, y: 15 }, // #3: ride the loop
    { type: 'medusa', range: 2, x: 33, y: 16 },
    { type: 'anguila', axis: 'x', range: 3, x: 38, y: 17 }, // wide lane cols 35-41
    { type: 'corriente', dir: 'up', length: 4, x: 45, y: 18 }, // opposing jet
    { type: 'crystal', x: 45, y: 17 }, // #4: route in from the deep tunnel
  ],
};
