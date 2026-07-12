import { describe, expect, it } from 'vitest';
import {
  emptyRecord,
  FIRST_LEVEL_ID,
  parseSave,
  recordRun,
  serializeSave,
  unlockedLevels,
  SAVE_VERSION,
  type SaveData,
} from './save';

describe('parseSave', () => {
  it('sin guardado devuelve los valores por defecto', () => {
    expect(parseSave(null)).toEqual({ version: SAVE_VERSION, levels: {} });
  });

  it('un guardado corrupto no rompe nada: valores por defecto', () => {
    expect(parseSave('{esto no es json').levels).toEqual({});
    expect(parseSave('null').levels).toEqual({});
    expect(parseSave('42').levels).toEqual({});
  });

  it('migra guardados v1 (récords globales) al primer nivel', () => {
    const legacy = JSON.stringify({ version: 1, bestScore: 120, victories: 2, bestTime: 95.4 });
    expect(parseSave(legacy)).toEqual({
      version: SAVE_VERSION,
      levels: {
        [FIRST_LEVEL_ID]: {
          completions: 2,
          bestScore: 120,
          bestTime: 95.4,
          bestTrialTime: 0,
        },
      },
    });
  });

  it('migra guardados v0 (sin campo version) igual que los v1', () => {
    const legacy = JSON.stringify({ bestScore: 50, victories: 1, bestTime: 61 });
    const save = parseSave(legacy);
    expect(save.levels[FIRST_LEVEL_ID].bestScore).toBe(50);
    expect(save.levels[FIRST_LEVEL_ID].completions).toBe(1);
  });

  it('un guardado v1 sin récords migra a un guardado vacío', () => {
    const legacy = JSON.stringify({ version: 1, bestScore: 0, victories: 0, bestTime: 0 });
    expect(parseSave(legacy).levels).toEqual({});
  });

  it('normaliza récords con basura o campos ausentes', () => {
    const dirty = JSON.stringify({
      version: 2,
      levels: { cavernas: { bestScore: 'mucho', bestTime: 33 }, rota: 'no soy un récord' },
    });
    expect(parseSave(dirty).levels).toEqual({
      cavernas: { completions: 0, bestScore: 0, bestTime: 33, bestTrialTime: 0 },
      rota: emptyRecord(),
    });
  });

  it('serializar y volver a leer es identidad', () => {
    const data: SaveData = {
      version: SAVE_VERSION,
      levels: { cavernas: { completions: 3, bestScore: 90, bestTime: 71.2, bestTrialTime: 55.8 } },
    };
    expect(parseSave(serializeSave(data))).toEqual(data);
  });
});

describe('recordRun', () => {
  it('una victoria normal suma completado y fija puntaje y tiempo', () => {
    const save: SaveData = { version: SAVE_VERSION, levels: {} };
    const flags = recordRun(save, 'cavernas', { won: true, mode: 'normal', score: 40, time: 80 });
    expect(flags).toEqual({ newBestScore: true, newBestTime: true, newBestTrial: false });
    expect(save.levels.cavernas).toEqual({
      completions: 1,
      bestScore: 40,
      bestTime: 80,
      bestTrialTime: 0,
    });
  });

  it('una derrota puede batir el puntaje pero no toca tiempos ni completados', () => {
    const save: SaveData = { version: SAVE_VERSION, levels: {} };
    const flags = recordRun(save, 'cavernas', { won: false, mode: 'normal', score: 70, time: 30 });
    expect(flags.newBestScore).toBe(true);
    expect(save.levels.cavernas.completions).toBe(0);
    expect(save.levels.cavernas.bestTime).toBe(0);
  });

  it('el contrarreloj tiene su propia marca y no toca la normal', () => {
    const save: SaveData = { version: SAVE_VERSION, levels: {} };
    recordRun(save, 'cavernas', { won: true, mode: 'normal', score: 40, time: 80 });
    const flags = recordRun(save, 'cavernas', { won: true, mode: 'trial', score: 10, time: 60 });
    expect(flags).toEqual({ newBestScore: false, newBestTime: false, newBestTrial: true });
    expect(save.levels.cavernas.bestTime).toBe(80);
    expect(save.levels.cavernas.bestTrialTime).toBe(60);
    expect(save.levels.cavernas.completions).toBe(2);
  });

  it('un tiempo peor no pisa la marca', () => {
    const save: SaveData = { version: SAVE_VERSION, levels: {} };
    recordRun(save, 'cavernas', { won: true, mode: 'normal', score: 0, time: 50 });
    const flags = recordRun(save, 'cavernas', { won: true, mode: 'normal', score: 0, time: 99 });
    expect(flags.newBestTime).toBe(false);
    expect(save.levels.cavernas.bestTime).toBe(50);
  });
});

describe('unlockedLevels', () => {
  const IDS = ['cavernas', 'galerias', 'corazon'] as const;

  it('sin progreso solo está el primero', () => {
    expect(unlockedLevels({ version: SAVE_VERSION, levels: {} }, IDS)).toBe(1);
  });

  it('completar un nivel abre el siguiente', () => {
    const save: SaveData = { version: SAVE_VERSION, levels: {} };
    recordRun(save, 'cavernas', { won: true, mode: 'normal', score: 0, time: 60 });
    expect(unlockedLevels(save, IDS)).toBe(2);
  });

  it('completar todo no desbloquea más allá del final', () => {
    const save: SaveData = { version: SAVE_VERSION, levels: {} };
    for (const id of IDS) recordRun(save, id, { won: true, mode: 'normal', score: 0, time: 60 });
    expect(unlockedLevels(save, IDS)).toBe(3);
  });
});
