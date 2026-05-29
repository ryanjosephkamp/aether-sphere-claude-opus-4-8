import { describe, it, expect } from 'vitest';
import { Heightfield, craterProfile, HEIGHTFIELD_VERSION } from '../src/planet/Heightfield.js';

/** Build a tiny set of vertex directions: +X, -X, +Y, -Y, +Z, -Z. */
function axisDirections() {
  return new Float32Array([1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1]);
}

describe('craterProfile', () => {
  it('is zero outside the crater radius and at/after the rim', () => {
    expect(craterProfile(1, 0.1, 0.03)).toBe(0);
    expect(craterProfile(1.5, 0.1, 0.03)).toBe(0);
    expect(craterProfile(-0.1, 0.1, 0.03)).toBe(0);
  });

  it('excavates at the center (negative displacement)', () => {
    expect(craterProfile(0, 0.1, 0.03)).toBeCloseTo(-0.1, 6);
  });

  it('produces a raised rim near the edge', () => {
    // Around t=0.82 the rim term peaks; net displacement should exceed the
    // center excavation (be relatively higher).
    expect(craterProfile(0.82, 0.1, 0.05)).toBeGreaterThan(craterProfile(0.1, 0.1, 0.05));
  });
});

describe('Heightfield', () => {
  it('initializes flat with the right vertex count', () => {
    const hf = new Heightfield(axisDirections());
    expect(hf.count).toBe(6);
    expect(Array.from(hf.displacement)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(hf.impactCount).toBe(0);
  });

  it('depresses the vertex nearest the impact and leaves the antipode untouched', () => {
    const hf = new Heightfield(axisDirections());
    hf.applyImpact(1, 0, 0, 0.5, 0.1, 0.02); // hit +X
    expect(hf.displacement[0]).toBeLessThan(0); // +X excavated
    expect(hf.displacement[1]).toBe(0); // -X (antipode) untouched
    expect(hf.impactCount).toBe(1);
  });

  it('clamps accumulated displacement to configured bounds', () => {
    const hf = new Heightfield(axisDirections(), { maxDepth: 0.05, maxRim: 0.01 });
    for (let i = 0; i < 50; i++) hf.applyImpact(1, 0, 0, 0.5, 0.1, 0);
    expect(hf.displacement[0]).toBeGreaterThanOrEqual(-0.05 - 1e-6);
    expect(hf.displacement[0]).toBeCloseTo(-0.05, 5);
  });

  it('serialize/deserialize round-trips deformation', () => {
    const hf = new Heightfield(axisDirections());
    hf.applyImpact(0, 1, 0, 0.6, 0.12, 0.03);
    const data = hf.serialize();
    expect(data.version).toBe(HEIGHTFIELD_VERSION);
    expect(data.count).toBe(6);

    const hf2 = new Heightfield(axisDirections());
    const ok = hf2.deserialize(data);
    expect(ok).toBe(true);
    for (let i = 0; i < 6; i++) {
      expect(hf2.displacement[i]).toBeCloseTo(hf.displacement[i], 4);
    }
  });

  it('deserialize ignores invalid data and out-of-range indices', () => {
    const hf = new Heightfield(axisDirections());
    expect(hf.deserialize(null)).toBe(false);
    expect(hf.deserialize({})).toBe(false);
    const ok = hf.deserialize({ indices: [999, 0], values: [0.5, -0.02] });
    expect(ok).toBe(true);
    expect(hf.displacement[0]).toBeCloseTo(-0.02, 6); // valid index applied
  });

  it('reset clears all deformation', () => {
    const hf = new Heightfield(axisDirections());
    hf.applyImpact(1, 0, 0, 0.5, 0.1, 0.02);
    hf.reset();
    expect(Array.from(hf.displacement)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(hf.impactCount).toBe(0);
  });

  it('relax moves displacement toward zero', () => {
    const hf = new Heightfield(axisDirections());
    hf.applyImpact(1, 0, 0, 0.5, 0.1, 0.02);
    const before = Math.abs(hf.displacement[0]);
    hf.relax(0.5);
    expect(Math.abs(hf.displacement[0])).toBeLessThan(before);
  });
});
