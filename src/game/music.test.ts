import { describe, expect, it } from 'vitest';
import { SONGS, LEVEL_SONGS } from './music';
import { validateSong } from '../engine/music';
import { LEVELS } from './world/rooms';

// La banda sonora también es datos: estos tests la mantienen honesta.
// Una nota fuera del loop o un nivel sin tema fallan acá, con un
// mensaje claro, no como un silencio raro en medio de una partida.
describe('la banda sonora', () => {
  it('todas las canciones pasan las validaciones de integridad', () => {
    for (const song of SONGS) {
      expect(validateSong(song), song.id).toEqual([]);
    }
  });

  it('no hay ids de canción repetidos', () => {
    const ids = SONGS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada nivel del juego tiene su tema propio', () => {
    for (const level of LEVELS) {
      expect(LEVEL_SONGS[level.id], `nivel ${level.id}`).toBeDefined();
    }
  });

  it('todas las canciones citan el leitmotiv (la subida raíz→♭3→quinta)', () => {
    // El tema del cristal arranca subiendo una tercera menor y luego una
    // mayor (la→do→mi). Si al retocar una canción se pierde esa cita,
    // se pierde la identidad de la banda sonora: este test la protege.
    const MINOR_THIRD = Math.pow(2, 3 / 12);
    const MAJOR_THIRD = Math.pow(2, 4 / 12);
    const near = (ratio: number, interval: number): boolean =>
      Math.abs(ratio / interval - 1) < 1e-6;
    for (const song of SONGS) {
      const notes = [...song.notes].sort((a, b) => a.beat - b.beat);
      const quotes = notes.some((a) =>
        notes.some(
          (b) =>
            b.beat > a.beat && b.beat - a.beat <= 2 && near(b.freq / a.freq, MINOR_THIRD) &&
            notes.some(
              (c) =>
                c.beat > b.beat && c.beat - b.beat <= 2 && near(c.freq / b.freq, MAJOR_THIRD),
            ),
        ),
      );
      expect(quotes, `${song.id} debería citar el tema del cristal`).toBe(true);
    }
  });

  it('la música se queda debajo de los efectos de sonido', () => {
    // Los sfx viven entre 0.08 y 0.18 de volumen: ninguna nota musical
    // debe competirles. Si una canción necesita más presencia, se gana
    // con densidad de notas, no con volumen.
    for (const song of SONGS) {
      for (const note of song.notes) {
        const vol = (note.vol ?? 0.06) * (song.volume ?? 1);
        expect(vol, `${song.id} @ beat ${note.beat}`).toBeLessThanOrEqual(0.08);
      }
    }
  });
});
