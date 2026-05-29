import { describe, it, expect } from 'vitest';
import {
  clamp,
  lerp,
  smoothstep,
  degToRad,
  radToDeg,
  mapRange,
  makeRng,
} from '../src/util/math.js';

describe('math utilities', () => {
  it('clamp bounds values', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('lerp interpolates linearly', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it('smoothstep is 0 below, 1 above, monotonic between', () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 5);
    expect(smoothstep(0, 1, 0.25)).toBeLessThan(smoothstep(0, 1, 0.75));
  });

  it('smoothstep handles degenerate edges', () => {
    expect(smoothstep(1, 1, 0)).toBe(0);
    expect(smoothstep(1, 1, 2)).toBe(1);
  });

  it('degree/radian conversions round-trip', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI, 6);
    expect(radToDeg(Math.PI)).toBeCloseTo(180, 6);
  });

  it('mapRange maps between ranges', () => {
    expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
    expect(mapRange(0, 0, 0, 7, 9)).toBe(7); // degenerate input range
  });

  it('makeRng is deterministic for a seed and within [0,1)', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds produce different sequences', () => {
    expect(makeRng(1)()).not.toBe(makeRng(2)());
  });
});
