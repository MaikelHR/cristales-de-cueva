// ============================================================
//  GUARDADO PERSISTENTE (localStorage)
// ------------------------------------------------------------
//  Cada partida arranca de cero (mundo nuevo), así que no hay un
//  "progreso a medias" que guardar. Lo que SÍ persiste entre
//  sesiones son los récords: el mejor puntaje, el mejor tiempo y
//  cuántas veces completaste el juego.
//
//  El guardado lleva `version` desde ya: cuando el formato crezca
//  (ranuras, progreso de mundo), parseSave() migra los formatos
//  viejos en vez de descartarlos. Los guardados anteriores a la
//  versión 1 (sin campo version) tienen los mismos campos.
//
//  parseSave/serializeSave son puros (testeables en Node); el
//  acceso a localStorage va aparte y envuelto en try/catch: si el
//  navegador lo bloquea (incógnito estricto), el juego sigue igual,
//  solo que sin recordar entre sesiones.
// ============================================================

const KEY = 'cristales-save-v1';

export const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  bestScore: number; // el puntaje más alto logrado
  victories: number; // cuántas veces se completó el juego
  bestTime: number;  // mejor tiempo de completado, en segundos (0 = ninguno)
}

const DEFAULT: SaveData = { version: SAVE_VERSION, bestScore: 0, victories: 0, bestTime: 0 };

/** Interpreta (y migra) un guardado crudo. Corrupto o ausente = por defecto. */
export function parseSave(raw: string | null): SaveData {
  if (!raw) return { ...DEFAULT };
  try {
    const data = JSON.parse(raw) as Partial<SaveData> | null;
    if (typeof data !== 'object' || data === null) return { ...DEFAULT };
    // Migración: v0 (sin `version`) tiene los mismos campos que v1, así
    // que basta con normalizar. Versiones futuras migran acá, caso a caso.
    return {
      version: SAVE_VERSION,
      bestScore: Number(data.bestScore) || 0,
      victories: Number(data.victories) || 0,
      bestTime: Number(data.bestTime) || 0,
    };
  } catch {
    return { ...DEFAULT };
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
    return { ...DEFAULT };
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
