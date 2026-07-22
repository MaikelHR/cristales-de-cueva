import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { Song } from './song';

// The sequencer is tested against a fake Tone and a fake orchestra: we
// record the events it hands to the Transport and the gain it asks for,
// without ever opening an AudioContext.
//
// vi.mock factories are hoisted above the imports, so everything they
// touch has to be hoisted with them — hence vi.hoisted() rather than
// plain top-level consts.
interface PartEvent { time: number; note: { freq: number }; velocity: number }
interface FakePart {
  events: PartEvent[];
  loop: boolean;
  loopEnd: number;
  started: boolean;
  disposed: boolean;
}

const spy = vi.hoisted(() => ({
  parts: [] as FakePart[],
  transport: 'stopped',
  bpm: 0,
  ready: true,
  gains: [] as number[],
  mixBpm: [] as number[],
  released: 0,
}));

vi.mock('tone', () => {
  class Part {
    events: PartEvent[];
    loop = false;
    loopStart = 0;
    loopEnd = 0;
    started = false;
    disposed = false;
    constructor(_cb: unknown, events: PartEvent[]) {
      this.events = events;
      spy.parts.push(this as unknown as FakePart);
    }
    start(): this { this.started = true; return this; }
    stop(): this { this.started = false; return this; }
    dispose(): this { this.disposed = true; return this; }
  }
  return {
    Part,
    getTransport: () => ({
      get state() { return spy.transport; },
      start: () => { spy.transport = 'started'; },
      bpm: {
        set value(v: number) { spy.bpm = v; },
        get value() { return spy.bpm; },
      },
    }),
  };
});

vi.mock('./audio', () => ({
  playNote: () => {},
  audioReady: () => spy.ready,
  setMusicGain: (g: number) => { spy.gains.push(g); },
  setMix: (_m: unknown, songBpm: number) => { spy.mixBpm.push(songBpm); },
  releaseAll: () => { spy.released++; },
}));

const { setSong, setMusicDuck, tickMusic } = await import('./music');

// At 60 bpm a beat lasts exactly one second: the math reads itself.
const song: Song = {
  id: 'prueba',
  bpm: 60,
  loopBeats: 4,
  notes: [
    { beat: 0, freq: 440, beats: 1, vol: 0.08 },  // at the ceiling
    { beat: 1, freq: 550, beats: 1, vol: 0.04 },  // half as present
    { beat: 3, freq: 660, beats: 1 },             // default 0.06
  ],
};

beforeEach(() => {
  spy.parts.length = 0;
  spy.gains.length = 0;
  spy.mixBpm.length = 0;
  spy.released = 0;
  spy.transport = 'stopped';
  spy.ready = true;
  setSong(null);
  setMusicDuck(1);
});

describe('el secuenciador de música', () => {
  it('entrega la canción entera al Transport como un Part en loop', () => {
    setSong(song);
    expect(spy.parts).toHaveLength(1);
    const part = spy.parts[0];
    expect(part.started).toBe(true);
    expect(part.loop).toBe(true);
    expect(part.loopEnd).toBeCloseTo(4, 5); // 4 beats a 60 bpm = 4 segundos
    expect(part.events.map((e) => e.note.freq)).toEqual([440, 550, 660]);
  });

  it('convierte los beats a segundos con el tempo de la canción', () => {
    setSong({ ...song, id: 'rapida', bpm: 120 });
    // A 120 bpm el beat dura medio segundo.
    expect(spy.parts[0].events.map((e) => e.time)).toEqual([0, 0.5, 1.5]);
    expect(spy.parts[0].loopEnd).toBeCloseTo(2, 5);
  });

  it('traduce el volumen de la nota a una velocidad relativa al techo', () => {
    setSong(song);
    const [a, b, c] = spy.parts[0].events.map((e) => e.velocity);
    expect(a).toBeCloseTo(1, 5);      // 0.08 = el techo de la mezcla
    expect(b).toBeCloseTo(0.5, 5);    // 0.04 = la mitad de presencia
    expect(c).toBeCloseTo(0.75, 5);   // 0.06 por defecto
  });

  it('arranca el Transport y le fija el tempo', () => {
    setSong(song);
    expect(spy.transport).toBe('started');
    expect(spy.bpm).toBe(60);
    expect(spy.mixBpm[0]).toBe(60);
  });

  it('setSong con la canción que ya suena no la reinicia', () => {
    setSong(song);
    setSong({ ...song }); // different reference, same identity
    expect(spy.parts).toHaveLength(1);
    expect(spy.parts[0].disposed).toBe(false);
  });

  it('al cambiar de canción suelta las voces y descarta el Part anterior', () => {
    setSong(song);
    setSong({ ...song, id: 'otra' });
    expect(spy.parts[0].disposed).toBe(true);
    expect(spy.parts).toHaveLength(2);
    expect(spy.released).toBeGreaterThan(0);
  });

  it('espera sin drama a que el audio despierte, y arranca al hacerlo', () => {
    spy.ready = false;
    setSong(song);
    expect(spy.parts).toHaveLength(0);   // nada agendado todavía
    expect(() => tickMusic()).not.toThrow();
    spy.ready = true;
    tickMusic();
    expect(spy.parts).toHaveLength(1);
    tickMusic();                          // ya arrancó: no vuelve a agendar
    expect(spy.parts).toHaveLength(1);
  });

  it('el duck atenúa el bus entero, no nota por nota', () => {
    setSong(song);
    spy.gains.length = 0;
    setMusicDuck(0.35);
    expect(spy.gains).toEqual([0.35]);
    setMusicDuck(0.35);                   // sin cambio: no vuelve a pedir rampa
    expect(spy.gains).toEqual([0.35]);
  });
});
