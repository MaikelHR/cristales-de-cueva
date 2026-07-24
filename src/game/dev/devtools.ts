// ============================================================
//  MOD MENU — the cheat toolkit (development only)
// ------------------------------------------------------------
//  A GTA-style mod menu for EXPLORING the game: skip to any level,
//  fast-travel to any room, fly through walls, stop dying, hand
//  yourself every relic, open the door without earning it, and see
//  through the walls the cave is hiding things behind.
//
//  Driven by the KEYBOARD, like the menus it's modelled on: ↑↓ to
//  move, ↵ or → to choose, ← or ⌫ to go back, M to close. That is
//  the whole point of the shape — you keep one hand on the game and
//  never go hunting for a button with the mouse. (The mouse still
//  works: hovering selects, clicking chooses.)
//
//    M  or  F2      open / close
//
//  It never ships. main.ts loads this module with a dynamic import
//  inside `if (import.meta.env.DEV)`, so in a production build the
//  condition folds to `false`, the branch dies, and Rollup drops this
//  file and everything it pulls in. The switches it drives live in
//  `../debug.ts`, and every place that reads one is guarded the same
//  way — there is no cheat code in the shipped bundle, not even off.
//
//  Quick keys that work without opening it:
//    G god · N noclip · H hitboxes · K freeze · J one step
//    , / .  (or PageUp/PageDown) previous / next room
// ============================================================

import type { GameSession } from '../session';
import type { SceneManager } from '../scenes/Scene';
import { GameplayScene } from '../scenes/GameplayScene';
import { LEVELS } from '../world/rooms';
import { TILE, type Level } from '../world/Level';
import { ABILITY_NAMES } from '../abilities';
import { loadSave, writeSave, emptyRecord, unlockedLevels, markLore } from '../save';
import { LORE_IDS } from '../lore';
import { Glifo } from '../actors/Glifo';
import { debug, cheatsActive } from '../debug';

let session!: GameSession;
let scenes!: SceneManager;

// ------------------------------------------------------------
// Operations
// ------------------------------------------------------------

/** A standable spot in a room: air with air above it and rock below,
 *  and no spikes in any of the three. Rooms other than a level's first
 *  have no `playerSpawn` at all, and guessing a fixed tile drops you
 *  inside a wall in most of them. */
function standableSpot(level: Level): { x: number; y: number } {
  for (let row = 2; row < level.rows - 1; row++) {
    for (let col = 1; col < level.cols - 1; col++) {
      if (
        level.solidCell(row + 1, col) &&
        !level.solidCell(row, col) && !level.solidCell(row - 1, col) &&
        !level.spikeCell(row, col) && !level.spikeCell(row - 1, col) &&
        !level.spikeCell(row + 1, col)
      ) {
        return { x: col * TILE, y: (row - 1) * TILE };
      }
    }
  }
  return { x: TILE, y: TILE };
}

/** Whatever screen you were on, be playing after this. Warping from the
 *  title or the map used to move the player inside a session nobody was
 *  drawing, which looked exactly like the toolkit doing nothing. */
function ensurePlaying(): void {
  if (scenes.ui.state !== 'playing') scenes.replace(new GameplayScene(session, scenes));
}

/** Fast travel: drop into any room of the CURRENT level, on its floor. */
export function warp(id: string): void {
  ensurePlaying();
  const room = session.world.get(id);
  session.world.goTo(id);
  session.player.setLevel(room.level);
  // Room.playerSpawn is already in PIXELS (Room multiplies the entity's
  // tile coords when it builds), so the +1 here is the same one-pixel
  // nudge session.spawnAtStart uses — NOT a tile.
  const spawn = room.playerSpawn
    ? { x: room.playerSpawn.x + 1, y: room.playerSpawn.y }
    : standableSpot(room.level);
  session.player.respawnAt(spawn.x, spawn.y);
  session.makeCamera();
  session.camera.follow(session.player.x, session.player.y);
  session.visited.add(id);
  session.saveCheckpoint();
}

/** The rooms of the current level, in registration order. */
function roomIds(): string[] {
  return session.level.rooms.map((r) => r.id);
}

/** Walk the room list from where you are (`[` and `]`). */
export function hopRoom(delta: number): void {
  const ids = roomIds();
  const i = ids.indexOf(session.world.current.data.id);
  warp(ids[(i + delta + ids.length) % ids.length]);
}

/** Load any level and start playing it immediately. */
export function level(id: string): void {
  const def = LEVELS.find((l) => l.id === id);
  if (!def) throw new Error(`No existe el nivel "${id}"`);
  session.startLevel(def, 'normal');
  scenes.replace(new GameplayScene(session, scenes));
}

/** Teleport within the current room, in TILE coordinates. */
export function tp(col: number, row: number): void {
  ensurePlaying();
  session.player.x = col * TILE;
  session.player.y = row * TILE;
  session.player.vx = 0;
  session.player.vy = 0;
  session.camera.follow(session.player.x, session.player.y);
}

export function giveAbilities(on = true): void {
  for (const key of ABILITY_NAMES) session.player.abilities[key] = on;
}

export function heal(): void {
  session.player.health = session.player.maxHealth;
}

/** Collect every crystal — in this room, or across the whole level.
 *  Level-wide plus `killEnemies` is how you open the door on demand. */
export function collectCrystals(everywhere = false): number {
  const rooms = everywhere ? session.world.allRooms : [session.world.current];
  let n = 0;
  for (const room of rooms) {
    for (const c of room.crystals) if (!c.dead) { c.dead = true; n++; }
  }
  return n;
}

export function killEnemies(everywhere = false): number {
  const rooms = everywhere ? session.world.allRooms : [session.world.current];
  let n = 0;
  for (const room of rooms) {
    for (const e of room.enemies) if (!e.dead) { e.dead = true; n++; }
  }
  return n;
}

/** Everything the door checks: all crystals gone and no boss standing. */
export function openDoor(): void {
  collectCrystals(true);
  killEnemies(true);
}

/** Mark every room visited, so the progress bar reads as fully explored. */
export function revealRooms(): void {
  for (const room of session.world.allRooms) session.visited.add(room.data.id);
}

/** Mark the first `count` levels completed so the overworld opens up.
 *  Only ever ADDS a completion where there was none: real scores and
 *  times are never touched. */
export function unlock(count = 99): number {
  const save = loadSave();
  for (const def of LEVELS.slice(0, count)) {
    const rec = save.levels[def.id] ?? emptyRecord();
    if (rec.completions === 0) rec.completions = 1;
    save.levels[def.id] = rec;
  }
  writeSave(save);
  session.save = loadSave(); // the live session reads its own copy
  return Math.min(count, LEVELS.length);
}

// ------------------------------------------------------------
// Secrets: false walls, inscriptions, hidden rooms
// ------------------------------------------------------------

/** Hands every false-wall cell of the CURRENT room to `fn`. Counting
 *  them and breaking them want the same walk, and a room's grid is
 *  small enough that one loop with a callback beats two copies of it. */
function eachSecretCell(fn: (row: number, col: number) => void): void {
  const level = session.world.current.level;
  for (let row = 0; row < level.rows; row++) {
    for (let col = 0; col < level.cols; col++) {
      if (level.secretCell(row, col)) fn(row, col);
    }
  }
}

/** How many false walls the current room is still hiding. */
export function secretWalls(): number {
  let n = 0;
  eachSecretCell(() => { n++; });
  return n;
}

/** Break every false wall in the current room at once — the fast way to
 *  check that what is BEHIND them is worth the wall. Like a real break,
 *  it only touches this room's Level instance, so restarting the level
 *  puts the rock back. */
export function breakSecrets(): number {
  const level = session.world.current.level;
  // Collect first: breakCrack rewrites the grid the walk is reading.
  const cells: [number, number][] = [];
  eachSecretCell((row, col) => { cells.push([row, col]); });
  for (const [row, col] of cells) level.breakCrack(row, col);
  return cells.length;
}

/** Fill the Archive, or empty it.
 *
 *  Both halves have to touch TWO things. The save, because reading is
 *  persisted the instant it happens (systems/lore.ts writes on the
 *  spot), so a cheat that only moved the live glyphs would be undone by
 *  the next reload. And the live glyphs, because each one carries its
 *  own `read` flag — the thing that lights it on the wall — and nothing
 *  re-reads the save until the rooms are rebuilt, so without this the
 *  change would be invisible until you left the level.
 *
 *  Forgetting drops the secret ROOMS as well: the Archive is one screen
 *  with both halves on it, and "test it from empty" means empty. */
export function readAllLore(on = true): number {
  const save = session.save;
  if (on) for (const id of LORE_IDS) markLore(save, id);
  else { save.lore = []; save.secrets = []; }
  writeSave(save);
  for (const room of session.world.allRooms) {
    for (const actor of room.actors) if (actor instanceof Glifo) actor.read = on;
  }
  return save.lore.length;
}

/** The secret rooms of the current level, in registration order. */
export function secretRooms(): string[] {
  return session.world.allRooms.filter((r) => r.data.secret).map((r) => r.data.id);
}

// ------------------------------------------------------------
// The menu model
// ------------------------------------------------------------
type RowKind = 'menu' | 'toggle' | 'action' | 'option' | 'info';

interface Row {
  kind: RowKind;
  label: string;
  /** Right-hand text (the [ON] / < 2x > / • column). */
  value?: () => string;
  /** Lit like a switch that is on. */
  lit?: () => boolean;
  /** ↵ / → : returns a line for the toast, if it wants one. */
  enter?: () => string | void;
  /** ← / → on an option row. */
  step?: (delta: number) => void;
  /** For 'menu': the submenu, built fresh each time it is opened. */
  child?: () => Row[];
}

const onOff = (v: boolean): string => (v ? '[ON]' : '[  ]');

function toggleRow(
  label: string,
  key: 'god' | 'noclip' | 'hitboxes' | 'frozen' | 'secrets',
): Row {
  return {
    kind: 'toggle',
    label,
    value: () => onOff(debug[key]),
    lit: () => debug[key],
    enter: () => { debug[key] = !debug[key]; },
  };
}

const SPEEDS = [0.1, 0.25, 0.5, 1, 2, 4] as const;

// Teleport target, remembered between visits to the submenu.
const tpAt = { col: 10, row: 10 };

function cheatsMenu(): Row[] {
  return [
    toggleRow('Modo dios', 'god'),
    toggleRow('Noclip (volar)', 'noclip'),
    toggleRow('Cajas de colisión', 'hitboxes'),
    toggleRow('Congelar el mundo', 'frozen'),
    { kind: 'action', label: 'Avanzar un paso', enter: () => { debug.stepOnce = true; } },
    {
      kind: 'option',
      label: 'Velocidad',
      value: () => `< ${debug.timeScale}x >`,
      lit: () => debug.timeScale !== 1,
      step: (d) => {
        const i = SPEEDS.indexOf(debug.timeScale as typeof SPEEDS[number]);
        const next = i < 0 ? 3 : (i + d + SPEEDS.length) % SPEEDS.length;
        debug.timeScale = SPEEDS[next];
      },
      enter: () => { debug.timeScale = 1; return 'velocidad 1x'; },
    },
  ];
}

function levelsMenu(): Row[] {
  return LEVELS.map((def, i) => ({
    kind: 'action' as const,
    label: `${i + 1}. ${def.id}`,
    value: () => (session.level.id === def.id ? '•' : ''),
    lit: () => session.level.id === def.id,
    enter: (): string => { level(def.id); return `nivel: ${def.id}`; },
  }));
}

function roomsMenu(): Row[] {
  return roomIds().map((id, i) => ({
    kind: 'action' as const,
    label: `${i + 1}. ${id}`,
    value: () => (session.world.current.data.id === id
      ? '•' : session.visited.has(id) ? '·' : ''),
    lit: () => session.world.current.data.id === id,
    enter: (): string => { warp(id); return `sala: ${id}`; },
  }));
}

function abilitiesMenu(): Row[] {
  return [
    { kind: 'action', label: 'Dar todas', enter: () => { giveAbilities(true); return 'todas las habilidades'; } },
    { kind: 'action', label: 'Quitar todas', enter: () => { giveAbilities(false); return 'sin habilidades'; } },
    ...ABILITY_NAMES.map((key): Row => ({
      kind: 'toggle',
      label: key,
      value: () => onOff(session.player.abilities[key]),
      lit: () => session.player.abilities[key],
      enter: () => { session.player.abilities[key] = !session.player.abilities[key]; },
    })),
  ];
}

function teleportMenu(): Row[] {
  const cols = (): number => session.world.current.level.cols;
  const rows = (): number => session.world.current.level.rows;
  return [
    {
      kind: 'option',
      label: 'Columna',
      value: () => `< ${tpAt.col} >`,
      step: (d) => { tpAt.col = Math.max(0, Math.min(cols() - 1, tpAt.col + d)); },
    },
    {
      kind: 'option',
      label: 'Fila',
      value: () => `< ${tpAt.row} >`,
      step: (d) => { tpAt.row = Math.max(0, Math.min(rows() - 1, tpAt.row + d)); },
    },
    {
      kind: 'action',
      label: 'Ir ahí',
      enter: (): string => { tp(tpAt.col, tpAt.row); return `→ ${tpAt.col},${tpAt.row}`; },
    },
    {
      kind: 'action',
      label: 'Traer la mira acá',
      enter: (): string => {
        tpAt.col = Math.floor(session.player.x / TILE);
        tpAt.row = Math.floor(session.player.y / TILE);
        return `mira en ${tpAt.col},${tpAt.row}`;
      },
    },
    { kind: 'info', label: 'sala', value: () => `${cols()}x${rows()}` },
  ];
}

function playerMenu(): Row[] {
  return [
    { kind: 'action', label: 'Vida al máximo', enter: () => { heal(); return 'vida llena'; } },
    { kind: 'menu', label: 'Habilidades', child: abilitiesMenu },
    { kind: 'menu', label: 'Teletransporte', child: teleportMenu },
    {
      kind: 'info',
      label: 'posición',
      value: () => `${Math.floor(session.player.x / TILE)},${Math.floor(session.player.y / TILE)}`,
    },
  ];
}

function worldMenu(): Row[] {
  return [
    { kind: 'action', label: 'Cristales de la sala', enter: () => `${collectCrystals(false)} cristales` },
    { kind: 'action', label: 'Cristales del nivel', enter: () => `${collectCrystals(true)} cristales` },
    { kind: 'action', label: 'Matar enemigos (sala)', enter: () => `${killEnemies(false)} enemigos` },
    { kind: 'action', label: 'Matar enemigos (nivel)', enter: () => `${killEnemies(true)} enemigos` },
    { kind: 'action', label: 'ABRIR LA PUERTA', enter: () => { openDoor(); return 'la puerta está abierta'; } },
    { kind: 'action', label: 'Revelar todas las salas', enter: () => { revealRooms(); return 'mapa revelado'; } },
    {
      kind: 'info',
      label: 'cristales',
      value: () => `${session.collected}/${session.totalCrystals}`,
    },
  ];
}

/** The hidden rooms of the level, same shape as `roomsMenu`. Reuses the
 *  one `warp`: a second teleport that "also does secrets" is how the two
 *  drift apart. Levels without any say so instead of showing a blank
 *  page — an empty list reads as the toolkit being broken. */
function secretRoomsMenu(): Row[] {
  const ids = secretRooms();
  if (!ids.length) return [{ kind: 'info', label: 'este nivel no tiene' }];
  return ids.map((id, i) => ({
    kind: 'action' as const,
    label: `${i + 1}. ${id}`,
    value: () => (session.world.current.data.id === id
      ? '•' : session.visited.has(id) ? '·' : ''),
    lit: () => session.world.current.data.id === id,
    enter: (): string => { warp(id); return `sala: ${id}`; },
  }));
}

function secretsMenu(): Row[] {
  return [
    toggleRow('Revelar muros', 'secrets'),
    { kind: 'action', label: 'Romper muros', enter: () => `${breakSecrets()} muros rotos` },
    { kind: 'action', label: 'Leer todo', enter: () => `${readAllLore(true)} inscripciones` },
    {
      kind: 'action',
      label: 'OLVIDAR TODO',
      enter: (): string => { readAllLore(false); return 'archivo vacío'; },
    },
    { kind: 'menu', label: 'Ir a secreto', child: secretRoomsMenu },
    { kind: 'info', label: 'muros de la sala', value: () => `${secretWalls()}` },
    {
      kind: 'info',
      label: 'inscripciones',
      value: () => `${session.save.lore.length}/${LORE_IDS.length}`,
    },
    { kind: 'info', label: 'secretos', value: () => `${session.save.secrets.length}` },
  ];
}

function saveMenu(): Row[] {
  return [
    {
      kind: 'action',
      label: 'Desbloquear todo el mapa',
      enter: (): string => `${unlock()} niveles desbloqueados`,
    },
    {
      kind: 'info',
      label: 'desbloqueados',
      value: () => `${unlockedLevels(session.save, LEVELS.map((l) => l.id))}/${LEVELS.length}`,
    },
  ];
}

function rootMenu(): Row[] {
  return [
    { kind: 'menu', label: 'Trampas', child: cheatsMenu },
    { kind: 'menu', label: 'Niveles', child: levelsMenu },
    { kind: 'menu', label: 'Salas', child: roomsMenu },
    { kind: 'menu', label: 'Jugador', child: playerMenu },
    { kind: 'menu', label: 'Mundo', child: worldMenu },
    { kind: 'menu', label: 'Secretos', child: secretsMenu },
    { kind: 'menu', label: 'Guardado', child: saveMenu },
  ];
}

// ------------------------------------------------------------
// State
// ------------------------------------------------------------
interface Page { title: string; build: () => Row[]; rows: Row[]; sel: number }

let stack: Page[] = [];
let open = false;
let toast = '';
let toastAt = 0;

function page(): Page { return stack[stack.length - 1]; }

function push(title: string, build: () => Row[]): void {
  stack.push({ title, build, rows: build(), sel: 0 });
  rebuild();
}

function pop(): void {
  if (stack.length > 1) { stack.pop(); rebuild(); } else togglePanel(false);
}

/** Re-runs the current page's builder. Menus are built from live data
 *  (which level is loaded, which rooms it has), so anything that changes
 *  the world has to be able to say "that list is stale now". */
function reload(): void {
  const p = page();
  if (!p) return;
  p.rows = p.build();
  p.sel = Math.min(p.sel, Math.max(0, p.rows.length - 1));
  rebuild();
}

function say(msg: string): void {
  toast = msg;
  toastAt = performance.now();
}

// ------------------------------------------------------------
// Input
// ------------------------------------------------------------
function selectable(r: Row): boolean { return r.kind !== 'info'; }

function move(delta: number): void {
  const p = page();
  if (!p.rows.length) return;
  let i = p.sel;
  for (let n = 0; n < p.rows.length; n++) {
    i = (i + delta + p.rows.length) % p.rows.length;
    if (selectable(p.rows[i])) break;
  }
  p.sel = i;
  paint();
}

function activate(): void {
  const p = page();
  const row = p.rows[p.sel];
  if (!row) return;
  if (row.kind === 'menu' && row.child) {
    push(row.label, row.child);
    return;
  }
  const msg = row.enter?.();
  if (typeof msg === 'string') say(msg);
  // A level swap rewrites what "Salas" and "Niveles" mean, and a warp
  // changes which room is the current one: rebuild rather than leave the
  // list describing a world that no longer exists.
  reload();
}

function step(delta: number): void {
  const row = page().rows[page().sel];
  if (row?.step) { row.step(delta); paint(); return; }
  if (delta > 0) activate();
  else pop();
}

/** What opens and closes the menu. Change this line to rebind it.
 *
 *  NOT the backtick and NOT F1, both of which were the first try and
 *  both of which are traps: on a Latin-American (and most Spanish)
 *  layout ` is a DEAD KEY — it reports `e.key === 'Dead'` and waits for
 *  a second keystroke, so the binding simply never fires — and Chrome
 *  owns F1 for its Help Center and will not let preventDefault have it.
 *  'm' for menú is one key on every layout ever made; F2 is the safest
 *  function key left (F1 help, F3 find, F5 reload, F6 bar, F10 menu,
 *  F11 fullscreen, F12 devtools are all spoken for). */
const MENU_KEYS = ['m', 'F2'];

/** Quick keys, all reachable UNSHIFTED on a Latin-American layout —
 *  which rules out [ and ] (AltGr there) as much as it ruled out the
 *  backtick. Letters and , . are the same physical keys everywhere. */
const QUICK: Record<string, () => void> = {
  g: () => { debug.god = !debug.god; },
  n: () => { debug.noclip = !debug.noclip; },
  h: () => { debug.hitboxes = !debug.hitboxes; },
  k: () => { debug.frozen = !debug.frozen; },
  j: () => { debug.stepOnce = true; },
  ',': () => { hopRoom(-1); },
  '.': () => { hopRoom(1); },
  pageup: () => { hopRoom(-1); },
  pagedown: () => { hopRoom(1); },
};

function onKey(e: KeyboardEvent): void {
  if (MENU_KEYS.includes(e.key) || MENU_KEYS.includes(e.key.toLowerCase())) {
    e.preventDefault();
    e.stopImmediatePropagation();
    togglePanel();
    return;
  }

  if (open) {
    // While the menu is up it OWNS these keys. Capture phase plus
    // stopImmediatePropagation is what keeps them from also reaching the
    // game's own window listener — otherwise navigating the menu walks
    // the player around underneath it.
    const nav: Record<string, () => void> = {
      ArrowUp: () => { move(-1); },
      ArrowDown: () => { move(1); },
      ArrowLeft: () => { step(-1); },
      ArrowRight: () => { step(1); },
      Enter: () => { activate(); },
      Backspace: () => { pop(); },
      Escape: () => { pop(); },
    };
    const hit = nav[e.key];
    if (hit) {
      e.preventDefault();
      e.stopImmediatePropagation();
      hit();
      return;
    }
  }

  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const quick = QUICK[e.key.toLowerCase()];
  if (quick) { quick(); paint(); }
}

// ------------------------------------------------------------
// The panel
// ------------------------------------------------------------
const CSS = `
.mm { position: fixed; top: 10px; left: 10px; width: 250px; z-index: 99999; display: none;
  font: 12px/1.5 ui-monospace, "Cascadia Code", Consolas, monospace;
  color: #cfc6e8; background: #120c1eF2; border: 1px solid #4b3a6e;
  box-shadow: 0 8px 32px #000b; -webkit-user-select: none; user-select: none; }
.mm.on { display: block; }
.mm .bar { background: #ffd76e; color: #1b1329; font-weight: 700; letter-spacing: .16em;
  text-align: center; padding: 4px 0; font-size: 11px; }
.mm .crumb { background: #241a3a; color: #8fe3d0; font-size: 10px; letter-spacing: .1em;
  padding: 3px 8px; display: flex; justify-content: space-between; }
.mm .list { max-height: 340px; overflow-y: auto; scrollbar-width: thin; }
.mm .r { display: flex; justify-content: space-between; gap: 8px; padding: 2px 8px;
  cursor: pointer; white-space: nowrap; }
.mm .r .v { color: #7d6ba8; }
.mm .r.lit .v { color: #8fe3d0; }
.mm .r.info { cursor: default; color: #6b5c91; font-size: 11px; font-style: italic; }
.mm .r.sel { background: #ffd76e; color: #1b1329; font-weight: 700; }
.mm .r.sel .v { color: #1b1329; }
.mm .r.sub::after { content: "▸"; color: #7d6ba8; }
.mm .r.sel.sub::after { color: #1b1329; }
.mm .foot { border-top: 1px solid #33264d; color: #6b5c91; font-size: 10px;
  padding: 3px 8px; text-align: center; }
.mm .toast { background: #8fe3d0; color: #10202b; font-size: 11px; font-weight: 700;
  padding: 3px 8px; text-align: center; }
.mm-badge { position: fixed; left: 10px; bottom: 10px; z-index: 99998; display: none;
  font: 10px/1 ui-monospace, Consolas, monospace; letter-spacing: .12em;
  color: #1b1329; background: #ffd76e; padding: 3px 6px; border-radius: 2px;
  pointer-events: none; opacity: .9; }
.mm-badge.on { display: block; }
`;

let el: {
  panel: HTMLDivElement; crumb: HTMLDivElement; count: HTMLSpanElement;
  list: HTMLDivElement; toast: HTMLDivElement; badge: HTMLDivElement;
};
let rowEls: HTMLDivElement[] = [];

function build(): void {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'mm';
  panel.innerHTML = `
    <div class="bar">MOD MENU</div>
    <div class="crumb"><span class="where"></span><span class="count"></span></div>
    <div class="list"></div>
    <div class="toast" style="display:none"></div>
    <div class="foot">↑↓ · ↵ elegir · ⌫ atrás · M cerrar</div>`;
  document.body.appendChild(panel);

  const badge = document.createElement('div');
  badge.className = 'mm-badge';
  document.body.appendChild(badge);

  el = {
    panel,
    crumb: panel.querySelector('.where')!,
    count: panel.querySelector('.count')!,
    list: panel.querySelector('.list')!,
    toast: panel.querySelector('.toast')!,
    badge,
  };
}

/** Recreates the row elements (only when the page or its length changes). */
function rebuild(): void {
  if (!el) return;
  const p = page();
  el.list.textContent = '';
  rowEls = p.rows.map((row, i) => {
    const d = document.createElement('div');
    d.className = 'r' + (row.kind === 'menu' ? ' sub' : '')
      + (row.kind === 'info' ? ' info' : '');
    const label = document.createElement('span');
    label.textContent = row.label;
    const value = document.createElement('span');
    value.className = 'v';
    d.append(label, value);
    if (selectable(row)) {
      d.addEventListener('mouseenter', () => { p.sel = i; paint(); });
      d.addEventListener('click', () => { p.sel = i; activate(); });
    }
    el.list.appendChild(d);
    return d;
  });
  paint();
}

/** Cheap per-frame refresh: values, selection, toast. No DOM churn. */
function paint(): void {
  if (!el || !open) { syncBadge(); return; }
  const p = page();
  el.crumb.textContent = stack.map((s) => s.title).join(' / ');
  el.count.textContent = p.rows.length ? `${p.sel + 1}/${p.rows.length}` : '';

  p.rows.forEach((row, i) => {
    const d = rowEls[i];
    if (!d) return;
    d.classList.toggle('sel', i === p.sel);
    d.classList.toggle('lit', !!row.lit?.());
    const v = d.lastElementChild as HTMLSpanElement;
    const text = row.value?.() ?? '';
    if (v.textContent !== text) v.textContent = text;
  });
  rowEls[p.sel]?.scrollIntoView({ block: 'nearest' });

  const age = (performance.now() - toastAt) / 1000;
  const show = !!toast && age < 2.2;
  el.toast.style.display = show ? 'block' : 'none';
  if (show) el.toast.textContent = toast;

  syncBadge();
}

/** With the menu shut there is nothing on screen saying a cheat is on,
 *  and "the game feels wrong" that turns out to be a forgotten god mode
 *  or a 0.25x timescale costs a whole afternoon. So: say so, always. */
function syncBadge(): void {
  if (!el) return;
  const on = cheatsActive();
  el.badge.classList.toggle('on', on && !open);
  if (!on) return;
  const parts: string[] = [];
  if (debug.god) parts.push('DIOS');
  if (debug.noclip) parts.push('NOCLIP');
  if (debug.frozen) parts.push('CONGELADO');
  if (debug.timeScale !== 1) parts.push(`${debug.timeScale}x`);
  el.badge.textContent = parts.join(' · ');
}

function togglePanel(on = !open): void {
  open = on;
  el?.panel.classList.toggle('on', open);
  if (open) { stack = []; push('MENÚ', rootMenu); } else syncBadge();
}

// ------------------------------------------------------------
// Wiring
// ------------------------------------------------------------
export function initDevtools(s: GameSession, sc: SceneManager): void {
  session = s;
  scenes = sc;
  build();
  stack = [{ title: 'MENÚ', build: rootMenu, rows: rootMenu(), sel: 0 }];
  // Capture phase: the menu has to see the arrows BEFORE the game does.
  window.addEventListener('keydown', onKey, true);

  (window as unknown as Record<string, unknown>).__dev = {
    debug, warp, hopRoom, level, tp, giveAbilities, heal,
    collectCrystals, killEnemies, openDoor, revealRooms, unlock,
    // The reveal toggle is `__dev.debug.secrets = true` — it lives on
    // the flags object with the rest of the switches, not here.
    breakSecrets, readAllLore, secretWalls, secretRooms,
    menu: togglePanel,
    get session() { return session; },
    get room() { return session.world.current; },
    rooms: roomIds,
    levels: (): string[] => LEVELS.map((l) => l.id),
  };
}

/** Called from the render callback: keeps the menu and the badge live. */
export function syncDevtools(): void {
  paint();
}
