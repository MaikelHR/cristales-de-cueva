# Cristales de la Cueva

Un plataformero de acción con toques de metroidvania, hecho con **TypeScript + Vite +
Canvas**. Todo el arte está **dibujado por código** — ni un solo asset externo: cada
sprite es una grilla de píxeles con su paleta, y la atmósfera (rayos de luz, brasas,
niebla, parallax) se genera en tiempo real.

![Cristales de la Cueva](./preview.png)

> Explorá la cueva, conseguí las habilidades, juntá los 5 cristales, vencé al guardián
> y escapá por la puerta — lo más rápido que puedas.

## Jugar

- **Demo en vivo:** **[cristales-de-cueva.vercel.app](https://cristales-de-cueva.vercel.app)**
- **Local:**
  ```bash
  npm install
  npm run dev
  ```
  Abrí la URL que imprime Vite (normalmente `http://localhost:5173`).

## Qué tiene

- **Game feel** cuidado: coyote time, jump buffering, squash & stretch, hit-stop,
  sacudida de cámara, partículas y sonido (Web Audio API, sin archivos de audio).
- **Mundo por salas** conectadas (ASCII, un archivo por sala), con checkpoints,
  plataformas de un solo sentido, minimapa que se revela y fondo con parallax.
- **Habilidades** que abren zonas nuevas: doble salto, dash y wall jump, cada una
  detrás de una reliquia coleccionable.
- **Combate**: enemigos que patrullan, vuelan y persiguen; se los derrota pisándolos
  (tipo Mario); vida por corazones con knockback e invulnerabilidad; y un **jefe** que
  bloquea la salida hasta caer.
- **Estructura completa**: menú de inicio, pausa, game over y victoria; **récords
  guardados** en localStorage (mejor puntaje, mejor tiempo, veces completado) y un
  **cronómetro** para speedrun.
- **Teclado, gamepad y táctil**, con **prompts adaptativos**: los controles en pantalla
  cambian entre teclas, botones del mando o toques según el dispositivo que estés usando,
  al instante.
- **Móvil de verdad**: en teléfonos/tablets aparece un **mando en pantalla** (cruceta a la
  izquierda, salto y dash a la derecha, pausa arriba) con **multitáctil** real —moverte y
  saltar a la vez—, layout a **pantalla completa** en retrato y apaisado, botón de
  pantalla completa y bloqueo de zoom/scroll accidental. En escritorio no cambia nada.

## Controles

| Acción            | Teclado           | Gamepad       | Táctil (móvil)          |
| ----------------- | ----------------- | ------------- | ----------------------- |
| Mover             | ← → / A D         | D-pad / stick | botones ◀ ▶             |
| Saltar (¡doble!)  | espacio / ↑ / W   | A             | botón SALTO             |
| Dash              | shift / X         | X             | botón DASH              |
| Pausa             | Esc / P           | Start         | botón ‖ (arriba der.)   |
| Reiniciar         | R                 | Y             | REINICIAR (en pausa)    |
| Confirmar (menús) | Enter             | A / Start     | tocá la pantalla        |

## Build

```bash
npm run build     # revisa tipos y empaqueta a /dist (~14 kB gzip)
npm run preview   # sirve el build de producción
```

La carpeta `dist/` es estática: se publica gratis en **Vercel**, Netlify, itch.io o
GitHub Pages.

## Cómo está armado

- `src/engine/` — motor reutilizable (bucle de paso fijo, entrada teclado+gamepad,
  canvas/colisiones, `Sprite`, animación, audio con canales). No sabe nada de "cristales".
- `src/game/` — este juego, en capas con una responsabilidad cada una:
  - `session.ts` — el **estado** de una corrida (mundo, jugador, puntaje, checkpoint).
  - `scenes/` — el **flujo** de pantallas (título, partida, pausa, victoria, game over)
    como pila de escenas: la pausa es una escena apilada sobre la partida.
  - `systems/` — las **reglas**: combate (pisotón vs. golpe), recogibles, transiciones.
  - `actors/` — lo que vive en las salas: el jugador, enemigos y recogibles, todos
    detrás de la interfaz `Actor` con su capa de colisión.
  - `world/` — salas y conexiones: `RoomData` (el formato), `Level` (colisiones, lógica
    pura testeable), `Room`/`World` (instancias vivas).
  - `render/` + `ui/` — el dibujo: composición del mundo, tiles, HUD, minimapa, overlays.
  - `art/` — paleta, sprites (grillas de texto: cambiá un carácter y cambia un píxel),
    brillos y atmósfera (parallax, niebla, polvo, viñeta).
- Las **salas** son datos en `src/game/world/rooms/` (un archivo por sala): la geometría
  como texto (`#`, `.`, `-`) y las entidades como lista tipada con propiedades. Creá la
  tuya y sumala a `rooms/index.ts`; `validateRooms` y los tests avisan si quedó torcida.
- **Tests** (`npm test`, Vitest) cubren la lógica pura: parsing de niveles, colisiones,
  la regla del pisotón, migración de guardados y la integridad de los mapas reales.
- En desarrollo hay ganchos de consola: `__game`, `__debug.hitboxes = true` y
  `__debug.warp('tunel')`.

## Hoja de ruta

Ver **[PLAN_DE_DESARROLLO.md](./PLAN_DE_DESARROLLO.md)**. Las 6 fases de desarrollo
(game feel → mundo más grande → habilidades → combate → arte → estructura) están
completas; queda publicar.
