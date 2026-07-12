// ============================================================
//  DEBUG (development only)
// ------------------------------------------------------------
//  Flags toggled from the browser console via window.__debug
//  (main.ts wires them up). In production the import.meta.env.DEV
//  check strips all of this from the bundle.
//
//    __debug.hitboxes = true   // draws the collision boxes
//    __debug.warp('santuario') // jump to a room
// ============================================================

export const debug = {
  hitboxes: false,
};
