// ============================================================
//  HABILIDADES DESBLOQUEABLES
// ------------------------------------------------------------
//  El vocabulario compartido entre los datos de sala (qué reliquia
//  hay), el jugador (qué sabe hacer) y la interfaz (qué anunciar).
// ============================================================

export type AbilityName = 'doubleJump' | 'dash' | 'wallJump' | 'glide' | 'pound' | 'smash';

export const ABILITY_NAMES: readonly AbilityName[] = [
  'doubleJump',
  'dash',
  'wallJump',
  'glide',
  'pound',
  'smash',
];
