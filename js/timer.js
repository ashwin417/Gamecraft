/* ============================================================
   timer.js
   Exact 60-second countdown timer with warning thresholds.
   Starts only when explicitly told to (i.e. after Start button).
   ============================================================ */

class GameTimer {
  constructor(durationSeconds, callbacks) {
    this.duration = durationSeconds;
    this.remaining = durationSeconds;
    this.running = false;
    this.ended = false;
    this.onTick = (callbacks && callbacks.onTick) || function () {};
    this.onWarning10 = (callbacks && callbacks.onWarning10) || function () {};
    this.onWarning5 = (callbacks && callbacks.onWarning5) || function () {};
    this.onEnd = (callbacks && callbacks.onEnd) || function () {};
    this._warned10 = false;
    this._warned5 = false;
  }

  reset() {
    this.remaining = this.duration;
    this.running = false;
    this.ended = false;
    this._warned10 = false;
    this._warned5 = false;
  }

  start() {
    this.running = true;
    this.ended = false;
  }

  stop() {
    this.running = false;
  }

  /** Awards a bonus but never allows remaining time to exceed the original duration. */
  addBonus(seconds) {
    if (!this.running || this.ended) return;
    this.remaining = Math.min(this.duration, this.remaining + seconds);
    this.onTick(this.remaining);
  }

  update(dt) {
    if (!this.running || this.ended) return;
    this.remaining -= dt;
    if (this.remaining <= 5 && !this._warned5) {
      this._warned5 = true;
      this.onWarning5();
    } else if (this.remaining <= 10 && !this._warned10) {
      this._warned10 = true;
      this.onWarning10();
    }
    if (this.remaining <= 0) {
      this.remaining = 0;
      this.running = false;
      this.ended = true;
      this.onTick(this.remaining);
      this.onEnd();
      return;
    }
    this.onTick(this.remaining);
  }

  get displaySeconds() {
    return Math.ceil(this.remaining);
  }

  /** 'normal' | 'warning' | 'critical' */
  get state() {
    if (this.remaining <= 5) return "critical";
    if (this.remaining <= 10) return "warning";
    return "normal";
  }
}
