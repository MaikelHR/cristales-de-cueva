// ============================================================
//  THE GAME SESSION (the state of one run)
// ------------------------------------------------------------
//  Everything a run IS: the world, the player, the camera,
//  the score, the checkpoint, the records. No screen flow here
//  (that's the scenes) and no contact rules (that's systems/):
//  just the state and its lifecycle operations (start from
//  scratch, checkpoint, respawn, close out the run).
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

/** How a level is played: 'normal' or 'trial' (time-trial). */
export type GameMode = 'normal' | 'trial';

export class GameSession {
  /** Global animation clock: also advances in the menus. */
  readonly clock: Clock = { t: 0 };
  world: World;
  player: Player;
  camera!: Camera; // created by makeCamera()
  readonly particles = new Particles();
  readonly popups = new Popups();

  freezeTimer = 0;    // hit-stop: world frozen for a few frames
  deadFrozen = false; // a death is waiting for the respawn
  pendingReset = false; // when the freeze lifts, go to game over?
  hitStop = 0;        // micro-pause on a stomp (impact, no death)
  score = 0;          // points for defeated monsters
  save: SaveData = loadSave(); // persisted records (localStorage)
  /** Which records the last run beat (to celebrate them on screen). */
  runFlags: RunFlags = { newBestScore: false, newBestTime: false, newBestTrial: false };
  runTime = 0;        // stopwatch of the current run (seconds)
  /** The level being played (or the one shown behind the menu). */
  level: LevelDef = LEVELS[0];
  /** Run mode: normal or time-trial. */
  mode: GameMode = 'normal';
  // Checkpoint: the room and spot where you respawn on death.
  checkpoint = { roomId: '', x: 0, y: 0 };
  // Rooms already explored: the ones the minimap shows.
  visited = new Set<string>();
  // Big on-screen notice (on gaining an ability, on killing the boss).
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

  /** Advances the global animation clock. */
  tick(dt: number): void {
    this.clock.t += dt;
  }

  /** The heartbeat of menus and end screens: the world breathes in
   *  the background (clock and particles) without running game logic. */
  ambientUpdate(dt: number, includePopups = false): void {
    this.tick(dt);
    this.particles.update(dt);
    if (includePopups) this.popups.update(dt);
  }

  /** Places the player at the starting room's spawn. */
  private spawnAtStart(): void {
    const spawn = this.world.current.playerSpawn ?? { x: 0, y: 0 };
    this.player.respawnAt(spawn.x + 1, spawn.y);
  }

  /** The player's current spot becomes their respawn point. */
  saveCheckpoint(): void {
    this.checkpoint = {
      roomId: this.world.current.data.id,
      x: this.player.x,
      y: this.player.y,
    };
  }

  /** The camera fits itself to the current room's size. */
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

  /** Is any boss still alive in the world? Keeps the door locked. */
  get bossAlive(): boolean {
    return this.world.allRooms.some((r) => r.enemies.some((e) => e.isBoss && !e.dead));
  }

  /** Is the door open? (all crystals collected and no boss alive). */
  get doorOpen(): boolean {
    return this.collected === this.totalCrystals && !this.bossAlive;
  }

  /** Starts a run of the given level in the given mode. */
  startLevel(level: LevelDef, mode: GameMode): void {
    this.level = level;
    this.mode = mode;
    this.reset();
  }

  /** Start the run from scratch (same level and mode): fresh rooms,
   *  the level's starting abilities, hearts at max. */
  reset(): void {
    this.world = new World(this.clock, this.level.rooms);
    this.player.setLevel(this.world.current.level);
    this.spawnAtStart();
    this.player.health = this.player.maxHealth; // hearts at max
    this.pendingReset = false;
    this.saveCheckpoint();
    this.visited = new Set([this.world.current.data.id]);
    // Turn all abilities off and enable only the ones the level
    // ships with (the ones "already learned" in earlier levels).
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

  /** Return to the last checkpoint after dying. */
  respawnPlayer(): void {
    this.world.goTo(this.checkpoint.roomId);
    this.player.setLevel(this.world.current.level);
    this.player.respawnAt(this.checkpoint.x, this.checkpoint.y);
    this.makeCamera();
  }

  /** Shows the big on-screen notice (it fades out on its own). */
  announce(text: string): void {
    this.announceText = text;
    this.announceTimer = 2.5;
  }

  /** Falling into a pit: costs a heart and respawns at the checkpoint
   *  (with hit-stop). With no hearts, the death leads to game over. */
  loseLifeAndRespawn(): void {
    if (this.deadFrozen) return;
    this.player.health--;
    this.freezeTimer = 0.26;
    this.deadFrozen = true;
    if (this.player.health <= 0) this.pendingReset = true;
    sfx.die();
  }

  /** No hearts left: freeze for a moment and then, game over. */
  gameOver(): void {
    this.freezeTimer = 0.4;
    this.deadFrozen = true;
    this.pendingReset = true;
    sfx.die();
  }

  /** Closing out a run (won or game over): folds the result into the
   *  level's records and persists them. */
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
