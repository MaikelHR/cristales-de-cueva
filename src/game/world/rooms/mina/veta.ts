import type { RoomData } from '../../RoomData';

/** Level 8, room 2 — La veta: here you earn the SHRINK.
 *  The relic waits on a low pedestal right past the mouth (impossible
 *  to miss) — and the ONLY way onward is the 1-tile burrow at the base
 *  of a floor-to-ceiling wall: menguar IS the exit, taught the way the
 *  cenote taught the dive. Then the burrow UNDER the spike bed: the
 *  roof of your crawl is the floor of the danger — tiny, you pass
 *  beneath what would bite you full-sized (the fast line skips it: a
 *  full flight clears the whole bed at height, no net). The middle
 *  stretch has two readings: up on the CRUMBLE walkway, quick hops
 *  board to board (its crystal rides the line) — or down in the pit,
 *  where a TOPO owns the floor and the other crystal floats
 *  mid-stretch. The finale is the SCAFFOLD CHASM: six boards stepped
 *  at different heights over a bed of spikes, each one snapping loose
 *  behind you — real platforming with a real price (a fall returns
 *  you to the last firm ground). Its crystal crowns the tallest step. */
export const veta: RoomData = {
  id: 'veta',
  mapPos: { x: 1, y: 0 },
  exits: { left: 'bocamina', right: 'socavon' },
  tiles: [
    '########################################################################',
    '########################################################################',
    '########################################################################',
    '########################################################################',
    '########################################################################',
    '########################################################################',
    '########################################################################',
    '#.......###............................................................#',
    '#.......###............................................................#',
    '#.......###............................................................#',
    '#.......###............................................................#',
    '#.......###............................................................#',
    '#.......###............................................................#',
    '#.......###............................................................#',
    '#.......###....^^^^^^^^^...##..........................................#',
    '........###...###########..##...........................................',
    '....##.....................##...........................................',
    '##########################*..................###.....................###',
    '#####################......#####################^^^^^^^^^^^^^^^^^^^^^###',
    '#####################......#############################################',
    '########################################################################',
  ],
  entities: [
    { type: 'relic', ability: 'shrink', x: 4, y: 15 },
    { type: 'crumble', x: 30, y: 11 }, // the walkway over the topo's pit...
    { type: 'crumble', x: 33, y: 11 },
    { type: 'crumble', x: 36, y: 11 },
    { type: 'crumble', x: 39, y: 11 },
    { type: 'crumble', x: 42, y: 11 },
    { type: 'crystal', x: 39, y: 10 }, // #4: riding the walkway line
    { type: 'topo', x: 36, y: 17 },
    { type: 'crystal', x: 37, y: 15 }, // #5: mid-pit, in the mole's stretch
    { type: 'crumble', x: 50, y: 15 }, // the scaffold chasm: six stepped boards
    { type: 'crumble', x: 53, y: 14 },
    { type: 'crumble', x: 56, y: 15 },
    { type: 'crumble', x: 59, y: 13 },
    { type: 'crumble', x: 62, y: 14 },
    { type: 'crumble', x: 65, y: 16 },
    { type: 'crystal', x: 59, y: 11 }, // #6: crowning the tallest step
    // THE SECRET. You crawl out of the spike burrow and stand up in a
    // two-column dead end that pays nothing — the only flat spot
    // between the burrow and the pit, walled by the hanging pillar.
    // The floor tile against that pillar is a false one: walk east
    // until you stop, pound, and you drop into the mine's own vault.
    // (Only the EAST tile is false — the west one still holds you at
    // full size, or the burrow could never be entered from this side
    // again. Inside, walking east into the wall lines you up under the
    // hole you came through.)
    { type: 'vestigio', x: 23, y: 18 },
    { type: 'glifo', lore: 'min_farol', x: 20, y: 19 },
  ],
};
