import type { RoomData } from '../../RoomData';

/** X3, sala SECRETA - La bodega: lo que hay detras del portico.
 *  El pasillo de entrada de la cripta es la unica sala del nivel cuyo
 *  borde izquierdo esta tapiado a la altura a la que TODAS las demas
 *  abren su boca (filas 8-9). Esa es la pista: despues de diecisiete
 *  salas con la misma gramatica, la puerta que falta se nota. Detras
 *  del muro falso hay un corredor bajo y una camara pequena, seca y
 *  quieta — la bodega donde se acostaron a esperar. No hay bicho, no
 *  hay trampa y no hay cristal: una sala secreta no puede guardar nada
 *  que la partida necesite, asi que guarda lo unico que sobra en este
 *  juego, que es lo que la cueva tiene que contar.
 *
 *  Se entra rompiendo la columna 1 del portico con la embestida (el
 *  nivel llega con las nueve habilidades) y se sale andando: el suelo
 *  de la fila 10 es plano de la columna 30 a la 63, asi que no hay
 *  forma de quedarse encerrado aqui dentro. */
export const bodega: RoomData = {
  id: 'bodega',
  // Comparte la columna del portico: la barra de progreso cuenta las
  // salas del camino, y un segmento fantasma que solo aparece al
  // encontrar algo se lee como un bug.
  secret: true,
  mapPos: { x: 0, y: 0 },
  exits: { right: 'portico' },
  tiles: [
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '##############################...................###############',
    '##############################...................###############',
    '##############################...................###############',
    '##############################................##################',
    '##############################..................................',
    '##############################..................................',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
  ],
  entities: [
    // La inscripcion, al fondo del todo y pegada a la roca: se lee de
    // pie, a tamano normal, sobre suelo firme y sin nada que la
    // discuta (aqui 'abajo' no tira de ninguna losa ni de ningun gatera).
    { type: 'glifo', x: 30, y: 9, lore: 'cri_portico' },
    // La puerta pintada en la pared del fondo, vista desde abajo y con
    // una figura al pie: lo que estaban esperando, a escala.
    { type: 'mural', x: 35, y: 4, art: 'puerta' },
    // El vestigio en la repisa de la fila 7 (columnas 46-48): tres
    // filas por encima del suelo, un salto limpio, dentro del listón.
    { type: 'vestigio', x: 47, y: 6 },
  ],
};
