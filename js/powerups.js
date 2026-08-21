/* ============================================================
   powerups.js
   Powerup entity + spawn manager.
   Types: shield, speed, multiplier, timer
   ============================================================ */

const POWERUP_DEFS = {
  shield: { color: "#38BDF8", label: "SHIELD", duration: 10, glyph: "S" },
  speed: { color: "#22C55E", label: "SPEED BOOST", duration: 10, glyph: ">" },
  multiplier: { color: "#4F46E5", label: "2x SCORE", duration: 10, glyph: "x2" },
  timer: { color: "#FACC15", label: "+3 SEC", duration: 0, glyph: "+3" },
};

class PowerUp {
  constructor(type, x, y) {
    this.type = type;
    this.def = POWERUP_DEFS[type];
    this.x = x;
    this.y = y;
    this.radius = 15;
    this.collected = false;
    this.spinT = Math.random() * Math.PI * 2;
  }

  update(dt) { this.spinT += dt * 2.5; }

  getBounds() {
    return { left: this.x - this.radius, right: this.x + this.radius, top: this.y - this.radius, bottom: this.y + this.radius };
  }

  draw(ctx, camY, reducedMotion) {
    if (this.collected) return;
    const sy = this.y - camY + (reducedMotion ? 0 : Math.sin(this.spinT) * 4);
    if (sy < -40 || sy > 640) return;
    ctx.save();
    ctx.translate(this.x, sy);
    ctx.rotate(reducedMotion ? 0 : this.spinT * 0.5);
    ctx.fillStyle = this.def.color;
    ctx.shadowColor = this.def.color;
    ctx.shadowBlur = 14;
    // diamond shape
    ctx.beginPath();
    ctx.moveTo(0, -this.radius);
    ctx.lineTo(this.radius, 0);
    ctx.lineTo(0, this.radius);
    ctx.lineTo(-this.radius, 0);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(reducedMotion ? 0 : -this.spinT * 0.5);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 9px 'Share Tech Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.def.glyph, 0, 1);
    ctx.restore();
  }
}

/* Handles periodic spawning of powerups across the active play area. */
class PowerUpManager {
  constructor(worldWidth, worldHeight) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.active = [];
    this.spawnTimer = 4; // first powerup arrives quickly
    this.types = Object.keys(POWERUP_DEFS);
  }

  reset() {
    this.active = [];
    this.spawnTimer = 4;
  }

  update(dt, playerY) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.active.length < 3) {
      this.spawnTimer = 7 + Math.random() * 5;
      const type = this.types[Math.floor(Math.random() * this.types.length)];
      // Spawn somewhere within a reasonable band around the player's zone
      const margin = 60;
      const x = margin + Math.random() * (this.worldWidth - margin * 2);
      const yOffset = (Math.random() - 0.5) * 700;
      let y = playerY - 300 + yOffset;
      y = Math.max(60, Math.min(this.worldHeight - 60, y));
      this.active.push(new PowerUp(type, x, y));
    }
    this.active.forEach((p) => p.update(dt));
    this.active = this.active.filter((p) => !p.collected);
  }

  draw(ctx, camY, reducedMotion) {
    this.active.forEach((p) => p.draw(ctx, camY, reducedMotion));
  }
}
