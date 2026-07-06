// ============================================================
//  MÉTRICAS DE DISEÑO DE NIVEL  (parte del harness — corre en check)
// ------------------------------------------------------------
//  El run nocturno produjo "cajas gigantes vacías": salas enormes con unas
//  pocas plataformas finas flotando y cristales sueltos, sin ritmo ni hitos.
//  El check anterior no lo veía (solo probaba que fueran completables). Acá
//  medimos NUMÉRICAMENTE la composición de cada sala y marcamos las que huelen
//  a vacío antes de que nadie las mire.
//
//  Dos niveles de severidad:
//   - HARD FAIL (bloquea el commit): algo roto de verdad — sala sin nada con
//     qué interactuar, un contenido inalcanzable por geometría, aire
//     absolutamente muerto (una franja gigantesca sin un solo apoyo).
//   - WARN (informa, no bloquea): olor a mala composición (densidad baja,
//     mucho aire muerto, poca variedad). Lo subjetivo lo cierra el juez de
//     visión (/revisar-calidad); esto lo cuantifica para no depender del ojo.
//
//  Umbrales pensados para un juego de 8px/celda, salas de ~64x22. Ajustables.
//  Asume que check.ts ya puso los stubs de DOM antes de importar el juego.
// ============================================================

type Grid = string[];

/** ¿Es una celda "de contenido" (algo que el jugador nota/usa)? */
const CONTENT_CHARS = new Set(['o', 'j', 'k', 'w', 'g', 's', 'b', 'c', 'B', 'e', 'F', 'D', 'x', 'L', '^', '-']);
/** Chars que son geometría de plataforma (piso donde pararse / plataformas). */
const PLATFORM_CHARS = new Set(['#', '-']);

interface RoomMetrics {
  id: string;
  cols: number;
  rows: number;
  area: number;
  airCells: number;
  solidCells: number;
  contentCount: number;
  /** relación de aire (0..1): cuánto de la sala es aire vacío. */
  airRatio: number;
  /** contenido por cada 100 celdas de aire (densidad de "cosas que hacer"). */
  contentPer100Air: number;
  /** el rectángulo de aire vacío más grande sin NINGÚN apoyo ni contenido
   *  (celdas). El "pozo muerto" que delata una caja vacía. */
  largestDeadRect: number;
  /** cuántas plataformas/repisas transitables distintas hay (segmentos
   *  horizontales de '#'/'-' con aire encima). Mide la "estructura" vertical. */
  platformSegments: number;
  /** variedad de tipos de contenido distintos (cristal, enemigo, hazard...). */
  variety: number;
  /** tramo horizontal más largo de piso/plataforma continuo sin quiebre ni
   *  contenido: un pasillo plano y aburrido si es enorme. */
  longestFlatRun: number;
}

function analyze(id: string, map: Grid): RoomMetrics {
  const rows = map.length;
  const cols = map[0].length;
  const area = rows * cols;
  let airCells = 0;
  let solidCells = 0;
  let contentCount = 0;
  const kinds = new Set<string>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = map[r][c];
      if (ch === '#') solidCells++;
      else if (ch === '.') airCells++;
      else airCells++; // el contenido ocupa una celda que por lo demás es aire
      if (CONTENT_CHARS.has(ch)) {
        contentCount++;
        kinds.add(ch === '-' ? 'plank' : ch);
      }
    }
  }

  // --- Rectángulo de aire muerto más grande ---
  // Una celda es "muerta" si es aire ('.') y NO es contenido y no toca (en las
  // 8 vecinas) ninguna plataforma ni contenido: puro vacío de relleno.
  const isSupportOrContent = (r: number, c: number): boolean => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return true; // el borde cuenta como apoyo
    const ch = map[r][c];
    return PLATFORM_CHARS.has(ch) || CONTENT_CHARS.has(ch);
  };
  const dead: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    dead[r] = [];
    for (let c = 0; c < cols; c++) {
      const ch = map[r][c];
      let d = ch === '.';
      if (d) {
        // Muerta sólo si ninguna de las 8 vecinas es apoyo/contenido.
        for (let dr = -1; dr <= 1 && d; dr++)
          for (let dc = -1; dc <= 1 && d; dc++) {
            if (dr === 0 && dc === 0) continue;
            if (isSupportOrContent(r + dr, c + dc)) d = false;
          }
      }
      dead[r][c] = d;
    }
  }
  const largestDeadRect = maxRectangle(dead);

  // --- Segmentos de plataforma transitable: '#'/'-' con aire justo encima ---
  let platformSegments = 0;
  let longestFlatRun = 0;
  for (let r = 0; r < rows; r++) {
    let run = 0;
    for (let c = 0; c <= cols; c++) {
      const walkable =
        c < cols &&
        (map[r][c] === '#' || map[r][c] === '-') &&
        r > 0 &&
        map[r - 1][c] !== '#'; // hay aire (o algo no sólido) encima => se camina
      if (walkable) {
        run++;
      } else {
        if (run > 0) {
          platformSegments++;
          longestFlatRun = Math.max(longestFlatRun, run);
        }
        run = 0;
      }
    }
  }

  const airRatio = airCells / area;
  const contentPer100Air = airCells > 0 ? (contentCount / airCells) * 100 : 0;

  return {
    id, cols, rows, area, airCells, solidCells, contentCount,
    airRatio, contentPer100Air, largestDeadRect, platformSegments,
    variety: kinds.size, longestFlatRun,
  };
}

/** Área del rectángulo lleno de `true` más grande dentro de una grilla
 *  booleana. Para cada fila arma un histograma de alturas y resuelve el mayor
 *  rectángulo del histograma con una pila monótona. O(rows*cols). */
function maxRectangle(grid: boolean[][]): number {
  const rows = grid.length;
  if (!rows) return 0;
  const cols = grid[0].length;
  const heights = new Array<number>(cols).fill(0);
  let best = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) heights[c] = grid[r][c] ? heights[c] + 1 : 0;
    best = Math.max(best, largestRectInHistogram(heights));
  }
  return best;
}

/** Mayor rectángulo bajo un histograma (pila de índices, ancho sentinela 0). */
function largestRectInHistogram(h: number[]): number {
  const stack: number[] = []; // índices con alturas crecientes
  let best = 0;
  for (let i = 0; i <= h.length; i++) {
    const cur = i < h.length ? h[i] : 0;
    while (stack.length && h[stack[stack.length - 1]] >= cur) {
      const height = h[stack.pop()!];
      const left = stack.length ? stack[stack.length - 1] : -1;
      const width = i - left - 1;
      best = Math.max(best, height * width);
    }
    stack.push(i);
  }
  return best;
}

// ------------------------------------------------------------
//  API pública: runMetrics(fail, ok) — corrida desde check.ts
// ------------------------------------------------------------

export async function runMetrics(
  fail: (m: string) => void,
  ok: (m: string) => void,
): Promise<void> {
  const { ROOMS } = await import('../src/game/rooms/index.ts');

  const warnings: string[] = [];
  const warn = (m: string) => warnings.push(m);

  const all: RoomMetrics[] = [];
  for (const r of ROOMS) {
    // Guarda de forma (F5): estas funciones leen r.map SIN construir un Level,
    // así que validamos acá lo que Level valida en su constructor. Un mapa vacío
    // o de filas dispares se reporta como fallo claro, no se misclasifica.
    if (!r.map || r.map.length === 0 || !r.map[0]) {
      fail(`metrics: la sala ${r.id} tiene un mapa vacío`);
      continue;
    }
    const w0 = r.map[0].length;
    if (r.map.some((row) => row.length !== w0)) {
      fail(`metrics: la sala ${r.id} tiene filas de distinto ancho (mapa no rectangular)`);
      continue;
    }
    const m = analyze(r.id, r.map);
    all.push(m);

    // ---- HARD FAILS: algo roto de verdad ----
    // (1) Una sala sin NADA con qué interactuar: relleno puro. "Interactuar"
    //     incluye hazards (x/L), viento (^) y plataformas un-sentido (-), no
    //     solo cristales/enemigos: una sala de puro platforming (púas + planks)
    //     es contenido legítimo. Usamos el mismo CONTENT_CHARS que la densidad
    //     (consistencia: lo que cuenta como contenido cuenta como interactuable).
    const hasInteractable = r.map.some((row) => [...row].some((ch) => CONTENT_CHARS.has(ch)));
    if (!hasInteractable)
      fail(`metrics: la sala ${r.id} no tiene NADA con qué interactuar (cristal/enemigo/reliquia/puerta/hazard/plataforma) — relleno vacío`);

    // (2) Aire muerto absoluto: un rectángulo vacío gigantesco (> 45% del área)
    //     sin un solo apoyo o cosa dentro. Eso es una caja hueca, no una sala.
    if (m.largestDeadRect > m.area * 0.45)
      fail(
        `metrics: la sala ${r.id} tiene un pozo de aire MUERTO de ${m.largestDeadRect} celdas ` +
          `(${((m.largestDeadRect / m.area) * 100).toFixed(0)}% de la sala) — caja vacía`,
      );

    // ---- WARNINGS: olor a mala composición (no bloquea) ----
    if (m.contentPer100Air < 1.2)
      warn(
        `${r.id}: densidad de contenido baja (${m.contentPer100Air.toFixed(2)} por 100 celdas de aire; ` +
          `sano ≳1.2) — mucho vacío entre cosas`,
      );
    if (m.largestDeadRect > m.area * 0.22)
      warn(
        `${r.id}: hueco de aire muerto grande (${m.largestDeadRect} celdas, ` +
          `${((m.largestDeadRect / m.area) * 100).toFixed(0)}% de la sala; sano ≲22%)`,
      );
    if (m.variety < 2 && m.contentCount > 0)
      warn(`${r.id}: poca variedad (${m.variety} tipo(s) de contenido) — se siente monótona`);
    if (m.platformSegments < 4 && m.area > 400)
      warn(`${r.id}: pocas plataformas (${m.platformSegments}) para su tamaño — estructura vertical pobre`);
    if (m.longestFlatRun > m.cols * 0.7)
      warn(`${r.id}: pasillo plano larguísimo (${m.longestFlatRun} celdas) — tramo sin nada`);
  }

  // Reporte tabular compacto para el ojo humano / el juez de visión.
  console.log('  · métricas por sala (id: aire% | dens/100 | muerto% | plats | var):');
  for (const m of all) {
    console.log(
      `      ${m.id.padEnd(12)} ${(m.airRatio * 100).toFixed(0).padStart(3)}%  ` +
        `${m.contentPer100Air.toFixed(2).padStart(5)}  ` +
        `${((m.largestDeadRect / m.area) * 100).toFixed(0).padStart(3)}%  ` +
        `${String(m.platformSegments).padStart(3)}  ${String(m.variety).padStart(2)}`,
    );
  }

  if (warnings.length) {
    console.log(`  ⚠ ${warnings.length} aviso(s) de composición (no bloquean, pero mirá /revisar-calidad):`);
    for (const w of warnings) console.log(`      ⚠ ${w}`);
  }
  ok(`metrics: ${all.length} salas analizadas (${warnings.length} aviso(s) de composición)`);
}
