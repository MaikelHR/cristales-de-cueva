// ============================================================
//  DEFINICIÓN DE UNA SALA
// ------------------------------------------------------------
//  Cada sala del mundo es un archivo en esta carpeta: su mapa
//  ASCII y sus conexiones. Agregar una sala al juego = crear un
//  archivo nuevo y sumarlo a la lista de index.ts.
// ============================================================

export interface RoomDef {
  /** Nombre único; las salidas de otras salas apuntan a este id. */
  id: string;
  /** El mapa ASCII (ver Level.ts para el significado de cada carácter). */
  map: string[];
  /** A qué sala se sale por cada borde. Sin salida = pared o vacío. */
  exits?: { left?: string; right?: string };
  /** Celda que ocupa esta sala en el minimapa. */
  mapPos: { x: number; y: number };
}
