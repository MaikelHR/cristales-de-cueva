// ============================================================
//  ESCENAS — el flujo de pantallas del juego
// ------------------------------------------------------------
//  Cada pantalla (título, partida, pausa, victoria, game over) es
//  una escena: sabe actualizarse y dibujarse. El manager las lleva
//  en una PILA: solo la de arriba se actualiza, pero se dibujan
//  todas de abajo hacia arriba. Así "pausa" es una escena apilada
//  sobre la partida: la congela con solo taparla.
//  Sumar una pantalla nueva (opciones, mapa, diálogo) = una escena
//  nueva; nadie más se entera.
// ============================================================

/** Estado observable para la UI de fuera del canvas (mando táctil,
 *  selector de idioma): qué pantalla se muestra y si está en pausa. */
export interface UiState {
  state: 'title' | 'playing' | 'won' | 'gameover';
  paused: boolean;
}

export interface Scene {
  /** El estado que esta escena representa para la UI exterior. */
  readonly ui: UiState;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export class SceneManager {
  private stack: Scene[] = [];

  /** Reemplaza TODA la pila por una escena (cambio de pantalla). */
  replace(scene: Scene): void {
    this.stack = [scene];
  }

  /** Apila una escena encima (p. ej. pausa sobre la partida). */
  push(scene: Scene): void {
    this.stack.push(scene);
  }

  /** Saca la escena de arriba (volver a la de abajo). */
  pop(): void {
    this.stack.pop();
  }

  /** Solo la escena de arriba avanza: las de abajo quedan congeladas. */
  update(dt: number): void {
    this.stack[this.stack.length - 1]?.update(dt);
  }

  /** Se dibujan todas, de abajo hacia arriba: los overlays tapan. */
  draw(ctx: CanvasRenderingContext2D): void {
    for (const scene of this.stack) scene.draw(ctx);
  }

  /** El estado de la escena activa (para la UI exterior). */
  get ui(): UiState {
    return this.stack[this.stack.length - 1]?.ui ?? { state: 'title', paused: false };
  }
}
