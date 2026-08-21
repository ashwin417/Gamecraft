#!/usr/bin/env python3
"""
gen_arcade_assets.py
Procedurally draws the ARCADE MISSION's upgraded visuals: a detailed prop
tileset (multi-tone shading, more detail than Story Mode's deliberately
blocky Dave-style art) and a bigger, more detailed top-down hero sprite
used exclusively by Arcade Mode.

Produces (all in img/):
  arcade-tileset.png    -- 1 row x 10 cols of detailed environment props
  guardian-detailed.png -- 4 rows (down/left/right/up) x 4 cols walk-cycle
"""

from PIL import Image, ImageDraw
import os

OUTLINE = (2, 6, 23, 255)


def canvas(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def upscale(img, scale):
    return img.resize((img.width * scale, img.height * scale), Image.NEAREST)


# ------------------------------------------------------------ PROP TILES ---
TS = 24
TSCALE = 2  # -> 48px tiles, more shading detail than Story's 40px blocky tiles


def tile_tree():
    img = canvas(TS, TS)
    d = ImageDraw.Draw(img)
    d.rectangle([10, 16, 13, 23], fill=(92, 64, 40, 255))
    d.rectangle([10, 16, 11, 23], fill=(120, 84, 52, 255))
    for cx, cy, r, tone in [(12, 9, 9, (22, 101, 52, 255)), (7, 12, 6, (21, 128, 61, 255)),
                             (17, 12, 6, (21, 128, 61, 255)), (12, 6, 6, (34, 197, 94, 255))]:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=tone, outline=OUTLINE)
    d.ellipse([9, 4, 13, 8], fill=(134, 239, 172, 255))
    return img


def tile_building_wall():
    img = canvas(TS, TS)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, TS - 1, TS - 1], fill=(30, 41, 59, 255))
    for y in range(0, TS, 6):
        shade = (51, 65, 85, 255) if (y // 6) % 2 == 0 else (41, 55, 75, 255)
        d.rectangle([0, y, TS - 1, y + 5], fill=shade)
        d.line([(0, y), (TS - 1, y)], fill=(15, 23, 42, 255))
    d.rectangle([4, 3, 9, 8], fill=(56, 189, 248, 120), outline=(56, 189, 248, 200))
    d.rectangle([15, 15, 20, 20], fill=(56, 189, 248, 90), outline=(56, 189, 248, 160))
    return img


def tile_turnstile():
    img = canvas(TS, TS)
    d = ImageDraw.Draw(img)
    d.rectangle([9, 2, 15, 22], fill=(67, 56, 202, 255), outline=OUTLINE)
    d.rectangle([10, 2, 12, 22], fill=(99, 102, 241, 255))
    for y in range(4, 20, 4):
        d.rectangle([6, y, 18, y + 2], fill=(56, 189, 248, 200))
    d.ellipse([9, 0, 15, 4], fill=(239, 68, 68, 255), outline=OUTLINE)
    return img


def tile_cubicle():
    img = canvas(TS, TS)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 8, TS - 1, TS - 1], fill=(67, 56, 202, 180), outline=(79, 70, 229, 255))
    for x in range(0, TS, 4):
        d.line([(x, 8), (x, TS - 1)], fill=(49, 46, 129, 160))
    d.rectangle([0, 6, TS - 1, 9], fill=(99, 102, 241, 255), outline=OUTLINE)
    return img


def tile_server_rack():
    img = canvas(TS, TS)
    d = ImageDraw.Draw(img)
    d.rectangle([2, 1, TS - 3, TS - 2], fill=(15, 23, 42, 255), outline=(34, 197, 94, 255))
    for i, y in enumerate(range(3, TS - 3, 4)):
        color = (34, 197, 94, 255) if i % 2 == 0 else (56, 189, 248, 255)
        d.rectangle([4, y, TS - 5, y + 2], fill=color)
        d.point([(TS - 6, y + 1)], fill=(255, 255, 255, 200))
    return img


def tile_monitor():
    img = canvas(TS, TS)
    d = ImageDraw.Draw(img)
    d.rectangle([3, 3, TS - 4, TS - 8], fill=(15, 23, 42, 255), outline=(56, 189, 248, 255))
    d.rectangle([5, 5, TS - 6, TS - 10], fill=(56, 189, 248, 90))
    for y in range(6, TS - 10, 3):
        d.line([(6, y), (TS - 7, y)], fill=(56, 189, 248, 200))
    d.rectangle([TS // 2 - 2, TS - 8, TS // 2 + 2, TS - 5], fill=(51, 65, 85, 255))
    d.rectangle([TS // 2 - 5, TS - 5, TS // 2 + 5, TS - 3], fill=(30, 41, 59, 255))
    return img


def tile_beam():
    img = canvas(TS, TS)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 9, TS - 1, 15], fill=(100, 116, 139, 220))
    d.rectangle([0, 9, TS - 1, 10], fill=(148, 163, 184, 255))
    d.rectangle([0, 14, TS - 1, 15], fill=(51, 65, 85, 255))
    for x in range(2, TS, 6):
        d.line([(x, 9), (x, 15)], fill=(51, 65, 85, 200))
    return img


def tile_floor_tech():
    img = canvas(TS, TS)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, TS - 1, TS - 1], fill=(15, 23, 42, 255))
    d.rectangle([0, 0, TS - 1, TS - 1], outline=(30, 41, 59, 255))
    d.point([(TS // 2, TS // 2)], fill=(56, 189, 248, 120))
    return img


def tile_pathway():
    img = canvas(TS, TS)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, TS - 1, TS - 1], fill=(100, 116, 139, 180))
    d.line([(0, 0), (TS - 1, 0)], fill=(148, 163, 184, 200))
    d.line([(0, TS - 1), (TS - 1, TS - 1)], fill=(71, 85, 105, 200))
    return img


def tile_rack_goal():
    img = canvas(TS, TS)
    d = ImageDraw.Draw(img)
    d.rectangle([1, 1, TS - 2, TS - 2], fill=(15, 23, 42, 255), outline=(34, 197, 94, 255))
    for i, y in enumerate(range(3, TS - 3, 3)):
        color = (34, 197, 94, 255) if i % 2 == 0 else (56, 189, 248, 255)
        d.rectangle([3, y, TS - 4, y + 1], fill=color)
    d.rectangle([TS // 2 - 3, TS // 2 - 3, TS // 2 + 3, TS // 2 + 3], outline=(250, 204, 21, 255))
    return img


def build_tileset(path):
    tiles = [tile_tree(), tile_building_wall(), tile_turnstile(), tile_cubicle(), tile_server_rack(),
             tile_monitor(), tile_beam(), tile_floor_tech(), tile_pathway(), tile_rack_goal()]
    sheet = Image.new("RGBA", (TS * TSCALE * len(tiles), TS * TSCALE), (0, 0, 0, 0))
    for i, t in enumerate(tiles):
        big = upscale(t, TSCALE)
        sheet.paste(big, (i * TS * TSCALE, 0), big)
    sheet.save(path)
    print(f"wrote {path} ({sheet.width}x{sheet.height})")


# ---------------------------------------------------------- HERO SPRITE ---
HW, HH = 20, 28
HSCALE = 3

SUIT = (79, 70, 229, 255)
SUIT_MID = (99, 102, 241, 255)
SUIT_DK = (49, 46, 129, 255)
HELMET = (30, 41, 59, 255)
HELMET_HI = (51, 65, 85, 255)
VISOR = (56, 189, 248, 255)
VISOR_HI = (165, 243, 252, 255)
BOOTS = (15, 23, 42, 255)
TRIM = (34, 197, 94, 255)
VENT = (100, 116, 139, 255)

DIRECTIONS = ["down", "left", "right", "up"]


def draw_hero(direction, frame_idx):
    img = canvas(HW, HH)
    d = ImageDraw.Draw(img)
    cx = HW // 2

    stride = [0, 2, 0, -2][frame_idx % 4]
    bob = 1 if frame_idx % 4 == 2 else 0
    arm_swing = [0, -2, 0, 2][frame_idx % 4]

    # Backpack vent (reads from any angle, adds detail depth)
    d.rectangle([cx - 4, 12 - bob, cx + 4, 20 - bob], fill=VENT, outline=OUTLINE)
    d.rectangle([cx - 3, 13 - bob, cx + 3, 14 - bob], fill=(148, 163, 184, 255))

    # Helmet
    hy = 2 - bob
    d.ellipse([cx - 5, hy, cx + 5, hy + 8], fill=HELMET, outline=OUTLINE)
    d.ellipse([cx - 5, hy, cx + 5, hy + 3], fill=HELMET_HI)

    if direction == "down":
        d.rectangle([cx - 3, hy + 3, cx + 3, hy + 6], fill=VISOR)
        d.rectangle([cx - 3, hy + 3, cx, hy + 4], fill=VISOR_HI)
    elif direction == "up":
        d.rectangle([cx - 4, hy + 1, cx + 4, hy + 3], fill=HELMET_HI)
    elif direction == "left":
        d.rectangle([cx - 5, hy + 3, cx - 1, hy + 6], fill=VISOR)
        d.point([(cx - 4, hy + 4)], fill=VISOR_HI)
    elif direction == "right":
        d.rectangle([cx + 1, hy + 3, cx + 5, hy + 6], fill=VISOR)
        d.point([(cx + 4, hy + 4)], fill=VISOR_HI)

    # Torso
    ty = hy + 9
    d.rounded_rectangle([cx - 6, ty, cx + 6, ty + 10], radius=2, fill=SUIT, outline=OUTLINE)
    d.rectangle([cx - 6, ty, cx - 2, ty + 10], fill=SUIT_MID)
    d.rectangle([cx - 1, ty + 3, cx + 1, ty + 5], fill=TRIM)
    d.line([(cx - 4, ty + 7), (cx + 4, ty + 7)], fill=SUIT_DK)

    # Arms
    ay = ty + 1
    d.rectangle([cx - 9, ay + max(0, arm_swing), cx - 7, ay + 7 + max(0, arm_swing)], fill=SUIT_DK, outline=OUTLINE)
    d.rectangle([cx + 7, ay + max(0, -arm_swing), cx + 9, ay + 7 + max(0, -arm_swing)], fill=SUIT_DK, outline=OUTLINE)

    # Legs
    ly = ty + 10
    la = max(0, stride)
    lb = max(0, -stride)
    d.rectangle([cx - 5, ly + la, cx - 1, ly + 8 + la], fill=SUIT_DK, outline=OUTLINE)
    d.rectangle([cx + 1, ly + lb, cx + 5, ly + 8 + lb], fill=SUIT_DK, outline=OUTLINE)
    d.rectangle([cx - 5, ly + 6 + la, cx - 1, ly + 8 + la], fill=BOOTS)
    d.rectangle([cx + 1, ly + 6 + lb, cx + 5, ly + 8 + lb], fill=BOOTS)

    return img


def build_hero_sheet(path):
    sheet = Image.new("RGBA", (HW * HSCALE * 4, HH * HSCALE * len(DIRECTIONS)), (0, 0, 0, 0))
    for row, direction in enumerate(DIRECTIONS):
        for col in range(4):
            frame = upscale(draw_hero(direction, col), HSCALE)
            sheet.paste(frame, (col * HW * HSCALE, row * HH * HSCALE), frame)
    sheet.save(path)
    print(f"wrote {path} ({sheet.width}x{sheet.height})")


if __name__ == "__main__":
    os.makedirs("img", exist_ok=True)
    build_tileset("img/arcade-tileset.png")
    build_hero_sheet("img/guardian-detailed.png")
