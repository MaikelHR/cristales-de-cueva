import { describe, it, expect } from 'vitest';
import { OW_NODES, OW_WORLD_W, owCamX, grottoFitsOnScreen } from './owMap';
import { WORLD_NODE_COUNT, GROTTO_NODE_COUNT } from '../world/rooms';

const VIEW_W = 320; // main.ts

describe('el mapa del mundo', () => {
  it('tiene un nodo por cada nodo del mundo', () => {
    expect(OW_NODES.length).toBe(WORLD_NODE_COUNT);
  });

  it('el camino SIEMPRE avanza hacia la derecha', () => {
    // La senda de desafío volvía sobre la gruta, así que pulsar
    // 'derecha' movía al personaje hacia la izquierda de la pantalla:
    // se leía como controles invertidos. El camino no puede doblarse.
    for (let i = 1; i < OW_NODES.length; i++) {
      expect(OW_NODES[i].x, `nodo ${i}`).toBeGreaterThan(OW_NODES[i - 1].x);
    }
  });

  it('ningún nodo se esconde bajo el panel ni tras el título', () => {
    // El título vive arriba (y ≈ 14-25) y el panel ocupa los últimos
    // 41 px de 176: un nodo fuera de esa franja no se puede leer.
    for (const [i, n] of OW_NODES.entries()) {
      expect(n.y, `nodo ${i}`).toBeGreaterThanOrEqual(34);
      expect(n.y, `nodo ${i}`).toBeLessThanOrEqual(128);
    }
  });

  it('la gruta entera cabe en una pantalla: sin la senda no hay scroll', () => {
    expect(grottoFitsOnScreen(GROTTO_NODE_COUNT, VIEW_W)).toBe(true);
    for (const n of OW_NODES) expect(owCamX(n.x, VIEW_W, false)).toBe(0);
  });

  it('con la senda abierta la cámara centra al personaje sin salirse', () => {
    const max = OW_WORLD_W - VIEW_W;
    expect(max).toBeGreaterThan(0); // con la senda el mapa ya no cabe
    expect(owCamX(OW_NODES[0].x, VIEW_W, true)).toBe(0); // el primer nodo, sin scroll
    expect(owCamX(OW_NODES[OW_NODES.length - 1].x, VIEW_W, true)).toBe(max);
    for (const n of OW_NODES) {
      const cam = owCamX(n.x, VIEW_W, true);
      expect(cam).toBeGreaterThanOrEqual(0);
      expect(cam).toBeLessThanOrEqual(max);
      // Y el nodo queda dentro de la vista con margen para su isla.
      expect(n.x - cam).toBeGreaterThanOrEqual(8);
      expect(n.x - cam).toBeLessThanOrEqual(VIEW_W - 8);
    }
  });
});
