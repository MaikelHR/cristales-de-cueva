import type { RoomData } from '../../RoomData';

/** Nivel 6, sala 1 — El crisol: aprender a leer el fuego.
 *  Primero un repaso amable: un bolsillo agrietado con cristal (el
 *  azotón no se olvida). Después los GÉISERES: tres bocas desfasadas
 *  que chisporrotean antes de entrar en erupción — se pasa leyendo
 *  el ritmo por abajo (rápido) o por el camino de tablones por
 *  arriba (lento y seguro, con un volador rondando): dos lecturas.
 *  El cristal sobre el segundo géiser se roba entre erupciones — o
 *  bajando del tablón con abajo + saltar. El anzuelo del nivel: una
 *  cámara flotante con cara agrietada de costado que ninguna picada
 *  abre — la EMBESTIDA se gana en la sala siguiente. */
export const crisol: RoomData = {
  id: 'crisol',
  mapPos: { x: 0, y: 0 },
  exits: { right: 'yunque' },
  tiles: [
    '############################################################',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#..........................................................#',
    '#....................-----------....................#####..#',
    '#...................................................#####..#',
    '#...................................................%..##..#',
    '#...................................................%..##..#',
    '#...................................................#####...',
    '#...........................................................',
    '#...........................................................',
    '##########%%%###############################################',
    '##########...###############################################',
    '############################################################',
  ],
  entities: [
    { type: 'playerSpawn', x: 3, y: 17 },
    { type: 'crystal', x: 11, y: 19 },
    { type: 'geyser', x: 18, y: 17 },
    { type: 'geyser', x: 26, y: 17, offset: 1.2 },
    { type: 'geyser', x: 34, y: 17, offset: 2.4 },
    { type: 'crystal', x: 26, y: 12 },
    { type: 'flyer', x: 30, y: 7 },
    { type: 'crystal', x: 53, y: 13 },
  ],
};
