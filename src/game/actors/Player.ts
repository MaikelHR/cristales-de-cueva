// ============================================================
//  EL JUGADOR
// ------------------------------------------------------------
//  Física de plataformero con dos detalles de "game feel":
//   - Coyote time: podés saltar un instante DESPUÉS de salir
//     del borde (perdona el reflejo tarde).
//   - Jump buffer: si presionás saltar justo ANTES de tocar el
//     piso, el salto se guarda y se ejecuta al aterrizar.
//  Esos dos detalles son los que hacen que un salto "se sienta bien".
//  Dónde aparece (spawn, checkpoint) lo decide la sesión: acá solo
//  vive el movimiento, el daño y el dibujo.
// ============================================================

import { isDown, justPressed } from '../../engine/input';
import type { Box } from '../../engine/canvas';
import { overlaps } from '../../engine/canvas';
import { frameAt } from '../../engine/animation';
import { Level, TILE } from '../world/Level';
import type { AbilityName } from '../abilities';
import { Particles } from '../effects/Particles';
import { playerSprites } from '../art/playerSkins';
import { currentSkin } from '../skins';
import { drawGlow } from '../art/glow';
import { sfx } from '../sfx';

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

  /** Habilidades desbloqueables: son datos, no código duro.
   *  Arrancan apagadas; cada reliquia del mundo enciende la suya. */
  readonly abilities: Record<AbilityName, boolean> = {
    doubleJump: false,
    dash: false,
    wallJump: false,
  };
  private airJumpsLeft = 0;
  private dashTimer = 0;    // >0 = dash en curso
  private dashCooldown = 0;
  private wallLock = 0;     // >0 = control bloqueado tras un wall jump
  private wallLockDir: 1 | -1 = 1;
  private wallSliding = false; // para elegir el sprite de pared

  private launched = false; // impulso externo (resorte): sin recorte de salto
  private dropTimer = 0;    // >0 = bajando a través de un tablón (los ignora)
  private coyoteTimer = 0;
  private bufferTimer = 0;
  private animTime = 0;
  private stretch = 1; // escala vertical: >1 estirado, <1 aplastado, 1 normal
  private dustTimer = 0;

  constructor(
    private level: Level,
    private particles: Particles,
  ) {}

  /** Al cambiar de sala, el jugador pasa a colisionar contra la nueva. */
  setLevel(level: Level): void {
    this.level = level;
  }

  /** Reaparecer en un punto concreto (spawn o checkpoint). */
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
    this.launched = false;
    this.dropTimer = 0;
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

  /** Lanzamiento de resorte: impulso vertical impuesto desde afuera.
   *  Marca `launched` para que el recorte de salto variable (soltar la
   *  tecla achica el brinco) NO se coma este impulso: el resorte manda
   *  hasta el punto más alto. También recarga el salto aéreo. */
  springLaunch(speed: number): void {
    this.vy = -speed;
    this.onGround = false;
    this.launched = true;
    this.airJumpsLeft = 1;
    this.stretch = STRETCH_JUMP;
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
    this.launched = false; // y también el vuelo de resorte
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
    this.dropTimer = Math.max(0, this.dropTimer - dt);

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
        if (this.coyoteTimer > 0 && isDown('down') && this.onPlankOnly()) {
          // Abajo + saltar sobre un tablón: en vez de saltar, lo atraviesa
          // hacia abajo (los tablones dejan de frenar por unos frames).
          this.dropTimer = 0.16;
          this.onGround = false;
          this.bufferTimer = 0;
          this.coyoteTimer = 0;
          this.vy = Math.max(this.vy, 60);
          this.particles.puff(this.x + this.w / 2, this.y + this.h, 3, DUST_COLORS);
        } else if (this.coyoteTimer > 0) {
          this.vy = -JUMP_SPEED;
          this.onGround = false;
          this.bufferTimer = 0;
          this.coyoteTimer = 0;
          this.launched = false;
          this.stretch = STRETCH_JUMP; // despega estirado
          sfx.jump();
        } else if (this.abilities.wallJump && wall !== 0) {
          // Wall jump: salto en diagonal, alejándose de la pared.
          this.vy = -JUMP_SPEED * WALL_JUMP_V;
          this.launched = false;
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
          this.launched = false;
          this.bufferTimer = 0;
          this.stretch = STRETCH_JUMP;
          // Nubecita bajo los pies: el "apoyo" invisible del segundo salto.
          this.particles.puff(this.x + this.w / 2, this.y + this.h, 5, DUST_COLORS);
          sfx.doubleJump();
        }
      }
      // Salto variable: si soltás temprano, el brinco es más bajo.
      // Un lanzamiento de resorte no se recorta: el impulso es del
      // resorte, no del dedo (el flag se limpia al pasar el punto
      // más alto o cuando un salto propio retoma el control).
      if (!isDown('jump') && this.vy < 0 && !this.launched) {
        this.vy *= JUMP_CUT;
      }
      if (this.vy >= 0) this.launched = false;

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

  /** ¿Está parado SOLO sobre tablones? (ni un tile sólido bajo los pies).
   *  Es la condición para poder bajarse de uno con abajo + saltar. */
  private onPlankOnly(): boolean {
    const row = Math.floor((this.y + this.h + 1) / TILE);
    const c0 = Math.floor(this.x / TILE);
    const c1 = Math.floor((this.x + this.w) / TILE);
    let plank = false;
    for (let col = c0; col <= c1; col++) {
      if (this.level.solidCell(row, col)) return false;
      if (this.level.oneWayCell(row, col)) plank = true;
    }
    return plank;
  }

  /**
   * Plataformas de un solo sentido: solo frenan la caída si los pies
   * venían DESDE ARRIBA del tablón. Subiendo (o desde el costado) se
   * atraviesan sin tocarlas. Con abajo + saltar se bajan a propósito
   * (dropTimer las apaga unos frames).
   */
  private resolveOneWay(prevBottom: number): void {
    if (this.vy < 0) return; // subiendo: siempre se atraviesan
    if (this.dropTimer > 0) return; // bajando a propósito: no frenan
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

    // Brillo tenue de cristal detrás del jugador, del color de su skin
    drawGlow(ctx, this.x + this.w / 2 - camX, this.y + this.h / 2 - camY, 16, currentSkin().glow, 0.35);

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
    const s = playerSprites(); // los sprites de la skin activa
    if (!this.onGround) {
      if (this.wallSliding) return s.wall;
      return this.vy < 0 ? s.jump : s.fall;
    }
    if (this.vx !== 0) {
      return frameAt(s.run, 12, this.animTime);
    }
    // Idle vivo: parpadea cada tanto y "respira" despacio.
    if (this.animTime % 3.3 < 0.15) return s.blink;
    return frameAt([s.idle, s.idle2], 1.6, this.animTime);
  }
}
