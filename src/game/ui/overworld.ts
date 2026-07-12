// ============================================================
//  DIBUJO DEL OVERWORLD (el mapa de niveles)
// ------------------------------------------------------------
//  Todo lo visible del selector: las islitas de roca de cada nodo,
//  el sendero punteado con su pulso que corre hacia adelante, los
//  nodos (completado = cristal dorado con banderín, desbloqueado =
//  latido, cerrado = piedra con '?'), el decorado entre nodos, la
//  fauna ambiente (murciélagos, luciérnagas, polvo), el personaje
//  parado o caminando, el panel con nombre y récords del nivel
//  elegido y el elegidor de modo. La lógica (qué se puede pisar,
//  entrar, elegir) vive en la escena; acá solo se pinta lo que
//  ella decide.
// ============================================================

import { frameAt } from '../../engine/animation';
import { inputDevice, padLabels } from '../../engine/input';
import type { GameSession, GameMode } from '../session';
import { LEVELS } from '../world/rooms';
import { levelRecord } from '../save';
import { sprites } from '../art/sprites';
import { playerSprites } from '../art/playerSkins';
import { currentSkin } from '../skins';
import { drawGlow } from '../art/glow';
import { drawBackground, drawDust, drawFog, drawVignette } from '../art/atmosphere';
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
  settleTime: number;
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
  // idéntica a ninguna sala) y con su tema dorado de mapa.
  drawBackground(ctx, 0, 0, viewW, viewH, viewW, 7, time, 'overworld');

  // Fauna lejana: murciélagos que cruzan la gruta de vez en cuando.
  drawBats(ctx, viewW, time);

  // --- Islitas de roca bajo cada nodo ---
  for (let i = 0; i < OW_NODES.length; i++) {
    drawIsland(ctx, OW_NODES[i].x, OW_NODES[i].y, i <= view.maxNode);
  }

  // --- Decorado entre nodos: cristalitos, hongos y rocas ---
  drawPathDecor(ctx, time);

  // --- Sendero punteado con pulso que corre hacia adelante ---
  let dTotal = 0; // distancia acumulada: hace que el pulso RECORRA el camino
  for (let i = 0; i < OW_NODES.length - 1; i++) {
    const a = OW_NODES[i];
    const b = OW_NODES[i + 1];
    const reachable = i + 1 <= view.maxNode;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 7; d < dist - 4; d += 7) {
      const px = Math.round(a.x + ((b.x - a.x) * d) / dist);
      const py = Math.round(a.y + ((b.y - a.y) * d) / dist);
      if (reachable) {
        const wave = Math.sin(time * 3 - (dTotal + d) * 0.12);
        if (wave > 0.55) {
          ctx.fillStyle = '#e9d6ff';
          ctx.fillRect(px - 1, py - 1, 3, 3);
        } else {
          ctx.fillStyle = '#8064b0';
          ctx.fillRect(px - 1, py - 1, 2, 2);
        }
      } else {
        ctx.fillStyle = '#3a2456';
        ctx.fillRect(px - 1, py - 1, 2, 2);
      }
    }
    dTotal += dist;
  }

  // --- Nodos ---
  for (let i = 0; i < OW_NODES.length; i++) {
    drawNode(ctx, session, view, i);
  }

  // --- El personaje ---
  drawAvatar(ctx, view, time);

  // --- Luciérnagas: puntitos de luz que orbitan por la gruta ---
  drawFireflies(ctx, time);

  // --- Título del mundo (flanqueado por cristales) y progreso ---
  const cx = viewW / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e9d6ff';
  ctx.font = font(10);
  const title = t('ow_title');
  const tw = ctx.measureText(title).width;
  ctx.fillText(title, cx, 14);
  const crystalFrames = [sprites.crystal, sprites.crystal2, sprites.crystal3, sprites.crystal4];
  const bob = Math.sin(time * 2) * 1;
  for (const side of [-1, 1]) {
    const gx = cx + side * (tw / 2 + 11);
    drawGlow(ctx, gx, 10 + bob, 7, '#ffe25a', 0.25);
    const spr = frameAt(crystalFrames, 6, time, side + 1);
    spr.draw(ctx, gx - spr.w / 2, 6 + bob);
  }
  const completed = LEVELS.filter((l) => levelRecord(save, l.id).completions > 0).length;
  ctx.fillStyle = '#9b86c4';
  ctx.font = font(8);
  ctx.fillText(t('ow_progress', { n: completed, m: OW_NODES.length }), cx, 25);

  // Con el elegidor abierto, el panel no se dibuja: evita dos capas
  // de texto peleando en el fondo de la pantalla.
  if (view.choosing) drawModeChooser(ctx, session, view);
  else drawPanel(ctx, session, view);

  drawFog(ctx, 0, viewW, viewH, time, 'overworld');
  drawDust(ctx, viewW, viewH, time, 1 / 60);
  drawVignette(ctx, viewW, viewH);
  ctx.textAlign = 'left';
}

/** La islita flotante de roca donde se apoya cada nodo. */
function drawIsland(ctx: CanvasRenderingContext2D, x: number, y: number, unlocked: boolean): void {
  // Losa de arriba (donde se pisa) con su borde iluminado.
  ctx.fillStyle = unlocked ? '#8064b0' : '#3a2456';
  ctx.fillRect(x - 7, y - 3, 14, 1);
  ctx.fillStyle = unlocked ? '#4a2e70' : '#241638';
  ctx.fillRect(x - 7, y - 2, 14, 4);
  // La panza de roca que se afina hacia abajo.
  ctx.fillStyle = unlocked ? '#2e1c48' : '#1a0f2a';
  ctx.fillRect(x - 5, y + 2, 10, 2);
  ctx.fillRect(x - 3, y + 4, 6, 2);
  // Piedritas colgando de los bordes (se leen como raíces de la isla).
  ctx.fillRect(x - 6, y + 2, 1, 1);
  ctx.fillRect(x + 5, y + 2, 1, 1);
}

/** Decorado fijo a mitad de camino entre nodos (alternando tipos). */
function drawPathDecor(ctx: CanvasRenderingContext2D, time: number): void {
  for (let i = 0; i < OW_NODES.length - 1; i += 2) {
    const a = OW_NODES[i];
    const b = OW_NODES[i + 1];
    const mx = Math.round((a.x + b.x) / 2 + ((i * 13) % 7) - 3);
    const my = Math.round(Math.max(a.y, b.y) + 12 + (i % 3));
    const kind = i % 3;
    if (kind === 0) {
      // Cristalitos dorados brotando de la roca.
      const pulse = 0.12 + (Math.sin(time * 1.8 + i) + 1) * 0.06;
      drawGlow(ctx, mx + 2, my - 2, 6, '#ffd76a', pulse);
      ctx.fillStyle = '#c9761f';
      ctx.fillRect(mx, my - 2, 2, 3);
      ctx.fillStyle = '#ffd23a';
      ctx.fillRect(mx + 2, my - 4, 2, 5);
      ctx.fillRect(mx - 1, my - 1, 1, 2);
    } else if (kind === 1) {
      // Un hongo violeta que late suave.
      const pulse = 0.1 + (Math.sin(time * 2.2 + i) + 1) * 0.06;
      drawGlow(ctx, mx + 1, my - 4, 6, '#b98bff', pulse);
      ctx.fillStyle = '#3a2a5e';
      ctx.fillRect(mx + 1, my - 3, 1, 3);
      ctx.fillStyle = '#7a4bd6';
      ctx.fillRect(mx - 1, my - 4, 5, 1);
      ctx.fillRect(mx, my - 5, 3, 1);
    } else {
      // Una roca puntiaguda muda.
      ctx.fillStyle = '#241638';
      ctx.beginPath();
      ctx.moveTo(mx - 2, my + 1);
      ctx.lineTo(mx + 1, my - 5);
      ctx.lineTo(mx + 4, my + 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3a2456';
      ctx.fillRect(mx, my - 4, 1, 1);
    }
  }
}

/** Murciélagos que cruzan la parte alta de la gruta, de a ratos. */
function drawBats(ctx: CanvasRenderingContext2D, viewW: number, time: number): void {
  const frames = [sprites.flyer1, sprites.flyer2];
  for (let i = 0; i < 2; i++) {
    const period = 17 + i * 6;
    const p = ((time + i * 9) % period) / period;
    if (p > 0.55) continue; // la mayor parte del ciclo, la gruta está quieta
    const dir = i === 0 ? 1 : -1;
    const across = (p / 0.55) * (viewW + 24);
    const bx = dir === 1 ? -12 + across : viewW + 12 - across;
    const by = 30 + i * 12 + Math.sin(time * 4 + i * 2) * 4;
    const spr = frameAt(frames, 10, time);
    ctx.globalAlpha = 0.5; // medio a contraluz: es fondo, no amenaza
    spr.draw(ctx, Math.round(bx - spr.w / 2), Math.round(by), dir === -1);
    ctx.globalAlpha = 1;
  }
}

/** Luciérnagas: órbitas deterministas, cada una con su parpadeo. */
function drawFireflies(ctx: CanvasRenderingContext2D, time: number): void {
  for (let i = 0; i < 6; i++) {
    const cx = 30 + ((i * 67) % 260);
    const cy = 45 + ((i * 43) % 75);
    const fx = cx + Math.sin(time * (0.5 + i * 0.13) + i * 2.1) * 14;
    const fy = cy + Math.sin(time * (0.7 + i * 0.11) + i * 4.2) * 8;
    const blink = 0.2 + (Math.sin(time * 2.5 + i * 1.7) + 1) * 0.2;
    drawGlow(ctx, fx, fy, 4, i % 2 ? '#ffd76a' : '#b98bff', blink);
    ctx.fillStyle = '#fff3c0';
    ctx.fillRect(Math.round(fx), Math.round(fy), 1, 1);
  }
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

  if (done) {
    // Completado: un cristal dorado flota sobre la piedra y un
    // banderín conquistado flamea a su lado (guiño a Mario).
    const bob = Math.sin(time * 2.5 + i) * 1.5;
    drawGlow(ctx, x, y - 9 + bob, 9, '#ffe25a', 0.4);
    const frames = [sprites.crystal, sprites.crystal2, sprites.crystal3, sprites.crystal4];
    const spr = frameAt(frames, 6, time, i * 0.7);
    spr.draw(ctx, x - spr.w / 2, y - 12 + bob);
    ctx.fillStyle = '#9b86c4';
    ctx.fillRect(x + 7, y - 13, 1, 10);
    for (let r = 0; r < 3; r++) {
      const wav = Math.round(Math.sin(time * 5 + r * 0.8));
      ctx.fillStyle = r === 2 ? '#c9761f' : '#ffe25a';
      ctx.fillRect(x + 8 + wav, y - 13 + r, 4 - r, 1);
    }
  } else if (unlocked) {
    // La frontera: late invitando a entrar, con chispas que suben.
    const pulse = 0.35 + Math.sin(time * 3.5) * 0.2;
    drawGlow(ctx, x, y - 4, 10, '#b98bff', pulse);
    for (let k = 0; k < 2; k++) {
      const p = (time * 0.5 + k * 0.5) % 1;
      ctx.globalAlpha = (1 - p) * 0.8;
      ctx.fillStyle = '#e9d6ff';
      ctx.fillRect(Math.round(x + Math.sin(time * 2 + k * 3) * 3), Math.round(y - 3 - p * 11), 1, 1);
      ctx.globalAlpha = 1;
    }
  } else {
    // Cerrado: una piedra muda con su incógnita.
    ctx.fillStyle = '#6f5a94';
    ctx.font = font(7);
    ctx.textAlign = 'center';
    ctx.fillText('?', x, y - 6);
  }

  // El último nodo es la gran puerta del mundo (por ahora, cerrada),
  // custodiada por dos antorchas de cristal que chisporrotean.
  if (i === OW_NODES.length - 1) {
    const door = sprites.doorLocked;
    door.draw(ctx, x - door.w / 2, y - 3 - door.h);
    for (const side of [-1, 1]) {
      const tx = x + side * 12;
      const ty = y - 10;
      drawGlow(ctx, tx, ty, 7, '#ffd76a', 0.3 + Math.sin(time * 6 + side * 2) * 0.1);
      ctx.fillStyle = '#4a2e70';
      ctx.fillRect(tx - 1, ty + 2, 2, 4);
      ctx.fillStyle = '#ffd23a';
      ctx.fillRect(tx - 1, ty + (Math.sin(time * 7 + side) > 0 ? -1 : 0), 2, 2);
      ctx.fillStyle = '#fff3c0';
      ctx.fillRect(tx - (Math.sin(time * 9 + side) > 0 ? 1 : 0), ty - 2, 1, 1);
    }
  }

  // Número del nivel bajo la piedra; el actual, resaltado.
  ctx.fillStyle = current ? '#ffe25a' : '#6f5a94';
  ctx.font = font(7);
  ctx.textAlign = 'center';
  ctx.fillText(String(i + 1), x, y + 12);
}

/** El personaje del mapa: quieto respira, caminando corre y patea
 *  polvito; al llegar a un nodo se aplasta un instante (plof). */
function drawAvatar(ctx: CanvasRenderingContext2D, view: OverworldView, time: number): void {
  const bottomY = view.y - 3; // parado sobre la piedra del nodo

  // Anillo de "estás acá" que se expande bajo los pies, solo quieto.
  if (!view.walking) {
    const rp = (time * 0.9) % 1;
    ctx.globalAlpha = (1 - rp) * 0.3;
    ctx.strokeStyle = '#7ce0ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(view.x, bottomY + 1, 3 + rp * 7, (3 + rp * 7) * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawGlow(ctx, view.x, bottomY - 5, 12, currentSkin().glow, 0.3);

  // Polvito que queda atrás mientras camina.
  if (view.walking) {
    const p = (view.walkTime * 4) % 1;
    ctx.globalAlpha = (1 - p) * 0.5;
    ctx.fillStyle = '#c9b3f0';
    const px = view.x - view.facing * (4 + p * 6);
    ctx.fillRect(Math.round(px), Math.round(bottomY - 2 - p * 2), p > 0.5 ? 1 : 2, 1);
    ctx.globalAlpha = 1;
  }

  const s = playerSprites(); // los sprites de la skin activa
  let spr;
  if (view.walking) {
    spr = frameAt(s.run, 12, view.walkTime);
  } else if (time % 3.3 < 0.15) {
    spr = s.blink;
  } else {
    spr = frameAt([s.idle, s.idle2], 1.6, time);
  }
  // El "plof" al aterrizar: recién llegado se aplasta y se recupera.
  const squash = Math.max(0, 1 - view.settleTime / 0.18);
  spr.drawStretched(ctx, view.x, bottomY, 1 + squash * 0.3, 1 - squash * 0.25, view.facing === -1);
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
  ctx.fillStyle = '#4a2e70'; // filo superior: separa el panel del mapa
  ctx.fillRect(0, viewH - 41, viewW, 1);
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
  ctx.fillStyle = 'rgba(17,9,26,0.6)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;
  const cy = viewH / 2;

  // Marco del elegidor: un recuadro de piedra con esquinas de cristal.
  const pw = 216;
  const ph = 100;
  ctx.fillStyle = 'rgba(26,14,44,0.92)';
  ctx.fillRect(cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.strokeStyle = '#8064b0';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - pw / 2 + 0.5, cy - ph / 2 + 0.5, pw - 1, ph - 1);
  ctx.fillStyle = '#e9d6ff';
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      ctx.fillRect(cx + sx * (pw / 2) - (sx > 0 ? 1 : 0), cy + sy * (ph / 2) - (sy > 0 ? 1 : 0), 1, 1);
    }
  }
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
