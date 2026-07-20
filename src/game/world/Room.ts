// ============================================================
//  ROOM — a RoomData brought to life
// ------------------------------------------------------------
//  Instantiates the geometry (Level) and the actors (enemies
//  and pickups) from the data. State lives here and persists
//  when you leave and come back during the run: a collected
//  crystal stays collected, a defeated enemy stays dead.
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
import { Spitter } from '../actors/enemies/Spitter';
import { Erizo } from '../actors/enemies/Erizo';
import { Geyser } from '../actors/enemies/Geyser';
import { Ariete } from '../actors/enemies/Ariete';
import { Custodio } from '../actors/enemies/Custodio';
import { Vigia } from '../actors/enemies/Vigia';
import { Topo } from '../actors/enemies/Topo';
import { Capataz } from '../actors/enemies/Capataz';
import { Medusa } from '../actors/Medusa';
import { Anguila } from '../actors/Anguila';
import { Ajolote } from '../actors/Ajolote';
import { Crystal } from '../actors/pickups/Crystal';
import { Relic } from '../actors/pickups/Relic';
import { Spring } from '../actors/devices/Spring';
import { MovingPlatform } from '../actors/devices/MovingPlatform';
import { BlinkPlatform } from '../actors/devices/Blink';
import { Crumble } from '../actors/devices/Crumble';
import { Vent } from '../actors/devices/Vent';
import { Corriente } from '../actors/Corriente';

export class Room {
  readonly level: Level;
  readonly actors: Actor[] = [];
  /** Where the player spawns (only the starting room has it). */
  readonly playerSpawn: Cell | null = null;
  /** The door (goal) box, if this room has one. */
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
        case 'spitter':
          this.actors.push(new Spitter(px, py, this.level));
          break;
        case 'erizo':
          this.actors.push(new Erizo(px, py, this.level));
          break;
        case 'geyser':
          this.actors.push(new Geyser(px, py, e.offset));
          break;
        case 'ariete':
          this.actors.push(new Ariete(px, py, this.level));
          break;
        case 'custodio':
          this.actors.push(new Custodio(px, py, this.level));
          break;
        case 'vigia':
          this.actors.push(new Vigia(px, py, this.level));
          break;
        case 'topo':
          this.actors.push(new Topo(px, py, this.level));
          break;
        case 'capataz':
          this.actors.push(new Capataz(px, py, this.level));
          break;
        case 'medusa':
          this.actors.push(new Medusa(px, py, e.range));
          break;
        case 'anguila':
          this.actors.push(new Anguila(px, py, e.axis, e.range, this.level));
          break;
        case 'ajolote':
          this.actors.push(new Ajolote(px, py));
          break;
        case 'corriente':
          this.actors.push(new Corriente(px, py, e.dir, e.length, clock));
          break;
        case 'crystal':
          this.actors.push(new Crystal(px + 1, py + 1, clock));
          break;
        case 'relic':
          this.actors.push(new Relic(px + 1, py + 1, e.ability, clock));
          break;
        case 'spring':
          this.actors.push(new Spring(px, py, clock));
          break;
        case 'platform':
          this.actors.push(new MovingPlatform(px, py, e.axis, e.range, e.speed));
          break;
        case 'blink':
          this.actors.push(new BlinkPlatform(px, py, e.offset));
          break;
        case 'crumble':
          this.actors.push(new Crumble(px, py));
          break;
        case 'vent':
          this.actors.push(new Vent(px, py, e.height, clock));
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

  get devices(): Actor[] {
    return this.actors.filter((a) => a.layer === 'device');
  }

  get crystals(): Crystal[] {
    return this.actors.filter((a): a is Crystal => a instanceof Crystal);
  }
}
