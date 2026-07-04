// ============================================================
//  UTILIDADES: lienzo (canvas) y cajas de colisión (AABB)
// ============================================================

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** ¿Se solapan dos rectángulos? (Axis-Aligned Bounding Box) */
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
 * Prepara el canvas para pixel-art: desactiva el suavizado para que
 * los pixeles se vean nítidos al escalarlos.
 */
export function setupContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo obtener el contexto 2D del canvas');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}
