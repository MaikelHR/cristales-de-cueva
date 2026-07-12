// ============================================================
//  SELECTOR DE PERSONAJE (color + accesorio) — solo táctil
// ------------------------------------------------------------
//  Dos botones fijos (debajo del selector de idioma) que recorren
//  la personalización con cada toque: en táctil no hay menú de
//  título que navegar (la pantalla PERSONAJE es de teclado/pad),
//  así que el look necesita sus propios botones. Igual que el de
//  idioma: solo existen en modo táctil y solo en los menús o en
//  pausa, nunca durante la partida.
//    - El primer botón se pinta del cuerpo de la skin activa:
//      ES la vista previa del color.
//    - El segundo muestra el accesorio activo dibujado al doble
//      (un canvas chiquito), o un puntito si no hay ninguno.
// ============================================================

import { isTouchMode } from '../engine/input';
import { Sprite } from '../engine/Sprite';
import { PALETTE } from './art/palette';
import { currentSkin, cycleSkin, onSkinChange } from './skins';
import { currentAccessory, cycleAccessory, onAccessoryChange } from './accessories';
import { t, onLangChange } from './i18n';

const ACC_CANVAS_W = 28; // 14 columnas de grilla al doble
const ACC_CANVAS_H = 12; // hasta 5 filas de grilla, centradas

let container: HTMLDivElement | null = null;
let skinBtn: HTMLButtonElement | null = null;
let accBtn: HTMLButtonElement | null = null;
let accCanvas: HTMLCanvasElement | null = null;

/** Construye los botones y los agrega al DOM. Idempotente. */
export function initSkinSwitch(): void {
  if (container) return;
  const wrap = document.createElement('div');
  wrap.className = 'skin-switch';
  wrap.dataset.show = '0'; // en táctil arranca oculto; syncSkinSwitch decide.

  skinBtn = document.createElement('button');
  skinBtn.type = 'button';
  skinBtn.className = 'skin-btn';
  // Solo 'click' (nada de pointerdown extra): un toque = UN paso de rueda.
  skinBtn.addEventListener('click', () => cycleSkin(1));

  accBtn = document.createElement('button');
  accBtn.type = 'button';
  accBtn.className = 'acc-btn';
  accCanvas = document.createElement('canvas');
  accCanvas.width = ACC_CANVAS_W;
  accCanvas.height = ACC_CANVAS_H;
  accBtn.appendChild(accCanvas);
  accBtn.addEventListener('click', () => cycleAccessory(1));

  wrap.append(skinBtn, accBtn);
  document.body.appendChild(wrap);
  container = wrap;

  paint();
  onSkinChange(paint); // reflejar el color cuando cambie la skin.
  onAccessoryChange(paint); // ídem el dibujito del accesorio.
  onLangChange(paint); // los aria-label también cambian de idioma.
}

/** Visibles solo en táctil y fuera del juego (menús o pausa). */
export function syncSkinSwitch(ui: { state: string; paused: boolean }): void {
  if (!container) return;
  const show = isTouchMode() && (ui.state !== 'playing' || ui.paused);
  const val = show ? '1' : '0';
  if (container.dataset.show !== val) container.dataset.show = val;
}

/** Botón 1 teñido del cuerpo (B) y contorno (K) de la skin activa;
 *  botón 2 con el accesorio activo dibujado pixel a pixel. */
function paint(): void {
  const skin = currentSkin();
  if (skinBtn) {
    skinBtn.style.background = skin.tint.B ?? PALETTE.B;
    skinBtn.style.borderColor = skin.tint.K ?? PALETTE.K;
    skinBtn.setAttribute('aria-label', `${t('tc_skin_aria')}: ${t(skin.nameKey)}`);
  }

  const acc = currentAccessory();
  if (accBtn) {
    accBtn.setAttribute('aria-label', `${t('tc_acc_aria')}: ${t(acc.nameKey)}`);
  }
  const ctx = accCanvas?.getContext('2d');
  if (!ctx || !accCanvas) return;
  ctx.clearRect(0, 0, ACC_CANVAS_W, ACC_CANVAS_H);
  ctx.imageSmoothingEnabled = false; // pixeles nítidos al escalar
  if (acc.grid.length === 0) {
    // Sin accesorio: un puntito mudo como "ranura vacía".
    ctx.fillStyle = '#57457a';
    ctx.fillRect(ACC_CANVAS_W / 2 - 1, ACC_CANVAS_H / 2 - 1, 2, 2);
    return;
  }
  // El accesorio se tiñe como en el juego (K = contorno de la skin).
  const spr = new Sprite([...acc.grid], { ...PALETTE, ...skin.tint });
  ctx.save();
  ctx.scale(2, 2);
  spr.draw(ctx, (ACC_CANVAS_W / 2 - spr.w) / 2, (ACC_CANVAS_H / 2 - spr.h) / 2);
  ctx.restore();
}
