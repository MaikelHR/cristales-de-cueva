// ============================================================
//  CÁMARA
// ------------------------------------------------------------
//  Sigue al jugador y se "frena" en los bordes del nivel para no
//  mostrar el vacío de afuera. Redondeamos a enteros para que el
//  pixel-art no tiemble.
//  También sabe sacudirse (shake): un golpe de amplitud que se
//  apaga solo, para dar peso a los momentos violentos (morir).
// ============================================================

import { clamp } from '../engine/canvas';

export class Camera {
  x = 0;
  y = 0;

  private shakeTime = 0;     // tiempo restante de la sacudida
  private shakeDuration = 0; // duración total, para atenuar
  private shakeAmp = 0;      // amplitud máxima en píxeles

  constructor(
    private viewW: number,
    private viewH: number,
    private worldW: number,
    private worldH: number,
  ) {}

  /** Sacude la cámara: hasta amp píxeles, durante duration segundos. */
  shake(amp: number, duration: number): void {
    this.shakeAmp = amp;
    this.shakeTime = duration;
    this.shakeDuration = duration;
  }

  update(dt: number): void {
    this.shakeTime = Math.max(0, this.shakeTime - dt);
  }

  follow(targetX: number, targetY: number): void {
    const maxX = Math.max(0, this.worldW - this.viewW);
    const maxY = Math.max(0, this.worldH - this.viewH);
    this.x = Math.round(clamp(targetX - this.viewW / 2, 0, maxX));
    this.y = Math.round(clamp(targetY - this.viewH / 2, 0, maxY));

    if (this.shakeTime > 0) {
      // Cada paso, un empujón aleatorio que pierde fuerza al acabarse.
      const force = this.shakeAmp * (this.shakeTime / this.shakeDuration);
      this.x += Math.round((Math.random() * 2 - 1) * force);
      this.y += Math.round((Math.random() * 2 - 1) * force);
    }
  }
}
