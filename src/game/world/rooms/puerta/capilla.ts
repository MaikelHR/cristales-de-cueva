import type { RoomData } from '../../RoomData';

/** Level 10, room 5 — The chapel: the breather before the door. No
 *  wards, no sentries — a quiet nave where two tall statues of the
 *  Custodio flank a narrow shaft: wall-jump up between them for the
 *  crystal floating over their crowns (the room is TELLING you who
 *  waits next door). The great stair climbs to the lintel; a cracked
 *  face under its second step hides the other crystal — the smash
 *  opens it. Catch your breath: past the top step, the fight. */
export const capilla: RoomData = {
  id: 'capilla',
  mapPos: { x: 4, y: 0 },
  exits: { left: 'espira', right: 'dintel' },
  tiles: [
    '############################################',
    '#..........................................#',
    '#..........................................#',
    '#..........................................#',
    '#...........................................',
    '#...........................................',
    '#...........................................',
    '#......................................#####',
    '#......................................#####',
    '#......................................#####',
    '#.............#....#................########',
    '#.............#....#................########',
    '#.............#....#................########',
    '#.............#....#..........####..########',
    '#.............#....#..........####..########',
    '#.............#....#..........####..########',
    '#.............#....#..........####..########',
    '..............#....#....####..####..#......#',
    '..............#....#....####..%.....*......#',
    '..............#....#....####..%.....*......#',
    '############################################',
    '############################################',
    '############################################',
    '############################################',
  ],
  entities: [
    { type: 'crystal', x: 16, y: 9 },
    { type: 'crystal', x: 32, y: 18 },
    // The nave's own wall, at the height of anyone walking it: the
    // Custodio on a slab with hands bent over it. The room already says
    // who waits next door with two statues; this says where it came
    // from. Nothing collides with it — you walk past and it is there.
    { type: 'mural', art: 'custodio', x: 3, y: 13 },
    // THE SECRET. You smash the cracked face, take the crystal — and
    // the pocket dead-ends five tiles into an eight-tile wall, with the
    // verb that opened it still in your hands. The east face is false
    // too: dash it and the chapel's back room opens, and the makers'
    // own account of what they cast is on the wall of it. (Cols 37-42 x
    // rows 17-19; the entry is at floor level, so you walk back out.)
    { type: 'vestigio', x: 40, y: 18 },
    { type: 'glifo', lore: 'pue_capilla', x: 43, y: 19 },
  ],
};
