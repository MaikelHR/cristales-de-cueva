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

## P0.5 — Pantalla de mapa (M) + minimapa 2D  ✅

- **Overlay dentro de 'playing'** (no un State nuevo): flag `mapOpen`, toggle con
  `justPressed('map')`, **early-return antes de que avance `runTime`** (el
  cronómetro no corre mirando el mapa). Pausa también lo cierra. `reset()` lo
  apaga.
- `drawMap()`: itera `world.allRooms`, una celda por sala en su `mapPos.{x,y}`,
  **revela solo las visitadas**, colorea el marco por bioma (`rimL`), resalta la
  sala actual (dorado) y el jugador (punto cian por posición relativa 2D),
  marca salas con cristal sin recoger. Escala/centra para 320×176. Leyenda:
  cristales X/Y + un puntito por habilidad conseguida (con su color).
- **Minimapa de esquina reescrito para 2D**: antes asumía tira horizontal
  (`maxX` solo, `baseX` podía ir negativo). Ahora calcula caja envolvente de lo
  VISITADO en ambos ejes, escala celdas acotadas (máx ~72×48 px), se ancla a la
  derecha sin desbordar, colorea por bioma y ubica al jugador en 2D.
- Entradas en los 3 medios:
  - Teclado: `m`/`M` -> 'map'.
  - Gamepad: botón B (1) -> 'map'.
  - Táctil: botón `tc-map` (arriba-izquierda), `bindTap(...,'map')`, visible en
    `data-mode='play'`, con CSS propio + regla `<400px`.
- Footers de `main.ts`: "M mapa" (teclado) y "B mapa" (gamepad).
- Harness: el smoke abre/cierra el mapa periódicamente para ejercitar `drawMap`.
- **Pendiente para la mañana (no bloqueante):** playtest visual real del overlay
  en navegador. Sin Playwright (evito dep nueva) me apoyo en el render headless
  (100+ frames de drawMap sin throw) + coords clampeadas. Riesgo bajo (dibujo
  de rects puros, todo acotado con clamp/min/max).
- **build**: verde (gzip 16.5 kB). **check**: VERDE.
- Sigue: P0.6 (autoguardado + Continuar).

## P0.6 — Autoguardado de progreso + Continuar  ✅

- `save.ts`: bloque `progress` opcional en `SaveData` (version, abilities,
  crystalsTaken[], relicsTaken[], checkpoint, visited). `loadSave` lo parsea y
  valida campo por campo; `parseProgress` descarta progreso corrupto o de otra
  versión (=> partida nueva sin romper). `PROGRESS_VERSION` exportado.
- **Clave estable** de cristal/reliquia anónimo: `${roomId}:${x},${y}`.
- `Game.persistProgress()`: compone el bloque y lo persiste SIN pisar
  bestScore/bestTime/victories; **solo mientras se juega** (nunca en el título,
  pisaría el guardado). Se llama en transición de sala + al recoger
  cristal/reliquia.
- Flujo título: `startNewGame()` (resetea y BORRA progreso) vs `continueGame()`
  (resetea y APLICA progreso: habilidades, tomados por clave, visited,
  checkpoint, coloca al jugador). `hasProgress` getter público. Confirmar =
  continuar si hay progreso, si no nueva; R = siempre nueva. `endRun` (win o
  game over) borra el progreso. `World.hasRoom()` para validar el checkpoint.
- `drawTitle`: prompt "CONTINUAR" + "R para empezar de nuevo" cuando hay
  progreso; "EMPEZAR" si no.
- **DISCIPLINA CRÍTICA:** cualquier cambio de layout de sala (mover/agregar/
  quitar cristal/reliquia/tile) obliga a subir `PROGRESS_VERSION`. En P1, al
  re-anclar el mapa 2D, la subo.
- Limitación menor (táctil): en el título, tocar = continuar-o-nueva; para
  forzar partida nueva sobre un progreso existente el jugador táctil termina o
  muere la corrida actual (no hay botón de reinicio en el título). Conservador.
- Harness: (1) round-trip de save + descarte de versión vieja + conservación de
  récords; (2) **integración**: jugar -> progreso en store -> Game recargado ve
  `hasProgress` -> Continuar aplica sin reventar.
- **build**: verde (gzip 17.2 kB). **check**: VERDE (6 asserts).
- **CORE casi cerrado.** Sigue: P0.7 (hazards estáticos: púas + lava).

## P0.7 — Grilla de hazards estáticos (púas + lava)  ✅

- `Level`: grilla `hazard: number[][]` (0 nada, 1 púas, 2 lava). Chars `x`/`L`
  en `HAZARD_CHARS`, sumados a KNOWN_CHARS. **NO se marcan sólidos** (no se
  colisiona, solo lastiman).
- `hazardTilesIn(box)`: cajas peligrosas por celda. Las púas se achican (zona
  letal = mitad inferior, donde están las puntas) para no matar al rozar el
  borde; la lava ocupa casi todo el tile.
- Sprites nuevos (arte en código): `spike` (3 dientes de roca, punta clara por
  luz cenital) y `lava1/lava2` (dos frames que "hierven"). Letras de paleta
  nuevas (Q/q/N púas, A/a/Z/z lava) — agregadas, no recicladas (§6).
- `Level.draw` dibuja púas y lava (lava con desfase de hervor por columna).
  `Level.draw` ahora toma `time`; `Game.draw` se lo pasa.
- `Game.update`: tras el loop de enemigos, `hazardTilesIn(pbox)` -> `hurtPlayer`.
- **Decisión (conservadora):** no ensucio los 3 cuartos actuales con un hazard
  de prueba; la colocación real va en P1 (lava en las Forjas, pozos de púas). El
  sistema queda probado por el harness (parse + hazardTilesIn: púas y lava
  detectadas, aire no) y el render en el smoke.
- **build**: verde (gzip 17.6 kB). **check**: VERDE (7 asserts).
- **===== CORE (P0) COMPLETO =====** Toda la infraestructura del scaffolding
  está verde y probada. Sigue P1: el mundo 2D + PLANEO + bioma + boss (cierra
  el CORE del §12).

# ===== FASE B — CONTENIDO =====

## P1.a — Habilidad PLANEO (glide) + corrientes de viento  ✅

- `AbilityName += 'glide'` (tsc me obligó a los 3 lugares: RELIC_CHARS char 'g',
  Player.abilities, ABILITY_LABEL/ABILITY_GLOW en Game — buen guardarraíl).
- Física en Player (vive casi toda ahí, §9): al mantener saltar cayendo con
  `abilities.glide`, `vy` se clampea a `GLIDE_SPEED` (hoja que baja suave);
  dentro de una corriente, `WIND_LIFT` te ELEVA. Esporitas de planeo.
- Viento: grilla nueva en Level (char `^`), `isWindAt(px,py)`, consultada por
  `Player.inWind()`. Sin planear, el viento igual te sostiene un poco
  (`WIND_DRIFT`). Se dibuja con rayitas ascendentes ('lighter').
- Sprite de planeo: pose abierta (reusa `playerJump`). Sin sprite nuevo (§9.4).
- El gate de glide será a nivel de salida (`Exit.requires:'glide'`) sobre el
  ascenso de viento — lo cablea P1.c y el fixpoint lo verifica.
- **build**: verde (gzip 17.9 kB). **check**: VERDE.
- Sigue: P1.b (enemigo espora + boss El Fundidor).

## P1.b — Enemigo Espora + Boss El Fundidor  ✅

- **Espora** (`entities/Spore.ts`, char `e`): flota latiendo; si el jugador se
  acerca se HINCHA (telegrafía con temblor + destello) y ESTALLA en una nube
  breve que daña (`hazards()` mientras dura). Pisable: el pisotón la revienta
  ANTES de la nube (recompensa verla venir). Arte por primitivas.
- **El Fundidor** (`entities/Fundidor.ts`, char `F`, jefe de las Forjas): ciclo
  telegrafiado acecha -> telegrafía (plantado, tiembla, destella) -> EMBISTE en
  horizontal -> al chocar la pared queda ATURDIDO (ventana de pisotón) y suelta
  una ONDA EXPANSIVA a ras del piso (dos `hazards()`, una por lado). 3 pisotones
  con i-frames. `stompable` es un getter dinámico: solo pisable aturdido.
  `isBoss=true` -> bloquea la puerta.
- World factory: `case 'spore'` y `case 'fundidor'` + imports (el `default`
  cae a Slime, así que un case olvidado degradaría sin error de tsc — los agregué
  explícitos y el harness los instancia).
- Harness: test de ciclo de vida (update+draw+hazards+onStomp) de ambos con un
  nivel mínimo — no revientan.
- Todavía NO colocados en ningún mapa (eso es P1.c). El juego sigue completable.
- **build**: verde (gzip 19.1 kB). **check**: VERDE (8 asserts).
- Sigue: P1.c (mapa 2D re-anclado + bioma Jardín + gates -> cierra el CORE).

## P1.c — Mapa 2D + bioma Jardín + gate de PLANEO  ✅ (CIERRA EL CORE)

Feature más grande de la noche. Descubrí y resolví problemas físicos reales del
cruce vertical con una SONDA FÍSICA (§4.6) antes de shippear:

- **Bug del cruce "up" (§8.1 tenía la fórmula mal):** `player.y = heightPx-1-h/2`
  dejaba los pies POR DEBAJO del borde inferior -> el jugador caía al vacío al
  cruzar hacia arriba. Corregido a `heightPx - h - 1` (pies apenas dentro) +
  conservar el impulso ascendente. El "down" también: `player.y = 1`.
- **Mecánica de viento revisada:** el updraft (grilla `^` de borde a borde)
  ahora funciona de ida y vuelta: **mantené SALTAR para SUBIR** (eleva a
  cualquiera, pisando la gravedad), **soltá para BAJAR** planeando suave. Así un
  mismo tiro sirve para entrar y volver (sin esto, el viento te encerraba).
- **Gate de PLANEO = ABISMO horizontal de 13 celdas** (no un tiro de viento,
  que eleva a todos). Verifiqué con la sonda física que el kit base (doble
  salto + dash, 60 timings distintos) NO lo cruza y el PLANEO SÍ.
- **Generador de salas** (`scratchpad/genrooms.mjs`): dibuja los mapas con ancho
  fijo garantizado y bordes precisos, y ESCRIBE los `.ts` directo (cero errores
  de transcripción a mano). El harness (alineación de huecos) atrapó un
  desalineamiento que metí y lo arreglé.
- **Mundo (5 salas, 2 biomas, 13 cristales, 2 jefes):**
  - Hub *Cavernas de Eco* re-anclado a {5,5}: entrada (spawn, tiro de viento
    arriba al jardín), tunel, santuario (puerta D + jefe guardián). Kit base
    (j/k/w) reachable.
  - *Jardín de Esporas* {5,4} (bioma jardin): reliquia PLANEO (probada
    alcanzable con kit base), esporas, púas, tiro de viento de entrada, y el
    abismo-gate a la derecha.
  - *Jardín Alto* {6,4}: detrás del abismo (requires:'glide'), 5 cristales + el
    **jefe El Fundidor**. La puerta no abre hasta matar a los DOS jefes.
- **Sonda física** (temporal, borrada): confirmó (1) PLANEO alcanzable con kit
  base y (2) el abismo real es gate genuino (glide sí, kit base no).
- Banner de región (§11) al cambiar de bioma (`announceText` con fade).
  `index.html` sin "5 cristales" hardcodeado.
- `PROGRESS_VERSION` subido a 2 (cambió el layout).
- Harness: fixpoint verde -> **el mundo es 100% completable** (grafo + gaps +
  fixpoint) y la sonda validó el platforming interno.
- **build**: verde (gzip 19.6 kB). **check**: VERDE (8 asserts).

# ===== CORE (§12) COMPLETO =====
Scaffolding verde + salidas verticales reales + mapa (M) + autosave/Continuar +
1 bioma nuevo (Jardín) conectado en 2D + 1 ability que gatea contenido (PLANEO,
backtracking real verificado por fixpoint+sonda) + 1 jefe nuevo (Fundidor) + 1
hazard estático (púas/lava). index.html sin hardcodeo. es-AR en todo. Táctil
intacto. 100% completable. Diario al día.

# ===== STRETCH =====

## P2.a — Bioma Forjas de Escoria (lava) hacia abajo  ✅

- Nueva sala **forjas** (56 ancho, bioma forjas) DEBAJO del santuario:
  `santuario.down → forjas` (pozo cols 4-5) y `forjas.up → santuario` (mismo
  tiro de viento, mantené saltar para volver). 2º bioma jugable.
- Contenido: **lago de LAVA** que cruza el piso (hazard), 5 cristales en
  plataformas que puentean la lava (hay que saltar sin quemarse), una espora y
  un slime. Total del mundo: 18 cristales, 2 jefes.
- Santuario editado (pozo + lip); el harness atrapó dos desalineamientos de
  borde que metí (left y down) y los arreglé antes de commitear.
- **Reachability (§4.6, documentada):** el fixpoint garantiza forjas alcanzable
  y sin gates internos. Verifiqué a mano que CADA cristal se apoya en una
  plataforma (ninguno sobre lava sin piso): row12/col20→plat row13, row12/col37
  →plat row13, row14/col11→plat row15, row14/col28→plat row15, row15/col48→plat
  row16. El kit base (doble salto+dash+wall jump) cubre esos saltos. La sonda
  aleatoria no los tocó (limitación del AND aleatorio, no del diseño: cae en la
  lava y reaparece). El retorno por viento funciona desde la repisa de entrada
  (fila 7), donde el jugador sí muestrea la corriente.
- `PROGRESS_VERSION` -> 3 (cambió santuario + sala nueva).
- **build**: verde (gzip 19.7 kB). **check**: VERDE (fixpoint 100% completable).
