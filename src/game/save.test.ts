import { describe, expect, it } from 'vitest';
import { parseSave, serializeSave, SAVE_VERSION } from './save';

describe('parseSave', () => {
  it('sin guardado devuelve los valores por defecto', () => {
    expect(parseSave(null)).toEqual({
      version: SAVE_VERSION,
      bestScore: 0,
      victories: 0,
      bestTime: 0,
    });
  });

  it('un guardado corrupto no rompe nada: valores por defecto', () => {
    expect(parseSave('{esto no es json').bestScore).toBe(0);
    expect(parseSave('null').victories).toBe(0);
    expect(parseSave('42').bestTime).toBe(0);
  });

  it('migra guardados v0 (sin campo version)', () => {
    const legacy = JSON.stringify({ bestScore: 120, victories: 2, bestTime: 95.4 });
    expect(parseSave(legacy)).toEqual({
      version: SAVE_VERSION,
      bestScore: 120,
      victories: 2,
      bestTime: 95.4,
    });
  });

  it('normaliza campos ausentes o con basura', () => {
    const dirty = JSON.stringify({ bestScore: 'mucho', bestTime: 33 });
    expect(parseSave(dirty)).toEqual({
      version: SAVE_VERSION,
      bestScore: 0,
      victories: 0,
      bestTime: 33,
    });
  });

  it('serializar y volver a leer es identidad', () => {
    const data = { version: SAVE_VERSION, bestScore: 7, victories: 1, bestTime: 61.2 };
    expect(parseSave(serializeSave(data))).toEqual(data);
  });
});
