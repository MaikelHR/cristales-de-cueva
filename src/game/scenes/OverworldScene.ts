// ============================================================
//  SCENE: OVERWORLD (the level map, Mario-style)
// ------------------------------------------------------------
//  A 10-node path through the grotto; the character WALKS from
//  node to node (left/right) and enters the level with jump/
//  confirm. Completing a level unlocks the next; for now there
//  are 3 real levels and the other nodes wait ('???').
//  Over an already-completed level, entering opens the mode
//  chooser: NORMAL or TIME-TRIAL (left/right + confirm).
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

const WALK_SPEED = 70; // px/s of the character along the path

// The last node stepped on persists while the tab lives: coming back
// from a level, the character stays standing where you left it.
let lastNode = 0;

export class OverworldScene implements Scene {
  readonly ui: UiState = { state: 'overworld', paused: false };

  /** Current node (where it stands or the one it walked out of). */
  node: number;
  /** Destination node while walking; null = still. */
  private target: number | null = null;
  x: number;
  y: number;
  facing: 1 | -1 = 1;
  walkTime = 0;
  /** Seconds since it reached a node (for the "plop" on landing). */
  settleTime = 1;
  /** Mode chooser (only over already-completed levels). */
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

  /** The farthest steppable node: whatever the save has unlocked
   *  (never past the last level that actually exists). */
  get maxNode(): number {
    const ids = LEVELS.map((l) => l.id);
    return Math.min(unlockedLevels(this.session.save, ids), LEVELS.length) - 1;
  }

  /** Is it walking between nodes? (picks the sprite and silences input) */
  get walking(): boolean {
    return this.target !== null;
  }

  update(dt: number): void {
    this.session.ambientUpdate(dt); // the shared clock keeps ticking
    this.settleTime += dt;

    // --- Walking: advance toward the destination node ---
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
        this.settleTime = 0; // just landed: the drawing squashes it a touch
      } else {
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
        this.facing = dx >= 0 ? 1 : -1;
      }
      return; // while walking no other input is processed
    }

    // --- Mode chooser ---
    if (this.choosing) {
      if (justPressed('left') || justPressed('right')) {
        this.choice = this.choice === 'normal' ? 'trial' : 'normal';
        sfx.pickup();
      }
      if (justPressed('confirm') || justPressed('jump')) {
        this.enterLevel(this.choice);
      } else if (justPressed('pause')) {
        this.choosing = false; // cancel and return to the map
      }
      return;
    }

    // --- Standing on a node ---
    if (justPressed('right') && this.node < this.maxNode) {
      this.target = this.node + 1;
      this.walkTime = 0;
      this.facing = 1;
    } else if (justPressed('left') && this.node > 0) {
      this.target = this.node - 1;
      this.walkTime = 0;
      this.facing = -1;
    } else if (justPressed('confirm') || justPressed('jump')) {
      // Already-completed level: pick the mode; otherwise straight to play.
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
