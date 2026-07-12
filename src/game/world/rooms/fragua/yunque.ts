import type { RoomData } from '../../RoomData';

/** Nivel 6, sala 2 — El yunque: acá se gana la EMBESTIDA.
 *  Reliquia en pedestal y el túnel-lección enseguida: dos tabiques
 *  agrietados que el dash hace pedazos sin frenar (el techo llega
 *  tan alto que no se salta por encima). Un hoyito paga después.
 *  La práctica combina fuego y grieta: un géiser custodia una
 *  compuerta agrietada de tres de espesor — se embiste entre
 *  erupciones. El yunque hueco guarda un cristal tras una banda
 *  agrietada de tres (una embestida la atraviesa entera; las bandas
 *  siempre cruzan TODO el espesor del muro, nunca van enmarcadas de
 *  roca a los costados). La torre de salida solo abre por su portal
 *  agrietado, y la chimenea junto a ella cita el examen del nivel 2:
 *  salto de pared hasta el cristal de arriba. */
export const yunque: RoomData = {
  id: 'yunque',
  mapPos: { x: 1, y: 0 },
  exits: { left: 'crisol', right: 'nucleo' },
  tiles: [
    '############################################################',
    '#....................................................##....#',
    '#.............................................###....##....#',
    '#.............................................###....##....#',
    '#.............................................###....##....#',
    '#.............................................###....##....#',
    '#............#########........................###....##....#',
    '#............#########........................###....##....#',
    '#............#########........................###....##....#',
    '#............#########..........###...........###....##....#',
    '#............#########..........###...........###....##....#',
    '#............#########..........###...........###....##....#',
    '#............#########..........###.....#########....##....#',
    '#............#########..........###.....#########....##....#',
    '#............#########..........###.....#########..........#',
    '.......##....#########..........###.....###...###...........',
    '.......##......%...%............%%%.....%%%...%%%...........',
    '.......##......%...%............%%%.....%%%...%%%...........',
    '#######################..###################################',
    '#######################..###################################',
    '############################################################',
  ],
  entities: [
    { type: 'relic', ability: 'smash', x: 7, y: 13 },
    { type: 'crystal', x: 23, y: 19 },
    { type: 'geyser', x: 29, y: 17 },
    { type: 'crystal', x: 44, y: 15 },
    { type: 'crystal', x: 50, y: 3 },
  ],
};
