// ============================================================
//  SONDA DE FÍSICA Y "FEEL"  (parte del harness — corre en check)
// ------------------------------------------------------------
//  El run nocturno nunca MIDIÓ el feel: el smoke solo probaba que no
//  reventara. Acá conducimos al Player REAL a través de la física REAL y
//  medimos números concretos (alto de salto, distancia de dash, caída del
//  planeo, ventana de coyote) y los afirmamos contra rangos esperados. Un
//  cambio accidental en una constante de Player.ts (que hace que el juego se
//  sienta mal) cae acá, no en la mano del jugador.
//
//  Además probamos que CADA salto/abismo real de CADA sala sea franqueable con
//  el kit disponible — con la física de verdad, no una caminata al azar — y que
//  NINGÚN salto exija más de lo que el kit da (soft-lock / salto injusto).
//
//  Se importa desde check.ts (runFeel) para que bloquee cada commit. NO stubea
//  el DOM: asume que check.ts ya puso los stubs antes de importar el juego.
// ============================================================

import type { Level as LevelT } from '../src/game/Level.ts';

// Tipos mínimos de lo que importamos dinámicamente (check ya tiene los stubs).
type Deps = {
  Level: typeof import('../src/game/Level.ts').Level;
  TILE: number;
  Player: typeof import('../src/game/Player.ts').Player;
  Particles: typeof import('../src/game/Particles.ts').Particles;
  input: typeof import('../src/engine/input.ts');
  ROOMS: import('../src/game/rooms/RoomDef.ts').RoomDef[];
  exitId: typeof import('../src/game/rooms/RoomDef.ts').exitId;
  exitRequires: typeof import('../src/game/rooms/RoomDef.ts').exitRequires;
};

type AbilityName = 'doubleJump' | 'dash' | 'wallJump' | 'glide';
const DT = 1 / 60;

/** Un Player recién nacido en un Level, con las habilidades pedidas. */
function mkPlayer(d: Deps, level: LevelT, abilities: AbilityName[]): any {
  const p: any = new d.Player(level, new d.Particles() as any);
  for (const a of abilities) p.abilities[a] = true;
  return p;
}

/** Level de una sola columna vacía, para medir la física sin obstáculos.
 *  Piso abajo, techo lejos (h filas de aire). Spawn sobre el piso. */
function emptyColumn(d: Deps, w = 9, h = 40): LevelT {
  const rows: string[] = [];
  rows.push('#'.repeat(w));
  for (let r = 0; r < h; r++) rows.push('#' + '.'.repeat(w - 2) + '#');
  // El spawn 'P' en la penúltima fila (justo sobre el piso).
  const floorRow = '#' + '.'.repeat(w - 2) + '#';
  const spawnRow = '#' + '.'.repeat(Math.floor(w / 2) - 1) + 'P' + '.'.repeat(w - 2 - Math.floor(w / 2)) + '#';
  rows[rows.length - 1] = spawnRow;
  rows.push('#'.repeat(w));
  void floorRow;
  return new d.Level(rows);
}

/** Sostiene 'jump' de forma realista: presiona en el primer frame (flanco de
 *  subida => justPressed), lo mantiene hasta `holdFrames`, luego lo suelta. */
function stepHoldingJump(d: Deps, p: any, frame: number, holdFrames: number, dir = 0): void {
  d.input.touchButton('left', dir < 0);
  d.input.touchButton('right', dir > 0);
  d.input.touchButton('jump', frame < holdFrames);
  p.update(DT);
  d.input.endStep();
}

/** Máxima altura (px) de un salto reteniendo la tecla `holdFrames` frames.
 *  Devuelve cuánto SUBIÓ respecto del punto de partida. */
function measureJumpHeight(d: Deps, abilities: AbilityName[], holdFrames: number, doubleJump = false): number {
  const level = emptyColumn(d);
  const p = mkPlayer(d, level, abilities);
  d.input.releaseAll();
  const y0 = p.y;
  let peak = p.y;
  let didDouble = false;
  for (let f = 0; f < 200; f++) {
    // Doble salto: soltamos y re-presionamos en el ápice del primer salto.
    if (doubleJump && !didDouble && f > 4 && p.vy > -5 && p.vy < 40) {
      d.input.touchButton('jump', false); // soltar
      p.update(DT);
      d.input.endStep();
      d.input.touchButton('jump', true); // re-presionar (flanco => doble salto)
      p.update(DT);
      d.input.endStep();
      didDouble = true;
      continue;
    }
    stepHoldingJump(d, p, f, holdFrames);
    peak = Math.min(peak, p.y);
    if (f > 10 && p.onGround) break; // volvió al piso
  }
  d.input.releaseAll();
  return y0 - peak; // px que subió
}

/** Deja caer al jugador hasta que toca el piso (settle) antes de medir. */
function land(d: Deps, p: any): void {
  for (let i = 0; i < 20 && !p.onGround; i++) {
    p.update(DT);
    d.input.endStep();
  }
}

/** Distancia horizontal (px) que cubre un dash desde parado en el piso. */
function measureDashDistance(d: Deps): number {
  const level = emptyColumn(d, 60, 6);
  const p = mkPlayer(d, level, ['dash']);
  d.input.releaseAll();
  land(d, p); // el dash desde el piso es el caso canónico
  p.facing = 1;
  const x0 = p.x;
  // Dispara el dash (flanco de subida de 'dash') y deja correr su duración.
  d.input.touchButton('dash', true);
  p.update(DT);
  d.input.endStep();
  d.input.touchButton('dash', false);
  let maxX = p.x;
  for (let f = 0; f < 30; f++) {
    p.update(DT);
    d.input.endStep();
    maxX = Math.max(maxX, p.x);
  }
  d.input.releaseAll();
  return maxX - x0;
}

/** Velocidad de caída (px/s) mientras se planea (glide) en aire libre. */
function measureGlideFall(d: Deps): number {
  const level = emptyColumn(d, 9, 60);
  const p = mkPlayer(d, level, ['glide']);
  d.input.releaseAll();
  // Lo ponemos alto y en caída, reteniendo saltar (=> planeo).
  p.y = 40;
  p.vy = 100;
  d.input.touchButton('jump', true); // sostenido durante toda la caída
  let lastY = p.y;
  let fall = 0;
  for (let f = 0; f < 40; f++) {
    p.update(DT);
    d.input.endStep();
    if (f > 5) fall = (p.y - lastY) / DT; // px/s estabilizado
    lastY = p.y;
    if (p.onGround) break;
  }
  d.input.releaseAll();
  return fall;
}

/** Máximo VUELO horizontal (px) partiendo de un salto+dash aéreo, midiendo
 *  cuánto avanza en X mientras está por ENCIMA de la altura de partida (o sea,
 *  el ancho de abismo que puede cruzar sin caer por debajo del borde). */
function measureAirGap(d: Deps, abilities: AbilityName[]): number {
  const canGlide = abilities.includes('glide');
  const level = emptyColumn(d, 160, 30);
  const p = mkPlayer(d, level, abilities);
  d.input.releaseAll();
  land(d, p);
  p.facing = 1;
  const x0 = p.x;
  const yFloor = p.y; // altura del borde desde el que salta (nivel de aterrizaje)
  const TOL = TOLPX(d); // cuánto puede bajar el borde antes de considerarse caído
  let reach = 0;
  let didDouble = false;
  let didDash = false;
  for (let f = 0; f < 200; f++) {
    d.input.touchButton('right', true);
    // Salto: flanco de subida en f=0; luego se MANTIENE. Sin glide, soltamos
    // al empezar a bajar (retener no ayuda). Con glide, seguimos reteniendo en
    // el descenso: eso engancha el planeo (hold + cayendo) y vuela lejos.
    const holdJump = f < 22 || (canGlide && p.vy > 0);
    d.input.touchButton('jump', holdJump);

    // Doble salto al empezar a bajar (gana distancia y altura).
    if (abilities.includes('doubleJump') && !didDouble && f > 6 && p.vy > 5) {
      d.input.touchButton('jump', false);
      p.update(DT); d.input.endStep();
      d.input.touchButton('jump', true);
      p.update(DT); d.input.endStep();
      didDouble = true;
      continue;
    }
    // Dash horizontal cerca del ápice: extiende el alcance de golpe.
    if (abilities.includes('dash') && !didDash && f > 8 && Math.abs(p.vy) < 70) {
      d.input.touchButton('dash', true);
      p.update(DT); d.input.endStep();
      d.input.touchButton('dash', false);
      didDash = true;
      continue;
    }
    p.update(DT);
    d.input.endStep();
    // El "abismo cruzable" = avance en X mientras no cae más de TOL bajo el borde.
    if (p.y <= yFloor + TOL) reach = Math.max(reach, p.x - x0);
    else break; // cayó por debajo del borde de aterrizaje: fin del vuelo útil
    if (p.onGround && f > 4) { reach = Math.max(reach, p.x - x0); break; }
  }
  d.input.releaseAll();
  return reach;
}

/** Tolerancia vertical de aterrizaje: un abismo entre dos repisas a la misma
 *  altura sólo se cruza si el jugador no baja más de ~1 celda al llegar. */
function TOLPX(d: Deps): number { return d.TILE; }

// ------------------------------------------------------------
//  Análisis de geometría: el SALTO HORIZONTAL más ancho que el jugador está
//  OBLIGADO a hacer entre repisas transitables.
// ------------------------------------------------------------
//  El enfoque anterior ("encontrar la fila de piso y buscar huecos ahí") era
//  frágil: analizaba UNA sola fila (perdía saltos entre plataformas elevadas),
//  elegía el techo si nada superaba el 40% sólido, y confundía tiros de viento
//  y bordes de plataformas flotantes con abismos (falsos positivos y negativos
//  detectados en la review adversarial). Este enfoque es geométricamente sano y
//  un LOWER BOUND del salto forzado (no falsea-pasa saltos imposibles ni
//  falsea-falla plataformas decorativas).

interface Surface { row: number; from: number; to: number } // repisa transitable

/** Toda repisa transitable: una corrida horizontal de celdas donde el jugador
 *  puede PARARSE — '#' o '-' (plataforma un-sentido) con AIRE justo encima (no
 *  otro sólido). El viento '^' cuenta como transitable (se sube por él), así que
 *  no parte una repisa ni cuenta como abismo. */
function walkableSurfaces(map: string[]): Surface[] {
  const rows = map.length;
  const cols = map[0].length;
  const isSolid = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols && map[r][c] === '#';
  // ¿Se puede PARAR en (r,c)? Suelo sólido/plank con espacio de cabeza DENTRO de
  // la sala encima (aire/viento/hazard/contenido). La celda de arriba debe estar
  // EN LÍMITES y no ser sólida: así el borde superior de la sala (techo, sin
  // celda arriba) NO cuenta como repisa donde pararse (no te parás en el techo).
  const standable = (r: number, c: number): boolean => {
    if (r <= 0 || r >= rows || c < 0 || c >= cols) return false; // r<=0: no hay piso en el techo
    const ch = map[r][c];
    if (ch !== '#' && ch !== '-') return false;
    return !isSolid(r - 1, c); // hay hueco de cabeza encima (y r-1 está en límites)
  };
  const surfaces: Surface[] = [];
  for (let r = 0; r < rows; r++) {
    let start = -1;
    for (let c = 0; c <= cols; c++) {
      if (c < cols && standable(r, c)) {
        if (start < 0) start = c;
      } else if (start >= 0) {
        surfaces.push({ row: r, from: start, to: c - 1 });
        start = -1;
      }
    }
  }
  return surfaces;
}

/** El salto horizontal más ancho que el jugador está OBLIGADO a hacer.
 *
 *  Para el borde derecho de cada repisa, buscamos la repisa más CERCANA a su
 *  derecha donde podría aterrizar (a una altura alcanzable: hasta ~4 celdas
 *  arriba —el kit sube eso— o cualquier cantidad hacia abajo). El hueco =
 *  distancia horizontal hasta esa repisa. Como tomamos la MÁS CERCANA, una
 *  plataforma decorativa flotando sobre el piso NO cuenta como abismo (el piso
 *  de abajo es una repisa más cercana donde caer). Ídem por el borde izquierdo.
 *  Devuelve el máximo hueco (en CELDAS) y dónde está. */
export function widestForcedJump(map: string[]): { cells: number; row: number; col: number } {
  const rows = map.length;
  const surfaces = walkableSurfaces(map);
  // Rejilla de "parable" para consultar rápido si una celda es repisa.
  const isSolid = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < map[0].length && map[r][c] === '#';
  const standAt: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    standAt[r] = [];
    for (let c = 0; c < map[0].length; c++) {
      const ch = map[r][c];
      // r<=0 (techo) nunca es repisa: no hay piso donde pararse en el borde
      // superior. Debajo, hace falta '#'/'-' con hueco de cabeza (aire adentro).
      standAt[r][c] = r > 0 && (ch === '#' || ch === '-') && !isSolid(r - 1, c);
    }
  }
  const UP_REACH = 4; // celdas hacia arriba que el kit alcanza de un salto
  let best = { cells: 0, row: 0, col: 0 };

  /** Desde una celda de despegue (r0,c0), busca la repisa aterrizable más
   *  cercana yendo en dirección `dir` (+1 der, -1 izq). Devuelve la distancia
   *  horizontal en celdas, o Infinity si no hay ninguna (borde/pared). */
  const nearestLanding = (r0: number, c0: number, dir: 1 | -1): number => {
    const cols = map[0].length;
    for (let d = 1; d < cols; d++) {
      const c = c0 + dir * d;
      if (c < 0 || c >= cols) return Infinity; // salió de la sala: no es un salto de nivel
      // ¿Hay una repisa aterrizable en esta columna, a altura alcanzable?
      for (let r = Math.max(0, r0 - UP_REACH); r < rows; r++) {
        if (standAt[r][c]) return d; // primera repisa (de arriba a abajo) a esta distancia
      }
    }
    return Infinity;
  };

  for (const s of surfaces) {
    // Sólo consideramos un borde como "despegue" si al lado inmediato hay AIRE
    // (si no, la repisa sigue o topa una pared: no hay salto).
    const cols = map[0].length;
    for (const [edgeCol, dir] of [[s.to, 1], [s.from, -1]] as [number, 1 | -1][]) {
      const nextCol = edgeCol + dir;
      if (nextCol < 0 || nextCol >= cols) continue;
      if (standAt[s.row][nextCol]) continue; // la repisa continúa: no es borde
      const gap = nearestLanding(s.row, edgeCol, dir);
      if (gap === Infinity) continue; // sin repisa de destino: borde de sala, no un salto interno
      const cells = gap - 1; // celdas de aire entre las dos repisas
      if (cells > best.cells) best = { cells, row: s.row, col: edgeCol };
    }
  }
  return best;
}

// ------------------------------------------------------------
//  API pública: runFeel(fail, ok) — corrida desde check.ts
// ------------------------------------------------------------

export async function runFeel(
  fail: (m: string) => void,
  ok: (m: string) => void,
): Promise<void> {
  const Level = (await import('../src/game/Level.ts')).Level;
  const { TILE } = await import('../src/game/Level.ts');
  const { Player } = await import('../src/game/Player.ts');
  const { Particles } = await import('../src/game/Particles.ts');
  const input = await import('../src/engine/input.ts');
  const { ROOMS } = await import('../src/game/rooms/index.ts');
  const { exitId, exitRequires } = await import('../src/game/rooms/RoomDef.ts');
  const d: Deps = { Level, TILE, Player, Particles, input, ROOMS, exitId, exitRequires };

  // ---- 1) CALIBRACIÓN DE FEEL: rangos esperados de las mecánicas base. ----
  // Rangos derivados de las constantes de Player.ts (JUMP_SPEED=215, GRAVITY=680,
  // etc.) con margen: si alguien toca una constante y rompe el feel, esto lo ve.
  const singleJump = measureJumpHeight(d, [], 30);
  if (singleJump < 26 || singleJump > 46)
    fail(`feel: alto de salto ${singleJump.toFixed(1)}px fuera de rango [26,46] (¿tocaste JUMP_SPEED/GRAVITY?)`);
  else ok(`feel: salto simple ${singleJump.toFixed(1)}px (rango sano)`);

  // Salto corto (soltar temprano) debe ser NOTABLEMENTE más bajo que el largo:
  // esa diferencia ES el salto variable, un pilar del game feel.
  const shortJump = measureJumpHeight(d, [], 3);
  if (shortJump >= singleJump - 6)
    fail(`feel: el salto variable no responde (corto ${shortJump.toFixed(1)} vs largo ${singleJump.toFixed(1)})`);
  else ok(`feel: salto variable presente (corto ${shortJump.toFixed(1)} < largo ${singleJump.toFixed(1)})`);

  const dblJump = measureJumpHeight(d, ['doubleJump'], 30, true);
  if (dblJump < singleJump + 12)
    fail(`feel: el doble salto no gana altura real (${dblJump.toFixed(1)} vs simple ${singleJump.toFixed(1)})`);
  else ok(`feel: doble salto alcanza ${dblJump.toFixed(1)}px (> simple)`);

  const dash = measureDashDistance(d);
  if (dash < 26 || dash > 60)
    fail(`feel: distancia de dash ${dash.toFixed(1)}px fuera de rango [26,60]`);
  else ok(`feel: dash cubre ${dash.toFixed(1)}px`);

  const glideFall = measureGlideFall(d);
  // El planeo debe caer MUCHO más lento que la caída libre (MAX_FALL=280).
  if (glideFall > 90 || glideFall < 20)
    fail(`feel: caída de planeo ${glideFall.toFixed(0)}px/s fuera de rango [20,90] (¿planeo roto?)`);
  else ok(`feel: planeo cae a ${glideFall.toFixed(0)}px/s (suave)`);

  // ---- 2) ABISMOS DE SALA franqueables con el kit — física real. ----
  // Alcance máximo del kit completo (para comparar contra cada abismo).
  const fullKit: AbilityName[] = ['doubleJump', 'dash', 'wallJump', 'glide'];
  const baseKit: AbilityName[] = ['doubleJump', 'dash', 'wallJump']; // sin planeo
  const reachFull = measureAirGap(d, fullKit);
  const reachBase = measureAirGap(d, baseKit);
  ok(`feel: alcance de abismo — kit base ${reachBase.toFixed(0)}px, con planeo ${reachFull.toFixed(0)}px`);

  // Salas donde el planeo YA es obligatorio para entrar (gate): ahí el jugador
  // tiene glide por definición, así que medimos contra reachFull.
  const gatedRooms = new Set<string>();
  for (const r of ROOMS) {
    for (const dir of ['left', 'right', 'up', 'down'] as const) {
      const e = (r.exits as any)?.[dir];
      if (e && exitRequires(e) === 'glide') gatedRooms.add(exitId(e));
    }
  }

  let checkedRooms = 0;
  let widest = 0;
  for (const r of ROOMS) {
    // Guarda de forma (F5): estas funciones leen r.map sin construir un Level.
    if (!r.map || r.map.length === 0 || !r.map[0]) { fail(`feel: la sala ${r.id} tiene un mapa vacío`); continue; }
    const w0 = r.map[0].length;
    if (r.map.some((row) => row.length !== w0)) { fail(`feel: la sala ${r.id} tiene filas de distinto ancho`); continue; }
    const jump = widestForcedJump(r.map);
    checkedRooms++;
    widest = Math.max(widest, jump.cells);
    if (jump.cells <= 0) continue; // sin saltos horizontales forzados en esta sala
    // Presupuesto de alcance: si la sala SÓLO es alcanzable teniendo planeo (un
    // gate de glide la protege), el jugador ya tiene planeo -> reachFull. Si no,
    // el salto debe cruzarse con el kit base (el planeo se consigue DESPUÉS).
    const reach = gatedRooms.has(r.id) ? reachFull : reachBase;
    const gapPx = jump.cells * TILE;
    // El jugador despega desde el borde de la repisa y aterriza en el borde de
    // la otra: eso da ~1 celda de gracia a cada lado sobre el hueco de aire.
    // Exigimos alcance >= hueco - 1 celda (tolerancia de despegue/aterrizaje).
    const need = gapPx - TILE;
    if (reach < need) {
      fail(
        `feel: la sala ${r.id} exige un salto de ${jump.cells} celdas (${gapPx}px) ` +
          `en la fila ${jump.row}, col ${jump.col}, pero el alcance disponible es ` +
          `${reach.toFixed(0)}px (< ${need}px). ¿Salto imposible o soft-lock?`,
      );
    }
  }
  ok(`feel: ${checkedRooms} salas analizadas; salto forzado más ancho ${widest} celdas, franqueable con el kit correspondiente`);
}
