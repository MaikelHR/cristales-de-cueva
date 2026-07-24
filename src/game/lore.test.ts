import { describe, expect, it } from 'vitest';
import { LORE, LORE_IDS, loreOfLevel, loreText } from './lore';
import { LEVELS } from './world/rooms';
import { getLang, setLang, type Lang } from './i18n';

// The lore is WRITING, and writing has no compiler. These are the rules
// the plaque imposes on it — the ones that turn a good line into a line
// drawn half off the stone — plus the ones that keep the Archive from
// listing an inscription nobody can reach.
//
// They must hold with the table as it stands today (a single seed entry)
// and with the full set, so nothing here counts anything.

// ------------------------------------------------------------
//  THE PLAQUE'S BUDGET, measured rather than guessed.
// ------------------------------------------------------------
//  ui/lorePlate.ts draws a panel `session.viewW - 20` wide — 300px on
//  the game's 320px view — and puts the lines in it at font(8),
//  CENTERED, with no wrapping at all: a line is a line, and a long one
//  simply runs off both ends of the stone.
//
//  Measured in Chrome with the real `font(8)` string: every fallback of
//  '8px "JetBrains Mono", ui-monospace, monospace' advances 4.8px per
//  character (0.6 em, which is what every monospace on the list is). So
//  300px holds 62 characters edge to edge, and 60 characters (288px)
//  leaves 6px of stone showing on each side. 60 is the budget.
//
//  (The original estimate for this test was 44, which is 16 characters
//  short — worth knowing, because a three-line epitaph that has to fit
//  in 44 is a different sentence than one that fits in 60.)
const MAX_LINE = 60;

//  Titles ride the same plate at font(7) — 4.2px per character, so
//  292px of usable stone holds 69. Loose on purpose: the Archive list
//  isn't built yet, and inventing ITS budget here would be fiction.
const MAX_TITLE = 69;

//  And the plate has a BOTTOM. It is PLATE_H = 46 tall, the first line
//  sits at +16 and each one after it 9px lower, and 8px text drawn with
//  textBaseline 'top' inks from -0.7 to +8.3 (measured). Line 3 ends at
//  +42.3, inside the gold hairline at +45; a fourth would start at +43
//  and spill 6px past the plate onto the game. Three lines is what the
//  stone holds — if an inscription needs a fourth, PLATE_H in
//  ui/lorePlate.ts has to grow first.
const MAX_LINES = 3;

const LANGS: Lang[] = ['es', 'en'];

describe('la escritura de la cueva', () => {
  it('cada inscripción está en los dos idiomas', () => {
    for (const id of LORE_IDS) {
      const entry = LORE[id];
      for (const lang of LANGS) {
        expect(entry.title[lang]?.trim(), `${id}.title.${lang}`).toBeTruthy();
        expect(entry.lines[lang].length, `${id}.lines.${lang}`).toBeGreaterThan(0);
      }
    }
  });

  it('las dos versiones tienen el mismo número de líneas', () => {
    // Not a style rule: the plate is one rectangle whatever it holds, so
    // a three-line Spanish and a five-line English are the same panel
    // with two lines hanging out the bottom of one of them.
    for (const id of LORE_IDS) {
      expect(LORE[id].lines.en.length, `${id}`).toBe(LORE[id].lines.es.length);
    }
  });

  it('ninguna línea se sale de la placa a lo ancho', () => {
    for (const id of LORE_IDS) {
      for (const lang of LANGS) {
        for (const line of LORE[id].lines[lang]) {
          expect(line.length, `${id}.${lang}: "${line}"`).toBeLessThanOrEqual(MAX_LINE);
        }
        expect(LORE[id].title[lang].length, `${id}.title.${lang}`).toBeLessThanOrEqual(MAX_TITLE);
      }
    }
  });

  it('ninguna inscripción se sale de la placa a lo alto', () => {
    for (const id of LORE_IDS) {
      for (const lang of LANGS) {
        expect(LORE[id].lines[lang].length, `${id}.${lang}`).toBeLessThanOrEqual(MAX_LINES);
      }
    }
  });

  it('ninguna línea viene vacía', () => {
    // A blank row inside an epitaph is a hole in the middle of the
    // plate, and one at the end is a plate that looks broken.
    for (const id of LORE_IDS) {
      for (const lang of LANGS) {
        for (const line of LORE[id].lines[lang]) {
          expect(line.trim().length, `${id}.${lang}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('cada inscripción pertenece a un nivel que existe', () => {
    const ids = new Set(LEVELS.map((l) => l.id));
    for (const id of LORE_IDS) {
      expect(ids.has(LORE[id].level), `${id} -> ${LORE[id].level}`).toBe(true);
    }
  });

  it('LORE_IDS no repite ninguna id', () => {
    expect(new Set(LORE_IDS).size).toBe(LORE_IDS.length);
  });
});

describe('loreOfLevel', () => {
  it('devuelve solo las inscripciones de ese nivel, y todas', () => {
    for (const level of LEVELS) {
      const mine = loreOfLevel(level.id);
      for (const id of mine) expect(LORE[id].level, `${id}`).toBe(level.id);
      // Nothing left behind: what the Archive shows per level has to add
      // up to the whole table, or an inscription exists that no page lists.
      const expected = LORE_IDS.filter((id) => LORE[id].level === level.id);
      expect(mine).toEqual(expected);
    }
    expect(loreOfLevel('un-nivel-que-no-existe')).toEqual([]);
  });

  it('entre todos los niveles cubren la tabla entera', () => {
    const listed = LEVELS.flatMap((l) => loreOfLevel(l.id));
    expect(new Set(listed).size).toBe(LORE_IDS.length);
  });
});

describe('loreText', () => {
  it('devuelve el texto del idioma activo', () => {
    const before = getLang();
    try {
      for (const lang of LANGS) {
        setLang(lang);
        for (const id of LORE_IDS) {
          const { title, lines } = loreText(id);
          expect(title, `${id}.${lang}`).toBe(LORE[id].title[lang]);
          expect(lines, `${id}.${lang}`).toEqual(LORE[id].lines[lang]);
        }
      }
    } finally {
      setLang(before); // the language is global: leave it as we found it
    }
  });
});
