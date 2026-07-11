// ============================================================
//  PANTALLAS — los overlays de cada escena
// ------------------------------------------------------------
//  Título, pausa, victoria y game over: cada una oscurece el mundo
//  (que sigue dibujándose detrás) y escribe encima. Son funciones
//  puras de dibujo: el flujo entre pantallas vive en scenes/.
// ============================================================

import { frameAt } from '../../engine/animation';
import { inputDevice } from '../../engine/input';
import type { GameSession } from '../session';
import { sprites } from '../art/sprites';
import { drawGlow } from '../art/glow';
import { t } from '../i18n';
import { font, formatTime } from './text';

/** Menú de inicio: el título del juego sobre el mundo, con un cristal
 *  que flota y un aviso pulsante para empezar. */
export function drawTitleOverlay(ctx: CanvasRenderingContext2D, session: GameSession): void {
  const { viewW, viewH, time, save } = session;
  ctx.fillStyle = 'rgba(17,9,26,0.72)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;

  // Un cristal grande flotando sobre el título, con su halo.
  const bob = Math.sin(time * 2) * 2;
  const frames = [sprites.crystal, sprites.crystal2, sprites.crystal3, sprites.crystal4];
  const spr = frameAt(frames, 6, time);
  const cy = viewH / 2 - 44 + bob;
  drawGlow(ctx, cx, cy, 20, '#ffe25a', 0.5 + Math.sin(time * 4) * 0.15);
  // Cristal al doble de tamaño, centrado en (cx, cy).
  spr.drawStretched(ctx, cx, cy + spr.h, 2, 2);

  ctx.textAlign = 'center';
  // Título en dos líneas para que entre bien en 320px.
  ctx.fillStyle = '#e9d6ff';
  ctx.font = font(18);
  ctx.fillText(t('title_line1'), cx, viewH / 2 - 8);
  ctx.fillStyle = '#b98bff';
  ctx.font = font(11);
  ctx.fillText(t('title_line2'), cx, viewH / 2 + 8);

  // Récords guardados (solo si ya jugaste alguna vez).
  ctx.font = font(8);
  if (save.bestScore > 0 || save.victories > 0) {
    ctx.fillStyle = '#ffd36e';
    ctx.fillText(t('best_score', { n: save.bestScore }), cx, viewH / 2 + 20);
    if (save.bestTime > 0) {
      ctx.fillStyle = '#7ce0ff';
      ctx.fillText(t('best_time', { t: formatTime(save.bestTime) }), cx, viewH / 2 + 30);
    }
    if (save.victories > 0) {
      ctx.fillStyle = '#5ce06a';
      const completed =
        save.victories === 1
          ? t('completed_once')
          : t('completed_many', { n: save.victories });
      ctx.fillText(completed, cx, viewH / 2 + 40);
    }
  }

  // Aviso pulsante para empezar (parpadeo suave con seno). Los textos
  // se adaptan al último dispositivo usado (teclado, gamepad o táctil).
  const dev = inputDevice();
  const gp = dev === 'gamepad';
  const touch = dev === 'touch';
  const blink = 0.55 + Math.sin(time * 4) * 0.45;
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#ffe25a';
  ctx.fillText(
    touch ? t('start_touch') : gp ? t('start_gp') : t('start_kb'),
    cx,
    viewH / 2 + 54,
  );
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#6f5a94';
  ctx.fillText(
    touch ? t('hint_touch') : gp ? t('hint_gp') : t('hint_kb'),
    cx,
    viewH - 12,
  );
  ctx.textAlign = 'left';
}

/** Overlay de pausa: la partida queda congelada detrás. Texto a opacidad
 *  plena (el tiempo no avanza en pausa, así que un parpadeo quedaría
 *  clavado). Recuerda cómo seguir, reiniciar o volver al menú. */
export function drawPauseOverlay(ctx: CanvasRenderingContext2D, session: GameSession): void {
  const { viewW, viewH } = session;
  ctx.fillStyle = 'rgba(17,9,26,0.68)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e9d6ff';
  ctx.font = font(18);
  ctx.fillText(t('pause_title'), cx, viewH / 2 - 10);
  const dev = inputDevice();
  const gp = dev === 'gamepad';
  const touch = dev === 'touch';
  ctx.fillStyle = '#9b86c4';
  ctx.font = font(8);
  ctx.fillText(
    touch ? t('pause_resume_touch') : gp ? t('pause_resume_gp') : t('pause_resume_kb'),
    cx,
    viewH / 2 + 8,
  );
  if (!touch) {
    ctx.fillStyle = '#6f5a94';
    ctx.fillText(gp ? t('pause_restart_gp') : t('pause_restart_kb'), cx, viewH / 2 + 20);
  }
  ctx.textAlign = 'left';
}

/** Pantalla de victoria: puntaje, tiempo y récords sobre el mundo ganado. */
export function drawWinOverlay(ctx: CanvasRenderingContext2D, session: GameSession): void {
  const { viewW, viewH, time, save } = session;
  ctx.fillStyle = 'rgba(17,9,26,0.78)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd36e';
  ctx.font = font(16);
  ctx.fillText(t('win_title'), cx, viewH / 2 - 30);
  ctx.font = font(8);
  ctx.fillStyle = '#ffe25a';
  ctx.fillText(t('win_points', { n: session.score }), cx, viewH / 2 - 14);
  ctx.fillStyle = '#7ce0ff';
  ctx.fillText(t('win_time', { t: formatTime(session.runTime) }), cx, viewH / 2 - 3);
  // Récord de tiempo (la métrica de speedrun): si lo batiste, celebración
  // pulsante; si no, tu mejor marca para comparar.
  if (session.newBestTime) {
    ctx.save();
    ctx.globalAlpha = 0.6 + Math.sin(time * 8) * 0.4;
    ctx.fillStyle = '#ffe25a';
    ctx.fillText(t('win_new_best_time'), cx, viewH / 2 + 9);
    ctx.restore();
  } else {
    ctx.fillStyle = '#ffd36e';
    ctx.fillText(t('best_time', { t: formatTime(save.bestTime) }), cx, viewH / 2 + 9);
  }
  ctx.fillStyle = '#9b86c4';
  ctx.fillText(backToMenuText(), cx, viewH / 2 + 22);
  ctx.textAlign = 'left';
}

/** Pantalla de game over: el mundo congelado tras la muerte, oscurecido,
 *  con el puntaje logrado y el aviso para reintentar. */
export function drawGameOverOverlay(ctx: CanvasRenderingContext2D, session: GameSession): void {
  const { viewW, viewH, time } = session;
  ctx.fillStyle = 'rgba(26,6,10,0.8)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5a7a';
  ctx.font = font(18);
  ctx.fillText(t('gameover_title'), cx, viewH / 2 - 20);
  ctx.fillStyle = '#ffd0dc';
  ctx.font = font(8);
  ctx.fillText(t('win_points', { n: session.score }), cx, viewH / 2 - 4);
  drawRecordLine(ctx, session, cx, viewH / 2 + 8);
  const blink = 0.55 + Math.sin(time * 4) * 0.45;
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#9b86c4';
  ctx.fillText(backToMenuText(), cx, viewH / 2 + 22);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

/** El texto para volver al menú, según teclado, gamepad o táctil. */
function backToMenuText(): string {
  const dev = inputDevice();
  if (dev === 'touch') return t('back_touch');
  return dev === 'gamepad' ? t('back_gp') : t('back_kb');
}

/** Línea de récord bajo el puntaje: si batiste tu marca, un "¡NUEVO
 *  RÉCORD!" pulsante; si no, tu mejor puntaje para comparar. */
function drawRecordLine(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  cx: number,
  y: number,
): void {
  ctx.font = font(8);
  if (session.newRecord) {
    ctx.save();
    ctx.globalAlpha = 0.6 + Math.sin(session.time * 8) * 0.4;
    ctx.fillStyle = '#ffe25a';
    ctx.fillText(t('new_record'), cx, y);
    ctx.restore();
  } else {
    ctx.fillStyle = '#ffd36e';
    ctx.fillText(t('best_score_short', { n: session.save.bestScore }), cx, y);
  }
}
