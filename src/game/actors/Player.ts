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

// One-way planks: holding 'down' slips through (down+jump is the instant
// version — playtests showed nobody guesses the combo unprompted).
const PLANK_DROP_HOLD = 0.25; // seconds of held 'down' standing on planks

// Shrink: holding 'down' on solid ground MINIATURIZES you — the whole
// body, proportionally, down to one tile tall (never a squashed crouch:
// playtesting read that as "ugly duck-walk"). It's the only way through
// a 1-tile burrow. Entering at a run keeps the speed and bleeds it off
// smoothly; under a burrow's roof you stay small (growing would clip).
const FULL_H = 11;          // standing hitbox height
const MINI_H = 6;           // shrunken hitbox: fits an 8px (1-tile) burrow
const MINI_SPEED = 58;      // px/s of the little legs (~63% MOVE_SPEED)
const MINI_GRIP = 6;        // per second: the entry skid bleeds off smoothly
const MINI_SCALE = 0.58;    // the sprite draws whole at this scale
const MINI_LERP = 16;       // per second: how fast the size change animates

// Water ('='): a body volume. You FLOAT on its surface; once the dive
// relic is found, 'down' submerges you into a free 4-directional swim.
// Everything is a fraction of MOVE_SPEED (water is heavy), buoyancy is a
// damped spring holding you at the surface, and the verbs re-skin: jump
// = a surface hop / an upward stroke, dash = a shorter aquatic lunge.
const SURFACE_SPEED = 69;    // 75% MOVE_SPEED: swimming along the surface
const SWIM_SPEED = 64;       // 70% MOVE_SPEED: free swim while submerged
const SWIM_GRIP = 10;        // per second: water control eases in (floaty)
const WATER_HOP = 193;       // surface jump: mounts a 3-tile ledge, never 4
const SWIM_STROKE = 122;     // upward kick while submerged (jump = a stroke)
const SWIM_DRIFT = 6;        // gentle idle rise submerged (water floats you)
const LUNGE_SPEED = 150;     // 60% DASH_SPEED: the aquatic dash-lunge
const FLOAT_REST = 5;        // equilibrium: feet this far under the surface
const FLOAT_MAX_DEPTH = 12;  // hard cap: a floater never sinks past ~1.5 tiles
const FLOAT_STIFF = 26;      // buoyancy spring stiffness (toward the rest line)
const FLOAT_DAMP = 6;        // buoyancy damping, so the entry bob settles
const ENTRY_SINK = 95;       // a fast fall becomes a gentle ~1-tile dip on entry
const PLUNGE_SPEED = 230;    // pound-into-water: drives the dive down hard...
const PLUNGE_DEPTH = 26;     // ...to ~3 tiles, where it's capped, then bobs up

// Underwater current (device): mirrors the vent's push (accel beats the
// swim, terminal ≈ 11 tiles/s) so a jet is ride-able and an opposing one
// is a gate you route around, not overpower.
const CURRENT_ACCEL = 1500;  // px/s^2 the jet adds (like VENT_ACCEL)
const CURRENT_MAX = 88;      // px/s terminal ride speed (like VENT_RISE)

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

// Bubbles trailing a swimmer (puff motes rise and fade — bubble-like).
const WATER_BUBBLES = ['#bfeaff', '#7fd8d0', '#e6ffff'];

/** Nudge a velocity toward a direction, capped at a terminal speed
 *  (the shared shape of every push: updrafts, currents). */
function pushToward(v: number, dir: -1 | 0 | 1, step: number, max: number): number {
  if (dir < 0) return Math.max(v - step, -max);
  if (dir > 0) return Math.min(v + step, max);
  return v;
}

export class Player {
  x = 0;
  y = 0;
  readonly w = 6;
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
    dive: false,
    shrink: false,
  };
  private airJumpsLeft = 0;
  private dashTimer = 0;    // >0 = dash in progress
  private dashCooldown = 0;
  private wallLock = 0;     // >0 = control locked after a wall jump
  private wallLockDir: 1 | -1 = 1;
  private wallSliding = false; // to pick the wall sprite
  private isPounding = false;  // pound dive in progress
  private isGliding = false;   // slowing the fall with the glide
  private swimmingNow = false; // hitbox overlaps water this frame
  private diving = false;      // submerged: free swim (needs the dive relic)
  private plunging = false;    // a pound-plunge is still bobbing back up
  private mini = false;        // miniaturized (needs the shrink relic)
  private miniScale = 1;       // drawn scale, eased toward its target

  private launched = false; // external impulse (spring): no jump cut
  private dropTimer = 0;    // >0 = dropping through a plank (ignores them)
  private plankHold = 0;    // seconds 'down' has been held standing on planks
  private coyoteTimer = 0;
  private bufferTimer = 0;
  private animTime = 0;
  private stretch = 1; // vertical scale: >1 stretched, <1 squashed, 1 normal
  private dustTimer = 0;

  constructor(
    private level: Level,
    private particles: Particles,
  ) {}

  /** Hitbox height: full standing, one tile short while miniaturized. */
  get h(): number {
    return this.mini ? MINI_H : FULL_H;
  }

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
    this.diving = false;
    this.plunging = false;
    this.mini = false; // spawns stand tall (never inside a burrow)
    this.miniScale = 1;
    // Respawning INTO water is safe: seed the swim flag so we start
    // already floating (no phantom entry splash or plunge next frame).
    this.swimmingNow = this.inWater();
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
      !this.swimmingNow && // the glide cancels in water: you swim, not soar
      isDown('jump') &&
      this.dashTimer <= 0 &&
      !this.isPounding
    );
  }

  /** Is the hitbox in water? (floating OR diving). Devices and combat
   *  read it; it's recomputed each frame from the tile overlap. */
  get swimming(): boolean {
    return this.swimmingNow;
  }

  /** Is it submerged? (dived under, post-relic). Currents only push here,
   *  and the wall-jump/slide are disabled. */
  get submerged(): boolean {
    return this.diving;
  }

  /** Is a dash (or its aquatic lunge) in progress? Combat reads it: the
   *  lunge is the weapon that kills a stunned anguila. */
  get dashing(): boolean {
    return this.dashTimer > 0;
  }

  /** Is it miniaturized? (the shrink relic's stance). */
  get shrunk(): boolean {
    return this.mini;
  }

  /** Push from an updraft: accelerates upward up to the
   *  rise velocity. Called by systems/devices while gliding
   *  inside the column. */
  liftBy(dt: number, accel: number, maxRise: number): void {
    this.vy = Math.max(this.vy - accel * dt, -maxRise);
  }

  /** Push from an underwater current: shoves a SUBMERGED swimmer toward
   *  (dirX, dirY) up to the ride speed. The same accel/max shape as
   *  liftBy, in 2D. Called by systems/devices while inside the jet; it
   *  does nothing to a floater (you have to have dived in to be caught). */
  currentPush(dt: number, dirX: -1 | 0 | 1, dirY: -1 | 0 | 1): void {
    if (!this.diving) return;
    this.vx = pushToward(this.vx, dirX, CURRENT_ACCEL * dt, CURRENT_MAX);
    this.vy = pushToward(this.vy, dirY, CURRENT_ACCEL * dt, CURRENT_MAX);
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
    if (this.mini && !this.headBlocked()) this.setMini(false);
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

  /**
   * Recover one heart (defeating an enemy). Returns true only if it
   * actually healed: at full health there's nothing to give back, and
   * the caller skips the celebration.
   */
  heal(): boolean {
    if (this.health >= this.maxHealth) return false;
    this.health++;
    return true;
  }

  update(dt: number): void {
    this.wallSliding = false;
    this.isGliding = false;
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.stompGrace = Math.max(0, this.stompGrace - dt);
    this.dropTimer = Math.max(0, this.dropTimer - dt);

    // ---- Water: am I in it this frame? (drives buoyancy vs. gravity) ----
    const wasSwimming = this.swimmingNow;
    this.swimmingNow = this.inWater();
    if (this.swimmingNow && !wasSwimming) this.enterWater();
    else if (!this.swimmingNow && wasSwimming) this.exitWater();

    // Did the dive land outside its own physics? (a moving
    // platform set it down during the devices pass): close the impact here.
    if (this.isPounding && this.onGround) this.landPound();

    // ---- Pound: does one start? (down, mid-air) ----
    if (
      !this.isPounding &&
      this.abilities.pound &&
      !this.onGround &&
      !this.swimmingNow && // in water, 'down' dives (or does nothing): no pound
      justPressed('down') &&
      this.dashTimer <= 0 &&
      this.hurtLock <= 0
    ) {
      this.isPounding = true;
      this.launched = false;
      this.stretch = STRETCH_JUMP; // thins out during the dive
      sfx.pound();
    }

    // ---- Shrink: 'down' on the ground miniaturizes you ----
    // Planks keep their drop (they're checked first); the burrow's roof
    // keeps you small until there's headroom, so you never clip rock.
    if (this.mini) {
      const wants =
        this.onGround && isDown('down') && !this.onPlankOnly() && !this.swimmingNow;
      if (!wants && !this.headBlocked()) this.setMini(false);
    } else if (
      this.abilities.shrink &&
      this.onGround &&
      isDown('down') &&
      !this.onPlankOnly() &&
      !this.swimmingNow &&
      this.dashTimer <= 0 &&
      this.hurtLock <= 0
    ) {
      this.setMini(true);
    }

    // ---- Dash: does one start? (growing back first, if mini) ----
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    if (
      this.dashTimer <= 0 &&
      !this.isPounding &&
      justPressed('dash') &&
      this.abilities.dash &&
      this.dashCooldown === 0 &&
      (!this.mini || !this.headBlocked())
    ) {
      this.setMini(false); // the dash is a full-size move
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
      // Underwater the dash is a shorter LUNGE (the water resists), but
      // it is the same verb: smash still shatters the cracked wall ahead.
      this.dashTimer -= dt;
      this.vx = this.facing * (this.swimmingNow ? LUNGE_SPEED : DASH_SPEED);
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
    } else if (this.swimmingNow) {
      // ---- In water: FLOAT at the surface, or FREE-SWIM once submerged ----
      this.wallLock = Math.max(0, this.wallLock - dt);
      this.hurtLock = Math.max(0, this.hurtLock - dt);
      this.coyoteTimer = 0;  // the hop is the exit move: no coyote from water
      this.airJumpsLeft = 1; // the surface recharges the air jump too

      const surfaceY = this.waterSurfaceY();
      const restFeet = surfaceY + FLOAT_REST;
      const feet = this.y + this.h;

      // Horizontal intent (heavier than on land, shared by both states).
      let dir = 0;
      if (isDown('left')) dir -= 1;
      if (isDown('right')) dir += 1;
      if (dir !== 0) this.facing = dir as 1 | -1;

      // Dive state: 'down' submerges (needs the relic); rising back to the
      // surface line without holding 'down' floats you again.
      if (this.abilities.dive) {
        if (!this.diving && isDown('down')) {
          this.diving = true;
          this.plunging = false;
        } else if (this.diving && !isDown('down') && feet <= restFeet + 1) {
          this.diving = false;
        }
      }

      const jumped = justPressed('jump');
      if (this.diving) {
        // ---- Submerged: 4-directional, water-slow; jump = a rising stroke ----
        this.vx += (dir * SWIM_SPEED - this.vx) * Math.min(1, SWIM_GRIP * dt);
        const vTarget = isDown('down') ? SWIM_SPEED : -SWIM_DRIFT;
        this.vy += (vTarget - this.vy) * Math.min(1, SWIM_GRIP * dt);
        if (jumped) {
          this.vy = -SWIM_STROKE;
          this.stretch = STRETCH_JUMP;
          this.particles.puff(this.x + this.w / 2, this.y + this.h - 2, 3, WATER_BUBBLES);
          sfx.stroke();
        }
      } else {
        // ---- Floating: buoyancy holds you at the surface, bobbing ----
        this.vx += (dir * SURFACE_SPEED - this.vx) * Math.min(1, SWIM_GRIP * dt);
        // The plunge is over once it has bobbed back UP to the surface
        // (rising: vy < 0). Testing depth alone would clear it instantly,
        // since the plunge STARTS at the surface before diving down.
        if (this.plunging && this.vy < 0 && feet <= restFeet + 2) this.plunging = false;
        // Damped spring toward the rest line (enter → dip → bob → settle),
        // but don't fight your OWN hop as it carries you up and out.
        if (this.vy > -WATER_HOP * 0.5) {
          this.vy += -FLOAT_STIFF * (feet - restFeet) * dt;
          this.vy -= this.vy * Math.min(1, FLOAT_DAMP * dt);
        }
        // No dive relic yet: 'down' answers with a token ~5px dip and a puff
        // of bubbles, so the locked depth reads as "not yet", not dead input.
        if (!this.abilities.dive && justPressed('down')) {
          this.vy = Math.max(this.vy, 34);
          this.particles.puff(this.x + this.w / 2, this.y + this.h, 3, WATER_BUBBLES);
        }
        if (jumped) {
          // Water hop: launches out of the surface (mounts a 3-tile ledge).
          this.vy = -WATER_HOP;
          this.launched = false;
          this.stretch = STRETCH_JUMP;
          this.particles.puff(this.x + this.w / 2, this.y + this.h, 4, WATER_BUBBLES);
          sfx.stroke();
        }
      }

      // A few bubbles trail the swim (its "dust"): more when moving.
      if (Math.random() < (dir !== 0 || this.diving ? 0.28 : 0.08)) {
        this.particles.puff(
          this.x + this.w / 2 - this.facing * 2,
          this.y + 3,
          1,
          WATER_BUBBLES,
          -this.facing * 0.3,
        );
      }
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
      } else if (this.mini) {
        // Little legs: slower feet, but a running entry keeps its speed
        // and bleeds it off smoothly — the skid carries you INTO the burrow.
        this.vx += (dir * MINI_SPEED - this.vx) * Math.min(1, MINI_GRIP * dt);
        if (dir !== 0) this.facing = dir as 1 | -1;
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

      // ---- Held 'down' on planks: slip through (the intuitive input;
      // down + jump below remains the instant version) ----
      if (this.onGround && isDown('down') && this.onPlankOnly()) {
        this.plankHold += dt;
        if (this.plankHold >= PLANK_DROP_HOLD) this.dropThroughPlank();
      } else {
        this.plankHold = 0;
      }

      // ---- Jumps: ground (with coyote) > wall > double jump ----
      if (this.bufferTimer > 0) {
        const wall = this.onGround ? 0 : this.wallDir();
        if (this.coyoteTimer > 0 && isDown('down') && this.onPlankOnly()) {
          // Down + jump on a plank: instead of jumping, drops through it.
          this.dropThroughPlank();
        } else if (this.coyoteTimer > 0 && (!this.mini || !this.headBlocked())) {
          this.setMini(false); // jumping grows you back (never in a burrow)
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
        } else if (this.abilities.doubleJump && this.airJumpsLeft > 0 && !this.mini) {
          // Double jump: an extra impulse mid-air (never while mini:
          // inside a burrow it would just bonk the roof).
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

    // Depth cap (water is non-solid, so just clamp Y): a floater never
    // sinks past ~1.5 tiles; a pound-plunge is allowed ~3 tiles before
    // it too is stopped and buoyancy bobs it back up. Diving is free.
    if (this.swimmingNow && !this.diving) {
      const cap = this.plunging ? PLUNGE_DEPTH : FLOAT_MAX_DEPTH;
      const maxFeet = this.waterSurfaceY() + cap;
      if (this.y + this.h > maxFeet) {
        this.y = maxFeet - this.h;
        if (this.vy > 0) this.vy = 0;
      }
    }

    // Land squashed: the harder the hit, the flatter it stays.
    if (!wasOnGround && this.onGround && fallSpeed > 60 && !this.swimmingNow) {
      this.stretch = 1 - Math.min(SQUASH_MAX, fallSpeed / 700);
      // Dust cloud at the feet, bigger the harder it falls.
      const motes = Math.min(8, Math.round(fallSpeed / 45));
      this.particles.puff(this.x + this.w / 2, this.y + this.h - 1, motes, DUST_COLORS);
    }

    // Little dust steps while running along the ground.
    this.dustTimer -= dt;
    if (this.onGround && this.vx !== 0 && this.dustTimer <= 0 && !this.swimmingNow) {
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

    // The size change eases too: menguar/crecer is an animation, not a snap.
    const targetScale = this.mini ? MINI_SCALE : 1;
    this.miniScale += (targetScale - this.miniScale) * Math.min(1, MINI_LERP * dt);
    if (Math.abs(this.miniScale - targetScale) < 0.01) this.miniScale = targetScale;

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

  /** Shrink/grow keeping the FEET planted: the hitbox change happens at
   *  the head end, so the floor contact never pops. A puff of motes and
   *  a little chime sell the size change. */
  private setMini(on: boolean): void {
    if (this.mini === on) return;
    this.y += on ? FULL_H - MINI_H : MINI_H - FULL_H;
    this.mini = on;
    this.particles.puff(this.x + this.w / 2, this.y + this.h - 2, 6, DUST_COLORS);
    if (on) sfx.shrink();
    else sfx.grow();
  }

  /** Is there rock where the full-size head would go? While true, you
   *  can't grow back (a burrow's roof): standing up would clip. */
  private headBlocked(): boolean {
    const rise = FULL_H - MINI_H;
    const strip: Box = { x: this.x, y: this.y - rise, w: this.w, h: rise - 0.01 };
    return this.level.solidTilesIn(strip).some((tile) => overlaps(strip, tile));
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

  /** Planks stop blocking for a few frames and the player slips down. */
  private dropThroughPlank(): void {
    this.plankHold = 0;
    this.dropTimer = 0.16;
    this.onGround = false;
    this.bufferTimer = 0;
    this.coyoteTimer = 0;
    this.vy = Math.max(this.vy, 60);
    this.particles.puff(this.x + this.w / 2, this.y + this.h, 3, DUST_COLORS);
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

  /** Is the hitbox overlapping water right now? (swim physics on/off). */
  private inWater(): boolean {
    return this.level.touchesWater(this.box());
  }

  /** The Y (px) of the water surface under the player: the top of the
   *  topmost water cell contiguous above the body's cells. Buoyancy
   *  pulls toward a rest line a little below it. */
  private waterSurfaceY(): number {
    const c0 = Math.floor(this.x / TILE);
    const c1 = Math.floor((this.x + this.w) / TILE);
    const rMid = Math.floor((this.y + this.h / 2) / TILE);
    const rFeet = Math.floor((this.y + this.h - 1) / TILE);
    let best = Infinity;
    for (let col = c0; col <= c1; col++) {
      let row = this.level.wetCell(rMid, col) ? rMid : rFeet;
      if (!this.level.wetCell(row, col)) continue;
      while (row > 0 && this.level.wetCell(row - 1, col)) row--;
      best = Math.min(best, row * TILE);
    }
    return best === Infinity ? this.y + this.h : best;
  }

  /** Crossing INTO water: splash, cancel the air verbs, and either sink
   *  gently (a normal entry) or turn a pound into a deep plunge. */
  private enterWater(): void {
    sfx.splash();
    this.isGliding = false;
    this.launched = false;   // a spring's flight ends in the water
    this.wallLock = 0;       // no wall control in water
    this.coyoteTimer = 0;    // the hop is the exit move: no coyote from water
    this.bufferTimer = 0;    // a buffered land-jump doesn't survive into water
    // Water grows you back (you swim full-size), headroom allowing.
    if (this.mini && !this.headBlocked()) this.setMini(false);
    if (this.isPounding) {
      // Pound into water: a bounded plunge (~3 tiles), then buoyancy lifts.
      this.isPounding = false;
      this.plunging = true;
      this.vy = PLUNGE_SPEED;
    } else if (this.vy > ENTRY_SINK) {
      this.vy = ENTRY_SINK; // a fast fall becomes a gentle ~1-tile dip
    }
  }

  /** Breaking OUT of the surface: splash, and the dive state ends. */
  private exitWater(): void {
    sfx.splash();
    this.diving = false;
    this.plunging = false;
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
    // squashing gains it (rough "volume" conservation). The mini scale
    // multiplies BOTH axes: shrunk, you are the whole character, smaller
    // — never a squashed silhouette.
    sprite.drawStretched(
      ctx,
      this.x + this.w / 2 - camX,
      this.y + this.h - camY,
      (2 - this.stretch) * this.miniScale,
      this.stretch * this.miniScale,
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
