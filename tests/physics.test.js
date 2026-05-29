import { describe, it, expect } from 'vitest';
import { PhysicsWorld } from '../src/physics/PhysicsWorld.js';
import { Projectile, PROJECTILE_TYPES } from '../src/physics/Projectile.js';

describe('Projectile', () => {
  it('initializes from config with type defaults', () => {
    const p = new Projectile({ type: 'asteroid', position: [2, 0, 0], velocity: [-1, 0, 0] });
    expect(p.type).toBe('asteroid');
    expect(p.mass).toBe(PROJECTILE_TYPES.asteroid.mass);
    expect(p.distanceFromCenter()).toBeCloseTo(2, 6);
    expect(p.speed()).toBeCloseTo(1, 6);
    expect(p.alive).toBe(true);
  });

  it('rockets are self-propelled, asteroids are not', () => {
    const r = new Projectile({ type: 'rocket', position: [2, 0, 0], velocity: [0, 0, 0] });
    const a = new Projectile({ type: 'asteroid', position: [2, 0, 0], velocity: [0, 0, 0] });
    expect(r.selfPropelled).toBe(true);
    expect(a.selfPropelled).toBe(false);
  });
});

describe('PhysicsWorld gravity', () => {
  it('accelerates a stationary body toward the center', () => {
    const world = new PhysicsWorld({ planetRadius: 1, gravityStrength: 1 });
    const p = world.spawn({ type: 'asteroid', position: [3, 0, 0], velocity: [0, 0, 0] });
    world.step(0.1);
    // Velocity should now point toward -X (inward).
    expect(p.velocity.x).toBeLessThan(0);
    expect(Math.abs(p.velocity.y)).toBeLessThan(1e-9);
  });

  it('gravity follows inverse-square (closer = stronger pull)', () => {
    const near = new PhysicsWorld({ gravityStrength: 1 });
    const far = new PhysicsWorld({ gravityStrength: 1 });
    const pn = near.spawn({ type: 'asteroid', position: [1.5, 0, 0], velocity: [0, 0, 0] });
    const pf = far.spawn({ type: 'asteroid', position: [4, 0, 0], velocity: [0, 0, 0] });
    near.step(0.01);
    far.step(0.01);
    expect(Math.abs(pn.velocity.x)).toBeGreaterThan(Math.abs(pf.velocity.x));
  });
});

describe('PhysicsWorld collisions', () => {
  it('registers an impact when a body reaches the surface', () => {
    const world = new PhysicsWorld({ planetRadius: 1, gravityStrength: 2 });
    world.spawn({ type: 'meteor', position: [1.2, 0, 0], velocity: [-3, 0, 0] });
    let impacts = [];
    for (let i = 0; i < 100 && impacts.length === 0; i++) {
      impacts = world.step(0.02);
    }
    expect(impacts.length).toBe(1);
    const hit = impacts[0];
    expect(hit.type).toBe('meteor');
    expect(hit.energy).toBeGreaterThan(0);
    // Impact point lies on the planet surface (radius ~1).
    const r = Math.hypot(hit.point[0], hit.point[1], hit.point[2]);
    expect(r).toBeCloseTo(1, 1);
    // Body is consumed.
    expect(world.count).toBe(0);
  });

  it('culls projectiles that escape beyond maxDistance', () => {
    const world = new PhysicsWorld({ gravityStrength: 0, maxDistance: 5 });
    world.spawn({ type: 'asteroid', position: [4.9, 0, 0], velocity: [10, 0, 0] });
    world.step(0.1);
    expect(world.count).toBe(0);
  });

  it('respects a deformed surface radius via surfaceRadiusFn', () => {
    // A crater (smaller radius) at +X means a body must travel deeper to hit.
    const world = new PhysicsWorld({
      planetRadius: 1,
      gravityStrength: 0,
      surfaceRadiusFn: (x) => (x > 0.9 ? 0.8 : 1.0),
    });
    const p = world.spawn({ type: 'asteroid', position: [0.95, 0, 0], velocity: [0, 0, 0] });
    // At radius 0.95 over a crater of radius 0.8, no impact yet.
    const impacts = world.step(0.001);
    expect(impacts.length).toBe(0);
    expect(p.alive).toBe(true);
  });
});

describe('PhysicsWorld.buildLaunch', () => {
  it('aims velocity from source toward target at the given speed', () => {
    const cfg = PhysicsWorld.buildLaunch('asteroid', [5, 0, 0], [0, 0, 0], 2);
    expect(cfg.velocity[0]).toBeCloseTo(-2, 6); // toward origin
    expect(cfg.velocity[1]).toBeCloseTo(0, 6);
    expect(cfg.type).toBe('asteroid');
  });
});
