// ============================================================
//  GLOWS — cached radial gradients
// ------------------------------------------------------------
//  Each halo is generated ONCE per (color, radius) and then
//  stamped with drawImage, which is cheap per frame.
// ============================================================

const glowCache = new Map<string, HTMLCanvasElement>();

function getGlow(color: string, radius: number): HTMLCanvasElement {
  const key = `${color}:${radius}`;
  const cached = glowCache.get(key);
  if (cached) return cached;
  const size = radius * 2;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  glowCache.set(key, c);
  return c;
}

/** Draws a light halo centered at (cx, cy), adding light (does not cover). */
export function drawGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  alpha: number,
): void {
  const glow = getGlow(color, radius);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.drawImage(glow, Math.round(cx - radius), Math.round(cy - radius));
  ctx.restore();
}
