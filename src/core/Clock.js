/**
 * Clock — simulation time control: pause/play and speed scaling (PROJECT-SPEC:
 * "Pause/play simulation", "adjusting simulation parameters (speed ...)").
 * Separates wall-clock delta from simulation delta so visuals stay smooth while
 * physics can be paused or time-scaled.
 */
export class Clock {
  constructor() {
    this.paused = false;
    this.timeScale = 1.0;
    this.elapsed = 0; // accumulated simulation seconds
    this._last = this._now();
  }

  _now() {
    return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  }

  /**
   * Advance the clock. Returns both the raw wall delta (for camera/UI easing)
   * and the simulation delta (zero while paused, scaled by timeScale).
   */
  tick() {
    const now = this._now();
    let wall = now - this._last;
    this._last = now;
    // Guard against huge deltas after tab is backgrounded.
    if (wall > 0.1) wall = 0.1;
    const sim = this.paused ? 0 : wall * this.timeScale;
    this.elapsed += sim;
    return { wall, sim };
  }

  togglePause() {
    this.paused = !this.paused;
    return this.paused;
  }
}
