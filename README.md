# CYBER GUARDIAN: MISSION INDIGO

A browser-based 2D game built for **GameCraft 2026** — now with three ways
to play: the original 60-second arcade mission, a 10-floor, one-mistake-
and-you're-out **Story Mode** infiltration campaign in the spirit of the
classic *Dangerous Dave* games (Floor 5's boss fight has an optional gun to
collect from a guard — now with its own dedicated fire key and lethal
against ordinary guards too — plus Mario-style bonus content, coins,
a shield, stompable minions, and moving platforms, scattered across every
floor), and a **FPS Mode** — a real Wolfenstein-3D-style raycaster with
textured walls and doors, a tiled floor, mouse-look steering, a stun
pistol in hand doubling as ammo, a health bar in place of instant death,
keycards and hidden terminals on every floor, and a final boss guarding
the Floor 10 exit, playable across a genuine multi-room layout on all 10
floors of Indigo Tower.

---

## Story

**02:14 AM.** An intrusion alert trips on the ground floor of Meridian Corp's Indigo
Tower — ten floors of offices, labs, and the server core that keeps the
whole campus running. You are the on-call **Cyber Guardian**. Whoever (or
whatever) broke in has already been through HR's password files, Finance's
invoices, and the exec suite, and it's climbing. Every floor it touched left
a trace — a clue pointing to where it went next. Follow that trail up
through the tower, past Legal & Compliance's own head of security guarding
the stairwell up, and lock the threat out of the Secure Server Room on
Floor 10 before it locks everyone else out first.

This narrative is shown to every player as a dedicated **Story Briefing**
screen before either mode is chosen — the mandatory mission-briefing
requirement now leads with real lore instead of a dry checklist.

## The three modes

### 🕹️ Arcade Mission — endless roguelite descent

The original competition spec's six zones — **Meridian Main Gate → Security
Checkpoint → Office Floor → NOC → Data Center Corridor → Secure Server
Room** — are now **one floor of an endless, escalating run**. Reaching the
server rack clears the floor and the tower immediately rebuilds itself
harder. There is no 60-second timer any more; the run ends when you run out
of **integrity**.

**Escalation.** Every floor cleared compounds **+5% enemy speed** and
**+10% spawn rate** — the same six hand-authored zones, progressively
buried in extra drones, lasers and malware seeded on top of them. Floor 1
is exactly the Arcade Mission that always existed; floor 12 is that map
under real pressure.

**Integrity, not a clock.** A hazard hit costs a chunk of a 100-point
integrity bar (plus the original score penalty) instead of only points, and
zero ends the run. That turns every drone collision from "lost points" into
a spent resource you can't get back.

**The EMP pulse.** Fire (**X**/**F**) releases a short-range pulse that
disables every drone in radius for a few seconds — safe to walk straight
through while stunned, exactly like Story Mode's guard stun. Cooldown-gated
rather than charge-limited.

**A combo that rewards speed.** The multiplier is now time-gated: every
pickup *and* every EMP stun refreshes a short chain window, and the
multiplier climbs **1.5× → 2× → 2.5× → 3× → 4× → 5×** as the chain grows.
Let the window lapse and it decays on its own; take damage and it drops
straight back to 1×.

**Draftable perks.** Every third floor cleared, the run pauses and offers
three randomized perks — Silent Footsteps, Wider EMP Radius, Extra Health,
Fleet Runner, Combo Keeper, Hardened Shell, Scavenger, Rapid Charge, Field
Medic, Overclock. Pick one; it lasts the rest of the run, and the numeric
ones stack.

### 🏢 Story Mode: Ten Floors of Indigo Tower

A level-based campaign built for this request — **every single floor is now

### 🏢 Story Mode: Ten Floors of Indigo Tower

A level-based campaign built for this request — **every single floor is now
a real side-scrolling platform level**, *Dangerous Dave*/Super-Mario style,
with "one mistake ends the run" tension throughout. There's no separate
"quiz screen" or "treasure grid" anymore — the old quiz and treasure-hunt
floors were rebuilt as actual mazes you run, jump, and climb through, with
the question or clue answered by touching the correct lettered terminal
among several decoys:

| # | Floor | Challenge |
|---|---|---|
| 1 | Main Lobby & Badge Security | Platform maze — collect every trophy, reach the door (tutorial) |
| 2 | Human Resources & Employee Records | Platform maze — touch the terminal with the correct quiz answer |
| 3 | Finance & Accounts Payable | Platform maze — touch the terminal holding the real invoice/clue |
| 4 | IT Helpdesk & Support | Platform maze — collect every trophy, reach the door (introduces ladders) |
| 5 | Legal & Compliance | Platform maze — touch the terminal with the correct quiz answer, then defeat **The Auditor**, a mid-run boss, before its door unlocks |
| 6 | Network Operations Center (NOC) | Platform maze — collect every trophy, reach the door |
| 7 | Executive Suite | Platform maze — touch the terminal holding the real invoice/clue |
| 8 | Cloud & R&D Lab | Platform maze — touch the terminal with the correct quiz answer |
| 9 | Data Center Corridor | Platform maze — collect every trophy, reach the door (hardest patrol layout) |
| 10 | **Secure Server Room** | Final platform maze — collect every trophy to wake **The Architect** (a 3-phase boss), bring it down, then **crack the server's access-code terminal** |

**The campaign runs in three acts**, each introducing its own mechanics
rather than just turning up guard speed. The pre-level briefing is labelled
with its act, and the first floor of each act opens with a framing beat
about what's actually going on in the building:

| Act | Floors | Introduces |
|---|---|---|
| **1 — The Lobby** | 1–3 | Basic stealth. **Hackable light switches**: press **E** beside a wall panel to cut the floor's lights for ~7s, collapsing every guard's sight range (and blinding spotlight drones entirely). One use per panel. |
| **2 — The Server Farms** | 4–7 | **Spotlight Drones** (ceiling-mounted, sweep a downward light cone — they catch you by *column*, so sharing a walkway is no longer the danger), **Tracker Hounds** (spot further, sprint faster than you run, and hold a chase ~3× longer than a guard), and **timed laser grids** (a lit beam ends the run; read the rhythm and cross on the gap). The story turns here — these floors were supposedly decommissioned. |
| **3 — Executive Suites** | 8–10 | **Elite guards** (armored — the first stun only staggers, it takes two to actually freeze one), **maintenance vents** (stand on one and press **Down**/**E** to travel to its pair, skipping a held corridor entirely), and the **multi-phase finale** on Floor 10. |

**Floor 10's finale is a three-phase fight.** Collecting the last trophy
wakes **The Architect**, and the door to the password terminal stays locked
until it's down. It takes six hits total — but every two hits it drops into
a brief **invulnerable "recompiling" window** where your shots do nothing,
and it comes back faster and with a longer reach each time. You have to
disengage and re-approach three separate times; standing still and spamming
the stun key doesn't work.

Every floor also now hands you one letter of a hidden 9-letter **server
access code**, revealed on the "Floor Cleared" panel the moment you solve
it. The Secure Server Room doesn't hand you an instant win when you reach
its door anymore — instead it drops you at a terminal where you have to
type in the full code you've assembled from every floor cleared along the
way (3 attempts before the lockout ends the mission).

**Floor 5 is a mid-run boss gauntlet.** Answering Legal & Compliance's
data-privacy quiz correctly doesn't clear the floor by itself — it wakes
**The Auditor**, Legal's own head of security: faster and with a longer
sight range than any ordinary guard, and immune to a single stun. It takes
**three separate stun hits** to actually bring it down (each hit still
freezes it temporarily and drops a reclaimable charge pickup, same as any
other guard, so the same stun-and-retreat loop applies — it just isn't
enough to end the fight until the third hit lands). The floor's exit door
stays locked until it's defeated. Every floor after it plays out exactly as
normal, all the way to the Secure Server Room on Floor 10. The Auditor's
portrait (active and defeated states) is generated from a character sheet
the user supplied — see `tools/gen_villain_boss_sprite.py`.

**The boss gun has its own dedicated Fire key (G) — and it kills ordinary
guards too, not just the boss.** Picking up Floor 5's gun no longer routes
through the same key as the stun ability; pressing **G** fires the
unlimited-ammo gun at any guard in range and facing, boss or not. Against
the boss it still just contributes to the same three-hit `hitsTaken`
counter as before. Against an ordinary guard, it takes **two separate gun
hits** to permanently remove it from the floor for good (a single hit only
paralyzes it, same as a stun charge) — a second, more lethal option
alongside the temporary stun-and-slip-past loop, for a player who'd rather
clear a chokepoint than tiptoe around it.

**Every floor now hides Mario-style bonus content**, generated from that
floor's own platform layout rather than hand-placed: a scatter of
collectible **coins** (worth points, tallied on the HUD), one **shield**
power-up (a few seconds of immunity to a guard or minion touch, shown as a
green glow around the player), a couple of **stompable minions** patrolling
a short stretch of some platform (land on one from above to bounce and
defeat it; touch it any other way and the run ends, same as a guard,
unless the shield is active), and one small **moving platform** drifting
back and forth for an optional detour. All of it is placed defensively —
never on the player's own starting tile, never blocking the one required
path to a trophy, terminal, or door, and never within reach of a guard's or
terminal's own tile — so it's purely additive, the same "one mistake ends
the run" floors underneath are untouched.

Each floor opens with a short story beat, then a challenge. Story floors
also drop a short in-level **field note** — one or two lines of found lore
(a frozen ticket queue, a still-open compliance dashboard, a rack humming a
half-step off-key) shown right alongside the actual challenge, not just on
the pre-level briefing:

Every floor is real side-scrolling run/jump/climb gameplay: gravity,
running, jumping across gaps, and ladder-climbing between levels, exactly
like the original *Dangerous Dave*/Super Mario. Each floor's maze is laid
out differently — different platform heights, branch points, and ladder
placements — and gets its own sparse background motif (a badge icon on the
Lobby floor, a dollar sign watermark on Finance, a server-rack silhouette on
the NOC, and so on) so no two floors read as a reskinned repeat of the last
one. Floors come in two shapes:

- **Trophy floors** (Lobby, IT Helpdesk, NOC, Data Center Corridor, and the
  Secure Server Room) — collect every trophy scattered through the maze
  before the exit door unlocks, then reach it.
- **Terminal floors** (HR, Finance, Legal, Executive Suite, Cloud & R&D) —
  the pre-level briefing shows the actual question or clue with lettered
  answer choices (A/B/C/…); the maze then has one lettered terminal per
  choice, at a different spot in the level. Touch the terminal matching the
  right answer to clear the floor — touch a wrong one and the mission ends
  on the spot. In case the question slips your mind while you're dodging
  guards, a compact **clue panel** stays pinned to the bottom of the screen
  the whole floor, repeating the question and every lettered option
  color-matched to its in-level marker. Legal & Compliance (Floor 5) is the
  one exception: touching the correct terminal there doesn't clear the
  floor outright, it wakes a boss (see above) that has to be defeated
  before an exit door — this floor's only one — unlocks.

Every maze also has **Security Guards that actively hunt you**: they patrol
normally until you wander within their sight range, then a red "!" flashes
and they beeline straight for you at a burst of speed until you break line
of sight for a beat. One touch ends the mission either way, so the safest
move is staying out of sight range in the first place, not just staying
clear of a fixed patrol lane.

If a guard's patrol lane is blocking the only route to a trophy or terminal,
you're not always stuck waiting it out — every floor also gives you a
handful of **stun charges** (fire with **X** or the on-screen ⚡ button).
It's a short-range shot that freezes one guard in place for a few seconds
(long enough to slip past safely — a paralyzed guard can't end your run on
touch) but never removes it for good: it shakes the stun off and resumes
hunting once the timer on its head runs out. Charges are scarce and gated by
a short cooldown between shots, but a guard you successfully stun drops a
pickup where it stood — walk over it to reclaim the charge, if you're
willing to risk the extra seconds near where it'll wake back up.

Solving a floor reveals a **riddle** — presented as a literal pinned note,
alongside the letter fragment of this run's server access code — describing
the next floor's department (without naming its number). Clearing a floor
calls the elevator, now restyled as a real bank of **lift doors**: each
department is its own numbered lift unit with animating double doors,
cross-reference the riddle against the door labels and click the matching
lift. Guess correctly and a full-screen **slide transition** (styled like
the lift doors themselves sweeping across) covers the screen while the next
floor loads behind it, then slides away to reveal it — guess wrong (or pick
a floor you've already cleared, shown "OUT OF SERVICE") and it's an instant
"SECURITY ALERT" game over, exactly like a wrong door in *Dangerous Dave*.

Reaching the Secure Server Room's door doesn't win the mission outright
anymore. It drops you at a terminal: every floor cleared along the way
handed you one letter of the server's access code, and you have **3
attempts** to type in the full assembled code before a lockout ends the
mission as a loss. Get it right and the intrusion is locked out for good.

Story Mode keeps its own scoreboard (points per floor cleared, floors
reached out of however many this run's Server Room made it, and a mission
clock) on a separate **Story** tab of the same leaderboard used by Arcade
Mode.

### 🎯 FPS Mode: Lobby Breach

A third mode built directly in response to "make this like Wolfenstein
3D" — a real first-person raycaster, not a reskinned top-down view.
Launched as a Floor-1-only proof of concept, then extended to cover **all
10 floors** with real wall/floor textures, a trophy pickup, and a visible
weapon, and extended again with **mouse-look**, a genuine **multi-room
layout with real doors** on every floor, and an optional **hacking-
terminal side-quest**.

The rendering is a classic **DDA raycaster** (the actual technique the
1992 original used): the floor is a 2D grid, and each of the 900-pixel-
wide view's columns casts one ray outward from the player through a
camera plane, walking grid cell by grid cell until it hits a wall, then
drawing that column as a vertical strip whose height is inversely
proportional to the (fisheye-corrected) distance — closer walls read
taller, farther walls shorter, faking 3D depth from a flat 2D map. Walls
are **texture-sampled**, not flat fills: a tileable panel texture
(procedurally generated, see below) multiply-tinted a different color per
floor, a shared amber hazard-stripe texture for decorative border walls,
and a shared security-door texture, each two-toned by which axis of the
wall was actually hit, plus a soft distance fog. The floor is real
**per-pixel floor-casting** with a tiled, checkerboarded texture (also
multiply-tinted per floor), so the ground reads as an actual tiled lobby
floor rather than a flat color.

**Look/move controls:** click the view once to grab the mouse pointer
(the Pointer Lock API) — after that, mouse movement steers the camera
every frame, Up/Down still walks forward/back, and Left/Right switches
from turning to **strafing** sideways. Esc releases the pointer and falls
back to keyboard-only turning at any time; nothing about mouse-look is
required to play.

Every floor is a real **six-room layout** (a 3x2 grid of rooms) connected
by a spanning tree of **doors** plus one extra connection per floor for a
bit of loop variety, instead of the original two-room entrance-hall/lobby
split — a genuine Wolfenstein-3D-style dungeon, not one open box. Doors
slide open as you (or a guard mid-chase) approach and auto-close a few
seconds after the last mover leaves, rendered with their own texture and
gating both the raycaster and collision exactly like a wall does until
they're open. One or two **badge checkpoint guards** patrol each floor's
middle rooms (floors 6-10 get a second guard and a speed bump, mirroring
Story Mode's own "tougher back half" precedent), rendered as a billboarded
sprite (reusing Story Mode's guard walk-cycle art). Detection is a
forward-facing cone, not omniscient — a guard won't spot you approaching
from directly behind it, only within its sight range, roughly a 90° cone
in front of it, and a clear line of sight (plus a small point-blank radius
so it's never unfairly blind at close range) — and since line-of-sight is
wall-aware, a guard can spot you through an open doorway just as it would
around a corner. A guard's touch costs **health**, not an instant loss (see
below); stay out of its cone (or fire a **stun charge**, shown as a genuine
first-person weapon — a stun pistol held in view, Wolfenstein-3D style,
with an idle bob while walking and a muzzle-flash frame when fired) to
slip past safely. Collect all four badges on a floor — rendered as the
same gold trophy sprite Story Mode uses on its trophy floors, not a plain
circle — then reach the **elevator alcove**, now in its own dedicated room
reached through real doors, to advance to the next floor. Reaching Floor
10's alcove doesn't end the campaign by itself anymore — see **The
Sentinel** below. A HUD-corner **minimap** shows the current floor's
rooms, doors, badges, guards, and your facing at all times.

**Health replaces instant death.** A guard's touch now costs a chunk of a
100-point health bar (with a brief invulnerability window afterward, so one
chase doesn't melt the whole bar in a single second of contact) rather than
ending the mission outright — the HUD shows the running total, and the
screen flashes red on a hit. Run it to zero and the mission still ends, but
a single mistake is no longer automatically fatal the way it is in Story
Mode; a few stray hits are survivable if you break contact and keep going.

**Ammo, keycards, and hidden rooms.** The stun pistol's charges are now
framed as ammo (`STUN/AMMO` on the HUD, capped at 10) rather than a
handful of one-time uses. Every floor hides three extra pickups tucked into
side corners away from the obvious route: a **keycard** that unlocks one
of the floor's doors (always an optional shortcut/loop-variety connection,
never the only path to a badge or the exit — the spanning-tree doors alone
already reach everywhere), an **ammo cache**, and a **health cache**. And
every floor — not just Floor 1 — now hides its own **hacking-terminal
side-quest**: a standing computer terminal billboard with a "Press E to
hack" prompt when you're close enough. Pressing E (or the on-screen ⌨
button) opens a small multiple-choice mini-puzzle drawn from a pool of five
distinct questions — pick the right command and it grants a bonus ammo
charge; a wrong guess just asks you to try again, no penalty and no
lockout, since it's a purely optional objective, never a required gate.

**Three level archetypes give the campaign a shape.** The six-room
skeleton is shared, but what's inside a room — and what holds it — changes
by act, so the 10 floors read as three different kinds of level rather than
ten variations on one:

| Floors | Archetype | What's different |
|---|---|---|
| 1–3 | **Maintenance Tunnels** | Small rooms broken up by interior pillars into cramped corridors. Guards hold tight loops by the doorway corners with a short sight range but a much wider cone and a big point-blank radius — they read as stepping out as you round a corner, not as spotting you down a hall. Close range, fast reactions. |
| 4–7 | **Datacenter** | Wide-open arenas with **server racks** as hard cover, held by **snipers**: stationary enemies that paint a laser sight on you, hold the lock for ~1.5s, then fire for heavy damage. **Breaking line of sight cancels the lock outright** — which is exactly what the racks are for. Floors 6–7 add a second sniper. |
| 8–10 | **Rooftop Extraction** | One big open arena and a **countdown**. The exit stays sealed until extraction is ready (45s on Floor 8, rising to 69s on Floor 10) while **waves** of attackers spawn on a cadence, each wave bigger and faster than the last. **Explosive barrels** are scattered around: shoot one to permanently clear everything near it — including yourself, if you're inside the blast. Barrels chain-react. |

**The Sentinel guards the exit on Floor 10.** It stays dormant — off the
minimap, no threat — until every badge on the final floor is collected,
then wakes and has to be stunned down (three separate hits, same
stun-and-retreat loop as an ordinary guard, just tougher) before the
elevator alcove will actually clear the floor and win the campaign.
Reaching the alcove with badges in hand but the Sentinel still up does
nothing; it has to go down first. Unlike an ordinary guard, the Sentinel
renders as its own dedicated sprite (`img/sentinel-guard.png`) built from
the same user-supplied character sheet as Story Mode's Auditor, rather
than the regular guard art with a color filter.

### FPS Mode's procedurally-generated art (`tools/gen_fps_assets.py`)

Six assets, drawn the same way every other sprite/tileset in this project
is (Python/Pillow, offline, chunky low-color pixel art upscaled with
nearest-neighbor for crisp blocky edges — no external art, no runtime
image processing): a tileable wall-panel texture and a tileable floor-tile
texture, both drawn in near-grayscale so `fps.js` can multiply-tint them a
different color per floor at level-load time instead of needing 10
separate texture files; a tileable amber/black hazard-stripe texture used
for decorative border-wall accents, used as-is (not tinted per floor); a
2-frame first-person weapon sprite — a gloved hand and forearm gripping a
stun pistol with a glowing blue coil along the barrel, idle and
mid-recoil-with-muzzle-flash; a security double-door texture (its own
fixed palette, not tinted, same reasoning as the hazard stripe — a door
should read as "a door" on every floor); and a standing computer-terminal
billboard with a glowing green screen for the hacking side-quest, reused on
every floor rather than just Floor 1.
The badge pickup reuses Story Mode's existing trophy tile
(`platform-tiles.png`) and the guard reuses Story Mode's existing guard
walk-cycle sprite (`dave-guard.png`) rather than generating new art for
either.

## Objective

**Arcade:** get as deep as you can into an endless, escalating descent
before your integrity runs out — chaining pickups and EMP stuns for the
multiplier, and drafting a perk every third floor.
**Story:** clear all 10 floors across three acts — surviving Act 2's
drones, hounds and laser grids, getting past Act 3's armored guards, and
defeating both Floor 5's Auditor and Floor 10's three-phase Architect —
then crack the Secure Server Room's access code, without a single mistake
along the way.
**FPS:** clear all 10 floors across three archetypes — ambush corridors,
sniper-held datacenter arenas, and rooftop wave survival — managing health
and ammo throughout, and defeat the Sentinel guarding the Floor 10 exit to
win the campaign.

## Controls

| Action | Keys |
|---|---|
| Move (arcade zones) | Arrow Keys **or** WASD |
| Run (Story Mode platform floors) | Left/Right, A/D |
| Jump (Story Mode platform floors) | Up, W, **or Space** |
| Climb a ladder | Up/Down while overlapping it |
| Fire a stun charge (Story Mode &amp; FPS Mode) | **X** or **F** (or the on-screen ⚡ button); in FPS Mode, click once the mouse is steering |
| Fire the gun (Story Mode, once picked up on Floor 5) | **G** (or the on-screen 🔫 button) — a dedicated key, separate from the stun Fire key; works on the boss and on ordinary guards |
| Touch the correct terminal (choice-mode mazes) | Walk into it, same as any other maze contact |
| Enter the server password | Type into the terminal input, click Submit or press Enter |
| Walk forward/back (FPS Mode) | Up/Down, W/S |
| Look / steer the camera (FPS Mode) | Click the view to grab the mouse pointer, then move the mouse; Left/Right, A/D as a fallback when not mouse-locked |
| Strafe (FPS Mode, once mouse-locked) | Left/Right, A/D |
| Interact with a terminal (FPS Mode) | **E** (or the on-screen ⌨ button) |
| Touch (tablet) | On-screen d-pad (auto-shown on small/touch screens); FPS Mode's pad turns/strafes and includes fire + interact buttons |
| Fullscreen (any mode) | Click the ⛶ Fullscreen button in the HUD bar; click again (or press Esc) to exit |
| Hack a light switch (Story, Act 1) | **E** (or the on-screen ⌨ button) while standing beside a wall panel |
| Enter a maintenance vent (Story, Act 3) | **Down** or **E** while standing on a vent mouth |
| Fire the EMP pulse (Arcade) | **X** or **F** (or the on-screen ⚡ button) — disables every drone in radius |
| Draft a perk (Arcade, every 3rd floor) | Click a card, or press **1** / **2** / **3** |

## Scoring Rules — Arcade Mission

| Event | Points |
|---|---|
| Security Token collected | **+10** |
| Drone disabled with the EMP pulse | **+15** |
| Patch Applied (NOC) | **+20** |
| Checkpoint Activated | **+50** |
| Floor Cleared (Server Room reached) | **+100** |
| Laser Hit | **−10 pts** &middot; **−12 integrity** |
| Malware Trap | **−15 pts** &middot; **−15 integrity** |
| Security Drone Collision | **−20 pts** &middot; **−20 integrity** |
| Alarm triggered while active | **−10 pts** &middot; **−10 integrity** |

**Combo system (time-gated):** every pickup *and* every EMP stun refreshes a
short chain window. The multiplier climbs with the chain — 3+ → **1.5×**,
5+ → **2×**, 8+ → **2.5×**, 12+ → **3×**, 16+ → **4×**, 20+ → **5×**. Let the
window lapse and the combo decays back to zero on its own; take damage and
it resets to 1× immediately. A **2× Score** powerup stacks multiplicatively
on top, as does the Scavenger perk.

**Difficulty scaling:** compounding **+5% enemy speed** and **+10% spawn
rate** per floor cleared — driven by how deep the run got, not by elapsed
time, since there's no clock any more. Extra obstacles are seeded
deterministically per floor (same floor number → same layout), so a run is
reproducible rather than random noise.

**Integrity:** 100 points (raisable by the Extra Health perk). Zero ends the
run. The Timer Bonus powerup now repairs 15 integrity instead of extending a
clock that no longer exists, and the Field Medic perk repairs 20 per floor
cleared.

## Scoring Rules — Story Mode

Each floor awards a fixed bonus on completion, increasing floor-by-floor
(175 pts on Floor 1, up to 500 pts for clearing the Secure Server Room on
Floor 10) to reward getting deeper into the tower — Floor 5's boss gauntlet
awards the second-highest bonus (400 pts) to reflect the extra difficulty.
There is no penalty scoring — a mistake ends the run outright, so your
final score is simply the sum of every floor you cleared before that
happened (or all 10, on a full clear). Bonus coins found along the way
(see Mario-style bonus content, above) add **+10** points each on top of
the floor-clear bonus, but are entirely optional — skipping every coin on
a run still lets you clear all 10 floors.

## Features

- ✅ Three full game modes sharing one audio system and shared input
  plumbing: the original 60-second Arcade Mission, the 10-floor Story
  Mode, and the new 10-floor FPS Mode
- ✅ **FPS Mode: Lobby Breach** — a real DDA raycasting engine (the actual
  Wolfenstein 3D technique, not a top-down reskin) covering all 10 floors:
  texture-sampled wall strips (a per-floor-tinted panel texture, a shared
  hazard-stripe accent texture, and a shared security-door texture) whose
  height and shading come from fisheye-corrected distance and which wall
  axis was hit, real per-pixel floor-casting with a tiled, checkerboarded,
  per-floor-tinted floor texture, billboard sprite rendering for badges
  (the same trophy sprite Story Mode uses), guards (Story Mode's guard
  walk-cycle sprite), and a hacking terminal, a Wolfenstein-3D-style
  first-person weapon view (a stun pistol in hand, idle bob + muzzle-flash
  fire frame), mouse-look camera steering (Pointer Lock API, with Left/
  Right switching to strafe once engaged and a keyboard-turn fallback), a
  genuine six-room-per-floor layout connected by proximity-opening/
  auto-closing doors, a directional-cone guard AI (patrol/detect/chase/
  stun-paralyze, 2 guards and a speed bump on floors 6-10), a hacking-
  terminal side-quest on **every** floor (a multiple-choice mini-puzzle
  drawn from a 5-question pool, for a bonus ammo charge), and a HUD-corner
  minimap
- ✅ **FPS Mode health, ammo, keycards, and a final boss** — guard contact
  now costs health from a 100-point bar (with a brief post-hit
  invulnerability window and a red screen-flash) instead of ending the
  mission instantly; stun charges are reframed as a capped ammo pool;
  every floor hides a keycard (unlocking one optional door, never a
  required path), an ammo cache, and a health cache in out-of-the-way
  corners; and Floor 10's exit is guarded by **The Sentinel**, a dormant
  boss that wakes once every badge is collected and must be stunned down
  three times before the elevator alcove will clear the floor — rendered
  with its own dedicated sprite (not the ordinary guard art with a color
  filter), from the same user-supplied character sheet as Story Mode's
  Auditor
- ✅ **Fullscreen toggle** in every mode's HUD — expands the whole play
  area (HUD, canvas, and touch pad together, not just the canvas) to fill
  the display via the browser's Fullscreen API
- ✅ **Arcade Mission reworked into an endless roguelite** — the six
  original zones became one floor of an infinite descent that compounds
  +5% enemy speed and +10% spawn rate every floor cleared; the 60-second
  timer is replaced by a 100-point **integrity** bar that a hazard hit
  actually spends; a new **EMP pulse** on the Fire key disables every
  drone in radius; the combo is **time-gated** (pickups *and* EMP stuns
  refresh a chain window, climbing to 5×, decaying on its own if you
  stop chaining); and every third floor pauses for a **perk draft** —
  three randomized picks from a ten-perk pool that stack for the rest of
  the run
- ✅ **Story Mode restructured into three acts**, each introducing real
  mechanics rather than just faster guards: Act 1's **hackable light
  switches** (cut the floor's lights, collapsing guard sight range and
  blinding drones), Act 2's **spotlight drones** (a downward light cone
  that catches you by column), **tracker hounds** (faster than you, with
  a chase memory ~3× a guard's) and **timed laser grids**, and Act 3's
  **elite guards** (armored — two stuns to freeze) and **maintenance
  vents** (a route that skips a held corridor entirely). Each act's first
  floor opens with its own framing beat, and the briefing tells you which
  of that floor's mechanics are live
- ✅ **A multi-phase final boss on Floor 10** — collecting the last trophy
  wakes **The Architect**, which gates the password terminal and takes six
  hits across **three phases**, dropping into a brief invulnerable
  "recompiling" window between each and returning faster and further-
  sighted every time, so the fight has to be re-approached rather than
  out-spammed
- ✅ **Three distinct FPS level archetypes across the 10 floors** —
  **Maintenance Tunnels** (1-3: pillared corridors and corner-ambush
  guards tuned for close range), **Datacenter** (4-7: open arenas with
  server-rack cover and **snipers** that paint a laser sight, hold a lock,
  then fire — with breaking line of sight cancelling the lock outright),
  and **Rooftop Extraction** (8-10: a sealed-exit survival hold-out with
  escalating enemy **waves** and chain-reacting **explosive barrels**)
- ✅ A dedicated Story Briefing screen presents the mission's narrative
  before Start/mode selection, satisfying the "explain the mission" brief
  with real lore instead of a bullet list
- ✅ Two deliberately distinct visual styles: Story Mode's platform floors
  use chunky, low-color, retro *Dangerous Dave*-style pixel art (procedural
  sprite sheets + tileset), while Arcade Mission got a "more graphics"
  overhaul — a detailed multi-tone 16-bit-style prop tileset, a bigger and
  more detailed top-down hero sprite, animated decorations (flickering NOC
  monitors, swaying trees), and a parallax dot-grid backdrop layer
- ✅ Real side-scrolling platformer engine that now powers **every one** of
  Story Mode's 10 floors (the former quiz/treasure-hunt floors were
  rebuilt as mazes too) — gravity, running, jumping across gaps, and
  ladder-climbing, with physics-constrained level authoring (every gap and
  step-up is guaranteed reachable by the actual jump arc)
- ✅ Security Guard NPCs (Story Mode) and Security Drones (Arcade Mission)
  both actively **spot-and-chase**: they patrol until you enter sight range,
  then flash a red "!" and beeline toward you at a speed burst, clamped to
  a leash range around their post, before returning to patrol once you
  break contact — not just a fixed patrol lane to avoid
- ✅ 10 hand-authored maze floors, five "collect every trophy" levels and
  five "touch the correct lettered terminal" levels (the former quiz/
  treasure-hunt floors, converted to real platforming with the original
  question/clue content preserved on the pre-level briefing), each with its
  own riddle-clue, a distinct per-floor background motif, and a restyled
  **lift-doors** elevator floor-picker puzzle (real animating double doors
  per floor, cleared floors marked "OUT OF SERVICE", a full-screen slide
  transition while the next floor loads behind it)
- ✅ **Secure Server Room password terminal** (Floor 10) — every floor
  cleared hands over one letter of a hidden access code; reaching the
  Server Room's door no longer wins instantly, it opens a terminal
  requiring the full code (3 attempts before a lockout ends the mission as
  a loss)
- ✅ **Floor 5 mid-run boss** — a named, tougher enemy (faster, longer sight
  range, portrait generated from a user-supplied character sheet — see
  `tools/gen_villain_boss_sprite.py`) that wakes once the floor's
  quiz is answered correctly and has to be stunned three separate times,
  not just once, before its exit door unlocks — the same stun-charge
  ability used against every other guard, just not enough on its own. One
  of the floor's ordinary guards carries a sidearm — stun it and grab the
  drop for a second, unlimited-ammo, longer-range attack against the boss,
  landing hits alongside (not instead of) the regular stun-charge attack
- ✅ **Dedicated gun-fire key (G)** — once the Floor 5 boss gun is picked
  up, firing it no longer shares the stun key; G fires the gun on its own,
  and it's no longer boss-only — two separate gun hits permanently remove
  an ordinary guard from the floor (a single hit only paralyzes it, same
  as a stun charge), a second, more lethal option alongside the
  stun-and-slip-past loop
- ✅ **Mario-style bonus content on every floor** — collectible coins
  (+10 points each, tallied on the HUD), one shield power-up per floor (a
  few seconds of touch-immunity, shown as a green glow), stompable minions
  (land on one from above to defeat it; touch it any other way and the run
  ends, same as a guard, unless shielded), and a small back-and-forth
  moving platform — all generated from each floor's own layout and placed
  defensively, so it's purely additive and never blocks the one required
  path to a trophy, terminal, or door
- ✅ In-level **field notes** in Story Mode — a short found-lore beat shown
  during the actual maze as a fading corner toast, on every floor (not just
  the pre-level briefing)
- ✅ Instant "one mistake ends the mission" failure state across every
  Story Mode challenge type, in the spirit of classic *Dangerous Dave* — a
  guard's touch, a fall into a gap, touching a wrong-answer terminal, or a
  wrong floor in the elevator (the password terminal alone gives 3 attempts,
  since a typed challenge deserves more forgiveness than a reflex one)
- ✅ Name capture screen with validation (required, trimmed, 20-character max)
- ✅ Exact 60-second Arcade countdown timer — starts only on **Start
  Mission**, flashes yellow at 10s and red at 5s, freezes the score
  permanently at 0
- ✅ Live, animated score counter with floating "+N" / "−N" point popups
- ✅ Six hand-crafted Arcade zones with distinct visuals and hazard types,
  each with its own short in-level **field note** (a fading corner toast,
  shown once the first time you enter that zone)
- ✅ Six solid **trees** in the Main Gate zone — block movement like a wall
  (routed around, never walked through) but, unlike every other obstacle in
  Arcade Mission, cost no points to bump
- ✅ Five Arcade obstacle types: patrol drones, sweeping laser beams,
  stationary malware zones, timed firewall gates, and temporary alarm areas
- ✅ Four Arcade powerups: Shield (10s immunity), Speed Boost (2× movement),
  Score Multiplier (2× for 10s), and a Timer Bonus (+3s, capped at 60s)
- ✅ Combo system with on-screen multiplier display (Arcade)
- ✅ Progressive difficulty scaling every 15 seconds (Arcade)
- ✅ Fully procedural sound design (Web Audio API — zero external audio
  files) with mute button, volume slider, and 100% playability muted, shared
  by both modes
- ✅ Persistent LocalStorage leaderboard with separate Arcade / Story tabs:
  Top 10, personal best, clear-this-list button, timestamped entries
- ✅ Mission debrief / result screens (one per mode) with full run statistics
- ✅ Keyboard-first accessibility: visible focus rings, high-contrast palette,
  a "reduce motion" toggle (also honors `prefers-reduced-motion`), a
  responsive layout that scales to tablets, and quiz/treasure-hunt choices
  built as real, tab-and-Enter-reachable buttons

## Technologies Used

- HTML5 + Canvas API
- CSS3 (custom properties, grid/flexbox, keyframe animations)
- Vanilla JavaScript (ES6 classes, no frameworks, no build step)
- Web Audio API (procedural sound effects and music — no audio assets)
- Browser LocalStorage (leaderboard persistence)
- Python + Pillow (offline, one-time generation of the pixel-art sprite
  sheets and tilesets in `img/` — see `tools/gen_dave_sprites.py` (Story
  Mode's Dangerous-Dave-style player/guard/tile art), `tools/gen_arcade_assets.py`
  (Arcade Mission's detailed prop tileset and hero sprite), and
  `tools/gen_fps_assets.py` (FPS Mode's tileable wall/floor textures and
  first-person weapon sprite); the game itself has zero runtime dependency
  on Python)
- Google Fonts (Orbitron + Share Tech Mono) for the terminal/HUD typography

## AI Tool Used

**Claude (Anthropic).**

### AI Contribution

Claude designed the full game architecture for both modes, wrote every file
in this repository (`index.html`, `css/styles.css`, and all `js/` modules,
including the side-scrolling platformer engine in `js/platformer.js`),
generated every sprite sheet and tileset procedurally with Python/Pillow
scripts (`tools/gen_dave_sprites.py` for Story Mode's Dangerous-Dave-style
art, `tools/gen_arcade_assets.py` for Arcade's detailed prop tileset and
hero sprite), authored the Story Mode narrative and all 10 floors of level
content (platform level layouts, quiz questions, treasure-hunt clues, and
riddles — with gap/step-up sizing hand-tuned against the platformer's actual
gravity/jump-velocity constants so every level is genuinely completable),
and implemented every gameplay system described above (zones, obstacles,
powerups, combo/difficulty logic, procedural audio, dual leaderboard, floor
state machine, platformer physics/collision, guard AI, and accessibility
features). In a follow-up pass, Claude added solid (non-punishing) tree
obstacles to Arcade Mission, in-level field notes to both modes, restyled
Story Mode's elevator as a literal bank of lift doors, and reworked the
Story Mode win condition so the Secure Server Room's floor number is rolled
at random each run instead of being pinned to Floor 10 — including
threading the resulting dynamic floor count through every HUD/result display
that used to hardcode "/10". The build was functionally tested end-to-end
with automated headless-browser passes covering both modes (name validation,
story briefing → mode select → each mode's full instructions/game/result
flow, a complete Story Mode platform-floor win path driven by a
physics-aware autopilot that plays the real level data, guard touch-kill and
pit-fall failure paths, Arcade zone traversal with the new tileset
rendering, and leaderboard read/write) to verify it runs without runtime
errors before delivery. The original testing pass surfaced and fixed two
real platformer engine bugs along the way: a dead zone at the top of every
up-ladder (fixed by checking the player's full vertical extent against the
ladder shaft instead of a single center point) and a rare embedding case at
the bottom of a down-ladder that could permanently block horizontal movement
(fixed with a de-penetration safety check). The follow-up testing pass
verified, across 40 randomized Story Mode run rolls, that the Secure Server
Room floor always lands in its intended 3–10 range, is always correctly
flagged as the mission-ending floor, and always hands the preceding floor
the correct final-approach riddle — plus confirmed tree collision, the
restyled lift-doors elevator, wrong-floor failure, and the dynamic
floor-count displays all behave correctly through a real UI playthrough
(`tools/e2e-phase3-test.js`).

In a further follow-up pass (the game having shipped as effectively a
straight-line "walk right and jump" experience with no active threats),
Claude reworked Story Mode's Security Guards and Arcade Mission's Security
Drones from fixed-range patrol into genuine spot-and-chase AI (a sight-range
check, an alert state with a grace period before losing the player, and a
leashed chase speed boost so a hunt can't run away indefinitely), converted
all four remaining quiz/treasure-hunt floors into real maze/platform levels
(the original question and clue content now shown on a pre-level briefing,
with lettered in-maze terminals standing in for the old click-a-button
choices), added a Mario-style full-screen slide transition between floors
plus a distinct low-opacity background motif per floor so the shared
tileset doesn't read as a reskinned repeat, and added the Secure Server
Room password-terminal mechanic (every floor hands over one letter of a
hidden access code on completion; the Server Room itself now requires
typing in the full assembled code at a terminal, with 3 attempts before a
lockout ends the run as a loss). This pass was verified with a combination
of a fixed synthetic test (confirming a guard genuinely closes distance on
and catches a stationary player once in sight range) and a full,
real-physics UI playthrough exercising the terminal/password flow four
separate ways: a correct-code submission after a wrong attempt (confirming
both the "attempts remaining" feedback and the full victory screen with
correct floors-cleared/score), and a fresh run driven all the way through
three consecutive wrong attempts (confirming the lockout correctly ends the
mission as a loss with the right reason text) — plus a coarse reachability
check run over every floor's platform/ladder/choice/door layout (including
all eight possible Secure Server Room floor-size variants) confirming every
trophy, terminal, and door is actually reachable from that floor's start
position given the engine's real jump-height/jump-distance physics
constants, not just visually placed.

In a later pass, Claude added a temporary guard-paralyze ability (a
limited-charge, cooldown-gated stun that freezes one guard for a few
seconds, with a successfully-stunned guard dropping a reclaimable charge
pickup) and a persistent in-maze clue panel for every terminal floor, then
fixed three reported bugs: Story Mode's camera failing to scroll on wide
floors (a missing responsive-CSS rule on the Story canvas, not a camera
logic bug), a guard spawning within instant spotting range of the player
on every terminal floor, and ladder climbing requiring the Up/Down key to
be held continuously (fixed with a "latch" so releasing mid-climb hovers
in place instead of dropping).

In the most recent pass, Claude removed all references to the original
competition sponsor from both the game's UI and its code, replacing them
with a fictional generic company; retired the randomized "Secure Server
Room can land on any floor 3–10" mechanic in favor of a fixed 10-floor run
that always ends at Floor 10 (removing the possibility of a run being cut
short before Floor 5); toughened Floors 6–10's guard speed; and added
Floor 5's boss gauntlet — a named enemy that wakes once the floor's quiz
is solved and requires three separate stun hits (guards.js's `Boss` class
overrides `SecurityGuard.paralyze()` to track hits instead of just
freezing) before its exit door unlocks, rendered with a pixelated portrait
generated offline from a supplied photo (`tools/gen_boss_sprite.py`: a
face crop, a punch-up in contrast/saturation, a blocky box-downsample +
nearest-neighbor upscale for the pixel-art look, a villain-red duotone
blend, and a soft circular vignette so it reads as a floating portrait
badge rather than a hard-edged rectangle, plus a matching desaturated
variant for its defeated state). This pass was verified by rewriting the
regression suite to walk a real run through all 10 floors in sequence
(the old suite depended on the now-removed random short-run mechanic),
with dedicated checks confirming the boss doesn't spawn until the quiz is
solved, the door stays locked while it's alive, it survives fewer than
three hits, and the door unlocks and the floor completes once the third
hit lands — plus a page-text scan confirming no trace of the original
sponsor name remains anywhere in the shipped UI.

In the latest pass, prompted by "can we make this game like Wolfenstein
3D," Claude scoped and built **FPS Mode: Lobby Breach** as a brand-new
third mode, additive only — Arcade Mission and Story Mode were not
modified in any gameplay-affecting way. The scope (a new mode rather than
converting the existing modes, Floor 1 only as a proof of concept rather
than all 10 floors, and flat-shaded 1992-style walls rather than textures)
was nailed down with the requester before writing any code. The
implementation is a from-scratch DDA raycasting engine (`js/fps.js`): a
programmatically-built (not hand-typed) Floor 1 grid — a single entrance
hall/inner lobby space joined by a turnstile gap, with two pillar blocks —
verified for full connectivity with a flood-fill check before ever being
wired into the browser; per-column ray casting with the standard camera-
plane/fisheye-correction math; flat two-tone wall shading by hit axis plus
distance fog; and billboard sprite rendering (inverse camera matrix,
z-buffer occlusion) for the four collectible badges and a new `FpsGuard`
class. `FpsGuard` was written from scratch rather than reusing Story
Mode's `SecurityGuard`, since that class only supports one-axis movement
(it was built purely for Story Mode's side-scrolling view) and this needed
real 2D patrol/chase. An early build let the guard detect the player
through line-of-sight alone regardless of which way it was facing, so a
player walking straight through the entrance-hall/lobby corridor got
spotted from any angle — a directional detection cone (roughly 90°, plus
a small point-blank exception so it's never unfairly blind up close) was
added to fix it, verified with a dedicated test confirming a guard
patrolling east-west does *not* spot a player approaching from directly
south through the gap. The new mode reuses the existing shared-services
object (`window.CG`) and its input/audio plumbing the same way Story Mode
does, rather than building a parallel system. Verified with a new 24-check
automated suite (`tools/e2e-fps-test.js`) covering the full mode-select →
instructions → gameplay → win/lose → result flow, canvas pixel rendering,
movement/turning, the directional-detection fix, and — critically — that
Arcade Mission and Story Mode still load and play correctly afterward; the
full pre-existing 27-check regression suite was also re-run and still
passes 27/27, confirming no shared file (`ui.js`, `game.js`) was broken by
the addition.

In an immediate follow-up ("it's fine for level 1... but can add more
graphics like the trophy image and show a stun gun in hand like in
wolfenstein 3d... ground can have some tiles... walls can be more fancy
with graphics... and make for other levels too"), Claude extended FPS Mode
on four fronts at once. Visually: walls switched from flat fills to real
texture sampling (a tileable panel texture, multiply-tinted a different
color per floor at level-load time rather than needing 10 separate texture
files, plus a shared amber hazard-stripe texture for turnstile/divider
walls) using the standard Wolfenstein wall-texturing math (the exact
wall-hit position becomes the texture's horizontal coordinate, with a
side/direction-based flip correction so textures don't mirror oddly); the
floor gained real per-pixel floor-casting (the classic Lodev-style
algorithm — for each screen row below the horizon, compute the world-space
floor position at both screen edges and step across it, sampling a tiled,
checkerboarded, per-floor-tinted texture per pixel) computed at a reduced
internal resolution and every other row for performance, then blitted up
blocky/unsmoothed to match the flat-shaded aesthetic; the badge pickup
switched from a drawn circle to Story Mode's existing gold trophy sprite;
the guard switched from a flat rectangle to Story Mode's existing guard
walk-cycle sprite, billboarded; and a first-person weapon view was added —
a 2-frame stun-pistol sprite (idle, and a recoil/muzzle-flash frame on
fire) newly generated via `tools/gen_fps_assets.py`, anchored bottom-center
with a light idle bob while walking. Content-wise: FPS Mode expanded from
Floor 1 only to all 10 floors, generated programmatically by one
parameterized layout function (varying map size, pillar count, and guard
count/speed by floor index, deterministically — not hand-typed ASCII art
for all 10) rather than porting Story Mode's bespoke platform-level
geography; clearing a floor's badges and reaching its elevator alcove now
advances to the next floor instead of ending the run, with guard count
stepping from 1 to 2 and guard speed increasing on floors 6-10, mirroring
Story Mode's own established "tougher back half" pattern. Every one of the
10 generated floor layouts (player start, all 4 badges, every guard's
start position and patrol waypoints, both exit-alcove cells) was verified
fully connected and reachable via a standalone Node flood-fill script
before any of it was wired into the browser, the same verify-before-wire
discipline used for Floor 1's original layout. `tools/e2e-fps-test.js` was
extended to a 35-check suite covering per-floor guard counts, the floor-
advance flow (badges reset, HUD floor counter updates, state stays
"playing" rather than ending the run), a full-campaign win via a new
`__debugSkipToFloor()` QA hook, and a pixel-sampling check confirming the
first-person weapon actually renders; the pre-existing 27-check regression
suite was re-run again and still passes clean.

A further follow-up ("can direction in fps be controlled by mouse but
movement be in keyboard itself... in story mode... to defeat final boss...
add something like to collect gun from a guard and defeat final boss with
the gun... in fps need a bit more graphics and more rooms with doors like
in wolfenstein 3d... and some more missions and quests in it like hidden
stuffs... like hacking a computer... near gate or lobby") bundled five
genuinely separate asks, three of which had real ambiguity worth resolving
before writing code: whether the boss gun should replace or add to the
existing stun-3-times fight, where the hacking terminal should live
(a mandatory gate before Floor 1, or an optional station inside it), and
how far the room/door redesign should go (Floor 1 only, or every floor).
Claude asked all three as a single multiple-choice round before touching
any file; the user picked "gun adds a new attack, stun still works too,"
"inside Floor 1's existing lobby," and "redesign all 10 floors"
(the recommended, most thorough option) respectively — the implementation
below follows exactly those three answers.

**FPS Mode mouse-look:** clicking the canvas now requests the browser's
Pointer Lock API; while locked, `mousemove`'s `movementX` rotates the
camera every frame and Left/Right switch from turning to strafing
(perpendicular movement relative to the current facing) — Up/Down always
walk forward/back regardless of lock state. Releasing the lock (Esc, the
browser's own gesture) falls back to the original keyboard-only turning
instantly, so mouse-look is additive, never required. A small on-canvas
banner reminds the player it's available until they click once. Since
real OS-level Pointer Lock can't be reliably granted in a headless test
browser, two QA-only hooks (`__debugSetPointerLocked`,
`__debugRotate`) drive the exact same strafe-vs-turn/angle-update code
the real event listeners do, so the mechanic is still exercised for real
by the automated suite, just without depending on a flaky OS grant.

**FPS Mode multi-room floors with doors:** every floor's layout generator
was rewritten from the old two-room entrance-hall/lobby split to a real
six-room (3x2) dungeon — carved programmatically (room rectangles by
formula, not hand-typed ASCII art, continuing the project's verify-before-
wire discipline), connected by a spanning-tree "snake" path of doors (plus
one extra door per floor, alternating by floor index, for a bit of loop
variety beyond a straight chain) instead of the old single turnstile gap.
Doors are a new grid cell type with their own live state (`open`,
`closeTimer`, `anim` 0-1) updated every frame: any mover within a small
radius of a door's center opens it, and it auto-closes a couple of seconds
after the last one leaves. Both the DDA wall-hit loop and the shared
`isWall()` collision helper treat a door as solid until its `anim` clears
a near-fully-open threshold, so the exact same state drives rendering,
player collision, and guard line-of-sight/movement — a guard mid-chase can
walk through a door the player opened, and can spot the player through an
open doorway, for free, because line-of-sight already goes through
`isWall()`. The open/close texture reads as a "slide" by shifting the
sampled texture column horizontally by the live `anim` value — a cheap
trick within this column-based renderer rather than true 3D animation, and
called out as a deliberate simplification in Known Limitations. Guards now
patrol confined to a single room (two waypoints inside their room's
interior) rather than crossing doors on their own patrol route, which
sidesteps an entire class of "guard stuck at a closed door" bugs while
still letting a *chasing* guard follow the player through an open one.
Every one of the 10 regenerated floors' checkpoints (player start, all 4
badges, every guard's start/waypoints, both exit cells, Floor 1's
terminal) — plus every door cell itself, confirmed to actually sit between
two floor cells rather than being stranded — was verified reachable via a
rebuilt standalone Node flood-fill script (treating door cells as
passable, since they can always be opened) before any of it was wired into
the browser, the same discipline used for every floor-generation change in
this project so far.

**Floor 1 hacking-terminal side-quest:** a new billboarded computer
terminal (its own asset, `fps-terminal.png`) sits in Floor 1's starting
room. Standing close enough shows a "Press E to hack" on-canvas prompt;
pressing E (a new `input.interact` flag on the shared input object,
one-shot-per-press like the existing `input.fire`, bound to KeyE in
`game.js`) opens a small multiple-choice mini-puzzle rendered into the
same `#fpsOverlay` div and `.story-panel` styling Story Mode's own
terminal/riddle panels already use, pausing gameplay (a new `"terminal"`
module state, mirroring how `"loading"` already pauses the FPS update
loop) while it's open. A correct answer marks it permanently hacked and
grants a bonus stun charge; a wrong one just shows inline feedback and
lets the player try again — no penalty, no lockout, since the brief called
this out as a purely optional objective, never a required gate. Doubles as
this mode's "hidden stuff" ask — the terminal isn't required to clear the
floor, but a thorough player will notice and investigate it.

**Story Mode's boss gun pickup:** one specific guard on Floor 5
(`floors-data.js`'s new `carriesGun` flag) now drops a second pickup —
alongside its normal charge pickup, offset so the two don't overlap —
the first time it's stunned. Walking over it sets `player.hasGun = true`
for the rest of the floor. From then on, firing (the same Fire key/button)
checks the boss first: if it's awake, undefeated, and within the gun's
longer range and facing, the shot is unlimited-ammo and calls the exact
same `boss.paralyze()` an ordinary stun hit would — since `guards.js`'s
`Boss` class already tracks hits generically regardless of caller, the gun
and the stun ability both contribute to the same `hitsTaken` counter for
free, which is exactly what "an additional attack, stun still works too"
requires: no separate health pool, no risk of the two mechanics
disagreeing about how close the boss is to going down. If the boss isn't
in gun range/facing, the fire key falls through to the ordinary
charge-consuming stun path unchanged, so a player without the gun (or
choosing to save it) sees no behavior difference at all. `floors-data.js`
also gained a `boss.gunHint` field surfaced through `story.js`'s existing
`challengeHint()`, so the pre-floor briefing calls out the pickup by name.

All of the above was verified the same way as every prior revision in this
project: `tools/e2e-fps-test.js` was rewritten (the old two-room-layout
coordinates it asserted against no longer exist) into a 53-check suite
covering asset loading, weapon rendering, the new door count and terminal
per floor, mouse-look's strafe-vs-turn and angle-change behavior (via the
QA hooks above), the terminal mini-puzzle's wrong/correct-answer paths and
reward, floor-progression through the new room-based exit alcoves, the
full 10-floor win/lose flows, and a rebuilt directional-detection check
(now driven by a new `__debugCanGuardDetect()` hook against the guard's
own live facing angle, since the old fixed-coordinate version assumed the
old map layout); `tools/e2e-phase4-test.js` gained six new checks
specifically isolating the gun-pickup mechanic (exactly one Floor 5 guard
is flagged, stunning it drops a gun pickup distinct from a charge pickup,
the gun isn't granted until the pickup is actually collected, picking it
up doesn't itself land a hit, and — the important regression guard —
ordinary stun charges still work normally on other guards after the gun
is acquired). Both suites pass 100% (53/53 and 34/34 respectively), and
the whole flow was additionally spot-verified with real screenshots: the
new multi-room Floor 1 view with the mouse-look hint banner and terminal
prompt, a door mid-render next to a decorative hazard-striped wall
section, the terminal mini-puzzle panel, and the boss-gun pickup dropping
and being acquired with its own HUD readout.

In the latest pass, two more asks arrived together: "in story keep a new
key to fire gun... gun should kill guards too and the boss... also make it
more interesting and more levels like super mario," and, separately, "in
fps... there are no fun.. it's just a run game with no end or fun... make
it more challenging... add more challenges like a adventure game." Both
had real ambiguity worth resolving first — whether the gun should one-shot
or take multiple hits against ordinary guards, whether "more levels like
Super Mario" meant new floors or Mario-style mechanics layered onto the
existing 10, and which direction "more of an adventure game" should take
FPS Mode in. Claude asked a single four-question round before touching any
file; the answers were "multiple hits needed," "new mechanics, no new
floors," and "combat + puzzles" respectively — everything below follows
those three answers exactly (the fourth question's own recommended option
resolved into the second and third once combined).

**Story Mode's gun got its own key and can now kill.** Firing the Floor 5
boss gun no longer shares the stun ability's key — a new edge-triggered
`input.gunFire` field, bound to **G**, drives a new `tryFireGun()` in
`platformer.js` that targets any live guard in range, not just the boss.
Against the boss it still just calls the same `paralyze()` override as
before (`Boss.takeGunHit()`), so the existing three-hit fight is untouched.
Against an ordinary `SecurityGuard`, a new `takeGunHit()` method tracks a
separate `gunHitsTaken` counter from the existing temporary `paralyzed`
state — a single hit only paralyzes it (same as a stun charge), a second
permanently sets a `killed` flag that skips it in `update()`/`draw()` and
excludes it from touch-fail and re-targeting for the rest of the floor.

**Mario-style bonus content** — coins, a shield power-up, stompable
minions, and a small moving platform — is generated per floor from that
floor's own `platforms` array in `floors-data.js` rather than hand-placed,
scoped deliberately to mechanics-only (no new floors, and no lives/
continues system either — the latter was Claude's own call, to preserve
the game's existing "one mistake ends it" *Dangerous Dave* tension rather
than undermine it with respawns; called out here since it's a partial
scope narrowing from the literal word "Mario"). Getting the placement
algorithm right took three iterations, each caught by a real regression
rather than assumed safe: the first pass's segment-filtering was broken
badly enough that some floors got almost no usable spots at all (Floor 4
landed one candidate total, which a "convert the last coin to the shield"
step then cannibalized down to zero coins); a rewrite generating candidate
tiles at a segment's own 1/3 and 2/3 marks fixed that, but a physics-driven
autopilot re-run of Floor 1 caught a floating moving-platform anchored
directly in the airspace of a raised ledge feeding a trophy, blocking the
jump onto it; and a further pass — reserving not just a trophy/terminal's
exact tile but the tile directly below it (they're drawn standing one row
above their own platform), and shrinking a minion's patrol margin to stay
clear of any such reserved column within reach, not just its rest position
— fixed a case where a minion parked directly beneath a terminal marker on
Floor 7 could overlap it, blocking a choice-terminal touch. All of it is
still placed defensively by rule (never the player's own tile, never a
required trophy/terminal/door, never a guard's tile), just checked more
thoroughly than the first pass managed.

**FPS Mode traded "no fun" for real risk and reward.** A guard's touch now
costs health from a 100-point bar (with a brief invulnerability window and
a red screen-flash) instead of ending the run on first contact — the
existing stun-charge pool is reframed as capped ammo rather than a
disappearing resource. Every floor hides a keycard (unlocking one of that
floor's doors — verified safe by tracing `ROOM_PATH`'s spanning tree, which
already reaches all six rooms without it, so it's always an optional
shortcut, never a required path), an ammo cache, and a health cache, placed
in corners clear of guard waypoints and badge tiles. The old Floor-1-only
hacking terminal generalized to every floor via a new five-question pool
(`TERMINAL_POOL`), one per floor by index. And Floor 10 gained a proper
final encounter: a dormant `FpsBoss` (**The Sentinel**) that's absent from
the guard list — and the minimap — until every badge on the floor is
collected, then wakes and has to be stunned down three times before the
exit's win-check passes.

Verification followed the same discipline as every prior pass:
`tools/e2e-fps-test.js` was rewritten into a 69-check suite covering the
health/damage system, ammo pickups, the keycard/locked-door flow (including
a new `__debugGridValueAt()` hook to assert the grid cell itself flips from
locked to open), every floor's own hacking terminal, and the full Sentinel
sequence (badges wake it, the exit stays locked while it's up, defeating it
clears the floor); `tools/e2e-phase4-test.js` gained new sections for the
gun-fire key's two-hit guard kill and the Mario-content mechanics (coin
collection banking score, shield immunity surviving a minion touch, and the
Floor 1 trophy run — the one section of the suite driven by a real physics
autopilot rather than debug teleports — still clearing all three trophies
with the new bonus content live on the floor). Both suites finished
green: **69/69** and **46/46**.

In the most recent pass, the user supplied a three-pose pixel-art character
sheet (running-left, an aim/portrait pose with a raised gun, and
walk-right) and asked for it to become "the final boss," used in FPS Mode
"as needed" too, plus two smaller fixes: Floor 5's persistent clue box was
covering the game view, and neither mode had a fullscreen option.

**The villain reskin.** A new `tools/gen_villain_boss_sprite.py` crops the
sheet's three poses (bounding boxes found by masking the source against
its flat background) and rebuilds both games' boss art from them, mirroring
the styling of the art it replaces so it drops in without new code paths.
Story Mode's Auditor (`guards.js`'s `Boss.draw()`) already read its
portrait from `window.SPRITES.bossFace`/`bossFaceDefeated` — regenerating
`img/boss-face.png` and `img/boss-face-defeated.png` from the aim pose
(light-vignetted, red-duotoned to match the existing "final boss" treatment,
plus a desaturated defeated variant) needed zero code changes. FPS Mode's
Sentinel had no equivalent: it was just the ordinary guard sprite with a
CSS `hue-rotate` filter. It now gets a dedicated `img/sentinel-guard.png`
— a two-frame walk cycle built from the walk-right pose and a
horizontally-flipped running-left pose (so both frames face the same way),
background alpha-keyed out and lightly duotoned, wired into `fps.js`'s
`drawSprites()` as a new branch that only applies to `sp.g.isBoss`,
falling back to the old recolored-guard art if the new sprite somehow
hasn't loaded.

**Floor 5's clue box, fixed properly rather than just shrunk.** The
persistent "choice" mode clue panel (`drawChoiceClue()` in
`platformer.js`) used to span nearly the canvas's full width and grow
however tall its question and option count needed, pinned to the bottom —
harmless on a plain choice floor, but on Floor 5 specifically (four-plus
options, a boss looming, ground-level platforms and a hunting guard all in
the same lower third of the screen) it was tall and wide enough to
genuinely block the view. It's now a fixed 200px-wide card with wrapped
option text so nothing gets truncated. The first attempt anchored it
top-right, matching a natural "reminder panel" instinct — but that turned
out to be exactly where `drawStoryNote()`'s "note found" toast already
lives, so the two overlapped each other in testing. It was moved to the
bottom-right corner instead, the one screen-space position nothing else in
either HUD layer claims.

**Fullscreen.** A shared `UI.bindFullscreenToggle(btnId, screenId)` in
`ui.js` wires a new HUD button in all three modes to the browser's
Fullscreen API on that mode's whole `<section>` (HUD, canvas, and touch pad
together, not just the canvas, so on-screen controls stay reachable), with
a small CSS rule relaxing Story/FPS Mode's normal 900px canvas cap while
fullscreen so the view actually fills the display rather than floating
small in a black frame. It fails soft — no Fullscreen API support, or a
denied request, and the button either hides itself or just no-ops rather
than throwing.

`tools/e2e-phase4-test.js` and `tools/e2e-fps-test.js` each gained checks
for the new art loading (`window.SPRITES.bossFace`/`sentinelGuard`,
`naturalWidth > 0`) and for each mode's Fullscreen button existing and
surviving a click without erroring — the latter needed an explicit
`exitFullscreen()` afterward once it turned out headless Chromium actually
grants the request here, which had been quietly swallowing every later
click in the same test run until that was caught. Both suites finished
green: **72/72** and **51/51**.

The most recent pass was a three-section design brief covering all three
modes at once: structure Story Mode's ten floors into three acts that
introduce mechanics gradually, give FPS Mode three distinct level
archetypes so its floors stop feeling interchangeable, and convert Arcade
Mission into an endless roguelite with escalation, a reworked combo, and
draftable perks.

Four things in that brief conflicted with what was already built, so Claude
resolved them up front with a single `AskUserQuestion` round rather than
guessing: the acts named floors 4-7 "Server Farms" when those floors are
already IT Helpdesk / Legal / NOC / Executive Suite and Floor 5 already had
a boss; FPS Mode had 10 procedural floors, not the three the brief
described; Arcade already had a combo system and time-based difficulty
scaling; and the combo spec described "stealth takedowns or FPS kills" in a
mode that has neither. The answers were to **keep the existing floors and
layer the new mechanics onto them** (adding a Floor 10 boss without
removing Floor 5's), **spread the three archetypes across the existing 10
FPS floors** rather than cutting to three, **drop the 60-second timer for a
true endless run**, and **earn the Arcade combo from rapid pickups plus
drone stuns** — which meant giving Arcade its own EMP stun, since it had no
such mechanic to build on.

**Story Mode's three acts** are additive by design: every new hazard is a
`kind` field on a floor's existing guard entries, or a new optional array
(`lightSwitches` / `lasers` / `vents`) that's simply absent on floors that
don't use it, so a floor authored before any of this existed behaves
identically. `SpotlightDrone` is deliberately NOT a `SecurityGuard`
subclass — it flies and detects by cone geometry rather than a same-walkway
box, so almost nothing in the base class would have applied — but it
implements the same `paralyze`/`takeGunHit`/`getBounds` surface, which
means the stun ability, the gun, and every draw/update loop pick it up for
free. `TrackerHound` and `EliteGuard` do extend `SecurityGuard`, with the
hound re-implementing the chase flow rather than parameterizing the base
class so ordinary guards keep their exact existing tuning. Floor 10's
`FinalBoss` extends the Revision 6 `Boss` and adds the phase machine: an
`invulnerable` window between phases where `paralyze()` returns early,
which the touch-fail check also respects so bumping a recompiling boss
doesn't end the run either.

**FPS Mode's archetypes** branch `buildFloorLayout()` on room size and
interior contents, keeping the six-room spanning tree that makes a floor
completable untouched. That distinction mattered: the interior obstacles
are carved AFTER the rooms are hollowed out, and several entity positions
are corner-relative — so a rack or a pillar could land exactly on one. A
flood-fill reachability check over the live grid (now a permanent part of
the FPS suite) caught **keycards spawning inside server racks on five
separate floors**: invisible, uncollectable, and gating a door. The fix was
a `nearestOpenPoint()` snap applied to every spawned entity rather than
reasoning harder about the geometry. The same check later caught a tunnel
pillar landing on the player's own start tile, which spawned them embedded
in a wall unable to move forward at all.

**Arcade's roguelite conversion** replaces the clock with a 100-point
integrity bar, makes `escalationFor(floor)` the single source of the
difficulty curve (compounding, not linear — linear growth flattens into a
plateau a player can hold forever, which is exactly the failure mode the
mode change exists to avoid), and seeds extra obstacles on top of the six
hand-authored zones rather than regenerating them. Both the obstacle
seeding and the perk draft use small deterministic LCGs keyed off the floor
number, so a given floor always looks the same within a run — a roguelite
wants escalating pressure, not unrepeatable noise. Perks are pure state
mutations on one `run` object, so the game loop never has to know which
perks exist; it just reads the fields they set.

Verification followed the same discipline as every prior pass, and caught
real bugs at every stage: the sniper post was spawning inside its own rack
cover (silently disabling the entire lock-on mechanic), `__debugForceDefeatBoss()`
stalled forever on the new invulnerable phase window, and the FPS suite's
directional-detection check was passing for the wrong reason once tunnel
rooms shrank — its "behind" probe was landing in a wall, so it was testing
level geometry rather than the detection cone. Both suites were extended
rather than rewritten and finished green: **92/92** (FPS, up from 74) and
**80/80** (Story + Arcade, up from 51), plus a standalone reachability
sweep confirming every badge, pickup, terminal, sniper, barrel and exit is
reachable on all 10 FPS floors.

## Launch Instructions

No build step and no backend are required.

1. Download/unzip the project folder so `index.html`, `css/`, `js/`, and
   `img/` sit side by side.
2. **Simplest:** double-click `index.html` to open it directly in Chrome or Edge.
3. **Recommended (avoids any local file-permission quirks and ensures the
   Google Fonts load cleanly):** serve the folder with any static file server, e.g.:
   ```bash
   npx serve .
   # or
   python3 -m http.server 8080
   ```
   then visit `http://localhost:8080` (or the port shown).

## Browser Compatibility

Built and tested for **Google Chrome** and **Microsoft Edge** (current versions),
per the competition requirement. It also runs in current Firefox and Safari,
since it only relies on standard Canvas 2D, Web Audio, and LocalStorage APIs —
no browser-specific code was used.

## Known Limitations

- Story Mode's ten platform/maze floors are genuinely challenging, and now
  that guards actively chase once they spot you (rather than just patrolling
  a fixed lane), staying out of sight range matters more than memorizing a
  patrol pattern — especially on later floors (Floor 9's Data Center
  Corridor in particular) that pack guards into tight spaces. There's no
  difficulty setting; every player faces the same hand-authored layout.
- Story Mode's floor content and order are fixed and hand-authored — the
  same 10 departments, in the same order, every run. Nothing about the
  run's length or floor sequence is randomized.
- Story Mode's Mario-style bonus content (coins, shield, minions, moving
  platform) is deliberately mechanics-only — no lives or continues were
  added alongside it, so the underlying floors are still "one mistake ends
  the run," matching the rest of the game rather than softening it.
- FPS Mode's guard-touch damage and Story Mode's instant-fail are two
  different difficulty philosophies by design (a first-person shooter
  reads as "take some hits" more naturally than a platformer does) — they
  are not meant to converge, and neither mode's balance was tuned to match
  the other's.
- Arcade Mission's classic **60-second timed run no longer exists** — it was
  replaced wholesale by the endless roguelite descent. `js/timer.js` is
  deliberately left in the project (nothing else depends on it) rather than
  deleted, so restoring the timed mode is a small change rather than a
  rewrite, but there is no in-game toggle between the two.
- The Arcade roguelite has **no run-to-run meta-progression** — perks last
  one run and nothing unlocks permanently. That's a deliberate scope line
  (the mode is a score-attack loop, not a campaign), but it does mean a bad
  early draft can't be compensated for outside the run itself.
- Story Mode's act mechanics are **authored per floor, not generated** —
  which floors carry a drone, a hound, a laser bank, a vent or a light
  switch is hand-placed in `floors-data.js`. The act boundaries (1-3 / 4-7 /
  8-10) are therefore fixed, and a floor can't surprise you with a mechanic
  its briefing didn't mention.
- FPS Mode's three archetypes are assigned **by floor index**, so the run
  always goes tunnels → datacenter → rooftop in that order. There's no
  shuffling, and no floor mixes two archetypes.
- Leaderboard scores are stored in the browser's LocalStorage only — they are
  per-device/per-browser and are not shared across players or devices.
- "Choice" mode floors' persistent clue reminder is a small fixed card in
  the canvas's bottom-right corner (shrunk from a full-width bottom bar
  that used to crowd out ground-level gameplay on Floor 5's boss gauntlet
  in particular — see Revision 11 below). At a fixed 200px wide it's a
  fraction of the old footprint, but on some floors it can still graze the
  level art in that specific corner; it isn't dismissible mid-floor.
- Background music and sound effects are generated procedurally with the Web
  Audio API rather than pre-recorded audio tracks, to keep the project fully
  self-contained with zero external asset dependencies.
- FPS Mode's 10 floors are procedurally generated (a 3x2 room grid,
  connected by a formula-driven spanning tree of doors, with badges/guards
  placed by formula) rather than hand-authored maze layouts like Story
  Mode's floors — they read as distinct spaces (different room sizes,
  guard counts, and per-floor wall/floor tint, all connected by real
  doorways) but don't have Story Mode's bespoke platform-level geography.
  Arcade Mission and Story Mode are unaffected by any of this.
- FPS Mode's doors are a binary open/closed state with a texture-slide
  visual transition, not a true animated 3D door sliding into a side
  wall — a deliberate simplification that still reads correctly and keeps
  the column-based raycaster's collision/rendering logic simple.
- FPS Mode's mouse-look relies on the browser's Pointer Lock API, which
  some embedded/iframe contexts restrict; keyboard-only turning (Left/
  Right, A/D) always works as a fallback regardless.
- The Arcade world layout (obstacle and collectible positions) is fixed
  rather than randomized per run, though obstacle speed and frequency scale
  up over time.
- No gamepad support; keyboard, WASD, and the on-screen touch d-pad are supported.

## Credits

Designed and built for the GameCraft 2026 competition brief:
**CYBER GUARDIAN: MISSION INDIGO**, extended with a Story Mode campaign at
the requester's direction.
