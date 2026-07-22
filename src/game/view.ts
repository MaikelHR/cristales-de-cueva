// ============================================================
//  THE VIEW — the game's window on the world
// ------------------------------------------------------------
//  The canvas is exactly this size and the camera clamps itself to
//  it (`worldH - viewH`), which is what lets a room be TALLER than
//  the screen: 22 rows fit, 24 rows scroll.
//
//  It lives here, and not as a local in main.ts, because anything
//  that must GUARANTEE the player can see it has to measure itself
//  against the view rather than against the room. A warning drawn
//  at the room's roof in a room 2 tiles taller than the screen is
//  drawn at y = -6 — off the top, invisible, exactly when the player
//  is standing on the floor and needs it most. (That was the
//  Custodio's shard telegraph, and it is why this file exists.)
// ============================================================

export const VIEW_W = 320;
export const VIEW_H = 176;
