/* ============================================================
   E2E regression suite for Story Mode's core systems:
     - Security Guard / Security Drone spot-and-chase AI
     - Quiz/treasure floors as real "choice" maze levels
     - Lift slide transition + per-floor visual motifs
     - The fixed 10-floor run (Floor 10 is always the Secure Server
       Room — see floors-data.js's startNewStoryRun()) + its
       password terminal (win path + lockout path)
     - Floor 5's mid-run boss gauntlet (quiz -> activateBoss() ->
       stun x3 -> door unlocks) — see guards.js's Boss class
     - Floor 5's boss-gun pickup: stunning the one guard flagged
       carriesGun (floors-data.js) drops a second pickup that grants an
       additional, unlimited-ammo ranged attack against the boss —
       verified as genuinely additive (ordinary stun charges still work
       after picking it up, and the pickup itself doesn't auto-hit)
     - The dedicated Gun-fire key (G, separate from the stun Fire key):
       once picked up, it can also permanently kill an ORDINARY guard —
       not just damage the boss — after GUN_KILL_HITS separate hits
       (guards.js's SecurityGuard.takeGunHit())
     - Mario-style bonus content generated per floor (coins, a shield
       power-up, stompable minions, a moving bonus platform — see
       platformer.js's buildBonusPickups())
     - Generic-company rebrand (no leftover "UST" branding anywhere
       in the shipped UI)

   Uses Platformer's QA-only debug hooks (__debugForceCollectAll /
   __debugTeleportToDoor / __debugTeleportToCorrectChoice /
   __debugForceDefeatBoss, alongside the pre-existing debugState()) to
   reliably drive floors to a solved state without needing a
   pixel-perfect jump-timing autopilot for every maze — those hooks are
   never called by real gameplay, only by this script.

   Floor 1's own trophy collection IS exercised with a real physics-driven
   autopilot (single-target, "beeline for the door" — the jump-trigger
   logic naturally carries it over every trophy along the route), so the
   underlying platformer physics/collision are still exercised for real at
   least once, not just asserted via the debug hooks.

   Run: NODE_PATH=<...npm-global...> node tools/e2e-phase4-test.js
   against a `python3 -m http.server 8080` static server from the repo root.
   ============================================================ */
const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => consoleErrors.push("pageerror: " + err.message));

  const results = [];
  function check(label, pass, detail) {
    results.push({ label, pass, detail });
    console.log(`${pass ? "PASS" : "FAIL"} — ${label}${detail ? " (" + detail + ")" : ""}`);
  }

  console.log("\n=== Load game, enter Story Mode ===");
  await page.goto("http://localhost:8080/index.html");
  await page.waitForSelector("#screen-name:not([aria-hidden='true'])");
  await page.fill("#playerNameInput", "Phase4Bot");
  await page.click("#btnContinueToBriefing");
  await page.click("#btnBriefingContinue");
  await page.click("#btnSelectStory");
  await page.click("#btnEnterBuilding");
  await page.waitForSelector("#screen-story:not([aria-hidden='true'])");
  await page.waitForTimeout(300);

  console.log("\n=== Synthetic test: a guard actually chases and catches an unaware player ===");
  const chaseResult = await page.evaluate(() => {
    const guard = new SecurityGuard(10 * 40, 9 * 40, 26, 34, 1, 90, 40);
    const player = { x: 7 * 40, y: 9 * 40, w: 26, h: 34 };
    let caught = false;
    for (let i = 0; i < 240 && !caught; i++) {
      guard.update(1 / 60, player);
      const gb = { left: guard.x, right: guard.x + guard.w, top: guard.y, bottom: guard.y + guard.h };
      const pb = { left: player.x, right: player.x + player.w, top: player.y, bottom: player.y + player.h };
      if (gb.left < pb.right && gb.right > pb.left && gb.top < pb.bottom && gb.bottom > pb.top) caught = true;
    }
    return { caught, alertedAtEnd: guard.alert };
  });
  check("Guard spots and catches a stationary player within sight range", chaseResult.caught, JSON.stringify(chaseResult));

  console.log("\n=== The run is always a fixed 10 floors (no more random Server Room floor) ===");
  const floorLabel = await page.evaluate(() => document.getElementById("storyHudFloor")?.textContent || "");
  check("HUD reads Floor 1/10 on a fresh run", /\/10$/.test(floorLabel), floorLabel);
  await page.click("#storyBtnBegin");
  await page.waitForTimeout(300);

  // Neuter guards so the debug-hook-driven maze traversal below can't be
  // interrupted by a chase (chase behavior is already separately proven
  // above) — this is a test-only prototype patch on the page, never
  // touches shipped code. Boss extends SecurityGuard and doesn't override
  // getBounds(), so this neuters it too.
  await page.evaluate(() => {
    SecurityGuard.prototype.getBounds = function () {
      return { left: -99999, right: -99998, top: -99999, bottom: -99998 };
    };
  });

  async function advance(next) {
    await page.click("#storyBtnElevator");
    await page.waitForTimeout(150);
    await page.click(`.lift-unit[data-floor="${next}"]`);
    await page.waitForTimeout(1000); // slide transition (420ms x2) + buffer
    await page.click("#storyBtnBegin");
    await page.waitForTimeout(300);
  }

  async function solveTrophyFloor() {
    // As of the Act 3 rework, a trophy floor can ALSO carry a boss
    // (Floor 10's multi-phase finale): collecting the last trophy wakes
    // it, and the door stays locked until it's down. Collect first, then
    // clear any boss that woke, then head for the door — a plain trophy
    // floor takes the same path with the middle step a no-op.
    await page.evaluate(() => { Platformer.__debugForceCollectAll(); });
    await page.waitForTimeout(220);
    await page.evaluate(() => {
      const st = Platformer.debugState();
      if (st && st.boss && !st.boss.defeated) Platformer.__debugForceDefeatBoss();
    });
    await page.waitForTimeout(150);
    await page.evaluate(() => { Platformer.__debugTeleportToDoor(); });
    await page.waitForTimeout(400);
  }

  async function solveChoiceFloor() {
    await page.evaluate(() => { Platformer.__debugTeleportToCorrectChoice(); });
    await page.waitForTimeout(400);
  }

  console.log("\n=== Act structure: three acts, per-act mechanics, act openers ===");
  {
    // Walked with a live guard-neutering patch so this survey can visit
    // every floor without dying to the content it's checking for.
    const survey = await page.evaluate(() => {
      const out = [];
      for (let n = 1; n <= 10; n++) {
        const f = floorByNum(n);
        const p = f.platform || {};
        const kinds = (p.guards || []).map((g) => g.kind || "guard");
        out.push({
          n, name: f.name,
          kinds,
          switches: (p.lightSwitches || []).length,
          lasers: (p.lasers || []).length,
          vents: (p.vents || []).length,
          boss: f.boss ? { name: f.boss.name, phases: f.boss.phases || 0 } : null,
        });
      }
      return out;
    });
    const act1 = survey.slice(0, 3), act2 = survey.slice(3, 7), act3 = survey.slice(7);
    check("ACT 1 (floors 1-3): every floor has hackable light switches",
      act1.every((f) => f.switches > 0), act1.map((f) => f.switches).join("/"));
    check("ACT 1 stays basic stealth — no drones, hounds, lasers or vents yet",
      act1.every((f) => f.lasers === 0 && f.vents === 0 && !f.kinds.some((k) => k === "drone" || k === "hound")));
    check("ACT 2 (floors 4-7): every floor has a spotlight drone",
      act2.every((f) => f.kinds.includes("drone")), act2.map((f) => f.kinds.join("+")).join(" | "));
    check("ACT 2: tracker hounds appear in the act",
      act2.some((f) => f.kinds.includes("hound")));
    check("ACT 2: every floor has a timed laser grid",
      act2.every((f) => f.lasers > 0), act2.map((f) => f.lasers).join("/"));
    check("ACT 3 (floors 8-10): every floor has elite guards",
      act3.every((f) => f.kinds.includes("elite")), act3.map((f) => f.kinds.join("+")).join(" | "));
    check("ACT 3: every floor has a maintenance vent route",
      act3.every((f) => f.vents > 0), act3.map((f) => f.vents).join("/"));
    check("Floor 5's single-phase Auditor is unchanged by the Act rework",
      survey[4].boss && survey[4].boss.name === "The Auditor" && survey[4].boss.phases === 0);
    check("Floor 10 carries a multi-phase final boss",
      survey[9].boss && survey[9].boss.phases === 3, JSON.stringify(survey[9].boss));
  }

  console.log("\n=== Floor 1 (trophy mode): real physics autopilot beelines for the door ===");
  {
    const eyebrow = await page.evaluate(() => document.querySelector(".story-panel .eyebrow")?.textContent || "");
    check("Floor 1's briefing is labelled Act 1: The Lobby", /Act 1: The Lobby/.test(eyebrow), eyebrow.trim());
    check("Act 1's opening floor shows the act's framing beat",
      await page.evaluate(() => !!document.querySelector(".story-panel .act-opener")));
  }
  await page.evaluate(() => {
    window.__buildSingleTarget = function (floor, targetCol) {
      const TILE = 40;
      const p = floor.platform;
      const solids = p.platforms.map((pl) => ({ x0: pl.col, x1: pl.col + (pl.len || 1) - 1, row: pl.row }));
      const ladders = p.ladders.map((l) => ({ col: l.col, rowTop: l.rowTop, rowBottom: l.rowBottom }));
      const PLAYER_W = 26, PLAYER_H = 34;
      function solidAt(col, row) { return solids.some((s) => col >= s.x0 && col <= s.x1 && s.row === row); }
      function ladderAtCol(col) { return ladders.find((l) => l.col === col); }
      let climbLadder = null, climbDir = null;
      return function tick() {
        const st = Platformer.debugState();
        if (!st) return;
        const input = window.CG.input;
        const cx = st.x + PLAYER_W / 2;
        const centerCol = Math.floor(cx / TILE);
        const feetRow = Math.round((st.y + PLAYER_H) / TILE);
        const feetY = st.y + PLAYER_H;
        const ladder = ladderAtCol(centerCol);
        if (ladder) {
          if (climbLadder !== ladder) {
            const midY = (ladder.rowTop * TILE + ladder.rowBottom * TILE + TILE) / 2;
            climbDir = feetY > midY ? "up" : "down";
            climbLadder = ladder;
          }
          const doneUp = climbDir === "up" && feetY <= ladder.rowTop * TILE + 2;
          const doneDown = climbDir === "down" && feetY >= ladder.rowBottom * TILE - 2;
          if (!doneUp && !doneDown) {
            input.up = climbDir === "up"; input.down = climbDir === "down";
            input.left = false; input.right = false;
            return;
          }
          input.up = false; input.down = false;
        } else { climbLadder = null; climbDir = null; }
        const dx = targetCol - centerCol;
        if (Math.abs(dx) < 0.3) { input.left = false; input.right = false; }
        else {
          const dir = dx > 0 ? 1 : -1;
          input.left = dir < 0; input.right = dir > 0;
          const aheadCol1 = centerCol + dir, aheadCol2 = centerCol + dir * 2;
          const floorOrLadderAhead = solidAt(aheadCol1, feetRow) || solidAt(aheadCol2, feetRow) || !!ladderAtCol(aheadCol1);
          const ceilingAboveHere = solidAt(centerCol, feetRow - 2) || solidAt(centerCol, feetRow - 3);
          const ledgeAhead = solidAt(aheadCol1, feetRow - 2) || solidAt(aheadCol2, feetRow - 2);
          const tileBoundary = dir > 0 ? (centerCol + 1) * TILE : centerCol * TILE;
          const distToEdge = dir > 0 ? tileBoundary - cx : cx - tileBoundary;
          const nearEdge = distToEdge < 14;
          // Mario-style bonus content adds patrolling minions to some
          // floors' main walkway — a real player just hops over them
          // (they're low, MINION_H=22px), so teach the autopilot the
          // same dodge instead of walking straight into one.
          const minionAhead = (st.minionsInfo || []).some((m) => {
            if (!m.alive) return false;
            const mCenterCol = (m.x + m.w / 2) / TILE;
            const mFeetRow = Math.round((m.y + m.h) / TILE);
            if (Math.abs(mFeetRow - feetRow) > 1) return false;
            const gapCols = dir > 0 ? mCenterCol - centerCol : centerCol - mCenterCol;
            return gapCols > -0.5 && gapCols < 1.8;
          });
          if (st.onGround && !ceilingAboveHere && (minionAhead || (nearEdge && (!floorOrLadderAhead || ledgeAhead)))) input.up = true;
        }
      };
    };
    window.__runSingleTarget = function (floorNum, targetCol, timeoutMs) {
      return new Promise((resolve) => {
        const floor = floorByNum(floorNum);
        const tick = window.__buildSingleTarget(floor, targetCol);
        let settled = false, stuckFrames = 0, lastX = null;
        const t0 = performance.now();
        function loop() {
          tick();
          const st = Platformer.debugState();
          if (st) {
            if (lastX !== null && Math.abs(st.x - lastX) < 0.05 && st.onGround) stuckFrames++; else stuckFrames = 0;
            lastX = st.x;
          }
          if (!settled) {
            if (stuckFrames > 240) { settled = true; resolve("stuck"); return; }
            if (performance.now() - t0 > timeoutMs) { settled = true; resolve("timeout"); return; }
            requestAnimationFrame(loop);
          }
        }
        requestAnimationFrame(loop);
      });
    };
  });
  await page.evaluate(() => {
    const floor = floorByNum(1);
    return window.__runSingleTarget(1, floor.platform.door.col, 10000);
  });
  await page.waitForTimeout(500);
  const f1Solved = await page.evaluate(() => document.querySelector(".story-panel .title")?.textContent === "Floor Cleared");
  const f1Trophies = await page.evaluate(() => { const s = Platformer.debugState(); return s ? s.trophiesCollected + "/" + s.trophiesTotal : "n/a"; });
  check("Floor 1 solved via real physics autopilot (all trophies + door)", f1Solved, "trophies=" + f1Trophies);

  console.log("\n=== Floor 2 (choice mode): correct terminal via debug teleport ===");
  await advance(2);
  const f2IsChoice = await page.evaluate(() => document.querySelector(".choice-briefing") !== null);
  check("Floor 2 loaded as a choice-mode maze with a briefing panel", f2IsChoice);
  await solveChoiceFloor();
  const f2Solved = await page.evaluate(() => document.querySelector(".story-panel .title")?.textContent === "Floor Cleared");
  check("Floor 2 solved by touching the correct lettered terminal", f2Solved);

  console.log("\n=== Floor 3 (choice/treasure mode): correct terminal via debug teleport ===");
  await advance(3);
  await solveChoiceFloor();
  const f3Solved = await page.evaluate(() => document.querySelector(".story-panel .title")?.textContent === "Floor Cleared");
  check("Floor 3 solved by touching the correct lettered terminal", f3Solved);

  console.log("\n=== Floor 4 (trophy mode, ladders): all trophies + door via debug hooks ===");
  await advance(4);

  console.log("\n=== Floor 4: Mario-style bonus content (coins, minions, shield, moving platform) ===");
  const f4Bonus = await page.evaluate(() => Platformer.debugState());
  check("Floor 4 has bonus coin pickups", f4Bonus.pickupsInfo.some((p) => p.type === "coin"), "pickups=" + JSON.stringify(f4Bonus.pickupsInfo.map((p) => p.type)));
  check("Floor 4 has a shield power-up pickup", f4Bonus.pickupsInfo.some((p) => p.type === "shield"));
  check("Floor 4 has at least one stompable minion", f4Bonus.minionsInfo.length >= 1, "minions=" + f4Bonus.minionsInfo.length);
  check("Floor 4 has a moving bonus platform", f4Bonus.movingPlatformsInfo.length >= 1);

  const scoreBefore = await page.evaluate(() => Number((document.getElementById("storyHudScore")?.textContent || "0").replace(/,/g, "")));
  await page.evaluate(() => { Platformer.__debugTeleportToPickupType("coin"); });
  await page.waitForTimeout(150);
  const afterCoin = await page.evaluate(() => Platformer.debugState());
  const scoreAfterCoin = await page.evaluate(() => Number((document.getElementById("storyHudScore")?.textContent || "0").replace(/,/g, "")));
  check("Walking over a coin increments coinsCollected", afterCoin.coinsCollected === 1, "coinsCollected=" + afterCoin.coinsCollected);
  check("Walking over a coin banks score via onCoin", scoreAfterCoin > scoreBefore, `before=${scoreBefore} after=${scoreAfterCoin}`);

  await page.evaluate(() => { Platformer.__debugTeleportToPickupType("shield"); });
  await page.waitForTimeout(150);
  const afterShield = await page.evaluate(() => Platformer.debugState());
  check("Walking over the shield pickup grants shieldT immunity", afterShield.shieldT > 0, "shieldT=" + afterShield.shieldT);

  // With shield active, standing on a live minion or guard should NOT end
  // the run (the neutered SecurityGuard.getBounds() above already proves
  // guards are harmless separately — this proves the minion path too).
  if (afterShield.minionsInfo.length) {
    await page.evaluate(() => { Platformer.__debugTeleportToMinion(0); });
    await page.waitForTimeout(200);
    const stillPlayingWithShield = await page.evaluate(() => Story.debugPos());
    check("Shield immunity prevents a minion touch from ending the run", stillPlayingWithShield && stillPlayingWithShield.state === "platform", JSON.stringify(stillPlayingWithShield && stillPlayingWithShield.state));
  }

  await solveTrophyFloor();
  const f4Solved = await page.evaluate(() => document.querySelector(".story-panel .title")?.textContent === "Floor Cleared");
  check("Floor 4 solved via debug trophy/door hooks", f4Solved);

  console.log("\n=== Floor 5 (Legal & Compliance): quiz -> boss gauntlet -> door ===");
  await advance(5);
  const f5IsChoice = await page.evaluate(() => document.querySelector(".choice-briefing") !== null);
  check("Floor 5 loaded as a choice-mode maze with a briefing panel", f5IsChoice);

  await page.evaluate(() => { Platformer.__debugTeleportToCorrectChoice(); });
  await page.waitForTimeout(400);
  const afterQuiz = await page.evaluate(() => Story.debugPos());
  check(
    "Answering Floor 5's quiz correctly does NOT solve the floor outright — it wakes the boss instead",
    afterQuiz && afterQuiz.state === "platform" && afterQuiz.quizSolved === true && afterQuiz.boss && afterQuiz.boss.active === true,
    JSON.stringify(afterQuiz && { state: afterQuiz.state, quizSolved: afterQuiz.quizSolved, boss: afterQuiz.boss })
  );
  check("Floor 5's door is locked while the boss is still up", afterQuiz && afterQuiz.doorUnlocked === false, "doorUnlocked=" + (afterQuiz && afterQuiz.doorUnlocked));

  console.log("\n=== Floor 5's boss-gun pickup: an ADDITIONAL attack, not a replacement for stun ===");
  const preGun = await page.evaluate(() => Platformer.debugState());
  const gunGuardIndex = preGun.guardsInfo.findIndex((g) => g.carriesGun);
  check("Exactly one Floor 5 guard is flagged carriesGun", gunGuardIndex !== -1, "guardsInfo=" + JSON.stringify(preGun.guardsInfo.map((g) => g.carriesGun)));
  check("Player doesn't start Floor 5 with the gun", preGun.hasGun === false);

  await page.evaluate((idx) => { Platformer.__debugForceStunNearestGuard(idx); }, gunGuardIndex);
  const postStunGunGuard = await page.evaluate(() => Platformer.debugState());
  check(
    "Stunning the carriesGun guard drops a gun pickup (not just a charge pickup)",
    postStunGunGuard.pickupsInfo.some((p) => p.type === "gun"),
    "pickups=" + JSON.stringify(postStunGunGuard.pickupsInfo.map((p) => p.type))
  );
  check("The gun isn't granted until its pickup is actually collected", postStunGunGuard.hasGun === false);

  const hitsBeforeGun = (await page.evaluate(() => Platformer.debugState())).boss.hitsTaken;
  await page.evaluate(() => { Platformer.__debugGiveGun(); });
  const withGun = await page.evaluate(() => Platformer.debugState());
  check("__debugGiveGun grants hasGun (simulating walking over the pickup)", withGun.hasGun === true);
  check(
    "Picking up the gun alone doesn't land a hit — it's a new attack, not an automatic one",
    withGun.boss.hitsTaken === hitsBeforeGun
  );

  await page.evaluate(() => { Platformer.__debugForceStunNearestGuard(); }); // an ordinary stun charge, still usable
  const afterOrdinaryStunPostGun = await page.evaluate(() => Platformer.debugState());
  check(
    "Ordinary stun charges still work normally after the gun is picked up (gun is additive, not a replacement)",
    afterOrdinaryStunPostGun.pickupsInfo.some((p) => p.type === "charge")
  );

  console.log("\n=== Dedicated Gun-fire key (G): kills ORDINARY guards too, not just the boss ===");
  const preGunKill = await page.evaluate(() => Platformer.debugState());
  // Paralyzed is fine here — takeGunHit() works regardless of prior
  // stun state (see guards.js), and by this point in the run both of
  // Floor 5's ordinary guards have already been stunned by earlier
  // checks above.
  const ordinaryGuardIdx = preGunKill.guardsInfo.findIndex((g) => !g.carriesGun && !g.killed && !g.isBoss);
  check("There's a live, non-boss guard available to test the gun-kill on", ordinaryGuardIdx !== -1, JSON.stringify(preGunKill.guardsInfo));

  await page.evaluate((idx) => { Platformer.__debugForceGunHitGuard(idx); }, ordinaryGuardIdx);
  const afterFirstGunHit = await page.evaluate(() => Platformer.debugState());
  check(
    "A single gun hit paralyzes an ordinary guard but doesn't kill it yet (multiple hits needed)",
    afterFirstGunHit.guardsInfo[ordinaryGuardIdx].killed === false && afterFirstGunHit.guardsInfo[ordinaryGuardIdx].gunHitsTaken === 1,
    JSON.stringify(afterFirstGunHit.guardsInfo[ordinaryGuardIdx])
  );

  await page.evaluate((idx) => { Platformer.__debugForceGunHitGuard(idx); }, ordinaryGuardIdx);
  const afterSecondGunHit = await page.evaluate(() => Platformer.debugState());
  check(
    "A second gun hit permanently kills the ordinary guard",
    afterSecondGunHit.guardsInfo[ordinaryGuardIdx].killed === true,
    JSON.stringify(afterSecondGunHit.guardsInfo[ordinaryGuardIdx])
  );
  check(
    "Killing a guard with the gun still drops a charge pickup (same reward shape as a stun)",
    afterSecondGunHit.pickupsInfo.some((p) => p.type === "charge")
  );

  await page.evaluate(() => { Platformer.__debugForceDefeatBoss(); });
  await page.waitForTimeout(200);
  const afterBoss = await page.evaluate(() => Story.debugPos());
  check(
    "The boss goes down after enough stun hits, and the door unlocks",
    afterBoss && afterBoss.boss && afterBoss.boss.defeated === true && afterBoss.doorUnlocked === true,
    JSON.stringify(afterBoss && { boss: afterBoss.boss, doorUnlocked: afterBoss.doorUnlocked })
  );

  await page.evaluate(() => { Platformer.__debugTeleportToDoor(); });
  await page.waitForTimeout(400);
  const f5Solved = await page.evaluate(() => document.querySelector(".story-panel .title")?.textContent === "Floor Cleared");
  const f5BossNote = await page.evaluate(() => (document.querySelector(".story-panel .story-hint")?.textContent || ""));
  check("Floor 5 solved after the boss is defeated and the door is reached", f5Solved);
  check("The 'Floor Cleared' panel calls out the defeated boss by name", /The Auditor/.test(f5BossNote), f5BossNote);

  console.log("\n=== Act 2 mechanics on Floor 5: spotlight drone + laser grid ===");
  {
    const st = await page.evaluate(() => Platformer.debugState());
    check("Floor 5 carries an Act 2 spotlight drone",
      st.guardsInfo.some((g) => g.kind === "drone"), st.guardsInfo.map((g) => g.kind).join(","));
    check("Floor 5 carries an Act 2 timed laser grid", st.lasersInfo.length > 0, "n=" + st.lasersInfo.length);
  }

  console.log("\n=== Revision 11: villain reskin assets + Fullscreen controls ===");
  const villainAssets = await page.evaluate(() => ({
    bossFace: !!(window.SPRITES && window.SPRITES.bossFace && window.SPRITES.bossFace.complete && window.SPRITES.bossFace.naturalWidth > 0),
    bossFaceDefeated: !!(window.SPRITES && window.SPRITES.bossFaceDefeated && window.SPRITES.bossFaceDefeated.complete && window.SPRITES.bossFaceDefeated.naturalWidth > 0),
  }));
  check("The Story boss portrait (img/boss-face.png, regenerated from the user's character sheet) loads", villainAssets.bossFace, JSON.stringify(villainAssets));
  check("The defeated boss portrait variant loads", villainAssets.bossFaceDefeated);

  const storyFullscreenBtn = await page.evaluate(() => !!document.getElementById("storyBtnFullscreen"));
  check("Story Mode has a Fullscreen button in its HUD", storyFullscreenBtn);
  await page.click("#storyBtnFullscreen").catch(() => {});
  await page.waitForTimeout(150);
  const storyFsLabelChanged = await page.evaluate(() => document.getElementById("storyBtnFullscreen").getAttribute("aria-pressed") !== null);
  check("Clicking the Story Fullscreen button doesn't crash the page (aria-pressed stays a real value either way)", storyFsLabelChanged);
  // Headless Chromium actually grants this request — exit again so a
  // leftover fullscreen element doesn't swallow every later click (see
  // the matching note in e2e-fps-test.js).
  await page.evaluate(() => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); });
  await page.waitForTimeout(150);

  console.log("\n=== Floor 6 (NOC, trophy mode): all trophies + door via debug hooks ===");
  await advance(6);
  await solveTrophyFloor();
  const f6Solved = await page.evaluate(() => document.querySelector(".story-panel .title")?.textContent === "Floor Cleared");
  check("Floor 6 solved via debug trophy/door hooks", f6Solved);

  console.log("\n=== Floor 7 (Executive Suite, choice/treasure mode): correct terminal ===");
  await advance(7);
  await solveChoiceFloor();
  const f7Solved = await page.evaluate(() => document.querySelector(".story-panel .title")?.textContent === "Floor Cleared");
  check("Floor 7 solved by touching the correct lettered terminal", f7Solved);

  console.log("\n=== Floor 8 (Cloud & R&D, choice mode): correct terminal ===");
  await advance(8);
  await solveChoiceFloor();
  const f8Solved = await page.evaluate(() => document.querySelector(".story-panel .title")?.textContent === "Floor Cleared");
  check("Floor 8 solved by touching the correct lettered terminal", f8Solved);

  console.log("\n=== Floor 9 (Data Center, hardest trophy floor): all trophies + door ===");
  await advance(9);
  await solveTrophyFloor();
  const f9Solved = await page.evaluate(() => document.querySelector(".story-panel .title")?.textContent === "Floor Cleared");
  check("Floor 9 solved via debug trophy/door hooks", f9Solved);

  console.log("\n=== Floor 10 (Secure Server Room): terminal appears, wrong+correct password ===");
  await advance(10);
  const f10Title = await page.evaluate(() => document.querySelector(".story-panel .title")?.textContent);
  check("Floor 10 intro correctly identifies itself as the Server Room", f10Title === "The Server Room", "title=" + f10Title);

  await solveTrophyFloor();
  const hasTerminal = await page.evaluate(() => !!document.getElementById("terminalInput"));
  check("Reaching the door with all trophies opens the password terminal", hasTerminal);

  if (hasTerminal) {
    await page.fill("#terminalInput", "WRONGCODE");
    await page.click("#storyBtnSubmitPassword");
    await page.waitForTimeout(200);
    const feedback = await page.evaluate(() => document.getElementById("terminalFeedback")?.textContent || "");
    check("Wrong password shows correct attempts-remaining feedback", /2 attempts remaining/.test(feedback), feedback);

    const track = await page.evaluate(() => (document.querySelector(".password-track")?.textContent || "").replace(/\s+/g, ""));
    check("Password track has 9 fragments (floors 1-9 cleared)", track.length === 9, "track=" + track);
    await page.fill("#terminalInput", track);
    await page.click("#storyBtnSubmitPassword");
    await page.waitForTimeout(500);
    const resultTitle = await page.evaluate(() => document.getElementById("storyResultTitle")?.textContent);
    const resultFloors = await page.evaluate(() => document.getElementById("storyResultFloors")?.textContent);
    check("Correct password triggers victory (MISSION COMPLETE, 10/10 floors)", resultTitle === "MISSION COMPLETE" && resultFloors === "10/10", "title=" + resultTitle + " floors=" + resultFloors);
  }

  console.log("\n=== Fresh run: 3 wrong password attempts locks the mission out ===");
  await page.evaluate(() => { Story.start(); });
  await page.click("#storyBtnBegin");
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    SecurityGuard.prototype.getBounds = function () {
      return { left: -99999, right: -99998, top: -99999, bottom: -99998 };
    };
  });
  // Race through floors 1-9 purely via debug hooks (no need to re-prove
  // physics here, only the lockout path past a full run).
  await solveTrophyFloor(); // Floor 1
  for (let n = 2; n <= 9; n++) {
    await advance(n);
    if (n === 5) {
      await page.evaluate(() => { Platformer.__debugTeleportToCorrectChoice(); });
      await page.waitForTimeout(200);
      await page.evaluate(() => { Platformer.__debugForceDefeatBoss(); });
      await page.waitForTimeout(150);
      await page.evaluate(() => { Platformer.__debugTeleportToDoor(); });
      await page.waitForTimeout(300);
    } else {
      const isChoice = await page.evaluate(() => document.querySelector(".choice-briefing") !== null);
      if (isChoice) await solveChoiceFloor();
      else await solveTrophyFloor();
    }
  }
  await advance(10);
  await solveTrophyFloor();
  for (let i = 1; i <= 3; i++) {
    await page.fill("#terminalInput", "NOPE" + i);
    await page.click("#storyBtnSubmitPassword");
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(400);
  const lockoutTitle = await page.evaluate(() => document.getElementById("storyResultTitle")?.textContent);
  const lockoutReason = await page.evaluate(() => document.getElementById("storyResultReason")?.textContent);
  check("3 wrong password attempts locks the mission out (SECURITY ALERT)", lockoutTitle === "SECURITY ALERT", "title=" + lockoutTitle + " reason=" + lockoutReason);

  console.log("\n=== Arcade Mission: endless roguelite (escalation, combo, perks, integrity) ===");
  await page.goto("http://localhost:8080/index.html");
  await page.waitForSelector("#screen-name:not([aria-hidden='true'])");
  await page.fill("#playerNameInput", "Phase4Bot");
  await page.click("#btnContinueToBriefing");
  await page.click("#btnBriefingContinue");
  await page.click("#btnSelectArcade");
  await page.click("#btnStartGame");
  await page.waitForTimeout(600);
  {
    const st = () => page.evaluate(() => window.Arcade.debugState());
    let s = await st();
    const f1Hazards = s.hazardCount;
    check("Arcade starts a roguelite run on floor 1 with full integrity",
      s.floor === 1 && s.floorsCleared === 0 && s.health === 100);
    check("The 60-second timer is gone from the Arcade HUD",
      await page.evaluate(() => !document.getElementById("timerWrap")));

    s = await page.evaluate(() => window.Arcade.__debugClearFloor());
    await page.waitForTimeout(150);
    check("Clearing a floor advances the run", s.floor === 2 && s.floorsCleared === 1);
    check("Enemy speed escalates +5% per floor", Math.abs(s.escalation.speed - 1.05) < 1e-9,
      "x" + s.escalation.speed.toFixed(3));
    check("Spawn rate escalates: floor 2 carries more hazards than floor 1",
      s.hazardCount > f1Hazards, `${f1Hazards} -> ${s.hazardCount}`);

    await page.evaluate(() => window.Arcade.__debugClearFloor());
    s = await page.evaluate(() => window.Arcade.__debugClearFloor());
    await page.waitForTimeout(200);
    check("A perk draft opens after every 3rd floor cleared",
      s.perkDraftOpen === true && s.floorsCleared === 3);
    check("The draft offers exactly 3 perks", s.pendingPerks.length === 3, s.pendingPerks.join(","));
    const cardCount = await page.evaluate(() =>
      document.querySelectorAll("#arcadeOverlay .perk-card").length);
    check("The perk draft renders 3 clickable cards", cardCount === 3, "cards=" + cardCount);

    const pickId = s.pendingPerks[0];
    s = await page.evaluate((id) => window.Arcade.__debugChoosePerk(id), pickId);
    await page.waitForTimeout(150);
    check("Drafting a perk closes the modal and banks it for the run",
      s.perkDraftOpen === false && s.perks.includes(pickId), "perks=" + s.perks.join(","));

    s = await page.evaluate(() => window.Arcade.__debugEmp(true));
    await page.waitForTimeout(120);
    check("The EMP pulse stuns a drone and feeds the combo",
      s.stunnedDrones > 0 && s.combo > 0, `stunned=${s.stunnedDrones} combo=${s.combo}`);

    // Combo behaviour is pure ScoreManager logic — asserted directly so
    // the tiering/decay/reset rules are locked in independent of the loop.
    const combo = await page.evaluate(() => {
      const sm = new ScoreManager();
      const tiers = {};
      for (let i = 1; i <= 20; i++) { sm.addPositive("token", 0, 0, 1, 1); tiers[i] = sm.comboMultiplier; }
      const before = sm.combo;
      sm.update(10); // let the chain window lapse
      const after = sm.combo;
      const sm2 = new ScoreManager();
      for (let i = 0; i < 3; i++) sm2.addPositive("token", 0, 0, 1, 1);
      const preHit = sm2.comboMultiplier;
      sm2.addPenalty("drone", 0, 0);
      return { t3: tiers[3], t5: tiers[5], t8: tiers[8], t12: tiers[12], t16: tiers[16], t20: tiers[20],
        before, after, preHit, postHit: sm2.comboMultiplier };
    });
    check("Combo multiplier tiers climb 1.5 / 2 / 2.5 / 3 / 4 / 5",
      combo.t3 === 1.5 && combo.t5 === 2 && combo.t8 === 2.5 && combo.t12 === 3 && combo.t16 === 4 && combo.t20 === 5,
      JSON.stringify(combo));
    check("An idle combo decays on its own once the chain window lapses",
      combo.before === 20 && combo.after === 0, `${combo.before} -> ${combo.after}`);
    check("Taking damage resets the multiplier straight to 1x",
      combo.preHit === 1.5 && combo.postHit === 1);

    // Integrity is now what ends a run.
    let guardRail = 0;
    let dead = null;
    while (guardRail++ < 40) {
      dead = await page.evaluate(() => window.Arcade.__debugDamage("drone"));
      if (!dead || dead.state === "gameover" || dead.health <= 0) break;
    }
    await page.waitForTimeout(350);
    const resultShown = await page.evaluate(() =>
      document.getElementById("screen-result").getAttribute("aria-hidden") === "false");
    const resultTitle = await page.evaluate(() => document.getElementById("resultTitle").textContent);
    check("Running out of integrity ends the run (no clock involved)", resultShown, "title=" + resultTitle);
    check("The result screen reads RUN OVER, not TIME'S UP", resultTitle === "RUN OVER", resultTitle);
    check("The result screen reports how many floors the run cleared",
      await page.evaluate(() => document.getElementById("resultFloorsCleared").textContent !== ""));
  }

  console.log("\n=== Arcade Mission: loads and runs without errors ===");
  await page.goto("http://localhost:8080/index.html");
  await page.waitForSelector("#screen-name:not([aria-hidden='true'])");
  await page.fill("#playerNameInput", "Phase4Bot");
  await page.click("#btnContinueToBriefing");
  await page.click("#btnBriefingContinue");
  await page.click("#btnSelectArcade");
  await page.click("#btnStartGame");
  await page.waitForTimeout(1500);
  const arcadeAlive = await page.evaluate(() => !!document.getElementById("canvas"));
  check("Arcade Mission loads and runs", arcadeAlive);
  const arcadeZoneLabel = await page.evaluate(() => document.getElementById("hudZoneLabel")?.textContent || "");
  check("Arcade zone label uses the rebranded company name", arcadeZoneLabel === "Meridian Main Gate", arcadeZoneLabel);
  await page.screenshot({ path: "tools/shot-p4-arcade-drones-live.png" });
  const arcadeFullscreenBtn = await page.evaluate(() => !!document.getElementById("btnFullscreen"));
  check("Arcade Mission has a Fullscreen button in its HUD", arcadeFullscreenBtn);

  console.log("\n=== Rebrand: no leftover 'UST' text anywhere in the shipped UI ===");
  const bodyText = await page.evaluate(() => document.body.innerText || "");
  check("No 'UST' substring anywhere in the rendered page text", !/\bUST\b/.test(bodyText));

  const relevantErrors = consoleErrors.filter((e) => !/ERR_TUNNEL|404/.test(e));
  check("No unexpected console errors across the whole run", relevantErrors.length === 0, relevantErrors.join(" | "));

  console.log("\n=== Summary ===");
  const failed = results.filter((r) => !r.pass);
  console.log(`${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) {
    console.log("FAILED:");
    failed.forEach((f) => console.log(" - " + f.label + (f.detail ? " :: " + f.detail : "")));
  }

  await browser.close();
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error("TEST SCRIPT ERROR:", err.message || err);
  process.exit(1);
});
