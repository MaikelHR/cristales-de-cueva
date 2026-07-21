// ============================================================
//  LANGUAGES (i18n): Spanish / English
// ------------------------------------------------------------
//  A small dictionary with every text the player sees, in Spanish
//  (neutral, tuteo) and English. `t(key)` returns the text in the
//  active language; the canvas texts call it every frame, so a
//  language change shows up instantly.
//
//  The chosen language is saved in localStorage. If nothing is
//  saved, it's guessed from the browser (es -> Spanish; else English).
//  Everything is wrapped in try/catch: if storage is blocked, the
//  game keeps working, it just won't remember the choice.
// ============================================================

export type Lang = 'es' | 'en';

const KEY = 'cristales-lang';

// The Spanish texts (neutral LatAm, tuteo: "gira", not "girá").
// Placeholders {n} and {t} are replaced on the fly with t(key, {...}).
export const es = {
  page_title: 'CRISTALES DE LA CUEVA',
  title_line1: 'CRISTALES',
  title_line2: 'DE LA CUEVA',
  rotate_title: 'GIRA EL TELÉFONO',
  rotate_sub: 'La cueva se juega en horizontal',
  ab_doubleJump: '¡DOBLE SALTO!',
  ab_dash: '¡DASH!',
  ab_wallJump: '¡SALTO DE PARED!',
  ab_glide: '¡PLANEO!',
  ab_pound: '¡AZOTÓN!',
  ab_smash: '¡EMBESTIDA!',
  ab_dive: '¡BUCEO!',
  ab_shrink: '¡MENGUAR!',
  ab_swing: '¡COLUMPIO!',
  pause_title: 'PAUSA',
  pause_resume_touch: 'usa los botones del menú',
  // The game menus (title and pause). The language one shows the ACTIVE one.
  menu_play: 'JUGAR',
  menu_resume: 'CONTINUAR',
  menu_restart: 'REINICIAR NIVEL',
  menu_fullscreen: 'PANTALLA COMPLETA',
  menu_language: 'IDIOMA: ESPAÑOL',
  menu_exit: 'SALIR AL MAPA',
  menu_mainmenu: 'MENÚ PRINCIPAL',
  // Customization: PERSONAJE opens its own screen (color + accessory).
  menu_character: 'PERSONAJE',
  cust_title: 'PERSONAJE',
  cust_color: 'COLOR: {s}',
  cust_accessory: 'ACCESORIO: {s}',
  cust_back: 'VOLVER',
  skin_cristal: 'CRISTAL',
  skin_esmeralda: 'ESMERALDA',
  skin_ambar: 'ÁMBAR',
  skin_rosa: 'ROSA',
  skin_amatista: 'AMATISTA',
  acc_ninguno: 'NINGUNO',
  acc_gorro: 'GORRO',
  acc_corona: 'CORONA',
  acc_antena: 'ANTENA',
  acc_mono: 'MOÑO',
  acc_bufanda: 'BUFANDA',
  // The gamepad texts carry {j}/{d}/{r}/{p}: the real labels of the
  // connected pad (A/X/Y/START or ✕/□/△/OPTIONS) are filled by padLabels().
  nav_kb: '↑ ↓ elegir · ENTER confirmar',
  nav_gp: 'D-pad elegir · {j} confirmar',
  boss_defeated: '¡GUARDIÁN DERROTADO!',
  heal_popup: '+1 VIDA',
  hud_crystals: 'CRISTALES',
  hud_points: 'PUNTOS',
  hud_room: 'SALA',
  hud_stomp_boss: 'SALTA SOBRE EL GUARDIÁN',
  hud_cut_thread: 'CORTA SU HILO COLUMPIÁNDOTE',
  hud_stomp_fallen: '¡AHORA SÍ! SÁLTALE ENCIMA',
  hud_lantern: 'PÍSALE EL FAROL POR LA ESPALDA',
  hud_wait_stun: 'ESPERA A QUE CHOQUE Y SE ATURDA',
  hud_stomp_now: '¡AHORA! SÁLTALE ENCIMA',
  hud_crest: 'PÍSALE LA CRESTA CUANDO SALTE',
  hud_dash_boss: 'EMBÍSTELO CON EL DASH',
  hud_pound_boss: 'CÁELE CON EL AZOTÓN',
  hud_door_open: 'LA PUERTA ESTÁ ABIERTA',
  hud_trial: 'CONTRARRELOJ',
  win_title: '¡NIVEL COMPLETADO!',
  // El final del mundo 1: la gran puerta cede y sales de la gruta.
  end_title: '¡LO LOGRASTE!',
  end_sub: 'COMPLETASTE CRISTALES DE LA CUEVA',
  end_levels: 'NIVELES: {n}/{m}',
  end_crystals: 'CRISTALES DEL MUNDO 1: {n}',
  end_total_time: 'TIEMPO TOTAL: {t}',
  end_flavor: 'La gruta queda atrás. Afuera hay luz.',
  end_back: 'ENTER para volver al mapa',
  end_back_touch: 'toca para volver al mapa',
  end_back_gp: 'botón {j} para volver al mapa',
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
  lvl_esporas: 'EL JARDÍN DE ESPORAS',
  lvl_glaciar: 'EL GLACIAR CALLADO',
  lvl_fragua: 'LA FRAGUA DEL NÚCLEO',
  lvl_cenote: 'EL CENOTE',
  lvl_mina: 'LA MINA OLVIDADA',
  lvl_seda: 'EL NIDO DE SEDA',
  lvl_puerta: 'LA GRAN PUERTA',
  lvl_simas: 'LAS SIMAS ENCADENADAS',
  lvl_reloj: 'EL RELOJ DE AGUA',
  lvl_cripta: 'LA CRIPTA DEL CUSTODIO',
  ow_title: 'MUNDO 1 · LA GRUTA',
  ow_progress: 'NIVELES {n}/{m}',
  ow_locked: '???',
  ow_enter_touch: 'SALTO para entrar',
  ow_enter_gp: 'botón {j} para entrar',
  ow_enter_kb: 'ENTER o ↑ para entrar',
  ow_hint_touch: 'muévete con ◀ ▶',
  ow_hint_touch_stick: 'muévete con el joystick',
  ow_hint_gp: 'D-pad para moverte · {p} menú',
  ow_hint_kb: '← → para moverte · ESC menú',
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
  tc_down_aria: 'Abajo',
  tc_right_aria: 'Derecha',
  tc_dash_aria: 'Dash',
  tc_jump_aria: 'Saltar',
  tc_stick_aria: 'Joystick de movimiento',
  tc_skin_aria: 'Cambiar color del personaje',
  tc_acc_aria: 'Cambiar accesorio',
  tc_resume: 'Continuar',
  tc_fs: 'Pantalla completa',
  tc_restart: 'Reiniciar',
  tc_map: 'Salir al mapa',
  tc_title: 'Menú principal',
  tc_controls: 'Controles',
  tc_edit_hint: 'Arrastra los botones · toca uno para ajustar su tamaño',
  tc_edit_size: 'Tamaño',
  tc_edit_opacity: 'Opacidad',
  tc_edit_mirror: 'Espejar',
  tc_edit_reset: 'Restablecer',
  tc_edit_done: 'Listo',
  tc_edit_move: 'Mover',
  tc_move_dpad: 'Cruceta',
  tc_move_stick: 'Joystick',
};

/** The text keys: every language must have exactly these. */
export type StrKey = keyof typeof es;

// English: typed as Record<StrKey, string> so the compiler
// requires ALL the keys (not one fewer, not one extra).
const en: Record<StrKey, string> = {
  page_title: 'CRYSTALS OF THE CAVE',
  title_line1: 'CRYSTALS',
  title_line2: 'OF THE CAVE',
  rotate_title: 'ROTATE YOUR PHONE',
  rotate_sub: 'The cave is played in landscape',
  ab_doubleJump: 'DOUBLE JUMP!',
  ab_dash: 'DASH!',
  ab_wallJump: 'WALL JUMP!',
  ab_glide: 'GLIDE!',
  ab_pound: 'GROUND POUND!',
  ab_smash: 'CRYSTAL SMASH!',
  ab_dive: 'DIVE!',
  ab_shrink: 'SHRINK!',
  ab_swing: 'SWING!',
  pause_title: 'PAUSED',
  pause_resume_touch: 'use the menu buttons',
  menu_play: 'PLAY',
  menu_resume: 'RESUME',
  menu_restart: 'RESTART LEVEL',
  menu_fullscreen: 'FULLSCREEN',
  menu_language: 'LANGUAGE: ENGLISH',
  menu_exit: 'EXIT TO MAP',
  menu_mainmenu: 'MAIN MENU',
  menu_character: 'CHARACTER',
  cust_title: 'CHARACTER',
  cust_color: 'COLOR: {s}',
  cust_accessory: 'ACCESSORY: {s}',
  cust_back: 'BACK',
  skin_cristal: 'CRYSTAL',
  skin_esmeralda: 'EMERALD',
  skin_ambar: 'AMBER',
  skin_rosa: 'ROSE',
  skin_amatista: 'AMETHYST',
  acc_ninguno: 'NONE',
  acc_gorro: 'HAT',
  acc_corona: 'CROWN',
  acc_antena: 'ANTENNA',
  acc_mono: 'BOW',
  acc_bufanda: 'SCARF',
  nav_kb: '↑ ↓ select · ENTER confirm',
  nav_gp: 'D-pad select · {j} confirm',
  boss_defeated: 'GUARDIAN DEFEATED!',
  heal_popup: '+1 LIFE',
  hud_crystals: 'CRYSTALS',
  hud_points: 'POINTS',
  hud_room: 'ROOM',
  hud_stomp_boss: 'STOMP THE GUARDIAN',
  hud_cut_thread: 'SWING THROUGH HER THREAD',
  hud_stomp_fallen: 'NOW! JUMP ON HER',
  hud_lantern: 'STOMP THE LANTERN ON HIS BACK',
  hud_wait_stun: 'WAIT FOR IT TO SLAM AND REEL',
  hud_stomp_now: 'NOW! JUMP ON IT',
  hud_crest: 'STOMP ITS CREST AS IT BREACHES',
  hud_dash_boss: 'HIT IT WITH THE DASH',
  hud_pound_boss: 'DROP ON IT WITH THE POUND',
  hud_door_open: 'THE DOOR IS OPEN',
  hud_trial: 'TIME TRIAL',
  win_title: 'LEVEL COMPLETE!',
  end_title: 'YOU MADE IT!',
  end_sub: 'YOU COMPLETED CRYSTALS OF THE CAVE',
  end_levels: 'LEVELS: {n}/{m}',
  end_crystals: 'WORLD 1 CRYSTALS: {n}',
  end_total_time: 'TOTAL TIME: {t}',
  end_flavor: 'The grotto is behind you. Outside, there is light.',
  end_back: 'ENTER to return to the map',
  end_back_touch: 'tap to return to the map',
  end_back_gp: '{j} to return to the map',
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
  lvl_esporas: 'THE SPORE GARDEN',
  lvl_glaciar: 'THE SILENT GLACIER',
  lvl_fragua: 'THE CORE FORGE',
  lvl_cenote: 'THE CENOTE',
  lvl_mina: 'THE FORGOTTEN MINE',
  lvl_seda: 'THE SILK NEST',
  lvl_puerta: 'THE GREAT DOOR',
  lvl_simas: 'THE CHAINED CHASMS',
  lvl_reloj: 'THE WATER CLOCK',
  lvl_cripta: 'THE CRYPT OF THE WARDEN',
  ow_title: 'WORLD 1 · THE GROTTO',
  ow_progress: 'LEVELS {n}/{m}',
  ow_locked: '???',
  ow_enter_touch: 'JUMP to enter',
  ow_enter_gp: '{j} to enter',
  ow_enter_kb: 'ENTER or ↑ to enter',
  ow_hint_touch: 'move with ◀ ▶',
  ow_hint_touch_stick: 'move with the joystick',
  ow_hint_gp: 'D-pad to move · {p} menu',
  ow_hint_kb: '← → to move · ESC menu',
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
  tc_down_aria: 'Down',
  tc_right_aria: 'Right',
  tc_dash_aria: 'Dash',
  tc_jump_aria: 'Jump',
  tc_stick_aria: 'Movement joystick',
  tc_skin_aria: 'Change character color',
  tc_acc_aria: 'Change accessory',
  tc_resume: 'Resume',
  tc_fs: 'Fullscreen',
  tc_restart: 'Restart',
  tc_map: 'Exit to map',
  tc_title: 'Main menu',
  tc_controls: 'Controls',
  tc_edit_hint: 'Drag the buttons · tap one to size it',
  tc_edit_size: 'Size',
  tc_edit_opacity: 'Opacity',
  tc_edit_mirror: 'Mirror',
  tc_edit_reset: 'Reset',
  tc_edit_done: 'Done',
  tc_edit_move: 'Move',
  tc_move_dpad: 'D-pad',
  tc_move_stick: 'Joystick',
};

const TABLES: Record<Lang, Record<StrKey, string>> = { es, en };

/** Initial language: the saved one; else the browser's; else Spanish. */
function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    // localStorage blocked: fall back to browser detection.
  }
  // typeof-guard: in Node (tests) there's no navigator and this module still loads.
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'es';
  return nav.toLowerCase().startsWith('es') ? 'es' : 'en';
}

let current: Lang = detect();
const listeners = new Set<() => void>();

/** The active language. */
export function getLang(): Lang {
  return current;
}

/** Changes the language, saves it and notifies any listeners. */
export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // No storage: it still changes, it just isn't remembered.
  }
  for (const fn of listeners) fn();
}

/** Subscribes to language changes (to re-paint the static DOM). */
export function onLangChange(fn: () => void): void {
  listeners.add(fn);
}

/**
 * Translates a key into the active language. With `params` it replaces
 * the placeholders: t('win_points', { n: 120 }) -> "PUNTOS: 120".
 * If a key were missing in a language, it falls back to Spanish and then
 * to the raw key, so the render never breaks.
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
