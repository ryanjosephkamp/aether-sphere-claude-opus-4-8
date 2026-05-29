/**
 * Projectile — a body that can be launched at the planet (asteroid, meteor,
 * or rocket). Plain data + minimal helpers, free of Three.js so the physics is
 * unit-testable (see tests/physics.test.js). The renderer mirrors these values
 * onto meshes each frame.
 */

let _nextId = 1;

export const PROJECTILE_TYPES = {
  asteroid: {
    label: 'Asteroid',
    mass: 8,
    radius: 0.05,
    color: 0x8a7f72,
    craterScale: 1.0,
    selfPropelled: false,
    fragments: 9,
  },
  meteor: {
    label: 'Meteor',
    mass: 3,
    radius: 0.03,
    color: 0xffa257,
    craterScale: 0.65,
    selfPropelled: false,
    fragments: 6,
  },
  rocket: {
    label: 'Rocket',
    mass: 5,
    radius: 0.035,
    color: 0xe8eef5,
    craterScale: 0.85,
    selfPropelled: true, // applies thrust along velocity while in flight
    fragments: 7,
  },
};

export class Projectile {
  /**
   * @param {object} opts
   * @param {string} opts.type            One of PROJECTILE_TYPES keys.
   * @param {number[]} opts.position      [x, y, z] start position.
   * @param {number[]} opts.velocity      [x, y, z] start velocity.
   * @param {number} [opts.mass]
   * @param {number} [opts.radius]
   */
  constructor({ type = 'asteroid', position, velocity, mass, radius }) {
    const def = PROJECTILE_TYPES[type] || PROJECTILE_TYPES.asteroid;
    this.id = _nextId++;
    this.type = type;
    this.position = { x: position[0], y: position[1], z: position[2] };
    this.velocity = { x: velocity[0], y: velocity[1], z: velocity[2] };
    this.mass = mass ?? def.mass;
    this.radius = radius ?? def.radius;
    this.selfPropelled = def.selfPropelled;
    this.alive = true;
    this.age = 0;
  }

  /** Current distance from the planet center (origin). */
  distanceFromCenter() {
    const p = this.position;
    return Math.hypot(p.x, p.y, p.z);
  }

  /** Current speed magnitude. */
  speed() {
    const v = this.velocity;
    return Math.hypot(v.x, v.y, v.z);
  }
}
