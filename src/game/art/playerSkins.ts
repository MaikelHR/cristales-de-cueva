// ============================================================
//  SPRITES DEL JUGADOR POR SKIN + ACCESORIO
// ------------------------------------------------------------
//  Hornea los frames del jugador combinando los dos ejes de
//  personalización: el tint de la skin sobre la paleta base y la
//  grilla del accesorio superpuesta sobre cada frame. El horneado
//  es perezoso (la primera vez que se pide cada combinación) y se
//  cachea: cambiar de look en caliente cuesta un lookup por frame.
// ============================================================

import { Sprite } from '../../engine/Sprite';
import { PALETTE } from './palette';
import { PLAYER_GRIDS } from './playerGrids';
import { currentSkin, type SkinDef } from '../skins';
import { currentAccessory, overlayGrid, type AccessoryDef } from '../accessories';

export interface PlayerSpriteSet {
  idle: Sprite;
  idle2: Sprite;
  blink: Sprite;
  run: readonly Sprite[];
  jump: Sprite;
  fall: Sprite;
  wall: Sprite;
}

const cache = new Map<string, PlayerSpriteSet>();

function bake(skin: SkinDef, acc: AccessoryDef): PlayerSpriteSet {
  const pal = { ...PALETTE, ...skin.tint };
  const frame = (grid: readonly string[]) =>
    new Sprite(overlayGrid(grid, acc.grid, acc.dy), pal);
  return {
    idle: frame(PLAYER_GRIDS.idle),
    idle2: frame(PLAYER_GRIDS.idle2),
    blink: frame(PLAYER_GRIDS.blink),
    run: [
      frame(PLAYER_GRIDS.run1),
      frame(PLAYER_GRIDS.run2),
      frame(PLAYER_GRIDS.run3),
      frame(PLAYER_GRIDS.run4),
    ],
    jump: frame(PLAYER_GRIDS.jump),
    fall: frame(PLAYER_GRIDS.fall),
    wall: frame(PLAYER_GRIDS.wall),
  };
}

/** Los sprites del jugador con el look activo (horneados y cacheados). */
export function playerSprites(): PlayerSpriteSet {
  const skin = currentSkin();
  const acc = currentAccessory();
  const key = `${skin.id}|${acc.id}`;
  let set = cache.get(key);
  if (!set) {
    set = bake(skin, acc);
    cache.set(key, set);
  }
  return set;
}
