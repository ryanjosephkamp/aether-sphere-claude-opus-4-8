import { describe, it, expect } from 'vitest';
import { Pool } from '../src/util/pool.js';
import { Noise3D } from '../src/util/noise.js';

describe('Pool', () => {
  it('creates via factory when empty and reuses on release', () => {
    let created = 0;
    const pool = new Pool(() => ({ id: ++created }));
    const a = pool.acquire();
    expect(created).toBe(1);
    expect(pool.activeCount).toBe(1);
    pool.release(a);
    expect(pool.freeCount).toBe(1);
    const b = pool.acquire();
    expect(b).toBe(a); // reused same instance
    expect(created).toBe(1);
  });

  it('runs the reset hook on acquire', () => {
    const pool = new Pool(
      () => ({ value: 0 }),
      (o) => {
        o.value = 99;
      }
    );
    const o = pool.acquire();
    expect(o.value).toBe(99);
  });
});

describe('Noise3D', () => {
  it('is deterministic for a given seed', () => {
    const a = new Noise3D(7);
    const b = new Noise3D(7);
    expect(a.noise(0.1, 0.2, 0.3)).toBeCloseTo(b.noise(0.1, 0.2, 0.3), 10);
    expect(a.fbm(1.2, 3.4, 5.6)).toBeCloseTo(b.fbm(1.2, 3.4, 5.6), 10);
  });

  it('returns values within expected bounds', () => {
    const n = new Noise3D(11);
    for (let i = 0; i < 200; i++) {
      const v = n.noise(i * 0.13, i * 0.21, i * 0.07);
      expect(v).toBeGreaterThanOrEqual(-1.5);
      expect(v).toBeLessThanOrEqual(1.5);
      const r = n.ridged(i * 0.13, i * 0.21, i * 0.07, 4);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1.0001);
    }
  });

  it('different seeds give different fields', () => {
    const a = new Noise3D(1);
    const b = new Noise3D(2);
    expect(a.noise(0.5, 0.5, 0.5)).not.toBeCloseTo(b.noise(0.5, 0.5, 0.5), 6);
  });
});
