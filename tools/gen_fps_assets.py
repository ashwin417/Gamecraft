#!/usr/bin/env python3
"""
gen_fps_assets.py
Procedurally draws the graphics FPS MODE ("Lobby Breach") needs beyond
flat fills: tileable wall/floor textures (drawn in near-grayscale so
fps.js can multiply-tint them a different color per floor at runtime,
without needing 10 separate texture images), a 2-frame first-person
weapon sprite (a forearm gripping the stun pistol, idle + firing), a
security door texture for the multi-room floor layouts, and a computer
terminal billboard sprite for the Floor 1 hacking side-quest.

Same chunky/low-color retro convention as gen_dave_sprites.py: draw at a
small base canvas, upscale with NEAREST for crisp blocky pixels.

Produces (all in img/):
  fps-wall-panel.png   -- 64x64 tileable wall texture (grayscale base,
                           multiply-tinted per floor at runtime)
  fps-wall-hazard.png  -- 64x64 tileable amber/black hazard-stripe
                           texture for turnstile/divider walls (used as-is,
                           not tinted -- a security-barrier motif shared by
                           every floor)
  fps-floor-tile.png   -- 32x32 tileable floor tile (grayscale base,
                           multiply-tinted + checkerboarded per floor at
                           runtime)
  fps-gun-hand.png     -- 1 row x 2 cols, 200x240 each: the first-person
                           stun-pistol view (idle, firing)
  fps-door.png          -- 64x64 security double-door texture for
                           room-to-room doorways (used as-is, not tinted,
                           same reasoning as the hazard stripe -- a door
                           should read the same on every floor)
  fps-terminal.png      -- a standing computer terminal/kiosk billboard
                           for the Floor 1 hacking side-quest, glowing
                           green screen so it reads as "interactive" at
                           a glance
"""

from PIL import Image, ImageDraw
import os

SCALE = 4
OUTLINE = (2, 6, 23, 255)


def canvas(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def upscale(img, scale=SCALE):
    return img.resize((img.width * scale, img.height * scale), Image.NEAREST)


# ------------------------------------------------------------- WALL PANEL --
# Drawn in near-white/gray so runtime multiply-tinting (per floor's color)
# preserves the groove/rivet shading pattern underneath any tint color.
def draw_wall_panel():
    W = H = 16
    img = canvas(W, H)
    d = ImageDraw.Draw(img)
    FILL = (232, 232, 238, 255)
    GROOVE = (150, 150, 158, 255)
    DEEP = (110, 110, 118, 255)
    HILITE = (255, 255, 255, 255)
    RIVET = (90, 90, 98, 255)

    d.rectangle([0, 0, W - 1, H - 1], fill=FILL)
    # Recessed panel border (grout line).
    d.rectangle([1, 1, W - 2, H - 2], outline=GROOVE, width=1)
    d.rectangle([2, 2, W - 3, H - 3], outline=DEEP, width=1)
    # Diagonal sheen for a bit of "fancier" depth.
    for i in range(-2, W, 4):
        d.line([(i, H - 1), (i + H, -1)], fill=HILITE, width=1)
    # Corner rivets.
    for (rx, ry) in [(2, 2), (W - 3, 2), (2, H - 3), (W - 3, H - 3)]:
        d.point((rx, ry), fill=RIVET)
        d.point((rx + 1, ry), fill=RIVET)
    return upscale(img)


# ------------------------------------------------------ HAZARD/DIVIDER ----
def draw_wall_hazard():
    W = H = 16
    img = canvas(W, H)
    d = ImageDraw.Draw(img)
    AMBER = (245, 158, 11, 255)
    AMBER_DK = (180, 110, 6, 255)
    BLACK = (20, 15, 5, 255)
    d.rectangle([0, 0, W - 1, H - 1], fill=AMBER_DK)
    # Diagonal hazard stripes.
    stripe_w = 3
    for i in range(-H, W + H, stripe_w * 2):
        d.polygon(
            [(i, H), (i + H, 0), (i + H + stripe_w, 0), (i + stripe_w, H)],
            fill=BLACK,
        )
    d.rectangle([0, 0, W - 1, H - 1], outline=AMBER, width=1)
    return upscale(img)


# --------------------------------------------------------------- FLOOR ----
def draw_floor_tile():
    W = H = 8
    img = canvas(W, H)
    d = ImageDraw.Draw(img)
    FILL = (225, 225, 232, 255)
    GROUT = (160, 160, 168, 255)
    DOT = (195, 195, 202, 255)
    d.rectangle([0, 0, W - 1, H - 1], fill=FILL)
    d.rectangle([0, 0, W - 1, H - 1], outline=GROUT, width=1)
    d.point((W // 2, H // 2), fill=DOT)
    return upscale(img, scale=4)


# ---------------------------------------------------- FIRST-PERSON GUN ----
SHIRT = (79, 70, 229, 255)
SHIRT_DK = (49, 46, 129, 255)
GLOVE = (30, 41, 59, 255)
GLOVE_HI = (56, 70, 94, 255)
GUN_BODY = (15, 23, 42, 255)
GUN_HI = (51, 65, 85, 255)
COIL = (56, 189, 248, 255)
COIL_DK = (14, 116, 144, 255)
FLASH = (224, 242, 254, 255)
FLASH_CORE = (255, 255, 255, 255)
BOLT = (250, 204, 21, 255)


def draw_gun_frame(firing):
    """Base canvas: 64x72, anchored so the gun/hand sits bottom-center
    when placed against the bottom edge of the weapon-view HUD panel.
    Flash geometry is kept well inside the top-left margin so recoil
    kick never clips it off-canvas."""
    W, H = 64, 72
    img = canvas(W, H)
    d = ImageDraw.Draw(img)

    kick = -3 if firing else 0  # recoil: the whole rig kicks up+back slightly

    # Forearm/sleeve, entering from the bottom-right corner.
    d.polygon(
        [(64, 72), (64, 40 + kick), (44, 26 + kick), (34, 36 + kick), (40, 72)],
        fill=SHIRT_DK,
    )
    d.polygon(
        [(64, 72), (64, 46 + kick), (48, 34 + kick), (40, 42 + kick), (44, 72)],
        fill=SHIRT,
    )
    d.line([(64, 40 + kick), (44, 26 + kick)], fill=OUTLINE, width=1)

    # Gloved hand/wrist gripping the pistol.
    hx, hy = 26 + kick, 32 + kick
    d.rectangle([hx, hy, hx + 13, hy + 14], fill=GLOVE, outline=OUTLINE)
    d.rectangle([hx, hy, hx + 13, hy + 4], fill=GLOVE_HI)

    # Pistol: grip (below/behind), body, barrel housing, trigger guard.
    gx, gy = 14 + kick, 14 + kick
    d.rectangle([gx + 10, gy + 16, gx + 20, gy + 30], fill=GUN_BODY, outline=OUTLINE)  # grip
    d.rectangle([gx + 4, gy + 22, gx + 12, gy + 27], outline=OUTLINE, width=1)  # trigger guard
    d.rectangle([gx, gy + 8, gx + 26, gy + 20], fill=GUN_BODY, outline=OUTLINE)  # body/slide
    d.rectangle([gx + 2, gy + 9, gx + 24, gy + 11], fill=GUN_HI)  # top sheen
    d.rectangle([gx - 8, gy, gx + 22, gy + 9], fill=GUN_BODY, outline=OUTLINE)  # barrel housing
    d.rectangle([gx - 8, gy, gx + 22, gy + 2], fill=GUN_HI)

    # Blue stun coil wound along the barrel.
    d.rectangle([gx - 6, gy + 2, gx + 18, gy + 7], fill=COIL_DK)
    for cx in range(gx - 5, gx + 18, 3):
        d.line([(cx, gy + 2), (cx, gy + 7)], fill=COIL, width=1)

    # Small charge-indicator light on the body.
    d.rectangle([gx + 20, gy + 12, gx + 24, gy + 16], fill=BOLT if firing else COIL, outline=OUTLINE)

    if firing:
        # Muzzle flash at the barrel tip, kept inside the canvas margin.
        fx, fy = max(10, gx - 8), max(8, gy - 2)
        d.polygon(
            [
                (fx, fy + 6), (fx - 6, fy + 2), (fx + 2, fy - 2),
                (fx - 6, fy - 6), (fx + 2, fy - 8), (fx + 6, fy - 3),
                (fx + 10, fy - 8), (fx + 8, fy),
            ],
            fill=FLASH,
        )
        d.ellipse([fx - 2, fy - 4, fx + 8, fy + 6], fill=FLASH_CORE)

    return upscale(img)


def build_gun_sheet():
    frame_w, frame_h = 64 * SCALE, 72 * SCALE
    sheet = canvas(frame_w * 2, frame_h)
    sheet.paste(draw_gun_frame(False), (0, 0))
    sheet.paste(draw_gun_frame(True), (frame_w, 0))
    return sheet


# --------------------------------------------------------------- DOOR -----
# A security double-door, drawn in its own fixed palette (not grayscale) --
# same reasoning as the hazard-stripe wall: a door should read as "a door"
# consistently no matter which floor's tint is active, not blend into it.
def draw_door():
    W = H = 16
    img = canvas(W, H)
    d = ImageDraw.Draw(img)
    FRAME = (51, 65, 85, 255)
    LEAF = (30, 41, 59, 255)
    LEAF_HI = (51, 65, 85, 255)
    SEAM = (15, 23, 42, 255)
    PANEL = (71, 85, 105, 255)
    LIGHT = (56, 189, 248, 255)
    HANDLE = (148, 163, 184, 255)

    d.rectangle([0, 0, W - 1, H - 1], fill=FRAME)
    # Two door leaves, inset from the frame, split by a vertical seam.
    d.rectangle([1, 1, 7, H - 2], fill=LEAF)
    d.rectangle([8, 1, W - 2, H - 2], fill=LEAF)
    d.line([(8, 0), (8, H - 1)], fill=SEAM, width=1)
    # Recessed panel detail on each leaf.
    d.rectangle([2, 2, 6, 7], outline=PANEL, width=1)
    d.rectangle([9, 2, 13, 7], outline=PANEL, width=1)
    d.rectangle([2, 9, 6, H - 3], outline=PANEL, width=1)
    d.rectangle([9, 9, 13, H - 3], outline=PANEL, width=1)
    # Door handles either side of the seam.
    d.rectangle([6, 7, 7, 9], fill=HANDLE)
    d.rectangle([8, 7, 9, 9], fill=HANDLE)
    # A small security status light above the seam.
    d.rectangle([7, 1, 8, 2], fill=LIGHT)
    return upscale(img)


# -------------------------------------------------------- HACK TERMINAL ---
def draw_terminal():
    """A standing computer terminal/kiosk for the Floor 1 hacking
    side-quest -- base canvas anchored bottom-center like the trophy/guard
    billboards so it plants correctly on the floor when drawn."""
    W, H = 40, 56
    img = canvas(W, H)
    d = ImageDraw.Draw(img)
    STAND = (51, 65, 85, 255)
    BASE = (30, 41, 59, 255)
    CHASSIS = (15, 23, 42, 255)
    CHASSIS_HI = (30, 41, 59, 255)
    SCREEN = (6, 20, 15, 255)
    GLOW = (34, 197, 94, 255)
    GLOW_DIM = (21, 128, 61, 255)
    KEY = (71, 85, 105, 255)

    # Floor base + pedestal.
    d.rectangle([8, H - 6, W - 9, H - 1], fill=BASE, outline=OUTLINE)
    d.rectangle([W // 2 - 3, H - 22, W // 2 + 2, H - 6], fill=STAND, outline=OUTLINE)

    # Monitor chassis.
    d.rectangle([4, 4, W - 5, H - 24], fill=CHASSIS, outline=OUTLINE)
    d.rectangle([4, 4, W - 5, 7], fill=CHASSIS_HI)

    # Screen + a few glowing "terminal text" lines.
    d.rectangle([7, 8, W - 8, H - 28], fill=SCREEN)
    for i, ly in enumerate(range(11, H - 30, 5)):
        color = GLOW if i % 2 == 0 else GLOW_DIM
        d.line([(9, ly), (9 + 14 + (i * 3) % 10, ly)], fill=color, width=1)

    # Small keyboard tray at the base of the monitor.
    d.rectangle([2, H - 24, W - 3, H - 20], fill=KEY, outline=OUTLINE)

    return upscale(img)


if __name__ == "__main__":
    os.makedirs("img", exist_ok=True)
    draw_wall_panel().save("img/fps-wall-panel.png")
    draw_wall_hazard().save("img/fps-wall-hazard.png")
    draw_floor_tile().save("img/fps-floor-tile.png")
    build_gun_sheet().save("img/fps-gun-hand.png")
    draw_door().save("img/fps-door.png")
    draw_terminal().save("img/fps-terminal.png")
    print("Wrote img/fps-wall-panel.png, img/fps-wall-hazard.png, "
          "img/fps-floor-tile.png, img/fps-gun-hand.png, "
          "img/fps-door.png, img/fps-terminal.png")
