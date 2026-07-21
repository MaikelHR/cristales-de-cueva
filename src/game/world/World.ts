// ============================================================
//  THE WORLD (the rooms of ONE LEVEL and their connections)
// ------------------------------------------------------------
//  Builds the level's rooms when creating the run and knows how to
//  move between them: the transition happens when the player's CENTER
//  crosses an edge that has a defined exit.
// ============================================================

import type { Clock } from '../clock';
import type { Player } from '../actors/Player';
import type { Crystal } from '../actors/pickups/Crystal';
import { Room } from './Room';
import { validateRooms, type RoomData } from './RoomData';

export class World {
  private rooms = new Map<string, Room>();
  current: Room;

  constructor(clock: Clock, roomsData: RoomData[]) {
    // In development, a broken map warns loud and clear at startup.
    if (import.meta.env.DEV) {
      const problems = validateRooms(roomsData);
      if (problems.length > 0) throw new Error('Salas inválidas:\n' + problems.join('\n'));
    }
    for (const data of roomsData) this.rooms.set(data.id, new Room(data, clock));
    this.current = this.get(roomsData[0].id);
  }

  get(id: string): Room {
    const room = this.rooms.get(id);
    if (!room) throw new Error(`No existe la sala "${id}"`);
    return room;
  }

  goTo(id: string): void {
    this.current = this.get(id);
  }

  /** All the world's crystals, for the global counter. */
  get allCrystals(): Crystal[] {
    return [...this.rooms.values()].flatMap((r) => r.crystals);
  }

  /** All the rooms (for the progress bar). */
  get allRooms(): Room[] {
    return [...this.rooms.values()];
  }

  /**
   * If the player's center crossed an edge with an exit, switches
   * rooms and repositions them peeking in from the opposite edge of
   * the new one. Returns true if a transition happened.
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
