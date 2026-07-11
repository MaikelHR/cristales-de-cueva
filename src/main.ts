// ============================================================
//  PUNTO DE ENTRADA
// ------------------------------------------------------------
//  Crea el canvas, el juego y arranca el bucle. Todo lo demás
//  vive en /engine (motor reutilizable) y /game (este juego).
// ============================================================

// El CSS ya no se importa acá: se enlaza desde index.html (<link> en el
// <head>) para que aplique en la primera pintura y no haya flash de
// contenido sin estilo (FOUC) en desarrollo.
import { setupContext } from './engine/canvas';
import { initInput, endStep, pollGamepad, inputDevice, type InputDevice } from './engine/input';
import { initAudio } from './engine/audio';
import { startLoop } from './engine/loop';
import { Game } from './game/Game';
import { sprites } from './game/art';
import { initTouchControls, syncTouchUI } from './game/touch';
import { t, getLang, onLangChange } from './game/i18n';
import { initLangSwitch, syncLangSwitch } from './game/langSwitch';

const VIEW_W = 320;
const VIEW_H = 176;

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = setupContext(canvas);

initInput();
initAudio();
const game = new Game(VIEW_W, VIEW_H);

// Controles táctiles: solo se activan en dispositivos con puntero grueso
// (móvil/tablet). En escritorio no construye nada ni altera el layout.
initTouchControls(canvas);

// Gancho de depuración: con la consola del navegador abierta (F12)
// podés inspeccionar el juego en vivo, p. ej. `__game.player.vy`.
// Solo existe en desarrollo: el build de producción no lo incluye.
if (import.meta.env.DEV) {
  (window as unknown as { __game: Game }).__game = game;
  (window as unknown as { __sprites: typeof sprites }).__sprites = sprites;
}

// Footer de controles adaptativo: muestra teclas o botones según el
// último dispositivo usado, y cambia al instante al detectar el otro.
// El texto sale del diccionario de idiomas (i18n), no de literales.
const controlsEl = document.getElementById('controles');
function controlsHtml(dev: InputDevice): string {
  // En móvil el footer queda oculto (se juega con los botones en pantalla),
  // pero devolvemos igual el texto por si acaso.
  return dev === 'gamepad' ? t('ctl_gp') : dev === 'touch' ? t('ctl_touch') : t('ctl_kb');
}
let shownDevice: InputDevice | null = null;
function syncControls(): void {
  const dev = inputDevice();
  if (dev === shownDevice || !controlsEl) return;
  shownDevice = dev;
  controlsEl.innerHTML = controlsHtml(dev);
}

// Textos estáticos de la página (título, subtítulo, aviso de rotar y footer)
// en el idioma activo. Se llama al arrancar y cada vez que cambia el idioma.
function localizeChrome(): void {
  document.documentElement.lang = getLang();
  document.title = t('page_title');
  const h1 = document.querySelector('h1');
  if (h1) h1.textContent = t('page_title');
  const sub = document.querySelector('.sub');
  if (sub) sub.textContent = t('page_sub');
  const rTitle = document.querySelector('.rotate-title');
  if (rTitle) rTitle.textContent = t('rotate_title');
  const rSub = document.querySelector('.rotate-sub');
  if (rSub) rSub.textContent = t('rotate_sub');
  // Forzar el re-render del footer de controles en el nuevo idioma.
  shownDevice = null;
  syncControls();
  // Ya está el chrome en el idioma correcto: quitamos el velo anti-parpadeo
  // que puso el script de <head> (no-op si nunca se aplicó).
  document.documentElement.classList.remove('pre-i18n');
}

initLangSwitch();
localizeChrome();
onLangChange(localizeChrome);

// Primer frame ya pintado antes de arrancar el bucle: el canvas nunca se
// muestra vacío esperando al primer requestAnimationFrame.
game.draw(ctx);

startLoop(
  (dt) => {
    pollGamepad(); // leer el estado del control antes de actualizar el juego
    game.update(dt);
    syncControls();
    endStep(); // limpiar "recién presionado" después de cada paso de lógica
  },
  () => {
    game.draw(ctx);
    syncTouchUI(game.ui); // reflejar el estado del juego en la UI táctil
    syncLangSwitch(game.ui); // mostrar/ocultar el selector de idioma según el estado
  },
);
