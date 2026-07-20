// ============================================================
//  TILES PER BIOME
// ------------------------------------------------------------
//  The terrain is part of each biome's identity: it's not enough
//  to tint the background (a green garden over violet rock looks
//  fake). Each set changes the SURFACE (the top tile has its own
//  grid: moss with sprouts, crust with embers...) and the rock's
//  color ramp, plus the rim-light colors that levelTiles uses.
//  The language tiles ('%' cracked, '~' ice, spikes and planks)
//  do NOT change per biome: they mean the same in all of them.
//  Levels 1-3 share the original violet rock (their violet/blue/
//  crimson atmospheres light it differently).
// ============================================================

import { Sprite, type Palette } from '../../engine/Sprite';
import { sprites } from './sprites';

export interface TileSet {
  top: Sprite;
  fill: Sprite;
  fill2: Sprite;
  fill3: Sprite;
  /** Rim-light of the exposed faces (left side lighter) and shadow. */
  rimL: string;
  rimR: string;
  shadow: string;
}

// The same fill shapes as the original rock (they share the
// r/o/s/m/t letters): what changes per biome is the color ramp.
const FILL = [
  'rrrorrrr', 'rorrrrro', 'rrrrorrr', 'orrrrrro',
  'rrrorrrr', 'rrrrrror', 'rorrrrrr', 'ssssssss',
];
const FILL2 = [
  'rrrorrrr', 'rorrrrro', 'rrtmorrr', 'orrmrrro',
  'rrrorrrr', 'rrrrrror', 'rorrrrrr', 'ssssssss',
];
const FILL3 = [
  'rrrorrrr', 'rorsrrro', 'rrrsorrr', 'orrsrrro',
  'rrrsrrrr', 'rrrrsror', 'rorrrrrr', 'ssssssss',
];

// --- Esporas: garden rock — moss on top, sprouts poking through ---
const MOSS_PALETTE: Palette = {
  r: '#2b4636', o: '#3e6248', s: '#152819',
  m: '#5ce06a', t: '#a8ffd0',
  G: '#8fe6a0', g: '#3e8a58',
};
const MOSS_TOP = [
  '.G..G.G.', // sprouts poking out of the carpet
  'GgGGgGGg', // the moss you walk on
  'ggrrrrgg', // and its fringe hanging at the seam
  'orrrrrro',
  'rrrorrrr',
  'rrrrrror',
  'rorrrrrr',
  'ssssssss',
];

// --- Fragua: charred obsidian with live embers in the crust ---
const COAL_PALETTE: Palette = {
  r: '#2a1712', o: '#3d2419', s: '#140a06',
  m: '#d0662a', t: '#ff9a3a',
  E: '#ffd23a',
};
const COAL_TOP = [
  'oostEsoo', // the walkable crust, with embers in the grooves
  'oooootoo',
  'rrrsorrr',
  'orrrrrro',
  'rrrorrrr',
  'rrrrrror',
  'rorrrrrr',
  'ssssssss',
];

// --- Cenote: wet dark stone — algae mats on top, water beading at the seam ---
const CENOTE_PALETTE: Palette = {
  r: '#25333a', o: '#33474f', s: '#141d22',
  m: '#2f7d7a', t: '#4fb0aa',
  G: '#4a9d5e', g: '#2c6b45', W: '#bff6ff',
};
const CENOTE_TOP = [
  '..G.gG..', // algae sprigs poking out of the flooded rock
  'gGGGgGGg', // the algae mat you stand on
  'ggrWorgg', // its fringe at the seam, with a water bead glinting (W)
  'orrrrrro',
  'rrrorrrr',
  'rrrrrWor', // a wet glisten seeping down the dark stone
  'rorrrrrr',
  'ssssssss',
];

// --- Mina: shored-up dark rock — worn timber sleepers you walk on,
//     coal seams and copper glints deep in the stone below ---
const MINE_PALETTE: Palette = {
  r: '#3a2c20', o: '#4c3a2a', s: '#191209',
  m: '#8a5a30', t: '#e0a050',
  W: '#a87848', w: '#6b4a2e', N: '#e08a4a',
};
const MINE_TOP = [
  'WWWwWWWW', // the worn timber sleeper you walk on
  'wwNwwwNw', // its underside, studded with copper nails
  'oorrrsoo',
  'orrrrrro',
  'rrrsrrrr', // a coal seam deep in the rock
  'rrrrrror',
  'rorrrrrr',
  'ssssssss',
];

// --- Seda: rock swallowed by old web — the top is matted silk you
//     walk on, with loose strands snagged along the seam ---
const SILK_PALETTE: Palette = {
  r: '#3b3348', o: '#4c445c', s: '#1d1826',
  m: '#8d7fa4', t: '#c9bcd8',
  W: '#e8e0f0', w: '#a294b8',
};
const SILK_TOP = [
  'WWwWWWwW', // the matted silk carpet you stand on
  'wwWwwWww',
  'wtoomttw', // its frayed fringe caught at the seam
  'orrrrrro',
  'rrtrrrrr', // stray strands still threaded through the rock
  'rrrrrtor',
  'rorrrrrr',
  'ssssssss',
];

// --- Puerta: worked marble — cut stone with gold veins in the seams.
//     The threshold of the door was BUILT, not grown: the first
//     terrain in the grotto with a mason's hand on it. ---
const MARBLE_PALETTE: Palette = {
  r: '#4e4160', o: '#645478', s: '#2a2140',
  m: '#c9a227', t: '#ffd76a',
  B: '#efe6ff', b: '#a893cc',
};
const MARBLE_TOP = [
  'BBbBBBbB', // the polished pavement you walk on
  'bboobbob',
  'oomtoboo', // a gold vein glinting in the first seam
  'orrrrrro',
  'rrrorrrr',
  'rrrrmror', // and a fainter one deeper in the block
  'rorrrrrr',
  'ssssssss',
];

const SETS: Record<string, TileSet> = {
  esporas: {
    top: new Sprite(MOSS_TOP, MOSS_PALETTE),
    fill: new Sprite(FILL, MOSS_PALETTE),
    fill2: new Sprite(FILL2, MOSS_PALETTE),
    fill3: new Sprite(FILL3, MOSS_PALETTE),
    rimL: '#5aa878',
    rimR: '#35664a',
    shadow: '#0d1f12',
  },
  fragua: {
    top: new Sprite(COAL_TOP, COAL_PALETTE),
    fill: new Sprite(FILL, COAL_PALETTE),
    fill2: new Sprite(FILL2, COAL_PALETTE),
    fill3: new Sprite(FILL3, COAL_PALETTE),
    rimL: '#7a4426',
    rimR: '#4e2814',
    shadow: '#0a0402',
  },
  cenote: {
    top: new Sprite(CENOTE_TOP, CENOTE_PALETTE),
    fill: new Sprite(FILL, CENOTE_PALETTE),
    fill2: new Sprite(FILL2, CENOTE_PALETTE),
    fill3: new Sprite(FILL3, CENOTE_PALETTE),
    rimL: '#4a8f8a',
    rimR: '#2c5658',
    shadow: '#0c1418',
  },
  mina: {
    top: new Sprite(MINE_TOP, MINE_PALETTE),
    fill: new Sprite(FILL, MINE_PALETTE),
    fill2: new Sprite(FILL2, MINE_PALETTE),
    fill3: new Sprite(FILL3, MINE_PALETTE),
    rimL: '#8a6238',
    rimR: '#54402a',
    shadow: '#100b06',
  },
  seda: {
    top: new Sprite(SILK_TOP, SILK_PALETTE),
    fill: new Sprite(FILL, SILK_PALETTE),
    fill2: new Sprite(FILL2, SILK_PALETTE),
    fill3: new Sprite(FILL3, SILK_PALETTE),
    rimL: '#a294b8',
    rimR: '#645a78',
    shadow: '#151020',
  },
  puerta: {
    top: new Sprite(MARBLE_TOP, MARBLE_PALETTE),
    fill: new Sprite(FILL, MARBLE_PALETTE),
    fill2: new Sprite(FILL2, MARBLE_PALETTE),
    fill3: new Sprite(FILL3, MARBLE_PALETTE),
    rimL: '#a893cc',
    rimR: '#6f5a94',
    shadow: '#1a1230',
  },
};

// The original violet rock, as the default set (levels 1-3,
// glaciar — whose own terrain is already ice — and whatever comes next).
const DEFAULT_SET: TileSet = {
  top: sprites.tileTop,
  fill: sprites.tileFill,
  fill2: sprites.tileFill2,
  fill3: sprites.tileFill3,
  rimL: '#8064b0',
  rimR: '#5f4790',
  shadow: '#160b24',
};

/** The tile set for the given level (the original violet if it has none). */
export function tileSetFor(levelId: string): TileSet {
  return SETS[levelId] ?? DEFAULT_SET;
}
