// ============================================================
//  THE OVERWORLD'S LAYOUT (pure data + camera math)
// ------------------------------------------------------------
//  Kept apart from the drawing so it runs in Node — and because the
//  one rule here deserves a test: THE PATH ONLY EVER GOES RIGHT.
//  The challenge road used to double BACK over the grotto (nodes 11
//  to 13 marching leftwards), so pressing 'right' walked the avatar
//  left across the screen. It reads as inverted controls, and it is
//  the kind of thing no test could see while the layout lived buried
//  in the renderer.
//
//  The road keeps going instead, and the MAP SCROLLS: the view
//  centres on the avatar and clamps to the map's edges, exactly like
//  the in-game camera. So the path can grow with every challenge
//  level without ever folding back on itself.
// ============================================================

export interface OwNode {
  x: number;
  y: number;
}

/** The path's nodes. The first ten snake up the cave to the great
 *  door (world 1); the rest keep going RIGHT — the challenge road,
 *  which only exists once the grotto is finished. Only the first
 *  LEVELS.length have an actual level. */
export const OW_NODES: ReadonlyArray<OwNode> = [
  { x: 30, y: 120 },
  { x: 66, y: 100 },
  { x: 100, y: 118 },
  { x: 134, y: 96 },
  { x: 168, y: 114 },
  { x: 200, y: 90 },
  { x: 232, y: 108 },
  { x: 262, y: 84 },
  { x: 284, y: 60 },
  { x: 300, y: 38 },
  // The challenge road, carrying on past the door.
  { x: 340, y: 60 },
  { x: 380, y: 42 },
  { x: 418, y: 62 },
];

/** Breathing room kept to the right of the last node. */
const OW_EDGE = 26;

/** The map's full width: what the camera pans across. */
export const OW_WORLD_W = OW_NODES[OW_NODES.length - 1].x + OW_EDGE;

/** Where the view starts: centred on the avatar, clamped to the map.
 *  Rounded, so the pixel art never lands on a half pixel.
 *  While the challenge road is still hidden the grotto's ten nodes fit
 *  on one screen, so the camera stays pinned at 0 and world 1 looks
 *  exactly as it always did: the whole cave, at a glance. */
export function owCamX(avatarX: number, viewW: number, roadOpen: boolean): number {
  if (!roadOpen) return 0;
  const max = Math.max(0, OW_WORLD_W - viewW);
  return Math.round(Math.min(max, Math.max(0, avatarX - viewW / 2)));
}

/** Half the widest node dressing (the great door's torches). */
const NODE_HALF = 14;

/** Does the whole grotto fit on screen without scrolling? (the reason
 *  the camera can stay still until the road opens) */
export function grottoFitsOnScreen(grottoNodeCount: number, viewW: number): boolean {
  return OW_NODES[grottoNodeCount - 1].x + NODE_HALF <= viewW;
}
