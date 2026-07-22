// ============================================================
//  AUDIO (Tone.js)
// ------------------------------------------------------------
//  The game's orchestra. There are still no audio files: every
//  instrument is SYNTHESIZED, exactly like the sprites are drawn
//  by code. What changed is the depth of the synthesis — where
//  there used to be one bare oscillator with a decay, there is now
//  a patch: FM bells with a struck tail, unison-detuned pads,
//  Karplus-Strong strings, membrane drums, and two reverbs the
//  songs crossfade between to choose the ROOM they play in.
//
//  Two paths, on purpose:
//
//   · MUSIC — full Tone. Persistent polyphonic instruments wired
//     into effect buses, played by music.ts on Tone's Transport.
//     Instruments are built ONCE and retriggered; nothing is
//     allocated per note, which is what keeps 60 fps honest.
//
//   · SFX — lean nodes on Tone's own AudioContext, through a dry
//     bus (no reverb: an effect has to be crisp and immediate).
//     Sfx fire dozens of times a second on a hit or a footstep, so
//     they skip the wrapper overhead and keep sfx.ts untouched.
//
//  Browsers only allow sound after a user gesture: initAudio()
//  listens for the first one and calls Tone.start() then.
// ============================================================

import * as Tone from 'tone';
import { INSTRUMENTS } from './song';
import type { Instrument as InstrumentName, SongMix } from './song';

/** The legacy waveform names, still spoken by sfx.ts. */
export type ToneType = OscillatorType | 'noise';

export interface ToneOptions {
  freq: number;          // starting frequency, in Hz (for 'noise': filter center)
  duration: number;      // total duration, in seconds
  freqEnd?: number;      // if different from freq, exponential sweep to this
  type?: ToneType;       // square (retro), triangle (soft), sawtooth (harsh), sine, noise
  volume?: number;       // 0..1, default 0.15
  delay?: number;        // seconds to wait before sounding (for arpeggios)
  attack?: number;       // seconds until full volume (long = pad/cushion)
}

export type AudioChannel = 'sfx' | 'music';

// ------------------------------------------------------------
// State
// ------------------------------------------------------------
let started = false;
const volumes: Record<AudioChannel, number> = { sfx: 1, music: 1 };

// THREE things want a say in how loud the music is: the player's channel
// volume, the current song's own trim, and the transient pause duck. They
// are kept apart and combined in one place — when each wrote the bus
// directly they simply overwrote each other, and whichever ran last won.
let mixGain = 0;   // dB, from the song's SongMix
let duckGain = 1;  // linear, from the pause duck

/** Longest echo the delay line can hold, in seconds. Four beats of the
 *  slowest song in the game (cripta, 58 bpm) with room to spare. */
const MAX_DELAY = 4;

/** Buses. Built on the first gesture, never torn down. */
let musicBus: Tone.Volume;      // everything musical, after the effects
let sfxBus: Tone.Volume;        // dry, immediate
let masterTone: Tone.Filter;    // the song's overall colour (muffled / open)
let roomSend: Tone.Gain;        // short reverb send  (a chamber)
let hallSend: Tone.Gain;        // long reverb send   (a cavern)
let delaySend: Tone.Gain;       // echo send
let roomVerb: Tone.Reverb;
let hallVerb: Tone.Reverb;
let echoDelay: Tone.FeedbackDelay;

let instruments: Map<InstrumentName, Patch>;

/** How a patch is played. Some instruments are polyphonic (a PolySynth
 *  allocates voices); others are a round-robin POOL, because Tone's
 *  PluckSynth and NoiseSynth extend Instrument rather than Monophonic
 *  and so cannot legally live inside a PolySynth. */
interface Patch {
  /** Fire a note. `freq` in Hz, `dur` in seconds, `time` on the audio clock. */
  play(freq: number, dur: number, time: number, velocity: number, freqEnd?: number,
    attack?: number): void;
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

/** The one place the music bus level is decided: the player's volume and
 *  the pause duck multiply, and the song's own trim rides on top in dB. */
function applyMusicGain(ramp = 0.12): void {
  if (!instruments) return;
  const linear = Math.max(volumes.music * duckGain, 0.0001);
  musicBus.volume.rampTo(Tone.gainToDb(linear) + mixGain, ramp);
}

/** A channel's volume (0..1). Works before or after the audio wakes. */
export function setChannelVolume(name: AudioChannel, volume: number): void {
  volumes[name] = volume;
  if (!started || !instruments) return;
  if (name === 'music') applyMusicGain(0.05);
  else sfxBus.volume.rampTo(Tone.gainToDb(Math.max(volume, 0.0001)), 0.05);
}

/** Call once at startup: wakes the audio on the first gesture. */
export function initAudio(): void {
  const wake = (): void => {
    if (started) return;
    started = true;
    void Tone.start().then(build);
  };
  window.addEventListener('keydown', wake);
  window.addEventListener('pointerdown', wake);

  // Debug hook, like window.__game (dev only).
  if (import.meta.env.DEV) {
    (window as unknown as { __audio: () => unknown }).__audio = () => ({
      tone: Tone,
      transport: Tone.getTransport(),
      ctx: Tone.getContext(),
    });
  }
}

/** True once the orchestra exists and can be played. Replaces the old
 *  `audioNow()`: nobody needs the raw clock any more, because Transport
 *  owns the timing — callers only need to know whether it is awake. */
export function audioReady(): boolean {
  return started && !!instruments;
}

/** Plays one note of the given instrument. Used by the sequencer. */
export function playNote(
  inst: InstrumentName,
  freq: number,
  dur: number,
  time: number,
  velocity: number,
  freqEnd?: number,
  attack?: number,
): void {
  if (!instruments) return;
  const patch = instruments.get(inst) ?? instruments.get('bell')!;
  patch.play(freq, dur, time, velocity, freqEnd, attack);
}

/** The song's ROOM: reverb size and mix, echo, overall colour.
 *  Applied with short ramps so a level change doesn't click. */
export function setMix(mix: SongMix | undefined, bpm: number): void {
  if (!instruments) return;
  const decay = mix?.reverbDecay ?? 2.2;
  const wet = mix?.reverbWet ?? 0.28;
  // The two reverbs are FIXED (regenerating an impulse response mid-game
  // glitches); a song picks its room by crossfading between them.
  const hall = Math.min(Math.max((decay - 1.2) / 5.8, 0), 1);
  roomSend.gain.rampTo(wet * (1 - hall), 0.4);
  hallSend.gain.rampTo(wet * hall, 0.4);

  const delayBeats = mix?.delayBeats ?? 0;
  delaySend.gain.rampTo(delayBeats > 0 ? 0.22 : 0, 0.4);
  if (delayBeats > 0) {
    // Clamped, not trusted: a slow enough song with a long enough echo
    // would otherwise ask for more than the delay line can hold and throw.
    echoDelay.delayTime.rampTo(Math.min((60 / bpm) * delayBeats, MAX_DELAY), 0.4);
    echoDelay.feedback.rampTo(Math.min(Math.max(mix?.delayFeedback ?? 0.28, 0), 0.9), 0.4);
  }

  masterTone.frequency.rampTo(mix?.tone ?? 14000, 0.4);
  mixGain = mix?.gain ?? 0;
  applyMusicGain(0.3);
}

/** The transient duck (1 = normal, 0.35 = paused). Ramped, not stepped:
 *  the music pulls a blanket over itself instead of blinking out. */
export function setMusicGain(linear: number, ramp = 0.12): void {
  duckGain = linear;
  applyMusicGain(ramp);
}

// ------------------------------------------------------------
// Building the orchestra (once, on the first gesture)
// ------------------------------------------------------------
function build(): void {
  if (instruments) return;

  const dest = Tone.getDestination();

  // Master: a gentle glue compressor and a brick wall, so a dense bar
  // (drums + riff + lead + echo) never clips into fizz.
  const limiter = new Tone.Limiter(-1).connect(dest);
  const glue = new Tone.Compressor({
    threshold: -18, ratio: 2.5, attack: 0.006, release: 0.14,
  }).connect(limiter);

  sfxBus = new Tone.Volume(Tone.gainToDb(volumes.sfx)).connect(glue);
  musicBus = new Tone.Volume(Tone.gainToDb(volumes.music)).connect(glue);
  masterTone = new Tone.Filter({ type: 'lowpass', frequency: 14000, Q: 0.4 })
    .connect(musicBus);

  // The two rooms. Both always exist; a song crossfades between them.
  roomVerb = new Tone.Reverb({ decay: 1.2, preDelay: 0.008, wet: 1 }).connect(masterTone);
  hallVerb = new Tone.Reverb({ decay: 7, preDelay: 0.03, wet: 1 }).connect(masterTone);
  void roomVerb.generate();
  void hallVerb.generate();

  roomSend = new Tone.Gain(0.28).connect(roomVerb);
  hallSend = new Tone.Gain(0).connect(hallVerb);

  // maxDelay is a CONSTRUCTOR-only ceiling on delayTime, and it defaults to
  // one second — but a slow song with a long echo blows straight through
  // that (the title's 1.5 beats at 76 bpm is 1.18 s), and the Param throws
  // rather than clamping. Thrown from setMix, that takes out setSong and
  // the whole frame loop with it, on the first screen of the game.
  echoDelay = new Tone.FeedbackDelay({
    delayTime: 0.3, feedback: 0.28, wet: 1, maxDelay: MAX_DELAY,
  }).connect(masterTone);
  delaySend = new Tone.Gain(0).connect(echoDelay);

  instruments = buildInstruments();

  // A patch that was never built would silently fall back to the bell —
  // a wrong note nobody hears as a bug. Say so, loudly, in dev.
  if (import.meta.env.DEV) {
    const missing = INSTRUMENTS.filter((name) => !instruments.has(name));
    if (missing.length) {
      console.error('[audio] instrumentos sin construir:', missing.join(', '));
    }
  }
}

/** Wires one voice: dry into the master colour, plus the two reverb
 *  sends and the echo, each scaled by how much of that patch belongs in
 *  the air. A bell lives in the room; a kick drum must not. */
function send(node: Tone.ToneAudioNode, air: number, echo = 0): void {
  node.connect(masterTone);
  if (air > 0) {
    node.connect(new Tone.Gain(air).connect(roomSend));
    node.connect(new Tone.Gain(air).connect(hallSend));
  }
  if (echo > 0) node.connect(new Tone.Gain(echo).connect(delaySend));
}

/** A round-robin pool, for instruments Tone won't let PolySynth manage. */
function pool<T>(make: () => T, size: number): T[] {
  return Array.from({ length: size }, make);
}

function buildInstruments(): Map<InstrumentName, Patch> {
  const map = new Map<InstrumentName, Patch>();

  // --- BELL: the crystal leitmotiv. FM, struck hard, ringing long. ---
  const bell = new Tone.PolySynth({
    voice: Tone.FMSynth,
    maxPolyphony: 24,
    options: {
      harmonicity: 3.01,
      modulationIndex: 6.5,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.002, decay: 1.6, sustain: 0.02, release: 1.9 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.002, decay: 0.32, sustain: 0, release: 0.3 },
      volume: -14,
    },
  });
  send(bell, 0.85, 0.35);
  map.set('bell', polyPatch(bell));

  // --- GLASS: the bell's own octave answer, thinner and further off. ---
  const glass = new Tone.PolySynth({
    voice: Tone.FMSynth,
    maxPolyphony: 16,
    options: {
      harmonicity: 5.1,
      modulationIndex: 3.2,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.003, decay: 0.9, sustain: 0.01, release: 1.4 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.004, decay: 0.2, sustain: 0, release: 0.2 },
      volume: -20,
    },
  });
  send(glass, 1, 0.45);
  map.set('glass', polyPatch(glass));

  // --- MARIMBA: wooden mallet, no sustain. Esporas' garden. ---
  const marimba = new Tone.PolySynth({
    voice: Tone.FMSynth,
    maxPolyphony: 16,
    options: {
      harmonicity: 2,
      modulationIndex: 4,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.002, decay: 0.7, sustain: 0, release: 0.5 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.002, decay: 0.12, sustain: 0, release: 0.1 },
      volume: -13,
    },
  });
  send(marimba, 0.55, 0.25);
  map.set('marimba', polyPatch(marimba));

  // --- PAD: unison-detuned cushion behind a soft filter. The drones. ---
  const pad = new Tone.PolySynth({
    voice: Tone.Synth,
    maxPolyphony: 16,
    options: {
      oscillator: { type: 'fatsine', count: 3, spread: 22 },
      envelope: { attack: 1.2, decay: 2, sustain: 0.75, release: 3.2 },
      volume: -17,
    },
  });
  const padTone = new Tone.Filter({ type: 'lowpass', frequency: 1400, Q: 0.6 });
  const padWidth = new Tone.Chorus({ frequency: 0.5, delayTime: 6, depth: 0.5, wet: 0.4 })
    .start();
  pad.chain(padTone, padWidth);
  send(padWidth, 1, 0);
  map.set('pad', polyPatch(pad));

  // --- ORGAN: stacked partials, cold and churchy. Puerta's sanctum. ---
  const organ = new Tone.PolySynth({
    voice: Tone.Synth,
    maxPolyphony: 16,
    options: {
      oscillator: { type: 'custom', partials: [1, 0.4, 0.28, 0, 0.12, 0, 0.06] },
      envelope: { attack: 0.12, decay: 0.4, sustain: 0.85, release: 1.1 },
      volume: -18,
    },
  });
  send(organ, 0.8, 0.2);
  map.set('organ', polyPatch(organ));

  // --- LEAD: detuned square. Bright, but no longer a raw buzz. ---
  const lead = new Tone.PolySynth({
    voice: Tone.Synth,
    maxPolyphony: 12,
    options: {
      oscillator: { type: 'fatsquare', count: 2, spread: 14 },
      envelope: { attack: 0.006, decay: 0.18, sustain: 0.45, release: 0.28 },
      volume: -20,
    },
  });
  const leadTone = new Tone.Filter({ type: 'lowpass', frequency: 4200, Q: 0.8 });
  lead.connect(leadTone);
  send(leadTone, 0.4, 0.4);
  map.set('lead', polyPatch(lead));

  // --- GRIT: sawtooth with a filter envelope and a little dirt. ---
  const grit = new Tone.PolySynth({
    voice: Tone.MonoSynth,
    maxPolyphony: 10,
    options: {
      oscillator: { type: 'fatsawtooth', count: 2, spread: 18 },
      envelope: { attack: 0.004, decay: 0.16, sustain: 0.35, release: 0.2 },
      filter: { type: 'lowpass', Q: 2.5, rolloff: -24 },
      filterEnvelope: {
        attack: 0.004, decay: 0.14, sustain: 0.22, release: 0.2,
        baseFrequency: 260, octaves: 2.8,
      },
      volume: -22,
    },
  });
  const dirt = new Tone.Distortion({ distortion: 0.18, wet: 0.35 });
  grit.connect(dirt);
  send(dirt, 0.25, 0.15);
  map.set('grit', polyPatch(grit));

  // --- BASS: round, short, with a body you feel more than hear. ---
  const bass = new Tone.PolySynth({
    voice: Tone.MonoSynth,
    maxPolyphony: 8,
    options: {
      oscillator: { type: 'fattriangle', count: 2, spread: 10 },
      envelope: { attack: 0.006, decay: 0.22, sustain: 0.5, release: 0.25 },
      filter: { type: 'lowpass', Q: 1.2, rolloff: -12 },
      filterEnvelope: {
        attack: 0.005, decay: 0.13, sustain: 0.4, release: 0.2,
        baseFrequency: 180, octaves: 2.2,
      },
      volume: -14,
    },
  });
  send(bass, 0.12, 0);
  map.set('bass', polyPatch(bass));

  // --- PLUCK: Karplus-Strong string. A real thread, plucked. ---
  // PluckSynth extends Instrument, not Monophonic, so PolySynth refuses
  // it: a hand-rolled round-robin pool is the supported way.
  // PluckSynth has no velocity (a plucked string's dynamic IS how hard the
  // exciter hits it), so each voice gets its own gain stage to play the
  // note's dynamic on.
  const pluckOut = new Tone.Gain(1);
  const plucks = pool(() => {
    const synth = new Tone.PluckSynth({
      attackNoise: 0.9, dampening: 3600, resonance: 0.92, volume: -6,
    });
    const gain = new Tone.Gain(1).connect(pluckOut);
    synth.connect(gain);
    return { synth, gain };
  }, 6);
  send(pluckOut, 0.7, 0.3);
  map.set('pluck', roundRobin(plucks, (v, freq, _dur, time, vel) => {
    v.gain.gain.setValueAtTime(vel, time);
    v.synth.triggerAttack(freq, time);
  }));

  // --- KICK: a membrane with the drop in its pitch, not in a gain ramp. ---
  const kick = new Tone.PolySynth({
    voice: Tone.MembraneSynth,
    maxPolyphony: 4,
    options: {
      pitchDecay: 0.042,
      octaves: 4.5,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.34, sustain: 0, release: 0.1 },
      volume: -8,
    },
  });
  send(kick, 0.05, 0);
  // A MembraneSynth ramps DOWN from `octaves` above its note TO the note, so
  // the note is where the kick LANDS, not where it starts. The songs were
  // written for a raw sweep and give the START (160 Hz falling to 45), so the
  // landing pitch is what has to be handed over — feeding it 160 would start
  // the drum at 3.6 kHz and turn every kick in the game into a click.
  map.set('kick', polyPatch(kick, { mapFreq: (freq, freqEnd) => freqEnd ?? freq / 3.5 }));

  // --- SNARE: a noise crack over a tuned body. ---
  const snares = pool(
    () => new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.14, sustain: 0, release: 0.03 },
      volume: -16,
    }),
    4,
  );
  const snareTone = new Tone.Filter({ type: 'bandpass', frequency: 1900, Q: 0.7 });
  snares.forEach((s) => s.connect(snareTone));
  send(snareTone, 0.4, 0);
  map.set('snare', roundRobin(snares, (v, _freq, dur, time, vel) => {
    v.triggerAttackRelease(Math.min(dur, 0.2), time, vel);
  }));

  // --- HAT: short struck metal. Dense, so it must stay cheap and thin. ---
  const hat = new Tone.PolySynth({
    voice: Tone.MetalSynth,
    maxPolyphony: 6,
    options: {
      harmonicity: 5.1, resonance: 5000, modulationIndex: 32, octaves: 1.2,
      envelope: { attack: 0.001, decay: 0.055, sustain: 0, release: 0.02 },
      volume: -38,
    },
  });
  const hatTone = new Tone.Filter({ type: 'highpass', frequency: 7000, Q: 0.5 });
  hat.connect(hatTone);
  send(hatTone, 0.3, 0);
  map.set('hat', polyPatch(hat, { fixedFreq: 1600 }));

  // --- ANVIL: struck metal with a real shadow. Fragua, simas' chain. ---
  const anvil = new Tone.PolySynth({
    voice: Tone.MetalSynth,
    maxPolyphony: 6,
    options: {
      harmonicity: 3.4, resonance: 1200, modulationIndex: 18, octaves: 1.6,
      envelope: { attack: 0.001, decay: 0.7, sustain: 0, release: 0.3 },
      volume: -34,
    },
  });
  send(anvil, 0.8, 0.25);
  map.set('anvil', polyPatch(anvil));

  // --- TICK: a dry escapement click. Reloj plays it on EVERY beat. ---
  const ticks = pool(
    () => new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.0005, decay: 0.022, sustain: 0, release: 0.01 },
      volume: -24,
    }),
    4,
  );
  const tickTone = new Tone.Filter({ type: 'bandpass', frequency: 2600, Q: 2.4 });
  ticks.forEach((t) => t.connect(tickTone));
  send(tickTone, 0.35, 0);
  map.set('tick', roundRobin(ticks, (v, freq, _dur, time, vel) => {
    tickTone.frequency.setValueAtTime(freq, time);
    v.triggerAttackRelease(0.03, time, vel);
  }));

  // --- WATER: the drop and its ring. A sine that falls, drenched in air. ---
  const drops = pool(
    () => new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.002, decay: 0.22, sustain: 0, release: 0.4 },
      volume: -14,
    }),
    6,
  );
  const dropOut = new Tone.Gain(1);
  drops.forEach((d) => d.connect(dropOut));
  send(dropOut, 1, 0.5);
  map.set('water', roundRobin(drops, (v, freq, dur, time, vel, freqEnd) => {
    v.triggerAttackRelease(freq, dur, time, vel);
    // The plip: the pitch falls away as the drop sinks.
    if (freqEnd && freqEnd !== freq) {
      v.frequency.setValueAtTime(freq, time);
      v.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), time + dur);
    }
  }));

  // --- WIND: filtered air, long sighs. Glaciar breathes. ---
  const winds = pool(
    () => new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 2, decay: 0.2, sustain: 0.7, release: 2.4 },
      volume: -30,
    }),
    3,
  );
  const windTone = new Tone.Filter({ type: 'bandpass', frequency: 520, Q: 1.4 });
  winds.forEach((w) => w.connect(windTone));
  send(windTone, 1, 0);
  map.set('wind', roundRobin(winds, (v, freq, dur, time, vel, _fe, attack) => {
    windTone.frequency.setValueAtTime(freq, time);
    v.envelope.attack = attack ?? 2;
    v.triggerAttackRelease(dur, time, vel);
  }));

  return map;
}

/** Every polyphonic voice, so a song change can let them all go at once
 *  instead of leaving a pad ringing in the previous key. */
const polys: Tone.PolySynth[] = [];

/** Releases everything still sounding — called when the song changes.
 *  It's a release, not a cut: the envelopes close, so nothing clicks. */
export function releaseAll(): void {
  if (!instruments) return;
  polys.forEach((p) => p.releaseAll(Tone.now()));
}

interface PolyOpts {
  /** For the metal voices, whose "frequency" is a timbre control, not a pitch. */
  fixedFreq?: number;
  /** For voices where the note's Hz is not the pitch to play (see the kick). */
  mapFreq?: (freq: number, freqEnd?: number) => number;
}

/** Wraps a PolySynth as a patch. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function polyPatch(synth: Tone.PolySynth<any>, opts: PolyOpts = {}): Patch {
  const { fixedFreq, mapFreq } = opts;
  polys.push(synth as Tone.PolySynth);
  // The patch's own attack, remembered so a note that overrides it can be
  // undone. A note WITHOUT an attack must be restored to this, not left
  // wearing the previous note's: the override is per note, and a sticky
  // one silently rewrites the patch for the rest of the song and the next
  // one too — that is how every bronze toll in the crypt turned into a
  // swell, because one lament eight bars earlier had asked for 0.35 s.
  const patchAttack = Number(
    (synth.get() as { envelope?: { attack?: number } }).envelope?.attack ?? 0.005,
  );
  let lastAttack = patchAttack;
  return {
    play(freq, dur, time, velocity, freqEnd, attack) {
      // Only re-set when it actually changes: `set` walks every voice.
      const want = attack === undefined
        ? patchAttack
        : Math.min(attack, dur * 0.9);
      if (want !== lastAttack) {
        lastAttack = want;
        synth.set({ envelope: { attack: want } });
      }
      const pitch = fixedFreq ?? mapFreq?.(freq, freqEnd) ?? freq;
      synth.triggerAttackRelease(pitch, dur, time, velocity);
    },
  };
}

/** Wraps a pool of single-voice instruments, handing out the next one
 *  each time so a fast passage doesn't cut its own tail off. */
function roundRobin<T>(
  voices: T[],
  trigger: (
    voice: T, freq: number, dur: number, time: number, velocity: number,
    freqEnd?: number, attack?: number,
  ) => void,
): Patch {
  let i = 0;
  return {
    play(freq, dur, time, velocity, freqEnd, attack) {
      const voice = voices[i];
      i = (i + 1) % voices.length;
      trigger(voice, freq, dur, time, velocity, freqEnd, attack);
    },
  };
}

// ------------------------------------------------------------
// SFX: the lean path
// ------------------------------------------------------------
// One-shots built from plain nodes on Tone's context and sent to the dry
// bus. Deliberately NOT Tone instruments: an effect fires on every jump,
// hit and footstep, and per-note wrapper allocation is exactly the kind of
// churn that shows up as a dropped frame.

let noiseBuf: AudioBuffer | null = null;
function noiseBuffer(): AudioBuffer {
  if (!noiseBuf) {
    const ctx = Tone.getContext();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** Plays a tone on a channel. If the audio hasn't woken yet, does nothing. */
export function playTone(opts: ToneOptions, channel: AudioChannel = 'sfx'): void {
  if (!instruments) return;
  const ctx = Tone.getContext();
  const t0 = Tone.now() + (opts.delay ?? 0);
  const t1 = t0 + opts.duration;

  // The source: a tuned oscillator, or noise through a bandpass (there
  // `freq` is the colour of the noise, and `freqEnd` sweeps it).
  let source: OscillatorNode | AudioBufferSourceNode;
  let out: AudioNode;
  if (opts.type === 'noise') {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(opts.freq, t0);
    if (opts.freqEnd && opts.freqEnd !== opts.freq) {
      filter.frequency.exponentialRampToValueAtTime(opts.freqEnd, t1);
    }
    src.connect(filter);
    source = src;
    out = filter;
  } else {
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'square';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.freqEnd && opts.freqEnd !== opts.freq) {
      osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, t1);
    }
    source = osc;
    out = osc;
  }

  // Envelope: attack (near-instant by default) and exponential decay
  // to nothing. A long attack turns the "pluck" into a breathing pad.
  const gain = ctx.createGain();
  const vol = opts.volume ?? 0.15;
  const attack = Math.min(opts.attack ?? 0.005, opts.duration * 0.5);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, t1);

  out.connect(gain);
  Tone.connect(gain, channel === 'music' ? musicBus : sfxBus);
  source.start(t0);
  source.stop(t1 + 0.02);
}
