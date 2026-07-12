import type { RoomData } from '../../RoomData';

/** Nivel 5, sala 2 — La grieta: acá se gana el AZOTÓN.
 *  Reliquia en pedestal, y la lección barata enseguida: la mesa tiene
 *  un pozo tapado con DOS capas agrietadas — la picada las encadena
 *  (rompe, sigue cayendo, rompe) hasta el cristal del fondo; se sale
 *  con doble salto. La práctica de combate: un erizo ronda el puente
 *  de hielo — saltar y picar encima es su única muerte (y debajo del
 *  puente cuelga otro cristal, para el que se anima a la zanja). Al
 *  final, la repisa de hielo queda JUSTO sobre un bolsillo agrietado:
 *  dejarse caer picando desde ella lo abre — piso que patina y piso
 *  que revienta, combinados. Un segundo erizo guarda la salida. */
export const grieta: RoomData = {
  id: 'grieta',
  mapPos: { x: 1, y: 0 },
  exits: { left: 'ventisca', right: 'espejo' },
  tiles: [
    '##########################################################',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#.............###%%####...~~~~~~~~~......................#',
    '#.............###..####...............~~~~~~~............#',
    '.......##.....###%%####...................................',
    '.......##.....###..####...................................',
    '.......##.....###..####...................................',
    '########################################%%%###############',
    '########################################...###############',
    '##########################################################',
  ],
  entities: [
    { type: 'relic', ability: 'pound', x: 7, y: 13 },
    { type: 'crystal', x: 17, y: 16 },
    { type: 'erizo', x: 30, y: 12 },
    { type: 'crystal', x: 30, y: 15 },
    { type: 'crystal', x: 41, y: 19 },
    { type: 'erizo', x: 49, y: 17 },
  ],
};
