import { describe, expect, it } from 'vitest';
import { LEVELS, levelAtNode, nodeOfLevel, WORLD_NODE_COUNT, FINAL_LEVEL_ID } from './index';
import { validateRooms } from '../RoomData';
import { validateLevels } from '../LevelData';
import { FIRST_LEVEL_ID } from '../../save';

// The game's actual maps are data: these tests keep them honest.
// If a map ends up crooked or an exit points to nothing, it fails
// here with a clear message, not in the middle of a playthrough.
describe('los niveles del juego', () => {
  it('pasan todas las validaciones de integridad', () => {
    expect(validateLevels(LEVELS)).toEqual([]);
  });

  it('el primer nivel es el que espera la migración del guardado', () => {
    // Version 1 save records migrate to this id: renaming level 1
    // means touching save.ts too.
    expect(LEVELS[0].id).toBe(FIRST_LEVEL_ID);
  });

  it('cada nivel tiene cristales que juntar', () => {
    for (const level of LEVELS) {
      const crystals = level.rooms.flatMap((r) =>
        r.entities.filter((e) => e.type === 'crystal'),
      );
      expect(crystals.length, `nivel ${level.id}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('la primera sala de cada nivel tiene el spawn del jugador', () => {
    for (const level of LEVELS) {
      expect(
        level.rooms[0].entities.some((e) => e.type === 'playerSpawn'),
        `nivel ${level.id}`,
      ).toBe(true);
    }
  });

  it('cada reliquia de un nivel es de una habilidad distinta', () => {
    for (const level of LEVELS) {
      const abilities = level.rooms.flatMap((r) =>
        r.entities.flatMap((e) => (e.type === 'relic' ? [e.ability] : [])),
      );
      expect(new Set(abilities).size, `nivel ${level.id}`).toBe(abilities.length);
    }
  });

  it('el nivel final vive en la gran puerta (el último nodo del mapa)', () => {
    // The final level is pinned to the door; every other level stands
    // on its own index and the unbuilt nodes in between are '?' stones.
    expect(LEVELS[LEVELS.length - 1].id).toBe(FINAL_LEVEL_ID);
    expect(nodeOfLevel(LEVELS.length - 1)).toBe(WORLD_NODE_COUNT - 1);
    expect(levelAtNode(WORLD_NODE_COUNT - 1)?.id).toBe(FINAL_LEVEL_ID);
    for (let i = 0; i < LEVELS.length - 1; i++) {
      expect(nodeOfLevel(i)).toBe(i);
      expect(levelAtNode(i)?.id).toBe(LEVELS[i].id);
    }
    for (let node = LEVELS.length - 1; node < WORLD_NODE_COUNT - 1; node++) {
      expect(levelAtNode(node)).toBeNull();
    }
  });

  it('las salidas son recíprocas: si A sale a B, B vuelve a A', () => {
    for (const level of LEVELS) {
      const byId = new Map(level.rooms.map((r) => [r.id, r]));
      for (const room of level.rooms) {
        if (room.exits?.right) {
          expect(byId.get(room.exits.right)?.exits?.left, `${level.id}/${room.id}`).toBe(room.id);
        }
        if (room.exits?.left) {
          expect(byId.get(room.exits.left)?.exits?.right, `${level.id}/${room.id}`).toBe(room.id);
        }
      }
    }
  });

  it('las salas conectadas abren sus bordes a la misma altura', () => {
    // The transition preserves the player's height: if A opens its right
    // border on rows 16-18, B has to open its left border on (at least one
    // of) those rows, or the crossing spits you inside rock.
    const openRows = (tiles: string[], col: 'first' | 'last'): Set<number> => {
      const rows = new Set<number>();
      tiles.forEach((row, y) => {
        const ch = col === 'first' ? row[0] : row[row.length - 1];
        if (ch === '.') rows.add(y);
      });
      return rows;
    };
    for (const level of LEVELS) {
      const byId = new Map(level.rooms.map((r) => [r.id, r]));
      for (const room of level.rooms) {
        if (!room.exits?.right) continue;
        const next = byId.get(room.exits.right)!;
        const out = openRows(room.tiles, 'last');
        const into = openRows(next.tiles, 'first');
        const shared = [...out].filter((y) => into.has(y));
        expect(shared.length, `${level.id}: ${room.id} -> ${next.id}`).toBeGreaterThanOrEqual(2);
        // The player body is 11px (~2 tiles) tall: it only fits through TWO
        // CONTIGUOUS open rows, so the shared rows must include an adjacent
        // pair — two lone slits count 2 but let nobody through.
        const contiguous = shared.some((y) => shared.includes(y + 1));
        expect(contiguous, `${level.id}: ${room.id} -> ${next.id} (no adjacent open pair)`).toBe(true);
      }
    }
  });

  it('validateRooms detecta un mapa roto', () => {
    const errors = validateRooms([
      {
        id: 'rota',
        mapPos: { x: 0, y: 0 },
        tiles: ['###', '#s#'],
        entities: [{ type: 'crystal', x: 9, y: 9 }],
        exits: { right: 'inexistente' },
      },
    ]);
    expect(errors.some((e) => e.includes("'s'"))).toBe(true);        // invalid character
    expect(errors.some((e) => e.includes('fuera del mapa'))).toBe(true);
    expect(errors.some((e) => e.includes('inexistente'))).toBe(true); // broken exit
    expect(errors.some((e) => e.includes('playerSpawn'))).toBe(true);
    expect(errors.some((e) => e.includes('puerta'))).toBe(true);
  });

  it('validateLevels detecta ids repetidos y reliquias redundantes', () => {
    const level = LEVELS[1]; // starts with doubleJump
    const redundant = {
      ...level,
      rooms: [
        {
          ...level.rooms[0],
          entities: [
            ...level.rooms[0].entities,
            { type: 'relic', ability: 'doubleJump', x: 5, y: 5 } as const,
          ],
        },
        ...level.rooms.slice(1),
      ],
    };
    const errors = validateLevels([redundant, { ...LEVELS[0], id: redundant.id }]);
    expect(errors.some((e) => e.includes('startAbilities'))).toBe(true);
    expect(errors.some((e) => e.includes('duplicado'))).toBe(true);
  });
});
