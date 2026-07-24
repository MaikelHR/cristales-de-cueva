// ============================================================
//  DEBUG FLAGS (development only)
// ------------------------------------------------------------
//  The cheat switches, kept in ONE tiny object so the hot paths can
//  read them without importing the toolkit. Every place that reads one
//  guards it with `import.meta.env.DEV &&`, which makes the whole
//  branch dead code in a production build and lets Rollup drop it —
//  the shipped game contains no cheats, not even switched-off ones.
//
//  The panel that drives these lives in `dev/devtools.ts` and is
//  loaded with a dynamic import from main.ts, also behind a DEV check,
//  so none of its code reaches the bundle either.
//
//    M  (or F2)         // open/close the toolkit
//    __dev.god = true   // or from the console
// ============================================================

export const debug = {
  /** Draw every collision box. */
  hitboxes: false,
  /** Light up every false wall ('*') at full seam strength, from
   *  anywhere in the room instead of at arm's length. A LOOKING flag,
   *  like `hitboxes`: it changes what you see, never what the run does,
   *  which is why `cheatsActive` below deliberately ignores it. */
  secrets: false,
  /** No damage, no drowning in a pit, no game over. */
  god: false,
  /** Fly through geometry with the movement keys (dash = faster). */
  noclip: false,
  /** Logic speed multiplier: 0.25 = slow-mo, 4 = fast-forward. */
  timeScale: 1,
  /** The world is held still (drawing continues). */
  frozen: false,
  /** Consumed by main.ts to advance exactly one step while frozen. */
  stepOnce: false,
};

/** True when a cheat is altering the run, so the HUD can say so.
 *  Speed and freeze count: a "why is this so slow" bug report that turns
 *  out to be a forgotten 0.25 timescale is a bad afternoon. */
export function cheatsActive(): boolean {
  return debug.god || debug.noclip || debug.frozen || debug.timeScale !== 1;
}
