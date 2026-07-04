// ============================================================
//  EL JUEGO (orquestador)
// ------------------------------------------------------------
//  Junta todo: nivel, jugador, slimes, cámara y cristales.
//  Decide las reglas: recoger los 5 cristales y llegar a la puerta.
//  Tocar un slime o caer a un foso = volver al inicio.
// ============================================================

import { Level } from './Level';
import { Player } from './Player';
import { Slime } from './Slime';
import { Camera } from './Camera';
import { Particles } from './Particles';
import { ROOMS } from './rooms';
import { justPressed } from '../engine/input';
import { overlaps, type Box } from '../engine/canvas';
import { sprites, drawGlow, drawBackground, drawDust, drawVignette, initDust } from './art';
import { sfx } from './sfx';

interface Crystal {
  x: number;
  y: number;
  taken: boolean;
}

type State = 'playing' | 'won';

export class Game {
  private level: Level;
  private player: Player;
  private slimes: Slime[];
  private camera: Camera;
  private crystals: Crystal[];
  private particles = new Particles();
  private state: State = 'playing';
  private time = 0;
  private freezeTimer = 0;    // hit-stop: mundo congelado unos frames
  private deadFrozen = false; // hay una muerte esperando el respawn

  constructor(
    private viewW: number,
    private viewH: number,
  ) {
    this.level = new Level(ROOMS[0].map);
    this.player = new Player(this.level, this.particles);
    this.slimes = this.level.slimeCells.map((c) => new Slime(c.x, c.y, this.level));
    this.camera = new Camera(viewW, viewH, this.level.widthPx, this.level.heightPx);
    this.crystals = this.level.crystalCells.map((c) => ({
      x: c.x + 1,
      y: c.y + 1,
      taken: false,
    }));
    initDust(viewW, viewH);
  }

  private get collected(): number {
    return this.crystals.filter((c) => c.taken).length;
  }

  private reset(): void {
    this.player.respawn();
    for (const c of this.crystals) c.taken = false;
    this.slimes = this.level.slimeCells.map((c) => new Slime(c.x, c.y, this.level));
    this.particles.clear();
    this.freezeTimer = 0;
    this.deadFrozen = false;
    this.state = 'playing';
  }

  update(dt: number): void {
    if (justPressed('restart')) {
      this.reset();
      return;
    }

    // Hit-stop: tras un golpe mortal, el mundo entero queda clavado
    // un instante. Al soltarse llegan la sacudida y el respawn.
    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      if (this.freezeTimer <= 0 && this.deadFrozen) {
        this.deadFrozen = false;
        this.camera.shake(3, 0.35);
        this.player.respawn();
      }
      return;
    }

    this.time += dt;
    // Las chispas siguen vivas incluso en la pantalla de victoria.
    this.particles.update(dt);
    if (this.state === 'won') return;

    this.player.update(dt);
    for (const s of this.slimes) s.update(dt);

    const pbox = this.player.box();

    // Recoger cristales
    for (const c of this.crystals) {
      if (c.taken) continue;
      const cbox: Box = { x: c.x, y: c.y, w: 6, h: 6 };
      if (overlaps(pbox, cbox)) {
        c.taken = true;
        // Chispas doradas desde el centro del cristal
        this.particles.burst(c.x + 3, c.y + 4, 14, ['#ffd23a', '#fff7c9', '#ffe25a']);
        sfx.pickup();
      }
    }

    // Chocar slime -> volver al inicio (los cristales recogidos se conservan)
    for (const s of this.slimes) {
      if (overlaps(pbox, s.box())) {
        this.die();
        break;
      }
    }

    // Caer fuera del mundo -> volver al inicio
    if (this.player.y > this.level.heightPx + 24) {
      this.die();
    }

    // Llegar a la puerta con todos los cristales -> ganar
    if (this.collected === this.crystals.length && overlaps(pbox, this.level.doorBox)) {
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

    drawBackground(ctx, camX, camY, this.viewW, this.viewH, this.level.widthPx);

    this.level.draw(ctx, camX, camY, this.viewW, this.viewH);
    this.drawDoor(ctx, camX, camY);
    this.drawCrystals(ctx, camX, camY);
    for (const s of this.slimes) s.draw(ctx, camX, camY);
    this.player.draw(ctx, camX, camY);
    this.particles.draw(ctx, camX, camY);

    drawDust(ctx, this.viewW, this.viewH, this.time, 1 / 60);
    drawVignette(ctx, this.viewW, this.viewH);

    this.drawHud(ctx);
    if (this.state === 'won') this.drawWin(ctx);
  }

  private drawCrystals(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (const c of this.crystals) {
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
    const d = this.level.doorBox;
    const open = this.collected === this.crystals.length;
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
    ctx.fillText(`CRISTALES ${this.collected}/${this.crystals.length}`, 6, 6);
    if (this.collected === this.crystals.length && this.state === 'playing') {
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
