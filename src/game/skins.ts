// ============================================================
//  SKINS DEL PERSONAJE (personalización)
// ------------------------------------------------------------
//  El ser de cristal viene en varios "minerales": cada skin es la
//  MISMA grilla de pixeles con la rampa de color re-pintada (tint
//  sobre las claves del jugador en la paleta) más el color de su
//  halo. Acá viven los datos y la preferencia elegida; el horneado
//  de sprites por skin está en art/playerSkins.ts (necesita DOM).
//
//  La elección persiste igual que el idioma: su propia clave de
//  localStorage, envuelta en try/catch. Este módulo es puro y
//  carga en Node (testeable) porque no toca el DOM.
// ============================================================

import type { Palette } from '../engine/Sprite';
import type { StrKey } from './i18n';

const KEY = 'cristales-skin';

export interface SkinDef {
  id: string;
  nameKey: StrKey; // el nombre visible pasa SIEMPRE por i18n
  glow: string;    // color del halo del personaje (en juego y en el mapa)
  tint: Palette;   // re-pintado de la rampa del jugador; vacío = look original
}

// Las rampas conservan la estructura de valores de la original
// (K contorno oscuro, C contorno claro, B cuerpo, b sombra, d panza,
//  H cabeza, W destello) con el hue shifting propio de cada mineral.
// La pupila P queda oscura en todas: los ojos son la identidad.
export const SKINS: readonly SkinDef[] = [
  { id: 'cristal', nameKey: 'skin_cristal', glow: '#3aa6d6', tint: {} },
  {
    id: 'esmeralda',
    nameKey: 'skin_esmeralda',
    glow: '#3ab56e',
    tint: {
      K: '#0f2f22', C: '#4fbf7a', B: '#72eda4', b: '#3aa468',
      d: '#2a6b50', H: '#dcffe9', W: '#f4fff8',
    },
  },
  {
    id: 'ambar',
    nameKey: 'skin_ambar',
    glow: '#d6a03a',
    tint: {
      K: '#3a2412', C: '#d9a24a', B: '#ffce5e', b: '#cf8a2c',
      d: '#96591c', H: '#fff0c9', W: '#fffbf0',
    },
  },
  {
    id: 'rosa',
    nameKey: 'skin_rosa',
    glow: '#d65a9b',
    tint: {
      K: '#3a1630', C: '#d46fa6', B: '#ff96cd', b: '#cc5896',
      d: '#8f3a6d', H: '#ffdff0', W: '#fff6fb',
    },
  },
  {
    id: 'amatista',
    nameKey: 'skin_amatista',
    glow: '#8a5fd6',
    tint: {
      K: '#231540', C: '#9a6fe0', B: '#b98bff', b: '#8257d6',
      d: '#54309e', H: '#ecdcff', W: '#f9f4ff',
    },
  },
];

/** Skin inicial: la guardada si existe; si no, la original. */
function detect(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && SKINS.some((s) => s.id === saved)) return saved;
  } catch {
    // Almacenamiento bloqueado (o Node): arrancamos con la original.
  }
  return SKINS[0].id;
}

let current: string = detect();
const listeners = new Set<() => void>();

/** El id de la skin activa. */
export function getSkin(): string {
  return current;
}

/** La definición de la skin activa (para pintar y rotular). */
export function currentSkin(): SkinDef {
  return SKINS.find((s) => s.id === current) ?? SKINS[0];
}

/** Cambia la skin (ids desconocidos se ignoran), la guarda y avisa. */
export function setSkin(id: string): void {
  if (id === current || !SKINS.some((s) => s.id === id)) return;
  current = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // Sin almacenamiento: cambia igual, solo que no se recuerda.
  }
  for (const fn of listeners) fn();
}

/** Pasa a la skin siguiente (dir=1) o anterior (dir=-1), en rueda. */
export function cycleSkin(dir: 1 | -1 = 1): void {
  const i = SKINS.findIndex((s) => s.id === current);
  setSkin(SKINS[(i + dir + SKINS.length) % SKINS.length].id);
}

/** Se suscribe a los cambios de skin (para re-pintar el DOM táctil). */
export function onSkinChange(fn: () => void): void {
  listeners.add(fn);
}
