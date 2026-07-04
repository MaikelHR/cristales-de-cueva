// ============================================================
//  BUCLE PRINCIPAL (game loop) con paso de tiempo fijo
// ------------------------------------------------------------
//  Separa "actualizar la lógica" de "dibujar". La lógica corre
//  a 60 pasos por segundo SIEMPRE (paso fijo), aunque la pantalla
//  vaya más rápido o más lento. Eso hace que la física sea
//  estable y se sienta igual en cualquier equipo.
// ============================================================

const STEP = 1 / 60; // duración de cada paso de lógica, en segundos

export function startLoop(
  update: (dt: number) => void,
  render: () => void,
): void {
  let last = performance.now() / 1000;
  let accumulator = 0;

  function frame(nowMs: number): void {
    const now = nowMs / 1000;
    let delta = now - last;
    last = now;

    // Si la pestaña se congeló, evitamos un salto gigante de tiempo.
    if (delta > 0.25) delta = 0.25;

    accumulator += delta;
    while (accumulator >= STEP) {
      update(STEP);
      accumulator -= STEP;
    }

    render();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
