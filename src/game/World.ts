// ============================================================
//  EL MUNDO (las salas y sus conexiones)
// ------------------------------------------------------------
//  Cada sala tiene su Level (los tiles) y su estado vivo: enemigos
//  y cristales. El estado persiste al salir y volver: un cristal
//  recogido sigue recogido. La transición ocurre cuando el CENTRO
//  del jugador cruza un borde que tiene salida definida.
// ============================================================

import { Level, type AbilityName } from './Level';
import type { Enemy } from './entities/Enemy';
import { Slime } from './entities/Slime';
import { Flyer } from './entities/Flyer';
import { Chaser } from './entities/Chaser';
import { Boss } from './entities/Boss';
import { Spore } from './entities/Spore';
import { Fundidor } from './entities/Fundidor';
import { Player } from './Player';
import { ROOMS } from './rooms';
import { exitId, exitRequires, type Exit, type RoomDef } from './rooms/RoomDef';
import { clamp } from '../engine/canvas';

export interface Crystal {
  x: number;
  y: number;
  taken: boolean;
}

export interface Relic {
  x: number;
  y: number;
  ability: AbilityName;
  taken: boolean;
}

export class Room {
  readonly level: Level;
  readonly enemies: Enemy[];
  readonly crystals: Crystal[];
  readonly relics: Relic[];

  constructor(readonly def: RoomDef) {
    this.level = new Level(def.map);
    this.enemies = this.level.enemyCells.map((c) => {
      switch (c.kind) {
        case 'flyer':
          return new Flyer(c.x, c.y, this.level);
        case 'chaser':
          return new Chaser(c.x, c.y, this.level);
        case 'boss':
          return new Boss(c.x, c.y, this.level);
        case 'spore':
          return new Spore(c.x, c.y, this.level);
        case 'fundidor':
          return new Fundidor(c.x, c.y, this.level);
        default:
          return new Slime(c.x, c.y, this.level);
      }
    });
    this.crystals = this.level.crystalCells.map((c) => ({
      x: c.x + 1,
      y: c.y + 1,
      taken: false,
    }));
    this.relics = this.level.relicCells.map((c) => ({
      x: c.x + 1,
      y: c.y + 1,
      ability: c.ability,
      taken: false,
    }));
  }
}

export class World {
  private rooms = new Map<string, Room>();
  current: Room;

  constructor() {
    for (const def of ROOMS) this.rooms.set(def.id, new Room(def));
    this.current = this.get(ROOMS[0].id);
  }

  get(id: string): Room {
    const room = this.rooms.get(id);
    if (!room) throw new Error(`No existe la sala "${id}"`);
    return room;
  }

  /** ¿Existe una sala con este id? (para validar checkpoints guardados). */
  hasRoom(id: string): boolean {
    return this.rooms.has(id);
  }

  goTo(id: string): void {
    this.current = this.get(id);
  }

  /** Volver a la sala donde arranca el juego. */
  goToStart(): void {
    this.current = this.get(ROOMS[0].id);
  }

  /** Todos los cristales del mundo, para el contador global. */
  get allCrystals(): Crystal[] {
    return [...this.rooms.values()].flatMap((r) => r.crystals);
  }

  /** Todas las salas (para el minimapa). */
  get allRooms(): Room[] {
    return [...this.rooms.values()];
  }

  /**
   * Si el centro del jugador cruzó un borde con salida, cambia de
   * sala y lo recoloca asomando por el borde opuesto de la nueva.
   * goTo() reasigna this.current ANTES de recolocar, así widthPx/heightPx
   * ya son los del destino. En cada rama clampeamos el EJE QUE SE
   * CONSERVA (salas de distinto alto/ancho): sin clamp el jugador queda
   * incrustado en una pared o cae al vacío al cruzar.
   * Devuelve true si hubo transición.
   */
  tryTransition(player: Player): boolean {
    const exits = this.current.def.exits;
    const centerX = player.x + player.w / 2;
    const centerY = player.y + player.h / 2;

    // Un gate de habilidad (Exit.requires) se APLICA en runtime: sin la
    // habilidad no se cruza (además del abismo/viento que lo refuerza
    // geométricamente). Esto garantiza el gate aunque la geometría tenga un
    // atajo (p. ej. escalar la pared del borde con wall-jump). El fixpoint del
    // harness modela exactamente esta regla.
    const canCross = (e: Exit): boolean => {
      const req = exitRequires(e);
      return !req || player.abilities[req];
    };

    if (exits?.right && centerX > this.current.level.widthPx && canCross(exits.right)) {
      this.goTo(exitId(exits.right));
      player.x = 1 - player.w / 2;
      player.y = clamp(player.y, 0, this.current.level.heightPx - player.h);
      return true;
    }
    if (exits?.left && centerX < 0 && canCross(exits.left)) {
      this.goTo(exitId(exits.left));
      player.x = this.current.level.widthPx - 1 - player.w / 2;
      player.y = clamp(player.y, 0, this.current.level.heightPx - player.h);
      return true;
    }
    if (exits?.down && centerY > this.current.level.heightPx && canCross(exits.down)) {
      this.goTo(exitId(exits.down));
      player.y = 1; // apenas dentro del borde SUPERIOR de la nueva sala
      player.x = clamp(player.x, 0, this.current.level.widthPx - player.w);
      return true; // conserva vy: que siga cayendo
    }
    if (exits?.up && centerY < 0 && canCross(exits.up)) {
      this.goTo(exitId(exits.up));
      // Pies APENAS dentro del borde inferior (no asomando por debajo, o el
      // jugador quedaría fuera de la sala y caería al vacío). Conservamos el
      // impulso ascendente para que siga entrando (con viento/planeo, sube).
      player.y = this.current.level.heightPx - player.h - 1;
      player.x = clamp(player.x, 0, this.current.level.widthPx - player.w);
      if (player.vy > -60) player.vy = -60; // garantiza un mínimo de subida al cruzar
      return true;
    }

    // Gate CERRADO: si el jugador cruzó un borde pero la salida pide una
    // habilidad que no tiene, lo frenamos en el borde (como si fuera pared) para
    // que no se vaya fuera de la sala por el hueco abierto de la salida.
    if (exits?.right && centerX > this.current.level.widthPx && !canCross(exits.right))
      player.x = this.current.level.widthPx - player.w;
    if (exits?.left && centerX < 0 && !canCross(exits.left)) player.x = 0;
    if (exits?.down && centerY > this.current.level.heightPx && !canCross(exits.down))
      player.y = this.current.level.heightPx - player.h;
    if (exits?.up && centerY < 0 && !canCross(exits.up)) player.y = 0;
    return false;
  }
}
