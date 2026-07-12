// ============================================================
//  CHARACTER ACCESSORIES (customization, axis 2)
// ------------------------------------------------------------
//  An accessory is a small grid (14 wide, aligned to the
//  player's columns) that is OVERLAID onto each frame before
//  baking: it changes the silhouette for real (pointed hat,
//  crown, antenna...), not just the color. The anchor is the TOP
//  OF THE HEAD (first row with pixels): this way the accessory
//  follows the idle breathing (frame 2 drops one pixel) and any
//  pose. Negative dy = above the head (the sprite grows upward;
//  since it's drawn anchored to the feet, the hat rises and the
//  feet don't move).
//
//  Color keys: those NOT from the player ramp (F, Y, V, t...)
//  stay fixed on any skin; K IS from the ramp, so a K stem takes
//  the color of the skin's outline (on purpose: it looks like
//  part of the body). Just like the skins: pure data + a
//  preference with its own localStorage key. No DOM.
// ============================================================

import type { StrKey } from './i18n';

const KEY = 'cristales-accesorio';

export interface AccessoryDef {
  id: string;
  nameKey: StrKey; // the visible name ALWAYS goes through i18n
  grid: readonly string[]; // 14 wide; empty = no accessory
  dy: number; // row where the grid enters, relative to the top of the head
}

export const ACCESSORIES: readonly AccessoryDef[] = [
  { id: 'ninguno', nameKey: 'acc_ninguno', grid: [], dy: 0 },
  {
    // Pointed hat (cave violet) with a glint and a wide brim.
    id: 'gorro',
    nameKey: 'acc_gorro',
    dy: -4,
    grid: [
      '.......Mf.....',
      '......MFf.....',
      '......MFf.....',
      '.....MFtf.....',
      '...MFFFFFFf...',
    ],
  },
  {
    // Golden three-pointed crown, resting on the crown of the head.
    id: 'corona',
    nameKey: 'acc_corona',
    dy: -2,
    grid: [
      '....Y..Y..Y...',
      '....YYYYYYY...',
    ],
  },
  {
    // Antenna with a little light bulb; the K stem is tinted by the skin.
    id: 'antena',
    nameKey: 'acc_antena',
    dy: -4,
    grid: [
      '.......h......',
      '......hth.....',
      '.......K......',
      '.......K......',
    ],
  },
  {
    // Red bow tilted on the head.
    id: 'mono',
    nameKey: 'acc_mono',
    dy: -1,
    grid: [
      '.........V.V..',
      '..........V...',
      '.........v.v..',
    ],
  },
  {
    // Red scarf around the neck, with the tip dangling to the shoulder.
    id: 'bufanda',
    nameKey: 'acc_bufanda',
    dy: 8,
    grid: [
      '...VVVVVVVV...',
      '...Vv.........',
      '....v.........',
    ],
  },
];

/**
 * Overlays an accessory's grid onto a player frame.
 * Anchor: the first row of the frame that has pixels (the top of
 * the head) + dy. If the accessory pokes above the frame, empty
 * rows are prepended (the sprite grows upward). The accessory's
 * '.' are transparent: they don't cover the player.
 */
export function overlayGrid(
  base: readonly string[],
  acc: readonly string[],
  dy: number,
): string[] {
  if (acc.length === 0) return [...base];
  const width = Math.max(...base.map((r) => r.length), ...acc.map((r) => r.length));
  const headTop = base.findIndex((row) => [...row].some((c) => c !== '.'));
  const start = (headTop < 0 ? 0 : headTop) + dy;
  const prepend = Math.max(0, -start);

  const rows = [
    ...Array.from({ length: prepend }, () => '.'.repeat(width)),
    ...base.map((r) => r.padEnd(width, '.')),
  ];
  acc.forEach((accRow, i) => {
    const y = prepend + start + i;
    if (y < 0 || y >= rows.length) return; // outside the frame: discarded
    const out = [...rows[y]];
    for (let x = 0; x < accRow.length; x++) {
      if (accRow[x] !== '.') out[x] = accRow[x];
    }
    rows[y] = out.join('');
  });
  return rows;
}

/** Initial accessory: the saved one if it exists; otherwise none. */
function detect(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && ACCESSORIES.some((a) => a.id === saved)) return saved;
  } catch {
    // Storage blocked (or Node): start with no accessory.
  }
  return ACCESSORIES[0].id;
}

let current: string = detect();
const listeners = new Set<() => void>();

/** The id of the active accessory. */
export function getAccessory(): string {
  return current;
}

/** The active accessory's definition (to compose and label it). */
export function currentAccessory(): AccessoryDef {
  return ACCESSORIES.find((a) => a.id === current) ?? ACCESSORIES[0];
}

/** Changes the accessory (unknown ids are ignored), saves and notifies. */
export function setAccessory(id: string): void {
  if (id === current || !ACCESSORIES.some((a) => a.id === id)) return;
  current = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // No storage: it still changes, it just isn't remembered.
  }
  for (const fn of listeners) fn();
}

/** Moves to the next accessory (dir=1) or previous (dir=-1), wrapping around. */
export function cycleAccessory(dir: 1 | -1 = 1): void {
  const i = ACCESSORIES.findIndex((a) => a.id === current);
  setAccessory(ACCESSORIES[(i + dir + ACCESSORIES.length) % ACCESSORIES.length].id);
}

/** Subscribes to accessory changes (to re-paint the touch DOM). */
export function onAccessoryChange(fn: () => void): void {
  listeners.add(fn);
}
