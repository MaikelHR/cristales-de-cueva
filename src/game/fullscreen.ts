// ============================================================
//  PANTALLA COMPLETA
// ------------------------------------------------------------
//  El alternador que usan los menús del juego (título y pausa) y
//  el botón del mando táctil. Feature-detect: en navegadores que
//  no exponen requestFullscreen sobre elementos (iPhone Safari),
//  los menús directamente no ofrecen la opción.
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
