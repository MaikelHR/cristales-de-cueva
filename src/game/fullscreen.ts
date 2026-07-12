// ============================================================
//  FULLSCREEN
// ------------------------------------------------------------
//  The toggle used by the game's menus (title and pause) and the
//  touch-controls button. Feature-detect: on browsers that don't
//  expose requestFullscreen on elements (iPhone Safari), the menus
//  simply don't offer the option.
// ============================================================

export function fullscreenAvailable(): boolean {
  return typeof document.documentElement.requestFullscreen === 'function';
}

export function toggleFullscreen(): void {
  if (!fullscreenAvailable()) return;
  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => {});
  } else {
    void document.documentElement.requestFullscreen().catch(() => {});
  }
}
