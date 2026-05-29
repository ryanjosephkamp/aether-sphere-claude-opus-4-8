/**
 * PlanetConfig — factual planetary data + procedural-generation parameters.
 *
 * Physical data (radius, gravity, rotation period, axial tilt, day length) is
 * transcribed from the public-domain NASA Planetary Fact Sheets and must not be
 * hallucinated (Constitution §1 Factual Integrity; see docs/DATA-SOURCES.md).
 *
 * Sources:
 *   Earth: https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
 *   Mars:  https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html
 *   Moon:  https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
 *
 * The simulation uses a unit planet radius of 1.0 for rendering; the real-world
 * radius below is shown in the info panel for educational/factual context.
 */

export const PLANETS = {
  earth: {
    id: 'earth',
    name: 'Earth',
    seed: 20240115,
    // --- Factual data (NASA Earth Fact Sheet) ---
    facts: {
      meanRadiusKm: 6371,
      surfaceGravity: 9.8, // m/s^2
      siderealRotationHours: 23.9, // sidereal day
      lengthOfDayHours: 24.0,
      axialTiltDeg: 23.4,
      moons: 1,
      source: 'NASA Earth Fact Sheet',
    },
    // --- Visual / procedural parameters ---
    type: 'terran',
    seaLevel: 0.0, // fBm threshold separating ocean and land
    palette: {
      deepOcean: [0.015, 0.05, 0.18],
      shallowOcean: [0.05, 0.25, 0.45],
      beach: [0.76, 0.7, 0.5],
      lowland: [0.13, 0.42, 0.13],
      highland: [0.32, 0.27, 0.16],
      mountain: [0.42, 0.4, 0.38],
      snow: [0.95, 0.96, 0.98],
      ice: [0.85, 0.92, 0.97],
    },
    hasOcean: true,
    hasClouds: true,
    cloudCoverage: 0.45,
    hasNightLights: true,
    atmosphere: {
      color: [0.3, 0.6, 1.0],
      intensity: 1.0,
      power: 3.0,
    },
    rotationSpeed: 0.04, // base radians/sec for auto-rotation (visual default)
    snowLatitude: 0.72, // |latitude| fraction above which snow appears
  },

  mars: {
    id: 'mars',
    name: 'Mars',
    seed: 776655,
    facts: {
      meanRadiusKm: 3390,
      surfaceGravity: 3.7, // m/s^2
      siderealRotationHours: 24.6,
      lengthOfDayHours: 24.7,
      axialTiltDeg: 25.2,
      moons: 2,
      source: 'NASA Mars Fact Sheet',
    },
    type: 'desert',
    seaLevel: -2.0, // no ocean — threshold below all terrain
    palette: {
      deepOcean: [0.2, 0.08, 0.04],
      shallowOcean: [0.3, 0.12, 0.06],
      beach: [0.55, 0.27, 0.14],
      lowland: [0.55, 0.25, 0.13],
      highland: [0.6, 0.3, 0.16],
      mountain: [0.45, 0.22, 0.12],
      snow: [0.86, 0.8, 0.74], // polar CO2/water ice caps
      ice: [0.8, 0.74, 0.68],
    },
    hasOcean: false,
    hasClouds: true,
    cloudCoverage: 0.12, // thin dust/cloud veil
    hasNightLights: false,
    atmosphere: {
      color: [0.9, 0.5, 0.32],
      intensity: 0.55,
      power: 3.2,
    },
    rotationSpeed: 0.039,
    snowLatitude: 0.82,
  },

  moon: {
    id: 'moon',
    name: 'Moon',
    seed: 424242,
    facts: {
      meanRadiusKm: 1737,
      surfaceGravity: 1.6, // m/s^2
      siderealRotationHours: 655.7,
      lengthOfDayHours: 708.7,
      axialTiltDeg: 6.7,
      moons: 0,
      source: 'NASA Moon Fact Sheet',
    },
    type: 'rocky',
    seaLevel: -2.0,
    palette: {
      deepOcean: [0.05, 0.05, 0.06],
      shallowOcean: [0.1, 0.1, 0.11],
      beach: [0.32, 0.32, 0.33],
      lowland: [0.28, 0.28, 0.29],
      highland: [0.5, 0.5, 0.52],
      mountain: [0.62, 0.62, 0.64],
      snow: [0.7, 0.7, 0.72],
      ice: [0.66, 0.66, 0.68],
    },
    hasOcean: false,
    hasClouds: false,
    cloudCoverage: 0.0,
    hasNightLights: false,
    atmosphere: {
      color: [0.5, 0.5, 0.55],
      intensity: 0.08, // essentially airless — faint rim only
      power: 4.0,
    },
    rotationSpeed: 0.02,
    snowLatitude: 0.95,
  },
};

export const DEFAULT_PLANET = 'earth';

/** Ordered list for UI dropdowns. */
export const PLANET_ORDER = ['earth', 'mars', 'moon'];

/** Look up a planet config by id, falling back to the default. */
export function getPlanetConfig(id) {
  return PLANETS[id] || PLANETS[DEFAULT_PLANET];
}
