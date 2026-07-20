// ============================================================
//  COMBAT — the player <-> enemy contact rules
// ------------------------------------------------------------
//  Stomping from above defeats; from the side or below, it hurts.
//  Enemy projectiles (hazards) also hurt.
//  isStomp() is the pure decision (testable); the rest applies the
//  consequences to the session (points, shake, hit-stop...).
// ============================================================

import type { Box } from '../../engine/canvas';
import { overlaps } from '../../engine/canvas';
import type { Enemy } from '../actors/enemies/Enemy';
import type { GameSession } from '../session';
import { sfx } from '../sfx';
import { t } from '../i18n';

/**
 * Does the contact count as a stomp? It does if the player is falling
 * and their feet were ABOVE the enemy on the previous frame (robust
 * for tall, bobbing enemies like the boss). Otherwise, it's a hit.
 * The POUND (pounding) breaks the rule in the player's favor: it stomps
 * even spiky enemies (stompable=false) — it's THE answer to the erizo.
 * An `invulnerable` enemy (the jellyfish) short-circuits both: neither a
 * stomp nor a pound ever kills it, so the contact falls through to a hit.
 */
export function isStomp(
  stompable: boolean,
  playerVy: number,
  feetY: number,
  dt: number,
  enemyTop: number,
  pounding = false,
  invulnerable = false,
): boolean {
  if (invulnerable) return false;
  const prevFeetY = feetY - playerVy * dt;
  return (stompable || pounding) && playerVy > 0 && prevFeetY <= enemyTop + 4;
}

/**
 * The dash-lunge is a weapon: a DASHING player that touches an enemy
 * flagged `dashVulnerable` (only the stunned eel) defeats it. Falling
 * from above isn't required — this is the horizontal answer, distinct
 * from the stomp. Pure and tested so a physics tweak can't quietly break
 * the level's combat lesson.
 */
export function isDashKill(dashVulnerable: boolean, dashing: boolean): boolean {
  return dashVulnerable && dashing;
}

/**
 * The arc is a weapon too: a SWINGING player who crosses an enemy's
 * `swingSpot` trips it (the Matriarch's thread). Pure and tested, like
 * the other two decisions, so a physics tweak can't quietly break the
 * only way to reach a boss that hangs out of everyone's reach.
 */
export function isSwingCut(hasSpot: boolean, swinging: boolean): boolean {
  return hasSpot && swinging;
}

/**
 * Resolves the player's contacts with the current room's enemies
 * (body and projectiles). At most one contact per step, so the most
 * damage possible is one heart per frame.
 */
export function resolveEnemyContacts(session: GameSession, dt: number): void {
  const player = session.player;
  const pbox = player.box();

  for (const e of session.world.current.enemies) {
    if (e.dead) continue;

    // The swing cut goes FIRST: a thread hangs across the arc's path,
    // and reaching it must never be read as bumping into the body.
    const spot = e.swingSpot?.() ?? null;
    if (isSwingCut(spot !== null, player.swinging) && overlaps(pbox, spot!)) {
      if (e.onSwingCut?.()) {
        session.particles.burst(spot!.x + spot!.w / 2, pbox.y, 14, ['#e8e0f0', '#c9bcd8', '#fdfbff']);
        session.camera.shake(3, 0.3);
        session.hitStop = 0.06;
      }
      continue;
    }

    const eb = e.box();
    if (overlaps(pbox, eb)) {
      const feetY = pbox.y + pbox.h;
      if (isStomp(e.stompable, player.vy, feetY, dt, eb.y, player.pounding, e.invulnerable)) {
        stompEnemy(session, e, eb);
      } else if (isDashKill(e.dashVulnerable ?? false, player.dashing)) {
        dashKillEnemy(session, e, eb);
      } else {
        hurtPlayer(session, eb.x + eb.w / 2);
      }
      break;
    }
    // Enemy projectiles (if it shoots)
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

/** Stomp an enemy: bounces the player and adds a micro-pause on
 *  impact. Enemies with onStomp (the boss) decide whether the hit
 *  defeats them; the rest die from a single stomp. */
function stompEnemy(session: GameSession, e: Enemy, eb: Box): void {
  const defeated = e.onStomp ? e.onStomp() : ((e.dead = true), true);
  session.player.bounce();
  session.hitStop = 0.06;
  sfx.stomp();
  if (defeated) defeatEnemy(session, e, eb);
  else grazeEnemy(session, e, eb);
}

/** The dash-lunge kill (the stunned eel): the same payoff and hit-stop
 *  as a stomp, but NO upward bounce — the lunge is a horizontal strike. */
function dashKillEnemy(session: GameSession, e: Enemy, eb: Box): void {
  const defeated = e.onStomp ? e.onStomp() : ((e.dead = true), true);
  session.hitStop = 0.06;
  sfx.stomp();
  if (defeated) defeatEnemy(session, e, eb);
  else grazeEnemy(session, e, eb);
}

/** The payoff when a hit DEFEATS an enemy: burst, shake, points with a
 *  floating "+N", a HEART back if you were missing one — fighting is
 *  how you heal, so a hurt run can be nursed back by playing well —
 *  and, for a boss, the fanfare. Shared by the stomp and the
 *  dash-lunge so both kills feel identical. */
function defeatEnemy(session: GameSession, e: Enemy, eb: Box): void {
  const count = e.isBoss ? 30 : 12;
  session.particles.burst(eb.x + eb.w / 2, eb.y + eb.h / 2, count, [...e.gooColors]);
  session.camera.shake(e.isBoss ? 4 : 1.5, e.isBoss ? 0.4 : 0.15);
  const pts = e.isBoss ? 100 : 10;
  session.score += pts;
  session.popups.spawn(eb.x + eb.w / 2, eb.y - 2, '+' + pts);
  // At full hearts nothing happens (no popup, no sound): the reward
  // only reads as a reward when it's actually giving something back.
  if (session.player.heal()) {
    session.particles.burst(
      session.player.x + session.player.w / 2,
      session.player.y + session.player.h / 2,
      8,
      ['#ff5a7a', '#ffd0dc', '#fff3c0'],
    );
    session.popups.spawn(
      session.player.x + session.player.w / 2,
      session.player.y - 4,
      t('heal_popup'),
    );
    sfx.heal();
  }
  if (e.isBoss) {
    session.announce(t('boss_defeated'));
    sfx.relic();
  }
}

/** A hit that lands but does NOT defeat (a boss with health left):
 *  sparks and a small shake. */
function grazeEnemy(session: GameSession, e: Enemy, eb: Box): void {
  session.particles.burst(eb.x + eb.w / 2, eb.y, 8, [...e.gooColors]);
  session.camera.shake(1.5, 0.15);
}

/** Take damage from an enemy: removes a heart, knocks back and grants
 *  a few frames of invulnerability. Does NOT freeze the world: you keep
 *  playing. If it leaves you with no hearts, it triggers the game over. */
export function hurtPlayer(session: GameSession, fromX: number): void {
  if (session.deadFrozen) return;
  const player = session.player;
  if (!player.hurt(fromX)) return; // invulnerable: nothing happens
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
