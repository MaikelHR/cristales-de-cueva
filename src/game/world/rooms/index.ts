// ============================================================
//  REGISTRO DE NIVELES
// ------------------------------------------------------------
//  Los niveles del juego, en el orden del overworld: completar
//  uno desbloquea el siguiente. Cada nivel enseña algo nuevo:
//   1. Cavernas  — moverse, pisar y el DOBLE SALTO.
//   2. Galerías  — púas, resortes y el SALTO DE PARED.
//   3. Corazón   — plataformas móviles, el DASH y el guardián.
//   4. Esporas   — el PLANEO, corrientes ascendentes y esporeros.
//   5. Glaciar   — el AZOTÓN, hielo, bloques agrietados y erizos.
//   6. Fragua    — la EMBESTIDA, géiseres y el Guardián Ígneo.
//  Agregar un nivel = una carpeta con sus salas + una entrada acá.
//  (El id del PRIMER nivel está fijado también en save.ts, para
//  migrar los récords viejos: no lo renombres a la ligera.)
// ============================================================

import type { LevelDef } from '../LevelData';
import { senda } from './cavernas/senda';
import { galeria } from './cavernas/galeria';
import { umbral } from './cavernas/umbral';
import { cornisas } from './galerias/cornisas';
import { chimenea } from './galerias/chimenea';
import { salida } from './galerias/salida';
import { fisura } from './corazon/fisura';
import { abismo } from './corazon/abismo';
import { santuario } from './corazon/santuario';
import { vergel } from './esporas/vergel';
import { colonia } from './esporas/colonia';
import { copas } from './esporas/copas';
import { ventisca } from './glaciar/ventisca';
import { grieta } from './glaciar/grieta';
import { espejo } from './glaciar/espejo';
import { crisol } from './fragua/crisol';
import { yunque } from './fragua/yunque';
import { nucleo } from './fragua/nucleo';

export const LEVELS: LevelDef[] = [
  {
    id: 'cavernas',
    nameKey: 'lvl_cavernas',
    rooms: [senda, galeria, umbral],
    startAbilities: [],
  },
  {
    id: 'galerias',
    nameKey: 'lvl_galerias',
    rooms: [cornisas, chimenea, salida],
    startAbilities: ['doubleJump'],
  },
  {
    id: 'corazon',
    nameKey: 'lvl_corazon',
    rooms: [fisura, abismo, santuario],
    startAbilities: ['doubleJump', 'wallJump'],
  },
  {
    id: 'esporas',
    nameKey: 'lvl_esporas',
    rooms: [vergel, colonia, copas],
    startAbilities: ['doubleJump', 'wallJump', 'dash'],
  },
  {
    id: 'glaciar',
    nameKey: 'lvl_glaciar',
    rooms: [ventisca, grieta, espejo],
    startAbilities: ['doubleJump', 'wallJump', 'dash', 'glide'],
  },
  {
    id: 'fragua',
    nameKey: 'lvl_fragua',
    rooms: [crisol, yunque, nucleo],
    startAbilities: ['doubleJump', 'wallJump', 'dash', 'glide', 'pound'],
  },
];
