// ============================================================
//  GUARDADO PERSISTENTE (localStorage)
// ------------------------------------------------------------
//  Cada partida arranca de cero (mundo nuevo), así que no hay un
//  "progreso a medias" que guardar. Lo que SÍ persiste entre
//  sesiones son los récords: el mejor puntaje y cuántas veces
//  completaste el juego. Eso da incentivo de score-attack.
//
//  Todo va envuelto en try/catch: si el navegador bloquea el
//  almacenamiento (modo incógnito estricto, permisos), el juego
//  sigue funcionando igual, solo que sin recordar entre sesiones.
// ============================================================

const KEY = 'cristales-save-v1';

export interface SaveData {
  bestScore: number; // el puntaje más alto logrado
  victories: number; // cuántas veces se completó el juego
}

const DEFAULT: SaveData = { bestScore: 0, victories: 0 };

/** Lee el guardado. Si no existe o está corrupto, devuelve los valores por defecto. */
export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const data = JSON.parse(raw) as Partial<SaveData>;
    // Mezclamos con DEFAULT por si el guardado viejo no tiene algún campo.
    return {
      bestScore: Number(data.bestScore) || 0,
      victories: Number(data.victories) || 0,
    };
  } catch {
    return { ...DEFAULT };
  }
}

/** Escribe el guardado. Si el navegador no lo permite, no pasa nada. */
export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Almacenamiento no disponible: seguimos sin persistir.
  }
}
