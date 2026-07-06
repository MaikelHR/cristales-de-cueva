// ============================================================
//  LINTER DE SALAS  (npm run rooms) — ayuda de autoría
// ------------------------------------------------------------
//  Al editar el ASCII de una sala a mano es facilísimo dejar una fila con un
//  char de más o de menos (el run nocturno lo sufrió: bordes desalineados). Ni
//  bien pasa, Level.parse tira, pero con un mensaje genérico. Este linter da un
//  panorama de TODAS las salas de un vistazo: dimensiones, filas de ancho
//  incorrecto (con el índice exacto), estado de cada borde, y conteo de
//  contenido. Corrélo mientras editás; NO reemplaza a `npm run check`.
//
//  Lee los .ts de rooms/ como texto (sin bundlear): rápido y sin depender de
//  que el juego compile.
// ============================================================
import { readFileSync, readdirSync } from 'node:fs';

const ROOMS_DIR = 'src/game/rooms';
const files = readdirSync(ROOMS_DIR).filter(
  (f) => f.endsWith('.ts') && !['index.ts', 'RoomDef.ts'].includes(f),
);

let problems = 0;
let totalCrystals = 0;

console.log(`Salas en ${ROOMS_DIR}/:\n`);
for (const file of files.sort()) {
  const src = readFileSync(`${ROOMS_DIR}/${file}`, 'utf8');
  const mm = src.match(/map:\s*\[([\s\S]*?)\]/);
  if (!mm) { console.log(`  ${file}: (sin map[])`); continue; }
  const rows = [...mm[1].matchAll(/'([^']*)'/g)].map((x) => x[1]);
  if (rows.length === 0) { console.log(`  ${file}: map vacío`); problems++; continue; }

  const W = rows[0].length;
  const badWidth = rows.map((r, i) => [i, r.length]).filter(([, l]) => l !== W);
  const leftCol = rows.map((r) => r[0]).join('');
  const rightCol = rows.map((r) => r[r.length - 1]).join('');
  const topRow = rows[0];
  const botRow = rows[rows.length - 1];
  const rightSolid = /^#+$/.test(rightCol);
  const count = (ch) => rows.join('').split(ch).length - 1;
  const crystals = count('o');
  totalCrystals += crystals;

  const id = file.replace('.ts', '');
  const flags = [];
  if (badWidth.length) { flags.push(`⚠ FILAS DE ANCHO ≠ ${W}: ${badWidth.map(([i, l]) => `${i}(${l})`).join(', ')}`); problems++; }
  // Aberturas de borde (celdas no-'#') — informativas: deben coincidir con la
  // sala vecina (eso lo verifica `check`; acá solo lo mostramos).
  const openLeft = [...leftCol].filter((c) => c !== '#').length;
  const openRight = [...rightCol].filter((c) => c !== '#').length;
  const openTop = [...topRow].filter((c) => c !== '#').length;
  const openBot = [...botRow].filter((c) => c !== '#').length;

  console.log(
    `  ${id.padEnd(13)} ${rows.length}×${W}  cristales:${String(crystals).padStart(2)}  ` +
      `B:${count('B')} F:${count('F')} D:${count('D')} k/j/w/g:${count('k') + count('j') + count('w') + count('g')}  ` +
      `aberturas L${openLeft} R${openRight} T${openTop} B${openBot}` +
      (rightSolid ? '' : '  (borde der. con aberturas)'),
  );
  for (const f of flags) console.log(`      ${f}`);
}

console.log(`\n  TOTAL cristales: ${totalCrystals}`);
if (problems) {
  console.error(`\n  ${problems} sala(s) con problemas de forma. Arreglá antes de \`npm run check\`.`);
  process.exit(1);
}
console.log('  Formas ok. (Corré `npm run check` para grafo/alineación/feel/completitud.)');
