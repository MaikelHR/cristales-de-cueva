// ============================================================
//  EL JUGADOR
// ------------------------------------------------------------
//  Física de plataformero con dos detalles de "game feel":
//   - Coyote time: podés saltar un instante DESPUÉS de salir
//     del borde (perdona el reflejo tarde).
//   - Jump buffer: si presionás saltar justo ANTES de tocar el
//     piso, el salto se guarda y se ejecuta al aterrizar.
//  Esos dos detalles son los que hacen que un salto "se sienta bien".
// ============================================================

import { isDown, justPressed } from '../engine/input';
import type { Box } from '../engine/canvas';
import { overlaps } from '../engine/canvas';
import { Level } from './Level';
import { sprites, drawGlow } from './art';

const MOVE_SPEED = 92;     // px/s horizontal
const GRAVITY = 680;       // px/s^2
const JUMP_SPEED = 215;    // velocidad inicial del salto (px/s)
const MAX_FALL = 280;      // velocidad máxima de caída
const COYOTE = 0.1;        // segundos de gracia tras dejar el piso
const JUMP_BUFFER = 0.12;  // segundos que se "recuerda" el salto
const JUMP_CUT = 0.45;     // al soltar saltar, recortamos el impulso

export class Player {
  x = 0;
  y = 0;
  readonly w = 6;
  readonly h = 11;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  onGround = false;

  private coyoteTimer = 0;
  private bufferTimer = 0;
  private animTime = 0;

  constructor(private level: Level) {
    this.respawn();
  }

  respawn(): void {
    this.x = this.level.playerSpawn.x + 1;
    this.y = this.level.playerSpawn.y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt: number): void {
    // ---- Entrada horizontal ----
    let dir = 0;
    if (isDown('left')) dir -= 1;
    if (isDown('right')) dir += 1;
    this.vx = dir * MOVE_SPEED;
    if (dir !== 0) this.facing = dir as 1 | -1;

    // ---- Temporizadores de coyote y buffer ----
    this.coyoteTimer = this.onGround ? COYOTE : Math.max(0, this.coyoteTimer - dt);
    this.bufferTimer = justPressed('jump')
      ? JUMP_BUFFER
      : Math.max(0, this.bufferTimer - dt);

    // ---- Salto ----
    if (this.bufferTimer > 0 && this.coyoteTimer > 0) {
      this.vy = -JUMP_SPEED;
      this.onGround = false;
      this.bufferTimer = 0;
      this.coyoteTimer = 0;
    }
    // Salto variable: si soltás temprano, el brinco es más bajo.
    if (!isDown('jump') && this.vy < 0) {
      this.vy *= JUMP_CUT;
    }

    // ---- Gravedad ----
    this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);

    // ---- Mover y resolver colisiones, un eje a la vez ----
    this.x += this.vx * dt;
    this.resolveAxis('x');
    this.y += this.vy * dt;
    this.onGround = false;
    this.resolveAxis('y');

    this.animTime += dt;
  }

  private resolveAxis(axis: 'x' | 'y'): void {
    const box = this.box();
    for (const tile of this.level.solidTilesIn(box)) {
      if (!overlaps(box, tile)) continue;
      if (axis === 'x') {
        if (this.vx > 0) this.x = tile.x - this.w;
        else if (this.vx < 0) this.x = tile.x + tile.w;
        this.vx = 0;
      } else {
        if (this.vy > 0) {
          this.y = tile.y - this.h;
          this.onGround = true;
        } else if (this.vy < 0) {
          this.y = tile.y + tile.h;
        }
        this.vy = 0;
      }
      box.x = this.x;
      box.y = this.y;
    }
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    // El sprite (12x14) es un poco más grande que la caja de colisión (6x11):
    // lo centramos horizontalmente y alineamos los pies con el suelo.
    const sprite = this.currentSprite();
    const drawX = this.x + this.w / 2 - sprite.w / 2;
    const drawY = this.y + this.h - sprite.h;

    // Brillo tenue de cristal detrás del jugador
    drawGlow(ctx, this.x + this.w / 2 - camX, this.y + this.h / 2 - camY, 16, '#3aa6d6', 0.35);

    sprite.draw(ctx, drawX - camX, drawY - camY, this.facing === -1);
  }

  private currentSprite() {
    if (!this.onGround) {
      return this.vy < 0 ? sprites.playerJump : sprites.playerFall;
    }
    if (this.vx !== 0) {
      return Math.floor(this.animTime * 10) % 2 === 0 ? sprites.playerRun1 : sprites.playerRun2;
    }
    return sprites.playerIdle;
  }
}
