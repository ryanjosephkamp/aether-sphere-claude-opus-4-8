/**
 * Value (gradient) noise utilities for procedural planet textures and terrain.
 * Deterministic given a seed (see makeRng) so generated planets are stable and
 * unit-testable. This is intentionally dependency-free and CPU-side: it runs
 * once at planet build time, not per-frame.
 */
import { makeRng } from './math.js';

/**
 * 3D value noise with fractal Brownian motion (fBm) accumulation.
 * Returns values roughly in [-1, 1].
 */
export class Noise3D {
  constructor(seed = 1337) {
    const rng = makeRng(seed);
    // Permutation-style gradient lookup table.
    this._size = 256;
    this._mask = this._size - 1;
    this._grad = new Float32Array(this._size * 3);
    for (let i = 0; i < this._size; i++) {
      // Random unit-ish vectors for gradients.
      const x = rng() * 2 - 1;
      const y = rng() * 2 - 1;
      const z = rng() * 2 - 1;
      const len = Math.hypot(x, y, z) || 1;
      this._grad[i * 3] = x / len;
      this._grad[i * 3 + 1] = y / len;
      this._grad[i * 3 + 2] = z / len;
    }
    this._perm = new Uint8Array(this._size);
    for (let i = 0; i < this._size; i++) this._perm[i] = i;
    // Fisher–Yates shuffle of the permutation table.
    for (let i = this._size - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = this._perm[i];
      this._perm[i] = this._perm[j];
      this._perm[j] = t;
    }
  }

  _hash(x, y, z) {
    const m = this._mask;
    return this._perm[(this._perm[(this._perm[x & m] + y) & m] + z) & m];
  }

  _gradDot(hash, x, y, z) {
    const i = hash * 3;
    return this._grad[i] * x + this._grad[i + 1] * y + this._grad[i + 2] * z;
  }

  /** Single-octave 3D gradient noise in approximately [-1, 1]. */
  noise(x, y, z) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const xf = x - xi;
    const yf = y - yi;
    const zf = z - zi;

    const u = fade(xf);
    const v = fade(yf);
    const w = fade(zf);

    const n000 = this._gradDot(this._hash(xi, yi, zi), xf, yf, zf);
    const n100 = this._gradDot(this._hash(xi + 1, yi, zi), xf - 1, yf, zf);
    const n010 = this._gradDot(this._hash(xi, yi + 1, zi), xf, yf - 1, zf);
    const n110 = this._gradDot(this._hash(xi + 1, yi + 1, zi), xf - 1, yf - 1, zf);
    const n001 = this._gradDot(this._hash(xi, yi, zi + 1), xf, yf, zf - 1);
    const n101 = this._gradDot(this._hash(xi + 1, yi, zi + 1), xf - 1, yf, zf - 1);
    const n011 = this._gradDot(this._hash(xi, yi + 1, zi + 1), xf, yf - 1, zf - 1);
    const n111 = this._gradDot(this._hash(xi + 1, yi + 1, zi + 1), xf - 1, yf - 1, zf - 1);

    const x00 = lerpN(n000, n100, u);
    const x10 = lerpN(n010, n110, u);
    const x01 = lerpN(n001, n101, u);
    const x11 = lerpN(n011, n111, u);
    const y0 = lerpN(x00, x10, v);
    const y1 = lerpN(x01, x11, v);
    return lerpN(y0, y1, w);
  }

  /**
   * Fractal Brownian motion: sum several octaves of noise at increasing
   * frequency and decreasing amplitude. Returns roughly [-1, 1].
   */
  fbm(x, y, z, octaves = 5, lacunarity = 2.0, gain = 0.5) {
    let amp = 0.5;
    let freq = 1.0;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * this.noise(x * freq, y * freq, z * freq);
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return norm > 0 ? sum / norm : 0;
  }

  /**
   * Ridged multifractal noise — produces sharp ridges/mountain features.
   * Returns roughly [0, 1].
   */
  ridged(x, y, z, octaves = 5, lacunarity = 2.0, gain = 0.5) {
    let amp = 0.5;
    let freq = 1.0;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      const n = 1 - Math.abs(this.noise(x * freq, y * freq, z * freq));
      sum += amp * n * n;
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return norm > 0 ? sum / norm : 0;
  }
}

function fade(t) {
  // 6t^5 - 15t^4 + 10t^3 (Perlin's improved fade curve).
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerpN(a, b, t) {
  return a + (b - a) * t;
}
