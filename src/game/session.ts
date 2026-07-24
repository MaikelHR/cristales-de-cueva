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
import { TILE } from './world/Level';
import type { LevelDef } from './world/LevelData';
import { LEVELS } from './world/rooms';
import { Player } from './actors/Player';
import { Particles } from './effects/Particles';
import { Popups } from './effects/Popups';
import { initDust } from './art/atmosphere';
import { loadSave, recordRun, writeSave, type RunFlags, type SaveData } from './save';
import { ABILITY_NAMES } from './abilities';
import type { LoreId } from './lore';
import { Glifo } from './actors/Glifo';
import { resetLorePlate } from './ui/lorePlate';
import { sfx } from './sfx';
import { debug } from './debug';

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
  // Checkpoint: the room mouth you last entered through (the fallback).
  checkpoint = { roomId: '', x: 0, y: 0 };
  // Last SAFE footing: where dying to a pit or spikes sends you back.
  // The gameplay step records it after a beat of stability on REAL grid
  // rock (a crumbling board, a moving slab or a one-way plank never
  // counts, and neither does the shrunken crawl — you re-spawn standing).
  lastSafe = { roomId: '', x: 0, y: 0, feetRow: 0 };
  safeTimer = 0; // seconds of continuous proven footing
  // Rooms already explored: the ones the progress bar marks done.
  visited = new Set<string>();
  // Big on-screen notice (on gaining an ability, on killing the boss).
  announceText = '';
  announceTimer = 0;
  /** The inscription the player is standing in front of right now, or
   *  null. Set every step by systems/lore.ts and read by the UI: the
   *  plate is a pure function of where you are, not a mode you enter,
   *  so there is no state to get stuck in. */
  readingLore: LoreId | null = null;
  /** Standing next to an inscription but not yet reading it. Drives the
   *  one-line cue that teaches the verb — without it, an inscription is
   *  a thing you walk past forever without learning it does anything. */
  loreNear = false;

  constructor(
    readonly viewW: number,
    readonly viewH: number,
  ) {
    this.world = new World(this.clock, this.level.rooms);
    this.syncLoreFromSave();
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

  /**
   * Lights every inscription this save has already read.
   *
   * A Glifo's `read` flag lives on the actor, and the actors are
   * rebuilt from scratch every time a run starts — so without this,
   * walking back into a level you have already read would show all its
   * plaques dark again while the Archive happily listed them. The lit
   * face IS the "which of these have I seen" signal across a level;
   * a signal that lies on the second visit is worse than none.
   */
  private syncLoreFromSave(): void {
    for (const room of this.world.allRooms) {
      for (const actor of room.actors) {
        if (actor instanceof Glifo) actor.read = this.save.lore.includes(actor.lore);
      }
    }
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
    // Crossing a mouth resets the safe footing to it: it's the last
    // firm ground this room has proven so far.
    this.lastSafe = { ...this.checkpoint, feetRow: this.playerFeetRow() };
    this.safeTimer = 0;
  }

  /** The grid row just under the player's feet. */
  private playerFeetRow(): number {
    return Math.floor((this.player.y + this.player.h + 1) / TILE);
  }

  /** The player has PROVEN this footing (stable, full-size, on grid
   *  rock): a pit or spike death brings them back here, not to the
   *  room's mouth. Called by the gameplay step. */
  rememberSafeSpot(): void {
    this.lastSafe = {
      roomId: this.world.current.data.id,
      x: this.player.x,
      y: this.player.y,
      feetRow: this.playerFeetRow(),
    };
  }

  /** Is the remembered footing still standable? (The rock under it may
   *  have been a cracked block the player later shattered.) */
  private safeSpotHolds(): boolean {
    const room = this.world.get(this.lastSafe.roomId);
    const c0 = Math.floor(this.lastSafe.x / TILE);
    const c1 = Math.floor((this.lastSafe.x + this.player.w) / TILE);
    for (let col = c0; col <= c1; col++) {
      if (room.level.solidCell(this.lastSafe.feetRow, col)) return true;
    }
    return false;
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

  /** Is a boss fight actually ON in the current room? Drives the boss
   *  music: a still-sleeping warden doesn't get its theme yet. */
  get bossEngaged(): boolean {
    return this.world.current.enemies.some(
      (e) => e.isBoss && !e.dead && e.engaged !== false,
    );
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
    this.syncLoreFromSave();
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
    this.readingLore = null;
    resetLorePlate();
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

  /** Return to the last SAFE footing after dying (pit, spikes) — the
   *  room's mouth only as a fallback, e.g. if the rock under that
   *  footing has since been shattered. */
  respawnPlayer(): void {
    const spot = this.safeSpotHolds() ? this.lastSafe : this.checkpoint;
    this.world.goTo(spot.roomId);
    this.player.setLevel(this.world.current.level);
    this.player.respawnAt(spot.x, spot.y);
    this.makeCamera();
  }

  /** DEV: back to safe ground with no heart taken and no hit-stop —
   *  what god mode does when you fall out of the world. Without it,
   *  "can't die" would mean "falls forever", which is worse than dying. */
  rescue(): void {
    this.respawnPlayer();
    this.player.vx = 0;
    this.player.vy = 0;
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
    if (import.meta.env.DEV && debug.god) return;
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
