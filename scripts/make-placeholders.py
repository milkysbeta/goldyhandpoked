"""Generates 16 placeholder portfolio images so the grid can be judged before
Goldy's real Instagram archive is synced in. Delete once real work lands."""
import math, random
from PIL import Image, ImageDraw, ImageFilter

CHAR = (43, 43, 43)
SKIN = (222, 209, 194)
random.seed(7)

def paper(size):
    im = Image.new("RGB", size, SKIN)
    d = ImageDraw.Draw(im)
    for _ in range(int(size[0] * size[1] / 90)):
        x, y = random.randrange(size[0]), random.randrange(size[1])
        v = random.randint(-14, 10)
        d.point((x, y), fill=(SKIN[0] + v, SKIN[1] + v, SKIN[2] + v))
    return im.filter(ImageFilter.GaussianBlur(0.4))

def dots(d, pts, r=3):
    for x, y in pts:
        d.ellipse([x - r, y - r, x + r, y + r], fill=CHAR)

def motif(d, cx, cy, s, kind):
    if kind == 0:                                   # dotwork mandala
        for ring, rad in enumerate(range(int(s * .18), int(s * .55), int(s * .09))):
            n = 10 + ring * 7
            dots(d, [(cx + rad * math.cos(i * 2 * math.pi / n), cy + rad * math.sin(i * 2 * math.pi / n)) for i in range(n)], max(1.6, s * .006))
        d.ellipse([cx - s * .1, cy - s * .1, cx + s * .1, cy + s * .1], outline=CHAR, width=int(s * .012))
    elif kind == 1:                                 # botanical stem
        d.line([(cx, cy + s * .5), (cx, cy - s * .45)], fill=CHAR, width=int(s * .012))
        for i in range(9):
            t = i / 8
            y = cy + s * .45 - t * s * .85
            l = s * .3 * (1 - t * .65)
            for sgn in (-1, 1):
                d.line([(cx, y), (cx + sgn * l, y - l * .55)], fill=CHAR, width=max(1, int(s * .007)))
    elif kind == 2:                                 # crescent + stars
        d.arc([cx - s * .4, cy - s * .4, cx + s * .4, cy + s * .4], 40, 320, fill=CHAR, width=int(s * .03))
        dots(d, [(cx + random.uniform(-s * .5, s * .5), cy + random.uniform(-s * .5, s * .5)) for _ in range(14)], s * .008)
    elif kind == 3:                                 # linework wave
        for k in range(4):
            pts = [(cx - s * .5 + i * s / 40, cy - s * .18 + k * s * .12 + math.sin(i / 5 + k) * s * .07) for i in range(41)]
            d.line(pts, fill=CHAR, width=max(1, int(s * .008)), joint="curve")
    else:                                           # geometric eye
        d.ellipse([cx - s * .45, cy - s * .22, cx + s * .45, cy + s * .22], outline=CHAR, width=int(s * .015))
        d.ellipse([cx - s * .13, cy - s * .13, cx + s * .13, cy + s * .13], fill=CHAR)
        for i in range(18):
            a = i * math.pi / 9
            d.line([(cx + s * .5 * math.cos(a), cy + s * .5 * math.sin(a)), (cx + s * .62 * math.cos(a), cy + s * .62 * math.sin(a))], fill=CHAR, width=max(1, int(s * .006)))

for i in range(1, 17):
    im = paper((1400, 1400))
    d = ImageDraw.Draw(im)
    motif(d, 700, 700, 900, (i - 1) % 5)
    im = im.filter(ImageFilter.GaussianBlur(0.5))
    im.save(f"public/work/full/piece-{i:02d}.jpg", quality=88)
    im.resize((800, 800), Image.LANCZOS).save(f"public/work/thumb/piece-{i:02d}.jpg", quality=82)
print("wrote 16 placeholder pieces")
