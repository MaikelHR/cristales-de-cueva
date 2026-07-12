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
//  EACH button is customizable: its size and position (and the whole
//  set's opacity) come from `touchLayout`, and the player rearranges
//  them in a drag EDITOR (opened from the pause menu) — because a
//  fixed pad never fits every thumb. The default layout reproduces
//  the classic arrangement, so nothing changes until you touch it.
//
//  On desktop this module does absolutely NOTHING: if the pointer
//  isn't "coarse" (touch), we bail out before touching the DOM.
// ============================================================

import { touchButton, releaseAll, setDevice, setTouchMode } from '../engine/input';
import { t, onLangChange } from './i18n';
import { bakeControlFaces, bakeMenuFace, bakeStickFaces, type TouchFace } from './ui/touchButtons';
import type { UiState } from './scenes/Scene';
import {
  TOUCH_BTNS,
  getBtnState,
  getOpacity,
  getMove,
  toggleMove,
  nudgeScale,
  nudgeOpacity,
  mirror as mirrorLayout,
  reset as resetLayout,
  dragBtnTo,
  commit,
  onLayoutChange,
  type TouchBtnId,
} from './touchLayout';

/** Interface state the game passes us to decide what to show.
 *  `hasDash` says whether dash is already unlocked (to show its button). */
type TouchUI = UiState & { hasDash: boolean };

/** Visibility mode of the gamepad; the CSS decides what shows in each. */
type TouchMode = 'play' | 'paused' | 'menu';

/** Which pause menu the DOM shows: the one inside a level, or the map's. */
type PauseCtx = 'game' | 'overworld';

// We keep the last known state for two things: to avoid touching
// the DOM if it didn't change (data-mode) and to know, when the
// canvas is tapped, whether we're in a menu (tap = confirm) or playing (ignored).
let currentUi: TouchUI = { state: 'title', paused: false, hasDash: false };
let container: HTMLDivElement | null = null;
let currentMode: TouchMode | null = null;
let currentPauseCtx: PauseCtx | null = null;
// The dash button is kept apart: its visibility depends on whether dash
// is already unlocked (starts hidden), not on the mode.
let dashBtn: HTMLButtonElement | null = null;
let currentHasDash = false;
// The customizable buttons by id, so the layout can size/place them.
const btnEls = new Map<TouchBtnId, HTMLButtonElement>();

// --- Sliding d-pad ---
// The HOLD buttons (move + jump/dash) form a single sliding surface: a
// finger keeps acting on WHICHEVER hold button it's currently over, so you
// can slide your thumb left->right->down without lifting. We hit-test the
// finger position each move (document.elementFromPoint, which ignores the
// pointer-events:none layer) and switch the pressed action. Each action is
// ref-counted over fingers so two thumbs / a slide-and-back never desync
// the held state or the highlight.
const HOLD_ACTIONS = new Set<TouchAction>(['left', 'right', 'down', 'jump', 'dash']);
// Only MOVEMENT slides. Jump/dash stay STICKY (held until the finger lifts,
// wherever it drifts): making them slide targets meant a thumb wandering a few
// px off JUMP cut the glide short, and wandering back re-fired a jump edge —
// you'd silently burn the double jump. Movement is what you slide between.
const SLIDE_ACTIONS = new Set<TouchAction>(['left', 'right', 'down']);
const actionCount = new Map<TouchAction, number>(); // fingers currently on each action
const actionEl = new Map<TouchAction, HTMLButtonElement>(); // for the highlight
const pointerAction = new Map<number, TouchAction | null>(); // a sliding finger's action
const pointerSticky = new Map<number, TouchAction>(); // a finger holding jump/dash

// --- Joystick (the optional movement stick) ---
// One finger in the socket drives left/right/down at once (a diagonal holds
// left AND down), so unlike a d-pad button it owns a SET of actions. It feeds
// the very same ref-counted press/release, so panic/resetHold clear it too.
let stickBase: HTMLButtonElement | null = null;
let stickKnob: HTMLDivElement | null = null;
let stickPointer: number | null = null;
const stickActive = new Set<TouchAction>();
const KNOB_RATIO = 16 / 32; // knob / socket, straight from the native art
const KNOB_TRAVEL = 0.45; // how far the knob rides out, as a fraction of the socket radius
const DEAD_X = 0.3; // sideways deadzone (of the full throw)
const DEAD_Y = 0.55; // down needs a deliberate push: it drops through planks and pounds

// --- Layout editor state ---
// While editing, the gameplay buttons don't drive the game: they're
// dragged around. `selectedId` is the button the size +/- act on.
let editing = false;
let selectedId: TouchBtnId = 'jump';
let editBar: HTMLDivElement | null = null;
let selChip: HTMLSpanElement | null = null;
let movePill: HTMLButtonElement | null = null;
const SIZE_STEP = 0.15;
const OPACITY_STEP = 0.15;

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
  tc.dataset.pausectx = 'game'; // which pause menu: in a level, or on the map

  // The buttons carry NO text in the DOM: their face is pixel-art baked
  // by code (ui/touchButtons.ts) that the CSS stretches without blurring.
  // The aria-label (screen readers) does come from the language dictionary.
  // All six gameplay buttons live in ONE layer: they're positioned
  // absolutely from the layout (size, place and opacity are per-button).
  const layer = document.createElement('div');
  layer.className = 'tc-game';
  const btnPause = makeButton('tc-btn tc-pause', t('tc_pause_aria'));
  const btnLeft = makeButton('tc-btn tc-left', t('tc_left_aria'));
  // Down: navigates menus and drops through planks (down+jump).
  const btnDown = makeButton('tc-btn tc-down', t('tc_down_aria'));
  const btnRight = makeButton('tc-btn tc-right', t('tc_right_aria'));
  const btnDash = makeButton('tc-btn tc-dash', t('tc_dash_aria'));
  // Dash starts locked: we hide its button until it's unlocked
  // (syncTouchUI shows it when the game reports hasDash).
  btnDash.style.display = 'none';
  dashBtn = btnDash;
  const btnJump = makeButton('tc-btn tc-jump', t('tc_jump_aria'));
  // The joystick: an ALTERNATIVE to the d-pad (data-move picks which shows).
  // The knob lives inside the socket so it scales and moves with it.
  const stick = makeButton('tc-btn tc-stick', t('tc_stick_aria'));
  const knob = document.createElement('div');
  knob.className = 'tc-stick-knob';
  stick.appendChild(knob);
  stickBase = stick;
  stickKnob = knob;
  layer.append(btnPause, btnLeft, btnDown, btnRight, btnDash, btnJump, stick);
  btnEls.set('pause', btnPause);
  btnEls.set('left', btnLeft);
  btnEls.set('down', btnDown);
  btnEls.set('right', btnRight);
  btnEls.set('dash', btnDash);
  btnEls.set('jump', btnJump);
  btnEls.set('stick', stick);

  // Pause menu (center).
  const menu = document.createElement('div');
  menu.className = 'tc-menu';
  const btnResume = makeButton('tc-btn tc-mbtn tc-resume', t('tc_resume'));
  const btnFs = makeButton('tc-btn tc-mbtn tc-fs', t('tc_fs'));
  const btnRestart = makeButton('tc-btn tc-mbtn tc-restart', t('tc_restart'));
  const btnControls = makeButton('tc-btn tc-mbtn tc-controls', t('tc_controls'));
  // The last two are context-dependent (CSS, via data-pausectx): in a level
  // you get "exit to map"; on the map you get "main menu" instead (there's
  // no run to abandon, and no level to restart either).
  const btnMap = makeButton('tc-btn tc-mbtn tc-map', t('tc_map'));
  const btnTitle = makeButton('tc-btn tc-mbtn tc-title', t('tc_title'));
  menu.append(btnResume, btnFs, btnRestart, btnControls, btnMap, btnTitle);

  // Layout editor toolbar (top strip; shown only while editing).
  const bar = buildEditBar();

  // Pixel-art faces for the gameplay buttons (fixed: their glyphs are
  // icons, not language-dependent).
  const faces = bakeControlFaces();
  applyFace(btnPause, faces.pause);
  applyFace(btnLeft, faces.left);
  applyFace(btnDown, faces.down);
  applyFace(btnRight, faces.right);
  applyFace(btnDash, faces.dash);
  applyFace(btnJump, faces.jump);
  const stickFaces = bakeStickFaces();
  applyFace(stick, stickFaces.base);
  applyFace(knob, stickFaces.knob); // the knob swaps face with .tc-stick.is-active

  // The menu faces carry their label BAKED in with the game font:
  // they're re-baked on language change and when the font finishes
  // loading (if baked earlier, they got the system fallback font).
  const bakeMenus = (): void => {
    applyFace(btnResume, bakeMenuFace(t('tc_resume'), true));
    applyFace(btnFs, bakeMenuFace(t('tc_fs')));
    applyFace(btnRestart, bakeMenuFace(t('tc_restart')));
    applyFace(btnControls, bakeMenuFace(t('tc_controls')));
    applyFace(btnMap, bakeMenuFace(t('tc_map')));
    applyFace(btnTitle, bakeMenuFace(t('tc_title')));
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
    stick.setAttribute('aria-label', t('tc_stick_aria'));
    btnResume.setAttribute('aria-label', t('tc_resume'));
    btnFs.setAttribute('aria-label', t('tc_fs'));
    btnRestart.setAttribute('aria-label', t('tc_restart'));
    btnControls.setAttribute('aria-label', t('tc_controls'));
    btnMap.setAttribute('aria-label', t('tc_map'));
    btnTitle.setAttribute('aria-label', t('tc_title'));
    bakeMenus();
    relocalizeEditBar();
    refreshSelected();
  };
  onLangChange(relocalize);

  // Hidden probe carrying the safe-area insets in its padding (see refreshInsets).
  const probe = document.createElement('div');
  probe.className = 'tc-safe';
  tc.append(layer, menu, bar, probe);
  document.body.appendChild(tc);
  container = tc;
  editBar = bar;
  safeProbe = probe;
  refreshInsets();
  // These caches gate the DOM writes. On the DEFERRED path (a hybrid device
  // where we only build on the first real touch) syncTouchUI has been running
  // for a while and already cached a mode/context from when there was no DOM —
  // it would then never write them. Forget them so the next sync paints for real.
  currentMode = null;
  currentPauseCtx = null;

  // --- Event wiring ---
  // MOVEMENT: one sliding surface — a thumb can travel left -> right -> down
  // without ever lifting, and the action follows the button it's over.
  bindSlideButton(btnLeft, 'left');
  bindSlideButton(btnDown, 'down');
  bindSlideButton(btnRight, 'right');
  // JUMP/DASH: sticky. Held until the finger lifts, so a drifting thumb can't
  // cut a glide short or re-fire the jump.
  bindStickyHold(btnJump, 'jump');
  bindStickyHold(btnDash, 'dash');

  // The joystick drives the same three movement actions, its own way.
  bindStick(stick, knob);

  // TAP: active for one instant (a "just pressed" edge).
  bindTap(btnPause, 'pause');
  bindTap(btnResume, 'pause'); // "Resume" toggles the same pause.
  bindTap(btnRestart, 'restart');
  bindTap(btnMap, 'quit'); // "Exit to map": the pause turns it into a scene.
  bindTap(btnTitle, 'quit'); // "Main menu": same action, the MAP's pause reads it.
  bindPress(btnControls, enterEdit); // "Controls": opens the drag editor.

  // Every gameplay button is also a drag handle while editing.
  for (const [id, el] of btnEls) bindEditDrag(el, id);

  // Fullscreen: only if the browser supports it for elements.
  bindFullscreen(btnFs);

  // Tap on the canvas in menu mode -> confirm (title/won/gameover).
  bindCanvasConfirm(canvas);

  // Prevent the context menu (long press) over the gamepad.
  tc.addEventListener('contextmenu', (e) => e.preventDefault());

  // The layout drives size/position/opacity; re-apply on any change and
  // when the viewport resizes/rotates (fractions -> pixels).
  onLayoutChange(applyLayout);
  window.addEventListener('resize', () => {
    refreshInsets(); // rotating changes which side the notch is on
    applyLayout();
  });
  applyLayout();

  // Safety net: if we lose focus or the tab is hidden, release
  // EVERYTHING held so no button stays "stuck".
  const panic = (): void => {
    releaseAll();
    resetHold(); // empty every finger + action count.
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
  // Paused wins: a LEVEL or the MAP can be paused, and both show the DOM
  // menu. Otherwise the map is driven with the same gamepad as a level
  // (walk + jump), and everything else is a canvas menu.
  const mode: TouchMode = ui.paused
    ? 'paused'
    : ui.state === 'playing' || ui.state === 'overworld'
      ? 'play'
      : 'menu';
  // Which pause menu: a level's (restart / exit to map) or the map's
  // (main menu). The CSS picks the buttons from this.
  const ctx: PauseCtx = ui.state === 'overworld' ? 'overworld' : 'game';
  if (ctx !== currentPauseCtx) {
    currentPauseCtx = ctx;
    if (container) container.dataset.pausectx = ctx;
  }
  if (mode !== currentMode) {
    currentMode = mode;
    if (container) container.dataset.mode = mode;
    // Leaving gameplay HIDES the buttons: drop any finger still holding one
    // so a movement can't stay stuck down while we're away (and be waiting,
    // still held, when the player comes back).
    if (mode !== 'play') resetHold();
    // The editor only makes sense over the frozen, paused game. ANY scene
    // change away from paused (game over, exit to map, restart — some
    // reachable via a gamepad while the DOM menu is hidden) closes it, so
    // its toolbar never strands over the overworld or a live level.
    if (editing && mode !== 'paused') exitEdit();
  }
  // The dash button only shows once the ability is unlocked.
  // A new world (reset) locks it again, so this re-hides it too.
  // While editing we force it visible (below) so it can be placed.
  if (ui.hasDash !== currentHasDash) {
    currentHasDash = ui.hasDash;
    if (dashBtn && !editing) dashBtn.style.display = ui.hasDash ? '' : 'none';
  }
}

// ------------------------------------------------------------
//  Layout: turning the (fraction, scale) data into pixels
// ------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

/** The responsive base size of a d-pad button, in px (same as the old
 *  `--tc-btn`): 13% of the viewport height, clamped to [48, 62]. */
function unit(): number {
  return clamp(window.innerHeight * 0.13, 48, 62);
}

// The notch / home indicator. The old CSS kept the buttons clear of them with
// env(safe-area-inset-*); now that we place them from JS we have to honour the
// insets ourselves, or on a notched phone (viewport-fit=cover) the controls
// slide under the cutout. A hidden probe carries the env() values in its
// padding — the only way to read them from script — and we cache them, since
// they only change on resize/rotate.
let safeProbe: HTMLDivElement | null = null;
let insets = { top: 0, right: 0, bottom: 0, left: 0 };

function refreshInsets(): void {
  if (!safeProbe) return;
  const cs = getComputedStyle(safeProbe);
  insets = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
}

/** Sizes and places ONE button from its layout state. Width follows the
 *  base size × scale; height keeps the native aspect (square pixels).
 *  The center is clamped so the button never sits off-screen. */
function layoutButton(id: TouchBtnId): void {
  const el = btnEls.get(id);
  const base = TOUCH_BTNS.find((b) => b.id === id);
  if (!el || !base) return;
  const st = getBtnState(id);
  const w = unit() * base.bw * st.s;
  const h = w / base.aspect;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Keep the whole control on screen AND clear of the notch/home indicator.
  const loX = insets.left + w / 2;
  const loY = insets.top + h / 2;
  const cx = clamp(st.x * vw, loX, Math.max(loX, vw - insets.right - w / 2));
  const cy = clamp(st.y * vh, loY, Math.max(loY, vh - insets.bottom - h / 2));
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.left = `${cx}px`;
  el.style.top = `${cy}px`;
  // Opacity goes on EACH button, not the layer: a layer with opacity<1
  // becomes a stacking context that would trap the buttons BEHIND the
  // edit toolbar. Opacity never affects hit-testing, so a faint button
  // is still fully tappable/draggable.
  el.style.opacity = String(getOpacity());
  // The knob rides inside the socket, so it scales with it.
  if (id === 'stick' && stickKnob) {
    const k = w * KNOB_RATIO;
    stickKnob.style.width = `${k}px`;
    stickKnob.style.height = `${k}px`;
  }
}

/** Re-applies the whole layout: size, position and opacity of every control,
 *  plus which movement control is on (the CSS reads data-move). */
function applyLayout(): void {
  for (const b of TOUCH_BTNS) layoutButton(b.id);
  if (container) container.dataset.move = getMove();
  refreshMovePill();
}

// ------------------------------------------------------------
//  Layout editor
// ------------------------------------------------------------

/** Opens the drag editor (from the pause menu). The gameplay buttons
 *  become draggable over the frozen game; the toolbar tweaks size,
 *  opacity, mirror and reset. */
function enterEdit(): void {
  editing = true;
  selectedId = getMove() === 'stick' ? 'stick' : 'jump';
  // Show dash even if still locked, so it can be pre-placed.
  if (dashBtn) dashBtn.style.display = '';
  if (container) container.dataset.editing = '1';
  // The lang/skin chips are hidden via a BODY class, not a sibling selector:
  // on the deferred build path .tc is appended after them, so `~` never matched.
  document.body.classList.add('tc-editing');
  refreshSelected();
}

/** Closes the editor: back to the pause menu, dash visibility restored. */
function exitEdit(): void {
  editing = false;
  if (container) container.removeAttribute('data-editing');
  document.body.classList.remove('tc-editing');
  if (dashBtn) dashBtn.style.display = currentHasDash ? '' : 'none';
  refreshSelected(); // drop the selection highlight.
}

/** Builds the editor toolbar (hidden until editing). Text labels go
 *  through i18n (relocalizeEditBar re-applies them on language change). */
function buildEditBar(): HTMLDivElement {
  const bar = document.createElement('div');
  bar.className = 'tc-editbar';

  const hint = document.createElement('p');
  hint.className = 'tc-edit-hint';
  hint.dataset.key = 'tc_edit_hint';
  hint.textContent = t('tc_edit_hint'); // relocalizeEditBar refreshes it on lang change
  bar.appendChild(hint);

  const row = document.createElement('div');
  row.className = 'tc-edit-row';

  // Which button the size buttons act on (updated on selecting one).
  selChip = document.createElement('span');
  selChip.className = 'tc-edit-sel';
  row.appendChild(selChip);

  // Size -/+ (acts on the selected button).
  row.appendChild(
    makeStepper('tc_edit_size', () => nudgeScale(selectedId, -SIZE_STEP), () =>
      nudgeScale(selectedId, SIZE_STEP),
    ),
  );
  // Opacity -/+ (global).
  row.appendChild(
    makeStepper('tc_edit_opacity', () => nudgeOpacity(-OPACITY_STEP), () =>
      nudgeOpacity(OPACITY_STEP),
    ),
  );
  // Movement style: the three d-pad buttons, or the joystick.
  movePill = makeEpButton('', () => {
    toggleMove();
    // Point the size +/- at a control that's actually on screen now.
    selectedId = getMove() === 'stick' ? 'stick' : 'left';
    refreshSelected();
  });
  refreshMovePill();
  row.appendChild(movePill);
  // Mirror / Reset / Done.
  row.appendChild(makePill('tc_edit_mirror', mirrorLayout));
  row.appendChild(makePill('tc_edit_reset', resetLayout));
  row.appendChild(makePill('tc_edit_done', exitEdit, 'tc-ep-done'));

  bar.appendChild(row);
  return bar;
}

/** A labeled -/+ stepper (Size, Opacity). */
function makeStepper(
  labelKey: Parameters<typeof t>[0],
  onMinus: () => void,
  onPlus: () => void,
): HTMLDivElement {
  const g = document.createElement('div');
  g.className = 'tc-edit-group';
  const label = document.createElement('span');
  label.className = 'tc-edit-label';
  label.dataset.key = labelKey;
  label.textContent = t(labelKey);
  // The -/+ glyphs alone are indistinguishable to a screen reader, so each
  // gets an aria-label naming its group ("Tamaño −" / "Size +"); the
  // dataset key lets relocalizeEditBar refresh it on a language change.
  const minus = makeEpButton('−', onMinus);
  const plus = makeEpButton('+', onPlus);
  for (const b of [minus, plus]) {
    b.dataset.ariaKey = labelKey;
    b.setAttribute('aria-label', `${t(labelKey)} ${b.textContent ?? ''}`);
  }
  g.append(label, minus, plus);
  return g;
}

/** A single text pill button (Mirror/Reset/Done). */
function makePill(
  labelKey: Parameters<typeof t>[0],
  onTap: () => void,
  extra = '',
): HTMLButtonElement {
  const b = makeEpButton(t(labelKey), onTap, extra);
  b.dataset.key = labelKey;
  return b;
}

/** A styled editor button wired to fire on pointerdown (immediate). */
function makeEpButton(text: string, onTap: () => void, extra = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `tc-ep${extra ? ` ${extra}` : ''}`;
  b.textContent = text;
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onTap();
  });
  return b;
}

/** Re-applies the editor's localized text: visible labels (data-key) and
 *  the -/+ steppers' aria-labels (data-aria-key). */
function relocalizeEditBar(): void {
  if (!editBar) return;
  for (const el of editBar.querySelectorAll<HTMLElement>('[data-key]')) {
    const key = el.dataset.key as Parameters<typeof t>[0] | undefined;
    if (key) el.textContent = t(key);
  }
  for (const el of editBar.querySelectorAll<HTMLElement>('[data-aria-key]')) {
    const key = el.dataset.ariaKey as Parameters<typeof t>[0] | undefined;
    if (key) el.setAttribute('aria-label', `${t(key)} ${el.textContent ?? ''}`);
  }
  refreshMovePill(); // its text is built from two keys, not one
}

/** The movement toggle shows the ACTIVE style ("Mover: Joystick"). */
function refreshMovePill(): void {
  if (!movePill) return;
  const val = t(getMove() === 'stick' ? 'tc_move_stick' : 'tc_move_dpad');
  const label = `${t('tc_edit_move')}: ${val}`;
  movePill.textContent = label;
  movePill.setAttribute('aria-label', label);
}

/** Highlights the selected button and names it in the toolbar chip. */
function refreshSelected(): void {
  for (const [id, el] of btnEls) el.classList.toggle('is-selected', editing && id === selectedId);
  if (selChip) {
    const base = TOUCH_BTNS.find((b) => b.id === selectedId);
    selChip.textContent = base ? t(base.ariaKey) : '';
  }
}

/** Makes a gameplay button draggable WHILE editing: drag to move,
 *  a plain tap just selects it (so the size +/- target it). Uses
 *  pointer capture so the drag follows the finger off the button. */
function bindEditDrag(el: HTMLButtonElement, id: TouchBtnId): void {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startCX = 0;
  let startCY = 0;
  el.addEventListener('pointerdown', (e) => {
    if (!editing) return; // not editing: the normal HOLD/TAP handlers run.
    e.preventDefault();
    e.stopPropagation();
    selectedId = id;
    refreshSelected();
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    // Anchor to the button's ACTUAL rendered center, not the stored
    // fraction: near a screen edge layoutButton clamps the pixel center
    // inward (keeping the button on-screen) while the stored fraction
    // saturates at 0/1, so seeding from the fraction would give a
    // dead-zone on re-grab. The rect is the truth on screen.
    const rect = el.getBoundingClientRect();
    startCX = rect.left + rect.width / 2;
    startCY = rect.top + rect.height / 2;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Some browsers reject the capture; the drag still tracks via move.
    }
  });
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    e.preventDefault();
    const nx = (startCX + (e.clientX - startX)) / window.innerWidth;
    const ny = (startCY + (e.clientY - startY)) / window.innerHeight;
    dragBtnTo(id, nx, ny); // live, no storage write per frame
    layoutButton(id);
  });
  const end = (): void => {
    if (!dragging) return;
    dragging = false;
    commit(); // persist once the finger lifts
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('lostpointercapture', end);
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
function applyFace(el: HTMLElement, face: TouchFace): void {
  el.style.setProperty('--tc-face', `url(${face.idle})`);
  el.style.setProperty('--tc-face-down', `url(${face.pressed})`);
}

/** Presses an action when its FIRST finger arrives (marks the rising edge
 *  once) and lights its button. */
function pressAction(a: TouchAction): void {
  const n = (actionCount.get(a) ?? 0) + 1;
  actionCount.set(a, n);
  if (n === 1) {
    touchButton(a, true);
    actionEl.get(a)?.classList.add('is-active');
  }
}

/** Releases an action when its LAST finger leaves (so a second thumb, or a
 *  slide-and-back, keeps it held). */
function releaseAction(a: TouchAction): void {
  const n = (actionCount.get(a) ?? 0) - 1;
  if (n <= 0) {
    actionCount.set(a, 0);
    touchButton(a, false);
    actionEl.get(a)?.classList.remove('is-active');
  } else {
    actionCount.set(a, n);
  }
}

/** Switches a finger's action to `a` (or none): releases the previous and
 *  presses the new only on an actual change. */
function setPointerAction(id: number, a: TouchAction | null): void {
  const cur = pointerAction.get(id) ?? null;
  if (cur === a) return;
  if (cur) releaseAction(cur);
  if (a) pressAction(a);
  pointerAction.set(id, a);
}

/** The MOVEMENT action under a screen point, or null (over a gap, jump/dash,
 *  the pause button, or nothing). elementFromPoint skips the
 *  pointer-events:none layer, so it returns the button itself or the canvas
 *  beneath — and it ignores pointer capture, which is exactly what we need. */
function hitTestSlide(x: number, y: number): TouchAction | null {
  const btn = document.elementFromPoint(x, y)?.closest<HTMLElement>('.tc-btn');
  const a = btn?.dataset.action as TouchAction | undefined;
  return a && SLIDE_ACTIONS.has(a) ? a : null;
}

/** Clears every finger and held action (panic path / lost focus / leaving
 *  gameplay). */
function resetHold(): void {
  // Desktop never builds the gamepad — and bailing here is not just an
  // optimization: touchButton() sets the engine's lastDevice to 'touch', so
  // calling it from a keyboard session would flip every canvas menu to its
  // touch variant. syncTouchUI runs on desktop too, so this guard is load-bearing.
  if (!container) return;
  for (const a of HOLD_ACTIONS) {
    // Only release what we're actually holding, for the same reason.
    if ((actionCount.get(a) ?? 0) > 0) touchButton(a, false);
    actionCount.set(a, 0);
    actionEl.get(a)?.classList.remove('is-active');
  }
  pointerAction.clear();
  pointerSticky.clear();
  stickPointer = null;
  stickActive.clear();
  centerKnob();
  stickBase?.classList.remove('is-active');
}

/** Drops the knob back into the middle of its socket. */
function centerKnob(): void {
  if (stickKnob) stickKnob.style.transform = 'translate(-50%, -50%)';
}

/** Swaps the joystick's held actions to `next`, pressing/releasing only what
 *  actually changed (so holding left while adding down doesn't re-fire left). */
function setStickActions(next: Set<TouchAction>): void {
  for (const a of stickActive) if (!next.has(a)) releaseAction(a);
  for (const a of next) if (!stickActive.has(a)) pressAction(a);
  stickActive.clear();
  for (const a of next) stickActive.add(a);
}

/**
 * The movement joystick: one finger in the socket. We read the thumb's offset
 * from the socket's centre, clamp it to the circle, ride the knob out along it
 * and turn it into the SAME left/right/down actions the d-pad emits — a
 * diagonal legitimately holds two at once. Down has a deeper deadzone than
 * sideways: it drops you through planks and ground-pounds, so it must be
 * deliberate, never a thumb drifting low while running.
 */
function bindStick(base: HTMLButtonElement, knob: HTMLDivElement): void {
  const track = (e: PointerEvent): void => {
    const r = base.getBoundingClientRect();
    const radius = r.width / 2;
    if (radius <= 0) return;
    let dx = (e.clientX - (r.left + radius)) / radius;
    let dy = (e.clientY - (r.top + r.height / 2)) / radius;
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len; // clamp the throw to the socket
      dy /= len;
    }
    const tx = dx * radius * KNOB_TRAVEL;
    const ty = dy * radius * KNOB_TRAVEL;
    knob.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`;

    const next = new Set<TouchAction>();
    if (dx < -DEAD_X) next.add('left');
    else if (dx > DEAD_X) next.add('right');
    if (dy > DEAD_Y) next.add('down');
    setStickActions(next);
  };

  const end = (e: PointerEvent): void => {
    if (stickPointer !== e.pointerId) return;
    stickPointer = null;
    setStickActions(new Set());
    centerKnob();
    base.classList.remove('is-active');
  };

  base.addEventListener('pointerdown', (e) => {
    if (editing) return; // in the editor the socket is a drag handle.
    if (stickPointer !== null) return; // one thumb owns the stick.
    e.preventDefault();
    stickPointer = e.pointerId;
    try {
      base.setPointerCapture(e.pointerId);
    } catch {
      // Some browsers reject the capture; the stick still tracks via move.
    }
    base.classList.add('is-active');
    track(e);
  });
  base.addEventListener('pointermove', (e) => {
    if (stickPointer !== e.pointerId) return;
    e.preventDefault();
    track(e);
  });
  base.addEventListener('pointerup', end);
  base.addEventListener('pointercancel', end);
  base.addEventListener('lostpointercapture', end);
}

/**
 * A HOLD button that is part of the sliding d-pad. A finger presses to
 * start, then keeps acting on whichever hold button it's over — slide from
 * left to right (or down) to switch actions WITHOUT lifting. We capture the
 * pointer on the button it started on (so we keep receiving its moves/up)
 * and hit-test the finger each move to decide the current action.
 */
function bindSlideButton(el: HTMLButtonElement, action: TouchAction): void {
  el.dataset.action = action; // read back by hitTestSlide
  actionEl.set(action, el);
  el.addEventListener('pointerdown', (e) => {
    if (editing) return; // in the editor this button is a drag handle.
    e.preventDefault(); // cuts zoom/scroll; does NOT cancel the user activation.
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Some browsers reject the capture; the slide still tracks via move.
    }
    setPointerAction(e.pointerId, hitTestSlide(e.clientX, e.clientY) ?? action);
  });
  el.addEventListener('pointermove', (e) => {
    if (!pointerAction.has(e.pointerId)) return; // not a finger we're tracking.
    e.preventDefault();
    setPointerAction(e.pointerId, hitTestSlide(e.clientX, e.clientY));
  });
  const end = (e: PointerEvent): void => {
    if (!pointerAction.has(e.pointerId)) return;
    setPointerAction(e.pointerId, null);
    pointerAction.delete(e.pointerId);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end); // system gesture, etc.
  el.addEventListener('lostpointercapture', end); // safety net.
  // Never stopPropagation: we let the event run its normal course.
}

/**
 * A STICKY hold button (jump/dash). The action is held from the moment the
 * finger lands until it LIFTS, no matter where it drifts — the pointer is
 * captured, so sliding a few px off the edge mid-jump can't cut a glide short
 * or (on drifting back) re-fire the jump. Several fingers on it are
 * ref-counted like everything else.
 */
function bindStickyHold(el: HTMLButtonElement, action: TouchAction): void {
  actionEl.set(action, el);
  el.addEventListener('pointerdown', (e) => {
    if (editing) return; // in the editor this button is a drag handle.
    if (pointerSticky.has(e.pointerId)) return;
    e.preventDefault();
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Some browsers reject the capture; not critical.
    }
    pointerSticky.set(e.pointerId, action);
    pressAction(action);
  });
  const end = (e: PointerEvent): void => {
    const a = pointerSticky.get(e.pointerId);
    if (a === undefined) return; // not a press we tracked (e.g. it began while editing).
    pointerSticky.delete(e.pointerId);
    releaseAction(a);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('lostpointercapture', end);
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
    if (editing) return; // pause button doubles as a drag handle while editing.
    e.preventDefault();
    touchButton(action, true);
    touchButton(action, false);
  });
}

/** A DOM control that runs a callback on tap (not a game action). */
function bindPress(el: HTMLButtonElement, onTap: () => void): void {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    onTap();
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
