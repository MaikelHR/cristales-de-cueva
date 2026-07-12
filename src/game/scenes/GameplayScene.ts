// ============================================================
//  SCENE: GAMEPLAY (the actual game)
// ------------------------------------------------------------
//  Orchestrates one game step by calling the systems in order:
//  player, room transitions, enemies, pickups, combat,
//  pits, victory and camera. Special states (hit-stop,
//  frozen death) cut the step short before that.
// ============================================================

import { justPressed } from '../../engine/input';
import type { GameSession } from '../session';
import { overlaps } from '../../engine/canvas';
import { handleRoomTransition } from '../systems/transitions';
import { collectPickups } from '../systems/pickups';
import { resolveEnemyContacts } from '../systems/combat';
import { carryAndAdvanceDevices, resolveDeviceContacts } from '../systems/devices';
import { drawWorld } from '../render/drawWorld';
import { drawHud } from '../ui/hud';
import { drawMinimap } from '../ui/minimap';
import { sfx } from '../sfx';
import type { Scene, SceneManager, UiState } from './Scene';
import { PauseScene } from './PauseScene';
import { WonScene } from './WonScene';
import { GameOverScene } from './GameOverScene';

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
    s.player.update(dt);

    // Did it cross a border into another room?
    handleRoomTransition(s);

    resolveDeviceContacts(s, dt);

    const room = s.world.current;
    for (const e of room.enemies) {
      if (!e.dead) e.update(dt, s.player);
    }

    collectPickups(s);
    resolveEnemyContacts(s, dt);

    // Stepping on spikes -> lose a heart and respawn at the checkpoint
    if (room.level.touchesSpike(s.player.box())) {
      s.loseLifeAndRespawn();
    }

    // Falling out of the world -> lose a heart and respawn
    if (s.player.y > room.level.heightPx + 24) {
      s.loseLifeAndRespawn();
    }

    // Reaching the door with all crystals and no bosses alive -> win
    const door = room.doorBox;
    if (door && s.doorOpen && overlaps(s.player.box(), door)) {
      s.endRun(true);
      this.scenes.replace(new WonScene(s, this.scenes));
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
    drawMinimap(ctx, this.session);
  }
}
