// ============================================================
//  DEFINICIÓN DE UNA SALA
// ------------------------------------------------------------
//  Cada sala del mundo es un archivo en esta carpeta: su mapa
//  ASCII y sus conexiones. Agregar una sala al juego = crear un
//  archivo nuevo y sumarlo a la lista de index.ts.
// ============================================================

import type { AbilityName } from '../Level';

/** Una salida por un borde: apunta a otra sala. Puede ser un id pelado
 *  ('tunel') o un objeto con matices:
 *    { to, oneway:true }        -> un solo sentido (caída sin retorno directo).
 *    { to, requires:'glide' }   -> cruzar exige tener esa habilidad (gate de
 *                                  región). El fixpoint (§4.5) lo verifica.
 *  Ver §4.4: todo one-way debe tener una ruta de vuelta alternativa. */
export type Exit = string | { to: string; oneway?: boolean; requires?: AbilityName };

/** Las cuatro direcciones posibles de salida de una sala. */
export interface Exits {
  left?: Exit;
  right?: Exit;
  up?: Exit;
  down?: Exit;
}

/** El id de destino de una salida (sea string pelado u objeto). */
export function exitId(e: Exit): string {
  return typeof e === 'string' ? e : e.to;
}

/** ¿La salida es de un solo sentido? (no exige salida inversa). */
export function isOneWay(e: Exit): boolean {
  return typeof e === 'object' && !!e.oneway;
}

/** Qué habilidad exige cruzar esta salida (o null si es libre). */
export function exitRequires(e: Exit): AbilityName | null {
  return typeof e === 'object' && e.requires ? e.requires : null;
}

export interface RoomDef {
  /** Nombre único; las salidas de otras salas apuntan a este id. */
  id: string;
  /** El mapa ASCII (ver Level.ts para el significado de cada carácter). */
  map: string[];
  /** A qué sala se sale por cada borde. Sin salida = pared o vacío. */
  exits?: Exits;
  /** Celda que ocupa esta sala en el mapa. x=columna (der +), y=fila (abajo +). */
  mapPos: { x: number; y: number };
  /** Bioma al que pertenece (define paleta/atmósfera). Por defecto 'eco' (hub). */
  biome?: string;
}
