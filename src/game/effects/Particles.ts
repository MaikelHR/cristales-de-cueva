// ============================================================
//  PARTICLES (sparks)
// ------------------------------------------------------------
//  The first piece of "game feel": the instant visual reward
//  when something good happens. Each particle is a tiny dot with
//  position, velocity and life: born in a burst, slowed by the
//  air, falling under gentle gravity and fading out.
//  They live in WORLD coordinates (drawn by subtracting the camera).
// ============================================================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;    // seconds remaining
  maxLife: number; // total life, used to compute the fade
  size: number;    // 1 or 2 px, like the background dust
  gravity: number; // each particle type falls differently
  color: string;
}

const GRAVITY_SPARK = 190; // sparks: fall with weight
const GRAVITY_DUST = 30;   // dust: nearly floats
const DRAG = 2.2;          // how much they slow in the air (per second)

export class Particles {
  private items: Particle[] = [];

  /** Burst of sparks from (x, y), in all directions. */
  burst(x: number, y: number, count: number, colors: string[]): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      const maxLife = 0.35 + Math.random() * 0.4;
      this.items.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 35, // upward bias: more cheerful
        life: maxLife,
        maxLife,
        size: Math.random() < 0.25 ? 2 : 1,
        gravity: GRAVITY_SPARK,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  /**
   * Little dust cloud: a few slow motes that barely rise and fade out.
   * dirX pushes the dust to one side (-1 left, 1 right, 0 symmetric).
   */
  puff(x: number, y: number, count: number, colors: string[], dirX = 0): void {
    for (let i = 0; i < count; i++) {
      const maxLife = 0.25 + Math.random() * 0.3;
      const side = Math.random() * 2 - 1;
      this.items.push({
        x: x + (Math.random() * 4 - 2),
        y: y + (Math.random() * 2 - 1),
        vx: side * (6 + Math.random() * 14) + dirX * (8 + Math.random() * 14),
        vy: -(6 + Math.random() * 16),
        life: maxLife,
        maxLife,
        size: 1,
        gravity: GRAVITY_DUST,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  update(dt: number): void {
    for (const p of this.items) {
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.vx -= p.vx * DRAG * dt; // slows in the air
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.items = this.items.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (const p of this.items) {
      // The first half of life glows steady; the second half fades out.
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
