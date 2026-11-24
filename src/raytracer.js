import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import {
  WebGLPathTracer,
  ProceduralEquirectTexture,
  ShapedAreaLight
} from 'three-gpu-pathtracer';

/* =========================================================================
 * OVERHAULED WEBGL2 GPU PATH TRACER ("PHOTO RENDER" STUDIO)
 * Key fixes over v1:
 * 1. Removed flat indoor softbox window portals that washed out sun shafts
 * 2. 1024x512 physically-scaled Ambilly HDRI sky with baked Mont Salève /
 *    Jura / Voirons Alpine skyline + high-contrast solar disc (~7x sun/sky)
 * 3. Higher interior bounce depth (5 -> 6 -> 8 bounces) & crisp speculars
 * 4. Sharpness-preserving Firefly-Guard + Adaptive Edge-Stopping À-Trous
 *    Denoiser (ZERO permanent 3x3 box blur!)
 * 5. Live Exposure EV (-1.2..+1.2), Denoise Mode (Off/Subtle/Smooth), and
 *    Interior Lamps (Auto/On/Off) without resetting converged renders!
 * ========================================================================= */

export const RT_PROFILES = {
  fast: {
    key: 'fast',
    label: 'Fast Preview',
    renderScale: 0.72,
    tiles: [2, 2],
    bounces: 5,
    targetSamples: 96,
    textureSize: 512,
    filterGlossyFactor: 0.28,
    maxDpr: 1.25
  },
  balanced: {
    key: 'balanced',
    label: 'Balanced',
    renderScale: 0.86,
    tiles: [2, 1],
    bounces: 6,
    targetSamples: 192,
    textureSize: 1024,
    filterGlossyFactor: 0.20,
    maxDpr: 1.5
  },
  photo: {
    key: 'photo',
    label: 'Studio Photo',
    renderScale: 1.0,
    tiles: [1, 1],
    bounces: 8,
    targetSamples: 384,
    textureSize: 1024,
    filterGlossyFactor: 0.14,
    maxDpr: 1.75
  }
};

export function detectGpuProfile(renderer) {
  const gl = renderer?.getContext ? renderer.getContext() : null;
  let raw = '';
  try {
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) raw = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
  } catch (_) {}

  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
  const isMobileUa = /Android|iPhone|iPad|iPod|Mobile|SM-F|SM-S/i.test(ua);
  const isCoarse = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const upper = raw.toUpperCase();

  let gpuLabel = 'WebGL2 GPU';
  const rtxMatch = raw.match(/RTX\s*\d{4}\s*(?:Ti|SUPER)?/i);
  const gtxMatch = raw.match(/GTX\s*\d{4}\s*(?:Ti|SUPER)?/i);
  const rxMatch = raw.match(/RX\s*\d{4}\s*(?:XT|XTX)?/i);
  const adrenoMatch = raw.match(/Adreno\s*(?:\(TM\)\s*)?\d+/i);
  const xclipseMatch = raw.match(/Xclipse\s*\d+/i);
  const appleMatch = raw.match(/Apple\s*(?:M\d+(?:\s*(?:Pro|Max|Ultra))?|GPU)/i);
  const intelMatch = raw.match(/Intel\s*(?:\(R\)\s*)?(?:Arc|Iris|UHD|HD)\s*[A-Za-z0-9]*/i);

  if (rtxMatch) gpuLabel = `NVIDIA ${rtxMatch[0].replace(/\s+/g, ' ').trim()}`;
  else if (gtxMatch) gpuLabel = `NVIDIA ${gtxMatch[0].replace(/\s+/g, ' ').trim()}`;
  else if (rxMatch) gpuLabel = `AMD ${rxMatch[0].replace(/\s+/g, ' ').trim()}`;
  else if (adrenoMatch) gpuLabel = `Qualcomm ${adrenoMatch[0].replace(/\(TM\)\s*/i, '').replace(/\s+/g, ' ').trim()}`;
  else if (xclipseMatch) gpuLabel = `Samsung ${xclipseMatch[0].replace(/\s+/g, ' ').trim()}`;
  else if (/IMMORTALIS/i.test(raw)) gpuLabel = 'ARM Immortalis GPU';
  else if (/MALI/i.test(raw)) gpuLabel = 'ARM Mali GPU';
  else if (appleMatch) gpuLabel = appleMatch[0].trim();
  else if (intelMatch) gpuLabel = intelMatch[0].replace(/\(R\)\s*/i, '').replace(/\s+/g, ' ').trim();
  else if (/SWIFTSHADER|LLVMPIPE|SOFTWARE/i.test(upper)) gpuLabel = 'Software WebGL';
  else if (raw && !/^ANGLE\s*\(Google/i.test(raw)) {
    gpuLabel = raw.replace(/^ANGLE\s*\([^,]+,\s*/i, '').split(/[(),]/)[0].trim().slice(0, 24) || 'WebGL2 GPU';
  }

  if (/SWIFTSHADER|LLVMPIPE|SOFTWARE/i.test(upper)) {
    return { profileKey: 'fast', gpuLabel, isSoftware: true };
  }
  if (isMobileUa || isCoarse || /ADRENO|MALI|XCLIPSE|IMMORTALIS|POWERVR/i.test(upper)) {
    return { profileKey: 'fast', gpuLabel, isSoftware: false };
  }
  if (/RTX|RADEON RX\s*[6789]|ARC\s*[AB]\d|M[2-9]\s*(?:PRO|MAX|ULTRA)|TITAN|QUADRO|GTX\s*1080|GTX\s*1660/i.test(upper)) {
    return { profileKey: 'balanced', gpuLabel, isSoftware: false };
  }
  return { profileKey: 'balanced', gpuLabel, isSoftware: false };
}

/**
 * Sharpness-Preserving Firefly Guard + Edge-Stopping À-Trous Denoiser + Live Exposure EV.
 * - Never pre-blurs with a 3x3 box filter!
 * - Clamps statistical firefly spikes (> 2.8x local neighborhood median luminance) only.
 * - Anchors edge-stopping bilateral weights on the unblurred pixel so wood grain,
 *   tile grout, and cabinet bevels stay crisp!
 */
function createSharpDenoiseDisplayMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NoBlending,
    uniforms: {
      map: { value: null },
      opacity: { value: 1.0 },
      exposureMult: { value: 1.0 },
      denoiseStrength: { value: 0.5 }, // 0.0 = raw (+firefly guard), 0.5 = subtle, 1.0 = smooth
      colorSigma: { value: 0.16 },
      stepSize: { value: 1.0 }
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D map;
      uniform float opacity;
      uniform float exposureMult;
      uniform float denoiseStrength;
      uniform float colorSigma;
      uniform float stepSize;
      varying vec2 vUv;

      float luma(vec3 c) {
        return dot(c, vec3(0.2126, 0.7152, 0.0722));
      }

      vec3 safeSample(vec2 uv) {
        vec3 c = texture2D(map, clamp(uv, vec2(0.0), vec2(1.0))).rgb;
        if (any(isnan(c)) || any(isinf(c))) return vec3(0.0);
        return max(c, vec3(0.0));
      }

      // Perceptual log-compression for edge comparison (preserves shadow & highlight edges equally)
      vec3 toLogP(vec3 c) {
        return log(vec3(1.0) + max(c, vec3(0.0)) * 2.5);
      }

      void main() {
        vec2 texSize = vec2(textureSize(map, 0));
        vec2 invSize = 1.0 / max(texSize, vec2(1.0));

        vec3 center = safeSample(vUv);

        // Step 1: Firefly-only outlier suppressor (3x3 neighborhood trimmed mean)
        // Touches ONLY isolated extreme hot spikes (> 2.8x neighbor average)
        vec3 nSum = vec3(0.0);
        float maxLum = 0.0;
        vec3 maxCol = vec3(0.0);
        for (int gx = -1; gx <= 1; gx++) {
          for (int gy = -1; gy <= 1; gy++) {
            if (gx == 0 && gy == 0) continue;
            vec3 nc = safeSample(vUv + vec2(float(gx), float(gy)) * invSize);
            float nl = luma(nc);
            nSum += nc;
            if (nl > maxLum) {
              maxLum = nl;
              maxCol = nc;
            }
          }
        }
        // Drop the brightest neighbor to resist double-fireflies
        vec3 trimMean = (nSum - maxCol) / 7.0;
        float trimLum = luma(trimMean);
        float cLum = luma(center);
        if (cLum > trimLum * 2.8 + 0.35) {
          float targetLum = trimLum * 2.2 + 0.25;
          center *= targetLum / max(cLum, 1e-4);
        }

        vec3 finalCol = center;

        // Step 2: Sharpness-preserving 5x5 À-Trous edge-stopping filter anchored on sharp center
        if (denoiseStrength > 0.01) {
          vec3 centerP = toLogP(center);
          float invColor2 = 0.5 / max(colorSigma * colorSigma, 0.002);

          // 1D B-spline à-trous kernel weights: [1/16, 1/4, 3/8, 1/4, 1/16]
          float kw[5];
          kw[0] = 0.0625;
          kw[1] = 0.25;
          kw[2] = 0.375;
          kw[3] = 0.25;
          kw[4] = 0.0625;

          vec3 accum = vec3(0.0);
          float wSum = 0.0;

          for (int dx = -2; dx <= 2; dx++) {
            float wx = kw[dx + 2];
            for (int dy = -2; dy <= 2; dy++) {
              float wy = kw[dy + 2];
              vec2 off = vec2(float(dx), float(dy)) * stepSize * invSize;
              vec3 sCol = (dx == 0 && dy == 0) ? center : safeSample(vUv + off);
              // Clamp neighbor fireflies too so they never bleed into neighbors
              float sLum = luma(sCol);
              if (sLum > trimLum * 3.0 + 0.45) {
                sCol *= (trimLum * 2.4 + 0.30) / max(sLum, 1e-4);
              }
              vec3 diff = toLogP(sCol) - centerP;
              float wColor = exp(-dot(diff, diff) * invColor2);
              float w = wx * wy * wColor;
              accum += sCol * w;
              wSum += w;
            }
          }

          vec3 denoised = accum / max(wSum, 1e-5);
          finalCol = mix(center, denoised, clamp(denoiseStrength, 0.0, 1.0));
        }

        // Apply live EV exposure trim BEFORE AgX tone mapping & sRGB encoding!
        gl_FragColor = vec4(finalCol * exposureMult, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.a = opacity;
      }
    `
  });
}

/**
 * Generates a 1024x512 physically-scaled HDR equirectangular sky synchronized
 * to Ambilly's live NOAA sun — WITH baked Mont Salève (SSW), Jura (NW), and
 * Voirons (E) mountain horizons so windows show a real sunlit skyline in RT!
 */
function buildAmbillyHdrEnv(sunData, d65Override = false) {
  const tex = new ProceduralEquirectTexture(1024, 512);
  const sunDir = (sunData?.dir || new THREE.Vector3(-0.5, 0.5, 0.7)).clone().normalize();
  const dir = new THREE.Vector3();

  const zenith = sunData?.skyZenith || new THREE.Color('#4D88D1');
  const horizon = sunData?.skyHorizon || new THREE.Color('#E0EBF5');
  const sunCol = sunData?.sunColor || new THREE.Color('#FFF4DE');
  const isNight = Boolean(sunData?.isNight) && !d65Override;
  const isTwilight = Boolean(sunData?.isTwilight) && !d65Override;

  // Approximate Alpine ridge elevation angle (radians) around azimuth atan2(x, z)
  const alpineRidgeHeight = (dx, dz) => {
    const az = Math.atan2(dx, dz); // 0 = +Z (SSW Loggia/Salève), -PI/2 = -X (WNW Jura), +PI/2 = +X (ESE Voirons)
    // Mont Salève broad flat-topped ridge toward +Z (az around -0.25..+0.45)
    const saleve = Math.exp(-Math.pow((az - 0.05) / 0.58, 2)) * 0.135 * (0.85 + 0.15 * Math.cos(az * 7.0));
    // Massif du Jura gentle blue ridge toward -X/-Z (az around -2.1)
    const jura = Math.exp(-Math.pow((az + 2.0) / 0.75, 2)) * 0.085 * (0.8 + 0.2 * Math.sin(az * 9.0));
    // Les Voirons toward +X (az around +1.6)
    const voirons = Math.exp(-Math.pow((az - 1.55) / 0.65, 2)) * 0.10 * (0.8 + 0.2 * Math.cos(az * 6.0));
    return Math.max(saleve, jura, voirons);
  };

  tex.generationCallback = (polar, _uv, _coord, color) => {
    dir.setFromSpherical(polar);
    const up = Math.max(0, dir.y);
    const down = Math.max(0, -dir.y);

    if (d65Override) {
      const v = Math.max(0.38, 1.05 + 0.45 * up - 0.32 * down);
      color.setRGB(v, v, v);
      return;
    }

    if (isNight) {
      const r = 0.02 + 0.015 * (1 - up) + 0.015 * down;
      const g = 0.028 + 0.02 * (1 - up) + 0.015 * down;
      const b = 0.055 + 0.03 * (1 - up) + 0.015 * down;
      color.setRGB(r, g, b);
      return;
    }

    // Physical sky dome luminance (boosted naturally so daylight fills rooms via real windows!)
    const skyScale = isTwilight ? 1.05 : 1.75;
    const k = Math.pow(up, 0.52);
    let r = THREE.MathUtils.lerp(horizon.r, zenith.r, k) * skyScale;
    let g = THREE.MathUtils.lerp(horizon.g, zenith.g, k) * skyScale;
    let b = THREE.MathUtils.lerp(horizon.b, zenith.b, k) * skyScale;

    // Subtle sunlit cumulus cloud wisps in upper sky for organic window reflections
    if (dir.y > 0.08) {
      const cx = dir.x / (dir.y + 0.25);
      const cz = dir.z / (dir.y + 0.25);
      const cloud = Math.max(0, Math.sin(cx * 1.4 + 0.7) * Math.cos(cz * 1.1 - 0.4) * 0.5 + 0.18);
      const fade = Math.min(1, (dir.y - 0.08) * 3.0) * (1 - up * 0.45);
      const cBoost = cloud * fade * (isTwilight ? 0.22 : 0.35);
      r += cBoost * sunCol.r;
      g += cBoost * sunCol.g;
      b += cBoost * sunCol.b;
    }

    // Baked Alpine Horizon Silhouette (Mont Salève / Jura / Voirons) & Écoquartier Ground Bounce
    const ridgeH = alpineRidgeHeight(dir.x, dir.z);
    if (dir.y >= -0.02 && dir.y < ridgeH) {
      const blend = THREE.MathUtils.smoothstep(dir.y, ridgeH - 0.018, ridgeH);
      const mtR = THREE.MathUtils.lerp(0.36, horizon.r * 0.85, 0.52);
      const mtG = THREE.MathUtils.lerp(0.42, horizon.g * 0.85, 0.52);
      const mtB = THREE.MathUtils.lerp(0.50, horizon.b * 0.90, 0.55);
      r = THREE.MathUtils.lerp(mtR, r, blend);
      g = THREE.MathUtils.lerp(mtG, g, blend);
      b = THREE.MathUtils.lerp(mtB, b, blend);
    } else if (down > 0) {
      // Warm sunlit limestone/courtyard ground bounce below the 4th floor
      const gd = Math.min(1, down * 3.0);
      const bounceScale = isTwilight ? 0.35 : 0.62;
      r = THREE.MathUtils.lerp(r, 0.56 * bounceScale, gd);
      g = THREE.MathUtils.lerp(g, 0.53 * bounceScale, gd);
      b = THREE.MathUtils.lerp(b, 0.46 * bounceScale, gd);
    }

    // Physically-proportioned solar halo + bright HDR sun disc (creates warm sun shafts!)
    const sunDot = Math.max(0, dir.dot(sunDir));
    const halo = Math.pow(sunDot, 14.0) * 1.2 + Math.pow(sunDot, 96.0) * 5.0;
    // Soft ~1.6° solar disc for crisp-yet-natural architectural sun shadows without harsh fireflies
    const disc = THREE.MathUtils.smoothstep(sunDot, 0.9990, 0.9997) * (isTwilight ? 10.0 : 28.0);
    r += sunCol.r * (halo + disc);
    g += sunCol.g * (halo + disc);
    b += sunCol.b * (halo + disc);

    color.setRGB(r, g, b);
  };

  tex.update();
  return tex;
}

/**
 * Full-Apartment On-Demand WebGL2 GPU Path Tracing Studio Engine.
 */
export class KitchenRayTracer {
  constructor({ renderer, scene, camera, controls, lightRefs, constants }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.lightRefs = lightRefs;
    this.constants = constants;

    this.active = false;
    this.paused = false;
    this.denoiseMode = 'subtle'; // 'off' | 'subtle' | 'smooth'
    this.exposureEv = 0.0;       // -1.2 .. +1.2 EV live trim without resetting samples!
    this.lampsMode = 'auto';     // 'auto' | 'on' | 'off'
    this.initialized = false;
    this.needsRebuild = false;
    this.needsMaterialsUpdate = false;
    this.needsLightsUpdate = false;
    this.needsEnvUpdate = false;

    const detected = detectGpuProfile(renderer);
    this.gpuLabel = detected.gpuLabel;
    this.profileKey = detected.profileKey;
    this.isSoftware = Boolean(detected.isSoftware);
    this.targetSamples = RT_PROFILES[this.profileKey].targetSamples;
    this.currentSunData = null;
    this.currentD65 = false;

    this._savedRaster = null;
    this._hiddenMeshes = [];
    this._hdrEnvTex = null;
    this._rtLightsGroup = null;
    this._rtBackLedLight = null;
    this._rtLeftLedLight = null;
    this._rtPendantLights = [];
    this._rtSconceLights = [];

    this._pathTracer = null;
    this._displayQuad = null;

    // Samples/sec telemetry
    this._rateStartTs = 0;
    this._rateStartSamples = 0;
    this.samplesPerSec = 0;
  }

  _ensureInitialized() {
    if (this.initialized) return;

    this._pathTracer = new WebGLPathTracer(this.renderer);
    this._pathTracer.multipleImportanceSampling = true;
    this._pathTracer.transmissiveBounces = 4;
    this._pathTracer.renderDelay = 30;
    this._pathTracer.minSamples = 1;
    this._pathTracer.fadeDuration = 90;
    this._pathTracer.rasterizeScene = true;
    this._pathTracer.dynamicLowRes = true;
    this._pathTracer.lowResScale = 0.45;
    this._pathTracer.synchronizeRenderSize = true;

    this._displayQuad = new FullScreenQuad(createSharpDenoiseDisplayMaterial());

    this._pathTracer.renderToCanvasCallback = (target, renderer, quad) => {
      const currentAutoClear = renderer.autoClear;
      renderer.autoClear = false;

      const samples = this._pathTracer.samples;
      const dMat = this._displayQuad.material;
      dMat.uniforms.map.value = target.texture;
      dMat.uniforms.opacity.value = quad.material.opacity;
      dMat.uniforms.exposureMult.value = Math.pow(2.0, this.exposureEv);
      dMat.blending = quad.material.opacity < 1 ? THREE.NormalBlending : THREE.NoBlending;

      // Adaptive sharpness-preserving denoise tapering cleanly as samples converge!
      if (this.denoiseMode === 'off' || samples < 2) {
        dMat.uniforms.denoiseStrength.value = 0.0;
      } else if (this.denoiseMode === 'subtle') {
        const taper = samples < 24 ? 0.72 : samples < 80 ? 0.50 : samples < 180 ? 0.30 : 0.14;
        dMat.uniforms.denoiseStrength.value = taper;
        dMat.uniforms.colorSigma.value = samples < 40 ? 0.22 : 0.13;
        dMat.uniforms.stepSize.value = samples < 30 ? 2.0 : 1.0;
      } else {
        // 'smooth'
        const taper = samples < 30 ? 0.92 : samples < 100 ? 0.74 : samples < 200 ? 0.52 : 0.32;
        dMat.uniforms.denoiseStrength.value = taper;
        dMat.uniforms.colorSigma.value = samples < 40 ? 0.30 : 0.19;
        dMat.uniforms.stepSize.value = samples < 50 ? 2.0 : 1.0;
      }

      this._displayQuad.render(renderer);
      renderer.autoClear = currentAutoClear;
    };

    this._buildPhysicalInteriorLights();
    this._applyProfileSettings(this.profileKey, false);
    this.initialized = true;
  }

  _buildPhysicalInteriorLights() {
    const grp = new THREE.Group();
    grp.name = 'RTPhysicalInteriorLights';

    // Kitchen under-cabinet warm 2700K LED strips
    const backLed = new ShapedAreaLight(new THREE.Color('#FFD296'), 8.0, 1.70, 0.06);
    backLed.isCircular = false;
    backLed.position.set(3.47, 1.45, 3.34);
    backLed.rotation.x = -Math.PI / 2;
    grp.add(backLed);
    this._rtBackLedLight = backLed;

    const leftLed = new ShapedAreaLight(new THREE.Color('#FFD296'), 8.0, 0.06, 1.20);
    leftLed.isCircular = false;
    leftLed.position.set(5.28, 1.45, 4.62);
    leftLed.rotation.x = -Math.PI / 2;
    grp.add(leftLed);
    this._rtLeftLedLight = leftLed;

    // Practical ceiling pendant discs positioned cleanly below shades
    this._rtPendantLights = [];
    [
      [1.55, 1.50, 6.40], // Dining pendant
      [3.85, 1.80, 7.05], // Lounge pendant
      [2.62, 1.80, 1.64], // Ch. 3 Master pendant
      [9.71, 1.80, 8.85], // Ch. 1 pendant
      [6.90, 1.80, 8.85], // Ch. 2 pendant
      [6.95, 2.38, 4.35], // SDB flush
      [8.76, 2.38, 4.55]  // WC flush
    ].forEach(([px, py, pz]) => {
      const pDisc = new ShapedAreaLight(new THREE.Color('#FFD08A'), 14.0, 0.30, 0.30);
      pDisc.isCircular = true;
      pDisc.position.set(px, py, pz);
      pDisc.rotation.x = -Math.PI / 2;
      grp.add(pDisc);
      this._rtPendantLights.push(pDisc);
    });

    // Chambre 3 TMA #2 twin bedside wall sconces (warm upward/outward glow)
    this._rtSconceLights = [];
    [[0.73, 1.56, 0.42], [2.83, 1.56, 0.42]].forEach(([sx, sy, sz]) => {
      const sc = new ShapedAreaLight(new THREE.Color('#FFCA80'), 8.0, 0.14, 0.14);
      sc.isCircular = true;
      sc.position.set(sx, sy, sz);
      sc.rotation.y = Math.PI; // Emit South (+Z) into Master Suite
      grp.add(sc);
      this._rtSconceLights.push(sc);
    });

    this._rtLightsGroup = grp;
  }

  _configureSceneLightingForRT(sunData, d65Override = false) {
    this.currentSunData = sunData;
    this.currentD65 = Boolean(d65Override);
    const { sunLight, fillLight, rimLight, underCabLights, pendantLights } = this.lightRefs;

    // Disable raster fake fill/point lights so physically-based path tracing takes over cleanly
    if (fillLight) fillLight.visible = false;
    if (rimLight) rimLight.visible = false;
    (underCabLights || []).forEach(l => { l.visible = false; });
    (pendantLights || []).forEach(l => { l.visible = false; });

    if (this._hdrEnvTex) this._hdrEnvTex.dispose();
    this._hdrEnvTex = buildAmbillyHdrEnv(sunData, d65Override);
    this.scene.environment = this._hdrEnvTex;
    this.scene.background = this._hdrEnvTex;

    const isNight = Boolean(sunData?.isNight) && !d65Override;
    const isEvening = Boolean(sunData?.lightsRecommendedOn) && !d65Override;
    const lampsOn = this.lampsMode === 'on'
      ? true
      : this.lampsMode === 'off'
        ? false
        : (isNight || isEvening);

    if (d65Override) {
      this.scene.environmentIntensity = 1.35;
      this.renderer.toneMappingExposure = 1.0;
      sunLight.visible = true;
      sunLight.color.set('#FFFFFF');
      sunLight.intensity = 2.6;
      sunLight.position.set(7.6, 18.0, 13.6);
    } else if (isNight) {
      this.scene.environmentIntensity = 0.22;
      this.renderer.toneMappingExposure = 1.08;
      sunLight.visible = false;
    } else {
      // Strong, natural sun-to-sky contrast (carves real warm shafts through Loggia & West windows!)
      this.scene.environmentIntensity = isEvening ? 0.95 : 1.35;
      this.renderer.toneMappingExposure = 1.02;
      sunLight.visible = true;
      if (sunData) {
        sunLight.color.copy(sunData.sunColor);
        sunLight.intensity = Math.max(2.6, sunData.sunIntensity * 2.5);
        sunLight.position.set(
          5.6 + sunData.dir.x * 24,
          Math.max(2.4, sunData.dir.y * 24),
          5.6 + sunData.dir.z * 24
        );
      }
    }

    const lampScale = isNight ? 1.35 : isEvening ? 1.0 : 0.65;
    this._rtBackLedLight.visible = lampsOn;
    this._rtBackLedLight.intensity = 10.0 * lampScale;
    this._rtLeftLedLight.visible = lampsOn;
    this._rtLeftLedLight.intensity = 10.0 * lampScale;
    this._rtPendantLights.forEach(l => {
      l.visible = lampsOn;
      l.intensity = 15.0 * lampScale;
    });
    this._rtSconceLights.forEach(l => {
      l.visible = lampsOn;
      l.intensity = 8.5 * lampScale;
    });
  }

  _hideRtIncompatibleMeshes() {
    this._hiddenMeshes = [];
    this.scene.traverse(obj => {
      if (obj.visible && obj.userData && (obj.userData.hideInRT || obj.userData.isWindowGlass)) {
        obj.visible = false;
        this._hiddenMeshes.push(obj);
      }
    });
  }

  _restoreHiddenMeshes() {
    for (const obj of this._hiddenMeshes) obj.visible = true;
    this._hiddenMeshes = [];
  }

  _applyProfileSettings(profileKey, resetAccumulation = true) {
    // Support legacy 'mobile' / 'ultra' keys gracefully
    const mapped = profileKey === 'mobile' ? 'fast' : profileKey === 'ultra' ? 'photo' : profileKey;
    const p = RT_PROFILES[mapped] || RT_PROFILES.balanced;
    this.profileKey = p.key;
    this.targetSamples = p.targetSamples;

    if (!this._pathTracer) return;
    this._pathTracer.renderScale = this.isSoftware ? Math.min(p.renderScale, 0.35) : p.renderScale;
    this._pathTracer.tiles.set(p.tiles[0], p.tiles[1]);
    this._pathTracer.bounces = this.isSoftware ? Math.min(p.bounces, 4) : p.bounces;
    this._pathTracer.filterGlossyFactor = p.filterGlossyFactor;
    this._pathTracer.textureSize.set(p.textureSize, p.textureSize);

    if (resetAccumulation && this.active) {
      this._resetRateMeter();
      this.paused = false;
      this._pathTracer.pausePathTracing = false;
      this._pathTracer.updateMaterials();
      this._pathTracer.reset();
    }
  }

  _resetRateMeter() {
    this._rateStartTs = performance.now();
    this._rateStartSamples = 0;
    this.samplesPerSec = 0;
  }

  getMaxDpr() {
    return (RT_PROFILES[this.profileKey] || RT_PROFILES.balanced).maxDpr;
  }

  async enable({ sunData, d65Override = false } = {}, onStatus) {
    this._ensureInitialized();
    if (this.active) return;

    if (onStatus) onStatus('compiling');

    const { sunLight } = this.lightRefs;
    this._savedRaster = {
      background: this.scene.background,
      environment: this.scene.environment,
      environmentIntensity: this.scene.environmentIntensity ?? 1.0,
      exposure: this.renderer.toneMappingExposure,
      pixelRatio: this.renderer.getPixelRatio(),
      sunColor: sunLight.color.clone(),
      sunIntensity: sunLight.intensity,
      sunPos: sunLight.position.clone()
    };

    const safeDpr = Math.min(window.devicePixelRatio || 1, this.getMaxDpr());
    this.renderer.setPixelRatio(safeDpr);

    this._hideRtIncompatibleMeshes();

    if (!this._rtLightsGroup.parent) {
      this.scene.add(this._rtLightsGroup);
    }

    this._configureSceneLightingForRT(sunData, d65Override);

    this.active = true;
    this.paused = false;
    this._resetRateMeter();
    this._pathTracer.enablePathTracing = true;
    this._pathTracer.pausePathTracing = false;

    await new Promise(resolve => requestAnimationFrame(resolve));

    this._pathTracer.setScene(this.scene, this.camera);
    this.needsRebuild = false;
    this.needsMaterialsUpdate = false;
    this.needsLightsUpdate = false;
    this.needsEnvUpdate = false;

    if (onStatus) onStatus('ready');
  }

  disable() {
    if (!this.active) return;
    this.active = false;
    this.paused = false;

    if (this._pathTracer) this._pathTracer.enablePathTracing = false;
    if (this._rtLightsGroup && this._rtLightsGroup.parent) this.scene.remove(this._rtLightsGroup);
    this._restoreHiddenMeshes();

    const { sunLight, fillLight, rimLight, underCabLights, pendantLights } = this.lightRefs;
    if (sunLight) sunLight.visible = true;
    if (fillLight) fillLight.visible = true;
    if (rimLight) rimLight.visible = true;
    (underCabLights || []).forEach(l => { l.visible = true; });
    (pendantLights || []).forEach(l => { l.visible = true; });

    if (this._savedRaster) {
      const s = this._savedRaster;
      this.scene.background = s.background;
      this.scene.environment = s.environment;
      this.scene.environmentIntensity = s.environmentIntensity;
      this.renderer.toneMappingExposure = s.exposure;
      this.renderer.setPixelRatio(s.pixelRatio);
      sunLight.color.copy(s.sunColor);
      sunLight.intensity = s.sunIntensity;
      sunLight.position.copy(s.sunPos);
      this._savedRaster = null;
    }
  }

  setProfile(profileKey) {
    this._applyProfileSettings(profileKey, true);
    if (this.active) {
      const safeDpr = Math.min(window.devicePixelRatio || 1, this.getMaxDpr());
      this.renderer.setPixelRatio(safeDpr);
      this._pathTracer.updateCamera();
    }
  }

  setDenoiseMode(mode) {
    this.denoiseMode = ['off', 'subtle', 'smooth'].includes(mode) ? mode : 'subtle';
    this.redrawDisplayOnly();
  }

  setExposureEv(ev) {
    this.exposureEv = Math.max(-1.5, Math.min(1.5, Number(ev) || 0));
    this.redrawDisplayOnly();
  }

  setLampsMode(mode) {
    this.lampsMode = ['auto', 'on', 'off'].includes(mode) ? mode : 'auto';
    if (this.active && this.currentSunData) {
      this._configureSceneLightingForRT(this.currentSunData, this.currentD65);
      this.needsLightsUpdate = true;
      this.paused = false;
      this._resetRateMeter();
      if (this._pathTracer) this._pathTracer.pausePathTracing = false;
    }
  }

  /**
   * Re-runs the display/denoiser shader on the already-converged target without losing samples!
   */
  redrawDisplayOnly() {
    if (this.active && this._pathTracer && this.paused) {
      this._pathTracer.renderSample();
    }
  }

  syncAmbillySun(sunData, d65Override = false) {
    if (!this.active) return;
    this._configureSceneLightingForRT(sunData, d65Override);
    this.needsEnvUpdate = true;
    this.needsLightsUpdate = true;
    this.paused = false;
    this._resetRateMeter();
    if (this._pathTracer) this._pathTracer.pausePathTracing = false;
  }

  notifyCameraChanged() {
    if (!this.active || !this._pathTracer) return;
    if (this.paused) {
      this.paused = false;
      this._pathTracer.pausePathTracing = false;
    }
    this._resetRateMeter();
    this._pathTracer.updateCamera();
  }

  notifyGeometryChanged() {
    if (!this.active) return;
    this.needsRebuild = true;
    this.paused = false;
    this._resetRateMeter();
    if (this._pathTracer) this._pathTracer.pausePathTracing = false;
  }

  notifyMaterialsChanged() {
    if (!this.active) return;
    this.needsMaterialsUpdate = true;
    this.paused = false;
    this._resetRateMeter();
    if (this._pathTracer) this._pathTracer.pausePathTracing = false;
  }

  notifyResize() {
    if (!this.active || !this._pathTracer) return;
    const safeDpr = Math.min(window.devicePixelRatio || 1, this.getMaxDpr());
    this.renderer.setPixelRatio(safeDpr);
    this._pathTracer.updateCamera();
  }

  get samples() {
    return this._pathTracer ? Math.floor(this._pathTracer.samples) : 0;
  }

  renderFrame() {
    if (!this.active || !this._pathTracer) return null;

    if (this.needsRebuild) {
      this.needsRebuild = false;
      this.needsMaterialsUpdate = false;
      this.needsLightsUpdate = false;
      this.needsEnvUpdate = false;
      this._restoreHiddenMeshes();
      this._hideRtIncompatibleMeshes();
      this._pathTracer.setScene(this.scene, this.camera);
    } else {
      if (this.needsMaterialsUpdate) {
        this.needsMaterialsUpdate = false;
        this._pathTracer.updateMaterials();
      }
      if (this.needsEnvUpdate) {
        this.needsEnvUpdate = false;
        this._pathTracer.updateEnvironment();
      }
      if (this.needsLightsUpdate) {
        this.needsLightsUpdate = false;
        this._pathTracer.updateLights();
      }
    }

    if (!this.paused && this._pathTracer.samples >= this.targetSamples) {
      this.paused = true;
      this._pathTracer.pausePathTracing = true;
    }

    this._pathTracer.renderSample();

    const curSamples = Math.floor(this._pathTracer.samples);
    const elapsedSec = (performance.now() - this._rateStartTs) / 1000;
    if (!this.paused && elapsedSec > 0.35 && curSamples > this._rateStartSamples) {
      this.samplesPerSec = Math.round(((curSamples - this._rateStartSamples) / elapsedSec) * 10) / 10;
    }

    return {
      samples: curSamples,
      targetSamples: this.targetSamples,
      samplesPerSec: this.samplesPerSec,
      isCompiling: Boolean(this._pathTracer.isCompiling),
      converged: curSamples >= this.targetSamples,
      paused: this.paused
    };
  }
}
