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
//   7. Cenote    — the DIVE, water, currents and the Axolotl.
//   8. Mina      — the SHRINK, crumble boards, the burrowing topo
//      and the Iron Foreman (a boss you flank, not out-jump).
//   9. Seda      — the SWING: silk anchors, the game's only CURVED
//      movement, in a nest of rising terraces; the hanging tejedora
//      and the Matriarch (cut her thread, then stomp her).
//  10. Puerta    — the FINAL EXAM: the built sanctum. Blink slabs
//      and vigía sentries guard the six rooms; the bullet hell
//      belongs to the Custodio ALONE (no relic: you arrive
//      knowing it all).
//  Adding a level = a folder with its rooms + an entry here.
//  (The FIRST level's id is also pinned in save.ts, to migrate
//  old records: don't rename it lightly.)
//
//  The overworld has 10 nodes and, with the nest built, every one of
//  them holds a level: levelAtNode/nodeOfLevel are now the identity.
//  They stay as the single source of that mapping anyway — the final
//  level is pinned to the last node, so inserting a level before it
//  never has to renumber the door.
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
import { orilla } from './cenote/orilla';
import { perla } from './cenote/perla';
import { guarida } from './cenote/guarida';
import { bocamina } from './mina/bocamina';
import { veta } from './mina/veta';
import { socavon } from './mina/socavon';
import { telar } from './seda/telar';
import { cuna } from './seda/cuna';
import { matriz } from './seda/matriz';
import { brocal } from './simas/brocal';
import { caida } from './simas/caida';
import { vena } from './simas/vena';
import { polea } from './simas/polea';
import { vertigo } from './simas/vertigo';
import { fondo } from './simas/fondo';
import { resquicio } from './simas/resquicio';
import { cadenas } from './simas/cadenas';
import { torre } from './simas/torre';
import { pozo } from './simas/pozo';
import { aguja } from './simas/aguja';
import { corona } from './simas/corona';
import { atrio } from './puerta/atrio';
import { claustro } from './puerta/claustro';
import { roseton } from './puerta/roseton';
import { espira } from './puerta/espira';
import { capilla } from './puerta/capilla';
import { dintel } from './puerta/dintel';

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
  {
    id: 'cenote',
    nameKey: 'lvl_cenote',
    rooms: [orilla, perla, guarida],
    startAbilities: ['doubleJump', 'wallJump', 'dash', 'glide', 'pound', 'smash'],
  },
  {
    id: 'mina',
    nameKey: 'lvl_mina',
    rooms: [bocamina, veta, socavon],
    startAbilities: ['doubleJump', 'wallJump', 'dash', 'glide', 'pound', 'smash', 'dive'],
  },
  {
    id: 'seda',
    nameKey: 'lvl_seda',
    rooms: [telar, cuna, matriz],
    startAbilities: ['doubleJump', 'wallJump', 'dash', 'glide', 'pound', 'smash', 'dive', 'shrink'],
  },
  // The final level: no relic inside — it examines everything the
  // grotto taught, and teaches the sanctum's own language (blink
  // slabs, vigía sentries) on the way to the Custodio's bullet hell.
  // Always LAST in this list (it sits at the door).
  {
    id: 'puerta',
    nameKey: 'lvl_puerta',
    rooms: [atrio, claustro, roseton, espira, capilla, dintel],
    startAbilities: [
      'doubleJump', 'wallJump', 'dash', 'glide', 'pound', 'smash', 'dive', 'shrink', 'swing',
    ],
  },
  // ---- The challenge road: extra levels for whoever wants more.
  // They come AFTER the door, so the same "beat one, open the next"
  // rule reveals them once world 1 is finished. No new relics: you
  // arrive with the nine verbs and they ask you to chain them.
  {
    id: 'simas',
    nameKey: 'lvl_simas',
    rooms: [
      brocal, caida, vena, polea, vertigo, fondo,
      resquicio, cadenas, torre, pozo, aguja, corona,
    ],
    startAbilities: [
      'doubleJump', 'wallJump', 'dash', 'glide', 'pound', 'smash', 'dive', 'shrink', 'swing',
    ],
  },
];

// ------------------------------------------------------------
// The overworld path: the first ten nodes are THE GROTTO (world 1,
// ending at the great door). Past them the path KEEPS GOING into
// the challenge nodes — extra levels for whoever wants more, hidden
// until the grotto is finished and unlocked by the same rule as
// everything else: beat one, the next opens. A node without a level
// yet is a '?' stone: steppable, not enterable.
// Levels sit on the node of their own index, so LEVELS order IS the
// map order — the door must stay the tenth entry.
// ------------------------------------------------------------

/** Nodes belonging to world 1 proper (the grotto). */
export const GROTTO_NODE_COUNT = 10;
/** Every node on the path, challenges included. */
export const WORLD_NODE_COUNT = 13;
/** The level that closes the grotto (it fires the ending). */
export const FINAL_LEVEL_ID = 'puerta';

/** The node a level (by index in LEVELS) stands on. */
export function nodeOfLevel(index: number): number {
  return index;
}

/** The level standing on a node, or null (a '?' stone). */
export function levelAtNode(node: number): LevelDef | null {
  return (LEVELS[node] as LevelDef | undefined) ?? null;
}

/** Is this node past the grotto? (drawn as a challenge, and kept
 *  hidden until world 1 is done). */
export function isChallengeNode(node: number): boolean {
  return node >= GROTTO_NODE_COUNT;
}
