// ============================================================
//  POPUPS — textos flotantes "+N"
// ------------------------------------------------------------
//  Nacen sobre un enemigo derrotado, suben despacio y se
//  desvanecen. Viven en coordenadas del MUNDO, como las partículas.
// ============================================================

import { font } from '../ui/text';

interface Popup {
  x: number;
  y: number;
  text: string;
  life: number;
}

export class Popups {
  private items: Popup[] = [];

  spawn(x: number, y: number, text: string): void {
    this.items.push({ x, y, text, life: 0.9 });
  }

  update(dt: number): void {
    for (const p of this.items) {
      p.y -= 16 * dt;
      p.life -= dt;
    }
    this.items = this.items.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(8);
    for (const p of this.items) {
      ctx.globalAlpha = Math.min(1, p.life * 2.5);
      ctx.fillStyle = '#ffe25a';
      ctx.fillText(p.text, Math.round(p.x - camX), Math.round(p.y - camY));
    }
    ctx.restore();
    ctx.textAlign = 'left';
  }

  clear(): void {
    this.items = [];
  }
}
