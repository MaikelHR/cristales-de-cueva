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
