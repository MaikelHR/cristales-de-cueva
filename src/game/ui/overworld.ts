// ============================================================
//  OVERWORLD DRAWING (the level map)
// ------------------------------------------------------------
//  Everything visible in the selector: the rocky islets under each
//  node (each dressed in its level's biome: crystal, drip, heart,
//  moss, ice, ember — the step foreshadows the level), the dotted
//  path with its pulse running forward, the nodes (completed =
//  golden crystal with pennant, unlocked = pulsing, closed = stone
//  with '?'), the decor between nodes, the ambient fauna (bats,
//  fireflies, dust), the character standing or walking, the panel
//  with the chosen level's name and records, and the mode chooser.
//  The logic (what can be stepped on, entered, chosen) lives in the
//  scene; here we only paint what it decides.
// ============================================================

import { frameAt } from '../../engine/animation';
import { inputDevice, padLabels } from '../../engine/input';
import { getMove } from '../touchLayout';
import type { GameSession, GameMode } from '../session';
import { LEVELS, levelAtNode, isChallengeNode, GROTTO_NODE_COUNT, FINAL_LEVEL_ID } from '../world/rooms';
import { levelRecord } from '../save';
import { sprites } from '../art/sprites';
import { playerSprites } from '../art/playerSkins';
import { currentSkin } from '../skins';
import { drawGlow } from '../art/glow';
import { drawBackground, drawDust, drawFog, drawVignette } from '../art/atmosphere';
import { t } from '../i18n';
import { font, formatTime } from './text';
import { OW_NODES, OW_WORLD_W, owCamX } from './owMap';

/** What the drawing needs to know about the overworld scene. */
export interface OverworldView {
  node: number;
  x: number;
  y: number;
  facing: 1 | -1;
  walking: boolean;
  walkTime: number;
  settleTime: number;
  maxNode: number;
  choosing: boolean;
  choice: GameMode;
}

export function drawOverworld(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  view: OverworldView,
): void {
  const { viewW, viewH, time, save } = session;
  ctx.textBaseline = 'alphabetic'; // in case the HUD left another one set

  // The challenge road doesn't exist until the grotto is done: no
  // islets, no path, no stones. Finishing world 1 makes it APPEAR,
  // which is the reward reading "there's more".
  const grottoDone = levelRecord(save, FINAL_LEVEL_ID).completions > 0;
  const lastNode = grottoDone ? OW_NODES.length - 1 : GROTTO_NODE_COUNT - 1;

  // With the road open the map is WIDER than the screen, so it has a
  // camera of its own: everything in map coords is drawn shifted by it,
  // and the HUD-ish layers (title, panel, fauna, dust) stay on screen.
  const camX = owCamX(view.x, viewW, grottoDone);

  // The background cave, still (its own variant so it isn't
  // identical to any room) with its golden map theme.
  drawBackground(ctx, camX, 0, viewW, viewH, OW_WORLD_W, 7, time, 'overworld');

  // Distant fauna: bats crossing the cave now and then.
  drawBats(ctx, viewW, time);

  ctx.save();
  ctx.translate(-camX, 0); // ---- from here on, MAP coordinates ----

  // --- Rocky islets under each node, dressed in their biome ---
  for (let i = 0; i <= lastNode; i++) {
    const levelId = levelAtNode(i)?.id ?? null;
    drawIsland(ctx, OW_NODES[i].x, OW_NODES[i].y, i <= view.maxNode, levelId, time);
  }

  // --- Decor between nodes: little crystals, mushrooms and rocks ---
  drawPathDecor(ctx, time, lastNode);

  // --- Dotted path with a pulse running forward ---
  let dTotal = 0; // accumulated distance: makes the pulse TRAVEL the path
  for (let i = 0; i < lastNode; i++) {
    const a = OW_NODES[i];
    const b = OW_NODES[i + 1];
    const reachable = i + 1 <= view.maxNode;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 7; d < dist - 4; d += 7) {
      const px = Math.round(a.x + ((b.x - a.x) * d) / dist);
      const py = Math.round(a.y + ((b.y - a.y) * d) / dist);
      if (reachable) {
        const wave = Math.sin(time * 3 - (dTotal + d) * 0.12);
        if (wave > 0.55) {
          ctx.fillStyle = '#e9d6ff';
          ctx.fillRect(px - 1, py - 1, 3, 3);
        } else {
          ctx.fillStyle = '#8064b0';
          ctx.fillRect(px - 1, py - 1, 2, 2);
        }
      } else {
        ctx.fillStyle = '#3a2456';
        ctx.fillRect(px - 1, py - 1, 2, 2);
      }
    }
    dTotal += dist;
  }

  // --- Nodes ---
  for (let i = 0; i <= lastNode; i++) {
    drawNode(ctx, session, view, i);
  }

  // --- The character ---
  drawAvatar(ctx, view, time);

  ctx.restore(); // ---- back to SCREEN coordinates ----

  // --- Fireflies: dots of light orbiting the cave ---
  drawFireflies(ctx, time);

  // --- World title (flanked by crystals) and progress ---
  const cx = viewW / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e9d6ff';
  ctx.font = font(10);
  const title = t('ow_title');
  const tw = ctx.measureText(title).width;
  ctx.fillText(title, cx, 14);
  const crystalFrames = [sprites.crystal, sprites.crystal2, sprites.crystal3, sprites.crystal4];
  const bob = Math.sin(time * 2) * 1;
  for (const side of [-1, 1]) {
    const gx = cx + side * (tw / 2 + 11);
    drawGlow(ctx, gx, 10 + bob, 7, '#ffe25a', 0.25);
    const spr = frameAt(crystalFrames, 6, time, side + 1);
    spr.draw(ctx, gx - spr.w / 2, 6 + bob);
  }
  const completed = LEVELS.filter((l) => levelRecord(save, l.id).completions > 0).length;
  ctx.fillStyle = '#9b86c4';
  ctx.font = font(8);
  ctx.fillText(t('ow_progress', { n: completed, m: OW_NODES.length }), cx, 25);

  // With the chooser open, the panel isn't drawn: avoids two layers
  // of text fighting at the bottom of the screen.
  if (view.choosing) drawModeChooser(ctx, session, view);
  else drawPanel(ctx, session, view);

  drawFog(ctx, camX, viewW, viewH, time, 'overworld');
  drawDust(ctx, viewW, viewH, time, 1 / 60);
  drawVignette(ctx, viewW, viewH);
  ctx.textAlign = 'left';
}

/** Each biome's islet colors: the lit edge you stand on, the slab
 *  face and the belly that tapers downward. Taken from the
 *  atmosphere themes so each step foreshadows the level it leads
 *  to. */
const ISLAND_LOOKS: Record<string, { edge: string; slab: string; belly: string }> = {
  cavernas: { edge: '#8064b0', slab: '#4a2e70', belly: '#2e1c48' },
  galerias: { edge: '#4180a8', slab: '#20405a', belly: '#122338' },
  corazon: { edge: '#a04f58', slab: '#4e2434', belly: '#2a1020' },
  esporas: { edge: '#5ce06a', slab: '#2b4636', belly: '#152819' },
  glaciar: { edge: '#bfeaff', slab: '#3a6484', belly: '#20405a' },
  fragua: { edge: '#7a4426', slab: '#3d2419', belly: '#140a06' },
  cenote: { edge: '#5fe0d0', slab: '#22585f', belly: '#0e2a30' },
  mina: { edge: '#a87848', slab: '#4c3624', belly: '#1c120a' },
  seda: { edge: '#e8e0f0', slab: '#4c445c', belly: '#241e30' },
  simas: { edge: '#6d7c90', slab: '#2a3440', belly: '#0b0e13' },
  reloj: { edge: '#c9a24a', slab: '#274a56', belly: '#10242c' },
  cripta: { edge: '#a294b0', slab: '#3a3348', belly: '#191424' },
  puerta: { edge: '#e0cf9a', slab: '#5c4a70', belly: '#2e2244' },
};
const DEFAULT_LOOK = { edge: '#8064b0', slab: '#4a2e70', belly: '#2e1c48' };

/** The floating islet each node rests on, dressed in its level's
 *  biome. Closed, it's painted dimmed and still (no particles): a
 *  shadowy preview of what awaits. */
function drawIsland(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  unlocked: boolean,
  levelId: string | null,
  time: number,
): void {
  const look = (levelId && ISLAND_LOOKS[levelId]) || DEFAULT_LOOK;
  if (!unlocked) ctx.globalAlpha = 0.42;
  // Top slab (where you stand) with its lit edge.
  ctx.fillStyle = look.edge;
  ctx.fillRect(x - 7, y - 3, 14, 1);
  ctx.fillStyle = look.slab;
  ctx.fillRect(x - 7, y - 2, 14, 4);
  // The rock belly that tapers downward.
  ctx.fillStyle = look.belly;
  ctx.fillRect(x - 5, y + 2, 10, 2);
  ctx.fillRect(x - 3, y + 4, 6, 2);
  // Little stones dangling from the edges (they read as the islet's roots).
  ctx.fillRect(x - 6, y + 2, 1, 1);
  ctx.fillRect(x + 5, y + 2, 1, 1);
  if (levelId) drawIslandBiome(ctx, x, y, levelId, unlocked, time);
  ctx.globalAlpha = 1;
}

/** Each biome's dressing over the base islet. The ornaments go on
 *  the EDGES of the slab (the avatar stands in the center and the
 *  number lives just below) and particles/glows only animate when
 *  the node is unlocked. */
function drawIslandBiome(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  levelId: string,
  unlocked: boolean,
  time: number,
): void {
  switch (levelId) {
    case 'cavernas': {
      // Little violet crystals sprouting from the slab's edges.
      if (unlocked) drawGlow(ctx, x + 5, y - 5, 5, '#b98bff', 0.15 + (Math.sin(time * 2 + x) + 1) * 0.05);
      ctx.fillStyle = '#7a4bd6';
      ctx.fillRect(x - 6, y - 5, 2, 2);
      ctx.fillStyle = '#b98bff';
      ctx.fillRect(x + 5, y - 6, 2, 3);
      ctx.fillStyle = '#e9d6ff';
      ctx.fillRect(x + 5, y - 6, 1, 1);
      ctx.fillRect(x - 6, y - 5, 1, 1);
      break;
    }
    case 'galerias': {
      // Tiny spikes on one edge and dripping stalactites: the level
      // of the damp galleries with their traps.
      ctx.fillStyle = '#9fb7c8';
      ctx.fillRect(x - 6, y - 4, 1, 1);
      ctx.fillRect(x - 4, y - 5, 1, 2);
      ctx.fillStyle = '#20405a';
      ctx.fillRect(x - 4, y + 4, 1, 2);
      ctx.fillRect(x + 4, y + 4, 1, 1);
      if (unlocked) {
        const dp = (time * 1.4 + x * 0.3) % 1;
        ctx.globalAlpha = (1 - dp) * 0.8;
        ctx.fillStyle = '#a8e8ff';
        ctx.fillRect(x - 4, Math.round(y + 6 + dp * 2), 1, 1);
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'corazon': {
      // A crystal heart embedded in the face, beating.
      const beat = Math.pow(Math.max(0, Math.sin(time * 2.6)), 8);
      if (unlocked) drawGlow(ctx, x, y - 1, 7, '#ff8a6a', 0.1 + beat * 0.3);
      ctx.fillStyle = '#ff8a6a';
      ctx.fillRect(x - 2, y - 2, 2, 1);
      ctx.fillRect(x + 1, y - 2, 2, 1);
      ctx.fillRect(x - 2, y - 1, 5, 1);
      ctx.fillRect(x - 1, y, 3, 1);
      ctx.fillRect(x, y + 1, 1, 1);
      ctx.fillStyle = '#ffd6c0';
      ctx.fillRect(x - 2, y - 1, 1, 1);
      break;
    }
    case 'esporas': {
      // Fringes of moss, sprouts and a little mushroom; rising spores.
      ctx.fillStyle = '#3e8a58';
      ctx.fillRect(x - 5, y - 2, 1, 1);
      ctx.fillRect(x + 1, y - 2, 1, 2);
      ctx.fillStyle = '#8fe6a0';
      ctx.fillRect(x - 4, y - 4, 1, 1);
      ctx.fillRect(x + 2, y - 4, 1, 1);
      if (unlocked) drawGlow(ctx, x + 6, y - 5, 4, '#6ee08a', 0.2);
      ctx.fillStyle = '#d6ffe2';
      ctx.fillRect(x + 6, y - 4, 1, 1);
      ctx.fillStyle = '#3e8a58';
      ctx.fillRect(x + 5, y - 5, 3, 1);
      if (unlocked) {
        const sp = (time * 0.35 + x * 0.2) % 1;
        ctx.globalAlpha = (1 - sp) * 0.7;
        ctx.fillStyle = '#b3f0cc';
        ctx.fillRect(Math.round(x - 3 + Math.sin(time * 2 + x) * 2), Math.round(y - 4 - sp * 8), 1, 1);
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'glaciar': {
      // Glinting veins over the ice, icicles and a sparkle.
      ctx.fillStyle = '#eafaff';
      ctx.fillRect(x - 5, y - 3, 3, 1);
      ctx.fillRect(x + 2, y - 3, 2, 1);
      ctx.fillStyle = '#7ab8d8';
      ctx.fillRect(x - 6, y + 2, 1, 3);
      ctx.fillRect(x + 5, y + 2, 1, 2);
      ctx.fillRect(x + 3, y + 4, 1, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 6, y + 2, 1, 1);
      if (unlocked && Math.sin(time * 3 + x) > 0.8) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 3, y - 4, 1, 1);
        ctx.fillRect(x - 4, y - 4, 3, 1);
        ctx.fillRect(x - 3, y - 5, 1, 3);
      }
      break;
    }
    case 'fragua': {
      // Ember cracks in the crust and a little flame on the edge.
      ctx.fillStyle = '#d0662a';
      ctx.fillRect(x - 3, y, 3, 1);
      ctx.fillRect(x + 2, y - 1, 2, 1);
      ctx.fillStyle = '#ff9a3a';
      ctx.fillRect(x - 2, y, 1, 1);
      ctx.fillRect(x + 3, y - 1, 1, 1);
      const fl = unlocked && Math.sin(time * 7 + x) > 0 ? 1 : 0;
      if (unlocked) drawGlow(ctx, x - 5, y - 5, 6, '#ffb03a', 0.22 + Math.sin(time * 6 + x) * 0.08);
      ctx.fillStyle = '#ff9a3a';
      ctx.fillRect(x - 6, y - 5 - fl, 2, 2 + fl);
      ctx.fillStyle = '#ffd23a';
      ctx.fillRect(x - 6, y - 4, 1, 1);
      if (unlocked) {
        const ep = (time * 0.6 + x * 0.4) % 1;
        ctx.globalAlpha = (1 - ep) * 0.8;
        ctx.fillStyle = '#ffd23a';
        ctx.fillRect(Math.round(x - 5 + Math.sin(time * 3 + x) * 2), Math.round(y - 6 - ep * 7), 1, 1);
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'cenote': {
      // A flooded cenote set into the slab: a turquoise pool with a
      // glinting waterline, algae at the lip and bubbles rising.
      if (unlocked) drawGlow(ctx, x - 2, y - 2, 6, '#5fe0d0', 0.14 + (Math.sin(time * 2 + x) + 1) * 0.05);
      // The pool (translucent teal) with a bright waterline on top.
      ctx.fillStyle = '#22707a';
      ctx.fillRect(x - 5, y - 1, 6, 2);
      ctx.fillStyle = '#5fe0d0';
      ctx.fillRect(x - 5, y - 1, 6, 1);
      ctx.fillStyle = '#d6fffa'; // a glint travelling the surface
      ctx.fillRect(x - 4 + (Math.floor(time * 6) % 4), y - 1, 1, 1);
      // Algae sprigs at the right lip and a stone rim on both edges.
      ctx.fillStyle = '#4a9d5e';
      ctx.fillRect(x + 3, y - 5, 1, 2);
      ctx.fillRect(x + 5, y - 3, 1, 1);
      ctx.fillStyle = '#2c6b45';
      ctx.fillRect(x + 4, y - 4, 1, 2);
      ctx.fillStyle = '#20505a';
      ctx.fillRect(x - 6, y + 2, 1, 2);
      ctx.fillRect(x + 4, y + 2, 1, 2);
      if (unlocked) {
        const bp = (time * 0.5 + x * 0.3) % 1;
        ctx.globalAlpha = (1 - bp) * 0.8;
        ctx.fillStyle = '#a8f0ff';
        ctx.fillRect(Math.round(x - 3 + Math.sin(time * 3 + x) * 1.5), Math.round(y - 2 - bp * 8), 1, 1);
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'mina': {
      // A shored mine mouth set into the slab: timber posts, a lintel,
      // the gallery's dark inside — and a copper lamp by the door.
      ctx.fillStyle = '#0e0a06';
      ctx.fillRect(x - 5, y - 6, 5, 4); // the dark doorway
      ctx.fillStyle = '#6b4a2e';
      ctx.fillRect(x - 6, y - 6, 1, 4); // left post
      ctx.fillRect(x, y - 6, 1, 4);     // right post
      ctx.fillRect(x - 7, y - 7, 9, 1); // the lintel
      ctx.fillStyle = '#a87848';
      ctx.fillRect(x - 7, y - 7, 2, 1); // its lamplit end
      if (unlocked) drawGlow(ctx, x + 5, y - 4, 5, '#ffb86a', 0.2 + (Math.sin(time * 3 + x) + 1) * 0.08);
      ctx.fillStyle = '#4c3624';
      ctx.fillRect(x + 5, y - 6, 1, 2); // the lamp's bracket
      ctx.fillStyle = '#ffd9a0';
      ctx.fillRect(x + 4, y - 4, 2, 2); // the copper lamp
      if (unlocked) {
        // Coal dust drifting DOWN off the lintel (the mine breathes down).
        const dp = (time * 0.5 + x * 0.3) % 1;
        ctx.globalAlpha = (1 - dp) * 0.7;
        ctx.fillStyle = '#8a6238';
        ctx.fillRect(Math.round(x - 3 + Math.sin(time * 2 + x) * 1.5), Math.round(y - 6 + dp * 7), 1, 1);
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'seda': {
      // Webbed over: strands stretched across the slab's corners, a
      // cocoon swinging under its lip, and a bead of silk that glints.
      ctx.fillStyle = '#c9bcd8';
      ctx.fillRect(x - 7, y - 5, 4, 1); // strands snagged on the edges
      ctx.fillRect(x - 7, y - 5, 1, 3);
      ctx.fillRect(x + 4, y - 6, 3, 1);
      ctx.fillRect(x + 6, y - 6, 1, 3);
      ctx.fillStyle = '#e8e0f0';
      ctx.fillRect(x - 6, y - 4, 1, 1);
      ctx.fillRect(x + 5, y - 5, 1, 1);
      // The cocoon hanging off the right lip.
      ctx.fillStyle = '#a294b8';
      ctx.fillRect(x + 5, y + 2, 1, 2);
      ctx.fillStyle = '#e8e0f0';
      ctx.fillRect(x + 4, y + 4, 3, 4);
      ctx.fillStyle = '#645a78';
      ctx.fillRect(x + 4, y + 5, 3, 1);
      if (unlocked) {
        drawGlow(ctx, x - 3, y - 2, 5, '#ffb0d0', 0.14 + (Math.sin(time * 2.4 + x) + 1) * 0.06);
        ctx.fillStyle = '#ffb0d0'; // a pink glint: something is watching
        ctx.fillRect(x - 3, y - 2, 1, 1);
        // A loose strand drifting down off the web.
        const sp = (time * 0.4 + x * 0.3) % 1;
        ctx.globalAlpha = (1 - sp) * 0.6;
        ctx.fillStyle = '#e8e0f0';
        ctx.fillRect(Math.round(x + 1 + Math.sin(time * 1.6 + x) * 2), Math.round(y - 5 + sp * 9), 1, 1);
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'simas': {
      // A shaft mouth punched through the slab, with the chain that
      // gives the level its name hanging into the dark.
      ctx.fillStyle = '#05070a';
      ctx.fillRect(x - 4, y - 2, 8, 3); // the hole itself
      ctx.fillStyle = '#3d4654';
      ctx.fillRect(x - 5, y - 3, 10, 1); // its iron rim
      ctx.fillStyle = '#6d7c90';
      ctx.fillRect(x - 5, y - 3, 3, 1);
      // The chain, dropping in and swaying.
      const sway = Math.round(Math.sin(time * 1.4 + x) * 1);
      ctx.fillStyle = '#6d7c90';
      ctx.fillRect(x + 4, y - 7, 1, 4);
      ctx.fillRect(x + 4 + sway, y - 3, 1, 5);
      if (unlocked) {
        drawGlow(ctx, x, y - 1, 6, '#9fd8ff', 0.12 + (Math.sin(time * 2 + x) + 1) * 0.05);
        // Cold light breathing UP out of the shaft.
        const bp = (time * 0.4 + x * 0.2) % 1;
        ctx.globalAlpha = (1 - bp) * 0.55;
        ctx.fillStyle = '#9fd8ff';
        ctx.fillRect(Math.round(x - 2 + Math.sin(time * 2 + x) * 1.5), Math.round(y - 2 - bp * 8), 1, 1);
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'reloj': {
      // A bronze cistern set in the slab, and its water RISES AND
      // SINKS on the level's own tide — the islet keeps the clock.
      const tide = (Math.sin(time * 0.8 + x) + 1) / 2; // 0 empty, 1 full
      const lvl = Math.round(y - 1 - tide * 3);
      ctx.fillStyle = '#0e2a30'; // the tank's dark inside
      ctx.fillRect(x - 5, y - 5, 8, 6);
      ctx.fillStyle = '#22707a';
      ctx.fillRect(x - 5, lvl, 8, y + 1 - lvl);
      ctx.fillStyle = '#7fe0d8'; // the waterline
      ctx.fillRect(x - 5, lvl, 8, 1);
      ctx.fillStyle = '#c9a24a'; // the bronze rim and its valve stem
      ctx.fillRect(x - 6, y - 6, 10, 1);
      ctx.fillRect(x + 4, y - 9, 1, 4);
      ctx.fillStyle = '#ffe6a0';
      ctx.fillRect(x + 3, y - 10, 3, 1);
      if (unlocked) {
        drawGlow(ctx, x - 1, y - 3, 6, '#5fe0d0', 0.12 + tide * 0.1);
        // A drip falling from the valve into the tank: the clock ticking.
        const dp = (time * 1.1 + x * 0.3) % 1;
        ctx.globalAlpha = 1 - dp * 0.5;
        ctx.fillStyle = '#a8f0ff';
        ctx.fillRect(x + 4, Math.round(y - 9 + dp * 8), 1, 1);
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'cripta': {
      // A sealed tomb mouth under a low arch, with the Custodio's
      // censer swinging on its rod: the crypt keeps its own beat.
      ctx.fillStyle = '#241c34';
      ctx.fillRect(x - 6, y - 6, 6, 4); // the vault's arch
      ctx.fillStyle = '#0a0710';
      ctx.fillRect(x - 5, y - 5, 4, 3); // the dark inside
      ctx.fillStyle = '#a294b0';
      ctx.fillRect(x - 6, y - 7, 6, 1); // its carved lintel
      ctx.fillRect(x - 3, y - 5, 1, 3); // the sealing stone
      // The censer: a rigid rod from the lintel with a bronze cap.
      const sw = Math.sin(time * 1.3 + x * 0.5) * 0.5;
      const bx = Math.round(x + 4 + sw * 3);
      const by = Math.round(y - 4 + Math.abs(sw) * -1);
      ctx.fillStyle = '#6a5a44';
      ctx.fillRect(x + 4, y - 9, 1, 1);
      ctx.fillRect(bx, by - 3, 1, 3);
      ctx.fillStyle = '#c9a24a';
      ctx.fillRect(bx - 1, by, 3, 2);
      if (unlocked) {
        drawGlow(ctx, bx, by, 6, '#ffd76a', 0.18 + Math.sin(time * 2 + x) * 0.06);
        ctx.fillStyle = '#ffe6a0';
        ctx.fillRect(bx, by, 1, 1);
        // Incense smoke rising off the swinging cap.
        const sp = (time * 0.5 + x * 0.2) % 1;
        ctx.globalAlpha = (1 - sp) * 0.55;
        ctx.fillStyle = '#c9b8e0';
        ctx.fillRect(Math.round(bx + Math.sin(time * 1.8 + x) * 2), Math.round(by - 1 - sp * 8), 1, 1);
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'puerta': {
      // Worked marble under the door: a carved gold rune inlaid in the
      // slab, breathing light — the threshold isn't cave anymore.
      if (unlocked) drawGlow(ctx, x, y - 1, 7, '#ffd76a', 0.16 + (Math.sin(time * 1.6 + x) + 1) * 0.08);
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(x - 4, y - 1, 9, 1);
      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(x - 2, y - 1, 2, 1);
      ctx.fillRect(x + 2, y - 1, 1, 1);
      // Two carved corner blocks at the slab's lips.
      ctx.fillStyle = '#e0cf9a';
      ctx.fillRect(x - 7, y - 4, 2, 2);
      ctx.fillRect(x + 5, y - 4, 2, 2);
      if (unlocked) {
        const gp = (time * 0.45 + x * 0.2) % 1;
        ctx.globalAlpha = (1 - gp) * 0.8;
        ctx.fillStyle = '#fff3c0';
        ctx.fillRect(Math.round(x + Math.sin(time * 2 + x) * 2), Math.round(y - 3 - gp * 9), 1, 1);
        ctx.globalAlpha = 1;
      }
      break;
    }
  }
}

/** Fixed decor at the midpoint between nodes (alternating types).
 *  Stops at `lastNode`: the challenge road's stretch has no decor
 *  floating over it while the road itself is still hidden. */
function drawPathDecor(ctx: CanvasRenderingContext2D, time: number, lastNode: number): void {
  for (let i = 0; i < lastNode; i += 2) {
    const a = OW_NODES[i];
    const b = OW_NODES[i + 1];
    const mx = Math.round((a.x + b.x) / 2 + ((i * 13) % 7) - 3);
    const my = Math.round(Math.max(a.y, b.y) + 12 + (i % 3));
    const kind = i % 3;
    if (kind === 0) {
      // Little golden crystals sprouting from the rock.
      const pulse = 0.12 + (Math.sin(time * 1.8 + i) + 1) * 0.06;
      drawGlow(ctx, mx + 2, my - 2, 6, '#ffd76a', pulse);
      ctx.fillStyle = '#c9761f';
      ctx.fillRect(mx, my - 2, 2, 3);
      ctx.fillStyle = '#ffd23a';
      ctx.fillRect(mx + 2, my - 4, 2, 5);
      ctx.fillRect(mx - 1, my - 1, 1, 2);
    } else if (kind === 1) {
      // A violet mushroom pulsing softly.
      const pulse = 0.1 + (Math.sin(time * 2.2 + i) + 1) * 0.06;
      drawGlow(ctx, mx + 1, my - 4, 6, '#b98bff', pulse);
      ctx.fillStyle = '#3a2a5e';
      ctx.fillRect(mx + 1, my - 3, 1, 3);
      ctx.fillStyle = '#7a4bd6';
      ctx.fillRect(mx - 1, my - 4, 5, 1);
      ctx.fillRect(mx, my - 5, 3, 1);
    } else {
      // A silent pointed rock.
      ctx.fillStyle = '#241638';
      ctx.beginPath();
      ctx.moveTo(mx - 2, my + 1);
      ctx.lineTo(mx + 1, my - 5);
      ctx.lineTo(mx + 4, my + 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3a2456';
      ctx.fillRect(mx, my - 4, 1, 1);
    }
  }
}

/** Bats crossing the upper part of the cave, every so often. */
function drawBats(ctx: CanvasRenderingContext2D, viewW: number, time: number): void {
  const frames = [sprites.flyer1, sprites.flyer2];
  for (let i = 0; i < 2; i++) {
    const period = 17 + i * 6;
    const p = ((time + i * 9) % period) / period;
    if (p > 0.55) continue; // most of the cycle, the cave is still
    const dir = i === 0 ? 1 : -1;
    const across = (p / 0.55) * (viewW + 24);
    const bx = dir === 1 ? -12 + across : viewW + 12 - across;
    const by = 30 + i * 12 + Math.sin(time * 4 + i * 2) * 4;
    const spr = frameAt(frames, 10, time);
    ctx.globalAlpha = 0.5; // half backlit: it's background, not a threat
    spr.draw(ctx, Math.round(bx - spr.w / 2), Math.round(by), dir === -1);
    ctx.globalAlpha = 1;
  }
}

/** Fireflies: deterministic orbits, each with its own blink. */
function drawFireflies(ctx: CanvasRenderingContext2D, time: number): void {
  for (let i = 0; i < 6; i++) {
    const cx = 30 + ((i * 67) % 260);
    const cy = 45 + ((i * 43) % 75);
    const fx = cx + Math.sin(time * (0.5 + i * 0.13) + i * 2.1) * 14;
    const fy = cy + Math.sin(time * (0.7 + i * 0.11) + i * 4.2) * 8;
    const blink = 0.2 + (Math.sin(time * 2.5 + i * 1.7) + 1) * 0.2;
    drawGlow(ctx, fx, fy, 4, i % 2 ? '#ffd76a' : '#b98bff', blink);
    ctx.fillStyle = '#fff3c0';
    ctx.fillRect(Math.round(fx), Math.round(fy), 1, 1);
  }
}

/** A path node, according to its state. */
function drawNode(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  view: OverworldView,
  i: number,
): void {
  const { x, y } = OW_NODES[i];
  const { time, save } = session;
  const level = levelAtNode(i);
  const unlocked = i <= view.maxNode;
  const done = level !== null && levelRecord(save, level.id).completions > 0;
  const current = i === view.node && !view.walking;

  // The grotto's last node is the world's great door, guarded by two
  // crystal torches. It draws FIRST (markers go over it) and follows the
  // final level's state: sealed while locked, runes awake once you may
  // enter. (The challenge road continues PAST it.)
  if (i === GROTTO_NODE_COUNT - 1) {
    const sealed = !(unlocked && level);
    const door = sealed
      ? sprites.doorLocked
      : Math.sin(time * 4) > 0
        ? sprites.doorOpen2
        : sprites.doorOpen;
    if (!sealed) drawGlow(ctx, x, y - 3 - door.h / 2, 16, '#ffd76a', 0.28 + Math.sin(time * 2) * 0.08);
    door.draw(ctx, x - door.w / 2, y - 3 - door.h);
    for (const side of [-1, 1]) {
      const tx = x + side * 12;
      const ty = y - 10;
      drawGlow(ctx, tx, ty, 7, '#ffd76a', 0.3 + Math.sin(time * 6 + side * 2) * 0.1);
      ctx.fillStyle = '#4a2e70';
      ctx.fillRect(tx - 1, ty + 2, 2, 4);
      ctx.fillStyle = '#ffd23a';
      ctx.fillRect(tx - 1, ty + (Math.sin(time * 7 + side) > 0 ? -1 : 0), 2, 2);
      ctx.fillStyle = '#fff3c0';
      ctx.fillRect(tx - (Math.sin(time * 9 + side) > 0 ? 1 : 0), ty - 2, 1, 1);
    }
  }

  if (done) {
    // Completed: a golden crystal floats over the stone and a
    // conquest pennant waves at its side (a nod to Mario).
    const bob = Math.sin(time * 2.5 + i) * 1.5;
    drawGlow(ctx, x, y - 9 + bob, 9, '#ffe25a', 0.4);
    const frames = [sprites.crystal, sprites.crystal2, sprites.crystal3, sprites.crystal4];
    const spr = frameAt(frames, 6, time, i * 0.7);
    spr.draw(ctx, x - spr.w / 2, y - 12 + bob);
    ctx.fillStyle = '#9b86c4';
    ctx.fillRect(x + 7, y - 13, 1, 10);
    for (let r = 0; r < 3; r++) {
      const wav = Math.round(Math.sin(time * 5 + r * 0.8));
      ctx.fillStyle = r === 2 ? '#c9761f' : '#ffe25a';
      ctx.fillRect(x + 8 + wav, y - 13 + r, 4 - r, 1);
    }
  } else if (unlocked && level) {
    // The frontier: it pulses inviting you in, with sparks rising.
    const pulse = 0.35 + Math.sin(time * 3.5) * 0.2;
    drawGlow(ctx, x, y - 4, 10, '#b98bff', pulse);
    for (let k = 0; k < 2; k++) {
      const p = (time * 0.5 + k * 0.5) % 1;
      ctx.globalAlpha = (1 - p) * 0.8;
      ctx.fillStyle = '#e9d6ff';
      ctx.fillRect(Math.round(x + Math.sin(time * 2 + k * 3) * 3), Math.round(y - 3 - p * 11), 1, 1);
      ctx.globalAlpha = 1;
    }
  } else {
    // Closed — or a '?' stone you may only step past: a silent mark.
    ctx.fillStyle = '#6f5a94';
    ctx.font = font(7);
    ctx.textAlign = 'center';
    ctx.fillText('?', x, y - 6);
  }

  // A challenge node wears a broken-chain crown: the road past the
  // door is not more grotto, it's a dare.
  if (isChallengeNode(i)) {
    ctx.fillStyle = unlocked ? '#c9d8e8' : '#4a5464';
    ctx.fillRect(x - 5, y - 9, 2, 2);
    ctx.fillRect(x - 1, y - 11, 2, 2);
    ctx.fillRect(x + 3, y - 9, 2, 2);
    if (unlocked) {
      drawGlow(ctx, x, y - 9, 8, '#9fd8ff', 0.2 + Math.sin(time * 3 + i) * 0.08);
      ctx.fillStyle = '#eaf6ff';
      ctx.fillRect(x - 1, y - 11, 1, 1);
    }
  }

  // Level number below the stone; the current one, highlighted. The
  // challenge road numbers itself apart (X1, X2, X3).
  ctx.fillStyle = current ? '#ffe25a' : '#6f5a94';
  ctx.font = font(7);
  ctx.textAlign = 'center';
  const label = isChallengeNode(i) ? `X${i - GROTTO_NODE_COUNT + 1}` : String(i + 1);
  ctx.fillText(label, x, y + 12);
}

/** The map character: standing it breathes, walking it runs and
 *  kicks up dust; landing on a node it squashes for a moment (plop). */
function drawAvatar(ctx: CanvasRenderingContext2D, view: OverworldView, time: number): void {
  const bottomY = view.y - 3; // standing on the node's stone

  // A "you are here" ring that expands under the feet, only when still.
  if (!view.walking) {
    const rp = (time * 0.9) % 1;
    ctx.globalAlpha = (1 - rp) * 0.3;
    ctx.strokeStyle = '#7ce0ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(view.x, bottomY + 1, 3 + rp * 7, (3 + rp * 7) * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawGlow(ctx, view.x, bottomY - 5, 12, currentSkin().glow, 0.3);

  // Dust left behind while walking.
  if (view.walking) {
    const p = (view.walkTime * 4) % 1;
    ctx.globalAlpha = (1 - p) * 0.5;
    ctx.fillStyle = '#c9b3f0';
    const px = view.x - view.facing * (4 + p * 6);
    ctx.fillRect(Math.round(px), Math.round(bottomY - 2 - p * 2), p > 0.5 ? 1 : 2, 1);
    ctx.globalAlpha = 1;
  }

  const s = playerSprites(); // the active skin's sprites
  let spr;
  if (view.walking) {
    spr = frameAt(s.run, 12, view.walkTime);
  } else if (time % 3.3 < 0.15) {
    spr = s.blink;
  } else {
    spr = frameAt([s.idle, s.idle2], 1.6, time);
  }
  // The landing "plop": just arrived it squashes and recovers.
  const squash = Math.max(0, 1 - view.settleTime / 0.18);
  spr.drawStretched(ctx, view.x, bottomY, 1 + squash * 0.3, 1 - squash * 0.25, view.facing === -1);
}

/** Bottom panel: name and records of the node it's standing on. */
function drawPanel(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  view: OverworldView,
): void {
  const { viewW, viewH, time, save } = session;
  ctx.fillStyle = 'rgba(17,9,26,0.72)';
  ctx.fillRect(0, viewH - 40, viewW, 40);
  ctx.fillStyle = '#4a2e70'; // top edge: separates the panel from the map
  ctx.fillRect(0, viewH - 41, viewW, 1);
  const cx = viewW / 2;
  ctx.textAlign = 'center';

  const level = levelAtNode(view.node);
  if (!level) {
    ctx.fillStyle = '#6f5a94';
    ctx.font = font(10);
    ctx.fillText(t('ow_locked'), cx, viewH - 24);
    return;
  }

  const rec = levelRecord(save, level.id);
  ctx.fillStyle = '#ffe25a';
  ctx.font = font(9);
  ctx.fillText(`${view.node + 1}. ${t(level.nameKey)}`, cx, viewH - 28);

  // Records on one line (only what exists, separated with dots).
  const parts: string[] = [];
  if (rec.bestTime > 0) parts.push(t('best_time', { t: formatTime(rec.bestTime) }));
  if (rec.bestTrialTime > 0) parts.push(t('trial_best', { t: formatTime(rec.bestTrialTime) }));
  if (rec.completions > 0) {
    parts.push(rec.completions === 1 ? t('completed_once') : t('completed_many', { n: rec.completions }));
  }
  if (parts.length > 0) {
    ctx.fillStyle = '#7ce0ff';
    ctx.font = font(7);
    ctx.fillText(parts.join(' · '), cx, viewH - 18);
  }

  // How to enter (right) and how to move (left): each prompt in its
  // own corner so they never overlap.
  const dev = inputDevice();
  const pl = padLabels();
  const enter = dev === 'touch' ? t('ow_enter_touch') : dev === 'gamepad' ? t('ow_enter_gp', pl) : t('ow_enter_kb');
  // On touch the prompt must name the control the player actually HAS:
  // the d-pad arrows, or the joystick if they switched to it.
  const touchHint = getMove() === 'stick' ? t('ow_hint_touch_stick') : t('ow_hint_touch');
  const hint = dev === 'touch' ? touchHint : dev === 'gamepad' ? t('ow_hint_gp', pl) : t('ow_hint_kb');
  ctx.globalAlpha = 0.55 + Math.sin(time * 4) * 0.45;
  ctx.fillStyle = '#ffe25a';
  ctx.font = font(8);
  ctx.textAlign = 'right';
  ctx.fillText(enter, viewW - 4, viewH - 9);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#6f5a94';
  ctx.font = font(7);
  ctx.textAlign = 'left';
  ctx.fillText(hint, 4, viewH - 9);
}

/** The mode chooser over an already-completed level. */
function drawModeChooser(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  view: OverworldView,
): void {
  const { viewW, viewH, time, save } = session;
  ctx.fillStyle = 'rgba(17,9,26,0.6)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;
  const cy = viewH / 2;

  // Chooser frame: a stone box with crystal corners. Tall enough for
  // the way OUT to be written under the way in — without it, a player
  // who opened the chooser by mistake had no visible way back.
  const pw = 216;
  const ph = 116;
  ctx.fillStyle = 'rgba(26,14,44,0.92)';
  ctx.fillRect(cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.strokeStyle = '#8064b0';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - pw / 2 + 0.5, cy - ph / 2 + 0.5, pw - 1, ph - 1);
  ctx.fillStyle = '#e9d6ff';
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      ctx.fillRect(cx + sx * (pw / 2) - (sx > 0 ? 1 : 0), cy + sy * (ph / 2) - (sy > 0 ? 1 : 0), 1, 1);
    }
  }
  ctx.textAlign = 'center';

  ctx.fillStyle = '#e9d6ff';
  ctx.font = font(12);
  ctx.fillText(t('choose_mode'), cx, cy - 34);
  ctx.fillStyle = '#9b86c4';
  ctx.font = font(8);
  ctx.fillText(t(levelAtNode(view.node)!.nameKey), cx, cy - 22);

  // The two options, side by side; the chosen one glows and is underlined.
  const options: Array<{ mode: GameMode; label: string }> = [
    { mode: 'normal', label: t('mode_normal') },
    { mode: 'trial', label: t('mode_trial') },
  ];
  options.forEach((opt, idx) => {
    const ox = cx + (idx === 0 ? -58 : 58);
    const active = view.choice === opt.mode;
    ctx.fillStyle = active ? '#ffe25a' : '#6f5a94';
    ctx.font = font(10);
    ctx.fillText(opt.label, ox, cy - 4);
    if (active) {
      const w = ctx.measureText(opt.label).width;
      ctx.fillRect(ox - w / 2, cy - 1, w, 1);
    }
  });

  // Hint for the chosen mode and, in time trial, the mark to beat.
  ctx.fillStyle = '#9b86c4';
  ctx.font = font(7);
  ctx.fillText(view.choice === 'normal' ? t('mode_normal_hint') : t('mode_trial_hint'), cx, cy + 12);
  if (view.choice === 'trial') {
    const rec = levelRecord(save, levelAtNode(view.node)!.id);
    if (rec.bestTrialTime > 0) {
      ctx.fillStyle = '#7ce0ff';
      ctx.fillText(t('trial_best', { t: formatTime(rec.bestTrialTime) }), cx, cy + 22);
    }
  }

  const dev = inputDevice();
  const pl = padLabels();
  const enter =
    dev === 'touch'
      ? t('ow_enter_touch')
      : dev === 'gamepad'
        ? t('ow_enter_gp', pl)
        : t('ow_enter_kb');
  ctx.globalAlpha = 0.55 + Math.sin(time * 4) * 0.45;
  ctx.fillStyle = '#ffe25a';
  ctx.font = font(8);
  ctx.fillText(enter, cx, cy + 38);
  ctx.globalAlpha = 1;
  // …and the way OUT, named for the device in hand: a menu you can
  // enter and not leave is a trap, even when the button exists.
  const back = dev === 'touch' ? t('ow_back_touch') : dev === 'gamepad' ? t('ow_back_gp', pl) : t('ow_back_kb');
  ctx.fillStyle = '#6f5a94';
  ctx.font = font(7);
  ctx.fillText(back, cx, cy + 50);
  ctx.textAlign = 'left';
}
