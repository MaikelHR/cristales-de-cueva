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
  rotate_title: 'GIRA EL TELÉFONO',
  rotate_sub: 'La cueva se juega en horizontal',
  ab_doubleJump: '¡DOBLE SALTO!',
  ab_dash: '¡DASH!',
  ab_wallJump: '¡SALTO DE PARED!',
  pause_title: 'PAUSA',
  pause_resume_touch: 'usa los botones del menú',
  // Los menús del juego (título y pausa). El de idioma muestra el ACTIVO.
  menu_play: 'JUGAR',
  menu_resume: 'CONTINUAR',
  menu_restart: 'REINICIAR NIVEL',
  menu_fullscreen: 'PANTALLA COMPLETA',
  menu_language: 'IDIOMA: ESPAÑOL',
  menu_exit: 'SALIR AL MAPA',
  // Los textos de gamepad llevan {j}/{d}/{r}/{p}: los rótulos reales del
  // pad conectado (A/X/Y/START o ✕/□/△/OPTIONS) los pone padLabels().
  nav_kb: '↑ ↓ elegir · ENTER confirmar',
  nav_gp: 'D-pad elegir · {j} confirmar',
  boss_defeated: '¡GUARDIÁN DERROTADO!',
  hud_crystals: 'CRISTALES',
  hud_points: 'PUNTOS',
  hud_stomp_boss: 'SALTA SOBRE EL GUARDIÁN',
  hud_door_open: 'LA PUERTA ESTÁ ABIERTA',
  hud_trial: 'CONTRARRELOJ',
  win_title: '¡NIVEL COMPLETADO!',
  win_points: 'PUNTOS: {n}',
  win_time: 'TIEMPO: {t}',
  win_new_best_time: '¡NUEVO RÉCORD DE TIEMPO!',
  trial_new_best: '¡NUEVO RÉCORD DE CONTRARRELOJ!',
  best_time: 'MEJOR TIEMPO: {t}',
  trial_best: 'CONTRARRELOJ: {t}',
  back_touch: 'toca para volver al mapa',
  back_gp: 'botón {j} para volver al mapa',
  back_kb: 'ENTER para volver al mapa',
  new_record: '¡NUEVO RÉCORD!',
  best_score_short: 'MEJOR: {n}',
  best_score: 'MEJOR PUNTAJE: {n}',
  completed_once: 'completado 1 vez',
  completed_many: 'completado {n} veces',
  start_touch: 'TOCA PARA EMPEZAR',
  title_progress: '{n}/{m} NIVELES COMPLETADOS',
  lvl_cavernas: 'LAS CAVERNAS',
  lvl_galerias: 'GALERÍAS HUNDIDAS',
  lvl_corazon: 'CORAZÓN DE CRISTAL',
  ow_title: 'MUNDO 1 · LA GRUTA',
  ow_progress: 'NIVELES {n}/{m}',
  ow_locked: '???',
  ow_enter_touch: 'SALTO para entrar',
  ow_enter_gp: 'botón {j} para entrar',
  ow_enter_kb: 'ENTER o ↑ para entrar',
  ow_hint_touch: 'muévete con ◀ ▶',
  ow_hint_gp: 'D-pad para moverte · {p} al título',
  ow_hint_kb: '← → para moverte · ESC al título',
  choose_mode: 'ELIGE EL MODO',
  mode_normal: 'NORMAL',
  mode_trial: 'CONTRARRELOJ',
  mode_normal_hint: 'explora, caza y llega a la puerta',
  mode_trial_hint: 'termina lo antes posible',
  hint_touch: 'usa los botones en pantalla',
  hint_gp: 'D-pad mover · {j} saltar · {d} dash',
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
  tc_map: 'Salir al mapa',
};

/** Las claves de texto: cualquier idioma debe tener exactamente estas. */
export type StrKey = keyof typeof es;

// El inglés: tipado como Record<StrKey, string> para que el compilador
// exija que estén TODAS las claves (ni una de menos, ni una de más).
const en: Record<StrKey, string> = {
  page_title: 'CRYSTALS OF THE CAVE',
  title_line1: 'CRYSTALS',
  title_line2: 'OF THE CAVE',
  rotate_title: 'ROTATE YOUR PHONE',
  rotate_sub: 'The cave is played in landscape',
  ab_doubleJump: 'DOUBLE JUMP!',
  ab_dash: 'DASH!',
  ab_wallJump: 'WALL JUMP!',
  pause_title: 'PAUSED',
  pause_resume_touch: 'use the menu buttons',
  menu_play: 'PLAY',
  menu_resume: 'RESUME',
  menu_restart: 'RESTART LEVEL',
  menu_fullscreen: 'FULLSCREEN',
  menu_language: 'LANGUAGE: ENGLISH',
  menu_exit: 'EXIT TO MAP',
  nav_kb: '↑ ↓ select · ENTER confirm',
  nav_gp: 'D-pad select · {j} confirm',
  boss_defeated: 'GUARDIAN DEFEATED!',
  hud_crystals: 'CRYSTALS',
  hud_points: 'POINTS',
  hud_stomp_boss: 'STOMP THE GUARDIAN',
  hud_door_open: 'THE DOOR IS OPEN',
  hud_trial: 'TIME TRIAL',
  win_title: 'LEVEL COMPLETE!',
  win_points: 'POINTS: {n}',
  win_time: 'TIME: {t}',
  win_new_best_time: 'NEW BEST TIME!',
  trial_new_best: 'NEW TIME TRIAL RECORD!',
  best_time: 'BEST TIME: {t}',
  trial_best: 'TIME TRIAL: {t}',
  back_touch: 'tap to return to the map',
  back_gp: '{j} to return to the map',
  back_kb: 'ENTER to return to the map',
  new_record: 'NEW RECORD!',
  best_score_short: 'BEST: {n}',
  best_score: 'BEST SCORE: {n}',
  completed_once: 'completed once',
  completed_many: 'completed {n} times',
  start_touch: 'TAP TO START',
  title_progress: '{n}/{m} LEVELS COMPLETED',
  lvl_cavernas: 'THE CAVERNS',
  lvl_galerias: 'SUNKEN GALLERIES',
  lvl_corazon: 'CRYSTAL HEART',
  ow_title: 'WORLD 1 · THE GROTTO',
  ow_progress: 'LEVELS {n}/{m}',
  ow_locked: '???',
  ow_enter_touch: 'JUMP to enter',
  ow_enter_gp: '{j} to enter',
  ow_enter_kb: 'ENTER or ↑ to enter',
  ow_hint_touch: 'move with ◀ ▶',
  ow_hint_gp: 'D-pad to move · {p} for title',
  ow_hint_kb: '← → to move · ESC for title',
  choose_mode: 'CHOOSE MODE',
  mode_normal: 'NORMAL',
  mode_trial: 'TIME TRIAL',
  mode_normal_hint: 'explore, hunt and reach the door',
  mode_trial_hint: 'finish as fast as you can',
  hint_touch: 'use the on-screen buttons',
  hint_gp: 'D-pad move · {j} jump · {d} dash',
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
  tc_map: 'Exit to map',
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
