#!/usr/bin/env python3
"""
gen_dave_sprites.py
Procedurally draws the STORY MODE ("Dangerous Dave" homage) pixel art:
a chunky, low-color retro player sprite (idle/run/jump/climb), a side-view
patrol guard enemy (2-frame walk), and a platform tileset (ground, ladder,
trophy, door). Deliberately blockier / fewer shading steps than the Arcade
tileset, per the "story = pixelated, arcade = more graphics" split.

Produces (all in img/):
  dave-player.png   -- 1 row x 6 cols: idle, run1, run2, jump, climb1, climb2
  dave-guard.png     -- 1 row x 2 cols: walk1, walk2
  platform-tiles.png -- 1 row x 6 cols: ground, ladder, trophy, door-closed,
                         door-open, wall-deco
"""

from PIL import Image, ImageDraw
import os

SCALE = 4
OUTLINE = (2, 6, 23, 255)


def canvas(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def upscale(img, scale=SCALE):
    return img.resize((img.width * scale, img.height * scale), Image.NEAREST)


# ---------------------------------------------------------------- PLAYER ---
PW, PH = 14, 22  # small base canvas per player frame

CAP = (239, 68, 68, 255)        # red flat-brim cap (Dave nod)
CAP_DK = (185, 28, 28, 255)
SHIRT = (79, 70, 229, 255)      # indigo shirt
SHIRT_DK = (49, 46, 129, 255)
SKIN = (30, 41, 59, 255)        # visor/face plate (suited, no bare skin)
VISOR = (56, 189, 248, 255)
PANTS = (15, 23, 42, 255)
BOOTS = (2, 6, 23, 255)


def draw_player_frame(pose):
    img = canvas(PW, PH)
    d = ImageDraw.Draw(img)
    cx = PW // 2

    leg_a = 0
    leg_b = 0
    arm_swing = 0
    bob = 0
    climbing = False

    if pose == "run1":
        leg_a, leg_b, arm_swing = 2, -1, 2
    elif pose == "run2":
        leg_a, leg_b, arm_swing = -1, 2, -2
    elif pose == "jump":
        leg_a, leg_b, bob = -2, -2, -1
    elif pose == "climb1":
        climbing = True
        arm_swing = 1
    elif pose == "climb2":
        climbing = True
        arm_swing = -1

    # Cap
    d.rectangle([cx - 3, 1 + bob, cx + 3, 3 + bob], fill=CAP, outline=OUTLINE)
    d.rectangle([cx - 4, 3 + bob, cx + 4, 4 + bob], fill=CAP_DK, outline=OUTLINE)  # brim
    # Head / visor
    d.rectangle([cx - 3, 4 + bob, cx + 3, 7 + bob], fill=SKIN, outline=OUTLINE)
    d.rectangle([cx - 2, 5 + bob, cx + 2, 6 + bob], fill=VISOR)

    # Torso
    ty = 8 + bob
    d.rectangle([cx - 3, ty, cx + 3, ty + 6], fill=SHIRT, outline=OUTLINE)
    d.point([(cx - 1, ty + 2)], fill=(34, 197, 94, 255))

    if climbing:
        # Both arms up gripping the ladder, alternating slightly.
        d.rectangle([cx - 5, ty - 1 + max(0, -arm_swing), cx - 4, ty + 3 + max(0, -arm_swing)], fill=SHIRT_DK, outline=OUTLINE)
        d.rectangle([cx + 4, ty - 1 + max(0, arm_swing), cx + 5, ty + 3 + max(0, arm_swing)], fill=SHIRT_DK, outline=OUTLINE)
        d.rectangle([cx - 2, ty + 6, cx - 1, ty + 10], fill=PANTS)
        d.rectangle([cx + 1, ty + 6, cx + 2, ty + 10], fill=PANTS)
    else:
        d.rectangle([cx - 5, ty + 1 + max(0, arm_swing), cx - 4, ty + 5 + max(0, arm_swing)], fill=SHIRT_DK, outline=OUTLINE)
        d.rectangle([cx + 4, ty + 1 + max(0, -arm_swing), cx + 5, ty + 5 + max(0, -arm_swing)], fill=SHIRT_DK, outline=OUTLINE)
        ly = ty + 6
        d.rectangle([cx - 3, ly + max(0, leg_a), cx - 1, ly + 6 + max(0, leg_a)], fill=PANTS, outline=OUTLINE)
        d.rectangle([cx + 1, ly + max(0, leg_b), cx + 3, ly + 6 + max(0, leg_b)], fill=PANTS, outline=OUTLINE)
        d.rectangle([cx - 3, ly + 5 + max(0, leg_a), cx - 1, ly + 6 + max(0, leg_a)], fill=BOOTS)
        d.rectangle([cx + 1, ly + 5 + max(0, leg_b), cx + 3, ly + 6 + max(0, leg_b)], fill=BOOTS)

    return img


def build_player_sheet(path):
    poses = ["idle", "run1", "run2", "jump", "climb1", "climb2"]
    sheet = Image.new("RGBA", (PW * SCALE * len(poses), PH * SCALE), (0, 0, 0, 0))
    for i, pose in enumerate(poses):
        frame = upscale(draw_player_frame(pose))
        sheet.paste(frame, (i * PW * SCALE, 0), frame)
    sheet.save(path)
    print(f"wrote {path} ({sheet.width}x{sheet.height})")


# ----------------------------------------------------------------- GUARD ---
GW, GH = 14, 20

G_UNIFORM = (51, 65, 85, 255)
G_UNIFORM_DK = (30, 41, 59, 255)
G_CAP = (17, 24, 39, 255)
G_VISOR = (239, 68, 68, 255)
G_BOOTS = (2, 6, 23, 255)


def draw_guard_frame(step):
    img = canvas(GW, GH)
    d = ImageDraw.Draw(img)
    cx = GW // 2
    leg_a = 2 if step == 0 else -2
    leg_b = -2 if step == 0 else 2

    d.rectangle([cx - 3, 1, cx + 3, 3], fill=G_CAP, outline=OUTLINE)
    d.rectangle([cx - 3, 3, cx + 3, 6], fill=G_CAP, outline=OUTLINE)
    d.rectangle([cx - 2, 4, cx + 2, 5], fill=G_VISOR)

    ty = 7
    d.rectangle([cx - 3, ty, cx + 3, ty + 6], fill=G_UNIFORM, outline=OUTLINE)
    d.point([(cx - 1, ty + 2)], fill=G_VISOR)
    d.rectangle([cx - 5, ty + 1, cx - 4, ty + 5], fill=G_UNIFORM_DK, outline=OUTLINE)
    d.rectangle([cx + 4, ty + 1, cx + 5, ty + 5], fill=G_UNIFORM_DK, outline=OUTLINE)

    ly = ty + 6
    d.rectangle([cx - 3, ly + max(0, leg_a), cx - 1, ly + 6 + max(0, leg_a)], fill=G_UNIFORM_DK, outline=OUTLINE)
    d.rectangle([cx + 1, ly + max(0, leg_b), cx + 3, ly + 6 + max(0, leg_b)], fill=G_UNIFORM_DK, outline=OUTLINE)
    d.rectangle([cx - 3, ly + 5 + max(0, leg_a), cx - 1, ly + 6 + max(0, leg_a)], fill=G_BOOTS)
    d.rectangle([cx + 1, ly + 5 + max(0, leg_b), cx + 3, ly + 6 + max(0, leg_b)], fill=G_BOOTS)
    return img


def build_guard_sheet(path):
    sheet = Image.new("RGBA", (GW * SCALE * 2, GH * SCALE), (0, 0, 0, 0))
    for i in range(2):
        frame = upscale(draw_guard_frame(i))
        sheet.paste(frame, (i * GW * SCALE, 0), frame)
    sheet.save(path)
    print(f"wrote {path} ({sheet.width}x{sheet.height})")


# ------------------------------------------------------------------ TILES --
TS = 10  # small base tile canvas (upscaled x4 -> 40px tiles)

BRICK = (67, 56, 202, 255)
BRICK_LINE = (49, 46, 129, 255)
BRICK_HI = (99, 102, 241, 255)
LADDER_RAIL = (148, 163, 184, 255)
LADDER_RUNG = (203, 213, 225, 255)
TROPHY_GOLD = (250, 204, 21, 255)
TROPHY_DK = (161, 98, 7, 255)
DOOR_LOCKED = (100, 60, 60, 255)
DOOR_UNLOCKED = (34, 197, 94, 255)
WALL_BG = (15, 23, 42, 255)
WALL_BG_LINE = (30, 41, 59, 255)


def tile_ground():
    img = canvas(TS, TS)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, TS - 1, TS - 1], fill=BRICK, outline=OUTLINE)
    for y in (3, 7):
        d.line([(0, y), (TS - 1, y)], fill=BRICK_LINE)
    for x in (0, 5):
        d.line([(x, 0), (x, 3)], fill=BRICK_LINE)
    for x in (2, 7):
        d.line([(x, 3), (x, 7)], fill=BRICK_LINE)
    d.line([(0, 0), (TS - 1, 0)], fill=BRICK_HI)
    return img


def tile_ladder():
    img = canvas(TS, TS)
    d = ImageDraw.Draw(img)
    d.rectangle([1, 0, 2, TS - 1], fill=LADDER_RAIL)
    d.rectangle([TS - 3, 0, TS - 2, TS - 1], fill=LADDER_RAIL)
    for y in (1, 4, 7):
        d.rectangle([2, y, TS - 3, y + 1], fill=LADDER_RUNG)
    return img


def tile_trophy():
    img = canvas(TS, TS)
    d = ImageDraw.Draw(img)
    d.rectangle([3, 7, 6, 8], fill=TROPHY_DK)
    d.polygon([(2, 3), (7, 3), (6, 6), (3, 6)], fill=TROPHY_GOLD, outline=OUTLINE)
    d.line([(4, 2), (5, 2)], fill=TROPHY_GOLD)
    d.line([(1, 3), (2, 4)], fill=TROPHY_GOLD)
    d.line([(8, 3), (7, 4)], fill=TROPHY_GOLD)
    return img


def tile_door(unlocked):
    img = canvas(TS, TS)
    d = ImageDraw.Draw(img)
    color = DOOR_UNLOCKED if unlocked else DOOR_LOCKED
    d.rectangle([1, 0, TS - 2, TS - 1], fill=color, outline=OUTLINE)
    d.rectangle([2, 1, TS - 3, TS - 2], outline=(2, 6, 23, 180))
    knob = TROPHY_GOLD if unlocked else (80, 80, 80, 255)
    d.point([(TS - 4, TS // 2)], fill=knob)
    return img


def tile_wall_deco():
    img = canvas(TS, TS)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, TS - 1, TS - 1], fill=WALL_BG, outline=WALL_BG_LINE)
    d.rectangle([2, 2, TS - 3, TS - 3], outline=WALL_BG_LINE)
    return img


def build_tileset(path):
    tiles = [tile_ground(), tile_ladder(), tile_trophy(), tile_door(False), tile_door(True), tile_wall_deco()]
    sheet = Image.new("RGBA", (TS * SCALE * len(tiles), TS * SCALE), (0, 0, 0, 0))
    for i, t in enumerate(tiles):
        big = upscale(t)
        sheet.paste(big, (i * TS * SCALE, 0), big)
    sheet.save(path)
    print(f"wrote {path} ({sheet.width}x{sheet.height})")


if __name__ == "__main__":
    os.makedirs("img", exist_ok=True)
    build_player_sheet("img/dave-player.png")
    build_guard_sheet("img/dave-guard.png")
    build_tileset("img/platform-tiles.png")
