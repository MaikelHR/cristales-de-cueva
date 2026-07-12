// ============================================================
//  GRILLAS DEL JUGADOR (solo datos, sin hornear)
// ------------------------------------------------------------
//  Los frames del ser de cristal como texto, separados de
//  sprites.ts para que carguen en Node: la composición de
//  accesorios (accessories.ts) se testea contra estas grillas
//  reales. El horneado (que sí necesita DOM) vive en
//  playerSkins.ts: tinta la rampa por skin y superpone el
//  accesorio elegido ANTES de hornear.
// ============================================================

// ---- Jugador (ser de cristal) — 14x16 ----
// Rampa fría con hue shift: W>H>B>b>d>K (luz cenital). Contorno sel-out:
// claro (C) arriba donde pega la luz, oscuro (K) abajo. Cabeza redonda con
// corona brillante y ojos de pupila oscura; cuerpo con panza en sombra (d);
// manitas (B) a los lados. Cabeza (0-8), torso (9-11), piernas (12-15).
const PLAYER_IDLE = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC', 'CKBBBBBBBBBBKC',
  '..KBBbbbbBBK..', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '...KBb..bBK...', '...KB....BK...', '...KK....KK...', '..............',
];
// Respiración: cuerpo bajado un pixel (los pies quedan fijos abajo).
const PLAYER_IDLE2 = [
  '..............', '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..',
  '.CWHHBBBBHHWC.', '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC',
  'CKBBBBBBBBBBKC', '..KBBbbbbBBK..', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..',
  '..KBbdddbBK...', '...KBb..bBK...', '...KB....BK...', '...KK....KK...',
];
// Parpadeo: ojos cerrados en dos rayitas.
const PLAYER_BLINK = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBBKKBBKKBBHC', 'CKBBBBBBBBBBKC',
  '..KBBbbbbBBK..', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '...KBb..bBK...', '...KB....BK...', '...KK....KK...', '..............',
];
// Correr: 4 frames. Piernas alternan apoyo (abiertas) y paso (juntas).
// run1/run3 = contacto, run2/run4 = pasada. Todos a 16 filas.
const PLAYER_RUN1 = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC', 'CKBBBBBBBBBBKC',
  '..KBBbbbbBBK..', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '..KBb...bBK...', '.KKB.....BK...', '.KK......KK...', '..............',
];
const PLAYER_RUN2 = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC', 'CKBBBBBBBBBBKC',
  '..KBBbbbbBBK..', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '...KBbbBK.....', '...KBBBK......', '...KKKK.......', '..............',
];
const PLAYER_RUN3 = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC', 'CKBBBBBBBBBBKC',
  '..KBBbbbbBBK..', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '...KBb...bBK..', '...KB.....BKK.', '...KK......KK.', '..............',
];
const PLAYER_RUN4 = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC', 'CKBBBBBBBBBBKC',
  '..KBBbbbbBBK..', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '...KBbbBK.....', '...KBBBK......', '...KKKK.......', '..............',
];
const PLAYER_JUMP = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC', 'CKBBBBBBBBBBKC',
  '.BKBBbbbbBBKB.', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '...KBb..bBK...', '....KddddK....', '....KKKK......', '..............',
];
const PLAYER_FALL = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC', 'CKBBBBBBBBBBKC',
  'BKBBbbbbBBKB.', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '..KBb...bBK...', '.Kd.......dK..', '.KK.......KK..', '..............',
];
// Deslizando por la pared: mira a la derecha; el flip lo invierte.
const PLAYER_WALL = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC', 'CKBBBBBBBBBBKC',
  '..KBBbbbbBBKB', '..KBbbbbbbBKd', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '..KBb..bBK...', '..Kd...dK....', '..KK...KK....', '..............',
];

export const PLAYER_GRIDS = {
  idle: PLAYER_IDLE,
  idle2: PLAYER_IDLE2,
  blink: PLAYER_BLINK,
  run1: PLAYER_RUN1,
  run2: PLAYER_RUN2,
  run3: PLAYER_RUN3,
  run4: PLAYER_RUN4,
  jump: PLAYER_JUMP,
  fall: PLAYER_FALL,
  wall: PLAYER_WALL,
} as const;
