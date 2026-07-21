import type { RoomData } from '../../RoomData';

/** X2, sala 1 — El aljibe: la primera leccion es que aqui el agua manda.
 *  Se entra a un vestibulo seco de techo bajo, del que no se sube, y de
 *  ahi a la nave del deposito, que se abre once filas por encima. La
 *  salida esta arriba, en un tunel a la altura de la marea ALTA, y su
 *  suelo VUELA sobre el agua: quien lo intente a saltos de pared se da
 *  con el alero: el deposito se mete POR DEBAJO del tunel, asi que la
 *  pared trepable remata contra su propio suelo y no hay repisa donde
 *  posarse. Se sube flotando, y punto.
 *  El fondo es una cama de cal ERIZADA salvo el desembarco de la
 *  izquierda (que llega hasta debajo de la primera plataforma, para que
 *  fallar el brinco de aprendizaje no cueste un corazon) y la boca del
 *  pozo, y en el aire hay dos plataformas de
 *  bronce: son el sitio donde esperar, y la marea se las traga por
 *  orden, asi que esperar no es quedarse quieto, es ir subiendo de una
 *  a otra mientras el agua te alcanza. Desde la mas alta aun faltan
 *  catorce columnas hasta el tunel: ni con dash ni planeando se llega,
 *  solo con el agua. */
export const aljibe: RoomData = {
  id: 'aljibe',
  mapPos: { x: 0, y: 0 },
  exits: { right: 'canal' },
  tiles: [
    '########################################################################',
    '########################################################################',
    '########################################################################',
    '########################################################################',
    '########################################################################',
    '########################################################################',
    '########################################################################',
    '########################################################################',
    '########################################################################',
    '########################################################################',
    '##############..........................................................',
    '##############..........................................................',
    '##############............................##############################',
    '##############..................................########################',
    '##############..................................########################',
    '##############..................................########################',
    '#...............................................########################',
    '#.........................###...................########################',
    '#...............................................########################',
    '#...................###.........................########################',
    '#...............................................########################',
    '#...............................................########################',
    '########################^^^^^^....^^^^^^^^^^^^##########################',
    '##############################....######################################',
    '##############################....######################################',
    '########################################################################',
    '########################################################################',
    '########################################################################',
  ],
  entities: [
    { type: 'zapatero', range: 4, x: 18, y: 20 },
    { type: 'playerSpawn', x: 3, y: 20 },
    { type: 'cisterna', x: 14, y: 10, w: 34, h: 15, period: 13 },
    // Una medusa colgada a media nave: intocable, como siempre, asi que
    // no es algo que matar sino un carril que esquivar. Deriva entre las
    // filas 12 y 16, o sea que deja libre la calle de arriba por donde se
    // sale nadando, pero vigila justo la altura a la que se para uno a
    // esperar en las plataformas.
    { type: 'medusa', range: 2, x: 36, y: 14 },
    { type: 'crystal', x: 24, y: 12 },
    { type: 'crystal', x: 31, y: 24 },
    { type: 'crystal', x: 43, y: 13 },
  ],
};
