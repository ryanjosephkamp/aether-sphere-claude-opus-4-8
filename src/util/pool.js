/**
 * Lightweight object pool to avoid garbage-collection stalls during heavy
 * impact sequences (Risk R-2 in IMPLEMENTATION-PLAN.md). Reuses instances
 * instead of allocating/freeing them every frame.
 */
export class Pool {
  /**
   * @param {() => T} factory   Creates a fresh object when the pool is empty.
   * @param {(obj: T) => void} [reset]  Optional reset hook called on acquire.
   * @template T
   */
  constructor(factory, reset) {
    this._factory = factory;
    this._reset = reset;
    this._free = [];
    this._activeCount = 0;
  }

  /** Acquire an object from the pool (reused or freshly created). */
  acquire() {
    const obj = this._free.length > 0 ? this._free.pop() : this._factory();
    if (this._reset) this._reset(obj);
    this._activeCount++;
    return obj;
  }

  /** Return an object to the pool for later reuse. */
  release(obj) {
    this._free.push(obj);
    if (this._activeCount > 0) this._activeCount--;
  }

  /** Number of objects currently checked out. */
  get activeCount() {
    return this._activeCount;
  }

  /** Number of objects available for reuse. */
  get freeCount() {
    return this._free.length;
  }
}
