import { describe, expect, it } from 'vitest';
import { validateSong, type Song } from './song';

// The song format is pure data, so it is checkable without ever waking
// an AudioContext — the same reason Level.ts stays free of the DOM.
describe('el formato de canción', () => {
  const song: Song = {
    id: 'prueba',
    bpm: 60,
    loopBeats: 4,
    notes: [
      { beat: 0, freq: 440, beats: 1, inst: 'bell' },
      { beat: 1, freq: 550, beats: 1, inst: 'pad' },
      { beat: 3, freq: 660, beats: 1 },
    ],
  };

  it('acepta una canción bien formada', () => {
    expect(validateSong(song)).toEqual([]);
  });

  it('detecta notas fuera del loop, duraciones y frecuencias inválidas', () => {
    const rota: Song = {
      id: 'rota',
      bpm: 120,
      loopBeats: 4,
      notes: [
        { beat: 4, freq: 440, beats: 1 },   // outside the loop
        { beat: 0, freq: -1, beats: 1 },    // impossible frequency
        { beat: 1, freq: 440, beats: 0 },   // zero duration
      ],
    };
    expect(validateSong(rota)).toHaveLength(3);
  });

  it('detecta un tempo o un loop imposibles', () => {
    expect(validateSong({ ...song, bpm: 0 })).toHaveLength(1);
    expect(validateSong({ ...song, loopBeats: 0 }).length).toBeGreaterThan(0);
  });

  it('detecta un barrido de frecuencia inválido', () => {
    const rota: Song = {
      ...song,
      id: 'barrido',
      notes: [{ beat: 0, freq: 440, freqEnd: 0, beats: 1 }],
    };
    expect(validateSong(rota)).toHaveLength(1);
  });
});
