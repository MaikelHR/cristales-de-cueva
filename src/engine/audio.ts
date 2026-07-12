// ============================================================
//  AUDIO (Web Audio API)
// ------------------------------------------------------------
//  Un mini-sintetizador: cada sonido es un oscilador con una
//  envolvente de volumen y, opcionalmente, un barrido de
//  frecuencia. No hay archivos de audio: igual que el arte,
//  el sonido está "dibujado" por código.
//
//  Todo pasa por un CANAL (sfx o music): un nodo de ganancia por
//  canal permite mezclar —bajar la música sin tocar los efectos—.
//  La música la agenda el secuenciador de music.ts sobre este
//  mismo sintetizador: una canción es una lista de tonos con hora.
//
//  Los navegadores solo permiten sonar tras un gesto del usuario
//  (tecla, click). initAudio() escucha esos gestos y despierta
//  el contexto en cuanto ocurre el primero.
// ============================================================

/** Los timbres del sintetizador: los 4 osciladores clásicos más 'noise'
 *  (ruido blanco filtrado — la batería: bombos de aire, redobles, hi-hats). */
export type ToneType = OscillatorType | 'noise';

export interface ToneOptions {
  freq: number;          // frecuencia inicial, en Hz (en 'noise': centro del filtro)
  duration: number;      // duración total, en segundos
  freqEnd?: number;      // si difiere de freq, barrido exponencial hasta aquí
  type?: ToneType;       // square (retro), triangle (suave), sawtooth (áspero), sine, noise
  volume?: number;       // 0..1, por defecto 0.15
  delay?: number;        // segundos de espera antes de sonar (para arpegios)
  attack?: number;       // segundos hasta el volumen pleno (largo = colchón/pad)
}

export type AudioChannel = 'sfx' | 'music';

let ctx: AudioContext | null = null;
const channels = new Map<AudioChannel, GainNode>();
const volumes: Record<AudioChannel, number> = { sfx: 1, music: 1 };

function channelGain(name: AudioChannel): GainNode {
  // ctx ya existe cuando se llama (playTone lo garantiza).
  let gain = channels.get(name);
  if (!gain) {
    gain = ctx!.createGain();
    gain.gain.value = volumes[name];
    gain.connect(ctx!.destination);
    channels.set(name, gain);
  }
  return gain;
}

/** Volumen de un canal (0..1). Vale antes o después de despertar el audio. */
export function setChannelVolume(name: AudioChannel, volume: number): void {
  volumes[name] = volume;
  const gain = channels.get(name);
  if (gain) gain.gain.value = volume;
}

/** Llamar una vez al arrancar: despierta el audio con el primer gesto. */
export function initAudio(): void {
  const wake = (): void => {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  };
  window.addEventListener('keydown', wake);
  window.addEventListener('pointerdown', wake);

  // Gancho de depuración, como window.__game (solo en desarrollo).
  if (import.meta.env.DEV) {
    (window as unknown as { __audio: () => AudioContext | null }).__audio = () => ctx;
  }
}

/** El reloj del audio (segundos), o null si todavía no despertó.
 *  El secuenciador de música (music.ts) agenda notas contra este reloj. */
export function audioNow(): number | null {
  return ctx && ctx.state === 'running' ? ctx.currentTime : null;
}

// Un segundo de ruido blanco, generado una vez y reciclado en loop:
// filtrado grave suena a bombo de aire, medio a redoble, agudo a hi-hat.
let noiseBuf: AudioBuffer | null = null;
function noiseBuffer(): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = ctx!.createBuffer(1, ctx!.sampleRate, ctx!.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** Toca un tono por un canal. Si el audio todavía no despertó, no hace nada. */
export function playTone(opts: ToneOptions, channel: AudioChannel = 'sfx'): void {
  if (!ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime + (opts.delay ?? 0);
  const t1 = t0 + opts.duration;

  // La fuente: un oscilador afinado, o ruido pasado por un filtro de banda
  // (ahí `freq` es el color del ruido, y `freqEnd` lo barre).
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

  // Envolvente: ataque (casi instantáneo por defecto) y caída exponencial
  // a nada. Un ataque largo convierte el "pluck" en colchón que respira.
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
