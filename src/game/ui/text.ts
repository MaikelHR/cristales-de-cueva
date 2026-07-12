// ============================================================
//  TEXT — the game's font and shared formatting
// ------------------------------------------------------------
//  A single place for the canvas typography: changing the game's
//  font means changing it here.
// ============================================================

/** The game's font at a given size (px). */
export function font(sizePx: number): string {
  return `${sizePx}px "JetBrains Mono", ui-monospace, monospace`;
}

/** Formats seconds as m:ss (e.g. 83.4 -> "1:23"). */
export function formatTime(seconds: number): string {
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
