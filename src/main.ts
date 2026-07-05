// ============================================================
//  PUNTO DE ENTRADA
// ------------------------------------------------------------
//  Crea el canvas, el juego y arranca el bucle. Todo lo demás
//  vive en /engine (motor reutilizable) y /game (este juego).
// ============================================================

import './style.css';
import { setupContext } from './engine/canvas';
import { initInput, endStep, pollGamepad, inputDevice, type InputDevice } from './engine/input';
import { initAudio } from './engine/audio';
import { startLoop } from './engine/loop';
import { Game } from './game/Game';
import { sprites } from './game/art';

const VIEW_W = 320;
const VIEW_H = 176;

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = setupContext(canvas);

initInput();
initAudio();
const game = new Game(VIEW_W, VIEW_H);

// Gancho de depuración: con la consola del navegador abierta (F12)
// podés inspeccionar el juego en vivo, p. ej. `__game.player.vy`.
// Solo existe en desarrollo: el build de producción no lo incluye.
if (import.meta.env.DEV) {
  (window as unknown as { __game: Game }).__game = game;
  (window as unknown as { __sprites: typeof sprites }).__sprites = sprites;
}

// Footer de controles adaptativo: muestra teclas o botones según el
// último dispositivo usado, y cambia al instante al detectar el otro.
const controlsEl = document.getElementById('controles');
const CONTROLS_HTML: Record<InputDevice, string> = {
  keyboard:
    '<kbd>←</kbd> <kbd>→</kbd> o <kbd>A</kbd> <kbd>D</kbd> para moverte &nbsp;·&nbsp; ' +
    '<kbd>espacio</kbd> / <kbd>↑</kbd> / <kbd>W</kbd> para saltar (¡doble!) &nbsp;·&nbsp; ' +
    '<kbd>shift</kbd> / <kbd>X</kbd> para dash &nbsp;·&nbsp; <kbd>R</kbd> para reiniciar',
  gamepad:
    '<kbd>D-pad</kbd> / <kbd>stick</kbd> para moverte &nbsp;·&nbsp; ' +
    '<kbd>A</kbd> para saltar (¡doble!) &nbsp;·&nbsp; ' +
    '<kbd>X</kbd> para dash &nbsp;·&nbsp; <kbd>Y</kbd> reiniciar &nbsp;·&nbsp; <kbd>START</kbd> pausa',
};
let shownDevice: InputDevice | null = null;
function syncControls(): void {
  const dev = inputDevice();
  if (dev === shownDevice || !controlsEl) return;
  shownDevice = dev;
  controlsEl.innerHTML = CONTROLS_HTML[dev];
}

startLoop(
  (dt) => {
    pollGamepad(); // leer el estado del control antes de actualizar el juego
    game.update(dt);
    syncControls();
    endStep(); // limpiar "recién presionado" después de cada paso de lógica
  },
  () => game.draw(ctx),
);
