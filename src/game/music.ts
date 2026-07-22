// ============================================================
//  GAME MUSIC — the soundtrack, written as data
// ------------------------------------------------------------
//  The whole soundtrack grows from ONE leitmotiv, "the crystal
//  theme": an arpeggio that rises (root → third → sharp
//  fifth), a twist that glimmers, and a fall back home.
//  In A minor: A–C–E… D–C–D… B… G–A. Each theme dresses it
//  differently —majestic, bouncy, melancholic, fierce—
//  and that's why the whole game sounds like the same cave.
//
//   · title      "Cristales de Cueva" — the theme, said slow and grand.
//   · overworld  "El sendero"  — bouncy verse and chorus that quotes the theme.
//   · cavernas   — the theme in minor, water drops, a ♭VI that shelters.
//   · galerias   — galloping riff; the chorus is the theme at full tilt.
//   · corazon    — riff stepping down rung by rung (B→A→G→F#) and
//                  the dark theme over drones; the Phrygian ♭2 hammers.
//   · esporas    — light waltz in E Dorian minor: bouncing bass,
//                  crystal marimba and spores that burst (plip).
//   · glaciar    — slow bells and sub-zero pads in D minor;
//                  almost rhythmless: the glacier breathes, doesn't march.
//   · fragua     — anvil hammering in F# minor at full throttle;
//                  the chorus is the theme with clenched teeth and the
//                  ♭2 (G natural) from corazon returns as an echo.
//   · cenote     — the deepest, slowest theme: G minor water at 63 bpm,
//                  no drums —the pulse is the DRIP—; sunken pads overlap
//                  into a reverb wash and an echoing pluck ripple flows.
//   · mina       — a ghost work-song in C minor: the PICK's dry clink
//                  is the percussion, a mine-cart rattle is the bass,
//                  and the miner's whistle says the theme with air.
//   · seda       — the only WALTZ: F minor in three, no drums and no
//                  bass — a plucked thread is the pulse — with the
//                  theme sung thin and high, as if from a cocoon.
//
//  Timbral palette: triangle = crystal bells, sine = pads
//  and kicks, square = bright melody, sawtooth = grit, noise =
//  drums (snares, hi-hats). The music lives UNDER the sfx:
//  no note goes above 0.08 volume (there's a test that swears it).
// ============================================================

import type { Song, SongNote } from '../engine/music';
import { setSong, setMusicDuck, tickMusic } from '../engine/music';
import type { Instrument } from '../engine/song';
import type { UiState } from './scenes/Scene';

// ------------------------------------------------------------
// Notation and composition helpers
// ------------------------------------------------------------
const SEMITONE: Record<string, number> = {
  C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4,
  'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2,
};

/** 'A4' = middle A (440 Hz). Flats are written as sharps
 *  (B♭ = 'A#'): the synth doesn't distinguish enharmonics. */
function n(name: string): number {
  const match = /^([A-G]#?)(\d)$/.exec(name);
  if (!match) throw new Error(`Nota inválida: "${name}"`);
  const semis = SEMITONE[match[1]] + (Number(match[2]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
}

/** k semitones above a frequency (transpose riffs). */
function up(freq: number, semis: number): number {
  return freq * Math.pow(2, semis / 12);
}

/** A voice: [beat, note, duration in beats] played by one instrument. */
type Line = Array<[number, string, number]>;
interface VoiceOpts {
  inst?: Instrument;
  vol?: number;
  attack?: number;
}

function voice(line: Line, opts: VoiceOpts): SongNote[] {
  return line.map(([beat, note, beats]) => ({ beat, freq: n(note), beats, ...opts }));
}

/** Crystalline echo: the same voice an octave up, half a beat later
 *  and softer — crystals answering each other. Wraps at the end of the loop.
 *  It answers on GLASS, never on the caller's own instrument: an echo that
 *  shares its source's timbre reads as a doubled note, not as a reply from
 *  across the cave. */
function echo(notes: SongNote[], loopBeats: number, factor = 0.3): SongNote[] {
  return notes.map((note) => ({
    ...note,
    inst: 'glass' as const,
    beat: (note.beat + 0.5) % loopBeats,
    freq: note.freq * 2,
    vol: (note.vol ?? 0.06) * factor,
  }));
}

/** Water drop: a sinusoidal "plip" that falls in frequency. */
function drip(beat: number, freq = 1568): SongNote {
  return { beat, freq, freqEnd: freq / 2, beats: 0.2, inst: 'water', vol: 0.04 };
}

/** A drop falling into the pool: the noise TICK on the surface and the
 *  sine plunk that sinks after it. The cenote's whole percussion section. */
function droplet(beat: number, color = 2600): SongNote[] {
  return [
    { beat, freq: color, beats: 0.12, inst: 'water', vol: 0.03 },
    { beat: beat + 0.08, freq: color / 3, freqEnd: color / 7, beats: 0.3, inst: 'water', vol: 0.035 },
  ];
}

// --- The drum kit (no samples: swept sine + filtered noise) ---

/** Kick: a sine that collapses all at once — the "punch" is in the drop. */
function kick(beat: number): SongNote {
  return { beat, freq: 160, freqEnd: 45, beats: 0.3, inst: 'kick', vol: 0.065 };
}

/** Snare: mid-band noise, dry. */
function snare(beat: number, vol = 0.045): SongNote {
  return { beat, freq: 1800, beats: 0.25, inst: 'snare', vol };
}

/** Hi-hat: a sigh of high noise. */
function hat(beat: number, vol = 0.02): SongNote {
  return { beat, freq: 8000, beats: 0.15, inst: 'hat', vol };
}

/** Snare fill (growing sixteenth notes) when a section repeats. */
function fill(beat: number): SongNote[] {
  return [0.028, 0.034, 0.042, 0.05].map((vol, i) => snare(beat + i * 0.25, vol));
}

/** Inner arpeggio in eighth notes: runs through the given note cycle. */
function arp(fromBeat: number, lengthBeats: number, cycle: string[], vol = 0.03): SongNote[] {
  const freqs = cycle.map(n);
  return Array.from({ length: lengthBeats * 2 }, (_, i) => ({
    beat: fromBeat + i * 0.5,
    freq: freqs[i % freqs.length],
    beats: 0.45,
    inst: 'marimba' as const,
    vol,
  }));
}

// ------------------------------------------------------------
// TITLE — "Cristales de Cueva" (A minor, 76 bpm, 8 bars)
// The leitmotiv said in full and unhurried over pads
// (Am F C G · Am F Dm E). The final G# is the major third of
// the E chord: that bittersweet note that begs to start over.
// ------------------------------------------------------------
const titleBells = voice(
  [
    // The theme (bars 1-2): rises, glimmers, falls back home.
    [0, 'A4', 0.5], [0.5, 'C5', 0.5], [1, 'E5', 1.5],
    [2.5, 'D5', 0.5], [3, 'C5', 0.5], [3.5, 'D5', 0.5],
    [4, 'B4', 1.5], [5.5, 'G4', 0.5], [6, 'A4', 2],
    // Sequence in C (bars 3-4): the same phrase, a floor brighter.
    [8, 'G4', 0.5], [8.5, 'C5', 0.5], [9, 'E5', 1.5],
    [10.5, 'D5', 0.5], [11, 'C5', 0.5], [11.5, 'D5', 0.5],
    [12, 'B4', 1.5], [13.5, 'D5', 0.5], [14, 'G4', 2],
    // Response (bars 5-6): climbs to the high A and comes down in curls.
    [16, 'A4', 0.5], [16.5, 'C5', 0.5], [17, 'E5', 1.5],
    [18.5, 'G5', 0.5], [19, 'A5', 1.5], [20.5, 'G5', 0.5],
    [21, 'E5', 1], [22, 'D5', 0.5], [22.5, 'C5', 0.5], [23, 'D5', 1],
    // Cadence (bars 7-8): descends and hangs suspended on the G#.
    [24, 'F5', 1], [25, 'E5', 1], [26, 'D5', 1.5], [27.5, 'C5', 0.5],
    [28, 'B4', 2], [30, 'G#4', 2],
  ],
  { inst: 'bell', vol: 0.05 },
);

const title: Song = {
  id: 'title',
  bpm: 76,
  loopBeats: 32,
  // the unlit cave heard from its mouth — the only pure hall, and the longest echo
  mix: {
    reverbDecay: 7, reverbWet: 0.45,
    delayBeats: 1.5, delayFeedback: 0.32, tone: 10500, gain: 1,
  },
  notes: [
    ...voice(
      [
        [0, 'A2', 4], [0, 'E3', 4], [4, 'F2', 4], [4, 'C3', 4],
        [8, 'C3', 4], [8, 'G3', 4], [12, 'G2', 4], [12, 'D3', 4],
        [16, 'A2', 4], [16, 'E3', 4], [20, 'F2', 4], [20, 'C3', 4],
        [24, 'D3', 4], [24, 'A3', 4], [28, 'E2', 4], [28, 'B2', 4],
      ],
      { inst: 'pad', vol: 0.05, attack: 1.2 },
    ),
    ...titleBells,
    ...echo(titleBells, 32),
    drip(15.5), drip(31.25, 1319),
  ],
};

// ------------------------------------------------------------
// OVERWORLD — "El sendero" (C major, 112 bpm, 16 bars)
// Verse (C Am F G ×2) with bouncing bass and offbeat hi-hats;
// the CHORUS (F G Em Am) quotes the leitmotiv note for note — the same
// title theme, now with afternoon sun. The snare enters only
// in the chorus: the classic energy lift mid-song.
// ------------------------------------------------------------

/** Bouncing bass: root and octave alternating in eighth notes (boing, boing). */
function bounce(bar: number, root: string): SongNote[] {
  const low = n(root);
  return Array.from({ length: 8 }, (_, i) => ({
    beat: bar * 4 + i * 0.5,
    freq: i % 2 === 0 ? low : low * 2,
    beats: 0.4,
    inst: 'bass' as const,
    vol: 0.055,
  }));
}

const overworldBars = ['C2', 'A2', 'F2', 'G2', 'C2', 'A2', 'F2', 'G2',
  'F2', 'G2', 'E2', 'A2', 'F2', 'G2', 'C2', 'C2'];

const overworld: Song = {
  id: 'overworld',
  bpm: 112,
  loopBeats: 64,
  // the one wide lit gallery: the band plays close and bright, and NO echo — at 112 bpm
  // any musical delay lands inside the eighth-note bass and eats the bounce
  mix: { reverbDecay: 2.8, reverbWet: 0.3, tone: 12500, gain: -1.5 },
  notes: [
    ...overworldBars.flatMap((root, bar) => bounce(bar, root)),
    // Drums: kick on the beat, hi-hats offbeat; the snare waits for the chorus.
    ...overworldBars.flatMap((_, bar) => [
      kick(bar * 4), kick(bar * 4 + 2),
      hat(bar * 4 + 0.5), hat(bar * 4 + 1.5), hat(bar * 4 + 2.5), hat(bar * 4 + 3.5),
    ]),
    ...overworldBars.slice(8).flatMap((_, i) => {
      const bar = i + 8;
      return [snare(bar * 4 + 1), snare(bar * 4 + 3)];
    }),
    ...fill(31), ...fill(63),
    ...voice(
      [
        // Verse: a melody that walks and shakes off the dust.
        [0, 'E4', 0.5], [0.5, 'G4', 0.5], [1, 'C5', 1.5], [2.5, 'B4', 0.5], [3, 'A4', 1],
        [4, 'G4', 0.5], [4.5, 'E4', 0.5], [5, 'A4', 2.5],
        [8, 'F4', 0.5], [8.5, 'A4', 0.5], [9, 'C5', 1.5], [10.5, 'D5', 0.5], [11, 'C5', 1],
        [12, 'B4', 0.5], [12.5, 'A4', 0.5], [13, 'G4', 1.5], [14.5, 'D4', 0.5], [15, 'G4', 1],
        [16, 'E4', 0.5], [16.5, 'G4', 0.5], [17, 'C5', 1.5], [18.5, 'D5', 0.5], [19, 'E5', 1],
        [20, 'D5', 0.5], [20.5, 'C5', 0.5], [21, 'A4', 2.5],
        [24, 'F4', 0.5], [24.5, 'A4', 0.5], [25, 'C5', 1], [26, 'D5', 0.5], [26.5, 'E5', 0.5], [27, 'F5', 1],
        [28, 'E5', 0.5], [28.5, 'D5', 0.5], [29, 'B4', 1.5], [30.5, 'G4', 1],
        // Chorus: the crystal theme, just like the title, over F-G-Em-Am.
        [32, 'A4', 0.5], [32.5, 'C5', 0.5], [33, 'E5', 1.5],
        [34.5, 'D5', 0.5], [35, 'C5', 0.5], [35.5, 'D5', 0.5],
        [36, 'B4', 1.5], [37.5, 'G4', 0.5], [38, 'A4', 1.5], [39.5, 'B4', 0.5],
        [40, 'B4', 0.5], [40.5, 'E5', 0.5], [41, 'G5', 1.5], [42.5, 'F#5', 0.5], [43, 'E5', 1],
        [44, 'A5', 1.5], [45.5, 'G5', 0.5], [46, 'E5', 1.5],
        [48, 'A4', 0.5], [48.5, 'C5', 0.5], [49, 'E5', 1.5], [50.5, 'G5', 0.5], [51, 'A5', 1],
        [52, 'G5', 0.5], [52.5, 'E5', 0.5], [53, 'D5', 1], [54, 'C5', 0.5], [54.5, 'D5', 0.5], [55, 'B4', 1],
        [56, 'C5', 2], [58, 'G4', 0.5], [58.5, 'E4', 0.5], [59, 'G4', 1],
        // A breath, and three pickup notes that push back into the verse.
        [62, 'G4', 0.5], [62.5, 'A4', 0.5], [63, 'B4', 1],
      ],
      { inst: 'lead', vol: 0.042 },
    ),
    // Warm counter-voice only in the chorus: long thirds under the melody.
    ...voice(
      [
        [32, 'A3', 3.7], [36, 'B3', 3.7], [40, 'G3', 3.7], [44, 'C4', 3.7],
        [48, 'A3', 3.7], [52, 'B3', 3.7], [56, 'E4', 3.7], [60, 'G3', 3.7],
      ],
      { inst: 'organ', vol: 0.028, attack: 0.3 },
    ),
  ],
};

// ------------------------------------------------------------
// CAVERNAS — level 1 (D minor/Dorian, 92 bpm, 16 bars)
// The leitmotiv in minor, first bare (heartbeat + bell + drops)
// and then an octave up. Section B steps on the B flat (borrowed ♭VI)
// and shelters everything; the final C# is the dominant that begs to return.
// No drums: here the rhythm is carried by the heartbeat and the water.
// ------------------------------------------------------------

/** Heartbeat: the root as a quarter note and its syncopated echo (tum… tum-tum). */
function heartbeat(bar: number, root: string): Line {
  const b = bar * 4;
  return [[b, root, 1], [b + 2.5, root, 0.5]];
}

const cavernasMelody = voice(
  [
    // A: the theme in D minor, at half voice.
    [0, 'D4', 0.5], [0.5, 'F4', 0.5], [1, 'A4', 1.5],
    [2.5, 'G4', 0.5], [3, 'F4', 0.5], [3.5, 'G4', 0.5],
    [4, 'E4', 1.5], [5.5, 'C4', 0.5], [6, 'D4', 2],
    // Sequence in C, with the Dorian B natural shining in passing.
    [8, 'E4', 0.5], [8.5, 'G4', 0.5], [9, 'C5', 1.5],
    [10.5, 'B4', 0.5], [11, 'A4', 0.5], [11.5, 'B4', 0.5],
    [12, 'B4', 1.5], [13.5, 'G4', 0.5], [14, 'A4', 2],
    // The theme again, an octave up: the cave dares to sing.
    [16, 'D5', 0.5], [16.5, 'F5', 0.5], [17, 'A5', 1.5],
    [18.5, 'G5', 0.5], [19, 'F5', 0.5], [19.5, 'G5', 0.5],
    [20, 'E5', 1.5], [21.5, 'C5', 0.5], [22, 'D5', 2],
    [24, 'C5', 1], [25, 'E5', 1], [26, 'G5', 1.5],
    [28, 'F5', 0.5], [28.5, 'E5', 0.5], [29, 'C#5', 1.5], [30.5, 'A4', 1.5],
    // B: the B flat (♭VI) enters and the same theme suddenly shelters.
    [32, 'D5', 0.5], [32.5, 'F5', 0.5], [33, 'A5', 1.5],
    [34.5, 'G5', 0.5], [35, 'F5', 0.5], [35.5, 'G5', 0.5],
    [36, 'E5', 1.5], [37.5, 'C5', 0.5], [38, 'D5', 2],
    [40, 'C5', 0.5], [40.5, 'E5', 0.5], [41, 'G5', 1.5],
    [42.5, 'A5', 0.5], [43, 'G5', 0.5], [43.5, 'E5', 0.5],
    [44, 'D5', 1], [45, 'F5', 1], [46, 'A5', 2],
    // The theme once more, now born from the B flat itself.
    [48, 'A#4', 0.5], [48.5, 'D5', 0.5], [49, 'F5', 1.5],
    [50.5, 'E5', 0.5], [51, 'D5', 0.5], [51.5, 'E5', 0.5],
    [52, 'C5', 1.5], [53.5, 'A4', 0.5], [54, 'C5', 2],
    // Cadence: descends slowly and the C# (dominant) leaves the door open.
    [56, 'E5', 1], [57, 'D5', 1], [58, 'C5', 1.5],
    [60, 'C#5', 1.5], [61.5, 'E5', 0.5], [62, 'A4', 2],
  ],
  { inst: 'bell', vol: 0.048 },
);

const cavernas: Song = {
  id: 'cavernas',
  bpm: 92,
  loopBeats: 64,
  // a violet crystal grotto: literally half chamber and half cavern, so it sits at the
  // exact midpoint of the crossfade
  mix: {
    reverbDecay: 4, reverbWet: 0.38,
    delayBeats: 0.75, delayFeedback: 0.3, tone: 11000, gain: 1.5,
  },
  notes: [
    ...voice(
      [
        ...['D3', 'F3', 'C3', 'G2', 'D3', 'F3', 'C3', 'A2',
          'A#2', 'F3', 'C3', 'D3', 'A#2', 'F3', 'C3', 'A2']
          .flatMap((root, bar) => heartbeat(bar, root)),
      ],
      { inst: 'bass', vol: 0.06 },
    ),
    ...cavernasMelody,
    ...echo(cavernasMelody, 64),
    // Inner arpeggio only in section B: the water starts to run.
    ...arp(32, 4, ['A#3', 'D4', 'F4', 'D4'], 0.026),
    ...arp(36, 4, ['F3', 'A3', 'C4', 'A3'], 0.026),
    ...arp(40, 4, ['C4', 'E4', 'G4', 'E4'], 0.026),
    ...arp(44, 4, ['D4', 'F4', 'A4', 'F4'], 0.026),
    ...arp(48, 4, ['A#3', 'D4', 'F4', 'D4'], 0.026),
    ...arp(52, 4, ['F3', 'A3', 'C4', 'A3'], 0.026),
    ...arp(56, 4, ['C4', 'E4', 'G4', 'E4'], 0.026),
    ...arp(60, 4, ['A3', 'C#4', 'E4', 'C#4'], 0.026),
    // Drops at odd times, like real leaks.
    drip(7.5), drip(15.25, 1760), drip(23.5, 1319), drip(31),
    drip(39.5, 1976), drip(47.25), drip(55.5, 1760), drip(62.75, 1319),
  ],
};

// ------------------------------------------------------------
// GALERÍAS — level 2 (E minor, 126 bpm, 16 bars)
// A bass riff with a bluesy seventh (E-E-E-D) that never
// lets up, full drums and an angular verse; in the chorus the
// leitmotiv breaks into a run in E minor. The final D# is the
// third of B major: the spring-loaded door that sends you back
// to the riff. It's the spikes level: the music never sits down.
// ------------------------------------------------------------

/** Galloping riff: insistent root, octave leap, and the minor
 *  seventh in passing — the engine of the level. */
function gallop(bar: number, root: string): SongNote[] {
  const low = n(root);
  const semis = [0, 0, 12, 0, 10, 0, 12, 10]; // ♭7 = the bluesy grimace
  return semis.map((s, i) => ({
    beat: bar * 4 + i * 0.5,
    freq: up(low, s),
    beats: 0.4,
    inst: 'grit' as const,
    vol: 0.04,
  }));
}

const galeriasBars = ['E2', 'E2', 'C3', 'D3', 'E2', 'E2', 'C3', 'D3',
  'C3', 'D3', 'E2', 'E2', 'C3', 'D3', 'B2', 'B2'];

const galerias: Song = {
  id: 'galerias',
  bpm: 126,
  loopBeats: 64,
  // cut stone, not cavern — a corridor whose signature is a SLAP, not a tail; dry
  // enough that the gallop survives
  mix: {
    reverbDecay: 2, reverbWet: 0.22,
    delayBeats: 1, delayFeedback: 0.16, tone: 10000, gain: -1.5,
  },
  notes: [
    ...galeriasBars.flatMap((root, bar) => gallop(bar, root)),
    // Full drums end to end: syncopated kick, snare on 2 and 4.
    ...galeriasBars.flatMap((_, bar) => [
      kick(bar * 4), kick(bar * 4 + 2.5),
      snare(bar * 4 + 1), snare(bar * 4 + 3),
      ...[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((o) => hat(bar * 4 + o, 0.018)),
    ]),
    ...fill(63),
    // Offbeat stabs: the fifth of the chord, high and dry.
    ...voice(
      galeriasBars.flatMap((root, bar): Line => {
        const fifth = { E2: 'B4', C3: 'G4', D3: 'A4', B2: 'F#4' }[root]!;
        return [[bar * 4 + 1.5, fifth, 0.3], [bar * 4 + 3.5, fifth, 0.3]];
      }),
      { inst: 'lead', vol: 0.026 },
    ),
    ...voice(
      [
        // Verse: phrases that start, brake and start again.
        [0, 'B4', 0.5], [0.5, 'E5', 0.5], [1, 'G5', 0.75], [1.75, 'F#5', 0.25],
        [2, 'E5', 0.5], [2.5, 'D5', 0.5], [3, 'B4', 1],
        [4.5, 'A4', 0.5], [5, 'B4', 0.5], [5.5, 'D5', 0.5], [6, 'E5', 1.5],
        [8, 'G5', 0.75], [8.75, 'E5', 0.25], [9, 'C5', 0.5], [9.5, 'E5', 0.5],
        [10, 'G5', 0.5], [10.5, 'A5', 0.5], [11, 'G5', 1],
        [12, 'F#5', 0.5], [12.5, 'D5', 0.5], [13, 'A4', 0.75], [13.75, 'B4', 0.25],
        [14, 'D5', 0.5], [14.5, 'F#5', 0.5], [15, 'A5', 1],
        [16, 'B4', 0.5], [16.5, 'E5', 0.5], [17, 'G5', 0.75], [17.75, 'F#5', 0.25],
        [18, 'E5', 0.5], [18.5, 'D5', 0.5], [19, 'B4', 1],
        [20.5, 'A4', 0.5], [21, 'B4', 0.5], [21.5, 'D5', 0.5], [22, 'E5', 1.5],
        [24, 'A5', 0.5], [24.5, 'G5', 0.5], [25, 'E5', 0.75], [25.75, 'D5', 0.25],
        [26, 'C5', 0.5], [26.5, 'D5', 0.5], [27, 'E5', 1],
        [28, 'F#5', 0.5], [28.5, 'A5', 0.5], [29, 'B5', 1],
        [30, 'A5', 0.5], [30.5, 'F#5', 0.5], [31, 'D5', 1],
        // Chorus: the crystal theme in E minor, at full tilt.
        [32, 'E5', 0.5], [32.5, 'G5', 0.5], [33, 'B5', 1.5],
        [34.5, 'A5', 0.5], [35, 'G5', 0.5], [35.5, 'A5', 0.5],
        [36, 'F#5', 1.5], [37.5, 'D5', 0.5], [38, 'E5', 2],
        [40, 'E5', 0.5], [40.5, 'G5', 0.5], [41, 'B5', 1.5], [42.5, 'A5', 0.5], [43, 'B5', 1],
        [44, 'G5', 0.5], [44.5, 'F#5', 0.5], [45, 'E5', 0.5], [45.5, 'D5', 0.5], [46, 'B4', 1.5],
        [48, 'C5', 0.5], [48.5, 'E5', 0.5], [49, 'G5', 1],
        [50, 'A5', 0.5], [50.5, 'G5', 0.5], [51, 'E5', 1],
        [52, 'D5', 0.5], [52.5, 'F#5', 0.5], [53, 'A5', 1],
        [54, 'B5', 0.5], [54.5, 'A5', 0.5], [55, 'F#5', 1],
        // B major: the D# springs you back to E minor.
        [56, 'D#5', 1], [57, 'F#5', 1], [58, 'B4', 1.5],
        [60, 'F#4', 0.5], [60.5, 'A4', 0.5], [61, 'B4', 0.5], [61.5, 'D#5', 0.5], [62, 'F#5', 2],
      ],
      { inst: 'lead', vol: 0.045 },
    ),
  ],
};

// ------------------------------------------------------------
// CORAZÓN — level 3 (B minor, 132 bpm, 16 bars)
// A guardian theme in two acts. A: a raw riff that repeats
// TRANSPOSING downward (B→A→G→F#), riff and
// drums only — the threat. B: half time, drones in the basement of
// the register, and the leitmotiv in B minor sung grand; at the
// end the C natural (Phrygian ♭2) hammers against the root and falls
// to the F# that relaunches the riff. The heart of the cave beats just
// like the title: it's the same theme, with clenched teeth.
// ------------------------------------------------------------

/** The guardian riff: doubled root, octave, fifth, minor sixth
 *  that bites, and the ♭3–4 staircase that splices into the step-down. */
function guardianRiff(bar: number, root: string): SongNote[] {
  const low = n(root);
  const hits: Array<[number, number, number]> = [
    [0, 0, 0.2], [0.25, 0, 0.2], [0.5, 12, 0.45], [1, 7, 0.7],
    [1.75, 8, 0.7], [2.5, 7, 0.45], [3, 3, 0.45], [3.5, 5, 0.45],
  ];
  return hits.map(([offset, semis, beats]) => ({
    beat: bar * 4 + offset,
    freq: up(low, semis),
    beats,
    inst: 'grit' as const,
    vol: 0.036,
  }));
}

const corazonLead = voice(
  [
    // The crystal theme in B minor, long and on top of everything.
    [32, 'B4', 0.5], [32.5, 'D5', 0.5], [33, 'F#5', 1.5],
    [34.5, 'E5', 0.5], [35, 'D5', 0.5], [35.5, 'E5', 0.5],
    [36, 'C#5', 1.5], [37.5, 'A4', 0.5], [38, 'B4', 2],
    // The response climbs to the high B and glides down.
    [40, 'B4', 0.5], [40.5, 'D5', 0.5], [41, 'F#5', 1.5],
    [42.5, 'A5', 0.5], [43, 'B5', 1.5], [44.5, 'A5', 0.5],
    [45, 'F#5', 1], [46, 'E5', 0.5], [46.5, 'D5', 0.5], [47, 'E5', 1],
    [48, 'G5', 1], [49, 'F#5', 1], [50, 'E5', 1.5], [51.5, 'D5', 0.5],
    [52, 'C#5', 1.5], [53.5, 'B4', 0.5], [54, 'F#5', 2],
    // The Phrygian ♭2: C natural hammering against B, and a fall to F#.
    [56, 'E5', 1], [57, 'D5', 1], [58, 'C5', 1.5], [59.5, 'B4', 0.5],
    [60, 'C5', 0.5], [60.5, 'B4', 0.5], [61, 'C5', 0.5], [61.5, 'B4', 0.5],
    [62, 'F#4', 2],
  ],
  { inst: 'bell', vol: 0.05 },
);

const corazon: Song = {
  id: 'corazon',
  bpm: 132,
  loopBeats: 64,
  // the heart chamber with the abyss next door: a big hot room under the darkest lid
  // any drum track gets
  mix: { reverbDecay: 4.2, reverbWet: 0.3, tone: 8500, gain: -1 },
  notes: [
    // Act A (bars 1-8): the riff walking down the staircase, two rounds.
    ...['B2', 'A2', 'G2', 'F#2', 'B2', 'A2', 'G2', 'F#2']
      .flatMap((root, bar) => guardianRiff(bar, root)),
    ...Array.from({ length: 8 }, (_, bar) => [
      kick(bar * 4), kick(bar * 4 + 2.5),
      snare(bar * 4 + 1), snare(bar * 4 + 3),
      ...[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((o) => hat(bar * 4 + o, 0.016)),
    ]).flat(),
    ...fill(31),
    // Act B (bars 9-16): drones in the basement and the theme writ large.
    ...voice(
      [
        [32, 'B1', 8], [32, 'F#2', 8], [40, 'G2', 8], [40, 'D3', 8],
        [48, 'E2', 8], [48, 'B2', 8], [56, 'C2', 8], [56, 'G2', 8],
      ],
      { inst: 'pad', vol: 0.05, attack: 1.5 },
    ),
    ...arp(32, 8, ['B3', 'D4', 'F#4', 'D4']),
    ...arp(40, 8, ['G3', 'B3', 'D4', 'B3']),
    ...arp(48, 8, ['G3', 'B3', 'E4', 'B3']),
    ...arp(56, 8, ['G3', 'C4', 'E4', 'C4']),
    ...corazonLead,
    ...echo(corazonLead, 64, 0.25),
    // Half time: kick on the beat, snare on 3 — the giant walks.
    ...Array.from({ length: 8 }, (_, i) => [kick((i + 8) * 4), snare((i + 8) * 4 + 2)]).flat(),
    ...fill(63),
  ],
};

// ------------------------------------------------------------
// ESPORAS — level 4 (E Dorian minor, 104 bpm, 16 bars)
// The garden breathes: bouncing bass (boing, boing), the crystal
// theme said on a crystal marimba (E minor: E→G→B), and in
// section B the water-arpeggio runs while the snare enters. The
// high drops are spores bursting. The Dorian C# peeks in
// passing: this green isn't sad, it's alive.
// ------------------------------------------------------------

const esporasBars = ['E2', 'C2', 'G2', 'D2', 'E2', 'C2', 'G2', 'D2',
  'E2', 'C2', 'G2', 'B2', 'E2', 'C2', 'A2', 'B2'];

const esporasMelody = voice(
  [
    // A: the theme in E minor, at a garden pace.
    [0, 'E4', 0.5], [0.5, 'G4', 0.5], [1, 'B4', 1.5],
    [2.5, 'A4', 0.5], [3, 'G4', 0.5], [3.5, 'A4', 0.5],
    [4, 'F#4', 1.5], [5.5, 'D4', 0.5], [6, 'E4', 2],
    // Sequence in G: the same phrase, a floor brighter.
    [8, 'G4', 0.5], [8.5, 'B4', 0.5], [9, 'D5', 1.5],
    [10.5, 'C5', 0.5], [11, 'B4', 0.5], [11.5, 'C5', 0.5],
    [12, 'A4', 1.5], [13.5, 'F#4', 0.5], [14, 'G4', 2],
    // Response: climbs to the high E and comes down in curls.
    [16, 'E4', 0.5], [16.5, 'G4', 0.5], [17, 'B4', 1.5],
    [18.5, 'D5', 0.5], [19, 'E5', 1.5], [20.5, 'D5', 0.5],
    [21, 'B4', 1], [22, 'A4', 0.5], [22.5, 'G4', 0.5], [23, 'A4', 1],
    [24, 'C5', 1], [25, 'B4', 1], [26, 'A4', 1.5], [27.5, 'G4', 0.5],
    [28, 'F#4', 2], [30, 'F#4', 0.5], [30.5, 'A4', 0.5], [31, 'B4', 1],
    // B: the theme an octave up, with the water running underneath.
    [32, 'E5', 0.5], [32.5, 'G5', 0.5], [33, 'B5', 1.5],
    [34.5, 'A5', 0.5], [35, 'G5', 0.5], [35.5, 'A5', 0.5],
    [36, 'F#5', 1.5], [37.5, 'D5', 0.5], [38, 'E5', 2],
    [40, 'C5', 0.5], [40.5, 'E5', 0.5], [41, 'G5', 1.5],
    [42.5, 'F#5', 0.5], [43, 'G5', 1], [44, 'A5', 1.5], [45.5, 'G5', 0.5], [46, 'E5', 1.5],
    [48, 'D5', 0.5], [48.5, 'G5', 0.5], [49, 'B5', 1],
    [50, 'A5', 0.5], [50.5, 'G5', 0.5], [51, 'E5', 1],
    [52, 'C5', 0.5], [52.5, 'E5', 0.5], [53, 'A5', 1],
    [54, 'G5', 0.5], [54.5, 'E5', 0.5], [55, 'D5', 1],
    // Cadence: descends to the B (dominant) with the Dorian C# as a wink.
    [56, 'E5', 1], [57, 'D5', 1], [58, 'B4', 1.5], [59.5, 'A4', 0.5],
    [60, 'G4', 0.5], [60.5, 'A4', 0.5], [61, 'B4', 0.5], [61.5, 'C#5', 0.5], [62, 'E5', 2],
  ],
  { inst: 'marimba', vol: 0.045 },
);

const esporas: Song = {
  id: 'esporas',
  bpm: 104,
  loopBeats: 64,
  // a green hollow upholstered in moss: the tail dies fast, but the air stays humid
  mix: {
    reverbDecay: 1.8, reverbWet: 0.36,
    delayBeats: 0.75, delayFeedback: 0.18, tone: 11000, gain: -1,
  },
  notes: [
    ...esporasBars.flatMap((root, bar) => bounce(bar, root)),
    // Soft drums: kick on the beat, hats offbeat; the snare waits for B.
    ...esporasBars.flatMap((_, bar) => [
      kick(bar * 4), kick(bar * 4 + 2),
      hat(bar * 4 + 0.5, 0.016), hat(bar * 4 + 1.5, 0.016),
      hat(bar * 4 + 2.5, 0.016), hat(bar * 4 + 3.5, 0.016),
    ]),
    ...esporasBars.slice(8).flatMap((_, i) => {
      const bar = i + 8;
      return [snare(bar * 4 + 1, 0.032), snare(bar * 4 + 3, 0.032)];
    }),
    ...fill(31), ...fill(63),
    ...esporasMelody,
    ...echo(esporasMelody, 64),
    // The water of section B: inner arpeggio in eighth notes.
    ...arp(32, 4, ['E3', 'G3', 'B3', 'G3'], 0.024),
    ...arp(36, 4, ['C3', 'E3', 'G3', 'E3'], 0.024),
    ...arp(40, 4, ['G3', 'B3', 'D4', 'B3'], 0.024),
    ...arp(44, 4, ['D3', 'F#3', 'A3', 'F#3'], 0.024),
    ...arp(48, 4, ['E3', 'G3', 'B3', 'G3'], 0.024),
    ...arp(52, 4, ['C3', 'E3', 'G3', 'E3'], 0.024),
    ...arp(56, 4, ['A2', 'C3', 'E3', 'C3'], 0.024),
    ...arp(60, 4, ['B2', 'D#3', 'F#3', 'D#3'], 0.024),
    // Spores bursting, at odd times.
    drip(7.25, 1976), drip(15.5, 1568), drip(23.75, 2093),
    drip(39.25, 1760), drip(47.5, 2349), drip(55.75, 1976), drip(63.25, 1568),
  ],
};

// ------------------------------------------------------------
// GLACIAR — level 5 (D minor, 72 bpm, 8 long bars)
// VERY spaced-out crystal bells say the theme (D→F→A) and
// let the echo answer; sine pads in the basement and a
// wind of filtered noise that passes now and then. No drums: the
// glacier doesn't march, it breathes. The final A major (C#) is the
// only warmth in the room.
// ------------------------------------------------------------

const glaciarBells = voice(
  [
    // The theme, slow and bare.
    [0, 'D5', 1], [1, 'F5', 1], [2, 'A5', 2.5],
    [5.5, 'G5', 0.5], [6, 'E5', 1.5], [7.5, 'C5', 0.5], [8, 'D5', 3],
    [12, 'A4', 0.5], [12.5, 'C5', 0.5], [13, 'F5', 2.5],
    // Again, and this time it dares to climb.
    [16, 'D5', 1], [17, 'F5', 1], [18, 'A5', 1.5], [19.5, 'G5', 0.5],
    [20, 'F5', 0.5], [20.5, 'G5', 0.5], [21, 'E5', 2.5],
    [24, 'C5', 1], [25, 'E5', 1], [26, 'G5', 2.5], [29, 'F5', 0.5], [29.5, 'E5', 1.5],
    // The summit: the theme touching the high D, like sun on the ice.
    [32, 'D5', 1], [33, 'F5', 1], [34, 'A5', 2], [37, 'A#5', 1], [38, 'A5', 1], [39, 'F5', 1],
    [40, 'G5', 1], [41, 'A#5', 1], [42, 'D6', 2.5], [45, 'C6', 0.5], [45.5, 'A5', 1.5],
    // The thaw: A major (C#) and the soft fall back home.
    [48, 'E5', 1], [49, 'C#5', 1], [50, 'E5', 2], [52.5, 'A5', 1.5], [54, 'G5', 1], [55, 'E5', 1],
    [56, 'D5', 1], [57, 'F5', 1], [58, 'A5', 2], [60.5, 'F5', 1], [61.5, 'E5', 0.5], [62, 'D5', 2],
  ],
  { inst: 'bell', vol: 0.05, attack: 0.05 },
);

const glaciar: Song = {
  id: 'glaciar',
  bpm: 72,
  loopBeats: 64,
  // a vault melted out of blue ice — the brightest large room in the game, because the
  // walls are ICE, not snow
  mix: {
    reverbDecay: 6.6, reverbWet: 0.46,
    delayBeats: 1, delayFeedback: 0.38, tone: 13000, gain: 1.5,
  },
  notes: [
    // Sub-zero pads, two voices per long chord.
    ...voice(
      [
        [0, 'D2', 7.5], [0, 'A2', 7.5], [8, 'A#1', 7.5], [8, 'F2', 7.5],
        [16, 'F2', 7.5], [16, 'C3', 7.5], [24, 'C2', 7.5], [24, 'G2', 7.5],
        [32, 'D2', 7.5], [32, 'A2', 7.5], [40, 'G1', 7.5], [40, 'D2', 7.5],
        [48, 'A1', 7.5], [48, 'E2', 7.5], [56, 'D2', 7.5], [56, 'A2', 7.5],
      ],
      { inst: 'pad', vol: 0.05, attack: 1.8 },
    ),
    ...glaciarBells,
    ...echo(glaciarBells, 64, 0.35),
    // The wind: long sighs of filtered noise that come and go.
    { beat: 4, freq: 520, beats: 6, inst: 'wind', vol: 0.016, attack: 2.5 },
    { beat: 26, freq: 640, beats: 5, inst: 'wind', vol: 0.014, attack: 2 },
    { beat: 44, freq: 480, beats: 6, inst: 'wind', vol: 0.016, attack: 2.5 },
    // Frozen leaks: high plips, counted.
    drip(11.5, 2093), drip(23.25, 1760), drip(35.5, 2349),
    drip(47.75, 1976), drip(59.25, 2093),
    // An inner shimmer only at the summit (bars 9-12).
    ...arp(32, 4, ['D4', 'F4', 'A4', 'F4'], 0.02),
    ...arp(40, 4, ['A#3', 'D4', 'G4', 'D4'], 0.02),
  ],
};

// ------------------------------------------------------------
// FRAGUA — level 6 (F# minor, 138 bpm, 16 bars)
// The anvil doesn't stop: sawtooth hammer-riff with the octave and the ♭7
// pounding, full drums, and metal CLANGS offbeat. The
// chorus is the crystal theme in F# minor forged large; at the
// end the ♭2 (G natural) from corazon returns — the igneous guardian
// and the crystal one are brothers, and so are their themes.
// ------------------------------------------------------------

/** The anvil's hammering: doubled root, octave, the ♭7 that bites
 *  and the fifth that props it up — eight hits per bar, no mercy. */
function hammer(bar: number, root: string): SongNote[] {
  const low = n(root);
  const semis = [0, 0, 12, 0, 10, 0, 7, 10];
  return semis.map((s, i) => ({
    beat: bar * 4 + i * 0.5,
    freq: up(low, s),
    beats: 0.4,
    inst: 'grit' as const,
    vol: 0.038,
  }));
}

const fraguaBars = ['F#2', 'F#2', 'D3', 'E3', 'F#2', 'F#2', 'D3', 'E3',
  'D3', 'E3', 'F#2', 'F#2', 'D3', 'E3', 'C#3', 'C#3'];

const fraguaLead = voice(
  [
    // Verse: phrases that strike and bounce like sparks.
    [0, 'C#5', 0.5], [0.5, 'F#5', 0.5], [1, 'A5', 0.75], [1.75, 'G#5', 0.25],
    [2, 'F#5', 0.5], [2.5, 'E5', 0.5], [3, 'C#5', 1],
    [4.5, 'B4', 0.5], [5, 'C#5', 0.5], [5.5, 'E5', 0.5], [6, 'F#5', 1.5],
    [8, 'A5', 0.75], [8.75, 'F#5', 0.25], [9, 'D5', 0.5], [9.5, 'F#5', 0.5],
    [10, 'A5', 0.5], [10.5, 'B5', 0.5], [11, 'A5', 1],
    [12, 'G#5', 0.5], [12.5, 'E5', 0.5], [13, 'B4', 0.75], [13.75, 'C#5', 0.25],
    [14, 'E5', 0.5], [14.5, 'G#5', 0.5], [15, 'B5', 1],
    [16, 'C#5', 0.5], [16.5, 'F#5', 0.5], [17, 'A5', 0.75], [17.75, 'G#5', 0.25],
    [18, 'F#5', 0.5], [18.5, 'E5', 0.5], [19, 'C#5', 1],
    [20.5, 'B4', 0.5], [21, 'C#5', 0.5], [21.5, 'E5', 0.5], [22, 'F#5', 1.5],
    [24, 'B5', 0.5], [24.5, 'A5', 0.5], [25, 'F#5', 0.75], [25.75, 'E5', 0.25],
    [26, 'D5', 0.5], [26.5, 'E5', 0.5], [27, 'F#5', 1],
    [28, 'G#5', 0.5], [28.5, 'B5', 0.5], [29, 'C#6', 1],
    [30, 'B5', 0.5], [30.5, 'G#5', 0.5], [31, 'E5', 1],
    // Chorus: the crystal theme, forged in F# minor.
    [32, 'F#5', 0.5], [32.5, 'A5', 0.5], [33, 'C#6', 1.5],
    [34.5, 'B5', 0.5], [35, 'A5', 0.5], [35.5, 'B5', 0.5],
    [36, 'G#5', 1.5], [37.5, 'E5', 0.5], [38, 'F#5', 2],
    [40, 'F#5', 0.5], [40.5, 'A5', 0.5], [41, 'C#6', 1.5],
    [42.5, 'E6', 0.5], [43, 'F#6', 1.5], [44.5, 'E6', 0.5],
    [45, 'C#6', 1], [46, 'B5', 0.5], [46.5, 'A5', 0.5], [47, 'B5', 1],
    [48, 'D6', 1], [49, 'C#6', 1], [50, 'B5', 1.5], [51.5, 'A5', 0.5],
    [52, 'G#5', 1.5], [53.5, 'F#5', 0.5], [54, 'C#6', 2],
    // The ♭2 inherited from corazon: G natural hammering against F#.
    [56, 'B5', 1], [57, 'A5', 1], [58, 'G5', 1], [59, 'F#5', 1],
    [60, 'G5', 0.5], [60.5, 'F#5', 0.5], [61, 'G5', 0.5], [61.5, 'F#5', 0.5],
    [62, 'C#5', 2],
  ],
  { inst: 'lead', vol: 0.044 },
);

const fragua: Song = {
  id: 'fragua',
  bpm: 138,
  loopBeats: 64,
  // the floor of a working smithy: close, cluttered, ash swallowing every repeat. No
  // delay at all — struck metal is the brightest sound a person makes, so "deep in the
  // core" must not read as "muffled"
  mix: { reverbDecay: 2.1, reverbWet: 0.28, tone: 11000, gain: -1.5 },
  notes: [
    ...fraguaBars.flatMap((root, bar) => hammer(bar, root)),
    // Full drums end to end: the forge never rests.
    ...fraguaBars.flatMap((_, bar) => [
      kick(bar * 4), kick(bar * 4 + 2.5),
      snare(bar * 4 + 1), snare(bar * 4 + 3),
      ...[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((o) => hat(bar * 4 + o, 0.016)),
    ]),
    ...fill(31), ...fill(63),
    // Anvil clangs: two high metallic hits offbeat.
    ...voice(
      fraguaBars.flatMap((root, bar): Line => {
        const clink = { 'F#2': 'C#6', D3: 'A5', E3: 'B5', 'C#3': 'G#5' }[root]!;
        return [[bar * 4 + 1.75, clink, 0.2], [bar * 4 + 3.75, clink, 0.2]];
      }),
      { inst: 'anvil', vol: 0.02 },
    ),
    ...fraguaLead,
    ...echo(fraguaLead, 64, 0.22),
  ],
};

// ------------------------------------------------------------
// CENOTE — level 7 (G minor, 63 bpm, 12 long bars)
// The water table of the whole cave: the slowest, deepest theme.
// No drums — the pulse is the DRIP. Sunken sine pads overlap into a
// reverb wash (i–♭VI–♭III–iv–♭VI–v, floating, no leading tone), a soft
// triangle ripple runs like caustics tracing each chord, and crystal
// bells say the theme (G→B♭→D) from the surface while their octave echo
// shimmers down through the god-rays. It doesn't march or breathe: it flows.
// ------------------------------------------------------------

const cenoteBells = voice(
  [
    // The theme surfaces: a drop's ring widening on the still pool.
    [0, 'G4', 1], [1, 'A#4', 1], [2, 'D5', 2.5],
    [5, 'C5', 0.5], [5.5, 'A#4', 0.5], [6, 'D5', 2],
    // Drifting up toward the light over the ♭VI.
    [8, 'A#4', 1], [9, 'D5', 1], [10, 'F5', 2.5],
    [13, 'D5', 0.5], [13.5, 'C5', 0.5], [14, 'A#4', 2],
    // A god-ray breaks: the phrase brightens on the ♭III.
    [16, 'D5', 1], [17, 'F5', 1], [18, 'A#5', 2.5],
    [21, 'G5', 0.5], [21.5, 'F5', 0.5], [22, 'D5', 2],
    // Sinking deeper on the iv.
    [24, 'C5', 1], [25, 'D#5', 1], [26, 'G5', 2],
    [28.5, 'F5', 0.5], [29, 'D#5', 1.5], [30.5, 'C5', 1.5],
    // The theme once more, sheltered by the ♭VI.
    [32, 'A#4', 1], [33, 'D5', 1], [34, 'G5', 2],
    [36.5, 'F5', 0.5], [37, 'D5', 1.5], [38.5, 'A#4', 1.5],
    // Settles, floating on the fifth: unresolved, and the loop pulls under.
    [40, 'D5', 1], [41, 'F5', 1], [42, 'A5', 2],
    [44.5, 'G5', 0.5], [45, 'F5', 1], [46, 'D5', 2],
  ],
  { inst: 'bell', vol: 0.05, attack: 0.04 },
);

const cenote: Song = {
  id: 'cenote',
  bpm: 63,
  loopBeats: 48,
  // treading water at the bottom of a flooded shaft: the wettest and darkest mix in the
  // game, held above the 4000 Hz "entombed" floor so the bells still speak from the
  // surface
  mix: {
    reverbDecay: 5.8, reverbWet: 0.48,
    delayBeats: 0.75, delayFeedback: 0.38, tone: 5800, gain: 1.5,
  },
  notes: [
    // Sunken pads: two sine voices per chord, overlapping into a wash.
    ...voice(
      [
        [0, 'G2', 7.5], [0, 'D3', 7.5], [8, 'D#2', 7.5], [8, 'A#2', 7.5],
        [16, 'A#1', 7.5], [16, 'F2', 7.5], [24, 'C2', 7.5], [24, 'G2', 7.5],
        [32, 'D#2', 7.5], [32, 'A#2', 7.5], [40, 'D2', 7.5], [40, 'A2', 7.5],
      ],
      { inst: 'pad', vol: 0.05, attack: 1.8 },
    ),
    ...cenoteBells,
    ...echo(cenoteBells, 48, 0.3),
    // The caustics: a soft triangle ripple that never stops moving,
    // tracing each chord like light bending through the water.
    ...arp(0, 8, ['G3', 'A#3', 'D4', 'A#3'], 0.022),
    ...arp(8, 8, ['D#3', 'G3', 'A#3', 'G3'], 0.022),
    ...arp(16, 8, ['A#3', 'D4', 'F4', 'D4'], 0.022),
    ...arp(24, 8, ['C3', 'D#3', 'G3', 'D#3'], 0.022),
    ...arp(32, 8, ['D#3', 'G3', 'A#3', 'G3'], 0.022),
    ...arp(40, 8, ['D3', 'F3', 'A3', 'F3'], 0.022),
    // The drip is the drummer: sparse taps at uneven, natural intervals.
    ...droplet(3.5, 2600), ...droplet(11.25, 3000), ...droplet(19.75, 2200),
    ...droplet(27.5, 2800), ...droplet(35.25, 3200), ...droplet(43.5, 2400),
    // Two far, high leaks echoing off somewhere in the dark.
    drip(15.5, 2093), drip(39.25, 1760),
  ],
};

// ------------------------------------------------------------
// MINA — level 8 (C minor, 100 bpm, 16 bars)
// A ghost work-song. The percussion is the PICK against the rock
// (a dry metallic clink on the offbeats — the mine still being
// worked by nobody), the bass is an empty cart rattling somewhere
// in the dark, and the melody is the miner's WHISTLE: the crystal
// theme in C minor (C→E♭→G), said with air between the phrases.
// Section B lifts it an octave — the seam glitters — over a warm
// inner voice and a dust-arpeggio; the B natural at the cadence is
// the lamp that begs the verse to come back around.
// ------------------------------------------------------------

/** Mine-cart rattle: low eighths rocking root–fifth with a ♭7 catch —
 *  the empty cart rolling somewhere in the dark. */
function traqueteo(bar: number, root: string): SongNote[] {
  const low = n(root);
  const semis = [0, 0, 7, 0, 10, 0, 7, 5];
  return semis.map((s, i) => ({
    beat: bar * 4 + i * 0.5,
    freq: up(low, s),
    beats: 0.42,
    inst: 'bass' as const,
    vol: 0.05,
  }));
}

/** The pick against the rock: a dry high clink, over in an instant. */
function pico(beat: number): SongNote[] {
  return [
    { beat, freq: 5200, beats: 0.06, inst: 'tick', vol: 0.028 },
    { beat: beat + 0.02, freq: 1976, freqEnd: 1568, beats: 0.1, inst: 'anvil', vol: 0.03 },
  ];
}

const minaBars = ['C2', 'C2', 'G#1', 'A#1', 'C2', 'G#1', 'F2', 'G2',
  'C2', 'D#2', 'G#1', 'F2', 'C2', 'G#1', 'G2', 'G2'];

const minaLead = voice(
  [
    // A: the whistle says the theme at half voice, air between phrases.
    [0, 'C4', 0.5], [0.5, 'D#4', 0.5], [1, 'G4', 1.5],
    [2.5, 'F4', 0.5], [3, 'D#4', 0.5], [3.5, 'F4', 0.5],
    [4, 'D4', 1.5], [5.5, 'A#3', 0.5], [6, 'C4', 2],
    // Sequence over the ♭VI: the same phrase, a floor brighter.
    [8, 'D#4', 0.5], [8.5, 'G4', 0.5], [9, 'C5', 1.5],
    [10.5, 'A#4', 0.5], [11, 'G#4', 0.5], [11.5, 'A#4', 0.5],
    [12, 'G4', 1.5], [13.5, 'D#4', 0.5], [14, 'F4', 2],
    // Response: climbs and settles back down the seam.
    [16, 'C4', 0.5], [16.5, 'D#4', 0.5], [17, 'G4', 1.5],
    [18.5, 'A#4', 0.5], [19, 'C5', 1.5],
    [20.5, 'A#4', 0.5], [21, 'G4', 1], [22, 'F4', 0.5], [22.5, 'D#4', 0.5], [23, 'F4', 1],
    // Cadence: down the ladder, and the B natural lights the lamp.
    [24, 'G#4', 1], [25, 'G4', 1], [26, 'F4', 1.5], [27.5, 'D#4', 0.5],
    [28, 'D4', 1.5], [29.5, 'B3', 0.5], [30, 'C4', 2],
    // B: the theme an octave up — the seam glitters.
    [32, 'C5', 0.5], [32.5, 'D#5', 0.5], [33, 'G5', 1.5],
    [34.5, 'F5', 0.5], [35, 'D#5', 0.5], [35.5, 'F5', 0.5],
    [36, 'D5', 1.5], [37.5, 'A#4', 0.5], [38, 'C5', 2],
    [40, 'D#5', 0.5], [40.5, 'G5', 0.5], [41, 'A#5', 1.5],
    [42.5, 'G#5', 0.5], [43, 'A#5', 1],
    [44, 'C6', 1.5], [45.5, 'A#5', 0.5], [46, 'G5', 1.5],
    [48, 'F5', 0.5], [48.5, 'G#5', 0.5], [49, 'C6', 1],
    [50, 'A#5', 0.5], [50.5, 'G#5', 0.5], [51, 'G5', 1],
    [52, 'F5', 0.5], [52.5, 'D#5', 0.5], [53, 'D5', 1.5], [54.5, 'D#5', 0.5], [55, 'F5', 1],
    // Final cadence: the lamp again, and the loop rolls the cart home.
    [56, 'G5', 1], [57, 'F5', 1], [58, 'D#5', 1.5], [59.5, 'D5', 0.5],
    [60, 'C5', 0.5], [60.5, 'B4', 0.5], [61, 'D5', 0.5], [61.5, 'F5', 0.5], [62, 'G4', 2],
  ],
  { inst: 'lead', vol: 0.038 },
);

const mina: Song = {
  id: 'mina',
  bpm: 100,
  loopBeats: 64,
  // a timbered drift where wood and rubble eat the tail: the DISTANCE is a quarter-note
  // echo down the shaft, not a long reverb — a second miner working further in
  mix: {
    reverbDecay: 2.4, reverbWet: 0.32,
    delayBeats: 1, delayFeedback: 0.36, tone: 7600, gain: 0.8,
  },
  notes: [
    ...minaBars.flatMap((root, bar) => traqueteo(bar, root)),
    // The picks: two dry clinks per bar on the offbeats; every fourth
    // bar the miner strikes twice (clink-clink), like real work.
    ...minaBars.flatMap((_, bar) => [
      ...pico(bar * 4 + 1.5),
      ...pico(bar * 4 + 3.5),
      ...(bar % 4 === 3 ? pico(bar * 4 + 3.75) : []),
    ]),
    ...minaLead,
    ...echo(minaLead, 64),
    // Warm inner voice, only while the seam glitters (section B).
    ...voice(
      [
        [32, 'D#4', 7.5], [40, 'G#3', 7.5], [48, 'F3', 7.5], [56, 'D4', 7.5],
      ],
      { inst: 'pad', vol: 0.028, attack: 1.2 },
    ),
    // The dust-arpeggio running under section B.
    ...arp(32, 4, ['C3', 'D#3', 'G3', 'D#3'], 0.022),
    ...arp(36, 4, ['D#3', 'G3', 'A#3', 'G3'], 0.022),
    ...arp(40, 4, ['G#2', 'C3', 'D#3', 'C3'], 0.022),
    ...arp(44, 4, ['F2', 'G#2', 'C3', 'G#2'], 0.022),
    ...arp(48, 4, ['C3', 'D#3', 'G3', 'D#3'], 0.022),
    ...arp(52, 4, ['G#2', 'C3', 'D#3', 'C3'], 0.022),
    ...arp(56, 8, ['G2', 'B2', 'D3', 'B2'], 0.022),
    // Old leaks, counted, echoing off in the dark.
    drip(7.25, 1760), drip(23.5, 2093), drip(39.25, 1568), drip(55.5, 1976),
  ],
};

// ------------------------------------------------------------
// SEDA — level 9 (F minor, 88 bpm, 12 bars of 3: a WALTZ)
// The only theme in triple time: everything in the nest hangs and
// SWAYS, so the music swings too — one-two-three, one-two-three.
// No drums and no bass line: the pulse is a plucked THREAD (a dry
// pizzicato on the downbeat, its harmonic answering on three), the
// pads breathe like something asleep, and the melody says the crystal
// theme (F→A♭→C) high and thin, as if from inside a cocoon. The
// half-diminished chord in the middle is the moment you notice how
// many eyes are up there.
// ------------------------------------------------------------

/** A plucked thread: dry attack, and a harmonic sighing after it. */
function pluck(beat: number, note: string, harmonic = true): SongNote[] {
  const f = n(note);
  const out: SongNote[] = [
    { beat, freq: f, beats: 0.3, inst: 'pluck', vol: 0.05 },
  ];
  if (harmonic) {
    out.push({ beat: beat + 2, freq: f * 2, beats: 0.5, inst: 'glass', vol: 0.03 });
  }
  return out;
}

const sedaBars = ['F2', 'C3', 'D#2', 'A#2', 'F2', 'D2', 'G#2', 'D#2',
  'F2', 'C3', 'C2', 'F2'];

const sedaBells = voice(
  [
    // The theme, thin and high — a lullaby nobody meant kindly.
    [0, 'F5', 1], [1, 'G#5', 1], [2, 'C6', 2],
    [4, 'A#5', 0.5], [4.5, 'G#5', 0.5], [5, 'A#5', 1],
    [6, 'G5', 2], [8, 'F5', 1],
    // It drifts down, swaying.
    [9, 'C5', 1], [10, 'D#5', 1], [11, 'G5', 1],
    [12, 'F5', 2], [14, 'D#5', 1],
    [15, 'C5', 1], [16, 'D5', 1], [17, 'F5', 1],
    // The half-diminished turn: something up there moved.
    [18, 'D5', 1], [19, 'F5', 1], [20, 'G#5', 1],
    [21, 'B5', 2], [23, 'A#5', 1],
    // And the theme again, an octave down, closer to the floor.
    [24, 'F4', 1], [25, 'G#4', 1], [26, 'C5', 2],
    [28, 'D#5', 0.5], [28.5, 'C5', 0.5], [29, 'D#5', 1],
    [30, 'C5', 2], [32, 'A#4', 1],
    [33, 'G#4', 1], [34, 'C5', 1], [35, 'D#5', 1],
    // It hangs on the dominant and lets the loop pull it back up.
    [36, 'C5', 2], [38, 'D5', 1],
    [39, 'E5', 1], [40, 'G5', 1], [41, 'C6', 1],
    [42, 'A#5', 2], [44, 'G5', 1],
    [45, 'F5', 1], [46, 'E5', 1], [47, 'C5', 1],
  ],
  { inst: 'bell', vol: 0.046 },
);

const seda: Song = {
  id: 'seda',
  bpm: 88,
  loopBeats: 36,
  // the game's closet — silk is the most absorbent material there is, so the nest does
  // not ring at all
  mix: { reverbDecay: 1.4, reverbWet: 0.2, tone: 6600, gain: 1.5 },
  notes: [
    // The threads: one plucked per bar of three, with its harmonic
    // answering on the third beat — the waltz's whole rhythm section.
    ...sedaBars.flatMap((root, bar) => pluck(bar * 3, root)),
    // A second, higher thread on the offbeat of two: the sway.
    ...sedaBars.flatMap((root, bar) => {
      const fifth = { F2: 'C4', C3: 'G4', 'D#2': 'A#3', 'A#2': 'F4', D2: 'A3', 'G#2': 'D#4', C2: 'G3' }[root]!;
      return voice([[bar * 3 + 1.5, fifth, 0.4]], { inst: 'pluck', vol: 0.024 });
    }),
    ...sedaBells.filter((note) => note.beat < 36),
    ...echo(sedaBells.filter((note) => note.beat < 36), 36, 0.28),
    // Sleeping pads: two voices per chord, very slow to open.
    ...voice(
      [
        [0, 'F2', 8.5], [0, 'C3', 8.5], [9, 'D#2', 8.5], [9, 'A#2', 8.5],
        [18, 'D2', 8.5], [18, 'G#2', 8.5], [27, 'C2', 8.5], [27, 'G2', 8.5],
      ],
      { inst: 'pad', vol: 0.042, attack: 2 },
    ),
    // Far-off ticks: something walking a web in the dark.
    { beat: 8.5, freq: 5200, beats: 0.05, inst: 'tick', vol: 0.02 },
    { beat: 8.75, freq: 4800, beats: 0.05, inst: 'tick', vol: 0.018 },
    { beat: 20.5, freq: 5200, beats: 0.05, inst: 'tick', vol: 0.02 },
    { beat: 20.75, freq: 4600, beats: 0.05, inst: 'tick', vol: 0.016 },
    { beat: 32.5, freq: 5000, beats: 0.05, inst: 'tick', vol: 0.02 },
    drip(14.5, 2349), drip(29.25, 1976),
  ],
};

// ------------------------------------------------------------
// SIMAS — the first challenge level (C# minor, 80 bpm, 12 bars)
// The abyss under everything, and the only theme with no melody in
// the usual sense: a CHAIN is the rhythm section (a dry iron clank
// on the beat, its echo two beats later, always) over a drone that
// barely moves. The crystal motif shows up in the deepest register
// the soundtrack has used — C#→E→G#, played as slow single notes,
// like something remembering the tune rather than singing it. The
// only brightness is a high harmonic that answers each phrase from
// far above: the surface you're trying to climb back to.
// ------------------------------------------------------------

/** The chain: an iron clank and its echo, bouncing off the walls. */
function clank(beat: number, vol = 0.05): SongNote[] {
  return [
    { beat, freq: 2400, beats: 0.07, inst: 'tick', vol: vol * 0.6 },
    { beat, freq: 220, freqEnd: 110, beats: 0.22, inst: 'anvil', vol },
    { beat: beat + 2, freq: 180, freqEnd: 95, beats: 0.3, inst: 'anvil', vol: vol * 0.45 },
  ];
}

const simasDeep = voice(
  [
    // The motif, said very low and very slow: C#→E→G#.
    [0, 'C#2', 2], [2, 'E2', 2], [4, 'G#2', 3],
    [8, 'F#2', 2], [10, 'E2', 2], [12, 'C#2', 3],
    [16, 'A2', 2], [18, 'G#2', 2], [20, 'E2', 3],
    [24, 'C#2', 2], [26, 'D#2', 2], [28, 'F#2', 3],
    [32, 'B1', 3], [35, 'C#2', 4],
  ],
  { inst: 'bell', vol: 0.055 },
);

const simas: Song = {
  id: 'simas',
  bpm: 80,
  loopBeats: 40,
  // a hundred-metre shaft with one iron chain in it: almost pure hall, and the listener
  // stands inside the TAIL rather than the strike
  mix: {
    reverbDecay: 6.4, reverbWet: 0.44,
    delayBeats: 1, delayFeedback: 0.34, tone: 6000, gain: 1.5,
  },
  notes: [
    // The drone: two sine voices a fifth apart, almost still.
    ...voice(
      [
        [0, 'C#1', 10.5], [0, 'G#1', 10.5], [10, 'A1', 10.5], [10, 'E2', 10.5],
        [20, 'B1', 10.5], [20, 'F#2', 10.5], [30, 'C#1', 10.5], [30, 'G#1', 10.5],
      ],
      { inst: 'pad', vol: 0.05, attack: 2.5 },
    ),
    ...simasDeep,
    // The chain, one clank per bar, harder every fourth.
    ...Array.from({ length: 10 }, (_, bar) => clank(bar * 4, bar % 4 === 0 ? 0.055 : 0.04)).flat(),
    // The harmonic from far above: the surface, answering.
    ...voice(
      [[6, 'G#5', 2], [14, 'E5', 2], [22, 'C#6', 2], [30, 'G#5', 2], [38, 'B5', 2]],
      { inst: 'glass', vol: 0.026, attack: 0.5 },
    ),
    // Stones coming loose somewhere in the dark.
    drip(9.5, 1568), drip(19.25, 1319), drip(29.75, 1760), drip(37.5, 1174),
  ],
};

// ------------------------------------------------------------
// RELOJ — the second challenge level (D minor, 88 bpm, 12 bars)
// A machine still running with nobody left to read it. Here the
// PERCUSSION IS THE MECHANISM: an escapement ticking every single
// beat, two pitches alternating, never once out of step. Against
// that grid everything else breathes, because the water is the only
// thing in the room that's alive — the motif arrives as a music-box
// chime (D→F→A) half a beat LATE, so the melody and the machine
// never quite agree, and long bronze swells mark the tide turning.
// ------------------------------------------------------------

/** The escapement: two dry ticks alternating. The level's metronome,
 *  kept very quiet — it plays on every beat for as long as you're in
 *  the room, so it has to sit under everything, like a hi-hat. */
function tock(beat: number, high: boolean): SongNote[] {
  return [
    { beat, freq: high ? 3200 : 2200, beats: 0.04, inst: 'tick', vol: 0.02 },
    {
      beat,
      freq: high ? 880 : 620,
      freqEnd: high ? 700 : 470,
      beats: 0.07,
      inst: 'tick',
      vol: 0.018,
    },
  ];
}

const relojChime = voice(
  [
    // The motif on the box: D→F→A, always a half beat behind the tick.
    [0.5, 'D5', 1.5], [2.5, 'F5', 1.5], [4.5, 'A5', 2],
    [8.5, 'G5', 1.5], [10.5, 'F5', 1.5], [12.5, 'D5', 2],
    [16.5, 'A5', 1.5], [18.5, 'C6', 1.5], [20.5, 'A5', 2],
    [24.5, 'F5', 1.5], [26.5, 'E5', 1.5], [28.5, 'D5', 2],
    [32.5, 'D5', 1.5], [34.5, 'F5', 1.5], [36.5, 'A5', 1.5], [38.5, 'D6', 2],
    [42.5, 'C6', 1.5], [44.5, 'A5', 3],
  ],
  { inst: 'marimba', vol: 0.05 },
);

const reloj: Song = {
  id: 'reloj',
  bpm: 88,
  loopBeats: 48,
  // a cut-travertine machine hall half full of moving water: hard and slappy, never
  // long enough to smear the escapement the player times the tide by
  mix: {
    reverbDecay: 2.4, reverbWet: 0.32,
    delayBeats: 0.75, delayFeedback: 0.3, tone: 10500, gain: 1,
  },
  notes: [
    // The escapement, one tick per beat, alternating high and low.
    ...Array.from({ length: 48 }, (_, b) => tock(b, b % 2 === 1)).flat(),
    // The pendulum: a low note every two beats, swinging D–A.
    ...voice(
      Array.from(
        { length: 24 },
        (_, i) => [i * 2, i % 2 === 0 ? 'D2' : 'A1', 1.3] as [number, string, number],
      ),
      { inst: 'bass', vol: 0.045 },
    ),
    ...relojChime,
    // Bronze swells: the tanks turning over.
    ...voice(
      [[0, 'D3', 11], [12, 'A#2', 11], [24, 'F3', 11], [36, 'A2', 11]],
      { inst: 'pad', vol: 0.038, attack: 2.2 },
    ),
    // Water finding its way out somewhere.
    ...droplet(7.25), ...droplet(15.75, 2200), ...droplet(23.5, 3000),
    ...droplet(31.25, 2400), ...droplet(39.75, 2800), ...droplet(46.5, 2000),
  ],
};

// ------------------------------------------------------------
// PUERTA — level 10 (A minor, 72 bpm, 16 bars)
// The title theme comes home: the same A→C→E the menu sings, now
// as a slow procession up to the door — pillar bass stepping in
// twos, bells saying the theme unhurried, a golden arpeggio wash
// when the light breaks through (bars 9-12). The cadence dares the
// Picardy: the last phrase rises A→C#→E, major — the crystal theme
// answered from the OTHER side of the door — and the loop pulls it
// back into minor, because it isn't open yet.
// ------------------------------------------------------------

const puertaBells = voice(
  [
    // The theme, broad and unhurried: this is where it was leading.
    [0, 'A4', 1], [1, 'C5', 1], [2, 'E5', 2],
    [4, 'D5', 0.5], [4.5, 'C5', 0.5], [5, 'D5', 1], [6, 'B4', 2],
    [8, 'F5', 1.5], [9.5, 'E5', 0.5], [10, 'C5', 2],
    [12, 'B4', 1], [13, 'D5', 1], [14, 'G4', 2],
    // Second statement: it dares to climb.
    [16, 'A4', 1], [17, 'C5', 1], [18, 'E5', 2],
    [20, 'G5', 1], [21, 'E5', 1], [22, 'C5', 2],
    [24, 'F5', 1], [25, 'A5', 1], [26, 'G5', 2],
    [28, 'F5', 1], [29, 'D5', 1], [30, 'G#4', 2],
    // B: the light breaks through the seams (the arpeggio joins).
    [32, 'C5', 1], [33, 'F5', 1], [34, 'A5', 2.5],
    [36.5, 'G5', 0.5], [37, 'F5', 1], [38, 'E5', 2],
    [40, 'A4', 1], [41, 'C5', 1], [42, 'E5', 2],
    [44, 'F5', 1], [45, 'E5', 1], [46, 'C5', 2],
    [48, 'D5', 1], [49, 'F5', 1], [50, 'A5', 2],
    [52, 'G#5', 1], [53, 'E5', 1], [54, 'B4', 2],
    // Cadence: sinks to the dominant… and answers in MAJOR (C#).
    [56, 'C5', 1], [57, 'B4', 1], [58, 'G#4', 2],
    [60, 'A4', 1], [61, 'C#5', 1], [62, 'E5', 2],
  ],
  { inst: 'bell', vol: 0.05 },
);

/** The procession: root, then its fifth, stepping every two beats. */
function pillar(bar: number, root: string, fifth: string): Line {
  const b = bar * 4;
  return [[b, root, 1.5], [b + 2, fifth, 1.5]];
}

const puerta: Song = {
  id: 'puerta',
  bpm: 72,
  loopBeats: 64,
  // a nave of dressed marble, the only BUILT place in the game: big, but DEFINED —
  // polished stone keeps its high end and the near pillars answer first
  mix: {
    reverbDecay: 5.4, reverbWet: 0.4,
    delayBeats: 1, delayFeedback: 0.26, tone: 12000, gain: 1,
  },
  notes: [
    ...voice(
      [
        ...(
          [
            ['A2', 'E3'], ['A2', 'E3'], ['F2', 'C3'], ['G2', 'D3'],
            ['A2', 'E3'], ['C3', 'G3'], ['F2', 'C3'], ['E2', 'B2'],
            ['F2', 'C3'], ['G2', 'D3'], ['A2', 'E3'], ['F2', 'C3'],
            ['D3', 'A3'], ['E2', 'B2'], ['E2', 'B2'], ['A2', 'E3'],
          ] as Array<[string, string]>
        ).flatMap(([root, fifth], bar) => pillar(bar, root, fifth)),
      ],
      { inst: 'bass', vol: 0.055 },
    ),
    ...puertaBells,
    ...echo(puertaBells, 64),
    // Long inner voice: a slow warm line under the bells.
    ...voice(
      [
        [0, 'E4', 7.5], [8, 'C4', 7.5], [16, 'E4', 7.5], [24, 'D4', 7.5],
        [32, 'F4', 7.5], [40, 'E4', 7.5], [48, 'F4', 7.5],
        [56, 'B3', 3.7], [60, 'C#4', 3.7],
      ],
      { inst: 'organ', vol: 0.03, attack: 1.2 },
    ),
    // The golden wash, only while the light breaks through (B section).
    ...arp(32, 4, ['F3', 'A3', 'C4', 'A3'], 0.024),
    ...arp(36, 4, ['G3', 'B3', 'D4', 'B3'], 0.024),
    ...arp(40, 4, ['A3', 'C4', 'E4', 'C4'], 0.024),
    ...arp(44, 4, ['F3', 'A3', 'C4', 'A3'], 0.024),
    // The procession's drum: one solemn step per bar, a breath after.
    ...Array.from({ length: 16 }, (_, bar) => kick(bar * 4)),
    ...Array.from({ length: 16 }, (_, bar) => hat(bar * 4 + 2, 0.016)),
    ...fill(28), ...fill(60),
  ],
};

// ------------------------------------------------------------
// CUSTODIO — the boss fight (A minor, 150 bpm, 8 bars)
// The door's warden gets the soundtrack's only fast track: a
// driving eighth-note bass procession-turned-chase, backbeat
// drums, a relentless inner arpeggio, and the crystal theme spat
// out URGENT — with the D# (the tritone over A) leaning on it and
// the whole last two bars stuck on the dominant E, refusing to
// resolve while the warden still stands. syncMusic swaps it in the
// moment the fight is engaged and lets the level theme flood back
// when the Custodio falls.
// ------------------------------------------------------------

/** The chase: driving eighths hammering root and fifth. */
function embestida(bar: number, root: string, fifth: string): Line {
  const b = bar * 4;
  const r = root;
  const f = fifth;
  return [
    [b, r, 0.45], [b + 0.5, r, 0.45], [b + 1, f, 0.45], [b + 1.5, r, 0.45],
    [b + 2, r, 0.45], [b + 2.5, f, 0.45], [b + 3, r, 0.45], [b + 3.5, f, 0.45],
  ];
}

const custodioLead = voice(
  [
    // The theme, urgent — and the D# tritone snarling back at it.
    [0, 'A4', 0.5], [0.5, 'C5', 0.5], [1, 'E5', 1],
    [2, 'D#5', 0.5], [2.5, 'E5', 0.5], [3, 'B4', 1],
    [4, 'A4', 0.5], [4.5, 'C5', 0.5], [5, 'E5', 1],
    [6, 'G5', 0.5], [6.5, 'E5', 0.5], [7, 'D5', 1],
    // Answer over F and G: the halo turns, the pattern turns with it.
    [8, 'F5', 0.5], [8.5, 'A5', 0.5], [9, 'C5', 1],
    [10, 'A4', 0.5], [10.5, 'C5', 0.5], [11, 'F5', 1],
    [12, 'G5', 0.5], [12.5, 'B4', 0.5], [13, 'D5', 1],
    [14, 'B4', 0.5], [14.5, 'D5', 0.5], [15, 'G5', 1],
    // The theme upside-down: falling where it used to rise.
    [16, 'A5', 0.5], [16.5, 'E5', 0.5], [17, 'C5', 1],
    [18, 'A4', 0.5], [18.5, 'C5', 0.5], [19, 'E5', 1],
    [20, 'F5', 0.5], [20.5, 'C5', 0.5], [21, 'A4', 1],
    [22, 'D#5', 1], [23, 'E5', 1],
    // Stuck on the dominant: two bars of E that refuse to let go.
    [24, 'G#4', 0.5], [24.5, 'B4', 0.5], [25, 'E5', 1],
    [26, 'D#5', 0.5], [26.5, 'E5', 0.5], [27, 'G#5', 1],
    [28, 'B4', 0.5], [28.5, 'E5', 0.5], [29, 'G#5', 0.5], [29.5, 'B5', 0.5],
    [30, 'A5', 1], [31, 'G#4', 1],
  ],
  { inst: 'bell', vol: 0.05 },
);

const custodio: Song = {
  id: 'custodio',
  bpm: 150,
  loopBeats: 32,
  // the sanctum FLOOR, not the vault above it: flat dressed stone at arm’s length.
  // Categorically no delay — at 150 bpm a dotted eighth prints a ghost copy of the
  // whole danmaku arpeggio over the snare fills
  mix: { reverbDecay: 2, reverbWet: 0.2, tone: 13500, gain: -1.5 },
  notes: [
    ...voice(
      [
        ...(
          [
            ['A2', 'E3'], ['A2', 'E3'], ['F2', 'C3'], ['G2', 'D3'],
            ['A2', 'E3'], ['F2', 'C3'], ['E2', 'B2'], ['E2', 'B2'],
          ] as Array<[string, string]>
        ).flatMap(([root, fifth], bar) => embestida(bar, root, fifth)),
      ],
      { inst: 'grit', vol: 0.04 },
    ),
    ...custodioLead,
    // The danmaku itself: a ceaseless inner arpeggio, orbit after orbit.
    ...arp(0, 8, ['A3', 'C4', 'E4', 'C4'], 0.024),
    ...arp(8, 4, ['F3', 'A3', 'C4', 'A3'], 0.024),
    ...arp(12, 4, ['G3', 'B3', 'D4', 'B3'], 0.024),
    ...arp(16, 4, ['A3', 'C4', 'E4', 'C4'], 0.024),
    ...arp(20, 4, ['F3', 'A3', 'C4', 'A3'], 0.024),
    ...arp(24, 8, ['E3', 'G#3', 'B3', 'G#3'], 0.024),
    // Drums: four on the floor, backbeat snare, hats in the cracks.
    ...Array.from({ length: 32 }, (_, b) => kick(b)),
    ...Array.from({ length: 16 }, (_, i) => snare(i * 2 + 1)),
    ...Array.from({ length: 32 }, (_, b) => hat(b + 0.5, 0.016)),
    ...fill(14), ...fill(30),
  ],
};

// ------------------------------------------------------------
// The director: what plays depending on the active screen.
// ------------------------------------------------------------

/** Each level's theme, by id. A future level without its own theme
 *  inherits cavernas' until someone composes one for it. */

// ------------------------------------------------------------
// CRIPTA — the last challenge level (E minor, 58 bpm, 12 bars)
// The cellar under the sanctum, and the slowest thing in the game. A
// BELL tolls every other bar and everything else waits for it: the
// crypt is a place where nothing has happened in a long time, so the
// music is mostly the SPACE between two strikes. The crystal motif
// arrives as a lament, E→G→B, sung by one low voice with no answer —
// this is the first theme where nothing echoes it back, because down
// here there is nobody left to answer.
// ------------------------------------------------------------

/** The bell: a struck bronze note with its own long shadow under it. */
function tolls(beat: number, freq: number, vol = 0.055): SongNote[] {
  return [
    { beat, freq, freqEnd: freq * 0.995, beats: 3.4, inst: 'bell', vol },
    { beat, freq: freq * 2.02, beats: 1.6, inst: 'glass', vol: vol * 0.4 },
    { beat: beat + 0.04, freq: freq / 2, beats: 4, inst: 'bell', vol: vol * 0.6 },
  ];
}

const criptaLamento = voice(
  [
    // The motif, said once and left hanging: E→G→B.
    [2, 'E3', 2], [4, 'G3', 2], [6, 'B3', 3],
    [12, 'A3', 2], [14, 'G3', 2], [16, 'E3', 3],
    [24, 'B3', 2], [26, 'C4', 2], [28, 'B3', 3],
    [36, 'G3', 2], [38, 'F#3', 2], [40, 'E3', 4],
  ],
  // Sung on the ORGAN, not the bell: the bell is a STRUCK patch whose
  // modulation is spent in a third of a second, so a 0.35 s swell only
  // fades up into the dull sine left behind it. The organ is the sanctum's
  // own voice heard from underneath the sanctum — and it leaves the bell
  // to the one thing down here that tolls.
  { inst: 'organ', vol: 0.05, attack: 0.35 },
);

const cripta: Song = {
  id: 'cripta',
  bpm: 58,
  loopBeats: 48,
  // a sealed stone basilica: sized so each toll blooms and genuinely DIES in the four
  // seconds before the next one, keeping the silence the piece is made of
  mix: { reverbDecay: 5.6, reverbWet: 0.5, tone: 6800, gain: 1.5 },
  notes: [
    // The bell, every other bar, alternating its two notes.
    ...tolls(0, n('E2')), ...tolls(8, n('B1'), 0.045),
    ...tolls(16, n('E2')), ...tolls(24, n('G1'), 0.045),
    ...tolls(32, n('E2')), ...tolls(40, n('B1'), 0.045),
    // The vault: two voices holding, almost not moving.
    ...voice(
      [
        [0, 'E1', 15], [0, 'B1', 15], [16, 'C2', 15], [16, 'G1', 15],
        [32, 'E1', 15], [32, 'B1', 15],
      ],
      { inst: 'pad', vol: 0.042, attack: 3.5 },
    ),
    ...criptaLamento,
    // Dust falling somewhere in the dark, off the beat.
    drip(9.5, 1245), drip(21.25, 1046), drip(33.75, 1397), drip(45.5, 932),
  ],
};

export const LEVEL_SONGS: Record<string, Song> = {
  cavernas,
  galerias,
  corazon,
  esporas,
  glaciar,
  fragua,
  cenote,
  mina,
  seda,
  puerta,
  simas,
  reloj,
  cripta,
};

/** Boss themes, by level id: they take over WHILE the fight is
 *  engaged. A level absent here keeps its own theme during its boss. */
export const BOSS_SONGS: Record<string, Song> = {
  puerta: custodio,
  // Su cripta: el mismo tema, porque es el mismo guardián.
  cripta: custodio,
};

// Every song, once. Two levels may share a theme on purpose — the
// Custodio's fight sounds the same in his sanctum and in his crypt,
// because it is the same guardian — so the list is deduped by id.
export const SONGS: Song[] = [...new Map(
  [title, overworld, ...Object.values(LEVEL_SONGS), ...Object.values(BOSS_SONGS)]
    .map((song) => [song.id, song]),
).values()];

/**
 * Call once per frame with the active scene's state: picks the
 * matching song and advances the sequencer. On pause the music
 * doesn't cut out: it ducks, like pulling a blanket over itself.
 * On victory/defeat it goes fully silent: there the sfx stingers rule.
 */
export function syncMusic(ui: UiState, levelId: string, bossFight = false): void {
  switch (ui.state) {
    case 'title':
      setSong(title);
      break;
    case 'overworld':
      setSong(overworld);
      break;
    case 'playing': {
      // An ENGAGED boss steals the stage (if its level has a theme for
      // it); the level track floods back the moment the fight ends.
      const boss = bossFight ? BOSS_SONGS[levelId] : undefined;
      setSong(boss ?? LEVEL_SONGS[levelId] ?? cavernas);
      break;
    }
    case 'ending':
      // The credits play THE theme: the title's slow, grand reading of
      // the crystal motif — the same tune the game opened with, closing
      // it. (won/gameover stay silent; those belong to the sfx stingers.)
      setSong(title);
      break;
    case 'won':
    case 'gameover':
      setSong(null);
      break;
  }
  setMusicDuck(ui.paused ? 0.35 : 1);
  tickMusic();
}
