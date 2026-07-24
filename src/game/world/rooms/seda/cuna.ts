import type { RoomData } from '../../RoomData';

/** Level 9, room 2 — La cuna: here you earn the COLUMPIO, and the room
 *  is shaped so that nothing else gets you across.
 *  The measurement that built it: from a ledge, jump + dash + double
 *  jump reaches 9.6 tiles — but ADD THE GLIDE and it reaches 27.6, which
 *  crosses any honest chasm. The glide needs height, though, and height
 *  comes from the double jump. So every ledge here is a LOW TUNNEL:
 *  three tiles of headroom, enough to walk and to hop, not enough to
 *  climb. You step out of the tunnel with no altitude to spend, and the
 *  glide just sinks into the spikes.
 *  The chasms answer with the opposite: tall caverns, because a long
 *  rope is a long arc (hanging from L and pumping lifts you 0.5·L and
 *  carries you 0.87·L). One 18-tile crossing on two beads — release at
 *  the top of the first, catch the second mid-flight — and one of 20 on
 *  three, each rope shorter than the last so the relay walks you UP to
 *  an exit six tiles above where the room started. Crystals ride the
 *  handovers, where you're already flying. */
export const cuna: RoomData = {
  id: 'cuna',
  mapPos: { x: 1, y: 0 },
  exits: { left: 'telar', right: 'matriz' },
  tiles: [
    '############################################################################',
    '############################################################################',
    '############################################################################',
    '#############....................##########....................#############',
    '#############....................##########....................#############',
    '#############....................##########....................#############',
    '#############....................##########....................#############',
    '#############....................##########....................#############',
    '#############....................##########................................#',
    '#############....................##########.................................',
    '#############....................##########.................................',
    '#############..................................................#############',
    '#############..................................................#############',
    '#############..................................................#############',
    '#................................####**####....................#############',
    '.................................##......##....................#############',
    '.................................##......##....................#############',
    '#############....................##......##....................#############',
    '#############....................##########....................#############',
    '#############^^^^^^^^^^^^^^^^^^^^##########^^^^^^^^^^^^^^^^^^^^#############',
    '############################################################################',
  ],
  entities: [
    { type: 'relic', ability: 'swing', x: 5, y: 16 },
    // Chasm 1 (cols 13-32). Out of a low tunnel you leave with no
    // altitude, so the first bead hangs CLOSE and at lip height: step
    // off and the silk takes you. Long ropes, because a long rope is a
    // long arc — three of them span the twenty tiles, with margin (the
    // full no-swing arsenal dies at c30, and the far lip is at c33).
    { type: 'ancla', length: 12, x: 14, y: 2 }, // one tile out, at lip height
    { type: 'ancla', length: 12, x: 22, y: 2 },
    { type: 'ancla', length: 11, x: 29, y: 2 },
    { type: 'crystal', x: 18, y: 11 }, // #3: on the first handover
    // Painted across the back wall of the first chasm, where nobody can
    // do anything but look at it: you are ON a rope, mid-arc, over the
    // spikes, and the wall behind you shows a line going up with a gap
    // in it. Scenery, not a stop — a mural is a thing a room HAS.
    { type: 'mural', art: 'caida', x: 17, y: 5 },
    // Chasm 2 (cols 43-62): three beads, ropes shortening as it climbs
    // to an exit six tiles above where the room began.
    { type: 'ancla', length: 9, x: 44, y: 2 },
    { type: 'ancla', length: 9, x: 52, y: 2 },
    { type: 'ancla', length: 8, x: 59, y: 2 },
    { type: 'crystal', x: 49, y: 8 }, // #4: the top of the middle arc
    // THE SECRET, inside the pier between the two chasms. That tunnel
    // floor is the only standing rock in the room that neither throws
    // you nor kills you — ten flat tiles serving no route at all — so
    // two of them are false. Pound and you drop into the vault under
    // the breather. (Cols 35-40 x rows 15-17; the hole is two tiles
    // wide and a double jump lifts you back out through it. The other
    // eight tiles of tunnel floor stay, so the crossing still works.)
    { type: 'vestigio', x: 39, y: 16 },
  ],
};
