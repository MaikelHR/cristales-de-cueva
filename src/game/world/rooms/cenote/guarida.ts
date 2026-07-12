import type { RoomData } from '../../RoomData';

/** Level 7, room 3 — La guarida: the exam, the Ajolote and the door.
 *  A flooded gauntlet that quotes the whole world: DIVE in past a bottom
 *  CORRIENTE (the fast line rides it under the first ANGUILA), SMASH the
 *  cracked base of a rock wall that dips into the water (the lunge shatters
 *  it as any dash would), and behind it a second anguila lane guards the
 *  fifth crystal. Then surface and POUND a chain of cracked floors down into
 *  a deep pocket that empties into the arena.
 *  The AJOLOTE is nothing like the flyer or the ram: it circles UNDERWATER,
 *  where its body hurts but the water doesn't, boils bubbles under one of the
 *  three islet-planks as a tell, then BREACHES in an arc over it — its crest
 *  glows gold and is stompable ONLY at the top of the arc, its flanks burn.
 *  Three stomps; every hit spawns a medusa into the pool, so falling in bites.
 *  Fight it dry, on the planks (three tiles of air over the water so the
 *  breach clears and the stomp lands). The door waits on dry ground beyond. */
export const guarida: RoomData = {
  id: 'guarida',
  mapPos: { x: 2, y: 0 },
  exits: { left: 'perla' },
  tiles: [
    '##########################################################',
    '#.............##.........................................#',
    '#.............##.........................................#',
    '#.............##.........................................#',
    '#.............##.........................................#',
    '#.............##.........................................#',
    '#.............##.........................................#',
    '#.............##.........................................#',
    '#.............##.........................................#',
    '#.............##.........................................#',
    '..............##.........................................#',
    '..............##..................--..--..--.............#',
    '..............##.........................................#',
    '#####.........##.......##..#.............................#',
    '#####=========%%=======##..#======================########',
    '#####=========%%=======##%%#======================########',
    '#####=========%%=======##..#======================########',
    '#####=========%%=======##%%#======================########',
    '#####=========%%=======##=========================########',
    '#####=========%%=======##=========================########',
    '##########################################################',
  ],
  entities: [
    { type: 'corriente', dir: 'right', length: 6, x: 6, y: 19 },
    { type: 'anguila', axis: 'x', range: 2, x: 9, y: 17 }, // lane 1 (cols 7-11)
    { type: 'anguila', axis: 'x', range: 2, x: 18, y: 17 }, // lane 2 (cols 16-20), guards #5
    { type: 'crystal', x: 20, y: 17 }, // #5: behind the smash wall, inside lane 2
    { type: 'corriente', dir: 'up', length: 4, x: 21, y: 18 },
    { type: 'ajolote', x: 38, y: 17 }, // boss; breaches under the islets (cols 34/38/42)
    { type: 'door', x: 53, y: 13 },
  ],
};
