// ============================================================
//  BOTONES TÁCTILES — arte pixel horneado por código
// ------------------------------------------------------------
//  Como todo el arte del juego, las caras del mando táctil no son
//  imágenes ni CSS: se hornean acá pixel a pixel con la paleta de
//  la cueva y se entregan como data-URLs que el CSS estira con
//  image-rendering: pixelated (los botones son sprites del juego,
//  no chrome del navegador). Cada cara tiene dos estados: reposo
//  (bisel con luz cenital, como los tiles) y presionado (la cara
//  se apaga, el glifo baja 1px y el contorno se enciende en
//  dorado, igual que un cristal al recogerlo).
//
//  Familias de color: violeta (cruceta/pausa/menú) con la rampa
//  de los tiles de cueva, dorado (salto) con la de los cristales,
//  y celeste (dash) con la rampa del propio jugador.
// ============================================================

import { PALETTE } from '../art/palette';
import { font } from './text';

/** Las dos caras de un botón, listas para CSS (url en --tc-face*). */
export interface TouchFace {
  idle: string;
  pressed: string;
}

/** Rampa de una familia de botón. Luz CENITAL como en toda la
 *  paleta: bisel claro arriba, sombra abajo (presionado la invierte). */
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
  glyph: '#5a3210', // glifo GRABADO: oscuro sobre cara clara...
  glyphShadow: PALETTE.h, // ...con brillo claro abajo-derecha (cincelado)
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

// --- Glifos (grillas pixel, 'X' = pintar) --------------------------------

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

// --- Horneado -------------------------------------------------------------

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

/** El "chasis" del botón: contorno con esquinas talladas (2px, silueta
 *  de gema), cara en dos tonos y biseles. Presionado: contorno dorado,
 *  cara apagada y bisel invertido (la sombra pasa arriba). */
function paintChassis(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ramp: Ramp,
  pressed: boolean,
): void {
  ctx.fillStyle = pressed ? PALETTE.t : ramp.outline;
  ctx.fillRect(0, 0, w, h);
  // Esquinas talladas: se recortan 2x1 + 1x2 pixeles por esquina.
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

  // Cara en dos tonos (mitad superior más clara: la luz viene de arriba).
  const mid = pressed ? ramp.dark : ramp.mid;
  const dark = pressed ? ramp.bottom : ramp.dark;
  const midH = Math.max(1, Math.floor((h - 4) / 2));
  ctx.fillStyle = mid;
  ctx.fillRect(1, 2, w - 2, midH);
  ctx.fillStyle = dark;
  ctx.fillRect(1, 2 + midH, w - 2, h - 4 - midH);

  // Biseles: claro arriba / sombra abajo; presionado los invierte.
  ctx.fillStyle = pressed ? ramp.bottom : ramp.top;
  ctx.fillRect(2, 1, w - 4, 1);
  ctx.fillStyle = pressed ? mid : ramp.bottom;
  ctx.fillRect(2, h - 2, w - 4, 1);

  // Destello de gema cerca de la esquina iluminada (solo en reposo).
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

/** Hornea las dos caras de un botón con un glifo centrado. */
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

/** Las caras de todos los botones del mando de juego. */
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

/** Cara de un botón del menú de pausa: mismo chasis, pero con el rótulo
 *  escrito con la MISMA letra del juego a resolución nativa — al estirarse
 *  queda pixelada igual que los menús dibujados dentro del canvas. Se
 *  re-hornea al cambiar de idioma (y cuando la fuente termina de cargar). */
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
