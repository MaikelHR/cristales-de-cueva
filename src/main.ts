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
import { initInput, endStep, pollGamepad } from './engine/input';
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
// prender `__debug.hitboxes = true`, saltar a una sala del nivel
// actual con `__debug.warp('galeria')` o cargar otro nivel con
// `__debug.level('corazon')`.
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
    async level(id: string): Promise<void> {
      const { LEVELS } = await import('./game/world/rooms');
      const def = LEVELS.find((l) => l.id === id);
      if (!def) throw new Error(`No existe el nivel "${id}"`);
      session.startLevel(def, 'normal');
      const { GameplayScene } = await import('./game/scenes/GameplayScene');
      scenes.replace(new GameplayScene(session, scenes));
    },
  });
}

// Textos estáticos de la página (el <title> y el aviso de rotar) en el
// idioma activo. Todo lo demás vive DENTRO del canvas: la página es solo
// el marco negro del juego, como en un juego de verdad.
function localizeChrome(): void {
  document.documentElement.lang = getLang();
  document.title = t('page_title');
  const rTitle = document.querySelector('.rotate-title');
  if (rTitle) rTitle.textContent = t('rotate_title');
  const rSub = document.querySelector('.rotate-sub');
  if (rSub) rSub.textContent = t('rotate_sub');
  // Ya está el chrome en el idioma correcto: quitamos el velo anti-parpadeo
  // que puso el script de <head> (no-op si nunca se aplicó).
  document.documentElement.classList.remove('pre-i18n');
}

initLangSwitch();
localizeChrome();
onLangChange(localizeChrome);

/** El estado de la escena activa más lo que la UI táctil necesita saber.
 *  El botón de dash solo aplica jugando: en el overworld el mando sirve
 *  para navegar el mapa y el dash no existe ahí. */
function uiState() {
  const ui = scenes.ui;
  return { ...ui, hasDash: ui.state === 'playing' && session.player.abilities.dash };
}

// Primer frame ya pintado antes de arrancar el bucle: el canvas nunca se
// muestra vacío esperando al primer requestAnimationFrame.
scenes.draw(ctx);

startLoop(
  (dt) => {
    pollGamepad(); // leer el estado del control antes de actualizar el juego
    scenes.update(dt);
    endStep(); // limpiar "recién presionado" después de cada paso de lógica
  },
  () => {
    scenes.draw(ctx);
    const ui = uiState();
    syncTouchUI(ui); // reflejar el estado del juego en la UI táctil
    syncLangSwitch(ui); // mostrar/ocultar el selector de idioma según el estado
  },
);
