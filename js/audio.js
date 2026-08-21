/* ============================================================
   audio.js
   All sound is generated procedurally with the Web Audio API,
   so the game ships with zero external audio assets and never
   requires network access to play. Fully mutable / volume
   controllable, and the game remains 100% playable muted.
   ============================================================ */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.volume = 0.6;
    this.musicNodes = [];
    this.musicTimer = null;
    this.unlocked = false;
  }

  /** Must be called from a user gesture (e.g. clicking "Start") to satisfy autoplay policies. */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return; // Web Audio unsupported — game still fully playable without sound.
    this.ctx = new AC();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : this.volume;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.18;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.masterGain);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  _tone(freq, duration, type, gainNode, startOffset, peak) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    const t0 = this.ctx.currentTime + (startOffset || 0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak || 0.5, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(gainNode || this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  playCollect() {
    if (!this.ctx) return;
    this._tone(660, 0.12, "square", this.sfxGain, 0, 0.35);
    this._tone(990, 0.14, "square", this.sfxGain, 0.05, 0.25);
  }

  playPatch() {
    if (!this.ctx) return;
    this._tone(520, 0.1, "triangle", this.sfxGain, 0, 0.35);
    this._tone(780, 0.16, "triangle", this.sfxGain, 0.06, 0.3);
  }

  playCheckpoint() {
    if (!this.ctx) return;
    [440, 554, 659, 880].forEach((f, i) => this._tone(f, 0.18, "sine", this.sfxGain, i * 0.06, 0.3));
  }

  playServerSecured() {
    if (!this.ctx) return;
    [523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.25, "sine", this.sfxGain, i * 0.08, 0.35));
  }

  playHit() {
    if (!this.ctx) return;
    this._tone(160, 0.25, "sawtooth", this.sfxGain, 0, 0.4);
  }

  playPowerup() {
    if (!this.ctx) return;
    [392, 523, 659, 784].forEach((f, i) => this._tone(f, 0.15, "square", this.sfxGain, i * 0.045, 0.28));
  }

  playWarning() {
    if (!this.ctx) return;
    this._tone(880, 0.15, "square", this.sfxGain, 0, 0.3);
  }

  playGameOver() {
    if (!this.ctx) return;
    [523, 494, 440, 392, 349].forEach((f, i) => this._tone(f, 0.3, "triangle", this.sfxGain, i * 0.12, 0.3));
  }

  /** Minimal generative cyber-ambient loop: a slow arpeggio bed. Cheap, non-intrusive, loop-friendly. */
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const notes = [220, 261.6, 329.6, 392, 329.6, 261.6];
    let i = 0;
    const playStep = () => {
      if (!this.ctx) return;
      this._tone(notes[i % notes.length], 0.9, "sine", this.musicGain, 0, 0.5);
      this._tone(notes[i % notes.length] / 2, 1.1, "sine", this.musicGain, 0, 0.3);
      i += 1;
    };
    playStep();
    this.musicTimer = setInterval(playStep, 900);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
