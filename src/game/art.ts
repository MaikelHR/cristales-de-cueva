// ============================================================
//  ARTE DEL JUEGO
// ------------------------------------------------------------
//  Todos los sprites como grillas de pixeles (editables como texto),
//  más la atmósfera de la cueva: brillos, fondo con profundidad,
//  polvo flotando y viñeta. Tocá los colores o las grillas para
//  cambiar el look sin tocar la lógica.
// ============================================================

import { Sprite, type Palette } from '../engine/Sprite';

const PALETTE: Palette = {
  // jugador (ser de cristal)
  K: '#0e1c26', B: '#7ce0ff', b: '#3aa6d6', d: '#245f7e',
  H: '#d6f7ff', W: '#f5fcff', P: '#11242e',
  // slime
  J: '#183a1c', G: '#5ce06a', g: '#33a843', L: '#beffc8',
  // cristal
  Y: '#ffd23a', y: '#b88a14', h: '#fff7c9',
  // puerta
  F: '#7a4bd6', f: '#4a2e70', M: '#b98bff', I: '#1c1028', R: '#e9d6ff',
  // tiles de cueva
  r: '#3d2a5c', o: '#56407e', s: '#241638', m: '#7a4bd6', t: '#ffe25a',
};

// ---- Grillas (generadas y revisadas visualmente) ----
const PLAYER_IDLE = [
  '....KKKK....', '...KBBBBK...', '..KBBBBBBK..', '.KBBBHBBBBK.',
  'KBBBBBBBBBBK', 'KBWWBBBBWWBK', 'KBWPBBBBWPBK', 'KBBBBBBBBBBK',
  '.KBBbbbbBBK.', '..KBbbbbBK..', '...KbbddK...', '...Kd..dK...',
  '...KK..KK...', '............',
];
const PLAYER_RUN1 = [
  '....KKKK....', '...KBBBBK...', '..KBBBBBBK..', '.KBBBHBBBBK.',
  'KBBBBBBBBBBK', 'KBWWBBBBWWBK', 'KBWPBBBBWPBK', 'KBBBBBBBBBBK',
  '.KBBbbbbBBK.', '..KBbbbbBK..', '...KbbddK...', '...Kd..dK...',
  '..KK....KK..', '............',
];
const PLAYER_RUN2 = [
  '....KKKK....', '...KBBBBK...', '..KBBBBBBK..', '.KBBBHBBBBK.',
  'KBBBBBBBBBBK', 'KBWWBBBBWWBK', 'KBWPBBBBWPBK', 'KBBBBBBBBBBK',
  '.KBBbbbbBBK.', '..KBbbbbBK..', '...KbbddK...', '...KddddK...',
  '...KK..KK...', '............',
];
const PLAYER_JUMP = [
  '....KKKK....', '...KBBBBK...', '..KBBBBBBK..', '.KBBBHBBBBK.',
  'KBBBBBBBBBBK', 'KBWWBBBBWWBK', 'KBWPBBBBWPBK', 'KBBBBBBBBBBK',
  '.KBBbbbbBBK.', '..KBbbbbBK..', '...KbddbK...', '...KddddK...',
  '....KKKK....', '............',
];
const PLAYER_FALL = [
  '....KKKK....', '...KBBBBK...', '..KBBBBBBK..', '.KBBBHBBBBK.',
  'KBBBBBBBBBBK', 'KBWWBBBBWWBK', 'KBWPBBBBWPBK', 'KBBBBBBBBBBK',
  '.KBBbbbbBBK.', '..KBbbbbBK..', '...KbbddK...', '..Kd....dK..',
  '.KK......KK.', '............',
];
const SLIME_1 = [
  '...JJJJ...', '..JGGGGJ..', '.JGGLLGGJ.', 'JGGGGGGGGJ',
  'JGWPGGWPGJ', 'JGGGGGGGGJ', '.JggggggJ.', '..JJJJJJ..',
];
const SLIME_2 = [
  '..........', '...JJJJ...', '..JGGGGJ..', '.JGGLLGGJ.',
  'JGGGGGGGGJ', 'JGPPGGPPGJ', '.JggggggJ.', '..JJJJJJ..',
];
const CRYSTAL = [
  '...yy...', '..yhYy..', '.yhYYYy.', 'yhYYYYYy',
  'yYYYYYYy', 'yYYYYYYy', '.yYYYYy.', '..yYYy..', '...yy...',
];
const DOOR_LOCKED = [
  '....FIIF....', '...FIIIIF...', '..FIIIIIIF..', '.fFIIIIIIFf.',
  '.fFIIIIIIFf.', '.fFIIIIIIFf.', '.fFIIIIIIFf.', '.fFIIffIIFf.',
  '.fFIIIIIIFf.', '.fFIIIIIIFf.', '.fFIIffIIFf.', '.fFIIIIIIFf.',
  '.fFIIIIIIFf.', '.fFIIffIIFf.', '.fFIIIIIIFf.', '.fFIIIIIIFf.',
  '.fFIIIIIIFf.', '.fFIIIIIIFf.', '.fFIIIIIIFf.', '.fFIIIIIIFf.',
  '.fFIIIIIIFf.', '.ffffffffff.',
];
const DOOR_OPEN = [
  '....FIIF....', '...FIIIIF...', '..FIIIIIIF..', '.fMIIIIIIFf.',
  '.fMIIIIIIFf.', '.fMIIIIIIFf.', '.fMIIIIIIFf.', '.fMIIRRIIFf.',
  '.fMIIIIIIFf.', '.fMIIIIIIFf.', '.fMIIRRIIFf.', '.fMIIIIIIFf.',
  '.fMIIIIIIFf.', '.fMIIRRIIFf.', '.fMIIIIIIFf.', '.fMIIIIIIFf.',
  '.fMIIIIIIFf.', '.fMIIIIIIFf.', '.fMIIIIIIFf.', '.fMIIIIIIFf.',
  '.fMIIIIIIFf.', '.ffffffffff.',
];
const TILE_FILL = [
  'rrrorrrr', 'rorrrrro', 'rrrrorrr', 'orrrrrro',
  'rrrorrrr', 'rrrrrror', 'rorrrrrr', 'ssssssss',
];
const TILE_TOP = [
  'ootmmtoo', 'roooooor', 'rrrrorrr', 'orrrrrro',
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
  playerRun1: new Sprite(PLAYER_RUN1, PALETTE),
  playerRun2: new Sprite(PLAYER_RUN2, PALETTE),
  playerJump: new Sprite(PLAYER_JUMP, PALETTE),
  playerFall: new Sprite(PLAYER_FALL, PALETTE),
  slime1: new Sprite(SLIME_1, PALETTE),
  slime2: new Sprite(SLIME_2, PALETTE),
  crystal: new Sprite(CRYSTAL, PALETTE),
  doorLocked: new Sprite(DOOR_LOCKED, PALETTE),
  doorOpen: new Sprite(DOOR_OPEN, PALETTE),
  tileFill: new Sprite(TILE_FILL, PALETTE),
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
//  FONDO con profundidad (parallax + estalactitas + humps)
// ============================================================
interface Stalactite { x: number; w: number; len: number; }
let stalactites: Stalactite[] = [];
let stalactitesFor = -1; // ancho de mundo para el que se generaron

function ensureStalactites(worldW: number): void {
  if (stalactitesFor === worldW) return; // cada sala regenera las suyas
  stalactitesFor = worldW;
  stalactites = [];
  let seed = 1337 + worldW; // semilla distinta por sala: otro techo
  const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let x = 6; x < worldW; x += 26 + Math.floor(rng() * 18)) {
    stalactites.push({ x, w: 6 + Math.floor(rng() * 8), len: 10 + Math.floor(rng() * 22) });
  }
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  worldW: number,
): void {
  // Degradado base
  const grad = ctx.createLinearGradient(0, 0, 0, viewH);
  grad.addColorStop(0, '#170c28');
  grad.addColorStop(1, '#2a1644');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, viewW, viewH);

  // Estalactitas lejanas (parallax 0.45)
  ensureStalactites(worldW);
  const par = camX * 0.45;
  ctx.fillStyle = '#241638';
  for (const s of stalactites) {
    const x = s.x - par;
    if (x < -20 || x > viewW + 20) continue;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + s.w, 0);
    ctx.lineTo(x + s.w / 2, s.len);
    ctx.closePath();
    ctx.fill();
  }
  // Loma de fondo abajo
  ctx.fillStyle = '#1f1234';
  const baseY = viewH - 18 + (camY * 0.2);
  ctx.fillRect(0, baseY, viewW, 30);
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
