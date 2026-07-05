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
import { Player } from './Player';
import { ROOMS } from './rooms';
import type { RoomDef } from './rooms/RoomDef';

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
   * Devuelve true si hubo transición.
   */
  tryTransition(player: Player): boolean {
    const exits = this.current.def.exits;
    const centerX = player.x + player.w / 2;
    if (exits?.right && centerX > this.current.level.widthPx) {
      this.goTo(exits.right);
      player.x = 1 - player.w / 2;
      return true;
    }
    if (exits?.left && centerX < 0) {
      this.goTo(exits.left);
      player.x = this.current.level.widthPx - 1 - player.w / 2;
      return true;
    }
    return false;
  }
}
