import { describe, expect, it, vi } from 'vitest';

// The board's creaks are irrelevant here (and Node has no AudioContext).
vi.mock('../../sfx', () => ({ sfx: new Proxy({}, { get: () => () => {} }) }));

import { Crumble } from './Crumble';

const dt = 1 / 60;

function advance(board: Crumble, seconds: number): void {
  for (let t = 0; t < seconds; t += dt) board.update(dt);
}

describe('crumble', () => {
  it('aguanta el temblor, se suelta, y un rato después se rearma', () => {
    const board = new Crumble(0, 0);
    expect(board.solid).toBe(true);

    // The footfall starts the shudder: still solid (the grace window).
    board.trigger();
    expect(board.solid).toBe(true);
    advance(board, 0.3);
    expect(board.solid).toBe(true);

    // Past the shudder it snaps loose and can't be stood on.
    advance(board, 0.3);
    expect(board.solid).toBe(false);

    // Long after, dust gathers and the board is back on its corbels.
    advance(board, 4);
    expect(board.solid).toBe(true);
  });

  it('pisarla otra vez en pleno temblor no reinicia la cuenta', () => {
    const board = new Crumble(0, 0);
    board.trigger();
    advance(board, 0.4);
    board.trigger(); // a second footfall must not buy more time
    advance(board, 0.1);
    expect(board.solid).toBe(false);
  });

  it('intacta no cae sola: sin pisarla, se queda', () => {
    const board = new Crumble(0, 0);
    advance(board, 10);
    expect(board.solid).toBe(true);
  });
});
