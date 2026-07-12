// ============================================================
//  Shared animation CLOCK
// ------------------------------------------------------------
//  A seconds counter the session advances and that actors read
//  for their idle animations (bob, glints). It's an object (not a
//  number) so everyone sees the SAME value: it also advances in
//  the menus, so the world keeps breathing in the background.
// ============================================================

export interface Clock {
  t: number;
}
