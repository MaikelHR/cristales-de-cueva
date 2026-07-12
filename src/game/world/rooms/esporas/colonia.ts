import type { RoomData } from '../../RoomData';

/** Nivel 4, sala 2 — La colonia: acá se gana el PLANEO.
 *  La reliquia corona un pedestal imposible de no ver. Enseguida, la
 *  lección barata: una cuenca ancha que solo se cruza de un vuelo
 *  (salto + doble + planeo); fallar deposita en el fondo, donde se
 *  camina y se saltan cuatro púas — la ruta lenta pero segura (el
 *  cristal flota justo sobre ellas). Después, las CORRIENTES: una
 *  bajita para probar (con premio adentro) y la chimenea grande que
 *  sube 13 tiles hasta la repisa de salida — planear dentro de la
 *  columna es la única forma de llegar; un esporero presiona la
 *  espera desde abajo. Soltar saltar es soltarse del viento. */
export const colonia: RoomData = {
  id: 'colonia',
  mapPos: { x: 1, y: 0 },
  exits: { left: 'vergel', right: 'copas' },
  tiles: [
    '##############################################################',
    '#............................................................#',
    '#............................................................#',
    '#.............................................................',
    '#.............................................................',
    '#.............................................................',
    '#....................................................#########',
    '#....................................................#########',
    '#............................................................#',
    '#............................................................#',
    '#............................................................#',
    '#............................................................#',
    '#............................................................#',
    '#............................................................#',
    '#............................................................#',
    '........##...................................................#',
    '........##...................................................#',
    '........##...................................................#',
    '################....................##########################',
    '################.........^^^^.......##########################',
    '##############################################################',
  ],
  entities: [
    { type: 'relic', ability: 'glide', x: 8, y: 13 },
    { type: 'crystal', x: 26, y: 17 },
    { type: 'vent', x: 40, y: 17, height: 6 },
    { type: 'crystal', x: 40, y: 13 },
    { type: 'vent', x: 50, y: 17, height: 13 },
    { type: 'crystal', x: 50, y: 5 },
    { type: 'spitter', x: 57, y: 17 },
  ],
};
