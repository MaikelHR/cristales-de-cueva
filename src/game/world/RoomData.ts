// ============================================================
//  FORMATO DE SALA (datos, no código)
// ------------------------------------------------------------
//  Una sala son dos cosas separadas:
//   - `tiles`: la geometría como texto. SOLO seis caracteres:
//       '#' = bloque sólido   '.' = aire   '-' = tablón de un sentido
//       '^' = púas (dañan al pisarlas; no son sólidas)
//       '%' = bloque agrietado (sólido; lo rompen azotón/embestida)
//       '~' = hielo (sólido; patina bajo los pies)
//   - `entities`: lo que vive en la sala (enemigos, cristales,
//     reliquias, resortes, plataformas móviles, el spawn del
//     jugador, la puerta), cada uno con su celda y sus propiedades
//     tipadas.
//  Separarlos permite que una entidad tenga datos propios (p. ej.
//  qué habilidad da una reliquia) sin inventar más caracteres, y
//  deja el camino listo para importar desde un editor (LDtk/Tiled):
//  su salida se traduce a este mismo formato.
//  Agregar una sala = crear un archivo en rooms/ y sumarlo a index.ts.
// ============================================================

import type { AbilityName } from '../abilities';

/** Una celda del mapa (coordenadas de tile, no de píxel). */
export interface Cell {
  x: number;
  y: number;
}

export type EnemyKind = 'slime' | 'flyer' | 'chaser' | 'boss' | 'spitter' | 'erizo' | 'ariete';

export type EntitySpawn =
  | (Cell & { type: EnemyKind })
  | (Cell & { type: 'crystal' })
  | (Cell & { type: 'relic'; ability: AbilityName })
  | (Cell & { type: 'playerSpawn' })
  | (Cell & { type: 'door' })
  // Resorte: pisarlo lanza al jugador hacia arriba, más alto que un salto.
  | (Cell & { type: 'spring' })
  // Plataforma móvil: viaja `range` celdas por `axis` (negativo = hacia
  // la izquierda/arriba) y vuelve, en un vaivén constante. El jugador
  // que va parado encima viaja con ella.
  | (Cell & { type: 'platform'; axis: 'x' | 'y'; range: number; speed?: number })
  // Corriente ascendente: desde la boquilla (x, y) sube `height` celdas.
  // Solo empuja al jugador que PLANEA dentro de la columna.
  | (Cell & { type: 'vent'; height: number })
  // Géiser de fuego: boquilla en el piso que entra en erupción cíclica
  // (columna de llama de 4 celdas). `offset` desfasa su ciclo, para que
  // varios géiseres alternen.
  | (Cell & { type: 'geyser'; offset?: number });

export interface RoomData {
  /** Nombre único; las salidas de otras salas apuntan a este id. */
  id: string;
  /** La geometría: filas de '#', '.', '-', '^', '%' y '~'. Todas del mismo largo. */
  tiles: string[];
  /** Lo que vive en la sala, en celdas del mapa. */
  entities: EntitySpawn[];
  /** A qué sala se sale por cada borde. Sin salida = pared o vacío. */
  exits?: { left?: string; right?: string };
  /** Celda que ocupa esta sala en el minimapa. */
  mapPos: Cell;
}

const TILE_CHARS = new Set(['#', '.', '-', '^', '%', '~']);

/**
 * Revisa la integridad de las salas de UN NIVEL y devuelve la lista de
 * problemas (vacía = todo bien). La corren los tests y el arranque en
 * desarrollo: un mapa roto avisa con un mensaje claro, no con un bug raro.
 */
export function validateRooms(rooms: RoomData[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const room of rooms) {
    if (ids.has(room.id)) errors.push(`id duplicado: "${room.id}"`);
    ids.add(room.id);

    const cols = room.tiles[0]?.length ?? 0;
    room.tiles.forEach((row, y) => {
      if (row.length !== cols) {
        errors.push(`${room.id}: la fila ${y} tiene ${row.length} caracteres y la fila 0 tiene ${cols}`);
      }
      for (const ch of row) {
        if (!TILE_CHARS.has(ch)) {
          errors.push(`${room.id}: carácter desconocido '${ch}' en la fila ${y} (¿una entidad que quedó en el mapa?)`);
          break;
        }
      }
    });

    for (const e of room.entities) {
      if (e.x < 0 || e.x >= cols || e.y < 0 || e.y >= room.tiles.length) {
        errors.push(`${room.id}: entidad '${e.type}' fuera del mapa en (${e.x}, ${e.y})`);
      }
    }
  }

  for (const room of rooms) {
    for (const [side, target] of Object.entries(room.exits ?? {})) {
      if (target && !ids.has(target)) {
        errors.push(`${room.id}: la salida '${side}' apunta a una sala inexistente ("${target}")`);
      }
    }
  }

  // Invariantes del nivel: hay dónde aparecer y hay una meta.
  const spawns = rooms.flatMap((r) => r.entities.filter((e) => e.type === 'playerSpawn'));
  if (spawns.length !== 1) errors.push(`el nivel necesita exactamente 1 playerSpawn (hay ${spawns.length})`);
  const doors = rooms.flatMap((r) => r.entities.filter((e) => e.type === 'door'));
  if (doors.length === 0) errors.push('el nivel no tiene ninguna puerta (meta)');

  return errors;
}
