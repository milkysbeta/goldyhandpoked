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
    { src: '/designs/hero/kolam-cross.webp',       anchor: '#hero', at: 0.5, offset: -300,
      x: 50, matchWidth: '.hero__sub', matchScale: 1, w: 34, offsetM: -170, depth: 0.72, lag: 0.56, rot: 0, grow: 0.3, out: 0, clipAbove: '#bio' },

    // B3 — at the very top of the bio section, parallax movement doubled
    // (lag 0.88 -> 0.76 halves how closely it tracks the page)
    { src: '/designs/bio/diamond-knot.webp',       anchor: '#bio',  at: 0, offset: 0,
      x: 88, w: 22, depth: 0.60, lag: 0.76, rot: 8, grow: 0, out: 0 },

    // B2 — 300px higher, 30 degrees counter-clockwise across the page
    { src: '/designs/work/endless-knot.webp',      anchor: '#bio',  at: 0.86, offset: -300,
      x: 12, w: 26, depth: 0.80, lag: 0.62, rot: -30, grow: 0, out: 64 },

    // B4 — 250px lower, parallax speed reduced 25%
    // (deviation above page speed 0.14 -> 0.105)
    { src: '/designs/work/lattice-field.webp',     anchor: '#work', at: 0.34, offset: 340,
      x: 89, w: 16, depth: 0.90, lag: 0.895, rot: 40, rotStart: -20, grow: 0.05, out: 0 },


    // B5 — radial kolam on the LEFT, reading through the enquiry glass,
    // exactly where the flame background used to sit. Same parallax feel
    // (pshift 0.35). The flame itself now lives inside the panel under the
    // send button. lag stays out of it — pshift keeps it beside the form.
    { src: '/designs/enquiry/radial-star.webp',    anchor: '.form', at: 0.5, offset: -600,
      x: 11, h: 340, depth: 0.14, rot: 0, grow: 0, out: 0, op: 0.45, pshift: 0.35 },

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

// Three sizing tiers, because motifs are sized in vw and vw scales
// linearly with the viewport — so a width that reads well on desktop
// goes tiny on a phone. Each motif may carry per-tier overrides that
// cascade down: phone falls back to tablet, tablet to the desktop base.
//   phone  (<=560px)      -> suffix 'M'  (wM, hM, offsetM, xM …)
//   tablet (561–1024px)   -> suffix 'T'  (wT, hT, offsetT, xT …)
//   desktop (>1024px)     -> the bare key
const phone = () => window.matchMedia('(max-width:560px)').matches;
const tablet = () => window.matchMedia('(min-width:561px) and (max-width:1024px)').matches;
const pick = (n, key) => {
  if (phone() && n[key + 'M'] != null) return n[key + 'M'];
  if ((phone() || tablet()) && n[key + 'T'] != null) return n[key + 'T'];
  return n[key];
};

function style(n) {
  // `op` overrides the global-derived opacity for a motif that needs
  // to read strongly (e.g. behind a glass panel).
  const o = n.op ?? DESIGNS.opacity * (1.25 - n.depth * 0.5);
  n.el.style.opacity = String(o);
  n.el.style.filter = `blur(${(DESIGNS.maxBlur * n.depth).toFixed(2)}px)`;
}

/** Visual width of an element's text — the bounding box of its rendered
   content, so a wrapped line returns the width of its longest line. This
   is what lets a motif track the actual inked width of a heading rather
   than the paragraph box it sits in. */
function textWidth(sel) {
  const el = document.querySelector(sel);
  if (!el) return 0;
  const range = document.createRange();
  range.selectNodeContents(el);
  return range.getBoundingClientRect().width;
}

/** Size and horizontal position, re-applied on breakpoint change and on
   any reflow (so `matchWidth` keeps tracking after fonts load / resize). */
function sizeAndPlace(n) {
  n.el.style.left = `${pick(n, 'x')}%`;

  // Tie the motif's width to a piece of text, so it scales with the
  // type instead of the raw viewport — consistent on phone/tablet/desktop.
  if (n.matchWidth) {
    const w = textWidth(n.matchWidth);
    if (w) {
      n.el.style.height = '';
      n.el.style.width = `${(w * (n.matchScale || 1)).toFixed(1)}px`;
      return;
    }
  }

  const h = pick(n, 'h');
  if (h) {
    n.el.style.height = `${h}px`;
    n.el.style.width = 'auto';
  } else {
    n.el.style.height = '';
    n.el.style.width = `${pick(n, 'w')}vw`;
  }
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
    n.yPx = r.top + scroll + r.height * n.at + (pick(n, 'offset') || 0);
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
    img.src = import.meta.env.BASE_URL + p.src.replace(/^\//, '');
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.draggable = false;
    img.fetchPriority = 'low';
    img.decoding = 'async';

    const host = (p.clip || p.clipAbove) && clipContainer ? clipContainer : container;
    host.appendChild(img);

    const node = { el: img, yPx: 0, ...p };
    style(node);
    sizeAndPlace(node);
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

  nodes.forEach(sizeAndPlace);     // once fonts/layout settle, resize to text
  measure();
  updateDesigns(window.scrollY || 0);

  const ro = new ResizeObserver(() => {
    nodes.forEach(sizeAndPlace);   // keep matchWidth motifs tracking the text
    measure();
    updateDesigns(lastScroll);
  });
  ro.observe(document.body);
  // observe every matched text element, so a motif re-fits the moment its
  // target reflows (font swap, wrap change) even if the body height doesn't
  nodes.forEach((n) => {
    if (!n.matchWidth) return;
    const el = document.querySelector(n.matchWidth);
    if (el) ro.observe(el);
  });

  window.addEventListener('resize', () => {
    nodes.forEach(sizeAndPlace);   // re-apply breakpoint + matchWidth sizes
    measure();
    updateDesigns(lastScroll);
  });
}

export function updateDesigns(scrollY) {
  lastScroll = scrollY;

  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, scrollY / max));

  const vhalf = window.innerHeight / 2;
  for (const n of nodes) {
    let y;
    if (n.pshift != null) {
      // parallax measured against the viewport centre, like the DOM
      // layers — the offset is bounded by the viewport, so a deep
      // motif parallaxes in place instead of sliding away.
      const baseY = n.yPx - scrollY;
      const dist = baseY + (n.el.offsetHeight || 0) / 2 - vhalf;
      y = baseY - dist * n.pshift;
    } else {
      y = n.yPx - scrollY * (n.lag ?? 1);
    }

    // slide away from whichever edge the motif already sits nearest
    const outward = (n.out || 0) * progress * (n.x < 50 ? -1 : 1);

    // rotStart is the angle at the top of the page; rot is added across
    // the scroll. A negative rotStart means it begins anti-clockwise and
    // turns back through square as you scroll.
    const angle = (n.rotStart || 0) + (n.rot || 0) * progress;
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
