// ============================================================
//  MUSIC (step sequencer)
// ------------------------------------------------------------
//  A song is DATA: a tempo, a loop length and a list of notes
//  with their entry beat. No audio files: like the sprites, the
//  music is "written" by code and plays through the same mini
//  synthesizer in audio.ts.
//
//  The trick to keep it stable: every frame, tickMusic() schedules
//  IN ADVANCE the notes falling within a short window of the
//  future (lookahead). The clock is the audio hardware's, not the
//  game's: even if a frame stalls, already-scheduled notes still
//  play on time.
//
//  The module is game-agnostic: it knows nothing of scenes or
//  levels. The game decides WHICH song plays (setSong) and how
//  much it ducks (setMusicDuck, e.g. during pause).
// ============================================================

import { playTone, audioNow, type ToneType } from './audio';

export interface SongNote {
  /** Beat (from the loop start) at which the note enters. */
  beat: number;
  freq: number;            // Hz (for 'noise': the noise color)
  beats: number;           // duration, in beats
  freqEnd?: number;        // frequency sweep (drops, kicks, whistles)
  type?: ToneType;         // defaults to triangle (the soft timbre)
  vol?: number;            // 0..1, defaults to 0.06 (music sits UNDER the sfx)
  attack?: number;         // attack in seconds (long = pad)
}

export interface Song {
  /** Song identity: if it's already playing, setSong won't restart it. */
  id: string;
  bpm: number;
  /** Loop length, in beats. A note may TRAIL past the end (its tail
   *  overlaps the loop's wraparound): that's desirable. */
  loopBeats: number;
  /** Volume multiplier for the whole song. */
  volume?: number;
  notes: SongNote[];
}

/** Integrity problems of a song (for tests, like validateRooms). */
export function validateSong(song: Song): string[] {
  const errors: string[] = [];
  if (song.bpm <= 0) errors.push(`[${song.id}] bpm debe ser positivo`);
  if (song.loopBeats <= 0) errors.push(`[${song.id}] loopBeats debe ser positivo`);
  song.notes.forEach((n, i) => {
    if (n.beat < 0 || n.beat >= song.loopBeats) {
      errors.push(`[${song.id}] nota ${i}: beat ${n.beat} fuera del loop [0, ${song.loopBeats})`);
    }
    if (n.beats <= 0) errors.push(`[${song.id}] nota ${i}: duración no positiva`);
    if (n.freq <= 0) errors.push(`[${song.id}] nota ${i}: frecuencia no positiva`);
    if (n.freqEnd !== undefined && n.freqEnd <= 0) {
      errors.push(`[${song.id}] nota ${i}: freqEnd no positiva`);
    }
  });
  return errors;
}

// How much future is scheduled per tick. Short so song changes and the
// pause duck respond fast; long enough to survive slow frames.
const LOOKAHEAD = 0.35; // seconds

let current: Song | null = null;
let loopStart: number | null = null; // time (audio clock) of beat 0 of the current loop
let nextNote = 0;                    // next note (by index) to schedule
let duck = 1;                        // transient attenuation (pause)

/** Changes the background song (null = silence). If it's already playing,
 *  does nothing: can be called every frame with "the song for right now". */
export function setSong(song: Song | null): void {
  if (song?.id === current?.id) return;
  // Copy sorted by beat: the scheduler walks the notes in order.
  current = song
    ? { ...song, notes: [...song.notes].sort((a, b) => a.beat - b.beat) }
    : null;
  loopStart = null;
  nextNote = 0;
}

/** Momentary attenuation of the music (1 = normal). Affects the notes
 *  scheduled from here on: with the short lookahead, almost instant. */
export function setMusicDuck(factor: number): void {
  duck = factor;
}

/** Call once per frame: schedules the notes entering the window.
 *  If audio hasn't woken up yet (first gesture missing), waits calmly. */
export function tickMusic(): void {
  if (!current) return;
  const now = audioNow();
  if (now === null) return;

  const spb = 60 / current.bpm; // seconds per beat
  const loopLen = current.loopBeats * spb;

  // Startup, or resync if too long passed without ticks (hidden tab):
  // better to resume from beat 0 than "race" to catch up to the present.
  if (loopStart === null || now - loopStart > loopLen + LOOKAHEAD) {
    loopStart = now + 0.05;
    nextNote = 0;
  }
  // Local copy now non-null: TypeScript loses the narrowing of a module
  // variable across function calls. Persisted back at the end.
  let start: number = loopStart;

  for (;;) {
    // Out of notes for the loop? Move to the next one if it's coming up.
    if (nextNote >= current.notes.length) {
      const nextLoop = start + loopLen;
      if (nextLoop > now + LOOKAHEAD) break;
      start = nextLoop;
      nextNote = 0;
      continue;
    }
    const note = current.notes[nextNote];
    const t = start + note.beat * spb;
    if (t > now + LOOKAHEAD) break; // not yet due: wait for the next tick
    nextNote++;
    const volume = (note.vol ?? 0.06) * (current.volume ?? 1) * duck;
    if (t < now || volume < 0.001) continue; // note already passed or inaudible
    playTone(
      {
        freq: note.freq,
        freqEnd: note.freqEnd,
        duration: note.beats * spb,
        type: note.type ?? 'triangle',
        volume,
        attack: note.attack,
        delay: t - now,
      },
      'music',
    );
  }
  loopStart = start;
}
