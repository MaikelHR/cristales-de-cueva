// ============================================================
//  PERSISTENT SAVE (localStorage)
// ------------------------------------------------------------
//  Each run starts from scratch (a fresh level), so there's no
//  "half-finished progress" to save. What DOES persist across
//  sessions are the PER-LEVEL records: best score, best time,
//  best time-trial, and how many times you completed it. Completing
//  a level is what unlocks the next one in the overworld.
//
//  The save carries a `version`: v1 was from when the game had a
//  single level (global records); parseSave() migrates those records
//  onto the first level instead of discarding them.
//
//  parseSave/serializeSave/recordRun are pure (Node-testable);
//  localStorage access lives separately and wrapped in try/catch: if
//  the browser blocks it (strict incognito), the game runs the same,
//  just without remembering across sessions.
// ============================================================

const KEY = 'cristales-save-v1';

export const SAVE_VERSION = 2;

// The id of the first level: v1 records (single level) migrate here.
// If the level 1 id ever changes, this constant must NOT change on its
// own: you'd also have to migrate the key inside `levels`.
export const FIRST_LEVEL_ID = 'cavernas';

/** A level's records. 0 for a time means "no record". */
export interface LevelRecord {
  completions: number;   // times completed (in any mode)
  bestScore: number;     // best score (normal mode)
  bestTime: number;      // best completion time (normal mode)
  bestTrialTime: number; // best time-trial time
}

export interface SaveData {
  version: number;
  levels: Record<string, LevelRecord>;
}

export function emptyRecord(): LevelRecord {
  return { completions: 0, bestScore: 0, bestTime: 0, bestTrialTime: 0 };
}

const DEFAULT: SaveData = { version: SAVE_VERSION, levels: {} };

/** A level's record, without mutating the save (for reading and display). */
export function levelRecord(save: SaveData, levelId: string): LevelRecord {
  return save.levels[levelId] ?? emptyRecord();
}

/**
 * How many levels are playable, in order: the first one always, plus one
 * more each time you complete the previous. (Never fewer than 1 nor more
 * than all of them.)
 */
export function unlockedLevels(save: SaveData, levelIds: readonly string[]): number {
  let unlocked = 1;
  while (unlocked < levelIds.length && levelRecord(save, levelIds[unlocked - 1]).completions > 0) {
    unlocked++;
  }
  return Math.min(unlocked, levelIds.length);
}

/** The result of a run, used to update the records. */
export interface RunResult {
  won: boolean;
  mode: 'normal' | 'trial';
  score: number;
  time: number; // seconds played
}

/** Which records the run broke (to celebrate them on screen). */
export interface RunFlags {
  newBestScore: boolean;
  newBestTime: boolean;
  newBestTrial: boolean;
}

/**
 * Folds a finished run into the level's records (mutating the save) and
 * returns which records it broke. Rules: score counts only in normal mode
 * (in a time-trial you race, you don't hunt); times count only on a win,
 * each mode with its own record.
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

/** Normalizes a raw record: valid numbers or 0, never garbage. */
function cleanRecord(raw: unknown): LevelRecord {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<LevelRecord>;
  return {
    completions: Number(r.completions) || 0,
    bestScore: Number(r.bestScore) || 0,
    bestTime: Number(r.bestTime) || 0,
    bestTrialTime: Number(r.bestTrialTime) || 0,
  };
}

/** Parses (and migrates) a raw save. Corrupt or absent = default. */
export function parseSave(raw: string | null): SaveData {
  if (!raw) return structuredClone(DEFAULT);
  try {
    const data = JSON.parse(raw) as Record<string, unknown> | null;
    if (typeof data !== 'object' || data === null) return structuredClone(DEFAULT);

    // Migration v0/v1 -> v2: the whole game was what today is the first
    // level, so its global records become that level's records.
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

/** Reads the save from the browser. No storage = default values. */
export function loadSave(): SaveData {
  try {
    return parseSave(localStorage.getItem(KEY));
  } catch {
    return structuredClone(DEFAULT);
  }
}

/** Writes the save. If the browser doesn't allow it, nothing happens. */
export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, serializeSave(data));
  } catch {
    // Storage unavailable: we carry on without persisting.
  }
}
