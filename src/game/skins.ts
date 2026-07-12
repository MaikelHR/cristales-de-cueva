// ============================================================
//  CHARACTER SKINS (customization)
// ------------------------------------------------------------
//  The crystal being comes in several "minerals": each skin is the
//  SAME pixel grid with the color ramp re-painted (tint over the
//  player's keys in the palette) plus its halo color. The data and
//  the chosen preference live here; the per-skin sprite baking is
//  in art/playerSkins.ts (needs the DOM).
//
//  The choice persists just like the language: its own localStorage
//  key, wrapped in try/catch. This module is pure and loads in Node
//  (testable) because it never touches the DOM.
// ============================================================

import type { Palette } from '../engine/Sprite';
import type { StrKey } from './i18n';

const KEY = 'cristales-skin';

export interface SkinDef {
  id: string;
  nameKey: StrKey; // the visible name ALWAYS goes through i18n
  glow: string;    // character halo color (in game and on the map)
  tint: Palette;   // re-paint of the player's ramp; empty = original look
}

// The ramps keep the value structure of the original
// (K dark outline, C light outline, B body, b shadow, d belly,
//  H head, W highlight) with each mineral's own hue shifting.
// The pupil P stays dark in all of them: the eyes are the identity.
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

/** Initial skin: the saved one if it exists; otherwise the original. */
function detect(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && SKINS.some((s) => s.id === saved)) return saved;
  } catch {
    // Storage blocked (or Node): we start with the original.
  }
  return SKINS[0].id;
}

let current: string = detect();
const listeners = new Set<() => void>();

/** The id of the active skin. */
export function getSkin(): string {
  return current;
}

/** The definition of the active skin (for drawing and labeling). */
export function currentSkin(): SkinDef {
  return SKINS.find((s) => s.id === current) ?? SKINS[0];
}

/** Changes the skin (unknown ids are ignored), saves it and notifies. */
export function setSkin(id: string): void {
  if (id === current || !SKINS.some((s) => s.id === id)) return;
  current = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // No storage: it still changes, it just isn't remembered.
  }
  for (const fn of listeners) fn();
}

/** Moves to the next skin (dir=1) or previous (dir=-1), wrapping around. */
export function cycleSkin(dir: 1 | -1 = 1): void {
  const i = SKINS.findIndex((s) => s.id === current);
  setSkin(SKINS[(i + dir + SKINS.length) % SKINS.length].id);
}

/** Subscribes to skin changes (to re-paint the touch DOM). */
export function onSkinChange(fn: () => void): void {
  listeners.add(fn);
}
