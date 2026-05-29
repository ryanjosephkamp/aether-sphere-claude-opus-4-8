import { describe, it, expect, beforeEach } from 'vitest';
import { SaveLoad, MemoryStorage, SAVE_VERSION } from '../src/state/SaveLoad.js';

describe('SaveLoad', () => {
  let storage;
  let sl;

  beforeEach(() => {
    storage = new MemoryStorage();
    sl = new SaveLoad(storage);
  });

  it('builds a valid state object', () => {
    const state = SaveLoad.buildState({
      planetId: 'earth',
      heightfield: { version: 1, count: 6, indices: [0], values: [-0.1] },
      sim: { timeScale: 1, gravityMultiplier: 1 },
    });
    expect(state.app).toBe('AetherSphere');
    expect(state.version).toBe(SAVE_VERSION);
    expect(SaveLoad.isValidState(state)).toBe(true);
  });

  it('rejects invalid states', () => {
    expect(SaveLoad.isValidState(null)).toBe(false);
    expect(SaveLoad.isValidState({})).toBe(false);
    expect(SaveLoad.isValidState({ app: 'Other', version: 1, planetId: 'x' })).toBe(false);
  });

  it('save then load round-trips', () => {
    const state = SaveLoad.buildState({ planetId: 'mars', heightfield: {}, sim: {} });
    expect(sl.hasSave()).toBe(false);
    expect(sl.save(state)).toBe(true);
    expect(sl.hasSave()).toBe(true);
    const loaded = sl.load();
    expect(loaded.planetId).toBe('mars');
  });

  it('load returns null when nothing saved', () => {
    expect(sl.load()).toBeNull();
  });

  it('clear removes the saved state', () => {
    sl.save(SaveLoad.buildState({ planetId: 'earth', heightfield: {}, sim: {} }));
    sl.clear();
    expect(sl.hasSave()).toBe(false);
  });

  it('toJSON / fromJSON round-trip for file export-import', () => {
    const state = SaveLoad.buildState({ planetId: 'moon', heightfield: {}, sim: {} });
    const text = SaveLoad.toJSON(state);
    const parsed = SaveLoad.fromJSON(text);
    expect(parsed.planetId).toBe('moon');
  });

  it('fromJSON throws on invalid file content', () => {
    expect(() => SaveLoad.fromJSON('{"foo":1}')).toThrow();
    expect(() => SaveLoad.fromJSON('not json')).toThrow();
  });

  it('load tolerates corrupt storage content', () => {
    storage.setItem('aethersphere.save.v1', '{ broken json');
    expect(sl.load()).toBeNull();
  });
});
