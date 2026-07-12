// ============================================================
//  THE PLAYER
// ------------------------------------------------------------
//  Platformer physics with two "game feel" details:
//   - Coyote time: you can jump a moment AFTER leaving the
//     ledge (forgives the late reflex).
//   - Jump buffer: if you press jump just BEFORE touching the
//     ground, the jump is stored and runs on landing.
//  Those two details are what make a jump "feel good".
//  Where it appears (spawn, checkpoint) is decided by the session: here
//  only movement, damage and drawing live.
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
const JUMP_SPEED = 215;    // initial jump velocity (px/s)
const MAX_FALL = 280;      // max fall velocity
const COYOTE = 0.1;        // grace seconds after leaving the ground
const JUMP_BUFFER = 0.12;  // seconds the jump is "remembered"
const JUMP_CUT = 0.45;     // on releasing jump, we cut the impulse

const DOUBLE_JUMP = 0.92;  // double jump strength relative to the normal jump

// Dash: short horizontal impulse. While it lasts, gravity is suspended.
const DASH_SPEED = 250;    // px/s during the dash
const DASH_TIME = 0.14;    // seconds the impulse lasts
const DASH_COOLDOWN = 0.5; // wait until you can dash again
const DASH_SQUASH = 0.8;   // horizontal flattening: sense of speed

// Wall slide and wall jump
const WALL_SLIDE_SPEED = 55; // max fall while grazing the wall
const WALL_JUMP_V = 0.98;    // wall jump height vs normal jump
const WALL_JUMP_H = 130;     // horizontal push away from the wall
const WALL_LOCK = 0.14;      // control locked after the wall jump

// Glide: holding jump in the air slows the fall. The ratio
// drives the design: ~2 tiles forward for each tile of descent.
const GLIDE_FALL = 45;       // max fall while gliding (px/s)

// Pound: vertical dive that shatters cracked blocks ('%').
const POUND_SPEED = 340;     // px/s of the dive (more than MAX_FALL: it's heavy)

// Ice ('~'): control arrives sliding — accelerates and brakes gradually.
const ICE_GRIP = 4.5;        // per second: how fast the foot "grips"

// Shards of a cracked block when it breaks.
const CRACK_COLORS = ['#e9d6ff', '#b98bff', '#8064b0'];

// Health and damage
const MAX_HEALTH = 3;      // hearts
const HURT_INVULN = 1.1;   // seconds of invulnerability after a hit
const HURT_LOCK = 0.2;     // control locked during the knockback
const KNOCKBACK_X = 150;   // horizontal push when taking damage
const KNOCKBACK_Y = 150;   // upward push when taking damage

const STOMP_BOUNCE = 200;  // upward bounce after stomping an enemy

// Squash & stretch: deforming the sprite conveys weight and energy.
const STRETCH_JUMP = 1.28;    // stretched on takeoff (tall and thin)
const SQUASH_MAX = 0.38;      // max squash on landing (short and wide)
const STRETCH_RECOVER = 11;   // how fast it recovers its shape (per second)

// Cave dust kicked up by the feet.
const DUST_COLORS = ['#9b86c4', '#6f5a9e', '#d7c9ec'];
const DUST_STEP_EVERY = 0.09; // seconds between motes while running

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
  private invulnTimer = 0;  // >0 = invulnerable (blinks)
  private hurtLock = 0;     // >0 = control locked by knockback
  private stompGrace = 0;   // >0 = just stomped: takes no damage (no blink)

  /** Unlockable abilities: they're data, not hardcoded.
   *  They start off; each relic in the world turns its own on. */
  readonly abilities: Record<AbilityName, boolean> = {
    doubleJump: false,
    dash: false,
    wallJump: false,
    glide: false,
    pound: false,
    smash: false,
  };
  private airJumpsLeft = 0;
  private dashTimer = 0;    // >0 = dash in progress
  private dashCooldown = 0;
  private wallLock = 0;     // >0 = control locked after a wall jump
  private wallLockDir: 1 | -1 = 1;
  private wallSliding = false; // to pick the wall sprite
  private isPounding = false;  // pound dive in progress
  private isGliding = false;   // slowing the fall with the glide

  private launched = false; // external impulse (spring): no jump cut
  private dropTimer = 0;    // >0 = dropping through a plank (ignores them)
  private coyoteTimer = 0;
  private bufferTimer = 0;
  private animTime = 0;
  private stretch = 1; // vertical scale: >1 stretched, <1 squashed, 1 normal
  private dustTimer = 0;

  constructor(
    private level: Level,
    private particles: Particles,
  ) {}

  /** On changing rooms, the player starts colliding against the new one. */
  setLevel(level: Level): void {
    this.level = level;
  }

  /** Respawn at a specific point (spawn or checkpoint). */
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
    this.isPounding = false;
    this.isGliding = false;
  }

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  get invulnerable(): boolean {
    return this.invulnTimer > 0;
  }

  /** Is it in a full pound dive? (combat reads it: the dive
   *  stomps even spiky enemies). */
  get pounding(): boolean {
    return this.isPounding;
  }

  /** Is it "hanging" on the glide? (in the air, with the ability and
   *  holding jump). Updrafts only push in this state: releasing
   *  jump is letting go of the wind. */
  get glideHeld(): boolean {
    return (
      this.abilities.glide &&
      !this.onGround &&
      isDown('jump') &&
      this.dashTimer <= 0 &&
      !this.isPounding
    );
  }

  /** Push from an updraft: accelerates upward up to the
   *  rise velocity. Called by systems/devices while gliding
   *  inside the column. */
  liftBy(dt: number, accel: number, maxRise: number): void {
    this.vy = Math.max(this.vy - accel * dt, -maxRise);
  }

  /** Bounce on stomping an enemy: jumps up, regains the air jump
   *  (to chain) and a brief grace so it takes no damage from the
   *  same enemy while still overlapping (e.g. a boss that survives). */
  bounce(): void {
    this.vy = -STOMP_BOUNCE;
    this.onGround = false;
    this.airJumpsLeft = 1;
    this.stretch = STRETCH_JUMP;
    this.stompGrace = 0.35;
    this.isPounding = false; // the bounce ends the dive
  }

  /** Spring launch: vertical impulse imposed from the outside.
   *  Sets `launched` so the variable jump cut (releasing the
   *  key shortens the hop) does NOT eat this impulse: the spring rules
   *  up to the highest point. Also recharges the air jump. */
  springLaunch(speed: number): void {
    this.vy = -speed;
    this.onGround = false;
    this.launched = true;
    this.airJumpsLeft = 1;
    this.stretch = STRETCH_JUMP;
    this.isPounding = false; // the spring wins: cuts the dive
  }

  /**
   * Take damage from a source located at fromX. Returns true if
   * the hit connected (false if it was invulnerable). Removes a heart,
   * pushes the player away from the source and triggers invulnerability.
   */
  hurt(fromX: number): boolean {
    if (this.invulnTimer > 0 || this.stompGrace > 0) return false;
    this.health--;
    this.invulnTimer = HURT_INVULN;
    this.hurtLock = HURT_LOCK;
    this.dashTimer = 0; // a hit cuts the dash
    this.launched = false; // and also the spring flight
    this.isPounding = false; // and the pound dive
    this.wallLock = 0;
    const away: 1 | -1 = this.x + this.w / 2 < fromX ? -1 : 1;
    this.vx = away * KNOCKBACK_X;
    this.vy = -KNOCKBACK_Y;
    this.onGround = false;
    this.facing = (-away) as 1 | -1; // faces what hit it
    return true;
  }

  update(dt: number): void {
    this.wallSliding = false;
    this.isGliding = false;
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.stompGrace = Math.max(0, this.stompGrace - dt);
    this.dropTimer = Math.max(0, this.dropTimer - dt);

    // Did the dive land outside its own physics? (a moving
    // platform set it down during the devices pass): close the impact here.
    if (this.isPounding && this.onGround) this.landPound();

    // ---- Pound: does one start? (down, mid-air) ----
    if (
      !this.isPounding &&
      this.abilities.pound &&
      !this.onGround &&
      justPressed('down') &&
      this.dashTimer <= 0 &&
      this.hurtLock <= 0
    ) {
      this.isPounding = true;
      this.launched = false;
      this.stretch = STRETCH_JUMP; // thins out during the dive
      sfx.pound();
    }

    // ---- Dash: does one start? ----
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    if (
      this.dashTimer <= 0 &&
      !this.isPounding &&
      justPressed('dash') &&
      this.abilities.dash &&
      this.dashCooldown === 0
    ) {
      this.dashTimer = DASH_TIME;
      this.dashCooldown = DASH_COOLDOWN;
      this.stretch = DASH_SQUASH; // flattened by the speed
      sfx.dash();
    }

    if (this.isPounding) {
      // ---- Diving: straight down, no control (commitment) ----
      this.vx = 0;
      this.vy = POUND_SPEED;
      // Speed lines above the head
      this.particles.puff(this.x + this.w / 2, this.y + 1, 1, DUST_COLORS);
    } else if (this.dashTimer > 0) {
      // ---- Mid-dash: fixed speed, no gravity or control ----
      this.dashTimer -= dt;
      this.vx = this.facing * DASH_SPEED;
      this.vy = 0;
      // Charge: the cracked blocks ahead shatter
      // instead of stopping the impulse.
      if (this.abilities.smash) this.smashAhead();
      // Dust trail behind
      this.particles.puff(
        this.x + this.w / 2 - this.facing * 4,
        this.y + this.h - 3,
        1,
        DUST_COLORS,
        -this.facing,
      );
    } else {
      // ---- Horizontal input ----
      let dir = 0;
      if (isDown('left')) dir -= 1;
      if (isDown('right')) dir += 1;
      this.wallLock = Math.max(0, this.wallLock - dt);
      this.hurtLock = Math.max(0, this.hurtLock - dt);
      if (this.hurtLock > 0) {
        // Damage knockback: no control, the velocity brakes on its own.
        this.vx *= 0.86;
      } else if (this.wallLock > 0) {
        // After a wall jump, a few frames of fixed push: without this,
        // holding the key toward the wall would re-stick you instantly.
        this.vx = this.wallLockDir * WALL_JUMP_H;
      } else if (this.onGround && this.onIce()) {
        // Ice underfoot: control arrives sliding — the velocity
        // chases the intention instead of obeying it instantly.
        this.vx += (dir * MOVE_SPEED - this.vx) * Math.min(1, ICE_GRIP * dt);
        if (dir !== 0) this.facing = dir as 1 | -1;
      } else {
        this.vx = dir * MOVE_SPEED;
        if (dir !== 0) this.facing = dir as 1 | -1;
      }

      // ---- Coyote and buffer timers ----
      this.coyoteTimer = this.onGround ? COYOTE : Math.max(0, this.coyoteTimer - dt);
      if (this.onGround) this.airJumpsLeft = 1; // landing recharges the double jump
      this.bufferTimer = justPressed('jump')
        ? JUMP_BUFFER
        : Math.max(0, this.bufferTimer - dt);

      // ---- Jumps: ground (with coyote) > wall > double jump ----
      if (this.bufferTimer > 0) {
        const wall = this.onGround ? 0 : this.wallDir();
        if (this.coyoteTimer > 0 && isDown('down') && this.onPlankOnly()) {
          // Down + jump on a plank: instead of jumping, drops through
          // it downward (planks stop blocking for a few frames).
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
          this.stretch = STRETCH_JUMP; // takes off stretched
          sfx.jump();
        } else if (this.abilities.wallJump && wall !== 0) {
          // Wall jump: diagonal jump, away from the wall.
          this.vy = -JUMP_SPEED * WALL_JUMP_V;
          this.launched = false;
          this.wallLock = WALL_LOCK;
          this.wallLockDir = -wall as 1 | -1;
          this.facing = this.wallLockDir;
          this.bufferTimer = 0;
          this.stretch = STRETCH_JUMP;
          // Chips at the push point against the wall
          const px = wall === 1 ? this.x + this.w : this.x;
          this.particles.puff(px, this.y + this.h / 2, 4, DUST_COLORS, -wall);
          sfx.wallJump();
        } else if (this.abilities.doubleJump && this.airJumpsLeft > 0) {
          // Double jump: an extra impulse mid-air.
          this.airJumpsLeft--;
          this.vy = -JUMP_SPEED * DOUBLE_JUMP;
          this.launched = false;
          this.bufferTimer = 0;
          this.stretch = STRETCH_JUMP;
          // Little cloud underfoot: the invisible "footing" of the second jump.
          this.particles.puff(this.x + this.w / 2, this.y + this.h, 5, DUST_COLORS);
          sfx.doubleJump();
        }
      }
      // Variable jump: if you release early, the hop is lower.
      // A spring launch isn't cut: the impulse is the
      // spring's, not the finger's (the flag clears on passing the
      // highest point or when a jump of its own takes back control).
      if (!isDown('jump') && this.vy < 0 && !this.launched) {
        this.vy *= JUMP_CUT;
      }
      if (this.vy >= 0) this.launched = false;

      // ---- Gravity ----
      this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);

      // ---- Wall slide: pushing against the wall in the air slows the fall ----
      if (
        this.abilities.wallJump &&
        !this.onGround &&
        this.vy > WALL_SLIDE_SPEED &&
        dir !== 0 &&
        dir === this.wallDir()
      ) {
        this.vy = WALL_SLIDE_SPEED;
        this.wallSliding = true;
        // Rock chips from grazing
        if (Math.random() < 0.35) {
          const px = dir === 1 ? this.x + this.w : this.x;
          this.particles.puff(px, this.y + 3, 1, DUST_COLORS, -dir * 0.3);
        }
      }

      // ---- Glide: holding jump in the air slows the fall ----
      if (
        this.abilities.glide &&
        !this.onGround &&
        !this.wallSliding &&
        this.vy > 0 &&
        isDown('jump')
      ) {
        this.isGliding = true;
        if (this.vy > GLIDE_FALL) this.vy = GLIDE_FALL;
        // Motes slipping backward: reads as "I'm floating".
        if (Math.random() < 0.22) {
          this.particles.puff(
            this.x + this.w / 2 - this.facing * 3,
            this.y + 2,
            1,
            DUST_COLORS,
            -this.facing * 0.4,
          );
        }
      }
    }

    // ---- Move and resolve collisions, one axis at a time ----
    this.x += this.vx * dt;
    this.resolveAxis('x');
    const fallSpeed = this.vy; // velocity BEFORE hitting the ground
    const wasOnGround = this.onGround;
    const prevBottom = this.y + this.h; // feet BEFORE moving in Y
    this.y += this.vy * dt;
    this.onGround = false;
    this.resolveAxis('y');
    this.resolveOneWay(prevBottom);

    // Pound impact: as the feet touch down it shatters the cracked tiles.
    if (this.isPounding && this.onGround) this.landPound();

    // Land squashed: the harder the hit, the flatter it stays.
    if (!wasOnGround && this.onGround && fallSpeed > 60) {
      this.stretch = 1 - Math.min(SQUASH_MAX, fallSpeed / 700);
      // Dust cloud at the feet, bigger the harder it falls.
      const motes = Math.min(8, Math.round(fallSpeed / 45));
      this.particles.puff(this.x + this.w / 2, this.y + this.h - 1, motes, DUST_COLORS);
    }

    // Little dust steps while running along the ground.
    this.dustTimer -= dt;
    if (this.onGround && this.vx !== 0 && this.dustTimer <= 0) {
      this.dustTimer = DUST_STEP_EVERY;
      this.particles.puff(
        this.x + this.w / 2 - this.facing * 2, // behind the feet
        this.y + this.h - 1,
        1,
        DUST_COLORS,
        -this.facing * 0.6, // the dust lingers floating backward
      );
    }
    // The deformation eases back to the normal shape.
    this.stretch += (1 - this.stretch) * Math.min(1, STRETCH_RECOVER * dt);
    if (Math.abs(this.stretch - 1) < 0.01) this.stretch = 1;

    this.animTime += dt;
  }

  /** Is there a solid wall against a side? -1 left, 1 right, 0 nothing. */
  private wallDir(): -1 | 0 | 1 {
    const top = this.y + 2;
    const bottom = this.y + this.h - 2;
    const leftX = this.x - 1;
    const rightX = this.x + this.w + 1;
    if (this.level.isSolidAt(leftX, top) || this.level.isSolidAt(leftX, bottom)) return -1;
    if (this.level.isSolidAt(rightX, top) || this.level.isSolidAt(rightX, bottom)) return 1;
    return 0;
  }

  /** Is it standing ONLY on planks? (not a single solid tile underfoot).
   *  It's the condition for dropping off one with down + jump. */
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

  /** Is it standing on ice? (all the solid footing underfoot is
   *  ice; a single rock tile in the mix restores the grip). */
  private onIce(): boolean {
    const row = Math.floor((this.y + this.h + 1) / TILE);
    const c0 = Math.floor(this.x / TILE);
    const c1 = Math.floor((this.x + this.w) / TILE);
    let ice = false;
    for (let col = c0; col <= c1; col++) {
      if (this.level.solidCell(row, col)) {
        if (!this.level.icyCell(row, col)) return false;
        ice = true;
      }
    }
    return ice;
  }

  /** Pound impact: shatters the cracked blocks underfoot.
   *  If ALL the footing was cracked, the dive continues downward — that's
   *  how the floors of a multi-layer crack chain together. */
  private landPound(): void {
    const row = Math.floor((this.y + this.h + 1) / TILE);
    const c0 = Math.floor(this.x / TILE);
    const c1 = Math.floor((this.x + this.w) / TILE);
    let broke = false;
    let support = false;
    for (let col = c0; col <= c1; col++) {
      if (this.level.breakCrack(row, col)) {
        this.particles.burst(col * TILE + 4, row * TILE + 4, 8, CRACK_COLORS);
        broke = true;
      } else if (this.level.solidCell(row, col) || this.level.oneWayCell(row, col)) {
        support = true;
      }
    }
    if (broke) sfx.crack();
    if (broke && !support) {
      // The whole floor shattered: the dive continues.
      this.onGround = false;
      this.vy = POUND_SPEED;
      return;
    }
    this.isPounding = false;
  }

  /** Charge: mid-dash, the cracked column ahead shatters
   *  instead of stopping the impulse (only with the ability). */
  private smashAhead(): void {
    const aheadX = this.facing === 1 ? this.x + this.w + 1 : this.x - 1;
    const col = Math.floor(aheadX / TILE);
    const r0 = Math.floor((this.y + 1) / TILE);
    const r1 = Math.floor((this.y + this.h - 1) / TILE);
    let broke = false;
    for (let row = r0; row <= r1; row++) {
      if (this.level.breakCrack(row, col)) {
        this.particles.burst(col * TILE + 4, row * TILE + 4, 8, CRACK_COLORS);
        broke = true;
      }
    }
    if (broke) sfx.crack();
  }

  /**
   * One-way platforms: they only stop the fall if the feet
   * came FROM ABOVE the plank. Going up (or from the side) they
   * pass through without touching them. With down + jump you drop off
   * on purpose (dropTimer turns them off for a few frames).
   */
  private resolveOneWay(prevBottom: number): void {
    if (this.vy < 0) return; // going up: always passes through
    if (this.dropTimer > 0) return; // dropping on purpose: they don't stop
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
    // Invulnerable: blinks (disappears on alternating frames, ~10 Hz).
    if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 20) % 2 === 0) return;

    const sprite = this.currentSprite();

    // Faint crystal glow behind the player, in its skin's color
    drawGlow(ctx, this.x + this.w / 2 - camX, this.y + this.h / 2 - camY, 16, currentSkin().glow, 0.35);

    // Anchored to the feet and deformed: stretching loses width and
    // squashing gains it (rough "volume" conservation).
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
    const s = playerSprites(); // the active skin's sprites
    if (!this.onGround) {
      if (this.wallSliding) return s.wall;
      return this.vy < 0 ? s.jump : s.fall;
    }
    if (this.vx !== 0) {
      return frameAt(s.run, 12, this.animTime);
    }
    // Living idle: blinks now and then and "breathes" slowly.
    if (this.animTime % 3.3 < 0.15) return s.blink;
    return frameAt([s.idle, s.idle2], 1.6, this.animTime);
  }
}
