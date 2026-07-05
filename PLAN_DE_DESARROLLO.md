# Plan de desarrollo — Cristales de la Cueva

Documento vivo. La idea es avanzar **de a poco**: un objetivo pequeño por sesión,
un commit por cada cosa que funcione. Marcá las casillas conforme avances.

---

## 0. Estado actual (lo que ya funciona)

Un plataformero jugable con base sólida y arquitectura limpia para crecer:

- [x] Bucle de juego con **paso de tiempo fijo** (física estable en cualquier equipo)
- [x] Entrada por teclado mapeada a **acciones** (no a teclas sueltas)
- [x] Jugador con gravedad, salto, **coyote time** y **jump buffering**
- [x] Colisiones por tiles, resueltas **eje por eje**
- [x] Nivel definido como **texto ASCII** (editar el mapa = editar texto)
- [x] **Cámara** que sigue al jugador y se frena en los bordes
- [x] Cristales para recoger + **slimes** que patrullan
- [x] Condición de victoria (5 cristales → puerta) y reinicio con `R`
- [x] Sprites **dibujados por código** (sin assets externos todavía)

### Cómo está organizado el código

```
src/
├── main.ts            # arranca todo: canvas + input + juego + bucle
├── style.css          # la página que envuelve el juego
├── engine/            # MOTOR reutilizable (no sabe nada de "cristales")
│   ├── loop.ts        # game loop de paso fijo
│   ├── input.ts       # teclado → acciones
│   └── canvas.ts      # contexto, colisiones AABB, utilidades
└── game/              # ESTE juego en concreto
    ├── Game.ts        # reglas: recoger, ganar, morir, dibujar
    ├── Level.ts       # el mapa ASCII y sus colisiones
    ├── Player.ts      # física y dibujo del jugador
    ├── Slime.ts       # enemigo que patrulla
    └── Camera.ts      # seguimiento de cámara
```

> Regla mental: si algo serviría para **cualquier** juego, va en `engine/`.
> Si es propio de Cristales de la Cueva, va en `game/`.

---

## Cómo trabajar de a poco (flujo recomendado)

1. Elegí **una** casilla de una fase.
2. `npm run dev` y dejá el navegador abierto al lado del editor.
3. Hacé el cambio más pequeño que se pueda probar. Mirá el resultado.
4. Cuando funcione: `git add . && git commit -m "feat: ..."`.
5. Repetí. Si algo se rompe, `git diff` te muestra qué cambió.

Mensajes de commit simples y consistentes ayudan al portafolio:
`feat:` (nuevo), `fix:` (arreglo), `refactor:` (reordenar), `art:` (gráficos).

---

## Fase 1 — Game feel (que se sienta rico)

El objetivo de esta fase no es contenido nuevo, es **jugo**. Es lo que separa
un demo de "se siente bien".

- [x] **Partículas** al recoger un cristal (chispas amarillas que se dispersan)
- [x] **Squash & stretch** del jugador al saltar y al aterrizar
- [x] **Sacudida de cámara** corta al morir
- [x] **Sonido**: salto, recoger, morir, ganar (Web Audio API, tonos simples)
- [x] **Partículas de polvo** al correr y al caer
- [x] Pequeño retardo (unos frames congelados) al morir, para dar peso

> Dónde: la mayoría toca `Player.ts` (animación) y un nuevo `game/Particles.ts`.
> El sonido puede vivir en `engine/audio.ts`.

---

## Fase 2 — Mundo más grande (de una sala a varias)

Aquí el juego empieza a oler a metroidvania.

- [x] Mover el mapa de `Level.ts` a archivos separados (un archivo por sala)
- [x] Sistema de **salas conectadas**: salir por un borde entra a otra sala
- [x] **Checkpoints** o puntos de reaparición por sala (en vez de volver al inicio)
- [x] Plataformas de **un solo sentido** (subís atravesando, te parás encima)
- [x] **Mapa/minimapa** que se revela conforme explorás
- [x] Fondo con **parallax** (capas que se mueven a distinta velocidad)

> Dónde: nace `game/World.ts` (gestiona salas y transiciones). `Level.ts` pasa a
> representar **una** sala. La cámara ya está lista para mundos grandes.

---

## Fase 3 — Habilidades que desbloquean zonas (corazón del metroidvania)

La gracia del género: volver con una habilidad nueva y llegar a donde antes no.

- [x] **Doble salto**
- [x] **Dash** (impulso horizontal corto con cooldown)
- [x] **Wall jump / wall slide** (deslizar y saltar por paredes)
- [x] Puertas/zonas que **requieren** una habilidad (bloqueos de progreso)
- [x] Un objeto coleccionable que **otorga** cada habilidad

> Dónde: `Player.ts` gana banderas (`canDoubleJump`, `canDash`). Las habilidades
> son datos, no código duro: así desbloquearlas es cambiar una bandera.

---

## Fase 4 — Enemigos y combate

- [x] Más tipos de enemigo (que vuelan, que disparan, que persiguen)
- [x] **Vida del jugador** (corazones) en vez de morir de un toque
- [x] Forma de atacar: pisar tipo Mario, o un golpe corto
- [x] **Knockback** e invulnerabilidad breve tras recibir daño
- [x] Un **jefe** sencillo de fin de zona

> **Fase 4 completa.** Enemigos con interfaz común en `game/entities/`
> (Slime, Flyer, Chaser, Boss). Corazones + retroceso + invulnerabilidad;
> pisar derrota (con rebote y hit-stop); volador y cazador; y un jefe
> guardián con proyectiles que aguanta 3 pisotones y bloquea la puerta.

> Dónde: refactor para que enemigos compartan una interfaz común
> (`game/entities/`), y un `game/Combat.ts` o lógica en `Game.ts`.

---

## Fase 5 — Arte de verdad (pixel art pulido, por código)

Decisión: en vez de assets externos (PixelLab/Aseprite son de pago o requieren
manejo manual), **elevamos el arte autorado por código** a calidad de asset.
Para un juego de sprites chicos y cohesivos como este, el arte a mano gana en
coherencia y encaja perfecto (tamaños, paleta y timing ya cableados). Bonus de
portafolio: **todo el arte procedural, sin dependencias de terceros.**
Técnicas guía: hue shifting, sel-out, más pasos de sombra, sub-pixel y ciclos
de animación reales. Vamos punto por punto.

- [x] **Jugador**: rediseño más detallado, ciclo de correr real y estados pulidos
- [x] **Enemigos**: más volumen y carácter (slime, volador, cazador, jefe)
- [x] **Cristales, reliquias y puerta**: animación con más frames
- [x] **Tileset** de paredes: bordes, esquinas y variaciones reales
- [x] **Atmósfera**: rayos de luz, brasas doradas, cristales que titilan y niebla baja

> Dónde: todo vive en `game/art.ts` (grillas de píxeles + `Sprite`). El pipeline
> ya está: cada `draw()` elige un frame. Si algún día conseguís assets reales,
> se reemplaza cómo se llena cada `Sprite` sin tocar la lógica.
> **Importante:** coordenadas enteras + `image-rendering: pixelated` (ya lo hacemos).

---

## Fase 6 — Estructura de juego (que se sienta completo)

- [ ] **Menú** de inicio y pantalla de game over
- [ ] **Guardado** del progreso (localStorage para la versión web)
- [ ] Pantalla de **pausa**
- [ ] Contador de tiempo / cristales totales (incentivo de speedrun)
- [ ] Soporte de **gamepad** (la API de navegador es directa)

---

## Fase 7 — Publicar (gratis)

- [ ] `npm run build` y subir la carpeta `dist/` a **itch.io** (gratis, ideal para juegos web)
- [ ] También sirve Vercel / Netlify / GitHub Pages
- [ ] Capturas y un GIF corto para el README y el portafolio
- [ ] Página de itch con descripción y controles

---

## Punto de decisión: ¿seguir en web o pasar a Godot?

Esta versión web (TypeScript + Canvas) es **perfecta** para aprender, prototipar
rápido y tener un demo jugable en el portafolio sin instalar nada. Llegás lejos.

Conviene **migrar a Godot** si en algún momento querés:

- Un mundo grande de verdad con muchas salas y un editor visual de niveles
- Exportar a **escritorio, móvil o Steam** con un clic
- Sistema de físicas, tilemaps, partículas y audio ya hechos (menos código tuyo)

Lo bueno: **nada de este trabajo se pierde**. La arquitectura (entrada → acciones,
estados, entidades con `update`/`draw`, niveles como datos) es la misma en Godot.
Tu controlador con coyote time se traduce casi 1:1 a GDScript, y los mapas ASCII
se vuelven escenas de TileMap. Pensá esta versión como tu "campo de pruebas".

> Recomendación práctica: llevá la versión web hasta la **Fase 3** (ya con una
> habilidad o dos). Si el proyecto te sigue entusiasmando y querés algo grande,
> ese es el momento natural de pasar a Godot con todo lo aprendido.

---

## Ideas sueltas (cuando aparezca la inspiración)

- Cristales que valen distinto / cristal secreto escondido
- Corriente de agua o viento que empuja al jugador
- Plataformas que se rompen o se mueven
- Un compañero/mascota que te sigue
- Modo contrarreloj

---

*Última actualización: define vos el ritmo. Una casilla a la vez es suficiente.*
