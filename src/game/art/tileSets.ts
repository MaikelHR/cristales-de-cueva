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
