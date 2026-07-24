import { describe, expect, it } from 'vitest';
import {
  LEVELS, levelAtNode, nodeOfLevel, WORLD_NODE_COUNT, GROTTO_NODE_COUNT,
  FINAL_LEVEL_ID, isChallengeNode,
} from './index';
import { validateRooms } from '../RoomData';
import { validateLevels } from '../LevelData';
import { FIRST_LEVEL_ID, SAVE_VERSION, recordRun, unlockedLevels, type SaveData } from '../../save';
import { LORE_IDS } from '../../lore';

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

  it('la gran puerta cierra la gruta, y el camino sigue hacia los desafíos', () => {
    // Every level stands on the node of its own index (LEVELS order IS
    // map order), the door is the TENTH — it closes world 1 and fires
    // the ending — and anything past it is a challenge node.
    expect(LEVELS[GROTTO_NODE_COUNT - 1].id).toBe(FINAL_LEVEL_ID);
    expect(levelAtNode(GROTTO_NODE_COUNT - 1)?.id).toBe(FINAL_LEVEL_ID);
    for (let i = 0; i < LEVELS.length; i++) {
      expect(nodeOfLevel(i)).toBe(i);
      expect(levelAtNode(i)?.id).toBe(LEVELS[i].id);
    }
    // Nodes without a level yet are '?' stones, never a crash.
    for (let node = LEVELS.length; node < WORLD_NODE_COUNT; node++) {
      expect(levelAtNode(node)).toBeNull();
    }
    // The challenge road starts right after the grotto.
    expect(isChallengeNode(GROTTO_NODE_COUNT - 1)).toBe(false);
    expect(isChallengeNode(GROTTO_NODE_COUNT)).toBe(true);
  });

  it('terminar un nivel abre el siguiente, hasta el último de la senda', () => {
    // Nivel a nivel: al completar el i-ésimo, el nodo i+1 tiene que
    // quedar pisable. El último desafío se abre igual que el primero.
    const save: SaveData = { version: SAVE_VERSION, levels: {}, lore: [], secrets: [] };
    const ids = LEVELS.map((l) => l.id);
    for (let i = 0; i < LEVELS.length; i++) {
      const maxNode = nodeOfLevel(unlockedLevels(save, ids) - 1);
      expect(maxNode, `antes de ${ids[i]}`).toBe(i);
      recordRun(save, ids[i], { won: true, mode: 'normal', score: 0, time: 60 });
    }
    expect(nodeOfLevel(unlockedLevels(save, ids) - 1)).toBe(LEVELS.length - 1);
    expect(levelAtNode(LEVELS.length - 1)?.id).toBe(LEVELS[LEVELS.length - 1].id);
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
    // A '*' counts as OPEN. It is solid rock to the physics, but a false
    // wall is a hole that hasn't been opened yet: the moment someone
    // pounds or smashes it, that row IS the crossing, and it had better
    // meet floor on the other side. Counting it as wall would report a
    // secret room reached through one as having no open border at all.
    // The convention in the data is to leave the border column a literal
    // '.' and put the '*' one column in — but the helper doesn't lean on
    // that, because being right is cheaper than remembering.
    const openRows = (tiles: string[], col: 'first' | 'last'): Set<number> => {
      const rows = new Set<number>();
      tiles.forEach((row, y) => {
        const ch = col === 'first' ? row[0] : row[row.length - 1];
        if (ch === '.' || ch === '*') rows.add(y);
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

// The cave's voice and the things it hides. Nothing of this is placed in
// the levels YET — every loop below runs over an empty set today, which
// is exactly why they are written now: the first glyph carved into a
// wall, the first room hung behind a false wall, arrives with its rules
// already watching it, instead of arriving and quietly breaking one.
describe('las inscripciones y las salas secretas', () => {
  it('cada glifo nombra una inscripción escrita', () => {
    // `LoreId` is derived from LORE, so a typo is a compile error — but
    // tsc only guards the SOURCE. This says the same thing about the data
    // that actually ships, which is what catches an id RENAMED in the
    // table while a room keeps calling for the old one.
    for (const level of LEVELS) {
      for (const room of level.rooms) {
        for (const e of room.entities) {
          if (e.type !== 'glifo') continue;
          expect(LORE_IDS, `${level.id}/${room.id}`).toContain(e.lore);
        }
      }
    }
  });

  it('ninguna inscripción está colocada dos veces en todo el juego', () => {
    // validateRooms already forbids it WITHIN a level; the Archive lists
    // an inscription once, so two levels sharing one is the same bug with
    // a wider blast radius.
    const placed = LEVELS.flatMap((l) =>
      l.rooms.flatMap((r) => r.entities.flatMap((e) => (e.type === 'glifo' ? [e.lore] : []))),
    );
    expect(new Set(placed).size).toBe(placed.length);
  });

  it('ninguna sala secreta guarda algo que la partida necesite', () => {
    // A crystal behind a false wall would gate the door on finding it; a
    // boss there keeps the door shut forever with no way to know why.
    const FORBIDDEN: readonly string[] = [
      'crystal', 'playerSpawn', 'door',
      'boss', 'ariete', 'ajolote', 'custodio', 'capataz', 'matriarca',
    ];
    for (const level of LEVELS) {
      for (const room of level.rooms) {
        if (!room.secret) continue;
        const found = room.entities.map((e) => e.type).filter((t) => FORBIDDEN.includes(t));
        expect(found, `${level.id}/${room.id}`).toEqual([]);
      }
    }
  });

  it('cada sala secreta cuelga de una columna del camino, y nunca es la primera', () => {
    for (const level of LEVELS) {
      // The spine is what the progress bar counts: a secret rides one of
      // its columns instead of adding a segment nobody can reach.
      const spineCols = new Set(level.rooms.filter((r) => !r.secret).map((r) => r.mapPos.x));
      // And the run has to START somewhere ordinary: rooms[0] is where
      // the player spawns, which a secret room may not even contain.
      expect(level.rooms[0].secret ?? false, `${level.id}`).toBe(false);
      for (const room of level.rooms) {
        if (!room.secret) continue;
        expect(spineCols.has(room.mapPos.x), `${level.id}/${room.id}`).toBe(true);
      }
    }
  });

  it('los velos y los murales caben en la sala que los cuelga', () => {
    for (const level of LEVELS) {
      for (const room of level.rooms) {
        const cols = room.tiles[0].length;
        const rows = room.tiles.length;
        for (const e of room.entities) {
          const where = `${level.id}/${room.id} en (${e.x}, ${e.y})`;
          if (e.type === 'velo') {
            // A curtain hangs over a hole: half of it off the map means
            // half the hole is still in plain sight.
            expect(e.w, where).toBeGreaterThan(0);
            expect(e.h, where).toBeGreaterThan(0);
            expect(e.x + e.w, where).toBeLessThanOrEqual(cols);
            expect(e.y + e.h, where).toBeLessThanOrEqual(rows);
          }
          if (e.type === 'mural') {
            // Only the ANCHOR. The painted extent is `muralSize()` in
            // art/murals.ts, and that module imports the tile sets, which
            // import the sprite atlas, which bakes canvases at load — so
            // it cannot be read from Node. Checking the corner is what is
            // honestly available here.
            expect(e.x >= 0 && e.x < cols, where).toBe(true);
            expect(e.y >= 0 && e.y < rows, where).toBe(true);
          }
        }
      }
    }
  });

  it('validateRooms rechaza una sala secreta que esconde lo obligatorio', () => {
    const errors = validateRooms([
      {
        id: 'nave',
        mapPos: { x: 0, y: 0 },
        tiles: ['....', '####'],
        entities: [
          { type: 'playerSpawn', x: 1, y: 0 },
          { type: 'door', x: 2, y: 0 },
        ],
        exits: { right: 'camara' },
      },
      {
        id: 'camara',
        secret: true,
        mapPos: { x: 7, y: 0 }, // no room of the spine stands in column 7
        tiles: ['....', '####'],
        entities: [
          { type: 'crystal', x: 1, y: 0 },
          { type: 'ariete', x: 2, y: 0 },
        ],
        exits: { left: 'nave' },
      },
    ]);
    expect(errors.some((e) => e.includes("no puede contener 'crystal'"))).toBe(true);
    expect(errors.some((e) => e.includes("un jefe ('ariete')"))).toBe(true);
    expect(errors.some((e) => e.includes('columna 7'))).toBe(true);
  });

  it('validateRooms acepta una sala secreta bien hecha', () => {
    // The same shape done right: hung on the nave's own column, holding
    // only what a secret is allowed to hold — an inscription and points.
    const errors = validateRooms([
      {
        id: 'nave',
        mapPos: { x: 0, y: 0 },
        tiles: ['....', '####'],
        entities: [
          { type: 'playerSpawn', x: 1, y: 0 },
          { type: 'door', x: 2, y: 0 },
        ],
        exits: { right: 'camara' },
      },
      {
        id: 'camara',
        secret: true,
        mapPos: { x: 0, y: 0 },
        tiles: ['*...', '####'],
        entities: [
          // Whichever inscription happens to be first: the table is
          // being written, and pinning an id here would rot with it.
          { type: 'glifo', x: 1, y: 0, lore: LORE_IDS[0] },
          { type: 'vestigio', x: 2, y: 0 },
        ],
        exits: { left: 'nave' },
      },
    ]);
    expect(errors).toEqual([]);
  });
});

// You read an inscription STANDING ON YOUR FEET, at full size, within
// 12px of it (systems/lore.ts). A glyph carved somewhere with no floor
// in front of it is unreadable, and nothing else in the build would
// notice — it draws fine, it validates fine, it just never speaks.
describe('las inscripciones', () => {
  it('todas tienen dónde pararse a leerlas', () => {
    for (const level of LEVELS) {
      for (const room of level.rooms) {
        const solid = (r: number, c: number): boolean => {
          const ch = room.tiles[r]?.[c];
          return ch === '#' || ch === '%' || ch === '*' || ch === '~';
        };
        const air = (r: number, c: number): boolean => {
          const ch = room.tiles[r]?.[c];
          return ch !== undefined && !solid(r, c);
        };
        for (const e of room.entities) {
          if (e.type !== 'glifo') continue;
          // A standing spot: two clear rows over a solid floor, in a
          // column within reach of the plaque, at a height whose body
          // can touch it.
          let standable = false;
          for (let c = e.x - 2; c <= e.x + 2 && !standable; c++) {
            for (let f = e.y - 1; f <= e.y + 3; f++) {
              if (solid(f, c) && air(f - 1, c) && air(f - 2, c)) { standable = true; break; }
            }
          }
          expect(standable, `${level.id}/${room.id}: la inscripción '${e.lore}' en (${e.x},${e.y}) no tiene piso enfrente`).toBe(true);
        }
      }
    }
  });
});
