// ============================================================
//  FORMATO DE NIVEL (datos, no código)
// ------------------------------------------------------------
//  Un nivel es una tanda de salas que se juega de principio a fin:
//  aparecés en su playerSpawn, juntás sus cristales y salís por su
//  puerta. El selector de niveles (overworld) los presenta en orden;
//  completar uno desbloquea el siguiente.
//
//  `startAbilities` son las habilidades con las que ARRANCÁS el
//  nivel (las que "ya aprendiste" en niveles anteriores); la
//  habilidad nueva del nivel se gana adentro, con su reliquia.
// ============================================================

import type { AbilityName } from '../abilities';
import type { StrKey } from '../i18n';
import { validateRooms, type RoomData } from './RoomData';

export interface LevelDef {
  /** Nombre único; el guardado asocia los récords a este id. */
  id: string;
  /** Clave i18n del nombre visible (el overworld lo muestra). */
  nameKey: StrKey;
  /** Las salas del nivel. La primera es donde arranca el jugador. */
  rooms: RoomData[];
  /** Habilidades ya activas al empezar (aprendidas en niveles previos). */
  startAbilities: readonly AbilityName[];
}

/**
 * Valida una lista de niveles completa: cada nivel pasa las
 * validaciones de sala y, además, los ids de nivel no se repiten y
 * ninguna reliquia regala una habilidad que el nivel ya trae puesta.
 */
export function validateLevels(levels: LevelDef[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const level of levels) {
    if (ids.has(level.id)) errors.push(`id de nivel duplicado: "${level.id}"`);
    ids.add(level.id);
    for (const problem of validateRooms(level.rooms)) {
      errors.push(`[${level.id}] ${problem}`);
    }
    for (const room of level.rooms) {
      for (const e of room.entities) {
        if (e.type === 'relic' && level.startAbilities.includes(e.ability)) {
          errors.push(
            `[${level.id}] ${room.id}: la reliquia '${e.ability}' ya viene en startAbilities`,
          );
        }
      }
    }
  }
  return errors;
}
