"""
gen_boss_sprite.py
Generates the Floor 5 boss portrait sprite from a source selfie:
crop -> punch up contrast/saturation -> blocky pixelate (BOX downsample +
NEAREST upscale, so it reads as chunky pixel art rather than a blurred
photo) -> a villain-red duotone blend for "final boss" menace -> a soft
circular vignette alpha mask so it reads as a floating portrait badge in
the game rather than a hard rectangle -> a matching desaturated
"defeated" variant for after the third stun hit.

Run: python3 tools/gen_boss_sprite.py
Outputs: img/boss-face.png, img/boss-face-defeated.png
"""
from PIL import Image, ImageOps, ImageEnhance
import math
import os

SRC = "tools/boss_src/source.jpg"
CROP = (680, 1280, 2020, 3350)  # left, top, right, bottom -- hand-picked face crop
BLOCKS_W = 34
FINAL_W = 306

os.makedirs("img", exist_ok=True)


def pixelate(crop):
    aspect = crop.height / crop.width
    blocks_h = round(BLOCKS_W * aspect)
    small = crop.resize((BLOCKS_W, blocks_h), Image.BOX)
    scale = FINAL_W / BLOCKS_W
    final_h = round(blocks_h * scale)
    return small.resize((FINAL_W, final_h), Image.NEAREST), final_h


def apply_vignette_alpha(img):
    """Soft circular fade to transparent at the edges so the portrait reads
    as a floating badge, not a hard-edged rectangle, when drawn over the
    game's dark level backdrop."""
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


def main():
    im = Image.open(SRC).convert("RGB")
    crop = im.crop(CROP)
    crop = ImageEnhance.Contrast(crop).enhance(1.12)
    crop = ImageEnhance.Color(crop).enhance(1.15)

    pixelated, _ = pixelate(crop)

    # Villain red/amber duotone, blended back over the pixel-art color so it
    # stays a recognizable portrait rather than a flat silhouette.
    gray = ImageOps.grayscale(pixelated)
    def ramp(v):
        v = v / 255
        return (int(20 + v * 225), int(6 + v * 60), int(10 + v * 40))
    duo = Image.new("RGB", gray.size)
    duo.putdata([ramp(v) for v in gray.getdata()])
    boss = Image.blend(pixelated, duo, 0.55)
    boss = apply_vignette_alpha(boss)
    boss.save("img/boss-face.png")

    # Defeated variant: desaturated + darkened, same pixel grid, for the
    # "knocked out" state after the third stun hit.
    defeated_base = ImageOps.grayscale(pixelated).convert("RGB")
    defeated_base = ImageEnhance.Brightness(defeated_base).enhance(0.55)
    defeated = Image.blend(defeated_base, Image.new("RGB", defeated_base.size, (10, 20, 30)), 0.35)
    defeated = apply_vignette_alpha(defeated)
    defeated.save("img/boss-face-defeated.png")

    print("Wrote img/boss-face.png", boss.size)
    print("Wrote img/boss-face-defeated.png", defeated.size)


if __name__ == "__main__":
    main()
