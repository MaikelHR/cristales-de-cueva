// ============================================================
//  ACCESORIOS DEL PERSONAJE (personalización, eje 2)
// ------------------------------------------------------------
//  Un accesorio es una grilla chica (14 de ancho, alineada a las
//  columnas del jugador) que se SUPERPONE sobre cada frame antes
//  de hornear: cambia la silueta de verdad (sombrero en punta,
//  corona, antena...), no solo el color. El ancla es el TOPE DE
//  LA CABEZA (primera fila con pixeles): así el accesorio
//  acompaña la respiración del idle (el frame 2 baja un pixel) y
//  cualquier pose. dy negativo = por encima de la cabeza (el
//  sprite crece hacia arriba; como se dibuja anclado a los pies,
//  el gorro sube y los pies no se mueven).
//
//  Claves de color: las que NO son de la rampa del jugador (F, Y,
//  V, t...) quedan fijas en cualquier skin; K sí es de la rampa,
//  así que un tallo K se tiñe del contorno de la skin (a propósito:
//  parece parte del cuerpo). Igual que las skins: datos puros +
//  preferencia con su propia clave de localStorage. Sin DOM.
// ============================================================

import type { StrKey } from './i18n';

const KEY = 'cristales-accesorio';

export interface AccessoryDef {
  id: string;
  nameKey: StrKey; // el nombre visible pasa SIEMPRE por i18n
  grid: readonly string[]; // 14 de ancho; vacía = sin accesorio
  dy: number; // fila donde entra la grilla, relativa al tope de la cabeza
}

export const ACCESSORIES: readonly AccessoryDef[] = [
  { id: 'ninguno', nameKey: 'acc_ninguno', grid: [], dy: 0 },
  {
    // Gorro en punta (violeta de la cueva) con destello y ala ancha.
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
    // Corona dorada de tres puntas, apoyada sobre la coronilla.
    id: 'corona',
    nameKey: 'acc_corona',
    dy: -2,
    grid: [
      '....Y..Y..Y...',
      '....YYYYYYY...',
    ],
  },
  {
    // Antena con bulbito de luz; el tallo K se tiñe con la skin.
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
    // Moño rojo ladeado sobre la cabeza.
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
    // Bufanda roja al cuello, con la puntita colgando al hombro.
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
 * Superpone la grilla de un accesorio sobre un frame del jugador.
 * Ancla: la primera fila del frame que tiene pixeles (el tope de la
 * cabeza) + dy. Si el accesorio asoma por encima del frame, se
 * anteponen filas vacías (el sprite crece hacia arriba). Los '.'
 * del accesorio son transparentes: no tapan al jugador.
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
    if (y < 0 || y >= rows.length) return; // fuera del frame: se descarta
    const out = [...rows[y]];
    for (let x = 0; x < accRow.length; x++) {
      if (accRow[x] !== '.') out[x] = accRow[x];
    }
    rows[y] = out.join('');
  });
  return rows;
}

/** Accesorio inicial: el guardado si existe; si no, ninguno. */
function detect(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && ACCESSORIES.some((a) => a.id === saved)) return saved;
  } catch {
    // Almacenamiento bloqueado (o Node): arrancamos sin accesorio.
  }
  return ACCESSORIES[0].id;
}

let current: string = detect();
const listeners = new Set<() => void>();

/** El id del accesorio activo. */
export function getAccessory(): string {
  return current;
}

/** La definición del accesorio activo (para componer y rotular). */
export function currentAccessory(): AccessoryDef {
  return ACCESSORIES.find((a) => a.id === current) ?? ACCESSORIES[0];
}

/** Cambia el accesorio (ids desconocidos se ignoran), guarda y avisa. */
export function setAccessory(id: string): void {
  if (id === current || !ACCESSORIES.some((a) => a.id === id)) return;
  current = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // Sin almacenamiento: cambia igual, solo que no se recuerda.
  }
  for (const fn of listeners) fn();
}

/** Pasa al accesorio siguiente (dir=1) o anterior (dir=-1), en rueda. */
export function cycleAccessory(dir: 1 | -1 = 1): void {
  const i = ACCESSORIES.findIndex((a) => a.id === current);
  setAccessory(ACCESSORIES[(i + dir + ACCESSORIES.length) % ACCESSORIES.length].id);
}

/** Se suscribe a los cambios de accesorio (para re-pintar el DOM táctil). */
export function onAccessoryChange(fn: () => void): void {
  listeners.add(fn);
}
