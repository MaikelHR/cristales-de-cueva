// ============================================================
//  LEVEL REGISTRY
// ------------------------------------------------------------
//  The game's levels, in overworld order: completing one unlocks
//  the next. Each level teaches something new:
//   1. Cavernas  — moving, stomping and the DOUBLE JUMP.
//   2. Galerías  — spikes, springs and the WALL JUMP.
//   3. Corazón   — moving platforms, the DASH and the guardian.
//   4. Esporas   — the GLIDE, updrafts and spitters.
//   5. Glaciar   — the POUND, ice, cracked blocks and erizos.
//   6. Fragua    — the CHARGE, geysers and the Igneous Guardian.
//  Adding a level = a folder with its rooms + an entry here.
//  (The FIRST level's id is also pinned in save.ts, to migrate
//  old records: don't rename it lightly.)
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
