import { describe, expect, it, beforeEach, vi } from 'vitest';

// El secuenciador se prueba con el sintetizador de mentira: registramos
// qué tonos agendaría y con qué reloj de audio cree que vive.
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

// A 60 bpm un beat dura exactamente un segundo: las cuentas se leen solas.
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
    // El loop arranca 0.05 s en el futuro: solo el beat 0 entra en la ventana.
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
    tickMusic(); // beat 0 (en 0.05)
    clock = 0.9;
    tickMusic(); // beat 1 (en 1.05) ya asoma en la ventana
    clock = 3.8;
    tickMusic(); // beat 3 quedó atrás; el beat 0 del loop siguiente (4.05) asoma
    expect(played.map((p) => p.freq)).toEqual([440, 550, 440]);
  });

  it('se resincroniza tras un silencio largo (pestaña oculta) sin correr a alcanzar', () => {
    setSong(song);
    tickMusic();
    clock = 100;
    tickMusic(); // muy lejos del loop en curso: retoma desde el beat 0
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
    expect(played[0].volume).toBeCloseTo(0.06 * 0.5, 5); // vol por defecto, agachado
    setMusicDuck(0);
    clock = 0.9;
    tickMusic(); // el beat 1 entra en ventana pero es inaudible: ni se agenda
    expect(played).toHaveLength(1);
  });

  it('setSong con la canción que ya suena no la reinicia', () => {
    setSong(song);
    tickMusic();
    setSong({ ...song }); // otra referencia, misma identidad
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
        { beat: 4, freq: 440, beats: 1 },   // fuera del loop
        { beat: 0, freq: -1, beats: 1 },    // frecuencia imposible
        { beat: 1, freq: 440, beats: 0 },   // duración nula
      ],
    };
    expect(validateSong(rota)).toHaveLength(3);
  });
});
