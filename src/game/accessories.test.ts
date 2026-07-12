// ============================================================
//  Tests de los accesorios del personaje
// ------------------------------------------------------------
//  Dos frentes: la integridad de los DATOS (ids únicos, grillas
//  que caben en el frame y solo usan claves de la paleta) y la
//  COMPOSICIÓN (overlayGrid ancla al tope de la cabeza, hace
//  crecer el sprite hacia arriba para los gorros, respeta la
//  transparencia y acompaña la respiración del idle). Se testea
//  contra las grillas REALES del jugador: si un frame cambia de
//  forma, esto avisa. El horneado (DOM) no se testea acá.
// ============================================================

import { beforeEach, describe, expect, it } from 'vitest';
import {
  ACCESSORIES,
  currentAccessory,
  cycleAccessory,
  getAccessory,
  overlayGrid,
  setAccessory,
} from './accessories';
import { PLAYER_GRIDS } from './art/playerGrids';
import { PALETTE } from './art/palette';

const FRAME_W = 14; // el ancho del frame del jugador

describe('ACCESSORIES (datos)', () => {
  it('tiene ids únicos y arranca con "ninguno" (grilla vacía)', () => {
    const ids = ACCESSORIES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ACCESSORIES[0].grid).toHaveLength(0);
  });

  it('cada grilla cabe en el ancho del frame y usa claves de la paleta', () => {
    for (const acc of ACCESSORIES) {
      for (const row of acc.grid) {
        expect(row.length, `${acc.id}: fila más ancha que el frame`).toBeLessThanOrEqual(FRAME_W);
        for (const ch of row) {
          if (ch === '.') continue;
          expect(PALETTE[ch], `${acc.id}: clave "${ch}" no está en la paleta`).toBeDefined();
        }
      }
    }
  });
});

describe('overlayGrid (composición)', () => {
  const gorro = ACCESSORIES.find((a) => a.id === 'gorro')!;
  const bufanda = ACCESSORIES.find((a) => a.id === 'bufanda')!;

  it('sin accesorio devuelve el frame igual', () => {
    expect(overlayGrid(PLAYER_GRIDS.idle, [], 0)).toEqual(PLAYER_GRIDS.idle);
  });

  it('un gorro hace crecer el frame hacia arriba y el ala pisa la coronilla', () => {
    const out = overlayGrid(PLAYER_GRIDS.idle, gorro.grid, gorro.dy);
    expect(out).toHaveLength(PLAYER_GRIDS.idle.length + 4); // 4 filas nuevas arriba
    expect(out[4]).toBe('...MFFFFFFf...'); // el ala, sobre la fila 0 original
    expect(out[5]).toBe(PLAYER_GRIDS.idle[1]); // el resto del cuerpo, intacto
  });

  it('acompaña la respiración: en idle2 (cabeza un pixel más abajo) el gorro baja igual', () => {
    const out = overlayGrid(PLAYER_GRIDS.idle2, gorro.grid, gorro.dy);
    expect(out).toHaveLength(PLAYER_GRIDS.idle2.length + 3); // una fila menos de brote
    expect(out[4]).toBe('...MFFFFFFf...'); // el ala cae sobre el MISMO tope de cabeza
  });

  it('los puntos del accesorio son transparentes: no borran al jugador', () => {
    const out = overlayGrid(PLAYER_GRIDS.idle, bufanda.grid, bufanda.dy);
    expect(out[8]).toBe('..KVVVVVVVVK..'); // bufanda al cuello, contorno K intacto
    expect(out[9].slice(0, 5)).toBe('.BKVv'); // la puntita cuelga sobre el hombro
    expect(out).toHaveLength(PLAYER_GRIDS.idle.length); // nada crece hacia arriba
  });

  it('compone limpio sobre TODOS los frames con TODOS los accesorios', () => {
    for (const grid of Object.values(PLAYER_GRIDS)) {
      for (const acc of ACCESSORIES) {
        const out = overlayGrid(grid, acc.grid, acc.dy);
        expect(out.length).toBeGreaterThanOrEqual(grid.length);
        for (const row of out) expect(row.length).toBeLessThanOrEqual(FRAME_W);
      }
    }
  });
});

describe('elección de accesorio', () => {
  beforeEach(() => setAccessory(ACCESSORIES[0].id));

  it('setAccessory cambia a un id conocido e ignora desconocidos', () => {
    setAccessory('gorro');
    expect(getAccessory()).toBe('gorro');
    expect(currentAccessory().id).toBe('gorro');
    setAccessory('monoculo');
    expect(getAccessory()).toBe('gorro');
  });

  it('cycleAccessory recorre la rueda completa y vuelve', () => {
    const seen = new Set<string>();
    for (let i = 0; i < ACCESSORIES.length; i++) {
      seen.add(getAccessory());
      cycleAccessory(1);
    }
    expect(seen.size).toBe(ACCESSORIES.length);
    expect(getAccessory()).toBe(ACCESSORIES[0].id);
  });
});
