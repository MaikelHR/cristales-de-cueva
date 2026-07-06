// ============================================================
//  VISUALIZADOR de salas (y sprites) -> PNG
// ------------------------------------------------------------
//  Node no tiene canvas, así que dibujamos los pixeles a mano en un buffer
//  RGBA y los codificamos como PNG (deflate de zlib). Cada celda del mapa se
//  colorea según su char (y el bioma). Permite VER las salas y depurar la
//  geometría (gates, huecos, pasarelas) sin abrir el navegador.
//
//  Uso:  node scripts/.visualize.mjs   (lo bundlea package.json script "viz")
// ============================================================
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

// --- Stubs para importar las salas (art.ts hornea sprites al cargar) ---
function fakeCtx(): any { const t: any = {}; return new Proxy(t, { get(o, p) { if (p in o) return o[p]; if (p === 'canvas') return { width: 0, height: 0 }; return () => {}; }, set(o, p, v) { o[p] = v; return true; } }); }
const gg: any = globalThis;
gg.document = { createElement: (tag: string) => (tag === 'canvas' ? { width: 0, height: 0, getContext: () => fakeCtx() } : {}) };
gg.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
gg.window = gg; gg.performance ??= { now: () => 0 }; gg.requestAnimationFrame ??= () => 0;

const { ROOMS } = await import('../src/game/rooms/index.ts');
const { BIOMES, SPRITE_GRIDS, SPRITE_PALETTE } = await import('../src/game/art.ts');

// --- Codificador PNG mínimo (RGBA, sin filtros) ---
function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type: string, data: Uint8Array): Uint8Array {
  const t = new Uint8Array(4);
  for (let i = 0; i < 4; i++) t[i] = type.charCodeAt(i);
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, data.length);
  const body = new Uint8Array(t.length + data.length);
  body.set(t); body.set(data, t.length);
  const crc = new Uint8Array(4);
  new DataView(crc.buffer).setUint32(0, crc32(body));
  return concat([len, body, crc]);
}
function concat(arrs: Uint8Array[]): Uint8Array {
  const n = arrs.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(n); let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}
function encodePNG(w: number, h: number, rgba: Uint8Array): Uint8Array {
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bits, RGBA
  // Filtro 0 por scanline.
  const stride = w * 4;
  const raw = new Uint8Array((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; raw.set(rgba.subarray(y * stride, y * stride + stride), y * (stride + 1) + 1); }
  const idat = deflateSync(raw);
  return concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))]);
}

// --- Colores por char (usa la paleta del bioma para los tiles) ---
function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function colorFor(ch: string, biomeName: string): [number, number, number] {
  const b = (BIOMES as any)[biomeName] ?? (BIOMES as any).eco;
  switch (ch) {
    case '#': return hex(b.tile.r);
    case '-': return hex(b.tile.m);          // plataforma un-sentido
    case '^': return [200, 255, 224];         // viento
    case 'x': return [180, 160, 208];         // púas
    case 'L': return [255, 138, 42];          // lava
    case 'o': return [255, 210, 58];          // cristal
    case 'g': case 'j': case 'k': case 'w': return [200, 140, 255]; // reliquia
    case 'P': return [124, 224, 255];         // spawn
    case 'D': return [185, 139, 255];         // puerta
    case 's': return [92, 224, 106];          // slime
    case 'b': return [124, 224, 255];         // volador
    case 'c': return [255, 90, 122];          // cazador
    case 'e': return [156, 255, 122];         // espora
    case 'B': case 'F': return [255, 90, 122]; // jefes
    default: return hex(b.gradTop);           // aire = fondo del bioma
  }
}

function renderRoom(room: any, scale: number): Uint8Array {
  const map: string[] = room.map;
  const rows = map.length, cols = map[0].length;
  const W = cols * scale, H = rows * scale;
  const rgba = new Uint8Array(W * H * 4);
  const biomeName = room.biome ?? 'eco';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const [rr, gg2, bb] = colorFor(map[r][c], biomeName);
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const x = c * scale + dx, y = r * scale + dy;
          // Rejilla tenue cada 8 celdas para leer coordenadas.
          const grid = (c % 8 === 0 && dx === 0) || (r % 8 === 0 && dy === 0);
          const i = (y * W + x) * 4;
          rgba[i] = grid ? Math.min(255, rr + 40) : rr;
          rgba[i + 1] = grid ? Math.min(255, gg2 + 40) : gg2;
          rgba[i + 2] = grid ? Math.min(255, bb + 40) : bb;
          rgba[i + 3] = 255;
        }
      }
    }
  }
  return encodePNG(W, H, rgba);
}

// Salida en .viz/ (ignorada por git). Corré `npm run viz` y abrí los PNG.
const OUT = '.viz';
try { mkdirSync(OUT, { recursive: true }); } catch {}
for (const room of ROOMS) {
  const png = renderRoom(room, 8);
  writeFileSync(`${OUT}/${room.id}.png`, png);
  console.log(`  -> ${OUT}/${room.id}.png (${room.map[0].length}x${room.map.length} celdas)`);
}

// --- Montaje del MUNDO: cada sala en su celda de mapPos, para ver el mapa 2D
//     completo y sus conexiones de un vistazo. Escala chica (2px/celda).
{
  const S = 2; // px por celda del mapa
  const CELLW = 64 * 8 * S / 8; // ancho máximo de sala en px de montaje (aprox)
  // Bounding box de mapPos.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of ROOMS) {
    minX = Math.min(minX, r.mapPos.x); minY = Math.min(minY, r.mapPos.y);
    maxX = Math.max(maxX, r.mapPos.x); maxY = Math.max(maxY, r.mapPos.y);
  }
  const cellPxW = 64 * S + 4, cellPxH = 22 * S + 4; // celda de grilla (sala + margen)
  const W = (maxX - minX + 1) * cellPxW, H = (maxY - minY + 1) * cellPxH;
  const rgba = new Uint8Array(W * H * 4).fill(0);
  for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255; // alpha
  for (const room of ROOMS) {
    const map: string[] = room.map;
    const ox = (room.mapPos.x - minX) * cellPxW + 2;
    const oy = (room.mapPos.y - minY) * cellPxH + 2;
    for (let r = 0; r < map.length; r++) for (let c = 0; c < map[0].length; c++) {
      const [rr, gg2, bb] = colorFor(map[r][c], room.biome ?? 'eco');
      for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) {
        const x = ox + c * S + dx, y = oy + r * S + dy;
        if (x >= W || y >= H) continue;
        const i = (y * W + x) * 4;
        rgba[i] = rr; rgba[i + 1] = gg2; rgba[i + 2] = bb; rgba[i + 3] = 255;
      }
    }
  }
  writeFileSync(`${OUT}/_mundo.png`, encodePNG(W, H, rgba));
  console.log(`  -> ${OUT}/_mundo.png (montaje del mundo ${W}x${H})`);
  void CELLW;
}

// --- Hoja de SPRITES: re-horneamos cada grilla con la paleta y las montamos en
//     una grilla para verlas grandes (escala 6, fondo violeta oscuro).
{
  const names = Object.keys(SPRITE_GRIDS);
  const SC = 6, PAD = 6, COLS = 6, CELL = 18 * SC + PAD; // 18 = alto máx de sprite
  const rowsN = Math.ceil(names.length / COLS);
  const W = COLS * CELL, H = rowsN * CELL;
  const rgba = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) { rgba[i * 4] = 22; rgba[i * 4 + 1] = 12; rgba[i * 4 + 2] = 40; rgba[i * 4 + 3] = 255; }
  const pal = SPRITE_PALETTE as Record<string, string>;
  names.forEach((name, idx) => {
    const grid = SPRITE_GRIDS[name];
    const gx = (idx % COLS) * CELL + PAD / 2, gy = Math.floor(idx / COLS) * CELL + PAD / 2;
    for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) {
      const col = pal[grid[r][c]];
      if (!col) continue; // '.' transparente
      const [rr, gg2, bb] = hex(col);
      for (let dy = 0; dy < SC; dy++) for (let dx = 0; dx < SC; dx++) {
        const x = gx + c * SC + dx, y = gy + r * SC + dy;
        if (x >= W || y >= H) continue;
        const i = (Math.floor(y) * W + Math.floor(x)) * 4;
        rgba[i] = rr; rgba[i + 1] = gg2; rgba[i + 2] = bb; rgba[i + 3] = 255;
      }
    }
  });
  writeFileSync(`${OUT}/_sprites.png`, encodePNG(W, H, rgba));
  console.log(`  -> ${OUT}/_sprites.png (${names.length} sprites)`);
}
console.log('listo');
