import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import {
  WebGLPathTracer,
  ProceduralEquirectTexture,
  ShapedAreaLight
} from 'three-gpu-pathtracer';

/**
 * Hardware-tuned WebGL2 GPU Path Tracing profiles:
 * Tuned for NVIDIA RTX 3070 (fast 12–20 spp/sec, silky orbiting via dynamicLowRes) & mobile GPUs.
 */
export const RT_PROFILES = {
  mobile: {
    key: 'mobile',
    label: 'Fast',
    renderScale: 0.65,
    tiles: [2, 2],
    bounces: 3,
    targetSamples: 64,
    textureSize: 512,
    filterGlossyFactor: 0.65,
    maxDpr: 1.25
  },
  balanced: {
    key: 'balanced',
    label: 'Balanced',
    renderScale: 0.78,
    tiles: [2, 1],
    bounces: 4,
    targetSamples: 128,
    textureSize: 512,
    filterGlossyFactor: 0.55,
    maxDpr: 1.35
  },
  ultra: {
    key: 'ultra',
    label: 'RTX Ultra',
    renderScale: 0.88,
    tiles: [1, 1],
    bounces: 4,
    targetSamples: 160,
    textureSize: 1024,
    filterGlossyFactor: 0.45,
    maxDpr: 1.5
  }
};

export function detectGpuProfile(renderer) {
  const gl = renderer.getContext();
  let raw = '';
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) raw = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
  } catch (_) {}

  const isMobileUa = /Android|iPhone|iPad|iPod|Mobile|SM-F/i.test(navigator.userAgent);
  const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const upper = raw.toUpperCase();

  let gpuLabel = 'WebGL2 GPU';
  const rtxMatch = raw.match(/RTX\s*\d{4}\s*(?:Ti|SUPER)?/i);
  const gtxMatch = raw.match(/GTX\s*\d{4}\s*(?:Ti|SUPER)?/i);
  const rxMatch = raw.match(/RX\s*\d{4}\s*(?:XT|XTX)?/i);
  const adrenoMatch = raw.match(/Adreno\s*(?:\(TM\)\s*)?\d+/i);
  const appleMatch = raw.match(/Apple\s*(?:M\d+(?:\s*(?:Pro|Max|Ultra))?|GPU)/i);

  if (rtxMatch) gpuLabel = `NVIDIA ${rtxMatch[0].replace(/\s+/g, ' ').trim()}`;
  else if (gtxMatch) gpuLabel = `NVIDIA ${gtxMatch[0].replace(/\s+/g, ' ').trim()}`;
  else if (rxMatch) gpuLabel = `AMD ${rxMatch[0].replace(/\s+/g, ' ').trim()}`;
  else if (adrenoMatch) gpuLabel = adrenoMatch[0].replace(/\(TM\)\s*/i, '').trim();
  else if (appleMatch) gpuLabel = appleMatch[0].trim();
  else if (/MALI/i.test(raw)) gpuLabel = 'ARM Mali GPU';
  else if (/XCLIPSE/i.test(raw)) gpuLabel = 'Samsung Xclipse';
  else if (/SWIFTSHADER|LLVMPIPE|SOFTWARE/i.test(upper)) gpuLabel = 'Software WebGL';
  else if (raw) gpuLabel = raw.replace(/^ANGLE\s*\([^,]+,\s*/i, '').split(/[(),]/)[0].trim().slice(0, 22);

  if (/SWIFTSHADER|LLVMPIPE|SOFTWARE/i.test(upper)) {
    return { profileKey: 'mobile', gpuLabel, isSoftware: true };
  }
  if (isMobileUa || isCoarse || /ADRENO|MALI|XCLIPSE|IMMORTALIS|POWERVR/i.test(upper)) {
    return { profileKey: 'mobile', gpuLabel, isSoftware: false };
  }
  if (/RTX|RADEON RX\s*[6789]|ARC\s*[AB]\d|M[2-9]\s*(?:PRO|MAX|ULTRA)|TITAN|QUADRO|GTX\s*1080|GTX\s*1660/i.test(upper)) {
    return { profileKey: 'ultra', gpuLabel, isSoftware: false };
  }
  return { profileKey: 'balanced', gpuLabel, isSoftware: false };
}

/**
 * Guided Perceptual Edge-Preserving Bilateral Denoiser (NaN-proof & Firefly-resistant!).
 * Computes a local 3x3 guide mean before bilateral edge weighting so isolated Monte Carlo
 * salt-and-pepper pixels on flat walls/sofas smooth out cleanly while real wood/wall edges stay crisp!
 */
function createSafeBilateralDenoiseMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NoBlending,
    uniforms: {
      map: { value: null },
      opacity: { value: 1.0 },
      sigma: { value: 3.2 },
      threshold: { value: 0.28 },
      radius: { value: 4.0 }
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
      uniform float sigma;
      uniform float threshold;
      uniform float radius;
      varying vec2 vUv;

      vec3 safeSample(vec2 uv) {
        vec3 c = texture2D(map, uv).rgb;
        if (any(isnan(c)) || any(isinf(c))) return vec3(0.0);
        return clamp(c, vec3(0.0), vec3(6.0));
      }

      vec3 toPerceptual(vec3 c) {
        return sqrt(c / (vec3(1.0) + c));
      }

      void main() {
        vec2 texSize = vec2(textureSize(map, 0));
        vec2 invSize = 1.0 / max(texSize, vec2(1.0));

        // Step 1: Build a noise-free 3x3 local guide color so isolated salt-and-pepper
        // pixels are NEVER mistaken for real geometric edges!
        vec3 guideSum = vec3(0.0);
        for (int gx = -1; gx <= 1; gx++) {
          for (int gy = -1; gy <= 1; gy++) {
            guideSum += safeSample(vUv + vec2(float(gx), float(gy)) * invSize);
          }
        }
        vec3 guideCol = guideSum / 9.0;
        vec3 guideP = toPerceptual(guideCol);

        // Step 2: Edge-preserving bilateral filter guided by guideP
        float invSigma2 = 0.5 / max(sigma * sigma, 0.01);
        float invThresh2 = 0.5 / max(threshold * threshold, 0.005);

        vec3 accum = guideCol * 0.5;
        float weightSum = 0.5;

        int r = int(clamp(radius, 1.0, 5.0));
        for (int dx = -5; dx <= 5; dx++) {
          if (dx < -r || dx > r) continue;
          for (int dy = -5; dy <= 5; dy++) {
            if (dy < -r || dy > r) continue;
            vec2 offset = vec2(float(dx), float(dy));
            float dist2 = dot(offset, offset);
            if (dist2 > radius * radius) continue;

            vec3 sCol = safeSample(vUv + offset * invSize);
            vec3 diff = toPerceptual(sCol) - guideP;
            float wSpatial = exp(-dist2 * invSigma2);
            float wColor = exp(-dot(diff, diff) * invThresh2);
            float w = wSpatial * wColor;

            accum += sCol * w;
            weightSum += w;
          }
        }

        gl_FragColor = vec4(accum / max(weightSum, 1e-5), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.a = opacity;
      }
    `
  });
}

/**
 * Generates a physically-based HDR equirectangular sky synchronized to Ambilly's live NOAA sun!
 */
function buildAmbillyHdrEnv(sunData, d65Override = false) {
  const tex = new ProceduralEquirectTexture(256, 128);
  const sunDir = (sunData?.dir || new THREE.Vector3(-0.5, 0.5, 0.7)).clone().normalize();
  const dir = new THREE.Vector3();

  const zenith = sunData?.skyZenith || new THREE.Color('#4D88D1');
  const horizon = sunData?.skyHorizon || new THREE.Color('#E0EBF5');
  const sunCol = sunData?.sunColor || new THREE.Color('#FFF4DE');
  const isNight = Boolean(sunData?.isNight) && !d65Override;

  tex.generationCallback = (polar, _uv, _coord, color) => {
    dir.setFromSpherical(polar);
    const up = Math.max(0, dir.y);
    const down = Math.max(0, -dir.y);

    if (d65Override) {
      const v = Math.max(0.32, 0.90 + 0.35 * up - 0.30 * down);
      color.setRGB(v, v, v);
      return;
    }

    if (isNight) {
      const r = 0.03 + 0.02 * (1 - up) + 0.02 * down;
      const g = 0.04 + 0.025 * (1 - up) + 0.02 * down;
      const b = 0.08 + 0.04 * (1 - up) + 0.02 * down;
      color.setRGB(r, g, b);
      return;
    }

    const k = Math.pow(up, 0.55);
    let r = THREE.MathUtils.lerp(horizon.r, zenith.r, k) * 1.25;
    let g = THREE.MathUtils.lerp(horizon.g, zenith.g, k) * 1.25;
    let b = THREE.MathUtils.lerp(horizon.b, zenith.b, k) * 1.25;

    if (down > 0) {
      const gd = Math.min(1, down * 2.5);
      r = THREE.MathUtils.lerp(r, 0.38, gd);
      g = THREE.MathUtils.lerp(g, 0.36, gd);
      b = THREE.MathUtils.lerp(b, 0.33, gd);
    }

    // Smooth solar glow (capped to avoid harsh fireflies on diffuse interior bounces!)
    const sunDot = Math.max(0, dir.dot(sunDir));
    const halo = Math.pow(sunDot, 16.0) * 1.8 + Math.pow(sunDot, 120.0) * 5.5;
    r += sunCol.r * halo;
    g += sunCol.g * halo;
    b += sunCol.b * halo;

    color.setRGB(r, g, b);
  };

  tex.update();
  return tex;
}

/**
 * Full-Apartment On-Demand WebGL2 GPU Path Tracing Engine (RTX 3070 + Mobile Tuned).
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
    this.denoiseEnabled = true;
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
    this._rtWindowLights = [];
    this._rtBackLedLight = null;
    this._rtLeftLedLight = null;
    this._rtPendantLights = [];

    this._pathTracer = null;
    this._denoiseQuad = null;
  }

  _ensureInitialized() {
    if (this.initialized) return;

    this._pathTracer = new WebGLPathTracer(this.renderer);
    this._pathTracer.multipleImportanceSampling = true;
    this._pathTracer.transmissiveBounces = 2;
    this._pathTracer.renderDelay = 35;
    this._pathTracer.minSamples = 1;
    this._pathTracer.fadeDuration = 120;
    this._pathTracer.rasterizeScene = true;
    this._pathTracer.dynamicLowRes = true;
    this._pathTracer.lowResScale = 0.45;
    this._pathTracer.synchronizeRenderSize = true;

    this._denoiseQuad = new FullScreenQuad(createSafeBilateralDenoiseMaterial());

    this._pathTracer.renderToCanvasCallback = (target, renderer, quad) => {
      const currentAutoClear = renderer.autoClear;
      renderer.autoClear = false;

      const samples = this._pathTracer.samples;
      if (this.denoiseEnabled && samples >= 2) {
        const dMat = this._denoiseQuad.material;
        dMat.uniforms.map.value = target.texture;
        dMat.uniforms.opacity.value = quad.material.opacity;
        dMat.blending = quad.material.opacity < 1 ? THREE.NormalBlending : THREE.NoBlending;

        // Smooth adaptive guided denoising: clean magazine-grade GI even at 15–50 samples!
        if (samples < 20) {
          dMat.uniforms.radius.value = 5.0;
          dMat.uniforms.sigma.value = 4.0;
          dMat.uniforms.threshold.value = 0.36;
        } else if (samples < 60) {
          dMat.uniforms.radius.value = 4.0;
          dMat.uniforms.sigma.value = 3.0;
          dMat.uniforms.threshold.value = 0.28;
        } else if (samples < 120) {
          dMat.uniforms.radius.value = 3.0;
          dMat.uniforms.sigma.value = 2.2;
          dMat.uniforms.threshold.value = 0.22;
        } else {
          dMat.uniforms.radius.value = 2.0;
          dMat.uniforms.sigma.value = 1.6;
          dMat.uniforms.threshold.value = 0.16;
        }
        this._denoiseQuad.render(renderer);
      } else {
        quad.render(renderer);
      }

      renderer.autoClear = currentAutoClear;
    };

    this._buildPhysicalAreaLights();
    this._applyProfileSettings(this.profileKey, false);
    this.initialized = true;
  }

  _buildPhysicalAreaLights() {
    const grp = new THREE.Group();
    grp.name = 'RTPhysicalLights';

    // Exact UN-OCCLUDED Window Portal Area Lights positioned cleanly INSIDE each opening!
    // Remember: RectAreaLight emits strictly along local -Z!
    //   rotY = 0         -> emits North (-Z)
    //   rotY = -Math.PI/2 -> emits East (+X)
    const addPortal = (roomGroup, x, y, z, w, h, rotY, intensity = 3.8) => {
      const l = new ShapedAreaLight(new THREE.Color('#FFF9F0'), intensity, w, h);
      l.isCircular = false;
      l.position.set(x, y, z);
      l.rotation.y = rotY;
      l.userData.roomGroup = roomGroup;
      grp.add(l);
      this._rtWindowLights.push(l);
      return l;
    };

    this._rtWindowLights = [];
    // 1. Séjour & Kitchen Portals (active when viewing Séjour/Kitchen!)
    addPortal('sejour', 3.45, 1.15, 8.48, 2.75, 1.85, 0, 4.2);
    addPortal('sejour', 0.34, 1.30, 6.90, 1.25, 1.55, -Math.PI / 2, 3.6);
    addPortal('sejour', 0.34, 1.30, 4.55, 1.25, 1.55, -Math.PI / 2, 3.6);
    // 2. Bedroom Portals (only enabled when camera is inside/near that bedroom so Séjour MIS stays 3x cleaner!)
    addPortal('ch3', 0.34, 1.30, 1.62, 1.25, 1.55, -Math.PI / 2, 3.8);
    addPortal('ch2', 6.90, 1.30, 10.90, 1.25, 1.55, 0, 3.8);
    addPortal('ch1', 9.71, 1.30, 10.90, 1.25, 1.55, 0, 3.8);

    // Kitchen under-cabinet LEDs (enabled primarily in evening/night so daytime MIS stays clean!)
    const backLed = new ShapedAreaLight(new THREE.Color('#FFD194'), 10.0, 1.70, 0.08);
    backLed.isCircular = false;
    backLed.position.set(3.47, 1.44, 3.36);
    backLed.rotation.x = -Math.PI / 2;
    grp.add(backLed);
    this._rtBackLedLight = backLed;

    const leftLed = new ShapedAreaLight(new THREE.Color('#FFD194'), 10.0, 0.08, 1.20);
    leftLed.isCircular = false;
    leftLed.position.set(5.26, 1.44, 4.62);
    leftLed.rotation.x = -Math.PI / 2;
    grp.add(leftLed);
    this._rtLeftLedLight = leftLed;

    // Practical ceiling bounce discs BELOW pendant shades (never trapped inside shade geometry!)
    this._rtPendantLights = [];
    [
      [1.55, 1.52, 6.40],
      [3.85, 1.82, 7.05],
      [2.62, 1.82, 1.64],
      [9.71, 1.82, 8.85],
      [6.90, 1.82, 8.85]
    ].forEach(([px, py, pz]) => {
      const pDisc = new ShapedAreaLight(new THREE.Color('#FFD08A'), 18.0, 0.34, 0.34);
      pDisc.isCircular = true;
      pDisc.position.set(px, py, pz);
      pDisc.rotation.x = -Math.PI / 2;
      grp.add(pDisc);
      this._rtPendantLights.push(pDisc);
    });

    this._rtLightsGroup = grp;
  }

  _detectCameraZone() {
    const p = this.camera.position;
    if (p.y > 4.5) return 'cutaway'; // Overview cutaway: sky dome lights every room directly!
    if (p.z < 3.10 && p.x < 5.80) return 'ch3';
    if (p.z > 6.72 && p.x >= 5.50 && p.x < 8.28) return 'ch2';
    if (p.z > 6.72 && p.x >= 8.28) return 'ch1';
    return 'sejour';
  }

  _configureSceneLightingForRT(sunData, d65Override = false) {
    this.currentSunData = sunData;
    this.currentD65 = Boolean(d65Override);
    const zone = this._detectCameraZone();
    this._lastZone = zone;
    const { sunLight, fillLight, rimLight, underCabLights, pendantLights } = this.lightRefs;

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

    const enableZonePortals = (color, intensity) => {
      this._rtWindowLights.forEach(l => {
        // In cutaway mode, HDR sky directly lights every open room -> zero portals needed!
        // Inside a room, ONLY enable that room's portals so MIS never wastes rays on occluded walls!
        const active = zone !== 'cutaway' && l.userData.roomGroup === zone;
        l.visible = active;
        l.color.copy(color);
        l.intensity = intensity;
      });
    };

    if (d65Override) {
      this.scene.environmentIntensity = 1.1;
      this.renderer.toneMappingExposure = 0.96;
      sunLight.visible = true;
      sunLight.color.set('#FFFFFF');
      sunLight.intensity = 1.5;
      sunLight.position.set(7.6, 18.0, 13.6);
      enableZonePortals(new THREE.Color('#FFFFFF'), 4.2);
      this._rtBackLedLight.visible = false;
      this._rtLeftLedLight.visible = false;
      this._rtPendantLights.forEach(l => { l.visible = false; });
    } else if (isNight) {
      this.scene.environmentIntensity = 0.25;
      this.renderer.toneMappingExposure = 1.04;
      sunLight.visible = false;
      this._rtWindowLights.forEach(l => { l.visible = false; });
      this._rtBackLedLight.visible = true;
      this._rtBackLedLight.intensity = 14.0;
      this._rtLeftLedLight.visible = true;
      this._rtLeftLedLight.intensity = 14.0;
      this._rtPendantLights.forEach(l => { l.visible = true; l.intensity = 22.0; });
    } else {
      this.scene.environmentIntensity = isEvening ? 0.75 : 1.05;
      this.renderer.toneMappingExposure = 0.98;
      sunLight.visible = true;
      if (sunData) {
        sunLight.color.copy(sunData.sunColor);
        sunLight.intensity = Math.max(1.4, sunData.sunIntensity * 1.5);
        sunLight.position.set(
          5.6 + sunData.dir.x * 24,
          Math.max(2.6, sunData.dir.y * 24),
          5.6 + sunData.dir.z * 24
        );
      }
      const portalCol = sunData ? sunData.skyHorizon.clone().lerp(new THREE.Color('#FFF8EE'), 0.45) : new THREE.Color('#FFF8EE');
      enableZonePortals(portalCol, isEvening ? 3.0 : 4.6);
      this._rtBackLedLight.visible = isEvening;
      this._rtBackLedLight.intensity = 10.0;
      this._rtLeftLedLight.visible = isEvening;
      this._rtLeftLedLight.intensity = 10.0;
      this._rtPendantLights.forEach(l => {
        l.visible = isEvening;
        l.intensity = 16.0;
      });
    }
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
    const p = RT_PROFILES[profileKey] || RT_PROFILES.balanced;
    this.profileKey = p.key;
    this.targetSamples = p.targetSamples;

    if (!this._pathTracer) return;
    this._pathTracer.renderScale = this.isSoftware ? Math.min(p.renderScale, 0.35) : p.renderScale;
    this._pathTracer.tiles.set(p.tiles[0], p.tiles[1]);
    this._pathTracer.bounces = this.isSoftware ? Math.min(p.bounces, 3) : p.bounces;
    this._pathTracer.filterGlossyFactor = p.filterGlossyFactor;
    this._pathTracer.textureSize.set(p.textureSize, p.textureSize);

    if (resetAccumulation && this.active) {
      this.paused = false;
      this._pathTracer.pausePathTracing = false;
      this._pathTracer.updateMaterials();
      this._pathTracer.reset();
    }
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

  setDenoise(enabled) {
    this.denoiseEnabled = Boolean(enabled);
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
    if (this._pathTracer) this._pathTracer.pausePathTracing = false;
  }

  notifyCameraChanged() {
    if (!this.active || !this._pathTracer) return;
    if (this.paused && this.samples >= this.targetSamples) {
      this.paused = false;
      this._pathTracer.pausePathTracing = false;
    }
    const newZone = this._detectCameraZone();
    if (newZone !== this._lastZone) {
      this._lastZone = newZone;
      this._configureSceneLightingForRT(this.currentSunData, this.currentD65);
      this.needsLightsUpdate = true;
    }
    this._pathTracer.updateCamera();
  }

  notifyGeometryChanged() {
    if (!this.active) return;
    this.needsRebuild = true;
    this.paused = false;
    if (this._pathTracer) this._pathTracer.pausePathTracing = false;
  }

  notifyMaterialsChanged() {
    if (!this.active) return;
    this.needsMaterialsUpdate = true;
    this.paused = false;
    if (this._pathTracer) this._pathTracer.pausePathTracing = false;
  }

  notifyResize() {
    if (!this.active || !this._pathTracer) return;
    const safeDpr = Math.min(window.devicePixelRatio || 1, this.getMaxDpr());
    this.renderer.setPixelRatio(safeDpr);
    this._pathTracer.updateCamera();
  }

  onCameraMoved() { this.notifyCameraChanged(); }
  onGeometryChanged() { this.notifyGeometryChanged(); }
  onMaterialsChanged() { this.notifyMaterialsChanged(); }
  onResize() { this.notifyResize(); }

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

    return {
      samples: Math.floor(this._pathTracer.samples),
      targetSamples: this.targetSamples,
      isCompiling: Boolean(this._pathTracer.isCompiling),
      converged: this._pathTracer.samples >= this.targetSamples,
      paused: this.paused
    };
  }
}
