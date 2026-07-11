// ============================================================
//  SPRITES del juego
// ------------------------------------------------------------
//  Todos los sprites como grillas de pixeles (editables como texto).
//  Tocá los colores (en palette.ts) o las grillas para cambiar el
//  look sin tocar la lógica.
// ============================================================

import { Sprite } from '../../engine/Sprite';
import { PALETTE } from './palette';

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
