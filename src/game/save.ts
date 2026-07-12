// ============================================================
//  GUARDADO PERSISTENTE (localStorage)
// ------------------------------------------------------------
//  Cada partida arranca de cero (nivel nuevo), así que no hay un
//  "progreso a medias" que guardar. Lo que SÍ persiste entre
//  sesiones son los récords POR NIVEL: mejor puntaje, mejor tiempo,
//  mejor contrarreloj y cuántas veces lo completaste. Completar un
//  nivel es lo que desbloquea el siguiente en el overworld.
//
//  El guardado lleva `version`: la v1 era de cuando el juego tenía
//  un solo nivel (récords globales); parseSave() migra esos récords
//  al primer nivel en vez de descartarlos.
//
//  parseSave/serializeSave/recordRun son puros (testeables en Node);
//  el acceso a localStorage va aparte y envuelto en try/catch: si el
//  navegador lo bloquea (incógnito estricto), el juego sigue igual,
//  solo que sin recordar entre sesiones.
// ============================================================

const KEY = 'cristales-save-v1';

export const SAVE_VERSION = 2;

// El id del primer nivel: los récords de la v1 (un solo nivel) migran acá.
// Si algún día cambia el id del nivel 1, esta constante NO debe cambiar
// sola: habría que migrar también la clave dentro de `levels`.
export const FIRST_LEVEL_ID = 'cavernas';

/** Los récords de un nivel. 0 en un tiempo significa "sin marca". */
export interface LevelRecord {
  completions: number;   // veces completado (en cualquier modo)
  bestScore: number;     // mejor puntaje (modo normal)
  bestTime: number;      // mejor tiempo al completar (modo normal)
  bestTrialTime: number; // mejor tiempo en contrarreloj
}

export interface SaveData {
  version: number;
  levels: Record<string, LevelRecord>;
}

export function emptyRecord(): LevelRecord {
  return { completions: 0, bestScore: 0, bestTime: 0, bestTrialTime: 0 };
}

const DEFAULT: SaveData = { version: SAVE_VERSION, levels: {} };

/** El récord de un nivel, sin mutar el guardado (para leer y mostrar). */
export function levelRecord(save: SaveData, levelId: string): LevelRecord {
  return save.levels[levelId] ?? emptyRecord();
}

/**
 * Cuántos niveles están jugables, en orden: el primero siempre, y cada
 * uno más al completar el anterior. (Nunca menos de 1 ni más que todos.)
 */
export function unlockedLevels(save: SaveData, levelIds: readonly string[]): number {
  let unlocked = 1;
  while (unlocked < levelIds.length && levelRecord(save, levelIds[unlocked - 1]).completions > 0) {
    unlocked++;
  }
  return Math.min(unlocked, levelIds.length);
}

/** El resultado de una corrida, para actualizar los récords. */
export interface RunResult {
  won: boolean;
  mode: 'normal' | 'trial';
  score: number;
  time: number; // segundos jugados
}

/** Qué marcas batió la corrida (para celebrarlas en pantalla). */
export interface RunFlags {
  newBestScore: boolean;
  newBestTime: boolean;
  newBestTrial: boolean;
}

/**
 * Vuelca una corrida terminada sobre los récords del nivel (mutando el
 * guardado) y devuelve qué marcas batió. Reglas: el puntaje cuenta solo
 * en modo normal (en contrarreloj se corre, no se caza); los tiempos
 * cuentan solo al ganar, cada modo con su propia marca.
 */
export function recordRun(save: SaveData, levelId: string, run: RunResult): RunFlags {
  const rec = (save.levels[levelId] ??= emptyRecord());
  const flags: RunFlags = { newBestScore: false, newBestTime: false, newBestTrial: false };
  if (run.mode === 'normal' && run.score > rec.bestScore) {
    rec.bestScore = run.score;
    flags.newBestScore = true;
  }
  if (run.won) {
    rec.completions++;
    if (run.mode === 'normal') {
      flags.newBestTime = rec.bestTime === 0 || run.time < rec.bestTime;
      if (flags.newBestTime) rec.bestTime = run.time;
    } else {
      flags.newBestTrial = rec.bestTrialTime === 0 || run.time < rec.bestTrialTime;
      if (flags.newBestTrial) rec.bestTrialTime = run.time;
    }
  }
  return flags;
}

/** Normaliza un récord crudo: números válidos o 0, nunca basura. */
function cleanRecord(raw: unknown): LevelRecord {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<LevelRecord>;
  return {
    completions: Number(r.completions) || 0,
    bestScore: Number(r.bestScore) || 0,
    bestTime: Number(r.bestTime) || 0,
    bestTrialTime: Number(r.bestTrialTime) || 0,
  };
}

/** Interpreta (y migra) un guardado crudo. Corrupto o ausente = por defecto. */
export function parseSave(raw: string | null): SaveData {
  if (!raw) return structuredClone(DEFAULT);
  try {
    const data = JSON.parse(raw) as Record<string, unknown> | null;
    if (typeof data !== 'object' || data === null) return structuredClone(DEFAULT);

    // Migración v0/v1 -> v2: el juego entero era lo que hoy es el primer
    // nivel, así que sus récords globales pasan a ser los de ese nivel.
    if (!('levels' in data)) {
      const legacy = cleanRecord({
        completions: data.victories,
        bestScore: data.bestScore,
        bestTime: data.bestTime,
      });
      const hasAnything =
        legacy.completions > 0 || legacy.bestScore > 0 || legacy.bestTime > 0;
      return {
        version: SAVE_VERSION,
        levels: hasAnything ? { [FIRST_LEVEL_ID]: legacy } : {},
      };
    }

    const levels: Record<string, LevelRecord> = {};
    const rawLevels = data.levels;
    if (typeof rawLevels === 'object' && rawLevels !== null) {
      for (const [id, rec] of Object.entries(rawLevels)) {
        levels[id] = cleanRecord(rec);
      }
    }
    return { version: SAVE_VERSION, levels };
  } catch {
    return structuredClone(DEFAULT);
  }
}

export function serializeSave(data: SaveData): string {
  return JSON.stringify(data);
}

/** Lee el guardado del navegador. Sin almacenamiento = valores por defecto. */
export function loadSave(): SaveData {
  try {
    return parseSave(localStorage.getItem(KEY));
  } catch {
    return structuredClone(DEFAULT);
  }
}

/** Escribe el guardado. Si el navegador no lo permite, no pasa nada. */
export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, serializeSave(data));
  } catch {
    // Almacenamiento no disponible: seguimos sin persistir.
  }
}
