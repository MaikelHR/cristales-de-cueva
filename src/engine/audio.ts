// ============================================================
//  AUDIO (Web Audio API)
// ------------------------------------------------------------
//  Un mini-sintetizador: cada sonido es un oscilador con una
//  envolvente de volumen y, opcionalmente, un barrido de
//  frecuencia. No hay archivos de audio: igual que el arte,
//  el sonido está "dibujado" por código.
//
//  Los navegadores solo permiten sonar tras un gesto del usuario
//  (tecla, click). initAudio() escucha esos gestos y despierta
//  el contexto en cuanto ocurre el primero.
// ============================================================

export interface ToneOptions {
  freq: number;          // frecuencia inicial, en Hz
  duration: number;      // duración total, en segundos
  freqEnd?: number;      // si difiere de freq, barrido exponencial hasta aquí
  type?: OscillatorType; // square (retro), triangle (suave), sawtooth (áspero), sine
  volume?: number;       // 0..1, por defecto 0.15
  delay?: number;        // segundos de espera antes de sonar (para arpegios)
}

let ctx: AudioContext | null = null;

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

/** Toca un tono. Si el audio todavía no despertó, no hace nada. */
export function playTone(opts: ToneOptions): void {
  if (!ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime + (opts.delay ?? 0);
  const t1 = t0 + opts.duration;

  const osc = ctx.createOscillator();
  osc.type = opts.type ?? 'square';
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.freqEnd && opts.freqEnd !== opts.freq) {
    osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, t1);
  }

  // Envolvente: ataque casi instantáneo y caída exponencial a nada.
  const gain = ctx.createGain();
  const vol = opts.volume ?? 0.15;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, t1);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t1 + 0.02);
}
