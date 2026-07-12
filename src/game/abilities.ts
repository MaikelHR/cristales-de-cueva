// ============================================================
//  UNLOCKABLE ABILITIES
// ------------------------------------------------------------
//  The shared vocabulary between room data (which relic there is),
//  the player (what it knows how to do), and the UI (what to announce).
// ============================================================

export type AbilityName =
  | 'doubleJump'
  | 'dash'
  | 'wallJump'
  | 'glide'
  | 'pound'
  | 'smash'
  | 'dive';

export const ABILITY_NAMES: readonly AbilityName[] = [
  'doubleJump',
  'dash',
  'wallJump',
  'glide',
  'pound',
  'smash',
  'dive',
];
