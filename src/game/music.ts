// ============================================================
//  MÚSICA del juego — la banda sonora, escrita como datos
// ------------------------------------------------------------
//  Toda la banda sonora crece de UN leitmotiv, "el tema del
//  cristal": un arpegio que sube (raíz → tercera → quinta
//  sostenida), un giro que centellea, y una caída a casa.
//  En La menor: la–do–MI… re–do–re… SI… sol–LA. Cada tema lo
//  viste distinto —majestuoso, saltarín, melancólico, feroz—
//  y por eso el juego entero suena a la misma cueva.
//
//   · título     "Cristales de Cueva" — el tema, dicho lento y en grande.
//   · overworld  "El sendero"  — verso saltarín y coro que cita el tema.
//   · cavernas   — el tema en menor, gotas de agua, un ♭VI que abriga.
//   · galerias   — riff galopado; el coro es el tema a toda marcha.
//   · corazon    — riff que baja escalón a escalón (si→la→sol→fa#) y
//                  el tema oscuro sobre drones; el ♭2 frigio martilla.
//
//  Paleta tímbrica: triangle = campanas de cristal, sine = colchones
//  y bombos, square = melodía brillante, sawtooth = aspereza, noise =
//  batería (redobles, hi-hats). La música vive DEBAJO de los sfx:
//  ninguna nota pasa de 0.08 de volumen (hay un test que lo jura).
// ============================================================

import type { Song, SongNote } from '../engine/music';
import { setSong, setMusicDuck, tickMusic } from '../engine/music';
import type { ToneType } from '../engine/audio';
import type { UiState } from './scenes/Scene';

// ------------------------------------------------------------
// Notación y utilerías de composición
// ------------------------------------------------------------
const SEMITONE: Record<string, number> = {
  C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4,
  'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2,
};

/** 'A4' = La central (440 Hz). Los bemoles se escriben como sostenidos
 *  (Sib = 'A#'): el sintetizador no distingue enarmonías. */
function n(name: string): number {
  const match = /^([A-G]#?)(\d)$/.exec(name);
  if (!match) throw new Error(`Nota inválida: "${name}"`);
  const semis = SEMITONE[match[1]] + (Number(match[2]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
}

/** k semitonos arriba de una frecuencia (transponer riffs). */
function up(freq: number, semis: number): number {
  return freq * Math.pow(2, semis / 12);
}

/** Una voz: [beat, nota, duración en beats] con un timbre compartido. */
type Line = Array<[number, string, number]>;
interface VoiceOpts {
  type?: ToneType;
  vol?: number;
  attack?: number;
}

function voice(line: Line, opts: VoiceOpts): SongNote[] {
  return line.map(([beat, note, beats]) => ({ beat, freq: n(note), beats, ...opts }));
}

/** Eco cristalino: la misma voz una octava arriba, medio beat después
 *  y más floja — cristales respondiéndose. Envuelve al final del loop. */
function echo(notes: SongNote[], loopBeats: number, factor = 0.3): SongNote[] {
  return notes.map((note) => ({
    ...note,
    beat: (note.beat + 0.5) % loopBeats,
    freq: note.freq * 2,
    vol: (note.vol ?? 0.06) * factor,
  }));
}

/** Gota de agua: un "plip" sinusoidal que cae de frecuencia. */
function drip(beat: number, freq = 1568): SongNote {
  return { beat, freq, freqEnd: freq / 2, beats: 0.2, type: 'sine', vol: 0.04 };
}

// --- La batería (sin samples: seno barrido + ruido filtrado) ---

/** Bombo: un seno que se desploma de golpe — el "punch" está en la caída. */
function kick(beat: number): SongNote {
  return { beat, freq: 160, freqEnd: 45, beats: 0.3, type: 'sine', vol: 0.065 };
}

/** Redoble: ruido de banda media, seco. */
function snare(beat: number, vol = 0.045): SongNote {
  return { beat, freq: 1800, beats: 0.25, type: 'noise', vol };
}

/** Hi-hat: un suspiro de ruido agudo. */
function hat(beat: number, vol = 0.02): SongNote {
  return { beat, freq: 8000, beats: 0.15, type: 'noise', vol };
}

/** Relleno de redoble (semicorcheas que crecen) al doblar una sección. */
function fill(beat: number): SongNote[] {
  return [0.028, 0.034, 0.042, 0.05].map((vol, i) => snare(beat + i * 0.25, vol));
}

/** Arpegio interior en corcheas: recorre el ciclo de notas dado. */
function arp(fromBeat: number, lengthBeats: number, cycle: string[], vol = 0.03): SongNote[] {
  const freqs = cycle.map(n);
  return Array.from({ length: lengthBeats * 2 }, (_, i) => ({
    beat: fromBeat + i * 0.5,
    freq: freqs[i % freqs.length],
    beats: 0.45,
    type: 'triangle' as const,
    vol,
  }));
}

// ------------------------------------------------------------
// TÍTULO — "Cristales de Cueva" (La menor, 76 bpm, 8 compases)
// El leitmotiv dicho completo y sin apuro sobre colchones
// (Am F C G · Am F Dm E). El sol# final es la tercera mayor del
// acorde de Mi: esa nota agridulce que pide volver a empezar.
// ------------------------------------------------------------
const titleBells = voice(
  [
    // El tema (compases 1-2): sube, centellea, cae a casa.
    [0, 'A4', 0.5], [0.5, 'C5', 0.5], [1, 'E5', 1.5],
    [2.5, 'D5', 0.5], [3, 'C5', 0.5], [3.5, 'D5', 0.5],
    [4, 'B4', 1.5], [5.5, 'G4', 0.5], [6, 'A4', 2],
    // Secuencia en Do (compases 3-4): la misma frase, un piso más luminosa.
    [8, 'G4', 0.5], [8.5, 'C5', 0.5], [9, 'E5', 1.5],
    [10.5, 'D5', 0.5], [11, 'C5', 0.5], [11.5, 'D5', 0.5],
    [12, 'B4', 1.5], [13.5, 'D5', 0.5], [14, 'G4', 2],
    // Respuesta (compases 5-6): trepa hasta el La agudo y baja en volutas.
    [16, 'A4', 0.5], [16.5, 'C5', 0.5], [17, 'E5', 1.5],
    [18.5, 'G5', 0.5], [19, 'A5', 1.5], [20.5, 'G5', 0.5],
    [21, 'E5', 1], [22, 'D5', 0.5], [22.5, 'C5', 0.5], [23, 'D5', 1],
    // Cadencia (compases 7-8): desciende y queda suspendida en el sol#.
    [24, 'F5', 1], [25, 'E5', 1], [26, 'D5', 1.5], [27.5, 'C5', 0.5],
    [28, 'B4', 2], [30, 'G#4', 2],
  ],
  { type: 'triangle', vol: 0.05 },
);

const title: Song = {
  id: 'title',
  bpm: 76,
  loopBeats: 32,
  notes: [
    ...voice(
      [
        [0, 'A2', 4], [0, 'E3', 4], [4, 'F2', 4], [4, 'C3', 4],
        [8, 'C3', 4], [8, 'G3', 4], [12, 'G2', 4], [12, 'D3', 4],
        [16, 'A2', 4], [16, 'E3', 4], [20, 'F2', 4], [20, 'C3', 4],
        [24, 'D3', 4], [24, 'A3', 4], [28, 'E2', 4], [28, 'B2', 4],
      ],
      { type: 'sine', vol: 0.05, attack: 1.2 },
    ),
    ...titleBells,
    ...echo(titleBells, 32),
    drip(15.5), drip(31.25, 1319),
  ],
};

// ------------------------------------------------------------
// OVERWORLD — "El sendero" (Do mayor, 112 bpm, 16 compases)
// Verso (C Am F G ×2) con bajo rebotado y hi-hats a contratiempo;
// el CORO (F G Em Am) cita el leitmotiv nota por nota — el mismo
// tema del título, ahora con sol de tarde. Entra la caja recién
// en el coro: la clásica subida de energía a mitad de canción.
// ------------------------------------------------------------

/** Bajo rebotado: raíz y octava alternando en corcheas (boing, boing). */
function bounce(bar: number, root: string): SongNote[] {
  const low = n(root);
  return Array.from({ length: 8 }, (_, i) => ({
    beat: bar * 4 + i * 0.5,
    freq: i % 2 === 0 ? low : low * 2,
    beats: 0.4,
    type: 'triangle' as const,
    vol: 0.055,
  }));
}

const overworldBars = ['C2', 'A2', 'F2', 'G2', 'C2', 'A2', 'F2', 'G2',
  'F2', 'G2', 'E2', 'A2', 'F2', 'G2', 'C2', 'C2'];

const overworld: Song = {
  id: 'overworld',
  bpm: 112,
  loopBeats: 64,
  notes: [
    ...overworldBars.flatMap((root, bar) => bounce(bar, root)),
    // Batería: bombo a tierra, hi-hats al aire; la caja espera al coro.
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
        // Verso: una melodía que camina y se sacude el polvo.
        [0, 'E4', 0.5], [0.5, 'G4', 0.5], [1, 'C5', 1.5], [2.5, 'B4', 0.5], [3, 'A4', 1],
        [4, 'G4', 0.5], [4.5, 'E4', 0.5], [5, 'A4', 2.5],
        [8, 'F4', 0.5], [8.5, 'A4', 0.5], [9, 'C5', 1.5], [10.5, 'D5', 0.5], [11, 'C5', 1],
        [12, 'B4', 0.5], [12.5, 'A4', 0.5], [13, 'G4', 1.5], [14.5, 'D4', 0.5], [15, 'G4', 1],
        [16, 'E4', 0.5], [16.5, 'G4', 0.5], [17, 'C5', 1.5], [18.5, 'D5', 0.5], [19, 'E5', 1],
        [20, 'D5', 0.5], [20.5, 'C5', 0.5], [21, 'A4', 2.5],
        [24, 'F4', 0.5], [24.5, 'A4', 0.5], [25, 'C5', 1], [26, 'D5', 0.5], [26.5, 'E5', 0.5], [27, 'F5', 1],
        [28, 'E5', 0.5], [28.5, 'D5', 0.5], [29, 'B4', 1.5], [30.5, 'G4', 1],
        // Coro: el tema del cristal, tal cual el título, sobre F-G-Em-Am.
        [32, 'A4', 0.5], [32.5, 'C5', 0.5], [33, 'E5', 1.5],
        [34.5, 'D5', 0.5], [35, 'C5', 0.5], [35.5, 'D5', 0.5],
        [36, 'B4', 1.5], [37.5, 'G4', 0.5], [38, 'A4', 1.5], [39.5, 'B4', 0.5],
        [40, 'B4', 0.5], [40.5, 'E5', 0.5], [41, 'G5', 1.5], [42.5, 'F#5', 0.5], [43, 'E5', 1],
        [44, 'A5', 1.5], [45.5, 'G5', 0.5], [46, 'E5', 1.5],
        [48, 'A4', 0.5], [48.5, 'C5', 0.5], [49, 'E5', 1.5], [50.5, 'G5', 0.5], [51, 'A5', 1],
        [52, 'G5', 0.5], [52.5, 'E5', 0.5], [53, 'D5', 1], [54, 'C5', 0.5], [54.5, 'D5', 0.5], [55, 'B4', 1],
        [56, 'C5', 2], [58, 'G4', 0.5], [58.5, 'E4', 0.5], [59, 'G4', 1],
        // Respiro, y tres notas de anacrusa que empujan de vuelta al verso.
        [62, 'G4', 0.5], [62.5, 'A4', 0.5], [63, 'B4', 1],
      ],
      { type: 'square', vol: 0.042 },
    ),
    // Contravoz cálida solo en el coro: terceras largas bajo la melodía.
    ...voice(
      [
        [32, 'A3', 3.7], [36, 'B3', 3.7], [40, 'G3', 3.7], [44, 'C4', 3.7],
        [48, 'A3', 3.7], [52, 'B3', 3.7], [56, 'E4', 3.7], [60, 'G3', 3.7],
      ],
      { type: 'triangle', vol: 0.028, attack: 0.3 },
    ),
  ],
};

// ------------------------------------------------------------
// CAVERNAS — nivel 1 (Re menor/dórico, 92 bpm, 16 compases)
// El leitmotiv en menor, primero desnudo (latido + campana + gotas)
// y luego octava arriba. La sección B pisa el Si bemol (♭VI prestado)
// y abriga todo; el Do# final es la dominante que pide volver.
// Sin batería: acá el ritmo lo llevan el corazón y el agua.
// ------------------------------------------------------------

/** Latido: la raíz en negra y su réplica sincopada (tum… tum-tum). */
function heartbeat(bar: number, root: string): Line {
  const b = bar * 4;
  return [[b, root, 1], [b + 2.5, root, 0.5]];
}

const cavernasMelody = voice(
  [
    // A: el tema en Re menor, a media voz.
    [0, 'D4', 0.5], [0.5, 'F4', 0.5], [1, 'A4', 1.5],
    [2.5, 'G4', 0.5], [3, 'F4', 0.5], [3.5, 'G4', 0.5],
    [4, 'E4', 1.5], [5.5, 'C4', 0.5], [6, 'D4', 2],
    // Secuencia en Do, con el Si natural dórico brillando de paso.
    [8, 'E4', 0.5], [8.5, 'G4', 0.5], [9, 'C5', 1.5],
    [10.5, 'B4', 0.5], [11, 'A4', 0.5], [11.5, 'B4', 0.5],
    [12, 'B4', 1.5], [13.5, 'G4', 0.5], [14, 'A4', 2],
    // El tema otra vez, octava arriba: la cueva se anima a cantar.
    [16, 'D5', 0.5], [16.5, 'F5', 0.5], [17, 'A5', 1.5],
    [18.5, 'G5', 0.5], [19, 'F5', 0.5], [19.5, 'G5', 0.5],
    [20, 'E5', 1.5], [21.5, 'C5', 0.5], [22, 'D5', 2],
    [24, 'C5', 1], [25, 'E5', 1], [26, 'G5', 1.5],
    [28, 'F5', 0.5], [28.5, 'E5', 0.5], [29, 'C#5', 1.5], [30.5, 'A4', 1.5],
    // B: entra el Si bemol (♭VI) y el mismo tema de golpe abriga.
    [32, 'D5', 0.5], [32.5, 'F5', 0.5], [33, 'A5', 1.5],
    [34.5, 'G5', 0.5], [35, 'F5', 0.5], [35.5, 'G5', 0.5],
    [36, 'E5', 1.5], [37.5, 'C5', 0.5], [38, 'D5', 2],
    [40, 'C5', 0.5], [40.5, 'E5', 0.5], [41, 'G5', 1.5],
    [42.5, 'A5', 0.5], [43, 'G5', 0.5], [43.5, 'E5', 0.5],
    [44, 'D5', 1], [45, 'F5', 1], [46, 'A5', 2],
    // El tema una vez más, ahora naciendo del propio Si bemol.
    [48, 'A#4', 0.5], [48.5, 'D5', 0.5], [49, 'F5', 1.5],
    [50.5, 'E5', 0.5], [51, 'D5', 0.5], [51.5, 'E5', 0.5],
    [52, 'C5', 1.5], [53.5, 'A4', 0.5], [54, 'C5', 2],
    // Cadencia: baja despacio y el Do# (dominante) deja la puerta abierta.
    [56, 'E5', 1], [57, 'D5', 1], [58, 'C5', 1.5],
    [60, 'C#5', 1.5], [61.5, 'E5', 0.5], [62, 'A4', 2],
  ],
  { type: 'triangle', vol: 0.048 },
);

const cavernas: Song = {
  id: 'cavernas',
  bpm: 92,
  loopBeats: 64,
  notes: [
    ...voice(
      [
        ...['D3', 'F3', 'C3', 'G2', 'D3', 'F3', 'C3', 'A2',
          'A#2', 'F3', 'C3', 'D3', 'A#2', 'F3', 'C3', 'A2']
          .flatMap((root, bar) => heartbeat(bar, root)),
      ],
      { type: 'triangle', vol: 0.06 },
    ),
    ...cavernasMelody,
    ...echo(cavernasMelody, 64),
    // Arpegio interior solo en la sección B: el agua empieza a correr.
    ...arp(32, 4, ['A#3', 'D4', 'F4', 'D4'], 0.026),
    ...arp(36, 4, ['F3', 'A3', 'C4', 'A3'], 0.026),
    ...arp(40, 4, ['C4', 'E4', 'G4', 'E4'], 0.026),
    ...arp(44, 4, ['D4', 'F4', 'A4', 'F4'], 0.026),
    ...arp(48, 4, ['A#3', 'D4', 'F4', 'D4'], 0.026),
    ...arp(52, 4, ['F3', 'A3', 'C4', 'A3'], 0.026),
    ...arp(56, 4, ['C4', 'E4', 'G4', 'E4'], 0.026),
    ...arp(60, 4, ['A3', 'C#4', 'E4', 'C#4'], 0.026),
    // Gotas a deshora, como goteras de verdad.
    drip(7.5), drip(15.25, 1760), drip(23.5, 1319), drip(31),
    drip(39.5, 1976), drip(47.25), drip(55.5, 1760), drip(62.75, 1319),
  ],
};

// ------------------------------------------------------------
// GALERÍAS — nivel 2 (Mi menor, 126 bpm, 16 compases)
// Un riff de bajo con séptima bluesera (mi-mi-MI-re) que no
// afloja, batería entera y un verso anguloso; en el coro el
// leitmotiv sale a correr en Mi menor. El Re# del final es la
// tercera de Si mayor: la puerta con resorte que te devuelve
// al riff. Es el nivel de púas: la música no se sienta nunca.
// ------------------------------------------------------------

/** Riff galopado: raíz insistente, salto de octava, y la séptima
 *  menor de paso — el motor del nivel. */
function gallop(bar: number, root: string): SongNote[] {
  const low = n(root);
  const semis = [0, 0, 12, 0, 10, 0, 12, 10]; // ♭7 = la mueca bluesera
  return semis.map((s, i) => ({
    beat: bar * 4 + i * 0.5,
    freq: up(low, s),
    beats: 0.4,
    type: 'sawtooth' as const,
    vol: 0.04,
  }));
}

const galeriasBars = ['E2', 'E2', 'C3', 'D3', 'E2', 'E2', 'C3', 'D3',
  'C3', 'D3', 'E2', 'E2', 'C3', 'D3', 'B2', 'B2'];

const galerias: Song = {
  id: 'galerias',
  bpm: 126,
  loopBeats: 64,
  notes: [
    ...galeriasBars.flatMap((root, bar) => gallop(bar, root)),
    // Batería completa de punta a punta: bombo sincopado, caja al 2 y 4.
    ...galeriasBars.flatMap((_, bar) => [
      kick(bar * 4), kick(bar * 4 + 2.5),
      snare(bar * 4 + 1), snare(bar * 4 + 3),
      ...[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((o) => hat(bar * 4 + o, 0.018)),
    ]),
    ...fill(63),
    // Puntazos a contratiempo: la quinta del acorde, arriba y seca.
    ...voice(
      galeriasBars.flatMap((root, bar): Line => {
        const fifth = { E2: 'B4', C3: 'G4', D3: 'A4', B2: 'F#4' }[root]!;
        return [[bar * 4 + 1.5, fifth, 0.3], [bar * 4 + 3.5, fifth, 0.3]];
      }),
      { type: 'square', vol: 0.026 },
    ),
    ...voice(
      [
        // Verso: frases que arrancan, frenan y vuelven a arrancar.
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
        // Coro: el tema del cristal en Mi menor, a toda marcha.
        [32, 'E5', 0.5], [32.5, 'G5', 0.5], [33, 'B5', 1.5],
        [34.5, 'A5', 0.5], [35, 'G5', 0.5], [35.5, 'A5', 0.5],
        [36, 'F#5', 1.5], [37.5, 'D5', 0.5], [38, 'E5', 2],
        [40, 'E5', 0.5], [40.5, 'G5', 0.5], [41, 'B5', 1.5], [42.5, 'A5', 0.5], [43, 'B5', 1],
        [44, 'G5', 0.5], [44.5, 'F#5', 0.5], [45, 'E5', 0.5], [45.5, 'D5', 0.5], [46, 'B4', 1.5],
        [48, 'C5', 0.5], [48.5, 'E5', 0.5], [49, 'G5', 1],
        [50, 'A5', 0.5], [50.5, 'G5', 0.5], [51, 'E5', 1],
        [52, 'D5', 0.5], [52.5, 'F#5', 0.5], [53, 'A5', 1],
        [54, 'B5', 0.5], [54.5, 'A5', 0.5], [55, 'F#5', 1],
        // Si mayor: el Re# empuja con resorte de vuelta al Mi menor.
        [56, 'D#5', 1], [57, 'F#5', 1], [58, 'B4', 1.5],
        [60, 'F#4', 0.5], [60.5, 'A4', 0.5], [61, 'B4', 0.5], [61.5, 'D#5', 0.5], [62, 'F#5', 2],
      ],
      { type: 'square', vol: 0.045 },
    ),
  ],
};

// ------------------------------------------------------------
// CORAZÓN — nivel 3 (Si menor, 132 bpm, 16 compases)
// Tema de guardián en dos actos. A: un riff crudo que se repite
// TRANSPONIÉNDOSE hacia abajo (si→la→sol→fa#), solo riff y
// batería — la amenaza. B: medio tiempo, drones en el sótano del
// registro, y el leitmotiv en Si menor cantado en grande; al
// final el Do natural (♭2 frigio) martilla contra la raíz y cae
// al Fa# que relanza el riff. El corazón de la cueva late igual
// que el título: es el mismo tema, con los dientes apretados.
// ------------------------------------------------------------

/** El riff del guardián: raíz doble, octava, quinta, sexta menor
 *  que muerde, y la escalera ♭3–4 que empalma con el bajado. */
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
    type: 'sawtooth' as const,
    vol: 0.036,
  }));
}

const corazonLead = voice(
  [
    // El tema del cristal en Si menor, largo y encima de todo.
    [32, 'B4', 0.5], [32.5, 'D5', 0.5], [33, 'F#5', 1.5],
    [34.5, 'E5', 0.5], [35, 'D5', 0.5], [35.5, 'E5', 0.5],
    [36, 'C#5', 1.5], [37.5, 'A4', 0.5], [38, 'B4', 2],
    // La respuesta trepa hasta el Si agudo y planea bajando.
    [40, 'B4', 0.5], [40.5, 'D5', 0.5], [41, 'F#5', 1.5],
    [42.5, 'A5', 0.5], [43, 'B5', 1.5], [44.5, 'A5', 0.5],
    [45, 'F#5', 1], [46, 'E5', 0.5], [46.5, 'D5', 0.5], [47, 'E5', 1],
    [48, 'G5', 1], [49, 'F#5', 1], [50, 'E5', 1.5], [51.5, 'D5', 0.5],
    [52, 'C#5', 1.5], [53.5, 'B4', 0.5], [54, 'F#5', 2],
    // El ♭2 frigio: do natural martillando contra si, y caída al fa#.
    [56, 'E5', 1], [57, 'D5', 1], [58, 'C5', 1.5], [59.5, 'B4', 0.5],
    [60, 'C5', 0.5], [60.5, 'B4', 0.5], [61, 'C5', 0.5], [61.5, 'B4', 0.5],
    [62, 'F#4', 2],
  ],
  { type: 'triangle', vol: 0.05 },
);

const corazon: Song = {
  id: 'corazon',
  bpm: 132,
  loopBeats: 64,
  notes: [
    // Acto A (compases 1-8): el riff bajando la escalera, dos vueltas.
    ...['B2', 'A2', 'G2', 'F#2', 'B2', 'A2', 'G2', 'F#2']
      .flatMap((root, bar) => guardianRiff(bar, root)),
    ...Array.from({ length: 8 }, (_, bar) => [
      kick(bar * 4), kick(bar * 4 + 2.5),
      snare(bar * 4 + 1), snare(bar * 4 + 3),
      ...[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((o) => hat(bar * 4 + o, 0.016)),
    ]).flat(),
    ...fill(31),
    // Acto B (compases 9-16): drones en el sótano y el tema en grande.
    ...voice(
      [
        [32, 'B1', 8], [32, 'F#2', 8], [40, 'G2', 8], [40, 'D3', 8],
        [48, 'E2', 8], [48, 'B2', 8], [56, 'C2', 8], [56, 'G2', 8],
      ],
      { type: 'sine', vol: 0.05, attack: 1.5 },
    ),
    ...arp(32, 8, ['B3', 'D4', 'F#4', 'D4']),
    ...arp(40, 8, ['G3', 'B3', 'D4', 'B3']),
    ...arp(48, 8, ['G3', 'B3', 'E4', 'B3']),
    ...arp(56, 8, ['G3', 'C4', 'E4', 'C4']),
    ...corazonLead,
    ...echo(corazonLead, 64, 0.25),
    // Medio tiempo: bombo a tierra, caja al 3 — el gigante camina.
    ...Array.from({ length: 8 }, (_, i) => [kick((i + 8) * 4), snare((i + 8) * 4 + 2)]).flat(),
    ...fill(63),
  ],
};

// ------------------------------------------------------------
// El director: qué suena según la pantalla activa.
// ------------------------------------------------------------

/** Tema de cada nivel, por id. Un nivel futuro sin tema propio
 *  hereda el de cavernas hasta que alguien se lo componga. */
export const LEVEL_SONGS: Record<string, Song> = { cavernas, galerias, corazon };

export const SONGS: Song[] = [title, overworld, ...Object.values(LEVEL_SONGS)];

/**
 * Llamar una vez por frame con el estado de la escena activa: elige la
 * canción que corresponde y avanza el secuenciador. En pausa la música
 * no se corta: se agacha (duck), como tapándose con una manta.
 * En victoria/derrota se calla del todo: ahí mandan los stingers de sfx.
 */
export function syncMusic(ui: UiState, levelId: string): void {
  switch (ui.state) {
    case 'title':
      setSong(title);
      break;
    case 'overworld':
      setSong(overworld);
      break;
    case 'playing':
      setSong(LEVEL_SONGS[levelId] ?? cavernas);
      break;
    case 'won':
    case 'gameover':
      setSong(null);
      break;
  }
  setMusicDuck(ui.paused ? 0.35 : 1);
  tickMusic();
}
