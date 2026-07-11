// ============================================================
//  SALA — una RoomData hecha realidad
// ------------------------------------------------------------
//  Instancia la geometría (Level) y los actores (enemigos y
//  recogibles) a partir de los datos. El estado vive acá y
//  persiste al salir y volver durante la corrida: un cristal
//  recogido sigue recogido, un enemigo derrotado sigue muerto.
// ============================================================

import type { Box } from '../../engine/canvas';
import { Level, TILE } from './Level';
import type { Cell, RoomData } from './RoomData';
import type { Clock } from '../clock';
import type { Actor, Pickup } from '../actors/Actor';
import type { Enemy } from '../actors/enemies/Enemy';
import { Slime } from '../actors/enemies/Slime';
import { Flyer } from '../actors/enemies/Flyer';
import { Chaser } from '../actors/enemies/Chaser';
import { Boss } from '../actors/enemies/Boss';
import { Crystal } from '../actors/pickups/Crystal';
import { Relic } from '../actors/pickups/Relic';

export class Room {
  readonly level: Level;
  readonly actors: Actor[] = [];
  /** Dónde aparece el jugador (solo la sala inicial lo tiene). */
  readonly playerSpawn: Cell | null = null;
  /** La caja de la puerta (meta), si esta sala la tiene. */
  readonly doorBox: Box | null = null;

  constructor(readonly data: RoomData, clock: Clock) {
    this.level = new Level(data.tiles);
    for (const e of data.entities) {
      const px = e.x * TILE;
      const py = e.y * TILE;
      switch (e.type) {
        case 'slime':
          this.actors.push(new Slime(px, py, this.level));
          break;
        case 'flyer':
          this.actors.push(new Flyer(px, py, this.level));
          break;
        case 'chaser':
          this.actors.push(new Chaser(px, py, this.level));
          break;
        case 'boss':
          this.actors.push(new Boss(px, py));
          break;
        case 'crystal':
          this.actors.push(new Crystal(px + 1, py + 1, clock));
          break;
        case 'relic':
          this.actors.push(new Relic(px + 1, py + 1, e.ability, clock));
          break;
        case 'playerSpawn':
          this.playerSpawn = { x: px, y: py };
          break;
        case 'door':
          this.doorBox = { x: px, y: py + 2, w: TILE, h: TILE * 2 - 2 };
          break;
      }
    }
  }

  get enemies(): Enemy[] {
    return this.actors.filter((a): a is Enemy => a.layer === 'enemy');
  }

  get pickups(): Pickup[] {
    return this.actors.filter((a): a is Pickup => a.layer === 'pickup');
  }

  get crystals(): Crystal[] {
    return this.actors.filter((a): a is Crystal => a instanceof Crystal);
  }
}
