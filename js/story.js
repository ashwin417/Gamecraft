/* ============================================================
   story.js
   STORY MODE engine — "TEN FLOORS OF INDIGO TOWER"

   A Dangerous-Dave-style campaign. Every floor — including the ones
   that used to be static quiz/treasure screens — is now a real
   side-scrolling platform level driven by platformer.js: gravity,
   running, jumping, ladders, and actively-hunting Security Guards
   throughout. Two level "modes" (see platformer.js):
     - "trophy" (the original platform floors): collect every
       trophy, then reach the door.
     - "choice" (the former quiz/treasure floors): navigate the
       maze to the one lettered terminal/location that matches the
       correct answer, shown to the player on the pre-level
       briefing before they enter.
   One mistake on any floor — a guard catch, a fall, a wrong
   terminal, or picking the wrong floor in the elevator — ends the
   mission immediately, mirroring the original "Dave" tension of
   instant failure. Floor 5 (Legal & Compliance) is a mid-run
   gauntlet: its quiz wakes a named boss (see floors-data.js's `boss`
   field, platformer.js's activateBoss()) that has to be stunned down
   before its door unlocks. Clearing Floor 10, the Secure Server Room,
   doesn't win the mission outright either — it opens a terminal where
   the player has to type in the access code assembled, one letter at
   a time, from every floor cleared along the way. Content (levels,
   riddles, password letters) lives in floors-data.js so it can be
   tuned independently of this file.

   Depends on: floors-data.js, platformer.js, guards.js, obstacles.js
   (aabbOverlap), ui.js (UI.showScreen/announce/escapeHtml), and
   window.CG, a small shared-services object game.js sets up
   during init() (player name, shared input state, the audio
   manager, and the leaderboard instance).
   ============================================================ */

window.Story = (function () {
  "use strict";

  const el = {};
  let bound = false;

  let state = "idle"; // idle | intro | platform | solved | riddle | elevator | terminal | gameover | victory
  let floorNum = 1;
  let score = 0;
  let visitedFloors = [];
  let startTime = 0;
  let stopwatchInterval = null;
  let totalFloors = 10; // this run's Server Room floor number — set by startNewStoryRun(), varies per run
  let passwordProgress = ""; // one letter per non-final floor cleared this run
  let terminalAttempts = 0;
  const TERMINAL_MAX_ATTEMPTS = 3;

  let canvas, ctx;

  function cacheDom() {
    el.canvas = document.getElementById("storyCanvas");
    el.overlay = document.getElementById("storyOverlay");
    el.hudPlayerName = document.getElementById("storyHudPlayerName");
    el.hudScore = document.getElementById("storyHudScore");
    el.hudFloor = document.getElementById("storyHudFloor");
    el.hudFloorName = document.getElementById("storyHudFloorName");
    el.hudClock = document.getElementById("storyHudClock");
    el.btnMute = document.getElementById("storyBtnMute");
    el.volumeSlider = document.getElementById("storyVolumeSlider");
    el.transition = document.getElementById("storyTransition");
  }

  function bindPersistentEvents() {
    if (bound) return;
    bound = true;
    el.btnMute.addEventListener("click", () => {
      const nowMuted = !window.CG.audio.muted;
      window.CG.audio.setMuted(nowMuted);
      el.btnMute.textContent = nowMuted ? "🔇 Muted" : "🔊 Sound";
      el.btnMute.setAttribute("aria-pressed", String(nowMuted));
    });
    el.volumeSlider.addEventListener("input", (e) => {
      window.CG.audio.setVolume(Number(e.target.value) / 100);
    });
    UI.bindFullscreenToggle("storyBtnFullscreen", "screen-story");
    bindPad("storyPadUp", "up");
    bindPad("storyPadDown", "down");
    bindPad("storyPadLeft", "left");
    bindPad("storyPadRight", "right");
    bindFirePad("storyPadFire");
    bindGunPad("storyPadGun");
    bindInteractPad("storyPadInteract");
  }

  function bindPad(id, dir) {
    const padEl = document.getElementById(id);
    if (!padEl) return;
    const set = (val) => (e) => { e.preventDefault(); window.CG.input[dir] = val; };
    padEl.addEventListener("pointerdown", set(true));
    padEl.addEventListener("pointerup", set(false));
    padEl.addEventListener("pointerleave", set(false));
    padEl.addEventListener("pointercancel", set(false));
  }

  /** The touch equivalent of the Fire key — one-shot per tap, same
   *  edge-triggered semantics as the keyboard binding in game.js (only sets
   *  the flag true; the platformer loop that reads it is what clears it). */
  function bindFirePad(id) {
    const padEl = document.getElementById(id);
    if (!padEl) return;
    padEl.addEventListener("pointerdown", (e) => { e.preventDefault(); window.CG.input.fire = true; });
  }

  /** The touch equivalent of the dedicated Gun-fire key (G) — same
   *  one-shot-per-tap pattern as bindFirePad(). No-ops harmlessly (via
   *  platformer.js's tryFireGun()) until the player actually has the gun. */
  function bindGunPad(id) {
    const padEl = document.getElementById(id);
    if (!padEl) return;
    padEl.addEventListener("pointerdown", (e) => { e.preventDefault(); window.CG.input.gunFire = true; });
  }

  /** The touch equivalent of the Interact key (E) — Story Mode's Act 1-3
   *  context action: hack a light switch, or enter a vent. Same one-shot-
   *  per-tap pattern as the other two pads; no-ops harmlessly on floors
   *  that have neither. */
  function bindInteractPad(id) {
    const padEl = document.getElementById(id);
    if (!padEl) return;
    padEl.addEventListener("pointerdown", (e) => { e.preventDefault(); window.CG.input.interact = true; });
  }

  /* ---------------- Lifecycle ---------------- */

  function start() {
    cacheDom();
    canvas = el.canvas;
    ctx = canvas.getContext("2d");
    bindPersistentEvents();

    window.CG.audio.unlock();
    window.CG.audio.startMusic();

    const run = startNewStoryRun();
    totalFloors = run.totalFloors;

    floorNum = 1;
    score = 0;
    visitedFloors = [];
    passwordProgress = "";
    terminalAttempts = 0;
    startTime = performance.now();

    el.hudPlayerName.textContent = window.CG.getPlayerName();
    updateHudScore();
    UI.showScreen("screen-story");
    startStopwatch();
    loadFloor(1);
  }

  function restart() {
    start();
  }

  function updateHudScore() {
    el.hudScore.textContent = Math.round(score).toLocaleString();
  }

  function updateHudFloor(floor) {
    el.hudFloor.textContent = `Floor ${floor.num}/${totalFloors}`;
    el.hudFloorName.textContent = floor.name;
  }

  function startStopwatch() {
    stopStopwatch();
    stopwatchInterval = setInterval(() => {
      const secs = Math.floor((performance.now() - startTime) / 1000);
      const m = Math.floor(secs / 60).toString().padStart(2, "0");
      const s = (secs % 60).toString().padStart(2, "0");
      if (el.hudClock) el.hudClock.textContent = `${m}:${s}`;
    }, 500);
  }

  function stopStopwatch() {
    if (stopwatchInterval) {
      clearInterval(stopwatchInterval);
      stopwatchInterval = null;
    }
  }

  /* ---------------- Floor flow ---------------- */

  function loadFloor(n, opts) {
    const floor = floorByNum(n);
    floorNum = n;
    visitedFloors.push(n);
    updateHudFloor(floor);
    if (opts && opts.withTransition) {
      playLiftTransition(() => showIntroPanel(floor));
    } else {
      showIntroPanel(floor);
    }
  }

  /** Mario-style slide/wipe transition — a full-screen panel slides in from
   *  one side, the next floor's briefing loads while it's covering the
   *  screen, then it slides back out. Skipped instantly under
   *  prefers-reduced-motion (still calls onCovered, just with no animation
   *  delay) so the floor change is never gated on motion the player asked
   *  to avoid. */
  function playLiftTransition(onCovered) {
    if (!el.transition) { onCovered(); return; }
    if (window.CG.isReducedMotion()) { onCovered(); return; }
    el.transition.classList.add("slide-in");
    window.setTimeout(() => {
      onCovered();
      el.transition.classList.remove("slide-in");
      el.transition.classList.add("slide-out");
      window.setTimeout(() => el.transition.classList.remove("slide-out"), 420);
    }, 420);
  }

  function formatChoiceBriefing(floor) {
    if (floor.mode !== "choice") return "";
    const question = floor.quiz ? floor.quiz.question : (floor.treasure ? floor.treasure.clue : "");
    const options = floor.quiz ? floor.quiz.options : (floor.treasure ? floor.treasure.items.map((it) => it.label) : []);
    const rows = options.map((opt, i) => `<div class="choice-brief-row"><span class="choice-brief-letter">${CHOICE_LETTERS[i]}</span>${escapeHtml(opt)}</div>`).join("");
    return `
      <div class="choice-briefing">
        <p class="story-copy">${escapeHtml(question)}</p>
        <div class="choice-brief-list">${rows}</div>
      </div>`;
  }

  /** Which of the campaign's three acts a floor belongs to. Purely
   *  presentational — it drives the briefing's act label and which
   *  mechanic hints get appended, and reads the floor's own authored
   *  `platform` contents rather than hardcoding floor numbers, so a floor
   *  that gains or loses a mechanic explains itself correctly without
   *  this needing to be updated too. */
  const ACTS = [
    { num: 1, name: "The Lobby", floors: [1, 2, 3] },
    { num: 2, name: "The Server Farms", floors: [4, 5, 6, 7] },
    { num: 3, name: "Executive Suites", floors: [8, 9, 10] },
  ];
  function actForFloor(num) {
    return ACTS.find((a) => a.floors.includes(num)) || ACTS[ACTS.length - 1];
  }

  function challengeHint(floor) {
    const p = floor.platform || {};
    const guards = p.guards || [];
    const has = (kind) => guards.some((g) => g.kind === kind);

    const stunHint = " X (or the ⚡ button) fires a short-range stun charge that freezes a guard for a few seconds — safe to walk past while it's frozen. You start each floor with a few charges and there's a cooldown between shots, but a guard you successfully stun drops a charge pickup you can walk over to reclaim.";
    const bonusHint = " Keep an eye out for 🪙 bonus coins (pure score), a 🛡 shield pickup (brief guard/hazard immunity), a small patrol bot you can stomp from above like a trophy, and a slow-moving bonus platform.";

    // --- Act-specific mechanic hints, appended only where the floor
    // actually carries that mechanic. ---
    const switchHint = (p.lightSwitches || []).length
      ? " 💡 This floor has hackable light panels — stand next to one and press E (or the ⌨ button) to cut the lights for a few seconds. Guards' sight range collapses while it's dark and spotlight drones go blind entirely. Each panel is single-use, so spend them on the patrol that's actually in your way."
      : "";
    const droneHint = has("drone")
      ? " 🔦 Spotlight drones sweep overhead and catch you by COLUMN, not by walkway — standing still on the same floor as one is no defence, you have to be out from under the cone (or kill the lights)."
      : "";
    const houndHint = has("hound")
      ? " 🐕 A tracker hound patrols here: it spots from much further out, sprints faster than you run, and keeps hunting long after it loses sight. Stun it or break line of sight for a good while — you will not out-run it."
      : "";
    const laserHint = (p.lasers || []).length
      ? " ⚡ Timed laser grids cut across the route. A lit beam ends the run instantly (the shield does NOT protect you from one) — watch the dotted emitter track for the gap and cross on the rhythm."
      : "";
    const eliteHint = has("elite")
      ? " 🛡 Elite guards here are armored: the first stun only staggers one, and it takes a second hit to actually freeze it. Budget two charges per elite, or use the gun if you have it."
      : "";
    const ventHint = (p.vents || []).length
      ? " 🔧 There are maintenance vents on this floor — stand on one and press Down (or E) to travel to its pair, skipping a corridor entirely. They work both ways."
      : "";
    const actExtras = switchHint + droneHint + houndHint + laserHint + eliteHint + ventHint;

    const bossHint = floor.boss
      ? (floor.boss.phases
        ? ` ⚠ ${escapeHtml(floor.boss.name)} is waiting behind the last trophy on this floor, and the door out won't open until it's down. This is a ${floor.boss.phases}-PHASE fight: every ${floor.boss.hitsPerPhase || 2} hits it drops into a brief "recompiling" window where it's completely untouchable and your shots do nothing — back off, reset, and come back in, because it returns faster and sees further each time.${floor.boss.gunHint ? ` ${escapeHtml(floor.boss.gunHint)}` : ""}`
        : ` This floor also has a locked door past the maze that only opens once ${escapeHtml(floor.boss.name)} is defeated — one stun hit isn't enough to bring it down like an ordinary guard, so plan your charges (and pickup runs) accordingly.${floor.boss.gunHint ? ` ${escapeHtml(floor.boss.gunHint)}` : ""} If you've picked up a guard's gun, G fires it — unlimited ammo, and unlike the stun ability it can permanently take down an ordinary guard too, not just the boss.`)
      : "";

    if (floor.mode === "choice") {
      return "Objective: explore the floor and step onto the terminal that matches the correct answer above (a reminder of the clue stays pinned to the corner of the screen while you play). Arrow Keys/A-D or Left/Right to run, Up/W/Space to jump, Up/Down on a ladder to climb." + stunHint + " Guards actively hunt once they spot you — one touch, the wrong terminal, or a fall into a gap ends the mission." + actExtras + bonusHint + bossHint;
    }
    return "Objective: collect every trophy and reach the door. Arrow Keys/A-D or Left/Right to run, Up/W/Space to jump, Up/Down on a ladder to climb." + stunHint + " Guards actively hunt once they spot you — one touch or a fall into a gap ends the mission." + actExtras + bonusHint + bossHint;
  }

  /** The once-per-act framing beat, shown on the first floor of each act
   *  only. Act 1 sells the infiltration, Act 2 turns the job as the
   *  player starts finding what Meridian was actually doing down there,
   *  and Act 3 is the endgame. Deliberately separate from each floor's
   *  own `intro` (which stays floor-specific) so the campaign has an arc
   *  above the floor-by-floor beats, not just ten independent rooms. */
  const ACT_OPENERS = {
    1: "ACT ONE — THE LOBBY. You're inside, and for now nobody knows it. The ground floors run on habit: badge scanners, a bored night patrol, and lighting panels that were never meant to be reachable from the public side of the desk. Move quietly, learn the rhythm of a patrol, and don't give anyone a reason to look twice.",
    2: "ACT TWO — THE SERVER FARMS. The paperwork upstairs said these floors were decommissioned last year. They are not decommissioned. They're drawing more power than the rest of the tower combined, they're watched from the ceiling rather than the floor, and the logs you just walked past have been running a customer-data export every night for eleven months. Whatever Meridian is doing down here, it isn't storage.",
    3: "ACT THREE — EXECUTIVE SUITES. Somebody up here signed off on all of it. The guards on these floors aren't night-shift contractors — they're armored, they're expecting you, and they don't go down to a single stun. The vents are the only part of this floor plan nobody thought to secure. Get to the rack, and finish it.",
  };

  function showIntroPanel(floor) {
    state = "intro";
    window.StoryMazeActive = false;
    setOverlayVisible(true);
    const act = actForFloor(floor.num);
    const isActOpener = act.floors[0] === floor.num;
    el.overlay.innerHTML = `
      <div class="story-panel${floor.mode === "choice" ? " story-panel-wide" : ""}">
        <div class="eyebrow">Act ${act.num}: ${escapeHtml(act.name)} &middot; Floor ${floor.num} of ${totalFloors} &middot; ${escapeHtml(floor.name)}</div>
        <h2 class="title">${floor.isFinal ? "The Server Room" : "Floor Briefing"}</h2>
        ${isActOpener ? `<p class="story-copy act-opener">${escapeHtml(ACT_OPENERS[act.num] || "")}</p>` : ""}
        <p class="story-copy">${escapeHtml(floor.intro)}</p>
        ${formatChoiceBriefing(floor)}
        <p class="story-hint">${challengeHint(floor)}</p>
        <div class="btn-row">
          <button class="btn btn-primary" id="storyBtnBegin" type="button">Begin</button>
        </div>
      </div>`;
    const btn = document.getElementById("storyBtnBegin");
    btn.addEventListener("click", () => beginChallenge(floor));
    btn.focus();
  }

  function beginChallenge(floor) {
    startPlatform(floor);
  }

  /* ---------------- Platform (Dangerous-Dave-style) challenge ---------------- */

  function startPlatform(floor) {
    state = "platform";
    setOverlayVisible(false);
    window.StoryMazeActive = true;
    Platformer.stop();

    const objective = floor.mode === "choice"
      ? "Find and step onto the terminal with the correct answer. Guards are actively hunting."
      : "Collect every trophy and reach the door. Watch for guards and gaps in the floor.";
    UI.announce(`Floor ${floor.num}. ${floor.name}. ${objective}`);

    Platformer.start(floor, canvas, ctx, {
      storyNote: floor.storyNote || "",
      onTrophy: (points) => {
        score += points;
        updateHudScore();
      },
      onCoin: (points) => {
        score += points;
        updateHudScore();
      },
      onSolve: () => {
        window.StoryMazeActive = false;
        solveFloor();
      },
      onFail: (reasonKey) => {
        window.StoryMazeActive = false;
        failFloor(reasonKey);
      },
    });
  }

  /* ---------------- Solve / riddle / elevator / terminal ---------------- */

  function solveFloor() {
    state = "solved";
    window.StoryMazeActive = false;

    const floor = floorByNum(floorNum);
    score += floor.solveScore || 100;
    updateHudScore();
    window.CG.audio.playCheckpoint();

    if (floor.isFinal) {
      showTerminalPanel(floor);
      return;
    }
    if (floor.passwordLetter) passwordProgress += floor.passwordLetter;
    showRiddlePanel(floor);
  }

  function showRiddlePanel(floor) {
    state = "riddle";
    setOverlayVisible(true);
    const fragmentHtml = floor.passwordLetter ? `
      <div class="password-progress">
        <span class="password-progress-label">🔑 Access fragment recovered</span>
        <span class="password-track">${passwordProgress.split("").join(" ")}</span>
      </div>` : "";
    const bossHtml = floor.boss ? `<p class="story-hint">🏆 ${escapeHtml(floor.boss.name)} is down. That floor won't be a problem again.</p>` : "";
    el.overlay.innerHTML = `
      <div class="story-panel">
        <div class="eyebrow">Access Granted</div>
        <h2 class="title">Floor Cleared</h2>
        ${bossHtml}
        <div class="pinned-note">
          <span class="pinned-note-pin" aria-hidden="true">📌</span>
          <p class="story-copy">${escapeHtml(floor.riddle)}</p>
        </div>
        ${fragmentHtml}
        <div class="btn-row">
          <button class="btn btn-primary" id="storyBtnElevator" type="button">Call the Elevator</button>
        </div>
      </div>`;
    const btn = document.getElementById("storyBtnElevator");
    btn.addEventListener("click", () => showElevator(floor));
    btn.focus();
  }

  function showElevator(floor) {
    state = "elevator";
    setOverlayVisible(true);
    const doors = FLOOR_DIRECTORY.map((d) => {
      const visited = visitedFloors.includes(d.num);
      return `<button type="button" class="lift-unit${visited ? " lift-unit-visited" : ""}" data-floor="${d.num}"${visited ? " disabled" : ""} aria-label="Floor ${d.num}, ${escapeHtml(d.name)}${visited ? ", out of service" : ""}">
        <span class="lift-plaque">${d.num}</span>
        <span class="lift-doors">
          <span class="lift-door lift-door-left"></span>
          <span class="lift-door lift-door-right"></span>
        </span>
        <span class="lift-label">${visited ? "OUT OF SERVICE" : escapeHtml(d.name)}</span>
      </button>`;
    }).join("");
    el.overlay.innerHTML = `
      <div class="story-panel story-panel-wide">
        <div class="eyebrow">Building Directory</div>
        <h2 class="title">Choose a Lift</h2>
        <div class="pinned-note">
          <span class="pinned-note-pin" aria-hidden="true">📌</span>
          <p class="story-copy">${escapeHtml(floor.riddle)}</p>
        </div>
        <div class="lift-bank">${doors}</div>
      </div>`;
    el.overlay.querySelectorAll(".lift-unit").forEach((btn) => {
      btn.addEventListener("click", () => handleFloorPick(Number(btn.dataset.floor)));
    });
    const firstEnabled = el.overlay.querySelector(".lift-unit:not(:disabled)");
    if (firstEnabled) firstEnabled.focus();
  }

  function handleFloorPick(n) {
    if (n === floorNum + 1) {
      window.CG.audio.playPowerup();
      loadFloor(n, { withTransition: true });
    } else {
      failFloor("wrongfloor");
    }
  }

  /** The Secure Server Room's win condition: type in the access code
   *  assembled from every floor cleared this run (see floors-data.js's
   *  passwordLetter). Three wrong attempts locks the run out for good. */
  function showTerminalPanel(floor) {
    state = "terminal";
    setOverlayVisible(true);
    terminalAttempts = 0;
    el.overlay.innerHTML = `
      <div class="story-panel terminal-panel">
        <div class="eyebrow">Secure Server Room</div>
        <h2 class="title">Crack the Server</h2>
        <p class="story-copy">Every floor you cleared handed you one fragment of the server's access code. Enter the full code below to lock the intrusion out for good.</p>
        <div class="password-progress">
          <span class="password-progress-label">Fragments collected</span>
          <span class="password-track">${passwordProgress.split("").join(" ")}</span>
        </div>
        <div class="terminal-input-row">
          <span class="terminal-prompt">&gt;</span>
          <input type="text" id="terminalInput" class="terminal-input" autocomplete="off" spellcheck="false" placeholder="${passwordProgress.length}-character code" maxlength="${passwordProgress.length}" />
        </div>
        <p class="terminal-feedback" id="terminalFeedback">${TERMINAL_MAX_ATTEMPTS} attempts before lockout.</p>
        <div class="btn-row">
          <button class="btn btn-primary" id="storyBtnSubmitPassword" type="button">Submit</button>
        </div>
      </div>`;
    const input = document.getElementById("terminalInput");
    const submit = () => handlePasswordSubmit(input.value);
    document.getElementById("storyBtnSubmitPassword").addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    input.focus();
  }

  function handlePasswordSubmit(rawValue) {
    const attempt = (rawValue || "").trim().toUpperCase();
    if (attempt === passwordProgress) {
      victory();
      return;
    }
    terminalAttempts++;
    const remaining = TERMINAL_MAX_ATTEMPTS - terminalAttempts;
    window.CG.audio.playHit();
    if (remaining <= 0) {
      failFloor("wrongpassword");
      return;
    }
    const fb = document.getElementById("terminalFeedback");
    if (fb) fb.textContent = `Access denied. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`;
    const input = document.getElementById("terminalInput");
    if (input) { input.value = ""; input.focus(); }
  }

  /* ---------------- End states ---------------- */

  function failFloor(reasonKey) {
    state = "gameover";
    window.StoryMazeActive = false;
    window.CG.audio.playGameOver();

    const floor = floorByNum(floorNum);
    let reason;
    if (reasonKey === "wrongfloor") {
      reason = "The elevator doors open onto an active security sweep. There's nowhere to run.";
    } else if (reasonKey === "pit") {
      reason = "One wrong step and the floor gives way beneath you. The fall ends the mission.";
    } else if (reasonKey === "wrongchoice") {
      reason = "Wrong terminal. It locks down hard and calls in every guard on the floor.";
    } else if (reasonKey === "wrongpassword") {
      reason = "Access denied. The lockout protocol seals the server room for good.";
    } else if (reasonKey === "minion") {
      reason = "A patrol drone clips you from the side. Lights out.";
    } else if (reasonKey === "spotlight") {
      reason = "A spotlight drone's beam pins you against the floor. Every guard on the level turns at once.";
    } else if (reasonKey === "laser") {
      reason = "You clip the laser grid. The beam trips every alarm in the server farm before you can move.";
    } else {
      reason = floor.dangerLabel;
    }
    endRun(false, reason);
  }

  function victory() {
    state = "victory";
    window.CG.audio.playServerSecured();
    endRun(true, "Threat neutralized. Meridian Corp's digital infrastructure is secure.");
  }

  function endRun(won, reasonText) {
    stopStopwatch();
    setOverlayVisible(false);
    const elapsedSec = Math.max(0, Math.round((performance.now() - startTime) / 1000));
    const name = window.CG.getPlayerName();
    const result = window.CG.leaderboard.addEntry(name, score, "story", {
      floorsCleared: visitedFloors.length,
      won,
      timeSec: elapsedSec,
    });
    renderStoryResult({
      won,
      reasonText,
      score,
      floorsCleared: Math.min(visitedFloors.length, totalFloors),
      elapsedSec,
      rank: result.rank,
      name,
    });
    UI.showScreen("screen-story-result");
  }

  function formatTime(totalSec) {
    const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function renderStoryResult(data) {
    const set = (id, text) => { const n = document.getElementById(id); if (n) n.textContent = text; };
    const titleEl = document.getElementById("storyResultTitle");
    const eyebrowEl = document.getElementById("storyResultEyebrow");
    if (titleEl) titleEl.textContent = data.won ? "MISSION COMPLETE" : "SECURITY ALERT";
    if (eyebrowEl) eyebrowEl.textContent = data.won ? "Mission Debrief" : "Mission Failed";
    set("storyResultPlayerName", data.name);
    set("storyResultReason", data.reasonText);
    set("storyResultScore", Math.round(data.score).toLocaleString());
    set("storyResultFloors", `${data.floorsCleared}/${totalFloors}`);
    set("storyResultTime", formatTime(data.elapsedSec));
    set("storyResultLeaderboardPosition", data.rank ? `#${data.rank}` : "Unranked");

    const card = document.querySelector("#screen-story-result .card");
    if (card) card.classList.toggle("result-victory", !!data.won);
  }

  function setOverlayVisible(visible) {
    el.overlay.classList.toggle("active", visible);
    el.canvas.style.visibility = visible ? "hidden" : "visible";
  }

  /** QA helper: exposes live position/state for automated playthrough testing. */
  function debugPos() {
    if (state === "platform") {
      const p = Platformer.debugState();
      return p ? { ...p, state } : null;
    }
    return { state };
  }

  return { start, restart, debugPos };
})();
