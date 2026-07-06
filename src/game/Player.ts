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
import { Level, type AbilityName } from './Level';
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

// Wall slide y wall jump
const WALL_SLIDE_SPEED = 55; // caída máxima mientras rozás la pared
const WALL_JUMP_V = 0.98;    // altura del wall jump vs salto normal
const WALL_JUMP_H = 130;     // empujón horizontal alejándose de la pared
const WALL_LOCK = 0.14;      // control bloqueado tras el wall jump

// Vida y daño
const MAX_HEALTH = 3;      // corazones
const HURT_INVULN = 1.1;   // segundos de invulnerabilidad tras un golpe
const HURT_LOCK = 0.2;     // control bloqueado durante el retroceso
const KNOCKBACK_X = 150;   // empujón horizontal al recibir daño
const KNOCKBACK_Y = 150;   // empujón hacia arriba al recibir daño

const STOMP_BOUNCE = 200;  // rebote hacia arriba tras pisar un enemigo

// Planeo (glide): al mantener saltar mientras caés, la caída se frena a una
// velocidad suave (como una hoja). En una corriente de viento, te ELEVA.
const GLIDE_SPEED = 42;   // caída máxima mientras planeás (px/s)
const WIND_LIFT = -104;  // velocidad al planear dentro de una corriente (sube firme)
const WIND_DRIFT = -60;  // el viento ELEVA aún sin planear (así cualquiera sube por un tiro)
const GLIDE_MOTES = ['#c8ffe0', '#8fe0c0', '#e0fff0']; // esporas del planeo

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

  readonly maxHealth = MAX_HEALTH;
  health = MAX_HEALTH;
  private invulnTimer = 0;  // >0 = invulnerable (parpadea)
  private hurtLock = 0;     // >0 = control bloqueado por retroceso
  private stompGrace = 0;   // >0 = recién pisó: no recibe daño (sin parpadeo)

  /** Habilidades desbloqueables (Fase 3): son datos, no código duro.
   *  Arrancan apagadas; cada reliquia del mundo enciende la suya. */
  readonly abilities: Record<AbilityName, boolean> = {
    doubleJump: false,
    dash: false,
    wallJump: false,
    glide: false,
  };
  private gliding = false; // para el sprite/feedback del planeo
  private airJumpsLeft = 0;
  private dashTimer = 0;    // >0 = dash en curso
  private dashCooldown = 0;
  private wallLock = 0;     // >0 = control bloqueado tras un wall jump
  private wallLockDir: 1 | -1 = 1;
  private wallSliding = false; // para elegir el sprite de pared

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
    this.invulnTimer = 0;
    this.hurtLock = 0;
    this.stompGrace = 0;
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  get invulnerable(): boolean {
    return this.invulnTimer > 0;
  }

  /** Rebote al pisar un enemigo: salta hacia arriba, recupera el salto
   *  aéreo (para encadenar) y una gracia breve para no recibir daño del
   *  mismo enemigo mientras sigue solapado (p. ej. un jefe que sobrevive). */
  bounce(): void {
    this.vy = -STOMP_BOUNCE;
    this.onGround = false;
    this.airJumpsLeft = 1;
    this.stretch = STRETCH_JUMP;
    this.stompGrace = 0.35;
  }

  /**
   * Recibir daño desde una fuente ubicada en fromX. Devuelve true si
   * el golpe conectó (false si estaba invulnerable). Quita un corazón,
   * empuja al jugador lejos de la fuente y activa la invulnerabilidad.
   */
  hurt(fromX: number): boolean {
    if (this.invulnTimer > 0 || this.stompGrace > 0) return false;
    this.health--;
    this.invulnTimer = HURT_INVULN;
    this.hurtLock = HURT_LOCK;
    this.dashTimer = 0; // un golpe corta el dash
    this.wallLock = 0;
    const away: 1 | -1 = this.x + this.w / 2 < fromX ? -1 : 1;
    this.vx = away * KNOCKBACK_X;
    this.vy = -KNOCKBACK_Y;
    this.onGround = false;
    this.facing = (-away) as 1 | -1; // mira hacia lo que lo golpeó
    return true;
  }

  update(dt: number): void {
    this.wallSliding = false;
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.stompGrace = Math.max(0, this.stompGrace - dt);

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
      this.wallLock = Math.max(0, this.wallLock - dt);
      this.hurtLock = Math.max(0, this.hurtLock - dt);
      if (this.hurtLock > 0) {
        // Retroceso por daño: no hay control, la velocidad se frena sola.
        this.vx *= 0.86;
      } else if (this.wallLock > 0) {
        // Tras un wall jump, unos frames de empujón fijo: sin esto,
        // mantener la tecla hacia la pared te re-pegaría al instante.
        this.vx = this.wallLockDir * WALL_JUMP_H;
      } else {
        this.vx = dir * MOVE_SPEED;
        if (dir !== 0) this.facing = dir as 1 | -1;
      }

      // ---- Temporizadores de coyote y buffer ----
      this.coyoteTimer = this.onGround ? COYOTE : Math.max(0, this.coyoteTimer - dt);
      if (this.onGround) this.airJumpsLeft = 1; // pisar recarga el doble salto
      this.bufferTimer = justPressed('jump')
        ? JUMP_BUFFER
        : Math.max(0, this.bufferTimer - dt);

      // ---- Saltos: piso (con coyote) > pared > doble salto ----
      if (this.bufferTimer > 0) {
        const wall = this.onGround ? 0 : this.wallDir();
        if (this.coyoteTimer > 0) {
          this.vy = -JUMP_SPEED;
          this.onGround = false;
          this.bufferTimer = 0;
          this.coyoteTimer = 0;
          this.stretch = STRETCH_JUMP; // despega estirado
          sfx.jump();
        } else if (this.abilities.wallJump && wall !== 0) {
          // Wall jump: salto en diagonal, alejándose de la pared.
          this.vy = -JUMP_SPEED * WALL_JUMP_V;
          this.wallLock = WALL_LOCK;
          this.wallLockDir = -wall as 1 | -1;
          this.facing = this.wallLockDir;
          this.bufferTimer = 0;
          this.stretch = STRETCH_JUMP;
          // Virutas en el punto de empuje contra la pared
          const px = wall === 1 ? this.x + this.w : this.x;
          this.particles.puff(px, this.y + this.h / 2, 4, DUST_COLORS, -wall);
          sfx.wallJump();
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

      // ---- Wall slide: empujar contra la pared en el aire frena la caída ----
      if (
        this.abilities.wallJump &&
        !this.onGround &&
        this.vy > WALL_SLIDE_SPEED &&
        dir !== 0 &&
        dir === this.wallDir()
      ) {
        this.vy = WALL_SLIDE_SPEED;
        this.wallSliding = true;
        // Virutas de roca al rozar
        if (Math.random() < 0.35) {
          const px = dir === 1 ? this.x + this.w : this.x;
          this.particles.puff(px, this.y + 3, 1, DUST_COLORS, -dir * 0.3);
        }
      }

      // ---- Viento y planeo (glide) ----
      const inWind = this.inWind();
      const holdingUp = isDown('jump');
      this.gliding = false;
      if (inWind) {
        // Corriente: mantené SALTAR para SUBIR (el updraft te eleva, cualquiera
        // puede); soltá para BAJAR planeando despacio (así el mismo tiro sirve
        // de ida y vuelta). Con glide, la subida es aún más firme.
        if (holdingUp) {
          this.vy = this.abilities.glide ? WIND_LIFT : WIND_DRIFT;
          this.gliding = true;
          if (Math.random() < 0.2) {
            this.particles.puff(this.x + this.w / 2, this.y + this.h, 1, GLIDE_MOTES, 0);
          }
        } else {
          // Soltando: el viento frena la caída (bajás suave, sin lastimarte).
          this.vy = Math.min(this.vy, GLIDE_SPEED);
        }
      } else if (this.abilities.glide && holdingUp && this.vy > 0 && !this.wallSliding) {
        // Planeo en aire libre: caída suave como una hoja (para cruzar abismos).
        this.vy = GLIDE_SPEED;
        this.gliding = true;
        if (Math.random() < 0.25) {
          this.particles.puff(this.x + this.w / 2, this.y + this.h, 1, GLIDE_MOTES, 0);
        }
      }
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

  /** ¿El jugador está dentro de una corriente de viento? Muestrea el centro
   *  y un punto bajo el cuerpo (el viento entra por los pies primero). */
  private inWind(): boolean {
    const cx = this.x + this.w / 2;
    return (
      this.level.isWindAt(cx, this.y + this.h / 2) ||
      this.level.isWindAt(cx, this.y + this.h - 1)
    );
  }

  /** ¿Hay pared sólida pegada a un costado? -1 izquierda, 1 derecha, 0 nada. */
  private wallDir(): -1 | 0 | 1 {
    const top = this.y + 2;
    const bottom = this.y + this.h - 2;
    const leftX = this.x - 1;
    const rightX = this.x + this.w + 1;
    if (this.level.isSolidAt(leftX, top) || this.level.isSolidAt(leftX, bottom)) return -1;
    if (this.level.isSolidAt(rightX, top) || this.level.isSolidAt(rightX, bottom)) return 1;
    return 0;
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
    // Invulnerable: parpadea (desaparece en frames alternos, ~10 Hz).
    if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 20) % 2 === 0) return;

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
      if (this.wallSliding) return sprites.playerWall;
      if (this.gliding) return sprites.playerJump; // pose abierta al planear
      return this.vy < 0 ? sprites.playerJump : sprites.playerFall;
    }
    if (this.vx !== 0) {
      const run = [sprites.playerRun1, sprites.playerRun2, sprites.playerRun3, sprites.playerRun4];
      return run[Math.floor(this.animTime * 12) % 4];
    }
    // Idle vivo: parpadea cada tanto y "respira" despacio.
    if (this.animTime % 3.3 < 0.15) return sprites.playerBlink;
    return Math.floor(this.animTime * 1.6) % 2 === 0 ? sprites.playerIdle : sprites.playerIdle2;
  }
}
