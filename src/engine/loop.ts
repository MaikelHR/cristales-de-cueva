// ============================================================
//  MAIN LOOP (game loop) with fixed timestep
// ------------------------------------------------------------
//  Separates "update the logic" from "draw". The logic ALWAYS
//  runs at 60 steps per second (fixed step), whether the screen
//  is faster or slower. That keeps physics stable and makes it
//  feel the same on any machine.
// ============================================================

const STEP = 1 / 60; // duration of each logic step, in seconds

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

    // If the tab froze, avoid a giant time jump.
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
