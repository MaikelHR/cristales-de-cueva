// CLI standalone para `npm run reach`: pone los stubs de DOM y corre runReach.
function fakeGradient() { return { addColorStop() {} }; }
function fakeCtx(): any {
  const t: any = {};
  return new Proxy(t, {
    get(o, p) {
      if (p in o) return o[p];
      if (p === 'canvas') return { width: 0, height: 0 };
      if (p === 'measureText') return () => ({ width: 0 });
      if (p === 'getImageData') return () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
      if (p === 'createRadialGradient' || p === 'createLinearGradient' || p === 'createPattern') return fakeGradient;
      return () => {};
    },
    set(o, p, v) { o[p] = v; return true; },
  });
}
const g: any = globalThis;
g.document = { createElement: (tag: string) => (tag === 'canvas' ? { width: 0, height: 0, getContext: () => fakeCtx() } : {}) };
const store: Record<string, string> = {};
g.localStorage = { getItem: (k: string) => (k in store ? store[k] : null), setItem: () => {}, removeItem: () => {} };
g.window = g; g.performance ??= { now: () => 0 }; g.requestAnimationFrame ??= () => 0;

let fallos = 0;
const fail = (m: string) => { console.error('  ✗ ' + m); fallos++; };
const ok = (m: string) => console.log('  ✓ ' + m);

const { runReach } = await import('./reach.ts');
await runReach(fail, ok);

if (fallos) { console.error(`\nREACH ROJO: ${fallos} fallo(s).`); process.exit(1); }
console.log('\nREACH VERDE');
