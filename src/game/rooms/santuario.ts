import type { RoomDef } from './RoomDef';

/** El santuario del hub: un ASCENSO AL ALTAR en cuatro tramos.
 *  Se entra caminando por la izquierda (piso firme, sin trampas) desde el
 *  túnel; una escalinata de repisas sube hacia la derecha hasta la arena
 *  del jefe (piso ancho y sólido), sigue subiendo hasta el pedestal donde
 *  se para la puerta D, y remata en un nicho-cima con la reliquia del dash
 *  'k' — el único salto que exige doble salto (recompensa cumbre). El pozo
 *  hacia las Forjas de Escoria es una fosa corta y visible junto a la
 *  entrada, cruzable por el piso principal: no es parte del camino de
 *  ascenso, solo un desvío para quien decide bajar a propósito.
 *  La puerta abre solo con TODOS los cristales y TODOS los jefes derrotados.
 *  Salida a la izquierda (túnel) y ABAJO por el pozo a las Forjas. */
export const santuario: RoomDef = {
  id: 'santuario',
  mapPos: { x: 7, y: 5 },
  biome: 'eco',
  exits: { left: 'tunel', down: 'forjas' },
  map: [
    '########################################################',
    '#......................................................#',
    '#......................................................#',
    '#..................................................k.o.#',
    '#.................................................######',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#.........................................D.o..........#',
    '#...............................o.......########.......#',
    '#.............................#######..................#',
    '#......................................................#',
    '#......................................................#',
    '#...................o......B...........................#',
    '#..............###########################.............#',
    '#......................................................#',
    '#.......o..............................................#',
    '#.....#######..........................................#',
    '#......................................................#',
    '.......................................................#',
    '................###...............####.................#',
    '####..##################################################',
  ],
};
