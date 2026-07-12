// ============================================================
//  CHARACTER SELECTOR (color + accessory) — touch only
// ------------------------------------------------------------
//  Two fixed buttons (below the language selector) that cycle
//  through customization with each tap: on touch there's no title
//  menu to navigate (the CHARACTER screen is keyboard/pad), so the
//  look needs its own buttons. Just like the language one: they
//  only exist in touch mode and only in the menus or in pause,
//  never during gameplay.
//    - The first button is painted with the active skin's body:
//      it IS the color preview.
//    - The second shows the active accessory drawn at 2x
//      (a tiny canvas), or a dot if there's none.
// ============================================================

import { isTouchMode } from '../engine/input';
import { Sprite } from '../engine/Sprite';
import { PALETTE } from './art/palette';
import { currentSkin, cycleSkin, onSkinChange } from './skins';
import { currentAccessory, cycleAccessory, onAccessoryChange } from './accessories';
import { t, onLangChange } from './i18n';

const ACC_CANVAS_W = 28; // 14 grid columns at 2x
const ACC_CANVAS_H = 12; // up to 5 grid rows, centered

let container: HTMLDivElement | null = null;
let skinBtn: HTMLButtonElement | null = null;
let accBtn: HTMLButtonElement | null = null;
let accCanvas: HTMLCanvasElement | null = null;

/** Builds the buttons and appends them to the DOM. Idempotent. */
export function initSkinSwitch(): void {
  if (container) return;
  const wrap = document.createElement('div');
  wrap.className = 'skin-switch';
  wrap.dataset.show = '0'; // starts hidden on touch; syncSkinSwitch decides.

  skinBtn = document.createElement('button');
  skinBtn.type = 'button';
  skinBtn.className = 'skin-btn';
  // Only 'click' (no extra pointerdown): one tap = ONE wheel step.
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
  onSkinChange(paint); // reflect the color when the skin changes.
  onAccessoryChange(paint); // likewise the accessory drawing.
  onLangChange(paint); // the aria-labels also change language.
}

/** Visible only on touch and outside gameplay (menus or pause). */
export function syncSkinSwitch(ui: { state: string; paused: boolean }): void {
  if (!container) return;
  const show = isTouchMode() && (ui.state !== 'playing' || ui.paused);
  const val = show ? '1' : '0';
  if (container.dataset.show !== val) container.dataset.show = val;
}

/** Button 1 tinted with the active skin's body (B) and outline (K);
 *  button 2 with the active accessory drawn pixel by pixel. */
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
  ctx.imageSmoothingEnabled = false; // crisp pixels when scaling
  if (acc.grid.length === 0) {
    // No accessory: a quiet dot as an "empty slot".
    ctx.fillStyle = '#57457a';
    ctx.fillRect(ACC_CANVAS_W / 2 - 1, ACC_CANVAS_H / 2 - 1, 2, 2);
    return;
  }
  // The accessory is tinted as in-game (K = skin outline).
  const spr = new Sprite([...acc.grid], { ...PALETTE, ...skin.tint });
  ctx.save();
  ctx.scale(2, 2);
  spr.draw(ctx, (ACC_CANVAS_W / 2 - spr.w) / 2, (ACC_CANVAS_H / 2 - spr.h) / 2);
  ctx.restore();
}
