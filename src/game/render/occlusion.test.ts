import { describe, expect, it } from 'vitest';
import { playerFade } from './occlusion';

// THE FOREGROUND MUST NOT BE ABLE TO HIDE THE PLAYER. That is the whole
// reason this function exists, and it is worth a test rather than a
// screenshot because it is the kind of rule that gets quietly broken by
// someone tuning constants: Silksong's foreground occluders are its
// most-complained-about visual decision precisely because nothing in
// them steps aside for the character.
//
// Sampling the canvas cannot prove this — the vignette already darkens
// the screen edges, so a dark player box means nothing. What CAN be
// proven is the rule itself: within FADE_NEAR of the body, an occluder
// is not drawn at all, whatever its shape, wherever it is.
//
// The occluder is a box [x0,x1]x[y0,y1]; the player is a point (their
// centre). 0 = do not draw, 1 = draw at full strength.
describe('playerFade', () => {
  const OCC = { x0: 100, x1: 140, y0: 40, y1: 90 };
  const fade = (px: number, py: number): number =>
    playerFade(OCC.x0, OCC.x1, OCC.y0, OCC.y1, px, py);

  it('el jugador DENTRO del oclusor: no se dibuja, punto', () => {
    expect(fade(120, 65)).toBe(0);
    expect(fade(100, 40)).toBe(0); // exactamente en la esquina
    expect(fade(140, 90)).toBe(0);
  });

  it('a un cuerpo de distancia sigue sin dibujarse', () => {
    // FADE_NEAR is 26px: two player-heights. Anything inside that is
    // close enough that the occluder would be over the jump you are
    // about to make, not just over you.
    expect(fade(80, 65)).toBe(0);   // 20px a la izquierda
    expect(fade(120, 20)).toBe(0);  // 20px por encima
    // Diagonally the distance is the real one, not the bigger of the two
    // axes: 18px out on both is 25px away, still inside the band. (20 and
    // 20 would be 28px and already fading in — which is correct, and was
    // this test's own arithmetic error the first time it was written.)
    expect(fade(158, 108)).toBe(0);
    expect(fade(160, 110)).toBeGreaterThan(0); // 28px: ya empieza a verse
  });

  it('lejos se dibuja entero', () => {
    expect(fade(20, 65)).toBe(1);
    expect(fade(220, 65)).toBe(1);
    expect(fade(120, 200)).toBe(1);
  });

  it('entre medio sube suave, sin escalones', () => {
    // A hard on/off would pop; the whole band has to be a ramp.
    const ramp = [30, 36, 42, 48, 54, 60].map((d) => fade(OCC.x0 - d, 65));
    for (let i = 1; i < ramp.length; i++) {
      expect(ramp[i]).toBeGreaterThan(ramp[i - 1]);
    }
    expect(ramp[0]).toBeGreaterThan(0);
    expect(ramp[ramp.length - 1]).toBeLessThanOrEqual(1);
  });

  it('nunca devuelve algo fuera de 0..1', () => {
    for (let px = -50; px < 300; px += 7) {
      for (let py = -50; py < 250; py += 11) {
        const f = fade(px, py);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(1);
      }
    }
  });
});
