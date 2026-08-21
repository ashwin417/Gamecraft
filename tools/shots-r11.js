const { chromium } = require("playwright");
const path = require("path");

const OUT = "/home/claude/screenshots-r11";

async function main() {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  async function shot(name) {
    await page.screenshot({ path: path.join(OUT, name) });
    console.log("saved", name);
  }

  // ---------- STORY MODE: Floor 5's compact clue panel + new boss art ----------
  await page.goto("http://localhost:8080/index.html");
  await page.waitForSelector("#screen-name:not([aria-hidden='true'])");
  await page.fill("#playerNameInput", "ShotBot");
  await page.click("#btnContinueToBriefing");
  await page.click("#btnBriefingContinue");
  await page.click("#btnSelectStory");
  await page.click("#btnEnterBuilding");
  await page.waitForSelector("#screen-story:not([aria-hidden='true'])");
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    SecurityGuard.prototype.getBounds = function () { return { left: -99999, right: -99998, top: -99999, bottom: -99998 }; };
  });
  await page.click("#storyBtnBegin");
  await page.waitForTimeout(300);

  async function advance(next) {
    await page.click("#storyBtnElevator");
    await page.waitForTimeout(150);
    await page.click(`.lift-unit[data-floor="${next}"]`);
    await page.waitForTimeout(1000);
    await page.click("#storyBtnBegin");
    await page.waitForTimeout(300);
  }
  async function solveTrophyFloor() {
    await page.evaluate(() => { Platformer.__debugForceCollectAll(); Platformer.__debugTeleportToDoor(); });
    await page.waitForTimeout(400);
  }
  async function solveChoiceFloor() {
    await page.evaluate(() => { Platformer.__debugTeleportToCorrectChoice(); });
    await page.waitForTimeout(400);
  }

  await solveTrophyFloor(); // Floor 1
  await advance(2);
  await solveChoiceFloor(); // Floor 2
  await advance(3);
  await solveChoiceFloor(); // Floor 3
  await advance(4);
  await solveTrophyFloor(); // Floor 4
  await advance(5);

  // Floor 5, still unsolved: the persistent clue panel should now be a
  // small top-right card, not a full-width bottom bar blocking the level.
  await page.waitForTimeout(300);
  await shot("01-story-floor5-compact-clue-panel.png");

  // Solve the quiz to wake the boss, then show off the new villain
  // portrait (img/boss-face.png, regenerated from the user's character
  // sheet) on the live boss HUD nameplate.
  await page.evaluate(() => { Platformer.__debugTeleportToCorrectChoice(); });
  await page.waitForTimeout(500);
  await shot("02-story-floor5-new-boss-portrait.png");

  // Take a couple of hits so the "defeated" desaturated variant shows too.
  await page.evaluate(() => {
    Platformer.__debugForceGunHitGuard();
    Platformer.__debugForceGunHitGuard();
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => { Platformer.__debugGiveGun(); Platformer.__debugForceGunHitGuard(); });
  await page.waitForTimeout(200);
  await shot("03-story-floor5-boss-hit-state.png");

  // Fullscreen button, visible in the Story HUD bar.
  await shot("04-story-fullscreen-button.png");

  // ---------- FPS MODE: the new Sentinel sprite ----------
  await page.goto("http://localhost:8080/index.html");
  await page.waitForSelector("#screen-name:not([aria-hidden='true'])");
  await page.fill("#playerNameInput", "ShotBot");
  await page.click("#btnContinueToBriefing");
  await page.click("#btnBriefingContinue");
  await page.click("#btnSelectFps");
  await page.click("#btnEnterLobby");
  await page.waitForSelector("#screen-fps:not([aria-hidden='true'])");
  await page.waitForTimeout(500);

  await shot("05-fps-fullscreen-button.png");

  await page.evaluate(() => { window.Fps.__debugSkipToFloor(9); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.Fps.__debugCollectAllBadges(); window.Fps.__debugWakeBoss(); });
  await page.waitForTimeout(400);
  // Line the camera up on the Sentinel directly so its new sprite is
  // actually in frame, rather than trusting wherever the player happened
  // to be standing when the boss woke up.
  await page.evaluate(() => {
    // Positions here are in grid-cell units (a cell is 1.0), not pixels --
    // stand 1.3 cells back from the boss along the direct line to it,
    // confirmed open (grid value 0) via __debugGridValueAt so the shot
    // doesn't land inside a wall.
    const st = window.Fps.debugPos();
    const boss = st.guards.find((g) => g.isBoss);
    if (!boss) return;
    const dx = boss.x - st.x, dy = boss.y - st.y;
    const dist = Math.hypot(dx, dy);
    const targetAngle = Math.atan2(dy, dx);
    const tx = boss.x - (dx / dist) * 1.3, ty = boss.y - (dy / dist) * 1.3;
    window.Fps.__debugTeleport(tx, ty);
    window.Fps.__debugRotate(targetAngle - st.angle);
  });
  await page.waitForTimeout(200);
  await shot("06-fps-new-sentinel-sprite.png");

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
