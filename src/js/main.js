/* ---------------------------------------------------------------
   Goldy Handpoked — entry point
--------------------------------------------------------------- */

import Lenis from 'lenis';
import { initBackground, setBackgroundScroll, MIST, applyMist } from './background.js';
import { initGrain, refreshGrain, GRAIN } from './grain.js';
import { initDesigns, updateDesigns, applyDesigns, DESIGNS } from './designs.js';
import { initGallery } from './gallery.js';

/* --- smooth scroll -------------------------------------------- */
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const lenis = new Lenis({
  duration: 1.35,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: !reduced,
  touchMultiplier: 1.6,
});

let lastScrollY = -1;

function raf(time) {
  // Schedule the next frame FIRST. If anything below throws, the loop —
  // and with it Lenis and every scroll-driven layer — must not die.
  requestAnimationFrame(raf);

  lenis.raf(time);

  /* Read the real scroll position rather than trusting Lenis's own
     callback. Anything that moves the page natively — a hash link,
     the browser restoring scroll on reload, a focused form field
     scrolling into view — bypasses Lenis's event. */
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  if (y !== lastScrollY) {
    lastScrollY = y;
    onScroll(y);
  }
}
requestAnimationFrame(raf);

/* --- parallax --------------------------------------------------

   Each layer's resting centre is measured ONCE, in document space, with
   its transform cleared. Measuring live inside the scroll loop would
   read a rect that already includes the offset we just applied, so the
   calculation would feed back on itself — small depths merely damp,
   but anything approaching 1.0 stops responding altogether.          */
const layers = [...document.querySelectorAll('[data-depth]')].map((el) => ({
  el,
  depth: parseFloat(el.dataset.depth) || 0,
  base: '',
  centre: 0,
}));

function measureLayers() {
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  for (const l of layers) {
    const prev = l.el.style.transform;
    l.el.style.transform = l.base;
    const r = l.el.getBoundingClientRect();
    l.centre = r.top + y + r.height / 2;
    l.el.style.transform = prev;
  }
}

function parallax(scrollY) {
  const vh = window.innerHeight;
  for (const l of layers) {
    // distance from the viewport's centre, in viewport space
    const centre = l.centre - scrollY - vh / 2;
    const shift = -centre * l.depth;
    l.el.style.transform = `${l.base}translate3d(0, ${shift.toFixed(2)}px, 0)`;
  }
}

/* --- nav auto-hide --------------------------------------------- */
const nav = document.getElementById('nav');
let lastY = 0;

function navScroll(y) {
  if (!nav) return;
  const down = y > lastY;
  nav.classList.toggle('is-hidden', down && y > 220);
  nav.classList.toggle('is-shrunk', y > 80);
  lastY = y;
}

/* --- scroll loop ----------------------------------------------- */
function onScroll(y) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  setBackgroundScroll(max > 0 ? y / max : 0);
  updateDesigns(y);
  parallax(y);
  navScroll(y);
}

/* --- image protection (deterrent) ------------------------------ */
document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('img, .grid__item, .lightbox')) e.preventDefault();
});
document.addEventListener('dragstart', (e) => {
  if (e.target.tagName === 'IMG') e.preventDefault();
});

/* --- soft page transition -------------------------------------- */
document.querySelectorAll('a[data-transition]').forEach((a) => {
  a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    document.body.classList.add('is-leaving');
    setTimeout(() => { window.location.href = a.href; }, 420);
  });
});

/* --- anchors through Lenis ------------------------------------- */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 56;
    lenis.scrollTo(target, { offset: -navH });
  });
});

/* --- boot ------------------------------------------------------ */
const designLayer = document.getElementById('designs');
if (designLayer) initDesigns(designLayer, document.getElementById('designsClip'));

window.addEventListener('resize', () => {
  measureLayers();
  parallax(window.scrollY || 0);
});

initBackground(document.getElementById('bg'));
initGrain(document.getElementById('grain'));
initGallery();

/* Hold the loader until fonts and the first images are ready, then
   fade — the "chill" entrance, with a floor so it never flashes. */
const started = performance.now();
const loader = document.getElementById('loader');

Promise.all([
  document.fonts ? document.fonts.ready : Promise.resolve(),
  new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r))),
]).then(() => {
  const wait = Math.max(0, 900 - (performance.now() - started));
  setTimeout(() => {
    loader?.classList.add('is-done');
    document.body.classList.add('is-ready');
    measureLayers();
    parallax(window.scrollY || 0);
    updateDesigns(window.scrollY || 0);
  }, wait);
});

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* Live tuning handle. The /admin panel drives the site through this, and
   it is how you dial values by eye from the console:

     __goldy.GRAIN.opacity = 0.15; __goldy.refreshGrain()
     __goldy.MIST.opacity  = 0.03; __goldy.applyMist()
     __goldy.DESIGNS.opacity = 0.5; __goldy.applyDesigns()          */
window.__goldy = { GRAIN, refreshGrain, MIST, applyMist, DESIGNS, applyDesigns, lenis };
