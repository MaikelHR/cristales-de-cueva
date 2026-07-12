import type { RoomData } from '../../RoomData';

/** Nivel 4, sala 3 — Las copas: el examen del planeo.
 *  Se entra por lo ALTO. La garganta entera es cama de púas; la línea
 *  maestra es un vuelo con dos relevos: planear desde la repisa hasta
 *  la primera corriente, subir, volver a planear hasta la segunda y
 *  bajar en la meseta de la puerta (un cristal flota en plena línea).
 *  La segunda lectura, para el contrarreloj: los dientes al ras de
 *  las púas se encadenan con dash — más rápida, sin red, con su
 *  propio cristal y un esporero que la vigila. Caer sobre limpio
 *  (bajo la meseta) tiene rescate: se escala su pared. Detrás de la
 *  puerta, un pozo esconde el último cristal — se baja caminando y
 *  se vuelve a salto de pared (el examen cita al nivel 2). */
export const copas: RoomData = {
  id: 'copas',
  mapPos: { x: 2, y: 0 },
  exits: { left: 'colonia' },
  tiles: [
    '################################################################',
    '#..............................................................#',
    '#..............................................................#',
    '...............................................................#',
    '...............................................................#',
    '...............................................................#',
    '#########......................................................#',
    '#########......................................................#',
    '#...................................................#######....#',
    '#...................................................#######....#',
    '#...................................................#######....#',
    '#....---............................................#######....#',
    '#...................................................#######....#',
    '#...................................................#######....#',
    '#...................................................#######....#',
    '#.---...............................................#######....#',
    '#.............##.....##.....##......##.....##.......#######....#',
    '#.............##.....##.....##......##.....##.......#######....#',
    '#.............##.....##.....##......##.....##.......############',
    '#...........^^##^^^^^##^^^^^##^^^^^^##^^^^^##^^.....############',
    '################################################################',
  ],
  entities: [
    { type: 'vent', x: 28, y: 15, height: 11 },
    { type: 'vent', x: 43, y: 15, height: 11 },
    { type: 'spitter', x: 21, y: 15 },
    { type: 'spitter', x: 49, y: 19 },
    { type: 'crystal', x: 35, y: 7 },
    { type: 'crystal', x: 32, y: 15 },
    { type: 'crystal', x: 61, y: 15 },
    { type: 'door', x: 55, y: 7 },
  ],
};
