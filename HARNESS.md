# HARNESS — cómo NO volver a shippear contenido malo

> Este documento existe por un incidente concreto. Un agente corrió toda una
> noche expandiendo el juego. Mantuvo `build` y `check` en verde por 22 commits
> y escribió un diario glorioso — pero el diseño de nivel, la responsividad, las
> ideas y el arte salieron **malos**. La causa raíz: **el agente se calificó a
> sí mismo con una rúbrica que no podía ver los defectos que importan, y después
> declaró la victoria.** El `check` de entonces probaba que una sala fuera
> *transitable* y el juego *completable*, pero nada **miraba** el juego: ni
> renderizaba el arte real, ni medía el feel, ni juzgaba el gusto.
>
> Este harness cierra ese agujero. La regla es una sola:

## 🔒 Regla de oro

**El contenido no está "hecho" hasta que se lo MIRÓ corriendo de verdad y pasó
la revisión de calidad. "Verde en `check`" es necesario pero NO suficiente.**

Correcto ≠ bueno. Un pasillo vacío es transitable, completable y feo.

---

## Las cuatro puertas

| Puerta | Qué atrapa | Comando | ¿Bloquea el commit? |
|---|---|---|---|
| **Corrección** | crashes, grafo roto, gates decorativos, incompletable, idioma | `npm run check` | ✅ sí (hook pre-commit) |
| **Física / feel** | saltos que se sienten mal, abismos imposibles, soft-locks | `npm run check` (incluye `feel.ts`) | ✅ sí |
| **Métricas de diseño** | "cajas vacías": densidad baja, aire muerto, sin estructura | `npm run check` (incluye `metrics.ts`) | ✅ sí (solo lo roto de verdad; el resto avisa) |
| **Alcanzabilidad** | plataforma-isla con cristal ("no se puede pasar") | `npm run check` (incluye `reach.ts`) | ✅ sí |
| **Visión (arte + diseño + gusto)** | arte pobre, salas mal compuestas, HUD que estorba, móvil roto | `npm run shots` + `/revisar-calidad` + agentes | ⚠️ on-demand, **obligatoria** en el flujo de creación |

Las cuatro primeras son deterministas y baratas → corren en **cada commit**. La
última cuesta una llamada a un modelo con visión → es on-demand, pero es la
puerta que hay que cruzar **sí o sí** antes de dar por buena una pieza de
contenido (`/crear-contenido` la fuerza; ver abajo).

### Agentes del proyecto (`.claude/agents/`)
Multi-agente: **`game-designer`** (diseña salas como niveles pensados, edita),
**`level-critic`** (crítico adversarial de diseño read-only: ¿nivel o bloques
spammeados?, ¿todo transitable?), **`art-director`** (legibilidad read-only),
**`harness-engineer`** (construye/endurece el harness). Se invocan por nombre o
`@agent-<nombre>`.

---

## Herramientas

### `npm run check` — corrección + feel + composición (bloquea)
El harness headless de siempre, ahora con dos módulos nuevos:

- **`scripts/feel.ts`** — conduce al `Player` REAL por la física REAL y **mide**:
  alto de salto (~35px), salto variable, doble salto (~58px), distancia de dash
  (~37px), caída del planeo (~42px/s). Afirma rangos sanos: si alguien toca una
  constante de `Player.ts` y rompe el feel, cae acá. Además calcula el **salto
  horizontal más ANCHO que el jugador está OBLIGADO a hacer** en cada sala
  (`widestForcedJump`: recorre TODAS las repisas transitables, no una sola fila
  de piso, y sólo cuenta un hueco como salto forzado si no hay una repisa más
  cercana donde dejarse caer) y afirma que sea franqueable con el kit
  correspondiente (kit base ~96px de alcance ≈ 12 celdas, con planeo ~136px ≈
  17 celdas) — sin saltos imposibles ni soft-locks, y sin falsos positivos por
  bordes de plataformas decorativas o tiros de viento. El presupuesto de alcance
  de una sala es el del kit base, salvo que la sala esté detrás de un gate de
  planeo (ahí el jugador ya tiene planeo → alcance con planeo).
- **`scripts/metrics.ts`** — mide la composición de cada sala e imprime una
  tabla `aire% | dens/100 | muerto% | plats | var`. **Hard-fail** solo ante algo
  roto (sala sin nada con qué interactuar; un pozo de aire muerto > 45% de la
  sala). El resto son **avisos** (densidad <1.2, aire muerto >22%, pasillo plano
  enorme, poca variedad) que no bloquean pero delatan las cajas vacías. Hoy la
  tabla ya muestra el problema: `entrada` 84% aire / 40% muerto, `santuario`
  densidad 0.38 — exactamente las salas flojas del run nocturno.
- **`scripts/reach.ts`** — el fixpoint ve el grafo de SALAS; esto ve DENTRO de
  una sala. Grafo geométrico de alcanzabilidad de plataformas calibrado con el
  alcance medido del kit (sube ~8 celdas, cruza ~14, trepa una pared pegada al
  destino con wall-jump). BFS desde el piso principal; falla si un cristal o
  reliquia queda sobre una plataforma-isla ("no se puede pasar"). Conservador al
  marcar (sobre generoso) para no falso-rechazar; con auto-test (conectada ok /
  isla detectada).

### `npm run rooms` — linter de forma de salas (ayuda de autoría)
Editar ASCII a mano desalinea bordes o deja una fila con un char de más/menos.
`rooms` da un panorama de todas las salas (dims, filas de ancho erróneo con el
índice exacto, estado de bordes, conteo de contenido y cristales). Corrélo tras
CADA edición de un mapa; atrapa el error al instante, antes de `check`. Para
salas nuevas o rediseños grandes conviene **generar el ASCII con un script**
(coords → mapa) en vez de tipear a mano: garantiza ancho/alto y bordes.

### `npm run shots` — el juego REAL en fotos (la pieza clave)
Arranca el juego real en un Chromium headless (`vite dev`, así se expone el
gancho de debug) y fotografía el **canvas de verdad**: sprites, luz volumétrica,
atmósfera, parallax, HUD, menús y el layout móvil. Sale a `.shots/*.png` +
`.shots/index.json` (qué es cada foto). Esto — y no el visualizador de cuadros
de color plano — es lo único que revela el arte y el feel reales.
- Usa `Game.__debug` (solo en dev, ver `src/game/Game.ts` y `src/main.ts`) para
  saltar a cualquier sala/estado con el kit completo y fotografiarlo sin tener
  que jugar la sala entera. El arte que nunca se ve es justo el que sale mal.

### `npm run viz` — vistazo estático (complementario)
El visualizador de geometría por char (cuadros de color). Rápido para leer
layout/huecos/gates de un vistazo, pero **no muestra el arte real** — para eso
está `shots`.

### `/revisar-calidad` — el juez que mira (on-demand)
Corre las puertas deterministas, captura las fotos y lanza un **juez de visión
multi-agente con verificación adversarial** que puntúa arte, diseño de nivel,
feel y móvil sobre las capturas reales, y emite un veredicto **PASS/FAIL** con
evidencia y acciones concretas. Es exigente a propósito: el fracaso a evitar es
declarar victoria sin mirar.

### `/crear-contenido` — crear con gusto, no contra una checklist (on-demand)
Pipeline para crear contenido nuevo (sala / sprite / habilidad / enemigo):
**diseñar → generar → verificar corrección → MIRAR (`shots`) → REVISAR
(`/revisar-calidad`) → iterar hasta PASS → commit**. Hace que el gusto sea parte
de la construcción, no un chequeo final opcional. Un agente que crea contenido
debe usar este flujo (o replicarlo), no ir tacheando una lista a ciegas.

---

## Para un agente que trabaja solo

1. Trabajá en una rama `feat/*`, nunca en `main`/`slop`.
2. Para cada pieza de contenido, seguí `/crear-contenido`. No saltees el paso de
   **mirar** (`shots`) ni el de **revisar** (`/revisar-calidad`).
3. `check` verde te deja commitear, pero **no** te autoriza a llamar "buena" a
   una pieza. Eso lo decide la revisión de calidad.
4. En el diario (`PROGRESO_NOCTURNO.md`) anotá el **veredicto de calidad** de
   cada pieza, no solo "check verde". Si algo quedó en FAIL o sin revisar,
   escribilo como pendiente EXPLÍCITO — no lo maquilles.
5. Si dudás entre shippear y no shippear por calidad: no shippees. Dejá la pieza
   en la rama con el reporte de qué falta y que lo mire una persona.

## Invariantes que ninguna pieza puede violar
Arte 100% en código (sin assets), cero deps de runtime (Playwright es devDep,
nunca entra al bundle), es-AR voseo en todo el texto visible, teclado+gamepad+
touch, cada commit completable, techo de bundle 30 kB, subir `PROGRESS_VERSION`
ante cualquier cambio de layout. (Ver la memoria `project-invariants`.)
