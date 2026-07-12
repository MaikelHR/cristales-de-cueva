// ============================================================
//  Game SPRITES
// ------------------------------------------------------------
//  All sprites as pixel grids (editable as text).
//  Tweak the colors (in palette.ts) or the grids to change the
//  look without touching the logic.
// ============================================================

import { Sprite } from '../../engine/Sprite';
import { PALETTE } from './palette';

// Slime: translucent gel with a glossy dome (WW), green body with a
// bluish shadow below and bright eyes. 2 frames (blink). 11x8.
const SLIME_1 = [
  '...EEEEE...', '..ELLLLLE..', '.ELWWLGGGE.', 'EGLGGGGGGGJ',
  'EGWPGGWPGGJ', 'JGGGGGGGGGJ', '.JgggggggJ.', '..JJJJJJJ..',
];
const SLIME_2 = [
  '...EEEEE...', '..ELLLLLE..', '.ELWWLGGGE.', 'EGLGGGGGGGJ',
  'EGddGGddGGJ', 'JGGGGGGGGGJ', '.JgggggggJ.', '..JJJJJJJ..',
];
// Flyer (crystal bat): cyan body with a sparkle, eyes and purple
// wings (M bright, m shadow) that flap. 9x7.
const FLYER_1 = [
  'MM.....MM', '.Mm...mM.', '..mBWBm..', '..bBBBb..',
  '..KPBPK..', '...KKK...', '.........',
];
const FLYER_2 = [
  '.........', 'M.......M', '.Mm...mM.', '..mBWBm..',
  '..bBBBb..', '.MKPBPKM.', '.M.....M.',
];
// Chaser (spiked ball): menacing red with a highlight on top, shadow
// below, dark eyes and little legs that roll. 9x7.
const CHASER_1 = [
  '.v.v.v.v.', '.vVWVVVv.', 'vVVVVVVVv', 'vVPVVVPVv',
  'vVVVVVVVv', '.vvvvvvv.', '.K.K.K.K.',
];
const CHASER_2 = [
  '.v.v.v.v.', '.vVWVVVv.', 'vVVVVVVVv', 'vVPVVVPVv',
  'vVVVVVVVv', '.vvvvvvv.', 'K.K.K.K.K',
];
// Faceted crystal: 4 frames of a highlight sweeping the facets (sparkle
// left -> top -> right -> rest). Reddish shadow bottom-right.
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
// Relic: white-sky-blue orb that breathes light (2 frames).
const RELIC_1 = [
  '...WW...', '..WHHW..', '.WHHHHW.', 'WHHWWHHW',
  '.WHbbHW.', '..WbbW..', '...bb...',
];
const RELIC_2 = [
  '...WW...', '..WWWW..', '.WWWWWW.', 'WWWWWWWW',
  '.WWbbWW.', '..WbbW..', '...bb...',
];
// HUD hearts: full (with a W sparkle) and empty (hollow outline).
const HEART_FULL = [
  '.VV.VV.', 'VWVVVVV', 'VVVVVVV', '.VVVVv.', '..VVv..', '...v...',
];
const HEART_EMPTY = [
  '.vv.vv.', 'v..v..v', 'v.....v', '.v...v.', '..v.v..', '...v...',
];
// Doors: the interior lightens up top (i) and sinks below (I).
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
// Open door, frame B: the runes pulse in bright white.
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
// Variant with a small embedded crystal: breaks the repetition.
const TILE_FILL2 = [
  'rrrorrrr', 'rorrrrro', 'rrtmorrr', 'orrmrrro',
  'rrrorrrr', 'rrrrrror', 'rorrrrrr', 'ssssssss',
];
// Variant with a vertical crack.
const TILE_FILL3 = [
  'rrrorrrr', 'rorsrrro', 'rrrsorrr', 'orrsrrro',
  'rrrsrrrr', 'rrrrsror', 'rorrrrrr', 'ssssssss',
];
const TILE_TOP = [
  'ootmmtoo', 'oooooooo', 'rrrrorrr', 'orrrrrro',
  'rrrorrrr', 'rrrrrror', 'rorrrrrr', 'ssssssss',
];
// One-way plank: thin, with highlights on the edge.
const TILE_PLANK = [
  'mtoootmo',
  'orrrrrro',
  '.s....s.',
];

// The player sprites are NOT here: they live in playerSkins.ts
// (baked per skin). Drawing the character = playerSprites().
export const sprites = {
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
