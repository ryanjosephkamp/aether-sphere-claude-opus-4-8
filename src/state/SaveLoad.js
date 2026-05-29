/**
 * SaveLoad — persistence of custom planetary states (PROJECT-SPEC.md: "Save/load
 * custom planetary states (including any surface damage)").
 *
 * Stores: selected planet, full deformation height-field, and simulation
 * parameters. Backends: localStorage (quick save) + JSON export/import (shareable
 * files — Spec stretch goal). Schema-versioned with graceful fallback (Risk R-9).
 *
 * The localStorage object is injected for testability (defaults to the real
 * window.localStorage in the browser).
 */
export const SAVE_VERSION = 1;
export const STORAGE_KEY = 'aethersphere.save.v1';

export class SaveLoad {
  constructor(storage) {
    // Prefer injected storage; fall back to localStorage when available.
    this.storage =
      storage || (typeof localStorage !== 'undefined' ? localStorage : new MemoryStorage());
  }

  /**
   * Build a serializable state object.
   * @param {object} parts { planetId, heightfield(serialized), sim }
   */
  static buildState({ planetId, heightfield, sim }) {
    return {
      app: 'AetherSphere',
      version: SAVE_VERSION,
      savedAt: new Date().toISOString(),
      planetId,
      heightfield,
      sim,
    };
  }

  /** Validate a parsed state object; returns true if usable. */
  static isValidState(state) {
    return !!(
      state &&
      typeof state === 'object' &&
      state.app === 'AetherSphere' &&
      Number.isFinite(state.version) &&
      typeof state.planetId === 'string'
    );
  }

  /** Persist a state object to storage. Returns true on success. */
  save(state) {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      console.warn('AetherSphere: save failed', err);
      return false;
    }
  }

  /** Load and validate a state object from storage, or null if none/invalid. */
  load() {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const state = JSON.parse(raw);
      return SaveLoad.isValidState(state) ? state : null;
    } catch (err) {
      console.warn('AetherSphere: load failed', err);
      return null;
    }
  }

  /** True if a saved state exists. */
  hasSave() {
    try {
      return this.storage.getItem(STORAGE_KEY) != null;
    } catch {
      return false;
    }
  }

  /** Remove any saved state. */
  clear() {
    try {
      this.storage.removeItem(STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  /** Serialize a state to a pretty JSON string for file export. */
  static toJSON(state) {
    return JSON.stringify(state, null, 2);
  }

  /** Parse + validate a JSON string from an imported file. Throws on invalid. */
  static fromJSON(text) {
    const state = JSON.parse(text);
    if (!SaveLoad.isValidState(state)) {
      throw new Error('Not a valid AetherSphere save file.');
    }
    return state;
  }
}

/** In-memory storage shim for non-browser/test environments. */
export class MemoryStorage {
  constructor() {
    this._map = new Map();
  }
  getItem(k) {
    return this._map.has(k) ? this._map.get(k) : null;
  }
  setItem(k, v) {
    this._map.set(k, String(v));
  }
  removeItem(k) {
    this._map.delete(k);
  }
}
