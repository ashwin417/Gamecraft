/* ============================================================
   tools/e2e-dave-test.js
   Playwright smoke test for the Dangerous-Dave-style platformer
   conversion (Story Mode floors 1,4,6,9,10) and the Arcade Mission
   visual overhaul. Run against a local static server:

     python3 -m http.server 8080
     NODE_PATH=/home/claude/.npm-global/lib/node_modules node tools/e2e-dave-test.js

   This is a focused engineering-verification test (not the full
   original e2e-test.js flow): it drives the real UI to reach each
   mode, then for platform floors it runs a small in-page autopilot
   (using the real level data + Platformer.debugState()) to play the
   level for real, so the actual physics/collision engine is
   exercised end-to-end rather than just unit-checked.
   ============================================================ */

const { chromium } = require("playwright");
const path = require("path");

const URL = "http://localhost:8080/index.html";
const FLOORS_TO_PLAY = [1, 4, 6, 9, 10];

function logStep(msg) {
  console.log(`\n=== ${msg} ===`);
}

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

  logStep("Load game");
  await page.goto(URL);
  await page.waitForSelector("#screen-name.screen-active, #screen-name:not([aria-hidden='true'])", { timeout: 5000 }).catch(() => {});

  logStep("Enter name -> briefing -> mode select");
  await page.fill("#playerNameInput", "DaveBot");
  await page.click("#btnContinueToBriefing");
  await page.click("#btnBriefingContinue");
  await page.waitForSelector("#screen-mode-select:not([aria-hidden='true'])");

  // ---------------- ARCADE VISUAL OVERHAUL CHECK ----------------
  logStep("Arcade Mission: check detailed tileset + hero assets load, render without errors");
  await page.click("#btnSelectArcade");
  await page.waitForSelector("#screen-instructions:not([aria-hidden='true'])");
  await page.click("#btnStartGame");
  await page.waitForSelector("#screen-game:not([aria-hidden='true'])").catch(() => {});
  await page.waitForTimeout(1500); // let a few frames render + assets finish loading

  const arcadeAssetState = await page.evaluate(() => {
    const s = window.SPRITES || {};
    const ok = (img) => !!(img && img.complete && img.naturalWidth > 0);
    return {
      arcadeTileset: ok(s.arcadeTileset),
      arcadeHero: ok(s.arcadeHero),
      tilesetSize: s.arcadeTileset ? [s.arcadeTileset.naturalWidth, s.arcadeTileset.naturalHeight] : null,
      heroSize: s.arcadeHero ? [s.arcadeHero.naturalWidth, s.arcadeHero.naturalHeight] : null,
    };
  });
  console.log("Arcade asset state:", arcadeAssetState);
  await page.screenshot({ path: "/home/claude/gamecraft/tools/shot-arcade.png" });

  // Move the arcade player around briefly to exercise drawZoneDecor/parallax.
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(600);
  await page.keyboard.up("ArrowUp");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(600);
  await page.keyboard.up("ArrowRight");
  await page.screenshot({ path: "/home/claude/gamecraft/tools/shot-arcade-2.png" });

  // Back out to mode select without finishing the arcade run.
  await page.evaluate(() => window.location.reload());
  await page.waitForTimeout(300);

  logStep("Reload and go to Story Mode");
  await page.fill("#playerNameInput", "DaveBot");
  await page.click("#btnContinueToBriefing");
  await page.click("#btnBriefingContinue");
  await page.waitForSelector("#screen-mode-select:not([aria-hidden='true'])");
  await page.click("#btnSelectStory");
  await page.waitForSelector("#screen-story-instructions:not([aria-hidden='true'])");
  await page.screenshot({ path: "/home/claude/gamecraft/tools/shot-story-instructions.png" });
  await page.click("#btnEnterBuilding");
  await page.waitForSelector("#screen-story:not([aria-hidden='true'])");
  await page.waitForTimeout(500);

  logStep("Floor 1 intro panel reached, checking platform-tile assets");
  const daveAssetState = await page.evaluate(() => {
    const s = window.SPRITES || {};
    const ok = (img) => !!(img && img.complete && img.naturalWidth > 0);
    return {
      davePlayer: ok(s.davePlayer),
      daveGuard: ok(s.daveGuard),
      platformTiles: ok(s.platformTiles),
    };
  });
  console.log("Dave asset state:", daveAssetState);

  // Inject the in-page autopilot helper once.
  await page.evaluate(() => {
    window.__buildAutopilot = function (floor) {
      const TILE = 40;
      const p = floor.platform;
      const solids = p.platforms.map((pl) => ({ x0: pl.col, x1: pl.col + (pl.len || 1) - 1, row: pl.row }));
      const ladders = p.ladders.map((l) => ({ col: l.col, rowTop: l.rowTop, rowBottom: l.rowBottom }));
      const doorCol = p.door.col;
      const PLAYER_W = 26, PLAYER_H = 34;

      function solidAt(col, row) {
        return solids.some((s) => col >= s.x0 && col <= s.x1 && s.row === row);
      }
      function ladderAtCol(col) {
        return ladders.find((l) => l.col === col);
      }

      // Sticky per-shaft climb direction, decided once on entry so the bot
      // doesn't flip-flop mid-climb.
      let climbLadder = null;
      let climbDir = null;

      return function tick() {
        const st = Platformer.debugState();
        if (!st) return;
        const input = window.CG.input;
        const cx = st.x + PLAYER_W / 2;
        const centerCol = Math.floor(cx / TILE);
        const feetRow = Math.round((st.y + PLAYER_H) / TILE);
        const feetY = st.y + PLAYER_H;

        // A ladder "column" == centerCol matching its col is exactly the
        // same test the real engine's ladderAt() uses, so no extra
        // pixel-distance tolerance is needed (a narrower band left a gap
        // where the generic ground-jump logic below could misfire).
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
            input.up = climbDir === "up";
            input.down = climbDir === "down";
            input.left = false; input.right = false;
            return;
          }
          // Finished this shaft -> fall through to normal walk-off logic.
          input.up = false; input.down = false;
        } else {
          climbLadder = null; climbDir = null;
        }

        const dir = doorCol * TILE > cx ? 1 : -1;
        input.left = dir < 0;
        input.right = dir > 0;

        const aheadCol1 = centerCol + dir;
        const aheadCol2 = centerCol + dir * 2;
        const floorOrLadderAhead = solidAt(aheadCol1, feetRow) || solidAt(aheadCol2, feetRow) || !!ladderAtCol(aheadCol1);
        const ceilingAboveHere = solidAt(centerCol, feetRow - 2) || solidAt(centerCol, feetRow - 3);
        const ledgeAhead = solidAt(aheadCol1, feetRow - 2) || solidAt(aheadCol2, feetRow - 2);

        // Only actually jump once close to the trailing edge of the current
        // tile (in the direction of travel) — jumping the instant the gap
        // is detected (anywhere within the tile) throws away runway and can
        // under-shoot a gap that's comfortably within the real jump range.
        const tileBoundary = dir > 0 ? (centerCol + 1) * TILE : centerCol * TILE;
        const distToEdge = dir > 0 ? tileBoundary - cx : cx - tileBoundary;
        const nearEdge = distToEdge < 14;

        if (st.onGround && !ceilingAboveHere && nearEdge && (!floorOrLadderAhead || ledgeAhead)) {
          input.up = true;
        }
      };
    };
  });

  const results = {};
  for (const n of FLOORS_TO_PLAY) {
    logStep(`Playing Floor ${n} via autopilot`);
    const outcome = await page.evaluate(async (floorNum) => {
      const floor = floorByNum(floorNum);
      return new Promise((resolve) => {
        let settled = false;
        const canvas = document.getElementById("storyCanvas");
        const ctx = canvas.getContext("2d");
        const tick = window.__buildAutopilot(floor);

        const samples = [];
        let lastX = null, stuckFrames = 0, frameCount = 0;

        Platformer.start(floor, canvas, ctx, {
          onTrophy: () => {},
          onSolve: () => { if (!settled) { settled = true; finish("solved"); } },
          onFail: (reasonKey) => { if (!settled) { settled = true; finish("failed:" + reasonKey); } },
        });

        function finish(result) {
          cancelAnimationFrame(rafHandle);
          const st = Platformer.debugState();
          resolve({
            result,
            elapsedMs: Math.round(performance.now() - t0),
            trophies: st ? `${st.trophiesCollected}/${st.trophiesTotal}` : "unknown",
            frameCount,
            stuckFrames,
          });
        }

        const t0 = performance.now();
        let rafHandle;
        function loop() {
          frameCount++;
          tick();
          const st = Platformer.debugState();
          if (st) {
            if (lastX !== null && Math.abs(st.x - lastX) < 0.05 && st.onGround) stuckFrames++; else stuckFrames = 0;
            lastX = st.x;
          }
          if (!settled) {
            if (stuckFrames > 240) { // ~4s of zero horizontal progress while grounded
              settled = true;
              finish("stuck");
              return;
            }
            if (performance.now() - t0 > 18000) {
              settled = true;
              finish("timeout");
              return;
            }
            rafHandle = requestAnimationFrame(loop);
          }
        }
        rafHandle = requestAnimationFrame(loop);
      });
    }, n);
    console.log(`Floor ${n} result:`, outcome);
    results[n] = outcome;
    await page.screenshot({ path: `/home/claude/gamecraft/tools/shot-floor${n}.png` });
  }

  logStep("Direct engine checks: guard touch-kill and pit-fall on a synthetic level");
  const syntheticChecks = await page.evaluate(async () => {
    const canvas = document.getElementById("storyCanvas");
    const ctx = canvas.getContext("2d");

    function run(floor) {
      return new Promise((resolve) => {
        Platformer.start(floor, canvas, ctx, {
          onTrophy: () => {},
          onSolve: () => resolve("solved"),
          onFail: (reasonKey) => resolve("failed:" + reasonKey),
        });
        // Let it run for up to 6s of real time (guard/gravity will resolve fast).
        setTimeout(() => resolve("timeout"), 6000);
      });
    }

    // Guard test: player starts right next to a guard with zero patrol range,
    // guard should catch them almost immediately.
    const guardFloor = {
      num: 99, name: "QA Guard Test", tint: "#000", intro: "", dangerLabel: "guard-test",
      platform: {
        width: 10, groundRow: 9,
        platforms: [{ col: 0, row: 9, len: 10 }],
        ladders: [],
        trophies: [{ col: 8, row: 8 }],
        guards: [{ col: 2, row: 9, rangeTiles: 0, speed: 0 }],
        door: { col: 9, row: 8 },
        playerStart: { col: 2, row: 9 },
      },
    };
    const guardResult = await run(guardFloor);

    // Pit test: player starts right at the edge of a short platform with a
    // big gap and no way across -> should fall and trigger "pit".
    const pitFloor = {
      num: 98, name: "QA Pit Test", tint: "#000", intro: "", dangerLabel: "pit-test",
      platform: {
        width: 20, groundRow: 9,
        platforms: [{ col: 0, row: 9, len: 3 }, { col: 15, row: 9, len: 3 }],
        ladders: [],
        trophies: [],
        guards: [],
        door: { col: 17, row: 8 },
        playerStart: { col: 2, row: 9 },
      },
    };
    const pitResult = await run(pitFloor);

    return { guardResult, pitResult };
  });
  console.log("Synthetic engine checks:", syntheticChecks);

  logStep("Quiz + treasure floors still work (unchanged mechanics)");
  await page.evaluate(() => window.location.reload());
  await page.waitForTimeout(300);
  await page.fill("#playerNameInput", "DaveBot");
  await page.click("#btnContinueToBriefing");
  await page.click("#btnBriefingContinue");
  await page.click("#btnSelectStory");
  await page.click("#btnEnterBuilding");
  await page.waitForTimeout(300);
  // Jump straight to floor 2 (quiz) by calling Story internals is not exposed,
  // so just confirm floor 1's intro screen renders the platform hint text.
  const introHint = await page.textContent("#storyOverlay .story-hint").catch(() => null);
  console.log("Floor 1 intro hint text:", introHint);
  await page.screenshot({ path: "/home/claude/gamecraft/tools/shot-floor1-intro.png" });

  console.log("\n=== CONSOLE ERRORS CAPTURED ===");
  console.log(consoleErrors.length ? consoleErrors : "(none)");

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify({ arcadeAssetState, daveAssetState, results, syntheticChecks, consoleErrorCount: consoleErrors.length }, null, 2));

  await browser.close();
})().catch((err) => {
  console.error("TEST SCRIPT ERROR:", err);
  process.exit(1);
});
