/**
 * TextureFactory — generates equirectangular planet textures procedurally at
 * runtime (no shipped binary image assets — keeps the repo lightweight,
 * license-clean, and fully self-contained per IMPLEMENTATION-PLAN.md §2.1 and
 * Constitution §2 "Zero External Costs").
 *
 * Produces, from a seeded 3D noise field + the planet's color palette:
 *   - day albedo texture (continents, oceans, snow caps, deserts)
 *   - night-lights emissive texture (city lights on Earth's land)
 *   - specular mask (oceans/ice are shiny, land is matte)
 *   - cloud coverage texture (single channel)
 *
 * The (lon,lat)->direction mapping matches the planet shader's dirToUV so the
 * textures align seamlessly with the geometry.
 */
import * as THREE from 'three';
import { Noise3D } from '../util/noise.js';
import { clamp, smoothstep, makeRng } from '../util/math.js';

const PI = Math.PI;

/** Convert an equirectangular pixel (u,v in [0,1]) to a unit direction. */
function uvToDir(u, v) {
  const angle = (u - 0.5) * 2 * PI; // atan2(z, x)
  const y = Math.sin((0.5 - v) * PI);
  const cosLat = Math.sqrt(Math.max(0, 1 - y * y));
  const x = Math.cos(angle) * cosLat;
  const z = Math.sin(angle) * cosLat;
  return [x, y, z];
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * Sample the surface color + metadata for a direction. Shared by texture
 * generation and (conceptually) terrain elevation so visuals stay consistent.
 */
export function sampleSurface(config, noise, dir) {
  const [x, y, z] = dir;
  const f = 1.8;
  // Continent-scale elevation with ridged mountains layered on top.
  let e = noise.fbm(x * f, y * f, z * f, 6, 2.0, 0.5);
  const ridge = noise.ridged(x * f * 2.2, y * f * 2.2, z * f * 2.2, 5) - 0.5;
  e += ridge * 0.35;

  const lat = Math.abs(y); // 0 at equator, 1 at poles
  const p = config.palette;
  const sea = config.seaLevel;

  let color;
  let spec = 0;
  if (config.hasOcean && e < sea) {
    // Ocean: depth-graded blue.
    const depth = clamp((sea - e) / 0.6, 0, 1);
    color = mix(p.shallowOcean, p.deepOcean, depth);
    spec = 0.9;
  } else {
    // Land elevation normalized above the planet's base level. Ocean worlds
    // measure land from sea level; airless/desert worlds (sea far below all
    // terrain) measure from a fixed base so elevation tones don't saturate.
    const landBase = config.hasOcean ? sea : -0.55;
    const land = clamp((e - landBase) / 0.85, 0, 1);
    if (land < 0.04 && config.hasOcean) {
      color = p.beach;
    } else if (land < 0.45) {
      color = mix(p.lowland, p.highland, land / 0.45);
    } else {
      color = mix(p.highland, p.mountain, (land - 0.45) / 0.55);
    }
    // Snow only accumulates on the high peaks of worlds with a hydrosphere.
    if (config.hasOcean && land > 0.7) {
      color = mix(color, p.snow, smoothstep(0.7, 0.95, land));
    }
    spec = 0.04;
  }

  // Polar ice/snow caps by latitude (+ a little noise on the boundary).
  const capNoise = noise.noise(x * 4, y * 4, z * 4) * 0.06;
  if (lat + capNoise > config.snowLatitude) {
    const t = smoothstep(config.snowLatitude, config.snowLatitude + 0.12, lat + capNoise);
    const capColor = config.hasOcean && e < sea ? p.ice : p.snow;
    color = mix(color, capColor, t);
    spec = Math.max(spec, t * 0.7);
  }

  return { color, elevation: e, spec, isLand: e >= sea };
}

export class TextureFactory {
  constructor(config, width = 1024) {
    this.config = config;
    this.width = width;
    this.height = width / 2;
    this.noise = new Noise3D(config.seed);
  }

  _canvas() {
    const c = document.createElement('canvas');
    c.width = this.width;
    c.height = this.height;
    return c;
  }

  /** Generate day albedo + specular + (optional) night lights together. */
  generateSurface() {
    const { width: W, height: H, config, noise } = this;
    const day = this._canvas();
    const spec = this._canvas();
    const night = this._canvas();
    const dctx = day.getContext('2d');
    const sctx = spec.getContext('2d');
    const nctx = night.getContext('2d');
    const dImg = dctx.createImageData(W, H);
    const sImg = sctx.createImageData(W, H);
    const nImg = nctx.createImageData(W, H);
    const rng = makeRng(config.seed ^ 0x9e3779b9);

    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const idx = (py * W + px) * 4;
        const u = (px + 0.5) / W;
        const v = (py + 0.5) / H;
        const dir = uvToDir(u, v);
        const s = sampleSurface(config, noise, dir);

        dImg.data[idx] = clamp(s.color[0], 0, 1) * 255;
        dImg.data[idx + 1] = clamp(s.color[1], 0, 1) * 255;
        dImg.data[idx + 2] = clamp(s.color[2], 0, 1) * 255;
        dImg.data[idx + 3] = 255;

        const sv = clamp(s.spec, 0, 1) * 255;
        sImg.data[idx] = sv;
        sImg.data[idx + 1] = sv;
        sImg.data[idx + 2] = sv;
        sImg.data[idx + 3] = 255;

        // City lights: scattered on habitable land (not high mountains/poles).
        let nr = 0;
        let ng = 0;
        let nb = 0;
        if (config.hasNightLights && s.isLand) {
          const lat = Math.abs(dir[1]);
          const habit = s.elevation > config.seaLevel && s.elevation < 0.4 && lat < 0.72;
          if (habit) {
            const density = noise.fbm(dir[0] * 22, dir[1] * 22, dir[2] * 22, 3);
            if (density > 0.18 && rng() < 0.10 + density * 0.25) {
              const b = 120 + rng() * 135;
              nr = b;
              ng = b * 0.85;
              nb = b * 0.55;
            }
          }
        }
        nImg.data[idx] = nr;
        nImg.data[idx + 1] = ng;
        nImg.data[idx + 2] = nb;
        nImg.data[idx + 3] = 255;
      }
    }

    dctx.putImageData(dImg, 0, 0);
    sctx.putImageData(sImg, 0, 0);
    nctx.putImageData(nImg, 0, 0);

    return {
      day: this._toTexture(day),
      spec: this._toTexture(spec),
      night: this._toTexture(night),
    };
  }

  /** Generate a single-channel cloud coverage texture. */
  generateClouds() {
    if (!this.config.hasClouds) return null;
    const { width: W, height: H, config } = this;
    // Independent noise seed so clouds don't mirror the continents.
    const cloudNoise = new Noise3D(config.seed ^ 0x5bd1e995);
    const canvas = this._canvas();
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(W, H);
    const coverage = config.cloudCoverage;

    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const idx = (py * W + px) * 4;
        const dir = uvToDir((px + 0.5) / W, (py + 0.5) / H);
        let c = cloudNoise.fbm(dir[0] * 2.5, dir[1] * 2.5, dir[2] * 2.5, 6);
        c = smoothstep(0.5 - coverage, 0.75, c * 0.5 + 0.5);
        const val = clamp(c, 0, 1) * 255;
        img.data[idx] = val;
        img.data[idx + 1] = val;
        img.data[idx + 2] = val;
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._toTexture(canvas);
  }

  _toTexture(canvas) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }
}
