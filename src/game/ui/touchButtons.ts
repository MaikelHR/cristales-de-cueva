// ============================================================
//  TOUCH BUTTONS — pixel art baked by code
// ------------------------------------------------------------
//  Like all the game's art, the touch pad faces are neither
//  images nor CSS: they're baked here pixel by pixel with the
//  cave palette and served as data-URLs that CSS stretches with
//  image-rendering: pixelated (the buttons are game sprites,
//  not browser chrome). Each face has two states: idle
//  (bevel with top-down light, like the tiles) and pressed (the
//  face dims, the glyph drops 1px and the outline lights up in
//  gold, just like a crystal when you collect it).
//
//  Color families: violet (d-pad/pause/menu) with the cave tile
//  ramp, gold (jump) with the crystal ramp, and cyan (dash) with
//  the player's own ramp.
// ============================================================

import { PALETTE } from '../art/palette';
import { font } from './text';

/** A button's two faces, ready for CSS (url in --tc-face*). */
export interface TouchFace {
  idle: string;
  pressed: string;
}

/** Ramp for a button family. Top-down light as in the whole
 *  palette: light bevel on top, shadow below (pressed inverts it). */
interface Ramp {
  outline: string;
  top: string;
  mid: string;
  dark: string;
  bottom: string;
  glyph: string;
  glyphShadow: string;
}

const VIOLET: Ramp = {
  outline: '#140b21',
  top: PALETTE.M, // #b98bff
  mid: PALETTE.o, // #56407e
  dark: PALETTE.r, // #3d2a5c
  bottom: PALETTE.s, // #241638
  glyph: PALETTE.R, // #e9d6ff
  glyphShadow: PALETTE.I, // #1c1028
};

const GOLD: Ramp = {
  outline: '#3a2008',
  top: PALETTE.h, // #fff7c9
  mid: PALETTE.Y, // #ffd23a
  dark: PALETTE.y, // #c9761f
  bottom: PALETTE.u, // #8f4d1a
  glyph: '#5a3210', // ENGRAVED glyph: dark over a light face...
  glyphShadow: PALETTE.h, // ...with a light glint bottom-right (chiseled)
};

const CYAN: Ramp = {
  outline: PALETTE.P, // #11242e
  top: PALETTE.H, // #d6f7ff
  mid: PALETTE.b, // #3f9ad0
  dark: PALETTE.d, // #2d5c94
  bottom: PALETTE.K, // #16283d
  glyph: PALETTE.W, // #f5fcff
  glyphShadow: PALETTE.P,
};

// --- Glyphs (pixel grids, 'X' = paint) --------------------------------

const ARROW_L = ['...X', '..XX', '.XXX', 'XXXX', '.XXX', '..XX', '...X'];
const ARROW_R = ['X...', 'XX..', 'XXX.', 'XXXX', 'XXX.', 'XX..', 'X...'];
const ARROW_D = ['XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
const ARROW_JUMP = [
  '....X....',
  '...XXX...',
  '..XXXXX..',
  '.XXXXXXX.',
  'XXXXXXXXX',
  '...XXX...',
  '...XXX...',
];
const CHEVRONS_DASH = [
  'XX....XX....',
  '.XX....XX...',
  '..XX....XX..',
  '...XX....XX.',
  '..XX....XX..',
  '.XX....XX...',
  'XX....XX....',
];
const BARS_PAUSE = ['XX.XX', 'XX.XX', 'XX.XX', 'XX.XX', 'XX.XX', 'XX.XX', 'XX.XX'];

// --- Baking -------------------------------------------------------------

function drawGrid(
  ctx: CanvasRenderingContext2D,
  grid: string[],
  color: string,
  x: number,
  y: number,
): void {
  ctx.fillStyle = color;
  for (let gy = 0; gy < grid.length; gy++) {
    const row = grid[gy];
    for (let gx = 0; gx < row.length; gx++) {
      if (row[gx] === 'X') ctx.fillRect(x + gx, y + gy, 1, 1);
    }
  }
}

/** The button "chassis": outline with carved corners (2px, gem
 *  silhouette), two-tone face and bevels. Pressed: gold outline,
 *  dimmed face and inverted bevel (the shadow moves to the top). */
function paintChassis(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ramp: Ramp,
  pressed: boolean,
): void {
  ctx.fillStyle = pressed ? PALETTE.t : ramp.outline;
  ctx.fillRect(0, 0, w, h);
  // Carved corners: clip 2x1 + 1x2 pixels per corner.
  const cuts: Array<[number, number, number, number]> = [
    [0, 0, 2, 1],
    [0, 0, 1, 2],
    [w - 2, 0, 2, 1],
    [w - 1, 0, 1, 2],
    [0, h - 1, 2, 1],
    [0, h - 2, 1, 2],
    [w - 2, h - 1, 2, 1],
    [w - 1, h - 2, 1, 2],
  ];
  for (const [cx, cy, cw, ch] of cuts) ctx.clearRect(cx, cy, cw, ch);

  // Two-tone face (lighter upper half: the light comes from above).
  const mid = pressed ? ramp.dark : ramp.mid;
  const dark = pressed ? ramp.bottom : ramp.dark;
  const midH = Math.max(1, Math.floor((h - 4) / 2));
  ctx.fillStyle = mid;
  ctx.fillRect(1, 2, w - 2, midH);
  ctx.fillStyle = dark;
  ctx.fillRect(1, 2 + midH, w - 2, h - 4 - midH);

  // Bevels: light on top / shadow below; pressed inverts them.
  ctx.fillStyle = pressed ? ramp.bottom : ramp.top;
  ctx.fillRect(2, 1, w - 4, 1);
  ctx.fillStyle = pressed ? mid : ramp.bottom;
  ctx.fillRect(2, h - 2, w - 4, 1);

  // Gem glint near the lit corner (idle only).
  if (!pressed) {
    ctx.fillStyle = ramp.top;
    ctx.fillRect(2, 2, 1, 1);
  }
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo hornear el botón táctil');
  return [canvas, ctx];
}

/** Bakes a button's two faces with a centered glyph. */
function bakeGlyphFace(w: number, h: number, ramp: Ramp, glyph: string[]): TouchFace {
  const gw = Math.max(...glyph.map((r) => r.length));
  const gh = glyph.length;
  const bake = (pressed: boolean): string => {
    const [canvas, ctx] = makeCanvas(w, h);
    paintChassis(ctx, w, h, ramp, pressed);
    const x = Math.floor((w - gw) / 2);
    const y = Math.floor((h - gh) / 2) + (pressed ? 1 : 0);
    drawGrid(ctx, glyph, ramp.glyphShadow, x + 1, y + 1);
    drawGrid(ctx, glyph, ramp.glyph, x, y);
    return canvas.toDataURL();
  };
  return { idle: bake(false), pressed: bake(true) };
}

/** The faces of all the gameplay pad's buttons. */
export function bakeControlFaces(): {
  left: TouchFace;
  right: TouchFace;
  down: TouchFace;
  jump: TouchFace;
  dash: TouchFace;
  pause: TouchFace;
} {
  return {
    left: bakeGlyphFace(16, 16, VIOLET, ARROW_L),
    right: bakeGlyphFace(16, 16, VIOLET, ARROW_R),
    down: bakeGlyphFace(36, 11, VIOLET, ARROW_D),
    jump: bakeGlyphFace(32, 16, GOLD, ARROW_JUMP),
    dash: bakeGlyphFace(26, 16, CYAN, CHEVRONS_DASH),
    pause: bakeGlyphFace(14, 14, VIOLET, BARS_PAUSE),
  };
}

// --- Joystick (the optional movement stick) -----------------------------
//  Same gem language as the buttons, but ROUND: a carved socket (dark well
//  ringed by a lit bevel, with the three directions the game uses etched on
//  the rim) and a crystal knob that sits in it. The knob is a separate face
//  because it MOVES with the thumb; touch.ts translates it inside the socket.

const STICK_BASE = 32; // native px of the socket (square: pixels stay square)
const STICK_KNOB = 16; // native px of the knob — half the socket, so the rim stays readable

// Tiny direction etchings for the rim (the stick only drives left/right/down,
// exactly like the d-pad it replaces — up is the jump button's job).
const TICK_L = ['..X', '.XX', 'XXX', '.XX', '..X'];
const TICK_R = ['X..', 'XX.', 'XXX', 'XX.', 'X..'];
const TICK_D = ['XXXXX', '.XXX.', '..X..'];

/**
 * The socket: a carved gem ring (lit bevel above, shadow below, like the
 * tiles) around a recessed dark WELL, with the three directions etched on the
 * rim. It has a SINGLE face on purpose — the press is told by the knob moving
 * and lighting gold, so gold-rimming the socket too just made a gaudy double
 * ring. The well stays dark so the bright knob pops out of it.
 */
function bakeStickBase(): string {
  const [canvas, ctx] = makeCanvas(STICK_BASE, STICK_BASE);
  const ramp = VIOLET;
  const c = STICK_BASE / 2;
  for (let y = 0; y < STICK_BASE; y++) {
    for (let x = 0; x < STICK_BASE; x++) {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      const d = Math.hypot(dx, dy);
      let col: string | null = null;
      if (d > 15.5) col = null; // outside the gem
      else if (d > 14.0) col = ramp.outline; // rim outline
      else if (d > 12.8) col = dy < 0 ? ramp.top : ramp.bottom; // bevel: lit above
      else if (d > 8.8) col = dy < 0 ? ramp.mid : ramp.dark; // ring face
      else if (d > 7.8) col = ramp.outline; // the socket's carved edge
      else col = dy < -1.5 ? ramp.bottom : ramp.dark; // the WELL, shadowed at the top
      if (col) {
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  for (const [grid, gx, gy] of [
    [TICK_L, 3, 13],
    [TICK_R, 26, 13],
    [TICK_D, 13, 25],
  ] as Array<[string[], number, number]>) {
    drawGrid(ctx, grid, ramp.glyphShadow, gx + 1, gy + 1);
    drawGrid(ctx, grid, ramp.glyph, gx, gy);
  }
  return canvas.toDataURL();
}

/** The knob: a crystal cap (lit dome, brighter than the well so it reads as a
 *  separate piece, plus a gem glint) that rides in the socket. Under the thumb
 *  its rim lights GOLD — the same "a crystal just woke up" note as every other
 *  pressed button. */
function bakeStickKnob(pressed: boolean): string {
  const [canvas, ctx] = makeCanvas(STICK_KNOB, STICK_KNOB);
  const ramp = VIOLET;
  const c = STICK_KNOB / 2;
  for (let y = 0; y < STICK_KNOB; y++) {
    for (let x = 0; x < STICK_KNOB; x++) {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      const d = Math.hypot(dx, dy);
      let col: string | null = null;
      if (d > 7.7) col = null;
      else if (d > 6.3) col = pressed ? PALETTE.t : ramp.outline; // gold rim under the thumb
      else if (dy < -2.6) col = ramp.top; // domed, lit top
      else if (dy < 1.6) col = PALETTE.m; // crystal body: brighter than the well
      else col = ramp.mid; // shadowed underside
      if (col) {
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  // Gem glint at the lit corner, like every chassis in the game.
  ctx.fillStyle = ramp.glyph;
  ctx.fillRect(5, 4, 2, 1);
  ctx.fillRect(5, 5, 1, 1);
  return canvas.toDataURL();
}

/** The joystick's two pieces. The socket doesn't change under the thumb (the
 *  knob says it), so its idle and pressed faces are the same bake. */
export function bakeStickFaces(): { base: TouchFace; knob: TouchFace } {
  const socket = bakeStickBase();
  return {
    base: { idle: socket, pressed: socket },
    knob: { idle: bakeStickKnob(false), pressed: bakeStickKnob(true) },
  };
}

/** Face of a pause-menu button: same chassis, but with the label
 *  written in the game's SAME font at native resolution — when stretched
 *  it comes out pixelated just like the menus drawn inside the canvas. It's
 *  re-baked on language change (and when the font finishes loading). */
export function bakeMenuFace(label: string, gold = false): TouchFace {
  const w = 128;
  const h = 24;
  const ramp = gold ? GOLD : VIOLET;
  const bake = (pressed: boolean): string => {
    const [canvas, ctx] = makeCanvas(w, h);
    paintChassis(ctx, w, h, ramp, pressed);
    ctx.font = font(10);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const y = Math.floor(h / 2) + (pressed ? 1 : 0);
    ctx.fillStyle = ramp.glyphShadow;
    ctx.fillText(label, w / 2 + 1, y + 1);
    ctx.fillStyle = ramp.glyph;
    ctx.fillText(label, w / 2, y);
    return canvas.toDataURL();
  };
  return { idle: bake(false), pressed: bake(true) };
}
