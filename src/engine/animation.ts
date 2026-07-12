// ============================================================
//  ANIMATION: frame cycles over time
// ------------------------------------------------------------
//  A single home for the "which frame is it now?" arithmetic.
//  frameAt(frames, fps, t) loops over the list; `phase` offsets
//  the cycle (e.g. by position, so two neighboring crystals
//  don't glow in sync).
//  If per-frame event clips are ever needed ("the hitbox is born
//  on frame 3"), this is the module to grow.
// ============================================================

export function frameAt<T>(
  frames: readonly T[],
  fps: number,
  t: number,
  phase = 0,
): T {
  return frames[Math.floor(t * fps + phase) % frames.length];
}
