# CLAUDE.md — Cristales de la Cueva

Metroidvania-plataformero pixel-art en **TypeScript + Vite + Canvas**. Todo el
arte es dibujado por código (cero assets externos). Rama de trabajo: `slop`.

## Regla de calidad

`check` verde prueba corrección, no calidad. **El contenido (sala / sprite /
habilidad / enemigo) no está terminado hasta que se lo miró corriendo de verdad
(`npm run shots`) y pasó revisión (`/revisar-calidad` o los agentes `level-critic`
/ `art-director`).** Correcto ≠ bueno: un pasillo vacío o unos bloques spammeados
son transitables y feos. Detalle completo en `HARNESS.md`.

## Comandos

| Comando | Qué hace | ¿Bloquea commit? |
|---|---|---|
| `npm run dev` | Vite dev server (juego jugable) | — |
| `npm run build` | `tsc` estricto + bundle a `dist/` | — |
| `npm run check` | Red de seguridad headless: corrección + **feel** (física real) + **métricas** + **alcanzabilidad de plataformas** | ✅ sí (hook pre-commit) |
| `npm run reach` | Grafo de alcanzabilidad: ¿llega el jugador a toda plataforma/cristal/salida por saltos reales? | (incluido en check) |
| `npm run rooms` | Linter de forma de salas (dims, filas de ancho erróneo, bordes, conteo) | — |
| `npm run shots` | Arranca el juego REAL en Chromium y fotografía el canvas (sprites/luz/HUD/menús/móvil) → `.shots/` | — |
| `npm run viz` | Vistazo estático de geometría por char → `.viz/` | — |
| `/revisar-calidad` | Juez de visión sobre las capturas → PASS/FAIL | — |
| `/crear-contenido` | Pipeline diseñar→generar→mirar→revisar→iterar | — |

El hook `.git/hooks/pre-commit` corre `build && check` (local, no se commitea).

## Agentes del proyecto (`.claude/agents/`)

- **`game-designer`** — diseña/rediseña salas como niveles pensados (camino
  legible, plataformas alcanzables, ritmo). Edita.
- **`level-critic`** — crítico adversarial de diseño de nivel (read-only): ¿nivel
  pensado o bloques spammeados?, ¿todo transitable?
- **`art-director`** — crítico de arte/legibilidad (read-only): ¿se distinguen
  jugador y enemigos de su fondo?
- **`harness-engineer`** — construye y endurece el harness de calidad.

## Invariantes

- **Arte 100% en código** — sprites como grillas de píxeles + paleta en
  `src/game/art.ts`; atmósfera (rayos, brasas, niebla, parallax) en runtime.
- **Cero deps de runtime** — `vite` + `typescript` + `playwright` son devDeps;
  Playwright es solo del harness de capturas y nunca entra al bundle.
- **es-AR voseo** en todo el texto visible ("TE APAGASTE", no "GAME OVER").
- **Teclado + gamepad + touch** siempre. En móvil, apaisado (retrato pide girar).
- Cada commit buildea verde, `check` verde, jugable y 100% completable.
- Techo de bundle: 30 kB gzip.
- Cualquier cambio de layout de sala (mover/agregar/quitar cristal/reliquia/tile)
  obliga a subir `PROGRESS_VERSION` en `src/game/save.ts`.
- Cristales: ~28-34 en todo el juego (ganar exige TODOS). Llená con estructura,
  no con cristales.

## Estructura

- `src/engine/` — motor reutilizable (bucle de paso fijo, input teclado+gamepad,
  canvas/colisiones, `Sprite`, audio). No sabe de "cristales".
- `src/game/` — el juego: `Game.ts` (reglas/estados), `World.ts` (salas +
  transiciones), `Level.ts` (mapa ASCII → colisiones; significado de cada char),
  `Player.ts` (física + constantes de feel), `art.ts` (sprites + atmósfera),
  `entities/` (enemigos), `rooms/` (una sala ASCII por archivo, en `index.ts`).
- `scripts/` — el harness: `check.ts`, `feel.ts`, `metrics.ts`, `reach.ts`,
  `shots.mjs`, `rooms.mjs`, `visualize.ts`. Fuera de `src/`; corren con
  esbuild+node.

## Diseñar una sala (el orden importa)

1. Camino crítico primero: dónde entra el jugador, por dónde sube/cruza, dónde
   está el objetivo. La ruta es una secuencia de apoyos ALCANZABLES entre sí.
2. Alcance real: salto ~5 celdas de alto, doble ~7, dash ~37px, planeo cruza ~17
   celdas. Dos plataformas conectan solo si el salto entra en esos números.
3. Escribí el ASCII con ancho/alto exactos y constantes. Corré `npm run rooms`
   tras cada edición (atrapa filas de ancho erróneo al instante).
4. `npm run reach` — toda plataforma/cristal/salida alcanzable desde el spawn.
5. `npm run build && npm run check` — corrección + feel + métricas.
6. `npm run shots` y MIRÁ la sala. Iterá hasta que se vea diseñada, no rellenada.
