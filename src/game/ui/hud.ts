// ============================================================
//  HUD — hearts, counters, timer and notices
// ------------------------------------------------------------
//  Drawn while playing and on the end screens (behind the
//  overlay). `inGame` marks the live run: only there do the
//  "what's left" hints show (boss / open door).
// ============================================================

import type { GameSession } from '../session';
import { sprites } from '../art/sprites';
import { levelRecord } from '../save';
import { t } from '../i18n';
import { font, formatTime } from './text';

export function drawHud(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  inGame: boolean,
): void {
  // Health hearts (top left)
  const player = session.player;
  for (let i = 0; i < player.maxHealth; i++) {
    const heart = i < player.health ? sprites.heartFull : sprites.heartEmpty;
    heart.draw(ctx, 6 + i * 8, 6);
  }
  // Crystal and points counter, below the hearts
  ctx.font = font(8);
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffe25a';
  ctx.fillText(`${t('hud_crystals')} ${session.collected}/${session.totalCrystals}`, 6, 15);
  ctx.fillStyle = '#9b86c4';
  ctx.fillText(`${t('hud_points')} ${session.score}`, 6, 24);
  // Run timer, top center (speedrun style). In time trial it's
  // THE star: big, golden and with the mark to beat below.
  ctx.textAlign = 'center';
  if (session.mode === 'trial') {
    ctx.fillStyle = '#ffe25a';
    ctx.font = font(11);
    ctx.fillText(formatTime(session.runTime), session.viewW / 2, 5);
    ctx.font = font(7);
    ctx.fillStyle = '#9b86c4';
    const best = levelRecord(session.save, session.level.id).bestTrialTime;
    const line = best > 0 ? t('trial_best', { t: formatTime(best) }) : t('hud_trial');
    ctx.fillText(line, session.viewW / 2, 18);
    ctx.font = font(8);
  } else {
    ctx.fillStyle = '#c7b8e6';
    ctx.fillText(formatTime(session.runTime), session.viewW / 2, 6);
  }
  ctx.textAlign = 'left';
  if (session.collected === session.totalCrystals && inGame) {
    if (session.bossAlive) {
      ctx.fillStyle = '#ff5a7a';
      ctx.fillText(t('hud_stomp_boss'), 6, 33);
    } else {
      ctx.fillStyle = '#b98bff';
      ctx.fillText(t('hud_door_open'), 6, 33);
    }
  }
  // Big notice when gaining an ability (fades out at the end)
  if (session.announceTimer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, session.announceTimer * 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7ce0ff';
    ctx.font = font(12);
    ctx.fillText(session.announceText, session.viewW / 2, 34);
    ctx.restore();
    ctx.textAlign = 'left';
  }
  // Restore the default baseline: the HUD uses 'top' but the
  // overlays and the overworld draw with the normal baseline; if
  // it lingers, all their text shows shifted 8px downward.
  ctx.textBaseline = 'alphabetic';
}
