// ============================================================
//  SCENES — the game's screen flow
// ------------------------------------------------------------
//  Each screen (title, gameplay, pause, victory, game over) is a
//  scene: it knows how to update and draw itself. The manager keeps
//  them in a STACK: only the top one updates, but they all draw
//  bottom to top. That's how "pause" is a scene stacked over
//  gameplay: it freezes it just by covering it.
//  Adding a new screen (options, map, dialogue) = a new scene;
//  nobody else needs to know.
// ============================================================

/** Observable state for the UI outside the canvas (touch controls,
 *  language selector): which screen shows and whether it's paused.
 *  'overworld' is the level map: navigated with the pad (the touch
 *  move/jump buttons show as if playing). */
export interface UiState {
  state: 'title' | 'overworld' | 'playing' | 'won' | 'gameover';
  paused: boolean;
}

export interface Scene {
  /** The state this scene represents for the outer UI. */
  readonly ui: UiState;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export class SceneManager {
  private stack: Scene[] = [];

  /** Replaces the ENTIRE stack with one scene (screen change). */
  replace(scene: Scene): void {
    this.stack = [scene];
  }

  /** Stacks a scene on top (e.g. pause over gameplay). */
  push(scene: Scene): void {
    this.stack.push(scene);
  }

  /** Pops the top scene (back to the one below). */
  pop(): void {
    this.stack.pop();
  }

  /** Only the top scene advances: the ones below stay frozen. */
  update(dt: number): void {
    this.stack[this.stack.length - 1]?.update(dt);
  }

  /** All draw, bottom to top: overlays cover what's beneath. */
  draw(ctx: CanvasRenderingContext2D): void {
    for (const scene of this.stack) scene.draw(ctx);
  }

  /** The active scene's state (for the outer UI). */
  get ui(): UiState {
    return this.stack[this.stack.length - 1]?.ui ?? { state: 'title', paused: false };
  }
}
