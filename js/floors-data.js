/* ============================================================
   floors-data.js
   STORY MODE content: "TEN FLOORS OF INDIGO TOWER"

   All narrative + puzzle content for the 10-floor Dave-style
   campaign lives here, kept separate from the engines (platformer.js
   drives every floor's actual gameplay; story.js drives the
   pre/post-level screens — briefing, riddle, elevator, terminal) so
   level design can be tuned without touching game logic.

   Every floor is `type: "platform"` — a real side-scrolling
   run/jump/climb maze, with actively-hunting Security Guards
   throughout (see guards.js) — but comes in one of two `mode`s:
     - "trophy" (the default; floors 1, 4, 6, 9, and the Server Room):
       collect every trophy, then reach the door.
     - "choice" (floors 2, 3, 5, 7, 8 — the former quiz/treasure
       floors): the maze has no trophies/door. Instead it has a
       handful of lettered terminal markers (`platform.choices`,
       index-aligned with `quiz.options` or `treasure.items`); the
       player reads the question/clue + lettered options on the
       pre-level briefing, then has to navigate to and step on the
       one correct terminal. Any wrong terminal ends the mission
       instantly, same as a guard catch.
   Tile grid uses column/row coordinates; tileSize is defined in
   platformer.js (TILE) and shared by both files. `motif` picks a
   small vector-drawn background icon (see platformer.js's
   drawFloorMotif) so each floor's tileset reads as a different room,
   not just a re-tinted repeat.

   Platform level authoring rule: every gap is <=3 tiles wide and
   every direct step-up is <=2 tiles tall, which is comfortably
   inside the jump arc produced by platformer.js's gravity/jump
   constants (documented there) — so every level is legitimately
   completable by a real player, not just theoretically.

   SECURE SERVER ROOM: the floor that actually ends the mission when
   cleared is always Floor 10 (see serverRoomFloorTemplate()), assembled
   onto the fixed 10-floor run by startNewStoryRun(). Reaching it
   doesn't win outright, either: every floor cleared along the way
   hands over one letter of the server's access code (PASSWORD_WORD,
   below), and the Server Room itself is a terminal where that code
   has to be typed in correctly (see story.js's showTerminalPanel) to
   actually secure it.

   FLOOR 5 BOSS: Legal & Compliance is a mid-run gauntlet, not the
   ending. Its `boss` field (see below) spawns a tougher, named
   enemy — dormant until the floor's data-privacy quiz is answered
   correctly — that has to be stunned three times (not just once, like
   an ordinary guard) before the floor's exit door unlocks. See
   platformer.js's activateBoss()/doorUnlocked() and guards.js's Boss
   class for the mechanics.
   ============================================================ */

/** Shared letter labels for "choice" mode floors (the former quiz/
 *  treasure floors) — maps option/item array index to the letter shown
 *  both on the pre-level briefing and on the in-maze terminal markers.
 *  Defined once, globally, since floors-data.js/story.js/platformer.js are
 *  all classic scripts sharing one lexical scope. */
const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F"];

/** The building directory shown permanently on the elevator screen.
 *  Static on purpose (see note above) — doesn't reveal which floor is
 *  this run's actual Secure Server Room. */
const FLOOR_DIRECTORY = [
  { num: 1, name: "Main Lobby & Badge Security" },
  { num: 2, name: "Human Resources & Employee Records" },
  { num: 3, name: "Finance & Accounts Payable" },
  { num: 4, name: "IT Helpdesk & Support" },
  { num: 5, name: "Legal & Compliance" },
  { num: 6, name: "Network Operations Center (NOC)" },
  { num: 7, name: "Executive Suite" },
  { num: 8, name: "Cloud & R&D Lab" },
  { num: 9, name: "Data Center Corridor" },
  { num: 10, name: "Secure Server Room" },
];

/**
 * FLOORS[n] (1-indexed via array position n-1) describes everything about
 * floor n: its narrative beats, its challenge, and the riddle revealed once
 * the challenge is solved, pointing to the next correct floor. This is the
 * FULL, fixed 10-floor content library; startNewStoryRun() below is what
 * actually assembles a given run's floor sequence from it (see the
 * SECURE SERVER ROOM note above) — story.js / platformer.js should
 * always go through floorByNum(), never read this array directly.
 */
const FLOORS = [
  /* ---------------- FLOOR 1 — Main Lobby (tutorial platform level) ---------------- */
  {
    num: 1,
    name: "Main Lobby & Badge Security",
    type: "platform",
    tint: "#0f2318",
    motif: "badge",
    intro: "The lobby is quiet except for the hum of badge scanners. Run with the Arrow Keys or A/D, jump with Up/W/Space. Grab every trophy — the service elevator door won't open until you do.",
    dangerLabel: "The guard's flashlight catches you crossing the lobby floor.",
    storyNote: "02:14 AM. Badge scanners hum in the dark lobby — the intrusion started here, when someone walked in without a badge at all.",
    platform: {
      width: 20,
      groundRow: 9,
      platforms: [
        { col: 0, row: 9, len: 8 },
        { col: 10, row: 9, len: 10 },
        { col: 13, row: 8, len: 3 },
      ],
      ladders: [],
      trophies: [{ col: 2, row: 8 }, { col: 5, row: 8 }, { col: 14, row: 7 }],
      guards: [{ col: 18, row: 9, rangeTiles: 1, speed: 70 }],
      // ACT 1 (floors 1-3) — basic stealth. The tutorial's one light
      // switch sits on the far side of the pit, in clear sight of the
      // only guard on the floor, so the mechanic is introduced exactly
      // where it's useful without being required to finish the level.
      lightSwitches: [{ col: 11, row: 9 }],
      door: { col: 19, row: 8 },
      playerStart: { col: 1, row: 9 },
    },
    riddle: "Somewhere in this tower, someone still keeps a password on a sticky note and reuses “Summer2024” for everything. Find the department that manages the people.",
    solveScore: 175,
  },

  /* ---------------- FLOOR 2 — Human Resources (maze, choice mode) ---------------- */
  {
    num: 2,
    name: "Human Resources & Employee Records",
    type: "platform",
    mode: "choice",
    tint: "#141a33",
    motif: "folder",
    intro: "Rows of empty cubicles and a whiteboard covered in onboarding checklists. A terminal blinks with an open HR training module — cross the floor and log the right answer in before a guard clocks you.",
    dangerLabel: "Wrong answer logged. HR's compliance bot flags your badge and calls it in.",
    storyNote: "HR's training module is still open on someone else's terminal. They didn't log out. They didn't finish the module either.",
    platform: {
      width: 24,
      groundRow: 9,
      platforms: [
        { col: 0, row: 9, len: 24 },
        { col: 3, row: 6, len: 3 },
        { col: 8, row: 4, len: 3 },
        { col: 13, row: 6, len: 3 },
        { col: 18, row: 4, len: 3 },
      ],
      ladders: [
        { col: 2, rowTop: 6, rowBottom: 9 },
        { col: 7, rowTop: 4, rowBottom: 9 },
        { col: 12, rowTop: 6, rowBottom: 9 },
        { col: 17, rowTop: 4, rowBottom: 9 },
      ],
      choices: [
        { col: 4, row: 5 },
        { col: 9, row: 3 },
        { col: 14, row: 5 },
        { col: 19, row: 3 },
      ],
      guards: [
        { col: 9, row: 9, rangeTiles: 4, speed: 95 },
        { col: 15, row: 9, rangeTiles: 4, speed: 105 },
      ],
      // ACT 1 — two switches, one per half of the floor, so the darkness
      // window can be spent on either patrol rather than only the first.
      lightSwitches: [{ col: 6, row: 9 }, { col: 21, row: 9 }],
      playerStart: { col: 1, row: 9 },
    },
    quiz: {
      question: "Which of these is the strongest sign of a phishing email?",
      options: [
        "It was sent by a coworker you recognize",
        "It urgently pressures you to click a link and enter your password",
        "It includes the company logo in the header",
        "It arrived during normal work hours",
      ],
      correctIndex: 1,
      explain: "Urgency + credential requests is the classic phishing combo — real IT requests almost never work that way.",
    },
    riddle: "Follow the money. This department signs off on every invoice — and one of today's invoices shouldn't exist.",
    solveScore: 200,
  },

  /* ---------------- FLOOR 3 — Finance (maze, choice mode) ---------------- */
  {
    num: 3,
    name: "Finance & Accounts Payable",
    type: "platform",
    mode: "choice",
    tint: "#1a1430",
    motif: "dollar",
    intro: "Stacks of invoices cover every desk. Payroll is due tomorrow and nobody has noticed the one file that doesn't belong — find the right filing terminal before Finance's floor monitors find you.",
    dangerLabel: "Wrong file selected — Finance's fraud-monitoring system trips silently, then loudly.",
    storyNote: "Payroll runs tomorrow. One invoice on this floor was never approved — and whoever filed it knew exactly which stack to bury it in.",
    platform: {
      width: 33,
      groundRow: 9,
      platforms: [
        { col: 0, row: 9, len: 33 },
        { col: 3, row: 6, len: 3 },
        { col: 8, row: 4, len: 3 },
        { col: 13, row: 6, len: 3 },
        { col: 18, row: 4, len: 3 },
        { col: 23, row: 6, len: 3 },
        { col: 28, row: 4, len: 3 },
      ],
      ladders: [
        { col: 2, rowTop: 6, rowBottom: 9 },
        { col: 7, rowTop: 4, rowBottom: 9 },
        { col: 12, rowTop: 6, rowBottom: 9 },
        { col: 17, rowTop: 4, rowBottom: 9 },
        { col: 22, rowTop: 6, rowBottom: 9 },
        { col: 27, rowTop: 4, rowBottom: 9 },
      ],
      choices: [
        { col: 4, row: 5 },
        { col: 9, row: 3 },
        { col: 14, row: 5 },
        { col: 19, row: 3 },
        { col: 24, row: 5 },
        { col: 29, row: 3 },
      ],
      // ACT 1's last floor — three patrols, three switches. This is the
      // "you've got the tool, now budget it" beat before Act 2 starts
      // introducing hazards a dark room doesn't solve.
      lightSwitches: [{ col: 6, row: 9 }, { col: 20, row: 9 }, { col: 31, row: 9 }],
      guards: [
        { col: 9, row: 9, rangeTiles: 4, speed: 95 },
        { col: 16, row: 9, rangeTiles: 4, speed: 100 },
        { col: 26, row: 9, rangeTiles: 4, speed: 105 },
      ],
      playerStart: { col: 1, row: 9 },
    },
    treasure: {
      clue: "Find the invoice billed to a vendor that was never onboarded in our approved vendor list: “Nimbus Data Solutions.”",
      items: [
        { id: "inv1", label: "Invoice — Skyline Office Supplies", isTarget: false },
        { id: "inv2", label: "Invoice — Nimbus Data Solutions", isTarget: true },
        { id: "inv3", label: "Invoice — Meridian Facilities Co.", isTarget: false },
        { id: "inv4", label: "Invoice — Metro Catering Group", isTarget: false },
        { id: "inv5", label: "Invoice — BlueLine Logistics", isTarget: false },
        { id: "inv6", label: "Invoice — Alpine Cleaning Services", isTarget: false },
      ],
    },
    riddle: "When your laptop breaks or your access is locked, you call this floor. Today, they need help of their own.",
    solveScore: 225,
  },

  /* ---------------- FLOOR 4 — IT Helpdesk (platform level, introduces ladders) ---------------- */
  {
    num: 4,
    name: "IT Helpdesk & Support",
    type: "platform",
    tint: "#0f2233",
    motif: "gear",
    intro: "Cubicle partitions form a tight grid of support desks. A tech patrols a walkway above an open server pit — climb the ladder to reach it, and don't look down.",
    dangerLabel: "A helpdesk tech spots you on the walkway and hits the panic button.",
    storyNote: "The helpdesk ticket queue is frozen mid-scroll. Someone was troubleshooting a 'network issue' that wasn't really a network issue.",
    platform: {
      width: 24,
      groundRow: 9,
      platforms: [
        { col: 0, row: 9, len: 9 },
        { col: 9, row: 5, len: 9 },
        { col: 19, row: 9, len: 5 },
      ],
      ladders: [
        { col: 8, rowTop: 5, rowBottom: 9 },
        { col: 18, rowTop: 5, rowBottom: 9 },
      ],
      trophies: [{ col: 2, row: 8 }, { col: 12, row: 4 }, { col: 15, row: 4 }, { col: 21, row: 8 }],
      // ACT 2 (floors 4-7) — the Server Farms. Three new pressures, each
      // introduced one floor at a time so the player learns them
      // separately before they start overlapping:
      //   - a SpotlightDrone sweeping the upper gantry (a cone that
      //     catches you by COLUMN, so hiding on the same walkway no
      //     longer helps),
      //   - a TrackerHound on the ground run (spots further, chases much
      //     longer, and won't be out-run),
      //   - a timed laser grid on the door approach (a rhythm to read
      //     rather than an enemy to dodge).
      guards: [
        { col: 13, row: 5, rangeTiles: 4, speed: 90 },
        { kind: "drone", col: 12, row: 2, rangeTiles: 3, speed: 72, coneLength: 3.2 },
        { kind: "hound", col: 4, row: 9, rangeTiles: 3, speed: 92 },
      ],
      lasers: [
        { col: 20, rowTop: 6, rowBottom: 8, cycle: 2.6, onRatio: 0.45 },
      ],
      door: { col: 23, row: 8 },
      playerStart: { col: 1, row: 9 },
    },
    riddle: "The floor that reads every contract twice and never signs anything without checking the fine print on data privacy.",
    solveScore: 250,
  },

  /* ---------------- FLOOR 5 — Legal & Compliance (maze, choice mode) ---------------- */
  {
    num: 5,
    name: "Legal & Compliance",
    type: "platform",
    mode: "choice",
    tint: "#1a0f1f",
    motif: "scale",
    intro: "Filing cabinets labeled by regulation. A compliance officer's monitor is still logged in to the data-retention policy dashboard — reach the right terminal and log the correct policy before Legal's own security catches on. Fair warning: logging the correct policy doesn't clear this floor by itself. It wakes The Auditor — Legal's own head of security, and the toughest thing standing between you and Floor 6. An ordinary stun won't keep it down; it takes three solid hits before it stays down, and it moves faster than anything you've faced so far. One of the guards on this floor is carrying a sidearm — stun it and grab what it drops for a second, longer-range way to land hits on The Auditor.",
    dangerLabel: "Incorrect policy answer trips Legal's audit trail — security is already on the way up.",
    storyNote: "A data-retention dashboard, still logged in. Legal never leaves a session open — not unless they left in a hurry.",
    platform: {
      width: 24,
      groundRow: 9,
      platforms: [
        { col: 0, row: 9, len: 24 },
        { col: 3, row: 4, len: 3 },
        { col: 8, row: 6, len: 3 },
        { col: 13, row: 4, len: 3 },
        { col: 18, row: 6, len: 3 },
      ],
      ladders: [
        { col: 2, rowTop: 4, rowBottom: 9 },
        { col: 7, rowTop: 6, rowBottom: 9 },
        { col: 12, rowTop: 4, rowBottom: 9 },
        { col: 17, rowTop: 6, rowBottom: 9 },
      ],
      choices: [
        { col: 4, row: 3 },
        { col: 9, row: 5 },
        { col: 14, row: 3 },
        { col: 19, row: 5 },
      ],
      guards: [
        { col: 9, row: 9, rangeTiles: 3, speed: 100 },
        // Carries the sidearm this floor's boss.gunHint (below) references —
        // stunning this specific guard drops the gun pickup alongside its
        // usual charge pickup (see platformer.js's tryFireStun()).
        { col: 15, row: 9, rangeTiles: 5, speed: 115, carriesGun: true },
        // ACT 2 — the boss gauntlet floor now also has to be crossed
        // under a sweeping cone. Deliberately placed over the middle of
        // the ground run rather than over a terminal, so it pressures
        // the approach without making any single answer unreachable.
        { kind: "drone", col: 11, row: 1, rangeTiles: 4, speed: 84, coneLength: 6.5 },
      ],
      lasers: [
        { col: 6, rowTop: 7, rowBottom: 8, cycle: 3.0, onRatio: 0.4 },
        { col: 21, rowTop: 7, rowBottom: 8, cycle: 3.0, onRatio: 0.4, phase: 0.5 },
      ],
      playerStart: { col: 1, row: 9 },
    },
    quiz: {
      question: "Under data-privacy best practice, what should you do with a customer's personal data once it's no longer needed?",
      options: [
        "Keep it indefinitely in case it's useful later",
        "Securely delete or anonymize it per retention policy",
        "Forward it to a personal email as a backup",
        "Post it to the internal wiki for reference",
      ],
      correctIndex: 1,
      explain: "Data minimization is a core privacy principle — don't keep what you no longer have a lawful reason to hold.",
    },
    // Floor 5 is a mid-run boss gauntlet, not the mission's end (see the
    // header note above) — logging the correct policy above doesn't clear
    // the floor by itself, it wakes this boss. Dormant (not even spawned)
    // until the quiz is solved; see platformer.js's activateBoss(). `door`
    // sits past the last choice terminal in the same open ground-level run
    // the maze already has at col 21-23, so no layout change was needed to
    // fit the arena in.
    boss: {
      name: "The Auditor",
      col: 21,
      row: 9,
      hp: 3,
      speed: 135,
      door: { col: 23, row: 8 },
      // Shown by story.js's challengeHint() alongside the standard boss
      // warning — see platformer.js's carriesGun/hasGun handling.
      gunHint: "One of the guards on this floor is carrying a sidearm — stun it and grab the drop for a longer-range, unlimited-ammo shot you can use against The Auditor too, on top of your ordinary stun charges.",
    },
    riddle: "Rows of humming racks, blinking lights, and eyes on every network packet in the building, day and night.",
    solveScore: 400,
  },

  /* ---------------- FLOOR 6 — NOC (platform level) ---------------- */
  {
    num: 6,
    name: "Network Operations Center (NOC)",
    type: "platform",
    tint: "#0f2a1a",
    motif: "server",
    intro: "Server aisles stretch wall to wall, cold air roaring through the racks. Two NOC guards patrol the ground floor and the catwalk above it.",
    dangerLabel: "A NOC guard catches movement between the racks and locks down the floor.",
    storyNote: "Every status board in the NOC reads green. That's the problem — nothing this quiet is actually this quiet.",
    platform: {
      width: 28,
      groundRow: 9,
      platforms: [
        { col: 0, row: 9, len: 7 },
        { col: 9, row: 9, len: 5 },
        { col: 14, row: 5, len: 7 },
        { col: 22, row: 9, len: 6 },
      ],
      ladders: [
        { col: 13, rowTop: 5, rowBottom: 9 },
        { col: 21, rowTop: 5, rowBottom: 9 },
      ],
      trophies: [{ col: 3, row: 8 }, { col: 11, row: 8 }, { col: 17, row: 4 }, { col: 24, row: 8 }],
      guards: [
        { col: 11, row: 9, rangeTiles: 2, speed: 115 },
        { col: 17, row: 5, rangeTiles: 4, speed: 125 },
        // ACT 2 — the NOC gantry is watched from above and hunted from
        // the far end, so both halves of the floor carry their own kind
        // of pressure.
        { kind: "drone", col: 17, row: 2, rangeTiles: 2, speed: 90, coneLength: 2.6 },
        { kind: "hound", col: 24, row: 9, rangeTiles: 2, speed: 112 },
      ],
      lasers: [
        { col: 10, rowTop: 6, rowBottom: 8, cycle: 2.4, onRatio: 0.42 },
      ],
      door: { col: 27, row: 8 },
      playerStart: { col: 1, row: 9 },
    },
    riddle: "Corner office, city view, and a password taped somewhere the boss checks every morning before coffee.",
    solveScore: 300,
  },

  /* ---------------- FLOOR 7 — Executive Suite (maze, choice mode) ---------------- */
  {
    num: 7,
    name: "Executive Suite",
    type: "platform",
    mode: "choice",
    tint: "#1a1430",
    motif: "window",
    intro: "A corner office with a skyline view. The desk is spotless except for a scatter of everyday objects — the exec's private security detail patrols the floor, faster than anything you've faced so far.",
    dangerLabel: "Wrong object touched — you've knocked over the desk phone. Security is already listening.",
    storyNote: "The exec suite still smells like burnt coffee. Whoever was here left fast, and left something behind.",
    platform: {
      width: 33,
      groundRow: 9,
      platforms: [
        { col: 0, row: 9, len: 33 },
        { col: 3, row: 4, len: 3 },
        { col: 8, row: 6, len: 3 },
        { col: 13, row: 4, len: 3 },
        { col: 18, row: 6, len: 3 },
        { col: 23, row: 4, len: 3 },
        { col: 28, row: 6, len: 3 },
      ],
      ladders: [
        { col: 2, rowTop: 4, rowBottom: 9 },
        { col: 7, rowTop: 6, rowBottom: 9 },
        { col: 12, rowTop: 4, rowBottom: 9 },
        { col: 17, rowTop: 6, rowBottom: 9 },
        { col: 22, rowTop: 4, rowBottom: 9 },
        { col: 27, rowTop: 6, rowBottom: 9 },
      ],
      choices: [
        { col: 4, row: 3 },
        { col: 9, row: 5 },
        { col: 14, row: 3 },
        { col: 19, row: 5 },
        { col: 24, row: 3 },
        { col: 29, row: 5 },
      ],
      // ACT 2's last floor — all three hazard types at once, on the
      // widest layout in the game. This is the difficulty peak of the
      // act, right before Act 3 changes the rules again with armored
      // guards and vents.
      lasers: [
        { col: 11, rowTop: 7, rowBottom: 8, cycle: 2.2, onRatio: 0.45 },
        { col: 21, rowTop: 7, rowBottom: 8, cycle: 2.2, onRatio: 0.45, phase: 0.5 },
      ],
      guards: [
        { kind: "drone", col: 16, row: 1, rangeTiles: 5, speed: 96, coneLength: 7 },
        { kind: "hound", col: 30, row: 9, rangeTiles: 2, speed: 128 },
        { col: 9, row: 9, rangeTiles: 4, speed: 115 },
        { col: 16, row: 9, rangeTiles: 4, speed: 125 },
        { col: 26, row: 9, rangeTiles: 4, speed: 138 },
      ],
      playerStart: { col: 1, row: 9 },
    },
    treasure: {
      clue: "The exec taped their master password to something they check every single morning before their first cup of coffee.",
      items: [
        { id: "obj1", label: "Framed family photo", isTarget: false },
        { id: "obj2", label: "Potted desk plant", isTarget: false },
        { id: "obj3", label: "Sticky note on the monitor", isTarget: true },
        { id: "obj4", label: "Stack of business cards", isTarget: false },
        { id: "obj5", label: "Desk phone", isTarget: false },
        { id: "obj6", label: "Locked bottom drawer", isTarget: false },
      ],
    },
    riddle: "Where the newest ideas live in someone else's servers — encrypted, backed up, and (hopefully) access-controlled.",
    solveScore: 325,
  },

  /* ---------------- FLOOR 8 — Cloud & R&D Lab (maze, choice mode) ---------------- */
  {
    num: 8,
    name: "Cloud & R&D Lab",
    type: "platform",
    mode: "choice",
    tint: "#0f2233",
    motif: "cloud",
    intro: "Whiteboards full of architecture diagrams. A dashboard shows a storage bucket configuration waiting for review — the lab's guards are the fastest you've seen in the tower.",
    dangerLabel: "Wrong configuration submitted — the lab's security scanner flags the change instantly.",
    storyNote: "A storage bucket configuration sits half-reviewed. One more click would have made it public to the entire internet.",
    platform: {
      width: 24,
      groundRow: 9,
      platforms: [
        { col: 0, row: 9, len: 24 },
        { col: 3, row: 6, len: 3 },
        { col: 8, row: 4, len: 3 },
        { col: 13, row: 6, len: 3 },
        { col: 18, row: 4, len: 3 },
      ],
      ladders: [
        { col: 2, rowTop: 6, rowBottom: 9 },
        { col: 7, rowTop: 4, rowBottom: 9 },
        { col: 12, rowTop: 6, rowBottom: 9 },
        { col: 17, rowTop: 4, rowBottom: 9 },
      ],
      choices: [
        { col: 4, row: 5 },
        { col: 9, row: 3 },
        { col: 14, row: 5 },
        { col: 19, row: 3 },
      ],
      // ACT 3 (floors 8-10) — Executive Suites. Two changes to the rules:
      //   - ELITE guards are armored: the first stun only staggers them,
      //     so the stun-and-slip-past loop now costs two charges per
      //     guard instead of one (or the gun, if the player has it).
      //   - VENTS offer a route that skips a held corridor entirely, for
      //     a player who'd rather not spend the charges at all.
      guards: [
        { kind: "elite", col: 9, row: 9, rangeTiles: 5, speed: 138, stunsToFreeze: 2 },
        { col: 15, row: 9, rangeTiles: 5, speed: 144 },
      ],
      vents: [
        { from: { col: 6, row: 9 }, to: { col: 16, row: 9 }, twoWay: true },
      ],
      playerStart: { col: 1, row: 9 },
    },
    quiz: {
      question: "What's the best way to protect data stored in the cloud?",
      options: [
        "Reuse the same password across every cloud service",
        "Leave storage buckets public for easier team access",
        "Encrypt data at rest and enforce strict access controls",
        "Disable logging to save on storage costs",
      ],
      correctIndex: 2,
      explain: "Encryption plus least-privilege access control is the baseline for protecting cloud-hosted data.",
    },
    riddle: "Colder than every other floor, guarded tighter than any other floor, and closer to the truth than any other floor.",
    solveScore: 350,
  },

  /* ---------------- FLOOR 9 — Data Center Corridor (hardest platform level) ---------------- */
  {
    num: 9,
    name: "Data Center Corridor",
    type: "platform",
    tint: "#0f2a1a",
    motif: "circuit",
    intro: "The tightest security on the tower. Three guards move fast between the aisles, the gaps are wider, and one mistake here ends the mission.",
    dangerLabel: "Caught in the corridor. The data center goes into full lockdown.",
    storyNote: "Every rack down this corridor hums the same tone — except one, a half-step off, working harder than it should be.",
    platform: {
      width: 32,
      groundRow: 9,
      platforms: [
        { col: 0, row: 9, len: 5 },
        { col: 8, row: 9, len: 4 },
        { col: 12, row: 5, len: 5 },
        { col: 18, row: 9, len: 3 },
        { col: 23, row: 9, len: 9 },
      ],
      ladders: [
        { col: 11, rowTop: 5, rowBottom: 9 },
        { col: 17, rowTop: 5, rowBottom: 9 },
      ],
      trophies: [{ col: 2, row: 8 }, { col: 9, row: 8 }, { col: 14, row: 4 }, { col: 25, row: 8 }, { col: 28, row: 8 }],
      // ACT 3 — the Data Center corridor is the hardest patrol layout in
      // the game, and now two of its three guards are armored. The vent
      // spans the raised middle section, so a player who reads the floor
      // can skip the worst of it on the way back with the trophies.
      guards: [
        { col: 9, row: 9, rangeTiles: 1, speed: 138 },
        { kind: "elite", col: 14, row: 5, rangeTiles: 2, speed: 150, stunsToFreeze: 2 },
        { kind: "elite", col: 26, row: 9, rangeTiles: 3, speed: 161, stunsToFreeze: 2 },
      ],
      vents: [
        { from: { col: 9, row: 9 }, to: { col: 19, row: 9 }, twoWay: true },
      ],
      door: { col: 31, row: 8 },
      playerStart: { col: 1, row: 9 },
    },
    riddle: "One floor left. Behind a reinforced door sits the rack that started it all. Finish what you came here to do.",
    solveScore: 400,
  },

];

/** Every non-final floor hands the player one letter of the Server Room's
 *  access code the moment it's cleared (revealed on the post-solve "Floor
 *  Cleared" panel, see story.js's showRiddlePanel) — a hidden clue baked
 *  into finishing that floor rather than a separate missable pickup. Since
 *  the Secure Server Room's floor number is randomized per run (see
 *  startNewStoryRun() below), the number of letters actually collected —
 *  and so the password length — varies run to run too: it's always exactly
 *  "FIREWALLS" truncated to (this run's Server Room floor number - 1)
 *  characters. Assigned by array position so every floor always yields the
 *  same letter when it appears, regardless of which run it's part of. */
const PASSWORD_WORD = "FIREWALLS";
FLOORS.forEach((f, i) => { f.passwordLetter = PASSWORD_WORD[i]; });

/**
 * The Secure Server Room level — the floor that actually ends the mission
 * when cleared. Content is entirely num-agnostic (no hardcoded "Floor 10"
 * references) so it can be dropped onto whichever floor number
 * startNewStoryRun() rolls for this playthrough; only `num` changes.
 */
function serverRoomFloorTemplate(num) {
  return {
    num,
    name: "Secure Server Room",
    type: "platform",
    tint: "#0f2a1a",
    motif: "shield",
    intro: "This is it. Not the department the directory promised — the compromised rack itself, behind a reinforced door, guarded by the tower's most alert security detail. Collect every trophy and the thing running this intrusion will finally show itself. Bring it down in all three of its phases, then reach the terminal.",
    dangerLabel: "So close. The final guard sounds the last alarm of the mission.",
    storyNote: "This is it. Not the department the directory promised — the compromised rack itself, humming behind a door that shouldn't be this well-guarded. Something in the rack is still writing to disk.",
    isFinal: true,
    platform: {
      width: 26,
      groundRow: 9,
      platforms: [
        { col: 0, row: 9, len: 7 },
        { col: 7, row: 5, len: 3 },
        { col: 12, row: 5, len: 2 },
        { col: 15, row: 9, len: 2 },
        { col: 19, row: 9, len: 7 },
      ],
      ladders: [
        { col: 6, rowTop: 5, rowBottom: 9 },
        { col: 14, rowTop: 5, rowBottom: 9 },
      ],
      trophies: [{ col: 2, row: 8 }, { col: 8, row: 4 }, { col: 13, row: 4 }, { col: 21, row: 8 }, { col: 24, row: 8 }],
      guards: [
        { kind: "elite", col: 8, row: 5, rangeTiles: 1, speed: 150, stunsToFreeze: 2 },
        { kind: "elite", col: 20, row: 9, rangeTiles: 3, speed: 161, stunsToFreeze: 2 },
      ],
      vents: [
        { from: { col: 4, row: 9 }, to: { col: 20, row: 9 }, twoWay: true },
      ],
      door: { col: 25, row: 8 },
      playerStart: { col: 1, row: 9 },
    },
    /* ---- ACT 3 finale: the multi-phase boss ----
       Unlike Floor 5's Auditor (a single-phase Boss woken by a correct
       quiz answer), this is a FinalBoss — the `phases` field is what
       promotes it (see platformer.js's buildLevel()). It's woken by
       collecting the last trophy on this floor, and it gates the door
       that leads to the server password terminal: trophies alone no
       longer open it. Three phases x two hits = six total, with a
       brief invulnerable "recompiling" window between each phase that
       forces the player to disengage and re-approach rather than
       standing still and spamming the stun key. */
    boss: {
      name: "The Architect",
      col: 22,
      row: 9,
      rangeTiles: 3,
      speed: 152,
      phases: 3,
      hitsPerPhase: 2,
      gunHint: "Whatever is in that rack has been rewriting itself all night. Expect it to come back harder after every hit you land — and to be untouchable for a beat while it does.",
    },
    solveScore: 500,
  };
}

/* ---------------- Per-run assembly ---------------- */

/** The floor list the CURRENT run actually plays through — set by
 *  startNewStoryRun(), read by floorByNum(). Defaults to a full 1-10 run
 *  (server room at 10) so floorByNum() is never broken if something reads
 *  it before a run has explicitly started. */
let activeRunFloors = FLOORS.concat([serverRoomFloorTemplate(10)]);

/**
 * Assembles this run's floor sequence: floors 1-9 keep their original
 * authored content (from FLOORS, including Floor 5's boss gauntlet), and
 * Floor 10 is always the Secure Server Room. Call this once per Story
 * Mode playthrough (Story.start()), before the first floorByNum() lookup.
 */
function startNewStoryRun() {
  const runFloors = FLOORS.slice();
  runFloors.push(serverRoomFloorTemplate(10));
  activeRunFloors = runFloors;
  return { serverRoomFloor: 10, totalFloors: 10 };
}

/* Small helpers shared by story.js / platformer.js */
function floorByNum(n) {
  return activeRunFloors.find((f) => f.num === n) || null;
}
