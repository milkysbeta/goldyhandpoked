/* ---------------------------------------------------------------
   Ink loader — the Goldy logo hand-poked into being.

   The logo mark is sampled into a field of stipple points (as a hand-poke
   artist would map out dotwork), then those dots are poked in one flurry
   at a time: each lands with a quick "poke" — a spot of ink that blooms
   slightly and settles — so the mark builds up the way a stick-and-poke
   tattoo actually does, rather than fading in as a picture.

   runInkLoader() resolves when the poking finishes, so main.js can hold
   the loader until both the animation AND the page assets are ready.
--------------------------------------------------------------- */

const SAMPLE = 300;      // resolution the logo is sampled at
const SPACING = 6;       // grid spacing between candidate dots, px
const POKE_MS = 1500;    // how long the whole poking takes
const DOT_LIFE = 220;    // one dot's bloom-and-settle, ms
const HOLD_MS = 320;     // pause on the finished mark before resolving

const CHARCOAL = '43, 43, 43';

function buildPoints(img) {
  // draw the mark small and read its alpha to find the inked area
  const off = document.createElement('canvas');
  off.width = off.height = SAMPLE;
  const ctx = off.getContext('2d', { willReadFrequently: true });

  const scale = Math.min(SAMPLE / img.width, SAMPLE / img.height) * 0.94;
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (SAMPLE - w) / 2, (SAMPLE - h) / 2, w, h);

  const data = ctx.getImageData(0, 0, SAMPLE, SAMPLE).data;
  const pts = [];

  for (let y = 0; y < SAMPLE; y += SPACING) {
    for (let x = 0; x < SAMPLE; x += SPACING) {
      const a = data[(y * SAMPLE + x) * 4 + 3];
      if (a < 110) continue;
      // jitter so the dotwork never looks like a grid
      pts.push({
        x: (x + (Math.random() - 0.5) * SPACING) / SAMPLE,
        y: (y + (Math.random() - 0.5) * SPACING) / SAMPLE,
        r: 1.1 + Math.random() * 1.4,
      });
    }
  }

  // poke order: shuffled, so ink appears to be dabbed all over and fill
  // in, rather than sweeping across in a line
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  pts.forEach((p, i) => {
    // a little timing jitter on top of the shuffle
    p.t = (i / pts.length) * POKE_MS + (Math.random() - 0.5) * 90;
  });

  return pts;
}

export function runInkLoader(loaderEl, logoUrl) {
  return new Promise((resolve) => {
    const canvas = loaderEl?.querySelector('.loader__canvas');
    if (!canvas) return resolve();

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const img = new Image();
    img.decoding = 'async';

    // `is-formed` crossfades the poked dots to the crisp logo; add it as
    // soon as the mark is complete, on every exit path.
    const form = () => loaderEl.classList.add('is-formed');

    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      form();
      resolve();
    };

    /* Hard backstop on wall-clock time. requestAnimationFrame stops firing
       in a backgrounded or throttled tab, and the loader must never be able
       to hold the page hostage — so resolve no matter what after a cap. */
    const total = POKE_MS + DOT_LIFE + HOLD_MS;
    setTimeout(done, total + 2500);

    img.onerror = done;   // never let a bad asset block the page
    img.onload = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = canvas.clientWidth || 150;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      const pts = buildPoints(img);

      // reduced motion: skip the poking, just show the finished logo
      if (reduced || pts.length === 0) {
        return done();
      }

      const start = performance.now();

      const frame = (now) => {
        const t = now - start;
        ctx.clearRect(0, 0, size, size);

        for (const p of pts) {
          const age = t - p.t;
          if (age < 0) continue;

          const cx = p.x * size;
          const cy = p.y * size;

          if (age < DOT_LIFE) {
            // bloom: overshoot to 1.35x then settle, alpha eases up
            const k = age / DOT_LIFE;
            const pop = 1 + Math.sin(Math.min(k, 1) * Math.PI) * 0.35;
            const alpha = Math.min(1, k * 2);

            // faint ink bleed around a fresh poke
            ctx.fillStyle = `rgba(${CHARCOAL}, ${0.12 * (1 - k)})`;
            ctx.beginPath();
            ctx.arc(cx, cy, p.r * pop * 2.1, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(${CHARCOAL}, ${0.9 * alpha})`;
            ctx.beginPath();
            ctx.arc(cx, cy, p.r * pop, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = `rgba(${CHARCOAL}, 0.9)`;
            ctx.beginPath();
            ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        if (t < POKE_MS + DOT_LIFE) {
          requestAnimationFrame(frame);
        } else {
          // poking finished — crossfade the dots to the crisp logo, hold
          // on it briefly, then let the page reveal
          form();
          setTimeout(done, HOLD_MS + 450);
        }
      };

      requestAnimationFrame(frame);
    };

    img.src = logoUrl;
  });
}
