// ============================================================
//  JEFE — Ariete Ígneo (fin de la fragua)
// ------------------------------------------------------------
//  Nada de flotar y disparar: este jefe VIVE EN EL PISO. Ronda la
//  arena, se encabrita (el aviso) y EMBISTE — haciendo pedazos los
//  parapetos agrietados que encuentre. Su lomo es placa de
//  obsidiana al rojo: tocarlo QUEMA, también desde arriba (la
//  lección del erizo); solo el azotón rebota en la placa sin herir
//  a nadie. La única ventana: cuando se estrella contra una pared
//  queda ATURDIDO, la placa se abre y el núcleo brilla — ahí sí se
//  pisa. Cada golpazo sacude brasas del techo y lo enfurece
//  (embiste más seguido y más rápido). Tres pisotones lo apagan.
//  Mientras viva, la puerta no abre.
// ============================================================

import type { Box } from '../../../engine/canvas';
import { Level, TILE } from '../../world/Level';
import { drawGlow } from '../../art/glow';
import type { Enemy } from './Enemy';

const PACE_SPEED = 22;     // px/s rondando
const CHARGE_SPEED = 168;  // px/s embistiendo (base; la furia lo sube)
const CHARGE_EVERY = 2.7;  // segundos entre embestidas (base)
const TELEGRAPH = 0.55;    // se encabrita antes de embestir (el aviso)
const STUN = 2.3;          // segundos aturdido tras estrellarse
const MAX_HP = 3;
const RAGE_STEP = 0.28;    // +28% de ritmo por golpe recibido
const HIT_INVULN = 0.6;    // i-frames tras un pisotón válido

const EMBER_G = 320;       // gravedad de las brasas que llueven
const EMBER_SPREAD = [-132, -84, -38, 12, 64, 118]; // abanico sobre la arena

interface Ember { x: number; y: number; vy: number; }
interface Debris { x: number; y: number; vx: number; vy: number; life: number; }

type State = 'pace' | 'telegraph' | 'charge' | 'stun';

export class Ariete implements Enemy {
  readonly layer = 'enemy' as const;
  x: number;
  y: number;
  readonly w = 20;
  readonly h = 13;
  dead = false;
  readonly isBoss = true;
  readonly gooColors = ['#ff9a3a', '#ffd23a', '#ff5a3a'];
  hp = MAX_HP;

  private state: State = 'pace';
  private stateTimer = 0;
  private chargeTimer = CHARGE_EVERY;
  private dir: 1 | -1 = -1;
  private invuln = 0;
  private t = 0;
  private legPhase = 0;
  private hits = 0; // embestidas estrelladas (varía la lluvia de brasas)
  private embers: Ember[] = [];
  private debris: Debris[] = [];

  constructor(px: number, py: number, private level: Level) {
    this.x = px;
    this.y = py + (TILE - this.h); // los pies al ras del piso
  }

  /** Solo el aturdimiento abre la placa: el resto del tiempo, pisarlo
   *  rebota sin herirlo (y tocarlo de costado quema, como siempre). */
  get stompable(): boolean {
    return this.state === 'stun';
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  hazards(): Box[] {
    return this.embers.map((e) => ({ x: e.x - 2, y: e.y - 2, w: 4, h: 4 }));
  }

  onStomp(): boolean {
    if (this.state !== 'stun' || this.invuln > 0) return false;
    this.hp--;
    this.invuln = HIT_INVULN;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    // Se recompone FURIOSO: la próxima embestida llega antes.
    this.state = 'pace';
    this.chargeTimer = CHARGE_EVERY * 0.6;
    return false;
  }

  /** La furia: 1 al empezar, crece con cada golpe recibido. */
  private rage(): number {
    return 1 + (MAX_HP - this.hp) * RAGE_STEP;
  }

  update(dt: number, target: { x: number; y: number }): void {
    this.t += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    const rage = this.rage();

    switch (this.state) {
      case 'pace': {
        // Ronda mirando al jugador, sin apuro: el reloj es la amenaza.
        const dx = target.x - (this.x + this.w / 2);
        if (Math.abs(dx) > 6) this.dir = (dx < 0 ? -1 : 1) as 1 | -1;
        const next = this.x + this.dir * PACE_SPEED * dt;
        if (!this.wallAhead(next)) this.x = next;
        this.legPhase += dt * 4;
        this.chargeTimer -= dt * rage;
        if (this.chargeTimer <= 0) {
          this.state = 'telegraph';
          this.stateTimer = TELEGRAPH / rage;
        }
        break;
      }
      case 'telegraph': {
        // Encabritado, temblando: apártate o súbete a algo.
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this.state = 'charge';
        break;
      }
      case 'charge': {
        const speed = CHARGE_SPEED * rage;
        const next = this.x + this.dir * speed * dt;
        this.smashAhead(next); // los parapetos agrietados vuelan en pedazos
        if (this.wallAhead(next)) {
          // ¡PUM! Contra la pared: aturdido, placa abierta, llueven brasas.
          this.state = 'stun';
          this.stateTimer = STUN;
          this.hits++;
          this.rainEmbers();
          for (let i = 0; i < 10; i++) {
            this.spawnDebris(this.dir === 1 ? this.x + this.w : this.x, this.y + 4 + (i % 5) * 2);
          }
        } else {
          this.x = next;
          this.legPhase += dt * 14;
        }
        break;
      }
      case 'stun': {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'pace';
          this.chargeTimer = CHARGE_EVERY / rage;
        }
        break;
      }
    }

    // Brasas del techo: caen acelerando y mueren contra el piso.
    for (const e of this.embers) {
      e.vy += EMBER_G * dt;
      e.y += e.vy * dt;
    }
    this.embers = this.embers.filter((e) => !this.level.isSolidAt(e.x, e.y + 2));

    // Escombros decorativos de los parapetos y el pared-azo.
    for (const d of this.debris) {
      d.vy += 500 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt;
    }
    this.debris = this.debris.filter((d) => d.life > 0);
  }

  /** ¿Hay pared sólida pegada adelante (a la altura del cuerpo)? */
  private wallAhead(nextX: number): boolean {
    const aheadX = this.dir === 1 ? nextX + this.w : nextX;
    return (
      this.level.isSolidAt(aheadX, this.y + 2) ||
      this.level.isSolidAt(aheadX, this.y + this.h - 2)
    );
  }

  /** En plena embestida, la columna agrietada de adelante revienta. */
  private smashAhead(nextX: number): void {
    const aheadX = this.dir === 1 ? nextX + this.w + 1 : nextX - 1;
    const col = Math.floor(aheadX / TILE);
    const r0 = Math.floor((this.y + 1) / TILE);
    const r1 = Math.floor((this.y + this.h - 1) / TILE);
    for (let row = r0; row <= r1; row++) {
      if (this.level.breakCrack(row, col)) {
        for (let i = 0; i < 6; i++) this.spawnDebris(col * TILE + 4, row * TILE + 4);
      }
    }
  }

  private spawnDebris(px: number, py: number): void {
    // Determinista sobre el reloj propio: nada de Math.random en datos.
    const k = this.debris.length + Math.floor(this.t * 60);
    this.debris.push({
      x: px,
      y: py,
      vx: ((k * 37) % 90) - 45 - this.dir * 20,
      vy: -60 - ((k * 53) % 70),
      life: 0.5 + ((k * 29) % 30) / 100,
    });
  }

  /** El pared-azo sacude el techo: brasas repartidas por la arena. */
  private rainEmbers(): void {
    const cx = this.x + this.w / 2;
    EMBER_SPREAD.forEach((off, i) => {
      const jitter = (((this.hits * 31 + i * 17) % 21) - 10);
      this.embers.push({ x: cx + off + jitter, y: 10, vy: 20 + ((i * 13) % 40) });
    });
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    // Brasas que caen (con su brillo de aviso).
    for (const e of this.embers) {
      drawGlow(ctx, e.x - camX, e.y - camY, 6, '#ff9a3a', 0.7);
      ctx.fillStyle = '#ffe8c0';
      ctx.fillRect(Math.round(e.x - camX) - 1, Math.round(e.y - camY) - 1, 2, 2);
    }
    // Escombros de parapeto.
    ctx.fillStyle = '#8064b0';
    for (const d of this.debris) {
      ctx.fillRect(Math.round(d.x - camX), Math.round(d.y - camY), 1, 1);
    }

    const stunned = this.state === 'stun';
    const charging = this.state === 'charge';
    const rearing = this.state === 'telegraph';
    // Encabritado: retrocede y tiembla; el cuerpo entero avisa.
    const shake = rearing ? Math.round(Math.sin(this.t * 40)) : 0;
    const px = Math.round(this.x - camX) + shake - (rearing ? this.dir * 2 : 0);
    const py = Math.round(this.y - camY);
    const cx = px + this.w / 2;

    // Estela de la embestida: líneas de velocidad detrás.
    if (charging) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ff9a3a';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(px + (this.dir === 1 ? -6 - i * 4 : this.w + 3 + i * 4), py + 3 + i * 4, 4, 1);
      }
      ctx.globalAlpha = 1;
    }

    drawGlow(ctx, cx, py + 6, 20, '#ff9a3a', stunned ? 0.65 : 0.35 + (MAX_HP - this.hp) * 0.08);

    const flashing = this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0;

    // Patas: cuatro muñones que bombean al moverse.
    const step = Math.sin(this.legPhase) > 0 ? 1 : 0;
    ctx.fillStyle = '#140a06';
    ctx.fillRect(px + 2 + step, py + this.h - 3, 3, 3);
    ctx.fillRect(px + 7 - step, py + this.h - 3, 3, 3);
    ctx.fillRect(px + 11 + step, py + this.h - 3, 3, 3);
    ctx.fillRect(px + 15 - step, py + this.h - 3, 3, 3);

    // Cuerpo: bloque de obsidiana con la panza al rojo.
    ctx.fillStyle = flashing ? '#ffffff' : '#1c0d08';
    ctx.fillRect(px, py + 2, this.w, this.h - 4);
    ctx.fillRect(px + 1, py + 1, this.w - 2, this.h - 2);
    if (!flashing) {
      ctx.fillStyle = '#3d2419';
      ctx.fillRect(px + 1, py + 2, this.w - 2, 2);
      // Vetas de magma laterales, más bravas con la furia.
      const vein = Math.sin(this.t * (4 + (MAX_HP - this.hp) * 3)) > 0 ? '#ffd23a' : '#d0662a';
      ctx.fillStyle = vein;
      ctx.fillRect(px + 4, py + 6, 2, 1);
      ctx.fillRect(px + 9, py + 8, 3, 1);
      ctx.fillRect(px + 15, py + 6, 2, 1);

      if (stunned) {
        // La placa se abre: el núcleo expuesto brilla — PÍSALO AHORA.
        const pulse = Math.sin(this.t * 10) > 0;
        ctx.fillStyle = pulse ? '#ffe8c0' : '#ffd23a';
        ctx.fillRect(px + 5, py, this.w - 10, 3);
        drawGlow(ctx, cx, py + 1, 10, '#ffd23a', 0.6);
        // Estrellitas de mareo orbitando la cabeza.
        ctx.fillStyle = '#ffe8c0';
        for (let i = 0; i < 3; i++) {
          const a = this.t * 4 + (i * Math.PI * 2) / 3;
          ctx.fillRect(
            Math.round(cx + Math.cos(a) * 8),
            Math.round(py - 4 + Math.sin(a) * 2),
            1, 1,
          );
        }
      } else {
        // La placa blindada: lomo liso de obsidiana con filo al rojo.
        ctx.fillStyle = '#0f0503';
        ctx.fillRect(px + 2, py, this.w - 4, 2);
        ctx.fillStyle = '#d0662a';
        ctx.fillRect(px + 3, py, this.w - 6, 1);
      }

      // Testuz y ojo: mira hacia donde va a embestir.
      const headX = this.dir === 1 ? px + this.w - 5 : px + 1;
      ctx.fillStyle = '#0f0503';
      ctx.fillRect(headX, py + 3, 4, 6);
      ctx.fillStyle = stunned ? '#ffd23a' : '#ff3a1a';
      ctx.fillRect(headX + (this.dir === 1 ? 2 : 1), py + 5, 1, stunned ? 1 : 2);
    }

    // Pips de vida sobre el lomo.
    for (let i = 0; i < MAX_HP; i++) {
      ctx.fillStyle = i < this.hp ? '#ff9a3a' : '#4e2814';
      ctx.fillRect(cx - 7 + i * 5, py - 7, 3, 2);
    }
  }
}
