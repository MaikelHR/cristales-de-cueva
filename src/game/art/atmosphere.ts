// ============================================================
//  ATMÓSFERA de la cueva
// ------------------------------------------------------------
//  Todo lo que da "aire" a la escena sin ser parte de la lógica:
//  fondo con profundidad (parallax), rayos de luz, polvo flotante,
//  niebla baja y viñeta. Espacio de pantalla salvo el parallax.
// ============================================================

import { drawGlow } from './glow';

// ============================================================
//  FONDO con profundidad (parallax: capas a distinta velocidad)
// ------------------------------------------------------------
//  Cuanto más lejos está una capa, más lento se mueve respecto
//  de la cámara. De atrás hacia adelante:
//    0.2  cristales incrustados en la pared lejana
//    0.45 estalactitas del techo
//    0.7  montículos de roca
//    1.0  los tiles del nivel (los dibuja el renderer de tiles)
// ============================================================
interface Stalactite { x: number; w: number; len: number; }
interface WallCrystal { x: number; y: number; color: string; twinkle: number; }
interface Mound { x: number; w: number; h: number; }
interface GodRay { x: number; w: number; skew: number; alpha: number; phase: number; }

let stalactites: Stalactite[] = [];
let wallCrystals: WallCrystal[] = [];
let mounds: Mound[] = [];
let godRays: GodRay[] = [];
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
  variant = 0,
  time = 0,
): void {
  // Degradado base
  const grad = ctx.createLinearGradient(0, 0, 0, viewH);
  grad.addColorStop(0, '#170c28');
  grad.addColorStop(1, '#2a1644');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, viewW, viewH);

  ensureBackground(worldW, viewH, variant);

  // Capa lejanísima (0.2): cristales incrustados en la pared, que titilan
  const parWall = camX * 0.2;
  for (const c of wallCrystals) {
    const x = c.x - parWall;
    if (x < -4 || x > viewW + 4) continue;
    const spark = Math.sin(time * 1.6 + c.twinkle);
    ctx.fillStyle = spark > 0.85 ? '#c9b3f0' : c.color;
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
    g.addColorStop(0, `rgba(202,182,236,${r.alpha})`);
    g.addColorStop(1, 'rgba(202,182,236,0)');
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
): void {
  ctx.save();
  const colors = ['#6a5296', '#4a3570', '#3a2a5e'];
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
