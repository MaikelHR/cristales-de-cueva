import { describe, expect, it, vi } from 'vitest';

// The boss's sounds are irrelevant here (and Node has no AudioContext).
vi.mock('../../sfx', () => ({ sfx: new Proxy({}, { get: () => () => {} }) }));

import { Custodio } from './Custodio';
import { Level } from '../../world/Level';

// A bare arena: open air over a flat floor. 22 rows = exactly one screen.
const arena = new Level([
  ...Array.from({ length: 20 }, () => '.'.repeat(56)),
  '#'.repeat(56),
  '#'.repeat(56),
]);

// The REAL lintel is 24 rows (192px) against a 176px view, so its camera
// scrolls 16px — which is what put the roof telegraph off the top of the
// screen. Anything about visibility has to be tested in a room like this,
// never in the one-screen arena where the bug cannot happen.
const tallArena = new Level([
  '#'.repeat(56),
  ...Array.from({ length: 21 }, () => '.'.repeat(56)),
  '#'.repeat(56),
  '#'.repeat(56),
]);
const VIEW_H = 176;

describe('custodio', () => {
  it('cada vida exige su verbo, y solo los tres verbos lo apagan', () => {
    // The whole fight is the contract: outside a window NOTHING lands;
    // inside one, the flags must name exactly one verb per life —
    // gold stomp (3), cyan dash-lunge (2), violet pound (1).
    const boss = new Custodio(208, 104, arena);
    const dt = 1 / 60;
    const target = { x: 220, y: 150 };
    let hits = 0;

    for (let i = 0; i < 60 * 120 && !boss.dead; i++) {
      boss.update(dt, target);

      // The flags never contradict the verb of the current life.
      if (boss.stompable) {
        expect(boss.hp, `frame ${i}`).toBe(3);
        expect(boss.invulnerable, `frame ${i}`).toBe(false);
      }
      if (boss.dashVulnerable) {
        expect(boss.hp, `frame ${i}`).toBe(2);
        // Untouchable from above: only the lunge gets through.
        expect(boss.invulnerable, `frame ${i}`).toBe(true);
      }
      if (boss.hp === 1 && !boss.invulnerable) {
        // The dome: a plain stomp must NOT qualify — pound only.
        expect(boss.stompable, `frame ${i}`).toBe(false);
      }

      const windowOpen = boss.stompable || boss.dashVulnerable || !boss.invulnerable;
      const before = boss.hp;
      const defeated = boss.onStomp();
      if (windowOpen) {
        if (boss.hp < before) hits++;
        if (defeated) break;
      } else {
        // Outside a window the hit never lands, ever.
        expect(defeated, `frame ${i}`).toBe(false);
        expect(boss.hp, `frame ${i}`).toBe(before);
      }
    }

    expect(hits).toBe(3);
    expect(boss.dead).toBe(true);
  });

  // The drop lands on the exact frame the telegraph expires, so the
  // 'shards' -> null transition IS the moment of the drop. Watching that
  // beats sniffing hazard boxes by height: ring orbs fly UPWARD through
  // the ceiling band too, and counting them as shards is how the first
  // version of this test fooled itself.
  function goldPhase(frames = 60 * 40, where: Level = arena): {
    warnings: number[]; dropRows: Array<Array<{ x: number; y: number }>>;
  } {
    const boss = new Custodio(208, 104, where);
    const dt = 1 / 60;
    const target = { x: 220, y: 150 };
    const warnings: number[] = [];
    const dropRows: Array<Array<{ x: number; y: number }>> = [];
    let warned = 0;
    let prev: string | null = null;

    for (let i = 0; i < frames && boss.hp === 3; i++) {
      boss.update(dt, target);
      const now = boss.announcing;
      if (now === 'shards') warned += dt;
      if (prev === 'shards' && now !== 'shards') {
        warnings.push(warned);
        // Exactly the frame they spawned: read their columns off the roof.
        dropRows.push(
          boss.hazards().filter((h) => h.y <= 12)
            .map((h) => ({ x: h.x, y: h.y }))
            .sort((a, b) => a.x - b.x),
        );
        warned = 0;
      }
      prev = now;
    }
    return { warnings, dropRows };
  }

  it('las esquirlas avisan antes de caer, y con tiempo de sobra', () => {
    // The boss's contract: EVERY projectile announces itself first. The
    // gold shards used to be the one exception — spawned at the roof
    // already falling, aimed at wherever you stood that very frame. The
    // player needs ~0.22s to clear the outer column at 92 px/s, so the
    // warning has to be comfortably longer than that.
    const { warnings } = goldPhase();
    expect(warnings.length, 'la vida dorada debería tirar esquirlas').toBeGreaterThan(0);
    for (const w of warnings) {
      expect(w, 'aviso demasiado corto para esquivar').toBeGreaterThanOrEqual(0.5);
    }
  });

  it('las esquirlas caen siempre igual (se pueden aprender)', () => {
    // Same player position => identical columns, every drop. The old
    // version jittered x by ±4px and rolled a fresh fall speed per
    // shard, so no two drops were ever alike and none could be learned.
    const { dropRows } = goldPhase();
    expect(dropRows.length).toBeGreaterThan(1);
    for (const row of dropRows) {
      expect(row, 'tres columnas por tirada').toHaveLength(3);
      // Evenly spaced: a shape with gaps you can stand in.
      expect(row[1].x - row[0].x).toBe(row[2].x - row[1].x);
      expect(row[1].x - row[0].x).toBeGreaterThan(8);
      // ...and all three start together at the roof, not staggered.
      expect(row[0].y).toBe(row[2].y);
    }
    // Every drop identical to the first: no hidden randomness anywhere.
    for (const row of dropRows.slice(1)) expect(row).toEqual(dropRows[0]);
  });

  it('el aviso del techo cae DENTRO de la pantalla, no encima de ella', () => {
    // In a room taller than the view the camera clamps to
    // `heightPx - VIEW_H`, so it sits 16px down while the player stands
    // on the floor. Everything born at the room's literal roof was then
    // drawn ABOVE the top edge: the glints and the shards both arrived
    // from outside the picture, which is most of why this attack read as
    // coming from nowhere. Whatever falls from the roof has to be born
    // inside the bottom-most VIEW_H of the room.
    const { dropRows } = goldPhase(60 * 40, tallArena);
    expect(dropRows.length).toBeGreaterThan(0);
    const lowestCamera = tallArena.heightPx - VIEW_H;
    for (const row of dropRows) {
      for (const s of row) {
        expect(s.y, 'nace por encima del borde superior de la cámara')
          .toBeGreaterThanOrEqual(lowestCamera);
      }
    }
  });

  it('duerme hasta que te acercas, y al despertar se disuelve (sin cuerpo)', () => {
    const boss = new Custodio(208, 104, arena);
    // Asleep it has a body you could read from the ledge...
    expect(boss.box().w).toBeGreaterThan(0);
    // ...and a far player never wakes it.
    for (let i = 0; i < 60; i++) boss.update(1 / 60, { x: 40, y: 150 });
    expect(boss.box().w).toBeGreaterThan(0);
    // Coming close wakes it: it dissolves (no body while gathering)…
    boss.update(1 / 60, { x: 180, y: 150 });
    expect(boss.box().w).toBe(0);
    // …and re-forms with a real body.
    for (let i = 0; i < 60; i++) boss.update(1 / 60, { x: 180, y: 150 });
    expect(boss.box().w).toBeGreaterThan(0);
  });
});
