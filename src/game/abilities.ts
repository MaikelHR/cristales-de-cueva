// ============================================================
//  HABILIDADES DESBLOQUEABLES
// ------------------------------------------------------------
//  El vocabulario compartido entre los datos de sala (qué reliquia
//  hay), el jugador (qué sabe hacer) y la interfaz (qué anunciar).
// ============================================================

export type AbilityName = 'doubleJump' | 'dash' | 'wallJump';

export const ABILITY_NAMES: readonly AbilityName[] = ['doubleJump', 'dash', 'wallJump'];
