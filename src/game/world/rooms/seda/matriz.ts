import type { RoomData } from '../../RoomData';

/** Level 9, room 3 — La matriz: the exam, the Matriarch and the door.
 *  One more crossing first, the widest yet (20 tiles out of a low
 *  tunnel, so the glide has nothing to give), and now the beads are
 *  GUARDED: two TEJEDORAS hang over the arc's lane and drop through it
 *  when you pass beneath. Their thread shivers first, so it's a beat to
 *  read: swing early, or hold the arc and cross once they've fallen.
 *  Then the balcony, and her chamber — a hall 38 tiles wide spanned by
 *  five beads. The MATRIARCA hangs from the ceiling, walks it slowly,
 *  and spits venom at the floor. Her body burns and no stomp climbs
 *  that high: what you cut is her THREAD. Swing across it (passing over
 *  her back counts — the cut is checked before her body) and the silk
 *  parts; she drops, cracks on the floor and lies stunned, and THAT is
 *  when you jump on her. The HUD says which of the two you're doing.
 *  Three times; each time she climbs a new thread further along the
 *  ceiling, so you pick the bead that lines up and go again. Her beads
 *  sit to either SIDE of her patrol, never under it: a swing's low
 *  point is beneath its anchor, and it climbs at the ends. The door
 *  waits past her, its crystal high on the last arc. */
export const matriz: RoomData = {
  id: 'matriz',
  mapPos: { x: 2, y: 0 },
  exits: { left: 'cuna' },
  tiles: [
    '################################################################################',
    '################################################################################',
    '################################################################################',
    '###########....................##########......................................#',
    '###########....................##########......................................#',
    '###########....................##########......................................#',
    '###########....................##########......................................#',
    '###########....................##########......................................#',
    '#..............................................................................#',
    '...............................................................................#',
    '...............................................................................#',
    '###########....................##########......................................#',
    '###########....................##########......................................#',
    '###########....................##########......................................#',
    '###########....................##########......................................#',
    '###########....................##########......................................#',
    '###########....................##########......................................#',
    '###########....................#################################################',
    '###########....................#################################################',
    '###########^^^^^^^^^^^^^^^^^^^^#################################################',
    '################################################################################',
  ],
  entities: [
    // The guarded crossing (cols 11-30), out of a low tunnel: beads at
    // lip height, close enough that stepping off catches the first.
    { type: 'ancla', length: 6, x: 12, y: 2 },
    { type: 'ancla', length: 6, x: 18, y: 2 },
    { type: 'ancla', length: 6, x: 24, y: 2 },
    { type: 'tejedora', drop: 8, x: 16, y: 3 }, // posted in the arc's lane
    { type: 'tejedora', drop: 8, x: 22, y: 3 },
    { type: 'crystal', x: 22, y: 8 }, // #5: on the guarded handover
    // Her chamber (cols 41-78). She hangs low enough that her thread
    // crosses the arc's own lane, and her beads FLANK her patrol (a
    // swing's low point is under its anchor; it climbs at the ends).
    { type: 'matriarca', x: 58, y: 6 },
    { type: 'ancla', length: 6, x: 42, y: 2 }, // the one you step onto from the balcony
    { type: 'ancla', length: 8, x: 45, y: 2 },
    { type: 'ancla', length: 8, x: 52, y: 2 },
    { type: 'ancla', length: 8, x: 59, y: 2 },
    { type: 'ancla', length: 8, x: 66, y: 2 },
    { type: 'ancla', length: 8, x: 73, y: 2 },
    { type: 'crystal', x: 69, y: 7 },  // #6: high on the last arc
    { type: 'door', x: 76, y: 15 },
  ],
};
