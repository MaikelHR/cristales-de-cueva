// ============================================================
//  TILES POR BIOMA
// ------------------------------------------------------------
//  El terreno es parte de la identidad de cada bioma: no alcanza
//  con teñir el fondo (un jardín verde sobre roca violeta se ve
//  postizo). Cada set cambia la SUPERFICIE (el tile de tope tiene
//  su propia grilla: musgo con brotes, costra con brasas...) y la
//  rampa de la roca, además de los colores de rim-light que usa
//  levelTiles. Los tiles-lenguaje ('%' agrietado, '~' hielo, púas
//  y tablones) NO cambian por bioma: significan lo mismo en todos.
//  Los niveles 1-3 comparten la roca violeta original (sus
//  atmósferas violeta/azul/carmesí la iluminan distinto).
// ============================================================

import { Sprite, type Palette } from '../../engine/Sprite';
import { sprites } from './sprites';

export interface TileSet {
  top: Sprite;
  fill: Sprite;
  fill2: Sprite;
  fill3: Sprite;
  /** Rim-light de las caras expuestas (izquierda más clara) y sombra. */
  rimL: string;
  rimR: string;
  shadow: string;
}

// Las mismas formas de relleno que la roca original (comparten las
// letras r/o/s/m/t): lo que cambia por bioma es la rampa de color.
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

// --- Esporas: roca de jardín — musgo arriba, brotes que asoman ---
const MOSS_PALETTE: Palette = {
  r: '#2b4636', o: '#3e6248', s: '#152819',
  m: '#5ce06a', t: '#a8ffd0',
  G: '#8fe6a0', g: '#3e8a58',
};
const MOSS_TOP = [
  '.G..G.G.', // brotes que asoman de la alfombra
  'GgGGgGGg', // el musgo que se pisa
  'ggrrrrgg', // y sus flecos colgando en la juntura
  'orrrrrro',
  'rrrorrrr',
  'rrrrrror',
  'rorrrrrr',
  'ssssssss',
];

// --- Fragua: obsidiana carbonizada con brasas vivas en la costra ---
const COAL_PALETTE: Palette = {
  r: '#2a1712', o: '#3d2419', s: '#140a06',
  m: '#d0662a', t: '#ff9a3a',
  E: '#ffd23a',
};
const COAL_TOP = [
  'oostEsoo', // la costra pisoteable, con brasas en las ranuras
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

// La roca violeta original, como set por defecto (niveles 1-3,
// glaciar — cuyo terreno propio ya es el hielo — y el que venga).
const DEFAULT_SET: TileSet = {
  top: sprites.tileTop,
  fill: sprites.tileFill,
  fill2: sprites.tileFill2,
  fill3: sprites.tileFill3,
  rimL: '#8064b0',
  rimR: '#5f4790',
  shadow: '#160b24',
};

/** El set de tiles del nivel dado (el violeta original si no tiene). */
export function tileSetFor(levelId: string): TileSet {
  return SETS[levelId] ?? DEFAULT_SET;
}
