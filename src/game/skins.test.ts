// ============================================================
//  Character skin tests (data and preference)
// ------------------------------------------------------------
//  Skins are pure data: here we guard their integrity (unique ids,
//  valid colors, tints that only re-paint the player ramp) and the
//  selection logic (setSkin ignores invalid ids, cycleSkin walks the
//  full wheel). Baking sprites needs the DOM and isn't tested here.
// ============================================================

import { beforeEach, describe, expect, it } from 'vitest';
import { SKINS, currentSkin, cycleSkin, getSkin, setSkin } from './skins';

// The player ramp keys in the palette (see art/palette.ts):
// a tint that re-painted another key would tint tiles or enemies when baking.
const PLAYER_KEYS = new Set(['K', 'C', 'B', 'b', 'd', 'H', 'W', 'P']);
const HEX = /^#[0-9a-f]{6}$/i;

describe('SKINS (datos)', () => {
  it('tiene ids únicos', () => {
    const ids = SKINS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('la primera skin es el look original (sin tint)', () => {
    expect(Object.keys(SKINS[0].tint)).toHaveLength(0);
  });

  it('cada tint solo re-pinta la rampa del jugador, con colores válidos', () => {
    for (const skin of SKINS) {
      for (const [key, color] of Object.entries(skin.tint)) {
        expect(PLAYER_KEYS.has(key), `${skin.id} re-pinta la clave ajena "${key}"`).toBe(true);
        expect(color, `${skin.id}.${key}`).toMatch(HEX);
      }
      expect(skin.glow, `${skin.id}.glow`).toMatch(HEX);
    }
  });
});

describe('elección de skin', () => {
  beforeEach(() => setSkin(SKINS[0].id));

  it('setSkin cambia a un id conocido y currentSkin lo refleja', () => {
    setSkin(SKINS[1].id);
    expect(getSkin()).toBe(SKINS[1].id);
    expect(currentSkin().id).toBe(SKINS[1].id);
  });

  it('setSkin ignora ids desconocidos', () => {
    setSkin('granito');
    expect(getSkin()).toBe(SKINS[0].id);
  });

  it('cycleSkin recorre todas las skins y vuelve al inicio', () => {
    const seen: string[] = [];
    for (let i = 0; i < SKINS.length; i++) {
      seen.push(getSkin());
      cycleSkin(1);
    }
    expect(new Set(seen).size).toBe(SKINS.length); // went through all
    expect(getSkin()).toBe(SKINS[0].id); // full loop around
  });

  it('cycleSkin(-1) desde la primera cae en la última', () => {
    cycleSkin(-1);
    expect(getSkin()).toBe(SKINS[SKINS.length - 1].id);
  });
});
