// ============================================================
//  Touch layout tests (customizable on-screen controls)
// ------------------------------------------------------------
//  The layout is pure data: here we guard the button table
//  (all six ids, valid default fractions), the clamping of every
//  setter, mirror (its own inverse), reset, and that parse never
//  throws and always fills the gaps. Turning it into pixels needs
//  the DOM (touch.ts) and isn't tested here.
// ============================================================

import { beforeEach, describe, expect, it } from 'vitest';
import {
  OPACITY_MAX,
  OPACITY_MIN,
  SCALE_MAX,
  SCALE_MIN,
  TOUCH_BTNS,
  type TouchBtnId,
  commit,
  defaultLayout,
  dragBtnTo,
  getBtnState,
  getLayout,
  getMove,
  getOpacity,
  mirror,
  nudgeOpacity,
  nudgeScale,
  onLayoutChange,
  parseLayout,
  reset,
  setBtnPos,
  setBtnScale,
  setMove,
  setOpacity,
  toggleMove,
} from './touchLayout';

const IDS: TouchBtnId[] = ['left', 'right', 'down', 'jump', 'dash', 'pause', 'stick'];

describe('TOUCH_BTNS (tabla de botones)', () => {
  it('cubre exactamente los controles esperados, con ids únicos', () => {
    const ids = TOUCH_BTNS.map((b) => b.id);
    expect(new Set(ids)).toEqual(new Set(IDS));
    expect(ids).toHaveLength(IDS.length);
  });

  it('cada default cae dentro de la pantalla y tiene tamaño/aspecto válidos', () => {
    for (const b of TOUCH_BTNS) {
      expect(b.fx, `${b.id}.fx`).toBeGreaterThanOrEqual(0);
      expect(b.fx, `${b.id}.fx`).toBeLessThanOrEqual(1);
      expect(b.fy, `${b.id}.fy`).toBeGreaterThanOrEqual(0);
      expect(b.fy, `${b.id}.fy`).toBeLessThanOrEqual(1);
      expect(b.bw, `${b.id}.bw`).toBeGreaterThan(0);
      expect(b.aspect, `${b.id}.aspect`).toBeGreaterThan(0);
    }
  });
});

describe('layout por defecto', () => {
  beforeEach(() => reset());

  it('reset deja todos los botones a escala 1 en su posición default, opacidad 1', () => {
    const l = getLayout();
    expect(l.opacity).toBe(1);
    expect(l.move).toBe('stick'); // el joystick es el control por defecto
    for (const b of TOUCH_BTNS) {
      expect(l.btns[b.id]).toEqual({ x: b.fx, y: b.fy, s: 1 });
    }
  });
});

describe('setters con clamp', () => {
  beforeEach(() => reset());

  it('setBtnPos recorta a [0,1]', () => {
    setBtnPos('jump', 5, -3);
    expect(getBtnState('jump')).toMatchObject({ x: 1, y: 0 });
    setBtnPos('jump', 0.3, 0.7);
    expect(getBtnState('jump')).toMatchObject({ x: 0.3, y: 0.7 });
  });

  it('setBtnScale recorta a [SCALE_MIN, SCALE_MAX]', () => {
    setBtnScale('dash', 99);
    expect(getBtnState('dash').s).toBe(SCALE_MAX);
    setBtnScale('dash', 0);
    expect(getBtnState('dash').s).toBe(SCALE_MIN);
  });

  it('nudgeScale suma sobre el valor actual (y clampa)', () => {
    setBtnScale('left', 1);
    nudgeScale('left', 0.5);
    expect(getBtnState('left').s).toBeCloseTo(1.5);
    nudgeScale('left', 99);
    expect(getBtnState('left').s).toBe(SCALE_MAX);
  });

  it('setOpacity recorta a [OPACITY_MIN, OPACITY_MAX]', () => {
    setOpacity(9);
    expect(getOpacity()).toBe(OPACITY_MAX);
    setOpacity(0);
    expect(getOpacity()).toBe(OPACITY_MIN);
  });

  it('ids desconocidos no rompen nada', () => {
    // @ts-expect-error probando un id inválido a propósito
    setBtnPos('nope', 0.5, 0.5);
    // @ts-expect-error idem
    expect(() => setBtnScale('nope', 1)).not.toThrow();
  });
});

describe('mirror', () => {
  beforeEach(() => reset());

  it('refleja cada x a 1 - x y deja y/escala/opacidad intactas', () => {
    setBtnScale('jump', 1.7);
    setOpacity(0.5);
    const before = { ...getBtnState('jump') };
    mirror();
    const after = getBtnState('jump');
    expect(after.x).toBeCloseTo(1 - before.x);
    expect(after.y).toBe(before.y);
    expect(after.s).toBe(before.s);
    expect(getOpacity()).toBe(0.5);
  });

  it('es su propia inversa (dos espejos vuelven al inicio)', () => {
    setBtnPos('dash', 0.2, 0.6);
    mirror();
    mirror();
    const s = getBtnState('dash');
    expect(s.x).toBeCloseTo(0.2);
    expect(s.y).toBe(0.6);
  });
});

describe('editor: drag / opacidad / notificación', () => {
  beforeEach(() => reset());

  it('dragBtnTo mueve en memoria y clampa a [0,1]', () => {
    dragBtnTo('jump', 2, -1);
    expect(getBtnState('jump')).toMatchObject({ x: 1, y: 0 });
    dragBtnTo('jump', 0.33, 0.44);
    expect(getBtnState('jump')).toMatchObject({ x: 0.33, y: 0.44 });
  });

  it('nudgeOpacity suma sobre el valor actual y clampa', () => {
    nudgeOpacity(-0.3);
    expect(getOpacity()).toBeCloseTo(0.7);
    nudgeOpacity(-9);
    expect(getOpacity()).toBe(OPACITY_MIN);
  });

  it('onLayoutChange notifica en cada setter y en commit()', () => {
    let n = 0;
    onLayoutChange(() => n++);
    const before = n;
    setBtnScale('left', 1.4); // un setter persiste + notifica
    dragBtnTo('left', 0.2, 0.2); // drag NO notifica (solo memoria)
    commit(); // el commit del drag notifica una vez
    expect(n).toBe(before + 2);
  });
});

describe('estilo de movimiento (joystick / cruceta)', () => {
  beforeEach(() => reset());

  it('por defecto es el joystick', () => {
    expect(getMove()).toBe('stick');
  });

  it('toggleMove alterna joystick <-> cruceta', () => {
    toggleMove();
    expect(getMove()).toBe('dpad');
    toggleMove();
    expect(getMove()).toBe('stick');
  });

  it('setMove ignora valores desconocidos', () => {
    setMove('dpad');
    // @ts-expect-error probando un estilo inválido a propósito
    setMove('gamepad');
    expect(getMove()).toBe('dpad');
  });

  it('reset conserva el estilo elegido (es preferencia, no layout)', () => {
    setMove('dpad'); // quien eligió la cruceta no debe perderla
    setBtnPos('jump', 0.1, 0.1); // ensuciamos el layout
    reset();
    expect(getMove()).toBe('dpad'); // la elección sobrevive
    expect(getBtnState('jump')).toMatchObject({ x: 0.92, y: 0.9, s: 1 }); // posiciones sí
  });
});

describe('parseLayout (persistencia / migración)', () => {
  it('sin datos devuelve el layout default', () => {
    expect(parseLayout(null)).toEqual(defaultLayout());
  });

  it('JSON corrupto no lanza y devuelve el default', () => {
    expect(parseLayout('{no es json')).toEqual(defaultLayout());
  });

  it('rellena los botones ausentes y clampa los presentes', () => {
    const raw = JSON.stringify({
      opacity: 10, // fuera de rango -> clamp a OPACITY_MAX
      btns: { jump: { x: 0.4, y: 2, s: 0.1 } }, // y e s fuera de rango
    });
    const l = parseLayout(raw);
    expect(l.opacity).toBe(OPACITY_MAX);
    expect(l.btns.jump).toEqual({ x: 0.4, y: 1, s: SCALE_MIN });
    // Un botón ausente conserva su default.
    expect(l.btns.pause).toEqual({ x: 0.96, y: 0.09, s: 1 });
  });

  it('respeta la elección explícita y descarta un estilo inválido', () => {
    expect(parseLayout(JSON.stringify({ move: 'dpad' })).move).toBe('dpad'); // eligió cruceta
    expect(parseLayout(JSON.stringify({ move: 'stick' })).move).toBe('stick');
    expect(parseLayout(JSON.stringify({ move: 'ouija' })).move).toBe('stick'); // basura -> default
  });

  it('un guardado sin estilo elegido estrena el joystick (el nuevo default)', () => {
    const old = JSON.stringify({ opacity: 0.8, btns: { jump: { x: 0.5, y: 0.5, s: 1.2 } } });
    const l = parseLayout(old);
    expect(l.move).toBe('stick'); // nadie eligió: se lleva el default nuevo
    expect(l.btns.stick).toEqual(defaultLayout().btns.stick); // con su sitio de fábrica
    expect(l.btns.jump).toEqual({ x: 0.5, y: 0.5, s: 1.2 }); // lo suyo se respeta
  });

  it('descarta valores no numéricos (NaN, strings) por el default', () => {
    const raw = JSON.stringify({ btns: { left: { x: 'a', y: null, s: NaN } } });
    const def = defaultLayout().btns.left;
    expect(parseLayout(raw).btns.left).toEqual(def);
  });
});
