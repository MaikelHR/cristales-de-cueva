// ============================================================
//  EL MUNDO (las salas y sus conexiones)
// ------------------------------------------------------------
//  Construye todas las salas al crear la corrida y sabe pasar de
//  una a otra: la transición ocurre cuando el CENTRO del jugador
//  cruza un borde que tiene salida definida.
// ============================================================

import type { Clock } from '../clock';
import type { Player } from '../actors/Player';
import type { Crystal } from '../actors/pickups/Crystal';
import { Room } from './Room';
import { ROOMS } from './rooms';
import { validateRooms } from './RoomData';

export class World {
  private rooms = new Map<string, Room>();
  current: Room;

  constructor(clock: Clock) {
    // En desarrollo, un mapa roto avisa fuerte y claro al arrancar.
    if (import.meta.env.DEV) {
      const problems = validateRooms(ROOMS);
      if (problems.length > 0) throw new Error('Salas inválidas:\n' + problems.join('\n'));
    }
    for (const data of ROOMS) this.rooms.set(data.id, new Room(data, clock));
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
    const exits = this.current.data.exits;
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
