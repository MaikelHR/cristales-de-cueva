// scripts/check.ts — red de seguridad headless. FUERA de src/: tsc no lo
// tipa, vite no lo empaqueta. Se corre con:  npm run check
//
// Los stubs van ANTES de importar el juego (import dinámico), porque art.ts
// hornea sprites al cargar (document.createElement + getContext) y Game llama
// a loadSave() -> localStorage. Sin esto el import revienta con
// "document is not defined".

import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

function fakeGradient() {
  return { addColorStop() {} };
}
function fakeCtx(): any {
  const t: any = {};
  return new Proxy(t, {
    get(o, p) {
      if (p in o) return o[p];
      if (p === 'canvas') return { width: 0, height: 0 };
      if (p === 'measureText') return () => ({ width: 0 });
      if (p === 'getImageData')
        return () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
      if (p === 'createRadialGradient' || p === 'createLinearGradient' || p === 'createPattern')
        return fakeGradient;
      return () => {}; // fillRect, drawImage, save, restore, translate, scale, arc, fill, stroke...
    },
    set(o, p, v) {
      o[p] = v;
      return true;
    },
  });
}
const g: any = globalThis;
g.document = {
  createElement: (tag: string) =>
    tag === 'canvas' ? { width: 0, height: 0, getContext: () => fakeCtx() } : {},
};
const store: Record<string, string> = {};
g.localStorage = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => {
    store[k] = String(v);
  },
  removeItem: (k: string) => {
    delete store[k];
  },
};
g.window = g;
g.performance ??= { now: () => 0 };
g.requestAnimationFrame ??= () => 0;
g.AudioContext ??= class {
  // por si algún módulo toca Web Audio al cargar
  createGain() {
    return { connect() {}, gain: { value: 0, setValueAtTime() {} } };
  }
  createOscillator() {
    return {
      connect() {},
      start() {},
      stop() {},
      type: '',
      frequency: { value: 0, setValueAtTime() {} },
    };
  }
  get destination() {
    return {};
  }
  get currentTime() {
    return 0;
  }
};

// IMPORT DINÁMICO: recién ahora, con los stubs puestos, se evalúan los módulos.
const { World } = await import('../src/game/World.ts');
const { Game } = await import('../src/game/Game.ts');
const { ROOMS } = await import('../src/game/rooms/index.ts');
const { exitId, isOneWay, exitRequires } = await import('../src/game/rooms/RoomDef.ts');
const { Level, GATE_ABILITY } = await import('../src/game/Level.ts');
const input = await import('../src/engine/input.ts');
const { loadSave, writeSave, PROGRESS_VERSION } = await import('../src/game/save.ts');
const { Player } = await import('../src/game/Player.ts');
const { Particles } = await import('../src/game/Particles.ts');
const { TILE } = await import('../src/game/Level.ts');
const { Spore } = await import('../src/game/entities/Spore.ts');
const { Fundidor } = await import('../src/game/entities/Fundidor.ts');

let fallos = 0;
const fail = (m: string) => {
  console.error('  ✗ ' + m);
  fallos++;
};
const ok = (m: string) => console.log('  ✓ ' + m);

// --- Smoke: construir el mundo valida TODOS los mapas (Level tira si hay
//     filas de distinto largo o chars desconocidos); correr Game N pasos
//     atrapa throws en runtime.
try {
  const world = new World();
  const game = new Game(320, 176);
  const ctx = fakeCtx();
  // Confirmamos en el título para entrar a 'playing' y ejercitar el render
  // del mundo (fondo/tiles por bioma), no solo la pantalla de inicio.
  input.touchButton('confirm', true);
  game.update(1 / 60);
  input.touchButton('confirm', false);
  input.endStep();
  for (let i = 0; i < 20000; i++) {
    // Patrón de movimiento variado: alterna direcciones y MANTIENE saltar en
    // tramos (para trepar tiros de viento y cruzar salas verticales). Así el
    // smoke ejercita tryTransition en las 4 ramas en el loop real del Game.
    const phase = Math.floor(i / 220) % 4;
    input.touchButton('right', phase === 0 || phase === 3);
    input.touchButton('left', phase === 2);
    input.touchButton('jump', i % 220 < 140); // mantiene saltar (viento) por tramos
    input.touchButton('dash', i % 90 === 0);
    // Abrimos y cerramos el mapa periódicamente para ejercitar drawMap().
    if (i % 500 === 250) {
      input.touchButton('map', true);
      input.touchButton('map', false);
    }
    game.update(1 / 60);
    if (i % 200 === 0) game.draw(ctx);
    input.endStep();
  }
  void world;
  ok('smoke: World + 20k pasos de Game (playing, update+draw) sin reventar');

  // Integración de "Continuar": tras jugar, el store tiene progreso. Un Game
  // NUEVO (simula recargar) debe verlo (hasProgress) y continuar sin reventar.
  const saved = g.localStorage.getItem('cristales-save-v1');
  if (!saved || !JSON.parse(saved).progress) {
    fail('autoguardado: tras jugar no quedó progreso en el store');
  } else {
    const reloaded = new Game(320, 176);
    if (!reloaded.hasProgress) fail('autoguardado: el Game recargado no ve el progreso guardado');
    // Continuar: confirmar en el título aplica el progreso (no debe reventar).
    input.touchButton('confirm', true);
    reloaded.update(1 / 60);
    input.touchButton('confirm', false);
    input.endStep();
    for (let i = 0; i < 200; i++) {
      reloaded.update(1 / 60);
      if (i % 50 === 0) reloaded.draw(ctx);
      input.endStep();
    }
    ok('autoguardado: reload -> hasProgress -> Continuar sin reventar');
  }
  // Limpiamos el store para no arrastrar progreso al test de save.ts de abajo.
  g.localStorage.removeItem('cristales-save-v1');
} catch (e) {
  fail('el smoke reventó: ' + (e as Error).message);
}

// --- Whitelist dura (§8.6): un char de mapa desconocido DEBE tirar Error.
//     Sin esto, un typo en un mapa dibujado a mano se vuelve aire silencioso.
try {
  new Level(['###', '#Z#', '###']); // 'Z' no está en KNOWN_CHARS
  fail('Level aceptó un char desconocido (la whitelist no tiró)');
} catch {
  ok('whitelist: un char de mapa desconocido tira Error');
}

// --- Enemigos nuevos (§10): Spore y Fundidor no revientan en su ciclo de
//     vida (update+draw+hazards+onStomp) con un nivel mínimo y un objetivo.
{
  const ctx2 = fakeCtx();
  const lvl: any = new Level(['########', '#......#', '########']);
  const target = { x: 20, y: 12 };
  try {
    const sp = new Spore(8, 8, lvl);
    for (let i = 0; i < 400; i++) {
      sp.update(1 / 60, target);
      sp.draw(ctx2, 0, 0);
      sp.hazards?.();
    }
    sp.onStomp?.();
    const fu = new Fundidor(8, 8, lvl);
    for (let i = 0; i < 800; i++) {
      fu.update(1 / 60, target);
      fu.draw(ctx2, 0, 0);
      fu.hazards?.();
      if (i === 400) fu.onStomp?.();
    }
    ok('enemigos: Spore y Fundidor completan su ciclo sin reventar');
  } catch (e) {
    fail('enemigos: reventó ' + (e as Error).message);
  }
}

// --- Hazards estáticos (§8.5): 'x' púas y 'L' lava parsean y hazardTilesIn
//     devuelve una caja peligrosa donde hay hazard (y ninguna donde no).
{
  const lvl: any = new Level([
    '########',
    '#.x..L.#',
    '########',
  ]);
  const overCells = (col: number) => lvl.hazardTilesIn({ x: col * 8, y: 8, w: 8, h: 8 });
  const spike = overCells(2); // 'x' en fila 1 col 2
  const lava = overCells(5);  // 'L' en fila 1 col 5
  const air = overCells(3);   // '.' en fila 1 col 3
  if (spike.length === 0) fail('hazards: púas no reportadas por hazardTilesIn');
  if (lava.length === 0) fail('hazards: lava no reportada por hazardTilesIn');
  if (air.length !== 0) fail('hazards: aire reportado como hazard (falso positivo)');
  if (spike.length && lava.length && !air.length) ok('hazards: púas y lava detectadas, aire no');
}

// --- Autoguardado (§8.4): round-trip de save + descarte de versión vieja +
//     conservación de récords al escribir progreso.
{
  // 1) Round-trip: el progreso vuelve intacto.
  writeSave({
    bestScore: 42,
    victories: 3,
    bestTime: 88,
    progress: {
      version: PROGRESS_VERSION,
      abilities: ['glide'],
      crystalsTaken: ['sala:10,20'],
      relicsTaken: [],
      checkpoint: { roomId: 'sala', x: 5, y: 6 },
      visited: ['sala', 'otra'],
    },
  });
  const back = loadSave();
  if (back.bestScore !== 42 || back.victories !== 3 || back.bestTime !== 88)
    fail('autoguardado: los récords no sobrevivieron al round-trip');
  if (!back.progress || back.progress.crystalsTaken[0] !== 'sala:10,20')
    fail('autoguardado: el progreso no volvió intacto del round-trip');

  // 2) Versión vieja del progreso => se descarta (partida nueva sin romper).
  writeSave({
    bestScore: 1, victories: 0, bestTime: 0,
    progress: {
      version: PROGRESS_VERSION + 999, abilities: [], crystalsTaken: [],
      relicsTaken: [], checkpoint: { roomId: 'x', x: 0, y: 0 }, visited: [],
    },
  });
  const stale = loadSave();
  if (stale.progress) fail('autoguardado: un progreso de versión vieja NO se descartó');
  if (stale.bestScore !== 1) fail('autoguardado: se perdió un récord al descartar progreso viejo');

  if (back.progress && !stale.progress) ok('autoguardado: round-trip ok + versión vieja descartada');
  // Limpiamos el store para no contaminar el smoke.
  g.localStorage.removeItem('cristales-save-v1');
}

// --- Grafo de salidas ---
const DIRS = ['left', 'right', 'up', 'down'] as const;
const OPP: Record<string, (typeof DIRS)[number]> = {
  left: 'right',
  right: 'left',
  up: 'down',
  down: 'up',
};
const byId: Record<string, any> = {};
for (const r of ROOMS) byId[r.id] = r;

// Existencia: toda salida apunta a una sala real.
for (const r of ROOMS)
  for (const d of DIRS) {
    const e = r.exits?.[d];
    if (!e) continue;
    if (!byId[exitId(e)]) fail(`${r.id}.${d} apunta a "${exitId(e)}" que no existe`);
  }

// Simetría (salvo las marcadas one-way): si A.dir->B, entonces B.opp->A.
for (const r of ROOMS)
  for (const d of DIRS) {
    const e = r.exits?.[d];
    if (!e || isOneWay(e)) continue;
    const back = byId[exitId(e)]?.exits?.[OPP[d]];
    if (!back || exitId(back) !== r.id) fail(`${r.id}.${d}->${exitId(e)} sin inversa ${OPP[d]}`);
  }

// Conectividad: todas las salas alcanzables desde el spawn por el grafo.
{
  const vis = new Set([ROOMS[0].id]);
  const cola = [ROOMS[0].id];
  while (cola.length) {
    const cur = byId[cola.shift()!];
    for (const d of DIRS) {
      const e = cur.exits?.[d];
      if (e && !vis.has(exitId(e))) {
        vis.add(exitId(e));
        cola.push(exitId(e));
      }
    }
  }
  for (const r of ROOMS) if (!vis.has(r.id)) fail(`${r.id} inalcanzable desde el spawn (grafo)`);
}

// --- Alineación de huecos (§4.4): el borde compartido entre dos salas
//     conectadas debe tener EXACTAMENTE las mismas celdas NO-'#'. Si no,
//     el jugador aparece dentro de un sólido -> ping-pong infinito.
{
  // Levantamos los mapas crudos por id para inspeccionar los bordes.
  const mapById: Record<string, string[]> = {};
  for (const r of ROOMS) mapById[r.id] = r.map;

  // Columnas NO-'#' de una fila.
  const openCols = (row: string): string => {
    let s = '';
    for (let c = 0; c < row.length; c++) s += row[c] === '#' ? '0' : '1';
    return s;
  };
  // Filas NO-'#' de una columna dada.
  const openRows = (map: string[], col: number): string => {
    let s = '';
    for (let r = 0; r < map.length; r++) s += map[r][col] === '#' ? '0' : '1';
    return s;
  };

  for (const r of ROOMS)
    for (const d of DIRS) {
      const e = r.exits?.[d];
      if (!e) continue;
      const a = mapById[r.id];
      const b = mapById[exitId(e)];
      if (!b) continue; // ya reportado por existencia
      if (d === 'right' || d === 'left') {
        // Borde vertical: última columna de A vs primera de B (o al revés).
        const aCol = d === 'right' ? a[0].length - 1 : 0;
        const bCol = d === 'right' ? 0 : b[0].length - 1;
        if (a.length !== b.length) {
          fail(`${r.id}.${d}->${exitId(e)}: distinto alto (${a.length} vs ${b.length}) para cruzar`);
          continue;
        }
        if (openRows(a, aCol) !== openRows(b, bCol))
          fail(`${r.id}.${d}->${exitId(e)}: huecos del borde ${d} desalineados`);
      } else {
        // Borde horizontal: última fila de A vs primera de B (o al revés).
        const aRow = d === 'down' ? a[a.length - 1] : a[0];
        const bRow = d === 'down' ? b[0] : b[b.length - 1];
        if (a[0].length !== b[0].length) {
          fail(`${r.id}.${d}->${exitId(e)}: distinto ancho (${a[0].length} vs ${b[0].length})`);
          continue;
        }
        if (openCols(aRow) !== openCols(bRow))
          fail(`${r.id}.${d}->${exitId(e)}: huecos del borde ${d} desalineados`);
      }
    }
}

// --- Retorno desde one-way (§4.4): desde el destino de un one-way se debe
//     poder volver al grafo principal por OTRA ruta (BFS ignorando ese
//     one-way puntual). Nunca dejar una reliquia/gate detrás de un one-way
//     sin retorno.
for (const r of ROOMS)
  for (const d of DIRS) {
    const e = r.exits?.[d];
    if (!e || !isOneWay(e)) continue;
    const dest = exitId(e);
    // BFS desde dest, prohibido usar el one-way r.d->dest.
    const vis = new Set([dest]);
    const cola = [dest];
    let volvio = false;
    while (cola.length) {
      const cur = byId[cola.shift()!];
      for (const dd of DIRS) {
        const ee = cur.exits?.[dd];
        if (!ee) continue;
        if (cur.id === r.id && dd === d) continue; // el one-way prohibido en su sentido
        const nid = exitId(ee);
        if (nid === r.id) volvio = true; // volvimos al origen del one-way
        if (!vis.has(nid)) {
          vis.add(nid);
          cola.push(nid);
        }
      }
    }
    if (!volvio) fail(`one-way ${r.id}.${d}->${dest} sin ruta de retorno al grafo`);
  }

// --- Existencia de contenido básico ---
{
  const w = new World();
  if (w.allCrystals.length <= 0) fail('no hay cristales');
  if (!w.allRooms.some((rm: any) => rm.level.doorBox)) fail('no hay puerta D');
}

// --- Alcanzabilidad desde el SPAWN (§4.6, guardia dura): maneja al Player REAL
//     desde el punto de aparición de la sala inicial y confirma que llega a
//     CADA borde de salida. Atrapa el "spawn encerrado" que ni el grafo ni la
//     alineación de huecos ven (reachability interna).
{
  const spawnRoom = ROOMS[0];
  const lvl: any = new (await import('../src/game/Level.ts')).Level(spawnRoom.map);
  // Bordes de salida a alcanzar (en px, centro del hueco).
  const targets: { dir: string; x: number; y: number }[] = [];
  const openSpan = (cells: number[]) => (cells.length ? cells[Math.floor(cells.length / 2)] : -1);
  for (const d of DIRS) {
    if (!spawnRoom.exits?.[d]) continue;
    if (d === 'right') targets.push({ dir: d, x: lvl.widthPx - TILE, y: 0 });
    else if (d === 'left') targets.push({ dir: d, x: TILE, y: 0 });
    else if (d === 'up') {
      const cols: number[] = [];
      for (let c = 0; c < lvl.cols; c++) if (spawnRoom.map[0][c] !== '#') cols.push(c);
      targets.push({ dir: d, x: openSpan(cols) * TILE, y: TILE });
    } else {
      const cols: number[] = [];
      const last = spawnRoom.map[spawnRoom.map.length - 1];
      for (let c = 0; c < lvl.cols; c++) if (last[c] !== '#') cols.push(c);
      targets.push({ dir: d, x: openSpan(cols) * TILE, y: lvl.heightPx - TILE });
    }
  }
  const makeRng = (seed: number) => { let s = seed; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); };
  // ¿Se alcanza un target deambulando con kit completo? (muchas semillas)
  const canReach = (tx: number, ty: number): boolean => {
    for (let seed = 1; seed <= 60; seed++) {
      const p: any = new Player(lvl, new Particles() as any);
      p.abilities.doubleJump = true; p.abilities.wallJump = true; p.abilities.dash = true; p.abilities.glide = true;
      input.releaseAll();
      p.x = lvl.playerSpawn.x + 1; p.y = lvl.playerSpawn.y;
      const rng = makeRng(seed * 2654435761);
      let dir = 1;
      for (let i = 0; i < 2200; i++) {
        if (i % 24 === 0) dir = rng() < 0.5 ? -1 : 1;
        input.touchButton('left', dir < 0); input.touchButton('right', dir > 0);
        input.touchButton('jump', rng() < 0.6);
        input.touchButton('dash', rng() < 0.08);
        p.update(1 / 60); input.endStep();
        // Cerca del target (a media altura no importa para bordes horizontales).
        const nearX = Math.abs(p.x + p.w / 2 - tx) < TILE;
        const nearY = ty === 0 ? true : Math.abs(p.y + p.h / 2 - ty) < TILE * 2;
        if (nearX && nearY) { input.releaseAll(); return true; }
        if (p.y > lvl.heightPx + 20) { p.x = lvl.playerSpawn.x + 1; p.y = lvl.playerSpawn.y; p.vy = 0; }
      }
      input.releaseAll();
    }
    return false;
  };
  let reached = 0;
  for (const t of targets) {
    if (canReach(t.x, t.y)) reached++;
    else fail(`spawn: no se alcanza la salida ${t.dir} desde el punto de aparición (encerrado?)`);
  }
  if (reached === targets.length && targets.length > 0)
    ok(`spawn: se alcanzan las ${targets.length} salidas desde el punto de aparición`);
}

// --- §4.5 fixpoint de completitud: la ÚNICA garantía real de que el juego
//     se puede terminar al 100% (la victoria exige TODOS los cristales).
//
//   kit = {}
//   repetir hasta punto fijo:
//     alcanzables = BFS desde ROOMS[0] cruzando SOLO salidas cuya
//       habilidad-requerida (por Exit.requires o por un char-gate en el
//       borde, según GATE_ABILITY) esté en kit.
//     por cada reliquia en salas alcanzables: kit += esa habilidad.
//   afirmar: con el kit final, TODA sala con cristal es alcanzable.
//   afirmar: ningún gate bloquea el ÚNICO camino a la habilidad que lo abre
//            (se desprende: si el fixpoint no llega a una reliquia, el
//             assert de arriba falla).
// Un grafo mínimo para el fixpoint: salas con salidas anotadas (id destino +
// habilidades requeridas para cruzar) y las reliquias que da cada sala.
interface FixNode {
  id: string;
  exits: { to: string; reqs: string[] }[];
  relics: string[];
}

/** BFS desde `start` cruzando SOLO salidas cuyos reqs estén todos en `kit`. */
function reachableWith(nodes: Record<string, FixNode>, start: string, kit: Set<string>): Set<string> {
  const seen = new Set([start]);
  const cola = [start];
  while (cola.length) {
    const cur = nodes[cola.shift()!];
    if (!cur) continue;
    for (const ex of cur.exits) {
      if (!ex.reqs.every((a) => kit.has(a))) continue; // gate cerrado
      if (!seen.has(ex.to)) {
        seen.add(ex.to);
        cola.push(ex.to);
      }
    }
  }
  return seen;
}

/** Corre el fixpoint: acumula reliquias de lo alcanzable hasta punto fijo y
 *  devuelve el conjunto final de salas alcanzables con el kit completo. */
function runFixpoint(nodes: Record<string, FixNode>, start: string): Set<string> {
  const kit = new Set<string>();
  const ids = Object.keys(nodes);
  let reachable = reachableWith(nodes, start, kit);
  for (let iter = 0; iter <= ids.length + 2; iter++) {
    const before = kit.size;
    for (const id of reachable) for (const ab of nodes[id]?.relics ?? []) kit.add(ab);
    reachable = reachableWith(nodes, start, kit);
    if (kit.size === before) break; // punto fijo
  }
  return reachable;
}

// --- Auto-test del fixpoint (datos sintéticos): confirma que detecta un
//     cristal detrás de un gate que abre una reliquia (alcanzable) y que
//     marca inalcanzable un cristal detrás de un gate SIN reliquia que lo abra.
{
  const nodes: Record<string, FixNode> = {
    a: { id: 'a', exits: [{ to: 'b', reqs: [] }], relics: [] },
    b: { id: 'b', exits: [{ to: 'c', reqs: ['glide'] }], relics: ['glide'] }, // b da glide
    c: { id: 'c', exits: [], relics: [] }, // cristal detrás del gate glide
    z: { id: 'z', exits: [], relics: [] }, // solo alcanzable tras 'gill' (nadie la da)
  };
  nodes.b.exits.push({ to: 'z', reqs: ['gill'] });
  const reach = runFixpoint(nodes, 'a');
  if (!reach.has('c')) fail('auto-test fixpoint: no alcanzó "c" tras conseguir glide (falso negativo)');
  if (reach.has('z')) fail('auto-test fixpoint: alcanzó "z" sin la habilidad "gill" (falso positivo)');
  if (reach.has('c') && !reach.has('z')) ok('auto-test del fixpoint (gate abre / gate imposible)');
}

// --- §4.5 fixpoint sobre el mundo real ---
{
  const world = new World();
  const borderCells = (map: string[], dir: string): string[] => {
    if (dir === 'up') return map[0].split('');
    if (dir === 'down') return map[map.length - 1].split('');
    const col = dir === 'right' ? map[0].length - 1 : 0;
    return map.map((row) => row[col]);
  };
  // Construimos el grafo del fixpoint desde ROOMS + el mundo vivo.
  const relicsByRoom: Record<string, string[]> = {};
  const crystalsByRoom: Record<string, number> = {};
  for (const rm of world.allRooms) {
    relicsByRoom[rm.def.id] = rm.level.relicCells.map((c: any) => c.ability);
    crystalsByRoom[rm.def.id] = rm.level.crystalCells.length;
  }
  const nodes: Record<string, FixNode> = {};
  for (const r of ROOMS) {
    const exits: { to: string; reqs: string[] }[] = [];
    for (const d of DIRS) {
      const e = r.exits?.[d];
      if (!e) continue;
      const reqs: string[] = [];
      const direct = exitRequires(e);
      if (direct) reqs.push(direct);
      for (const ch of borderCells(r.map, d)) {
        const gate = (GATE_ABILITY as Record<string, string>)[ch];
        if (gate) reqs.push(gate);
      }
      exits.push({ to: exitId(e), reqs });
    }
    nodes[r.id] = { id: r.id, exits, relics: relicsByRoom[r.id] ?? [] };
  }

  const reachable = runFixpoint(nodes, ROOMS[0].id);
  for (const r of ROOMS)
    if ((crystalsByRoom[r.id] ?? 0) > 0 && !reachable.has(r.id))
      fail(`fixpoint: la sala ${r.id} tiene cristal pero es inalcanzable con el kit completo`);
  for (const rm of world.allRooms)
    if (rm.level.doorBox && !reachable.has(rm.def.id))
      fail(`fixpoint: la puerta (sala ${rm.def.id}) es inalcanzable con el kit completo`);
}

void Level;

// --- Techo de bundle (§4.6): mide el gzip de dist/assets/*.js y falla si
//     supera ~30 kB (hoy ~15). Detecta el crecimiento del arte-en-código
//     dentro del loop, no a la mañana. Requiere que `npm run build` haya
//     corrido antes (el hook lo hace; el pre-commit corre build && check).
if (existsSync('dist/assets')) {
  let tot = 0;
  for (const f of readdirSync('dist/assets'))
    if (f.endsWith('.js')) tot += gzipSync(readFileSync(`dist/assets/${f}`)).length;
  if (tot > 30 * 1024) fail(`bundle gzip ${(tot / 1024).toFixed(1)}kB supera el techo de 30kB`);
  else ok(`bundle gzip ${(tot / 1024).toFixed(1)}kB (techo 30kB)`);
} else {
  console.log('  · dist/assets ausente: corré "npm run build" para medir el bundle');
}

if (fallos) {
  console.error(`\nCHECK ROJO: ${fallos} fallo(s).`);
  process.exit(1);
}
console.log('\nCHECK VERDE');
