/* ---------------------------------------------------------------
   Misty particle field — six independent depth layers.

   Each layer has its own particle size, opacity, drift speed, sway,
   sparkle share, and its own parallax and sideways slide response to
   scroll, so the layers separate as you move and never travel together.
   Density comes from stacking six faint layers rather than from any one
   of them being visible on its own.

   A slice of each layer catches the light: brief, sharpened glints with
   independent rates and phases, so it reads as dust turning in a sunbeam
   rather than anything blinking on a cycle.

   Nothing here can repeat. There is no texture and no tiling: every
   particle gets an independent random position, an independent speed,
   and an independent phase seed, and the motion is a continuous
   wrap rather than a looping animation. Two particles never share a
   cycle, so no pattern can emerge.

   All motion happens in the vertex shader, so 3500 particles cost
   essentially nothing per frame.
--------------------------------------------------------------- */

import * as THREE from 'three';

/* Per layer:
     count     how many particles
     size      base point size
     opacity   peak alpha
     z         [near, far] — drives apparent size and parallax feel
     drift     world units per second, upward
     sway      horizontal sway amplitude
     swaySpeed how fast that sway cycles
     parallax  vertical travel across the whole page
     slide     horizontal travel across the whole page              */
export const MIST = {
  opacity: 1,        // global multiplier, for the tuning panel
  scale: 1,          // global size multiplier
  sparkle: 1,        // global sparkle multiplier

  /* Six layers rather than four, each roughly half the opacity it had —
     the density comes from the number of layers now, not from any one
     of them being visible. Parallax and slide are deliberately small:
     the layers should separate, not travel.

     sparkleShare — fraction of a layer's particles that catch the light
     sparkleAmt   — how much brighter those get at the peak of a glint  */
  layers: [
    { count: 900, size: 0.9, opacity: 0.016, z: [-30, -80],   drift: 0.7, sway: 2.4, swaySpeed: 0.04, parallax: 5,  slide: -3, sparkleShare: 0.05, sparkleAmt: 0.9 },
    { count: 820, size: 1.2, opacity: 0.020, z: [-80, -140],  drift: 1.0, sway: 3.2, swaySpeed: 0.06, parallax: 9,  slide: 4,  sparkleShare: 0.08, sparkleAmt: 1.1 },
    { count: 680, size: 1.6, opacity: 0.024, z: [-140, -205], drift: 1.4, sway: 4.0, swaySpeed: 0.08, parallax: 14, slide: -6, sparkleShare: 0.11, sparkleAmt: 1.3 },
    { count: 520, size: 2.1, opacity: 0.028, z: [-205, -275], drift: 1.9, sway: 5.0, swaySpeed: 0.10, parallax: 19, slide: 8,  sparkleShare: 0.14, sparkleAmt: 1.5 },
    { count: 360, size: 2.7, opacity: 0.031, z: [-275, -345], drift: 2.5, sway: 6.2, swaySpeed: 0.12, parallax: 25, slide: -11, sparkleShare: 0.18, sparkleAmt: 1.8 },
    { count: 220, size: 3.4, opacity: 0.034, z: [-345, -420], drift: 3.2, sway: 7.5, swaySpeed: 0.15, parallax: 32, slide: 14, sparkleShare: 0.22, sparkleAmt: 2.1 },
  ],
};

const RANGE_Y = 620;
const RANGE_X = 900;

const VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aSpeed;
  attribute float aScale;
  attribute float aSparkle;

  uniform float uTime;
  uniform float uDrift;
  uniform float uSway;
  uniform float uSwaySpeed;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uRangeY;
  uniform float uSparkleAmt;

  varying float vGlint;

  void main() {
    vec3 p = position;

    // continuous upward wrap — each particle at its own rate, so the
    // field never returns to a previous arrangement
    p.y = mod(p.y + uTime * uDrift * aSpeed, uRangeY) - uRangeY * 0.5;

    // independent phase per particle, so the sway never syncs up
    p.x += sin(uTime * uSwaySpeed + aSeed * 61.7) * uSway;

    /* Dust sparkle. Only the particles flagged by aSparkle catch light,
       and pow() sharpens the sine into a brief glint rather than a slow
       pulse — so it reads as motes turning in the light, not blinking.
       Every glint has its own rate and phase, so they never chorus. */
    float s = sin(uTime * (0.30 + aSeed * 0.85) + aSeed * 40.0) * 0.5 + 0.5;
    vGlint = 1.0 + aSparkle * pow(s, 9.0) * uSparkleAmt;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    // a glinting mote swells very slightly as it brightens
    gl_PointSize = uSize * aScale * (1.0 + (vGlint - 1.0) * 0.18)
                 * (300.0 / -mv.z) * uPixelRatio;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  uniform float uOpacity;
  varying float vGlint;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(0.1686, 0.1686, 0.1686, a * uOpacity * vGlint);
  }
`;

let renderer, scene, camera;
let layers = [];
let scrollNorm = 0;
let eased = 0;
let reduced = false;
let clock;

function buildLayer(cfg) {
  const n = cfg.count;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  const speed = new Float32Array(n);
  const scale = new Float32Array(n);
  const sparkle = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * RANGE_X;
    pos[i * 3 + 1] = Math.random() * RANGE_Y;
    pos[i * 3 + 2] = cfg.z[0] + Math.random() * (cfg.z[1] - cfg.z[0]);
    seed[i] = Math.random();
    speed[i] = 0.45 + Math.random() * 1.45;   // wide spread = no shared cycle
    scale[i] = 0.6 + Math.random() * 0.9;
    // only a slice of each layer catches the light
    sparkle[i] = Math.random() < (cfg.sparkleShare || 0) ? 0.5 + Math.random() * 0.5 : 0;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
  geo.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));
  geo.setAttribute('aSparkle', new THREE.BufferAttribute(sparkle, 1));

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uDrift: { value: cfg.drift },
      uSway: { value: cfg.sway },
      uSwaySpeed: { value: cfg.swaySpeed },
      uSize: { value: cfg.size * MIST.scale },
      uOpacity: { value: cfg.opacity * MIST.opacity },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uRangeY: { value: RANGE_Y },
      uSparkleAmt: { value: (cfg.sparkleAmt || 0) * MIST.sparkle },
    },
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);
  return { points, mat, cfg };
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  const pr = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pr);
  for (const l of layers) l.mat.uniforms.uPixelRatio.value = Math.min(pr, 2);
}

function frame() {
  requestAnimationFrame(frame);
  if (!renderer) return;

  const t = clock.getElapsedTime();
  eased += (scrollNorm - eased) * 0.055;

  for (const l of layers) {
    if (!reduced) l.mat.uniforms.uTime.value = t;
    // each layer answers scroll differently — that is the depth cue
    l.points.position.y = eased * l.cfg.parallax;
    l.points.position.x = eased * l.cfg.slide;
  }

  camera.position.z = 300 - eased * 26;
  renderer.render(scene, camera);
}

export function initBackground(canvas) {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(52, 1, 0.1, 2000);
  camera.position.z = 300;
  clock = new THREE.Clock();

  const small = window.innerWidth < 720;
  layers = MIST.layers.map((cfg) =>
    buildLayer(small ? { ...cfg, count: Math.round(cfg.count * 0.42) } : cfg)
  );

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
}

/** Called from the scroll loop in main.js. */
export function setBackgroundScroll(v) {
  scrollNorm = v;
}

/** Used by the /admin tuning panel. */
export function applyMist() {
  for (const l of layers) {
    l.mat.uniforms.uSize.value = l.cfg.size * MIST.scale;
    l.mat.uniforms.uOpacity.value = l.cfg.opacity * MIST.opacity;
    l.mat.uniforms.uDrift.value = l.cfg.drift;
    l.mat.uniforms.uSway.value = l.cfg.sway;
    l.mat.uniforms.uSwaySpeed.value = l.cfg.swaySpeed;
    l.mat.uniforms.uSparkleAmt.value = (l.cfg.sparkleAmt || 0) * MIST.sparkle;
  }
}
