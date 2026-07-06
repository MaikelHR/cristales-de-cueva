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

  /**
   * Dibuja el sprite escalado, anclado al CENTRO de su BASE (los pies).
   * Así, al estirarlo o aplastarlo (squash & stretch), el personaje
   * crece hacia arriba y a los lados pero nunca se hunde en el piso.
   * Con scaleX = scaleY = 1 equivale a draw().
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

  /** Como draw(), pero con un CONTORNO oscuro de 1px alrededor (silueta del
   *  sprite desplazada en las 4 direcciones, teñida de `outline`). Despega al
   *  sprite del fondo cuando comparten color/valor (p. ej. enemigos verdes en
   *  el bioma jardín). Se hornea la silueta una vez y se cachea. */
  drawOutlined(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    flip = false,
    outline = '#140a1e',
  ): void {
    const sil = this.silhouette(outline);
    const px = Math.round(x);
    const py = Math.round(y);
    ctx.save();
    if (flip) {
      ctx.translate(px + this.w, py);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(px, py);
    }
    // Silueta en las 4 direcciones cardinales (contorno de 1px).
    ctx.drawImage(sil, -1, 0);
    ctx.drawImage(sil, 1, 0);
    ctx.drawImage(sil, 0, -1);
    ctx.drawImage(sil, 0, 1);
    // Sprite real encima.
    ctx.drawImage(this.canvas, 0, 0);
    ctx.restore();
  }

  private silCache = new Map<string, HTMLCanvasElement>();
  /** Silueta del sprite (todos los píxeles opacos) teñida de un color. */
  private silhouette(color: string): HTMLCanvasElement {
    const cached = this.silCache.get(color);
    if (cached) return cached;
    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    const cx = c.getContext('2d')!;
    cx.drawImage(this.canvas, 0, 0);
    cx.globalCompositeOperation = 'source-in'; // pinta solo donde hay sprite
    cx.fillStyle = color;
    cx.fillRect(0, 0, this.w, this.h);
    this.silCache.set(color, c);
    return c;
  }
}
