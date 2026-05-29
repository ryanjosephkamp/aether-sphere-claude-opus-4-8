/**
 * Math utilities for AetherSphere.
 * Pure functions — fully unit-testable without a GPU (see tests/math.test.js).
 */

/** Clamp `v` into the inclusive range [min, max]. */
export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/** Linear interpolation between a and b by t in [0, 1]. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Smoothstep easing (Hermite) between edge0 and edge1.
 * Returns 0 below edge0, 1 above edge1, smooth in between.
 */
export function smoothstep(edge0, edge1, x) {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Convert degrees to radians. */
export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

/** Convert radians to degrees. */
export function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

/** Map value x from range [inMin, inMax] to [outMin, outMax]. */
export function mapRange(x, inMin, inMax, outMin, outMax) {
  if (inMin === inMax) return outMin;
  return outMin + ((x - inMin) * (outMax - outMin)) / (inMax - inMin);
}

/**
 * Deterministic pseudo-random generator (mulberry32).
 * Returns a function producing floats in [0, 1). Seeded for reproducibility
 * so procedural planets and tests are stable.
 */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
