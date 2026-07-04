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
- [ ] Pequeño retardo (unos frames congelados) al morir, para dar peso

> Dónde: la mayoría toca `Player.ts` (animación) y un nuevo `game/Particles.ts`.
> El sonido puede vivir en `engine/audio.ts`.

---

## Fase 2 — Mundo más grande (de una sala a varias)

Aquí el juego empieza a oler a metroidvania.

- [ ] Mover el mapa de `Level.ts` a archivos separados (un archivo por sala)
- [ ] Sistema de **salas conectadas**: salir por un borde entra a otra sala
- [ ] **Checkpoints** o puntos de reaparición por sala (en vez de volver al inicio)
- [ ] Plataformas de **un solo sentido** (subís atravesando, te parás encima)
- [ ] **Mapa/minimapa** que se revela conforme explorás
- [ ] Fondo con **parallax** (capas que se mueven a distinta velocidad)

> Dónde: nace `game/World.ts` (gestiona salas y transiciones). `Level.ts` pasa a
> representar **una** sala. La cámara ya está lista para mundos grandes.

---

## Fase 3 — Habilidades que desbloquean zonas (corazón del metroidvania)

La gracia del género: volver con una habilidad nueva y llegar a donde antes no.

- [ ] **Doble salto**
- [ ] **Dash** (impulso horizontal corto con cooldown)
- [ ] **Wall jump / wall slide** (deslizar y saltar por paredes)
- [ ] Puertas/zonas que **requieren** una habilidad (bloqueos de progreso)
- [ ] Un objeto coleccionable que **otorga** cada habilidad

> Dónde: `Player.ts` gana banderas (`canDoubleJump`, `canDash`). Las habilidades
> son datos, no código duro: así desbloquearlas es cambiar una bandera.

---

## Fase 4 — Enemigos y combate

- [ ] Más tipos de enemigo (que vuelan, que disparan, que persiguen)
- [ ] **Vida del jugador** (corazones) en vez de morir de un toque
- [ ] Forma de atacar: pisar tipo Mario, o un golpe corto
- [ ] **Knockback** e invulnerabilidad breve tras recibir daño
- [ ] Un **jefe** sencillo de fin de zona

> Dónde: refactor para que enemigos compartan una interfaz común
> (`game/entities/`), y un `game/Combat.ts` o lógica en `Game.ts`.

---

## Fase 5 — Arte de verdad (reemplazar los sprites de código)

Acá entran las herramientas que ya tenías en mente.

- [ ] Generar sprites base en **PixelLab** (jugador, enemigos, cristales, tiles)
- [ ] Limpiar y animar en **Aseprite** (idle, correr, saltar, daño)
- [ ] Cargar imágenes en el juego y dibujarlas en vez de los rectángulos
- [ ] **Tileset** real para las paredes (esquinas, bordes, variaciones)
- [ ] Animación de cristales y puerta con frames reales

> Dónde: nace `engine/Sprite.ts` (carga y dibuja hojas de sprites). Los `draw()`
> de cada entidad cambian de "pintar rectángulos" a "dibujar un frame".
> **Importante:** mantené `image-rendering: pixelated` y dibujá en coordenadas
> enteras (ya lo hacemos) para que no se vea borroso.

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
