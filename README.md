# Cristales de la Cueva

Mini plataformero pixel-art hecho con **TypeScript + Vite + Canvas**, sin assets
externos (los sprites están dibujados por código). Pensado para crecer de a poco
hacia un pequeño metroidvania.

Recoge los 5 cristales y llega a la puerta. Cuidado con los slimes y los fosos.

## Correr

```bash
npm install
npm run dev
```

Abrí la URL que imprime Vite (normalmente `http://localhost:5173`). Cada vez que
guardás un archivo, la página se recarga sola.

## Build

```bash
npm run build      # revisa tipos y empaqueta a /dist
npm run preview    # sirve el build de producción
```

La carpeta `dist/` es estática: subila gratis a **itch.io**, Vercel, Netlify o
GitHub Pages.

## Controles

- Mover: `←` `→` o `A` `D`
- Saltar (y doble salto): `espacio` / `↑` / `W`
- Dash: `shift` / `X`
- Reiniciar: `R`

## Cómo está armado

- `src/engine/` — motor reutilizable (bucle, entrada, canvas/colisiones, **Sprite**, audio)
- `src/game/` — este juego (jugador, mundo, salas, slimes, cámara, reglas)
- El mundo son **salas conectadas**: cada sala es texto ASCII en `src/game/rooms/`
  (un archivo por sala). Editá una, o creá la tuya y sumala a `rooms/index.ts`.
- **El arte** está en `src/game/art.ts`: cada sprite es una grilla de texto con una
  paleta. Cambiá un carácter y cambia un pixel. Ahí también viven los brillos, el
  fondo con parallax, el polvo y la viñeta. Cuando quieras arte de PixelLab/Aseprite,
  solo reemplazás cómo se llena cada `Sprite` (ver Fase 5 del plan).

## Qué sigue

Ver **[PLAN_DE_DESARROLLO.md](./PLAN_DE_DESARROLLO.md)** — la hoja de ruta por
fases (game feel, mundo más grande, habilidades metroidvania, arte real, publicar).
