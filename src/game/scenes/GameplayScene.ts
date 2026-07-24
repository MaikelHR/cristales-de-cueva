// ============================================================
//  SCENE: GAMEPLAY (the actual game)
// ------------------------------------------------------------
//  Orchestrates one game step by calling the systems in order:
//  player, room transitions, enemies, pickups, combat,
//  pits, victory and camera. Special states (hit-stop,
//  frozen death) cut the step short before that.
// ============================================================

import { justPressed, isDown } from '../../engine/input';
import type { GameSession } from '../session';
import { debug } from '../debug';
import { overlaps } from '../../engine/canvas';
import { TILE } from '../world/Level';
import { handleRoomTransition } from '../systems/transitions';
import { collectPickups } from '../systems/pickups';
import { resolveEnemyContacts } from '../systems/combat';
import { readNearbyLore } from '../systems/lore';
import { carryAndAdvanceDevices, resolveDeviceContacts } from '../systems/devices';
import { drawWorld } from '../render/drawWorld';
import { drawHud } from '../ui/hud';
import { drawProgress } from '../ui/progress';
import { drawLorePlate } from '../ui/lorePlate';
import { sfx } from '../sfx';
import type { Scene, SceneManager, UiState } from './Scene';
import { PauseScene } from './PauseScene';
import { WonScene } from './WonScene';
import { EndingScene } from './EndingScene';
import { GameOverScene } from './GameOverScene';
import { FINAL_LEVEL_ID } from '../world/rooms';

// A footing must hold this long before it counts as "safe ground".
const SAFE_AFTER = 0.35;

/** Solid GRID tiles underfoot — not a device, not a one-way plank:
 *  the kind of floor worth re-spawning on. */
function standsOnRock(s: GameSession): boolean {
  const p = s.player;
  const level = s.world.current.level;
  const row = Math.floor((p.y + p.h + 1) / TILE);
  const c0 = Math.floor(p.x / TILE);
  const c1 = Math.floor((p.x + p.w) / TILE);
  for (let col = c0; col <= c1; col++) {
    if (level.solidCell(row, col)) return true;
  }
  return false;
}

// DEV noclip speeds, in pixels per second. The slow one is for reading a
// room on the way past; the fast one is for crossing a two-screen shaft.
const FLY_SPEED = 130;
const FLY_FAST = 420;

/** DEV: free flight. Moves the body directly and keeps the physics state
 *  coherent (grounded, still, no rope) so that switching noclip back off
 *  mid-air drops you cleanly instead of resuming a stale velocity.
 *  Vertically it is clamped to the room; horizontally it is NOT, because
 *  flying out of the side is exactly how you fast-travel to the next one. */
function devFly(s: GameSession, dt: number): void {
  const p = s.player;
  const speed = isDown('dash') ? FLY_FAST : FLY_SPEED;
  const dx = (isDown('right') ? 1 : 0) - (isDown('left') ? 1 : 0);
  const dy = (isDown('down') ? 1 : 0) - (isDown('up') ? 1 : 0);
  // Normalised, so a diagonal isn't 1.41x faster than a straight line.
  const len = Math.hypot(dx, dy) || 1;
  p.x += (dx / len) * speed * dt;
  p.y += (dy / len) * speed * dt;
  p.y = Math.max(-TILE, Math.min(p.y, s.world.current.level.heightPx - p.h));
  if (dx !== 0) p.facing = dx > 0 ? 1 : -1;
  p.vx = 0;
  p.vy = 0;
  p.onGround = true; // stops the fall/land animation flickering while flying
}

export class GameplayScene implements Scene {
  readonly ui: UiState = { state: 'playing', paused: false };

  constructor(
    private session: GameSession,
    private scenes: SceneManager,
  ) {}

  update(dt: number): void {
    const s = this.session;

    // Quick restart during the run (R key): fresh world, play on.
    if (justPressed('restart')) {
      s.reset();
      return;
    }

    // Pause (Esc/P): a scene is pushed on top; this one stays frozen
    // AS IT IS —including a death in progress— until it is popped.
    if (justPressed('pause')) {
      this.scenes.push(new PauseScene(s, this.scenes));
      return;
    }

    // Hit-stop: after a lethal hit, the whole world freezes for an
    // instant. When it releases, the respawn and the shake arrive.
    if (s.freezeTimer > 0) {
      s.freezeTimer -= dt;
      if (s.freezeTimer <= 0 && s.deadFrozen) {
        s.deadFrozen = false;
        if (s.pendingReset) {
          s.pendingReset = false;
          s.endRun(false); // no hearts left: to the game over screen
          this.scenes.replace(new GameOverScene(s, this.scenes));
        } else {
          s.respawnPlayer(); // fell into a pit but still has hearts
          s.camera.shake(3, 0.35);
        }
      }
      return;
    }

    // Micro-pause on stomp impact: frozen for an instant, then on.
    if (s.hitStop > 0) {
      s.hitStop -= dt;
      return;
    }

    s.tick(dt);
    s.runTime += dt; // the timer only runs while actually playing
    s.announceTimer = Math.max(0, s.announceTimer - dt);
    s.particles.update(dt);
    s.popups.update(dt);

    // Devices go BEFORE the player (the platform carries its
    // passenger) and their contacts AFTER (landing, hitting a spring).
    carryAndAdvanceDevices(s, dt);
    // DEV noclip: the free-fly REPLACES the physics step rather than
    // patching it, so gravity, walls, water, the rope and the shrink
    // roof simply never run — no combination of them can fight it.
    if (import.meta.env.DEV && debug.noclip) devFly(s, dt);
    else s.player.update(dt);

    // Did it cross a border into another room?
    handleRoomTransition(s);

    resolveDeviceContacts(s, dt);

    const room = s.world.current;
    for (const e of room.enemies) {
      if (!e.dead) e.update(dt, s.player);
    }

    collectPickups(s);
    resolveEnemyContacts(s, dt);
    // Reading is the one thing you do by NOT doing anything, so it goes
    // after the contacts: a step that ended in a hit is not a step you
    // spent standing still.
    readNearbyLore(s);

    const god = import.meta.env.DEV && debug.god;

    // Stepping on spikes -> lose a heart and respawn on safe ground.
    // God mode walks over them: teleporting off a spike bed every frame
    // would be far more disruptive than the damage it is sparing you.
    if (!god && room.level.touchesSpike(s.player.box())) {
      s.loseLifeAndRespawn();
    }

    // Falling out of the world -> lose a heart and respawn. God mode
    // still gets pulled back (for free): the void is not survivable, it
    // is just empty, so "invulnerable" there would mean falling forever.
    if (s.player.y > room.level.heightPx + 24) {
      if (god) s.rescue();
      else s.loseLifeAndRespawn();
    }

    // Remember the last SAFE footing (where those deaths send you back):
    // only after a beat of stability, full-size, on real grid rock — a
    // crumbling board, a slab or a plank is never "the ground", and this
    // runs AFTER the death checks so a lethal spot is never recorded.
    // (Never while noclipping: the fly step reports onGround so the sprite
    // doesn't flail, so a body sunk INSIDE rock would happily be recorded
    // as proven footing — and become the respawn point once god goes off.)
    if (import.meta.env.DEV && debug.noclip) {
      s.safeTimer = 0;
    } else if (!s.deadFrozen && s.player.onGround && !s.player.shrunk && standsOnRock(s)) {
      s.safeTimer += dt;
      if (s.safeTimer >= SAFE_AFTER) s.rememberSafeSpot();
    } else {
      s.safeTimer = 0;
    }

    // Reaching the door with all crystals and no bosses alive -> win.
    // The LAST level's door is the end of the world, not another
    // level card: it gets the ending instead.
    const door = room.doorBox;
    if (door && s.doorOpen && overlaps(s.player.box(), door)) {
      s.endRun(true);
      const finale = s.level.id === FINAL_LEVEL_ID;
      this.scenes.replace(
        finale ? new EndingScene(s, this.scenes) : new WonScene(s, this.scenes),
      );
      sfx.win();
      return;
    }

    s.camera.update(dt);
    s.camera.follow(
      s.player.x + s.player.w / 2,
      s.player.y + s.player.h / 2,
    );
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawWorld(ctx, this.session);
    drawHud(ctx, this.session, true);
    drawProgress(ctx, this.session);
    drawLorePlate(ctx, this.session);
  }
}
