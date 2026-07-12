// ============================================================
//  CAMERA
// ------------------------------------------------------------
//  Follows the player and "brakes" at the level edges so it never
//  shows the void outside. We round to integers so the pixel-art
//  doesn't shimmer.
//  It also knows how to shake: a burst of amplitude that decays on
//  its own, to give weight to violent moments (dying).
// ============================================================

import { clamp } from '../engine/canvas';

export class Camera {
  x = 0;
  y = 0;

  private shakeTime = 0;     // time remaining of the shake
  private shakeDuration = 0; // total duration, for the falloff
  private shakeAmp = 0;      // max amplitude in pixels

  constructor(
    private viewW: number,
    private viewH: number,
    private worldW: number,
    private worldH: number,
  ) {}

  /** Shakes the camera: up to amp pixels, for duration seconds. */
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
      // Each step, a random nudge that loses strength as it runs out.
      const force = this.shakeAmp * (this.shakeTime / this.shakeDuration);
      this.x += Math.round((Math.random() * 2 - 1) * force);
      this.y += Math.round((Math.random() * 2 - 1) * force);
    }
  }
}
