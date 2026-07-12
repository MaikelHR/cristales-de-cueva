import type { RoomData } from '../../RoomData';

/** Level 7, room 1 — La orilla: learn that water FLOATS you.
 *  A dry shelf to land on, then the water table in terraces, not one flat
 *  line. First a 3-wide ditch-pool: step in, bob, hop out (senda's ditch,
 *  reread in a new element). Then the shore SINKS two rows into a wide pool
 *  crossed at the surface, where the first MEDUSA grazes the waterline at
 *  the top of its slow bob — read its glow, wait on the rock pillar mid-way,
 *  pick the moment. Above it, a broken line of planks is the dry reading:
 *  faster, jumpier, with slip gaps. Past the pool, planks roof a pocket with
 *  a full row of air over its water: drop through (down + jump), splash, and
 *  the first crystal waits IN the surface row where a floater actually bobs
 *  — grab it and hop back out. Finally, right beside the mouth to perla, a
 *  crystal GLITTERS at the bottom of a deep sinkhole, out of reach: a
 *  floater dips half a tile and a plunge three, so it waits for the DIVE
 *  earned next door — and the corriente churning up its side column is the
 *  ride back out once you've claimed it (the jet only grips a submerged
 *  swimmer: today it's a promise, on the backtrack it's the elevator).
 *  You re-enter through that very mouth, so the backtrack is a single step. */
export const orilla: RoomData = {
  id: 'orilla',
  mapPos: { x: 0, y: 0 },
  exits: { right: 'perla' },
  tiles: [
    '############################################################',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#...........................................................',
    '#.................----..----.----...........................',
    '#...........................................................',
    '##########...###.....................#####----######=====###',
    '##########===###.........##..........#####....######=====###',
    '##########===#####=======##=======########====######=====###',
    '##################=======##=======########====######=====###',
    '##################=======##=======##################=====###',
    '##################=======##=======##################=====###',
    '############################################################',
    '############################################################',
  ],
  entities: [
    { type: 'playerSpawn', x: 3, y: 12 },
    { type: 'medusa', range: 2, x: 30, y: 16 },
    { type: 'crystal', x: 43, y: 15 }, // #1: drop through the plank, dip at the surface
    { type: 'crystal', x: 54, y: 18 }, // #2 foreshadow: deep sinkhole beside the perla mouth, dive-only
    { type: 'corriente', dir: 'up', length: 5, x: 52, y: 18 }, // the ride back out, post-dive
  ],
};
