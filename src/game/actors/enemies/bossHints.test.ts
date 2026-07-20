import { describe, expect, it, vi } from 'vitest';

// Los jefes hacen ruido al nacer/pelear y Node no tiene AudioContext.
vi.mock('../../sfx', () => ({ sfx: new Proxy({}, { get: () => () => {} }) }));

import { Boss } from './Boss';
import { Ariete } from './Ariete';
import { Capataz } from './Capataz';
import { Custodio } from './Custodio';
import { Matriarca } from './Matriarca';
import { Ajolote } from '../Ajolote';
import { Level } from '../../world/Level';
import { es, type StrKey } from '../../i18n';
import type { Enemy } from './Enemy';

/** Una sala genérica con techo, aire y suelo: lo justo para construirlos. */
function arena(): Level {
  return new Level([
    '####################',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '####################',
  ]);
}

// El HUD anuncia el verbo de cada jefe en cuanto entras a su sala. Un
// jefe cuyo verbo NO es "saltarle encima" DEBE decirlo: el playtest del
// nivel 9 encontró justo eso ("le brincaba encima y me hacía daño").
// Este test evita que el próximo jefe nazca mudo.
describe('todos los jefes anuncian cómo se les mata', () => {
  const level = arena();
  // Tipados por la INTERFAZ, que es como los ve el HUD (hintKey es
  // opcional ahí: un jefe de pisotón simple puede no traerlo).
  const bosses: Array<{ name: string; boss: Enemy; plainStomp: boolean }> = [
    { name: 'boss', boss: new Boss(40, 40), plainStomp: true },
    { name: 'ariete', boss: new Ariete(40, 96, level), plainStomp: false },
    { name: 'ajolote', boss: new Ajolote(40, 60), plainStomp: false },
    { name: 'capataz', boss: new Capataz(40, 96, level), plainStomp: false },
    { name: 'custodio', boss: new Custodio(40, 40, level), plainStomp: false },
    { name: 'matriarca', boss: new Matriarca(40, 8, level), plainStomp: false },
  ];

  it('todos son jefes de verdad (bloquean la puerta)', () => {
    for (const { name, boss } of bosses) {
      expect(boss.isBoss, name).toBe(true);
    }
  });

  it('el que no se mata de un pisotón simple trae su propio aviso', () => {
    for (const { name, boss, plainStomp } of bosses) {
      if (plainStomp) continue;
      expect(boss.hintKey, `${name} no dice cómo se le mata`).toBeDefined();
    }
  });

  it('cada aviso existe en el diccionario de textos', () => {
    for (const { name, boss } of bosses) {
      const key: StrKey = boss.hintKey ?? 'hud_stomp_boss';
      expect(es[key], `${name} apunta a un texto inexistente: ${key}`).toBeTruthy();
    }
  });

  it('los de verbo cambiante avisan de cada fase, no de una sola', () => {
    // El Custodio cambia de verbo por vida (pisotón → dash → azotón) y
    // el ariete/ajolote/matriarca alternan "espera" con "¡ahora!".
    const custodio = new Custodio(40, 40, level);
    const seen = new Set<string>();
    for (const hp of [3, 2, 1]) {
      (custodio as unknown as { hp: number }).hp = hp;
      seen.add(custodio.hintKey);
    }
    expect(seen.size, 'el Custodio repite aviso entre fases').toBe(3);
  });
});
