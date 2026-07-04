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

  /** Recoger cristal: dos campanitas subiendo. */
  pickup(): void {
    playTone({ freq: 880, duration: 0.07, type: 'triangle', volume: 0.18 });
    playTone({ freq: 1320, duration: 0.1, type: 'triangle', volume: 0.15, delay: 0.06 });
  },

  /** Morir: zumbido que se desploma a los graves. */
  die(): void {
    playTone({ freq: 300, freqEnd: 55, duration: 0.3, type: 'sawtooth', volume: 0.16 });
  },

  /** Ganar: arpegio ascendente (Do-Mi-Sol-Do). */
  win(): void {
    [523, 659, 784, 1047].forEach((freq, i) => {
      playTone({ freq, duration: 0.16, type: 'triangle', volume: 0.14, delay: i * 0.12 });
    });
  },
};
