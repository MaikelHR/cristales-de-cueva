// ============================================================
//  SPRITE
// ------------------------------------------------------------
//  Takes a pixel grid (text rows + palette) and "bakes" it ONCE
//  into an offscreen canvas. After that it's drawn with drawImage,
//  which is very fast.
//
//  Later on (Phase 5 of the plan) you can replace the grids with
//  PNG images from PixelLab/Aseprite without touching the rest:
//  only how this internal canvas gets filled changes.
// ============================================================

export type Palette = Record<string, string>;

export class Sprite {
  readonly w: number;
  readonly h: number;
  private readonly canvas: HTMLCanvasElement;

  constructor(grid: string[], palette: Palette) {
    this.h = grid.length;
    this.w = Math.max(...grid.map((r) => r.length));
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo hornear el sprite');

    for (let y = 0; y < this.h; y++) {
      const row = grid[y];
      for (let x = 0; x < row.length; x++) {
        const color = palette[row[x]];
        if (!color) continue; // '.' or unknown = transparent
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  /**
   * Draws the sprite scaled, anchored to the CENTER of its BASE (the feet).
   * That way, when stretched or squashed (squash & stretch), the character
   * grows upward and sideways but never sinks into the floor.
   * With scaleX = scaleY = 1 it's equivalent to draw().
   */
  drawStretched(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    bottomY: number,
    scaleX: number,
    scaleY: number,
    flip = false,
  ): void {
    ctx.save();
    ctx.translate(Math.round(centerX), Math.round(bottomY));
    ctx.scale(flip ? -scaleX : scaleX, scaleY);
    ctx.drawImage(this.canvas, -this.w / 2, -this.h);
    ctx.restore();
  }

  /** Draws the sprite with its top-left corner at (x, y). */
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, flip = false): void {
    const px = Math.round(x);
    const py = Math.round(y);
    if (flip) {
      ctx.save();
      ctx.translate(px + this.w, py);
      ctx.scale(-1, 1);
      ctx.drawImage(this.canvas, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(this.canvas, px, py);
    }
  }
}
