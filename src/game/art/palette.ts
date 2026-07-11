// ============================================================
//  PALETA del juego
// ------------------------------------------------------------
//  Paleta con "hue shifting": las sombras no son el mismo color más
//  oscuro sino corridas hacia azul/violeta, y las luces hacia lo cálido.
//  La luz viene de ARRIBA (cenital): así el flip no la invierte.
// ============================================================

import type { Palette } from '../../engine/Sprite';

export const PALETTE: Palette = {
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
  // corazones (vida): rojo con luz cálida y sombra rojiza
  V: '#ff5a7a', v: '#b83a5a',
};
