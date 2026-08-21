/* ============================================================
   game.js
   Main ARCADE engine: state machine, world construction, the
   game loop, rendering, collision orchestration and difficulty
   scaling. Also owns app-wide navigation between screens (name
   capture -> story briefing -> mode select -> Arcade or Story)
   and the small window.CG shared-services object Story Mode
   (story.js) reads from — player name, the shared input state,
   the audio manager, and the leaderboard instance.
   ============================================================ */

(function () {
  "use strict";

  /* ---------------- Constants ---------------- */
  const DURATION = 60;
  const WORLD_WIDTH = 900;
  const ZONE_HEIGHT = 900;
  const ZONE_NAMES = [
    "Meridian Main Gate",
    "Security Checkpoint",
    "Office Floor",
    "Network Operations Center",
    "Data Center Corridor",
    "Secure Server Room",
  ];
  const ZONE_COUNT = ZONE_NAMES.length;
  // Short lore beat shown once (fading toast) the first time the player
  // enters each zone — same "02:14 AM" intrusion thread that opens Story
  // Mode's Floor 1, so both modes read as the same incident.
  const ZONE_STORY_NOTES = [
    "02:14 AM. The main gate log shows one badge swipe that doesn't match anyone on file.",
    "Checkpoint cameras looped for six minutes overnight — just long enough for someone to walk through twice.",
    "Every desk is empty and every monitor is still on. Nobody here had time to lock their screen.",
    "The NOC's alert dashboard spiked at 02:14 AM, then went silent — like something told it to stop watching.",
    "Access logs for this corridor were wiped clean except for a single timestamp: 02:14 AM.",
    "This is where it started, and where it ends. The compromised rack is close now.",
  ];
  const WORLD_HEIGHT = ZONE_COUNT * ZONE_HEIGHT;
  const VIEW_WIDTH = 900;
  const VIEW_HEIGHT = 600;
  const DIFFICULTY_STEP_SECONDS = 15;
  const DIFFICULTY_STEP_INCREASE = 0.25;

  /* ---------------- Roguelite mode (Arcade) ----------------
     Arcade Mission is no longer a single 60-second run over six fixed
     zones. It's an ENDLESS escalating descent: the same six zones are
     one "floor", and clearing a floor (reaching the Secure Server Room
     rack) rebuilds the world one step harder and drops the player back
     at the entrance. The run ends when the player's health runs out,
     not when a clock does — which is what turns every hazard hit from
     "lost points" into "spent a resource I can't get back".

     Escalation per floor cleared, exactly as specced:
       - enemy speed  x1.05  (compounding via ESCALATION_SPEED)
       - spawn rate   x1.10  (compounding via ESCALATION_SPAWN, applied
                              as extra obstacles seeded into the world)
     Both are computed from the floor number in escalationFor(), so the
     difficulty curve lives in exactly one place. */
  const ESCALATION_SPEED = 0.05;  // +5% enemy speed per floor
  const ESCALATION_SPAWN = 0.10;  // +10% spawn rate per floor
  const ARCADE_MAX_HEALTH = 100;
  const HAZARD_DAMAGE = { drone: 20, laser: 12, malware: 15, alarm: 10 };
  const ARCADE_HURT_INVULN = 0.9; // seconds of damage immunity after a hit

  // EMP stun (Arcade's own, distinct from Story Mode's guard stun): a
  // short-range pulse on the Fire key that disables every drone in
  // radius for a few seconds and feeds the combo. Cooldown-gated rather
  // than charge-limited, so it's always eventually available — the cost
  // of using it is the cooldown, which matters most when a chain is live.
  const EMP_BASE_RADIUS = 130;
  const EMP_BASE_COOLDOWN = 3.2;
  const EMP_STUN_DURATION = 4.0;

  // A perk draft is offered after every PERK_EVERY_FLOORS floors cleared.
  const PERK_EVERY_FLOORS = 3;
  const PERK_CHOICES = 3;

  /** The draftable perk pool. Each perk is a pure state mutation applied
   *  once when drafted (`apply`), so nothing in the game loop has to know
   *  which perks exist — it just reads the run-state fields they set.
   *  `stackable: false` perks are filtered out of future drafts once
   *  taken, so a run can't be trivialized by drafting the same one three
   *  times; the numeric ones stack deliberately. */
  const PERKS = [
    {
      id: "silentFootsteps",
      name: "Silent Footsteps",
      desc: "Drones notice you 25% later. Their patrol paths don't change — their reach does.",
      icon: "👣",
      apply: (r) => { r.droneDetectScale *= 0.75; },
    },
    {
      id: "widerEmp",
      name: "Wider EMP Radius",
      desc: "Your EMP pulse reaches 60% further, disabling more drones per charge.",
      icon: "📡",
      apply: (r) => { r.empRadiusScale *= 1.6; },
    },
    {
      id: "extraHealth",
      name: "Extra Health",
      desc: "+25 max integrity, and patched back to full right now.",
      icon: "❤️",
      apply: (r) => { r.maxHealth += 25; r.health = r.maxHealth; },
    },
    {
      id: "fleetRunner",
      name: "Fleet Runner",
      desc: "+12% movement speed for the rest of the run.",
      icon: "⚡",
      apply: (r) => { r.speedScale *= 1.12; },
    },
    {
      id: "comboKeeper",
      name: "Combo Keeper",
      desc: "Your chain window lasts 50% longer, so a streak survives a longer gap between grabs.",
      icon: "🔗",
      apply: (r) => { r.comboWindowScale *= 1.5; },
    },
    {
      id: "hardened",
      name: "Hardened Shell",
      desc: "All hazard damage reduced by 25%.",
      icon: "🛡️",
      apply: (r) => { r.damageScale *= 0.75; },
    },
    {
      id: "scavenger",
      name: "Scavenger",
      desc: "Tokens, patches and checkpoints are worth 50% more before multipliers.",
      icon: "💰",
      apply: (r) => { r.scoreScale *= 1.5; },
    },
    {
      id: "rapidCharge",
      name: "Rapid Charge",
      desc: "EMP cooldown cut by 35%.",
      icon: "🔋",
      apply: (r) => { r.empCooldownScale *= 0.65; },
    },
    {
      id: "fieldMedic",
      name: "Field Medic",
      desc: "Clearing a floor patches 20 integrity back, up to your maximum.",
      icon: "🩹",
      stackable: false,
      apply: (r) => { r.healPerFloor += 20; },
    },
    {
      id: "overclock",
      name: "Overclock",
      desc: "Start every chain one step higher — your combo begins at 2 instead of 0 after each floor.",
      icon: "🚀",
      stackable: false,
      apply: (r) => { r.comboHeadStart += 2; },
    },
  ];
  const TREE_COLLISION_HALF = 15; // solid but harmless — smaller than the 48px tile art so it doesn't feel unfair
  const ZONE_NOTE_DURATION = 7; // seconds the zone-entry lore toast stays visible + fading
  const ZONE_NOTE_FADE = 1.4; // of which, the final N seconds are a fade-out

  const STATE = { NAME: "name", INSTRUCTIONS: "instructions", PLAYING: "playing", GAMEOVER: "gameover" };

  /* ---------------- Mutable game state ---------------- */
  let canvas, ctx;
  let player, scoreManager, powerUpManager, leaderboard, audioManager;
  let timer;
  let world = null;
  let state = STATE.NAME;
  let playerName = "";
  let reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let multiplierTimeLeft = 0;
  let lastRenderedScore = -1;
  let rafId = null;
  let lastFrameTime = 0;
  let shakeTime = 0;
  let bgScrollT = 0;
  let leaderboardTabMode = "arcade";
  let zonesNoted = null; // Set of zone indices whose lore toast has already fired this run
  let zoneNoteText = "";
  let zoneNoteTimer = 0;

  /* ---------------- Roguelite run state ----------------
     One object holding everything a perk can modify plus the run's own
     progression. Rebuilt from scratch by newRunState() at the start of
     every run, so nothing leaks between runs. Every field here is read
     by the game loop through a small accessor (empRadius(), etc.) rather
     than being applied to the entity classes directly — that keeps the
     obstacle classes (obstacles.js) completely unaware that perks exist. */
  let run = null;
  let empCooldownT = 0;
  let empFlash = null;      // { x, y, r, t } — brief visual for a fired pulse
  let arcadeHurtT = 0;      // post-hit damage immunity countdown
  let arcadeHurtFlash = 0;  // red screen flash countdown
  let perkDraftOpen = false;
  let pendingPerkChoices = [];

  function newRunState() {
    return {
      floor: 1,
      floorsCleared: 0,
      maxHealth: ARCADE_MAX_HEALTH,
      health: ARCADE_MAX_HEALTH,
      perks: [],            // drafted perk ids, in order
      // Perk-modifiable multipliers (all 1 = unmodified).
      droneDetectScale: 1,
      empRadiusScale: 1,
      empCooldownScale: 1,
      speedScale: 1,
      comboWindowScale: 1,
      damageScale: 1,
      scoreScale: 1,
      healPerFloor: 0,
      comboHeadStart: 0,
    };
  }

  /** The escalation curve, in one place. Compounding rather than linear
   *  so an endless run genuinely runs away from the player eventually —
   *  linear growth would flatten out into a plateau they could hold
   *  forever, which is the failure mode this whole mode change exists to
   *  avoid. */
  function escalationFor(floor) {
    const steps = Math.max(0, floor - 1);
    return {
      speed: Math.pow(1 + ESCALATION_SPEED, steps),
      spawn: Math.pow(1 + ESCALATION_SPAWN, steps),
    };
  }

  function empRadius() { return EMP_BASE_RADIUS * run.empRadiusScale; }
  function empCooldown() { return EMP_BASE_COOLDOWN * run.empCooldownScale; }

  // `fire` is Story Mode's guard-stun trigger (see platformer.js) — Arcade
  // never reads it, so it's harmless to keep on the one shared input object.
  // Unlike the directional flags it's edge-triggered: onKeyDown sets it true
  // once per press (never on OS auto-repeat), onKeyUp does NOT clear it, and
  // whichever update loop reads it is responsible for consuming (resetting)
  // it after acting on it, so a tap can never be missed or double-counted.
  // `interact` is FPS Mode's context-action trigger (see fps.js's
  // tryInteract(), used for the Floor 1 hacking-terminal side-quest) —
  // Arcade and Story Mode never read it, so it's harmless on the shared
  // input object. Same one-shot-per-press semantics as `fire`.
  const input = { up: false, down: false, left: false, right: false, fire: false, interact: false, gunFire: false };

  /* ---------------- Zone Y helpers ---------------- */
  function zoneTopY(zoneIndex) {
    return (ZONE_COUNT - 1 - zoneIndex) * ZONE_HEIGHT;
  }
  function zoneIndexForY(y) {
    const band = Math.floor(y / ZONE_HEIGHT);
    const clamped = Math.max(0, Math.min(ZONE_COUNT - 1, band));
    return ZONE_COUNT - 1 - clamped;
  }

  /* ---------------- World construction ---------------- */
  function buildWorld() {
    const w = {
      tokens: [], patches: [], drones: [], lasers: [], malware: [], gates: [], alarms: [],
      checkpointPad: null, serverRack: null, trees: [],
    };

    // Zone 0: Meridian Main Gate (safe entrance) — tokens, plus the entrance's
    // tree line drawn by drawZoneDecor(). Trees are solid (block movement,
    // routed around like a wall) but harmless — no score penalty for
    // bumping one, unlike every other obstacle in this zone list.
    const z0 = zoneTopY(0);
    [[180, 700], [450, 620], [720, 700], [300, 400], [600, 400]].forEach(([x, ly]) => {
      w.tokens.push(new SecurityToken(x, z0 + ly));
    });
    [[80, 480], [760, 430], [80, 720], [760, 680], [180, 620], [660, 560]].forEach(([x, ly]) => {
      // Stored center-based (matches every other obstacle class here) even
      // though the tile art itself is drawn from a top-left anchor in
      // drawZoneDecor — ARCADE_TILE/2 converts between the two.
      w.trees.push({ x: x + ARCADE_TILE / 2, y: z0 + ly + ARCADE_TILE / 2 });
    });

    // Zone 1: Security Checkpoint — patrol drones + checkpoint pad
    const z1 = zoneTopY(1);
    w.drones.push(new SecurityDrone(280, z1 + 650, 160, 85));
    w.drones.push(new SecurityDrone(600, z1 + 420, 180, 100));
    w.drones.push(new SecurityDrone(420, z1 + 200, 150, 95));
    w.checkpointPad = new CheckpointPad(450, z1 + 90);
    w.tokens.push(new SecurityToken(150, z1 + 500));
    w.tokens.push(new SecurityToken(750, z1 + 300));

    // Zone 2: Office Floor — malware zones + timed firewall gates
    const z2 = zoneTopY(2);
    w.malware.push(new MalwareZone(250, z2 + 700, 46));
    w.malware.push(new MalwareZone(650, z2 + 560, 42));
    w.malware.push(new MalwareZone(380, z2 + 380, 44));
    w.malware.push(new MalwareZone(700, z2 + 200, 40));
    w.gates.push(new FirewallGate(450, z2 + 620, WORLD_WIDTH, 3.0));
    w.gates.push(new FirewallGate(450, z2 + 260, WORLD_WIDTH, 3.4));
    w.tokens.push(new SecurityToken(150, z2 + 460));
    w.tokens.push(new SecurityToken(750, z2 + 100));

    // Zone 3: Network Operations Center — patch files + alarm area
    const z3 = zoneTopY(3);
    [[200, 720], [450, 620], [700, 720], [300, 380], [600, 380]].forEach(([x, ly]) => {
      w.patches.push(new PatchFile(x, z3 + ly));
    });
    w.alarms.push(new AlarmArea(450, z3 + 500, 110, 4.2));
    w.gates.push(new FirewallGate(450, z3 + 150, WORLD_WIDTH, 2.6));

    // Zone 4: Data Center Corridor — laser security grid
    const z4 = zoneTopY(4);
    w.lasers.push(new LaserBeam(z4 + 150, WORLD_WIDTH, 1.0, 0));
    w.lasers.push(new LaserBeam(z4 + 350, WORLD_WIDTH, 1.15, 1.4));
    w.lasers.push(new LaserBeam(z4 + 550, WORLD_WIDTH, 0.9, 2.6));
    w.lasers.push(new LaserBeam(z4 + 750, WORLD_WIDTH, 1.25, 0.7));
    w.tokens.push(new SecurityToken(450, z4 + 450));

    // Zone 5: Secure Server Room — mission goal
    const z5 = zoneTopY(5);
    w.serverRack = new ServerRack(450, z5 + 170);

    seedEscalatedObstacles(w);

    // Perks that modify an obstacle's own fields are pushed onto the
    // freshly-built world here, so every rebuild (every floor) re-applies
    // them rather than silently losing them on the next floor.
    if (run) w.drones.forEach((d) => { d.detectScale = run.droneDetectScale; });

    return w;
  }

  /** The "+10% spawn rate per floor" half of the escalation curve. Rather
   *  than changing the six hand-placed zones (whose layouts are tuned and
   *  which the mode's whole identity rests on), extra obstacles are
   *  SEEDED on top of them as the floor number climbs — so floor 1 is
   *  exactly the Arcade Mission that always existed, and floor 12 is that
   *  same map buried in threats.
   *
   *  Positions are derived from the floor number rather than Math.random()
   *  so a given floor always looks the same within a run and a run can be
   *  reasoned about (and tested) deterministically — a roguelite wants
   *  escalating pressure, not unrepeatable chaos. Each extra obstacle is
   *  also kept clear of the player's spawn column at the very bottom of
   *  the world, so a floor can never open with an unavoidable hit. */
  function seedEscalatedObstacles(w) {
    const { spawn } = escalationFor(run ? run.floor : 1);
    // Baseline hazard count across the hand-placed zones is 11 (3 drones,
    // 4 lasers, 4 malware); the spawn multiplier says how many total
    // there should now be, and the difference is what gets seeded.
    const baseline = w.drones.length + w.lasers.length + w.malware.length;
    let extra = Math.round(baseline * (spawn - 1));
    if (extra <= 0) return;

    const spawnSafeY = WORLD_HEIGHT - 260; // the player's own start pocket
    let seed = (run ? run.floor : 1) * 977;
    const nextRand = () => {
      // Small deterministic LCG — same floor, same layout, every time.
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    let placed = 0, attempts = 0;
    while (placed < extra && attempts < extra * 12) {
      attempts++;
      const kind = attempts % 3;
      const x = 90 + nextRand() * (WORLD_WIDTH - 180);
      const y = 120 + nextRand() * (WORLD_HEIGHT - 400);
      if (y > spawnSafeY) continue;
      if (kind === 0) {
        const range = 110 + nextRand() * 90;
        w.drones.push(new SecurityDrone(x, y, range, 80 + nextRand() * 40));
      } else if (kind === 1) {
        w.malware.push(new MalwareZone(x, y, 34 + nextRand() * 12));
      } else {
        w.lasers.push(new LaserBeam(y, WORLD_WIDTH, 0.9 + nextRand() * 0.5, nextRand() * 3));
      }
      placed++;
    }
  }

  function resetWorldForNewLap(w) {
    w.tokens.forEach((t) => { t.collected = false; });
    w.patches.forEach((p) => { p.collected = false; });
    if (w.checkpointPad) w.checkpointPad.reset();
  }

  /* ---------------- Setup ---------------- */
  function init() {
    UI.cacheDom();
    canvas = UI.el.canvas;
    ctx = canvas.getContext("2d");

    player = new Player(WORLD_WIDTH, WORLD_WIDTH / 2, WORLD_HEIGHT - 60);
    scoreManager = new ScoreManager();
    powerUpManager = new PowerUpManager(WORLD_WIDTH, WORLD_HEIGHT);
    leaderboard = new Leaderboard();
    audioManager = new AudioManager();
    // The 60-second GameTimer is deliberately no longer constructed:
    // Arcade Mission is an endless roguelite descent now, ended by
    // running out of integrity rather than by a clock. timer.js is left
    // in the project untouched (nothing else depends on it) rather than
    // deleted, so the classic timed mode is one small change away if it's
    // ever wanted back.
    run = newRunState();

    document.body.classList.toggle("reduced-motion", reducedMotion);

    // Small shared-services surface Story Mode (story.js) reads from, so the
    // two modes can share one audio manager, one leaderboard, one input
    // state, and the same captured Guardian name without tight coupling.
    window.CG = {
      getPlayerName: () => playerName,
      audio: audioManager,
      leaderboard: leaderboard,
      input: input,
      isReducedMotion: () => reducedMotion,
    };

    bindEvents();
    UI.showScreen("screen-name");
    UI.el.playerNameInput.focus();
  }

  function bindEvents() {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", () => { input.up = input.down = input.left = input.right = input.fire = input.interact = input.gunFire = false; });

    // Name capture -> Story briefing (the mandatory brief now leads with
    // narrative context before either mission mode is chosen).
    UI.el.btnContinueToBriefing.addEventListener("click", onSubmitName);
    UI.el.playerNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") onSubmitName();
    });
    UI.el.playerNameInput.addEventListener("input", () => UI.setNameError(""));

    // Story briefing
    UI.el.btnBriefingBack.addEventListener("click", () => UI.showScreen("screen-name"));
    UI.el.btnBriefingContinue.addEventListener("click", () => {
      UI.showScreen("screen-mode-select");
      UI.el.btnSelectArcade.focus();
    });

    // Mode select
    UI.el.btnSelectArcade.addEventListener("click", () => {
      UI.showScreen("screen-instructions");
      UI.el.btnStartGame.focus();
    });
    UI.el.btnSelectStory.addEventListener("click", () => {
      UI.showScreen("screen-story-instructions");
      UI.el.btnEnterBuilding.focus();
    });
    UI.el.btnSelectFps.addEventListener("click", () => {
      UI.showScreen("screen-fps-instructions");
      UI.el.btnEnterLobby.focus();
    });
    UI.el.btnModeSelectBack.addEventListener("click", () => UI.showScreen("screen-story-briefing"));
    UI.el.btnLeaderboardModeSelect.addEventListener("click", () => openLeaderboard("arcade"));

    if (UI.el.reducedMotionToggle) {
      UI.el.reducedMotionToggle.checked = reducedMotion;
      UI.el.reducedMotionToggle.addEventListener("change", (e) => {
        reducedMotion = e.target.checked;
        document.body.classList.toggle("reduced-motion", reducedMotion);
      });
    }

    // Arcade instructions / game / result
    UI.el.btnArcadeBack.addEventListener("click", () => UI.showScreen("screen-mode-select"));
    UI.el.btnStartGame.addEventListener("click", onStartGame);

    UI.el.btnPlayAgain.addEventListener("click", () => {
      UI.showScreen("screen-instructions");
    });
    UI.el.btnViewLeaderboardFromResult.addEventListener("click", () => openLeaderboard("arcade"));
    UI.el.btnResultModeSelect.addEventListener("click", () => UI.showScreen("screen-mode-select"));

    UI.el.btnMute.addEventListener("click", () => {
      const nowMuted = !audioManager.muted;
      audioManager.setMuted(nowMuted);
      UI.el.btnMute.textContent = nowMuted ? "🔇 Muted" : "🔊 Sound";
      UI.el.btnMute.setAttribute("aria-pressed", String(nowMuted));
    });
    UI.el.volumeSlider.addEventListener("input", (e) => {
      audioManager.setVolume(Number(e.target.value) / 100);
    });
    UI.bindFullscreenToggle("btnFullscreen", "screen-game");

    bindTouchPad("padUp", "up");
    bindTouchPad("padDown", "down");
    bindTouchPad("padLeft", "left");
    bindTouchPad("padRight", "right");
    // Arcade's EMP trigger — one-shot per tap, same edge-triggered
    // semantics as the keyboard Fire key (the loop is what clears it).
    const padFire = document.getElementById("padFire");
    if (padFire) {
      padFire.addEventListener("pointerdown", (e) => { e.preventDefault(); input.fire = true; });
    }
    // Number keys 1-3 pick a perk during a draft, so the modal is fully
    // keyboard-operable without tabbing to a card first.
    window.addEventListener("keydown", (e) => {
      if (!perkDraftOpen) return;
      const idx = ["Digit1", "Digit2", "Digit3"].indexOf(e.code);
      if (idx >= 0 && pendingPerkChoices[idx]) {
        e.preventDefault();
        choosePerk(pendingPerkChoices[idx].id);
      }
    });

    // Story instructions / result
    UI.el.btnStoryBack.addEventListener("click", () => UI.showScreen("screen-mode-select"));
    UI.el.btnEnterBuilding.addEventListener("click", () => window.Story.start());

    UI.el.btnStoryPlayAgain.addEventListener("click", () => window.Story.restart());
    UI.el.btnStoryResultLeaderboard.addEventListener("click", () => openLeaderboard("story"));
    UI.el.btnStoryResultModeSelect.addEventListener("click", () => UI.showScreen("screen-mode-select"));

    // FPS mode instructions / result
    UI.el.btnFpsBack.addEventListener("click", () => UI.showScreen("screen-mode-select"));
    UI.el.btnEnterLobby.addEventListener("click", () => window.Fps.start());

    UI.el.btnFpsPlayAgain.addEventListener("click", () => window.Fps.restart());
    UI.el.btnFpsResultModeSelect.addEventListener("click", () => UI.showScreen("screen-mode-select"));

    // Leaderboard modal (shared by both modes)
    UI.el.btnLeaderboardTop.addEventListener("click", () => openLeaderboard("arcade"));
    UI.el.btnCloseLeaderboard.addEventListener("click", () => UI.closeLeaderboardModal());
    UI.el.btnClearLeaderboard.addEventListener("click", () => {
      const label = leaderboardTabMode === "story" ? "Story" : "Arcade";
      if (window.confirm(`Clear the ${label} leaderboard? This cannot be undone.`)) {
        leaderboard.clear(leaderboardTabMode);
        renderLeaderboardTab();
      }
    });
    UI.el.lbTabArcade.addEventListener("click", () => { leaderboardTabMode = "arcade"; renderLeaderboardTab(); });
    UI.el.lbTabStory.addEventListener("click", () => { leaderboardTabMode = "story"; renderLeaderboardTab(); });
  }

  function openLeaderboard(mode) {
    leaderboardTabMode = mode || leaderboardTabMode || "arcade";
    renderLeaderboardTab();
    UI.openLeaderboardModal();
  }

  function renderLeaderboardTab() {
    UI.setLeaderboardTab(leaderboardTabMode);
    UI.renderLeaderboard(leaderboard.getTop(10, leaderboardTabMode), playerName);
  }

  function onSubmitName() {
    const result = UI.validateName(UI.el.playerNameInput.value);
    if (!result.ok) {
      UI.setNameError(result.error);
      return;
    }
    playerName = result.value;
    UI.setPlayerNameDisplay(playerName);
    UI.setNameError("");
    UI.showScreen("screen-story-briefing");
    UI.el.btnBriefingContinue.focus();
  }

  const KEY_MAP = {
    ArrowUp: "up", KeyW: "up", Space: "up",
    ArrowDown: "down", KeyS: "down",
    ArrowLeft: "left", KeyA: "left",
    ArrowRight: "right", KeyD: "right",
  };
  // Story Mode's guard-stun trigger — kept separate from KEY_MAP since it
  // needs one-shot-per-press semantics, not held-down semantics.
  const FIRE_KEYS = new Set(["KeyX", "KeyF"]);
  // FPS Mode's context-action trigger (the hacking-terminal side-quest) —
  // same one-shot-per-press semantics as FIRE_KEYS.
  const INTERACT_KEYS = new Set(["KeyE"]);
  // Story Mode's dedicated boss-gun trigger — kept separate from FIRE_KEYS
  // (the stun ability) so once the gun is picked up, both attacks are
  // available side by side rather than one key trying to guess which the
  // player meant. Same one-shot-per-press semantics as FIRE_KEYS.
  const GUN_FIRE_KEYS = new Set(["KeyG"]);

  function onKeyDown(e) {
    const dir = KEY_MAP[e.code];
    if (dir) {
      input[dir] = true;
      // Prevent page scroll during any mode's active movement phase.
      if (state === STATE.PLAYING || window.StoryMazeActive || window.FpsModeActive) e.preventDefault();
    }
    if (FIRE_KEYS.has(e.code)) {
      // e.repeat guards against the OS's key-auto-repeat re-firing this
      // every ~30ms while held — a single press should be a single shot.
      if (!e.repeat) input.fire = true;
      if (state === STATE.PLAYING || window.StoryMazeActive || window.FpsModeActive) e.preventDefault();
    }
    if (INTERACT_KEYS.has(e.code)) {
      if (!e.repeat) input.interact = true;
      if (state === STATE.PLAYING || window.StoryMazeActive || window.FpsModeActive) e.preventDefault();
    }
    if (GUN_FIRE_KEYS.has(e.code)) {
      if (!e.repeat) input.gunFire = true;
      if (state === STATE.PLAYING || window.StoryMazeActive || window.FpsModeActive) e.preventDefault();
    }
  }
  function onKeyUp(e) {
    const dir = KEY_MAP[e.code];
    if (dir) input[dir] = false;
    // input.fire is intentionally left alone here — see the input object's
    // comment above. Clearing it on keyup could drop a shot that hasn't
    // been consumed by the next animation frame yet.
  }

  /** Wires an on-screen d-pad button (shown on touch/tablet layouts) to the shared input state. */
  function bindTouchPad(elId, dir) {
    const el = document.getElementById(elId);
    if (!el) return;
    const set = (val) => (e) => { e.preventDefault(); input[dir] = val; };
    el.addEventListener("pointerdown", set(true));
    el.addEventListener("pointerup", set(false));
    el.addEventListener("pointerleave", set(false));
    el.addEventListener("pointercancel", set(false));
  }

  /* ---------------- Game start / end ---------------- */
  function onStartGame() {
    audioManager.unlock();
    audioManager.startMusic();

    // Run state first — buildWorld()'s escalation seeding reads run.floor.
    run = newRunState();
    world = buildWorld();
    player.reset();
    player.setSpeedScale(1);
    scoreManager.reset();
    powerUpManager.reset();
    multiplierTimeLeft = 0;
    lastRenderedScore = -1;
    zonesNoted = new Set();
    zoneNoteText = "";
    zoneNoteTimer = 0;
    empCooldownT = 0;
    empFlash = null;
    arcadeHurtT = 0;
    arcadeHurtFlash = 0;
    perkDraftOpen = false;
    pendingPerkChoices = [];
    const overlay = UI.el.arcadeOverlay;
    if (overlay) {
      overlay.classList.remove("active");
      overlay.setAttribute("aria-hidden", "true");
      overlay.innerHTML = "";
    }
    UI.setPlayerNameDisplay(playerName);
    UI.updateMissionProgress(zoneIndexForY(player.y), ZONE_COUNT, ZONE_NAMES[zoneIndexForY(player.y)], 0);
    UI.updateCombo(0, 1, 0);
    UI.updatePowerupStatus([]);
    updateArcadeHud();

    state = STATE.PLAYING;
    UI.showScreen("screen-game");

    if (rafId) cancelAnimationFrame(rafId);
    lastFrameTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  /** Ends the run. `cause` is "integrity" when the player's health ran
   *  out (the only way a roguelite run ends now that the 60-second clock
   *  is gone) — kept as a parameter rather than assumed so the result
   *  screen can say something true if another end condition is ever
   *  added. */
  function onGameEnd(cause) {
    state = STATE.GAMEOVER;
    scoreManager.freeze();
    audioManager.stopMusic();
    audioManager.playGameOver();
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    perkDraftOpen = false;
    const overlay = UI.el.arcadeOverlay;
    if (overlay) {
      overlay.classList.remove("active");
      overlay.setAttribute("aria-hidden", "true");
      overlay.innerHTML = "";
    }

    const finalScore = scoreManager.score;
    const { rank } = leaderboard.addEntry(playerName, finalScore, "arcade");
    const personalBest = leaderboard.getPersonalBest(playerName, "arcade");

    UI.renderResult({
      finalScore,
      personalBest,
      highestCombo: scoreManager.highestCombo,
      threatsAvoided: scoreManager.stats.threatsAvoided,
      tokensCollected: scoreManager.stats.tokensCollected,
      patchesApplied: scoreManager.stats.patchesApplied,
      serverRoomsSecured: scoreManager.stats.serverRoomsSecured,
      leaderboardRank: rank,
      floorsCleared: run ? run.floorsCleared : 0,
      dronesStunned: scoreManager.stats.dronesStunned,
      perks: run ? run.perks.map((id) => PERKS.find((p) => p.id === id)).filter(Boolean) : [],
      cause: cause || "integrity",
    });
    UI.announce(`Run over. ${run ? run.floorsCleared : 0} floors cleared. Final score ${finalScore}.`);
    UI.showScreen("screen-result");
  }

  /* ---------------- Collision helpers ---------------- */
  function currentExtraMultiplier() {
    return multiplierTimeLeft > 0 ? 2 : 1;
  }

  function handleHazardHit(kind, x, y) {
    if (player.isInvulnerable) {
      if (player.shieldActive) scoreManager.registerThreatAvoided(x, y);
      return;
    }
    if (arcadeHurtT > 0) return; // still inside the post-hit breather
    scoreManager.addPenalty(kind, x, y);
    player.triggerHitCooldown();
    audioManager.playHit();
    shakeTime = 0.25;
    applyArcadeDamage(kind);
  }

  /* ---------------- Perk draft ---------------- */

  /** Picks PERK_CHOICES distinct perks and pauses the run to offer them.
   *  Non-stackable perks the player already holds are filtered out first,
   *  so a draft never offers something that would do nothing. Selection
   *  is deterministic per draft (seeded off floors cleared) for the same
   *  reason obstacle seeding is: a run should be reproducible. */
  function openPerkDraft() {
    const held = new Set(run.perks);
    const eligible = PERKS.filter((p) => p.stackable === false ? !held.has(p.id) : true);
    if (!eligible.length) return;

    let seed = run.floorsCleared * 7919 + 13;
    const nextRand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const pool = eligible.slice();
    const picks = [];
    while (picks.length < Math.min(PERK_CHOICES, eligible.length)) {
      picks.push(pool.splice(Math.floor(nextRand() * pool.length), 1)[0]);
    }

    pendingPerkChoices = picks;
    perkDraftOpen = true;
    // The loop checks perkDraftOpen and stops advancing the world, but
    // the rAF chain keeps running so the canvas stays painted behind the
    // overlay rather than freezing on a stale frame.
    renderPerkDraft();
  }

  function renderPerkDraft() {
    const overlay = UI.el.arcadeOverlay;
    if (!overlay) return;
    const cards = pendingPerkChoices.map((p, i) => `
      <button class="perk-card" data-perk="${p.id}" type="button">
        <span class="perk-icon" aria-hidden="true">${p.icon}</span>
        <span class="perk-name">${p.name}</span>
        <span class="perk-desc">${p.desc}</span>
        <span class="perk-key">${i + 1}</span>
      </button>`).join("");
    overlay.innerHTML = `
      <div class="story-panel story-panel-wide perk-panel">
        <div class="eyebrow">Floor ${run.floorsCleared} cleared &middot; Upgrade available</div>
        <h2 class="title">Draft a Perk</h2>
        <p class="story-copy">Pick one. It stays with you for the rest of this run &mdash;
           and the tower keeps getting faster and more crowded from here.</p>
        <div class="perk-grid">${cards}</div>
        ${run.perks.length ? `<p class="story-hint">Already running: ${run.perks.map((id) => {
          const p = PERKS.find((x) => x.id === id);
          return p ? `${p.icon} ${p.name}` : id;
        }).join(" · ")}</p>` : ""}
      </div>`;
    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
    overlay.querySelectorAll(".perk-card").forEach((btn) => {
      btn.addEventListener("click", () => choosePerk(btn.dataset.perk));
    });
    const first = overlay.querySelector(".perk-card");
    if (first) first.focus();
  }

  function choosePerk(id) {
    const perk = PERKS.find((p) => p.id === id);
    if (!perk) return;
    perk.apply(run);
    run.perks.push(perk.id);
    // Perks that change a system owned by another module are pushed
    // through here rather than being read by that module every frame.
    scoreManager.setComboWindow(3.5 * run.comboWindowScale);
    player.setSpeedScale(run.speedScale);

    perkDraftOpen = false;
    pendingPerkChoices = [];
    const overlay = UI.el.arcadeOverlay;
    if (overlay) {
      overlay.classList.remove("active");
      overlay.setAttribute("aria-hidden", "true");
      overlay.innerHTML = "";
    }
    audioManager.playCheckpoint();
    updateArcadeHud();
    // The frame clock has been sitting still behind the modal — reset it
    // so the first frame after resuming isn't a giant dt spike that
    // teleports every drone across the map.
    lastFrameTime = performance.now();
  }

  function updateCollisions(dt) {
    const pb = player.getBounds();

    world.tokens.forEach((t) => {
      if (!t.collected && aabbOverlap(pb, t.getBounds())) {
        t.collected = true;
        scoreManager.addPositive("token", t.x, t.y, currentExtraMultiplier(), run.scoreScale);
        audioManager.playCollect();
      }
    });

    world.patches.forEach((p) => {
      if (!p.collected && aabbOverlap(pb, p.getBounds())) {
        p.collected = true;
        scoreManager.addPositive("patch", p.x, p.y, currentExtraMultiplier(), run.scoreScale);
        audioManager.playPatch();
      }
    });

    if (world.checkpointPad && !world.checkpointPad.activated && aabbOverlap(pb, world.checkpointPad.getBounds())) {
      world.checkpointPad.activated = true;
      scoreManager.addPositive("checkpoint", world.checkpointPad.x, world.checkpointPad.y, currentExtraMultiplier(), run.scoreScale);
      audioManager.playCheckpoint();
    }

    // A stunned drone is safe to walk through — the whole point of
    // spending an EMP charge, and the same contract Story Mode's stun has.
    world.drones.forEach((d) => { if (d.stunT <= 0 && aabbOverlap(pb, d.getBounds())) handleHazardHit("drone", d.x, d.y); });
    world.lasers.forEach((l) => { if (aabbOverlap(pb, l.getBounds())) handleHazardHit("laser", l.x, l.y); });
    world.malware.forEach((m) => { if (aabbOverlap(pb, m.getBounds())) handleHazardHit("malware", m.x, m.y); });

    world.alarms.forEach((a) => {
      const bounds = a.getBounds();
      if (bounds && aabbOverlap(pb, bounds) && !a.alreadyPenalized) {
        a.alreadyPenalized = true;
        if (player.isInvulnerable) {
          if (player.shieldActive) scoreManager.registerThreatAvoided(a.x, a.y);
        } else {
          scoreManager.addPenalty("alarm", a.x, a.y);
          audioManager.playHit();
          applyArcadeDamage("alarm");
        }
      }
    });

    powerUpManager.active.forEach((p) => {
      if (!p.collected && aabbOverlap(pb, p.getBounds())) {
        p.collected = true;
        applyPowerUp(p);
      }
    });

    if (world.serverRack && aabbOverlap(pb, world.serverRack.getBounds())) {
      scoreManager.addPositive("serverRoom", world.serverRack.x, world.serverRack.y, currentExtraMultiplier(), run.scoreScale);
      audioManager.playServerSecured();
      advanceArcadeFloor();
    }
  }

  /** Clearing a floor: bank it, escalate, rebuild the world one step
   *  harder, and put the player back at the entrance. Every third floor
   *  this also opens the perk draft, which pauses the loop until the
   *  player picks (see openPerkDraft()). */
  function advanceArcadeFloor() {
    run.floorsCleared += 1;
    run.floor += 1;
    if (run.healPerFloor > 0) {
      run.health = Math.min(run.maxHealth, run.health + run.healPerFloor);
    }

    world = buildWorld();
    powerUpManager.reset();
    player.reset();
    zonesNoted = new Set();
    zoneNoteText = "";
    zoneNoteTimer = 0;
    empCooldownT = 0;
    // The Overclock perk starts each floor's chain partway up rather than
    // from nothing — deliberately applied here (per floor) rather than
    // per pickup, so it's a head start, not a permanent floor.
    scoreManager.combo = run.comboHeadStart;
    scoreManager.comboTimeLeft = run.comboHeadStart > 0 ? scoreManager.comboWindow : 0;

    updateArcadeHud();

    if (run.floorsCleared % PERK_EVERY_FLOORS === 0) openPerkDraft();
  }

  /** Arcade's EMP pulse — the Fire key's Arcade behaviour. Disables every
   *  drone inside the (perk-scalable) radius for a few seconds and scores
   *  each one as a combo action, which is the second half of the
   *  "combo builds on fast pickups AND stuns" design. */
  function tryArcadeStun() {
    if (empCooldownT > 0) return;
    empCooldownT = empCooldown();
    const r = empRadius();
    empFlash = { x: player.x, y: player.y, r, t: 0.35 };
    audioManager.playPowerup();

    let hits = 0;
    world.drones.forEach((d) => {
      if (d.stunT > 0) return;
      if (Math.hypot(d.x - player.x, d.y - player.y) > r) return;
      d.stunT = EMP_STUN_DURATION;
      hits++;
      scoreManager.addPositive("stun", d.x, d.y, currentExtraMultiplier(), run.scoreScale);
    });
    if (!hits) scoreManager.showFloatingText(player.x, player.y - 20, "EMP — NO TARGET", "#64748B");
  }

  /** Applies hazard damage (perk-scalable) and ends the run at zero.
   *  Replaces the old points-only penalty model — the score penalty is
   *  kept on top, so a hit still costs both a resource and points. */
  function applyArcadeDamage(kind) {
    if (arcadeHurtT > 0) return false;
    const dmg = Math.round((HAZARD_DAMAGE[kind] || 10) * run.damageScale);
    run.health = Math.max(0, run.health - dmg);
    arcadeHurtT = ARCADE_HURT_INVULN;
    arcadeHurtFlash = 0.35;
    updateArcadeHud();
    if (run.health <= 0) { onGameEnd("integrity"); return true; }
    return false;
  }

  function updateArcadeHud() {
    UI.updateArcadeRun({
      floor: run.floor,
      health: run.health,
      maxHealth: run.maxHealth,
      perks: run.perks.map((id) => PERKS.find((p) => p.id === id)).filter(Boolean),
    });
  }

  function applyPowerUp(p) {
    audioManager.playPowerup();
    scoreManager.showFloatingText(p.x, p.y, p.def.label, p.def.color);
    switch (p.type) {
      case "shield": player.applyShield(p.def.duration); break;
      case "speed": player.applySpeedBoost(p.def.duration); break;
      case "multiplier": multiplierTimeLeft = Math.max(multiplierTimeLeft, p.def.duration); break;
      // The Timer Bonus powerup has no clock to extend now that Arcade is
      // an endless roguelite — it repairs integrity instead, which is the
      // resource that actually gates a run's length in this mode.
      case "timer": run.health = Math.min(run.maxHealth, run.health + 15); updateArcadeHud(); break;
    }
  }

  /** Prevents the player from walking through a closed firewall gate. */
  function resolveGateCollisions(prevX, prevY) {
    const pb = player.getBounds();
    for (const gate of world.gates) {
      const bounds = gate.getBounds();
      if (bounds && aabbOverlap(pb, bounds)) {
        player.x = prevX;
        player.y = prevY;
        return;
      }
    }
  }

  /** Trees are solid scenery — block movement like a wall, but (unlike
   *  every hazard in updateCollisions) never cost the player any points. */
  function resolveTreeCollisions(prevX, prevY) {
    const pb = player.getBounds();
    for (const t of world.trees) {
      const bounds = {
        left: t.x - TREE_COLLISION_HALF, right: t.x + TREE_COLLISION_HALF,
        top: t.y - TREE_COLLISION_HALF, bottom: t.y + TREE_COLLISION_HALF,
      };
      if (aabbOverlap(pb, bounds)) {
        player.x = prevX;
        player.y = prevY;
        return;
      }
    }
  }

  /* ---------------- Main loop ---------------- */
  function loop(now) {
    if (state !== STATE.PLAYING) return;
    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    // While the perk draft modal is up the world is frozen, but the frame
    // keeps painting so the canvas behind the overlay stays live rather
    // than sitting on a stale image.
    if (!perkDraftOpen) update(dt);
    render();

    rafId = requestAnimationFrame(loop);
  }

  function update(dt) {
    // Difficulty now comes from the FLOOR, not the clock — the 60-second
    // timer that used to drive it is gone (see the roguelite note above).
    // Compounding per floor rather than stepping every 15 seconds means a
    // run's pressure is a function of how deep the player got, not how
    // long they stalled.
    const difficultyMult = escalationFor(run.floor).speed;

    if (empCooldownT > 0) empCooldownT = Math.max(0, empCooldownT - dt);
    if (arcadeHurtT > 0) arcadeHurtT = Math.max(0, arcadeHurtT - dt);
    if (arcadeHurtFlash > 0) arcadeHurtFlash = Math.max(0, arcadeHurtFlash - dt);
    if (empFlash) { empFlash.t -= dt; if (empFlash.t <= 0) empFlash = null; }
    if (input.fire) {
      input.fire = false;
      tryArcadeStun();
    }

    const prevX = player.x, prevY = player.y;
    player.update(dt, input, WORLD_HEIGHT);

    world.drones.forEach((d) => d.update(dt, difficultyMult, player));
    world.lasers.forEach((l) => l.update(dt, difficultyMult));
    world.malware.forEach((m) => m.update(dt));
    world.gates.forEach((g) => g.update(dt, difficultyMult));
    world.alarms.forEach((a) => a.update(dt, difficultyMult));
    world.tokens.forEach((t) => t.update(dt));
    world.patches.forEach((p) => p.update(dt));
    if (world.checkpointPad) world.checkpointPad.update(dt);
    if (world.serverRack) world.serverRack.update(dt);

    resolveGateCollisions(prevX, prevY);
    resolveTreeCollisions(prevX, prevY);

    powerUpManager.update(dt, player.y);

    if (multiplierTimeLeft > 0) {
      multiplierTimeLeft = Math.max(0, multiplierTimeLeft - dt);
    }
    if (shakeTime > 0) shakeTime = Math.max(0, shakeTime - dt);
    if (zoneNoteTimer > 0) zoneNoteTimer = Math.max(0, zoneNoteTimer - dt);
    bgScrollT += dt;

    updateCollisions(dt);
    scoreManager.update(dt);

    // HUD updates
    if (scoreManager.score !== lastRenderedScore) {
      UI.updateScore(scoreManager.score);
      lastRenderedScore = scoreManager.score;
    }
    UI.updateCombo(scoreManager.combo, scoreManager.comboMultiplier, scoreManager.comboWindowRatio);
    const effects = [];
    if (player.shieldActive) effects.push({ label: "SHIELD", timeLeft: player.shieldTimeLeft });
    if (player.speedBoostActive) effects.push({ label: "SPEED", timeLeft: player.speedBoostTimeLeft });
    if (multiplierTimeLeft > 0) effects.push({ label: "2x SCORE", timeLeft: multiplierTimeLeft });
    if (empCooldownT > 0) effects.push({ label: "EMP", timeLeft: empCooldownT });
    UI.updatePowerupStatus(effects);
    const zIndex = zoneIndexForY(player.y);
    UI.updateMissionProgress(zIndex, ZONE_COUNT, ZONE_NAMES[zIndex], scoreManager.stats.serverRoomsSecured);
    if (zonesNoted && !zonesNoted.has(zIndex)) {
      zonesNoted.add(zIndex);
      zoneNoteText = ZONE_STORY_NOTES[zIndex] || "";
      zoneNoteTimer = zoneNoteText ? ZONE_NOTE_DURATION : 0;
    }
  }

  /* ---------------- Rendering ---------------- */
  function render() {
    const camY = Math.max(0, Math.min(WORLD_HEIGHT - VIEW_HEIGHT, player.y - VIEW_HEIGHT / 2));

    ctx.save();
    if (shakeTime > 0 && !reducedMotion) {
      const mag = shakeTime * 14;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }

    drawBackground(camY);
    drawZoneDecor(camY);

    world.malware.forEach((m) => m.draw(ctx, camY, reducedMotion));
    world.gates.forEach((g) => g.draw(ctx, camY));
    world.alarms.forEach((a) => a.draw(ctx, camY, reducedMotion));
    world.tokens.forEach((t) => t.draw(ctx, camY, reducedMotion));
    world.patches.forEach((p) => p.draw(ctx, camY, reducedMotion));
    if (world.checkpointPad) world.checkpointPad.draw(ctx, camY, reducedMotion);
    if (world.serverRack) world.serverRack.draw(ctx, camY, reducedMotion);
    world.lasers.forEach((l) => l.draw(ctx, camY, reducedMotion));
    world.drones.forEach((d) => d.draw(ctx, camY, reducedMotion));
    powerUpManager.draw(ctx, camY, reducedMotion);

    player.draw(ctx, camY, reducedMotion);

    // EMP pulse ring — expands and fades over its brief life so the
    // player can see exactly how far the pulse actually reached (which
    // the "Wider EMP Radius" perk visibly changes).
    if (empFlash) {
      const t = 1 - empFlash.t / 0.35;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t) * 0.8;
      ctx.strokeStyle = "#38BDF8";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#38BDF8";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(empFlash.x, empFlash.y - camY, empFlash.r * (0.35 + t * 0.65), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    scoreManager.drawFloatingTexts(ctx, camY);

    drawScanlines(camY);
    ctx.restore();

    if (arcadeHurtFlash > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(239,68,68,${(arcadeHurtFlash / 0.35) * 0.3})`;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      ctx.restore();
    }

    drawZoneNote();
  }

  /** A found-note toast in the corner of the screen the first time the
   *  player enters each zone — fades in/hold/out over ZONE_NOTE_DURATION
   *  seconds so it never blocks play. Drawn in screen space (after the
   *  camera-transformed ctx.restore() above), mirroring platformer.js's
   *  drawStoryNote() so both modes present in-level lore the same way. */
  function drawZoneNote() {
    if (zoneNoteTimer <= 0 || !zoneNoteText) return;
    const alpha = Math.min(1, zoneNoteTimer / ZONE_NOTE_FADE);
    const maxWidth = 360;
    const pad = 14;
    ctx.save();
    ctx.font = "12px 'Share Tech Mono', monospace";
    const words = zoneNoteText.split(" ");
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
    ctx.strokeStyle = "rgba(56,189,248,0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    else ctx.rect(boxX, boxY, boxW, boxH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#38BDF8";
    ctx.font = "bold 11px 'Share Tech Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("📝 FIELD NOTE", boxX + pad, boxY + pad + 10);

    ctx.fillStyle = "rgba(226,232,240,0.95)";
    ctx.font = "12px 'Share Tech Mono', monospace";
    lines.forEach((l, i) => {
      ctx.fillText(l, boxX + pad, boxY + pad + 30 + i * lineH);
    });

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  const ARCADE_TILE = 48;

  /** Draws one tile from the detailed arcade prop tileset (see gen_arcade_assets.py). */
  function drawTile(key, dx, dy, w, h) {
    const img = window.SPRITES && window.SPRITES.arcadeTileset;
    const idx = window.ARCADE_TILE_INDEX && window.ARCADE_TILE_INDEX[key];
    if (!(img && img.complete && img.naturalWidth > 0) || idx === undefined) return;
    const fw = img.naturalWidth / 10;
    const fh = img.naturalHeight;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, idx * fw, 0, fw, fh, dx, dy, w || ARCADE_TILE, h || ARCADE_TILE);
    ctx.restore();
  }

  /** Slow-scrolling dot grid drawn behind everything for a cheap parallax depth cue. */
  function drawParallaxLayer(camY) {
    if (reducedMotion) return;
    const depth = 0.35; // moves slower than the world -> reads as "further away"
    const offsetY = -((camY * depth) % 60);
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#38BDF8";
    for (let y = offsetY - 60; y < VIEW_HEIGHT + 60; y += 60) {
      for (let x = 30; x < VIEW_WIDTH; x += 60) {
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawBackground(camY) {
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    drawParallaxLayer(camY);

    // Draw each visible zone's tinted band + divider
    const topZone = zoneIndexForY(camY);
    const bottomZone = zoneIndexForY(camY + VIEW_HEIGHT);
    const zonesToDraw = new Set([topZone, bottomZone]);
    // Ensure any zone fully spanned is included
    for (let i = 0; i < ZONE_COUNT; i++) {
      const top = zoneTopY(i);
      if (top < camY + VIEW_HEIGHT && top + ZONE_HEIGHT > camY) zonesToDraw.add(i);
    }

    const ZONE_TINTS = ["#0f2318", "#141a33", "#1a1430", "#0f2233", "#1a0f1f", "#0f2a1a"];
    const ZONE_FLOOR_TILE = ["pathway", "floorTech", "floorTech", "floorTech", "floorTech", "floorTech"];
    zonesToDraw.forEach((i) => {
      const top = zoneTopY(i);
      const sy = top - camY;

      // Tiled floor texture (16-bit-style prop tile) instead of a flat rectangle.
      const tileKey = ZONE_FLOOR_TILE[i] || "floorTech";
      const startCol = 0;
      const endCol = Math.ceil(VIEW_WIDTH / ARCADE_TILE);
      const startRow = Math.floor(Math.max(0, sy) / ARCADE_TILE);
      const endRow = Math.ceil((sy + ZONE_HEIGHT) / ARCADE_TILE);
      for (let c = startCol; c <= endCol; c++) {
        for (let r = startRow; r <= endRow; r++) {
          const ty = top + r * ARCADE_TILE - camY;
          if (ty < sy - ARCADE_TILE || ty > sy + ZONE_HEIGHT) continue;
          drawTile(tileKey, c * ARCADE_TILE, ty, ARCADE_TILE, ARCADE_TILE);
        }
      }

      // Zone-colour tint over the tiles so each zone still reads as a distinct place.
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = ZONE_TINTS[i] || "#0F172A";
      ctx.fillRect(0, sy, VIEW_WIDTH, ZONE_HEIGHT);
      ctx.restore();

      // Divider line + zone label near the top edge of the zone
      ctx.strokeStyle = "rgba(56,189,248,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(VIEW_WIDTH, sy);
      ctx.stroke();
      ctx.font = "12px 'Share Tech Mono', monospace";
      ctx.fillStyle = "rgba(148,163,184,0.7)";
      ctx.textAlign = "left";
      ctx.fillText(`ZONE ${i + 1} · ${ZONE_NAMES[i].toUpperCase()}`, 12, sy + 18);
    });
  }

  function drawZoneDecor(camY) {
    // Detailed prop-tile decoration per zone (see tools/gen_arcade_assets.py)
    // so the world reads as a real facility with SNES-style set dressing
    // rather than flat tinted rectangles. A few props get a subtle animated
    // pulse for life, skipped entirely under reduced-motion.
    const draw = (i, fn) => {
      const top = zoneTopY(i);
      if (top < camY + VIEW_HEIGHT && top + ZONE_HEIGHT > camY) fn(top - camY);
    };
    const t = bgScrollT;

    draw(0, (sy) => { // Entrance: building facade + tree line + central pathway
      drawTile("buildingWall", 0, sy + 40, VIEW_WIDTH, ARCADE_TILE);
      for (let x = 405; x < VIEW_WIDTH; x += ARCADE_TILE) {
        for (let y = sy + 88; y < sy + ZONE_HEIGHT; y += ARCADE_TILE) drawTile("pathway", x, y);
      }
      // Drawn from world.trees (not a separate hardcoded list) so the
      // visible canopy always lines up with the solid hitbox players
      // actually collide with.
      world.trees.forEach((tr, idx) => {
        const bob = reducedMotion ? 0 : Math.sin(t * 1.4 + idx) * 2;
        drawTile("tree", tr.x - ARCADE_TILE / 2, tr.y - camY - ARCADE_TILE / 2 + bob, ARCADE_TILE, ARCADE_TILE);
      });
    });

    draw(1, (sy) => { // Checkpoint: turnstile posts across the lane
      for (let x = 50; x < VIEW_WIDTH; x += 170) {
        for (let y = sy + 24; y < sy + ZONE_HEIGHT; y += ARCADE_TILE) drawTile("turnstile", x, y);
      }
    });

    draw(2, (sy) => { // Office floor: cubicle grid
      for (let x = 60; x < VIEW_WIDTH; x += 130) {
        for (let y = sy + 90; y < sy + ZONE_HEIGHT; y += 130) drawTile("cubicle", x, y, ARCADE_TILE, ARCADE_TILE);
      }
    });

    draw(3, (sy) => { // NOC: server racks + flickering monitors
      for (let x = 40; x < VIEW_WIDTH; x += 140) {
        for (let y = sy + 44; y < sy + ZONE_HEIGHT; y += ARCADE_TILE) drawTile("serverRack", x, y);
      }
      for (let x = 100; x < VIEW_WIDTH; x += 280) {
        const flicker = reducedMotion ? 1 : 0.7 + Math.sin(t * 5 + x) * 0.3;
        ctx.save();
        ctx.globalAlpha = flicker;
        drawTile("monitor", x, sy + 60);
        ctx.restore();
      }
    });

    draw(4, (sy) => { // Data corridor: overhead support beams
      for (let y = sy + 20; y < sy + ZONE_HEIGHT; y += 220) {
        for (let x = 0; x < VIEW_WIDTH; x += ARCADE_TILE) drawTile("beam", x, y);
      }
    });

    draw(5, (sy) => { // Server room: rack aisles, glowing near the goal rack
      for (let x = 40; x < VIEW_WIDTH; x += 130) {
        if (Math.abs(x - 450) < 90) continue; // leave room around the goal rack object
        const nearGoal = Math.abs(x - 450) < 220;
        for (let y = sy + 420; y < sy + ZONE_HEIGHT; y += ARCADE_TILE) {
          drawTile(nearGoal ? "rackGoal" : "serverRack", x, y);
        }
      }
    });
  }

  function drawScanlines(camY) {
    if (reducedMotion) return;
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = "#38BDF8";
    ctx.lineWidth = 1;
    const offset = (bgScrollT * 40) % 4;
    for (let y = -offset; y < VIEW_HEIGHT; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW_WIDTH, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------------- QA hooks (Arcade roguelite) ----------------
     Same `__debug*` convention as Story Mode's Platformer hooks and FPS
     Mode's window.Fps hooks: never called by any gameplay path, exposed
     only so the automated suite can drive the endless run deterministically
     (a real playthrough of 6+ floors to reach a perk draft isn't something
     a headless test can reliably do). Each one routes through the same
     real function normal play does, rather than setting end-state. */
  window.Arcade = {
    debugState() {
      if (!run) return null;
      return {
        state,
        floor: run.floor,
        floorsCleared: run.floorsCleared,
        health: run.health,
        maxHealth: run.maxHealth,
        perks: run.perks.slice(),
        score: scoreManager ? scoreManager.score : 0,
        combo: scoreManager ? scoreManager.combo : 0,
        comboMultiplier: scoreManager ? scoreManager.comboMultiplier : 1,
        comboWindowRatio: scoreManager ? scoreManager.comboWindowRatio : 0,
        perkDraftOpen,
        pendingPerks: pendingPerkChoices.map((p) => p.id),
        empCooldownT,
        droneCount: world ? world.drones.length : 0,
        hazardCount: world ? world.drones.length + world.lasers.length + world.malware.length : 0,
        stunnedDrones: world ? world.drones.filter((d) => d.stunT > 0).length : 0,
        droneDetectScale: run.droneDetectScale,
        speedScale: run.speedScale,
        escalation: escalationFor(run.floor),
      };
    },
    /** Clears the current floor through the real advanceArcadeFloor()
     *  path (escalation, rebuild, perk-draft check and all). */
    __debugClearFloor() { advanceArcadeFloor(); return this.debugState(); },
    /** Applies real hazard damage through applyArcadeDamage(), bypassing
     *  only the post-hit invulnerability window so a test can drive a run
     *  to death without waiting it out. */
    __debugDamage(kind) { arcadeHurtT = 0; applyArcadeDamage(kind || "drone"); return this.debugState(); },
    /** Fires the EMP through the real tryArcadeStun(), optionally
     *  teleporting the player onto a drone first so it actually connects. */
    __debugEmp(onDrone) {
      if (onDrone && world && world.drones.length) {
        const d = world.drones.find((x) => x.stunT <= 0) || world.drones[0];
        player.x = d.x; player.y = d.y;
      }
      empCooldownT = 0;
      tryArcadeStun();
      return this.debugState();
    },
    __debugChoosePerk(id) { choosePerk(id); return this.debugState(); },
  };

  window.addEventListener("DOMContentLoaded", init);
})();
