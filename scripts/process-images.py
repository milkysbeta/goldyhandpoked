"""Turns a folder of Goldy's work into the site's gallery.

Handles two sources, and you do not have to say which:

  * an instaloader dump   -- 2024-03-11_08-14-22_UTC.jpg alongside a
                             matching .txt holding the caption
  * a plain folder        -- just images, dropped in by hand

For each image it writes an 800px square thumbnail and a 1400px
long-edge version, then merges everything into public/data/work.json.

Merging is careful: if a piece is already in work.json, its running
order, its hidden flag and any caption edited in /admin are kept. Only
genuinely new pieces are appended. So this is safe to re-run after
every sync, and it will never undo curation.

Usage:
    python scripts/process-images.py "goldy_handpoked"
    python scripts/process-images.py "unsorted images/work"
"""

import json
import os
import re
import sys
from datetime import datetime

from PIL import Image, ImageOps

THUMB = 800          # square, for the grid
FULL = 1400          # long edge, for the lightbox
DATA = "public/data/work.json"
THUMB_DIR = "public/work/thumb"
FULL_DIR = "public/work/full"

IMAGE_EXT = (".jpg", ".jpeg", ".png", ".webp")
VIDEO_EXT = (".mp4", ".mov", ".webm")


def clean_caption(text):
    """Strip hashtags, @mentions and the trailing tag-soup Instagram
    captions usually end with. Keeps the human sentence."""
    if not text:
        return ""
    text = re.sub(r"#\w+", "", text)
    text = re.sub(r"@[\w.]+", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    lines = [ln.strip() for ln in text.strip().split("\n") if ln.strip()]
    return " ".join(lines).strip()


def caption_for(path):
    """instaloader writes the caption next to the image as a .txt."""
    txt = os.path.splitext(path)[0] + ".txt"
    if os.path.exists(txt):
        with open(txt, encoding="utf-8", errors="replace") as f:
            return clean_caption(f.read())
    return ""


def slug_for(name, taken):
    base = re.sub(r"[^a-z0-9]+", "-", os.path.splitext(name)[0].lower()).strip("-")
    base = base or "piece"
    slug, n = base, 2
    while slug in taken:
        slug, n = f"{base}-{n}", n + 1
    return slug


def load_existing():
    if not os.path.exists(DATA):
        return {"version": 1, "items": []}
    with open(DATA, encoding="utf-8") as f:
        return json.load(f)


def main(src):
    if not os.path.isdir(src):
        sys.exit(f"Not a folder: {src}")

    os.makedirs(THUMB_DIR, exist_ok=True)
    os.makedirs(FULL_DIR, exist_ok=True)

    data = load_existing()
    by_id = {it["id"]: it for it in data["items"]}
    order_max = max((it.get("order", 0) for it in data["items"]), default=-1)

    files = sorted(
        f for f in os.listdir(src)
        if f.lower().endswith(IMAGE_EXT) and not f.lower().endswith("_profile_pic.jpg")
    )
    skipped_video = [f for f in os.listdir(src) if f.lower().endswith(VIDEO_EXT)]

    added, updated = 0, 0
    taken = set(by_id)

    for name in files:
        path = os.path.join(src, name)
        try:
            im = Image.open(path)
        except Exception as e:
            print(f"  skip {name}: {e}")
            continue

        im = ImageOps.exif_transpose(im).convert("RGB")

        existing = next((i for i in data["items"] if i.get("source_file") == name), None)
        piece_id = existing["id"] if existing else slug_for(name, taken)
        taken.add(piece_id)

        # square centre-crop for the grid, matching Instagram
        ImageOps.fit(im, (THUMB, THUMB), Image.LANCZOS, centering=(0.5, 0.5)) \
            .save(f"{THUMB_DIR}/{piece_id}.jpg", quality=82, optimize=True)

        # full keeps the original aspect ratio for the lightbox
        full = im.copy()
        full.thumbnail((FULL, FULL), Image.LANCZOS)
        full.save(f"{FULL_DIR}/{piece_id}.jpg", quality=88, optimize=True)

        if existing:
            updated += 1
            continue

        order_max += 1
        data["items"].append({
            "id": piece_id,
            "thumb": f"/work/thumb/{piece_id}.jpg",
            "full": f"/work/full/{piece_id}.jpg",
            "alt": "Hand poked tattoo by Goldy",
            "caption": caption_for(path),
            "type": "work",
            "hidden": False,
            "order": order_max,
            "source": "instagram" if re.match(r"\d{4}-\d{2}-\d{2}_", name) else "upload",
            "source_file": name,
        })
        added += 1

    data["updated"] = datetime.now().strftime("%Y-%m-%d")
    with open(DATA, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n  {added} new, {updated} re-processed, {len(data['items'])} in the gallery")
    if skipped_video:
        print(f"  {len(skipped_video)} video(s) skipped — videos are off for now")
    print(f"  wrote {DATA}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "goldy_handpoked")
