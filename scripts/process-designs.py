"""Prepares Goldy's hand-drawn motifs for the web.

Source PNGs live in 'unsorted images'. For each one this:
  1. recovers a clean alpha channel (some PSD exports carry a
     semi-transparent white wash across the whole canvas, which is
     what made Background7 read as a grey box)
  2. trims the transparent margin
  3. recolours the ink to charcoal
  4. resizes to the width that motif is actually displayed at
  5. writes WebP into the folder for the section that uses it

Re-runnable. Source files are never modified.
"""

import json
import os

from PIL import Image

SRC = "unsorted images"
OUT = "public/designs"
CHARCOAL = (0x2B, 0x2B, 0x2B)

# section, filename, export width
# widths are ~1.6x the largest size each motif is ever displayed at —
# they sit far back and are blurred, so more resolution is wasted bytes
PLAN = {
    "Background1.png": ("hero",    "kolam-cross",    1400),
    "Background2.png": ("work",    "endless-knot",    900),
    "Background3.png": ("bio",     "diamond-knot",    800),
    "Background4.png": ("work",    "lattice-field",   900),
    "Background5.png": ("bio",     "flame",           620),
    "Background6.png": ("enquiry", "dotted-diamond",  560),
    "Background7.png": ("enquiry", "flame-tonal",     620),
}


def clean_alpha(im):
    """Return an alpha channel with any flat background wash removed."""
    a = im.getchannel("A")
    lo, hi = a.getextrema()

    # fully opaque export: the drawing is dark ink on white, so
    # inverted luminance is the alpha we want
    if lo > 250:
        return im.convert("L").point(lambda v: 255 - v)

    # a flat wash sits at the same alpha in every corner — measure it
    w, h = im.size
    corners = [a.getpixel(p) for p in ((2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3))]
    floor = min(corners)

    if floor > 4:
        # rescale so the wash falls to zero and the ink keeps its range
        span = 255 - floor
        return a.point(lambda v: 0 if v <= floor else min(255, round((v - floor) * 255 / span)))

    return a


def main():
    manifest = []

    for src_name, (section, out_name, width) in PLAN.items():
        path = os.path.join(SRC, src_name)
        if not os.path.exists(path):
            print(f"  skip {src_name} (not found)")
            continue

        im = Image.open(path).convert("RGBA")
        a = clean_alpha(im)

        box = a.getbbox()
        if box:
            a = a.crop(box)

        flat = Image.new("RGBA", a.size, CHARCOAL + (255,))
        flat.putalpha(a)

        w, h = flat.size
        if w > width:
            flat = flat.resize((width, round(h * width / w)), Image.LANCZOS)

        folder = os.path.join(OUT, section)
        os.makedirs(folder, exist_ok=True)
        out = os.path.join(folder, out_name + ".webp")
        # these render at ~8% opacity behind a blur, so quality can go
        # well below what you would use for a foreground image
        flat.save(out, "WEBP", quality=62, alpha_quality=55, method=4, exact=False)

        kb = os.path.getsize(out) / 1024
        manifest.append({
            "src": f"/designs/{section}/{out_name}.webp",
            "section": section,
            "w": flat.size[0],
            "h": flat.size[1],
        })
        print(f"  {src_name:18} -> {section}/{out_name}.webp  {flat.size[0]}x{flat.size[1]}  {kb:6.1f} kB")

    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"\n  {len(manifest)} motifs written")


if __name__ == "__main__":
    main()
