// ============================================================
//  ROOM FORMAT (data, not code)
// ------------------------------------------------------------
//  A room is two separate things:
//   - `tiles`: the geometry as text. ONLY six characters:
//       '#' = solid block   '.' = air   '-' = one-way plank
//       '^' = spikes (hurt when stepped on; not solid)
//       '%' = cracked block (solid; broken by pound/dash)
//       '~' = ice (solid; slippery underfoot)
//   - `entities`: what lives in the room (enemies, crystals,
//     relics, springs, moving platforms, the player spawn,
//     the door), each with its cell and its typed
//     properties.
//  Separating them lets an entity carry its own data (e.g.
//  which ability a relic grants) without inventing more characters, and
//  keeps the path open for importing from an editor (LDtk/Tiled):
//  its output maps to this very format.
//  Adding a room = create a file in rooms/ and register it in index.ts.
// ============================================================

import type { AbilityName } from '../abilities';

/** A map cell (tile coordinates, not pixels). */
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
  // Spring: stepping on it launches the player upward, higher than a jump.
  | (Cell & { type: 'spring' })
  // Moving platform: travels `range` cells along `axis` (negative = toward
  // left/up) and back, in a constant back-and-forth. A player standing
  // on top rides along with it.
  | (Cell & { type: 'platform'; axis: 'x' | 'y'; range: number; speed?: number })
  // Updraft: rises `height` cells from the nozzle at (x, y).
  // Only pushes a player who is GLIDING inside the column.
  | (Cell & { type: 'vent'; height: number })
  // Fire geyser: a floor nozzle that erupts cyclically
  // (4-cell flame column). `offset` phase-shifts its cycle, so
  // multiple geysers alternate.
  | (Cell & { type: 'geyser'; offset?: number });

export interface RoomData {
  /** Unique name; exits from other rooms point to this id. */
  id: string;
  /** The geometry: rows of '#', '.', '-', '^', '%' and '~'. All the same length. */
  tiles: string[];
  /** What lives in the room, in map cells. */
  entities: EntitySpawn[];
  /** Which room you exit to on each edge. No exit = wall or void. */
  exits?: { left?: string; right?: string };
  /** The cell this room occupies on the minimap. */
  mapPos: Cell;
}

const TILE_CHARS = new Set(['#', '.', '-', '^', '%', '~']);

/**
 * Checks the integrity of ONE LEVEL's rooms and returns the list of
 * problems (empty = all good). Run by the tests and dev startup:
 * a broken map warns with a clear message, not a weird bug.
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

  // Level invariants: there's somewhere to spawn and there's a goal.
  const spawns = rooms.flatMap((r) => r.entities.filter((e) => e.type === 'playerSpawn'));
  if (spawns.length !== 1) errors.push(`el nivel necesita exactamente 1 playerSpawn (hay ${spawns.length})`);
  const doors = rooms.flatMap((r) => r.entities.filter((e) => e.type === 'door'));
  if (doors.length === 0) errors.push('el nivel no tiene ninguna puerta (meta)');

  return errors;
}
