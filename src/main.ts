// ============================================================
//  PUNTO DE ENTRADA
// ------------------------------------------------------------
//  Crea el canvas, el juego y arranca el bucle. Todo lo demás
//  vive en /engine (motor reutilizable) y /game (este juego).
// ============================================================

import './style.css';
import { setupContext } from './engine/canvas';
import { initInput, endStep } from './engine/input';
import { startLoop } from './engine/loop';
import { Game } from './game/Game';

const VIEW_W = 320;
const VIEW_H = 176;

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = setupContext(canvas);

initInput();
const game = new Game(VIEW_W, VIEW_H);

startLoop(
  (dt) => {
    game.update(dt);
    endStep(); // limpiar "recién presionado" después de cada paso de lógica
  },
  () => game.draw(ctx),
);
