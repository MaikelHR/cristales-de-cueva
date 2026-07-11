// ============================================================
//  IDIOMAS (i18n): español / inglés
// ------------------------------------------------------------
//  Un diccionario chico con todos los textos que ve el jugador,
//  en español (neutro, tuteo) e inglés. `t(clave)` devuelve el
//  texto en el idioma activo; los textos del canvas lo llaman en
//  cada frame, así el cambio de idioma se ve al instante.
//
//  El idioma elegido se guarda en localStorage. Si no hay nada
//  guardado, se adivina del navegador (es -> español; si no, inglés).
//  Todo va envuelto en try/catch: si el almacenamiento está
//  bloqueado, el juego sigue igual, solo que sin recordar la elección.
// ============================================================

export type Lang = 'es' | 'en';

const KEY = 'cristales-lang';

// Los textos en español (neutro latino, tuteo: "gira", no "girá").
// Placeholders {n} y {t} se reemplazan al vuelo con t(clave, {...}).
const es = {
  page_title: 'CRISTALES DE LA CUEVA',
  title_line1: 'CRISTALES',
  title_line2: 'DE LA CUEVA',
  page_sub: 'recoge los 5 cristales y llega a la puerta',
  rotate_title: 'GIRA EL TELÉFONO',
  rotate_sub: 'La cueva se juega en horizontal',
  ctl_kb:
    '<kbd>←</kbd> <kbd>→</kbd> o <kbd>A</kbd> <kbd>D</kbd> para moverte &nbsp;·&nbsp; ' +
    '<kbd>espacio</kbd> / <kbd>↑</kbd> / <kbd>W</kbd> para saltar (¡doble!) &nbsp;·&nbsp; ' +
    '<kbd>shift</kbd> / <kbd>X</kbd> para dash &nbsp;·&nbsp; <kbd>R</kbd> para reiniciar',
  ctl_gp:
    '<kbd>D-pad</kbd> / <kbd>stick</kbd> para moverte &nbsp;·&nbsp; ' +
    '<kbd>A</kbd> para saltar (¡doble!) &nbsp;·&nbsp; ' +
    '<kbd>X</kbd> para dash &nbsp;·&nbsp; <kbd>Y</kbd> reiniciar &nbsp;·&nbsp; <kbd>START</kbd> pausa',
  ctl_touch: 'usa los botones en pantalla para jugar',
  ab_doubleJump: '¡DOBLE SALTO!',
  ab_dash: '¡DASH!',
  ab_wallJump: '¡SALTO DE PARED!',
  pause_title: 'PAUSA',
  pause_resume_touch: 'toca continuar o reiniciar',
  pause_resume_gp: 'START para continuar',
  pause_resume_kb: 'ESC o P para continuar',
  pause_restart_gp: 'Y para reiniciar',
  pause_restart_kb: 'R para reiniciar',
  boss_defeated: '¡GUARDIÁN DERROTADO!',
  hud_crystals: 'CRISTALES',
  hud_points: 'PUNTOS',
  hud_stomp_boss: 'SALTA SOBRE EL GUARDIÁN',
  hud_door_open: 'LA PUERTA ESTÁ ABIERTA',
  win_title: '¡LO LOGRASTE!',
  win_points: 'PUNTOS: {n}',
  win_time: 'TIEMPO: {t}',
  win_new_best_time: '¡NUEVO RÉCORD DE TIEMPO!',
  best_time: 'MEJOR TIEMPO: {t}',
  back_touch: 'toca para volver al menú',
  back_gp: 'botón A para volver al menú',
  back_kb: 'ENTER para volver al menú',
  new_record: '¡NUEVO RÉCORD!',
  best_score_short: 'MEJOR: {n}',
  best_score: 'MEJOR PUNTAJE: {n}',
  completed_once: 'completado 1 vez',
  completed_many: 'completado {n} veces',
  start_touch: 'TOCA PARA EMPEZAR',
  start_gp: 'botón A o START para empezar',
  start_kb: 'ENTER o ↑ para empezar',
  hint_touch: 'usa los botones en pantalla',
  hint_gp: 'D-pad mover · A saltar · X dash',
  hint_kb: '← → mover · ↑ saltar · X dash',
  gameover_title: 'GAME OVER',
  tc_pause_aria: 'Pausa',
  tc_left_aria: 'Izquierda',
  tc_right_aria: 'Derecha',
  tc_dash_aria: 'Dash',
  tc_dash_text: 'DASH',
  tc_jump_aria: 'Saltar',
  tc_jump_text: 'SALTO',
  tc_resume: 'Continuar',
  tc_fs: 'Pantalla completa',
  tc_restart: 'Reiniciar',
};

/** Las claves de texto: cualquier idioma debe tener exactamente estas. */
export type StrKey = keyof typeof es;

// El inglés: tipado como Record<StrKey, string> para que el compilador
// exija que estén TODAS las claves (ni una de menos, ni una de más).
const en: Record<StrKey, string> = {
  page_title: 'CRYSTALS OF THE CAVE',
  title_line1: 'CRYSTALS',
  title_line2: 'OF THE CAVE',
  page_sub: 'collect the 5 crystals and reach the door',
  rotate_title: 'ROTATE YOUR PHONE',
  rotate_sub: 'The cave is played in landscape',
  ctl_kb:
    '<kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd> to move &nbsp;·&nbsp; ' +
    '<kbd>space</kbd> / <kbd>↑</kbd> / <kbd>W</kbd> to jump (double!) &nbsp;·&nbsp; ' +
    '<kbd>shift</kbd> / <kbd>X</kbd> to dash &nbsp;·&nbsp; <kbd>R</kbd> to restart',
  ctl_gp:
    '<kbd>D-pad</kbd> / <kbd>stick</kbd> to move &nbsp;·&nbsp; ' +
    '<kbd>A</kbd> to jump (double!) &nbsp;·&nbsp; ' +
    '<kbd>X</kbd> to dash &nbsp;·&nbsp; <kbd>Y</kbd> restart &nbsp;·&nbsp; <kbd>START</kbd> pause',
  ctl_touch: 'use the on-screen buttons to play',
  ab_doubleJump: 'DOUBLE JUMP!',
  ab_dash: 'DASH!',
  ab_wallJump: 'WALL JUMP!',
  pause_title: 'PAUSED',
  pause_resume_touch: 'tap resume or restart',
  pause_resume_gp: 'START to resume',
  pause_resume_kb: 'ESC or P to resume',
  pause_restart_gp: 'Y to restart',
  pause_restart_kb: 'R to restart',
  boss_defeated: 'GUARDIAN DEFEATED!',
  hud_crystals: 'CRYSTALS',
  hud_points: 'POINTS',
  hud_stomp_boss: 'STOMP THE GUARDIAN',
  hud_door_open: 'THE DOOR IS OPEN',
  win_title: 'YOU DID IT!',
  win_points: 'POINTS: {n}',
  win_time: 'TIME: {t}',
  win_new_best_time: 'NEW BEST TIME!',
  best_time: 'BEST TIME: {t}',
  back_touch: 'tap to return to menu',
  back_gp: 'A to return to menu',
  back_kb: 'ENTER to return to menu',
  new_record: 'NEW RECORD!',
  best_score_short: 'BEST: {n}',
  best_score: 'BEST SCORE: {n}',
  completed_once: 'completed once',
  completed_many: 'completed {n} times',
  start_touch: 'TAP TO START',
  start_gp: 'A or START to begin',
  start_kb: 'ENTER or ↑ to start',
  hint_touch: 'use the on-screen buttons',
  hint_gp: 'D-pad move · A jump · X dash',
  hint_kb: '← → move · ↑ jump · X dash',
  gameover_title: 'GAME OVER',
  tc_pause_aria: 'Pause',
  tc_left_aria: 'Left',
  tc_right_aria: 'Right',
  tc_dash_aria: 'Dash',
  tc_dash_text: 'DASH',
  tc_jump_aria: 'Jump',
  tc_jump_text: 'JUMP',
  tc_resume: 'Resume',
  tc_fs: 'Fullscreen',
  tc_restart: 'Restart',
};

const TABLES: Record<Lang, Record<StrKey, string>> = { es, en };

/** Idioma inicial: lo guardado; si no, lo del navegador; si no, español. */
function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    // localStorage bloqueado: seguimos con la detección del navegador.
  }
  // typeof-guard: en Node (tests) no hay navigator y este módulo igual carga.
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'es';
  return nav.toLowerCase().startsWith('es') ? 'es' : 'en';
}

let current: Lang = detect();
const listeners = new Set<() => void>();

/** El idioma activo. */
export function getLang(): Lang {
  return current;
}

/** Cambia el idioma, lo guarda y avisa a quien esté escuchando. */
export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // Sin almacenamiento: cambia igual, solo que no se recuerda.
  }
  for (const fn of listeners) fn();
}

/** Se suscribe a los cambios de idioma (para re-pintar el DOM estático). */
export function onLangChange(fn: () => void): void {
  listeners.add(fn);
}

/**
 * Traduce una clave al idioma activo. Con `params` reemplaza los
 * placeholders: t('win_points', { n: 120 }) -> "PUNTOS: 120".
 * Si faltara una clave en un idioma, cae al español y luego a la clave
 * cruda, para no romper nunca el render.
 */
export function t(key: StrKey, params?: Record<string, string | number>): string {
  let s = TABLES[current][key] ?? es[key] ?? key;
  if (params) {
    for (const k of Object.keys(params)) {
      s = s.replace('{' + k + '}', String(params[k]));
    }
  }
  return s;
}
