// ============================================================
//  COMBATE — las reglas de contacto jugador <-> enemigos
// ------------------------------------------------------------
//  Pisar desde arriba derrota; de costado o desde abajo, daña.
//  También dañan los proyectiles (hazards) de los enemigos.
//  isStomp() es la decisión pura (testeable); el resto aplica las
//  consecuencias sobre la sesión (puntos, sacudida, hit-stop...).
// ============================================================

import type { Box } from '../../engine/canvas';
import { overlaps } from '../../engine/canvas';
import type { Enemy } from '../actors/enemies/Enemy';
import type { GameSession } from '../session';
import { sfx } from '../sfx';
import { t } from '../i18n';

/**
 * ¿El contacto cuenta como pisotón? Lo es si el jugador viene cayendo
 * y sus pies estaban por ENCIMA del enemigo el frame anterior (robusto
 * para enemigos altos y que cabecean, como el jefe). Si no, es golpe.
 * El AZOTÓN (pounding) rompe la regla a favor del jugador: pisa incluso
 * a los enemigos con púas (stompable=false) — es SU respuesta al erizo.
 */
export function isStomp(
  stompable: boolean,
  playerVy: number,
  feetY: number,
  dt: number,
  enemyTop: number,
  pounding = false,
): boolean {
  const prevFeetY = feetY - playerVy * dt;
  return (stompable || pounding) && playerVy > 0 && prevFeetY <= enemyTop + 4;
}

/**
 * Resuelve los contactos del jugador con los enemigos de la sala
 * actual (cuerpo y proyectiles). A lo sumo un contacto por paso,
 * como máximo daño posible: un corazón por frame.
 */
export function resolveEnemyContacts(session: GameSession, dt: number): void {
  const player = session.player;
  const pbox = player.box();

  for (const e of session.world.current.enemies) {
    if (e.dead) continue;
    const eb = e.box();
    if (overlaps(pbox, eb)) {
      const feetY = pbox.y + pbox.h;
      if (isStomp(e.stompable, player.vy, feetY, dt, eb.y, player.pounding)) {
        stompEnemy(session, e, eb);
      } else {
        hurtPlayer(session, eb.x + eb.w / 2);
      }
      break;
    }
    // Proyectiles del enemigo (si dispara)
    if (e.hazards) {
      let hit = false;
      for (const hz of e.hazards()) {
        if (overlaps(pbox, hz)) {
          hurtPlayer(session, hz.x + hz.w / 2);
          hit = true;
          break;
        }
      }
      if (hit) break;
    }
  }
}

/** Pisar un enemigo: rebota al jugador y clava una micro-pausa de
 *  impacto. Los enemigos con onStomp (el jefe) deciden si el golpe
 *  los derrota; el resto muere de un pisotón. */
function stompEnemy(session: GameSession, e: Enemy, eb: Box): void {
  const defeated = e.onStomp ? e.onStomp() : ((e.dead = true), true);
  session.player.bounce();
  session.hitStop = 0.06;
  sfx.stomp();
  if (defeated) {
    const count = e.isBoss ? 30 : 12;
    session.particles.burst(eb.x + eb.w / 2, eb.y + eb.h / 2, count, [...e.gooColors]);
    session.camera.shake(e.isBoss ? 4 : 1.5, e.isBoss ? 0.4 : 0.15);
    // Puntos por monstruo eliminado, con "+N" flotante.
    const pts = e.isBoss ? 100 : 10;
    session.score += pts;
    session.popups.spawn(eb.x + eb.w / 2, eb.y - 2, '+' + pts);
    if (e.isBoss) {
      session.announce(t('boss_defeated'));
      sfx.relic();
    }
  } else {
    // Golpe que no derrota (jefe con vida restante): chispas y sacudida chica.
    session.particles.burst(eb.x + eb.w / 2, eb.y, 8, [...e.gooColors]);
    session.camera.shake(1.5, 0.15);
  }
}

/** Recibir daño de un enemigo: quita un corazón, empuja y da unos
 *  frames de invulnerabilidad. NO congela el mundo: seguís jugando.
 *  Si te deja sin corazones, dispara el game over. */
export function hurtPlayer(session: GameSession, fromX: number): void {
  if (session.deadFrozen) return;
  const player = session.player;
  if (!player.hurt(fromX)) return; // invulnerable: no pasa nada
  session.camera.shake(2.5, 0.25);
  session.particles.burst(
    player.x + player.w / 2,
    player.y + player.h / 2,
    10,
    ['#ff5a7a', '#ffd0dc', '#ff9a5a'],
  );
  sfx.hurt();
  if (player.health <= 0) session.gameOver();
}
