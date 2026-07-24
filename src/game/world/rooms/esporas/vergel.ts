import type { RoomData } from '../../RoomData';

/** Level 4, room 1 — The orchard: the garden's antechamber.
 *  Safe entry, a ditch that pays off (the language of holes), a
 *  plank-hat with a crystal that asks for a jump, and the spike
 *  crossing watched by the SPITTER from its mound: you read its arcs
 *  and pick the moment. The level's lure: a crystal atop a high
 *  floating slab, impossible without GLIDE — the hanging pillar
 *  blocks every diagonal arc from the left. It's collected on the way
 *  back: the plank staircase by the exit climbs to the perch, and from
 *  there you glide to the slab (jump + double jump + glide). */
export const vergel: RoomData = {
  id: 'vergel',
  mapPos: { x: 0, y: 0 },
  exits: { right: 'colonia' },
  tiles: [
    '############################################################',
    '#............................##............................#',
    '#............................##............................#',
    '#............................##............................#',
    '#............................##............................#',
    '#............................##............................#',
    '#............................##............................#',
    '#............................##....##..................---.#',
    '#............................##............................#',
    '#............................##............................#',
    '#..........................................................#',
    '#..................................................---.....#',
    '#..........................................................#',
    '#..........................................................#',
    '#..................-----...................................#',
    '#..............................................---..........',
    '#........................................####...............',
    '#.................................^^^^^..####...............',
    '#############....###########################################',
    '#############....###########################################',
    '############################################################',
  ],
  entities: [
    { type: 'playerSpawn', x: 3, y: 17 },
    // Cut into the doorpost of the orchard, two steps behind where you
    // walk in and facing the whole garden: the makers' note that none
    // of this was theirs. Main road, not a secret — most of the cave's
    // writing is out in the open, and this is the sentence the level
    // is named for.
    { type: 'glifo', x: 0, y: 17, lore: 'esp_vergel' },
    { type: 'slime', x: 9, y: 17 },
    { type: 'crystal', x: 14, y: 19 },
    { type: 'crystal', x: 21, y: 11 },
    { type: 'crystal', x: 35, y: 5 },
    { type: 'spitter', x: 42, y: 15 },
  ],
};
