// ============================================================
//  ESCENA: OVERWORLD (el mapa de niveles, estilo Mario)
// ------------------------------------------------------------
//  Un sendero de 10 nodos por la gruta; el personaje CAMINA de
//  nodo en nodo (izquierda/derecha) y entra al nivel con saltar/
//  confirmar. Completar un nivel desbloquea el siguiente; por
//  ahora hay 3 niveles reales y los demás nodos esperan ('???').
//  Sobre un nivel ya completado, entrar abre el elegidor de modo:
//  NORMAL o CONTRARRELOJ (izquierda/derecha + confirmar).
// ============================================================

import { justPressed } from '../../engine/input';
import type { GameSession, GameMode } from '../session';
import { LEVELS } from '../world/rooms';
import { levelRecord, unlockedLevels } from '../save';
import { drawOverworld, OW_NODES } from '../ui/overworld';
import { sfx } from '../sfx';
import type { Scene, SceneManager, UiState } from './Scene';
import { GameplayScene } from './GameplayScene';
import { TitleScene } from './TitleScene';

const WALK_SPEED = 70; // px/s del personaje por el sendero

// El último nodo pisado persiste mientras viva la pestaña: al volver
// de un nivel, el personaje sigue parado donde lo dejaste.
let lastNode = 0;

export class OverworldScene implements Scene {
  readonly ui: UiState = { state: 'overworld', paused: false };

  /** Nodo actual (donde está parado o del que salió caminando). */
  node: number;
  /** Nodo destino mientras camina; null = quieto. */
  private target: number | null = null;
  x: number;
  y: number;
  facing: 1 | -1 = 1;
  walkTime = 0;
  /** Elegidor de modo (solo sobre niveles ya completados). */
  choosing = false;
  choice: GameMode = 'normal';

  constructor(
    private session: GameSession,
    private scenes: SceneManager,
  ) {
    this.node = Math.min(lastNode, this.maxNode);
    this.x = OW_NODES[this.node].x;
    this.y = OW_NODES[this.node].y;
  }

  /** El nodo pisable más lejano: lo que el guardado tenga desbloqueado
   *  (nunca más allá del último nivel que existe de verdad). */
  get maxNode(): number {
    const ids = LEVELS.map((l) => l.id);
    return Math.min(unlockedLevels(this.session.save, ids), LEVELS.length) - 1;
  }

  /** ¿Está caminando entre nodos? (elige el sprite y silencia la entrada) */
  get walking(): boolean {
    return this.target !== null;
  }

  update(dt: number): void {
    this.session.ambientUpdate(dt); // el reloj compartido sigue latiendo

    // --- Caminando: avanzar hacia el nodo destino ---
    if (this.target !== null) {
      const dest = OW_NODES[this.target];
      const dx = dest.x - this.x;
      const dy = dest.y - this.y;
      const dist = Math.hypot(dx, dy);
      const step = WALK_SPEED * dt;
      this.walkTime += dt;
      if (dist <= step) {
        this.x = dest.x;
        this.y = dest.y;
        this.node = this.target;
        this.target = null;
        lastNode = this.node;
      } else {
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
        this.facing = dx >= 0 ? 1 : -1;
      }
      return; // mientras camina no se procesa otra entrada
    }

    // --- Elegidor de modo ---
    if (this.choosing) {
      if (justPressed('left') || justPressed('right')) {
        this.choice = this.choice === 'normal' ? 'trial' : 'normal';
        sfx.pickup();
      }
      if (justPressed('confirm') || justPressed('jump')) {
        this.enterLevel(this.choice);
      } else if (justPressed('pause')) {
        this.choosing = false; // cancelar y volver al mapa
      }
      return;
    }

    // --- Parado en un nodo ---
    if (justPressed('right') && this.node < this.maxNode) {
      this.target = this.node + 1;
      this.walkTime = 0;
      this.facing = 1;
    } else if (justPressed('left') && this.node > 0) {
      this.target = this.node - 1;
      this.walkTime = 0;
      this.facing = -1;
    } else if (justPressed('confirm') || justPressed('jump')) {
      // Nivel ya completado: se elige el modo; si no, directo a jugar.
      const completed = levelRecord(this.session.save, LEVELS[this.node].id).completions > 0;
      if (completed) {
        this.choosing = true;
        this.choice = 'normal';
        sfx.pickup();
      } else {
        this.enterLevel('normal');
      }
    } else if (justPressed('pause')) {
      this.scenes.replace(new TitleScene(this.session, this.scenes));
    }
  }

  private enterLevel(mode: GameMode): void {
    lastNode = this.node;
    this.session.startLevel(LEVELS[this.node], mode);
    this.scenes.replace(new GameplayScene(this.session, this.scenes));
    sfx.relic();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawOverworld(ctx, this.session, this);
  }
}
