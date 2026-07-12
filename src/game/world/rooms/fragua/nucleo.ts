import type { RoomData } from '../../RoomData';

/** Nivel 6, sala 3 — El núcleo: el Ariete Ígneo y la puerta.
 *  Una arena de PISO, nada que ver con el santuario: el jefe ronda
 *  y EMBISTE a ras del suelo. El umbral de piedra (izquierda) y el
 *  altar de la puerta (derecha) son sus paredes de choque — ahí se
 *  aturde y se lo pisa. Los dos parapetos agrietados del medio son
 *  refugio... hasta que una embestida los hace pedazos: la arena se
 *  va quedando pelada pelea adentro. La repisa alta de la izquierda
 *  es el único refugio fijo (su cristal pide un salto más), pero la
 *  lluvia de brasas de cada golpazo llega a todos lados. Esquivar =
 *  saltarlo por encima o subirse a algo; herirlo = pisarlo SOLO
 *  aturdido (la placa al rojo quema, como enseñó el erizo). */
export const nucleo: RoomData = {
  id: 'nucleo',
  mapPos: { x: 2, y: 0 },
  exits: { left: 'yunque' },
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
    '#.........#####..........................................#',
    '#........................................................#',
    '#...............................................##########',
    '................................................##########',
    '.....#..............%%...............%%.........##########',
    '.....#..............%%...............%%.........##########',
    '##########################################################',
    '##########################################################',
    '##########################################################',
  ],
  entities: [
    { type: 'ariete', x: 30, y: 17 },
    { type: 'crystal', x: 12, y: 8 },
    { type: 'door', x: 51, y: 13 },
  ],
};
