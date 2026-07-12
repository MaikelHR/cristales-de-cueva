import type { RoomData } from '../../RoomData';

/** Nivel 2, sala 2 — La chimenea: acá se gana el salto de pared.
 *  Sala de doble altura: se entra por una cornisa a media altura y
 *  el único camino es DEJARSE CAER al fondo del pozo, donde espera
 *  la reliquia (imposible perderse). La vuelta es la lección: una
 *  chimenea angosta de 30 tiles que se escala a puro salto de
 *  pared, con un tablón para respirar (y su cristal) y un volador
 *  haciendo de portero. El tablón cubre MEDIO hueco: pegado a la
 *  pared derecha queda el carril para volver a bajar. Salida por
 *  arriba a la derecha.
 *  El canal izquierdo (por donde se cae al entrar) está TAPADO
 *  arriba: no es atajo a la salida. Pero sí se puede escalar hasta
 *  la cornisa de entrada — una costilla de roca forma la chimenea
 *  de vuelta a las cornisas, para el cristal que quedó pendiente
 *  allá (se ve al pasar y pide salto de pared). En la cámara del
 *  fondo, un cazador cuida el otro cristal. */
export const chimenea: RoomData = {
  id: 'chimenea',
  mapPos: { x: 1, y: 0 },
  exits: { left: 'cornisas', right: 'salida' },
  tiles: [
    '####################################',
    '#..................................#',
    '#..................................#',
    '#...................................',
    '#...................................',
    '#...................................',
    '############.....###################',
    '############.....###################',
    '#.........##....##.................#',
    '#.........##....##.................#',
    '#.........##....##.................#',
    '#.........##....##.................#',
    '#.........##....##.................#',
    '#.........##....##.................#',
    '#.........##....##.................#',
    '#.........##....##.................#',
    '..........##....##.................#',
    '..........##....##.................#',
    '..........##....##.................#',
    '#######...##....##.................#',
    '#######...##....##.................#',
    '#.........##....##.................#',
    '#.........##....##.................#',
    '#.........##....##.................#',
    '#.........##--..##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#....##...##....##.................#',
    '#.........##....##.................#',
    '#............##....................#',
    '#............##....................#',
    '####################################',
    '####################################',
    '####################################',
  ],
  entities: [
    { type: 'relic', ability: 'wallJump', x: 13, y: 37 },
    { type: 'crystal', x: 13, y: 22 },
    { type: 'flyer', x: 13, y: 30 },
    { type: 'crystal', x: 27, y: 38 },
    { type: 'chaser', x: 30, y: 41 },
  ],
};
