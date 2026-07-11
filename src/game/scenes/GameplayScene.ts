// ============================================================
//  ESCENA: PARTIDA (el juego de verdad)
// ------------------------------------------------------------
//  Orquesta un paso de juego llamando a los sistemas en orden:
//  jugador, transiciones de sala, enemigos, recogibles, combate,
//  fosos, victoria y cámara. Los estados especiales (hit-stop,
//  muerte congelada) cortan el paso antes.
// ============================================================

import { justPressed } from '../../engine/input';
import type { GameSession } from '../session';
import { overlaps } from '../../engine/canvas';
import { handleRoomTransition } from '../systems/transitions';
import { collectPickups } from '../systems/pickups';
import { resolveEnemyContacts } from '../systems/combat';
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

    // Reinicio rápido durante la partida (tecla R): mundo nuevo, a jugar.
    if (justPressed('restart')) {
      s.reset();
      return;
    }

    // Pausa (Esc/P): se apila una escena encima; esta queda congelada
    // TAL CUAL está —incluida una muerte en curso— hasta que se despile.
    if (justPressed('pause')) {
      this.scenes.push(new PauseScene(s, this.scenes));
      return;
    }

    // Hit-stop: tras un golpe mortal, el mundo entero queda clavado
    // un instante. Al soltarse llegan el respawn y la sacudida.
    if (s.freezeTimer > 0) {
      s.freezeTimer -= dt;
      if (s.freezeTimer <= 0 && s.deadFrozen) {
        s.deadFrozen = false;
        if (s.pendingReset) {
          s.pendingReset = false;
          s.endRun(false); // sin corazones: a la pantalla de game over
          this.scenes.replace(new GameOverScene(s, this.scenes));
        } else {
          s.respawnPlayer(); // cayó a un foso pero le quedan corazones
          s.camera.shake(3, 0.35);
        }
      }
      return;
    }

    // Micro-pausa de impacto al pisar: un instante clavado y sigue.
    if (s.hitStop > 0) {
      s.hitStop -= dt;
      return;
    }

    s.tick(dt);
    s.runTime += dt; // el cronómetro solo corre mientras se juega de verdad
    s.announceTimer = Math.max(0, s.announceTimer - dt);
    s.particles.update(dt);
    s.popups.update(dt);

    s.player.update(dt);

    // ¿Cruzó un borde hacia otra sala?
    handleRoomTransition(s);

    const room = s.world.current;
    for (const e of room.enemies) {
      if (!e.dead) e.update(dt, s.player);
    }

    collectPickups(s);
    resolveEnemyContacts(s, dt);

    // Caer fuera del mundo -> perder un corazón y reaparecer
    if (s.player.y > room.level.heightPx + 24) {
      s.loseLifeAndRespawn();
    }

    // Llegar a la puerta con todos los cristales y sin jefes vivos -> ganar
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
