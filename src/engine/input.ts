// ============================================================
//  INPUT: keyboard + gamepad
// ------------------------------------------------------------
//  We translate physical inputs into "actions" (left, right, jump...).
//  This way the rest of the game never asks about a specific key or
//  button, only the intent. The keyboard arrives via events; the
//  gamepad is POLLED every frame (the browser API doesn't notify,
//  you have to ask it for the state). Both feed the same actions,
//  so the game doesn't distinguish where the command comes from.
//
//  We also remember the LAST device used so the UI shows the correct
//  controls (keys or buttons) instantly.
// ============================================================

// 'up'/'down' are for NAVIGATING MENUS; 'quit' is "exit to map" (emitted
// by the touch button of the pause menu; on keyboard/gamepad it's chosen in the menu).
type Action =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'jump'
  | 'dash'
  | 'restart'
  | 'confirm'
  | 'pause'
  | 'quit';

/** What the player used last: defines which controls to show. */
export type InputDevice = 'keyboard' | 'gamepad' | 'touch';

// A key can stand for SEVERAL actions: ↑/W are jump (in play) and up
// (in a menu); space jumps and also confirms (activating in menus).
// Each screen reads only the actions it cares about, so they don't clash.
const KEY_TO_ACTION: Record<string, Action[]> = {
  ArrowLeft: ['left'],
  a: ['left'],
  A: ['left'],
  ArrowRight: ['right'],
  d: ['right'],
  D: ['right'],
  ArrowUp: ['jump', 'up'],
  w: ['jump', 'up'],
  W: ['jump', 'up'],
  ArrowDown: ['down'],
  s: ['down'],
  S: ['down'],
  ' ': ['jump', 'confirm'],
  Shift: ['dash'],
  x: ['dash'],
  X: ['dash'],
  r: ['restart'],
  R: ['restart'],
  Enter: ['confirm'],
  Escape: ['pause'],
  p: ['pause'],
  P: ['pause'],
};

// KEYBOARD state (via events).
const down = new Set<Action>();
const pressedThisStep = new Set<Action>();

// GAMEPAD state (via polling). We keep it separate and merge it into
// queries, because the keyboard toggles on/off with events and the
// gamepad is rebuilt entirely on each poll.
const gpDown = new Set<Action>();
const gpPressed = new Set<Action>();
let gpPrev = new Set<Action>();

let lastDevice: InputDevice = 'keyboard';

// FIXED touch capability of the device (doesn't change once detected).
// The touch module turns it on at startup if the device has a touch
// screen; the rest of the game queries it to decide the mobile layout.
let touchMode = false;

export function initInput(): void {
  window.addEventListener('keydown', (e) => {
    const actions = KEY_TO_ACTION[e.key];
    if (!actions) return;
    e.preventDefault();
    for (const action of actions) {
      if (!down.has(action)) pressedThisStep.add(action);
      down.add(action);
    }
    lastDevice = 'keyboard';
  });

  window.addEventListener('keyup', (e) => {
    const actions = KEY_TO_ACTION[e.key];
    if (!actions) return;
    for (const action of actions) down.delete(action);
  });
}

// Gamepad button mapping (browser "standard" layout; works for both
// Xbox AND PlayStation, the browser already translates them):
//   0 = down (A / ✕)   1 = right (B / ○)   2 = left (X / □)
//   3 = up (Y / △)  4/5 = L1/R1   6/7 = L2/R2
//   8 = Select/Share    9 = Start/Options
//   12/13/14/15 = d-pad up/down/left/right
//   axes[0] = left stick horizontal
const STICK_DEADZONE = 0.4;

/** The "flavor" of the connected pad: decides which labels the UI shows
 *  (A/X/Y/START for generic-Xbox, ✕/□/△/OPTIONS for PlayStation). */
export type PadFlavor = 'generic' | 'playstation';

let padFlavor: PadFlavor = 'generic';

/** Does the pad id smell like PlayStation? (DualShock/DualSense, or the
 *  Sony vendor id 054c that Chrome and Firefox report). */
function detectFlavor(id: string): PadFlavor {
  return /playstation|dual\s?shock|dual\s?sense|sony|054c/i.test(id)
    ? 'playstation'
    : 'generic';
}

/** Polls the first connected gamepad and translates its state into actions.
 *  Call once per logic step, before reading the actions. */
export function pollGamepad(): void {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let pad: Gamepad | null = null;
  for (const p of pads) {
    if (p) {
      pad = p;
      break;
    }
  }

  gpPressed.clear();
  gpDown.clear();
  if (!pad) {
    gpPrev.clear();
    return;
  }
  padFlavor = detectFlavor(pad.id);

  const b = pad.buttons;
  const on = (i: number): boolean => !!b[i]?.pressed;
  const axX = pad.axes[0] ?? 0;
  const axY = pad.axes[1] ?? 0;
  // Pads the browser couldn't normalize (mapping != 'standard'):
  // we also accept the typical raw order of a DS4 (0=□ 1=✕ 2=○ 3=△),
  // so jump/confirm respond even if the mapping comes shifted.
  const raw = pad.mapping !== 'standard';

  const next = new Set<Action>();
  if (on(14) || axX < -STICK_DEADZONE) next.add('left');
  if (on(15) || axX > STICK_DEADZONE) next.add('right');
  if (on(12) || axY < -STICK_DEADZONE) next.add('up'); // for navigating menus
  if (on(13) || axY > STICK_DEADZONE) next.add('down');
  if (on(0) || on(12) || (raw && on(1))) next.add('jump'); // A/✕ or d-pad up
  if (on(2) || on(4) || on(5) || on(6) || on(7)) next.add('dash'); // X/□ or shoulders/triggers
  if (on(0) || on(9) || (raw && on(1))) next.add('confirm'); // A/✕ or Start (for menus)
  if (on(9) || on(8)) next.add('pause'); // Start/Options (and Select/Share)
  if (on(3)) next.add('restart'); // Y/△

  for (const a of next) {
    gpDown.add(a);
    if (!gpPrev.has(a)) gpPressed.add(a); // rising edge = "just pressed"
  }
  gpPrev = next;
  if (next.size > 0) lastDevice = 'gamepad';
}

/** The button labels for the UI text, based on the pad seen last.
 *  With the short keys the dictionaries use:
 *  {j}=jump {d}=dash {r}=restart {p}=pause. */
export function padLabels(): { j: string; d: string; r: string; p: string } {
  return padFlavor === 'playstation'
    ? { j: '✕', d: '□', r: '△', p: 'OPTIONS' }
    : { j: 'A', d: 'X', r: 'Y', p: 'START' };
}

/** Is the action being held right now? (keyboard or gamepad) */
export function isDown(action: Action): boolean {
  return down.has(action) || gpDown.has(action);
}

/** Was the action just pressed in this logic step? (keyboard or gamepad) */
export function justPressed(action: Action): boolean {
  return pressedThisStep.has(action) || gpPressed.has(action);
}

/** The last device the player used (for showing the controls). */
export function inputDevice(): InputDevice {
  return lastDevice;
}

/** Call at the end of each logic step to clear the "just pressed" set. */
export function endStep(): void {
  pressedThisStep.clear();
}

// ------------------------------------------------------------
//  TOUCH INPUT (on-screen buttons)
// ------------------------------------------------------------
//  The touch controls reuse EXACTLY the same sets as the keyboard
//  (down and pressedThisStep), so the game doesn't distinguish the
//  origin: an on-screen button "presses" and "releases" an action
//  just like a key. The game/touch.ts module calls these functions
//  from the pointer events.

/** Presses (isDownNow=true) or releases (isDownNow=false) a touch action.
 *  On the first press it marks the rising edge (just pressed) and leaves it
 *  held; on release it only removes it from the held set. */
export function touchButton(action: Action, isDownNow: boolean): void {
  if (isDownNow) {
    if (!down.has(action)) pressedThisStep.add(action);
    down.add(action);
  } else {
    down.delete(action);
  }
  lastDevice = 'touch';
}

/** Releases EVERYTHING that was held (on losing focus or switching tabs). */
export function releaseAll(): void {
  down.clear();
}

/** Forces the last device used (to sync which controls to show). */
export function setDevice(d: InputDevice): void {
  lastDevice = d;
}

/** Does the device have touch capability? (fixed flag detected at startup). */
export function isTouchMode(): boolean {
  return touchMode;
}

/** Turns the touch-capability flag on/off (set by the touch module). */
export function setTouchMode(v: boolean): void {
  touchMode = v;
}
