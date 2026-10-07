#!/usr/bin/env python3
"""
Turn a phone photo into the square founder image the landing page wants.

WHY
    The landing page renders /founder-jack.jpg as a 224x224 rounded square.
    A portrait phone photo dropped in unprocessed gets squashed or centre-
    cropped around the subject's chest, because the centre of a standing
    portrait is not the face.

USAGE
    1. Save the photo anywhere in the project, e.g. public/founder-raw.jpg
    2. python3 scripts/prepare-founder-photo.py public/founder-raw.jpg
    3. It writes public/founder-jack.jpg

    Optional: --face-y 0.35 moves the crop centre up or down as a fraction of
    the image height. 0.35 suits a head-and-shoulders standing shot; lower
    numbers crop higher.

No face detection here on purpose — that would mean adding a dependency and a
model to the repo for a job that one number does fine.
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is required:  pip install pillow --break-system-packages")

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "public" / "founder-jack.jpg"

# 448 = the 224px the page renders at, doubled for retina screens.
SIZE = 448


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="the photo to process")
    parser.add_argument(
        "--face-y",
        type=float,
        default=0.35,
        help="vertical centre of the crop, 0 = top, 1 = bottom (default 0.35)",
    )
    args = parser.parse_args()

    if not args.source.exists():
        sys.exit(f"Not found: {args.source}")

    # exif_transpose first: phone photos carry a rotation flag, and ignoring
    # it is why a portrait shot sometimes lands sideways.
    img = ImageOps.exif_transpose(Image.open(args.source)).convert("RGB")
    w, h = img.size

    side = min(w, h)

    # Horizontally centred; vertically placed by --face-y, then clamped so the
    # crop box stays inside the image.
    left = (w - side) // 2
    top = int(h * args.face_y - side / 2)
    top = max(0, min(top, h - side))

    square = img.crop((left, top, left + side, top + side))
    square = square.resize((SIZE, SIZE), Image.LANCZOS)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    square.save(OUTPUT, "JPEG", quality=88, optimize=True, progressive=True)

    kb = OUTPUT.stat().st_size / 1024
    print(f"{args.source.name} {w}x{h} -> {OUTPUT.relative_to(ROOT)} {SIZE}x{SIZE}  {kb:.0f} KB")
    print("Open it and check the crop. If the face sits too low, re-run with --face-y 0.28")


if __name__ == "__main__":
    main()
