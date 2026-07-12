// ============================================================
//  AUDIO (Web Audio API)
// ------------------------------------------------------------
//  A mini-synthesizer: each sound is an oscillator with a
//  volume envelope and, optionally, a frequency sweep.
//  There are no audio files: just like the art, sound is
//  "drawn" by code.
//
//  Everything goes through a CHANNEL (sfx or music): one gain node
//  per channel lets us mix —lower the music without touching the sfx—.
//  Music is scheduled by the music.ts sequencer over this
//  same synthesizer: a song is a list of tones with timing.
//
//  Browsers only allow sound after a user gesture (key, click).
//  initAudio() listens for those gestures and wakes the
//  context as soon as the first one happens.
// ============================================================

/** The synthesizer's timbres: the 4 classic oscillators plus 'noise'
 *  (filtered white noise — the drum kit: airy kicks, rolls, hi-hats). */
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

let ctx: AudioContext | null = null;
const channels = new Map<AudioChannel, GainNode>();
const volumes: Record<AudioChannel, number> = { sfx: 1, music: 1 };

function channelGain(name: AudioChannel): GainNode {
  // ctx already exists when this is called (playTone guarantees it).
  let gain = channels.get(name);
  if (!gain) {
    gain = ctx!.createGain();
    gain.gain.value = volumes[name];
    gain.connect(ctx!.destination);
    channels.set(name, gain);
  }
  return gain;
}

/** A channel's volume (0..1). Works before or after the audio wakes. */
export function setChannelVolume(name: AudioChannel, volume: number): void {
  volumes[name] = volume;
  const gain = channels.get(name);
  if (gain) gain.gain.value = volume;
}

/** Call once at startup: wakes the audio on the first gesture. */
export function initAudio(): void {
  const wake = (): void => {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  };
  window.addEventListener('keydown', wake);
  window.addEventListener('pointerdown', wake);

  // Debug hook, like window.__game (dev only).
  if (import.meta.env.DEV) {
    (window as unknown as { __audio: () => AudioContext | null }).__audio = () => ctx;
  }
}

/** The audio clock (seconds), or null if it hasn't woken yet.
 *  The music sequencer (music.ts) schedules notes against this clock. */
export function audioNow(): number | null {
  return ctx && ctx.state === 'running' ? ctx.currentTime : null;
}

// One second of white noise, generated once and recycled in a loop:
// low-filtered sounds like an airy kick, mid like a roll, high like a hi-hat.
let noiseBuf: AudioBuffer | null = null;
function noiseBuffer(): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = ctx!.createBuffer(1, ctx!.sampleRate, ctx!.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** Plays a tone on a channel. If the audio hasn't woken yet, does nothing. */
export function playTone(opts: ToneOptions, channel: AudioChannel = 'sfx'): void {
  if (!ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime + (opts.delay ?? 0);
  const t1 = t0 + opts.duration;

  // The source: a tuned oscillator, or noise passed through a bandpass filter
  // (there `freq` is the color of the noise, and `freqEnd` sweeps it).
  let source: AudioScheduledSourceNode;
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
  gain.connect(channelGain(channel));
  source.start(t0);
  source.stop(t1 + 0.02);
}
