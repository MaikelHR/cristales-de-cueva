// ============================================================
//  Game PALETTE
// ------------------------------------------------------------
//  Palette with "hue shifting": shadows aren't just a darker version
//  of the same color but shifted toward blue/violet, and highlights
//  toward warm. Light comes from ABOVE (top-down): so the flip doesn't
//  invert it.
// ============================================================

import type { Palette } from '../../engine/Sprite';

export const PALETTE: Palette = {
  // player (crystal being): cool ramp, violet-tinted shadows
  K: '#16283d', C: '#5a9fd4', B: '#7ce0ff', b: '#3f9ad0', d: '#2d5c94',
  H: '#d6f7ff', W: '#f5fcff', P: '#11242e',
  // slime: greens with a bright top outline and bluish shadow
  J: '#123528', E: '#46b558', G: '#5ce06a', g: '#2f9655', L: '#beffc8',
  // crystal: amber with reddish shadows (warm hue shift)
  Y: '#ffd23a', y: '#c9761f', h: '#fff7c9', u: '#8f4d1a',
  // door: interior with a gradient (i top, I bottom)
  F: '#7a4bd6', f: '#4a2e70', M: '#b98bff', I: '#1c1028', i: '#2a1a3e', R: '#e9d6ff',
  // cave tiles
  r: '#3d2a5c', o: '#56407e', s: '#241638', m: '#7a4bd6', t: '#ffe25a',
  // hearts (health): red with warm highlight and reddish shadow
  V: '#ff5a7a', v: '#b83a5a',
};
