import type { RoomData } from '../../RoomData';

/** X1, sala 11 — La aguja: el examen, en una sola línea.
 *  Todo el nivel cabe en una banda a la altura de las bocas: se entra
 *  andando y se sale andando, y entre medias hay tres verbos, uno
 *  detrás de otro, cada uno con su suelo debajo.
 *  1) LA SIMA: dieciocho tiles de vacío. Los andenes son túneles BAJOS
 *     (tres filas): desde ellos no se saca altura, así que el planeo
 *     cae corto y la única forma es la cadena de gotas — cinco, cada
 *     cuatro tiles, a la altura del andén para engancharlas al salir.
 *     El saliente del otro lado VUELA sobre el vacío: quien caiga no
 *     puede treparlo a saltos de pared, y el fondo es erizado de lado
 *     a lado, así que ahí abajo no hay bolsa donde quedarse encerrado.
 *  2) LA GATERA: una sola fila abierta bajo la roca. Solo pasa quien
 *     MENGUA, y es plana de punta a punta (nada de saltar dentro).
 *  3) LA GRIETA: dos tiles agrietados que ocupan justo la silueta del
 *     jugador. Sin EMBESTIDA no hay paso, y no se rodea.
 *  Los cristales piden desvío: uno se coge saltando al vacío desde el
 *  andén de entrada (y hay que caer en una gota), otro en lo alto de
 *  un arco bien bombeado, y el tercero bajo el tablón del foso, donde
 *  el vigía tiene la mira puesta. */
export const aguja: RoomData = {
  id: 'aguja',
  mapPos: { x: 10, y: 0 },
  exits: { left: 'pozo', right: 'corona' },
  tiles: [
    '########################################################',
    '########################################################',
    '########################################################',
    '########################################################',
    '############################################...........#',
    '##########........................##########...........#',
    '##########........................##########...........#',
    '#.................................######..##.##........#',
    '..................................######..%%............',
    '..........................................%%............',
    '##########..................###################----#####',
    '##########....................#################....#####',
    '##########....................#################....#####',
    '##########....................##########################',
    '##########....................##########################',
    '##########....................##########################',
    '##########....................##########################',
    '##########....................##########################',
    '##########....................##########################',
    '##########....................##########################',
    '##########....................##########################',
    '##########....................##########################',
    '##########....................##########################',
    '##########....................##########################',
    '##########....................##########################',
    '##########....................##########################',
    '##########....................##########################',
    '##########....................##########################',
    '##########....................##########################',
    '##########....................##########################',
    '##########....................##########################',
    '##########....................##########################',
    '##########....................##########################',
    '##########^^^^^^^^^^^^^^^^^^^^##########################',
    '########################################################',
    '########################################################',
  ],
  entities: [
    { type: 'ancla', length: 4, x: 11, y: 4 },
    { type: 'ancla', length: 4, x: 17, y: 4 },
    { type: 'ancla', length: 4, x: 23, y: 4 },
    // Hilos más largos entre medias: cuelgan por debajo de la cadena, así
    // que un vuelo bueno les pasa por encima sin tocarlos y solo enganchan
    // a quien se soltó mal y ya viene cayendo. Son la red, y el último
    // cubre el hueco entre la cadena y el saliente.
    { type: 'ancla', length: 5, x: 14, y: 4 },
    { type: 'ancla', length: 5, x: 20, y: 4 },
    { type: 'ancla', length: 5, x: 26, y: 4 },
    { type: 'crystal', x: 15, y: 6 },
    { type: 'crystal', x: 21, y: 6 },
    { type: 'vigia', x: 49, y: 6 },
    { type: 'crystal', x: 49, y: 12 },
  ],
};
