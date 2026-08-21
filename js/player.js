/* ============================================================
   player.js
   The Cyber Guardian player character for ARCADE MISSION: movement,
   sprite-based animation, and active status effects (shield / speed
   boost). Story Mode's platform floors use their own player/pose
   logic in platformer.js instead.

   Rendering uses the bigger, more detailed procedurally-generated
   hero sprite sheet (img/guardian-detailed.png, see
   tools/gen_arcade_assets.py) with a 4-direction, 4-frame walk
   cycle — part of Arcade's "more graphics" visual upgrade. If the
   sheet hasn't finished loading yet, draw() falls back to a small
   vector figure so the game is never blocked on the image.
   ============================================================ */

class Player {
  /**
   * @param {number} worldWidth
   * @param {number} startX
   * @param {number} startY
   * @param {{width?:number, height?:number}} [opts] optional hitbox override
   *   (Story Mode uses a slightly slimmer box to fit maze corridors).
   */
  constructor(worldWidth, startX, startY, opts) {
    this.worldWidth = worldWidth;
    this.startX = startX;
    this.startY = startY;

    this.width = (opts && opts.width) || 34;
    this.height = (opts && opts.height) || 34;
    this.x = startX;
    this.y = startY;

    this.baseSpeed = 220; // px per second
    this.facing = "down";
    this.isMoving = false;

    // Status effects
    this.shieldActive = false;
    this.shieldTimeLeft = 0;
    this.speedBoostActive = false;
    this.speedBoostTimeLeft = 0;

    // Brief invulnerability after taking a hit, so one hazard
    // can't drain multiple ticks of health in a single frame.
    this.hitCooldown = 0;

    this.animT = 0;
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.facing = "down";
    this.isMoving = false;
    this.shieldActive = false;
    this.shieldTimeLeft = 0;
    this.speedBoostActive = false;
    this.speedBoostTimeLeft = 0;
    this.hitCooldown = 0;
  }

  /** A persistent movement-speed multiplier, separate from the temporary
   *  Speed Boost powerup — used by Arcade's roguelite "Fleet Runner"
   *  perk (see game.js's PERKS), which lasts the whole run rather than a
   *  few seconds. Defaults to 1, so nothing that doesn't set it is
   *  affected. Reset explicitly at the start of a run, not in reset(),
   *  because reset() also runs between floors, where perks must persist. */
  setSpeedScale(scale) {
    this.speedScale = scale || 1;
  }

  get currentSpeed() {
    const scale = this.speedScale || 1;
    return (this.speedBoostActive ? this.baseSpeed * 2 : this.baseSpeed) * scale;
  }

  applyShield(seconds) {
    this.shieldActive = true;
    this.shieldTimeLeft = Math.max(this.shieldTimeLeft, seconds);
  }

  applySpeedBoost(seconds) {
    this.speedBoostActive = true;
    this.speedBoostTimeLeft = Math.max(this.speedBoostTimeLeft, seconds);
  }

  triggerHitCooldown() {
    this.hitCooldown = 0.6;
  }

  get isInvulnerable() {
    return this.shieldActive || this.hitCooldown > 0;
  }

  update(dt, input, worldHeight) {
    // Movement
    let dx = 0;
    let dy = 0;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;

    this.isMoving = dx !== 0 || dy !== 0;
    if (this.isMoving) {
      this.animT += dt;
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      if (Math.abs(dy) >= Math.abs(dx)) {
        this.facing = dy < 0 ? "up" : "down";
      } else {
        this.facing = dx < 0 ? "left" : "right";
      }
    }

    const speed = this.currentSpeed;
    this.x += dx * speed * dt;
    this.y += dy * speed * dt;

    // Clamp to world bounds
    this.x = Math.max(this.width / 2, Math.min(this.worldWidth - this.width / 2, this.x));
    this.y = Math.max(this.height / 2, Math.min(worldHeight - this.height / 2, this.y));

    // Timers
    if (this.shieldTimeLeft > 0) {
      this.shieldTimeLeft -= dt;
      if (this.shieldTimeLeft <= 0) {
        this.shieldTimeLeft = 0;
        this.shieldActive = false;
      }
    }
    if (this.speedBoostTimeLeft > 0) {
      this.speedBoostTimeLeft -= dt;
      if (this.speedBoostTimeLeft <= 0) {
        this.speedBoostTimeLeft = 0;
        this.speedBoostActive = false;
      }
    }
    if (this.hitCooldown > 0) {
      this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    }
  }

  getBounds() {
    return {
      left: this.x - this.width / 2,
      right: this.x + this.width / 2,
      top: this.y - this.height / 2,
      bottom: this.y + this.height / 2,
    };
  }

  draw(ctx, camY, reducedMotion) {
    const sx = this.x;
    const sy = this.y - camY;
    const bob = reducedMotion || !this.isMoving ? 0 : Math.sin(this.animT * 8) * 2;
    const flashHit = this.hitCooldown > 0 && Math.floor(performance.now() / 80) % 2 === 0;

    // ---- Status effect rings (drawn under the character) ----
    ctx.save();
    ctx.translate(sx, sy + bob);

    if (this.speedBoostActive) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#38BDF8";
      ctx.beginPath();
      ctx.ellipse(0, this.height / 2 + 4, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (this.shieldActive) {
      ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#38BDF8";
      ctx.shadowBlur = reducedMotion ? 0 : 12;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (flashHit) {
      ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#EF4444";
      ctx.shadowBlur = reducedMotion ? 0 : 14;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // ---- Character (detailed 16-bit-style hero, see gen_arcade_assets.py) ----
    const sheet = window.SPRITES && window.SPRITES.arcadeHero;
    if (sheet && sheet.complete && sheet.naturalWidth > 0) {
      const rows = window.SPRITE_ROWS;
      const cols = window.SPRITE_COLS;
      const fw = sheet.naturalWidth / cols;
      const fh = sheet.naturalHeight / rows.length;
      const row = Math.max(0, rows.indexOf(this.facing));
      const frame = this.isMoving && !reducedMotion ? Math.floor(this.animT * 8) % cols : 0;
      const drawW = this.width * 2.4;
      const drawH = this.height * 3.2;
      const feetX = sx;
      const feetY = sy + bob + this.height / 2 + 4;

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sheet, frame * fw, row * fh, fw, fh, feetX - drawW / 2, feetY - drawH, drawW, drawH);
      ctx.restore();
    } else {
      // Fallback vector figure (used only until the sprite sheet loads).
      ctx.save();
      ctx.translate(sx, sy + bob);
      ctx.fillStyle = flashHit ? "#EF4444" : "#4F46E5";
      ctx.shadowColor = "#38BDF8";
      ctx.shadowBlur = reducedMotion ? 0 : 10;
      roundRect(ctx, -this.width / 2, -this.height / 2, this.width, this.height, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#38BDF8";
      const visor = { up: [0, -10], down: [0, 10], left: [-10, 0], right: [10, 0] }[this.facing];
      ctx.beginPath();
      ctx.arc(visor[0], visor[1], 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// Shared helper used by several rendering modules.
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
