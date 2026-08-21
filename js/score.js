/* ============================================================
   score.js
   Score, combo multiplier, run statistics, and floating
   "+N" point effects rendered on the canvas.

   ROGUELITE COMBO (Arcade Mode): the combo is no longer a plain
   "consecutive pickups" counter that only ever breaks on damage —
   it's now TIME-GATED. Every qualifying action (a pickup, or an EMP
   stun landed on a drone) refreshes a short window; let the window
   lapse and the combo decays back to zero on its own. That's what
   makes it a *fast*-successive-action multiplier rather than a
   passive one you can bank across a whole slow, careful run, and
   it's what gives the roguelite loop its risk/reward: chaining
   means moving faster through more danger.

   Taking damage still drops it straight to 1x, unchanged.
   ============================================================ */

const SCORE_VALUES = {
  token: 10,
  patch: 20,
  checkpoint: 50,
  serverRoom: 100,
  stun: 15, // EMP stun landed on a drone — see game.js's tryArcadeStun()
};

/** Combo thresholds, highest first — the first one the current combo
 *  meets or exceeds wins. Extends the original 3→1.5x / 5→2x pair
 *  upward so a genuinely hot streak keeps paying off in an endless run,
 *  where the old 2x ceiling would have been hit and held permanently. */
const COMBO_TIERS = [
  { at: 20, mult: 5 },
  { at: 16, mult: 4 },
  { at: 12, mult: 3 },
  { at: 8, mult: 2.5 },
  { at: 5, mult: 2 },
  { at: 3, mult: 1.5 },
];

// Seconds of inactivity before the combo decays. Extendable by the
// "Combo Keeper" perk (see game.js's PERKS) via setComboWindow().
const COMBO_WINDOW_DEFAULT = 3.5;

const PENALTY_VALUES = {
  laser: -10,
  malware: -15,
  drone: -20,
  alarm: -10,
};

class ScoreManager {
  constructor() {
    this.score = 0;
    this.combo = 0;
    this.highestCombo = 0;
    this.frozen = false;
    this.comboWindow = COMBO_WINDOW_DEFAULT;
    this.comboTimeLeft = 0;

    this.stats = {
      tokensCollected: 0,
      patchesApplied: 0,
      checkpointsActivated: 0,
      serverRoomsSecured: 0,
      threatsAvoided: 0,
      hazardHits: 0,
      dronesStunned: 0,
    };

    this.floatingTexts = [];
  }

  reset() {
    this.score = 0;
    this.combo = 0;
    this.highestCombo = 0;
    this.frozen = false;
    this.comboWindow = COMBO_WINDOW_DEFAULT;
    this.comboTimeLeft = 0;
    this.stats = {
      tokensCollected: 0,
      patchesApplied: 0,
      checkpointsActivated: 0,
      serverRoomsSecured: 0,
      threatsAvoided: 0,
      hazardHits: 0,
      dronesStunned: 0,
    };
    this.floatingTexts = [];
  }

  freeze() {
    this.frozen = true;
  }

  /** Used by the "Combo Keeper" perk to widen the chain window for the
   *  rest of the run. Refreshes any window currently running so the perk
   *  takes effect immediately rather than only on the next pickup. */
  setComboWindow(seconds) {
    this.comboWindow = seconds;
    if (this.comboTimeLeft > 0) this.comboTimeLeft = seconds;
  }

  /** 0..1 — how much of the current chain window is left. Drives the
   *  HUD's combo timer bar so the player can see the chain about to
   *  lapse rather than just watching it silently vanish. */
  get comboWindowRatio() {
    return this.comboWindow > 0 ? Math.max(0, Math.min(1, this.comboTimeLeft / this.comboWindow)) : 0;
  }

  get comboMultiplier() {
    const tier = COMBO_TIERS.find((t) => this.combo >= t.at);
    return tier ? tier.mult : 1;
  }

  /**
   * Registers a positive collection event (token, patch, checkpoint, server room).
   * Applies combo multiplier + optional active score-multiplier powerup.
   */
  addPositive(kind, worldX, worldY, extraMultiplier, scoreScale) {
    if (this.frozen) return 0;
    this.combo += 1;
    this.highestCombo = Math.max(this.highestCombo, this.combo);
    // Every qualifying action refreshes the chain window — this is what
    // makes the combo reward SPEED rather than just accuracy.
    this.comboTimeLeft = this.comboWindow;

    const base = (SCORE_VALUES[kind] || 0) * (scoreScale || 1);
    const mult = this.comboMultiplier * (extraMultiplier || 1);
    const gained = Math.round(base * mult);
    this.score += gained;

    if (kind === "token") this.stats.tokensCollected += 1;
    if (kind === "patch") this.stats.patchesApplied += 1;
    if (kind === "checkpoint") this.stats.checkpointsActivated += 1;
    if (kind === "serverRoom") this.stats.serverRoomsSecured += 1;
    if (kind === "stun") this.stats.dronesStunned += 1;

    this._spawnFloat(worldX, worldY, `+${gained}`, "#22C55E");
    return gained;
  }

  /** Registers a penalty (drone / laser / malware / alarm) and resets combo. */
  addPenalty(kind, worldX, worldY) {
    if (this.frozen) return 0;
    this.combo = 0;
    this.comboTimeLeft = 0;
    const val = PENALTY_VALUES[kind] || 0;
    this.score = Math.max(0, this.score + val);
    this.stats.hazardHits += 1;
    this._spawnFloat(worldX, worldY, `${val}`, "#EF4444");
    return val;
  }

  registerThreatAvoided(worldX, worldY) {
    this.stats.threatsAvoided += 1;
    this._spawnFloat(worldX, worldY, "BLOCKED", "#38BDF8");
  }

  /** Public helper other modules (e.g. powerup pickups) can use for feedback text. */
  showFloatingText(worldX, worldY, text, color) {
    this._spawnFloat(worldX, worldY, text, color);
  }

  _spawnFloat(x, y, text, color) {
    this.floatingTexts.push({ x, y, text, color, life: 1.0, vy: -40 });
  }

  update(dt) {
    // Chain window decay — a combo left idle lapses back to zero on its
    // own, no damage required. Returns nothing, but the HUD reads
    // comboWindowRatio each frame to show it draining.
    if (!this.frozen && this.combo > 0) {
      this.comboTimeLeft = Math.max(0, this.comboTimeLeft - dt);
      if (this.comboTimeLeft <= 0) this.combo = 0;
    }

    this.floatingTexts.forEach((f) => {
      f.y += f.vy * dt;
      f.life -= dt * 1.1;
    });
    this.floatingTexts = this.floatingTexts.filter((f) => f.life > 0);
  }

  drawFloatingTexts(ctx, camY) {
    this.floatingTexts.forEach((f) => {
      const sy = f.y - camY;
      ctx.save();
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.font = "bold 16px 'Share Tech Mono', monospace";
      ctx.fillStyle = f.color;
      ctx.textAlign = "center";
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 6;
      ctx.fillText(f.text, f.x, sy);
      ctx.restore();
    });
  }
}
