// ============================================================
//  Tests de las skins del personaje (datos y preferencia)
// ------------------------------------------------------------
//  Las skins son datos puros: acá se vigila su integridad (ids
//  únicos, colores válidos, tints que solo re-pintan la rampa del
//  jugador) y la lógica de elección (setSkin ignora ids inválidos,
//  cycleSkin recorre la rueda completa). El horneado de sprites
//  necesita DOM y no se testea acá.
// ============================================================

import { beforeEach, describe, expect, it } from 'vitest';
import { SKINS, currentSkin, cycleSkin, getSkin, setSkin } from './skins';

// Las claves de la rampa del jugador en la paleta (ver art/palette.ts):
// un tint que re-pintara otra clave teñiría tiles o enemigos al hornear.
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
    expect(new Set(seen).size).toBe(SKINS.length); // pasó por todas
    expect(getSkin()).toBe(SKINS[0].id); // la vuelta completa
  });

  it('cycleSkin(-1) desde la primera cae en la última', () => {
    cycleSkin(-1);
    expect(getSkin()).toBe(SKINS[SKINS.length - 1].id);
  });
});
