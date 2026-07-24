import type { RoomData } from '../../RoomData';

/** Level 1, HIDDEN — La covacha: the first secret in the game.
 *
 *  Behind the veil on senda's left wall, three tiles behind where the
 *  run begins. It is a dead end and it is meant to be: a low mouth
 *  that opens into a chamber twice as tall as it, with nothing in it
 *  but an amber shard and, painted across the back wall, a line of
 *  people carrying something that shines.
 *
 *  NOT ONE WORD IN IT, and that is the point. The inscriptions of this
 *  level both sit on the road (the ditch and the seam behind the
 *  door); what the first hidden room says, it says with a picture —
 *  there were many of them, and they were going somewhere together.
 *  Everything the cave tells you later lands on that.
 *
 *  Floor row 19 runs unbroken from the mouth to the far wall, matching
 *  senda's own, so the crossing is a walk in both directions and the
 *  chamber cannot hold anyone (level 1 has no abilities at all yet).
 *
 *  It is 40 columns wide because the VIEW is 40 columns wide. The camera
 *  clamps to `worldW - viewW`, so a room narrower than the screen simply
 *  leaves the rest of the screen empty — this shipped at 22 and showed
 *  144px of void down the side. The chamber itself is still small; the
 *  extra columns are solid rock behind it.
 */
export const covacha: RoomData = {
  id: 'covacha',
  secret: true,
  // It rides senda's column: a hidden room must not lengthen the bar.
  mapPos: { x: 0, y: 0 },
  exits: { right: 'senda' },
  tiles: [
    '########################################',
    '########################################',
    '########################################',
    '########################################',
    '########################################',
    '########################################',
    '########################################',
    '########################################',
    '########################################',
    '########################################',
    '########################################',
    '########################################',
    '########################..........######',
    '######################..............####',
    '#####################................###',
    '#####################................###',
    '#####################.................##',
    '#####################...................',
    '#####################...................',
    '########################################',
    '########################################',
    '########################################',
  ],
  entities: [
    { type: 'mural', x: 24, y: 13, art: 'procesion' },
    { type: 'vestigio', x: 27, y: 18 },
  ],
};
