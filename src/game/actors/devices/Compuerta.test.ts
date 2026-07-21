import { describe, expect, it } from 'vitest';
import { Cisterna } from './Cisterna';
import { Compuerta } from './Compuerta';
import { Level, TILE } from '../../world/Level';

function sala(): Level {
  return new Level([
    '##########',
    '#........#',
    '#........#',
    '#........#',
    '#........#',
    '#........#',
    '#........#',
    '#........#',
    '#........#',
    '##########',
  ]);
}

function montar() {
  const level = sala();
  const tanque = new Cisterna(2 * TILE, 2 * TILE, 6, 6, 12, 0, level);
  const valvula = new Compuerta(3 * TILE, 1 * TILE);
  valvula.tank = tanque;
  return { level, tanque, valvula };
}

const filasMojadas = (level: Level): number =>
  [2, 3, 4, 5, 6, 7].filter((r) => level.wetCell(r, 4)).length;

describe('Compuerta (la válvula que para el reloj)', () => {
  it('empieza suelta: el agua sigue su ciclo', () => {
    const { level, tanque, valvula } = montar();
    expect(valvula.locked).toBe(false);
    for (let i = 0; i < 120; i++) tanque.update(1 / 60);
    expect(filasMojadas(level)).toBeGreaterThan(0);
  });

  it('azotarla deja el agua EXACTAMENTE donde estaba', () => {
    const { level, tanque, valvula } = montar();
    for (let i = 0; i < 120; i++) tanque.update(1 / 60); // que suba a media altura
    const nivel = filasMojadas(level);
    expect(valvula.throwIt()).toBe(true);
    expect(valvula.locked).toBe(true);
    for (let i = 0; i < 600; i++) tanque.update(1 / 60); // ocho segundos
    expect(filasMojadas(level)).toBe(nivel);
  });

  it('volver a azotarla arranca el reloj otra vez', () => {
    const { level, tanque, valvula } = montar();
    for (let i = 0; i < 120; i++) tanque.update(1 / 60);
    valvula.throwIt();
    const nivel = filasMojadas(level);
    valvula.update(0.5);            // pasa el rearme
    expect(valvula.throwIt()).toBe(true);
    expect(valvula.locked).toBe(false);
    for (let i = 0; i < 240; i++) tanque.update(1 / 60);
    expect(filasMojadas(level)).not.toBe(nivel);
  });

  it('un azotón es UN tirón: no se dispara dos veces seguidas', () => {
    const { valvula } = montar();
    expect(valvula.throwIt()).toBe(true);
    expect(valvula.throwIt()).toBe(false); // el mismo golpe no cuenta dos veces
    expect(valvula.locked).toBe(true);
  });

  it('sin depósito enlazado no hace nada (y no revienta)', () => {
    const suelta = new Compuerta(0, 0);
    expect(suelta.throwIt()).toBe(false);
    expect(suelta.locked).toBe(false);
  });
});
