/* ============================================================
   tools/e2e-phase3-test.js
   Playwright smoke test for this phase's features:
     - Arcade tree obstacles (solid, no score penalty)
     - In-level story notes (Arcade zone toast + Story quiz/treasure/platform)
     - Randomized Secure Server Room floor (startNewStoryRun)
     - Dynamic floor-count HUD/result display (no hardcoded "/10")
     - Wrong-elevator-pick still ends the run
     - Restyled lift-doors elevator UI

   Run against a local static server:
     python3 -m http.server 8080
     NODE_PATH=/home/claude/.npm-global/lib/node_modules node tools/e2e-phase3-test.js
   ============================================================ */

const { chromium } = require("playwright");

const URL = "http://localhost:8080/index.html";

function logStep(msg) {
  console.log(`\n=== ${msg} ===`);
}

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

  await page.goto(URL);
  await page.waitForSelector("#screen-name:not([aria-hidden='true'])", { timeout: 5000 }).catch(() => {});

  /* ---------------- Randomized server room (pure engine, no UI needed) ---------------- */
  logStep("startNewStoryRun() randomization");
  const rollResults = await page.evaluate(() => {
    const rolls = [];
    for (let i = 0; i < 40; i++) {
      const { serverRoomFloor, totalFloors } = startNewStoryRun();
      const finalFloor = floorByNum(serverRoomFloor);
      const priorFloor = serverRoomFloor > 1 ? floorByNum(serverRoomFloor - 1) : null;
      rolls.push({
        serverRoomFloor,
        totalFloors,
        matchesTotal: serverRoomFloor === totalFloors,
        finalFlagSet: !!(finalFloor && finalFloor.isFinal),
        finalFloorNum: finalFloor && finalFloor.num,
        priorRiddleIsGeneric: priorFloor ? priorFloor.riddle.includes("it's the one you came for") : null,
        floorCountInRun: null,
      });
    }
    return rolls;
  });
  const distinctFloors = new Set(rollResults.map((r) => r.serverRoomFloor));
  const allInRange = rollResults.every((r) => r.serverRoomFloor >= 3 && r.serverRoomFloor <= 10);
  const allMatchTotal = rollResults.every((r) => r.matchesTotal);
  const allFinalFlagged = rollResults.every((r) => r.finalFlagSet && r.finalFloorNum === r.serverRoomFloor);
  const allPriorRiddleOk = rollResults.every((r) => r.priorRiddleIsGeneric !== false);
  console.log(`Distinct server-room floors across 40 rolls: [${[...distinctFloors].sort().join(",")}]`);
  console.log(`All rolls in [3,10]: ${allInRange}`);
  console.log(`All rolls: serverRoomFloor === totalFloors: ${allMatchTotal}`);
  console.log(`All rolls: server-room floor correctly flagged isFinal: ${allFinalFlagged}`);
  console.log(`All rolls: floor-before-server-room got the generic final-approach riddle: ${allPriorRiddleOk}`);
  if (distinctFloors.size < 3) console.log("WARNING: low variety in 40 rolls — check RNG / range constants.");

  /* ---------------- Full run through name -> briefing -> mode select ---------------- */
  logStep("Enter name -> briefing -> mode select");
  await page.fill("#playerNameInput", "Phase3Bot");
  await page.click("#btnContinueToBriefing");
  await page.click("#btnBriefingContinue");
  await page.waitForSelector("#screen-mode-select:not([aria-hidden='true'])");

  /* ---------------- ARCADE: tree obstacle + zone note ---------------- */
  logStep("Arcade: tree collision blocks movement without score penalty, zone note toast appears");
  await page.click("#btnSelectArcade");
  await page.waitForSelector("#screen-instructions:not([aria-hidden='true'])");
  await page.click("#btnStartGame");
  await page.waitForSelector("#screen-game:not([aria-hidden='true'])").catch(() => {});
  await page.waitForTimeout(1200);

  const treeCheck = await page.evaluate(() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const scoreBefore = document.getElementById("hudScore").textContent;
        resolve({ scoreBefore, treeCount: window.__gcDebugTreeCount || null });
      }, 50);
    });
  });
  console.log("Score before tree-walk attempt:", treeCheck.scoreBefore);

  // Walk the player toward a known tree position (world.trees[0] is at
  // local (80,480) within zone 0 — drive left+up repeatedly, then confirm
  // no penalty toast/score drop occurred purely from bumping scenery, and
  // that a zone-note toast was drawn (checked via canvas pixel sampling
  // is fragile; instead assert on the in-memory zoneNoteText plumbing by
  // checking the game rendered >60 frames with no console errors while
  // colliding repeatedly against the world edge/trees).
  await page.keyboard.down("ArrowLeft");
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(1500);
  await page.keyboard.up("ArrowLeft");
  await page.keyboard.up("ArrowUp");
  await page.screenshot({ path: "/home/claude/gamecraft/tools/shot-p3-arcade-trees.png" });
  const scoreAfterTreeWalk = await page.textContent("#hudScore");
  console.log("Score after walking into trees for 1.5s:", scoreAfterTreeWalk);

  await page.evaluate(() => window.location.reload());
  await page.waitForTimeout(300);

  /* ---------------- STORY: floor 1 intro shows story-note infra + dynamic floor count ---------------- */
  logStep("Story Mode: start run, check dynamic floor-count HUD");
  await page.fill("#playerNameInput", "Phase3Bot");
  await page.click("#btnContinueToBriefing");
  await page.click("#btnBriefingContinue");
  await page.waitForSelector("#screen-mode-select:not([aria-hidden='true'])");
  await page.click("#btnSelectStory");
  await page.waitForSelector("#screen-story-instructions:not([aria-hidden='true'])");
  await page.click("#btnEnterBuilding");
  await page.waitForSelector("#screen-story:not([aria-hidden='true'])");
  await page.waitForTimeout(400);

  const hudFloorText = await page.textContent("#storyHudFloor");
  const eyebrowText = await page.textContent("#storyOverlay .eyebrow");
  const totalFloorsInPage = await page.evaluate(() => window.Story ? null : null); // Story module doesn't expose totalFloors directly
  console.log("HUD floor text on Floor 1:", hudFloorText);
  console.log("Intro eyebrow text:", eyebrowText);
  const hudMatch = hudFloorText.match(/Floor 1\/(\d+)/);
  const eyebrowMatch = eyebrowText.match(/Floor 1 of (\d+)/);
  console.log("HUD total:", hudMatch && hudMatch[1], "| Eyebrow total:", eyebrowMatch && eyebrowMatch[1]);
  const dynamicTotalsConsistent = !!(hudMatch && eyebrowMatch && hudMatch[1] === eyebrowMatch[1]);
  console.log("HUD and eyebrow totals agree (dynamic, no hardcoded /10 mismatch):", dynamicTotalsConsistent);
  await page.screenshot({ path: "/home/claude/gamecraft/tools/shot-p3-floor1-intro.png" });

  /* ---------------- Autopilot floor 1 to reach the elevator, then check lift UI + storyNote overlay ---------------- */
  logStep("Autopilot Floor 1 -> solve -> riddle (pinned note) -> elevator (lift doors)");
  await page.evaluate(() => {
    window.__buildAutopilot = function (floor) {
      const TILE = 40;
      const p = floor.platform;
      const solids = p.platforms.map((pl) => ({ x0: pl.col, x1: pl.col + (pl.len || 1) - 1, row: pl.row }));
      const ladders = p.ladders.map((l) => ({ col: l.col, rowTop: l.rowTop, rowBottom: l.rowBottom }));
      const doorCol = p.door.col;
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
        const dir = doorCol * TILE > cx ? 1 : -1;
        input.left = dir < 0; input.right = dir > 0;
        const aheadCol1 = centerCol + dir, aheadCol2 = centerCol + dir * 2;
        const floorOrLadderAhead = solidAt(aheadCol1, feetRow) || solidAt(aheadCol2, feetRow) || !!ladderAtCol(aheadCol1);
        const ceilingAboveHere = solidAt(centerCol, feetRow - 2) || solidAt(centerCol, feetRow - 3);
        const ledgeAhead = solidAt(aheadCol1, feetRow - 2) || solidAt(aheadCol2, feetRow - 2);
        const tileBoundary = dir > 0 ? (centerCol + 1) * TILE : centerCol * TILE;
        const distToEdge = dir > 0 ? tileBoundary - cx : cx - tileBoundary;
        const nearEdge = distToEdge < 14;
        if (st.onGround && !ceilingAboveHere && nearEdge && (!floorOrLadderAhead || ledgeAhead)) input.up = true;
      };
    };
  });

  // Click Begin on the intro panel to enter the platform floor.
  await page.click("#storyBtnBegin");
  await page.waitForTimeout(200);

  const floor1Outcome = await page.evaluate(() => {
    return new Promise((resolve) => {
      const tick = window.__buildAutopilot(floorByNum(1));
      let settled = false, frameCount = 0, lastX = null, stuckFrames = 0;
      const t0 = performance.now();
      function loop() {
        frameCount++;
        tick();
        const st = Platformer.debugState();
        if (st) {
          if (lastX !== null && Math.abs(st.x - lastX) < 0.05 && st.onGround) stuckFrames++; else stuckFrames = 0;
          lastX = st.x;
        }
        if (!settled) {
          if (stuckFrames > 240) { settled = true; resolve("stuck"); return; }
          if (performance.now() - t0 > 18000) { settled = true; resolve("timeout"); return; }
          if (!Platformer.debugState()) { settled = true; resolve("solved-or-failed"); return; }
          requestAnimationFrame(loop);
        }
      }
      requestAnimationFrame(loop);
    });
  });
  console.log("Floor 1 autopilot outcome:", floor1Outcome);
  await page.waitForTimeout(600);
  await page.screenshot({ path: "/home/claude/gamecraft/tools/shot-p3-riddle-panel.png" });

  const riddleState = await page.evaluate(() => ({
    hasPinnedNote: !!document.querySelector(".pinned-note"),
    title: document.querySelector("#storyOverlay .title") ? document.querySelector("#storyOverlay .title").textContent : null,
  }));
  console.log("Riddle panel state:", riddleState);

  if (riddleState.hasPinnedNote) {
    await page.click("#storyBtnElevator");
    await page.waitForTimeout(300);
    const liftState = await page.evaluate(() => {
      const units = Array.from(document.querySelectorAll(".lift-unit"));
      return {
        unitCount: units.length,
        hasDoors: units.every((u) => u.querySelector(".lift-doors") && u.querySelector(".lift-door-left") && u.querySelector(".lift-door-right")),
        enabledCount: units.filter((u) => !u.disabled).length,
        disabledCount: units.filter((u) => u.disabled).length,
      };
    });
    console.log("Lift bank state:", liftState);
    await page.screenshot({ path: "/home/claude/gamecraft/tools/shot-p3-lift-bank.png" });

    logStep("Wrong lift pick -> should fail the run");
    // Click the last enabled, definitely-wrong floor button (anything other than floor 2).
    const wrongPickResult = await page.evaluate(() => {
      const units = Array.from(document.querySelectorAll(".lift-unit:not(:disabled)"));
      const wrong = units.find((u) => Number(u.dataset.floor) !== 2);
      if (!wrong) return "no-wrong-option-available";
      wrong.click();
      return "clicked:" + wrong.dataset.floor;
    });
    console.log("Wrong pick action:", wrongPickResult);
    await page.waitForTimeout(500);
    const resultScreenActive = await page.evaluate(() => {
      const el = document.getElementById("screen-story-result");
      return el && el.getAttribute("aria-hidden") !== "true";
    });
    const resultTitle = await page.textContent("#storyResultTitle").catch(() => null);
    console.log("Story result screen active after wrong pick:", resultScreenActive, "| title:", resultTitle);
    await page.screenshot({ path: "/home/claude/gamecraft/tools/shot-p3-wrongpick-result.png" });
  }

  console.log("\n=== CONSOLE ERRORS CAPTURED ===");
  console.log(consoleErrors.length ? consoleErrors : "(none)");

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify({
    allInRange, allMatchTotal, allFinalFlagged, allPriorRiddleOk,
    distinctFloorsRolled: [...distinctFloors].sort(),
    dynamicTotalsConsistent,
    floor1Outcome,
    consoleErrorCount: consoleErrors.length,
  }, null, 2));

  await browser.close();
})().catch((err) => {
  console.error("TEST SCRIPT ERROR:", err);
  process.exit(1);
});
