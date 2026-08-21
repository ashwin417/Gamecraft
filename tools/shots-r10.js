const { chromium } = require("playwright");
const path = require("path");

const OUT = "/home/claude/screenshots-r10";

async function main() {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  async function shot(name) {
    await page.screenshot({ path: path.join(OUT, name) });
    console.log("saved", name);
  }

  // ---------- STORY MODE ----------
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

  // Floor 1: teleport near the coin + moving platform + minion for a
  // representative bonus-content shot.
  await page.evaluate(() => {
    const st = Platformer.debugState();
    const coin = st.pickupsInfo.find((p) => p.type === "coin");
    if (coin) Platformer.__debugTeleportToPickupType("coin");
  });
  await page.waitForTimeout(200);
  await shot("01-story-floor1-coin-and-platform.png");

  // Shield pickup + minion nearby.
  await page.evaluate(() => { Platformer.__debugGiveShield(); Platformer.__debugTeleportToMinion(0); });
  await page.waitForTimeout(150);
  await shot("02-story-shielded-near-minion.png");

  // Gun-kill on an ordinary guard: jump to Floor 5 (has the gun),
  // give the gun, and force a gun hit on a live guard.
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
  await page.evaluate(() => { Platformer.__debugTeleportToCorrectChoice(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { Platformer.__debugGiveGun(); });
  await page.waitForTimeout(150);
  await page.evaluate(() => { Platformer.__debugForceGunHitGuard(); });
  await page.waitForTimeout(150);
  await shot("03-story-gun-hits-ordinary-guard.png");

  // ---------- FPS MODE ----------
  await page.goto("http://localhost:8080/index.html");
  await page.waitForSelector("#screen-name:not([aria-hidden='true'])");
  await page.fill("#playerNameInput", "ShotBot");
  await page.click("#btnContinueToBriefing");
  await page.click("#btnBriefingContinue");
  await page.click("#btnSelectFps");
  await page.click("#btnEnterLobby");
  await page.waitForSelector("#screen-fps:not([aria-hidden='true'])");
  await page.waitForTimeout(500);

  await page.evaluate(() => { window.Fps.__debugSetHealth(35); });
  await page.waitForTimeout(150);
  await shot("04-fps-health-hud-damaged.png");

  await page.evaluate(() => { window.Fps.__debugGiveKeycard(); });
  await page.waitForTimeout(150);
  await shot("05-fps-keycard-hud.png");

  await page.evaluate(() => { window.Fps.__debugSkipToFloor(9); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.Fps.__debugCollectAllBadges(); window.Fps.__debugWakeBoss(); });
  await page.waitForTimeout(300);
  await shot("06-fps-sentinel-boss-awake.png");

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
