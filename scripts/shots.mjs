// ============================================================
//  HARNESS DE CAPTURAS  (npm run shots)
// ------------------------------------------------------------
//  Arranca el juego REAL en un Chromium headless (vite dev, así
//  import.meta.env.DEV expone __game.__debug), lo conduce a cada sala y
//  estado, y fotografía el CANVAS DE VERDAD: sprites, luz, atmósfera, parallax,
//  HUD, menús y el layout móvil. Esto es lo único que revela el arte y el feel
//  reales — lo que el run nocturno nunca miró (ver PROGRESO_NOCTURNO: "playtest
//  pendiente"). Las capturas van a .shots/ para que un juez de visión las lea
//  (/revisar-calidad) o para inspección a ojo.
//
//  Uso:  npm run shots
//  Salida: .shots/*.png  +  .shots/index.json (manifiesto de qué es cada foto)
// ============================================================
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Ruta al binario de vite (evita spawnear npm.cmd, que da EINVAL en Windows).
const VITE_BIN = resolve(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');

const OUT = '.shots';
const PORT = 5178; // puerto fijo para el dev server del harness
const URL = `http://localhost:${PORT}/`;
// Escala de captura: el canvas es 320x176 (diminuto). Lo agrandamos por CSS
// device-scale para que la foto tenga píxeles nítidos y grandes que el juez
// (y el ojo) puedan leer. image-rendering:pixelated mantiene el pixel-art duro.
const SCALE = 4;

function log(...a) { console.log('[shots]', ...a); }

/** Arranca vite dev en un puerto fijo y espera a que responda. */
async function startDevServer() {
  log('arrancando vite dev en', PORT, '...');
  // Spawneamos node contra el binario de vite directamente: cross-platform y
  // sin npm.cmd (que da spawn EINVAL en Windows con Node 24).
  const proc = spawn(
    process.execPath,
    [VITE_BIN, '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    { stdio: ['ignore', 'pipe', 'pipe'], cwd: ROOT },
  );
  proc.stdout.on('data', (d) => { if (process.env.SHOTS_VERBOSE) process.stdout.write(d); });
  proc.stderr.on('data', (d) => process.stderr.write(d));
  // Esperar a que el puerto responda (hasta ~30s).
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    try {
      const r = await fetch(URL);
      if (r.ok) { log('vite listo'); return proc; }
    } catch { /* aún no levanta */ }
    await new Promise((res) => setTimeout(res, 300));
  }
  proc.kill();
  throw new Error('el dev server no levantó a tiempo');
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const server = await startDevServer();
  const browser = await chromium.launch();
  const manifest = [];

  try {
    // ---- Contexto de ESCRITORIO ----
    const ctx = await browser.newContext({
      viewport: { width: 320 * SCALE + 80, height: 176 * SCALE + 220 },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (process.env.SHOTS_VERBOSE) log('page:', m.text()); });
    page.on('pageerror', (e) => console.error('[shots] PAGE ERROR:', e.message));

    await page.goto(URL, { waitUntil: 'networkidle' });
    // Esperar a que el juego se exponga.
    await page.waitForFunction(() => !!(window.__game && window.__game.__debug), { timeout: 15000 });
    log('juego cargado; __debug disponible');

    const canvas = page.locator('#game');

    // Captura el canvas escalado a SCALE (nítido, pixel-art duro).
    async function shotCanvas(name, caption) {
      // Escalamos el canvas por CSS sin tocar su resolución interna: la foto
      // sale grande pero con los mismos píxeles del juego.
      await page.evaluate((s) => {
        const c = document.getElementById('game');
        c.style.width = 320 * s + 'px';
        c.style.height = 176 * s + 'px';
        c.style.imageRendering = 'pixelated';
      }, SCALE);
      const file = `${OUT}/${name}.png`;
      await canvas.screenshot({ path: file });
      manifest.push({ name, file, caption });
      log('  📸', name);
    }

    // Deja correr N frames reales del loop (para que enemigos/atmósfera animen).
    async function settle(frames = 40) {
      await page.evaluate((n) => window.__game.__debug.settle(n), frames);
      // un respiro para que el rAF pinte el estado ya asentado
      await page.waitForTimeout(120);
    }

    // Lista de salas del juego (desde el propio juego, no hardcodeada).
    const rooms = await page.evaluate(() => window.__game.__debug.rooms());
    log('salas:', rooms.join(', '));

    // Habilidades por sala: le damos TODO para que el arte de cada zona se vea
    // completo (no bloqueado por un gate). El juez mira composición y arte, no
    // progresión.
    // ---- 1) Pantalla de título (menú, con el HTML shell) ----
    await page.evaluate(() => window.__game.__debug.setState('title'));
    await settle(30);
    // El título usa el shell HTML: foto de página completa (h1, sub, controles).
    {
      const file = `${OUT}/00-titulo-pagina.png`;
      await page.screenshot({ path: file });
      manifest.push({ name: '00-titulo-pagina', file, caption: 'Pantalla de título con el marco HTML (título, subtítulo, controles).' });
      log('  📸', '00-titulo-pagina (página completa)');
    }
    await shotCanvas('01-titulo', 'Menú de inicio (canvas): logo/estado del juego animado de fondo.');

    // ---- 2) Cada sala in-situ, con el jugador en su spawn y kit completo ----
    let i = 2;
    for (const id of rooms) {
      await page.evaluate((rid) => window.__game.__debug.warp(rid, true), id);
      await settle(45);
      const n = String(i).padStart(2, '0');
      await shotCanvas(`${n}-sala-${id}`, `Sala "${id}" in-situ: geometría, tiles, atmósfera, entidades y HUD reales.`);
      i++;
    }

    // ---- 3) Overlay del mapa (M) — con TODAS las salas visitadas, para
    //     fotografiar el mapa como lo ve un jugador que ya exploró (no 1 celda).
    await page.evaluate(() => {
      window.__game.__debug.warp(window.__game.__debug.rooms()[0], true);
      window.__game.__debug.visitAll();
      window.__game.__debug.setMapOpen(true);
    });
    await settle(20);
    await shotCanvas(`${String(i++).padStart(2, '0')}-mapa`, 'Overlay del mapa completo (tecla M): salas visitadas, biomas, jugador.');

    await ctx.close();

    // ---- 4) MÓVIL: layout táctil en retrato ----
    const mctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone-ish retrato
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mpage = await mctx.newPage();
    await mpage.goto(URL, { waitUntil: 'networkidle' });
    await mpage.waitForFunction(() => !!(window.__game && window.__game.__debug), { timeout: 15000 });
    await mpage.evaluate(() => window.__game.__debug.warp(window.__game.__debug.rooms()[0], true));
    await mpage.evaluate((n) => window.__game.__debug.settle(n), 45);
    await mpage.waitForTimeout(200);
    {
      const file = `${OUT}/${String(i++).padStart(2, '0')}-movil-retrato.png`;
      await mpage.screenshot({ path: file });
      manifest.push({ name: 'movil-retrato', file, caption: 'Layout MÓVIL en retrato: mando en pantalla (cruceta, salto, dash, pausa) y canvas escalado.' });
      log('  📸', 'movil-retrato');
    }
    await mctx.close();

    writeFileSync(`${OUT}/index.json`, JSON.stringify({ scale: SCALE, shots: manifest }, null, 2));
    log(`listo — ${manifest.length} capturas en ${OUT}/ (ver index.json)`);
  } finally {
    await browser.close();
    server.kill();
    // En Windows, npm arranca el dev en un hijo; matamos el árbol por las dudas.
    if (process.platform === 'win32' && server.pid) {
      try { spawn('taskkill', ['/pid', String(server.pid), '/T', '/F']); } catch { /* noop */ }
    }
  }
}

main().catch((e) => { console.error('[shots] ERROR:', e); process.exit(1); });
