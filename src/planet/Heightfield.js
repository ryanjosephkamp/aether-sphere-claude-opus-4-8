/**
 * Heightfield — the permanent surface-deformation state of a planet
 * (PROJECT-SPEC.md: "permanent surface deformation"; IMPLEMENTATION-PLAN.md §2.2).
 *
 * Design rationale: instead of rebuilding geometry on the CPU for every impact
 * (which would wreck the frame rate — Risk R-1), we store a per-vertex radial
 * displacement array. Impacts write a crater profile (excavated bowl + raised
 * rim) into this array. The Planet feeds the array to the GPU as a displacement
 * attribute, so deformation is permanent, cheap to apply, and trivially
 * serializable for save/load.
 *
 * This class is intentionally free of any Three.js dependency so its math is
 * fully unit-testable (see tests/heightfield.test.js).
 */
import { clamp, smoothstep } from '../util/math.js';

export const HEIGHTFIELD_VERSION = 1;

/**
 * Pure crater elevation profile.
 * @param {number} t  Normalized distance from impact center: 0 at center, 1 at rim radius.
 * @param {number} depth     Maximum excavation depth (positive number).
 * @param {number} rimHeight Maximum raised-rim height (positive number).
 * @returns {number} Radial displacement (negative = excavated, positive = raised).
 */
export function craterProfile(t, depth, rimHeight) {
  if (t >= 1 || t < 0) return 0;
  // Bowl: deepest at the center, smoothly returning to 0 at the rim.
  const cavity = -depth * Math.cos((t * Math.PI) / 2);
  // Rim: a raised ring peaking just inside the crater edge.
  const rimT = (t - 0.82) / 0.16;
  const rim = rimHeight * Math.exp(-rimT * rimT);
  return cavity + rim;
}

export class Heightfield {
  /**
   * @param {Float32Array} directions  Flat array of normalized vertex directions (length 3*N).
   * @param {object} [opts]
   * @param {number} [opts.maxDepth]  Clamp floor for accumulated displacement.
   * @param {number} [opts.maxRim]    Clamp ceiling for accumulated displacement.
   */
  constructor(directions, opts = {}) {
    this.directions = directions;
    this.count = directions.length / 3;
    this.displacement = new Float32Array(this.count);
    this.maxDepth = opts.maxDepth ?? 0.16;
    this.maxRim = opts.maxRim ?? 0.05;
    this.impactCount = 0;
  }

  /**
   * Apply an impact crater centered on a (not necessarily normalized) direction.
   * @param {number} x @param {number} y @param {number} z  Impact direction.
   * @param {number} angularRadius  Crater radius in radians on the unit sphere.
   * @param {number} depth      Excavation depth.
   * @param {number} rimHeight  Raised-rim height.
   * @returns {{min:number, max:number, touched:number}} Affected index range + count.
   */
  applyImpact(x, y, z, angularRadius, depth, rimHeight) {
    const len = Math.hypot(x, y, z) || 1;
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;

    const dir = this.directions;
    const disp = this.displacement;
    const cosRadius = Math.cos(angularRadius);
    let min = Infinity;
    let max = -Infinity;
    let touched = 0;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const dot = dir[i3] * nx + dir[i3 + 1] * ny + dir[i3 + 2] * nz;
      // Outside crater cap — skip.
      if (dot <= cosRadius) continue;
      const ang = Math.acos(clamp(dot, -1, 1));
      const t = ang / angularRadius;
      const delta = craterProfile(t, depth, rimHeight);
      if (delta === 0) continue;
      disp[i] = clamp(disp[i] + delta, -this.maxDepth, this.maxRim);
      if (i < min) min = i;
      if (i > max) max = i;
      touched++;
    }

    if (touched > 0) this.impactCount++;
    return { min: touched ? min : 0, max: touched ? max : -1, touched };
  }

  /** Reset all deformation back to a pristine planet. */
  reset() {
    this.displacement.fill(0);
    this.impactCount = 0;
  }

  /**
   * Serialize deformation to a compact, JSON-friendly sparse structure.
   * Only non-zero vertices are stored to keep saved states small.
   */
  serialize() {
    const indices = [];
    const values = [];
    const disp = this.displacement;
    for (let i = 0; i < this.count; i++) {
      if (disp[i] !== 0) {
        indices.push(i);
        // Round to keep JSON small; sub-millimetre precision is irrelevant.
        values.push(Math.round(disp[i] * 100000) / 100000);
      }
    }
    return {
      version: HEIGHTFIELD_VERSION,
      count: this.count,
      impactCount: this.impactCount,
      indices,
      values,
    };
  }

  /**
   * Restore deformation from a serialized structure produced by serialize().
   * Gracefully ignores out-of-range indices and mismatched vertex counts
   * (Risk R-9: schema/version resilience).
   * @returns {boolean} true if data was applied.
   */
  deserialize(data) {
    if (!data || !Array.isArray(data.indices) || !Array.isArray(data.values)) {
      return false;
    }
    this.displacement.fill(0);
    const n = Math.min(data.indices.length, data.values.length);
    for (let k = 0; k < n; k++) {
      const idx = data.indices[k];
      if (idx >= 0 && idx < this.count) {
        this.displacement[idx] = clamp(data.values[k], -this.maxDepth, this.maxRim);
      }
    }
    this.impactCount = Number.isFinite(data.impactCount) ? data.impactCount : 0;
    return true;
  }

  /**
   * Convenience: smooth global "erosion" pass that relaxes displacement toward
   * zero. Used by the optional terrain tools; kept pure-ish for testing.
   */
  relax(amount = 0.1) {
    const disp = this.displacement;
    const a = smoothstep(0, 1, clamp(amount, 0, 1));
    for (let i = 0; i < this.count; i++) {
      disp[i] *= 1 - a;
    }
  }
}
