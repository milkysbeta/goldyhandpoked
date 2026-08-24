/* ---------------------------------------------------------------
   Film grain — Three.js, particles only.

   The previous version generated a two-octave noise texture in canvas
   2D: a fine octave plus a soft coarse one. That coarse octave is what
   made it read as a grey wash rather than grain.

   This draws nothing but discrete particles. A fullscreen shader hashes
   each grain cell, discards every cell below the density threshold, and
   paints the survivors flat charcoal. There is no gradient, no tonal
   field, and no texture file — so nothing can tile and nothing can band.

   It renders once and stops. Grain is static, like a print.
--------------------------------------------------------------- */

import * as THREE from 'three';

export const GRAIN = {
  cell: 1.0,        // device pixels per grain — 1 is the finest possible
  density: 0.10,    // fraction of cells that carry a particle
  opacity: 0.42,    // strength of the darkest particles
  variation: 0.45,  // how much particle alpha varies, 0 = all identical
  dpr: 2,           // cap
};

const VERT = /* glsl */ `
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform float uCell;
  uniform float uDensity;
  uniform float uOpacity;
  uniform float uVariation;
  uniform float uSeed;

  /* A sin-based hash is the usual one-liner, but sin() is periodic and
     on some GPUs its precision loss shows up as faint diagonal banding —
     exactly the repeating structure we cannot have here. This one has no
     trig in it at all, so there is nothing to beat against the pixel
     grid and no pattern can form. */
  float hash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }

  void main() {
    vec2 cell = floor(gl_FragCoord.xy / uCell);

    // sparse: most cells are empty, so the result is particles, not a field
    if (hash(cell + uSeed) > uDensity) discard;

    // vary only the alpha of the particles themselves — never the gaps
    float a = uOpacity * (1.0 - uVariation + uVariation * hash(cell + 17.31));

    gl_FragColor = vec4(0.1686, 0.1686, 0.1686, a);   // #2B2B2B
  }
`;

let renderer, scene, camera, material, canvasEl;

function size() {
  const dpr = Math.min(window.devicePixelRatio || 1, GRAIN.dpr);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
}

function draw() {
  if (!renderer) return;
  renderer.render(scene, camera);
}

export function initGrain(canvas) {
  canvasEl = canvas;

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();
  camera = new THREE.Camera();

  material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uCell: { value: GRAIN.cell },
      uDensity: { value: GRAIN.density },
      uOpacity: { value: GRAIN.opacity },
      uVariation: { value: GRAIN.variation },
      uSeed: { value: Math.random() * 100 },
    },
  });

  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  size();
  draw();

  let t = 0;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      size();
      draw();
    }, 180);
  });
}

/** Used by the /admin tuning panel. */
export function refreshGrain(reseed = false) {
  if (!material) return;
  material.uniforms.uCell.value = GRAIN.cell;
  material.uniforms.uDensity.value = GRAIN.density;
  material.uniforms.uOpacity.value = GRAIN.opacity;
  material.uniforms.uVariation.value = GRAIN.variation;
  if (reseed) material.uniforms.uSeed.value = Math.random() * 100;
  draw();
}
