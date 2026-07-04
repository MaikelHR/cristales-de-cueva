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
};

// ---- Grillas (generadas y revisadas visualmente) ----
// Sel-out: el contorno es claro (C) arriba, donde pega la luz, y
// oscuro (K) abajo. El brillo W corona la cabeza; las sombras b/d
// se acumulan en la panza. Las manitas son los pixeles 'd' laterales.
const PLAYER_IDLE = [
  '....CCCC....', '...CHWWHC...', '..CHHHHHHC..', '.CHHBBBBHHC.',
  'CBBBBBBBBBBC', 'CBWWBBBBWWBC', 'KBWPBBBBWPBK', 'KBBBBBBBBBBK',
  'dKBbbbbbbBKd', '.KbbbbbbbbK.', '..KbbddbbK..', '...Kd..dK...',
  '...KK..KK...', '............',
];
// Respiración: el mismo cuerpo, comprimido un pixel (los pies no se mueven).
const PLAYER_IDLE2 = [
  '............', '....CCCC....', '...CHWWHC...', '.CHHBBBBHHC.',
  'CBBBBBBBBBBC', 'CBWWBBBBWWBC', 'KBWPBBBBWPBK', 'KBBBBBBBBBBK',
  'dKBbbbbbbBKd', '.KbbbbbbbbK.', '..KbbddbbK..', '...Kd..dK...',
  '...KK..KK...', '............',
];
// Parpadeo: los ojos se cierran en dos rayitas.
const PLAYER_BLINK = [
  '....CCCC....', '...CHWWHC...', '..CHHHHHHC..', '.CHHBBBBHHC.',
  'CBBBBBBBBBBC', 'CBBBBBBBBBBC', 'KBddBBBBddBK', 'KBBBBBBBBBBK',
  'dKBbbbbbbBKd', '.KbbbbbbbbK.', '..KbbddbbK..', '...Kd..dK...',
  '...KK..KK...', '............',
];
const PLAYER_RUN1 = [
  '....CCCC....', '...CHWWHC...', '..CHHHHHHC..', '.CHHBBBBHHC.',
  'CBBBBBBBBBBC', 'CBWWBBBBWWBC', 'KBWPBBBBWPBK', 'KBBBBBBBBBBK',
  'dKBbbbbbbBK.', '.KbbbbbbbbKd', '..KbbddbbK..', '...Kd..dK...',
  '..KK....KK..', '............',
];
const PLAYER_RUN2 = [
  '....CCCC....', '...CHWWHC...', '..CHHHHHHC..', '.CHHBBBBHHC.',
  'CBBBBBBBBBBC', 'CBWWBBBBWWBC', 'KBWPBBBBWPBK', 'KBBBBBBBBBBK',
  '.KBbbbbbbBKd', 'dKbbbbbbbbK.', '..KbbddbbK..', '...KddddK...',
  '...KK..KK...', '............',
];
const PLAYER_JUMP = [
  '....CCCC....', '...CHWWHC...', '..CHHHHHHC..', '.CHHBBBBHHC.',
  'CBBBBBBBBBBC', 'CBWWBBBBWWBC', 'KBWPBBBBWPBK', 'KBBBBBBBBBBK',
  'dKBbbbbbbBKd', '.KbbbbbbbbK.', '..KbbddbbK..', '...KddddK...',
  '....KKKK....', '............',
];
const PLAYER_FALL = [
  '....CCCC....', '...CHWWHC...', '..CHHHHHHC..', '.CHHBBBBHHC.',
  'CBBBBBBBBBBC', 'CBWWBBBBWWBC', 'KBWPBBBBWPBK', 'KBBBBBBBBBBK',
  'dKBbbbbbbBKd', '.KbbbbbbbbK.', '..KbbddbbK..', '..Kd....dK..',
  '.KK......KK.', '............',
];
// Deslizando por la pared: la mano del frente apoyada contra ella
// (el sprite mira a la derecha; el flip lo invierte si hace falta).
const PLAYER_WALL = [
  '....CCCC....', '...CHWWHC...', '..CHHHHHHC..', '.CHHBBBBHHC.',
  'CBBBBBBBBBBC', 'CBWWBBBBWWBC', 'KBWPBBBBWPBK', 'KBBBBBBBBBBK',
  'dKBbbbbbbBKK', '.KbbbbbbbKdd', '..KbbddbbK..', '..Kd...dK...',
  '..KK...KK...', '............',
];
// Slime: cúpula de luz arriba (gel brillante), sombra azulada abajo.
const SLIME_1 = [
  '...EEEE...', '..ELLLLE..', '.ELWWLLGE.', 'EGLLGGGGGJ',
  'EGWPGGWPGJ', 'JGGGGGGGGJ', '.JggggggJ.', '..JJJJJJ..',
];
const SLIME_2 = [
  '..........', '...EEEE...', '..ELLLLE..', '.ELWWLLGE.',
  'EGPPGGPPGJ', 'JGGGGGGGGJ', '.JggggggJ.', '..JJJJJJ..',
];
// Cristal facetado: destello arriba, sombra rojiza abajo-derecha.
const CRYSTAL = [
  '...hh...', '..hWWy..', '.hWYYYy.', 'hWYYYYyu',
  'hYYYYYyu', 'yYYYYYyu', '.yYYYyu.', '..yYyu..', '...yu...',
];
// Reliquia: orbe blanco-celeste con destello y sombra inferior.
const RELIC = [
  '...WW...', '..WHHW..', '.WHHHHW.', 'WHHWWHHW',
  '.WHbbHW.', '..WbbW..', '...bb...',
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
  playerJump: new Sprite(PLAYER_JUMP, PALETTE),
  playerFall: new Sprite(PLAYER_FALL, PALETTE),
  playerWall: new Sprite(PLAYER_WALL, PALETTE),
  slime1: new Sprite(SLIME_1, PALETTE),
  slime2: new Sprite(SLIME_2, PALETTE),
  crystal: new Sprite(CRYSTAL, PALETTE),
  relic: new Sprite(RELIC, PALETTE),
  doorLocked: new Sprite(DOOR_LOCKED, PALETTE),
  doorOpen: new Sprite(DOOR_OPEN, PALETTE),
  tileFill: new Sprite(TILE_FILL, PALETTE),
  tileFill2: new Sprite(TILE_FILL2, PALETTE),
  tileFill3: new Sprite(TILE_FILL3, PALETTE),
  tileTop: new Sprite(TILE_TOP, PALETTE),
  plank: new Sprite(TILE_PLANK, PALETTE),
};

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
interface WallCrystal { x: number; y: number; color: string; }
interface Mound { x: number; w: number; h: number; }

let stalactites: Stalactite[] = [];
let wallCrystals: WallCrystal[] = [];
let mounds: Mound[] = [];
let generatedFor = ''; // clave (ancho + variante) del fondo cacheado

function ensureBackground(worldW: number, viewH: number, variant: number): void {
  const key = `${worldW}:${variant}`;
  if (generatedFor === key) return; // cada sala genera su propio fondo
  generatedFor = key;
  let seed = 1337 + worldW * 31 + variant * 977;
  const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  stalactites = [];
  for (let x = 6; x < worldW; x += 26 + Math.floor(rng() * 18)) {
    stalactites.push({ x, w: 6 + Math.floor(rng() * 8), len: 10 + Math.floor(rng() * 22) });
  }

  wallCrystals = [];
  const wallColors = ['#4f3878', '#5a4188', '#6b4fa0'];
  for (let i = 0; i < Math.floor(worldW / 13); i++) {
    wallCrystals.push({
      x: rng() * worldW,
      y: 18 + rng() * (viewH - 58),
      color: wallColors[Math.floor(rng() * wallColors.length)],
    });
  }

  mounds = [];
  for (let x = -12; x < worldW; x += 30 + Math.floor(rng() * 26)) {
    mounds.push({ x, w: 28 + Math.floor(rng() * 30), h: 8 + Math.floor(rng() * 13) });
  }
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  worldW: number,
  variant = 0,
): void {
  // Degradado base
  const grad = ctx.createLinearGradient(0, 0, 0, viewH);
  grad.addColorStop(0, '#170c28');
  grad.addColorStop(1, '#2a1644');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, viewW, viewH);

  ensureBackground(worldW, viewH, variant);

  // Capa lejanísima (0.2): cristales incrustados en la pared
  const parWall = camX * 0.2;
  for (const c of wallCrystals) {
    const x = c.x - parWall;
    if (x < -4 || x > viewW + 4) continue;
    ctx.fillStyle = c.color;
    ctx.fillRect(Math.round(x), Math.round(c.y), 2, 2);
  }

  // Capa lejana (0.45): estalactitas del techo
  const parStal = camX * 0.45;
  ctx.fillStyle = '#241638';
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
  ctx.fillStyle = '#1f1234';
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

// ---- Polvo flotante (motes) en espacio de pantalla ----
interface Mote { x: number; y: number; speed: number; phase: number; size: number; }
let motes: Mote[] = [];

export function initDust(viewW: number, viewH: number): void {
  motes = [];
  let seed = 99;
  const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 26; i++) {
    motes.push({
      x: rng() * viewW,
      y: rng() * viewH,
      speed: 3 + rng() * 7,
      phase: rng() * Math.PI * 2,
      size: rng() < 0.3 ? 2 : 1,
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
