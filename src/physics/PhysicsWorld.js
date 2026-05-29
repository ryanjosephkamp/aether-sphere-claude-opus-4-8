/**
 * PhysicsWorld — Newtonian gravity well + projectile integration + collision
 * detection against the planet surface (IMPLEMENTATION-PLAN.md §2.3).
 *
 * Intentionally a lightweight custom integrator (no heavy external engine) so we
 * keep full control over performance and incur zero dependency cost. Pure of
 * Three.js for unit-testability (see tests/physics.test.js).
 *
 * Units: the planet has a unit base radius (1.0). Gravity is modelled as
 * a = -G / r^2 along the radial direction, with G exposed as a tunable
 * "gravityStrength" (scaled by the per-planet gravity multiplier in the UI).
 */
import { Projectile, PROJECTILE_TYPES } from './Projectile.js';

export class PhysicsWorld {
  constructor(opts = {}) {
    this.gravityStrength = opts.gravityStrength ?? 1.2;
    this.gravityMultiplier = opts.gravityMultiplier ?? 1.0;
    this.planetRadius = opts.planetRadius ?? 1.0;
    this.atmosphereRadius = opts.atmosphereRadius ?? 1.18;
    this.atmosphereDrag = opts.atmosphereDrag ?? 0.25;
    this.maxDistance = opts.maxDistance ?? 12.0; // cull bodies that escape
    this.projectiles = [];
    // Optional callback (dir) => surface radius at that direction, allowing
    // collisions to respect deformation. Defaults to the base radius.
    this.surfaceRadiusFn = opts.surfaceRadiusFn || null;
  }

  /** Add a configured projectile and return it. */
  spawn(config) {
    const p = new Projectile(config);
    this.projectiles.push(p);
    return p;
  }

  /** Remove all active projectiles. */
  clear() {
    this.projectiles.length = 0;
  }

  get count() {
    return this.projectiles.length;
  }

  _surfaceRadius(p) {
    if (!this.surfaceRadiusFn) return this.planetRadius;
    const d = p.distanceFromCenter() || 1;
    return this.surfaceRadiusFn(p.position.x / d, p.position.y / d, p.position.z / d);
  }

  /**
   * Advance the simulation by `dt` seconds (already scaled by sim speed).
   * Uses semi-implicit (symplectic) Euler integration for stability.
   * @returns {Array} impact events: { projectile, point:[x,y,z], speed, energy }
   */
  step(dt) {
    if (dt <= 0) return [];
    const impacts = [];
    const g = this.gravityStrength * this.gravityMultiplier;

    for (const p of this.projectiles) {
      if (!p.alive) continue;
      p.age += dt;

      const pos = p.position;
      const vel = p.velocity;
      const r = Math.max(p.distanceFromCenter(), 1e-4);

      // Gravitational acceleration toward the center: a = -g / r^2 * r_hat.
      const accelMag = g / (r * r);
      const ax = (-pos.x / r) * accelMag;
      const ay = (-pos.y / r) * accelMag;
      const az = (-pos.z / r) * accelMag;

      vel.x += ax * dt;
      vel.y += ay * dt;
      vel.z += az * dt;

      // Atmospheric drag + (for rockets) thrust while within the air shell.
      if (r < this.atmosphereRadius) {
        const depth = (this.atmosphereRadius - r) / (this.atmosphereRadius - this.planetRadius);
        const dragK = this.atmosphereDrag * Math.max(0, depth);
        vel.x -= vel.x * dragK * dt;
        vel.y -= vel.y * dragK * dt;
        vel.z -= vel.z * dragK * dt;
      }
      if (p.selfPropelled && p.age < 2.5) {
        // Rockets accelerate along their current heading for a short burn.
        const sp = p.speed() || 1;
        const thrust = 0.6;
        vel.x += (vel.x / sp) * thrust * dt;
        vel.y += (vel.y / sp) * thrust * dt;
        vel.z += (vel.z / sp) * thrust * dt;
      }

      // Integrate position.
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
      pos.z += vel.z * dt;

      // Collision with the (possibly deformed) surface.
      const newR = p.distanceFromCenter();
      const surface = this._surfaceRadius(p);
      if (newR <= surface + p.radius) {
        const inv = newR > 0 ? 1 / newR : 0;
        const point = [pos.x * inv * surface, pos.y * inv * surface, pos.z * inv * surface];
        const speed = p.speed();
        impacts.push({
          projectile: p,
          point,
          speed,
          energy: 0.5 * p.mass * speed * speed,
          type: p.type,
        });
        p.alive = false;
      } else if (newR > this.maxDistance) {
        // Escaped the play area — cull silently.
        p.alive = false;
      }
    }

    // Compact out dead projectiles.
    if (impacts.length || this.projectiles.some((p) => !p.alive)) {
      this.projectiles = this.projectiles.filter((p) => p.alive);
    }
    return impacts;
  }

  /**
   * Helper to build a launch config aimed at a target point on/near the planet
   * from a given camera/eye position, with a chosen launch speed.
   */
  static buildLaunch(type, from, target, speed) {
    const dir = [target[0] - from[0], target[1] - from[1], target[2] - from[2]];
    const len = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    const velocity = [(dir[0] / len) * speed, (dir[1] / len) * speed, (dir[2] / len) * speed];
    const def = PROJECTILE_TYPES[type] || PROJECTILE_TYPES.asteroid;
    return { type, position: [...from], velocity, mass: def.mass, radius: def.radius };
  }
}
