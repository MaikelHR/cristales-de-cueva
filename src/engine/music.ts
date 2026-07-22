// ============================================================
//  MUSIC (Tone.Transport sequencer)
// ------------------------------------------------------------
//  A song is DATA (see song.ts); this module is what PLAYS it.
//
//  The old sequencer hand-rolled a lookahead: every frame it looked
//  a third of a second into the future and scheduled whatever fell
//  in the window, resyncing to beat 0 whenever a hidden tab let it
//  drift. Tone's Transport does that job properly and to the sample,
//  so a song is now handed over ONCE as a looping Tone.Part and the
//  clock is no longer the game's problem.
//
//  What's left for the frame loop is the one thing Transport can't
//  know: audio may not have woken up yet (the title screen draws
//  before anybody has touched a key). tickMusic() is that retry.
//
//  The module stays game-agnostic: it knows nothing of scenes or
//  levels. The game decides WHICH song plays and how much it ducks.
// ============================================================

import * as Tone from 'tone';
import { playNote, setMix, setMusicGain, audioReady, releaseAll } from './audio';
import type { Song, SongNote } from './song';

// The data layer is re-exported so callers keep one import site.
export { validateSong } from './song';
export type { Song, SongNote, SongMix, Instrument } from './song';

/** The dynamic ceiling: a note at this volume is as loud as the music
 *  ever gets, and maps to full velocity. Everything quieter sits under
 *  it in proportion — which is what keeps the music below the sfx. */
const VOL_CEIL = 0.08;

interface ScheduledNote {
  time: number;           // seconds from the loop start
  note: SongNote;
  velocity: number;
}

let current: Song | null = null;
let part: Tone.Part<ScheduledNote> | null = null;
let duck = 1;
let pending = false;      // a song is chosen but the audio is still asleep

/** Changes the background song (null = silence). If it's already playing,
 *  does nothing: can be called every frame with "the song for right now". */
export function setSong(song: Song | null): void {
  if (song?.id === current?.id) return;
  current = song;
  pending = !!song;
  teardown();
  if (song && audioReady()) start(song);
}

/** Momentary attenuation of the music (1 = normal). Ramped on the bus
 *  rather than applied per note, so it also catches notes already
 *  scheduled — the pause duck is now instant instead of a lookahead late. */
export function setMusicDuck(factor: number): void {
  if (factor === duck) return;
  duck = factor;
  setMusicGain(duck);
}

/** Call once per frame. Transport keeps its own time, so this only has to
 *  catch the moment the audio finally wakes and hand it the waiting song. */
export function tickMusic(): void {
  if (!pending || !current || !audioReady()) return;
  start(current);
}

function teardown(): void {
  if (part) {
    part.stop();
    part.dispose();
    part = null;
  }
  if (audioReady()) releaseAll();
}

function start(song: Song): void {
  pending = false;
  const transport = Tone.getTransport();
  const spb = 60 / song.bpm;

  // Tempo before the Part: Tone stores event times as ticks, converting
  // at the tempo in force when the Part is built.
  transport.bpm.value = song.bpm;
  setMix(song.mix, song.bpm);
  setMusicGain(duck);

  const events: ScheduledNote[] = song.notes.map((note) => ({
    time: note.beat * spb,
    note,
    velocity: Math.min(
      Math.max(((note.vol ?? 0.06) * (song.volume ?? 1)) / VOL_CEIL, 0.02),
      1,
    ),
  }));

  part = new Tone.Part<ScheduledNote>((time, ev) => {
    playNote(
      ev.note.inst ?? 'bell',
      ev.note.freq,
      ev.note.beats * spb,
      time,
      ev.velocity,
      ev.note.freqEnd,
      ev.note.attack,
    );
  }, events);
  part.loop = true;
  part.loopStart = 0;
  part.loopEnd = song.loopBeats * spb;
  part.start(0);

  if (transport.state !== 'started') transport.start();
}
