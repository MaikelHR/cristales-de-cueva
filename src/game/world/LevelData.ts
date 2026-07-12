// ============================================================
//  LEVEL FORMAT (data, not code)
// ------------------------------------------------------------
//  A level is a batch of rooms played from start to finish:
//  you appear at its playerSpawn, collect its crystals and exit through
//  its door. The level selector (overworld) presents them in order;
//  completing one unlocks the next.
//
//  `startAbilities` are the abilities you START the level with
//  (the ones you "already learned" in earlier levels); the
//  level's new ability is earned inside, with its relic.
// ============================================================

import type { AbilityName } from '../abilities';
import type { StrKey } from '../i18n';
import { validateRooms, type RoomData } from './RoomData';

export interface LevelDef {
  /** Unique name; the save associates records with this id. */
  id: string;
  /** i18n key of the visible name (the overworld shows it). */
  nameKey: StrKey;
  /** The level's rooms. The first is where the player starts. */
  rooms: RoomData[];
  /** Abilities already active at the start (learned in previous levels). */
  startAbilities: readonly AbilityName[];
}

/**
 * Validates a full list of levels: each level passes the room
 * validations and, additionally, level ids don't repeat and
 * no relic gives away an ability the level already has on.
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
