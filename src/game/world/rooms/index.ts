// ============================================================
//  REGISTRO DE NIVELES
// ------------------------------------------------------------
//  Los niveles del juego, en el orden del overworld: completar
//  uno desbloquea el siguiente. Cada nivel enseña algo nuevo:
//   1. Cavernas  — moverse, pisar y el DOBLE SALTO.
//   2. Galerías  — púas, resortes y el SALTO DE PARED.
//   3. Corazón   — plataformas móviles, el DASH y el guardián.
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
];
