/* ============================================================
   platformer.js
   The Dangerous-Dave-style side-scrolling engine for every STORY
   MODE floor. Real gravity, running, jumping, and ladder-climbing
   over a tile-based level, with actively-hunting Security Guards
   throughout. Two level modes, chosen per floor via `floor.mode`:

     - "trophy" (the default) — collect every trophy, then reach the
       door (which stays locked until all trophies are collected).
     - "choice" — the former quiz/treasure floors. No trophies/door;
       instead the maze contains a handful of lettered terminal
       markers (`floor.platform.choices`, index-aligned with
       `floor.quiz.options` or `floor.treasure.items`). Touching the
       one correct marker solves the floor; touching any other one
       fails it immediately, same as a guard catch.

   Physics constants (tuned together — see the authoring note in
   floors-data.js): with GRAVITY=1800 and JUMP_VELOCITY=-620, the
   jump arc peaks at v^2/(2g) ~= 107px (~2.7 tiles) and covers
   ~150px (~3.7 tiles) of horizontal distance at RUN_SPEED, which is
   why every level keeps gaps to <=3 tiles and step-ups to <=2 tiles.

   The player also carries a limited-charge guard-stun ability (Fire key —
   see game.js's input.fire): a short-range shot that temporarily paralyzes
   one guard for a few seconds, safe to walk past while frozen. Charges are
   scarce and cooldown-gated, but a successful hit drops a pickup at the
   guard's feet worth one charge back — see tryFireStun(). "choice" mode
   floors also get a persistent on-screen clue panel (drawChoiceClue())
   reminding the player of the question/options shown on the pre-level
   briefing, since it's easy to forget mid-maze while dodging guards.

   A "choice" floor can also carry a `boss` field (currently just Floor 5
   — see floors-data.js) for a tougher, named mid-run gauntlet: dormant
   until the quiz is answered correctly (see activateBoss()), then it has
   to be stunned multiple times (guards.js's Boss overrides paralyze() to
   track hits) before the floor's door — which a plain "choice" floor
   doesn't otherwise have — unlocks (see doorUnlocked()).

   Usage: Platformer.start(floor, canvas, ctx, callbacks) where
   callbacks = { onTrophy(pointsGained), onSolve(), onFail(reasonKey) }.
   reasonKey is "guard", "pit", or "wrongchoice". Depends on
   floors-data.js (floor shape, CHOICE_LETTERS), guards.js
   (SecurityGuard, now with spot-and-chase AI and paralyze()), and
   sprites.js (image assets).
   ============================================================ */

const Platformer = (function () {
  "use strict";

  const TILE = 40;
  const GRAVITY = 1800;
  const JUMP_VELOCITY = -620;
  const RUN_SPEED = 220;
  const CLIMB_SPEED = 160;
  const PLAYER_W = 26;
  const PLAYER_H = 34;
  const GUARD_W = 26;
  const GUARD_H = 34;
  const LEVEL_OFFSET_Y = 120;
  const VIEW_WIDTH = 900;
  const VIEW_HEIGHT = 600;
  const TROPHY_SIZE = 24;
  const TROPHY_INSET = (TILE - TROPHY_SIZE) / 2;
  const CHOICE_SIZE = 30;
  const CHOICE_INSET = (TILE - CHOICE_SIZE) / 2;
  const CHOICE_COLORS = ["#38BDF8", "#4F46E5", "#22C55E", "#FACC15", "#EC4899", "#FB923C"];
  const NOTE_DURATION = 7; // seconds the in-level story note stays fully visible + fading
  const NOTE_FADE = 1.4; // of which, the final N seconds are a fade-out
  const BOSS_W = 34;
  const BOSS_H = 46;

  // ---- Guard-stun ability (temporary paralyze, Story Mode only) ----
  // A short-range, limited-charge "stun" the player fires with the Fire
  // key/button (see game.js's input.fire, story.js's storyPadFire). It
  // freezes a hit guard for STUN_PARALYZE_DURATION seconds — long enough to
  // slip past or grab a trophy/terminal it was guarding — but never removes
  // it permanently, so the floor's real difficulty stays intact. Charges are
  // scarce and gated by a cooldown so the player can't just spam it, and a
  // successfully-paralyzed guard drops a pickup at its feet worth one charge
  // back, giving a real risk/reward loop: spend a charge, then decide
  // whether it's worth walking back over to reclaim it before the guard
  // shakes it off and resumes hunting.
  const STUN_CHARGES_START = 3;
  const STUN_CHARGES_MAX = 3;
  const STUN_COOLDOWN = 0.9; // seconds between shots
  const STUN_RANGE = TILE * 3.2; // short-range, ~3 tiles
  const STUN_HEIGHT_TOLERANCE = TILE * 1.2; // roughly "same walkway"
  const STUN_PARALYZE_DURATION = 4.5; // seconds a hit guard is frozen
  const STUN_FLASH_DURATION = 0.16; // seconds the fired beam is visible
  const PICKUP_SIZE = 20;

  // ---- Boss gun pickup (Floor 5's "collect a gun from a guard" mechanic) ----
  // One specific guard per floor can carry a sidearm (floors-data.js's
  // `carriesGun` flag). Stunning that guard drops a second pickup that
  // grants the player an additional, unlimited-ammo, longer-range attack
  // against that floor's boss — alongside the existing stun-hit mechanic,
  // not a replacement for it (both call the same Boss.paralyze(), so both
  // count toward the same hitsTaken total). See tryFireGunAtBoss().
  const GUN_RANGE = TILE * 6.5;
  const GUN_COOLDOWN = 0.55;

  // ---- Mario-style bonus content ----
  // Generated procedurally from each floor's already-authored, already-
  // verified platform geometry (not hand-placed per floor in
  // floors-data.js) so every existing level gains these for free without
  // touching its tuned layout. Everything here is placed to never block
  // the floor's real route — see buildBonusPickups() for the placement
  // rules — so it's purely additive difficulty/reward, never a new way to
  // get stuck.
  const COIN_SCORE = 10;
  const COINS_PER_FLOOR = 6;
  const SHIELD_DURATION = 6; // seconds of guard/minion-touch immunity
  const MINION_W = 26, MINION_H = 22;
  const MINIONS_PER_FLOOR = 2;
  const MOVING_PLATFORM_SPEED = 55;
  const MOVING_PLATFORM_RANGE = TILE * 1.7;

  // ---- Act 1: hackable light switches (floors 1-3) ----
  // A wall panel the player hacks with the Interact key (E — the same
  // input.interact flag FPS Mode's terminals already use, so no new key
  // binding was needed). Hacking one kills the floor's lights for a
  // window: every SpotlightDrone goes blind, and every ordinary guard's
  // horizontal sight range collapses to LIGHTS_OUT_SIGHT_SCALE of normal.
  // It's a stealth *tool*, not a free pass — the window is short, each
  // switch is one-use, and a guard that already has you stays alert.
  const LIGHTS_OUT_DURATION = 7.5;
  const LIGHTS_OUT_SIGHT_SCALE = 0.32;
  const SWITCH_W = 22, SWITCH_H = 30;
  const SWITCH_REACH = TILE * 1.4;

  // ---- Act 2: timed laser grids (floors 4-7) ----
  // A vertical beam on a fixed on/off cycle. Touching it while lit ends the
  // run exactly like a guard's touch; the counter is reading the rhythm and
  // crossing during the gap. `phase` staggers beams against each other so a
  // bank of them forms a pattern rather than a single wall.
  const LASER_W = 6;

  // ---- Act 3: vent navigation (floors 8-10) ----
  // Paired openings that move the player between two points on the level
  // (press Down, or Interact, while standing on one). Vents are the Act 3
  // answer to elite guards holding a corridor: a route that bypasses the
  // fight entirely if the player finds it.
  const VENT_W = 30, VENT_H = 26;
  const VENT_COOLDOWN = 0.8; // stops an instant round-trip on the exit pad

  let canvas, ctx;
  let level = null;
  let player = null;
  let guards = [];
  let trophies = [];
  let door = null;
  let choices = [];
  let mode = "trophy";
  let solids = [];
  let ladders = [];
  let camX = 0;
  let rafId = null;
  let lastFrame = 0;
  let running = false;
  let callbacks = null;
  let currentFloor = null;
  let doorPulseT = 0;
  let shakeTime = 0;
  let storyNoteText = "";
  let storyNoteTimer = 0;
  let choiceQuestion = ""; // "choice" mode's clue text, shown via drawChoiceClue()
  let stunCharges = 0;
  let stunCooldownT = 0;
  let gunCooldownT = 0;
  let pickups = [];
  let stunFlash = null; // { x0, x1, y, t, hit } — brief visual for a fired shot
  // Floor 5's mid-run boss gauntlet (see guards.js's Boss class,
  // floors-data.js's `boss` field). `boss` stays non-null for the whole
  // floor once built (it's the source of truth for its own state), but it
  // isn't pushed into `guards` — and so can't move, chase, be touched, or
  // be drawn — until activateBoss() runs, right after the floor's quiz is
  // answered correctly. `quizSolved` only matters on boss floors; on every
  // other "choice" floor the quiz answer solves the floor directly, same
  // as before this feature existed.
  let boss = null;
  let quizSolved = false;
  let minions = [];
  let movingPlatforms = [];
  let coinsCollected = 0;
  // Act 1-3 level features (see the constants above). All three are
  // authored per floor in floors-data.js and are simply absent (empty
  // arrays) on floors that don't use them, so every pre-existing floor
  // behaves exactly as it did before.
  let lightSwitches = [];
  let laserGrids = [];
  let vents = [];
  let lightsOutT = 0;
  let ventCooldownT = 0;

  function tileRect(col, row, len, rows) {
    return { x: col * TILE, y: row * TILE, w: (len || 1) * TILE, h: (rows || 1) * TILE };
  }

  function buildLevel(floor) {
    const p = floor.platform;
    mode = floor.mode === "choice" ? "choice" : "trophy";
    solids = p.platforms.map((pl) => tileRect(pl.col, pl.row, pl.len, pl.rows));
    ladders = p.ladders.map((l) => ({
      x: l.col * TILE, w: TILE,
      y: l.rowTop * TILE, h: (l.rowBottom - l.rowTop + 1) * TILE,
    }));
    // A floor's guard entries can now name a `kind` (see floors-data.js's
    // Act notes). Anything without one stays an ordinary SecurityGuard, so
    // every floor authored before this existed is untouched. All four types
    // share the same paralyze/takeGunHit/getBounds/update/draw surface, so
    // they can all live in one `guards` array and every downstream loop
    // (stun targeting, gun targeting, touch-fail, draw) works unchanged.
    guards = p.guards.map((g) => {
      let entity;
      switch (g.kind) {
        case "drone":
          // Ceiling-mounted: its row is where it hangs, not a floor to
          // stand on, so it gets no GUARD_H offset.
          entity = new SpotlightDrone(g.col * TILE, g.row * TILE, g.rangeTiles, g.speed, TILE, {
            coneLength: g.coneLength, coneHalfAngle: g.coneHalfAngle,
          });
          break;
        case "hound":
          entity = new TrackerHound(g.col * TILE, g.row * TILE - GUARD_H, GUARD_W, GUARD_H, g.rangeTiles, g.speed, TILE);
          break;
        case "elite":
          entity = new EliteGuard(g.col * TILE, g.row * TILE - GUARD_H, GUARD_W, GUARD_H, g.rangeTiles, g.speed, TILE, {
            stunsToFreeze: g.stunsToFreeze || 2,
          });
          break;
        default:
          entity = new SecurityGuard(g.col * TILE, g.row * TILE - GUARD_H, GUARD_W, GUARD_H, g.rangeTiles, g.speed, TILE);
      }
      entity.carriesGun = !!g.carriesGun;
      // Remembered so a lights-out window can scale sight range down and
      // then restore the guard's own authored value, not a shared default.
      entity.baseSightRangeX = entity.sightRangeX;
      return entity;
    });

    boss = null;
    quizSolved = false;

    if (mode === "choice") {
      trophies = [];
      const options = floor.quiz ? floor.quiz.options : (floor.treasure ? floor.treasure.items.map((it) => it.label) : []);
      const correctIndex = floor.quiz ? floor.quiz.correctIndex : (floor.treasure ? floor.treasure.items.findIndex((it) => it.isTarget) : -1);
      choiceQuestion = floor.quiz ? floor.quiz.question : (floor.treasure ? floor.treasure.clue : "");
      choices = p.choices.map((c, i) => ({
        x: c.col * TILE + CHOICE_INSET, y: c.row * TILE + CHOICE_INSET,
        w: CHOICE_SIZE, h: CHOICE_SIZE,
        letter: CHOICE_LETTERS[i] || String(i + 1),
        label: options[i] || "",
        correct: i === correctIndex,
        resolved: false,
      }));
      door = floor.boss && floor.boss.door
        ? { x: floor.boss.door.col * TILE, y: floor.boss.door.row * TILE, w: TILE, h: TILE }
        : null;
    } else {
      trophies = p.trophies.map((t) => ({
        x: t.col * TILE + TROPHY_INSET, y: t.row * TILE + TROPHY_INSET,
        w: TROPHY_SIZE, h: TROPHY_SIZE, collected: false,
      }));
      door = { x: p.door.col * TILE, y: p.door.row * TILE, w: TILE, h: TILE };
      choices = [];
      choiceQuestion = "";
    }

    // Boss construction is deliberately OUTSIDE the mode branch above.
    // Floor 5's Auditor sits on a "choice" floor (its quiz wakes the boss),
    // but Floor 10's finale is a "trophy" floor — collecting every trophy
    // is what wakes it, and its door then leads to the password terminal.
    // Keeping this in one place means either mode can carry an encounter.
    if (floor.boss) {
      const b = floor.boss;
      // A `phases` field promotes the encounter to the multi-phase
      // FinalBoss (Floor 10's finale); without it, it stays the original
      // single-phase Boss that Floor 5's Auditor has always used.
      boss = b.phases
        ? new FinalBoss(
            b.col * TILE, b.row * TILE - BOSS_H, BOSS_W, BOSS_H,
            b.rangeTiles || 2, b.speed || 130, TILE,
            { name: b.name, phases: b.phases, hitsPerPhase: b.hitsPerPhase || 2 }
          )
        : new Boss(
            b.col * TILE, b.row * TILE - BOSS_H, BOSS_W, BOSS_H,
            b.rangeTiles || 2, b.speed || 130, TILE,
            { name: b.name, hp: b.hp || 3 }
          );
    }

    // ---- Act 1-3 level features ----
    lightSwitches = (p.lightSwitches || []).map((s) => ({
      x: s.col * TILE + (TILE - SWITCH_W) / 2,
      y: s.row * TILE - SWITCH_H,
      w: SWITCH_W, h: SWITCH_H,
      hacked: false,
    }));
    laserGrids = (p.lasers || []).map((l) => ({
      x: l.col * TILE + (TILE - LASER_W) / 2,
      y: l.rowTop * TILE,
      w: LASER_W,
      h: (l.rowBottom - l.rowTop + 1) * TILE,
      cycle: l.cycle || 3.0,     // full on+off period, seconds
      onRatio: l.onRatio || 0.5, // fraction of the cycle the beam is lit
      phase: l.phase || 0,       // offset so a bank of beams staggers
      t: (l.phase || 0) * (l.cycle || 3.0),
      on: true,
    }));
    vents = (p.vents || []).map((v) => ({
      from: { x: v.from.col * TILE + (TILE - VENT_W) / 2, y: v.from.row * TILE - VENT_H, w: VENT_W, h: VENT_H },
      to: { x: v.to.col * TILE + (TILE - VENT_W) / 2, y: v.to.row * TILE - VENT_H, w: VENT_W, h: VENT_H },
      twoWay: v.twoWay !== false,
    }));
    lightsOutT = 0;
    ventCooldownT = 0;

    const startX = p.playerStart.col * TILE + (TILE - PLAYER_W) / 2;
    const startY = p.playerStart.row * TILE - PLAYER_H;
    player = {
      x: startX, y: startY, w: PLAYER_W, h: PLAYER_H,
      vx: 0, vy: 0, onGround: false, climbing: false,
      facing: "right", isMoving: false, animT: 0,
      hasGun: false, shieldT: 0,
    };

    level = { widthPx: p.width * TILE, heightPx: 10 * TILE };
    camX = 0;
    doorPulseT = 0;
    shakeTime = 0;

    // Every floor hands the player a fresh, small pool of stun charges —
    // deliberately reset per floor (not carried over) so the ability stays
    // a per-room tactical resource rather than something to hoard across
    // the whole run.
    stunCharges = STUN_CHARGES_START;
    stunCooldownT = 0;
    gunCooldownT = 0;
    pickups = [];
    stunFlash = null;
    minions = [];
    movingPlatforms = [];
    coinsCollected = 0;
    window.CG.input.fire = false;
    window.CG.input.gunFire = false;
    window.CG.input.interact = false;

    buildBonusPickups(p);
  }

  /** Mario-style bonus content — coins, a shield power-up, stompable
   *  minions, and one small optional moving platform — derived from this
   *  floor's own `p.platforms` list rather than authored per floor.
   *  Placement rules, all in service of "purely additive, never blocks
   *  the real route": skip the segment the player starts on and (on
   *  trophy floors) the door's own segment; skip any tile a trophy/
   *  choice-marker/guard already occupies; and give the moving platform
   *  to the last wide-enough segment so it's always an out-of-the-way
   *  detour, never mandatory. */
  function buildBonusPickups(p) {
    const startCol = p.playerStart.col;
    const doorCol = mode === "trophy" && p.door ? p.door.col : null;

    // Trophies/choice terminals are drawn standing on top of their
    // platform tile (one row above it), so a same-column pickup/minion
    // placed on the platform's own row would sit immediately underneath
    // one — close enough to overlap it. Reserve the whole column, not
    // just the exact row, for a small vertical band around each.
    const reservedPoints = [
      ...(p.trophies || []),
      ...(p.choices || []),
      ...(p.guards || []),
      // Act 1-3 features claim their tiles too, so a bonus coin or a
      // patrolling minion can never sit on top of a light switch's "E"
      // prompt or a vent mouth and make either unreadable/unusable.
      ...(p.lightSwitches || []),
      ...(p.vents || []).flatMap((v) => [v.from, v.to]),
      ...(p.lasers || []).map((l) => ({ col: l.col, row: l.rowBottom })),
    ];
    function isReserved(col, row) {
      return reservedPoints.some((r) => r.col === col && Math.abs(r.row - row) <= 1);
    }

    const segments = (p.platforms || [])
      .map((pl) => ({ col: pl.col, row: pl.row, len: pl.len || 1 }))
      .filter((seg) => seg.len >= 2)
      .sort((a, b) => a.col - b.col);

    // Candidate placement tiles: up to two per segment, at the 1/3 and
    // 2/3 marks of that segment's own *safe* columns (start/door/
    // reserved tiles filtered out first) rather than of the raw
    // segment — so one unlucky reserved tile near the middle doesn't
    // waste the whole segment, it just shifts the marks over within
    // whatever's left.
    const candidates = [];
    segments.forEach((seg) => {
      const safeCols = [];
      for (let col = seg.col; col <= seg.col + seg.len - 1; col++) {
        if (Math.abs(col - startCol) < 2) continue; // too close to the player's start
        if (doorCol != null && Math.abs(col - doorCol) < 2) continue; // too close to the door
        if (isReserved(col, seg.row)) continue; // trophy/choice/guard tile (or directly under/over one)
        safeCols.push(col);
      }
      if (!safeCols.length) return;
      const picks = safeCols.length >= 4
        ? [safeCols[Math.floor(safeCols.length / 3)], safeCols[Math.floor((safeCols.length * 2) / 3)]]
        : [safeCols[Math.floor(safeCols.length / 2)]];
      Array.from(new Set(picks)).forEach((col) => candidates.push({ col, row: seg.row, segLen: seg.len }));
    });

    // The moving platform floats well above its anchor row (2.3 tiles),
    // so — unlike a coin/minion sitting flush on its own segment — it
    // can reach into the airspace of a *different*, vertically-nearby
    // segment (a raised ledge feeding a trophy, say) and obstruct the
    // jump onto it. Prefer the widest candidate, but skip any whose
    // column overlaps another differently-rowed segment nearby.
    if (candidates.length) {
      const byWidthDesc = candidates.slice().sort((a, b) => b.segLen - a.segLen);
      const anchor = byWidthDesc.find((c) => !segments.some((seg) =>
        seg.row !== c.row && Math.abs(seg.row - c.row) <= 4 &&
        c.col >= seg.col - 2 && c.col <= seg.col + seg.len - 1 + 2
      ));
      if (anchor) {
        candidates.splice(candidates.indexOf(anchor), 1);
        const originX = anchor.col * TILE - TILE * 0.7;
        movingPlatforms.push({
          originX, x: originX, y: anchor.row * TILE - TILE * 2.3,
          w: TILE * 1.4, h: 12, range: MOVING_PLATFORM_RANGE,
          dir: 1, speed: MOVING_PLATFORM_SPEED, deltaX: 0,
        });
      }
    }

    // Reserve one spot for the shield power-up up front — only when at
    // least one other candidate remains for a coin/minion — so it can
    // never cannibalize a floor's only coin the way a post-hoc
    // "convert the last coin" pass could.
    let shieldSpot = null;
    if (candidates.length >= 2) {
      shieldSpot = candidates.pop();
    }

    let coinBudget = COINS_PER_FLOOR;
    let minionBudget = MINIONS_PER_FLOOR;

    candidates.forEach((c, i) => {
      if (i % 2 === 1 && minionBudget > 0 && c.segLen >= 3) {
        // Capped so a minion patrols a local stretch, not the whole
        // width of a long segment — keeps it dodgeable with a single
        // well-timed jump instead of camping the entire walkway. Also
        // shrunk to stay clear of any reserved column (a trophy/choice
        // one row up) within reach — its safe *anchor* tile alone
        // isn't enough, since the patrol itself could still wander
        // into one.
        let marginTiles = Math.min(2.2, Math.max(0.6, (c.segLen - 1.6) / 2));
        const nearbyReservedCols = reservedPoints
          .filter((r) => Math.abs(r.row - c.row) <= 1)
          .map((r) => Math.abs(r.col - c.col));
        if (nearbyReservedCols.length) {
          marginTiles = Math.min(marginTiles, Math.max(0.3, Math.min(...nearbyReservedCols) - 1));
        }
        minions.push({
          originX: c.col * TILE + TILE / 2,
          x: c.col * TILE + TILE / 2 - MINION_W / 2,
          y: c.row * TILE - MINION_H,
          w: MINION_W, h: MINION_H,
          range: marginTiles * TILE, dir: 1, speed: 50, animT: 0, alive: true,
        });
        minionBudget--;
      } else if (coinBudget > 0) {
        pickups.push({
          x: c.col * TILE + (TILE - PICKUP_SIZE) / 2,
          y: c.row * TILE - PICKUP_SIZE - 6,
          w: PICKUP_SIZE, h: PICKUP_SIZE, collected: false, type: "coin",
        });
        coinBudget--;
      }
    });

    if (shieldSpot) {
      pickups.push({
        x: shieldSpot.col * TILE + (TILE - PICKUP_SIZE) / 2,
        y: shieldSpot.row * TILE - PICKUP_SIZE - 6,
        w: PICKUP_SIZE, h: PICKUP_SIZE, collected: false, type: "shield",
      });
    }
  }

  function bounds(e) {
    return { left: e.x, right: e.x + e.w, top: e.y, bottom: e.y + e.h };
  }

  function hitsAnySolid(r) {
    if (solids.some((s) => aabbOverlap(r, { left: s.x, right: s.x + s.w, top: s.y, bottom: s.y + s.h }))) return true;
    // Moving platforms collide the same as any other solid at their
    // current (this-frame) position — see updateMovingPlatforms().
    return movingPlatforms.some((mp) => aabbOverlap(r, { left: mp.x, right: mp.x + mp.w, top: mp.y, bottom: mp.y + mp.h }));
  }

  /** Advances every moving platform and records how far it moved this
   *  frame (`deltaX`) so a player standing on top can be carried along —
   *  see the "ride" step in update(). Purely horizontal, bounded to
   *  [originX, originX + range], reversing direction at either end. */
  function updateMovingPlatforms(dt) {
    movingPlatforms.forEach((mp) => {
      const prevX = mp.x;
      mp.x += mp.dir * mp.speed * dt;
      if (mp.x < mp.originX) { mp.x = mp.originX; mp.dir = 1; }
      if (mp.x > mp.originX + mp.range) { mp.x = mp.originX + mp.range; mp.dir = -1; }
      mp.deltaX = mp.x - prevX;
    });
  }

  /** Advances every stompable minion along its patrol range and resolves
   *  contact with the player: falling onto its top half defeats it
   *  (Mario-style stomp, with a little bounce); any other contact is a
   *  hazard exactly like a guard touch, unless the player currently has
   *  shield immunity. Returns true if contact just ended the run (so the
   *  caller knows to stop processing this frame), false otherwise. */
  function updateMinions(dt, pb) {
    for (const m of minions) {
      if (!m.alive) continue;
      m.x += m.dir * m.speed * dt;
      const leftBound = m.originX - m.range - m.w / 2;
      const rightBound = m.originX + m.range - m.w / 2;
      if (m.x < leftBound) { m.x = leftBound; m.dir = 1; }
      if (m.x > rightBound) { m.x = rightBound; m.dir = -1; }
      m.animT += dt;
      if (!aabbOverlap(pb, bounds(m))) continue;
      if (player.vy > 0 && pb.bottom - m.h * 0.5 <= m.y + 6) {
        m.alive = false;
        player.vy = JUMP_VELOCITY * 0.55;
        window.CG.audio.playHit();
      } else if (player.shieldT <= 0) {
        fail("minion");
        return true;
      }
    }
    return false;
  }

  /* ---------------- Act 1: hackable light switches ---------------- */

  /** Consumes the one-shot Interact flag: if the player is standing within
   *  reach of an un-hacked switch, kill the lights for LIGHTS_OUT_DURATION.
   *  Each switch is single-use, so a floor's total darkness budget is fixed
   *  by how many switches it was authored with. */
  function tryHackLightSwitch() {
    const pcx = player.x + player.w / 2;
    const pcy = player.y + player.h / 2;
    const target = lightSwitches.find((s) => !s.hacked
      && Math.abs((s.x + s.w / 2) - pcx) <= SWITCH_REACH
      && Math.abs((s.y + s.h / 2) - pcy) <= SWITCH_REACH * 1.4);
    if (!target) return false;
    target.hacked = true;
    lightsOutT = LIGHTS_OUT_DURATION;
    window.CG.audio.playCheckpoint();
    return true;
  }

  /** Applies (and expires) the lights-out window. Drones go fully blind;
   *  ordinary guards keep hunting but with a badly shortened sight range.
   *  Restoring from each entity's own remembered `baseSightRangeX` means a
   *  floor that authored a guard with a custom range gets that range back,
   *  not a shared default. */
  function updateLightsOut(dt) {
    const wasOut = lightsOutT > 0;
    if (lightsOutT > 0) lightsOutT = Math.max(0, lightsOutT - dt);
    const isOut = lightsOutT > 0;
    if (!wasOut && !isOut) return;
    guards.forEach((g) => {
      if (g.isDrone) { g.disabled = isOut; return; }
      const base = g.baseSightRangeX != null ? g.baseSightRangeX : g.sightRangeX;
      g.sightRangeX = isOut ? base * LIGHTS_OUT_SIGHT_SCALE : base;
    });
  }

  /* ---------------- Act 2: timed laser grids ---------------- */

  /** Advances every beam's on/off cycle and fails the run on contact with a
   *  lit one. Returns true if the run just ended. A shield does NOT save the
   *  player here — the shield is explicitly scoped to guard/minion contact,
   *  and a laser grid is an environmental hazard like a pit, not an enemy. */
  function updateLasers(dt, pb) {
    for (const lg of laserGrids) {
      lg.t += dt;
      const cyclePos = (lg.t % lg.cycle) / lg.cycle;
      lg.on = cyclePos < lg.onRatio;
      if (lg.on && aabbOverlap(pb, { left: lg.x, right: lg.x + lg.w, top: lg.y, bottom: lg.y + lg.h })) {
        fail("laser");
        return true;
      }
    }
    return false;
  }

  /* ---------------- Act 3: vent navigation ---------------- */

  /** Press Down (or Interact) while overlapping a vent mouth to travel to
   *  its pair. The cooldown stops the exit pad from immediately bouncing
   *  the player back if they're still holding Down on arrival. */
  function tryUseVent(pb) {
    if (ventCooldownT > 0) return false;
    for (const v of vents) {
      const hitFrom = aabbOverlap(pb, { left: v.from.x, right: v.from.x + v.from.w, top: v.from.y, bottom: v.from.y + v.from.h });
      const hitTo = v.twoWay && aabbOverlap(pb, { left: v.to.x, right: v.to.x + v.to.w, top: v.to.y, bottom: v.to.y + v.to.h });
      if (!hitFrom && !hitTo) continue;
      const dest = hitFrom ? v.to : v.from;
      player.x = dest.x + dest.w / 2 - player.w / 2;
      player.y = dest.y + dest.h - player.h;
      player.vx = 0;
      player.vy = 0;
      player.climbing = false;
      ventCooldownT = VENT_COOLDOWN;
      window.CG.audio.playCollect();
      return true;
    }
    return false;
  }

  // Uses the player's full vertical EXTENT (top..bottom), not a single
  // center point — a center-point check creates a dead zone at the top of
  // every up-ladder: to stand on the platform above, the player's feet
  // must reach the platform row, but by then their center has already
  // risen above the ladder's nominal top, so a center-only check would
  // flip "on ladder" to false a few pixels too early. With gravity/solid
  // collision re-engaging at that same instant (the platform tile is
  // still there), the player gets trapped oscillating just below the
  // surface, never able to finish the climb. An overlap check keeps
  // climbing available until the player's feet actually reach the
  // platform, then hands off cleanly to normal ground collision.
  function ladderAt(cx, top, bottom) {
    return ladders.find((l) => cx >= l.x && cx <= l.x + l.w && bottom >= l.y && top <= l.y + l.h);
  }

  /* ---------------- Lifecycle ---------------- */

  function start(floor, canvasEl, ctxEl, cb) {
    canvas = canvasEl;
    ctx = ctxEl;
    callbacks = cb;
    currentFloor = floor;
    buildLevel(floor);
    storyNoteText = (cb && cb.storyNote) || "";
    storyNoteTimer = storyNoteText ? NOTE_DURATION : 0;
    running = true;
    lastFrame = performance.now();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    update(dt);
    render();
    if (running) rafId = requestAnimationFrame(loop);
  }

  /* ---------------- Update ---------------- */

  function update(dt) {
    const input = window.CG.input;
    const centerX = player.x + player.w / 2;
    const onLadder = ladderAt(centerX, player.y, player.y + player.h);

    updateMovingPlatforms(dt);

    // Horizontal movement (always available, on ground, airborne, or on a ladder).
    let dx = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    player.isMoving = dx !== 0;
    if (dx !== 0) { player.facing = dx > 0 ? "right" : "left"; player.animT += dt; }
    player.vx = dx * RUN_SPEED;

    // Ladder climbing takes priority over gravity/jumping while engaged —
    // overlapping a ladder column and holding Up/Down starts a climb. Once
    // started, climbing stays "latched" (via the `player.climbing` term
    // below referring to *last* frame's value before this line overwrites
    // it) for as long as the player keeps overlapping the ladder column,
    // even after they let go of Up/Down — otherwise letting go mid-shaft
    // to stop and look around dropped straight back into gravity and the
    // player fell. Vertical speed still only moves while Up/Down is
    // actually held (see below), so releasing both simply hovers in place;
    // it's only *leaving* the ladder's column (or actually reaching solid
    // ground/the platform above) that ends the climb.
    player.climbing = !!onLadder && ((input.up || input.down) || player.climbing);

    if (player.climbing) {
      player.vy = (input.up ? -CLIMB_SPEED : 0) + (input.down ? CLIMB_SPEED : 0);
      player.onGround = false;
    } else {
      player.vy += GRAVITY * dt;
      if (player.onGround && input.up) {
        player.vy = JUMP_VELOCITY;
        player.onGround = false;
      }
    }

    // Safety net: a downward climb ends at ground level with collision
    // still skipped (that's what lets the player pass through the tile
    // their ladder's base sits on), so the very last climb step can end
    // with the player a hair *inside* the ground tile instead of exactly
    // on top of it. Once climbing stops, ordinary collision would revert
    // any horizontal move back to this same embedded spot every single
    // frame (still overlapping vertically) — a permanent, invisible wall.
    // Pop straight out of any such embed before this frame's movement is
    // resolved, so climbing can never leave the player stuck.
    if (!player.climbing) {
      const stuckIn = solids.find((s) => aabbOverlap(bounds(player), { left: s.x, right: s.x + s.w, top: s.y, bottom: s.y + s.h }));
      if (stuckIn) {
        player.y = stuckIn.y - player.h;
        player.vy = 0;
        player.onGround = true;
      }
    }

    // Resolve horizontal movement first. Tile collision is skipped while
    // climbing — a ladder's own column is allowed to coincide with a solid
    // platform tile at its top (that's how the player reaches it from the
    // platform in the first place), so colliding against that tile while
    // *climbing* through it would wrongly wall the player off mid-shaft.
    const prevX = player.x;
    player.x += player.vx * dt;
    player.x = Math.max(0, Math.min(level.widthPx - player.w, player.x));
    if (!player.climbing && hitsAnySolid(bounds(player))) player.x = prevX;

    // Then vertical, tracking ground contact.
    const prevY = player.y;
    player.y += player.vy * dt;
    if (player.climbing) {
      player.onGround = false;
    } else if (hitsAnySolid(bounds(player))) {
      if (player.vy > 0) player.onGround = true;
      player.y = prevY;
      player.vy = 0;
    } else {
      player.onGround = false;
    }

    // Ride any moving platform the player is currently standing on — a
    // simplified "carry" technique: just add its this-frame horizontal
    // delta on top of the player's own movement.
    if (player.onGround) {
      const feetY = player.y + player.h;
      const rider = movingPlatforms.find((mp) => Math.abs(feetY - mp.y) < 2 && player.x + player.w > mp.x && player.x < mp.x + mp.w);
      if (rider && rider.deltaX) {
        player.x += rider.deltaX;
        player.x = Math.max(0, Math.min(level.widthPx - player.w, player.x));
      }
    }

    // Fell into a pit — no floor anywhere below the level's lowest row.
    if (player.y > level.heightPx + 80) {
      fail("pit");
      return;
    }

    // Stun ability: consume the one-shot fire flag before guards act this
    // frame, so a guard hit right as it's about to reach the player is
    // already `paralyzed` by the time the fail-collision check below runs.
    if (stunCooldownT > 0) stunCooldownT = Math.max(0, stunCooldownT - dt);
    if (gunCooldownT > 0) gunCooldownT = Math.max(0, gunCooldownT - dt);
    if (player.shieldT > 0) player.shieldT = Math.max(0, player.shieldT - dt);
    if (input.fire) {
      input.fire = false;
      tryFireStun();
    }
    if (input.gunFire) {
      input.gunFire = false;
      tryFireGun();
    }
    if (stunFlash) {
      stunFlash.t -= dt;
      if (stunFlash.t <= 0) stunFlash = null;
    }

    // ---- Act 1-3 level features ----
    // Interact is consumed here (before guards act) for the same reason
    // the stun flag is: hacking the lights should blind a drone that would
    // otherwise spot the player on this very frame.
    if (ventCooldownT > 0) ventCooldownT = Math.max(0, ventCooldownT - dt);
    updateLightsOut(dt);
    const pbPre = bounds(player);
    if (input.interact) {
      input.interact = false;
      // One key, two Act mechanics — try the switch first, then the vent,
      // so a switch mounted beside a vent mouth still hacks rather than
      // silently teleporting the player away from it.
      if (!tryHackLightSwitch()) tryUseVent(pbPre);
    } else if (input.down && player.onGround) {
      tryUseVent(pbPre);
    }

    guards.forEach((g) => g.update(dt, player));
    const pb = bounds(player);

    // A spotlight cone catches the player the same way a guard's touch
    // does — being SEEN is the failure, so this is checked before the
    // ordinary contact loop below. The shield deliberately doesn't help:
    // it grants contact immunity, not invisibility.
    for (const g of guards) {
      if (g.isDrone && !g.killed && !g.paralyzed && g.coneContains(player)) { fail("spotlight"); return; }
    }

    if (updateLasers(dt, pb)) return;
    for (const g of guards) {
      // A paralyzed guard is deliberately safe to touch — that's the whole
      // point of the ability: it buys the player a window to slip past.
      // A defeated boss (see guards.js's Boss) is permanently safe, same
      // idea — `!g.defeated` is a no-op for every ordinary guard, which
      // never has that field. `!g.killed` is the same story for a guard
      // the gun has permanently removed. A player with active shield
      // immunity (see the "shield" pickup) is safe to touch anything.
      // `!g.invulnerable` covers FinalBoss's between-phase recompile window
      // (guards.js) — it's frozen and untouchable then, so bumping it
      // shouldn't end the run either. A no-op field on every other entity.
      if (player.shieldT <= 0 && !g.paralyzed && !g.defeated && !g.killed && !g.invulnerable
        && aabbOverlap(pb, g.getBounds())) { fail("guard"); return; }
    }

    if (updateMinions(dt, pb)) return;

    pickups.forEach((pk) => {
      if (!pk.collected && aabbOverlap(pb, bounds(pk))) {
        pk.collected = true;
        if (pk.type === "gun") {
          player.hasGun = true;
        } else if (pk.type === "shield") {
          player.shieldT = SHIELD_DURATION;
        } else if (pk.type === "coin") {
          coinsCollected++;
          if (callbacks && callbacks.onCoin) callbacks.onCoin(COIN_SCORE);
        } else {
          stunCharges = Math.min(STUN_CHARGES_MAX, stunCharges + 1);
        }
        window.CG.audio.playCollect();
      }
    });

    if (mode === "trophy") {
      trophies.forEach((t) => {
        if (!t.collected && aabbOverlap(pb, bounds(t))) {
          t.collected = true;
          window.CG.audio.playCollect();
          if (callbacks && callbacks.onTrophy) callbacks.onTrophy(25);
        }
      });
      // On a trophy floor carrying a boss (Floor 10's finale), collecting
      // the last trophy is what wakes it — the same beat Floor 5 gets from
      // answering its quiz. Until then the boss isn't in `guards` at all,
      // so it can't move, chase, be hit, or be drawn.
      if (boss && !quizSolved && trophies.every((t) => t.collected)) {
        quizSolved = true;
        activateBoss();
      }
    }

    doorPulseT += dt;
    if (shakeTime > 0) shakeTime = Math.max(0, shakeTime - dt);
    if (storyNoteTimer > 0) storyNoteTimer = Math.max(0, storyNoteTimer - dt);

    if (mode === "trophy") {
      if (doorUnlocked() && door && aabbOverlap(pb, bounds(door))) {
        solve();
        return;
      }
    } else if (!quizSolved) {
      for (const c of choices) {
        if (!c.resolved && aabbOverlap(pb, bounds(c))) {
          // Every marker resolves together once one is touched — the quiz
          // portion of the floor is over either way (solved or failed),
          // so a decoy marker sitting nearby afterward should never still
          // be a live threat to accidentally end the boss phase.
          choices.forEach((cc) => { cc.resolved = true; });
          if (c.correct) {
            window.CG.audio.playCollect();
            quizSolved = true;
            if (boss) activateBoss();
            else solve();
          } else {
            fail("wrongchoice");
          }
          return;
        }
      }
    } else if (boss && door && doorUnlocked() && aabbOverlap(pb, bounds(door))) {
      solve();
      return;
    }

    camX = Math.max(0, Math.min(level.widthPx - VIEW_WIDTH, player.x + player.w / 2 - VIEW_WIDTH / 2));
    if (level.widthPx <= VIEW_WIDTH) camX = 0;
  }

  function solve() {
    stop();
    if (callbacks && callbacks.onSolve) callbacks.onSolve();
  }

  function fail(reasonKey) {
    stop();
    if (callbacks && callbacks.onFail) callbacks.onFail(reasonKey);
  }

  /** Whether the current floor's door is currently passable. Trophy floors
   *  unlock once every trophy is collected (the original rule); boss
   *  floors (a "choice" floor with `boss` set — currently just Floor 5)
   *  unlock once the boss is defeated. Every other "choice" floor has no
   *  door at all (door stays null; see buildLevel()), so this is never
   *  consulted for those. */
  function doorUnlocked() {
    // A boss gates the door in BOTH modes now: Floor 5's Auditor on a
    // "choice" floor, and Floor 10's multi-phase finale on a "trophy"
    // floor (where every trophy must also still be collected — the boss
    // is an additional gate, not a replacement for the original one).
    if (mode === "trophy") {
      if (!trophies.every((t) => t.collected)) return false;
      return !boss || boss.defeated;
    }
    if (boss) return boss.defeated;
    return true;
  }

  /** Wakes Floor 5's boss the moment its quiz is answered correctly —
   *  before this, the boss isn't in `guards` at all, so it can't move,
   *  chase, be touched, or be drawn. Reusing `guards` for it means every
   *  existing guard mechanic (collision, the stun ability's targeting
   *  loop, paralyze/draw) applies to the boss for free — see guards.js's
   *  Boss class for what's actually different about it. */
  function activateBoss() {
    if (!boss) return;
    guards.push(boss);
    window.CG.audio.playCheckpoint();
  }

  /** Fires one stun charge in the direction the player is currently facing.
   *  No-ops (silently) if there's no charge left or the cooldown hasn't
   *  cleared yet — the HUD is the feedback for that, not a sound. Picks the
   *  nearest unparalyzed guard within STUN_RANGE on the same walkway (same
   *  same-row check style as SecurityGuard.canSpot) and freezes it; a miss
   *  still spends the charge and cooldown (this is a resource with real
   *  stakes, not a free look) but plays a duller cue than a hit. */
  function tryFireStun() {
    if (stunCooldownT > 0 || stunCharges <= 0) return;
    stunCooldownT = STUN_COOLDOWN;
    stunCharges--;

    const dir = player.facing === "left" ? -1 : 1;
    const originX = player.x + player.w / 2;
    const originY = player.y + player.h / 2;
    const rangeX0 = dir > 0 ? originX : originX - STUN_RANGE;
    const rangeX1 = dir > 0 ? originX + STUN_RANGE : originX;

    let target = null;
    let bestDist = Infinity;
    for (const g of guards) {
      if (g.paralyzed || g.defeated || g.killed) continue;
      const gcx = g.x + g.w / 2;
      const gcy = g.y + g.h / 2;
      if (gcx < rangeX0 || gcx > rangeX1) continue;
      if (Math.abs(gcy - originY) > STUN_HEIGHT_TOLERANCE) continue;
      const dist = Math.abs(gcx - originX);
      if (dist < bestDist) { bestDist = dist; target = g; }
    }

    stunFlash = {
      x0: originX,
      x1: dir > 0 ? originX + STUN_RANGE : originX - STUN_RANGE,
      y: originY,
      t: STUN_FLASH_DURATION,
      hit: !!target,
    };

    if (target) {
      target.paralyze(STUN_PARALYZE_DURATION);
      pickups.push({
        x: target.x + target.w / 2 - PICKUP_SIZE / 2,
        y: target.y + target.h - PICKUP_SIZE,
        w: PICKUP_SIZE, h: PICKUP_SIZE,
        collected: false, type: "charge",
      });
      // The one guard flagged carriesGun (floors-data.js) drops the gun
      // pickup the first time it's stunned, alongside its usual charge
      // pickup — offset so the two don't overlap.
      if (target.carriesGun && !player.hasGun) {
        pickups.push({
          x: target.x + target.w / 2 - PICKUP_SIZE / 2 + PICKUP_SIZE + 6,
          y: target.y + target.h - PICKUP_SIZE,
          w: PICKUP_SIZE, h: PICKUP_SIZE,
          collected: false, type: "gun",
        });
      }
      window.CG.audio.playPowerup();
    } else {
      window.CG.audio.playHit();
    }
  }

  /** The dedicated Gun-fire key/button (see game.js's input.gunFire). Only
   *  does anything once player.hasGun is true (granted by stunning the one
   *  guard per floor flagged carriesGun — see tryFireStun() above).
   *  Unlimited ammo, longer range than the stun ability, and — unlike the
   *  stun ability — can hit *any* guard in range, not just the boss:
   *  against the boss it funnels into the same hitsTaken pool a stun hit
   *  would (guards.js's Boss.takeGunHit()), and against an ordinary guard
   *  it takes GUN_KILL_HITS separate hits to permanently remove it
   *  (guards.js's SecurityGuard.takeGunHit()) — "the gun kills guards too,
   *  and the boss," while the stun ability keeps its original, purely
   *  temporary, unlimited-charges-aside job. Always consumes the cooldown
   *  when fired (even on a miss), same feedback shape as the stun ability. */
  function tryFireGun() {
    if (!player.hasGun || gunCooldownT > 0) return;
    gunCooldownT = GUN_COOLDOWN;

    const dir = player.facing === "left" ? -1 : 1;
    const originX = player.x + player.w / 2;
    const originY = player.y + player.h / 2;
    const rangeX0 = dir > 0 ? originX : originX - GUN_RANGE;
    const rangeX1 = dir > 0 ? originX + GUN_RANGE : originX;

    let target = null;
    let bestDist = Infinity;
    for (const g of guards) {
      if (g.paralyzed || g.defeated || g.killed) continue;
      const gcx = g.x + g.w / 2;
      const gcy = g.y + g.h / 2;
      if (gcx < rangeX0 || gcx > rangeX1) continue;
      if (Math.abs(gcy - originY) > STUN_HEIGHT_TOLERANCE) continue;
      const dist = Math.abs(gcx - originX);
      if (dist < bestDist) { bestDist = dist; target = g; }
    }

    stunFlash = {
      x0: originX,
      x1: dir > 0 ? originX + GUN_RANGE : originX - GUN_RANGE,
      y: originY,
      t: STUN_FLASH_DURATION,
      hit: !!target,
      gun: true,
    };

    if (target) {
      target.takeGunHit(STUN_PARALYZE_DURATION);
      window.CG.audio.playPowerup();
      // A permanent kill still gives a little back, same reward shape as
      // an ordinary stun hit — going for a gun kill never feels like a
      // pure resource sink even though the gun itself is unlimited ammo.
      if (target.killed) {
        pickups.push({
          x: target.x + target.w / 2 - PICKUP_SIZE / 2,
          y: target.y + target.h - PICKUP_SIZE,
          w: PICKUP_SIZE, h: PICKUP_SIZE,
          collected: false, type: "charge",
        });
      }
    } else {
      window.CG.audio.playHit();
    }
  }

  /* ---------------- Render ---------------- */

  function render() {
    const reducedMotion = window.CG.isReducedMotion();
    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.fillStyle = currentFloor.tint || "#0f172a";
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    ctx.save();
    if (shakeTime > 0 && !reducedMotion) {
      const mag = shakeTime * 10;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }
    ctx.translate(-camX, LEVEL_OFFSET_Y);

    drawBackdrop();
    solids.forEach((s) => drawTiledRect(s, "ground"));
    ladders.forEach((l) => drawLadder(l));
    vents.forEach((v) => { drawVent(v.from); if (v.twoWay) drawVent(v.to); });
    movingPlatforms.forEach((mp) => drawMovingPlatform(mp));
    if (mode === "trophy") {
      trophies.forEach((t) => { if (!t.collected) drawTrophy(t); });
      drawDoor();
    } else {
      choices.forEach((c, i) => drawChoiceMarker(c, i, reducedMotion));
      if (door) drawDoor();
    }
    lightSwitches.forEach((s) => drawLightSwitch(s, reducedMotion));
    pickups.forEach((pk) => { if (!pk.collected) drawPickup(pk); });
    minions.forEach((m) => drawMinion(m));
    guards.forEach((g) => g.draw(ctx, reducedMotion));
    laserGrids.forEach((lg) => drawLaser(lg, reducedMotion));
    if (stunFlash) drawStunFlash();
    drawPlayer(reducedMotion);

    ctx.restore();

    // A lights-out window dims the whole viewport (screen space, after the
    // camera transform is restored) so the effect reads instantly, and so
    // the player can see at a glance how much of the window is left.
    if (lightsOutT > 0) drawLightsOutOverlay();

    drawHud();
    drawChoiceClue();
    drawStoryNote();
  }

  /** A wall-mounted light switch: amber and pulsing while it's still
   *  hackable, dark and flat once used. Draws a small "E" prompt when the
   *  player is close enough to actually trigger it, so the mechanic is
   *  discoverable without a tutorial line. */
  function drawLightSwitch(s, reducedMotion) {
    const cx = s.x + s.w / 2;
    const inReach = !s.hacked && player
      && Math.abs((s.x + s.w / 2) - (player.x + player.w / 2)) <= SWITCH_REACH
      && Math.abs((s.y + s.h / 2) - (player.y + player.h / 2)) <= SWITCH_REACH * 1.4;
    const pulse = s.hacked || reducedMotion ? 0 : 0.5 + Math.sin(doorPulseT * 4) * 0.5;

    ctx.save();
    ctx.fillStyle = s.hacked ? "#0F172A" : "#1E293B";
    ctx.strokeStyle = s.hacked ? "#475569" : "#FACC15";
    ctx.lineWidth = 2;
    if (!s.hacked) { ctx.shadowColor = "#FACC15"; ctx.shadowBlur = 6 + pulse * 8; }
    roundRectPath(ctx, s.x, s.y, s.w, s.h, 4);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Toggle nub — up (lit) when live, down (dark) once hacked.
    ctx.fillStyle = s.hacked ? "#334155" : "#FDE68A";
    ctx.fillRect(cx - 4, s.hacked ? s.y + s.h * 0.55 : s.y + s.h * 0.2, 8, s.h * 0.25);
    ctx.restore();

    if (inReach) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "bold 11px 'Share Tech Mono', monospace";
      ctx.fillStyle = "#FACC15";
      ctx.shadowColor = "#FACC15";
      ctx.shadowBlur = 6;
      ctx.fillText("E — CUT LIGHTS", cx, s.y - 8);
      ctx.restore();
    }
  }

  /** A timed laser beam. Lit = lethal; between pulses it renders as a faint
   *  dotted emitter track so the player can see where a beam WILL be and
   *  time the crossing, rather than being surprised by one switching on. */
  function drawLaser(lg, reducedMotion) {
    const cx = lg.x + lg.w / 2;
    ctx.save();
    if (lg.on) {
      const flicker = reducedMotion ? 1 : 0.82 + Math.sin(lg.t * 30) * 0.18;
      ctx.globalAlpha = flicker;
      ctx.fillStyle = "#EF4444";
      ctx.shadowColor = "#EF4444";
      ctx.shadowBlur = 12;
      ctx.fillRect(lg.x, lg.y, lg.w, lg.h);
      ctx.globalAlpha = flicker * 0.5;
      ctx.fillStyle = "#FCA5A5";
      ctx.fillRect(cx - 1, lg.y, 2, lg.h);
    } else {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 7]);
      ctx.beginPath();
      ctx.moveTo(cx, lg.y);
      ctx.lineTo(cx, lg.y + lg.h);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    // Emitter housings at both ends, always visible.
    ctx.save();
    ctx.fillStyle = "#475569";
    ctx.strokeStyle = lg.on ? "#EF4444" : "#64748B";
    ctx.lineWidth = 1.5;
    [lg.y - 5, lg.y + lg.h - 3].forEach((ey) => {
      ctx.fillRect(cx - 7, ey, 14, 8);
      ctx.strokeRect(cx - 7, ey, 14, 8);
    });
    ctx.restore();
  }

  /** A vent mouth — a dark recess with louvre slats and a prompt when the
   *  player is standing on it. */
  function drawVent(mouth) {
    const overlapping = player && aabbOverlap(bounds(player),
      { left: mouth.x, right: mouth.x + mouth.w, top: mouth.y, bottom: mouth.y + mouth.h });
    ctx.save();
    ctx.fillStyle = "#0B1220";
    ctx.strokeStyle = overlapping ? "#38BDF8" : "#475569";
    ctx.lineWidth = 2;
    if (overlapping) { ctx.shadowColor = "#38BDF8"; ctx.shadowBlur = 10; }
    roundRectPath(ctx, mouth.x, mouth.y, mouth.w, mouth.h, 3);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = overlapping ? "#7DD3FC" : "#334155";
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 3; i++) {
      const sy = mouth.y + (mouth.h * i) / 4;
      ctx.beginPath();
      ctx.moveTo(mouth.x + 4, sy);
      ctx.lineTo(mouth.x + mouth.w - 4, sy);
      ctx.stroke();
    }
    ctx.restore();

    if (overlapping) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "bold 11px 'Share Tech Mono', monospace";
      ctx.fillStyle = "#38BDF8";
      ctx.shadowColor = "#38BDF8";
      ctx.shadowBlur = 6;
      ctx.fillText("↓ / E — ENTER VENT", mouth.x + mouth.w / 2, mouth.y - 8);
      ctx.restore();
    }
  }

  /** Screen-space darkness while a hacked switch's window is running, with
   *  a countdown bar so the player can budget the remaining seconds. */
  function drawLightsOutOverlay() {
    const ratio = Math.max(0, Math.min(1, lightsOutT / LIGHTS_OUT_DURATION));
    ctx.save();
    ctx.fillStyle = `rgba(2,6,23,${0.42 * Math.min(1, ratio * 3)})`;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    const barW = 180, barH = 6;
    const barX = VIEW_WIDTH / 2 - barW / 2, barY = 14;
    ctx.fillStyle = "rgba(15,23,42,0.9)";
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
    ctx.fillStyle = "#FACC15";
    ctx.fillRect(barX, barY, barW * ratio, barH);
    ctx.font = "bold 10px 'Share Tech Mono', monospace";
    ctx.fillStyle = "#FACC15";
    ctx.textAlign = "center";
    ctx.fillText(`LIGHTS OUT — ${lightsOutT.toFixed(1)}s`, VIEW_WIDTH / 2, barY + barH + 12);
    ctx.restore();
  }

  /** Every collectible pickup shares this one drawing routine, keyed off
   *  `pk.type`: blue ⚡ for a spent stun charge back (up to
   *  STUN_CHARGES_MAX), gold 🔫 for the boss-gun pickup dropped once by
   *  the one guard flagged carriesGun (or, via the gun's own kills, any
   *  guard it permanently removes), bright yellow 🪙 for a Mario-style
   *  bonus coin (pure score, see buildBonusPickups()), and green 🛡 for
   *  the one-per-floor shield power-up (temporary guard/minion-touch
   *  immunity — see player.shieldT). */
  function drawPickup(pk) {
    const cx = pk.x + pk.w / 2;
    const bob = window.CG.isReducedMotion() ? 0 : Math.sin(doorPulseT * 4 + cx) * 3;
    const cy = pk.y + pk.h / 2 + bob;
    const color = pk.type === "gun" ? "#FACC15" : pk.type === "coin" ? "#FDE047" : pk.type === "shield" ? "#22C55E" : "#38BDF8";
    const icon = pk.type === "gun" ? "🔫" : pk.type === "coin" ? "🪙" : pk.type === "shield" ? "🛡" : "⚡";
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#0F172A";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, pk.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.font = "bold 13px 'Share Tech Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(icon, 0, 1);
    ctx.restore();
  }

  /** A small horizontally-patrolling bonus platform (see
   *  buildBonusPickups()) — drawn as a glowing amber plank distinct from
   *  the tiled ground so it visually reads as "this one moves." */
  function drawMovingPlatform(mp) {
    ctx.save();
    ctx.fillStyle = "#FACC15";
    ctx.shadowColor = "#FACC15";
    ctx.shadowBlur = 6;
    ctx.fillRect(mp.x, mp.y, mp.w, mp.h);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(15,23,42,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(mp.x, mp.y, mp.w, mp.h);
    ctx.restore();
  }

  /** A stompable minion (see buildBonusPickups()) — a small round patrol
   *  "bot" drawn with plain canvas primitives (no new art asset), visually
   *  distinct from a Security Guard so the player can tell at a glance
   *  which threat rewards a stomp-from-above versus which one requires the
   *  stun/gun ability. */
  function drawMinion(m) {
    if (!m.alive) return;
    const cx = m.x + m.w / 2;
    const cy = m.y + m.h / 2 + (window.CG.isReducedMotion() ? 0 : Math.sin(m.animT * 6) * 2);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = "#7C3AED";
    ctx.strokeStyle = "#C4B5FD";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#7C3AED";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(0, 0, m.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#0F172A";
    ctx.beginPath(); ctx.arc(-4, -2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /** A brief beam flash for a fired shot — gold for the boss-gun attack,
   *  blue/bright on an ordinary stun hit, dim grey on a stun miss, so each
   *  reads as visibly distinct even before the "Zzz"/hit-counter feedback
   *  registers. */
  function drawStunFlash() {
    const alpha = Math.max(0, Math.min(1, stunFlash.t / STUN_FLASH_DURATION));
    const color = stunFlash.gun ? "#FACC15" : stunFlash.hit ? "#38BDF8" : "#94A3B8";
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(stunFlash.x0, stunFlash.y);
    ctx.lineTo(stunFlash.x1, stunFlash.y);
    ctx.stroke();
    ctx.restore();
  }

  /** A persistent (non-fading) reminder of the current floor's clue and
   *  lettered options for "choice" mode mazes, drawn as a small fixed
   *  panel in the screen's bottom-right corner (screen space, not level
   *  space, so it doesn't scroll with the camera). The pre-level briefing
   *  already shows this once, but that's easy to forget mid-maze while
   *  dodging guards — this keeps it visible the whole floor without the
   *  player needing to memorize it, and color-codes each letter to match
   *  its in-level marker so the two are easy to line up at a glance.
   *
   *  Originally a full-width bar pinned to the bottom of the canvas,
   *  which on a boss-gauntlet floor like Floor 5 — tall clue text, four
   *  or more options, ground-level platforms and a hunting guard all in
   *  the same lower third of the screen — grew tall and wide enough to
   *  genuinely block the player's view of the level while they were
   *  trying to dodge. Shrunk to a fixed, narrow (200px) corner card,
   *  a fraction of the old footprint either way — kept in the bottom
   *  corner (rather than top-right) because that's exactly where
   *  drawStoryNote()'s "note found" toast already lives; stacking two
   *  persistent-ish top-right panels would just trade one overlap for
   *  another. */
  function drawChoiceClue() {
    // Hidden once the quiz portion is solved on a boss floor — at that
    // point the clue is no longer relevant, the floor's HUD switches to
    // the boss-fight readout instead (see drawHud()).
    if (mode !== "choice" || !choiceQuestion || quizSolved) return;
    ctx.save();
    const pad = 8;
    const boxW = 200;
    const maxTextWidth = boxW - pad * 2;
    ctx.font = "10px 'Share Tech Mono', monospace";
    const words = choiceQuestion.split(" ");
    const lines = [];
    let line = "";
    words.forEach((w) => {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxTextWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);

    // Each option can also wrap to a second line on the narrower panel —
    // measured up front so boxH accounts for real wrapped height rather
    // than assuming one line per option.
    ctx.font = "10px 'Share Tech Mono', monospace";
    const optLineH = 12;
    const wrappedChoices = choices.map((c) => {
      const optWords = c.label.split(" ");
      const optLines = [];
      let optLine = "";
      optWords.forEach((w) => {
        const test = optLine ? `${optLine} ${w}` : w;
        if (ctx.measureText(test).width > maxTextWidth - 16 && optLine) {
          optLines.push(optLine);
          optLine = w;
        } else {
          optLine = test;
        }
      });
      if (optLine) optLines.push(optLine);
      return { ...c, optLines };
    });

    const lineH = 12;
    const optCount = wrappedChoices.reduce((n, c) => n + c.optLines.length, 0);
    const boxH = pad * 2 + 13 + lines.length * lineH + 5 + optCount * optLineH + (wrappedChoices.length - 1) * 2;
    // Bottom-right, not top-right: top-left is drawHud()'s own readout and
    // top-right is drawStoryNote()'s "note found" toast (see NOTE_DURATION
    // above) — anchoring here too would just trade one overlap for
    // another. Nothing else claims the bottom-right corner, and at a fixed
    // 200px wide this still leaves the rest of the level fully visible,
    // unlike the old full-width bottom bar this replaced.
    const boxX = VIEW_WIDTH - boxW - 14;
    const boxY = VIEW_HEIGHT - boxH - 14;

    ctx.fillStyle = "rgba(15,23,42,0.88)";
    ctx.strokeStyle = "rgba(56,189,248,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    else ctx.rect(boxX, boxY, boxW, boxH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#38BDF8";
    ctx.font = "bold 9px 'Share Tech Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("CLUE — WHICH TERMINAL?", boxX + pad, boxY + pad + 6);

    let y = boxY + pad + 6 + 15;
    ctx.fillStyle = "rgba(226,232,240,0.95)";
    ctx.font = "10px 'Share Tech Mono', monospace";
    lines.forEach((l) => { ctx.fillText(l, boxX + pad, y); y += lineH; });
    y += 5;

    wrappedChoices.forEach((c, i) => {
      ctx.fillStyle = CHOICE_COLORS[i % CHOICE_COLORS.length];
      ctx.font = "bold 10px 'Share Tech Mono', monospace";
      ctx.fillText(`${c.letter}.`, boxX + pad, y);
      ctx.fillStyle = "rgba(226,232,240,0.9)";
      ctx.font = "10px 'Share Tech Mono', monospace";
      c.optLines.forEach((ol, i) => { ctx.fillText(ol, boxX + pad + 16, y + i * optLineH); });
      y += c.optLines.length * optLineH + 2;
    });

    ctx.restore();
  }

  /** A found-note toast in the corner of the level — fades in/hold/out over
   *  NOTE_DURATION seconds so the story beat doesn't block play. */
  function drawStoryNote() {
    if (storyNoteTimer <= 0 || !storyNoteText) return;
    const alpha = Math.min(1, storyNoteTimer / NOTE_FADE);
    const maxWidth = 360;
    const pad = 14;
    ctx.save();
    ctx.font = "12px 'Share Tech Mono', monospace";
    const words = storyNoteText.split(" ");
    const lines = [];
    let line = "";
    words.forEach((w) => {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth - pad * 2 && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);

    const lineH = 17;
    const boxW = maxWidth;
    const boxH = pad * 2 + 18 + lines.length * lineH;
    const boxX = VIEW_WIDTH - boxW - 16;
    const boxY = 16;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(15,23,42,0.92)";
    ctx.strokeStyle = "rgba(250,204,21,0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    else ctx.rect(boxX, boxY, boxW, boxH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#FACC15";
    ctx.font = "bold 11px 'Share Tech Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("📝 NOTE FOUND", boxX + pad, boxY + pad + 10);

    ctx.fillStyle = "rgba(226,232,240,0.95)";
    ctx.font = "12px 'Share Tech Mono', monospace";
    lines.forEach((l, i) => {
      ctx.fillText(l, boxX + pad, boxY + pad + 30 + i * lineH);
    });

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawBackdrop() {
    const tileImg = window.SPRITES.platformTiles;
    const idx = window.PLATFORM_TILE_INDEX.wallDeco;
    if (!(tileImg && tileImg.complete && tileImg.naturalWidth > 0)) return;
    const fw = tileImg.naturalWidth / 6;
    const fh = tileImg.naturalHeight;
    const startCol = Math.floor(camX / TILE) - 1;
    const endCol = Math.floor((camX + VIEW_WIDTH) / TILE) + 1;
    for (let c = startCol; c <= endCol; c++) {
      for (let r = 0; r < 10; r++) {
        ctx.drawImage(tileImg, idx * fw, 0, fw, fh, c * TILE, r * TILE, TILE, TILE);
      }
    }
    drawFloorMotif(startCol, endCol);
  }

  /** Every floor's wall tile is the same generated tileset, tinted per
   *  floor — on its own that reads as "the same room re-colored." A sparse
   *  scatter of a floor-specific vector motif (drawn with plain canvas
   *  primitives, no extra art assets) breaks that up so each department
   *  actually looks like a different place. Keyed off `currentFloor.motif`
   *  (see floors-data.js); floors without one just skip this. */
  function drawFloorMotif(startCol, endCol) {
    const motif = currentFloor && currentFloor.motif;
    if (!motif) return;
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = "#94A3B8";
    ctx.fillStyle = "#94A3B8";
    ctx.lineWidth = 1.5;
    for (let c = Math.ceil(startCol / 4) * 4; c <= endCol; c += 4) {
      drawMotifIcon(motif, c * TILE + TILE / 2, 1.6 * TILE, 15);
      drawMotifIcon(motif, c * TILE + TILE / 2, 8.2 * TILE, 15);
    }
    ctx.restore();
  }

  function drawMotifIcon(type, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    switch (type) {
      case "badge": // ID badge: rounded rect + lanyard hole + a stripe
        ctx.beginPath();
        roundRectPath(ctx, -r * 0.6, -r * 0.8, r * 1.2, r * 1.6, 3);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -r * 0.5, r * 0.15, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r * 0.6, 0); ctx.lineTo(r * 0.6, 0); ctx.stroke();
        break;
      case "folder": // manila folder
        ctx.beginPath();
        ctx.moveTo(-r, -r * 0.3); ctx.lineTo(-r * 0.3, -r * 0.3); ctx.lineTo(-r * 0.1, -r * 0.6);
        ctx.lineTo(r * 0.5, -r * 0.6); ctx.lineTo(r * 0.5, r * 0.1); ctx.lineTo(-r, r * 0.1);
        ctx.closePath(); ctx.stroke();
        break;
      case "dollar": // currency mark
        ctx.font = `bold ${Math.round(r * 1.5)}px 'Share Tech Mono', monospace`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("$", 0, 1);
        break;
      case "gear": // gear/cog
        ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55);
          ctx.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
          ctx.stroke();
        }
        break;
      case "scale": // legal scale
        ctx.beginPath(); ctx.moveTo(0, -r * 0.7); ctx.lineTo(0, r * 0.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.4); ctx.lineTo(r * 0.8, -r * 0.4); ctx.stroke();
        ctx.beginPath(); ctx.arc(-r * 0.8, -r * 0.1, r * 0.22, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(r * 0.8, -r * 0.1, r * 0.22, 0, Math.PI * 2); ctx.stroke();
        break;
      case "server": // rack with light bars
        ctx.strokeRect(-r * 0.6, -r * 0.8, r * 1.2, r * 1.6);
        for (let i = 0; i < 3; i++) ctx.strokeRect(-r * 0.4, -r * 0.55 + i * r * 0.5, r * 0.8, r * 0.18);
        break;
      case "window": // skyline window grid
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            ctx.strokeRect(-r * 0.7 + i * r * 0.75, -r * 0.7 + j * r * 0.75, r * 0.55, r * 0.55);
          }
        }
        break;
      case "cloud": // cloud
        ctx.beginPath();
        ctx.arc(-r * 0.35, r * 0.1, r * 0.4, 0, Math.PI * 2);
        ctx.arc(r * 0.15, -r * 0.05, r * 0.5, 0, Math.PI * 2);
        ctx.arc(r * 0.6, r * 0.15, r * 0.35, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case "circuit": // circuit trace with nodes
        ctx.beginPath();
        ctx.moveTo(-r, 0); ctx.lineTo(-r * 0.2, 0); ctx.lineTo(0, -r * 0.6); ctx.lineTo(r * 0.6, -r * 0.6); ctx.lineTo(r, -r * 0.6);
        ctx.stroke();
        [[-r, 0], [-r * 0.2, 0], [0, -r * 0.6], [r * 0.6, -r * 0.6], [r, -r * 0.6]].forEach(([px, py]) => {
          ctx.beginPath(); ctx.arc(px, py, r * 0.1, 0, Math.PI * 2); ctx.fill();
        });
        break;
      case "shield": // security shield outline
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.9);
        ctx.lineTo(r * 0.7, -r * 0.55);
        ctx.lineTo(r * 0.7, r * 0.15);
        ctx.lineTo(0, r * 0.9);
        ctx.lineTo(-r * 0.7, r * 0.15);
        ctx.lineTo(-r * 0.7, -r * 0.55);
        ctx.closePath();
        ctx.stroke();
        break;
      default:
        break;
    }
    ctx.restore();
  }

  function drawTiledRect(rect, tileKey) {
    const tileImg = window.SPRITES.platformTiles;
    const idx = window.PLATFORM_TILE_INDEX[tileKey];
    if (tileImg && tileImg.complete && tileImg.naturalWidth > 0) {
      const fw = tileImg.naturalWidth / 6;
      const fh = tileImg.naturalHeight;
      const cols = rect.w / TILE;
      const rows = rect.h / TILE;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          ctx.drawImage(tileImg, idx * fw, 0, fw, fh, rect.x + c * TILE, rect.y + r * TILE, TILE, TILE);
        }
      }
    } else {
      ctx.fillStyle = "#4F46E5";
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
  }

  function drawLadder(l) {
    const tileImg = window.SPRITES.platformTiles;
    const idx = window.PLATFORM_TILE_INDEX.ladder;
    if (!(tileImg && tileImg.complete && tileImg.naturalWidth > 0)) return;
    const fw = tileImg.naturalWidth / 6;
    const fh = tileImg.naturalHeight;
    const rows = l.h / TILE;
    for (let r = 0; r < rows; r++) {
      ctx.drawImage(tileImg, idx * fw, 0, fw, fh, l.x, l.y + r * TILE, TILE, TILE);
    }
  }

  function drawTrophy(t) {
    const tileImg = window.SPRITES.platformTiles;
    const idx = window.PLATFORM_TILE_INDEX.trophy;
    const bob = window.CG.isReducedMotion() ? 0 : Math.sin(doorPulseT * 3 + t.x) * 3;
    if (tileImg && tileImg.complete && tileImg.naturalWidth > 0) {
      const fw = tileImg.naturalWidth / 6;
      const fh = tileImg.naturalHeight;
      ctx.drawImage(tileImg, idx * fw, 0, fw, fh, t.x, t.y + bob, t.w, t.h);
    }
  }

  function drawDoor() {
    const unlocked = doorUnlocked();
    const tileImg = window.SPRITES.platformTiles;
    const idx = window.PLATFORM_TILE_INDEX[unlocked ? "doorOpen" : "doorClosed"];
    if (tileImg && tileImg.complete && tileImg.naturalWidth > 0) {
      const fw = tileImg.naturalWidth / 6;
      const fh = tileImg.naturalHeight;
      ctx.drawImage(tileImg, idx * fw, 0, fw, fh, door.x, door.y, door.w, door.h);
    }
    if (unlocked && !window.CG.isReducedMotion()) {
      const glow = 8 + Math.sin(doorPulseT * 4) * 4;
      ctx.save();
      ctx.strokeStyle = "#22C55E";
      ctx.shadowColor = "#22C55E";
      ctx.shadowBlur = glow;
      ctx.lineWidth = 2;
      ctx.strokeRect(door.x, door.y, door.w, door.h);
      ctx.restore();
    }
  }

  /** A lettered terminal marker for "choice" mode floors — deliberately
   *  colored by letter position, not by correctness, so the visuals never
   *  give away the right answer. The player has to match it against the
   *  lettered options shown on the pre-level briefing. */
  function drawChoiceMarker(c, index, reducedMotion) {
    if (c.resolved) return;
    const color = CHOICE_COLORS[index % CHOICE_COLORS.length];
    const pulse = reducedMotion ? 0 : Math.sin(doorPulseT * 3 + index) * 2;
    const cx = c.x + c.w / 2;
    const cy = c.y + c.h / 2 + pulse;
    ctx.save();
    ctx.fillStyle = "#0F172A";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    roundRectPath(ctx, c.x, c.y + pulse, c.w, c.h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.font = "bold 16px 'Share Tech Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(c.letter, cx, cy + 1);
    ctx.restore();
  }

  function roundRectPath(context, x, y, w, h, r) {
    if (context.roundRect) { context.beginPath(); context.roundRect(x, y, w, h, r); return; }
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function drawPlayer(reducedMotion) {
    const sheet = window.SPRITES.davePlayer;
    const cx = player.x + player.w / 2;
    const feetY = player.y + player.h;
    let pose = "idle";
    if (player.climbing) pose = Math.floor(player.animT * 6) % 2 === 0 ? "climb1" : "climb2";
    else if (!player.onGround) pose = "jump";
    else if (player.isMoving) pose = Math.floor(player.animT * 10) % 2 === 0 ? "run1" : "run2";

    const poseIndex = { idle: 0, run1: 1, run2: 2, jump: 3, climb1: 4, climb2: 5 }[pose];

    if (sheet && sheet.complete && sheet.naturalWidth > 0) {
      const fw = sheet.naturalWidth / 6;
      const fh = sheet.naturalHeight;
      const drawW = player.w * 1.8;
      const drawH = player.h * 1.7;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(cx, feetY - drawH / 2);
      if (player.facing === "left") ctx.scale(-1, 1);
      if (player.shieldT > 0) {
        ctx.shadowColor = "#22C55E";
        ctx.shadowBlur = reducedMotion ? 8 : 10 + Math.sin(doorPulseT * 8) * 4;
      }
      ctx.drawImage(sheet, poseIndex * fw, 0, fw, fh, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    }
  }

  function drawHud() {
    ctx.save();
    ctx.font = "12px 'Share Tech Mono', monospace";
    ctx.fillStyle = "rgba(148,163,184,0.9)";
    ctx.textAlign = "left";
    ctx.fillText(`FLOOR ${currentFloor.num} · ${currentFloor.name.toUpperCase()}`, 16, 24);

    if (mode === "trophy" && !(boss && quizSolved)) {
      const collected = trophies.filter((t) => t.collected).length;
      ctx.fillStyle = collected === trophies.length ? "#22C55E" : "#FACC15";
      ctx.font = "bold 14px 'Share Tech Mono', monospace";
      ctx.fillText(`TROPHIES ${collected}/${trophies.length}`, 16, 46);
      if (collected < trophies.length) {
        ctx.fillStyle = "rgba(148,163,184,0.7)";
        ctx.font = "11px 'Share Tech Mono', monospace";
        ctx.fillText(boss
          ? "Collect every trophy — and be ready. Something is waiting once you do."
          : "The elevator door stays locked until every trophy is collected.", 16, 64);
      }
    } else if (boss && quizSolved) {
      if (boss.defeated) {
        ctx.fillStyle = "#22C55E";
        ctx.font = "bold 14px 'Share Tech Mono', monospace";
        ctx.fillText(`${boss.name.toUpperCase()} IS DOWN`, 16, 46);
        ctx.fillStyle = "rgba(148,163,184,0.7)";
        ctx.font = "11px 'Share Tech Mono', monospace";
        ctx.fillText("The door ahead is open.", 16, 64);
      } else {
        ctx.fillStyle = "#EF4444";
        ctx.font = "bold 14px 'Share Tech Mono', monospace";
        const phaseTag = boss.isFinalBoss ? ` — PHASE ${boss.phase}/${boss.phases}` : "";
        ctx.fillText(`⚠ ${boss.name.toUpperCase()}${phaseTag} — HITS ${boss.hitsTaken}/${boss.maxHits}`, 16, 46);
        ctx.fillStyle = "rgba(148,163,184,0.7)";
        ctx.font = "11px 'Share Tech Mono', monospace";
        if (boss.invulnerable) {
          ctx.fillStyle = "#A855F7";
          ctx.fillText("It's recompiling — shots do nothing right now. Back off and reset before the next phase starts.", 16, 64);
        } else {
          ctx.fillText(player.hasGun
            ? "You have the guard's gun — press G to fire from range (unlimited ammo) or X/F to stun up close. Either counts."
            : "Stun it enough times to bring it down, then reach the door. It's faster than any guard.", 16, 64);
        }
      }
    } else {
      ctx.fillStyle = "#38BDF8";
      ctx.font = "bold 14px 'Share Tech Mono', monospace";
      ctx.fillText(`FIND THE CORRECT TERMINAL`, 16, 46);
      ctx.fillStyle = "rgba(148,163,184,0.7)";
      ctx.font = "11px 'Share Tech Mono', monospace";
      ctx.fillText("Match it against the lettered answer from your briefing. A wrong one ends it.", 16, 64);
    }

    // Kept left-aligned (not the top-right corner) so it never collides
    // with the in-level "note found" toast (drawStoryNote()), which lives
    // in that corner for the first several seconds of any floor that has
    // one.
    const onCooldown = stunCooldownT > 0;
    ctx.font = "bold 12px 'Share Tech Mono', monospace";
    ctx.fillStyle = stunCharges > 0 ? "#38BDF8" : "rgba(148,163,184,0.6)";
    ctx.textAlign = "left";
    ctx.fillText(`⚡ STUN ${stunCharges}/${STUN_CHARGES_MAX}${onCooldown ? "  (recharging…)" : ""}`, 16, 84);

    if (player.hasGun) {
      ctx.fillStyle = gunCooldownT > 0 ? "rgba(250,204,21,0.55)" : "#FACC15";
      ctx.fillText(`🔫 GUN — press G, unlimited ammo, kills guards too${gunCooldownT > 0 ? "  (recharging…)" : ""}`, 16, 102);
    }

    let extraY = player.hasGun ? 120 : 102;
    ctx.fillStyle = "#FDE047";
    ctx.fillText(`🪙 COINS ${coinsCollected}`, 16, extraY);
    if (player.shieldT > 0) {
      extraY += 18;
      ctx.fillStyle = "#22C55E";
      ctx.fillText(`🛡 SHIELD ${player.shieldT.toFixed(1)}s`, 16, extraY);
    }

    ctx.restore();
  }

  /** QA helper: exposes live physics state for automated playthrough testing. */
  function debugState() {
    if (!player) return null;
    return {
      x: player.x, y: player.y, vx: player.vx, vy: player.vy,
      onGround: player.onGround, climbing: player.climbing,
      mode,
      trophiesCollected: trophies.filter((t) => t.collected).length,
      trophiesTotal: trophies.length,
      choices: choices.map((c) => ({ letter: c.letter, x: c.x, y: c.y, correct: c.correct, resolved: c.resolved })),
      stunCharges,
      stunCooldownT,
      hasGun: player.hasGun,
      gunCooldownT,
      guardsParalyzed: guards.filter((g) => g.paralyzed).length,
      pickupsAvailable: pickups.filter((p) => !p.collected).length,
      guardsInfo: guards.map((g) => ({
        x: g.x, y: g.y, w: g.w, h: g.h, paralyzed: g.paralyzed, alert: g.alert,
        carriesGun: !!g.carriesGun, killed: !!g.killed, gunHitsTaken: g.gunHitsTaken || 0, isBoss: !!g.isBoss,
        kind: g.isDrone ? "drone" : g.isHound ? "hound" : g.isElite ? "elite" : g.isBoss ? "boss" : "guard",
        stunHits: g.stunHits || 0, stunsToFreeze: g.stunsToFreeze || 1, disabled: !!g.disabled,
      })),
      pickupsInfo: pickups.filter((p) => !p.collected).map((p) => ({ x: p.x, y: p.y, w: p.w, h: p.h, type: p.type })),
      facing: player.facing,
      lastStunFlash: stunFlash,
      camX,
      levelWidthPx: level ? level.widthPx : null,
      quizSolved,
      shieldT: player.shieldT,
      coinsCollected,
      minionsInfo: minions.map((m) => ({ x: m.x, y: m.y, w: m.w, h: m.h, alive: m.alive })),
      movingPlatformsInfo: movingPlatforms.map((mp) => ({ x: mp.x, y: mp.y, w: mp.w, h: mp.h })),
      boss: boss ? {
        active: guards.indexOf(boss) !== -1,
        x: boss.x, y: boss.y, w: boss.w, h: boss.h,
        hitsTaken: boss.hitsTaken, maxHits: boss.maxHits,
        paralyzed: boss.paralyzed, defeated: boss.defeated, alert: boss.alert,
        // FinalBoss-only (Floor 10) — undefined on Floor 5's Auditor.
        isFinalBoss: !!boss.isFinalBoss,
        phase: boss.phase, phases: boss.phases,
        hitsPerPhase: boss.hitsPerPhase, invulnerable: !!boss.invulnerable,
      } : null,
      doorUnlocked: door ? doorUnlocked() : null,
      // ---- Act 1-3 level features ----
      lightsOutT,
      lightSwitchesInfo: lightSwitches.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h, hacked: s.hacked })),
      lasersInfo: laserGrids.map((lg) => ({ x: lg.x, y: lg.y, w: lg.w, h: lg.h, on: lg.on, cycle: lg.cycle })),
      ventsInfo: vents.map((v) => ({ from: v.from, to: v.to, twoWay: v.twoWay })),
    };
  }

  /** QA helpers: let an automated test jump straight to "all trophies
   *  collected" / "standing on the door" / "standing on the correct
   *  choice terminal" without needing to physically re-solve a maze the
   *  engine already proved reachable elsewhere — used by
   *  tools/e2e-phase4-test.js to reliably exercise the Secure Server
   *  Room's password terminal and the choice-floor win/lose paths without
   *  re-deriving a pixel-perfect jump-timing autopilot for every level.
   *  No normal gameplay path calls these. */
  function __debugForceCollectAll() {
    trophies.forEach((t) => { t.collected = true; });
  }
  function __debugTeleportToDoor() {
    if (!player || !door) return;
    player.x = door.x; player.y = door.y; player.vx = 0; player.vy = 0; player.onGround = true;
  }
  function __debugTeleportToCorrectChoice() {
    if (!player) return;
    const correct = choices.find((c) => c.correct);
    if (!correct) return;
    player.x = correct.x; player.y = correct.y; player.vx = 0; player.vy = 0; player.onGround = true;
  }
  /** QA helper: places the player on the same walkway as the first guard,
   *  `offsetPx` to its left, for exercising the real (non-forced) fire path
   *  without needing a full jump-aware autopilot to physically walk there.
   *  No normal gameplay path calls this. */
  function __debugTeleportNearGuard(offsetPx) {
    if (!player || !guards.length) return;
    const g = guards[0];
    player.x = Math.max(0, g.x - (offsetPx != null ? offsetPx : 100));
    player.y = g.y + g.h - player.h;
    player.vx = 0; player.vy = 0; player.onGround = true;
    player.facing = "right";
  }

  /** QA helper: directly sets the player's x position (clamped to the
   *  level bounds, same as real movement does), for exercising the camera
   *  clamp formula in `update()` across the full width of a level without
   *  needing a full jump/ladder-aware autopilot to physically walk there.
   *  No normal gameplay path calls this. */
  function __debugSetPlayerX(x) {
    if (!player || !level) return;
    player.x = Math.max(0, Math.min(level.widthPx - player.w, x));
    player.vx = 0; player.vy = 0; player.onGround = true;
  }

  /** QA helper: directly fires the stun ability regardless of range/facing,
   *  so an automated test can exercise the paralyze -> pickup -> recharge
   *  loop without needing to physically line up a real shot. Defaults to
   *  the first unparalyzed guard (original behavior); an optional index
   *  lets a test target a specific guard, e.g. the one flagged carriesGun,
   *  to exercise the gun-pickup drop. No normal gameplay path calls this. */
  function __debugForceStunNearestGuard(index) {
    const unparalyzed = guards.filter((g) => !g.paralyzed);
    if (!unparalyzed.length) return;
    const g = index != null && unparalyzed[index] ? unparalyzed[index] : unparalyzed[0];
    g.paralyze(STUN_PARALYZE_DURATION);
    pickups.push({
      x: g.x + g.w / 2 - PICKUP_SIZE / 2,
      y: g.y + g.h - PICKUP_SIZE,
      w: PICKUP_SIZE, h: PICKUP_SIZE,
      collected: false, type: "charge",
    });
    if (g.carriesGun && !player.hasGun) {
      pickups.push({
        x: g.x + g.w / 2 - PICKUP_SIZE / 2 + PICKUP_SIZE + 6,
        y: g.y + g.h - PICKUP_SIZE,
        w: PICKUP_SIZE, h: PICKUP_SIZE,
        collected: false, type: "gun",
      });
    }
  }

  /** QA helper: grants the boss-gun directly, bypassing the need to find
   *  and stun the specific carriesGun guard first. No normal gameplay path
   *  calls this. */
  function __debugGiveGun() {
    if (player) player.hasGun = true;
  }

  /** QA helper: drives Floor 5's quiz-then-boss sequence straight to
   *  "boss defeated" — solves the quiz (same code path a real correct
   *  terminal touch takes, so activateBoss() genuinely runs) if it hasn't
   *  been already, then repeatedly calls the boss's own paralyze() (the
   *  same method a real stun hit calls) until it reports defeated. Lets
   *  automated tests reach "door open" on a boss floor without grinding
   *  out three real, range-limited stun shots. No normal gameplay path
   *  calls this. */
  function __debugForceDefeatBoss() {
    if (!boss) return;
    if (!quizSolved) {
      quizSolved = true;
      choices.forEach((c) => { c.resolved = true; });
      // On a trophy floor carrying a boss (Floor 10's finale) the boss is
      // woken by the last trophy rather than a quiz, so force that state
      // too — otherwise this hook would wake nothing on those floors.
      if (mode === "trophy") trophies.forEach((t) => { t.collected = true; });
      if (guards.indexOf(boss) === -1) activateBoss();
    }
    // A FinalBoss ignores hits during its between-phase "recompiling"
    // window (guards.js), so a naive paralyze() loop stalls at the first
    // phase break and never gets past it. Clear that window between
    // hits — the guard rail is sized for the largest possible fight
    // (phases x hitsPerPhase) rather than the old single-phase 3.
    const maxIters = (boss.maxHits || 3) * 3 + 6;
    let guardRail = 0;
    while (!boss.defeated && guardRail < maxIters) {
      if (boss.phaseShiftT) boss.phaseShiftT = 0;
      boss.paralyze(0.01);
      guardRail++;
    }
  }

  /** QA helper: directly fires the Gun-fire key's underlying logic at a
   *  specific guard regardless of range/facing/cooldown, so an automated
   *  test can exercise the gun-vs-ordinary-guard kill mechanic (including
   *  the "takes GUN_KILL_HITS separate hits" part) without needing to
   *  physically line up real shots. Defaults to the first live (non-
   *  paralyzed/defeated/killed) guard. No normal gameplay path calls this. */
  function __debugForceGunHitGuard(index) {
    // Indexes directly into `guards` — the same order debugState() exposes
    // as guardsInfo — rather than a live-only subset, so a caller that
    // picked an index from guardsInfo (paralyzed guards included; a gun
    // hit works on a paralyzed guard same as an awake one) hits the guard
    // it actually meant to.
    const g = index != null && guards[index] ? guards[index] : guards.find((cand) => !cand.killed);
    if (!g || g.killed) return;
    g.takeGunHit(STUN_PARALYZE_DURATION);
    if (g.killed) {
      pickups.push({
        x: g.x + g.w / 2 - PICKUP_SIZE / 2,
        y: g.y + g.h - PICKUP_SIZE,
        w: PICKUP_SIZE, h: PICKUP_SIZE,
        collected: false, type: "charge",
      });
    }
  }

  /** QA helper: grants shield immunity directly, bypassing the need to
   *  physically walk over the floor's one shield pickup. No normal
   *  gameplay path calls this. */
  function __debugGiveShield() {
    if (player) player.shieldT = SHIELD_DURATION;
  }

  /** QA helper: teleports the player directly onto the first uncollected
   *  pickup of the given type ("coin", "shield", "charge", "gun"), for
   *  exercising the pickup-collision branch in update() without needing a
   *  jump-timing autopilot to physically walk there. No-ops if no such
   *  pickup exists. No normal gameplay path calls this. */
  function __debugTeleportToPickupType(type) {
    if (!player) return;
    const pk = pickups.find((p) => !p.collected && p.type === type);
    if (!pk) return;
    player.x = pk.x; player.y = pk.y;
    player.vx = 0; player.vy = 0; player.onGround = true;
  }

  /** QA helper: teleports the player onto the first live minion's tile
   *  (not stomping — same height, so a real side-touch is what a test
   *  exercises), for verifying the minion hazard/shield-immunity paths
   *  without a jump-timing autopilot. No normal gameplay path calls this. */
  function __debugTeleportToMinion(index) {
    if (!player || !minions.length) return;
    const m = index != null && minions[index] ? minions[index] : minions[0];
    player.x = m.x; player.y = m.y + m.h - player.h;
    player.vx = 0; player.vy = 0; player.onGround = true;
  }

  /* ---------------- QA hooks: Act 1-3 level features ----------------
     All of these drive the exact same code paths real input does (rather
     than setting end-state directly) wherever that's possible, so a test
     exercising them is still testing the real mechanic. None is called by
     any gameplay path. */

  /** Teleports onto the nearest un-hacked light switch and hacks it through
   *  the real tryHackLightSwitch() reach check. */
  function __debugHackLightSwitch(index) {
    if (!player || !lightSwitches.length) return false;
    const s = index != null && lightSwitches[index] ? lightSwitches[index] : lightSwitches.find((sw) => !sw.hacked);
    if (!s) return false;
    player.x = s.x + s.w / 2 - player.w / 2;
    player.y = s.y + s.h - player.h;
    return tryHackLightSwitch();
  }

  /** Forces every laser on the floor into its lit phase, so a test can
   *  assert the lethal-contact path deterministically instead of waiting
   *  for a beam's own cycle to come round. */
  function __debugSetLasers(on) {
    laserGrids.forEach((lg) => {
      lg.on = !!on;
      // Re-anchor t so the next update() tick doesn't immediately flip it
      // back — otherwise the forced state would survive under a frame.
      lg.t = on ? 0 : lg.cycle * lg.onRatio;
    });
  }

  /** Teleports the player onto the first laser's beam column. */
  function __debugTeleportToLaser(index) {
    if (!player || !laserGrids.length) return;
    const lg = index != null && laserGrids[index] ? laserGrids[index] : laserGrids[0];
    player.x = lg.x + lg.w / 2 - player.w / 2;
    player.y = lg.y + lg.h - player.h;
    player.vx = 0; player.vy = 0;
  }

  /** Teleports onto the first vent mouth and travels through it via the
   *  real tryUseVent() path. */
  function __debugUseVent(index) {
    if (!player || !vents.length) return false;
    const v = index != null && vents[index] ? vents[index] : vents[0];
    player.x = v.from.x + v.from.w / 2 - player.w / 2;
    player.y = v.from.y + v.from.h - player.h;
    ventCooldownT = 0;
    return tryUseVent(bounds(player));
  }

  /** Teleports the player directly into a spotlight drone's cone (centered
   *  under it, one tile below), for asserting the spotlight-fail path. */
  function __debugTeleportUnderDrone(index) {
    if (!player) return false;
    const drones = guards.filter((g) => g.isDrone);
    if (!drones.length) return false;
    const d = index != null && drones[index] ? drones[index] : drones[0];
    player.x = d.x + d.w / 2 - player.w / 2;
    player.y = d.y + d.h + TILE - player.h;
    player.vx = 0; player.vy = 0;
    return true;
  }

  /** Lands one stun hit on the first EliteGuard through its real
   *  paralyze() override, so a test can verify the first hit only
   *  staggers and the second actually freezes it. */
  function __debugStunElite(index) {
    const elites = guards.filter((g) => g.isElite);
    if (!elites.length) return null;
    const e = index != null && elites[index] ? elites[index] : elites[0];
    e.paralyze(STUN_PARALYZE_DURATION);
    return { stunHits: e.stunHits, paralyzed: e.paralyzed, paralyzedT: e.paralyzedT };
  }

  /** Lands a single hit on the (already-awake) boss through its own
   *  paralyze() — used to walk a FinalBoss phase by phase rather than
   *  jumping straight to defeated the way __debugForceDefeatBoss does. */
  function __debugHitBossOnce() {
    if (!boss) return null;
    boss.paralyze(STUN_PARALYZE_DURATION);
    return {
      hitsTaken: boss.hitsTaken, maxHits: boss.maxHits,
      phase: boss.phase, invulnerable: !!boss.invulnerable, defeated: boss.defeated,
    };
  }

  /** Clears a FinalBoss's between-phase invulnerability window instantly,
   *  so a test doesn't have to wait out phaseShiftDuration in real time. */
  function __debugClearBossPhaseShift() {
    if (boss && boss.phaseShiftT) boss.phaseShiftT = 0;
  }

  return {
    start, stop, debugState,
    __debugForceCollectAll, __debugTeleportToDoor, __debugTeleportToCorrectChoice,
    __debugForceStunNearestGuard, __debugTeleportNearGuard, __debugSetPlayerX,
    __debugForceDefeatBoss, __debugGiveGun,
    __debugForceGunHitGuard, __debugGiveShield, __debugTeleportToMinion, __debugTeleportToPickupType,
    __debugHackLightSwitch, __debugSetLasers, __debugTeleportToLaser, __debugUseVent,
    __debugTeleportUnderDrone, __debugStunElite, __debugHitBossOnce, __debugClearBossPhaseShift,
  };
})();
