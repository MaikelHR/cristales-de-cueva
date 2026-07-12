// ============================================================
//  DIBUJO DEL MUNDO (un frame completo de la escena)
// ------------------------------------------------------------
//  Compone las capas en orden: fondo con parallax, tiles, puerta,
//  recogibles, enemigos, jugador, partículas, popups y la
//  atmósfera por encima (niebla, polvo, viñeta). Lo usan todas
//  las escenas: el mundo también se ve detrás de los menús.
// ============================================================

import type { GameSession } from '../session';
import { drawBackground, drawDust, drawFog, drawVignette } from '../art/atmosphere';
import { sprites } from '../art/sprites';
import { drawGlow } from '../art/glow';
import { drawLevelTiles } from './levelTiles';
import { debug } from '../debug';

export function drawWorld(ctx: CanvasRenderingContext2D, session: GameSession): void {
  const camX = session.camera.x;
  const camY = session.camera.y;
  const room = session.world.current;
  const { viewW, viewH, time } = session;

  drawBackground(
    ctx, camX, camY, viewW, viewH,
    room.level.widthPx, room.data.mapPos.x, time,
    session.level.id, // cada nivel tiene su propio tema de color
  );

  drawLevelTiles(ctx, room.level, camX, camY, viewW, viewH, session.level.id);
  drawDoor(ctx, session, camX, camY);
  for (const d of room.devices) {
    d.draw(ctx, camX, camY); // aparatos primero: se pisa SOBRE ellos
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
  if (!d) return; // esta sala no tiene puerta
  const open = session.doorOpen;
  // Abierta: las runas laten alternando dos frames.
  const openSprite = Math.sin(session.time * 4) > 0 ? sprites.doorOpen2 : sprites.doorOpen;
  const sprite = open ? openSprite : sprites.doorLocked;
  const floorY = d.y - 2 + 8; // base de la puerta sobre el piso
  const drawX = d.x + 4 - sprite.w / 2;
  const drawY = floorY - sprite.h;
  if (open) {
    const pulse = 0.4 + Math.sin(session.time * 3) * 0.15;
    drawGlow(ctx, d.x + 4 - camX, drawY + sprite.h / 2 - camY, 22, '#b98bff', pulse);
  }
  sprite.draw(ctx, drawX - camX, drawY - camY);
}

/** Contornos de las cajas de colisión (solo desarrollo). */
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
