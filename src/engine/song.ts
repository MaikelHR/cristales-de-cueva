// ============================================================
//  SONG (the data layer of the music)
// ------------------------------------------------------------
//  A song is DATA: a tempo, a loop length and a list of notes
//  with their entry beat, their INSTRUMENT and their dynamic.
//  No audio files and — deliberately — no Tone.js in this module:
//  it is pure, so the tests can read a song under Node without
//  ever waking an AudioContext (same rule as Level.ts).
//
//  audio.ts owns what an instrument SOUNDS like; music.ts owns
//  WHEN it plays. This file only says what the composer wrote.
// ============================================================

/** The orchestra. Each name is a patch built in audio.ts — a real
 *  instrument (envelope, filter, effect sends), not a raw waveform.
 *
 *  Roles, not waveforms: the old `type` said 'sine' for both a pad
 *  and a kick drum, which is why they shared a timbre and neither
 *  sounded like itself. */
export const INSTRUMENTS = [
  // --- Tuned voices ---
  'bell',      // crystal bell: FM, struck, long shimmering tail. The leitmotiv's voice.
  'glass',     // the bell's octave answer — thinner, further away
  'marimba',   // wooden/crystal mallet: esporas' garden, reloj's music box
  'pad',       // slow bowed cushion: drones, vaults, sunken chords
  'organ',     // stacked partials, church-cold: puerta's sanctum
  'lead',      // bright detuned pulse: the levels that move
  'grit',      // filtered sawtooth with teeth: riffs, hammers, chases
  'bass',      // round sub with a punch: bouncing basses, pillars
  'pluck',     // Karplus-Strong string: seda's thread, mina's cart
  // --- Percussion ---
  'kick',      // membrane, pitch-swept
  'snare',     // noise crack + tuned body
  'hat',       // short struck metal
  'anvil',     // struck metal with a shadow: fragua's clangs, simas' chain
  'tick',      // dry escapement click: reloj's mechanism, mina's pick
  // --- Texture ---
  'water',     // a drop and its ring: drips, droplets, caustics
  'wind',      // filtered air: glaciar's sighs
] as const;

/** The list above IS the contract: audio.ts must build a patch for every
 *  name in it, and a song can only ask for one of them. Deriving the type
 *  from the array (instead of writing the union twice) is what stops the
 *  two from drifting — a missing patch would otherwise fall back to the
 *  bell and go unnoticed, which is a silent wrong note, the worst kind. */
export type Instrument = typeof INSTRUMENTS[number];

export interface SongNote {
  /** Beat (from the loop start) at which the note enters. */
  beat: number;
  freq: number;            // Hz (for noise-based patches: the colour)
  beats: number;           // duration, in beats
  freqEnd?: number;        // frequency sweep (drops, kicks, whistles)
  inst?: Instrument;       // defaults to 'bell'
  /** Dynamic, 0..0.08. NOT an absolute gain any more: it is the note's
   *  weight relative to the rest of the mix, and audio.ts turns it into
   *  a velocity. The ceiling is what keeps the music under the sfx. */
  vol?: number;
  attack?: number;         // seconds; overrides the patch's own attack (long = pad)
}

/** Per-song mix: the ROOM the song is played in. This is most of why
 *  two levels with the same patches still sound like different places —
 *  glaciar is a cathedral of ice, seda is a box lined with silk. */
export interface SongMix {
  /** Reverb tail in seconds (0.4 = a closet, 8 = a cavern). */
  reverbDecay?: number;
  /** How much of the song is bathed in it, 0..1. */
  reverbWet?: number;
  /** Echo time in BEATS (0 = no delay send). Dotted-eighth = 0.75. */
  delayBeats?: number;
  /** Echo regeneration, 0..0.9. */
  delayFeedback?: number;
  /** Master tone: lowpass cutoff in Hz. Low = muffled, underwater, buried. */
  tone?: number;
  /** Overall trim in dB, for songs that need to sit back or lean in. */
  gain?: number;
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
  /** The room it's played in. Omitted = a neutral cave. */
  mix?: SongMix;
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
