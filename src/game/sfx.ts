// ============================================================
//  EFECTOS DE SONIDO del juego
// ------------------------------------------------------------
//  Cada sonido es un par de números bien elegidos. Tocalos:
//  cambiá una frecuencia o una duración y escuchá qué pasa.
// ============================================================

import { playTone } from '../engine/audio';

export const sfx = {
  /** Salto: barrido rápido hacia arriba. */
  jump(): void {
    playTone({ freq: 220, freqEnd: 520, duration: 0.12, volume: 0.1 });
  },

  /** Doble salto: como el salto pero más agudo, con destello cristalino. */
  doubleJump(): void {
    playTone({ freq: 330, freqEnd: 720, duration: 0.11, volume: 0.1 });
    playTone({ freq: 990, duration: 0.06, type: 'triangle', volume: 0.08, delay: 0.03 });
  },

  /** Wall jump: salto con un golpecito seco de roca. */
  wallJump(): void {
    playTone({ freq: 260, freqEnd: 560, duration: 0.11, volume: 0.1 });
    playTone({ freq: 140, duration: 0.05, volume: 0.08 });
  },

  /** Dash: soplido rápido que cae. */
  dash(): void {
    playTone({ freq: 520, freqEnd: 160, duration: 0.16, type: 'sawtooth', volume: 0.12 });
  },

  /** Recibir daño: un "ough" corto y grave. */
  hurt(): void {
    playTone({ freq: 200, freqEnd: 80, duration: 0.16, type: 'square', volume: 0.15 });
  },

  /** Pisar un enemigo: un "boink" seco y jugoso. */
  stomp(): void {
    playTone({ freq: 420, freqEnd: 130, duration: 0.09, type: 'square', volume: 0.14 });
    playTone({ freq: 700, duration: 0.05, type: 'triangle', volume: 0.1, delay: 0.02 });
  },

  /** Recoger cristal: dos campanitas subiendo. */
  pickup(): void {
    playTone({ freq: 880, duration: 0.07, type: 'triangle', volume: 0.18 });
    playTone({ freq: 1320, duration: 0.1, type: 'triangle', volume: 0.15, delay: 0.06 });
  },

  /** Morir: zumbido que se desploma a los graves. */
  die(): void {
    playTone({ freq: 300, freqEnd: 55, duration: 0.3, type: 'sawtooth', volume: 0.16 });
  },

  /** Reliquia: fanfarria corta — algo importante acaba de pasar. */
  relic(): void {
    [392, 523, 659, 784, 1047].forEach((freq, i) => {
      playTone({ freq, duration: 0.14, type: 'triangle', volume: 0.14, delay: i * 0.07 });
    });
  },

  /** Ganar: arpegio ascendente (Do-Mi-Sol-Do). */
  win(): void {
    [523, 659, 784, 1047].forEach((freq, i) => {
      playTone({ freq, duration: 0.16, type: 'triangle', volume: 0.14, delay: i * 0.12 });
    });
  },
};
