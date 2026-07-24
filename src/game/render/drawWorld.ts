// ============================================================
//  WORLD DRAWING (one full frame of the scene)
// ------------------------------------------------------------
//  Composes the layers in order: parallax background, tiles, door,
//  pickups, enemies, player, particles, popups and the atmosphere
//  on top (fog, dust, vignette). Used by every scene: the world is
//  also visible behind the menus.
// ============================================================

import type { GameSession } from '../session';
import { drawBackground, drawDust, drawFog, drawVignette } from '../art/atmosphere';
import { sprites } from '../art/sprites';
import { drawGlow } from '../art/glow';
import { drawLevelTiles, drawVeils } from './levelTiles';
import { drawBackWall, drawPlayerLight } from './backWall';
import { drawForeground } from './foreground';
import { drawMurals } from '../art/murals';
import { currentSkin } from '../skins';
import { debug } from '../debug';

export function drawWorld(ctx: CanvasRenderingContext2D, session: GameSession): void {
  const camX = session.camera.x;
  const camY = session.camera.y;
  const room = session.world.current;
  const { viewW, viewH, time } = session;

  drawBackground(
    ctx, camX, camY, viewW, viewH,
    room.level.widthPx, room.data.mapPos.x, time,
    session.level.id,     // each level has its own color theme
    room.level.heightPx,  // and its own height: the parallax scrolls with it
  );

  // The plane BETWEEN the parallax cave and the tiles: the wall a few
  // metres behind you. It has to come after the background (it covers
  // part of it) and before the tiles (they stand in front of it), and
  // the player's light lands on it while it is still the topmost thing
  // drawn — light on a wall, not a glow pasted over the scenery.
  const pWorldX = session.player.x + session.player.w / 2;
  const pWorldY = session.player.y + session.player.h / 2;
  drawBackWall(ctx, room.level, camX, camY, viewW, viewH, session.level.id);
  drawPlayerLight(ctx, pWorldX - camX, pWorldY - camY, currentSkin().glow, time);

  drawMurals(ctx, room.murals, camX, camY, session.level.id, time);

  drawLevelTiles(
    ctx, room.level, camX, camY, viewW, viewH, session.level.id, pWorldX, pWorldY,
  );
  drawDoor(ctx, session, camX, camY);
  // Inscriptions are CUT INTO the wall, so they go straight after the
  // tiles and behind everything that lives in the room: an enemy must
  // be able to stand in front of one.
  for (const a of room.actors) {
    if (a.layer === 'lore') a.draw(ctx, camX, camY);
  }
  for (const d of room.devices) {
    d.draw(ctx, camX, camY); // devices first: you stand ON TOP of them
  }
  for (const p of room.pickups) {
    if (!p.dead) p.draw(ctx, camX, camY);
  }
  for (const e of room.enemies) {
    if (!e.dead) e.draw(ctx, camX, camY);
  }
  session.player.draw(ctx, camX, camY);
  session.particles.draw(ctx, camX, camY);
  session.popups.draw(ctx, camX, camY);

  // The near plane: in front of everything that lives in the room, and
  // behind the air (fog, dust) that sits between the room and the lens.
  // It is handed the player's position on screen because every occluder
  // has to be able to step aside for them.
  drawForeground(
    ctx, camX, camY, viewW, viewH,
    room.level.widthPx, room.level.heightPx, room.data.mapPos.x, session.level.id,
    pWorldX - camX, pWorldY - camY,
    // No occluders in a boss room, at all. A boss fight is the one
    // place where every pixel of telegraph has to arrive — the
    // Custodio's whole contract is that nothing it throws skips the
    // announcement — and an occluder over a warning is that bug again.
    room.enemies.some((e) => e.isBoss && !e.dead),
  );
  // The veils go last of the near plane: they are rock, and rock draws
  // over the occluders in front of it, not under them.
  drawVeils(
    ctx, room.level, room.veils, camX, camY, session.level.id, pWorldX, pWorldY,
  );

  drawFog(ctx, camX, viewW, viewH, time, session.level.id);
  drawDust(ctx, viewW, viewH, time, 1 / 60);
  drawVignette(ctx, viewW, viewH);

  if (import.meta.env.DEV && debug.hitboxes) drawHitboxes(ctx, session, camX, camY);
}

function drawDoor(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  camX: number,
  camY: number,
): void {
  const d = session.world.current.doorBox;
  if (!d) return; // this room has no door
  const open = session.doorOpen;
  // Open: the runes pulse by alternating two frames.
  const openSprite = Math.sin(session.time * 4) > 0 ? sprites.doorOpen2 : sprites.doorOpen;
  const sprite = open ? openSprite : sprites.doorLocked;
  const floorY = d.y - 2 + 8; // base of the door on the floor
  const drawX = d.x + 4 - sprite.w / 2;
  const drawY = floorY - sprite.h;
  if (open) {
    const pulse = 0.4 + Math.sin(session.time * 3) * 0.15;
    drawGlow(ctx, d.x + 4 - camX, drawY + sprite.h / 2 - camY, 22, '#b98bff', pulse);
  }
  sprite.draw(ctx, drawX - camX, drawY - camY);
}

/** Collision box outlines (development only). */
function drawHitboxes(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  camX: number,
  camY: number,
): void {
  const room = session.world.current;
  const outline = (b: { x: number; y: number; w: number; h: number }, color: string): void => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x - camX + 0.5, b.y - camY + 0.5, b.w - 1, b.h - 1);
  };
  for (const p of room.pickups) {
    if (!p.dead) outline(p.box(), '#ffe25a');
  }
  for (const e of room.enemies) {
    if (e.dead) continue;
    outline(e.box(), '#ff3a5a');
    for (const hz of e.hazards?.() ?? []) outline(hz, '#ff9ad0');
  }
  for (const d of room.devices) outline(d.box(), '#5ce06a');
  if (room.doorBox) outline(room.doorBox, '#b98bff');
  outline(session.player.box(), '#7ce0ff');
}
