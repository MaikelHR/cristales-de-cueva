// ============================================================
//  ENTRY POINT
// ------------------------------------------------------------
//  Creates the canvas, the session and the scenes, and starts the loop.
//  Everything else lives in /engine (reusable engine) and /game
//  (this game): the session is the state, the scenes the flow.
// ============================================================

// CSS is no longer imported here: it's linked from index.html (<link> in the
// <head>) so it applies on the first paint and there's no flash of
// unstyled content (FOUC) in development.
import { setupContext } from './engine/canvas';
import { initInput, endStep, pollGamepad } from './engine/input';
import { initAudio } from './engine/audio';
import { startLoop } from './engine/loop';
import { GameSession } from './game/session';
import { SceneManager } from './game/scenes/Scene';
import { TitleScene } from './game/scenes/TitleScene';
import { sprites } from './game/art/sprites';
import { debug } from './game/debug';
import { initTouchControls, syncTouchUI } from './game/touch';
import { syncMusic } from './game/music';
import { t, getLang, onLangChange } from './game/i18n';
import { initLangSwitch, syncLangSwitch } from './game/langSwitch';
import { initSkinSwitch, syncSkinSwitch } from './game/skinSwitch';
import { VIEW_W, VIEW_H } from './game/view';

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = setupContext(canvas);

initInput();
initAudio();
const session = new GameSession(VIEW_W, VIEW_H);
const scenes = new SceneManager();
scenes.replace(new TitleScene(session, scenes));

// Touch controls: only activate on devices with a coarse pointer
// (mobile/tablet). On desktop it builds nothing and doesn't alter the layout.
initTouchControls(canvas);

// Debug hooks: with the browser console open (F12) you can inspect the
// game live, e.g. `__game.player.vy` or `__debug.hitboxes = true`.
// The full cheat toolkit (press ` or F1) is a separate module, pulled in
// with a DYNAMIC import so that in a production build this whole branch
// folds to `false` and Rollup drops the toolkit and its DOM panel from
// the bundle — the shipped game has no cheats in it at all.
let syncDevtools: () => void = () => {};
if (import.meta.env.DEV) {
  const dev = window as unknown as Record<string, unknown>;
  dev.__game = session;
  dev.__scenes = scenes;
  dev.__sprites = sprites;
  dev.__debug = debug;
  void import('./game/dev/devtools').then((tools) => {
    tools.initDevtools(session, scenes);
    syncDevtools = tools.syncDevtools;
  });
}

// DEV: how many logic steps this frame owes. Normally exactly one —
// the fixed step is what makes the physics feel the same everywhere, so
// slow-mo and fast-forward change how MANY steps run, never how long a
// step is. A frozen world owes none, and `stepOnce` buys a single one.
let stepDebt = 0;
function devSteps(): number {
  if (debug.stepOnce) { debug.stepOnce = false; return 1; }
  if (debug.frozen) return 0;
  stepDebt += debug.timeScale;
  const n = Math.floor(stepDebt);
  stepDebt -= n;
  return Math.min(n, 8); // a huge timescale must not stall the frame
}

// Static page text (the <title> and the rotate notice) in the
// active language. Everything else lives INSIDE the canvas: the page is just
// the game's black frame, like a real game.
function localizeChrome(): void {
  document.documentElement.lang = getLang();
  document.title = t('page_title');
  const rTitle = document.querySelector('.rotate-title');
  if (rTitle) rTitle.textContent = t('rotate_title');
  const rSub = document.querySelector('.rotate-sub');
  if (rSub) rSub.textContent = t('rotate_sub');
  // The chrome is now in the right language: remove the anti-flash veil
  // that the <head> script put up (no-op if it was never applied).
  document.documentElement.classList.remove('pre-i18n');
}

initLangSwitch();
initSkinSwitch();
localizeChrome();
onLangChange(localizeChrome);

/** The active scene's state plus what the touch UI needs to know.
 *  The dash button only applies while playing: in the overworld the pad is
 *  used to navigate the map and dash doesn't exist there. */
function uiState() {
  const ui = scenes.ui;
  return { ...ui, hasDash: ui.state === 'playing' && session.player.abilities.dash };
}

// First frame painted before starting the loop: the canvas is never
// shown empty waiting for the first requestAnimationFrame.
scenes.draw(ctx);

startLoop(
  (dt) => {
    pollGamepad(); // read the controller state before updating the game
    // Normally exactly one step; fast-forward runs several, slow-mo and
    // freeze sometimes none. endStep() goes INSIDE the loop on purpose:
    // one physical press must be "just pressed" for ONE step, or at 4x a
    // single tap of pause is seen by four of them (push, pop, push, pop).
    // And a frame that runs NO step must not clear it either, or slow-mo
    // silently eats presses.
    const steps = import.meta.env.DEV ? devSteps() : 1;
    for (let i = 0; i < steps; i++) {
      scenes.update(dt);
      endStep();
    }
  },
  () => {
    scenes.draw(ctx);
    syncDevtools(); // keeps the dev panel's readout live (no-op in prod)
    const ui = uiState();
    syncTouchUI(ui); // reflect the game state in the touch UI
    syncLangSwitch(ui); // show/hide the language selector depending on state
    syncSkinSwitch(ui); // same for the character skin selector
    // The track this screen gets (the boss theme takes over mid-level).
    syncMusic(scenes.ui, session.level.id, session.bossEngaged);
  },
);
