// ============================================================
//  PANTALLAS — los overlays de cada escena
// ------------------------------------------------------------
//  Título, pausa, victoria y game over: cada una oscurece el mundo
//  (que sigue dibujándose detrás) y escribe encima. Son funciones
//  puras de dibujo: el flujo entre pantallas vive en scenes/.
// ============================================================

import { frameAt } from '../../engine/animation';
import { inputDevice, padLabels } from '../../engine/input';
import type { GameSession } from '../session';
import { LEVELS } from '../world/rooms';
import { levelRecord } from '../save';
import { sprites } from '../art/sprites';
import { playerSprites } from '../art/playerSkins';
import { currentSkin } from '../skins';
import { currentAccessory } from '../accessories';
import { drawGlow } from '../art/glow';
import { t, type StrKey } from '../i18n';
import { font, formatTime } from './text';
import { OW_NODES } from './overworld';

/** Los ítems que pueden aparecer en los menús del juego; cada escena
 *  arma su lista y este módulo solo los rotula y los pinta. */
export type MenuItem =
  | 'play'
  | 'resume'
  | 'restart'
  | 'character'
  | 'fullscreen'
  | 'language'
  | 'exit';

const MENU_LABEL: Record<MenuItem, StrKey> = {
  play: 'menu_play',
  resume: 'menu_resume',
  restart: 'menu_restart',
  character: 'menu_character',
  fullscreen: 'menu_fullscreen',
  language: 'menu_language',
  exit: 'menu_exit',
};


/** Lista de menú vertical: el ítem elegido brilla en dorado con sus
 *  flechitas; el resto queda en violeta apagado. */
function drawMenuList(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  items: readonly MenuItem[],
  selected: number,
  startY: number,
  gap = 14,
): void {
  const cx = session.viewW / 2;
  ctx.textAlign = 'center';
  items.forEach((item, i) => {
    const active = i === selected;
    const y = startY + i * gap;
    ctx.font = font(active ? 10 : 9);
    ctx.fillStyle = active ? '#ffe25a' : '#8a76b4';
    const label = t(MENU_LABEL[item]);
    ctx.fillText(label, cx, y);
    if (active) {
      // Flechitas que respiran a los costados del ítem elegido.
      const w = ctx.measureText(label).width;
      const sway = Math.sin(session.time * 5) * 1.5;
      ctx.fillText('▸', cx - w / 2 - 8 - sway, y);
      ctx.fillText('◂', cx + w / 2 + 8 + sway, y);
    }
  });
}

/** La línea de "cómo se navega el menú", según teclado o gamepad. */
function drawMenuNavHint(ctx: CanvasRenderingContext2D, session: GameSession, y: number): void {
  const gp = inputDevice() === 'gamepad';
  ctx.textAlign = 'center';
  ctx.font = font(7);
  ctx.fillStyle = '#6f5a94';
  ctx.fillText(gp ? t('nav_gp', padLabels()) : t('nav_kb'), session.viewW / 2, y);
}

/** Menú de inicio: el título del juego sobre el mundo, con un cristal
 *  que flota y el menú (jugar / pantalla completa / idioma). En táctil
 *  no hay menú navegable: un tap arranca y el idioma va por su botón. */
export function drawTitleOverlay(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  items: readonly MenuItem[],
  selected: number,
): void {
  const { viewW, viewH, time, save } = session;
  ctx.fillStyle = 'rgba(17,9,26,0.72)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;

  // Un cristal grande flotando sobre el título, con su halo.
  const bob = Math.sin(time * 2) * 2;
  const frames = [sprites.crystal, sprites.crystal2, sprites.crystal3, sprites.crystal4];
  const spr = frameAt(frames, 6, time);
  const cy = viewH / 2 - 52 + bob;
  drawGlow(ctx, cx, cy, 20, '#ffe25a', 0.5 + Math.sin(time * 4) * 0.15);
  // Cristal al doble de tamaño, centrado en (cx, cy).
  spr.drawStretched(ctx, cx, cy + spr.h, 2, 2);

  // El personaje (con su skin) admirando el cristal: la vista previa
  // viva de la personalización — cambiar de skin se ve al instante.
  const skin = playerSprites();
  const hero = time % 3.3 < 0.15 ? skin.blink : frameAt([skin.idle, skin.idle2], 1.6, time);
  const heroFeet = viewH / 2 - 52 + spr.h; // el piso del cristal, sin flotar
  drawGlow(ctx, cx - 34, heroFeet - 16, 14, currentSkin().glow, 0.3);
  hero.drawStretched(ctx, cx - 34, heroFeet, 2, 2);

  ctx.textAlign = 'center';
  // Título en dos líneas para que entre bien en 320px.
  ctx.fillStyle = '#e9d6ff';
  ctx.font = font(18);
  ctx.fillText(t('title_line1'), cx, viewH / 2 - 16);
  ctx.fillStyle = '#b98bff';
  ctx.font = font(11);
  ctx.fillText(t('title_line2'), cx, viewH / 2);

  // Progreso guardado (solo si ya completaste algún nivel).
  ctx.font = font(8);
  const completed = LEVELS.filter((l) => levelRecord(save, l.id).completions > 0).length;
  if (completed > 0) {
    ctx.fillStyle = '#5ce06a';
    ctx.fillText(t('title_progress', { n: completed, m: OW_NODES.length }), cx, viewH / 2 + 14);
  }

  const touch = inputDevice() === 'touch';
  if (touch) {
    // En táctil: aviso pulsante para empezar (el canvas entero es el botón).
    const blink = 0.55 + Math.sin(time * 4) * 0.45;
    ctx.globalAlpha = blink;
    ctx.fillStyle = '#ffe25a';
    ctx.fillText(t('start_touch'), cx, viewH / 2 + 40);
    ctx.globalAlpha = 1;
  } else {
    // Con 4+ ítems el menú sube y se compacta para no pisar los avisos.
    const four = items.length > 3;
    drawMenuList(ctx, session, items, selected, viewH / 2 + (four ? 26 : 32), four ? 12 : 14);
    drawMenuNavHint(ctx, session, viewH - 8);
  }

  // El recordatorio de controles del juego, chico y abajo.
  const gp = inputDevice() === 'gamepad';
  ctx.font = font(7);
  ctx.fillStyle = '#57457a';
  ctx.fillText(
    touch ? t('hint_touch') : gp ? t('hint_gp', padLabels()) : t('hint_kb'),
    cx,
    viewH - 18,
  );
  ctx.textAlign = 'left';
}

/** Menú de pausa: la partida queda congelada detrás. En táctil el menú
 *  es de botones DOM (touch.ts); acá solo el velo y el título. */
export function drawPauseOverlay(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  items: readonly MenuItem[],
  selected: number,
): void {
  const { viewW, viewH } = session;
  ctx.fillStyle = 'rgba(17,9,26,0.68)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e9d6ff';
  ctx.font = font(18);
  ctx.fillText(t('pause_title'), cx, viewH / 2 - 42);
  if (inputDevice() === 'touch') {
    ctx.fillStyle = '#9b86c4';
    ctx.font = font(8);
    ctx.fillText(t('pause_resume_touch'), cx, viewH / 2 - 24);
  } else {
    drawMenuList(ctx, session, items, selected, viewH / 2 - 22);
    drawMenuNavHint(ctx, session, viewH - 10);
  }
  ctx.textAlign = 'left';
}

/** Pantalla de victoria: el nivel completado, con puntaje y tiempo en
 *  modo normal o el veredicto del cronómetro en contrarreloj. */
export function drawWinOverlay(ctx: CanvasRenderingContext2D, session: GameSession): void {
  const { viewW, viewH, time, save, runFlags } = session;
  const rec = levelRecord(save, session.level.id);
  ctx.fillStyle = 'rgba(17,9,26,0.78)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd36e';
  ctx.font = font(16);
  ctx.fillText(t('win_title'), cx, viewH / 2 - 36);
  ctx.font = font(8);
  ctx.fillStyle = '#b98bff';
  ctx.fillText(t(session.level.nameKey), cx, viewH / 2 - 24);

  if (session.mode === 'trial') {
    // Contrarreloj: el tiempo ES el resultado.
    ctx.fillStyle = '#7ce0ff';
    ctx.font = font(12);
    ctx.fillText(formatTime(session.runTime), cx, viewH / 2 - 6);
    ctx.font = font(8);
    if (runFlags.newBestTrial) {
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(time * 8) * 0.4;
      ctx.fillStyle = '#ffe25a';
      ctx.fillText(t('trial_new_best'), cx, viewH / 2 + 9);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffd36e';
      ctx.fillText(t('trial_best', { t: formatTime(rec.bestTrialTime) }), cx, viewH / 2 + 9);
    }
  } else {
    ctx.fillStyle = '#ffe25a';
    ctx.fillText(t('win_points', { n: session.score }), cx, viewH / 2 - 10);
    ctx.fillStyle = '#7ce0ff';
    ctx.fillText(t('win_time', { t: formatTime(session.runTime) }), cx, viewH / 2 + 1);
    // Récord de tiempo (la métrica de speedrun): si lo batiste,
    // celebración pulsante; si no, tu mejor marca para comparar.
    if (runFlags.newBestTime) {
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(time * 8) * 0.4;
      ctx.fillStyle = '#ffe25a';
      ctx.fillText(t('win_new_best_time'), cx, viewH / 2 + 13);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffd36e';
      ctx.fillText(t('best_time', { t: formatTime(rec.bestTime) }), cx, viewH / 2 + 13);
    }
  }

  ctx.fillStyle = '#9b86c4';
  ctx.font = font(8);
  ctx.fillText(backToMenuText(), cx, viewH / 2 + 28);
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

/** Las filas de la pantalla de personaje: cada una es un eje de
 *  personalización (o la salida); la escena navega, acá se pintan. */
export type CharacterRow = 'color' | 'accessory' | 'back';

/** Pantalla de personaje: el look elegido en grande (respirando, con
 *  su halo) y las filas COLOR / ACCESORIO / VOLVER. Los cambios se
 *  ven al instante en la vista previa: ESA es la gracia. */
export function drawCharacterOverlay(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  rows: readonly CharacterRow[],
  selected: number,
): void {
  const { viewW, viewH, time } = session;
  ctx.fillStyle = 'rgba(17,9,26,0.78)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;
  ctx.textAlign = 'center';

  ctx.fillStyle = '#e9d6ff';
  ctx.font = font(16);
  ctx.fillText(t('cust_title'), cx, 24);

  // La vista previa: el personaje al triple, vivo (respira y parpadea).
  const s = playerSprites();
  const spr = time % 3.3 < 0.15 ? s.blink : frameAt([s.idle, s.idle2], 1.6, time);
  drawGlow(ctx, cx, 78, 24, currentSkin().glow, 0.4 + Math.sin(time * 3) * 0.08);
  spr.drawStretched(ctx, cx, 98, 3, 3);

  const label: Record<CharacterRow, string> = {
    color: t('cust_color', { s: t(currentSkin().nameKey) }),
    accessory: t('cust_accessory', { s: t(currentAccessory().nameKey) }),
    back: t('cust_back'),
  };
  rows.forEach((row, i) => {
    const active = i === selected;
    const y = 120 + i * 14;
    ctx.font = font(active ? 10 : 9);
    ctx.fillStyle = active ? '#ffe25a' : '#8a76b4';
    ctx.fillText(label[row], cx, y);
    if (active) {
      const w = ctx.measureText(label[row]).width;
      const sway = Math.sin(time * 5) * 1.5;
      ctx.fillText('▸', cx - w / 2 - 8 - sway, y);
      ctx.fillText('◂', cx + w / 2 + 8 + sway, y);
    }
  });

  drawMenuNavHint(ctx, session, viewH - 8);
  ctx.textAlign = 'left';
}

/** El texto para volver al mapa, según teclado, gamepad o táctil. */
function backToMenuText(): string {
  const dev = inputDevice();
  if (dev === 'touch') return t('back_touch');
  return dev === 'gamepad' ? t('back_gp', padLabels()) : t('back_kb');
}

/** Línea de récord bajo el puntaje: si batiste tu marca del nivel, un
 *  "¡NUEVO RÉCORD!" pulsante; si no, tu mejor puntaje para comparar. */
function drawRecordLine(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  cx: number,
  y: number,
): void {
  ctx.font = font(8);
  if (session.runFlags.newBestScore) {
    ctx.save();
    ctx.globalAlpha = 0.6 + Math.sin(session.time * 8) * 0.4;
    ctx.fillStyle = '#ffe25a';
    ctx.fillText(t('new_record'), cx, y);
    ctx.restore();
  } else {
    const best = levelRecord(session.save, session.level.id).bestScore;
    ctx.fillStyle = '#ffd36e';
    ctx.fillText(t('best_score_short', { n: best }), cx, y);
  }
}
