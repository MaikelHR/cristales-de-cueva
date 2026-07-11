// ============================================================
//  PUNTO DE ENTRADA
// ------------------------------------------------------------
//  Crea el canvas, la sesión y las escenas, y arranca el bucle.
//  Todo lo demás vive en /engine (motor reutilizable) y /game
//  (este juego): la sesión es el estado, las escenas el flujo.
// ============================================================

// El CSS ya no se importa acá: se enlaza desde index.html (<link> en el
// <head>) para que aplique en la primera pintura y no haya flash de
// contenido sin estilo (FOUC) en desarrollo.
import { setupContext } from './engine/canvas';
import { initInput, endStep, pollGamepad, inputDevice, type InputDevice } from './engine/input';
import { initAudio } from './engine/audio';
import { startLoop } from './engine/loop';
import { GameSession } from './game/session';
import { SceneManager } from './game/scenes/Scene';
import { TitleScene } from './game/scenes/TitleScene';
import { sprites } from './game/art/sprites';
import { debug } from './game/debug';
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
const session = new GameSession(VIEW_W, VIEW_H);
const scenes = new SceneManager();
scenes.replace(new TitleScene(session, scenes));

// Controles táctiles: solo se activan en dispositivos con puntero grueso
// (móvil/tablet). En escritorio no construye nada ni altera el layout.
initTouchControls(canvas);

// Ganchos de depuración: con la consola del navegador abierta (F12)
// podés inspeccionar el juego en vivo, p. ej. `__game.player.vy`,
// prender `__debug.hitboxes = true` o saltar con `__debug.warp('tunel')`.
// Solo existen en desarrollo: el build de producción no los incluye.
if (import.meta.env.DEV) {
  const dev = window as unknown as Record<string, unknown>;
  dev.__game = session;
  dev.__scenes = scenes;
  dev.__sprites = sprites;
  dev.__debug = Object.assign(debug, {
    warp(id: string): void {
      const room = session.world.get(id);
      session.world.goTo(id);
      session.player.setLevel(room.level);
      const spawn = room.playerSpawn ?? { x: 16, y: 16 };
      session.player.respawnAt(spawn.x + 1, spawn.y);
      session.makeCamera();
      session.visited.add(id);
      session.saveCheckpoint();
    },
  });
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

/** El estado de la escena activa más lo que la UI táctil necesita saber. */
function uiState() {
  return { ...scenes.ui, hasDash: session.player.abilities.dash };
}

// Primer frame ya pintado antes de arrancar el bucle: el canvas nunca se
// muestra vacío esperando al primer requestAnimationFrame.
scenes.draw(ctx);

startLoop(
  (dt) => {
    pollGamepad(); // leer el estado del control antes de actualizar el juego
    scenes.update(dt);
    syncControls();
    endStep(); // limpiar "recién presionado" después de cada paso de lógica
  },
  () => {
    scenes.draw(ctx);
    const ui = uiState();
    syncTouchUI(ui); // reflejar el estado del juego en la UI táctil
    syncLangSwitch(ui); // mostrar/ocultar el selector de idioma según el estado
  },
);
