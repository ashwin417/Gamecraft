/* ============================================================
   obstacles.js
   World entities: hazards, collectibles, and zone goal objects.
   Every entity exposes update(dt, difficulty) / draw(ctx, camY)
   and getBounds() for AABB collision detection.
   ============================================================ */

function aabbOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/* ---------------- Security Drone (patrol + chase) ---------------- */
class SecurityDrone {
  constructor(x, y, rangeX, baseSpeed) {
    this.x = x;
    this.y = y;
    this.originX = x;
    this.originY = y;
    this.rangeX = rangeX;
    // Vertical leash for a chase — generous enough to feel like a real
    // pursuit within the zone, bounded so a drone can never chase the
    // player clear out of its home zone.
    this.leashX = Math.max(rangeX * 1.8, 220);
    this.leashY = 260;
    this.sightRadius = 260;
    this.baseSpeed = baseSpeed;
    this.chaseSpeedMult = 1.6;
    this.dir = 1;
    this.width = 30;
    this.height = 30;
    this.spinT = Math.random() * Math.PI * 2;
    this.alert = false;
    this.loseSightT = 0;
    // Arcade roguelite state (see game.js): `stunT` is set by the EMP
    // pulse and freezes the drone (harmless to touch, can't chase) while
    // it counts down. `detectScale` is the "Silent Footsteps" perk's
    // handle on this drone's sight radius. Both default to a no-op, so a
    // drone constructed anywhere else behaves exactly as it always did.
    this.stunT = 0;
    this.detectScale = 1;
  }

  canSpot(player) {
    if (this.stunT > 0) return false;
    const dx = player.x - this.x, dy = player.y - this.y;
    const r = this.sightRadius * (this.detectScale || 1);
    return (dx * dx + dy * dy) <= r * r;
  }

  update(dt, difficultyMult, player) {
    if (this.stunT > 0) {
      // Frozen in place while stunned — no patrol, no chase, no drift
      // back to altitude. Just the countdown and its spin animation, so
      // it still reads as a live object rather than a deleted one.
      this.stunT = Math.max(0, this.stunT - dt);
      this.alert = false;
      this.spinT += dt * 1.5;
      return;
    }
    const canSee = player && this.canSpot(player);
    if (canSee) {
      this.alert = true;
      this.loseSightT = 0;
    } else if (this.alert) {
      this.loseSightT += dt;
      if (this.loseSightT > 1.1) this.alert = false;
    }

    if (this.alert && player) {
      const dx = player.x - this.x, dy = player.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const spd = this.baseSpeed * difficultyMult * this.chaseSpeedMult;
      this.x += (dx / dist) * spd * dt;
      this.y += (dy / dist) * spd * dt;
      this.x = Math.max(this.originX - this.leashX, Math.min(this.originX + this.leashX, this.x));
      this.y = Math.max(this.originY - this.leashY, Math.min(this.originY + this.leashY, this.y));
    } else {
      this.x += this.dir * this.baseSpeed * difficultyMult * dt;
      if (this.x > this.originX + this.rangeX) { this.x = this.originX + this.rangeX; this.dir = -1; }
      if (this.x < this.originX - this.rangeX) { this.x = this.originX - this.rangeX; this.dir = 1; }
      // Ease back to patrol altitude after a chase pulled it off its row.
      if (this.y !== this.originY) {
        const step = this.baseSpeed * difficultyMult * dt;
        const diff = this.originY - this.y;
        this.y += Math.abs(diff) <= step ? diff : Math.sign(diff) * step;
      }
    }
    this.spinT += dt * 6 * difficultyMult;
  }

  getBounds() {
    return { left: this.x - this.width / 2, right: this.x + this.width / 2, top: this.y - this.height / 2, bottom: this.y + this.height / 2 };
  }

  draw(ctx, camY, reducedMotion) {
    const sy = this.y - camY;
    if (sy < -60 || sy > 720) return;
    const stunned = this.stunT > 0;
    const flash = this.alert && !reducedMotion ? 0.6 + Math.sin(this.spinT * 5) * 0.4 : (this.alert ? 1 : 0.7);
    ctx.save();
    ctx.translate(this.x, sy);
    ctx.rotate(this.spinT * 0.2);
    // A stunned drone reads blue and dim — the same visual language the
    // guard stun uses in Story Mode, so "frozen, safe to pass" means the
    // same thing in both modes.
    ctx.fillStyle = stunned ? "#1E3A5F" : "#EF4444";
    ctx.shadowColor = stunned ? "#38BDF8" : "#EF4444";
    ctx.shadowBlur = stunned ? 12 : (this.alert ? 16 * flash : 10);
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(13, 10);
    ctx.lineTo(-13, 10);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#0F172A";
    ctx.beginPath();
    ctx.arc(0, -1, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (stunned) {
      ctx.save();
      ctx.font = "bold 12px 'Share Tech Mono', monospace";
      ctx.fillStyle = "#38BDF8";
      ctx.textAlign = "center";
      ctx.shadowColor = "#38BDF8";
      ctx.shadowBlur = 6;
      ctx.fillText("EMP", this.x, sy - 22);
      ctx.restore();
      return;
    }
    if (this.alert) {
      ctx.save();
      ctx.font = "bold 14px 'Share Tech Mono', monospace";
      ctx.fillStyle = "#EF4444";
      ctx.textAlign = "center";
      ctx.shadowColor = "#EF4444";
      ctx.shadowBlur = 8;
      ctx.fillText("!", this.x, sy - 22);
      ctx.restore();
    }
  }
}

/* ---------------- Laser Beam (sweeps horizontally) ---------------- */
class LaserBeam {
  constructor(y, corridorWidth, baseSpeed, phase) {
    this.y = y;
    this.corridorWidth = corridorWidth;
    this.baseSpeed = baseSpeed;
    this.t = phase;
    this.x = corridorWidth / 2;
    this.thickness = 10;
  }

  update(dt, difficultyMult) {
    this.t += dt * this.baseSpeed * difficultyMult;
    this.x = this.corridorWidth / 2 + Math.sin(this.t) * (this.corridorWidth / 2 - 40);
  }

  getBounds() {
    return { left: this.x - this.thickness / 2, right: this.x + this.thickness / 2, top: this.y - 45, bottom: this.y + 45 };
  }

  draw(ctx, camY, reducedMotion) {
    const sy = this.y - camY;
    if (sy < -80 || sy > 720) return;
    ctx.save();
    ctx.strokeStyle = "#EF4444";
    ctx.lineWidth = this.thickness;
    ctx.shadowColor = "#EF4444";
    ctx.shadowBlur = reducedMotion ? 0 : 16;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(this.x, sy - 45);
    ctx.lineTo(this.x, sy + 45);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

/* ---------------- Malware Zone (stationary hazard) ---------------- */
class MalwareZone {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.pulseT = Math.random() * Math.PI * 2;
  }

  update(dt) { this.pulseT += dt * 3; }

  getBounds() {
    return { left: this.x - this.radius, right: this.x + this.radius, top: this.y - this.radius, bottom: this.y + this.radius };
  }

  draw(ctx, camY, reducedMotion) {
    const sy = this.y - camY;
    if (sy < -60 || sy > 720) return;
    const pulse = reducedMotion ? 0 : Math.sin(this.pulseT) * 3;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#EF4444";
    ctx.beginPath();
    ctx.arc(this.x, sy, this.radius + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "#EF4444";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(this.x, sy, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

/* ---------------- Firewall Gate (opens & closes) ---------------- */
class FirewallGate {
  constructor(x, y, gateWidth, cyclePeriod) {
    this.x = x;
    this.y = y;
    this.gateWidth = gateWidth;
    this.cyclePeriod = cyclePeriod;
    this.t = 0;
  }

  update(dt, difficultyMult) { this.t += dt * difficultyMult; }

  get isOpen() {
    return (this.t % this.cyclePeriod) > this.cyclePeriod * 0.45;
  }

  getBounds() {
    if (this.isOpen) return null;
    return { left: this.x - this.gateWidth / 2, right: this.x + this.gateWidth / 2, top: this.y - 12, bottom: this.y + 12 };
  }

  draw(ctx, camY) {
    const sy = this.y - camY;
    if (sy < -40 || sy > 700) return;
    const open = this.isOpen;
    ctx.save();
    ctx.strokeStyle = open ? "#22C55E" : "#EF4444";
    ctx.fillStyle = open ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.35)";
    ctx.lineWidth = 3;
    ctx.shadowColor = open ? "#22C55E" : "#EF4444";
    ctx.shadowBlur = 10;
    roundRect(ctx, this.x - this.gateWidth / 2, sy - 12, this.gateWidth, 24, 4);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = "11px 'Share Tech Mono', monospace";
    ctx.fillStyle = open ? "#22C55E" : "#EF4444";
    ctx.textAlign = "center";
    ctx.fillText(open ? "OPEN" : "LOCKED", this.x, sy + 4);
    ctx.restore();
  }
}

/* ---------------- Alarm Area (temporary penalty zone) ---------------- */
class AlarmArea {
  constructor(x, y, radius, cyclePeriod) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.cyclePeriod = cyclePeriod;
    this.t = Math.random() * cyclePeriod;
    this.alreadyPenalized = false;
  }

  update(dt, difficultyMult) {
    const wasActive = this.isActive;
    this.t += dt * difficultyMult;
    if (!this.isActive) this.alreadyPenalized = false;
  }

  get isActive() {
    return (this.t % this.cyclePeriod) < this.cyclePeriod * 0.35;
  }

  getBounds() {
    if (!this.isActive) return null;
    return { left: this.x - this.radius, right: this.x + this.radius, top: this.y - this.radius, bottom: this.y + this.radius };
  }

  draw(ctx, camY, reducedMotion) {
    const sy = this.y - camY;
    if (sy < -60 || sy > 720) return;
    ctx.save();
    const active = this.isActive;
    const flash = reducedMotion ? 0.5 : (Math.sin(this.t * 10) * 0.3 + 0.5);
    ctx.globalAlpha = active ? 0.25 + flash * 0.25 : 0.08;
    ctx.fillStyle = "#EF4444";
    ctx.beginPath();
    ctx.arc(this.x, sy, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = "10px 'Share Tech Mono', monospace";
    ctx.fillStyle = active ? "#EF4444" : "#94A3B8";
    ctx.textAlign = "center";
    ctx.fillText(active ? "ALARM ACTIVE" : "alarm zone", this.x, sy - this.radius - 6);
    ctx.restore();
  }
}

/* ---------------- Security Token (collectible, +10) ---------------- */
class SecurityToken {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.collected = false;
    this.spinT = Math.random() * Math.PI * 2;
  }

  update(dt) { this.spinT += dt * 4; }

  getBounds() {
    return { left: this.x - this.radius, right: this.x + this.radius, top: this.y - this.radius, bottom: this.y + this.radius };
  }

  draw(ctx, camY, reducedMotion) {
    if (this.collected) return;
    const sy = this.y - camY;
    if (sy < -30 || sy > 630) return;
    const scaleX = reducedMotion ? 1 : Math.abs(Math.cos(this.spinT));
    ctx.save();
    ctx.translate(this.x, sy);
    ctx.scale(scaleX, 1);
    ctx.fillStyle = "#22C55E";
    ctx.shadowColor = "#22C55E";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 11px 'Share Tech Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", 0, 1);
    ctx.restore();
  }
}

/* ---------------- Patch File (collectible, +20) ---------------- */
class PatchFile {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 11;
    this.collected = false;
    this.floatT = Math.random() * Math.PI * 2;
  }

  update(dt) { this.floatT += dt * 2; }

  getBounds() {
    return { left: this.x - this.radius, right: this.x + this.radius, top: this.y - this.radius, bottom: this.y + this.radius };
  }

  draw(ctx, camY, reducedMotion) {
    if (this.collected) return;
    const sy = this.y - camY + (reducedMotion ? 0 : Math.sin(this.floatT) * 3);
    if (sy < -30 || sy > 630) return;
    ctx.save();
    ctx.translate(this.x, sy);
    ctx.fillStyle = "#38BDF8";
    ctx.shadowColor = "#38BDF8";
    ctx.shadowBlur = 10;
    roundRect(ctx, -9, -11, 18, 22, 3);
    ctx.fill();
    ctx.strokeStyle = "#0F172A";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -4); ctx.lineTo(4, -4);
    ctx.moveTo(-4, 0); ctx.lineTo(4, 0);
    ctx.moveTo(-4, 4); ctx.lineTo(4, 4);
    ctx.stroke();
    ctx.restore();
  }
}

/* ---------------- Checkpoint Pad (activation goal, +50) ---------------- */
class CheckpointPad {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 22;
    this.activated = false;
    this.pulseT = 0;
  }

  update(dt) { this.pulseT += dt; }

  reset() { this.activated = false; }

  getBounds() {
    return { left: this.x - this.radius, right: this.x + this.radius, top: this.y - this.radius, bottom: this.y + this.radius };
  }

  draw(ctx, camY, reducedMotion) {
    const sy = this.y - camY;
    if (sy < -60 || sy > 660) return;
    ctx.save();
    const ring = reducedMotion ? 0 : (Math.sin(this.pulseT * 3) * 4);
    ctx.strokeStyle = this.activated ? "#22C55E" : "#4F46E5";
    ctx.lineWidth = 3;
    ctx.shadowColor = this.activated ? "#22C55E" : "#4F46E5";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(this.x, sy, this.radius + ring, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = "10px 'Share Tech Mono', monospace";
    ctx.fillStyle = "#94A3B8";
    ctx.textAlign = "center";
    ctx.fillText(this.activated ? "CHECKPOINT OK" : "CHECKPOINT", this.x, sy + this.radius + 16);
    ctx.restore();
  }
}

/* ---------------- Server Rack (mission goal, +100) ---------------- */
class ServerRack {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 90;
    this.height = 70;
    this.glowT = 0;
  }

  update(dt) { this.glowT += dt; }

  getBounds() {
    return { left: this.x - this.width / 2, right: this.x + this.width / 2, top: this.y - this.height / 2, bottom: this.y + this.height / 2 };
  }

  draw(ctx, camY, reducedMotion) {
    const sy = this.y - camY;
    if (sy < -100 || sy > 700) return;
    const glow = reducedMotion ? 10 : 10 + Math.sin(this.glowT * 4) * 8;
    ctx.save();
    ctx.fillStyle = "#0F172A";
    ctx.strokeStyle = "#22C55E";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#22C55E";
    ctx.shadowBlur = glow;
    roundRect(ctx, this.x - this.width / 2, sy - this.height / 2, this.width, this.height, 6);
    ctx.fill();
    ctx.stroke();
    // Rack lights
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#22C55E" : "#38BDF8";
      ctx.fillRect(this.x - this.width / 2 + 10, sy - this.height / 2 + 8 + i * 14, this.width - 20, 6);
    }
    ctx.shadowBlur = 0;
    ctx.font = "bold 11px 'Share Tech Mono', monospace";
    ctx.fillStyle = "#22C55E";
    ctx.textAlign = "center";
    ctx.fillText("SERVER RACK", this.x, sy + this.height / 2 + 16);
    ctx.restore();
  }
}
