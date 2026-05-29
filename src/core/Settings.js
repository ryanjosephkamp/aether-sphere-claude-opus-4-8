/**
 * Settings — quality presets and persisted user preferences.
 * Quality presets protect the frame-rate budget (≥50 FPS) on weaker devices
 * by scaling mesh subdivision and particle budgets (Risk R-1/R-5).
 */
const PREFS_KEY = 'aethersphere.prefs.v1';

export const QUALITY_PRESETS = {
  low: {
    label: 'Low',
    sphereDetail: 5, // icosphere subdivision level
    maxParticles: 1500,
    maxFragments: 60,
    bloom: false,
    pixelRatioCap: 1,
  },
  medium: {
    label: 'Medium',
    sphereDetail: 6,
    maxParticles: 4000,
    maxFragments: 140,
    bloom: true,
    pixelRatioCap: 1.5,
  },
  high: {
    label: 'High',
    sphereDetail: 7,
    maxParticles: 9000,
    maxFragments: 260,
    bloom: true,
    pixelRatioCap: 2,
  },
};

export const DEFAULT_QUALITY = 'medium';

/** Pick a sensible default quality from device hints. */
export function detectQuality() {
  if (typeof navigator === 'undefined') return DEFAULT_QUALITY;
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const mobile = /Mobi|Android/i.test(navigator.userAgent || '');
  if (mobile || mem <= 2 || cores <= 2) return 'low';
  if (mem >= 8 && cores >= 8) return 'high';
  return 'medium';
}

export class Settings {
  constructor(storage) {
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.prefs = {
      quality: detectQuality(),
      autoRotate: true,
      rotationSpeed: 1.0,
      ...this._read(),
    };
  }

  _read() {
    if (!this.storage) return {};
    try {
      const raw = this.storage.getItem(PREFS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  save() {
    if (!this.storage) return;
    try {
      this.storage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }

  get(key) {
    return this.prefs[key];
  }

  set(key, value) {
    this.prefs[key] = value;
    this.save();
  }

  get preset() {
    return QUALITY_PRESETS[this.prefs.quality] || QUALITY_PRESETS[DEFAULT_QUALITY];
  }
}
