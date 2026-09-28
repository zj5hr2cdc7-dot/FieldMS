#!/usr/bin/env python3
"""
Generate the PWA / iOS home-screen icons from public/fieldms-icon.png.

WHY THIS EXISTS
    The source icon is 1890x1417 — not square — and the logo occupies only
    438x358 in the middle of it, the rest being transparent padding. Two
    consequences on an iPhone:

      1. iOS squashes a non-square icon to fit, so the logo came out
         horizontally stretched on the home screen.
      2. iOS composites transparency onto BLACK. The logo is navy (#1b2f41)
         and green (#529a42), so the navy half was disappearing into the
         background.

    So every icon produced here is square and fully opaque on white, which is
    what the navy and green both read against.

USAGE
    python3 scripts/generate-icons.py

    Re-run after changing public/fieldms-icon.png. Outputs are committed, so
    this does not need to run at build time.
"""

from PIL import Image
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SOURCE = PUBLIC / "fieldms-icon.png"

BACKGROUND = (255, 255, 255, 255)

# scale = how much of the canvas width the logo occupies.
#
# 0.78 for the standard icons: iOS applies its own rounded-rectangle mask and
# clips very little, so the logo can be reasonably large.
#
# 0.58 for the maskable one: Android may crop to a circle, and the guaranteed
# safe zone is only the inner 80% — a logo any larger risks losing its edges.
OUTPUTS = [
    ("apple-touch-icon.png", 180, 0.78),   # iOS home screen
    ("icon-192.png",         192, 0.78),   # manifest, Android
    ("icon-512.png",         512, 0.78),   # manifest, splash screens
    ("icon-maskable-512.png", 512, 0.58),  # manifest, purpose: maskable
]


def build(source: Image.Image, size: int, scale: float) -> Image.Image:
    """Centre the trimmed logo on an opaque square canvas."""
    canvas = Image.new("RGBA", (size, size), BACKGROUND)

    target = int(size * scale)
    logo = source.copy()
    # thumbnail preserves aspect ratio, so a wide logo stays wide — it is
    # letterboxed inside the square rather than distorted.
    logo.thumbnail((target, target), Image.LANCZOS)

    offset = ((size - logo.width) // 2, (size - logo.height) // 2)
    canvas.paste(logo, offset, logo)
    return canvas.convert("RGB")  # drop alpha: iOS icons must be opaque


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")

    # Trim the transparent padding so `scale` means the logo itself rather
    # than the mostly-empty canvas it happened to be exported on.
    bbox = source.getchannel("A").getbbox()
    if bbox is None:
        raise SystemExit(f"{SOURCE} is fully transparent")
    trimmed = source.crop(bbox)

    print(f"source {source.size} -> logo content {trimmed.size}\n")

    for name, size, scale in OUTPUTS:
        icon = build(trimmed, size, scale)
        path = PUBLIC / name
        icon.save(path, "PNG", optimize=True)
        print(f"  {name:<24} {size}x{size}  {path.stat().st_size / 1024:6.1f} KB")

    print("\nAll icons are square, opaque, white background.")


if __name__ == "__main__":
    main()
