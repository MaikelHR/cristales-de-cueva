// ============================================================
//  ARTE DEL JUEGO
// ------------------------------------------------------------
//  Todos los sprites como grillas de pixeles (editables como texto),
//  más la atmósfera de la cueva: brillos, fondo con profundidad,
//  polvo flotando y viñeta. Tocá los colores o las grillas para
//  cambiar el look sin tocar la lógica.
// ============================================================

import { Sprite, type Palette } from '../engine/Sprite';

// Paleta con "hue shifting": las sombras no son el mismo color más
// oscuro sino corridas hacia azul/violeta, y las luces hacia lo cálido.
// La luz viene de ARRIBA (cenital): así el flip no la invierte.
const PALETTE: Palette = {
  // jugador (ser de cristal): rampa fría, sombras violáceas
  K: '#16283d', C: '#5a9fd4', B: '#7ce0ff', b: '#3f9ad0', d: '#2d5c94',
  H: '#d6f7ff', W: '#f5fcff', P: '#11242e',
  // slime: verdes con contorno superior vivo y sombra azulada
  J: '#123528', E: '#46b558', G: '#5ce06a', g: '#2f9655', L: '#beffc8',
  // cristal: ámbar con sombras rojizas (hue shift cálido)
  Y: '#ffd23a', y: '#c9761f', h: '#fff7c9', u: '#8f4d1a',
  // puerta: interior con gradiente (i arriba, I abajo)
  F: '#7a4bd6', f: '#4a2e70', M: '#b98bff', I: '#1c1028', i: '#2a1a3e', R: '#e9d6ff',
  // tiles de cueva
  r: '#3d2a5c', o: '#56407e', s: '#241638', m: '#7a4bd6', t: '#ffe25a',
  // corazones (vida): rojo con luz cálida y sombra rojiza
  V: '#ff5a7a', v: '#b83a5a',
};

// ---- Jugador (ser de cristal) — 14x16 ----
// Rampa fría con hue shift: W>H>B>b>d>K (luz cenital). Contorno sel-out:
// claro (C) arriba donde pega la luz, oscuro (K) abajo. Cabeza redonda con
// corona brillante y ojos de pupila oscura; cuerpo con panza en sombra (d);
// manitas (B) a los lados. Cabeza (0-8), torso (9-11), piernas (12-15).
const PLAYER_IDLE = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC', 'CKBBBBBBBBBBKC',
  '..KBBbbbbBBK..', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '...KBb..bBK...', '...KB....BK...', '...KK....KK...', '..............',
];
// Respiración: cuerpo bajado un pixel (los pies quedan fijos abajo).
const PLAYER_IDLE2 = [
  '..............', '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..',
  '.CWHHBBBBHHWC.', '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC',
  'CKBBBBBBBBBBKC', '..KBBbbbbBBK..', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..',
  '..KBbdddbBK...', '...KBb..bBK...', '...KB....BK...', '...KK....KK...',
];
// Parpadeo: ojos cerrados en dos rayitas.
const PLAYER_BLINK = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBBKKBBKKBBHC', 'CKBBBBBBBBBBKC',
  '..KBBbbbbBBK..', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '...KBb..bBK...', '...KB....BK...', '...KK....KK...', '..............',
];
// Correr: 4 frames. Piernas alternan apoyo (abiertas) y paso (juntas).
// run1/run3 = contacto, run2/run4 = pasada. Todos a 16 filas.
const PLAYER_RUN1 = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC', 'CKBBBBBBBBBBKC',
  '..KBBbbbbBBK..', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '..KBb...bBK...', '.KKB.....BK...', '.KK......KK...', '..............',
];
const PLAYER_RUN2 = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC', 'CKBBBBBBBBBBKC',
  '..KBBbbbbBBK..', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '...KBbbBK.....', '...KBBBK......', '...KKKK.......', '..............',
];
const PLAYER_RUN3 = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC', 'CKBBBBBBBBBBKC',
  '..KBBbbbbBBK..', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '...KBb...bBK..', '...KB.....BKK.', '...KK......KK.', '..............',
];
const PLAYER_RUN4 = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC', 'CKBBBBBBBBBBKC',
  '..KBBbbbbBBK..', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '...KBbbBK.....', '...KBBBK......', '...KKKK.......', '..............',
];
const PLAYER_JUMP = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC', 'CKBBBBBBBBBBKC',
  '.BKBBbbbbBBKB.', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '...KBb..bBK...', '....KddddK....', '....KKKK......', '..............',
];
const PLAYER_FALL = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC', 'CKBBBBBBBBBBKC',
  'BKBBbbbbBBKB.', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '..KBb...bBK...', '.Kd.......dK..', '.KK.......KK..', '..............',
];
// Deslizando por la pared: mira a la derecha; el flip lo invierte.
const PLAYER_WALL = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC', 'CKBBBBBBBBBBKC',
  '..KBBbbbbBBKB', '..KBbbbbbbBKd', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '..KBb..bBK...', '..Kd...dK....', '..KK...KK....', '..............',
];
// Slime: gel translúcido con cúpula glossy (WW), cuerpo verde con
// sombra azulada abajo y ojos brillantes. 2 frames (parpadeo). 11x8.
const SLIME_1 = [
  '...EEEEE...', '..ELLLLLE..', '.ELWWLGGGE.', 'EGLGGGGGGGJ',
  'EGWPGGWPGGJ', 'JGGGGGGGGGJ', '.JgggggggJ.', '..JJJJJJJ..',
];
const SLIME_2 = [
  '...EEEEE...', '..ELLLLLE..', '.ELWWLGGGE.', 'EGLGGGGGGGJ',
  'EGddGGddGGJ', 'JGGGGGGGGGJ', '.JgggggggJ.', '..JJJJJJJ..',
];
// Volador (murciélago de cristal): cuerpo cian con destello, ojos y
// alas moradas (M vivo, m sombra) que baten. 9x7.
const FLYER_1 = [
  'MM.....MM', '.Mm...mM.', '..mBWBm..', '..bBBBb..',
  '..KPBPK..', '...KKK...', '.........',
];
const FLYER_2 = [
  '.........', 'M.......M', '.Mm...mM.', '..mBWBm..',
  '..bBBBb..', '.MKPBPKM.', '.M.....M.',
];
// Cazador (bola con púas): rojo amenazante con brillo arriba, sombra
// abajo, ojos oscuros y patitas que ruedan. 9x7.
const CHASER_1 = [
  '.v.v.v.v.', '.vVWVVVv.', 'vVVVVVVVv', 'vVPVVVPVv',
  'vVVVVVVVv', '.vvvvvvv.', '.K.K.K.K.',
];
const CHASER_2 = [
  '.v.v.v.v.', '.vVWVVVv.', 'vVVVVVVVv', 'vVPVVVPVv',
  'vVVVVVVVv', '.vvvvvvv.', 'K.K.K.K.K',
];
// Cristal facetado: 4 frames de brillo que barre las facetas (destello
// izq -> arriba -> der -> reposo). Sombra rojiza abajo-derecha.
const CRYSTAL_1 = [
  '...hh...', '..hWYy..', '.hWYYYy.', 'hWYYYYyu',
  'hYYYYYyu', 'yYYYYYyu', '.yYYYyu.', '..yYyu..', '...yu...',
];
const CRYSTAL_2 = [
  '...WW...', '..hWWy..', '.hYWYYy.', 'hYYWYYyu',
  'hYYYYYyu', 'yYYYYYyu', '.yYYYyu.', '..yYyu..', '...yu...',
];
const CRYSTAL_3 = [
  '...hh...', '..hYWy..', '.hYYWYy.', 'hYYYWYyu',
  'hYYYYWyu', 'yYYYYYyu', '.yYYYyu.', '..yYyu..', '...yu...',
];
const CRYSTAL_4 = [
  '...hh...', '..hYYy..', '.hYYYYy.', 'hYYYYYyu',
  'hYYYYYyu', 'yYYYYYyu', '.yYYYyu.', '..yYyu..', '...yu...',
];
// Reliquia: orbe blanco-celeste que respira luz (2 frames).
const RELIC_1 = [
  '...WW...', '..WHHW..', '.WHHHHW.', 'WHHWWHHW',
  '.WHbbHW.', '..WbbW..', '...bb...',
];
const RELIC_2 = [
  '...WW...', '..WWWW..', '.WWWWWW.', 'WWWWWWWW',
  '.WWbbWW.', '..WbbW..', '...bb...',
];
// Corazones del HUD: lleno (con destello W) y vacío (contorno hueco).
const HEART_FULL = [
  '.VV.VV.', 'VWVVVVV', 'VVVVVVV', '.VVVVv.', '..VVv..', '...v...',
];
const HEART_EMPTY = [
  '.vv.vv.', 'v..v..v', 'v.....v', '.v...v.', '..v.v..', '...v...',
];
// Puertas: el interior se aclara arriba (i) y se hunde abajo (I).
const DOOR_LOCKED = [
  '....FiiF....', '...FiiiiF...', '..FiiiiiiF..', '.fFiiiiiiFf.',
  '.fFiiiiiiFf.', '.fFiiiiiiFf.', '.fFiiiiiiFf.', '.fFiiffiiFf.',
  '.fFiiiiiiFf.', '.fFIIIIIIFf.', '.fFIIffIIFf.', '.fFIIIIIIFf.',
  '.fFIIIIIIFf.', '.fFIIffIIFf.', '.fFIIIIIIFf.', '.fFIIIIIIFf.',
  '.fFIIIIIIFf.', '.fFIIIIIIFf.', '.fFIIIIIIFf.', '.fFIIIIIIFf.',
  '.fFIIIIIIFf.', '.ffffffffff.',
];
const DOOR_OPEN = [
  '....FiiF....', '...FiiiiF...', '..FiiiiiiF..', '.fMiiiiiiFf.',
  '.fMiiiiiiFf.', '.fMiiiiiiFf.', '.fMiiiiiiFf.', '.fMiiRRiiFf.',
  '.fMiiiiiiFf.', '.fMIIIIIIFf.', '.fMIIRRIIFf.', '.fMIIIIIIFf.',
  '.fMIIIIIIFf.', '.fMIIRRIIFf.', '.fMIIIIIIFf.', '.fMIIIIIIFf.',
  '.fMIIIIIIFf.', '.fMIIIIIIFf.', '.fMIIIIIIFf.', '.fMIIIIIIFf.',
  '.fMIIIIIIFf.', '.ffffffffff.',
];
// Puerta abierta, frame B: las runas laten en blanco brillante.
const DOOR_OPEN2 = [
  '....FiiF....', '...FiiiiF...', '..FiiiiiiF..', '.fMiiiiiiFf.',
  '.fMiiiiiiFf.', '.fMiiiiiiFf.', '.fMiiiiiiFf.', '.fMiiWWiiFf.',
  '.fMiiiiiiFf.', '.fMIIIIIIFf.', '.fMIIWWIIFf.', '.fMIIIIIIFf.',
  '.fMIIIIIIFf.', '.fMIIWWIIFf.', '.fMIIIIIIFf.', '.fMIIIIIIFf.',
  '.fMIIIIIIFf.', '.fMIIIIIIFf.', '.fMIIIIIIFf.', '.fMIIIIIIFf.',
  '.fMIIIIIIFf.', '.ffffffffff.',
];
const TILE_FILL = [
  'rrrorrrr', 'rorrrrro', 'rrrrorrr', 'orrrrrro',
  'rrrorrrr', 'rrrrrror', 'rorrrrrr', 'ssssssss',
];
// Variante con un cristalito incrustado: rompe la repetición.
const TILE_FILL2 = [
  'rrrorrrr', 'rorrrrro', 'rrtmorrr', 'orrmrrro',
  'rrrorrrr', 'rrrrrror', 'rorrrrrr', 'ssssssss',
];
// Variante con una grieta vertical.
const TILE_FILL3 = [
  'rrrorrrr', 'rorsrrro', 'rrrsorrr', 'orrsrrro',
  'rrrsrrrr', 'rrrrsror', 'rorrrrrr', 'ssssssss',
];
const TILE_TOP = [
  'ootmmtoo', 'oooooooo', 'rrrrorrr', 'orrrrrro',
  'rrrorrrr', 'rrrrrror', 'rorrrrrr', 'ssssssss',
];
// Tablón de un solo sentido: fino, con brillos en el canto.
const TILE_PLANK = [
  'mtoootmo',
  'orrrrrro',
  '.s....s.',
];

export const sprites = {
  playerIdle: new Sprite(PLAYER_IDLE, PALETTE),
  playerIdle2: new Sprite(PLAYER_IDLE2, PALETTE),
  playerBlink: new Sprite(PLAYER_BLINK, PALETTE),
  playerRun1: new Sprite(PLAYER_RUN1, PALETTE),
  playerRun2: new Sprite(PLAYER_RUN2, PALETTE),
  playerRun3: new Sprite(PLAYER_RUN3, PALETTE),
  playerRun4: new Sprite(PLAYER_RUN4, PALETTE),
  playerJump: new Sprite(PLAYER_JUMP, PALETTE),
  playerFall: new Sprite(PLAYER_FALL, PALETTE),
  playerWall: new Sprite(PLAYER_WALL, PALETTE),
  slime1: new Sprite(SLIME_1, PALETTE),
  slime2: new Sprite(SLIME_2, PALETTE),
  flyer1: new Sprite(FLYER_1, PALETTE),
  flyer2: new Sprite(FLYER_2, PALETTE),
  chaser1: new Sprite(CHASER_1, PALETTE),
  chaser2: new Sprite(CHASER_2, PALETTE),
  crystal: new Sprite(CRYSTAL_1, PALETTE),
  crystal2: new Sprite(CRYSTAL_2, PALETTE),
  crystal3: new Sprite(CRYSTAL_3, PALETTE),
  crystal4: new Sprite(CRYSTAL_4, PALETTE),
  relic: new Sprite(RELIC_1, PALETTE),
  relic2: new Sprite(RELIC_2, PALETTE),
  heartFull: new Sprite(HEART_FULL, PALETTE),
  heartEmpty: new Sprite(HEART_EMPTY, PALETTE),
  doorLocked: new Sprite(DOOR_LOCKED, PALETTE),
  doorOpen: new Sprite(DOOR_OPEN, PALETTE),
  doorOpen2: new Sprite(DOOR_OPEN2, PALETTE),
  tileFill: new Sprite(TILE_FILL, PALETTE),
  tileFill2: new Sprite(TILE_FILL2, PALETTE),
  tileFill3: new Sprite(TILE_FILL3, PALETTE),
  tileTop: new Sprite(TILE_TOP, PALETTE),
  plank: new Sprite(TILE_PLANK, PALETTE),
};

// ============================================================
//  BIOMAS — identidad visual por región
// ------------------------------------------------------------
//  Cada bioma pinta la MISMA geometría con otra atmósfera: gradiente
//  de fondo, estalactitas/montículos/rayos, niebla, tiles de roca y
//  rim-lights. Así el mundo se siente grande y variado sin arte nuevo,
//  solo re-coloreando lo que ya existe. Luz cenital desde arriba-izq
//  (el flip no la invierte): rim izquierdo más brillante que el derecho.
// ============================================================

export type BiomeName = 'eco' | 'forjas' | 'aguas' | 'jardin' | 'corazon';

export interface Biome {
  gradTop: string;
  gradBottom: string;
  wallCrystals: [string, string, string]; // cristales incrustados lejanos
  wallTwinkle: string;                     // color del centelleo
  stalactite: string;                      // estalactitas del techo
  mound: string;                           // montículos de roca
  ray: string;                             // rayos de luz (rgb, se le pone alpha)
  fog: [string, string, string];           // bandas de niebla baja
  // Tiles: los 5 chars de las grillas de roca (r base, o veta, s sombra,
  // m sombra-cristal, t brillo-cristal) recoloreados por bioma.
  tile: { r: string; o: string; s: string; m: string; t: string };
  rimL: string;   // rim-light izquierdo (más brillante)
  rimR: string;   // rim-light derecho
  shadow: string; // base en sombra + chaflanes
  ambient: 'motes' | 'embers' | 'bubbles' | 'spores' | 'heart'; // partícula de aire
}

// Paleta de tiles base (hub Cavernas de Eco): idéntica a la original para no
// alterar el look actual del hub.
const ECO_TILE = { r: '#3d2a5c', o: '#56407e', s: '#241638', m: '#7a4bd6', t: '#ffe25a' };

export const BIOMES: Record<BiomeName, Biome> = {
  // Hub: violeta/cian, cristales que brillan, niebla suave. El look de siempre.
  eco: {
    gradTop: '#170c28', gradBottom: '#2a1644',
    wallCrystals: ['#4f3878', '#5a4188', '#6b4fa0'], wallTwinkle: '#c9b3f0',
    stalactite: '#241638', mound: '#1f1234', ray: '202,182,236',
    fog: ['#6a5296', '#4a3570', '#3a2a5e'],
    tile: ECO_TILE, rimL: '#8064b0', rimR: '#5f4790', shadow: '#160b24',
    ambient: 'motes',
  },
  // Forjas de escoria: naranjas/rojos, basalto negro, brasas que suben.
  forjas: {
    gradTop: '#1a0c0a', gradBottom: '#3a160e',
    wallCrystals: ['#8a3a1e', '#a8481f', '#c25a22'], wallTwinkle: '#ffb066',
    stalactite: '#1c0f0c', mound: '#160a08', ray: '255,170,90',
    fog: ['#7a3a26', '#5a2618', '#401810'],
    tile: { r: '#3a201a', o: '#5a2e20', s: '#1c0d0a', m: '#c2451f', t: '#ffb84a' },
    rimL: '#c26a3a', rimR: '#8a3f22', shadow: '#160805',
    ambient: 'embers',
  },
  // Aguas hundidas: azules profundos, caústicas, burbujas.
  aguas: {
    gradTop: '#08182e', gradBottom: '#0e2c50',
    wallCrystals: ['#1f5a7a', '#2870a0', '#3a90c0'], wallTwinkle: '#8fe0ff',
    stalactite: '#0a2038', mound: '#081828', ray: '120,200,255',
    fog: ['#265a7a', '#184258', '#102e40'],
    tile: { r: '#183a52', o: '#245a76', s: '#0a1e30', m: '#2f96c8', t: '#8fe0ff' },
    rimL: '#3a8fc0', rimR: '#22607f', shadow: '#08161f',
    ambient: 'bubbles',
  },
  // Jardín de esporas: verdes/turquesa bioluminiscentes, corrientes de viento.
  jardin: {
    gradTop: '#0a1e18', gradBottom: '#123828',
    wallCrystals: ['#2a7a58', '#33a06a', '#3ac080'], wallTwinkle: '#a8ffd0',
    stalactite: '#0e2820', mound: '#0a2018', ray: '150,255,190',
    fog: ['#2a7a56', '#1a5840', '#12402e'],
    tile: { r: '#1a4232', o: '#265e44', s: '#0c221a', m: '#33c884', t: '#c8ff9a' },
    rimL: '#3ac088', rimR: '#227f56', shadow: '#0a1c14',
    ambient: 'spores',
  },
  // Corazón de cristal: blanco-cian que late, el final.
  corazon: {
    gradTop: '#0c2030', gradBottom: '#123a4a',
    wallCrystals: ['#3a8fb0', '#4aa8d0', '#6ad0f0'], wallTwinkle: '#f5fcff',
    stalactite: '#102838', mound: '#0c2230', ray: '180,240,255',
    fog: ['#3a8fb0', '#286a86', '#1c4a60'],
    tile: { r: '#1e4a5e', o: '#2e6e82', s: '#0e2632', m: '#5ac8e0', t: '#f5fcff' },
    rimL: '#6ad0e8', rimR: '#3a8fa8', shadow: '#0a1e28',
    ambient: 'heart',
  },
};

export function biomeOf(name: string | undefined): Biome {
  return BIOMES[(name as BiomeName) in BIOMES ? (name as BiomeName) : 'eco'];
}

// ---- Tiles horneados por bioma ----
// Para cada bioma, recoloreamos las 5 grillas de roca con su mini-paleta.
// Son 8x8 procedurales: coste de bundle despreciable, look de roca propio.
export interface TileSet {
  fill: Sprite;
  fill2: Sprite;
  fill3: Sprite;
  top: Sprite;
  plank: Sprite;
}

function tilePalette(b: Biome): Palette {
  // Los chars de las grillas de roca; el resto de la paleta no se usa en tiles.
  return { r: b.tile.r, o: b.tile.o, s: b.tile.s, m: b.tile.m, t: b.tile.t };
}

const biomeTiles: Record<BiomeName, TileSet> = (() => {
  const out = {} as Record<BiomeName, TileSet>;
  for (const name of Object.keys(BIOMES) as BiomeName[]) {
    const pal = tilePalette(BIOMES[name]);
    out[name] = {
      fill: new Sprite(TILE_FILL, pal),
      fill2: new Sprite(TILE_FILL2, pal),
      fill3: new Sprite(TILE_FILL3, pal),
      top: new Sprite(TILE_TOP, pal),
      plank: new Sprite(TILE_PLANK, pal),
    };
  }
  return out;
})();

export function tilesFor(name: string | undefined): TileSet {
  return biomeTiles[(name as BiomeName) in biomeTiles ? (name as BiomeName) : 'eco'];
}

// ============================================================
//  BRILLOS (glow) — gradientes radiales cacheados
// ============================================================
const glowCache = new Map<string, HTMLCanvasElement>();

function getGlow(color: string, radius: number): HTMLCanvasElement {
  const key = `${color}:${radius}`;
  const cached = glowCache.get(key);
  if (cached) return cached;
  const size = radius * 2;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  glowCache.set(key, c);
  return c;
}

/** Dibuja un halo de luz centrado en (cx, cy), sumando luz (no tapa). */
export function drawGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  alpha: number,
): void {
  const glow = getGlow(color, radius);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.drawImage(glow, Math.round(cx - radius), Math.round(cy - radius));
  ctx.restore();
}

// ============================================================
//  FONDO con profundidad (parallax: capas a distinta velocidad)
// ------------------------------------------------------------
//  Cuanto más lejos está una capa, más lento se mueve respecto
//  de la cámara. De atrás hacia adelante:
//    0.2  cristales incrustados en la pared lejana
//    0.45 estalactitas del techo
//    0.7  montículos de roca
//    1.0  los tiles del nivel (los dibuja Level)
// ============================================================
interface Stalactite { x: number; w: number; len: number; }
interface WallCrystal { x: number; y: number; color: string; twinkle: number; }
interface Mound { x: number; w: number; h: number; }
interface GodRay { x: number; w: number; skew: number; alpha: number; phase: number; }

let stalactites: Stalactite[] = [];
let wallCrystals: WallCrystal[] = [];
let mounds: Mound[] = [];
let godRays: GodRay[] = [];
let generatedFor = ''; // clave (ancho + seed + bioma) del fondo cacheado

function ensureBackground(worldW: number, viewH: number, seedN: number, biome: Biome): void {
  const key = `${worldW}:${seedN}:${biome.gradTop}`;
  if (generatedFor === key) return; // cada sala genera su propio fondo
  generatedFor = key;
  let seed = 1337 + worldW * 31 + seedN * 977;
  const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  stalactites = [];
  for (let x = 6; x < worldW; x += 26 + Math.floor(rng() * 18)) {
    stalactites.push({ x, w: 6 + Math.floor(rng() * 8), len: 10 + Math.floor(rng() * 22) });
  }

  wallCrystals = [];
  const wallColors = biome.wallCrystals;
  for (let i = 0; i < Math.floor(worldW / 13); i++) {
    wallCrystals.push({
      x: rng() * worldW,
      y: 18 + rng() * (viewH - 58),
      color: wallColors[Math.floor(rng() * wallColors.length)],
      twinkle: rng() * Math.PI * 2, // fase del centelleo
    });
  }

  mounds = [];
  for (let x = -12; x < worldW; x += 30 + Math.floor(rng() * 26)) {
    mounds.push({ x, w: 28 + Math.floor(rng() * 30), h: 8 + Math.floor(rng() * 13) });
  }

  // Rayos de luz que bajan del techo (god rays)
  godRays = [];
  const rayCount = 2 + Math.floor(worldW / 200);
  for (let i = 0; i < rayCount; i++) {
    godRays.push({
      x: rng() * worldW,
      w: 14 + rng() * 22,
      skew: 12 + rng() * 22, // desplazamiento diagonal hacia abajo
      alpha: 0.05 + rng() * 0.05,
      phase: rng() * Math.PI * 2,
    });
  }
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  worldW: number,
  seedN = 0,
  time = 0,
  biomeName?: string,
): void {
  const biome = biomeOf(biomeName);
  // Degradado base del bioma
  const grad = ctx.createLinearGradient(0, 0, 0, viewH);
  grad.addColorStop(0, biome.gradTop);
  grad.addColorStop(1, biome.gradBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, viewW, viewH);

  ensureBackground(worldW, viewH, seedN, biome);

  // Capa lejanísima (0.2): cristales incrustados en la pared, que titilan
  const parWall = camX * 0.2;
  for (const c of wallCrystals) {
    const x = c.x - parWall;
    if (x < -4 || x > viewW + 4) continue;
    const spark = Math.sin(time * 1.6 + c.twinkle);
    ctx.fillStyle = spark > 0.85 ? biome.wallTwinkle : c.color;
    const s = spark > 0.85 ? 3 : 2;
    ctx.fillRect(Math.round(x), Math.round(c.y), s, s);
  }

  // Rayos de luz diagonales desde el techo (parallax 0.35, se mecen suave)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const parRay = camX * 0.35;
  const rayH = viewH * 0.72;
  for (const r of godRays) {
    const bx = r.x - parRay;
    const sway = Math.sin(time * 0.25 + r.phase) * 5;
    if (bx + r.skew + r.w < -20 || bx > viewW + 20) continue;
    const g = ctx.createLinearGradient(bx, 0, bx, rayH);
    g.addColorStop(0, `rgba(${biome.ray},${r.alpha})`);
    g.addColorStop(1, `rgba(${biome.ray},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(bx + sway, 0);
    ctx.lineTo(bx + r.w + sway, 0);
    ctx.lineTo(bx + r.w + r.skew + sway, rayH);
    ctx.lineTo(bx + r.skew + sway, rayH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Capa lejana (0.45): estalactitas del techo
  const parStal = camX * 0.45;
  ctx.fillStyle = biome.stalactite;
  for (const s of stalactites) {
    const x = s.x - parStal;
    if (x < -20 || x > viewW + 20) continue;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + s.w, 0);
    ctx.lineTo(x + s.w / 2, s.len);
    ctx.closePath();
    ctx.fill();
  }

  // Capa media (0.7): montículos de roca sobre la base
  const parMound = camX * 0.7;
  const baseY = viewH - 16 + camY * 0.2;
  ctx.fillStyle = biome.mound;
  for (const m of mounds) {
    const x = m.x - parMound;
    if (x + m.w < -12 || x > viewW + 12) continue;
    ctx.beginPath();
    ctx.moveTo(x, baseY + 18);
    ctx.quadraticCurveTo(x + m.w / 2, baseY - m.h, x + m.w, baseY + 18);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillRect(0, baseY + 4, viewW, viewH - baseY - 4);
}

// ---- Polvo flotante y brasas de cristal (espacio de pantalla) ----
interface Mote { x: number; y: number; speed: number; phase: number; size: number; }
interface Ember { x: number; y: number; speed: number; phase: number; }
let motes: Mote[] = [];
let embers: Ember[] = [];

export function initDust(viewW: number, viewH: number): void {
  let seed = 99;
  const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  motes = [];
  for (let i = 0; i < 26; i++) {
    motes.push({
      x: rng() * viewW,
      y: rng() * viewH,
      speed: 3 + rng() * 7,
      phase: rng() * Math.PI * 2,
      size: rng() < 0.3 ? 2 : 1,
    });
  }
  // Brasas: pocas motas doradas con halo que suben lento.
  embers = [];
  for (let i = 0; i < 7; i++) {
    embers.push({
      x: rng() * viewW,
      y: rng() * viewH,
      speed: 5 + rng() * 6,
      phase: rng() * Math.PI * 2,
    });
  }
}

export function drawDust(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  time: number,
  dt: number,
): void {
  // Brasas doradas con glow (detrás del polvo fino)
  for (const e of embers) {
    e.y -= e.speed * dt;
    if (e.y < -4) {
      e.y = viewH + 4;
      e.x = (e.x * 1.31 + 29) % viewW;
    }
    const ex = Math.round(e.x + Math.sin(time * 0.6 + e.phase) * 6);
    const ey = Math.round(e.y);
    drawGlow(ctx, ex, ey, 5, '#ffcf6a', 0.45 + Math.sin(time * 3 + e.phase) * 0.2);
    ctx.fillStyle = '#fff3c0';
    ctx.fillRect(ex, ey, 1, 1);
  }
  // Polvo fino
  ctx.fillStyle = 'rgba(214, 247, 255, 0.5)';
  for (const m of motes) {
    m.y -= m.speed * dt;
    if (m.y < -2) {
      m.y = viewH + 2;
      m.x = (m.x * 1.37 + 13) % viewW;
    }
    const sway = Math.sin(time * 0.8 + m.phase) * 4;
    ctx.fillRect(Math.round(m.x + sway), Math.round(m.y), m.size, m.size);
  }
}

/** Niebla baja: bandas onduladas semitransparentes que derivan por el
 *  piso, para dar profundidad y aire de cueva húmeda. */
export function drawFog(
  ctx: CanvasRenderingContext2D,
  camX: number,
  viewW: number,
  viewH: number,
  time: number,
  biomeName?: string,
): void {
  ctx.save();
  const colors = biomeOf(biomeName).fog;
  for (let i = 0; i < 3; i++) {
    const drift = time * (7 + i * 4) - camX * (0.3 + i * 0.12);
    const y0 = viewH - 10 - i * 4;
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.moveTo(0, viewH);
    ctx.lineTo(0, y0);
    for (let x = 0; x <= viewW; x += 6) {
      ctx.lineTo(x, y0 + Math.sin((x + drift) * 0.045 + i) * 3);
    }
    ctx.lineTo(viewW, viewH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ---- Viñeta (oscurece los bordes) cacheada ----
let vignette: HTMLCanvasElement | null = null;

export function drawVignette(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
  if (!vignette) {
    vignette = document.createElement('canvas');
    vignette.width = viewW;
    vignette.height = viewH;
    const vctx = vignette.getContext('2d')!;
    const grad = vctx.createRadialGradient(
      viewW / 2, viewH / 2, viewH * 0.35,
      viewW / 2, viewH / 2, viewH * 0.75,
    );
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, 'rgba(8, 4, 16, 0.55)');
    vctx.fillStyle = grad;
    vctx.fillRect(0, 0, viewW, viewH);
  }
  ctx.drawImage(vignette, 0, 0);
}
