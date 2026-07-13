// ============================================================
//  The game's SOUND EFFECTS
// ------------------------------------------------------------
//  Each sound is a pair of well-chosen numbers. Play with them:
//  change a frequency or a duration and listen to what happens.
// ============================================================

import { playTone } from '../engine/audio';

export const sfx = {
  /** Jump: fast upward sweep. */
  jump(): void {
    playTone({ freq: 220, freqEnd: 520, duration: 0.12, volume: 0.1 });
  },

  /** Double jump: like the jump but higher-pitched, with a crystalline glint. */
  doubleJump(): void {
    playTone({ freq: 330, freqEnd: 720, duration: 0.11, volume: 0.1 });
    playTone({ freq: 990, duration: 0.06, type: 'triangle', volume: 0.08, delay: 0.03 });
  },

  /** Wall jump: a jump with a dry little rock tap. */
  wallJump(): void {
    playTone({ freq: 260, freqEnd: 560, duration: 0.11, volume: 0.1 });
    playTone({ freq: 140, duration: 0.05, volume: 0.08 });
  },

  /** Dash: a quick puff that falls. */
  dash(): void {
    playTone({ freq: 520, freqEnd: 160, duration: 0.16, type: 'sawtooth', volume: 0.12 });
  },

  /** Spring: an elastic "boing" that shoots upward. */
  spring(): void {
    playTone({ freq: 140, freqEnd: 520, duration: 0.18, type: 'triangle', volume: 0.16 });
    playTone({ freq: 90, duration: 0.05, type: 'square', volume: 0.08 });
  },

  /** Pound: the whistle of the dive, falling in frequency. */
  pound(): void {
    playTone({ freq: 620, freqEnd: 170, duration: 0.18, type: 'square', volume: 0.12 });
  },

  /** Splash: plunging into or bursting out of the water — spray + a plunge. */
  splash(): void {
    playTone({ freq: 1600, freqEnd: 400, duration: 0.18, type: 'noise', volume: 0.13 });
    playTone({ freq: 300, freqEnd: 90, duration: 0.12, type: 'sine', volume: 0.1, delay: 0.02 });
  },

  /** Stroke: a short pull through the water while swimming. */
  stroke(): void {
    playTone({ freq: 520, freqEnd: 200, duration: 0.09, type: 'sine', volume: 0.1 });
    playTone({ freq: 900, duration: 0.05, type: 'noise', volume: 0.08, delay: 0.01 });
  },

  /** Cracked block bursting: crunch of shards + a dull thud. */
  crack(): void {
    playTone({ freq: 3200, duration: 0.08, type: 'noise', volume: 0.16 });
    playTone({ freq: 240, freqEnd: 90, duration: 0.12, type: 'square', volume: 0.1, delay: 0.02 });
  },

  /** Taking damage: a short, low "ough". */
  hurt(): void {
    playTone({ freq: 200, freqEnd: 80, duration: 0.16, type: 'square', volume: 0.15 });
  },

  /** Stomping an enemy: a dry, juicy "boink". */
  stomp(): void {
    playTone({ freq: 420, freqEnd: 130, duration: 0.09, type: 'square', volume: 0.14 });
    playTone({ freq: 700, duration: 0.05, type: 'triangle', volume: 0.1, delay: 0.02 });
  },

  /** Crackle: the eel coiling — electric charge rising before it darts. */
  crackle(): void {
    playTone({ freq: 400, freqEnd: 1800, duration: 0.18, type: 'sawtooth', volume: 0.12 });
    playTone({ freq: 2600, duration: 0.05, type: 'noise', volume: 0.12, delay: 0.05 });
    playTone({ freq: 3200, duration: 0.05, type: 'noise', volume: 0.1, delay: 0.14 });
  },

  /** Breach: the axolotl's boil and roar as it bursts up from the pool. */
  breach(): void {
    playTone({ freq: 90, freqEnd: 360, duration: 0.4, type: 'sawtooth', volume: 0.16 });
    playTone({ freq: 600, freqEnd: 1900, duration: 0.35, type: 'noise', volume: 0.12 });
    playTone({ freq: 150, duration: 0.12, type: 'square', volume: 0.1, delay: 0.28 });
  },

  /** Collecting a crystal: two little bells rising. */
  pickup(): void {
    playTone({ freq: 880, duration: 0.07, type: 'triangle', volume: 0.18 });
    playTone({ freq: 1320, duration: 0.1, type: 'triangle', volume: 0.15, delay: 0.06 });
  },

  /** Recovering a heart: a warm sine that swells upward — round and
   *  kind, the opposite of the hurt buzz (and softer than the relic
   *  fanfare: it's a small mercy, not a milestone). */
  heal(): void {
    playTone({ freq: 523, freqEnd: 784, duration: 0.12, type: 'sine', volume: 0.15 });
    playTone({ freq: 1047, duration: 0.14, type: 'triangle', volume: 0.1, delay: 0.08 });
  },

  /** Dying: a buzz that collapses into the low end. */
  die(): void {
    playTone({ freq: 300, freqEnd: 55, duration: 0.3, type: 'sawtooth', volume: 0.16 });
  },

  /** Relic: short fanfare — something important just happened. */
  relic(): void {
    [392, 523, 659, 784, 1047].forEach((freq, i) => {
      playTone({ freq, duration: 0.14, type: 'triangle', volume: 0.14, delay: i * 0.07 });
    });
  },

  /** Winning: ascending arpeggio (C-E-G-C). */
  win(): void {
    [523, 659, 784, 1047].forEach((freq, i) => {
      playTone({ freq, duration: 0.16, type: 'triangle', volume: 0.14, delay: i * 0.12 });
    });
  },
};
