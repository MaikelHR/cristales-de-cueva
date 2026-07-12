import type { RoomData } from '../../RoomData';

/** Nivel 3, sala 3 — El santuario: el guardián y la puerta.
 *  Arena limpia de piso firme (la pelea ya es bastante): dos
 *  repisas laterales para tomar altura y un trampolín de tablón
 *  centrado BIEN por encima de la ronda del guardián — dos tiles
 *  largos de aire entre el tablón y su cabeceo más alto, para que
 *  el pisotón en picada caiga limpio y el tablón nunca "atrape" el
 *  salto (un tablón pegado al jefe come el arco del pisotón). El
 *  último cristal flota sobre el tablón — cobrarlo es parte del
 *  duelo. Desde el tablón, abajo + saltar lo atraviesa: el pisotón
 *  en picada cae directo sobre la ronda del guardián. La puerta
 *  espera sobre el altar, cerrada hasta el final. */
export const santuario: RoomData = {
  id: 'santuario',
  mapPos: { x: 2, y: 0 },
  exits: { left: 'abismo' },
  tiles: [
    '########################################################',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#.......................--------.......................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '#......................................................#',
    '...........######...................######.............#',
    '.......................................................#',
    '................................................########',
    '########........................................########',
    '########....................................############',
    '#...........................................############',
    '#...........................................############',
    '########################################################',
    '########################################################',
    '########################################################',
  ],
  entities: [
    { type: 'boss', x: 26, y: 9 },
    { type: 'crystal', x: 27, y: 3 },
    { type: 'door', x: 50, y: 13 },
  ],
};
