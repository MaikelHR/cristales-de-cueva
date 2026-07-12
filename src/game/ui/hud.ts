// ============================================================
//  HUD — corazones, contadores, cronómetro y avisos
// ------------------------------------------------------------
//  Se dibuja mientras se juega y en las pantallas de fin (detrás
//  del overlay). `inGame` distingue la partida viva: solo ahí se
//  muestran las pistas de "qué falta" (jefe / puerta abierta).
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
  // Corazones de vida (arriba a la izquierda)
  const player = session.player;
  for (let i = 0; i < player.maxHealth; i++) {
    const heart = i < player.health ? sprites.heartFull : sprites.heartEmpty;
    heart.draw(ctx, 6 + i * 8, 6);
  }
  // Contador de cristales y puntos, debajo de los corazones
  ctx.font = font(8);
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffe25a';
  ctx.fillText(`${t('hud_crystals')} ${session.collected}/${session.totalCrystals}`, 6, 15);
  ctx.fillStyle = '#9b86c4';
  ctx.fillText(`${t('hud_points')} ${session.score}`, 6, 24);
  // Cronómetro de la partida, arriba al centro (estilo speedrun).
  // En contrarreloj es EL protagonista: grande, dorado y con la
  // marca a batir debajo.
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
  // Aviso grande al ganar una habilidad (se desvanece al final)
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
  // Devolver la línea base por defecto: el HUD usa 'top' pero los
  // overlays y el overworld dibujan con la base normal; si queda
  // pegada, todos sus textos aparecen corridos 8px hacia abajo.
  ctx.textBaseline = 'alphabetic';
}
