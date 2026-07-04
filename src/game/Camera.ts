// ============================================================
//  CÁMARA
// ------------------------------------------------------------
//  Sigue al jugador y se "frena" en los bordes del nivel para no
//  mostrar el vacío de afuera. Redondeamos a enteros para que el
//  pixel-art no tiemble.
// ============================================================

import { clamp } from '../engine/canvas';

export class Camera {
  x = 0;
  y = 0;

  constructor(
    private viewW: number,
    private viewH: number,
    private worldW: number,
    private worldH: number,
  ) {}

  follow(targetX: number, targetY: number): void {
    const maxX = Math.max(0, this.worldW - this.viewW);
    const maxY = Math.max(0, this.worldH - this.viewH);
    this.x = Math.round(clamp(targetX - this.viewW / 2, 0, maxX));
    this.y = Math.round(clamp(targetY - this.viewH / 2, 0, maxY));
  }
}
