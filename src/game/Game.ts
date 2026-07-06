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
import { justPressed, inputDevice, isTouchMode } from '../engine/input';
import { overlaps, clamp, type Box } from '../engine/canvas';
import { sprites, drawGlow, drawBackground, drawDust, drawFog, drawVignette, initDust } from './art';
import { sfx } from './sfx';
import { loadSave, writeSave, type SaveData } from './save';

// Los estados del juego. 'title' = menú de inicio; 'playing' = jugando;
// 'won' = pantalla de victoria; 'gameover' = te quedaste sin corazones.
type State = 'title' | 'playing' | 'won' | 'gameover';

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

/** Hash estable de un string a un entero chico (semilla del fondo por sala).
 *  Con el mapa 2D, mapPos.x ya no sirve como semilla única (dos salas de
 *  biomas distintos pueden compartir columna), así que sembramos por id. */
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 10000;
}

/** Formatea segundos como m:ss (p. ej. 83.4 -> "1:23"). */
function formatTime(seconds: number): string {
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export class Game {
  private world: World;
  private player: Player;
  private camera!: Camera; // la crea makeCamera()
  private particles = new Particles();
  private state: State = 'title';
  private time = 0;
  private freezeTimer = 0;    // hit-stop: mundo congelado unos frames
  private deadFrozen = false; // hay una muerte esperando el respawn
  private pendingReset = false; // al soltar el freeze, ¿reiniciar el mundo?
  private hitStop = 0;        // micro-pausa al pisar (impacto, sin muerte)
  private score = 0;          // puntos por monstruos eliminados
  private save: SaveData = loadSave(); // récords persistidos (localStorage)
  private newRecord = false;  // ¿la última corrida batió el mejor puntaje?
  private newBestTime = false;// ¿la última victoria batió el mejor tiempo?
  private paused = false;     // pausa (congela la partida sin salir de ella)
  private runTime = 0;        // cronómetro de la partida actual (segundos)
  // Textos flotantes "+N" que suben y se desvanecen (world space).
  private popups: { x: number; y: number; text: string; life: number }[] = [];
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

  /** Estado observable para la UI táctil: qué pantalla se muestra y si
   *  está en pausa. Lo consume touch.ts para saber qué botones enseñar. */
  get ui(): { state: State; paused: boolean } {
    return { state: this.state, paused: this.paused };
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
    this.score = 0;
    this.newRecord = false;
    this.newBestTime = false;
    this.runTime = 0;
    this.paused = false;
    this.popups = [];
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
    // Menú de inicio: el mundo se anima de fondo y esperamos a que el
    // jugador confirme para EMPEZAR UNA PARTIDA NUEVA. (Saltar también sirve.)
    if (this.state === 'title') {
      this.time += dt;
      this.particles.update(dt);
      if (justPressed('confirm') || justPressed('jump')) {
        this.reset(); // mundo fresco -> a jugar (reset deja el estado en 'playing')
        sfx.relic();
      }
      return;
    }

    // Pantallas de fin (ganaste o game over): una tecla vuelve al menú de
    // inicio, que es el "hub" desde donde se arranca cada partida.
    if (this.state === 'won' || this.state === 'gameover') {
      this.time += dt;
      this.particles.update(dt);
      for (const p of this.popups) {
        p.y -= 16 * dt;
        p.life -= dt;
      }
      this.popups = this.popups.filter((p) => p.life > 0);
      if (justPressed('confirm') || justPressed('restart') || justPressed('jump')) {
        this.state = 'title';
      }
      return;
    }

    // Reinicio rápido durante la partida (tecla R): mundo nuevo, a jugar.
    if (justPressed('restart')) {
      this.reset();
      return;
    }

    // Pausa (Esc/P): congela TODO —incluida la muerte en curso— y muestra el
    // overlay. Volver a pulsar reanuda exactamente donde estaba.
    if (justPressed('pause')) {
      this.paused = !this.paused;
    }
    if (this.paused) return;

    // Hit-stop: tras un golpe mortal, el mundo entero queda clavado
    // un instante. Al soltarse llegan el respawn y la sacudida.
    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      if (this.freezeTimer <= 0 && this.deadFrozen) {
        this.deadFrozen = false;
        if (this.pendingReset) {
          this.pendingReset = false;
          this.state = 'gameover'; // sin corazones: a la pantalla de game over
          this.endRun(false);
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

    // A partir de acá el estado siempre es 'playing' (los demás retornaron).
    this.time += dt;
    this.runTime += dt; // el cronómetro solo corre mientras se juega de verdad
    this.announceTimer = Math.max(0, this.announceTimer - dt);
    this.particles.update(dt);
    for (const p of this.popups) {
      p.y -= 16 * dt;
      p.life -= dt;
    }
    this.popups = this.popups.filter((p) => p.life > 0);

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
        // Es pisotón si venís cayendo y tus pies estaban por ENCIMA del
        // enemigo el frame anterior (robusto para enemigos altos y que
        // cabecean, como el jefe). Si no, es un golpe de costado.
        const feetY = pbox.y + pbox.h;
        const prevFeetY = feetY - this.player.vy * dt;
        const stomped = e.stompable && this.player.vy > 0 && prevFeetY <= eb.y + 4;
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
      this.endRun(true);
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
      // Puntos por monstruo eliminado, con "+N" flotante.
      const pts = e.isBoss ? 100 : 10;
      this.score += pts;
      this.popups.push({ x: eb.x + eb.w / 2, y: eb.y - 2, text: '+' + pts, life: 0.9 });
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

  /** Cierre de una corrida (ganaste o game over): actualiza los récords
   *  persistidos y marca si batiste el mejor puntaje. */
  private endRun(won: boolean): void {
    this.newRecord = this.score > this.save.bestScore;
    if (this.newRecord) this.save.bestScore = this.score;
    if (won) {
      this.save.victories++;
      // Mejor tiempo: solo cuenta al ganar. El primer completado siempre
      // es récord (bestTime arranca en 0 = "sin marca").
      this.newBestTime = this.save.bestTime === 0 || this.runTime < this.save.bestTime;
      if (this.newBestTime) this.save.bestTime = this.runTime;
    }
    writeSave(this.save);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const camX = this.camera.x;
    const camY = this.camera.y;
    const room = this.world.current;
    const biome = room.def.biome;

    drawBackground(
      ctx, camX, camY, this.viewW, this.viewH, room.level.widthPx,
      hashId(room.def.id), this.time, biome,
    );

    room.level.draw(ctx, camX, camY, this.viewW, this.viewH, biome);
    this.drawDoor(ctx, camX, camY);
    this.drawCrystals(ctx, camX, camY);
    this.drawRelics(ctx, camX, camY);
    for (const e of room.enemies) {
      if (!e.dead) e.draw(ctx, camX, camY);
    }
    this.player.draw(ctx, camX, camY);
    this.particles.draw(ctx, camX, camY);
    this.drawPopups(ctx, camX, camY);

    drawFog(ctx, camX, this.viewW, this.viewH, this.time, biome);
    drawDust(ctx, this.viewW, this.viewH, this.time, 1 / 60);
    drawVignette(ctx, this.viewW, this.viewH);

    // El HUD (corazones, contador, minimapa) solo mientras se juega o al ganar.
    if (this.state !== 'title') {
      this.drawHud(ctx);
      this.drawMinimap(ctx);
    }
    if (this.state === 'won') this.drawWin(ctx);
    if (this.state === 'title') this.drawTitle(ctx);
    if (this.state === 'gameover') this.drawGameOver(ctx);
    if (this.state === 'playing' && this.paused) this.drawPause(ctx);
  }

  /** Overlay de pausa: la partida queda congelada detrás. Texto a opacidad
   *  plena (el tiempo no avanza en pausa, así que un parpadeo quedaría
   *  clavado). Recuerda cómo seguir, reiniciar o volver al menú. */
  private drawPause(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(17,9,26,0.68)';
    ctx.fillRect(0, 0, this.viewW, this.viewH);
    const cx = this.viewW / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e9d6ff';
    ctx.font = '18px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText('PAUSA', cx, this.viewH / 2 - 10);
    const dev = inputDevice();
    const gp = dev === 'gamepad';
    const touch = dev === 'touch';
    ctx.fillStyle = '#9b86c4';
    ctx.font = '8px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText(
      touch ? 'tocá continuar o reiniciar' : gp ? 'START para continuar' : 'ESC o P para continuar',
      cx,
      this.viewH / 2 + 8,
    );
    if (!touch) {
      ctx.fillStyle = '#6f5a94';
      ctx.fillText(gp ? 'Y para reiniciar' : 'R para reiniciar', cx, this.viewH / 2 + 20);
    }
    ctx.textAlign = 'left';
  }

  /** Minimapa (arriba a la derecha): las salas se revelan al visitarlas. */
  private drawMinimap(ctx: CanvasRenderingContext2D): void {
    const cellW = 12;
    const cellH = 8;
    const gap = 2;
    const rooms = this.world.allRooms;
    const maxX = Math.max(...rooms.map((r) => r.def.mapPos.x));
    // En táctil dejamos libre la esquina superior derecha (ahí va el botón
    // de pausa en pantalla), así que corremos el minimapa más a la izquierda.
    const inset = isTouchMode() ? 44 : 6;
    const baseX = this.viewW - inset - ((maxX + 1) * cellW + maxX * gap);
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
    const frames = [sprites.crystal, sprites.crystal2, sprites.crystal3, sprites.crystal4];
    for (const c of this.world.current.crystals) {
      if (c.taken) continue;
      const bob = Math.sin(this.time * 3 + c.x) * 1.5;
      const cx = c.x + 3 - camX;
      const cy = c.y + 4 - camY + bob;
      // Halo pulsante
      const pulse = 0.45 + Math.sin(this.time * 4 + c.x) * 0.15;
      drawGlow(ctx, cx, cy, 12, '#ffe25a', pulse);
      // Cristal con destello que barre las facetas (offset por posición)
      const spr = frames[Math.floor(this.time * 7 + c.x * 0.5) % 4];
      spr.draw(ctx, cx - spr.w / 2, cy - spr.h / 2);
      // Twinkle: una estrellita que centellea de a ratos, arriba a la derecha
      if ((this.time * 1.6 + c.x * 0.7) % 2.2 < 0.2) {
        const sx = Math.round(cx + 4);
        const sy = Math.round(cy - 4);
        ctx.fillStyle = '#fff7c9';
        ctx.fillRect(sx, sy - 1, 1, 3);
        ctx.fillRect(sx - 1, sy, 3, 1);
      }
    }
  }

  private drawRelics(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (const r of this.world.current.relics) {
      if (r.taken) continue;
      const bob = Math.sin(this.time * 2.2 + r.x) * 2;
      const cx = r.x + 3 - camX;
      const cy = r.y + 4 - camY + bob;
      const shine = Math.sin(this.time * 5 + r.x);
      drawGlow(ctx, cx, cy, 15, ABILITY_GLOW[r.ability], 0.5 + shine * 0.2);
      // Respira luz: en el pico del pulso, el orbe se enciende (frame 2)
      const spr = shine > 0.3 ? sprites.relic2 : sprites.relic;
      spr.draw(ctx, cx - spr.w / 2, cy - spr.h / 2);
    }
  }

  private drawDoor(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const d = this.world.current.level.doorBox;
    if (!d) return; // esta sala no tiene puerta
    const open = this.collected === this.totalCrystals && !this.bossAlive;
    // Abierta: las runas laten alternando dos frames.
    const openSprite = Math.sin(this.time * 4) > 0 ? sprites.doorOpen2 : sprites.doorOpen;
    const sprite = open ? openSprite : sprites.doorLocked;
    const floorY = d.y - 2 + 8; // base de la puerta sobre el piso
    const drawX = d.x + 4 - sprite.w / 2;
    const drawY = floorY - sprite.h;
    if (open) {
      const pulse = 0.4 + Math.sin(this.time * 3) * 0.15;
      drawGlow(ctx, d.x + 4 - camX, drawY + sprite.h / 2 - camY, 22, '#b98bff', pulse);
    }
    sprite.draw(ctx, drawX - camX, drawY - camY);
  }

  /** Textos flotantes "+N" que suben y se desvanecen. */
  private drawPopups(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '8px "JetBrains Mono", ui-monospace, monospace';
    for (const p of this.popups) {
      ctx.globalAlpha = Math.min(1, p.life * 2.5);
      ctx.fillStyle = '#ffe25a';
      ctx.fillText(p.text, Math.round(p.x - camX), Math.round(p.y - camY));
    }
    ctx.restore();
    ctx.textAlign = 'left';
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    // Corazones de vida (arriba a la izquierda)
    for (let i = 0; i < this.player.maxHealth; i++) {
      const heart = i < this.player.health ? sprites.heartFull : sprites.heartEmpty;
      heart.draw(ctx, 6 + i * 8, 6);
    }
    // Contador de cristales y puntos, debajo de los corazones
    ctx.font = '8px "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffe25a';
    ctx.fillText(`CRISTALES ${this.collected}/${this.totalCrystals}`, 6, 15);
    ctx.fillStyle = '#9b86c4';
    ctx.fillText(`PUNTOS ${this.score}`, 6, 24);
    // Cronómetro de la partida, arriba al centro (estilo speedrun).
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c7b8e6';
    ctx.fillText(formatTime(this.runTime), this.viewW / 2, 6);
    ctx.textAlign = 'left';
    if (this.collected === this.totalCrystals && this.state === 'playing') {
      if (this.bossAlive) {
        ctx.fillStyle = '#ff5a7a';
        ctx.fillText('SALTA SOBRE EL GUARDIÁN', 6, 33);
      } else {
        ctx.fillStyle = '#b98bff';
        ctx.fillText('LA PUERTA ESTÁ ABIERTA', 6, 33);
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
    const cx = this.viewW / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd36e';
    ctx.font = '16px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText('¡LO LOGRASTE!', cx, this.viewH / 2 - 30);
    ctx.font = '8px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = '#ffe25a';
    ctx.fillText(`PUNTOS: ${this.score}`, cx, this.viewH / 2 - 14);
    ctx.fillStyle = '#7ce0ff';
    ctx.fillText(`TIEMPO: ${formatTime(this.runTime)}`, cx, this.viewH / 2 - 3);
    // Récord de tiempo (la métrica de speedrun): si lo batiste, celebración
    // pulsante; si no, tu mejor marca para comparar.
    if (this.newBestTime) {
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(this.time * 8) * 0.4;
      ctx.fillStyle = '#ffe25a';
      ctx.fillText('¡NUEVO RÉCORD DE TIEMPO!', cx, this.viewH / 2 + 9);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffd36e';
      ctx.fillText(`MEJOR TIEMPO: ${formatTime(this.save.bestTime)}`, cx, this.viewH / 2 + 9);
    }
    ctx.fillStyle = '#9b86c4';
    ctx.fillText(this.backToMenuText(), cx, this.viewH / 2 + 22);
    ctx.textAlign = 'left';
  }

  /** El texto para volver al menú, según teclado, gamepad o táctil. */
  private backToMenuText(): string {
    const dev = inputDevice();
    if (dev === 'touch') return 'tocá para volver al menú';
    return dev === 'gamepad' ? 'botón A para volver al menú' : 'ENTER para volver al menú';
  }

  /** Línea de récord bajo el puntaje: si batiste tu marca, un "¡NUEVO
   *  RÉCORD!" pulsante; si no, tu mejor puntaje para comparar. */
  private drawRecordLine(ctx: CanvasRenderingContext2D, cx: number, y: number): void {
    ctx.font = '8px "JetBrains Mono", ui-monospace, monospace';
    if (this.newRecord) {
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(this.time * 8) * 0.4;
      ctx.fillStyle = '#ffe25a';
      ctx.fillText('¡NUEVO RÉCORD!', cx, y);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffd36e';
      ctx.fillText(`MEJOR: ${this.save.bestScore}`, cx, y);
    }
  }

  /** Menú de inicio: el título del juego sobre el mundo, con un cristal
   *  que flota y un aviso pulsante para empezar. */
  private drawTitle(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(17,9,26,0.72)';
    ctx.fillRect(0, 0, this.viewW, this.viewH);
    const cx = this.viewW / 2;

    // Un cristal grande flotando sobre el título, con su halo.
    const bob = Math.sin(this.time * 2) * 2;
    const frames = [sprites.crystal, sprites.crystal2, sprites.crystal3, sprites.crystal4];
    const spr = frames[Math.floor(this.time * 6) % 4];
    const cy = this.viewH / 2 - 44 + bob;
    drawGlow(ctx, cx, cy, 20, '#ffe25a', 0.5 + Math.sin(this.time * 4) * 0.15);
    // Cristal al doble de tamaño, centrado en (cx, cy).
    spr.drawStretched(ctx, cx, cy + spr.h, 2, 2);

    ctx.textAlign = 'center';
    // Título en dos líneas para que entre bien en 320px.
    ctx.fillStyle = '#e9d6ff';
    ctx.font = '18px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText('CRISTALES', cx, this.viewH / 2 - 8);
    ctx.fillStyle = '#b98bff';
    ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText('DE LA CUEVA', cx, this.viewH / 2 + 8);

    // Récords guardados (solo si ya jugaste alguna vez).
    ctx.font = '8px "JetBrains Mono", ui-monospace, monospace';
    if (this.save.bestScore > 0 || this.save.victories > 0) {
      ctx.fillStyle = '#ffd36e';
      ctx.fillText(`MEJOR PUNTAJE: ${this.save.bestScore}`, cx, this.viewH / 2 + 20);
      if (this.save.bestTime > 0) {
        ctx.fillStyle = '#7ce0ff';
        ctx.fillText(`MEJOR TIEMPO: ${formatTime(this.save.bestTime)}`, cx, this.viewH / 2 + 30);
      }
      if (this.save.victories > 0) {
        ctx.fillStyle = '#5ce06a';
        const veces = this.save.victories === 1 ? 'vez' : 'veces';
        ctx.fillText(`completado ${this.save.victories} ${veces}`, cx, this.viewH / 2 + 40);
      }
    }

    // Aviso pulsante para empezar (parpadeo suave con seno). Los textos
    // se adaptan al último dispositivo usado (teclado o gamepad).
    const dev = inputDevice();
    const gp = dev === 'gamepad';
    const touch = dev === 'touch';
    const blink = 0.55 + Math.sin(this.time * 4) * 0.45;
    ctx.globalAlpha = blink;
    ctx.fillStyle = '#ffe25a';
    ctx.fillText(
      touch ? 'TOCA PARA EMPEZAR' : gp ? 'botón A o START para empezar' : 'ENTER o ↑ para empezar',
      cx,
      this.viewH / 2 + 54,
    );
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#6f5a94';
    ctx.fillText(
      touch ? 'usá los botones en pantalla' : gp ? 'D-pad mover · A saltar · X dash' : '← → mover · ↑ saltar · X dash',
      cx,
      this.viewH - 12,
    );
    ctx.textAlign = 'left';
  }

  /** Pantalla de game over: el mundo congelado tras la muerte, oscurecido,
   *  con el puntaje logrado y el aviso para reintentar. */
  private drawGameOver(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(26,6,10,0.8)';
    ctx.fillRect(0, 0, this.viewW, this.viewH);
    const cx = this.viewW / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5a7a';
    ctx.font = '18px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText('GAME OVER', cx, this.viewH / 2 - 20);
    ctx.fillStyle = '#ffd0dc';
    ctx.font = '8px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText(`PUNTOS: ${this.score}`, cx, this.viewH / 2 - 4);
    this.drawRecordLine(ctx, cx, this.viewH / 2 + 8);
    const blink = 0.55 + Math.sin(this.time * 4) * 0.45;
    ctx.globalAlpha = blink;
    ctx.fillStyle = '#9b86c4';
    ctx.fillText(this.backToMenuText(), cx, this.viewH / 2 + 22);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}
