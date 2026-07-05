// ============================================================
//  EL JUEGO (orquestador)
// ------------------------------------------------------------
//  Junta todo: mundo (salas), jugador, cámara y reglas.
//  Recoge todos los cristales del mundo y llega a la puerta.
//  Tocar un enemigo cuesta un corazón (con retroceso e invulnerabilidad);
//  caer a un foso también. Sin corazones = game over (mundo nuevo).
// ============================================================

import { Player } from './Player';
import { Camera } from './Camera';
import { Particles } from './Particles';
import { World } from './World';
import type { AbilityName } from './Level';
import type { Enemy } from './entities/Enemy';
import { justPressed } from '../engine/input';
import { overlaps, clamp, type Box } from '../engine/canvas';
import { sprites, drawGlow, drawBackground, drawDust, drawVignette, initDust } from './art';
import { sfx } from './sfx';

type State = 'playing' | 'won';

const ABILITY_LABEL: Record<AbilityName, string> = {
  doubleJump: '¡DOBLE SALTO!',
  dash: '¡DASH!',
  wallJump: '¡SALTO DE PARED!',
};

const ABILITY_GLOW: Record<AbilityName, string> = {
  doubleJump: '#7ce0ff',
  dash: '#ff9a5a',
  wallJump: '#5ce06a',
};

export class Game {
  private world: World;
  private player: Player;
  private camera!: Camera; // la crea makeCamera()
  private particles = new Particles();
  private state: State = 'playing';
  private time = 0;
  private freezeTimer = 0;    // hit-stop: mundo congelado unos frames
  private deadFrozen = false; // hay una muerte esperando el respawn
  private pendingReset = false; // al soltar el freeze, ¿reiniciar el mundo?
  private hitStop = 0;        // micro-pausa al pisar (impacto, sin muerte)
  // Checkpoint: la sala y el punto donde reaparecés al morir.
  private checkpoint = { roomId: '', x: 0, y: 0 };
  // Salas ya exploradas: son las que muestra el minimapa.
  private visited = new Set<string>();
  // Aviso grande en pantalla (al ganar una habilidad).
  private announceText = '';
  private announceTimer = 0;

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
    this.world = new World(); // mundo nuevo: enemigos y cristales de cero
    this.player.setLevel(this.world.current.level);
    this.player.respawn();
    this.player.health = this.player.maxHealth; // corazones al máximo
    this.pendingReset = false;
    this.saveCheckpoint();
    this.visited = new Set([this.world.current.def.id]);
    // Un mundo nuevo también apaga las habilidades ganadas.
    for (const key of Object.keys(this.player.abilities) as AbilityName[]) {
      this.player.abilities[key] = false;
    }
    this.announceTimer = 0;
    this.particles.clear();
    this.makeCamera();
    this.freezeTimer = 0;
    this.deadFrozen = false;
    this.hitStop = 0;
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
        if (this.pendingReset) {
          this.pendingReset = false;
          this.reset(); // sin corazones: mundo nuevo
        } else {
          this.respawnPlayer(); // cayó a un foso pero le quedan corazones
          this.camera.shake(3, 0.35);
        }
      }
      return;
    }

    // Micro-pausa de impacto al pisar: un instante clavado y sigue.
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return;
    }

    this.time += dt;
    this.announceTimer = Math.max(0, this.announceTimer - dt);
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
    for (const e of room.enemies) {
      if (!e.dead) e.update(dt, this.player);
    }

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

    // Recoger reliquias: otorgan su habilidad para siempre
    for (const r of room.relics) {
      if (r.taken) continue;
      const rbox: Box = { x: r.x, y: r.y, w: 6, h: 6 };
      if (overlaps(pbox, rbox)) {
        r.taken = true;
        this.player.abilities[r.ability] = true;
        this.particles.burst(r.x + 3, r.y + 4, 22, ['#7ce0ff', '#f5fcff', '#b98bff']);
        this.announceText = ABILITY_LABEL[r.ability];
        this.announceTimer = 2.5;
        sfx.relic();
      }
    }

    // Contacto con enemigos: pisar desde arriba lo derrota; de costado
    // o desde abajo, te daña. También sus proyectiles (hazards) dañan.
    for (const e of room.enemies) {
      if (e.dead) continue;
      const eb = e.box();
      if (overlaps(pbox, eb)) {
        const feetY = pbox.y + pbox.h;
        const stomped =
          e.stompable && this.player.vy > 0 && feetY <= eb.y + eb.h * 0.6;
        if (stomped) this.stompEnemy(e, eb);
        else this.hurtPlayer(eb.x + eb.w / 2);
        break;
      }
      // Proyectiles del enemigo (si dispara)
      if (e.hazards) {
        let hit = false;
        for (const hz of e.hazards()) {
          if (overlaps(pbox, hz)) {
            this.hurtPlayer(hz.x + hz.w / 2);
            hit = true;
            break;
          }
        }
        if (hit) break;
      }
    }

    // Caer fuera del mundo -> perder un corazón y reaparecer
    if (this.player.y > room.level.heightPx + 24) {
      this.loseLifeAndRespawn();
    }

    // Llegar a la puerta con todos los cristales y sin jefes vivos -> ganar
    const door = room.level.doorBox;
    if (
      door &&
      this.collected === this.totalCrystals &&
      !this.bossAlive &&
      overlaps(pbox, door)
    ) {
      this.state = 'won';
      sfx.win();
    }

    this.camera.update(dt);
    this.camera.follow(
      this.player.x + this.player.w / 2,
      this.player.y + this.player.h / 2,
    );
  }

  /** Pisar un enemigo: rebota al jugador y clava una micro-pausa de
   *  impacto. Los enemigos con onStomp (el jefe) deciden si el golpe
   *  los derrota; el resto muere de un pisotón. */
  private stompEnemy(e: Enemy, eb: Box): void {
    const defeated = e.onStomp ? e.onStomp() : ((e.dead = true), true);
    this.player.bounce();
    this.hitStop = 0.06;
    sfx.stomp();
    if (defeated) {
      const count = e.isBoss ? 30 : 12;
      this.particles.burst(eb.x + eb.w / 2, eb.y + eb.h / 2, count, [...e.gooColors]);
      this.camera.shake(e.isBoss ? 4 : 1.5, e.isBoss ? 0.4 : 0.15);
      if (e.isBoss) {
        this.announceText = '¡GUARDIÁN DERROTADO!';
        this.announceTimer = 2.5;
        sfx.relic();
      }
    } else {
      // Golpe que no derrota (jefe con vida restante): chispas y sacudida chica.
      this.particles.burst(eb.x + eb.w / 2, eb.y, 8, [...e.gooColors]);
      this.camera.shake(1.5, 0.15);
    }
  }

  /** ¿Queda algún jefe vivo en el mundo? Bloquea la puerta. */
  private get bossAlive(): boolean {
    return this.world.allRooms.some((r) => r.enemies.some((e) => e.isBoss && !e.dead));
  }

  /** Recibir daño de un enemigo: quita un corazón, empuja y da unos
   *  frames de invulnerabilidad. NO congela el mundo: seguís jugando.
   *  Si te deja sin corazones, es game over. */
  private hurtPlayer(fromX: number): void {
    if (this.deadFrozen) return;
    if (!this.player.hurt(fromX)) return; // invulnerable: no pasa nada
    this.camera.shake(2.5, 0.25);
    this.particles.burst(
      this.player.x + this.player.w / 2,
      this.player.y + this.player.h / 2,
      10,
      ['#ff5a7a', '#ffd0dc', '#ff9a5a'],
    );
    sfx.hurt();
    if (this.player.health <= 0) this.gameOver();
  }

  /** Caer a un foso: cuesta un corazón y reaparece en el checkpoint
   *  (con hit-stop). Sin corazones, game over. */
  private loseLifeAndRespawn(): void {
    if (this.deadFrozen) return;
    this.player.health--;
    this.freezeTimer = 0.26;
    this.deadFrozen = true;
    if (this.player.health <= 0) this.pendingReset = true;
    sfx.die();
  }

  /** Sin corazones: congela un instante y reinicia el mundo. */
  private gameOver(): void {
    this.freezeTimer = 0.4;
    this.deadFrozen = true;
    this.pendingReset = true;
    sfx.die();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const camX = this.camera.x;
    const camY = this.camera.y;
    const room = this.world.current;

    drawBackground(ctx, camX, camY, this.viewW, this.viewH, room.level.widthPx, room.def.mapPos.x);

    room.level.draw(ctx, camX, camY, this.viewW, this.viewH);
    this.drawDoor(ctx, camX, camY);
    this.drawCrystals(ctx, camX, camY);
    this.drawRelics(ctx, camX, camY);
    for (const e of room.enemies) {
      if (!e.dead) e.draw(ctx, camX, camY);
    }
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

  private drawRelics(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (const r of this.world.current.relics) {
      if (r.taken) continue;
      const bob = Math.sin(this.time * 2.2 + r.x) * 2;
      const cx = r.x + 3 - camX;
      const cy = r.y + 4 - camY + bob;
      const pulse = 0.5 + Math.sin(this.time * 5 + r.x) * 0.2;
      drawGlow(ctx, cx, cy, 15, ABILITY_GLOW[r.ability], pulse);
      sprites.relic.draw(ctx, cx - sprites.relic.w / 2, cy - sprites.relic.h / 2);
    }
  }

  private drawDoor(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const d = this.world.current.level.doorBox;
    if (!d) return; // esta sala no tiene puerta
    const open = this.collected === this.totalCrystals && !this.bossAlive;
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
    // Corazones de vida (arriba a la izquierda)
    for (let i = 0; i < this.player.maxHealth; i++) {
      const heart = i < this.player.health ? sprites.heartFull : sprites.heartEmpty;
      heart.draw(ctx, 6 + i * 8, 6);
    }
    // Contador de cristales, debajo de los corazones
    ctx.fillStyle = '#ffe25a';
    ctx.font = '8px "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(`CRISTALES ${this.collected}/${this.totalCrystals}`, 6, 15);
    if (this.collected === this.totalCrystals && this.state === 'playing') {
      if (this.bossAlive) {
        ctx.fillStyle = '#ff5a7a';
        ctx.fillText('SALTA SOBRE EL GUARDIÁN', 6, 25);
      } else {
        ctx.fillStyle = '#b98bff';
        ctx.fillText('LA PUERTA ESTÁ ABIERTA', 6, 25);
      }
    }
    // Aviso grande al ganar una habilidad (se desvanece al final)
    if (this.announceTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.announceTimer * 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#7ce0ff';
      ctx.font = '12px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillText(this.announceText, this.viewW / 2, 34);
      ctx.restore();
      ctx.textAlign = 'left';
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
