import type { RoomData } from '../../RoomData';

/** X2, sala 2 — El canal: aqui la marea deja de ser un ascensor y pasa
 *  a ser un RITMO. La pasarela de la sala se corta en tres vasos de
 *  quince tiles, demasiado anchos para saltarlos y con el fondo
 *  erizado, y cada uno lleva su propio reloj DESFASADO dos segundos
 *  respecto al anterior: la cresta viaja de izquierda a derecha, y
 *  cruzar es ir montado en ella. Con el vaso lleno el agua queda al ras
 *  de la pasarela y se nada de un lado a otro; con el vaso vacio es un
 *  pozo de pinchos de diez filas. Los dos vertederos entre vasos son
 *  las islas donde esperar el siguiente peldano si se te escapa la ola.
 *  Los pinchos cubren el centro de cada vaso dejando dos columnas secas
 *  a cada lado: hundirse pegado a una pared se perdona y se sale
 *  trepandola, pero la franja erizada mide once tiles y un salto con
 *  dash llega a nueve y medio, asi que por abajo NO se cruza. Ese es el
 *  cierre de la sala: se puede bajar, no se puede pasar sin el agua.
 *  Con el fondo entero erizado la sala se jugaba conteniendo la respiracion
 *  en vez de leyendo el reloj, que es justo lo contrario de lo que ensena.
 *  El cristal de arriba pide salir del agua de un brinco; el de abajo,
 *  bucear hasta dos filas de los pinchos y volver antes de que vacie. */
export const canal: RoomData = {
  id: 'canal',
  mapPos: { x: 1, y: 0 },
  exits: { left: 'aljibe', right: 'sifon' },
  tiles: [
    '########################################################################',
    '########################################################################',
    '########################################################################',
    '########################################################################',
    '########################################################################',
    '#......................................................................#',
    '#......................................................................#',
    '#......................................................................#',
    '#......................................................................#',
    '#......................................................................#',
    '........................................................................',
    '........................................................................',
    '##########................##...............##...............############',
    '##########................##...............##...............############',
    '##########................##...............##...............############',
    '##########................##...............##...............############',
    '##########................##...............##...............############',
    '##########................##...............##...............############',
    '##########................##...............##...............############',
    '##########................##...............##...............############',
    '##########................##...............##...............############',
    '##########................##...............##...............############',
    '############^^^^^^^^^^^^######^^^^^^^^^^^######^^^^^^^^^^^##############',
    '########################################################################',
    '########################################################################',
    '########################################################################',
    '########################################################################',
    '########################################################################',
  ],
  entities: [
    { type: 'cisterna', x: 10, y: 12, w: 16, h: 10, period: 13 },
    { type: 'cisterna', x: 28, y: 12, w: 15, h: 10, period: 13, offset: 2 },
    { type: 'cisterna', x: 45, y: 12, w: 15, h: 10, period: 13, offset: 4 },
    { type: 'crystal', x: 35, y: 11 },
    { type: 'crystal', x: 14, y: 20 },
  ],
};
