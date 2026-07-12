import { describe, expect, it } from 'vitest';
import { LEVELS } from './index';
import { validateRooms } from '../RoomData';
import { validateLevels } from '../LevelData';
import { FIRST_LEVEL_ID } from '../../save';

// Los mapas reales del juego son datos: estos tests los mantienen
// honestos. Si un mapa queda torcido o una salida apunta a la nada,
// falla acá con un mensaje claro, no en medio de una partida.
describe('los niveles del juego', () => {
  it('pasan todas las validaciones de integridad', () => {
    expect(validateLevels(LEVELS)).toEqual([]);
  });

  it('el primer nivel es el que espera la migración del guardado', () => {
    // Los récords de la versión 1 del guardado migran a este id:
    // renombrar el nivel 1 exige tocar también save.ts.
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
    // La transición conserva la altura del jugador: si A abre su borde
    // derecho en las filas 16-18, B tiene que abrir su borde izquierdo
    // en (al menos una de) esas filas, o el cruce escupe dentro de roca.
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
    expect(errors.some((e) => e.includes("'s'"))).toBe(true);        // carácter inválido
    expect(errors.some((e) => e.includes('fuera del mapa'))).toBe(true);
    expect(errors.some((e) => e.includes('inexistente'))).toBe(true); // salida rota
    expect(errors.some((e) => e.includes('playerSpawn'))).toBe(true);
    expect(errors.some((e) => e.includes('puerta'))).toBe(true);
  });

  it('validateLevels detecta ids repetidos y reliquias redundantes', () => {
    const level = LEVELS[1]; // arranca con doubleJump
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
