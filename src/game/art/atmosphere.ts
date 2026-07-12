// ============================================================
//  Cave ATMOSPHERE
// ------------------------------------------------------------
//  Everything that gives the scene "air" without being part of
//  the logic: depth background (six parallax layers themed per
//  level), light rays, floating dust, low fog and vignette.
//  Screen space except the parallax.
// ============================================================

import { drawGlow } from './glow';

// ============================================================
//  Per-level THEMES: each biome has its own color ramp
//  (cavernas violet, galerias deep blue, corazon crimson,
//  esporas bioluminescent green, glaciar pale sky-blue, fragua
//  orange over coal) so entering a new level FEELS different.
// ============================================================
interface CaveTheme {
  gradTop: string;
  gradBottom: string;
  /** Strata patches on the farthest wall. */
  strata: string;
  /** Crystals embedded in the wall and their glint. */
  crystals: string[];
  spark: string;
  /** Distant silhouette: floor towers and ceiling fringe. */
  skyline: string;
  /** Haze band that separates the far from the near. */
  haze: string;
  /** RGB components of the god rays ("r,g,b"). */
  ray: string;
  /** Mid layer: stalactites/columns and their lit edge. */
  mid: string;
  midEdge: string;
  root: string;
  /** Accent color: glowing crystals, mushrooms, fireflies. */
  accent: string;
  accentLight: string;
  /** Near layer: mounds and stalagmites. */
  near: string;
  nearTop: string;
  drip: string;
  /** Low fog bands, from far to near. */
  fog: [string, string, string];
}

const THEMES: Record<string, CaveTheme> = {
  cavernas: {
    gradTop: '#170c28', gradBottom: '#2a1644',
    strata: '#1d1032',
    crystals: ['#4f3878', '#5a4188', '#6b4fa0'], spark: '#c9b3f0',
    skyline: '#211337',
    haze: 'rgba(122, 75, 214, 0.06)',
    ray: '202,182,236',
    mid: '#241638', midEdge: '#3a2456', root: '#2c1b44',
    accent: '#b98bff', accentLight: '#e9d6ff',
    near: '#1f1234', nearTop: '#2e1c48',
    drip: '#9ad4f0',
    fog: ['#6a5296', '#4a3570', '#3a2a5e'],
  },
  galerias: {
    gradTop: '#0b1626', gradBottom: '#14304a',
    strata: '#102236',
    crystals: ['#2f5878', '#38688c', '#4180a8'], spark: '#b3e3f0',
    skyline: '#12283e',
    haze: 'rgba(75, 170, 214, 0.06)',
    ray: '182,224,236',
    mid: '#122338', midEdge: '#20405a', root: '#182c46',
    accent: '#7ce0ff', accentLight: '#d6f7ff',
    near: '#0e1e32', nearTop: '#1b3450',
    drip: '#a8e8ff',
    fog: ['#4f7ba0', '#35567a', '#26405e'],
  },
  corazon: {
    gradTop: '#200a16', gradBottom: '#3e1524',
    strata: '#2a0e1c',
    crystals: ['#743843', '#88414c', '#a04f58'], spark: '#f0b3ba',
    skyline: '#331120',
    haze: 'rgba(214, 95, 75, 0.06)',
    ray: '236,192,182',
    mid: '#2a1020', midEdge: '#4e2434', root: '#3a1626',
    accent: '#ff8a6a', accentLight: '#ffd6c0',
    near: '#240c1a', nearTop: '#3c1a2c',
    drip: '#ffb08a',
    fog: ['#96525e', '#703548', '#5e2a3e'],
  },
  // The spore garden: bioluminescent green, humid living air.
  esporas: {
    gradTop: '#0b1d12', gradBottom: '#173f28',
    strata: '#102a1a',
    crystals: ['#2f7850', '#38885c', '#41a06e'], spark: '#b3f0cc',
    skyline: '#123a24',
    haze: 'rgba(75, 214, 140, 0.06)',
    ray: '182,236,200',
    mid: '#0f2a1a', midEdge: '#20573a', root: '#173a28',
    accent: '#6ee08a', accentLight: '#d6ffe2',
    near: '#0d2316', nearTop: '#1b4a30',
    drip: '#a8ffd0',
    fog: ['#4fa07b', '#357a5a', '#265e42'],
  },
  // The silent glacier: pale sky-blues, white light, stillness.
  glaciar: {
    gradTop: '#0e1c30', gradBottom: '#2c5474',
    strata: '#16283e',
    crystals: ['#5888a8', '#68a0c0', '#7ab8d8'], spark: '#eafaff',
    skyline: '#1c3448',
    haze: 'rgba(170, 220, 255, 0.07)',
    ray: '222,240,255',
    mid: '#16293c', midEdge: '#3a6484', root: '#20405a',
    accent: '#bfeaff', accentLight: '#ffffff',
    near: '#122234', nearTop: '#2a4c66',
    drip: '#dff6ff',
    fog: ['#7fa8c8', '#5a80a0', '#40607e'],
  },
  // The core's forge: orange embers over black coal.
  fragua: {
    gradTop: '#150a05', gradBottom: '#3a170a',
    strata: '#20100a',
    crystals: ['#784028', '#8c4c2e', '#a05a34'], spark: '#f0c8a0',
    skyline: '#2a120a',
    haze: 'rgba(214, 120, 40, 0.07)',
    ray: '236,190,150',
    mid: '#1c0d07', midEdge: '#4e2814', root: '#331508',
    accent: '#ffb03a', accentLight: '#ffe8c0',
    near: '#180b05', nearTop: '#38180c',
    drip: '#ffcf6a',
    fog: ['#a06038', '#7a4426', '#5e321c'],
  },
  // The level map: the same violet grotto but with a gold accent
  // (the record crystals along the path drive the palette).
  overworld: {
    gradTop: '#150b24', gradBottom: '#28153e',
    strata: '#1c0f30',
    crystals: ['#4f3878', '#5a4188', '#6b4fa0'], spark: '#c9b3f0',
    skyline: '#1f1234',
    haze: 'rgba(122, 75, 214, 0.06)',
    ray: '212,192,220',
    mid: '#221434', midEdge: '#382250', root: '#2a1a40',
    accent: '#ffd76a', accentLight: '#fff3c0',
    near: '#1d1130', nearTop: '#2c1a44',
    drip: '#9ad4f0',
    fog: ['#6a5296', '#4a3570', '#3a2a5e'],
  },
};

// ============================================================
//  Depth BACKGROUND (parallax: layers at different speeds)
// ------------------------------------------------------------
//  The farther a layer is, the slower it moves relative to the
//  camera. From back to front:
//    0.10 strata on the farthest wall
//    0.18 embedded crystals that twinkle
//    0.30 distant silhouette (floor towers + ceiling fringe)
//    0.35 diagonal light rays
//    0.55 stalactites, columns, roots, glowing crystals
//    0.78 mounds, stalagmites and glowing mushrooms
//    1.0  the level tiles (drawn by the tile renderer)
// ============================================================
interface Strata { x: number; y: number; w: number; }
interface WallCrystal { x: number; y: number; color: string; twinkle: number; }
interface Tower { x: number; w: number; h: number; }
interface Fringe { x: number; w: number; len: number; }
interface GodRay { x: number; w: number; skew: number; alpha: number; phase: number; }
interface Stalactite { x: number; w: number; len: number; column: boolean; gems: boolean; }
interface Root { x: number; len: number; phase: number; }
interface Drip { x: number; y0: number; period: number; phase: number; }
interface Mound { x: number; w: number; h: number; }
interface Stalagmite { x: number; w: number; h: number; }
interface Shroom { x: number; h: number; phase: number; }

interface BgLayers {
  strata: Strata[];
  wallCrystals: WallCrystal[];
  towers: Tower[];
  fringe: Fringe[];
  godRays: GodRay[];
  stalactites: Stalactite[];
  roots: Root[];
  drips: Drip[];
  mounds: Mound[];
  stalagmites: Stalagmite[];
  shrooms: Shroom[];
}

let bg: BgLayers | null = null;
let generatedFor = ''; // key (width + variant + theme) of the cached background

function ensureBackground(worldW: number, viewH: number, variant: number, themeId: string): void {
  const key = `${worldW}:${viewH}:${variant}:${themeId}`;
  if (generatedFor === key && bg) return; // each room generates its own background
  generatedFor = key;
  const theme = THEMES[themeId] ?? THEMES.cavernas;
  let seed = 1337 + worldW * 31 + variant * 977 + themeId.length * 53;
  const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  const strata: Strata[] = [];
  for (let x = -20; x < worldW; x += 34 + Math.floor(rng() * 30)) {
    strata.push({
      x,
      y: 10 + rng() * (viewH - 50),
      w: 26 + Math.floor(rng() * 40),
    });
  }

  const wallCrystals: WallCrystal[] = [];
  for (let i = 0; i < Math.floor(worldW / 11); i++) {
    wallCrystals.push({
      x: rng() * worldW,
      y: 14 + rng() * (viewH - 52),
      color: theme.crystals[Math.floor(rng() * theme.crystals.length)],
      twinkle: rng() * Math.PI * 2, // twinkle phase
    });
  }

  // Distant silhouette: a horizon of rock towers and ceiling fringe,
  // the layer that gives the scene the most "giant cave" feel.
  const towers: Tower[] = [];
  for (let x = -16; x < worldW; x += 20 + Math.floor(rng() * 22)) {
    towers.push({ x, w: 12 + Math.floor(rng() * 20), h: 22 + Math.floor(rng() * 34) });
  }
  const fringe: Fringe[] = [];
  for (let x = -8; x < worldW; x += 12 + Math.floor(rng() * 14)) {
    fringe.push({ x, w: 8 + Math.floor(rng() * 10), len: 6 + Math.floor(rng() * 16) });
  }

  // Light rays coming down from the ceiling (god rays)
  const godRays: GodRay[] = [];
  const rayCount = 2 + Math.floor(worldW / 200);
  for (let i = 0; i < rayCount; i++) {
    godRays.push({
      x: rng() * worldW,
      w: 14 + rng() * 22,
      skew: 12 + rng() * 22, // diagonal offset downward
      alpha: 0.05 + rng() * 0.05,
      phase: rng() * Math.PI * 2,
    });
  }

  // Mid layer: stalactites (one in five reaches the floor and
  // becomes a column; others have pulsing gems at the tip) and
  // swaying roots.
  const stalactites: Stalactite[] = [];
  const drips: Drip[] = [];
  for (let x = 6; x < worldW; x += 26 + Math.floor(rng() * 18)) {
    const column = rng() < 0.18;
    const gems = !column && rng() < 0.3;
    const s: Stalactite = { x, w: 6 + Math.floor(rng() * 8), len: 12 + Math.floor(rng() * 24), column, gems };
    stalactites.push(s);
    // Some tips drip water: the drop is born, falls, and is born again.
    if (!column && !gems && rng() < 0.35) {
      drips.push({ x: x + s.w / 2, y0: s.len, period: 2.2 + rng() * 3.5, phase: rng() });
    }
  }
  const roots: Root[] = [];
  for (let i = 0; i < Math.floor(worldW / 55); i++) {
    roots.push({ x: rng() * worldW, len: 10 + Math.floor(rng() * 14), phase: rng() * Math.PI * 2 });
  }

  // Near layer: mounds, stalagmites and glowing mushrooms.
  const mounds: Mound[] = [];
  for (let x = -12; x < worldW; x += 30 + Math.floor(rng() * 26)) {
    mounds.push({ x, w: 28 + Math.floor(rng() * 30), h: 8 + Math.floor(rng() * 13) });
  }
  const stalagmites: Stalagmite[] = [];
  for (let x = 10; x < worldW; x += 38 + Math.floor(rng() * 34)) {
    stalagmites.push({ x, w: 5 + Math.floor(rng() * 6), h: 8 + Math.floor(rng() * 12) });
  }
  const shrooms: Shroom[] = [];
  for (let i = 0; i < Math.floor(worldW / 65); i++) {
    shrooms.push({ x: rng() * worldW, h: 3 + Math.floor(rng() * 3), phase: rng() * Math.PI * 2 });
  }

  bg = { strata, wallCrystals, towers, fringe, godRays, stalactites, roots, drips, mounds, stalagmites, shrooms };
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
  themeId = 'cavernas',
): void {
  const theme = THEMES[themeId] ?? THEMES.cavernas;

  // Base gradient
  const grad = ctx.createLinearGradient(0, 0, 0, viewH);
  grad.addColorStop(0, theme.gradTop);
  grad.addColorStop(1, theme.gradBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, viewW, viewH);

  ensureBackground(worldW, viewH, variant, themeId);
  const L = bg!;

  // Strata on the farthest wall (0.10): sediment bands that
  // narrow toward the bottom (no hard rectangles).
  const parStrata = camX * 0.1;
  ctx.fillStyle = theme.strata;
  for (const s of L.strata) {
    const x = s.x - parStrata;
    if (x + s.w < -4 || x > viewW + 4) continue;
    const y = Math.round(s.y - camY * 0.05);
    ctx.fillRect(Math.round(x), y, s.w, 2);
    ctx.fillRect(Math.round(x + 5), y + 2, Math.max(4, s.w - 10), 2);
    ctx.fillRect(Math.round(x + 10), y + 4, Math.max(2, s.w - 20), 1);
  }

  // Crystals embedded in the wall (0.18), twinkling
  const parWall = camX * 0.18;
  for (const c of L.wallCrystals) {
    const x = c.x - parWall;
    if (x < -4 || x > viewW + 4) continue;
    const spark = Math.sin(time * 1.6 + c.twinkle);
    ctx.fillStyle = spark > 0.85 ? theme.spark : c.color;
    const s = spark > 0.85 ? 3 : 2;
    ctx.fillRect(Math.round(x), Math.round(c.y - camY * 0.08), s, s);
  }

  // Distant silhouette (0.30): horizon of towers and ceiling fringe
  const parSky = camX * 0.3;
  const skyBase = viewH - 6 + camY * 0.1;
  ctx.fillStyle = theme.skyline;
  for (const tw of L.towers) {
    const x = tw.x - parSky;
    if (x + tw.w < -8 || x > viewW + 8) continue;
    ctx.beginPath();
    ctx.moveTo(x, skyBase);
    ctx.lineTo(x + tw.w * 0.28, skyBase - tw.h);
    ctx.lineTo(x + tw.w * 0.55, skyBase - tw.h * 0.72);
    ctx.lineTo(x + tw.w * 0.8, skyBase - tw.h * 0.9);
    ctx.lineTo(x + tw.w, skyBase);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillRect(0, skyBase, viewW, viewH - skyBase);
  const fringeY = -camY * 0.12;
  for (const f of L.fringe) {
    const x = f.x - parSky;
    if (x + f.w < -8 || x > viewW + 8) continue;
    ctx.beginPath();
    ctx.moveTo(x, fringeY);
    ctx.lineTo(x + f.w, fringeY);
    ctx.lineTo(x + f.w / 2, fringeY + f.len);
    ctx.closePath();
    ctx.fill();
  }

  // Depth haze band: separates the far from the near
  const haze = ctx.createLinearGradient(0, viewH * 0.4, 0, viewH);
  haze.addColorStop(0, 'transparent');
  haze.addColorStop(1, theme.haze);
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, viewW, viewH);

  // Diagonal light rays from the ceiling (parallax 0.35, sway gently)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const parRay = camX * 0.35;
  const rayH = viewH * 0.72;
  for (const r of L.godRays) {
    const bx = r.x - parRay;
    const sway = Math.sin(time * 0.25 + r.phase) * 5;
    if (bx + r.skew + r.w < -20 || bx > viewW + 20) continue;
    const g = ctx.createLinearGradient(bx, 0, bx, rayH);
    g.addColorStop(0, `rgba(${theme.ray},${r.alpha})`);
    g.addColorStop(1, `rgba(${theme.ray},0)`);
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

  // Mid layer (0.55): stalactites and columns with a lit edge,
  // swaying roots, pulsing crystals and drips.
  const parMid = camX * 0.55;
  const midCeil = -camY * 0.18;
  const midFloor = viewH - 10 + camY * 0.12;
  for (const s of L.stalactites) {
    const x = s.x - parMid;
    if (x + s.w < -20 || x > viewW + 20) continue;
    ctx.fillStyle = theme.mid;
    if (s.column) {
      // Giant formation: an enormous stalactite and stalagmite that
      // almost touch. No thin waist in the middle: against the
      // gradient that strip lost contrast and left a loose vertical
      // line floating.
      const cw = s.w + 4;
      ctx.beginPath();
      ctx.moveTo(x - 2, midCeil);
      ctx.lineTo(x + cw, midCeil);
      ctx.lineTo(x + cw / 2 + 1, midCeil + viewH * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 4, midFloor);
      ctx.lineTo(x + cw / 2 + 1, midFloor - viewH * 0.34);
      ctx.lineTo(x + cw + 2, midFloor);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(x, midCeil);
      ctx.lineTo(x + s.w, midCeil);
      ctx.lineTo(x + s.w / 2, midCeil + s.len);
      ctx.closePath();
      ctx.fill();
      // Lit edge on the left side (the light comes from above).
      ctx.strokeStyle = theme.midEdge;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, midCeil);
      ctx.lineTo(x + s.w / 2 + 0.5, midCeil + s.len);
      ctx.stroke();
      // Gems hanging from the tip: they grow FROM the rock, never float.
      if (s.gems) {
        const tipX = x + s.w / 2;
        const tipY = midCeil + s.len;
        const pulse = 0.15 + (Math.sin(time * 1.8 + s.x) + 1) * 0.08;
        drawGlow(ctx, tipX, tipY, 8, theme.accent, pulse);
        ctx.fillStyle = theme.accent;
        const lens = [3, 5, 3];
        for (let k = 0; k < 3; k++) {
          const sx = tipX - 3 + k * 2;
          const yb = tipY - 3 - (k === 1 ? 0 : 2);
          ctx.beginPath();
          ctx.moveTo(sx, yb);
          ctx.lineTo(sx + 2, yb);
          ctx.lineTo(sx + 1, yb + lens[k] + 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = theme.accentLight;
        ctx.fillRect(Math.round(tipX), Math.round(tipY - 1), 1, 1);
      }
    }
  }
  // Hanging roots: each segment sways more the lower it is.
  ctx.fillStyle = theme.root;
  for (const r of L.roots) {
    const x = r.x - parMid;
    if (x < -8 || x > viewW + 8) continue;
    for (let sgm = 0; sgm < r.len; sgm += 2) {
      const sway = Math.sin(time * 0.8 + r.phase + sgm * 0.18) * (sgm / r.len) * 2.5;
      ctx.fillRect(Math.round(x + sway), Math.round(midCeil + sgm), 1, 2);
    }
  }
  // Drips: the drop peeks at the tip, falls accelerating and is reborn.
  ctx.fillStyle = theme.drip;
  for (const d of L.drips) {
    const x = Math.round(d.x - parMid);
    if (x < -4 || x > viewW + 4) continue;
    const p = (time / d.period + d.phase) % 1;
    const y0 = midCeil + d.y0;
    if (p < 0.25) {
      ctx.fillRect(x, Math.round(y0), 1, 1); // the drop is forming
    } else {
      const q = (p - 0.25) / 0.75;
      const y = y0 + q * q * (midFloor - y0);
      ctx.fillRect(x, Math.round(y), 1, 2);
    }
  }

  // Near layer (0.78): mounds, stalagmites and glowing mushrooms
  const parNear = camX * 0.78;
  const baseY = viewH - 16 + camY * 0.2;
  for (const m of L.mounds) {
    const x = m.x - parNear;
    if (x + m.w < -12 || x > viewW + 12) continue;
    ctx.fillStyle = theme.nearTop;
    ctx.beginPath();
    ctx.moveTo(x, baseY + 18);
    ctx.quadraticCurveTo(x + m.w / 2, baseY - m.h - 1, x + m.w, baseY + 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = theme.near;
    ctx.beginPath();
    ctx.moveTo(x, baseY + 18);
    ctx.quadraticCurveTo(x + m.w / 2, baseY - m.h + 1, x + m.w, baseY + 18);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = theme.near;
  for (const s of L.stalagmites) {
    const x = s.x - parNear;
    if (x + s.w < -8 || x > viewW + 8) continue;
    ctx.beginPath();
    ctx.moveTo(x, baseY + 8);
    ctx.lineTo(x + s.w / 2, baseY + 8 - s.h);
    ctx.lineTo(x + s.w, baseY + 8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillRect(0, baseY + 4, viewW, viewH - baseY - 4);
  // Mushrooms: stem, cap and a pulse of light at floor level.
  for (const sh of L.shrooms) {
    const x = Math.round(sh.x - parNear);
    if (x < -6 || x > viewW + 6) continue;
    const y = Math.round(baseY + 7);
    const pulse = 0.12 + (Math.sin(time * 2.2 + sh.phase) + 1) * 0.06;
    drawGlow(ctx, x + 1, y - sh.h, 6, theme.accent, pulse);
    ctx.fillStyle = theme.nearTop;
    ctx.fillRect(x + 1, y - sh.h, 1, sh.h);
    ctx.fillStyle = theme.accent;
    ctx.fillRect(x - 1, y - sh.h - 1, 5, 1);
    ctx.fillRect(x, y - sh.h - 2, 3, 1);
  }
}

// ---- Floating dust and crystal embers (screen space) ----
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
  // Embers: a few golden motes with a halo that rise slowly.
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
  // Golden embers with glow (behind the fine dust)
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
  // Fine dust
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

/** Low fog: semitransparent wavy bands drifting along the floor,
 *  to give depth and the feel of a damp cave. */
export function drawFog(
  ctx: CanvasRenderingContext2D,
  camX: number,
  viewW: number,
  viewH: number,
  time: number,
  themeId = 'cavernas',
): void {
  ctx.save();
  const colors = (THEMES[themeId] ?? THEMES.cavernas).fog;
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

// ---- Vignette (darkens the edges), cached ----
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
