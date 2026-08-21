"""
gen_villain_boss_sprite.py
Rebuilds both games' final-boss art from a single user-supplied character
sheet (tools/villain_src/source.png -- a 3-pose "different game positions"
sheet: running-left, aim/portrait, walk-right, already rendered in a
pixel-art style).

Produces:
  Story Mode boss (guards.js's Boss class, Floor 5's "The Auditor"):
    img/boss-face.png           -- the "aim" pose, front-on, gun raised
    img/boss-face-defeated.png  -- desaturated variant for after 3 hits
    (same 306px-wide canvas + villain-red duotone + circular vignette
    alpha treatment as the boss art it replaces, so it drops in with zero
    code changes -- see guards.js's Boss.draw().)

  FPS Mode boss (fps.js's FpsBoss class, Floor 10's "The Sentinel"):
    img/sentinel-guard.png -- a 1x2 walk-cycle sheet (56x80/frame, same
    frame geometry as img/dave-guard.png) built from the walk-right and
    running-left poses (the latter flipped so both frames face the same
    way), background alpha-keyed out, light villain-red duotone applied.
    Previously the Sentinel just reused the ordinary guard sprite with a
    CSS hue-rotate filter (see fps.js's drawSprites()) -- this replaces
    that with a dedicated sprite closer to the Story boss treatment.

Run: python3 tools/gen_villain_boss_sprite.py
"""
from PIL import Image, ImageOps, ImageEnhance
import math
import os

SRC = "tools/villain_src/source.png"
BG = (112, 112, 112)  # sampled flat background of the source sheet

# Hand-picked crop boxes (left, top, right, bottom) for each pose, found by
# masking the source against BG and reading off each pose's bounding box
# (see the session notes / tools/villain_src for how these were derived).
CROP_AIM = (490, 60, 890, 598)
CROP_RUN_LEFT = (30, 50, 490, 598)
CROP_WALK_RIGHT = (965, 50, 1335, 598)

FACE_FINAL_W = 306


def apply_vignette_alpha(img):
    """Soft circular fade to transparent at the edges -- mirrors
    gen_boss_sprite.py's treatment so the two bosses read as one visual
    family in the Story Mode HUD."""
    w, h = img.size
    cx, cy = w / 2, h * 0.46
    max_r = math.hypot(w * 0.62, h * 0.58)
    alpha = Image.new("L", (w, h), 0)
    px = alpha.load()
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx, y - cy) / max_r
            a = 255 if d < 0.72 else max(0, int(255 * (1 - (d - 0.72) / 0.28)))
            px[x, y] = a
    out = img.convert("RGBA")
    out.putalpha(alpha)
    return out


def red_duotone(img, amount):
    gray = ImageOps.grayscale(img)

    def ramp(v):
        v = v / 255
        return (int(20 + v * 225), int(6 + v * 60), int(10 + v * 40))

    duo = Image.new("RGB", gray.size)
    duo.putdata([ramp(v) for v in gray.getdata()])
    return Image.blend(img.convert("RGB"), duo, amount)


def build_story_boss():
    im = Image.open(SRC).convert("RGB")
    crop = im.crop(CROP_AIM)
    crop = ImageEnhance.Contrast(crop).enhance(1.08)
    crop = ImageEnhance.Color(crop).enhance(1.1)

    scale = FACE_FINAL_W / crop.width
    resized = crop.resize((FACE_FINAL_W, round(crop.height * scale)), Image.LANCZOS)

    boss = red_duotone(resized, 0.45)
    boss = apply_vignette_alpha(boss)
    boss.save("img/boss-face.png")

    defeated_base = ImageOps.grayscale(resized).convert("RGB")
    defeated_base = ImageEnhance.Brightness(defeated_base).enhance(0.55)
    defeated = Image.blend(defeated_base, Image.new("RGB", defeated_base.size, (10, 20, 30)), 0.35)
    defeated = apply_vignette_alpha(defeated)
    defeated.save("img/boss-face-defeated.png")

    print("Wrote img/boss-face.png", boss.size)
    print("Wrote img/boss-face-defeated.png", defeated.size)


def alpha_key(img, bg=BG, soft=42):
    """Turns the flat background transparent (graduated near edges so hair
    /fabric edges don't leave a hard halo), returns an RGBA image."""
    rgba = img.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            d = math.sqrt((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2)
            if d < soft:
                px[x, y] = (r, g, b, 0)
            elif d < soft * 2.2:
                px[x, y] = (r, g, b, int(255 * (d - soft) / (soft * 1.2)))
    return rgba


def fit_frame(img, frame_w, frame_h):
    """Scales (preserving aspect) to fit inside frame_w x frame_h and
    centers on a transparent canvas of exactly that size, feet aligned to
    the bottom edge (matches how dave-guard.png's frames are anchored)."""
    scale = min(frame_w / img.width, frame_h / img.height)
    new_w, new_h = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    resized = img.resize((new_w, new_h), Image.LANCZOS)
    canvas = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    canvas.paste(resized, ((frame_w - new_w) // 2, frame_h - new_h), resized)
    return canvas


def build_fps_sentinel():
    im = Image.open(SRC).convert("RGB")
    frame_w, frame_h = 56, 80

    walk_right = alpha_key(im.crop(CROP_WALK_RIGHT))
    run_left_flipped = alpha_key(ImageOps.mirror(im.crop(CROP_RUN_LEFT)))

    frame_a = fit_frame(walk_right, frame_w, frame_h)
    frame_b = fit_frame(run_left_flipped, frame_w, frame_h)

    # Light villain-red tint on the RGB channels only, alpha untouched --
    # a lighter touch than the Story portrait's 0.45 blend since this
    # sprite is small and needs to read clearly at a glance mid-chase.
    def tint(frame):
        rgb = red_duotone(frame.convert("RGB"), 0.28)
        out = rgb.convert("RGBA")
        out.putalpha(frame.split()[3])
        return out

    frame_a, frame_b = tint(frame_a), tint(frame_b)

    sheet = Image.new("RGBA", (frame_w * 2, frame_h), (0, 0, 0, 0))
    sheet.paste(frame_a, (0, 0), frame_a)
    sheet.paste(frame_b, (frame_w, 0), frame_b)
    sheet.save("img/sentinel-guard.png")
    print("Wrote img/sentinel-guard.png", sheet.size)


if __name__ == "__main__":
    os.makedirs("img", exist_ok=True)
    build_story_boss()
    build_fps_sentinel()
