// ============================================================
//  PUNTO DE ENTRADA
// ------------------------------------------------------------
//  Crea el canvas, el juego y arranca el bucle. Todo lo demás
//  vive en /engine (motor reutilizable) y /game (este juego).
// ============================================================

import './style.css';
import { setupContext } from './engine/canvas';
import { initInput, endStep } from './engine/input';
import { initAudio } from './engine/audio';
import { startLoop } from './engine/loop';
import { Game } from './game/Game';

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
}

startLoop(
  (dt) => {
    game.update(dt);
    endStep(); // limpiar "recién presionado" después de cada paso de lógica
  },
  () => game.draw(ctx),
);
