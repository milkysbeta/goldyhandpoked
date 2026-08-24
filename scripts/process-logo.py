"""Prepares Goldy's logo badge for the site.

The source is a black disc with the knot painted white on top. Rather
than keep the white as white, we knock it out to transparent: the mark
becomes charcoal ink with holes, so the eggshell (or any background)
shows through the knot. That keeps it working on the loader, the nav,
a dark favicon tile, and anywhere else it lands.

Writes:
  public/logo/goldy-mark.png       512px, charcoal, knocked out
  public/logo/goldy-mark@2x.png   1024px, same
  public/logo/goldy-mark-light.png 512px, eggshell ink, for dark ground
  public/favicon.png               180px, for browsers and iOS
  public/favicon.ico               multi-size
  goldy.ico                        the START WEBSITE shortcut icon
"""

import os

from PIL import Image

SRC = "unsorted images/Goldy_Logo.png"
CHARCOAL = (0x2B, 0x2B, 0x2B)
EGGSHELL = (0xF0, 0xEA, 0xD6)


def knockout(im):
    """Ink where the source is dark; transparent where it is white or
    already transparent."""
    im = im.convert("RGBA")
    alpha = im.getchannel("A")
    lum = im.convert("L")

    # inside the badge: dark pixels are ink, white pixels are holes
    ink = lum.point(lambda v: 255 - v)
    # multiply by the original alpha so everything outside the disc stays out
    combined = Image.new("L", im.size)
    combined.putdata([round(i * a / 255) for i, a in zip(ink.getdata(), alpha.getdata())])

    box = combined.getbbox()
    return combined.crop(box) if box else combined


def tinted(mask, colour, size):
    m = mask.resize((size, size), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), colour + (255,))
    out.putalpha(m)
    return out


def main():
    os.makedirs("public/logo", exist_ok=True)
    src = Image.open(SRC)
    mask = knockout(src)
    print(f"  source {src.size[0]}x{src.size[1]} -> trimmed {mask.size[0]}x{mask.size[1]}")

    tinted(mask, CHARCOAL, 512).save("public/logo/goldy-mark.png", optimize=True)
    tinted(mask, CHARCOAL, 1024).save("public/logo/goldy-mark@2x.png", optimize=True)
    tinted(mask, EGGSHELL, 512).save("public/logo/goldy-mark-light.png", optimize=True)

    # favicons sit on their own tile, so give them an eggshell ground
    def tile(size):
        t = Image.new("RGBA", (size, size), EGGSHELL + (255,))
        pad = round(size * 0.06)
        mark = tinted(mask, CHARCOAL, size - pad * 2)
        t.paste(mark, (pad, pad), mark)
        return t

    tile(180).save("public/favicon.png", optimize=True)
    tile(256).save("public/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    tile(256).save("goldy.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

    for p in ("public/logo/goldy-mark.png", "public/logo/goldy-mark@2x.png",
              "public/logo/goldy-mark-light.png", "public/favicon.png",
              "public/favicon.ico", "goldy.ico"):
        print(f"  {p:36} {os.path.getsize(p)/1024:6.1f} kB")


if __name__ == "__main__":
    main()
