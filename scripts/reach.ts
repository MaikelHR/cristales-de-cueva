// ============================================================
//  ALCANZABILIDAD DE PLATAFORMAS  (npm run reach; parte de check)
// ------------------------------------------------------------
//  El fixpoint de `check` prueba que el juego sea COMPLETABLE a nivel de salas.
//  Pero no ve DENTRO de una sala: una plataforma con un cristal puede quedar
//  colgada sin forma de saltar hasta ella ("no se puede pasar"). Esta puerta lo
//  atrapa con un grafo de alcanzabilidad de plataformas.
//
//  Modelo: GRAFO GEOMÉTRICO calibrado con el alcance MEDIDO del kit (feel.ts).
//  Una repisa B es alcanzable desde A si el salto A->B entra en el sobre del
//  kit: subir hasta ~UP celdas y cruzar hasta ~ACROSS celdas de hueco, o CAER
//  cualquier cantidad. Además, un muro pegado a una repisa permite treparlo con
//  wall-jump (subís pegado a la pared). BFS desde el piso principal; afirmamos
//  que toda plataforma con cristal/reliquia sea alcanzable.
//
//  Filosofía de calibración (es una puerta que BLOQUEA commits): conservador al
//  MARCAR. El sobre es GENEROSO (sobreestima un poco lo alcanzable) para no
//  falso-rechazar una sala buena; aún así atrapa la isla flagrante (una repisa a
//  8+ celdas de altura sin nada cerca ni pared). Preferimos no-marcar a
//  marcar-de-más: un falso positivo bloquea todo commit.
//
//  Se importa desde check.ts (runReach). Sin dependencia de simulación física.
// ============================================================

// Sobre del kit, en CELDAS (8px). Derivado de feel.ts (medido):
//  - doble salto ~58px ≈ 7 celdas de subida; con impulso de borde damos margen.
//  - alcance horizontal base ~96px ≈ 12 celdas; con dash/planeo más. Generoso.
//  - wall-jump: trepar una pared vertical sin límite práctico de altura.
const UP = 8;       // celdas que se sube de una repisa a otra más alta
const ACROSS = 14;  // celdas de separación horizontal cruzables (generoso)
const WALL_CLIMB = true; // una pared pegada permite escalar con wall-jump

interface Surface { id: number; row: number; from: number; to: number }

function surfaces(map: string[]): Surface[] {
  const rows = map.length;
  const cols = map[0].length;
  const isSolid = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols && map[r][c] === '#';
  const standable = (r: number, c: number): boolean => {
    if (r <= 0 || r >= rows || c < 0 || c >= cols) return false;
    const ch = map[r][c];
    if (ch !== '#' && ch !== '-') return false;
    return !isSolid(r - 1, c);
  };
  const out: Surface[] = [];
  let id = 0;
  for (let r = 0; r < rows; r++) {
    let start = -1;
    for (let c = 0; c <= cols; c++) {
      if (c < cols && standable(r, c)) {
        if (start < 0) start = c;
      } else if (start >= 0) {
        out.push({ id: id++, row: r, from: start, to: c - 1 });
        start = -1;
      }
    }
  }
  return out;
}

/** ¿Hay una pared trepable JUNTO a la repisa de DESTINO B, que llegue desde la
 *  altura de A hasta la de B? Trepás pegado a esa pared con wall-jump y salís
 *  sobre B. Sólo cuentan columnas inmediatamente al lado de B (no las paredes
 *  lejanas del contorno de la sala, que si no harían todo "alcanzable"). */
function wallBetween(map: string[], a: Surface, b: Surface): boolean {
  if (!WALL_CLIMB) return false;
  const rows = map.length, cols = map[0].length;
  const isSolid = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols && map[r][c] === '#';
  const lo = Math.min(a.row, b.row), hi = Math.max(a.row, b.row);
  if (hi - lo < 2) return false;
  // Columnas pegadas al DESTINO B (una a cada lado). La pared debe estar ahí,
  // no en el borde de la sala.
  for (const c of [b.from - 1, b.to + 1]) {
    if (c < 0 || c >= cols) continue;
    let run = 0, maxRun = 0;
    for (let r = lo; r <= hi; r++) { if (isSolid(r, c)) { run++; maxRun = Math.max(maxRun, run); } else run = 0; }
    // La pared debe cubrir casi todo el tramo vertical Y A debe estar cerca de
    // esa pared (para poder engancharla): el extremo de A a <= 3 celdas de c.
    const aNearWall = Math.min(Math.abs(a.from - c), Math.abs(a.to - c)) <= 3;
    if (maxRun >= (hi - lo) * 0.7 && aNearWall) return true;
  }
  return false;
}

/** ¿Se puede llegar de A a B con el kit? (sobre geométrico generoso.) */
function canJump(map: string[], a: Surface, b: Surface): boolean {
  // Separación horizontal: 0 si los rangos se solapan; si no, la brecha.
  const overlapX = a.from <= b.to && b.from <= a.to;
  const gapX = overlapX ? 0 : (a.from > b.to ? a.from - b.to - 1 : b.from - a.to - 1);
  const rise = a.row - b.row; // >0 si B está más ARRIBA que A
  // Caer: cualquier altura hacia abajo, si horizontalmente alcanza.
  if (rise <= 0) return gapX <= ACROSS;
  // Subir: hasta UP celdas y dentro del alcance horizontal.
  if (rise <= UP && gapX <= ACROSS) return true;
  // Más alto: solo si hay una pared trepable entre las dos (wall-jump).
  if (gapX <= 2 && wallBetween(map, a, b)) return true;
  return false;
}

/** Repisas alcanzables (islas) desde el piso principal de un mapa. */
function islands(map: string[]): { total: number; unreachable: Set<number>; surfs: Surface[] } {
  const surfs = surfaces(map);
  if (surfs.length === 0) return { total: 0, unreachable: new Set(), surfs };
  // Arranque: la repisa más baja y ancha (el piso principal; de ahí parte el
  // jugador al entrar por cualquier borde inferior/lateral).
  const floor = surfs.reduce((a, b) => {
    if (b.row > a.row) return b;
    if (b.row === a.row && b.to - b.from > a.to - a.from) return b;
    return a;
  });
  const seen = new Set([floor.id]);
  const queue = [floor];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const s of surfs) {
      if (seen.has(s.id)) continue;
      if (canJump(map, cur, s)) { seen.add(s.id); queue.push(s); }
    }
  }
  const unreachable = new Set(surfs.filter((s) => !seen.has(s.id)).map((s) => s.id));
  return { total: surfs.length, unreachable, surfs };
}

export async function runReach(
  fail: (m: string) => void,
  ok: (m: string) => void,
): Promise<void> {
  const { ROOMS } = await import('../src/game/rooms/index.ts');

  // Auto-test: isla flagrante detectada; sala conectada limpia.
  {
    const connected = [
      '##########',
      '#........#',
      '#..####..#', // repisa a 4 celdas del piso -> alcanzable (subida <= UP)
      '#........#',
      '#..........',
      '#.####...##',
      '##########',
    ];
    const island = [
      '################',
      '#..............#', // aire encima de la repisa flotante (si no, no es repisa)
      '#.....####.....#', // repisa flotante a ~9 celdas del piso, lejos de toda
      '#..............#', // pared lateral (cols 6-9) -> ISLA inalcanzable
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '################',
    ];
    const c = islands(connected);
    const i = islands(island);
    if (c.unreachable.size !== 0) fail(`reach auto-test: sala conectada reportó ${c.unreachable.size} isla(s) (falso positivo)`);
    if (i.unreachable.size < 1) fail('reach auto-test: sala con isla NO detectó la plataforma inalcanzable (falso negativo)');
    if (c.unreachable.size === 0 && i.unreachable.size >= 1) ok('reach: auto-test (conectada ok / isla detectada)');
  }

  // Mundo real.
  let flagged = 0;
  for (const r of ROOMS) {
    const map = r.map;
    const { unreachable, surfs } = islands(map);
    if (unreachable.size === 0) continue;
    // ¿Alguna repisa inalcanzable sostiene un cristal/reliquia? (Una repisa
    // vacía inalcanzable es decorativa; una CON pickup es un soft-lock.)
    const surfById = new Map(surfs.map((s) => [s.id, s]));
    const pickupOnSurface = (cellX: number, cellY: number): number => {
      // El pickup está en (cellX, cellY); su repisa es la fila de abajo.
      for (const s of surfs) if (s.row === cellY + 1 && cellX >= s.from && cellX <= s.to) return s.id;
      return -1;
    };
    for (let cy = 0; cy < map.length; cy++) {
      for (let cx = 0; cx < map[0].length; cx++) {
        const ch = map[cy][cx];
        if (ch !== 'o' && ch !== 'j' && ch !== 'k' && ch !== 'w' && ch !== 'g') continue;
        const sid = pickupOnSurface(cx, cy);
        if (sid < 0 || !unreachable.has(sid)) continue;
        const s = surfById.get(sid)!;
        flagged++;
        fail(
          `reach: en ${r.id}, ${ch === 'o' ? 'un cristal' : 'una reliquia'} (col ${cx}, fila ${cy}) está sobre una ` +
            `plataforma INALCANZABLE desde el piso (repisa fila ${s.row} cols ${s.from}-${s.to}). Isla: no se puede llegar saltando.`,
        );
      }
    }
  }

  if (flagged === 0) ok('reach: toda plataforma con cristal/reliquia es alcanzable desde el piso (sin islas)');
}
