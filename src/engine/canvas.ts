// ============================================================
//  UTILITIES: canvas and collision boxes (AABB)
// ============================================================

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Do two rectangles overlap? (Axis-Aligned Bounding Box) */
export function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * Prepares the canvas for pixel-art: disables smoothing so the
 * pixels stay crisp when scaled up.
 */
export function setupContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo obtener el contexto 2D del canvas');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}
