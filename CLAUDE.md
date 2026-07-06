# CLAUDE.md — Cristales de la Cueva

Metroidvania-platformer pixel-art en **TypeScript + Vite + Canvas**. Todo el arte
es dibujado por código (cero assets). Este archivo se carga solo al inicio de
cada sesión: leelo antes de tocar nada.

## 🔒 La regla que importa (por qué existe este archivo)

Una noche un agente expandió el juego, mantuvo `build`+`check` en verde por 22
commits y escribió un diario glorioso — pero el diseño de nivel, el feel, las
ideas y el arte salieron **malos**. Se calificó con una rúbrica ciega a esos
defectos y declaró la victoria.

**El contenido NO está "hecho" hasta que se lo MIRÓ corriendo de verdad y pasó la
revisión de calidad. `check` verde es necesario pero NO suficiente. Correcto ≠
bueno** (un pasillo vacío es transitable, completable y feo).

Si vas a crear/cambiar una sala, un sprite, una habilidad o un enemigo: pasá por
`npm run shots` (mirá las capturas del juego REAL) y `/revisar-calidad` (juez de
visión, PASS/FAIL) **antes** de darlo por bueno. No te fíes del checkmark verde.
Detalle completo en **`HARNESS.md`**.

## Comandos

| Comando | Qué hace | ¿Bloquea commit? |
|---|---|---|
| `npm run dev` | Vite dev server (juego jugable) | — |
| `npm run build` | `tsc` estricto + bundle a `dist/` | — |
| `npm run check` | Red de seguridad headless: corrección + **feel** (física real medida) + **métricas** de diseño (cajas vacías) | ✅ sí (hook pre-commit) |
| `npm run shots` | **Arranca el juego REAL en Chromium y fotografía el canvas** (sprites/luz/HUD/menús/móvil) → `.shots/` | — (on-demand) |
| `npm run viz` | Vistazo estático de geometría por char → `.viz/` (NO muestra el arte real) | — |
| `/revisar-calidad` | Juez de visión multi-agente sobre las capturas → PASS/FAIL | ⚠️ obligatoria al crear contenido |
| `/crear-contenido` | Pipeline diseñar→generar→mirar→revisar→iterar para contenido nuevo | — |

El hook `.git/hooks/pre-commit` corre `build && check`: si algo está rojo, el
commit se aborta. Ese hook es local (no se commitea).

## Invariantes (ninguna pieza los viola)

- **Arte 100% en código** — cada sprite es una grilla de píxeles con paleta en
  `src/game/art.ts`; atmósfera (rayos, brasas, niebla, parallax) en runtime. Cero
  assets externos.
- **Cero deps de RUNTIME** — solo `vite` + `typescript` + `playwright` como
  devDeps. Playwright es solo del harness de capturas; **nunca** entra al bundle.
- **es-AR voseo en TODO** el texto visible ("TE APAGASTE", no "GAME OVER").
  `check` escanea los `fillText` de Game.ts por inglés.
- **Teclado + gamepad + touch** siempre soportados.
- **Cada commit** buildea verde, `check` verde, es jugable y 100% completable.
- **Techo de bundle**: 30 kB gzip (hoy ~21 kB).
- Cualquier cambio de layout de sala (mover/agregar/quitar cristal/reliquia/tile)
  obliga a subir `PROGRESS_VERSION` en `src/game/save.ts`.
- Rama de trabajo: `slop`. **Nunca** toques `main` sin pedirlo.

## Estructura

- `src/engine/` — motor reutilizable (bucle de paso fijo, input teclado+gamepad,
  canvas/colisiones, `Sprite`, audio). No sabe nada de "cristales".
- `src/game/` — este juego: `Game.ts` (reglas/estados), `World.ts` (salas +
  transiciones), `Level.ts` (mapa ASCII → colisiones; ahí está el significado de
  cada char), `Player.ts` (física + constantes de feel), `art.ts` (sprites +
  atmósfera), `entities/` (enemigos), `rooms/` (una sala ASCII por archivo,
  cableadas en `rooms/index.ts`).
- `scripts/` — el harness: `check.ts`, `feel.ts`, `metrics.ts`, `shots.mjs`,
  `visualize.ts`. Viven fuera de `src/` (tsc no los tipa, vite no los empaqueta);
  usan import dinámico con stubs de DOM y se corren con esbuild+node.

## Para un agente que trabaja solo (p. ej. de noche)

1. Trabajá en `slop` (o una `feat/*`), nunca en `main`.
2. Para cada pieza de contenido seguí `/crear-contenido`. **No saltees** `shots`
   (mirar) ni `/revisar-calidad` (revisar). Ese salto ES el error a evitar.
3. `check` verde te deja commitear, pero NO autoriza a llamar "buena" a la pieza.
4. En `PROGRESO_NOCTURNO.md` anotá el **veredicto de calidad** de cada pieza, no
   solo "check verde". Lo que quedó en FAIL o sin revisar, escribilo como
   pendiente EXPLÍCITO — no lo maquilles.
5. Si dudás entre shippear y no por calidad: no shippees. Dejalo con el reporte
   de qué falta para que lo mire una persona.

## Estado conocido (2026-07-06)

El harness ya corrió y **marcó** salas flojas heredadas del run nocturno
(`entrada` 40% aire muerto, `santuario` densidad 0.38, `jardin_alto`) y un layout
móvil con la cancha en una franja fina. **El harness las detecta pero todavía NO
las arregló** — eso es trabajo pendiente vía `/revisar-calidad` + `/crear-contenido`.
