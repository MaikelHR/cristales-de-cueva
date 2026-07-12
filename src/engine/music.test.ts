import { describe, expect, it, beforeEach, vi } from 'vitest';

// The sequencer is tested against a fake synth: we record which
// tones it would schedule and which audio clock it thinks it lives on.
interface Played {
  freq: number;
  volume?: number;
  delay?: number;
  duration: number;
}
const played: Played[] = [];
let clock: number | null = 0;

vi.mock('./audio', () => ({
  playTone: (opts: Played): void => {
    played.push(opts);
  },
  audioNow: (): number | null => clock,
}));

import { setSong, setMusicDuck, tickMusic, validateSong, type Song } from './music';

// At 60 bpm a beat lasts exactly one second: the math reads itself.
const song: Song = {
  id: 'prueba',
  bpm: 60,
  loopBeats: 4,
  notes: [
    { beat: 0, freq: 440, beats: 1 },
    { beat: 1, freq: 550, beats: 1 },
    { beat: 3, freq: 660, beats: 1 },
  ],
};

beforeEach(() => {
  played.length = 0;
  clock = 0;
  setSong(null);
  setMusicDuck(1);
});

describe('el secuenciador de música', () => {
  it('agenda solo las notas que caen dentro de la ventana de anticipación', () => {
    setSong(song);
    tickMusic();
    // The loop starts 0.05 s in the future: only beat 0 falls in the window.
    expect(played.map((p) => p.freq)).toEqual([440]);
    expect(played[0].delay).toBeCloseTo(0.05, 5);
  });

  it('no agenda dos veces la misma nota en ticks sucesivos', () => {
    setSong(song);
    tickMusic();
    tickMusic();
    expect(played.map((p) => p.freq)).toEqual([440]);
  });

  it('avanza con el reloj y da la vuelta al loop', () => {
    setSong(song);
    tickMusic(); // beat 0 (at 0.05)
    clock = 0.9;
    tickMusic(); // beat 1 (at 1.05) now peeks into the window
    clock = 3.8;
    tickMusic(); // beat 3 is behind us; beat 0 of the next loop (4.05) peeks in
    expect(played.map((p) => p.freq)).toEqual([440, 550, 440]);
  });

  it('se resincroniza tras un silencio largo (pestaña oculta) sin correr a alcanzar', () => {
    setSong(song);
    tickMusic();
    clock = 100;
    tickMusic(); // far past the current loop: picks back up from beat 0
    expect(played.map((p) => p.freq)).toEqual([440, 440]);
    expect(played[1].delay).toBeCloseTo(0.05, 5);
  });

  it('espera sin drama a que el audio despierte', () => {
    clock = null;
    setSong(song);
    expect(() => tickMusic()).not.toThrow();
    expect(played).toEqual([]);
  });

  it('el duck atenúa las notas nuevas y en cero las calla del todo', () => {
    setSong(song);
    setMusicDuck(0.5);
    tickMusic();
    expect(played[0].volume).toBeCloseTo(0.06 * 0.5, 5); // default vol, ducked
    setMusicDuck(0);
    clock = 0.9;
    tickMusic(); // beat 1 enters the window but is inaudible: not even scheduled
    expect(played).toHaveLength(1);
  });

  it('setSong con la canción que ya suena no la reinicia', () => {
    setSong(song);
    tickMusic();
    setSong({ ...song }); // different reference, same identity
    tickMusic();
    expect(played.map((p) => p.freq)).toEqual([440]);
  });

  it('validateSong detecta notas fuera del loop y duraciones inválidas', () => {
    expect(validateSong(song)).toEqual([]);
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
});
