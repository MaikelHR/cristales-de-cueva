// ============================================================
//  OCCLUSION — the rule that keeps the foreground honest
// ------------------------------------------------------------
//  One pure function, in its own file, for the same reason `song.ts`
//  is separate from `audio.ts`: everything else in render/ imports the
//  tile sets, which bake canvases the moment the module loads, so none
//  of it can be read under Node. This rule is the one part of the near
//  plane that MUST be testable, so it lives where a test can reach it.
//
//  It is the answer to the one way a foreground layer can ruin a
//  platformer: by standing between the camera and the player. A 6x11px
//  character on a 320x176 view vanishes behind a silhouette instantly,
//  and Silksong's occluders are its most-complained-about visual
//  decision for exactly that reason. So every occluder asks this
//  function how much to get out of the way, and inside FADE_NEAR the
//  answer is "entirely".
// ============================================================

/** How close (px) the player has to be before an occluder starts
 *  getting out of the way, and how far before it is fully drawn.
 *  NEAR is deliberately about two player-heights: an occluder that
 *  clears the body but still covers the ledge you are about to jump to
 *  has not actually solved anything. */
export const FADE_NEAR = 26;
export const FADE_FAR = 62;

/**
 * How much an occluder spanning [x0, x1] x [y0, y1] should draw, given
 * a player at (px, py). 1 = fully, 0 = not at all. Distances are
 * measured from the player to the occluder's BOX, so a long shape does
 * not have to be near its own centre to step aside.
 */
export function playerFade(
  x0: number, x1: number, y0: number, y1: number, px: number, py: number,
): number {
  const dx = Math.max(x0 - px, 0, px - x1);
  const dy = Math.max(y0 - py, 0, py - y1);
  const d = Math.hypot(dx, dy);
  if (d >= FADE_FAR) return 1;
  if (d <= FADE_NEAR) return 0;
  return (d - FADE_NEAR) / (FADE_FAR - FADE_NEAR);
}
