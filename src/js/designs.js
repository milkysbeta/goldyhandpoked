/* ---------------------------------------------------------------
   Background design layer — Goldy's hand-drawn motifs.

   Every motif loads STRAIGHT: at rest it has no rotation, no scale and
   no offset. All movement is driven by scroll progress, so page load is
   always the neutral composition.

   Each motif picks up one gentle behaviour on the way down the page —
   a little rotation, a small growth, or a slide outward towards its
   nearest edge — and each has its own lag, so nothing travels together.

   A motif can also be clipped to a section (`clip`). The clipped layer
   is a separate fixed container whose clip-path tracks that section's
   position on screen, so the motif is sliced away as the section
   scrolls past rather than drifting out on its own.
--------------------------------------------------------------- */

export const DESIGNS = {
  opacity: 0.36,
  maxBlur: 2,       // px, applied to the deepest layer
};

/* anchor — section this motif belongs to
   at     — where inside that section, 0 = top, 1 = bottom.
            May be negative to sit above the section and bleed off the
            top of the viewport — which is what the hero watermark does.
   offset — extra px added to that resting position (may be negative)
   x      — horizontal centre, viewport-width percentage
   w      — rendered width in vw
   depth  — 0 near the surface, 1 furthest back (drives blur + opacity)
   lag    — travel speed against the page:
              1.0 exactly with it · 0.5 half speed
              0.0 pinned to the viewport · >1.0 drifts upward
   rot    — degrees of rotation across the whole page (0 = stays square)
   grow   — fractional scale gained across the page (0.05 = 5% bigger)
   out    — px it slides outward, away from the nearest edge
   clip   — optional selector; the motif is cut away by that section  */
const PLACEMENTS = {
  /* One page now, so one list.
     Background file numbers map to these names:
       1 kolam-cross · 2 endless-knot · 3 diamond-knot
       4 lattice-field · 5 flame · 6 dotted-diamond · 7 flame-tonal   */
  home: [
    // B1 — top motif: sits just under the nav, near-stationary, cut off
    // at the top of the bio panel. lag doubled from 0.04 for 2x movement.
    { src: '/designs/hero/kolam-cross.webp',       anchor: '#hero', at: 0, offset: 76,
      x: 50, w: 34, depth: 0.72, lag: 0.08, rot: 0, grow: 0.03, out: 0, clipAbove: '#bio' },

    // B3 — at the very top of the bio section, parallax movement doubled
    // (lag 0.88 -> 0.76 halves how closely it tracks the page)
    { src: '/designs/bio/diamond-knot.webp',       anchor: '#bio',  at: 0, offset: 0,
      x: 88, w: 22, depth: 0.60, lag: 0.76, rot: 8, grow: 0, out: 0 },

    // B2 — 300px higher, 30 degrees counter-clockwise across the page
    { src: '/designs/work/endless-knot.webp',      anchor: '#bio',  at: 0.86, offset: -300,
      x: 12, w: 26, depth: 0.80, lag: 0.62, rot: -30, grow: 0, out: 64 },

    // B4 — 250px lower, parallax speed reduced 25%
    // (deviation above page speed 0.14 -> 0.105)
    { src: '/designs/work/lattice-field.webp',     anchor: '#work', at: 0.34, offset: 250,
      x: 89, w: 24, depth: 0.90, lag: 1.105, rot: 0, grow: 0.05, out: 0 },


    // B5 — behind and to the left of the enquiry form
    { src: '/designs/bio/flame.webp',              anchor: '#enquiry', at: 0.22, offset: 0,
      x: 10, w: 14, depth: 0.50, lag: 0.55, rot: 0, grow: 0, out: 0 },

    // B6 — no rotation, moved up the page
    { src: '/designs/enquiry/dotted-diamond.webp', anchor: '#enquiry', at: 0, offset: -340,
      x: 89, w: 20, depth: 0.70, lag: 0.74, rot: 0, grow: 0, out: 0 },

    // B7 replaced by B1, and it no longer slides sideways
    { src: '/designs/hero/kolam-cross.webp',       anchor: '#enquiry', at: 0.48, offset: 0,
      x: 9,  w: 13, depth: 0.90, lag: 0.38, rot: 0, grow: 0, out: 0 },

    /* There used to be a third motif here. On separate pages it was fine,
       but the site is one page now, so it repeated a motif already on
       screen. Dropped rather than duplicated — the enquiry section keeps
       two. Say the word and I will add a different one back. */
  ],
};

let nodes = [];
let clipLayers = [];
let lastScroll = 0;

function style(n) {
  n.el.style.opacity = String(DESIGNS.opacity * (1.25 - n.depth * 0.5));
  n.el.style.filter = `blur(${(DESIGNS.maxBlur * n.depth).toFixed(2)}px)`;
}

/** Resolve each motif's document-space Y from its anchor section. */
function measure() {
  const scroll = window.scrollY || document.documentElement.scrollTop || 0;
  for (const n of nodes) {
    const host = document.querySelector(n.anchor);
    if (!host) {
      n.yPx = 0;
      continue;
    }
    const r = host.getBoundingClientRect();
    n.yPx = r.top + scroll + r.height * n.at + (n.offset || 0);
  }
}

export function initDesigns(container, clipContainer) {
  container.innerHTML = '';
  if (clipContainer) clipContainer.innerHTML = '';
  clipLayers = [];

  const page = document.body.dataset.page || 'home';
  const set = PLACEMENTS[page] || PLACEMENTS.home;

  nodes = set.map((p) => {
    const img = document.createElement('img');
    img.className = 'design';
    img.src = p.src;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.draggable = false;
    img.fetchPriority = 'low';
    img.decoding = 'async';
    img.style.left = `${p.x}%`;
    img.style.width = `${p.w}vw`;

    const host = (p.clip || p.clipAbove) && clipContainer ? clipContainer : container;
    host.appendChild(img);

    const node = { el: img, yPx: 0, ...p };
    style(node);
    return node;
  });

  if (clipContainer) {
    const clipped = set.find((p) => p.clip || p.clipAbove);
    if (clipped) {
      clipLayers.push({
        el: clipContainer,
        selector: clipped.clip || clipped.clipAbove,
        above: Boolean(clipped.clipAbove),
      });
    }
  }

  measure();
  updateDesigns(window.scrollY || 0);

  const ro = new ResizeObserver(() => {
    measure();
    updateDesigns(lastScroll);
  });
  ro.observe(document.body);

  window.addEventListener('resize', () => {
    measure();
    updateDesigns(lastScroll);
  });
}

export function updateDesigns(scrollY) {
  lastScroll = scrollY;

  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, scrollY / max));

  for (const n of nodes) {
    const y = n.yPx - scrollY * (n.lag ?? 1);

    // slide away from whichever edge the motif already sits nearest
    const outward = (n.out || 0) * progress * (n.x < 50 ? -1 : 1);

    const angle = (n.rot || 0) * progress;
    const scale = 1 + (n.grow || 0) * progress;

    n.el.style.transform =
      `translate3d(calc(-50% + ${outward.toFixed(2)}px), ${y.toFixed(2)}px, 0)` +
      ` rotate(${angle.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
  }

  /* Cut the clipped layer against its section. `above` keeps only what
     sits above that section's TOP edge, so the motif is sliced away as
     the section rises into view. Otherwise the layer is clipped to the
     section's own visible box. */
  const vh = window.innerHeight;
  for (const c of clipLayers) {
    const host = document.querySelector(c.selector);
    if (!host) continue;
    const r = host.getBoundingClientRect();

    if (c.above) {
      const bottom = Math.max(0, vh - r.top);
      c.el.style.clipPath = `inset(0 0 ${bottom.toFixed(1)}px 0)`;
    } else {
      const top = Math.max(0, r.top);
      const bottom = Math.max(0, vh - r.bottom);
      c.el.style.clipPath = `inset(${top.toFixed(1)}px 0 ${bottom.toFixed(1)}px 0)`;
    }
  }
}

/** Used by the /admin tuning panel. */
export function applyDesigns() {
  nodes.forEach(style);
  measure();
  updateDesigns(lastScroll);
}
