/* ---------------------------------------------------------------
   Film dust — Three.js drifting particles.

   The previous version was a static per-pixel hash: it rendered once and
   froze, like grain stamped on a print. This replaces it with actual
   suspended dust — thousands of fine charcoal motes in screen space that
   twinkle in place — the dust holds its position and sparkles, rather
   than drifting. Motion params default to 0 but remain tunable.

   It sits in its own screen-space layer (an orthographic full-viewport
   field), separate from the deeper misty haze in background.js, so the
   two read as different distances: fine sharp dust close to the glass,
   soft blurred mist far behind it.

   Nothing repeats: every mote gets an independent position, speed and
   phase, and the motion is a continuous modulo wrap rather than a loop,
   so no two motes ever share a cycle and no pattern can form.

   All motion is in the vertex shader, so the field costs almost nothing.
--------------------------------------------------------------- */

import * as THREE from 'three';

export const GRAIN = {
  density: 90,      // one mote per this many screen pixels (lower = denser)
  size: 1.6,        // mote size in CSS px
  opacity: 0.21,    // peak alpha
  variation: 0.55,  // how much alpha varies mote to mote, 0 = identical
  drift: 0.0,       // upward travel — 0 = the dust holds its place
  sway: 0.0,        // horizontal sway — 0 = no sideways movement
  sparkle: 1.9,     // strength of the twinkle glints
  sparkleShare: 0.2,// fraction of motes that catch the light
  dpr: 2,           // pixel-ratio cap
};

const VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aSpeed;
  attribute float aAlpha;
  attribute float aSparkle;

  uniform float uTime;
  uniform float uDrift;
  uniform float uSway;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uSparkle;

  varying float vAlpha;

  void main() {
    // position is stored in [0,1] across the viewport
    vec2 p = position.xy;

    // drift/sway default to 0 — the dust holds its place. Left in so the
    // motion can be dialed back up from the tuning panel if wanted.
    p.y = mod(p.y + uTime * uDrift * aSpeed, 1.0);
    p.x += sin(uTime * (0.15 + aSeed * 0.5) + aSeed * 44.0) * uSway;

    /* Twinkle in place. pow() sharpens the sine into a brief glint, and
       each flagged mote has its own rate and phase, so they sparkle
       independently rather than pulsing together. */
    float s = sin(uTime * (0.6 + aSeed * 1.4) + aSeed * 52.0) * 0.5 + 0.5;
    float glint = aSparkle * pow(s, 8.0) * uSparkle;
    vAlpha = aAlpha * (1.0 + glint);

    // sparkling motes swell a touch as they flare
    float grow = 1.0 + glint * 0.4;

    gl_Position = vec4(p.x * 2.0 - 1.0, p.y * 2.0 - 1.0, 0.0, 1.0);
    gl_PointSize = uSize * uPixelRatio * (0.7 + aSpeed * 0.5) * grow;
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  uniform float uOpacity;
  varying float vAlpha;

  void main() {
    // soft round mote, no square edges
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.15, d);
    gl_FragColor = vec4(0.1686, 0.1686, 0.1686, a * vAlpha * uOpacity);
  }
`;

let renderer, scene, camera, geometry, material, points;
let clock;
let reduced = false;
let canvasEl;

function count() {
  const area = window.innerWidth * window.innerHeight;
  return Math.max(1200, Math.min(26000, Math.round(area / GRAIN.density)));
}

function build() {
  if (points) {
    scene.remove(points);
    geometry.dispose();
  }

  const n = count();
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  const speed = new Float32Array(n);
  const alpha = new Float32Array(n);
  const sparkle = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    pos[i * 3] = Math.random();
    pos[i * 3 + 1] = Math.random();
    pos[i * 3 + 2] = 0;
    seed[i] = Math.random();
    speed[i] = 0.4 + Math.random() * 1.5;      // wide spread = no shared cycle
    alpha[i] = 1 - GRAIN.variation * Math.random();
    // only a slice of the motes catch the light
    sparkle[i] = Math.random() < GRAIN.sparkleShare ? 0.5 + Math.random() * 0.5 : 0;
  }

  geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  geometry.setAttribute('aSparkle', new THREE.BufferAttribute(sparkle, 1));

  points = new THREE.Points(geometry, material);
  scene.add(points);
}

function size() {
  const pr = Math.min(window.devicePixelRatio || 1, GRAIN.dpr);
  renderer.setPixelRatio(pr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  material.uniforms.uPixelRatio.value = pr;
}

function frame() {
  requestAnimationFrame(frame);
  if (!renderer) return;
  if (!reduced) material.uniforms.uTime.value = clock.getElapsedTime();
  renderer.render(scene, camera);
}

export function initGrain(canvas) {
  canvasEl = canvas;
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();
  camera = new THREE.Camera();     // positions are already in clip space
  clock = new THREE.Clock();

  material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uDrift: { value: GRAIN.drift },
      uSway: { value: GRAIN.sway },
      uSize: { value: GRAIN.size },
      uOpacity: { value: GRAIN.opacity },
      uSparkle: { value: GRAIN.sparkle },
      uPixelRatio: { value: 1 },
    },
  });

  build();
  size();

  let t = 0;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      size();
      build();      // re-seed to the new area, keeps density even
    }, 200);
  });

  requestAnimationFrame(frame);
}

/** Used by the /admin tuning panel and the __goldy console handle. */
export function refreshGrain(rebuild = false) {
  if (!material) return;
  material.uniforms.uDrift.value = GRAIN.drift;
  material.uniforms.uSway.value = GRAIN.sway;
  material.uniforms.uSize.value = GRAIN.size;
  material.uniforms.uOpacity.value = GRAIN.opacity;
  material.uniforms.uSparkle.value = GRAIN.sparkle;
  if (rebuild) build();
}
