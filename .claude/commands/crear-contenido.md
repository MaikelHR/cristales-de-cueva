---
description: Crear contenido nuevo (sala / sprite / habilidad / enemigo) a través de un pipeline que lo diseña, lo mira y lo revisa hasta que pasa
---

# /crear-contenido — crear con gusto, no contra una checklist

`$ARGUMENTS`: qué crear (p. ej. "una sala nueva de Aguas Hundidas con la
habilidad BRANQUIA", "un sprite de jefe para las Forjas", "un enemigo que
dispara"). Si está vacío, preguntá al usuario qué quiere antes de arrancar.

Este pipeline existe porque el run nocturno generó contenido contra una lista de
tareas sin filtro de gusto y sin mirarlo: salió mal. Acá el contenido pasa por
diseño → generación → **render real** → **revisión adversarial** → iteración,
y NO se considera hecho hasta que las capturas reales pasan la revisión de
calidad. La corrección (`check` verde) es necesaria pero **no alcanza**.

## Antes de empezar

Leé estos memorias/archivos para no violar invariantes ni reinventar:
- La memoria `project-invariants` y `overnight-agent-quality-gap` (la lección).
- `HARNESS.md` (cómo funcionan `check`, `feel`, `metrics`, `shots`).
- Para una sala: `src/game/rooms/*.ts` (formato ASCII), `src/game/Level.ts`
  (qué significa cada char), `RoomDef.ts` (exits, gates, lore) y el generador
  histórico (`scratchpad/genrooms.mjs` si sigue) — dibujar el ASCII a mano
  desalinea bordes; conviene generarlo.
- Para arte: `src/game/art.ts` (grillas + paleta). Reusá la paleta del bioma;
  no inventes colores sueltos (§6).

## El pipeline (idealmente un Workflow; si es chico, hacelo inline)

### 1. DISEÑAR (pensar antes de tipear)
Escribí un mini-brief ANTES de generar: propósito de la pieza, cómo encaja en el
mundo/progresión, y para una sala: el **camino previsto** del jugador, dónde van
los hitos/cristales, qué habilidad se usa, y el ritmo (tensión/respiro). Para un
sprite: silueta, paleta del bioma, cómo se distingue del fondo, frames de anim.
Si hay espacio de diseño amplio, generá 2–3 variantes y elegí la mejor con un
panel de jueces (no la primera que salga).

### 2. GENERAR
Implementá la pieza respetando los invariantes. Para una sala: generá el ASCII
con ancho fijo y bordes alineados; registrá chars nuevos en su tabla de
`Level.ts`; cableá exits/gates/lore; sumala a `rooms/index.ts`; subí
`PROGRESS_VERSION` si cambió algún layout.

### 3. VERIFICAR CORRECCIÓN (barato, deterministra)
```
npm run build && npm run check
```
Tiene que quedar VERDE: grafo, alineación de huecos, alcanzabilidad desde el
spawn, gate en runtime, fixpoint de completitud, **feel** (abismos franqueables,
sin saltos imposibles) y **metrics** (sin caja vacía). Si algo está rojo,
arreglá y repetí. NO avances con rojo.

### 4. MIRAR (render real — el paso que el run nocturno se saltó)
```
npm run shots
```
Abrí las capturas de lo que creaste (`.shots/…png`) y **miralas vos mismo**
primero. ¿La sala tiene un camino legible o es una caja con cosas sueltas? ¿El
sprite se distingue del fondo del bioma? Cruzá con la tabla de métricas.

### 5. REVISAR (adversarial, con visión) — la puerta que hay que cruzar
Corré `/revisar-calidad` apuntando a la pieza nueva. Es la MISMA puerta que
protege el juego entero. Si da **FAIL**, no shippees: volvé al paso 2/1 con las
acciones concretas del reporte y **iterá**. Repetí 4→5 hasta PASS (o hasta que
converjas y le muestres al usuario los trade-offs si algo no cierra).

### 6. COMMIT
Solo con `check` VERDE y `/revisar-calidad` en PASS. Un commit por pieza
jugable, mensaje `feat:`/`art:` en es-AR, en la rama `feat/*` (nunca `main`).
Anotá en `PROGRESO_NOCTURNO.md` qué hiciste, el hash, y el veredicto de la
revisión de calidad (no solo "check verde").

## Regla de oro
"Hecho" = correcto **y** mirado **y** aprobado por la revisión de calidad. Si
salteás el paso 4 o 5, estás repitiendo exactamente el error de la noche.
