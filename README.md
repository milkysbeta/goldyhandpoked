# Goldy Handpoked

Hand poked tattoos — Hawea Flat, Wanaka, New Zealand.
Built by Milky Design.

## Run it

```bash
npm install
npm run dev      # http://localhost:5190
npm run build    # outputs to /docs for GitHub Pages
```

## Palette & type

| | |
|---|---|
| Text | `#2B2B2B` charcoal |
| Background | `#F0EAD6` eggshell |
| Milky hover | `#D8342B` red |
| H1 | Warren |
| H2 | World Championship |
| Body | Inter Tight / system sans, weight 500–600 |

Fonts are converted to WOFF2 in `public/fonts`. The originals are kept
alongside them. **These are demo licences — replace before launch.**

## Structure

```
public/
  work/thumb   800px square grid thumbnails
  work/full    1400px lightbox versions
  designs/     charcoal background motifs (SVG)
  logo/        Goldy mark + favicon
  milky/       Milky footer mark, charcoal + red
  data/        work.json — the gallery's single source of truth
src/js/
  background.js  three.js mist
  grain.js       procedural non-tiling film grain
  designs.js     art-directed parallax motifs
  gallery.js     grid, lightbox, preloading
  form.js        enquiry validation + send
  config.js      form key, addresses
```

## Tuning

Every visual constant is exported at the top of its own module:
`MIST` in `background.js`, `GRAIN` in `grain.js`, `DESIGNS` in
`designs.js`. The `/admin` panel writes to these and persists them.

Motif placement is deliberately **not** random — edit `PLACEMENTS`
in `designs.js` to art-direct where each one falls.

## Still placeholder

- All 16 grid images (`scripts/make-placeholders.py` generated them)
- Bio portrait and bio copy
- The Goldy logo mark — waiting on the Instagram profile picture
- The 7 background motifs — waiting on Goldy's own designs
- `formAccessKey` in `src/js/config.js` — empty until the Web3Forms
  key for handpoked.ttt@gmail.com is pasted in

## Asset pipelines

```bash
npm run images -- "goldy_handpoked"   # a folder of work -> grid + work.json
npm run designs                       # background motifs -> sectioned WebP
npm run logo                          # Goldy's badge -> marks + favicons
```

All three go through `scripts/py.js`, which finds a real Python even
when `python` on PATH is the Microsoft Store stub. Override with
`set PYTHON=C:\path\to\python.exe`.

## Instagram sync

**Anonymous scraping does not work.** Instagram blocks logged-out
access to profile media, so instaloader stalls indefinitely without
credentials. This is not something the site can work around — it needs
a logged-in session, created once, on this machine:

```bash
instaloader --login=YOUR_IG_USERNAME goldy_handpoked
```

It prompts for the password in your own terminal and saves a session
file, so subsequent runs need no login. Then:

```bash
npm run images -- "goldy_handpoked"
```

That resizes everything, strips hashtags and @mentions from captions,
and merges into `public/data/work.json`. **Re-running is safe**: the
running order, hidden flags and any caption edited in `/admin` are
preserved, and only genuinely new pieces are appended.

Dropping a plain folder of images in works exactly the same way —
point `npm run images` at it.
