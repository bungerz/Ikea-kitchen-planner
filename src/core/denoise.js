import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

/* =========================================================================
 * AI DENOISER (Intel Open Image Denoise UNet running in TensorFlow.js)
 *
 * Takes the path tracer's float accumulation buffer plus two cheap raster
 * "guide" buffers (albedo + normal) and returns a clean HDR image as a
 * float DataTexture. Lazy-loaded: the ~3.7 MB tfjs/OIDN bundle and the
 * weights (public/oidn/*.tza, self-hosted for GitHub Pages) are only fetched
 * the first time a render converges.
 * ========================================================================= */

let denoiserPromise = null;

async function getDenoiser() {
  if (!denoiserPromise) {
    denoiserPromise = (async () => {
      const { Denoiser } = await import('denoiser');
      // Own tfjs WebGL context: never touches three.js' GL state.
      const d = new Denoiser('webgl');
      d.weightsUrl = new URL('oidn', document.baseURI).href.replace(/\/$/, '');
      d.hdr = true;
      // Our albedo/normal guides come from the rasterizer, so they're noise-free:
      // use OIDN's 'clean aux' weights (public/oidn/rt_hdr_calb_cnrm*.tza).
      d.setProp('cleanAux', true);
      d.outputMode = 'float32';
      return d;
    })().catch(err => {
      denoiserPromise = null;
      throw err;
    });
  }
  return denoiserPromise;
}

// Copies a (multisampled) texture into a single-sample float target so it can be read back.
const copyQuad = new FullScreenQuad(new THREE.ShaderMaterial({
  uniforms: { map: { value: null } },
  depthTest: false,
  depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main(){ gl_FragColor = texture2D(map, vUv); }'
}));

const albedoMatCache = new WeakMap();
function albedoMaterialFor(mat) {
  let m = albedoMatCache.get(mat);
  if (!m) {
    m = new THREE.MeshBasicMaterial({
      color: mat.color ? mat.color.clone() : new THREE.Color(1, 1, 1),
      map: mat.map || null,
      alphaMap: mat.alphaMap || null,
      transparent: Boolean(mat.transparent),
      opacity: mat.opacity ?? 1,
      alphaTest: mat.alphaTest || 0,
      side: mat.side
    });
    // Metals reflect their surroundings: OIDN expects a bright albedo for them.
    if ((mat.metalness ?? 0) > 0.5) m.color.lerp(new THREE.Color(1, 1, 1), 0.6);
    albedoMatCache.set(mat, m);
  }
  m.color.copy(mat.color || m.color);
  m.map = mat.map || null;
  return m;
}

const normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });

function renderGuide(renderer, scene, camera, w, h, kind) {
  const msaa = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
  const flat = new THREE.WebGLRenderTarget(w, h, { type: THREE.FloatType });

  const swapped = [];
  const savedBackground = scene.background;
  const savedClear = renderer.getClearColor(new THREE.Color());
  const savedAlpha = renderer.getClearAlpha();

  if (kind === 'albedo') {
    scene.traverseVisible(obj => {
      if (!obj.isMesh || !obj.material) return;
      swapped.push([obj, obj.material]);
      obj.material = Array.isArray(obj.material)
        ? obj.material.map(albedoMaterialFor)
        : albedoMaterialFor(obj.material);
    });
    // Background pixels keep the sky radiance as albedo (clamped later).
  } else {
    scene.overrideMaterial = normalMat;
    scene.background = null;
    renderer.setClearColor(new THREE.Color(0.5, 0.5, 0.5), 1); // encodes a zero normal
  }

  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(msaa);
  renderer.clear();
  renderer.render(scene, camera);
  copyQuad.material.uniforms.map.value = msaa.texture;
  renderer.setRenderTarget(flat);
  copyQuad.render(renderer);
  renderer.setRenderTarget(prevTarget);

  swapped.forEach(([obj, mat]) => { obj.material = mat; });
  scene.overrideMaterial = null;
  scene.background = savedBackground;
  renderer.setClearColor(savedClear, savedAlpha);

  const data = readRgb(renderer, flat, w, h, kind === 'albedo');
  msaa.dispose();
  flat.dispose();
  return data;
}

function readRgb(renderer, target, w, h, clamp01) {
  const rgba = new Float32Array(w * h * 4);
  renderer.readRenderTargetPixels(target, 0, 0, w, h, rgba);
  const rgb = new Float32Array(w * h * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    for (let c = 0; c < 3; c++) {
      let v = rgba[i + c];
      if (!Number.isFinite(v)) v = 0;
      rgb[j + c] = clamp01 ? Math.min(1, Math.max(0, v)) : Math.max(0, v);
    }
  }
  return rgb;
}

/* -------------------------------------------------------------------------
 * OIDN HDR pre/post-processing. Native OIDN feeds its HDR networks
 * autoexposed, PU-encoded ("perceptually uniform") values; the tfjs port
 * doesn't, so we do it here. Constants from OIDN's transfer_function.h.
 * ------------------------------------------------------------------------- */
const PU_A = 1.41283765e+03, PU_B = 1.64593172e+00, PU_C = 4.31384981e-01;
const PU_D = -2.94139609e-03, PU_E = 1.92653254e-01, PU_F = 6.26026094e-03;
const PU_G = 9.98620152e-01, PU_Y0 = 1.57945760e-06, PU_Y1 = 3.22087631e-02;
const PU_X0 = 2.23151711e-03, PU_X1 = 3.70974749e-01;
const HDR_Y_MAX = 65504;

export function puForward(y) {
  if (y <= PU_Y0) return PU_A * y;
  if (y <= PU_Y1) return PU_B * Math.pow(y, PU_C) + PU_D;
  return PU_E * Math.log(y + PU_F) + PU_G;
}
export function puInverse(x) {
  if (x <= PU_X0) return x / PU_A;
  if (x <= PU_X1) return Math.pow((x - PU_D) / PU_B, 1 / PU_C);
  return Math.exp((x - PU_G) / PU_E) - PU_F;
}
const PU_NORM = 1 / puForward(HDR_Y_MAX);

// OIDN autoexposure: key 0.18 over the log-average luminance of 16x16 pixel bins.
function autoexposure(rgb, w, h) {
  const bin = 16;
  let logSum = 0;
  let count = 0;
  for (let by = 0; by < h; by += bin) {
    for (let bx = 0; bx < w; bx += bin) {
      let sum = 0;
      let n = 0;
      for (let y = by; y < Math.min(by + bin, h); y++) {
        for (let x = bx; x < Math.min(bx + bin, w); x++) {
          const i = (y * w + x) * 3;
          sum += 0.212671 * rgb[i] + 0.715160 * rgb[i + 1] + 0.072169 * rgb[i + 2];
          n++;
        }
      }
      const L = sum / n;
      if (L > 1e-8) { logSum += Math.log2(L); count++; }
    }
  }
  return count > 0 ? 0.18 / Math.pow(2, logSum / count) : 1;
}

/**
 * Denoise the path tracer's current accumulation.
 * @returns {Promise<THREE.DataTexture>} linear HDR RGBA float texture, same size as the target.
 */
export async function denoisePathTrace({ renderer, scene, camera, colorTarget, quality = 'balanced' }) {
  const w = colorTarget.width;
  const h = colorTarget.height;

  // Read everything synchronously first, so the scene can't change under us.
  const color = readRgb(renderer, colorTarget, w, h, false);
  const albedo = renderGuide(renderer, scene, camera, w, h, 'albedo');
  const normal = renderGuide(renderer, scene, camera, w, h, 'normal');

  const d = await getDenoiser();
  d.quality = quality; // 'fast' uses the small weights (mobile)
  d.width = w;
  d.height = h;
  // (The package forces tiling itself whenever aux buffers are used.)
  const scale = autoexposure(color, w, h);
  for (let i = 0; i < color.length; i++) color[i] = puForward(color[i] * scale) * PU_NORM;
  d.setInputData('color', color, { channels: 3 });
  d.setInputData('albedo', albedo, { channels: 3 });
  d.setInputData('normal', normal, { channels: 3 });
  const out = await d.execute();

  const rgba = new Float32Array(w * h * 4);
  const invScale = 1 / scale;
  for (let i = 0, j = 0; j < rgba.length; i += 3, j += 4) {
    rgba[j] = Math.max(0, puInverse(out[i] / PU_NORM)) * invScale;
    rgba[j + 1] = Math.max(0, puInverse(out[i + 1] / PU_NORM)) * invScale;
    rgba[j + 2] = Math.max(0, puInverse(out[i + 2] / PU_NORM)) * invScale;
    rgba[j + 3] = 1;
  }
  const tex = new THREE.DataTexture(rgba, w, h, THREE.RGBAFormat, THREE.FloatType);
  // Many mobile GPUs (Adreno, Mali) can't linearly filter float textures.
  const linearOk = renderer.extensions.has('OES_texture_float_linear');
  tex.minFilter = linearOk ? THREE.LinearFilter : THREE.NearestFilter;
  tex.magFilter = tex.minFilter;
  tex.needsUpdate = true;
  return tex;
}
