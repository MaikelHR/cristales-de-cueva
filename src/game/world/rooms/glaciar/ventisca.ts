import type { RoomData } from '../../RoomData';

/** Nivel 5, sala 1 — La ventisca: aprender a pisar hielo.
 *  Arranque en roca firme; el primer carril helado enseña el patinado
 *  sin castigo. El foso paga (cristal adentro). En el segundo carril
 *  patrulla el primer ERIZO: pisarlo duele y todavía no hay respuesta
 *  — se lo espera, se lo salta sobre hielo (arriesgado) o se cruza
 *  por el puente-tablón (seguro): dos lecturas. La chimenea de
 *  pilares helados cita el salto de pared con premio arriba. El
 *  anzuelo del nivel: junto a la salida, un brillo se filtra por un
 *  piso agrietado que nada de lo que traés rompe — el AZOTÓN se
 *  aprende en la sala siguiente y el regreso es de tres pasos. */
export const ventisca: RoomData = {
  id: 'ventisca',
  mapPos: { x: 0, y: 0 },
  exits: { right: 'grieta' },
  tiles: [
    '##########################################################',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................................#',
    '#........................................~~....~~........#',
    '#........................................~~....~~........#',
    '#........................................~~....~~........#',
    '#........................................~~....~~........#',
    '#........................................~~....~~........#',
    '#........................................~~....~~........#',
    '#............................-------.....~~....~~........#',
    '#........................................~~....~~.........',
    '#.........................................................',
    '#......................................#..................',
    '###########~~~~~~~~~~~~~....~~~~~~~~~~~#############%%%###',
    '########################....########################...###',
    '##########################################################',
  ],
  entities: [
    { type: 'playerSpawn', x: 3, y: 17 },
    { type: 'crystal', x: 25, y: 19 },
    { type: 'erizo', x: 33, y: 17 },
    { type: 'crystal', x: 44, y: 7 },
    { type: 'crystal', x: 53, y: 19 },
  ],
};
