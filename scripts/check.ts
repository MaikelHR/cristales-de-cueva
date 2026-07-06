// scripts/check.ts — red de seguridad headless. FUERA de src/: tsc no lo
// tipa, vite no lo empaqueta. Se corre con:  npm run check
//
// Los stubs van ANTES de importar el juego (import dinámico), porque art.ts
// hornea sprites al cargar (document.createElement + getContext) y Game llama
// a loadSave() -> localStorage. Sin esto el import revienta con
// "document is not defined".

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
const { exitId, isOneWay } = await import('../src/game/rooms/RoomDef.ts');
const { Level } = await import('../src/game/Level.ts');

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
  for (let i = 0; i < 20000; i++) game.update(1 / 60);
  void world;
  ok('smoke: World + 20k pasos de Game sin reventar');
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

// --- §4.5 fixpoint de habilidades: se implementa acá cuando existan las
//     tablas GATE_ABILITY / REGION_ENTRY (P0.3 completo). Por ahora, sin
//     gates, la conectividad del grafo ya garantiza el 100%.
void Level;

if (fallos) {
  console.error(`\nCHECK ROJO: ${fallos} fallo(s).`);
  process.exit(1);
}
console.log('\nCHECK VERDE');
