// ============================================================
//  DEPURACIÓN (solo desarrollo)
// ------------------------------------------------------------
//  Flags que se togglean desde la consola del navegador vía
//  window.__debug (los cablea main.ts). En producción el chequeo
//  import.meta.env.DEV hace que todo esto se elimine del bundle.
//
//    __debug.hitboxes = true   // dibuja las cajas de colisión
//    __debug.warp('santuario') // saltar a una sala
// ============================================================

export const debug = {
  hitboxes: false,
};
