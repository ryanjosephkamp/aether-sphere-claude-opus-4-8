/**
 * ImpactSystem — turns a physics impact event into the full destruction effect
 * (PROJECT-SPEC "Physics & Destruction System"): permanent crater on the planet,
 * flying fragment chunks with momentum/spin, scattered debris particles, an
 * explosion flash, and an expanding shockwave ring (Phase E4/E5).
 *
 * Fragments and shockwaves are pooled (Risk R-2) and capped by the active
 * quality preset (Risk R-1/R-5) to protect the frame-rate budget.
 */
import * as THREE from 'three';
import { Pool } from '../util/pool.js';
import { PROJECTILE_TYPES } from '../physics/Projectile.js';
import { clamp } from '../util/math.js';

const _v = new THREE.Vector3();

export class ImpactSystem {
  constructor(scene, planet, particles, preset) {
    this.scene = scene;
    this.planet = planet;
    this.particles = particles;
    this.maxFragments = preset.maxFragments ?? 140;

    this.activeFragments = [];
    this.activeWaves = [];

    // Shared geometry/material for fragments (chunky low-poly debris).
    this._fragGeo = new THREE.IcosahedronGeometry(0.02, 0);
    this._fragPool = new Pool(() => {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x8a7f72,
        roughness: 0.9,
        metalness: 0.05,
        flatShading: true,
      });
      const mesh = new THREE.Mesh(this._fragGeo, mat);
      mesh.castShadow = false;
      return mesh;
    });

    // Shockwave ring + flash pools.
    this._ringGeo = new THREE.RingGeometry(0.6, 1.0, 48);
    this._wavePool = new Pool(() => {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd9a0,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      return new THREE.Mesh(this._ringGeo, mat);
    });
    this._flashGeo = new THREE.SphereGeometry(0.05, 16, 12);
  }

  /**
   * @param {object} event  Physics impact event { point:[x,y,z], speed, energy, type, projectile }
   */
  handleImpact(event) {
    const def = PROJECTILE_TYPES[event.type] || PROJECTILE_TYPES.asteroid;
    const worldPoint = new THREE.Vector3(event.point[0], event.point[1], event.point[2]);

    // Convert the world impact point into the planet's local frame so the
    // crater rotates with the planet.
    const localPoint = this.planet.group.worldToLocal(worldPoint.clone());
    const localDir = localPoint.clone().normalize();

    // Crater scale grows with kinetic energy, clamped for stability.
    const e = clamp(event.energy, 0, 200);
    const angularRadius = (0.05 + Math.min(0.16, e * 0.0016)) * def.craterScale;
    const depth = (0.03 + Math.min(0.1, e * 0.001)) * def.craterScale;
    const rim = depth * 0.35;
    this.planet.applyImpact([localDir.x, localDir.y, localDir.z], angularRadius, depth, rim);

    // World-space surface normal (outward) for ejecta direction.
    const worldNormal = worldPoint.clone().normalize();
    const nArr = [worldNormal.x, worldNormal.y, worldNormal.z];
    const originArr = [worldPoint.x, worldPoint.y, worldPoint.z];

    // Debris particles: dust + hot sparks biased outward along the normal.
    const intensity = clamp(0.5 + e * 0.02, 0.6, 3.0);
    this.particles.emitBurst(originArr, {
      count: Math.floor(50 * intensity),
      speed: 0.9 * intensity,
      life: 1.4,
      gravity: 0.9,
      dir: nArr,
      color: [1.0, 0.55, 0.2],
    });
    this.particles.emitBurst(originArr, {
      count: Math.floor(30 * intensity),
      speed: 0.4 * intensity,
      life: 2.2,
      gravity: 0.6,
      dir: nArr,
      color: [0.5, 0.45, 0.4],
    });

    // Fragment chunks thrown outward with spin.
    const fragCount = Math.min(def.fragments, this.maxFragments - this.activeFragments.length);
    for (let i = 0; i < fragCount; i++) {
      this._spawnFragment(worldPoint, worldNormal, def.color, intensity);
    }

    this._spawnFlash(worldPoint, intensity);
    this._spawnShockwave(worldPoint, worldNormal, intensity);
  }

  _spawnFragment(origin, normal, color, intensity) {
    const mesh = this._fragPool.acquire();
    mesh.material.color.setHex(color);
    mesh.position.copy(origin);
    const scale = 0.5 + Math.random() * 1.2;
    mesh.scale.setScalar(scale);
    mesh.visible = true;
    this.scene.add(mesh);

    // Velocity: outward along normal + random spread.
    const spread = 0.7;
    const vx = normal.x + (Math.random() * 2 - 1) * spread;
    const vy = normal.y + (Math.random() * 2 - 1) * spread;
    const vz = normal.z + (Math.random() * 2 - 1) * spread;
    const len = Math.hypot(vx, vy, vz) || 1;
    const sp = (0.6 + Math.random() * 1.2) * intensity;
    this.activeFragments.push({
      mesh,
      vel: new THREE.Vector3((vx / len) * sp, (vy / len) * sp, (vz / len) * sp),
      spin: new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6
      ),
      life: 2.5 + Math.random() * 1.5,
      maxLife: 4,
      baseScale: scale,
    });
  }

  _spawnFlash(origin, intensity) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffe6b0,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this._flashGeo, mat);
    mesh.position.copy(origin);
    mesh.scale.setScalar(0.5 * intensity);
    this.scene.add(mesh);
    this.activeWaves.push({ mesh, life: 0.35, maxLife: 0.35, grow: 4 * intensity, isFlash: true });
  }

  _spawnShockwave(origin, normal, intensity) {
    const mesh = this._wavePool.acquire();
    mesh.material.opacity = 0.8;
    mesh.position.copy(origin);
    // Orient the ring tangent to the surface: rotate its +Z axis to the normal.
    const zToNormal = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    mesh.quaternion.copy(zToNormal);
    mesh.scale.setScalar(0.05);
    mesh.visible = true;
    this.scene.add(mesh);
    this.activeWaves.push({
      mesh,
      life: 0.7,
      maxLife: 0.7,
      grow: 0.9 * intensity,
      pooled: true,
    });
  }

  update(dt) {
    if (dt <= 0) return;
    // Fragments: gravity + spin + lifetime, with simple surface bounce.
    for (let i = this.activeFragments.length - 1; i >= 0; i--) {
      const f = this.activeFragments[i];
      const p = f.mesh.position;
      const r = p.length() || 1;
      const g = 1.2 / (r * r);
      f.vel.addScaledVector(_v.copy(p).multiplyScalar(-1 / r), g * dt);
      p.addScaledVector(f.vel, dt);
      // Bounce off the planet surface once.
      if (p.length() < 1.0) {
        p.setLength(1.0);
        const n = _v.copy(p).normalize();
        const dot = f.vel.dot(n);
        f.vel.addScaledVector(n, -1.6 * dot); // reflect + damp
        f.vel.multiplyScalar(0.5);
      }
      f.mesh.rotation.x += f.spin.x * dt;
      f.mesh.rotation.y += f.spin.y * dt;
      f.life -= dt;
      const t = clamp(f.life / f.maxLife, 0, 1);
      f.mesh.scale.setScalar(f.baseScale * (0.3 + 0.7 * t));
      if (f.life <= 0) {
        f.mesh.visible = false;
        this.scene.remove(f.mesh);
        this._fragPool.release(f.mesh);
        this.activeFragments.splice(i, 1);
      }
    }

    // Flashes + shockwaves.
    for (let i = this.activeWaves.length - 1; i >= 0; i--) {
      const w = this.activeWaves[i];
      w.life -= dt;
      const t = clamp(w.life / w.maxLife, 0, 1);
      const s = w.mesh.scale.x + w.grow * dt;
      w.mesh.scale.setScalar(s);
      w.mesh.material.opacity = w.isFlash ? t : t * 0.8;
      if (w.life <= 0) {
        w.mesh.visible = false;
        this.scene.remove(w.mesh);
        if (w.pooled) {
          this._wavePool.release(w.mesh);
        } else {
          w.mesh.material.dispose();
        }
        this.activeWaves.splice(i, 1);
      }
    }
  }

  clear() {
    for (const f of this.activeFragments) {
      this.scene.remove(f.mesh);
      this._fragPool.release(f.mesh);
    }
    this.activeFragments.length = 0;
    for (const w of this.activeWaves) {
      this.scene.remove(w.mesh);
      if (w.pooled) this._wavePool.release(w.mesh);
    }
    this.activeWaves.length = 0;
  }

  dispose() {
    this.clear();
    this._fragGeo.dispose();
    this._ringGeo.dispose();
    this._flashGeo.dispose();
  }
}
