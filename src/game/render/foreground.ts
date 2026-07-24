// ============================================================
//  THE FOREGROUND (the layer in FRONT of the play plane)
// ------------------------------------------------------------
//  The background had six parallax layers and the foreground had
//  none, which is why the scene read as a painting with actors
//  standing on it: everything was either behind you or exactly at
//  your depth, and nothing was ever between you and the camera.
//
//  This is that missing plane. It runs at parallax 1.22 — FASTER than
//  the play plane — because that is the only unambiguous signal for
//  "closer than you": far things lag the camera, near things outrun
//  it. Rock teeth hang from the top of the view, mounds pass along
//  the bottom, and both are near-black silhouettes: the closest thing
//  to the lens is the least lit, which is the opposite of how the
//  depth background fades, and reading both at once is what gives the
//  picture a front and a back.
//
//  THE ONE RULE THIS LAYER MUST NEVER BREAK is that it cannot cost
//  you a life. A 6x11px player on a 320x176 view disappears behind a
//  silhouette instantly, and a platformer where you cannot see your
//  feet is broken, not atmospheric.
//
//  This is not a hypothetical. Silksong's foreground occluders are its
//  single most-complained-about visual decision — accessibility
//  reviewers and fully-sighted players both report objects that hide
//  arenas and platforming, and Team Cherry's shipped answer across
//  five patches was a dithering toggle rather than moving anything.
//  So this layer takes the criticism as its specification:
//
//   1. It is never solid. Peak alpha is FG_ALPHA, not 1.
//   2. It FADES where the player is (`playerFade`) — not on a timer,
//      not on a trigger, just as a function of distance.
//   3. It does not exist AT ALL in a boss room (`suppressed`). The
//      Custodio's whole contract is that nothing it throws skips the
//      announcement; an occluder over a telegraph breaks that contract
//      exactly the way the gold-shard bug did — the warning is there
//      and the player cannot see it. That is a check, not a judgement.
//   4. The bottom band stays SHORT, because the bottom of the screen
//      is where the spikes and the landings are.
//
//  The VEIL — the same trick used deliberately, to hide a passage —
//  lives in levelTiles.ts instead, because to hide anything it has to
//  be drawn as the biome's ROCK, and that is where the rock is drawn.
// ============================================================

import { playerFade } from './occlusion';
import { tileSetFor } from '../art/tileSets';

/** Foreground parallax. Above 1 = nearer than the play plane. Kept
 *  gentle: at 1.5 the layer visibly races the level and reads as a
 *  glitch rather than as depth. */
const FG_PAR = 1.22;

/** Peak opacity of an occluder, with the player nowhere near it. It is
 *  deliberately not 1: a near-black shape at full strength stops being
 *  atmosphere and becomes a hole in the picture. */
const FG_ALPHA = 0.55;

interface Tooth { x: number; w: number; len: number; skew: number; }
interface Hump { x: number; w: number; h: number; }
interface Layers { teeth: Tooth[]; humps: Hump[]; }

let fg: Layers | null = null;
let builtFor = '';

function ensureForeground(worldW: number, variant: number, themeId: string): Layers {
  const key = `${worldW}:${variant}:${themeId}`;
  if (builtFor === key && fg) return fg;
  builtFor = key;
  let seed = 5471 + worldW * 17 + variant * 613;
  for (const ch of themeId) seed = (seed * 31 + ch.charCodeAt(0)) & 0x7fffffff;
  const rng = (): number => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  // Spaced FAR apart on purpose. A foreground you meet every screen is
  // scenery; one you meet every third screen is a moment.
  const teeth: Tooth[] = [];
  for (let x = -20 + rng() * 90; x < worldW * FG_PAR + 40; x += 150 + rng() * 190) {
    teeth.push({
      x,
      w: 14 + Math.floor(rng() * 26),
      len: 16 + Math.floor(rng() * 34),
      skew: (rng() - 0.5) * 10,
    });
  }
  // The bottom band is kept low on purpose: that strip of the screen is
  // where spike beds and landing rows live, and a tall mound there is
  // the "wind gust that pushes you into spikes you cannot see"
  // complaint, rebuilt from scratch. In a 21-row room the bottom 8px is
  // provably unoccupiable (168 < 176), which is the budget this fits in.
  const humps: Hump[] = [];
  for (let x = -30 + rng() * 120; x < worldW * FG_PAR + 40; x += 170 + rng() * 210) {
    humps.push({ x, w: 44 + Math.floor(rng() * 60), h: 5 + Math.floor(rng() * 5) });
  }
  fg = { teeth, humps };
  return fg;
}

/** The silhouette colour: the biome's own rock, taken almost to black.
 *  Derived from the tile set so a new level needs to declare nothing. */
const inkCache = new Map<string, string>();
function inkFor(levelId: string): string {
  const cached = inkCache.get(levelId);
  if (cached) return cached;
  const s = tileSetFor(levelId).shadow;
  const p = parseInt(s.slice(1), 16);
  const ch = (shift: number): number => Math.round((((p >> shift) & 0xff) * 0.45));
  const ink = `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  inkCache.set(levelId, ink);
  return ink;
}

/**
 * Draws the near plane. Goes AFTER the player and the particles (it is
 * in front of them) and BEFORE the fog and dust (those are the air
 * between the lens and everything, including this).
 */
export function drawForeground(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  worldW: number,
  worldH: number,
  variant: number,
  levelId: string,
  playerScreenX: number,
  playerScreenY: number,
  /** True in a room with a live boss: the layer does not draw at all.
   *  A boss fight is the one place where every pixel of telegraph has
   *  to arrive, and no amount of fading makes an occluder safe there. */
  suppressed = false,
): void {
  if (suppressed) return;
  const L = ensureForeground(worldW, variant, levelId);
  const ink = inkFor(levelId);
  const par = camX * FG_PAR;
  // WORLD-anchored, at the same factor vertically as horizontally.
  // The teeth hang from the room's ceiling (world y = 0) and the mounds
  // sit on its floor (world y = worldH), and both are drawn at
  // `worldY - camY * FG_PAR`. Never `+ camY * k` — that is the inverted
  // sign that had the far background SINKING as you descended, and the
  // near plane is the last place to repeat it: at a factor above 1 it
  // would slide off twice as fast.
  //
  // In a room no taller than the view (most of the game) camY is always
  // 0 and this is just "top edge" and "bottom edge". In a 36-row shaft
  // it means the near floor is far below you at the roof and rises past
  // you as you fall, which is what being near is supposed to look like.
  const ceil = -camY * FG_PAR;
  const floor = worldH - camY * FG_PAR;

  ctx.save();
  ctx.fillStyle = ink;
  for (const t of L.teeth) {
    const x = t.x - par;
    if (x + t.w < -20 || x > viewW + 20) continue;
    const fade = playerFade(x, x + t.w, ceil, ceil + t.len, playerScreenX, playerScreenY);
    if (fade <= 0) continue;
    ctx.globalAlpha = fade * FG_ALPHA;
    ctx.beginPath();
    ctx.moveTo(x, ceil - 4);
    ctx.lineTo(x + t.w, ceil - 4);
    ctx.lineTo(x + t.w * 0.62 + t.skew, ceil + t.len);
    ctx.closePath();
    ctx.fill();
  }
  for (const h of L.humps) {
    const x = h.x - par;
    if (x + h.w < -20 || x > viewW + 20) continue;
    const top = floor - h.h;
    const fade = playerFade(x, x + h.w, top, floor, playerScreenX, playerScreenY);
    if (fade <= 0) continue;
    ctx.globalAlpha = fade * FG_ALPHA;
    ctx.beginPath();
    ctx.moveTo(x, floor + 6);
    ctx.quadraticCurveTo(x + h.w / 2, top, x + h.w, floor + 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
