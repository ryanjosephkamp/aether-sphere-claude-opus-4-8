/**
 * Planet — assembles the deformable surface mesh, procedural textures, clouds,
 * and atmosphere into a single rotating group. Owns the Heightfield and applies
 * impact craters to the geometry in real time via a per-vertex elevation
 * attribute (IMPLEMENTATION-PLAN.md §2.2, Phase B/C/E).
 */
import * as THREE from 'three';
import { Heightfield } from './Heightfield.js';
import { TextureFactory, sampleSurface } from './TextureFactory.js';
import { Noise3D } from '../util/noise.js';
import { planetVertexShader, planetFragmentShader } from './shaders/planetShader.js';
import { createAtmosphere } from '../effects/Atmosphere.js';
import { createClouds } from '../effects/Clouds.js';

const BASE_ELEVATION_AMPLITUDE = 0.035;

export class Planet {
  /**
   * @param {object} config   A PlanetConfig entry.
   * @param {object} preset    Quality preset (sphereDetail, textureSize, ...).
   */
  constructor(config, preset) {
    this.config = config;
    this.group = new THREE.Group();
    this.elapsed = 0;
    this._build(config, preset);
  }

  _build(config, preset) {
    const detail = preset.sphereDetail ?? 6;
    const textureSize = preset.sphereDetail >= 7 ? 1024 : preset.sphereDetail <= 5 ? 512 : 1024;

    // High-resolution icosphere: uniform vertex distribution, no pole pinch.
    const geometry = new THREE.IcosahedronGeometry(1, detail);
    const posAttr = geometry.getAttribute('position');
    const vertexCount = posAttr.count;

    // Normalized vertex directions feed both the Heightfield and base terrain.
    const directions = new Float32Array(vertexCount * 3);
    for (let i = 0; i < vertexCount; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      const len = Math.hypot(x, y, z) || 1;
      directions[i * 3] = x / len;
      directions[i * 3 + 1] = y / len;
      directions[i * 3 + 2] = z / len;
    }

    this.heightfield = new Heightfield(directions, { maxDepth: 0.18, maxRim: 0.05 });

    // Base terrain elevation from the same noise field used for the textures,
    // so visible continents/mountains line up with the geometry relief.
    const noise = new Noise3D(config.seed);
    this.baseElevation = new Float32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
      const dir = [directions[i * 3], directions[i * 3 + 1], directions[i * 3 + 2]];
      const s = sampleSurface(config, noise, dir);
      // Only land rises; oceans stay near the base sphere for a flat sea.
      const e = config.hasOcean && s.elevation < config.seaLevel ? 0 : Math.max(0, s.elevation);
      this.baseElevation[i] = e * BASE_ELEVATION_AMPLITUDE;
    }

    // Combined elevation attribute = base terrain + crater displacement.
    this.elevationArray = new Float32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) this.elevationArray[i] = this.baseElevation[i];
    this.elevationAttr = new THREE.BufferAttribute(this.elevationArray, 1);
    this.elevationAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aElevation', this.elevationAttr);
    geometry.computeBoundingSphere();
    this.geometry = geometry;

    // Procedural textures.
    const factory = new TextureFactory(config, textureSize);
    const surface = factory.generateSurface();
    this.textures = surface;
    const cloudTex = factory.generateClouds();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uDayTex: { value: surface.day },
        uNightTex: { value: surface.night },
        uSpecTex: { value: surface.spec },
        uSunDir: { value: new THREE.Vector3(1, 0, 0) },
        uHasNight: { value: config.hasNightLights ? 1.0 : 0.0 },
        uAtmoColor: { value: new THREE.Color(...config.atmosphere.color) },
        uTime: { value: 0 },
      },
      vertexShader: planetVertexShader,
      fragmentShader: planetFragmentShader,
    });

    this.surfaceMesh = new THREE.Mesh(geometry, this.material);
    this.surfaceMesh.name = 'planet-surface';
    this.group.add(this.surfaceMesh);

    // Clouds + atmosphere children.
    this.clouds = createClouds(config, cloudTex, 1.0);
    if (this.clouds) this.group.add(this.clouds.mesh);
    this.atmosphere = createAtmosphere(config, 1.0);
    this.group.add(this.atmosphere.mesh);

    // Axial tilt for realistic day/night across the terminator.
    this.group.rotation.z = (config.facts.axialTiltDeg * Math.PI) / 180;
  }

  /** Apply an impact crater at a world-space point on the planet surface. */
  applyImpact(localDir, angularRadius, depth, rimHeight) {
    const { min, max, touched } = this.heightfield.applyImpact(
      localDir[0],
      localDir[1],
      localDir[2],
      angularRadius,
      depth,
      rimHeight
    );
    if (touched === 0) return;
    const disp = this.heightfield.displacement;
    for (let i = min; i <= max; i++) {
      this.elevationArray[i] = this.baseElevation[i] + disp[i];
    }
    this.elevationAttr.addUpdateRange(min, max - min + 1);
    this.elevationAttr.needsUpdate = true;
  }

  /** Rebuild the entire elevation attribute (after load/reset). */
  refreshElevation() {
    const disp = this.heightfield.displacement;
    for (let i = 0; i < this.elevationArray.length; i++) {
      this.elevationArray[i] = this.baseElevation[i] + disp[i];
    }
    this.elevationAttr.needsUpdate = true;
  }

  resetSurface() {
    this.heightfield.reset();
    this.refreshElevation();
  }

  get impactCount() {
    return this.heightfield.impactCount;
  }

  setSunDirection(v) {
    this.material.uniforms.uSunDir.value.copy(v);
    if (this.clouds) this.clouds.setSunDirection(v);
    this.atmosphere.setSunDirection(v);
  }

  /** Advance time-based animation (clouds drift); rotation handled externally. */
  update(elapsed) {
    this.elapsed = elapsed;
    this.material.uniforms.uTime.value = elapsed;
    if (this.clouds) this.clouds.update(elapsed);
  }

  serialize() {
    return this.heightfield.serialize();
  }

  loadDeformation(data) {
    if (this.heightfield.deserialize(data)) this.refreshElevation();
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.textures.day.dispose();
    this.textures.night.dispose();
    this.textures.spec.dispose();
    if (this.clouds) this.clouds.dispose();
    this.atmosphere.dispose();
  }
}
