/* ============================================================
   guards.js
   Security Guard enemies for STORY MODE platform levels — the
   "security people" hazard the player has to run/jump past.
   Side-view, horizontal-only movement. Two behaviors:
     - PATROL: walks back and forth within rangeTiles of its home
       position (classic Dangerous-Dave-style patrol-and-avoid).
     - CHASE: when the player is spotted (roughly the same floor
       row and within sight range horizontally), the guard breaks
       patrol and actively runs toward the player at a speed boost,
       extending out to a wider leash range so a chase can actually
       go somewhere. Losing the player (out of sight range, or out
       of vertical reach) for a short grace window sends the guard
       back toward its patrol home before it resumes patrolling.
   Rendered with the 2-frame dave-guard.png walk cycle, flipped
   horizontally for left-facing movement, with a red "alert" flash
   while actively chasing. All coordinates are level-local (see
   platformer.js) — the caller translates the canvas context before
   calling draw().
   ============================================================ */

// How many separate boss-gun hits (see platformer.js's tryFireGun()) it
// takes to permanently remove an ordinary guard. Kept as its own constant
// here (guards.js has no access to platformer.js's private constants — see
// that file's authoring note about the shared-lexical-scope pattern) rather
// than a magic number buried in takeGunHit() below.
const GUN_KILL_HITS = 2;

class SecurityGuard {
  /**
   * @param {number} x,y   patrol center, top-left of collision box
   * @param {number} w,h   collision box size
   * @param {number} rangeTiles how far (in tiles) the guard patrols from x
   * @param {number} speed patrol speed in px/sec
   * @param {number} tileSize used to convert rangeTiles -> pixels
   */
  constructor(x, y, w, h, rangeTiles, speed, tileSize) {
    this.originX = x;
    this.y = y;
    this.x = x;
    this.w = w;
    this.h = h;
    this.range = rangeTiles * tileSize;
    // Chase leash is generous vs. the patrol range so a spotted player can
    // actually be pursued somewhere, not just to the edge of the old
    // patrol box — but still bounded, so a guard can never chase forever
    // across an entire level.
    this.leash = Math.max(this.range * 2.2, tileSize * 6);
    this.sightRangeX = tileSize * 5.5;
    this.sightRangeY = tileSize * 1.6;
    this.speed = speed;
    this.chaseSpeed = speed * 1.55;
    this.dir = 1;
    this.animT = Math.random() * 10;
    this.alert = false;
    this.loseSightT = 0;
    // Temporary-stun state (Story Mode's guard-paralyze ability — see
    // platformer.js's tryFireStun()). While paralyzed a guard is frozen in
    // place, can't be spotted-into-a-chase, and can't fail the run on touch
    // (that check lives in platformer.js, keyed off this.paralyzed).
    this.paralyzed = false;
    this.paralyzedT = 0;
    this.paralyzedMax = 0;
    // Gun-kill state (Story Mode's dedicated Gun-fire key — see
    // platformer.js's tryFireGun()). Separate from the temporary `paralyzed`
    // freeze above: a non-fatal gun hit still just paralyzes normally, but
    // once `killed` flips true the guard is gone for the rest of the floor
    // — no timer, no waking back up. Unused by anything until the player
    // actually has the gun, so this is a no-op cost on every other guard.
    this.gunHitsTaken = 0;
    this.killed = false;
  }

  /** Freezes the guard for `duration` seconds. Called by platformer.js when
   *  a fired stun charge connects. Immediately drops any active chase so
   *  the guard doesn't resume mid-lunge the instant it wakes back up. */
  paralyze(duration) {
    this.paralyzed = true;
    this.paralyzedT = duration;
    this.paralyzedMax = duration;
    this.alert = false;
    this.loseSightT = 0;
  }

  /** Called when the boss-gun hits this guard directly (platformer.js's
   *  tryFireGun()). Takes GUN_KILL_HITS separate hits to permanently
   *  remove an ordinary guard — same "a single hit buys a window, doesn't
   *  trivialize the fight" shape as the stun ability, but the payoff for
   *  spending that second hit is permanent removal instead of a temporary
   *  freeze. A non-fatal hit still applies the normal paralyze so every
   *  hit reads as a real hit. Boss overrides this to keep its own
   *  independent multi-hit-to-defeat mechanic (see below). */
  takeGunHit(duration) {
    if (this.killed) return;
    this.gunHitsTaken++;
    if (this.gunHitsTaken >= GUN_KILL_HITS) {
      this.killed = true;
      this.paralyzed = false;
      this.paralyzedT = 0;
      this.alert = false;
    } else {
      this.paralyze(duration);
    }
  }

  /** @param {{x:number,y:number,w:number,h:number}|null} player level-local
   *  player rect, or null/omitted to fall back to pure patrol (used by any
   *  caller that hasn't been updated to pass the player in). */
  update(dt, player) {
    if (this.killed) return;
    if (this.paralyzed) {
      this.paralyzedT -= dt;
      this.animT += dt;
      if (this.paralyzedT <= 0) { this.paralyzed = false; this.paralyzedT = 0; }
      return;
    }
    const canSee = player && this.canSpot(player);

    if (canSee) {
      this.alert = true;
      this.loseSightT = 0;
    } else if (this.alert) {
      // Grace window before giving up the chase — keeps a guard from
      // instantly snapping back to patrol the moment the player ducks out
      // of sight for a single frame.
      this.loseSightT += dt;
      if (this.loseSightT > 1.1) this.alert = false;
    }

    if (this.alert && player) {
      const targetCx = player.x + player.w / 2 - this.w / 2;
      const clampedTarget = Math.max(this.originX - this.leash, Math.min(this.originX + this.leash, targetCx));
      this.dir = clampedTarget > this.x ? 1 : clampedTarget < this.x ? -1 : this.dir;
      this.x += this.dir * this.chaseSpeed * dt;
      this.x = Math.max(this.originX - this.leash, Math.min(this.originX + this.leash, this.x));
    } else {
      this.x += this.dir * this.speed * dt;
      if (this.x > this.originX + this.range) { this.x = this.originX + this.range; this.dir = -1; }
      if (this.x < this.originX - this.range) { this.x = this.originX - this.range; this.dir = 1; }
    }
    this.animT += dt;
  }

  /** Line-of-sight is a simple same-walkway box check: the player has to be
   *  roughly at the guard's height (not on some other platform entirely)
   *  and within sightRangeX horizontally. Good enough for a 2D side-scroller
   *  and cheap to run for every guard every frame. */
  canSpot(player) {
    const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
    const dy = (player.y + player.h / 2) - (this.y + this.h / 2);
    return Math.abs(dx) <= this.sightRangeX && Math.abs(dy) <= this.sightRangeY;
  }

  getBounds() {
    return { left: this.x, right: this.x + this.w, top: this.y, bottom: this.y + this.h };
  }

  /** Draws the guard using the 2-frame walk-cycle sprite sheet, flipped for
   *  left-facing movement, falling back to a simple silhouette pre-load.
   *  Flashes red while actively chasing so the player gets a clear signal
   *  they've been spotted. */
  draw(ctx, reducedMotion) {
    if (this.killed) return; // gun-killed guards are gone for the rest of the floor — see takeGunHit()
    const sheet = window.SPRITES && window.SPRITES.daveGuard;
    const cx = this.x + this.w / 2;
    const feetY = this.y + this.h;
    const chaseFlash = this.alert && !reducedMotion ? 0.55 + Math.sin(this.animT * 14) * 0.45 : (this.alert ? 1 : 0);
    // A gentle blue shake while paralyzed so it reads as "frozen", not
    // "gone" — reduced-motion players get a static tint instead.
    const shakeX = this.paralyzed && !reducedMotion ? Math.sin(this.animT * 30) * 1.5 : 0;

    if (sheet && sheet.complete && sheet.naturalWidth > 0) {
      const fw = sheet.naturalWidth / 2;
      const fh = sheet.naturalHeight;
      const animSpeed = this.alert ? 10 : 6;
      const frame = this.paralyzed ? 0 : Math.floor(this.animT * animSpeed) % 2;
      const drawW = this.w * 1.6;
      const drawH = this.h * 1.5;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(cx + shakeX, feetY - drawH / 2);
      if (this.dir < 0) ctx.scale(-1, 1);
      if (this.paralyzed) {
        ctx.filter = "grayscale(0.7) brightness(0.85)";
        ctx.shadowColor = "#38BDF8";
        ctx.shadowBlur = 10;
      } else if (this.alert && chaseFlash > 0) {
        ctx.shadowColor = "#EF4444";
        ctx.shadowBlur = 14 * chaseFlash;
      }
      ctx.drawImage(sheet, frame * fw, 0, fw, fh, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = this.paralyzed ? "#1E293B" : "#334155";
      ctx.strokeStyle = this.paralyzed ? "#38BDF8" : "#EF4444";
      ctx.lineWidth = 2;
      ctx.fillRect(this.x + shakeX, this.y, this.w, this.h);
      ctx.strokeRect(this.x + shakeX, this.y, this.w, this.h);
      ctx.restore();
    }

    if (this.paralyzed) {
      // "Zzz" marker + a shrinking countdown ring so the player can judge
      // how much longer it's safe to linger nearby.
      ctx.save();
      ctx.font = "bold 14px 'Share Tech Mono', monospace";
      ctx.fillStyle = "#38BDF8";
      ctx.textAlign = "center";
      ctx.shadowColor = "#38BDF8";
      ctx.shadowBlur = 6;
      ctx.fillText("Zzz", cx, this.y - 6);
      ctx.restore();

      const ratio = this.paralyzedMax > 0 ? Math.max(0, this.paralyzedT / this.paralyzedMax) : 0;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#38BDF8";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, this.y, this.w * 0.9, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (this.alert) {
      // "!" alert marker over an actively-chasing guard.
      ctx.save();
      ctx.font = "bold 16px 'Share Tech Mono', monospace";
      ctx.fillStyle = "#EF4444";
      ctx.textAlign = "center";
      ctx.shadowColor = "#EF4444";
      ctx.shadowBlur = 8;
      ctx.fillText("!", cx, this.y - 6);
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = this.alert ? 0.3 : 0.16;
    ctx.strokeStyle = "#EF4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, this.y, this.w * 1.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/* ============================================================
   Boss — a tougher, named SecurityGuard variant for Floor 5's
   mid-run gauntlet (see floors-data.js's `boss` field and
   platformer.js's activateBoss()). Reuses all of SecurityGuard's
   patrol/chase/spot logic and its "touch this while unparalyzed and
   the run ends" contract for free — the only real differences:

     - It doesn't wake up (isn't even added to platformer.js's
       `guards` array, so it can't move, chase, or be touched) until
       the floor's quiz is answered correctly. See activateBoss().
     - A single stun hit doesn't just freeze it temporarily like an
       ordinary guard — paralyze() is overridden to track hits, and
       it only actually goes down (this.defeated = true, permanently
       harmless, no longer chases or fails the run) after `maxHits`
       separate hits. Hits before the last one still apply a normal
       temporary freeze, so each one buys the same window-of-
       opportunity an ordinary stun would, plus the same
       pickup-drop economy (see platformer.js's tryFireStun()).
     - Rendered with the pixelated boss-face portrait
       (img/boss-face.png / img/boss-face-defeated.png, generated by
       tools/gen_boss_sprite.py) instead of the guard walk-cycle
       sheet, plus a name plate and a hit-counter readout so the
       player can track progress through the fight.
   ============================================================ */
class Boss extends SecurityGuard {
  /** @param {object} opts {name, hp} — hp is how many separate stun
   *  hits it takes before this.defeated flips true. */
  constructor(x, y, w, h, rangeTiles, speed, tileSize, opts) {
    super(x, y, w, h, rangeTiles, speed, tileSize);
    opts = opts || {};
    this.isBoss = true;
    this.name = opts.name || "The Boss";
    this.maxHits = opts.hp || 3;
    this.hitsTaken = 0;
    this.defeated = false;
    // Tougher on every axis than a normal guard: sees further, chases
    // harder, and isn't leashed back to a tight patrol origin — the
    // whole point is that once it's awake, there's nowhere quiet to
    // hide, only the stun-and-retreat loop.
    this.sightRangeX = tileSize * 8;
    this.sightRangeY = tileSize * 2.4;
    this.chaseSpeed = speed * 1.7;
    this.leash = tileSize * 30;
  }

  /** Overrides SecurityGuard.paralyze(): the first (maxHits - 1) hits
   *  apply a normal temporary freeze (same duration, same "safe to walk
   *  past" contract); the final hit instead permanently defeats it. */
  paralyze(duration) {
    if (this.defeated) return;
    this.hitsTaken++;
    if (this.hitsTaken >= this.maxHits) {
      this.defeated = true;
      this.paralyzed = false;
      this.paralyzedT = 0;
      this.alert = false;
    } else {
      super.paralyze(duration);
    }
  }

  update(dt, player) {
    if (this.defeated) { this.animT += dt; return; }
    super.update(dt, player);
  }

  /** The boss-gun's hit against the boss itself funnels straight into the
   *  same multi-hit paralyze() override above — both the stun ability and
   *  the dedicated gun key count toward the same hitsTaken pool, unchanged
   *  from the original "adds a new attack, stun still works too" design.
   *  Never sets `killed` (that's an ordinary-guard-only concept); the boss
   *  keeps its own `defeated` flag instead. */
  takeGunHit(duration) {
    this.paralyze(duration);
  }

  draw(ctx, reducedMotion) {
    const cx = this.x + this.w / 2;
    const feetY = this.y + this.h;
    const portrait = window.SPRITES && (this.defeated ? window.SPRITES.bossFaceDefeated : window.SPRITES.bossFace);
    const drawW = this.w * 2.3;
    const drawH = this.h * 2.3;
    const shakeX = this.paralyzed && !reducedMotion ? Math.sin(this.animT * 30) * 2 : 0;
    const bob = !this.defeated && !reducedMotion ? Math.sin(this.animT * 2.4) * 3 : 0;

    ctx.save();
    ctx.translate(cx + shakeX, feetY - drawH / 2 + bob);
    if (!this.defeated) {
      const pulse = this.alert && !reducedMotion ? 0.5 + Math.sin(this.animT * 10) * 0.5 : 0.35;
      ctx.shadowColor = this.paralyzed ? "#38BDF8" : "#EF4444";
      ctx.shadowBlur = 16 + pulse * 10;
    } else {
      ctx.globalAlpha = 0.85;
    }
    if (portrait && portrait.complete && portrait.naturalWidth > 0) {
      ctx.drawImage(portrait, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.fillStyle = this.defeated ? "#1E293B" : "#7F1D1D";
      ctx.beginPath();
      ctx.arc(0, 0, drawW / 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Name plate + hit counter, always visible once awake so the fight's
    // progress reads clearly even mid-chase.
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 12px 'Share Tech Mono', monospace";
    ctx.fillStyle = this.defeated ? "#22C55E" : "#EF4444";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 6;
    ctx.fillText(this.defeated ? `${this.name.toUpperCase()} — DOWN` : this.name.toUpperCase(), cx, this.y - drawH * 0.55 - 4);
    if (!this.defeated) {
      ctx.font = "bold 11px 'Share Tech Mono', monospace";
      ctx.fillStyle = "#FACC15";
      ctx.fillText(`HITS ${this.hitsTaken}/${this.maxHits}`, cx, this.y - drawH * 0.55 + 12);
    }
    ctx.restore();

    if (this.paralyzed) {
      ctx.save();
      ctx.font = "bold 14px 'Share Tech Mono', monospace";
      ctx.fillStyle = "#38BDF8";
      ctx.textAlign = "center";
      ctx.shadowColor = "#38BDF8";
      ctx.shadowBlur = 6;
      ctx.fillText("Zzz", cx, this.y - drawH * 0.55 - 20);
      ctx.restore();
    } else if (this.alert && !this.defeated) {
      ctx.save();
      ctx.font = "bold 18px 'Share Tech Mono', monospace";
      ctx.fillStyle = "#EF4444";
      ctx.textAlign = "center";
      ctx.shadowColor = "#EF4444";
      ctx.shadowBlur = 10;
      ctx.fillText("!", cx, this.y - drawH * 0.55 - 20);
      ctx.restore();
    }
  }
}

/* ============================================================
   ACT 2 ENEMIES — Server Farms (Story floors 4-7)

   Two new hazard types that change *how* the player has to move
   rather than just adding more of the same patrolling guard:

     - SpotlightDrone hunts by vertical light cone, so the danger
       is standing in the wrong column, not sharing a walkway.
     - TrackerHound is a ground enemy that, once it has your
       scent, effectively doesn't let go — the counter is stunning
       it or breaking line of sight for much longer than an
       ordinary guard requires.
   ============================================================ */

/** A ceiling-mounted drone that sweeps horizontally and projects a
 *  downward-widening light cone. Anything caught in the cone is spotted —
 *  which means the safe play is timing a crossing between sweeps, or
 *  killing the floor's lights first (see platformer.js's light switches,
 *  which set `disabled` on every drone for a window).
 *
 *  Deliberately NOT a SecurityGuard subclass: it flies (no ground row, no
 *  patrol-vs-chase state machine) and detects by cone geometry rather than
 *  a same-walkway box, so almost nothing in the base class would apply. It
 *  exposes the same `paralyzed`/`killed`/`getBounds()` surface platformer.js
 *  already checks, so the stun ability and the gun work on it for free. */
class SpotlightDrone {
  /**
   * @param {number} x,y      top-left of the drone body (level-local px)
   * @param {number} rangeTiles how far it sweeps either side of x
   * @param {number} speed    sweep speed px/sec
   * @param {number} tileSize used for range + cone length conversion
   * @param {object} opts     { coneLength (tiles), coneHalfAngle (radians) }
   */
  constructor(x, y, rangeTiles, speed, tileSize, opts) {
    opts = opts || {};
    this.originX = x;
    this.x = x;
    this.y = y;
    this.w = 30;
    this.h = 20;
    this.range = rangeTiles * tileSize;
    this.speed = speed;
    this.dir = 1;
    this.animT = Math.random() * 10;
    this.coneLength = (opts.coneLength || 5) * tileSize;
    this.coneHalfAngle = opts.coneHalfAngle || 0.42; // ~24 degrees
    this.alert = false;
    // Shared vocabulary with SecurityGuard so platformer.js's existing
    // stun-targeting / gun / touch-fail loops need no special cases.
    this.paralyzed = false;
    this.paralyzedT = 0;
    this.paralyzedMax = 0;
    this.gunHitsTaken = 0;
    this.killed = false;
    this.isDrone = true;
    // Flipped by a hacked light switch — a dark room blinds the drone
    // completely for the duration (see platformer.js's lightsOutT).
    this.disabled = false;
  }

  paralyze(duration) {
    this.paralyzed = true;
    this.paralyzedT = duration;
    this.paralyzedMax = duration;
    this.alert = false;
  }

  takeGunHit(duration) {
    if (this.killed) return;
    this.gunHitsTaken++;
    if (this.gunHitsTaken >= GUN_KILL_HITS) {
      this.killed = true;
      this.paralyzed = false;
      this.paralyzedT = 0;
      this.alert = false;
    } else {
      this.paralyze(duration);
    }
  }

  update(dt, player) {
    if (this.killed) return;
    this.animT += dt;
    if (this.paralyzed) {
      this.paralyzedT -= dt;
      if (this.paralyzedT <= 0) { this.paralyzed = false; this.paralyzedT = 0; }
      return;
    }
    this.x += this.dir * this.speed * dt;
    if (this.x > this.originX + this.range) { this.x = this.originX + this.range; this.dir = -1; }
    if (this.x < this.originX - this.range) { this.x = this.originX - this.range; this.dir = 1; }
    this.alert = !!player && this.coneContains(player);
  }

  /** Cone test: the player has to be BELOW the drone, within the cone's
   *  vertical reach, and inside the cone's half-width at their own depth
   *  (which widens linearly with distance — a real cone, not a column). */
  coneContains(player) {
    if (this.disabled || this.paralyzed || this.killed) return false;
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const originX = this.x + this.w / 2;
    const originY = this.y + this.h;
    const depth = py - originY;
    if (depth < 0 || depth > this.coneLength) return false;
    const halfWidth = Math.tan(this.coneHalfAngle) * depth;
    return Math.abs(px - originX) <= halfWidth;
  }

  /** A drone's own body is harmless to bump — being *seen* is the failure,
   *  which platformer.js checks via coneContains(). Returning an
   *  off-screen box keeps it out of the shared touch-fail loop without
   *  needing a special case there. */
  getBounds() {
    return { left: -99999, right: -99998, top: -99999, bottom: -99998 };
  }

  draw(ctx, reducedMotion) {
    if (this.killed) return;
    const originX = this.x + this.w / 2;
    const originY = this.y + this.h;
    const lit = !this.disabled && !this.paralyzed;

    if (lit) {
      const halfWidth = Math.tan(this.coneHalfAngle) * this.coneLength;
      const grad = ctx.createLinearGradient(originX, originY, originX, originY + this.coneLength);
      const hot = this.alert ? "239,68,68" : "250,204,21";
      grad.addColorStop(0, `rgba(${hot},0.42)`);
      grad.addColorStop(1, `rgba(${hot},0.02)`);
      ctx.save();
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX - halfWidth, originY + this.coneLength);
      ctx.lineTo(originX + halfWidth, originY + this.coneLength);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(originX, this.y + this.h / 2);
    const bob = reducedMotion ? 0 : Math.sin(this.animT * 3) * 1.5;
    ctx.translate(0, bob);
    ctx.fillStyle = this.paralyzed ? "#1E293B" : "#334155";
    ctx.strokeStyle = this.paralyzed ? "#38BDF8" : (this.alert ? "#EF4444" : "#FACC15");
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Lens
    ctx.fillStyle = lit ? (this.alert ? "#EF4444" : "#FDE68A") : "#0F172A";
    ctx.beginPath();
    ctx.arc(0, this.h / 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (this.alert) {
      ctx.save();
      ctx.font = "bold 16px 'Share Tech Mono', monospace";
      ctx.fillStyle = "#EF4444";
      ctx.textAlign = "center";
      ctx.shadowColor = "#EF4444";
      ctx.shadowBlur = 8;
      ctx.fillText("!", originX, this.y - 6);
      ctx.restore();
    }
  }
}

/** A low, fast ground pursuer. Mechanically a SecurityGuard with the dials
 *  turned toward "relentless": it spots from further away, runs faster than
 *  it patrols by a wider margin, holds a chase far longer after losing
 *  sight, and roams on a much longer leash. The intended counter is the
 *  stun ability or a hacked light switch, not out-running it. */
class TrackerHound extends SecurityGuard {
  constructor(x, y, w, h, rangeTiles, speed, tileSize) {
    super(x, y, w, h, rangeTiles, speed, tileSize);
    this.isHound = true;
    this.sightRangeX = tileSize * 7.5;
    this.sightRangeY = tileSize * 1.4; // low to the ground — can't see up a level
    this.chaseSpeed = speed * 1.95;
    this.leash = tileSize * 14;
    this.loseSightGrace = 3.2; // vs. SecurityGuard's 1.1s
  }

  update(dt, player) {
    if (this.killed) return;
    if (this.paralyzed) { super.update(dt, player); return; }
    // Same flow as the base class, but with a much longer memory before it
    // gives up. Re-implemented rather than parameterized in the base class
    // so ordinary guards keep their exact existing tuning untouched.
    const canSee = player && this.canSpot(player);
    if (canSee) {
      this.alert = true;
      this.loseSightT = 0;
    } else if (this.alert) {
      this.loseSightT += dt;
      if (this.loseSightT > this.loseSightGrace) this.alert = false;
    }
    if (this.alert && player) {
      const targetCx = player.x + player.w / 2 - this.w / 2;
      const clamped = Math.max(this.originX - this.leash, Math.min(this.originX + this.leash, targetCx));
      this.dir = clamped > this.x ? 1 : clamped < this.x ? -1 : this.dir;
      this.x += this.dir * this.chaseSpeed * dt;
      this.x = Math.max(this.originX - this.leash, Math.min(this.originX + this.leash, this.x));
    } else {
      this.x += this.dir * this.speed * dt;
      if (this.x > this.originX + this.range) { this.x = this.originX + this.range; this.dir = -1; }
      if (this.x < this.originX - this.range) { this.x = this.originX - this.range; this.dir = 1; }
    }
    this.animT += dt;
  }

  /** Drawn as a squat quadruped silhouette rather than the guard sprite —
   *  it needs to read as a different *kind* of threat at a glance, and it's
   *  deliberately short enough to be jumped over in a pinch. */
  draw(ctx, reducedMotion) {
    if (this.killed) return;
    const cx = this.x + this.w / 2;
    const feetY = this.y + this.h;
    const bodyH = this.h * 0.62;
    const bodyY = feetY - bodyH;
    const shakeX = this.paralyzed && !reducedMotion ? Math.sin(this.animT * 30) * 1.5 : 0;
    const gait = this.paralyzed || reducedMotion ? 0 : Math.sin(this.animT * (this.alert ? 18 : 10)) * 2.5;

    ctx.save();
    ctx.translate(cx + shakeX, 0);
    if (this.dir < 0) ctx.scale(-1, 1);
    ctx.fillStyle = this.paralyzed ? "#1E293B" : "#4C1D24";
    ctx.strokeStyle = this.paralyzed ? "#38BDF8" : "#EF4444";
    ctx.lineWidth = 2;
    if (this.alert && !this.paralyzed) { ctx.shadowColor = "#EF4444"; ctx.shadowBlur = 12; }
    // Body
    ctx.beginPath();
    ctx.ellipse(0, bodyY + bodyH / 2, this.w / 2, bodyH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Head
    ctx.beginPath();
    ctx.ellipse(this.w * 0.42, bodyY + bodyH * 0.32, this.w * 0.26, bodyH * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Legs
    ctx.strokeStyle = this.paralyzed ? "#38BDF8" : "#7F1D1D";
    ctx.lineWidth = 3;
    [-this.w * 0.28, this.w * 0.24].forEach((lx, i) => {
      const swing = i === 0 ? gait : -gait;
      ctx.beginPath();
      ctx.moveTo(lx, bodyY + bodyH * 0.8);
      ctx.lineTo(lx + swing, feetY);
      ctx.stroke();
    });
    // Sensor eye
    ctx.fillStyle = this.paralyzed ? "#38BDF8" : (this.alert ? "#FCA5A5" : "#EF4444");
    ctx.beginPath();
    ctx.arc(this.w * 0.5, bodyY + bodyH * 0.26, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (this.paralyzed) {
      ctx.save();
      ctx.font = "bold 13px 'Share Tech Mono', monospace";
      ctx.fillStyle = "#38BDF8";
      ctx.textAlign = "center";
      ctx.fillText("Zzz", cx, bodyY - 6);
      ctx.restore();
    } else if (this.alert) {
      ctx.save();
      ctx.font = "bold 16px 'Share Tech Mono', monospace";
      ctx.fillStyle = "#EF4444";
      ctx.textAlign = "center";
      ctx.shadowColor = "#EF4444";
      ctx.shadowBlur = 8;
      ctx.fillText("!", cx, bodyY - 6);
      ctx.restore();
    }
  }
}

/* ============================================================
   ACT 3 ENEMIES — Executive Suites (Story floors 8-10)
   ============================================================ */

/** An armored guard that shrugs off the first stun. The first hit only
 *  staggers it (a fraction of the normal freeze — enough to react to, not
 *  enough to walk past safely); the second lands a full-duration paralyze
 *  and resets the counter. Everything else — patrol, chase, touch-fail,
 *  gun interaction — is inherited unchanged. */
class EliteGuard extends SecurityGuard {
  constructor(x, y, w, h, rangeTiles, speed, tileSize, opts) {
    super(x, y, w, h, rangeTiles, speed, tileSize);
    opts = opts || {};
    this.isElite = true;
    this.stunsToFreeze = opts.stunsToFreeze || 2;
    this.stunHits = 0;
    this.staggerRatio = 0.22; // fraction of a normal freeze a partial hit buys
    this.sightRangeX = tileSize * 6.5;
    this.chaseSpeed = speed * 1.7;
  }

  paralyze(duration) {
    this.stunHits++;
    if (this.stunHits >= this.stunsToFreeze) {
      this.stunHits = 0;
      super.paralyze(duration);
    } else {
      // Armor holds — a brief stagger, and the chase drops for a beat.
      super.paralyze(duration * this.staggerRatio);
      this.staggered = true;
    }
  }

  draw(ctx, reducedMotion) {
    super.draw(ctx, reducedMotion);
    if (this.killed) return;
    const cx = this.x + this.w / 2;
    // Armor pips: one filled per stun already landed, so the player can see
    // that the first hit registered and a second will actually freeze it.
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 10px 'Share Tech Mono', monospace";
    ctx.fillStyle = "#FACC15";
    ctx.shadowColor = "#FACC15";
    ctx.shadowBlur = 5;
    const pips = "◆".repeat(this.stunsToFreeze - this.stunHits) + "◇".repeat(this.stunHits);
    ctx.fillText(pips, cx, this.y - 20);
    ctx.restore();
  }
}

/** The Floor 10 finale: a multi-phase fight rather than a longer version of
 *  Floor 5's Auditor. Total hits = phases x hitsPerPhase; every time a
 *  phase's quota is met the boss becomes briefly INVULNERABLE while it
 *  "recompiles" (a visible window where hits do nothing), then returns
 *  faster and with a longer reach. That transition is what makes it read as
 *  multi-phase instead of a single long health bar: the player has to
 *  disengage and re-approach three separate times, and the fight they
 *  re-enter each time is meaningfully harder than the last. */
class FinalBoss extends Boss {
  constructor(x, y, w, h, rangeTiles, speed, tileSize, opts) {
    super(x, y, w, h, rangeTiles, speed, tileSize, opts);
    opts = opts || {};
    this.isFinalBoss = true;
    this.phases = opts.phases || 3;
    this.hitsPerPhase = opts.hitsPerPhase || 2;
    this.maxHits = this.phases * this.hitsPerPhase;
    this.phase = 1;
    this.phaseShiftT = 0;          // >0 = mid-transition, invulnerable
    this.phaseShiftDuration = 2.4;
    this.baseSpeed = speed;
    this.baseSightX = this.sightRangeX;
  }

  /** True while the boss is recompiling between phases — hits are ignored
   *  and it can't fail the run on touch (platformer.js reads this the same
   *  way it reads `paralyzed`). */
  get invulnerable() {
    return this.phaseShiftT > 0;
  }

  paralyze(duration) {
    if (this.defeated || this.invulnerable) return;
    this.hitsTaken++;
    if (this.hitsTaken >= this.maxHits) {
      this.defeated = true;
      this.paralyzed = false;
      this.paralyzedT = 0;
      this.alert = false;
      return;
    }
    if (this.hitsTaken % this.hitsPerPhase === 0) {
      // Phase quota met — drop into the transition instead of a freeze.
      this.phase = Math.min(this.phases, this.phase + 1);
      this.phaseShiftT = this.phaseShiftDuration;
      this.paralyzed = false;
      this.paralyzedT = 0;
      this.alert = false;
      // Each phase is genuinely harder, not just a reskin of the last.
      this.chaseSpeed = this.baseSpeed * (1.7 + 0.35 * (this.phase - 1));
      this.sightRangeX = this.baseSightX * (1 + 0.22 * (this.phase - 1));
    } else {
      SecurityGuard.prototype.paralyze.call(this, duration);
    }
  }

  update(dt, player) {
    if (this.defeated) { this.animT += dt; return; }
    if (this.phaseShiftT > 0) {
      this.phaseShiftT = Math.max(0, this.phaseShiftT - dt);
      this.animT += dt;
      return; // frozen in place while recompiling
    }
    super.update(dt, player);
  }

  draw(ctx, reducedMotion) {
    super.draw(ctx, reducedMotion);
    if (this.defeated) return;
    const cx = this.x + this.w / 2;
    const topY = this.y - this.h * 1.3 - 4;

    // Phase readout, so "why did my hit do nothing" is never a mystery.
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 11px 'Share Tech Mono', monospace";
    if (this.invulnerable) {
      const flash = reducedMotion ? 1 : 0.5 + Math.sin(this.animT * 12) * 0.5;
      ctx.globalAlpha = 0.55 + flash * 0.45;
      ctx.fillStyle = "#A855F7";
      ctx.shadowColor = "#A855F7";
      ctx.shadowBlur = 10;
      ctx.fillText(`RECOMPILING — PHASE ${this.phase}`, cx, topY - 14);
    } else {
      ctx.fillStyle = "#A855F7";
      ctx.shadowColor = "#A855F7";
      ctx.shadowBlur = 6;
      ctx.fillText(`PHASE ${this.phase}/${this.phases}`, cx, topY - 14);
    }
    ctx.restore();

    if (this.invulnerable && !reducedMotion) {
      // A visible shield bubble during the transition.
      ctx.save();
      ctx.strokeStyle = "#A855F7";
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.4 + Math.sin(this.animT * 8) * 0.25;
      ctx.beginPath();
      ctx.arc(cx, this.y + this.h / 2, this.h * 1.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
