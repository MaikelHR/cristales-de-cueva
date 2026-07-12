// ============================================================
//  LA SESIÓN DE JUEGO (el estado de una corrida)
// ------------------------------------------------------------
//  Todo lo que una partida ES: el mundo, el jugador, la cámara,
//  el puntaje, el checkpoint, los récords. Acá no hay flujo de
//  pantallas (eso es de las escenas) ni reglas de contacto (eso
//  es de systems/): solo el estado y sus operaciones de ciclo de
//  vida (arrancar de cero, checkpoint, reaparecer, cerrar corrida).
// ============================================================

import { Camera } from './Camera';
import type { Clock } from './clock';
import { World } from './world/World';
import type { LevelDef } from './world/LevelData';
import { LEVELS } from './world/rooms';
import { Player } from './actors/Player';
import { Particles } from './effects/Particles';
import { Popups } from './effects/Popups';
import { initDust } from './art/atmosphere';
import { loadSave, recordRun, writeSave, type RunFlags, type SaveData } from './save';
import { ABILITY_NAMES } from './abilities';
import { sfx } from './sfx';

/** Cómo se juega un nivel: 'normal' o 'trial' (contrarreloj). */
export type GameMode = 'normal' | 'trial';

export class GameSession {
  /** Reloj global de animación: también avanza en los menús. */
  readonly clock: Clock = { t: 0 };
  world: World;
  player: Player;
  camera!: Camera; // la crea makeCamera()
  readonly particles = new Particles();
  readonly popups = new Popups();

  freezeTimer = 0;    // hit-stop: mundo congelado unos frames
  deadFrozen = false; // hay una muerte esperando el respawn
  pendingReset = false; // al soltar el freeze, ¿ir a game over?
  hitStop = 0;        // micro-pausa al pisar (impacto, sin muerte)
  score = 0;          // puntos por monstruos eliminados
  save: SaveData = loadSave(); // récords persistidos (localStorage)
  /** Qué marcas batió la última corrida (para celebrarlas en pantalla). */
  runFlags: RunFlags = { newBestScore: false, newBestTime: false, newBestTrial: false };
  runTime = 0;        // cronómetro de la partida actual (segundos)
  /** El nivel que se está jugando (o el que se ve de fondo en el menú). */
  level: LevelDef = LEVELS[0];
  /** Modo de la corrida: normal o contrarreloj. */
  mode: GameMode = 'normal';
  // Checkpoint: la sala y el punto donde reaparecés al morir.
  checkpoint = { roomId: '', x: 0, y: 0 };
  // Salas ya exploradas: son las que muestra el minimapa.
  visited = new Set<string>();
  // Aviso grande en pantalla (al ganar una habilidad, al matar al jefe).
  announceText = '';
  announceTimer = 0;

  constructor(
    readonly viewW: number,
    readonly viewH: number,
  ) {
    this.world = new World(this.clock, this.level.rooms);
    this.player = new Player(this.world.current.level, this.particles);
    this.spawnAtStart();
    this.saveCheckpoint();
    this.visited.add(this.world.current.data.id);
    this.makeCamera();
    initDust(viewW, viewH);
  }

  get time(): number {
    return this.clock.t;
  }

  /** Avanza el reloj global de animación. */
  tick(dt: number): void {
    this.clock.t += dt;
  }

  /** El latido de los menús y pantallas de fin: el mundo respira de
   *  fondo (reloj y partículas) sin que corra la lógica de juego. */
  ambientUpdate(dt: number, includePopups = false): void {
    this.tick(dt);
    this.particles.update(dt);
    if (includePopups) this.popups.update(dt);
  }

  /** Coloca al jugador en el spawn de la sala inicial. */
  private spawnAtStart(): void {
    const spawn = this.world.current.playerSpawn ?? { x: 0, y: 0 };
    this.player.respawnAt(spawn.x + 1, spawn.y);
  }

  /** El punto actual del jugador pasa a ser su lugar de reaparición. */
  saveCheckpoint(): void {
    this.checkpoint = {
      roomId: this.world.current.data.id,
      x: this.player.x,
      y: this.player.y,
    };
  }

  /** La cámara se ajusta al tamaño de la sala actual. */
  makeCamera(): void {
    const level = this.world.current.level;
    this.camera = new Camera(this.viewW, this.viewH, level.widthPx, level.heightPx);
  }

  get collected(): number {
    return this.world.allCrystals.filter((c) => c.dead).length;
  }

  get totalCrystals(): number {
    return this.world.allCrystals.length;
  }

  /** ¿Queda algún jefe vivo en el mundo? Bloquea la puerta. */
  get bossAlive(): boolean {
    return this.world.allRooms.some((r) => r.enemies.some((e) => e.isBoss && !e.dead));
  }

  /** ¿La puerta está abierta? (todos los cristales y ningún jefe vivo). */
  get doorOpen(): boolean {
    return this.collected === this.totalCrystals && !this.bossAlive;
  }

  /** Arranca una corrida del nivel dado en el modo dado. */
  startLevel(level: LevelDef, mode: GameMode): void {
    this.level = level;
    this.mode = mode;
    this.reset();
  }

  /** Empezar la corrida de cero (mismo nivel y modo): salas frescas,
   *  habilidades de arranque del nivel, corazones al máximo. */
  reset(): void {
    this.world = new World(this.clock, this.level.rooms);
    this.player.setLevel(this.world.current.level);
    this.spawnAtStart();
    this.player.health = this.player.maxHealth; // corazones al máximo
    this.pendingReset = false;
    this.saveCheckpoint();
    this.visited = new Set([this.world.current.data.id]);
    // Se apagan las habilidades y se prenden solo las que el nivel
    // trae de fábrica (las "ya aprendidas" en niveles anteriores).
    for (const key of ABILITY_NAMES) {
      this.player.abilities[key] = this.level.startAbilities.includes(key);
    }
    this.announceTimer = 0;
    this.score = 0;
    this.runFlags = { newBestScore: false, newBestTime: false, newBestTrial: false };
    this.runTime = 0;
    this.popups.clear();
    this.particles.clear();
    this.makeCamera();
    this.freezeTimer = 0;
    this.deadFrozen = false;
    this.hitStop = 0;
  }

  /** Volver al último checkpoint tras morir. */
  respawnPlayer(): void {
    this.world.goTo(this.checkpoint.roomId);
    this.player.setLevel(this.world.current.level);
    this.player.respawnAt(this.checkpoint.x, this.checkpoint.y);
    this.makeCamera();
  }

  /** Muestra el aviso grande en pantalla (se desvanece solo). */
  announce(text: string): void {
    this.announceText = text;
    this.announceTimer = 2.5;
  }

  /** Caer a un foso: cuesta un corazón y reaparece en el checkpoint
   *  (con hit-stop). Sin corazones, la muerte lleva a game over. */
  loseLifeAndRespawn(): void {
    if (this.deadFrozen) return;
    this.player.health--;
    this.freezeTimer = 0.26;
    this.deadFrozen = true;
    if (this.player.health <= 0) this.pendingReset = true;
    sfx.die();
  }

  /** Sin corazones: congela un instante y después, game over. */
  gameOver(): void {
    this.freezeTimer = 0.4;
    this.deadFrozen = true;
    this.pendingReset = true;
    sfx.die();
  }

  /** Cierre de una corrida (ganaste o game over): vuelca el resultado
   *  sobre los récords del nivel y los persiste. */
  endRun(won: boolean): void {
    this.runFlags = recordRun(this.save, this.level.id, {
      won,
      mode: this.mode,
      score: this.score,
      time: this.runTime,
    });
    writeSave(this.save);
  }
}
