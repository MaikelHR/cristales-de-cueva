// ============================================================
//  PARTÍCULAS (chispas)
// ------------------------------------------------------------
//  Primera pieza de "game feel": la recompensa visual instantánea
//  cuando pasa algo bueno. Cada partícula es un puntito con
//  posición, velocidad y vida: nace en una explosión, se frena en
//  el aire, cae con gravedad suave y se desvanece.
//  Viven en coordenadas del MUNDO (se dibujan restando la cámara).
// ============================================================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;    // segundos que le quedan
  maxLife: number; // vida total, para calcular el desvanecido
  size: number;    // 1 o 2 px, como el polvo del fondo
  color: string;
}

const GRAVITY = 190; // px/s^2, más suave que la del jugador: flotan un poco
const DRAG = 2.2;    // cuánto se frenan en el aire (por segundo)

export class Particles {
  private items: Particle[] = [];

  /** Explosión de chispas desde (x, y), en todas direcciones. */
  burst(x: number, y: number, count: number, colors: string[]): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      const maxLife = 0.35 + Math.random() * 0.4;
      this.items.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 35, // sesgo hacia arriba: más alegre
        life: maxLife,
        maxLife,
        size: Math.random() < 0.25 ? 2 : 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  update(dt: number): void {
    for (const p of this.items) {
      p.life -= dt;
      p.vy += GRAVITY * dt;
      p.vx -= p.vx * DRAG * dt; // frena en el aire
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.items = this.items.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (const p of this.items) {
      // La primera mitad de la vida brilla fija; la segunda se desvanece.
      ctx.globalAlpha = Math.min(1, (2 * p.life) / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.items = [];
  }
}
