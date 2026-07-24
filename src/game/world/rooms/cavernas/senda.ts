import type { RoomData } from '../../RoomData';

/** Level 1, room 1 — La senda: the welcome stroll.
 *  Terrain that rises one step at a time (teaches that 1 tile is
 *  jumped, not walked), a ditch with a floor that holds a crystal
 *  (the cave's first lesson: peeking into holes pays off — umbral
 *  revisits it at the end), a slime on the plateau to learn the
 *  stomp, and a plank with a crystal that teaches crossing them
 *  from below. No crystal is collected by walking straight.
 *
 *  AND, at your back on the very first screen, the game's whole
 *  hidden vocabulary in one gesture: a veil hangs over the left
 *  wall three tiles behind the spawn. Everything about this level
 *  pulls right; the one player who presses left walks through what
 *  looked like rock into `covacha`. It is deliberately the most
 *  generous secret in the game — level 1 is where "walls can be
 *  curtains" has to be TAUGHT, not tested — and the ditch's
 *  inscription teaches the other half, that some rock is written
 *  on and 'down' is how you read it. */
export const senda: RoomData = {
  id: 'senda',
  mapPos: { x: 0, y: 0 },
  exits: { left: 'covacha', right: 'galeria' },
  tiles: [
    '################################################',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#.........................---..................#',
    '#..............................................#',
    '#...............................................',
    '..............######...#########................',
    '..........##########...#############............',
    '####################...#########################',
    '################################################',
    '################################################',
  ],
  entities: [
    { type: 'playerSpawn', x: 3, y: 17 },
    { type: 'crystal', x: 21, y: 18 },
    { type: 'crystal', x: 27, y: 12 },
    { type: 'slime', x: 27, y: 16 },
    // The curtain over the mouth of `covacha`. It parts on its own as
    // you walk into it, so nobody is ever asked to trust a wall.
    { type: 'velo', x: 0, y: 17, w: 2, h: 2 },
    // Carved in the far wall of the ditch, facing the first crystal in
    // the game: you dip into a hole for the light, and the hole has
    // something to say about it.
    { type: 'glifo', x: 23, y: 19, lore: 'cav_senda' },
  ],
};
