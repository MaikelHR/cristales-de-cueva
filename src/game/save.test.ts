import { describe, expect, it } from 'vitest';
import {
  emptyRecord,
  FIRST_LEVEL_ID,
  markLore,
  markSecret,
  parseSave,
  recordRun,
  serializeSave,
  unlockedLevels,
  SAVE_VERSION,
  type SaveData,
} from './save';

describe('parseSave', () => {
  it('sin guardado devuelve los valores por defecto', () => {
    expect(parseSave(null)).toEqual({ version: SAVE_VERSION, levels: {}, lore: [], secrets: [] });
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
      lore: [],
      secrets: [],
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
      lore: ['cav_umbral', 'cri_sepulcro'],
      secrets: ['senda_hueco'],
    };
    expect(parseSave(serializeSave(data))).toEqual(data);
  });

  it('lo que el jugador SABE se guarda una sola vez y no se pierde', () => {
    const save: SaveData = { version: SAVE_VERSION, levels: {}, lore: [], secrets: [] };
    expect(markLore(save, 'cav_senda')).toBe(true);
    expect(markLore(save, 'cav_senda')).toBe(false); // ya la habías leído
    expect(markSecret(save, 'senda_hueco')).toBe(true);
    expect(markSecret(save, 'senda_hueco')).toBe(false);
    expect(save.lore).toEqual(['cav_senda']);
    expect(save.secrets).toEqual(['senda_hueco']);
  });

  it('un guardado v2 sube a v3 conservando los récords', () => {
    // Nobody had read anything before the cave could talk, so there is
    // nothing to convert — but the records must survive untouched.
    const v2 = JSON.stringify({
      version: 2,
      levels: { cavernas: { completions: 1, bestScore: 40, bestTime: 30, bestTrialTime: 0 } },
    });
    const migrated = parseSave(v2);
    expect(migrated.version).toBe(3);
    expect(migrated.levels.cavernas.bestScore).toBe(40);
    expect(migrated.lore).toEqual([]);
    expect(migrated.secrets).toEqual([]);
  });

  it('descarta basura en las listas de lo conocido', () => {
    const dirty = JSON.stringify({
      version: 3, levels: {},
      lore: ['cav_senda', 'cav_senda', 42, null, ''],
      secrets: 'no soy una lista',
    });
    const save = parseSave(dirty);
    expect(save.lore).toEqual(['cav_senda']); // sin duplicados ni basura
    expect(save.secrets).toEqual([]);
  });
});

describe('recordRun', () => {
  it('una victoria normal suma completado y fija puntaje y tiempo', () => {
    const save: SaveData = { version: SAVE_VERSION, levels: {}, lore: [], secrets: [] };
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
    const save: SaveData = { version: SAVE_VERSION, levels: {}, lore: [], secrets: [] };
    const flags = recordRun(save, 'cavernas', { won: false, mode: 'normal', score: 70, time: 30 });
    expect(flags.newBestScore).toBe(true);
    expect(save.levels.cavernas.completions).toBe(0);
    expect(save.levels.cavernas.bestTime).toBe(0);
  });

  it('el contrarreloj tiene su propia marca y no toca la normal', () => {
    const save: SaveData = { version: SAVE_VERSION, levels: {}, lore: [], secrets: [] };
    recordRun(save, 'cavernas', { won: true, mode: 'normal', score: 40, time: 80 });
    const flags = recordRun(save, 'cavernas', { won: true, mode: 'trial', score: 10, time: 60 });
    expect(flags).toEqual({ newBestScore: false, newBestTime: false, newBestTrial: true });
    expect(save.levels.cavernas.bestTime).toBe(80);
    expect(save.levels.cavernas.bestTrialTime).toBe(60);
    expect(save.levels.cavernas.completions).toBe(2);
  });

  it('un tiempo peor no pisa la marca', () => {
    const save: SaveData = { version: SAVE_VERSION, levels: {}, lore: [], secrets: [] };
    recordRun(save, 'cavernas', { won: true, mode: 'normal', score: 0, time: 50 });
    const flags = recordRun(save, 'cavernas', { won: true, mode: 'normal', score: 0, time: 99 });
    expect(flags.newBestTime).toBe(false);
    expect(save.levels.cavernas.bestTime).toBe(50);
  });
});

describe('unlockedLevels', () => {
  const IDS = ['cavernas', 'galerias', 'corazon'] as const;

  it('sin progreso solo está el primero', () => {
    expect(unlockedLevels({ version: SAVE_VERSION, levels: {}, lore: [], secrets: [] }, IDS)).toBe(1);
  });

  it('completar un nivel abre el siguiente', () => {
    const save: SaveData = { version: SAVE_VERSION, levels: {}, lore: [], secrets: [] };
    recordRun(save, 'cavernas', { won: true, mode: 'normal', score: 0, time: 60 });
    expect(unlockedLevels(save, IDS)).toBe(2);
  });

  it('completar todo no desbloquea más allá del final', () => {
    const save: SaveData = { version: SAVE_VERSION, levels: {}, lore: [], secrets: [] };
    for (const id of IDS) recordRun(save, id, { won: true, mode: 'normal', score: 0, time: 60 });
    expect(unlockedLevels(save, IDS)).toBe(3);
  });
});
