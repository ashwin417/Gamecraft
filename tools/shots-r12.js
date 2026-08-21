/* Screenshot pass for Revision 12 — the three-section overhaul:
   Story Mode's Act structure, FPS Mode's level archetypes, and Arcade
   Mission's roguelite conversion. Uses the same QA hooks the E2E suites
   do to stage each scene deterministically. */
const { chromium } = require("playwright");
const path = require("path");

const OUT = "/home/claude/screenshots-r12";

async function main() {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const shot = async (name) => {
    await page.screenshot({ path: path.join(OUT, name) });
    console.log("saved", name);
  };

  /* ---------------- STORY MODE ---------------- */
  async function enterStory() {
    await page.goto("http://localhost:8080/index.html");
    await page.waitForSelector("#screen-name:not([aria-hidden='true'])");
    await page.fill("#playerNameInput", "ShotBot");
    await page.click("#btnContinueToBriefing");
    await page.click("#btnBriefingContinue");
    await page.click("#btnSelectStory");
    await page.click("#btnEnterBuilding");
    await page.waitForSelector("#screen-story:not([aria-hidden='true'])");
    await page.waitForTimeout(300);
    // Neutralize every fail path so a staged scene isn't ended by a
    // patrol walking into frame mid-screenshot. A spotlight drone fails
    // the run through coneContains(), NOT through getBounds() (its body
    // is harmless — being seen is the failure), so both need patching;
    // the cone still RENDERS, since drawing keys off `disabled`, which
    // is left alone.
    await page.evaluate(() => {
      SecurityGuard.prototype.getBounds = function () {
        return { left: -99999, right: -99998, top: -99999, bottom: -99998 };
      };
      SpotlightDrone.prototype.coneContains = function () { return false; };
    });
  }
  async function advance(n) {
    await page.click("#storyBtnElevator");
    await page.waitForTimeout(150);
    await page.click(`.lift-unit[data-floor="${n}"]`);
    await page.waitForTimeout(1000);
  }
  async function begin() {
    await page.click("#storyBtnBegin");
    await page.waitForTimeout(350);
  }
  async function solveTrophy() {
    await page.evaluate(() => Platformer.__debugForceCollectAll());
    await page.waitForTimeout(220);
    await page.evaluate(() => {
      const s = Platformer.debugState();
      if (s && s.boss && !s.boss.defeated) Platformer.__debugForceDefeatBoss();
    });
    await page.waitForTimeout(150);
    await page.evaluate(() => Platformer.__debugTeleportToDoor());
    await page.waitForTimeout(420);
  }
  async function solveChoice() {
    await page.evaluate(() => Platformer.__debugTeleportToCorrectChoice());
    await page.waitForTimeout(320);
    const s = await page.evaluate(() => Platformer.debugState());
    if (s.boss && !s.boss.defeated) {
      await page.evaluate(() => Platformer.__debugForceDefeatBoss());
      await page.evaluate(() => Platformer.__debugTeleportToDoor());
    }
    await page.waitForTimeout(420);
  }

  await enterStory();
  // Act 1 opener on the Floor 1 briefing.
  await shot("01-story-act1-briefing.png");
  await begin();
  // Act 1: hack the light switch -> lights-out window.
  await page.evaluate(() => Platformer.__debugHackLightSwitch());
  await page.waitForTimeout(250);
  await shot("02-story-act1-lights-out.png");

  await solveTrophy();
  await advance(2); await begin(); await solveChoice();
  await advance(3); await begin(); await solveChoice();

  // Act 2 opener + its mechanics on Floor 4.
  await advance(4);
  await shot("03-story-act2-briefing.png");
  await begin();
  // Frame the spotlight drone and the laser grid in one shot. Stand
  // beside the laser (on the right-hand ground run) rather than under
  // the drone — the drone hangs over the raised middle gantry, and the
  // ground beneath it is a pit, so parking the player there just drops
  // them out of the level before the screenshot lands.
  await page.evaluate(() => {
    Platformer.__debugTeleportToLaser();
    const lg = Platformer.debugState().lasersInfo[0];
    if (lg) Platformer.__debugSetPlayerX(lg.x + 80);
    Platformer.__debugSetLasers(true); // lit, so the beam is actually visible
  });
  await page.waitForTimeout(250);
  await shot("04-story-act2-drone-and-laser.png");

  await solveTrophy();
  await advance(5); await begin(); await solveChoice();
  await advance(6); await begin(); await solveTrophy();
  await advance(7); await begin(); await solveChoice();

  // Act 3 opener + elite guards / vents on Floor 8.
  await advance(8);
  await shot("05-story-act3-briefing.png");
  await begin();
  await page.evaluate(() => Platformer.__debugStunElite());
  await page.waitForTimeout(200);
  await shot("06-story-act3-elite-guard.png");
  await solveChoice();

  await advance(9); await begin(); await solveTrophy();

  // Floor 10: the multi-phase finale, mid-fight and mid-recompile.
  await advance(10); await begin();
  await page.evaluate(() => Platformer.__debugForceCollectAll());
  await page.waitForTimeout(300);
  await page.evaluate(() => { Platformer.__debugHitBossOnce(); Platformer.__debugHitBossOnce(); });
  await page.waitForTimeout(250);
  await shot("07-story-final-boss-phase-shift.png");

  /* ---------------- FPS MODE ---------------- */
  async function enterFps() {
    await page.goto("http://localhost:8080/index.html");
    await page.waitForSelector("#screen-name:not([aria-hidden='true'])");
    await page.fill("#playerNameInput", "ShotBot");
    await page.click("#btnContinueToBriefing");
    await page.click("#btnBriefingContinue");
    await page.click("#btnSelectFps");
    await page.click("#btnEnterLobby");
    await page.waitForSelector("#screen-fps:not([aria-hidden='true'])");
    await page.waitForTimeout(500);
  }

  await enterFps();
  await shot("08-fps-tunnels-floor1.png");

  // Datacenter: stand in a sniper's lock so the warning UI is live.
  await page.evaluate(() => window.Fps.__debugSkipToFloor(3));
  await page.waitForTimeout(320);
  await page.evaluate(() => window.Fps.__debugTeleportIntoSniperView());
  await page.waitForTimeout(700);
  await shot("09-fps-datacenter-sniper-lock.png");

  // Rooftop: extraction timer + a wave + barrels in view.
  await page.evaluate(() => window.Fps.__debugSkipToFloor(7));
  await page.waitForTimeout(320);
  await page.evaluate(() => { window.Fps.__debugSpawnWave(); window.Fps.__debugSpawnWave(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    // Face the nearest un-exploded barrel so one is actually in frame.
    const st = window.Fps.debugPos();
    const b = st.barrels.find((x) => !x.exploded);
    if (b) window.Fps.__debugRotate(Math.atan2(b.y - st.y, b.x - st.x) - st.angle);
  });
  await page.waitForTimeout(250);
  await shot("10-fps-rooftop-extraction.png");

  /* ---------------- ARCADE ROGUELITE ---------------- */
  await page.goto("http://localhost:8080/index.html");
  await page.waitForSelector("#screen-name:not([aria-hidden='true'])");
  await page.fill("#playerNameInput", "ShotBot");
  await page.click("#btnContinueToBriefing");
  await page.click("#btnBriefingContinue");
  await page.click("#btnSelectArcade");
  await page.click("#btnStartGame");
  await page.waitForTimeout(700);
  await shot("11-arcade-roguelite-hud.png");

  // Clear three floors to trigger the perk draft.
  await page.evaluate(() => {
    window.Arcade.__debugClearFloor();
    window.Arcade.__debugClearFloor();
    window.Arcade.__debugClearFloor();
  });
  await page.waitForTimeout(400);
  await shot("12-arcade-perk-draft.png");

  // Take a perk, fire an EMP, and show the escalated floor 4 HUD.
  await page.evaluate(() => {
    const s = window.Arcade.debugState();
    window.Arcade.__debugChoosePerk(s.pendingPerks[0]);
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => window.Arcade.__debugEmp(true));
  await page.waitForTimeout(150);
  await shot("13-arcade-emp-and-perk.png");

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
