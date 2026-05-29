/**
 * ParticleSystem — a single pooled THREE.Points buffer for debris sparks, dust,
 * and atmospheric-entry trails. One draw call for thousands of particles to keep
 * the frame rate high during heavy impact sequences (Risk R-2, Phase E5/E6).
 *
 * Uses additive blending and fades particle color toward black at end-of-life,
 * which reads as a clean fade-out without needing per-vertex alpha.
 */
import * as THREE from 'three';

export class ParticleSystem {
  constructor(maxParticles = 4000) {
    this.max = maxParticles;
    this.positions = new Float32Array(this.max * 3);
    this.colors = new Float32Array(this.max * 3);
    this.baseColors = new Float32Array(this.max * 3);
    this.velocities = new Float32Array(this.max * 3);
    this.life = new Float32Array(this.max);
    this.maxLife = new Float32Array(this.max);
    this.gravity = new Float32Array(this.max); // per-particle pull toward center
    this._cursor = 0;
    this._activeCount = 0;

    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('color', this.colAttr);
    geo.setDrawRange(0, this.max);
    const mat = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    // Move all particles off-screen initially.
    for (let i = 0; i < this.max; i++) this.positions[i * 3 + 1] = 99999;
  }

  get object3d() {
    return this.points;
  }

  get activeCount() {
    return this._activeCount;
  }

  /**
   * Emit a burst of particles.
   * @param {number[]} origin [x,y,z]
   * @param {object} opts { count, speed, spread(dir as [x,y,z]), color:[r,g,b],
   *                        life, gravity, size }
   */
  emitBurst(origin, opts = {}) {
    const count = Math.min(opts.count ?? 40, this.max);
    const speed = opts.speed ?? 1.0;
    const life = opts.life ?? 1.2;
    const grav = opts.gravity ?? 0.8;
    const col = opts.color ?? [1, 0.8, 0.4];
    const dir = opts.dir; // optional bias direction
    for (let k = 0; k < count; k++) {
      const i = this._cursor;
      this._cursor = (this._cursor + 1) % this.max;
      const i3 = i * 3;
      this.positions[i3] = origin[0];
      this.positions[i3 + 1] = origin[1];
      this.positions[i3 + 2] = origin[2];
      // Random direction on a sphere, optionally biased outward.
      let vx = Math.random() * 2 - 1;
      let vy = Math.random() * 2 - 1;
      let vz = Math.random() * 2 - 1;
      const len = Math.hypot(vx, vy, vz) || 1;
      vx /= len;
      vy /= len;
      vz /= len;
      if (dir) {
        vx = vx * 0.5 + dir[0];
        vy = vy * 0.5 + dir[1];
        vz = vz * 0.5 + dir[2];
        const l2 = Math.hypot(vx, vy, vz) || 1;
        vx /= l2;
        vy /= l2;
        vz /= l2;
      }
      const s = speed * (0.4 + Math.random() * 0.8);
      this.velocities[i3] = vx * s;
      this.velocities[i3 + 1] = vy * s;
      this.velocities[i3 + 2] = vz * s;
      const variance = 0.7 + Math.random() * 0.3;
      this.baseColors[i3] = col[0] * variance;
      this.baseColors[i3 + 1] = col[1] * variance;
      this.baseColors[i3 + 2] = col[2] * variance;
      this.colors[i3] = this.baseColors[i3];
      this.colors[i3 + 1] = this.baseColors[i3 + 1];
      this.colors[i3 + 2] = this.baseColors[i3 + 2];
      const ml = life * (0.6 + Math.random() * 0.6);
      this.life[i] = ml;
      this.maxLife[i] = ml;
      this.gravity[i] = grav;
    }
  }

  update(dt) {
    if (dt <= 0) return;
    let active = 0;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      const i3 = i * 3;
      // Gravity toward the planet center.
      const px = this.positions[i3];
      const py = this.positions[i3 + 1];
      const pz = this.positions[i3 + 2];
      const r = Math.hypot(px, py, pz) || 1;
      const g = this.gravity[i] / (r * r);
      this.velocities[i3] -= (px / r) * g * dt;
      this.velocities[i3 + 1] -= (py / r) * g * dt;
      this.velocities[i3 + 2] -= (pz / r) * g * dt;
      // Drag.
      const drag = 1 - Math.min(0.9, 0.8 * dt);
      this.velocities[i3] *= drag;
      this.velocities[i3 + 1] *= drag;
      this.velocities[i3 + 2] *= drag;
      // Integrate.
      this.positions[i3] += this.velocities[i3] * dt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;
      // Life + fade (toward black under additive blending).
      this.life[i] -= dt;
      const t = Math.max(0, this.life[i] / this.maxLife[i]);
      this.colors[i3] = this.baseColors[i3] * t;
      this.colors[i3 + 1] = this.baseColors[i3 + 1] * t;
      this.colors[i3 + 2] = this.baseColors[i3 + 2] * t;
      if (this.life[i] <= 0) {
        this.positions[i3 + 1] = 99999; // park off-screen
      } else {
        active++;
      }
    }
    this._activeCount = active;
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
