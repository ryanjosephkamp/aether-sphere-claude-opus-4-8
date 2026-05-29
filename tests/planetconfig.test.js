import { describe, it, expect } from 'vitest';
import { PLANETS, PLANET_ORDER, getPlanetConfig, DEFAULT_PLANET } from '../src/planet/PlanetConfig.js';

describe('PlanetConfig factual data', () => {
  it('exposes the expected planets in order', () => {
    expect(PLANET_ORDER).toEqual(['earth', 'mars', 'moon']);
  });

  it('each planet has plausible, positive physical data with a source', () => {
    for (const id of PLANET_ORDER) {
      const f = PLANETS[id].facts;
      expect(f.meanRadiusKm).toBeGreaterThan(0);
      expect(f.surfaceGravity).toBeGreaterThan(0);
      expect(f.siderealRotationHours).toBeGreaterThan(0);
      expect(f.axialTiltDeg).toBeGreaterThanOrEqual(0);
      expect(typeof f.source).toBe('string');
      expect(f.source.length).toBeGreaterThan(0);
    }
  });

  it('uses NASA-sourced Earth values (factual integrity)', () => {
    const e = PLANETS.earth.facts;
    expect(e.meanRadiusKm).toBe(6371);
    expect(e.surfaceGravity).toBeCloseTo(9.8, 1);
    expect(e.axialTiltDeg).toBeCloseTo(23.4, 1);
  });

  it('Mars gravity is weaker than Earth, Moon weaker still', () => {
    expect(PLANETS.mars.facts.surfaceGravity).toBeLessThan(PLANETS.earth.facts.surfaceGravity);
    expect(PLANETS.moon.facts.surfaceGravity).toBeLessThan(PLANETS.mars.facts.surfaceGravity);
  });

  it('getPlanetConfig falls back to the default for unknown ids', () => {
    expect(getPlanetConfig('earth').id).toBe('earth');
    expect(getPlanetConfig('does-not-exist').id).toBe(DEFAULT_PLANET);
  });

  it('every planet defines a full color palette', () => {
    const keys = ['deepOcean', 'shallowOcean', 'beach', 'lowland', 'highland', 'mountain', 'snow', 'ice'];
    for (const id of PLANET_ORDER) {
      for (const k of keys) {
        expect(Array.isArray(PLANETS[id].palette[k])).toBe(true);
        expect(PLANETS[id].palette[k].length).toBe(3);
      }
    }
  });
});
