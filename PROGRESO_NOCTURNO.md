# Progreso nocturno — Cristales de la Cueva → Metroidvania

Diario de a bordo (NO informe final). Una entrada por feature: qué hice, el
hash del commit, resultado de build+check, qué sigue. Si me trabo: el bloqueo y
cómo lo esquivé.

Rama: `feat/metroidvania-nocturno` (nunca toco `main`/`slop`).

Invariantes sagradas: build verde + check verde antes de cada commit (el hook
lo hace mecánico); cada commit jugable y 100% completable; todo arte en código,
cero deps, cero assets; es-AR voseo en TODO; teclado+gamepad+touch siempre.

---

## Notas de reconocimiento (el código real vs. el plan)

El Plan.md asume rutas que en el repo real están corridas. Las adapté:

- Las salas viven en `src/game/rooms/` (no `src/rooms/`).
- `World.ts` está en `src/game/World.ts`.
- `Level.ts:60-66` YA tira si dos filas tienen distinto largo, pero **NO** tira
  ante un char desconocido (eso es P0.2, §8.6 — pendiente).
- `mapPos.x` se usa como `variant` del fondo (P0.4 lo separa del bioma).
- `save.ts` usa la clave `cristales-save-v1` y solo persiste récords.
- El minimapa asume una tira horizontal (P0.5 lo arregla para 2D).
- Node v24.5 (el plan mencionaba v22; el import dinámico + esbuild andan igual).

---

## P0.1 — Red de seguridad (harness + check + hook)  ✅

- `scripts/check.ts`: stubs de DOM/localStorage/AudioContext **antes** del
  import dinámico del juego; smoke (World + 20k pasos de Game); grafo de salidas
  (existencia, simetría salvo one-way, BFS de conectividad); alineación de
  huecos (§4.4) en los 4 bordes; retorno garantizado desde one-way; existencia
  de cristales y puerta. El fixpoint de habilidades (§4.5) queda cableado para
  cuando existan las tablas GATE_ABILITY (P0.3).
- `package.json`: script `"check"` (esbuild bundle + node).
- `.gitignore`: ignora `scripts/.check.mjs`.
- `.git/hooks/pre-commit` (+x): corre `npm run build && npm run check`.
- Ya adelanté parte de P0.2 porque era dependencia dura del harness:
  `RoomDef` ahora tiene el tipo `Exit = string | {to,oneway}`, `Exits` con
  `up/down`, y helpers `exitId()`/`isOneWay()`. `World.tryTransition` maneja
  las 4 ramas con `clamp` en el eje conservado (§8.1).
- **build**: verde (gzip 15.21 kB). **check**: VERDE con las 3 salas actuales.
- Hard gate superado: puedo generar contenido.
- Sigue: P0.2 (endurecer `Level.parse` con whitelist) y una sala vertical de
  prueba para ejercitar las salidas up/down.

## P0.2 — Endurecer Level.parse + salidas verticales  ✅

- `KNOWN_CHARS`: set único derivado de `STRUCTURAL_CHARS` + `ENEMY_CHARS` +
  `RELIC_CHARS`. `parse()` tira `Error("Char de mapa desconocido ...")` ante
  cualquier char fuera del set. Un char nuevo se registra en su tabla y queda
  incluido solo.
- Harness: test negativo `new Level([...,'#Z#',...])` DEBE tirar (prueba que la
  whitelist realmente dispara). Verde.
- Las salidas verticales (RoomDef up/down + one-way, `tryTransition` 4 ramas con
  clamp) ya entraron en P0.1 por ser dependencia del harness.
- **Decisión (conservadora):** NO agrego una "sala vertical de prueba"
  desechable al mundo shippeado (sería clutter). El mecanismo está implementado
  y el harness lo valida geométricamente (alineación de huecos en los 4 bordes).
  La primera conexión vertical REAL entra en P1 al re-anclar el mapa 2D, y ahí
  el smoke de 20k pasos ejercita el code path en vivo.
- **build**: verde (gzip 15.29 kB). **check**: VERDE (2 asserts).
- Sigue: P0.3 (fixpoint de completitud + techo de bundle en el harness).

## P0.3 — Fixpoint de completitud + techo de bundle  ✅

- Metadatos de gate:
  - `Exit.requires?: AbilityName` en RoomDef (gate de región a nivel de salida)
    + helper `exitRequires()`.
  - `GATE_ABILITY: Record<char, AbilityName>` exportado desde Level (gate a
    nivel de char-tile; vacío por ahora, se llena en P2). Sumado a KNOWN_CHARS.
- Harness — fixpoint (§4.5): `runFixpoint(nodes, start)` acumula reliquias de
  lo alcanzable hasta punto fijo; una salida se cruza solo si TODOS sus reqs
  (por `requires` o por char-gate en el borde) están en el kit. Afirma: toda
  sala con cristal alcanzable con el kit completo, y la puerta también.
- **Auto-test del fixpoint** con datos sintéticos: prueba el caso positivo
  (cristal detrás de un gate que abre una reliquia -> alcanzable) y el negativo
  (cristal detrás de un gate imposible -> detectado). Blinda la lógica.
- Techo de bundle (§4.6): gzip de `dist/assets/*.js`, falla si > 30 kB. Hoy
  reporta **14.9 kB**.
- **build**: verde. **check**: VERDE (smoke, whitelist, auto-test fixpoint,
  bundle + grafo/gaps/one-way/fixpoint-real en silencio).
- **El harness del CORE está completo.** Sigue: P0.4 (bioma + paletas).

## P0.4 — Bioma en RoomDef + tabla de paletas  ✅

- `BiomeName = 'eco'|'forjas'|'aguas'|'jardin'|'corazon'` y tabla `BIOMES` en
  art.ts: por bioma, gradiente de fondo, cristales de pared, estalactitas,
  montículos, rayos, niebla, paleta de tiles (r/o/s/m/t) y rim-lights.
- **Tiles horneados por bioma**: recoloreo las 5 grillas de roca por bioma en
  carga (5 sprites × 5 biomas, 8x8, coste despreciable). `tilesFor(biome)`.
- Threading: `drawBackground` ahora toma `(seedN, time, biomeName)` — separé la
  SEMILLA de layout (hash del id, `hashId()` en Game) del BIOMA (colores). La
  clave de caché del fondo incluye ancho+seed+bioma. `drawFog(...,biome)`.
  `Level.draw(...,biome)` → `drawSolidTile` usa tiles y rim-lights del bioma.
- Sin regresión visual: las 3 salas sin `biome` caen a `eco` (idéntico a antes).
- Harness reforzado: el smoke ahora ENTRA a 'playing', mueve al jugador a la
  derecha cruzando salas y llama `game.draw()` cada 200 frames (ejercita el
  render por bioma y las transiciones en vivo, no solo el título).
- Limpieza: saqué el import muerto de `sprites` en Level.ts.
- **build**: verde (gzip 15.8 kB). **check**: VERDE.
- Sigue: P0.5 (pantalla de mapa M + minimapa 2D).
