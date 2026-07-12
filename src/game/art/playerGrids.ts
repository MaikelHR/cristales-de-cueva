// ============================================================
//  PLAYER GRIDS (data only, no baking)
// ------------------------------------------------------------
//  The crystal being's frames as text, split out of sprites.ts
//  so they load in Node: the accessory composition
//  (accessories.ts) is tested against these real grids. Baking
//  (which does need the DOM) lives in playerSkins.ts: it tints
//  the ramp per skin and overlays the chosen accessory BEFORE
//  baking.
// ============================================================

// ---- Player (crystal being) — 14x16 ----
// Cold ramp with hue shift: W>H>B>b>d>K (top-down light). Sel-out outline:
// light (C) on top where the light hits, dark (K) below. Round head with a
// bright crown and dark-pupil eyes; body with a shaded belly (d); little
// hands (B) at the sides. Head (0-8), torso (9-11), legs (12-15).
const PLAYER_IDLE = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC', 'CKBBBBBBBBBBKC',
  '..KBBbbbbBBK..', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '...KBb..bBK...', '...KB....BK...', '...KK....KK...', '..............',
];
// Breathing: body lowered one pixel (the feet stay fixed at the bottom).
const PLAYER_IDLE2 = [
  '..............', '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..',
  '.CWHHBBBBHHWC.', '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBWPBBBBPWBHC',
  'CKBBBBBBBBBBKC', '..KBBbbbbBBK..', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..',
  '..KBbdddbBK...', '...KBb..bBK...', '...KB....BK...', '...KK....KK...',
];
// Blink: eyes closed into two little lines.
const PLAYER_BLINK = [
  '.....CCCC.....', '...CCWWWWCC...', '..CWWHHHHWWC..', '.CWHHBBBBHHWC.',
  '.CHBBBBBBBBHC.', 'CHBBBBBBBBBBHC', 'CHBBKKBBKKBBHC', 'CKBBBBBBBBBBKC',
  '..KBBbbbbBBK..', '.BKBBbbbbBBKB.', '..KBbbbbbbBK..', '..KBbdddbBK...',
  '...KBb..bBK...', '...KB....BK...', '...KK....KK...', '..............',
];
// Running: 4 frames. Legs alternate stance (open) and stride (together).
// run1/run3 = contact, run2/run4 = passing. All 16 rows.
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
// Wall sliding: faces right; the flip inverts it.
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
