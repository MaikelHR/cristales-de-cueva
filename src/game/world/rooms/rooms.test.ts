import { describe, expect, it } from 'vitest';
import { ROOMS } from './index';
import { validateRooms } from '../RoomData';

// Los mapas reales del juego son datos: estos tests los mantienen
// honestos. Si un mapa queda torcido o una salida apunta a la nada,
// falla acá con un mensaje claro, no en medio de una partida.
describe('las salas del juego', () => {
  it('pasan todas las validaciones de integridad', () => {
    expect(validateRooms(ROOMS)).toEqual([]);
  });

  it('mantienen la promesa del subtítulo: hay 5 cristales', () => {
    const crystals = ROOMS.flatMap((r) => r.entities.filter((e) => e.type === 'crystal'));
    expect(crystals).toHaveLength(5);
  });

  it('la primera sala tiene el spawn del jugador', () => {
    expect(ROOMS[0].entities.some((e) => e.type === 'playerSpawn')).toBe(true);
  });

  it('cada reliquia del mundo es de una habilidad distinta', () => {
    const abilities = ROOMS.flatMap((r) =>
      r.entities.flatMap((e) => (e.type === 'relic' ? [e.ability] : [])),
    );
    expect(new Set(abilities).size).toBe(abilities.length);
  });

  it('las salidas son recíprocas: si A sale a B, B vuelve a A', () => {
    const byId = new Map(ROOMS.map((r) => [r.id, r]));
    for (const room of ROOMS) {
      if (room.exits?.right) {
        expect(byId.get(room.exits.right)?.exits?.left).toBe(room.id);
      }
      if (room.exits?.left) {
        expect(byId.get(room.exits.left)?.exits?.right).toBe(room.id);
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
});
