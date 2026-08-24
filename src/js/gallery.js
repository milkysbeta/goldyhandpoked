/* ---------------------------------------------------------------
   Work grid + lightbox.

   - 16 on first paint, 8 per "load more"
   - thumbs are greyscale with lifted exposure; hover returns colour
     and a 3% scale over 0.3s
   - the next batch's thumbnails and the full-size versions of what is
     currently on screen are warmed quietly in the background, so the
     lightbox opens instantly
   - arrow keys step through pieces; no visible controls, by design
--------------------------------------------------------------- */

// Prefix for the deploy path — '/goldyhandpoked/' in production, '/'
// in dev and under a custom domain. work.json stores root-absolute
// paths, so we rebase them here.
const BASE = import.meta.env.BASE_URL;
const rebase = (p) => BASE + String(p).replace(/^\//, '');

const FIRST = 16;
const STEP = 8;

let items = [];
let shown = 0;
let index = -1;

let gridEl, moreEl, lbEl, lbImg, lbMeta, lbClose;

/* --- quiet preloading ----------------------------------------- */
const warmed = new Set();

function warm(url) {
  if (!url || warmed.has(url)) return;
  warmed.add(url);
  const img = new Image();
  img.decoding = 'async';
  img.src = rebase(url);
}

function warmAhead() {
  // full-size for what is currently rendered
  items.slice(0, shown).forEach((it) => warm(it.full));
  // thumbnails for the batch that has not been revealed yet
  items.slice(shown, shown + STEP).forEach((it) => warm(it.thumb));
}

/* --- grid ------------------------------------------------------ */
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }
  },
  { rootMargin: '80px' }
);

function render(from, to) {
  const frag = document.createDocumentFragment();

  items.slice(from, to).forEach((it, i) => {
    const btn = document.createElement('button');
    btn.className = 'grid__item';
    btn.type = 'button';
    btn.setAttribute('role', 'listitem');
    btn.dataset.index = String(from + i);
    btn.style.animationDelay = `${(i % STEP) * 45}ms`;
    if (it.video) btn.dataset.video = '';

    const img = document.createElement('img');
    img.src = rebase(it.thumb);
    img.alt = it.alt || 'Hand poked tattoo by Goldy';
    img.loading = from === 0 && i < 8 ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.draggable = false;

    btn.appendChild(img);
    btn.addEventListener('click', () => open(from + i));
    frag.appendChild(btn);
    io.observe(btn);
  });

  gridEl.appendChild(frag);
  shown = to;
  moreEl.hidden = shown >= items.length;

  // warm on an idle callback so it never competes with paint
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(warmAhead, { timeout: 1500 });
  } else {
    setTimeout(warmAhead, 300);
  }
}

/* --- lightbox -------------------------------------------------- */
function open(i) {
  index = i;
  const it = items[i];
  if (!it) return;

  lbImg.src = rebase(it.full || it.thumb);
  lbImg.alt = it.alt || 'Hand poked tattoo by Goldy';
  lbMeta.textContent = it.caption || '';
  lbMeta.style.display = it.caption ? '' : 'none';

  lbEl.hidden = false;
  requestAnimationFrame(() => lbEl.classList.add('is-open'));
  document.body.style.overflow = 'hidden';
  lbClose.focus({ preventScroll: true });

  warm(items[i + 1]?.full);
  warm(items[i - 1]?.full);
}

function close() {
  lbEl.classList.remove('is-open');
  document.body.style.overflow = '';
  setTimeout(() => {
    lbEl.hidden = true;
    lbImg.src = '';
  }, 480);
  const back = gridEl.querySelector(`[data-index="${index}"]`);
  if (back) back.focus({ preventScroll: true });
  index = -1;
}

function step(dir) {
  if (index < 0) return;
  let next = index + dir;
  if (next < 0) next = items.length - 1;
  if (next >= items.length) next = 0;
  // reveal any batch the user has not loaded yet, so stepping never dead-ends
  if (next >= shown) render(shown, Math.min(items.length, next + 1));
  open(next);
}

/* --- boot ------------------------------------------------------ */
export async function initGallery() {
  gridEl = document.getElementById('grid');
  moreEl = document.getElementById('more');
  lbEl = document.getElementById('lightbox');
  lbImg = document.getElementById('lbImg');
  lbMeta = document.getElementById('lbMeta');
  lbClose = document.getElementById('lbClose');
  if (!gridEl) return;

  const res = await fetch(rebase('data/work.json'), { cache: 'no-cache' });
  const data = await res.json();

  items = (data.items || [])
    .filter((it) => !it.hidden)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  render(0, Math.min(FIRST, items.length));

  moreEl.addEventListener('click', () => {
    render(shown, Math.min(shown + STEP, items.length));
  });

  // click anywhere off the image closes
  lbEl.addEventListener('click', (e) => {
    if (!e.target.closest('.lightbox__figure')) close();
  });
  lbClose.addEventListener('click', close);

  window.addEventListener('keydown', (e) => {
    if (lbEl.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });
}
