// ============================================================
//  SPRITE
// ------------------------------------------------------------
//  Toma una grilla de pixeles (filas de texto + paleta) y la
//  "hornea" UNA vez en un canvas fuera de pantalla. Después se
//  dibuja con drawImage, que es muy rápido.
//
//  Más adelante (Fase 5 del plan) podés reemplazar las grillas
//  por imágenes PNG de PixelLab/Aseprite sin tocar el resto:
//  solo cambia cómo se llena este canvas interno.
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
        if (!color) continue; // '.' o desconocido = transparente
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  /** Dibuja el sprite con su esquina superior izquierda en (x, y). */
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
