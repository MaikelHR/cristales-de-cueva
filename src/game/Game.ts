// ============================================================
//  EL JUEGO (orquestador)
// ------------------------------------------------------------
//  Junta todo: mundo (salas), jugador, cámara y reglas.
//  Recoge todos los cristales del mundo y llega a la puerta.
//  Tocar un slime o caer a un foso = volver al inicio.
// ============================================================

import { Player } from './Player';
import { Camera } from './Camera';
import { Particles } from './Particles';
import { World } from './World';
import { justPressed } from '../engine/input';
import { overlaps, clamp, type Box } from '../engine/canvas';
import { sprites, drawGlow, drawBackground, drawDust, drawVignette, initDust } from './art';
import { sfx } from './sfx';

type State = 'playing' | 'won';

export class Game {
  private world: World;
  private player: Player;
  private camera!: Camera; // la crea makeCamera()
  private particles = new Particles();
  private state: State = 'playing';
  private time = 0;
  private freezeTimer = 0;    // hit-stop: mundo congelado unos frames
  private deadFrozen = false; // hay una muerte esperando el respawn
  // Checkpoint: la sala y el punto donde reaparecés al morir.
  private checkpoint = { roomId: '', x: 0, y: 0 };
  // Salas ya exploradas: son las que muestra el minimapa.
  private visited = new Set<string>();

  constructor(
    private viewW: number,
    private viewH: number,
  ) {
    this.world = new World();
    this.player = new Player(this.world.current.level, this.particles);
    this.saveCheckpoint();
    this.visited.add(this.world.current.def.id);
    this.makeCamera();
    initDust(viewW, viewH);
  }

  /** El punto actual del jugador pasa a ser su lugar de reaparición. */
  private saveCheckpoint(): void {
    this.checkpoint = {
      roomId: this.world.current.def.id,
      x: this.player.x,
      y: this.player.y,
    };
  }

  /** La cámara se ajusta al tamaño de la sala actual. */
  private makeCamera(): void {
    const level = this.world.current.level;
    this.camera = new Camera(this.viewW, this.viewH, level.widthPx, level.heightPx);
  }

  private get collected(): number {
    return this.world.allCrystals.filter((c) => c.taken).length;
  }

  private get totalCrystals(): number {
    return this.world.allCrystals.length;
  }

  private reset(): void {
    this.world = new World(); // mundo nuevo: salas, slimes y cristales de cero
    this.player.setLevel(this.world.current.level);
    this.player.respawn();
    this.saveCheckpoint();
    this.visited = new Set([this.world.current.def.id]);
    this.particles.clear();
    this.makeCamera();
    this.freezeTimer = 0;
    this.deadFrozen = false;
    this.state = 'playing';
  }

  /** Volver al último checkpoint tras morir. */
  private respawnPlayer(): void {
    this.world.goTo(this.checkpoint.roomId);
    this.player.setLevel(this.world.current.level);
    this.player.respawnAt(this.checkpoint.x, this.checkpoint.y);
    this.makeCamera();
  }

  update(dt: number): void {
    if (justPressed('restart')) {
      this.reset();
      return;
    }

    // Hit-stop: tras un golpe mortal, el mundo entero queda clavado
    // un instante. Al soltarse llegan el respawn y la sacudida.
    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      if (this.freezeTimer <= 0 && this.deadFrozen) {
        this.deadFrozen = false;
        this.respawnPlayer();
        this.camera.shake(3, 0.35);
      }
      return;
    }

    this.time += dt;
    // Las chispas siguen vivas incluso en la pantalla de victoria.
    this.particles.update(dt);
    if (this.state === 'won') return;

    this.player.update(dt);

    // ¿Cruzó un borde hacia otra sala?
    if (this.world.tryTransition(this.player)) {
      this.player.setLevel(this.world.current.level);
      this.makeCamera();
      // La boca por la que entraste es tu nuevo punto de reaparición.
      this.saveCheckpoint();
      this.visited.add(this.world.current.def.id);
    }

    const room = this.world.current;
    for (const s of room.slimes) s.update(dt);

    const pbox = this.player.box();

    // Recoger cristales de la sala actual
    for (const c of room.crystals) {
      if (c.taken) continue;
      const cbox: Box = { x: c.x, y: c.y, w: 6, h: 6 };
      if (overlaps(pbox, cbox)) {
        c.taken = true;
        // Chispas doradas desde el centro del cristal
        this.particles.burst(c.x + 3, c.y + 4, 14, ['#ffd23a', '#fff7c9', '#ffe25a']);
        sfx.pickup();
      }
    }

    // Chocar slime -> morir (los cristales recogidos se conservan)
    for (const s of room.slimes) {
      if (overlaps(pbox, s.box())) {
        this.die();
        break;
      }
    }

    // Caer fuera del mundo -> morir
    if (this.player.y > room.level.heightPx + 24) {
      this.die();
    }

    // Llegar a la puerta con todos los cristales -> ganar
    const door = room.level.doorBox;
    if (door && this.collected === this.totalCrystals && overlaps(pbox, door)) {
      this.state = 'won';
      sfx.win();
    }

    this.camera.update(dt);
    this.camera.follow(
      this.player.x + this.player.w / 2,
      this.player.y + this.player.h / 2,
    );
  }

  /** Morir: congelar el mundo un instante; el respawn y la sacudida
   *  llegan cuando el congelamiento se suelta (ver update). */
  private die(): void {
    if (this.deadFrozen) return; // ya hay una muerte en curso
    this.freezeTimer = 0.26;
    this.deadFrozen = true;
    sfx.die();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const camX = this.camera.x;
    const camY = this.camera.y;
    const room = this.world.current;

    drawBackground(ctx, camX, camY, this.viewW, this.viewH, room.level.widthPx);

    room.level.draw(ctx, camX, camY, this.viewW, this.viewH);
    this.drawDoor(ctx, camX, camY);
    this.drawCrystals(ctx, camX, camY);
    for (const s of room.slimes) s.draw(ctx, camX, camY);
    this.player.draw(ctx, camX, camY);
    this.particles.draw(ctx, camX, camY);

    drawDust(ctx, this.viewW, this.viewH, this.time, 1 / 60);
    drawVignette(ctx, this.viewW, this.viewH);

    this.drawHud(ctx);
    this.drawMinimap(ctx);
    if (this.state === 'won') this.drawWin(ctx);
  }

  /** Minimapa (arriba a la derecha): las salas se revelan al visitarlas. */
  private drawMinimap(ctx: CanvasRenderingContext2D): void {
    const cellW = 12;
    const cellH = 8;
    const gap = 2;
    const rooms = this.world.allRooms;
    const maxX = Math.max(...rooms.map((r) => r.def.mapPos.x));
    const baseX = this.viewW - 6 - ((maxX + 1) * cellW + maxX * gap);
    const baseY = 6;

    for (const room of rooms) {
      if (!this.visited.has(room.def.id)) continue;
      const x = baseX + room.def.mapPos.x * (cellW + gap);
      const y = baseY + room.def.mapPos.y * (cellH + gap);
      const isCurrent = room === this.world.current;
      // Marco y fondo de la celda
      ctx.fillStyle = isCurrent ? '#ffe25a' : '#4a2e70';
      ctx.fillRect(x, y, cellW, cellH);
      ctx.fillStyle = isCurrent ? '#3a2456' : '#241638';
      ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
      // Puntito del jugador dentro de la sala actual
      if (isCurrent) {
        const rel = clamp(this.player.x / room.level.widthPx, 0, 1);
        ctx.fillStyle = '#7ce0ff';
        ctx.fillRect(x + 1 + Math.round(rel * (cellW - 4)), y + cellH / 2 - 1, 2, 2);
      }
    }
  }

  private drawCrystals(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (const c of this.world.current.crystals) {
      if (c.taken) continue;
      const bob = Math.sin(this.time * 3 + c.x) * 1.5;
      const cx = c.x + 3 - camX;
      const cy = c.y + 4 - camY + bob;
      // Halo pulsante
      const pulse = 0.45 + Math.sin(this.time * 4 + c.x) * 0.15;
      drawGlow(ctx, cx, cy, 12, '#ffe25a', pulse);
      // Cristal centrado en su halo
      sprites.crystal.draw(ctx, cx - sprites.crystal.w / 2, cy - sprites.crystal.h / 2);
    }
  }

  private drawDoor(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const d = this.world.current.level.doorBox;
    if (!d) return; // esta sala no tiene puerta
    const open = this.collected === this.totalCrystals;
    const sprite = open ? sprites.doorOpen : sprites.doorLocked;
    const floorY = d.y - 2 + 8; // base de la puerta sobre el piso
    const drawX = d.x + 4 - sprite.w / 2;
    const drawY = floorY - sprite.h;
    if (open) {
      const pulse = 0.4 + Math.sin(this.time * 3) * 0.15;
      drawGlow(ctx, d.x + 4 - camX, drawY + sprite.h / 2 - camY, 22, '#b98bff', pulse);
    }
    sprite.draw(ctx, drawX - camX, drawY - camY);
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#ffe25a';
    ctx.font = '8px "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(`CRISTALES ${this.collected}/${this.totalCrystals}`, 6, 6);
    if (this.collected === this.totalCrystals && this.state === 'playing') {
      ctx.fillStyle = '#b98bff';
      ctx.fillText('LA PUERTA ESTÁ ABIERTA', 6, 16);
    }
  }

  private drawWin(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(17,9,26,0.78)';
    ctx.fillRect(0, 0, this.viewW, this.viewH);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd36e';
    ctx.font = '16px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText('¡LO LOGRASTE!', this.viewW / 2, this.viewH / 2 - 10);
    ctx.fillStyle = '#9b86c4';
    ctx.font = '8px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText('R para jugar de nuevo', this.viewW / 2, this.viewH / 2 + 8);
    ctx.textAlign = 'left';
  }
}
