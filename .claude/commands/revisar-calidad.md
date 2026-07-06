---
description: Revisión de CALIDAD del juego — mira las capturas reales y puntúa arte, diseño de nivel y feel (bloquea si algo es malo)
---

# /revisar-calidad — el juez que SÍ mira el juego

Esto existe por una razón concreta: el run nocturno mantuvo el `check` en verde
mientras shippeaba arte pobre, salas vacías y saltos que se sienten mal — porque
**nada miraba el juego de verdad**. Este comando es el juez que mira. NO confíes
en que "el build está verde" para juzgar calidad; el build no ve una caja vacía.

`$ARGUMENTS` (opcional): a qué prestar atención (p. ej. "la sala nueva forjas2",
"el sprite del jefe", "el feel del planeo"). Si está vacío, revisá TODO.

## Qué hacer

### 1. Correr las puertas deterministas primero (baratas, no usan modelo)

```
npm run build && npm run check
```

`check` ahora incluye la sonda de física/feel (alto de salto, dash, planeo,
abismos franqueables) y las métricas de diseño (densidad, aire muerto,
plataformas, variedad). Leé su salida:

- Si `check` está ROJO → **FAIL inmediato**, reportá qué gate falló, no sigas.
- Fijate en los **⚠ avisos de composición** de las métricas y en la tabla por
  sala (`aire% | dens/100 | muerto% | plats | var`). Densidad <1.2, aire muerto
  >22% o pasillos planos enormes son señales de "caja vacía" — anotalas para
  cruzarlas con lo que veas en las fotos.

### 2. Capturar el juego REAL

```
npm run shots
```

Genera `.shots/*.png` (título, cada sala in-situ con sprites/luz/atmósfera/HUD
reales, el mapa, y el layout móvil) + `.shots/index.json`. Si `shots` falla,
arreglalo antes de seguir: sin fotos no hay revisión de calidad honesta.

### 3. Juzgar con visión (multi-agente, adversarial)

Lanzá un **Workflow** que reparta las fotos entre jueces de visión y verifique
adversarialmente cada hallazgo antes de aceptarlo. El objetivo es un veredicto
por dimensión con evidencia concreta (nombre de archivo + qué se ve), no una
opinión vaga. Estructura sugerida:

- **Fase Juzgar** (una tarea por dimensión, en paralelo). Cada tarea LEE los PNG
  relevantes (pasá las rutas de `.shots/`) y puntúa 1–5 con justificación
  anclada a lo que se ve:
  - **arte** — coherencia de paleta por bioma, legibilidad de sprites, que el
    jugador y las entidades se distingan del fondo, que la atmósfera no tape la
    jugabilidad. ¿Se ve hecho a propósito o genérico/descuidado?
  - **diseño de nivel** — composición y ritmo de CADA sala: ¿hay un camino
    legible?, ¿las plataformas guían o están tiradas al azar?, ¿hay hitos y
    variedad o es una caja vacía con cosas sueltas?, ¿el espacio muerto tiene
    propósito (respiro) o es relleno? Cruzá con las métricas del paso 1.
  - **feel/lectura** — por lo que se ve en las fotos y los números del feel:
    ¿las distancias de salto/abismo parecen justas?, ¿el HUD estorba?, ¿el
    banner de bioma/lore se lee?
  - **móvil** — en `09-movil-retrato.png`: ¿los botones tapan el juego?, ¿el
    canvas se ve completo?, ¿es jugable con pulgares?
- **Fase Verificar** (adversarial, por cada hallazgo "malo"). Un segundo agente
  intenta REFUTAR el hallazgo mirando la misma foto ("¿es realmente malo o el
  juez se equivocó?"). Solo sobreviven los hallazgos que el verificador
  confirma. Esto evita tanto falsos elogios como falsas alarmas.

Umbral: una dimensión con puntaje **≤2** (o un hallazgo confirmado que rompe la
jugabilidad/legibilidad) es **FAIL** de esa dimensión.

### 4. Reportar un veredicto claro

Escribí un veredicto **PASS/FAIL global** + por dimensión, y por cada FAIL:
- qué foto lo muestra, qué se ve mal, y **una acción concreta** para arreglarlo
  (p. ej. "entrada: el 60% superior es vacío — bajá el techo 6 filas o sumá 3
  plataformas con un cristal escondido arriba a la izquierda").

Mostrá siempre las 2–3 peores fotos al usuario embebidas para que las vea.

## Regla de oro

Sé un crítico exigente, no un porrista. El fracaso a evitar es el del diario
nocturno: declarar victoria sin mirar. Si dudás entre PASS y FAIL, es FAIL —
que la barra la baje una persona, no la complacencia. "Verde en check" ≠ "bueno".
