// ============================================================
//  Character accessory tests
// ------------------------------------------------------------
//  Two fronts: DATA integrity (unique ids, grids that fit inside
//  the frame and only use palette keys) and COMPOSITION
//  (overlayGrid anchors to the top of the head, grows the sprite
//  upward for hats, respects transparency, and follows the idle
//  breathing). Tested against the REAL player grids: if a frame
//  changes shape, this flags it. Baking (DOM) is not tested here.
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

const FRAME_W = 14; // the player frame width

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
    expect(out).toHaveLength(PLAYER_GRIDS.idle.length + 4); // 4 new rows on top
    expect(out[4]).toBe('...MFFFFFFf...'); // the brim, over the original row 0
    expect(out[5]).toBe(PLAYER_GRIDS.idle[1]); // the rest of the body, intact
  });

  it('acompaña la respiración: en idle2 (cabeza un pixel más abajo) el gorro baja igual', () => {
    const out = overlayGrid(PLAYER_GRIDS.idle2, gorro.grid, gorro.dy);
    expect(out).toHaveLength(PLAYER_GRIDS.idle2.length + 3); // one less row of growth
    expect(out[4]).toBe('...MFFFFFFf...'); // the brim lands on the SAME head top
  });

  it('los puntos del accesorio son transparentes: no borran al jugador', () => {
    const out = overlayGrid(PLAYER_GRIDS.idle, bufanda.grid, bufanda.dy);
    expect(out[8]).toBe('..KVVVVVVVVK..'); // scarf at the neck, K outline intact
    expect(out[9].slice(0, 5)).toBe('.BKVv'); // the tail hangs over the shoulder
    expect(out).toHaveLength(PLAYER_GRIDS.idle.length); // nothing grows upward
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
