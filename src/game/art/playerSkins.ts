// ============================================================
//  PLAYER SPRITES BY SKIN + ACCESSORY
// ------------------------------------------------------------
//  Bakes the player frames by combining the two customization
//  axes: the skin tint over the base palette and the accessory
//  grid overlaid on each frame. Baking is lazy (the first time
//  each combination is requested) and cached: swapping the look
//  on the fly costs one lookup per frame.
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

/** The player sprites with the active look (baked and cached). */
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
