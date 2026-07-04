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
import { Particles } from './Particles';
import { sprites, drawGlow } from './art';
import { sfx } from './sfx';

const MOVE_SPEED = 92;     // px/s horizontal
const GRAVITY = 680;       // px/s^2
const JUMP_SPEED = 215;    // velocidad inicial del salto (px/s)
const MAX_FALL = 280;      // velocidad máxima de caída
const COYOTE = 0.1;        // segundos de gracia tras dejar el piso
const JUMP_BUFFER = 0.12;  // segundos que se "recuerda" el salto
const JUMP_CUT = 0.45;     // al soltar saltar, recortamos el impulso

const DOUBLE_JUMP = 0.92;  // fuerza del doble salto relativa al salto normal

// Dash: impulso horizontal corto. Mientras dura, la gravedad se suspende.
const DASH_SPEED = 250;    // px/s durante el dash
const DASH_TIME = 0.14;    // segundos que dura el impulso
const DASH_COOLDOWN = 0.5; // espera hasta poder volver a dashear
const DASH_SQUASH = 0.8;   // achatado horizontal: sensación de velocidad

// Squash & stretch: deformar el sprite da sensación de peso y energía.
const STRETCH_JUMP = 1.28;    // estirado al despegar (alto y flaco)
const SQUASH_MAX = 0.38;      // aplastado máximo al aterrizar (bajo y ancho)
const STRETCH_RECOVER = 11;   // qué tan rápido recupera la forma (por segundo)

// Polvo de la cueva que levantan los pies.
const DUST_COLORS = ['#9b86c4', '#6f5a9e', '#d7c9ec'];
const DUST_STEP_EVERY = 0.09; // segundos entre motas mientras corre

export class Player {
  x = 0;
  y = 0;
  readonly w = 6;
  readonly h = 11;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  onGround = false;

  /** Habilidades desbloqueables (Fase 3): son datos, no código duro.
   *  Desbloquear una = poner su bandera en true. */
  readonly abilities = { doubleJump: true, dash: true };
  private airJumpsLeft = 0;
  private dashTimer = 0;    // >0 = dash en curso
  private dashCooldown = 0;

  private coyoteTimer = 0;
  private bufferTimer = 0;
  private animTime = 0;
  private stretch = 1; // escala vertical: >1 estirado, <1 aplastado, 1 normal
  private dustTimer = 0;

  constructor(
    private level: Level,
    private particles: Particles,
  ) {
    this.respawn();
  }

  /** Al cambiar de sala, el jugador pasa a colisionar contra la nueva. */
  setLevel(level: Level): void {
    this.level = level;
  }

  respawn(): void {
    this.respawnAt(this.level.playerSpawn.x + 1, this.level.playerSpawn.y);
  }

  /** Reaparecer en un punto concreto (checkpoint). */
  respawnAt(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.stretch = 1;
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt: number): void {
    // ---- Dash: ¿arranca uno? ----
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    if (
      this.dashTimer <= 0 &&
      justPressed('dash') &&
      this.abilities.dash &&
      this.dashCooldown === 0
    ) {
      this.dashTimer = DASH_TIME;
      this.dashCooldown = DASH_COOLDOWN;
      this.stretch = DASH_SQUASH; // achatado por la velocidad
      sfx.dash();
    }

    if (this.dashTimer > 0) {
      // ---- En pleno dash: velocidad fija, sin gravedad ni control ----
      this.dashTimer -= dt;
      this.vx = this.facing * DASH_SPEED;
      this.vy = 0;
      // Estela de polvo detrás
      this.particles.puff(
        this.x + this.w / 2 - this.facing * 4,
        this.y + this.h - 3,
        1,
        DUST_COLORS,
        -this.facing,
      );
    } else {
      // ---- Entrada horizontal ----
      let dir = 0;
      if (isDown('left')) dir -= 1;
      if (isDown('right')) dir += 1;
      this.vx = dir * MOVE_SPEED;
      if (dir !== 0) this.facing = dir as 1 | -1;

      // ---- Temporizadores de coyote y buffer ----
      this.coyoteTimer = this.onGround ? COYOTE : Math.max(0, this.coyoteTimer - dt);
      if (this.onGround) this.airJumpsLeft = 1; // pisar recarga el doble salto
      this.bufferTimer = justPressed('jump')
        ? JUMP_BUFFER
        : Math.max(0, this.bufferTimer - dt);

      // ---- Salto desde el piso (con coyote) o doble salto en el aire ----
      if (this.bufferTimer > 0) {
        if (this.coyoteTimer > 0) {
          this.vy = -JUMP_SPEED;
          this.onGround = false;
          this.bufferTimer = 0;
          this.coyoteTimer = 0;
          this.stretch = STRETCH_JUMP; // despega estirado
          sfx.jump();
        } else if (this.abilities.doubleJump && this.airJumpsLeft > 0) {
          // Doble salto: un impulso extra en pleno aire.
          this.airJumpsLeft--;
          this.vy = -JUMP_SPEED * DOUBLE_JUMP;
          this.bufferTimer = 0;
          this.stretch = STRETCH_JUMP;
          // Nubecita bajo los pies: el "apoyo" invisible del segundo salto.
          this.particles.puff(this.x + this.w / 2, this.y + this.h, 5, DUST_COLORS);
          sfx.doubleJump();
        }
      }
      // Salto variable: si soltás temprano, el brinco es más bajo.
      if (!isDown('jump') && this.vy < 0) {
        this.vy *= JUMP_CUT;
      }

      // ---- Gravedad ----
      this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);
    }

    // ---- Mover y resolver colisiones, un eje a la vez ----
    this.x += this.vx * dt;
    this.resolveAxis('x');
    const fallSpeed = this.vy; // velocidad ANTES de chocar con el piso
    const wasOnGround = this.onGround;
    const prevBottom = this.y + this.h; // pies ANTES de mover en Y
    this.y += this.vy * dt;
    this.onGround = false;
    this.resolveAxis('y');
    this.resolveOneWay(prevBottom);

    // Aterrizar aplastado: más fuerte el golpe, más chato queda.
    if (!wasOnGround && this.onGround && fallSpeed > 60) {
      this.stretch = 1 - Math.min(SQUASH_MAX, fallSpeed / 700);
      // Nube de polvo a los pies, más grande cuanto más fuerte cae.
      const motes = Math.min(8, Math.round(fallSpeed / 45));
      this.particles.puff(this.x + this.w / 2, this.y + this.h - 1, motes, DUST_COLORS);
    }

    // Pasitos de polvo mientras corre por el suelo.
    this.dustTimer -= dt;
    if (this.onGround && this.vx !== 0 && this.dustTimer <= 0) {
      this.dustTimer = DUST_STEP_EVERY;
      this.particles.puff(
        this.x + this.w / 2 - this.facing * 2, // detrás de los pies
        this.y + this.h - 1,
        1,
        DUST_COLORS,
        -this.facing * 0.6, // el polvo queda flotando hacia atrás
      );
    }
    // La deformación vuelve suavemente a la forma normal.
    this.stretch += (1 - this.stretch) * Math.min(1, STRETCH_RECOVER * dt);
    if (Math.abs(this.stretch - 1) < 0.01) this.stretch = 1;

    this.animTime += dt;
  }

  /**
   * Plataformas de un solo sentido: solo frenan la caída si los pies
   * venían DESDE ARRIBA del tablón. Subiendo (o desde el costado) se
   * atraviesan sin tocarlas.
   */
  private resolveOneWay(prevBottom: number): void {
    if (this.vy < 0) return; // subiendo: siempre se atraviesan
    const box = this.box();
    for (const tile of this.level.oneWayTilesIn(box)) {
      if (!overlaps(box, tile)) continue;
      if (prevBottom <= tile.y + 0.01) {
        this.y = tile.y - this.h;
        this.vy = 0;
        this.onGround = true;
        box.y = this.y;
      }
    }
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
    const sprite = this.currentSprite();

    // Brillo tenue de cristal detrás del jugador
    drawGlow(ctx, this.x + this.w / 2 - camX, this.y + this.h / 2 - camY, 16, '#3aa6d6', 0.35);

    // Anclado a los pies y deformado: al estirarse pierde ancho y al
    // aplastarse lo gana (conservación aproximada del "volumen").
    sprite.drawStretched(
      ctx,
      this.x + this.w / 2 - camX,
      this.y + this.h - camY,
      2 - this.stretch,
      this.stretch,
      this.facing === -1,
    );
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
