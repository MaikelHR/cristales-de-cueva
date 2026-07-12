// ============================================================
//  TOUCH CONTROLS: on-screen gamepad for mobile
// ------------------------------------------------------------
//  On touch screens there's no keyboard or gamepad, so we draw
//  a gamepad on top of the canvas: d-pad on the left, jump/dash
//  on the right and a pause button. Each button translates the
//  tap into the same ACTIONS as the rest of the game (left,
//  jump...), reusing the existing input; the game never learns
//  the command came from a finger.
//
//  Two button families:
//    - HOLD (move/jump/dash): active while held.
//    - TAP  (pause/resume/restart): active for one instant.
//  We use Pointer Events with per-finger capture (setPointerCapture)
//  to allow real multitouch: holding "left" and tapping "jump"
//  at the same time without one finger stealing the other's event.
//
//  On desktop this module does absolutely NOTHING: if the pointer
//  isn't "coarse" (touch), we bail out before touching the DOM.
// ============================================================

import { touchButton, releaseAll, setDevice, setTouchMode } from '../engine/input';
import { t, onLangChange } from './i18n';
import { bakeControlFaces, bakeMenuFace, type TouchFace } from './ui/touchButtons';
import type { UiState } from './scenes/Scene';

/** Interface state the game passes us to decide what to show.
 *  `hasDash` says whether dash is already unlocked (to show its button). */
type TouchUI = UiState & { hasDash: boolean };

/** Visibility mode of the gamepad; the CSS decides what shows in each. */
type TouchMode = 'play' | 'paused' | 'menu';

// We keep the last known state for two things: to avoid touching
// the DOM if it didn't change (data-mode) and to know, when the
// canvas is tapped, whether we're in a menu (tap = confirm) or playing (ignored).
let currentUi: TouchUI = { state: 'title', paused: false, hasDash: false };
let container: HTMLDivElement | null = null;
let currentMode: TouchMode | null = null;
// The dash button: kept apart because its visibility doesn't depend on
// the mode, but on whether dash is already unlocked (starts hidden).
let dashBtn: HTMLButtonElement | null = null;
let currentHasDash = false;
// Each HOLD button registers a "forced releaser" here that clears its
// state (pressed fingers + highlight). Used by the panic path (lost focus)
// so nothing stays stuck without relying on a browser event.
const holdResetters: Array<() => void> = [];

/** Actions the touch module knows how to emit. */
type TouchAction =
  | 'left'
  | 'down'
  | 'right'
  | 'jump'
  | 'dash'
  | 'confirm'
  | 'pause'
  | 'restart'
  | 'quit';

/**
 * Builds the touch gamepad and wires its events. In practice idempotent:
 * if it's not a touch device, it exits without leaving a trace.
 */
export function initTouchControls(canvas: HTMLCanvasElement): void {
  // --- Touch capability detection ---
  // "pointer: coarse" = imprecise pointer (finger). maxTouchPoints covers
  // browsers that don't report the media query well. On a phone/tablet
  // this is already true at load, so we build the gamepad right away.
  const coarse =
    window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  if (coarse) {
    buildTouchControls(canvas);
    return;
  }

  // If at load it does NOT look touch (desktop, or the browser isn't yet
  // emulating touch), we lie in wait: as soon as a REAL touch arrives we
  // turn the gamepad on right then. This also makes it appear when you
  // enable DevTools touch emulation without reloading, and on hybrid
  // machines (laptop with touch screen) the first finger reveals it.
  const onFirstTouch = (e: PointerEvent): void => {
    if (e.pointerType !== 'touch') return; // precision mouse/stylus: stay on desktop.
    window.removeEventListener('pointerdown', onFirstTouch, true);
    buildTouchControls(canvas);
  };
  window.addEventListener('pointerdown', onFirstTouch, true); // capture: before anyone else.
}

/**
 * Builds the touch gamepad and turns it on. Only called once we've
 * decided the device is touch (at load or on the first touch).
 */
function buildTouchControls(canvas: HTMLCanvasElement): void {
  if (container) return; // already built: don't duplicate the DOM or events.

  // Flag touch capability (sticky flag) and start in touch mode.
  setTouchMode(true);
  setDevice('touch');
  document.body.classList.add('touch');

  // --- DOM construction (FIXED classes: the CSS depends on them) ---
  const tc = document.createElement('div');
  tc.className = 'tc';
  tc.id = 'tc';
  tc.dataset.mode = 'menu';

  // The buttons carry NO text in the DOM: their face is pixel-art baked
  // by code (ui/touchButtons.ts) that the CSS stretches without blurring.
  // The aria-label (screen readers) does come from the language dictionary.
  // Pause button (top-right).
  const btnPause = makeButton('tc-btn tc-pause', t('tc_pause_aria'));
  // Movement d-pad (left band).
  const pad = document.createElement('div');
  pad.className = 'tc-pad';
  const btnLeft = makeButton('tc-btn tc-left', t('tc_left_aria'));
  // Down: navigates menus and drops through planks (down+jump).
  const btnDown = makeButton('tc-btn tc-down', t('tc_down_aria'));
  const btnRight = makeButton('tc-btn tc-right', t('tc_right_aria'));
  pad.append(btnLeft, btnDown, btnRight);
  // Actions (right band).
  const actions = document.createElement('div');
  actions.className = 'tc-actions';
  const btnDash = makeButton('tc-btn tc-dash', t('tc_dash_aria'));
  // Dash starts locked: we hide its button until it's unlocked
  // (syncTouchUI shows it when the game reports hasDash).
  btnDash.style.display = 'none';
  dashBtn = btnDash;
  const btnJump = makeButton('tc-btn tc-jump', t('tc_jump_aria'));
  actions.append(btnDash, btnJump);
  // Pause menu (center).
  const menu = document.createElement('div');
  menu.className = 'tc-menu';
  const btnResume = makeButton('tc-btn tc-mbtn tc-resume', t('tc_resume'));
  const btnFs = makeButton('tc-btn tc-mbtn tc-fs', t('tc_fs'));
  const btnRestart = makeButton('tc-btn tc-mbtn tc-restart', t('tc_restart'));
  const btnMap = makeButton('tc-btn tc-mbtn tc-map', t('tc_map'));
  menu.append(btnResume, btnFs, btnRestart, btnMap);

  // Pixel-art faces for the gameplay buttons (fixed: their glyphs are
  // icons, not language-dependent).
  const faces = bakeControlFaces();
  applyFace(btnPause, faces.pause);
  applyFace(btnLeft, faces.left);
  applyFace(btnDown, faces.down);
  applyFace(btnRight, faces.right);
  applyFace(btnDash, faces.dash);
  applyFace(btnJump, faces.jump);

  // The menu faces carry their label BAKED in with the game font:
  // they're re-baked on language change and when the font finishes
  // loading (if baked earlier, they got the system fallback font).
  const bakeMenus = (): void => {
    applyFace(btnResume, bakeMenuFace(t('tc_resume'), true));
    applyFace(btnFs, bakeMenuFace(t('tc_fs')));
    applyFace(btnRestart, bakeMenuFace(t('tc_restart')));
    applyFace(btnMap, bakeMenuFace(t('tc_map')));
  };
  bakeMenus();
  void document.fonts.ready.then(bakeMenus);

  // On language change, re-apply aria-labels and re-bake the labels.
  const relocalize = (): void => {
    btnPause.setAttribute('aria-label', t('tc_pause_aria'));
    btnLeft.setAttribute('aria-label', t('tc_left_aria'));
    btnDown.setAttribute('aria-label', t('tc_down_aria'));
    btnRight.setAttribute('aria-label', t('tc_right_aria'));
    btnDash.setAttribute('aria-label', t('tc_dash_aria'));
    btnJump.setAttribute('aria-label', t('tc_jump_aria'));
    btnResume.setAttribute('aria-label', t('tc_resume'));
    btnFs.setAttribute('aria-label', t('tc_fs'));
    btnRestart.setAttribute('aria-label', t('tc_restart'));
    btnMap.setAttribute('aria-label', t('tc_map'));
    bakeMenus();
  };
  onLangChange(relocalize);

  tc.append(btnPause, pad, actions, menu);
  document.body.appendChild(tc);
  container = tc;

  // --- Event wiring ---
  // HOLD: active while the finger stays pressed.
  bindHold(btnLeft, 'left');
  bindHold(btnDown, 'down');
  bindHold(btnRight, 'right');
  bindHold(btnJump, 'jump');
  bindHold(btnDash, 'dash');

  // TAP: active for one instant (a "just pressed" edge).
  bindTap(btnPause, 'pause');
  bindTap(btnResume, 'pause'); // "Resume" toggles the same pause.
  bindTap(btnRestart, 'restart');
  bindTap(btnMap, 'quit'); // "Exit to map": the pause turns it into a scene.

  // Fullscreen: only if the browser supports it for elements.
  bindFullscreen(btnFs);

  // Tap on the canvas in menu mode -> confirm (title/won/gameover).
  bindCanvasConfirm(canvas);

  // Prevent the context menu (long press) over the gamepad.
  tc.addEventListener('contextmenu', (e) => e.preventDefault());

  // Safety net: if we lose focus or the tab is hidden, release
  // EVERYTHING held so no button stays "stuck".
  const panic = (): void => {
    releaseAll();
    for (const reset of holdResetters) reset(); // empty the fingers per button.
    clearActiveClasses();
  };
  window.addEventListener('blur', panic);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) panic();
  });
}

/**
 * Syncs which part of the gamepad shows based on the game state.
 * Only touches the DOM if the mode changed (avoids per-frame work).
 * The overworld uses the gameplay gamepad (move + jump to navigate
 * the map), not menu mode.
 */
export function syncTouchUI(ui: TouchUI): void {
  currentUi = ui;
  const mode: TouchMode =
    ui.state === 'playing'
      ? ui.paused
        ? 'paused'
        : 'play'
      : ui.state === 'overworld'
        ? 'play'
        : 'menu';
  if (mode !== currentMode) {
    currentMode = mode;
    if (container) container.dataset.mode = mode;
  }
  // The dash button only shows once the ability is unlocked.
  // A new world (reset) locks it again, so this re-hides it too.
  if (ui.hasDash !== currentHasDash) {
    currentHasDash = ui.hasDash;
    if (dashBtn) dashBtn.style.display = ui.hasDash ? '' : 'none';
  }
}

// ------------------------------------------------------------
//  Internal helpers
// ------------------------------------------------------------

/** Creates a button with no visible text (the face is pixel-art via CSS);
 *  `label` is the accessible name screen readers announce. */
function makeButton(className: string, label: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.setAttribute('aria-label', label);
  return b;
}

/** Hands the CSS a button's two baked faces: idle in --tc-face
 *  and pressed in --tc-face-down (.is-active shows it). */
function applyFace(el: HTMLButtonElement, face: TouchFace): void {
  el.style.setProperty('--tc-face', `url(${face.idle})`);
  el.style.setProperty('--tc-face-down', `url(${face.pressed})`);
}

/**
 * HOLD button (move/jump/dash): the action is active while the finger
 * stays pressed. We capture the pointer so that, even if the finger
 * slides off the button, we still get its "up" and it won't stick.
 */
function bindHold(el: HTMLButtonElement, action: TouchAction): void {
  // A single button can have SEVERAL fingers on it at once (pointer
  // capture). We count the active pointers and only release the action
  // when the LAST one lifts: so if one finger leaves, the other holds it.
  const pointers = new Set<number>();
  const press = (e: PointerEvent): void => {
    e.preventDefault(); // cuts zoom/scroll; does NOT cancel the user activation.
    pointers.add(e.pointerId);
    touchButton(action, true);
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Some browsers reject the capture; not critical.
    }
    el.classList.add('is-active');
  };
  const release = (e: PointerEvent): void => {
    pointers.delete(e.pointerId);
    if (pointers.size > 0) return; // at least one finger still pressed.
    touchButton(action, false);
    el.classList.remove('is-active');
  };
  el.addEventListener('pointerdown', press);
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release); // system gesture, etc.
  el.addEventListener('lostpointercapture', release); // safety net.
  // Forced releaser (for the panic path): empties the fingers and releases the action.
  holdResetters.push(() => {
    pointers.clear();
    touchButton(action, false);
    el.classList.remove('is-active');
  });
  // Never stopPropagation: we let the event run its normal course.
}

/**
 * TAP button (pause/resume/restart): a tap = one "just pressed" edge.
 * It's a PURE edge: we press and release in the same pointerdown, so the
 * action never stays "down" waiting for a pointerup that could be lost
 * when the button self-hides on acting (e.g. on pausing, tc-pause goes
 * display:none before the finger lifts). The "just pressed" is marked
 * anyway and fires once.
 */
function bindTap(el: HTMLButtonElement, action: TouchAction): void {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    touchButton(action, true);
    touchButton(action, false);
  });
}

/**
 * Fullscreen button. Feature-detect: if the browser doesn't expose
 * requestFullscreen on elements (typical iPhone Safari), we hide the
 * button. It fires on lifting the finger (a real gesture).
 */
function bindFullscreen(el: HTMLButtonElement): void {
  const root = document.documentElement;
  if (typeof root.requestFullscreen !== 'function') {
    el.style.display = 'none';
    return;
  }
  el.addEventListener('pointerup', (e) => {
    e.preventDefault();
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void root.requestFullscreen().catch(() => {});
    }
  });
}

/**
 * Tap on the canvas when we're NOT playing (title/won/gameover):
 * counts as "confirm". We listen for the "up" at the window level to
 * release even if the finger lifts outside the canvas. In the overworld
 * it doesn't confirm either: there you navigate with the gamepad (a
 * careless tap shouldn't drop you into a level).
 */
function bindCanvasConfirm(canvas: HTMLCanvasElement): void {
  canvas.addEventListener('pointerdown', (e) => {
    if (currentUi.state === 'playing' || currentUi.state === 'overworld') return;
    e.preventDefault();
    touchButton('confirm', true);
  });
  const release = (): void => {
    touchButton('confirm', false);
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
}

/** Removes the "is-active" highlight from all gamepad buttons. */
function clearActiveClasses(): void {
  if (!container) return;
  for (const el of container.querySelectorAll('.is-active')) {
    el.classList.remove('is-active');
  }
}
