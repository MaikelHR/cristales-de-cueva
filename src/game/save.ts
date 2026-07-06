// ============================================================
//  GUARDADO PERSISTENTE (localStorage)
// ------------------------------------------------------------
//  Persisten dos cosas entre sesiones:
//   1) Los RÉCORDS: mejor puntaje, victorias y mejor tiempo (score-attack).
//   2) El PROGRESO en curso (bloque `progress`, opcional): habilidades,
//      cristales/reliquias tomados, checkpoint y salas visitadas. Permite
//      "Continuar" una partida a medio camino.
//
//  Todo va envuelto en try/catch: si el navegador bloquea el almacenamiento
//  (incógnito estricto, permisos), el juego sigue igual, sin recordar.
//
//  FRAGILIDAD DEL PROGRESO: los cristales/reliquias son anónimos ({x,y}); su
//  clave estable es `${roomId}:${x},${y}`. Si cambia el layout de una sala,
//  esa clave apunta a otra celda -> "Continuar" podría marcar tomado un
//  cristal que ya no existe -> 100% inalcanzable. Por eso el progreso lleva
//  `version`: al cambiar CUALQUIER layout se sube PROGRESS_VERSION, lo que
//  invalida el progreso viejo y arranca una partida nueva sin romper nada.
// ============================================================

const KEY = 'cristales-save-v1';

/** Subí esto ante CUALQUIER cambio de layout de una sala (mover/agregar/
 *  quitar un cristal, reliquia o tile). Invalida el progreso guardado.
 *  v2: re-anclaje del mapa 2D + biomas + nuevas salas (P1.c).
 *  v3: bioma Forjas + pozo en el santuario (P2.a).
 *  v4: spawn de entrada reubicado (fix del nicho encerrado) + lore (P2.b).
 *  v5: rediseño del abismo del jardín + gate de glide aplicado en runtime. */
export const PROGRESS_VERSION = 6;

/** Progreso de una partida a medio camino (opcional en SaveData). */
export interface SaveProgress {
  version: number;
  abilities: string[];           // habilidades conseguidas (AbilityName[])
  crystalsTaken: string[];       // claves `${roomId}:${x},${y}` de cristales tomados
  relicsTaken: string[];         // idem para reliquias
  checkpoint: { roomId: string; x: number; y: number };
  visited: string[];             // ids de salas visitadas
}

export interface SaveData {
  bestScore: number; // el puntaje más alto logrado
  victories: number; // cuántas veces se completó el juego
  bestTime: number;  // mejor tiempo de completado, en segundos (0 = ninguno)
  progress?: SaveProgress; // partida en curso (si hay uná para continuar)
}

const DEFAULT: SaveData = { bestScore: 0, victories: 0, bestTime: 0 };

/** Valida y normaliza un bloque de progreso crudo. Devuelve null si está
 *  ausente, corrupto o de una versión vieja (=> se ignora, partida nueva). */
function parseProgress(raw: unknown): SaveProgress | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const p = raw as Record<string, unknown>;
  if (typeof p.version !== 'number' || p.version !== PROGRESS_VERSION) return undefined;
  const cp = p.checkpoint as Record<string, unknown> | undefined;
  if (!cp || typeof cp.roomId !== 'string') return undefined;
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  return {
    version: PROGRESS_VERSION,
    abilities: strArr(p.abilities),
    crystalsTaken: strArr(p.crystalsTaken),
    relicsTaken: strArr(p.relicsTaken),
    checkpoint: {
      roomId: cp.roomId,
      x: Number(cp.x) || 0,
      y: Number(cp.y) || 0,
    },
    visited: strArr(p.visited),
  };
}

/** Lee el guardado. Si no existe o está corrupto, devuelve los valores por defecto. */
export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const data = JSON.parse(raw) as Partial<SaveData>;
    // Reconstruimos campo por campo (cualquier campo no parseado se descarta).
    const out: SaveData = {
      bestScore: Number(data.bestScore) || 0,
      victories: Number(data.victories) || 0,
      bestTime: Number(data.bestTime) || 0,
    };
    const prog = parseProgress((data as Record<string, unknown>).progress);
    if (prog) out.progress = prog;
    return out;
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
