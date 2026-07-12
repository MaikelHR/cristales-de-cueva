// ============================================================
//  TOUCH LAYOUT (customizable on-screen controls)
// ------------------------------------------------------------
//  On a phone the fixed gamepad never fits every thumb: players
//  kept "pressing outside the button and dying". So each on-screen
//  button carries its own layout — where its CENTER sits (as a
//  fraction of the viewport, resolution independent) and how big it
//  is (a scale over its base size) — plus a global opacity. The
//  player edits all this in-game (touch.ts drag editor) and it
//  persists like the language/skin: its own localStorage key,
//  wrapped in try/catch.
//
//  This module is PURE (no DOM) so it loads in Node and is tested:
//  it owns the data, the clamping, mirror/reset and persistence.
//  Turning a layout into pixels (viewport size, aspect) is touch.ts.
// ============================================================

import type { StrKey } from './i18n';

const KEY = 'cristales-touch';
const VERSION = 1;

/** The customizable on-screen controls. 'stick' is the optional movement
 *  joystick: it REPLACES left/right/down when `move` is 'stick'. */
export type TouchBtnId = 'left' | 'right' | 'down' | 'jump' | 'dash' | 'pause' | 'stick';

/** How movement is driven: the three-button d-pad, or the joystick. */
export type MoveStyle = 'dpad' | 'stick';

/** Immutable per-button facts: its base size (a multiplier over the
 *  responsive unit) and native aspect (so pixels stay square), plus
 *  the DEFAULT center as a viewport fraction. `ariaKey` labels it in
 *  the editor (reusing the button's screen-reader name). */
export interface TouchBtnBase {
  id: TouchBtnId;
  ariaKey: StrKey;
  bw: number; // base width, in "units" (see touch.ts UNIT) at scale 1
  aspect: number; // native width / height — height = width / aspect
  fx: number; // default center X, fraction of viewport width
  fy: number; // default center Y, fraction of viewport height
}

// Base sizes come from the old fixed layout (a d-pad button = 1 unit);
// aspects are the native sprite dimensions in ui/touchButtons.ts, so
// stretching keeps square pixels. Default centers reproduce the old
// arrangement (d-pad bottom-left, jump/dash bottom-right, pause top-right).
export const TOUCH_BTNS: readonly TouchBtnBase[] = [
  { id: 'left', ariaKey: 'tc_left_aria', bw: 1.0, aspect: 16 / 16, fx: 0.045, fy: 0.79 },
  { id: 'right', ariaKey: 'tc_right_aria', bw: 1.0, aspect: 16 / 16, fx: 0.12, fy: 0.79 },
  { id: 'down', ariaKey: 'tc_down_aria', bw: 2.0, aspect: 36 / 11, fx: 0.082, fy: 0.93 },
  { id: 'jump', ariaKey: 'tc_jump_aria', bw: 2.0, aspect: 32 / 16, fx: 0.92, fy: 0.9 },
  { id: 'dash', ariaKey: 'tc_dash_aria', bw: 1.38, aspect: 26 / 16, fx: 0.92, fy: 0.745 },
  { id: 'pause', ariaKey: 'tc_pause_aria', bw: 0.85, aspect: 14 / 14, fx: 0.96, fy: 0.09 },
  // The joystick sits where the d-pad cluster was, and is bigger: one thumb
  // rests in it. Square (24x24 native socket), so its pixels stay square.
  { id: 'stick', ariaKey: 'tc_stick_aria', bw: 2.2, aspect: 1, fx: 0.085, fy: 0.84 },
];

/** A button's editable state: center (viewport fraction) and scale. */
export interface BtnState {
  x: number;
  y: number;
  s: number;
}

/** The whole customizable layout: every control, the movement style and a
 *  global opacity. */
export interface TouchLayout {
  opacity: number;
  move: MoveStyle;
  btns: Record<TouchBtnId, BtnState>;
}

export const SCALE_MIN = 0.5;
export const SCALE_MAX = 2.8;
export const OPACITY_MIN = 0.2;
export const OPACITY_MAX = 1;

const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

/** A fresh layout at the factory defaults (used by reset and as the
 *  base every load fills in over). */
export function defaultLayout(): TouchLayout {
  const btns = {} as Record<TouchBtnId, BtnState>;
  for (const b of TOUCH_BTNS) btns[b.id] = { x: b.fx, y: b.fy, s: 1 };
  // The JOYSTICK is the default movement control: on a phone a thumb rides a
  // stick far better than it hunts three separate arrow buttons. The d-pad is
  // still there for anyone who prefers it (editor -> "Mover").
  return { opacity: 1, move: 'stick', btns };
}

/** Reads one stored button, keeping only finite numbers and clamping
 *  them into range; anything missing/garbage falls back to `def`. */
function readBtn(raw: unknown, def: BtnState): BtnState {
  if (!raw || typeof raw !== 'object') return { ...def };
  const o = raw as Record<string, unknown>;
  const num = (v: unknown, d: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : d;
  return {
    x: clamp(num(o.x, def.x), 0, 1),
    y: clamp(num(o.y, def.y), 0, 1),
    s: clamp(num(o.s, def.s), SCALE_MIN, SCALE_MAX),
  };
}

/** Parses the stored JSON into a valid layout, filling every gap with
 *  the defaults. Never throws: bad data just yields the default layout.
 *  Exported for tests (migrations live here, like save.ts). */
export function parseLayout(raw: string | null): TouchLayout {
  const layout = defaultLayout();
  if (!raw) return layout;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (typeof data.opacity === 'number' && Number.isFinite(data.opacity)) {
      layout.opacity = clamp(data.opacity, OPACITY_MIN, OPACITY_MAX);
    }
    // Only an EXPLICIT choice is honoured. A save with no `move` (written
    // before the joystick existed, or before it became the default) falls back
    // to the default — the joystick — and gets its `stick` slot from the
    // defaults. Someone who deliberately picked the d-pad has 'dpad' stored
    // here, and keeps it.
    if (data.move === 'stick' || data.move === 'dpad') layout.move = data.move;
    const btns = (data.btns ?? {}) as Record<string, unknown>;
    for (const b of TOUCH_BTNS) {
      layout.btns[b.id] = readBtn(btns[b.id], layout.btns[b.id]);
    }
  } catch {
    // Corrupt JSON: keep the defaults.
  }
  return layout;
}

function load(): TouchLayout {
  try {
    return parseLayout(localStorage.getItem(KEY));
  } catch {
    return defaultLayout(); // storage blocked (or Node).
  }
}

let current: TouchLayout = load();
const listeners = new Set<() => void>();

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, ...current }));
  } catch {
    // No storage: the change still applies, it just isn't remembered.
  }
  for (const fn of listeners) fn();
}

/** The active layout (read-only view; mutate via the setters). */
export function getLayout(): TouchLayout {
  return current;
}

/** One button's current state (falls back to its default if unknown). */
export function getBtnState(id: TouchBtnId): BtnState {
  return current.btns[id] ?? { x: 0.5, y: 0.5, s: 1 };
}

/** Moves a button's center (viewport fractions, clamped to [0,1]). */
export function setBtnPos(id: TouchBtnId, x: number, y: number): void {
  const b = current.btns[id];
  if (!b) return;
  b.x = clamp(x, 0, 1);
  b.y = clamp(y, 0, 1);
  save();
}

/** Sets a button's scale (clamped to [SCALE_MIN, SCALE_MAX]). */
export function setBtnScale(id: TouchBtnId, s: number): void {
  const b = current.btns[id];
  if (!b) return;
  b.s = clamp(s, SCALE_MIN, SCALE_MAX);
  save();
}

/** Bumps a button's scale by `delta` (for the editor's +/- buttons). */
export function nudgeScale(id: TouchBtnId, delta: number): void {
  setBtnScale(id, getBtnState(id).s + delta);
}

/** Live-moves a button during a drag WITHOUT persisting or notifying:
 *  the editor re-lays out just that button on every pointermove and
 *  calls commit() once the finger lifts (avoids a storage write per
 *  frame). Clamps like setBtnPos. */
export function dragBtnTo(id: TouchBtnId, x: number, y: number): void {
  const b = current.btns[id];
  if (!b) return;
  b.x = clamp(x, 0, 1);
  b.y = clamp(y, 0, 1);
}

/** Persists the current layout and notifies listeners (called once a
 *  drag ends, after a run of dragBtnTo). */
export function commit(): void {
  save();
}

/** The global button opacity. */
export function getOpacity(): number {
  return current.opacity;
}

/** Sets the global opacity (clamped to [OPACITY_MIN, OPACITY_MAX]). */
export function setOpacity(a: number): void {
  current.opacity = clamp(a, OPACITY_MIN, OPACITY_MAX);
  save();
}

/** Bumps the opacity by `delta`. */
export function nudgeOpacity(delta: number): void {
  setOpacity(current.opacity + delta);
}

/** How movement is driven right now: 'dpad' or 'stick'. */
export function getMove(): MoveStyle {
  return current.move;
}

/** Picks the movement style (d-pad buttons or joystick). */
export function setMove(m: MoveStyle): void {
  if (m !== 'dpad' && m !== 'stick') return;
  if (m === current.move) return;
  current.move = m;
  save();
}

/** Flips between the d-pad and the joystick (the editor's toggle). */
export function toggleMove(): void {
  setMove(current.move === 'dpad' ? 'stick' : 'dpad');
}

/** Mirrors the whole layout left<->right (x -> 1 - x): a one-tap swap
 *  of the control sides for left-handed players. Its own inverse. */
export function mirror(): void {
  for (const b of TOUCH_BTNS) {
    const s = current.btns[b.id];
    if (s) s.x = clamp(1 - s.x, 0, 1);
  }
  save();
}

/** Restores the factory layout (positions, scales and opacity). The movement
 *  STYLE survives: it's a preference, not a layout — resetting where your
 *  buttons sit shouldn't yank the joystick out from under you. */
export function reset(): void {
  const move = current.move;
  current = defaultLayout();
  current.move = move;
  save();
}

/** Subscribes to layout changes (touch.ts re-applies the DOM). */
export function onLayoutChange(fn: () => void): void {
  listeners.add(fn);
}
