/* ============================================================
   ui.js
   All DOM / screen management lives here: name capture, story
   briefing, mode select, instructions (both modes), HUD, result
   screens, and the leaderboard modal. Canvas rendering (the
   actual game worlds) lives in game.js and story.js.
   ============================================================ */

const SCREEN_IDS = [
  "screen-name",
  "screen-story-briefing",
  "screen-mode-select",
  "screen-instructions",
  "screen-story-instructions",
  "screen-game",
  "screen-result",
  "screen-story",
  "screen-story-result",
  "screen-fps-instructions",
  "screen-fps",
  "screen-fps-result",
];

const UI = {
  el: {},

  cacheDom() {
    const ids = [
      ...SCREEN_IDS,
      "playerNameInput", "nameError", "btnContinueToBriefing",
      "briefingPlayerName", "btnBriefingBack", "btnBriefingContinue",
      "modeSelectPlayerName", "btnSelectArcade", "btnSelectStory", "btnSelectFps", "btnModeSelectBack", "btnLeaderboardModeSelect",
      "btnArcadeBack", "btnStartGame",
      "hudPlayerName", "hudPlayerNamePreview", "hudScore", "hudCombo", "hudComboMult", "comboBox", "hudPowerupStatus",
      "hudTimerText", "hudTimerRing", "hudMissionProgress", "hudZoneLabel",
      "hudComboTimer", "hudHealth", "hudHealthBar", "hudArcadeFloor", "hudPerks", "arcadeOverlay",
      "btnMute", "btnFullscreen", "volumeSlider", "gameContainer", "canvas",
      "resultPlayerName", "resultFinalScore", "resultPersonalBest", "resultHighestCombo",
      "resultThreatsAvoided", "resultTokens", "resultPatches", "resultServerRooms",
      "resultLeaderboardPosition", "btnPlayAgain", "btnViewLeaderboardFromResult", "btnResultModeSelect",
      "storyIntroPlayerName", "btnStoryBack", "btnEnterBuilding",
      "storyHudPlayerName", "storyHudScore", "storyHudFloor", "storyHudFloorName", "storyHudClock",
      "storyBtnMute", "storyBtnFullscreen", "storyVolumeSlider", "storyCanvas", "storyOverlay",
      "storyResultEyebrow", "storyResultTitle", "storyResultPlayerName", "storyResultReason",
      "storyResultScore", "storyResultFloors", "storyResultTime", "storyResultLeaderboardPosition",
      "btnStoryPlayAgain", "btnStoryResultLeaderboard", "btnStoryResultModeSelect",
      "leaderboardList", "btnClearLeaderboard", "btnCloseLeaderboard", "btnLeaderboardTop",
      "lbTabArcade", "lbTabStory",
      "srAnnounncer", "reducedMotionToggle",
      "fpsIntroPlayerName", "btnFpsBack", "btnEnterLobby",
      "fpsHudPlayerName", "fpsHudBadges", "fpsHudStun", "fpsHudFloorNum", "fpsHudFloorName",
      "fpsBtnMute", "fpsBtnFullscreen", "fpsVolumeSlider", "fpsCanvas", "fpsMinimap", "fpsOverlay",
      "fpsPadLeft", "fpsPadUp", "fpsPadDown", "fpsPadRight", "fpsPadFire",
      "fpsResultEyebrow", "fpsResultTitle", "fpsResultPlayerName", "fpsResultReason",
      "fpsResultFloors", "fpsResultBadges", "fpsResultTime", "btnFpsPlayAgain", "btnFpsResultModeSelect",
    ];
    ids.forEach((id) => { this.el[id] = document.getElementById(id); });
  },

  showScreen(name) {
    SCREEN_IDS.forEach((id) => {
      this.el[id].classList.toggle("active", id === name);
      this.el[id].setAttribute("aria-hidden", id === name ? "false" : "true");
    });
  },

  openLeaderboardModal() {
    this.el["screen-leaderboard"].classList.add("active");
    this.el["screen-leaderboard"].setAttribute("aria-hidden", "false");
  },

  closeLeaderboardModal() {
    this.el["screen-leaderboard"].classList.remove("active");
    this.el["screen-leaderboard"].setAttribute("aria-hidden", "true");
  },

  setLeaderboardTab(mode) {
    const isArcade = mode !== "story";
    this.el.lbTabArcade.classList.toggle("active", isArcade);
    this.el.lbTabArcade.setAttribute("aria-selected", String(isArcade));
    this.el.lbTabStory.classList.toggle("active", !isArcade);
    this.el.lbTabStory.setAttribute("aria-selected", String(!isArcade));
  },

  /** Validates + normalizes a player name. Returns { ok, value, error } */
  validateName(raw) {
    const trimmed = (raw || "").trim();
    if (trimmed.length === 0) {
      return { ok: false, value: "", error: "Enter your Guardian name to begin." };
    }
    if (trimmed.length > 20) {
      return { ok: false, value: trimmed, error: "Name must be 20 characters or fewer." };
    }
    return { ok: true, value: trimmed, error: "" };
  },

  setNameError(message) {
    this.el.nameError.textContent = message || "";
    this.el.nameError.classList.toggle("visible", !!message);
  },

  setPlayerNameDisplay(name) {
    this.el.hudPlayerName.textContent = name;
    this.el.resultPlayerName.textContent = name;
    if (this.el.hudPlayerNamePreview) this.el.hudPlayerNamePreview.textContent = name;
    if (this.el.briefingPlayerName) this.el.briefingPlayerName.textContent = name;
    if (this.el.modeSelectPlayerName) this.el.modeSelectPlayerName.textContent = name;
    if (this.el.storyIntroPlayerName) this.el.storyIntroPlayerName.textContent = name;
    if (this.el.fpsIntroPlayerName) this.el.fpsIntroPlayerName.textContent = name;
    if (this.el.fpsHudPlayerName) this.el.fpsHudPlayerName.textContent = name;
  },

  updateScore(score) {
    const node = this.el.hudScore;
    node.textContent = Math.round(score).toLocaleString();
    node.classList.remove("pulse");
    // Force reflow so the animation can restart on rapid updates.
    void node.offsetWidth;
    node.classList.add("pulse");
  },

  updateCombo(combo, multiplier, windowRatio) {
    this.el.hudCombo.textContent = combo;
    this.el.hudComboMult.textContent = multiplier > 1 ? `x${multiplier}` : "";
    this.el.comboBox.classList.toggle("combo-hot", combo >= 3);
    // The chain-window bar: the roguelite combo decays on its own if the
    // player stops chaining, so the countdown has to be visible or the
    // combo just seems to vanish for no reason.
    if (this.el.hudComboTimer) {
      const r = Math.max(0, Math.min(1, windowRatio || 0));
      this.el.hudComboTimer.style.width = `${r * 100}%`;
      this.el.hudComboTimer.classList.toggle("combo-timer-low", r > 0 && r < 0.3);
    }
  },

  /** Arcade roguelite run readout: current floor, integrity bar, and the
   *  perks drafted so far. Called on every state change rather than every
   *  frame (nothing here animates), so it's cheap. */
  updateArcadeRun(data) {
    if (this.el.hudArcadeFloor) this.el.hudArcadeFloor.textContent = data.floor;
    if (this.el.hudHealth) this.el.hudHealth.textContent = data.health;
    if (this.el.hudHealthBar) {
      const pct = data.maxHealth > 0 ? Math.max(0, data.health / data.maxHealth) : 0;
      this.el.hudHealthBar.style.width = `${pct * 100}%`;
      this.el.hudHealthBar.classList.toggle("health-low", pct <= 0.35);
    }
    if (this.el.hudPerks) {
      this.el.hudPerks.textContent = (data.perks || []).map((p) => p.icon).join(" ");
      this.el.hudPerks.title = (data.perks || []).map((p) => p.name).join(", ");
    }
  },

  updatePowerupStatus(activeEffects) {
    if (!activeEffects.length) {
      this.el.hudPowerupStatus.textContent = "NONE";
      this.el.hudPowerupStatus.className = "hud-value powerup-none";
      return;
    }
    this.el.hudPowerupStatus.textContent = activeEffects
      .map((e) => `${e.label} ${Math.ceil(e.timeLeft)}s`)
      .join(" · ");
    this.el.hudPowerupStatus.className = "hud-value powerup-active";
  },

  updateTimer(remaining, duration, state) {
    const seconds = Math.max(0, Math.ceil(remaining));
    this.el.hudTimerText.textContent = seconds;
    const ring = this.el.hudTimerRing;
    const circumference = 2 * Math.PI * 26;
    const fraction = Math.max(0, remaining / duration);
    ring.style.strokeDasharray = `${circumference}`;
    ring.style.strokeDashoffset = `${circumference * (1 - fraction)}`;

    const timerWrap = this.el.hudTimerText.parentElement;
    timerWrap.classList.remove("timer-warning", "timer-critical");
    if (state === "warning") timerWrap.classList.add("timer-warning");
    if (state === "critical") timerWrap.classList.add("timer-critical");
  },

  updateMissionProgress(zoneIndex, zoneCount, zoneName, laps) {
    this.el.hudMissionProgress.textContent = `Zone ${zoneIndex + 1}/${zoneCount}`;
    this.el.hudZoneLabel.textContent = zoneName;
    this.el.hudMissionProgress.title = `Server rooms secured this run: ${laps}`;
  },

  announce(text) {
    if (this.el.srAnnounncer) this.el.srAnnounncer.textContent = text;
  },

  /** Wires a Fullscreen toggle button, shared by all three modes (Arcade,
   *  Story, FPS — see the three btn*Fullscreen bindings in game.js/
   *  story.js/fps.js). Fullscreens the mode's whole <section> (HUD, canvas
   *  and touch pad together, not just the canvas) so the in-game controls
   *  stay reachable. Looked up by id (not pre-cached in this.el) so every
   *  caller can use it identically regardless of when their own DOM
   *  caching runs relative to this one. Falls back through the vendor-
   *  prefixed Safari/iOS API; if neither is present (or the browser denies
   *  the request, e.g. inside a cross-origin iframe) the button quietly
   *  no-ops rather than throwing. */
  bindFullscreenToggle(btnId, screenId) {
    const btn = document.getElementById(btnId);
    const target = document.getElementById(screenId);
    if (!btn || !target) return;

    const supported = !!(target.requestFullscreen || target.webkitRequestFullscreen);
    if (!supported) { btn.hidden = true; return; }

    const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

    const sync = () => {
      const active = isFs() && (document.fullscreenElement === target || document.webkitFullscreenElement === target);
      btn.textContent = active ? "⛶ Exit Fullscreen" : "⛶ Fullscreen";
      btn.setAttribute("aria-pressed", String(active));
    };

    btn.addEventListener("click", () => {
      if (isFs()) {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else if (target.requestFullscreen) {
        target.requestFullscreen().catch(() => {});
      } else if (target.webkitRequestFullscreen) {
        target.webkitRequestFullscreen();
      }
    });
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    sync();
  },

  renderResult(data) {
    this.el.resultFinalScore.textContent = data.finalScore.toLocaleString();
    this.el.resultPersonalBest.textContent = data.personalBest.toLocaleString();
    this.el.resultHighestCombo.textContent = data.highestCombo;
    this.el.resultThreatsAvoided.textContent = data.threatsAvoided;
    this.el.resultTokens.textContent = data.tokensCollected;
    this.el.resultPatches.textContent = data.patchesApplied;
    this.el.resultServerRooms.textContent = data.serverRoomsSecured;
    this.el.resultLeaderboardPosition.textContent = data.leaderboardRank ? `#${data.leaderboardRank}` : "Unranked";
    // Roguelite-specific stats — how deep the run got is the headline
    // number in an endless mode, more than the raw score.
    const floorsEl = document.getElementById("resultFloorsCleared");
    if (floorsEl) floorsEl.textContent = data.floorsCleared != null ? data.floorsCleared : "—";
    const stunEl = document.getElementById("resultDronesStunned");
    if (stunEl) stunEl.textContent = data.dronesStunned != null ? data.dronesStunned : "—";
    const perksEl = document.getElementById("resultPerks");
    if (perksEl) {
      perksEl.innerHTML = (data.perks && data.perks.length)
        ? data.perks.map((p) => `<span class="perk-chip">${p.icon} ${escapeHtml(p.name)}</span>`).join("")
        : `<span class="perk-chip perk-chip-none">No perks drafted</span>`;
    }
    const titleEl = document.getElementById("resultTitle");
    if (titleEl) titleEl.textContent = "RUN OVER";
    const subEl = document.getElementById("resultSubtitle");
    if (subEl) {
      subEl.textContent = `Integrity failed on floor ${(data.floorsCleared || 0) + 1}.`;
    }
  },

  renderLeaderboard(entries, currentPlayerName) {
    const list = this.el.leaderboardList;
    list.innerHTML = "";
    if (entries.length === 0) {
      const empty = document.createElement("li");
      empty.className = "leaderboard-empty";
      empty.textContent = "No missions logged yet. Be the first Guardian on the board.";
      list.appendChild(empty);
      return;
    }
    entries.forEach((entry, i) => {
      const li = document.createElement("li");
      li.className = "leaderboard-row";
      if (currentPlayerName && entry.name.toLowerCase() === currentPlayerName.toLowerCase()) {
        li.classList.add("is-you");
      }
      const date = new Date(entry.date);
      const dateStr = isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      li.innerHTML = `
        <span class="lb-rank">#${i + 1}</span>
        <span class="lb-name">${escapeHtml(entry.name)}</span>
        <span class="lb-score">${entry.score.toLocaleString()}</span>
        <span class="lb-date">${dateStr}</span>
      `;
      list.appendChild(li);
    });
  },
};

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
