// ============================================================
//  DIBUJO DEL OVERWORLD (el mapa de niveles)
// ------------------------------------------------------------
//  Todo lo visible del selector: el sendero punteado, los nodos
//  (completado = cristal dorado, desbloqueado = latido, cerrado =
//  piedra con '?'), el personaje parado o caminando, el panel con
//  nombre y récords del nivel elegido y el elegidor de modo.
//  La lógica (qué se puede pisar, entrar, elegir) vive en la
//  escena; acá solo se pinta lo que ella decide.
// ============================================================

import { frameAt } from '../../engine/animation';
import { inputDevice, padLabels } from '../../engine/input';
import type { GameSession, GameMode } from '../session';
import { LEVELS } from '../world/rooms';
import { levelRecord } from '../save';
import { sprites } from '../art/sprites';
import { drawGlow } from '../art/glow';
import { drawBackground, drawFog, drawVignette } from '../art/atmosphere';
import { t } from '../i18n';
import { font, formatTime } from './text';

/** Los 10 nodos del mundo 1, serpenteando gruta arriba hacia la
 *  gran puerta. Solo los primeros LEVELS.length tienen nivel real. */
export const OW_NODES: ReadonlyArray<{ x: number; y: number }> = [
  { x: 30, y: 120 },
  { x: 66, y: 100 },
  { x: 100, y: 118 },
  { x: 134, y: 96 },
  { x: 168, y: 114 },
  { x: 200, y: 90 },
  { x: 232, y: 108 },
  { x: 262, y: 84 },
  { x: 284, y: 60 },
  { x: 300, y: 38 },
];

/** Lo que el dibujo necesita saber de la escena del overworld. */
export interface OverworldView {
  node: number;
  x: number;
  y: number;
  facing: 1 | -1;
  walking: boolean;
  walkTime: number;
  maxNode: number;
  choosing: boolean;
  choice: GameMode;
}

export function drawOverworld(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  view: OverworldView,
): void {
  const { viewW, viewH, time, save } = session;
  ctx.textBaseline = 'alphabetic'; // por si el HUD dejó otra puesta

  // La gruta de fondo, quieta (variante propia para que no sea
  // idéntica a ninguna sala) y con su niebla y viñeta de siempre.
  drawBackground(ctx, 0, 0, viewW, viewH, viewW, 7, time);

  // --- Sendero punteado entre nodos ---
  for (let i = 0; i < OW_NODES.length - 1; i++) {
    const a = OW_NODES[i];
    const b = OW_NODES[i + 1];
    const reachable = i + 1 <= view.maxNode;
    ctx.fillStyle = reachable ? '#8064b0' : '#3a2456';
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 7; d < dist - 4; d += 7) {
      const px = a.x + ((b.x - a.x) * d) / dist;
      const py = a.y + ((b.y - a.y) * d) / dist;
      ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2);
    }
  }

  // --- Nodos ---
  for (let i = 0; i < OW_NODES.length; i++) {
    drawNode(ctx, session, view, i);
  }

  // --- El personaje ---
  drawAvatar(ctx, view, time);

  // --- Título del mundo y progreso ---
  const cx = viewW / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e9d6ff';
  ctx.font = font(10);
  ctx.fillText(t('ow_title'), cx, 14);
  const completed = LEVELS.filter((l) => levelRecord(save, l.id).completions > 0).length;
  ctx.fillStyle = '#9b86c4';
  ctx.font = font(8);
  ctx.fillText(t('ow_progress', { n: completed, m: OW_NODES.length }), cx, 25);

  // Con el elegidor abierto, el panel no se dibuja: evita dos capas
  // de texto peleando en el fondo de la pantalla.
  if (view.choosing) drawModeChooser(ctx, session, view);
  else drawPanel(ctx, session, view);

  drawFog(ctx, 0, viewW, viewH, time);
  drawVignette(ctx, viewW, viewH);
  ctx.textAlign = 'left';
}

/** Un nodo del sendero, según su estado. */
function drawNode(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  view: OverworldView,
  i: number,
): void {
  const { x, y } = OW_NODES[i];
  const { time, save } = session;
  const isLevel = i < LEVELS.length;
  const unlocked = i <= view.maxNode;
  const done = isLevel && levelRecord(save, LEVELS[i].id).completions > 0;
  const current = i === view.node && !view.walking;

  // Piedra base del nodo
  ctx.fillStyle = unlocked ? '#4a2e70' : '#241638';
  ctx.fillRect(x - 5, y - 2, 10, 5);
  ctx.fillStyle = unlocked ? '#8064b0' : '#3a2456';
  ctx.fillRect(x - 5, y - 3, 10, 1);

  if (done) {
    // Completado: un cristal dorado flota sobre la piedra.
    const bob = Math.sin(time * 2.5 + i) * 1.5;
    drawGlow(ctx, x, y - 9 + bob, 9, '#ffe25a', 0.4);
    const frames = [sprites.crystal, sprites.crystal2, sprites.crystal3, sprites.crystal4];
    const spr = frameAt(frames, 6, time, i * 0.7);
    spr.draw(ctx, x - spr.w / 2, y - 12 + bob);
  } else if (unlocked) {
    // La frontera: late invitando a entrar.
    const pulse = 0.35 + Math.sin(time * 3.5) * 0.2;
    drawGlow(ctx, x, y - 4, 10, '#b98bff', pulse);
  } else {
    // Cerrado: una piedra muda con su incógnita.
    ctx.fillStyle = '#6f5a94';
    ctx.font = font(7);
    ctx.textAlign = 'center';
    ctx.fillText('?', x, y - 6);
  }

  // El último nodo es la gran puerta del mundo (por ahora, cerrada).
  if (i === OW_NODES.length - 1) {
    const door = sprites.doorLocked;
    door.draw(ctx, x - door.w / 2, y - 3 - door.h);
  }

  // Número del nivel bajo la piedra; el actual, resaltado.
  ctx.fillStyle = current ? '#ffe25a' : '#6f5a94';
  ctx.font = font(7);
  ctx.textAlign = 'center';
  ctx.fillText(String(i + 1), x, y + 11);
}

/** El personaje del mapa: quieto respira, caminando corre. */
function drawAvatar(ctx: CanvasRenderingContext2D, view: OverworldView, time: number): void {
  const bottomY = view.y - 3; // parado sobre la piedra del nodo
  drawGlow(ctx, view.x, bottomY - 5, 12, '#3aa6d6', 0.3);
  let spr;
  if (view.walking) {
    const run = [sprites.playerRun1, sprites.playerRun2, sprites.playerRun3, sprites.playerRun4];
    spr = frameAt(run, 12, view.walkTime);
  } else if (time % 3.3 < 0.15) {
    spr = sprites.playerBlink;
  } else {
    spr = frameAt([sprites.playerIdle, sprites.playerIdle2], 1.6, time);
  }
  spr.drawStretched(ctx, view.x, bottomY, 1, 1, view.facing === -1);
}

/** Panel inferior: nombre y récords del nodo donde está parado. */
function drawPanel(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  view: OverworldView,
): void {
  const { viewW, viewH, time, save } = session;
  ctx.fillStyle = 'rgba(17,9,26,0.72)';
  ctx.fillRect(0, viewH - 40, viewW, 40);
  const cx = viewW / 2;
  ctx.textAlign = 'center';

  const isLevel = view.node < LEVELS.length;
  if (!isLevel) {
    ctx.fillStyle = '#6f5a94';
    ctx.font = font(10);
    ctx.fillText(t('ow_locked'), cx, viewH - 24);
    return;
  }

  const level = LEVELS[view.node];
  const rec = levelRecord(save, level.id);
  ctx.fillStyle = '#ffe25a';
  ctx.font = font(9);
  ctx.fillText(`${view.node + 1}. ${t(level.nameKey)}`, cx, viewH - 28);

  // Récords en una línea (solo lo que exista, separado con puntos).
  const parts: string[] = [];
  if (rec.bestTime > 0) parts.push(t('best_time', { t: formatTime(rec.bestTime) }));
  if (rec.bestTrialTime > 0) parts.push(t('trial_best', { t: formatTime(rec.bestTrialTime) }));
  if (rec.completions > 0) {
    parts.push(rec.completions === 1 ? t('completed_once') : t('completed_many', { n: rec.completions }));
  }
  if (parts.length > 0) {
    ctx.fillStyle = '#7ce0ff';
    ctx.font = font(7);
    ctx.fillText(parts.join(' · '), cx, viewH - 18);
  }

  // Cómo entrar (derecha) y cómo moverse (izquierda): cada aviso en
  // su esquina para que nunca se pisen entre sí.
  const dev = inputDevice();
  const pl = padLabels();
  const enter = dev === 'touch' ? t('ow_enter_touch') : dev === 'gamepad' ? t('ow_enter_gp', pl) : t('ow_enter_kb');
  const hint = dev === 'touch' ? t('ow_hint_touch') : dev === 'gamepad' ? t('ow_hint_gp', pl) : t('ow_hint_kb');
  ctx.globalAlpha = 0.55 + Math.sin(time * 4) * 0.45;
  ctx.fillStyle = '#ffe25a';
  ctx.font = font(8);
  ctx.textAlign = 'right';
  ctx.fillText(enter, viewW - 4, viewH - 9);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#6f5a94';
  ctx.font = font(7);
  ctx.textAlign = 'left';
  ctx.fillText(hint, 4, viewH - 9);
}

/** El elegidor de modo sobre un nivel ya completado. */
function drawModeChooser(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  view: OverworldView,
): void {
  const { viewW, viewH, time, save } = session;
  ctx.fillStyle = 'rgba(17,9,26,0.78)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;
  const cy = viewH / 2;
  ctx.textAlign = 'center';

  ctx.fillStyle = '#e9d6ff';
  ctx.font = font(12);
  ctx.fillText(t('choose_mode'), cx, cy - 26);
  ctx.fillStyle = '#9b86c4';
  ctx.font = font(8);
  ctx.fillText(t(LEVELS[view.node].nameKey), cx, cy - 14);

  // Las dos opciones, lado a lado; la elegida brilla y se subraya.
  const options: Array<{ mode: GameMode; label: string }> = [
    { mode: 'normal', label: t('mode_normal') },
    { mode: 'trial', label: t('mode_trial') },
  ];
  options.forEach((opt, idx) => {
    const ox = cx + (idx === 0 ? -58 : 58);
    const active = view.choice === opt.mode;
    ctx.fillStyle = active ? '#ffe25a' : '#6f5a94';
    ctx.font = font(10);
    ctx.fillText(opt.label, ox, cy + 4);
    if (active) {
      const w = ctx.measureText(opt.label).width;
      ctx.fillRect(ox - w / 2, cy + 7, w, 1);
    }
  });

  // Pista del modo elegido y, en contrarreloj, la marca a batir.
  ctx.fillStyle = '#9b86c4';
  ctx.font = font(7);
  ctx.fillText(view.choice === 'normal' ? t('mode_normal_hint') : t('mode_trial_hint'), cx, cy + 20);
  if (view.choice === 'trial') {
    const rec = levelRecord(save, LEVELS[view.node].id);
    if (rec.bestTrialTime > 0) {
      ctx.fillStyle = '#7ce0ff';
      ctx.fillText(t('trial_best', { t: formatTime(rec.bestTrialTime) }), cx, cy + 30);
    }
  }

  const dev = inputDevice();
  const enter =
    dev === 'touch'
      ? t('ow_enter_touch')
      : dev === 'gamepad'
        ? t('ow_enter_gp', padLabels())
        : t('ow_enter_kb');
  ctx.globalAlpha = 0.55 + Math.sin(time * 4) * 0.45;
  ctx.fillStyle = '#ffe25a';
  ctx.font = font(8);
  ctx.fillText(enter, cx, cy + 44);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}
