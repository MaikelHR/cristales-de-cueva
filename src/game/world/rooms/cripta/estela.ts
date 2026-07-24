import type { RoomData } from '../../RoomData';

/** X3, sala 8 - La estela: la seda vuelve, sobre la cripta.
 *  Una cadena de gotas de resina cruza la nave y, colgado en medio, un
 *  incensario que es la unica red de la sala: si te sueltas mal, o caes
 *  en su tapa o caes en las lapidas. El arco de las simas, otra vez, con
 *  menos sitio y peor suelo. La primera gota cuelga a UNA columna del
 *  borde y a la altura del anden: saliendo ya vas cayendo, y una gota
 *  puesta seis columnas mas alla es una gota que se pasa de largo. Y la
 *  cuerda mide SEIS: con doce el pendulo iba tan lento que bombearlo
 *  era un tramite, no un pulso. Seis tiles de cuerda y una gota cada
 *  seis columnas son las medidas que ya funcionaban en las simas. La
 *  cadena empieza SOBRE el vacio, no sobre el ultimo palmo de suelo
 *  firme: con la primera gota encima de la piedra, cada suelta te
 *  devolvia de pie al punto de partida y no habia forma de arrancar. */
export const estela: RoomData = {
  id: 'estela',
  mapPos: { x: 7, y: 0 },
  exits: { left: 'tumulo', right: 'catafalco' },
  tiles: [
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '##########...........................................###########',
    '##########...........................................###########',
    '##########...........................................###########',
    '##########...........................................###########',
    '##########...........................................###########',
    '##########...........................................###########',
    '##########...........................................###########',
    '##########...........................................###########',
    '##########...........................................###########',
    '##########...........................................###########',
    '##########................#####....#####.............###########',
    '##########...........................................###########',
    '##########...........................................###########',
    '##########...........................................###########',
    '#..............................................................#',
    '#..............................................................#',
    '#.............................#####............................#',
    '#..............................................................#',
    '#..............................................................#',
    '#..............................................................#',
    '................................................................',
    '................................................................',
    '##########..........................................############',
    '##########..........................................############',
    '##########..........................................############',
    '##########..........................................############',
    '############^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^#############',
    '################################################################',
  ],
  entities: [
    // La estela que da nombre a la sala, en el anden de entrada: suelo
    // firme y plano (cols 0-9, techo de la fila 26), fuera del alcance
    // de la primera gota, y el sitio donde cualquiera se para a medir
    // el vacio antes de tirarse. Se lee de pie y a tamano normal.
    { type: 'glifo', x: 4, y: 25, lore: 'cri_estela' },
    { type: 'ancla', length: 6, x: 13, y: 19 },
    { type: 'ancla', length: 6, x: 19, y: 19 },
    { type: 'ancla', length: 6, x: 25, y: 19 },
    { type: 'ancla', length: 6, x: 31, y: 19 },
    { type: 'ancla', length: 6, x: 37, y: 19 },
    { type: 'ancla', length: 6, x: 43, y: 19 },
    { type: 'ancla', length: 6, x: 49, y: 19 },
    { type: 'badajo', length: 8, arc: 6, period: 5.2, x: 32, y: 4 },
    { type: 'tejedora', x: 28, y: 4 },
    { type: 'crystal', x: 22, y: 22 },
    { type: 'crystal', x: 40, y: 22 },
  ],
};
