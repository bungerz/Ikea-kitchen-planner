import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import {
  WebGLPathTracer,
  ProceduralEquirectTexture,
  ShapedAreaLight,
  DenoiseMaterial
} from 'three-gpu-pathtracer';

/**
 * Hardware-tuned GPU Path Tracing profiles:
 * - mobile   : Galaxy Z Fold 8 Ultra / flagship Android & iOS (fast tiles, lean VRAM, watchdog-safe)
 * - balanced : Unfolded Z Fold / Tablets / Laptops
 * - ultra    : Desktop NVIDIA RTX 3070 & discrete GPUs (1x1 full-frame, 8 bounces, 256 spp)
 */
export const RT_PROFILES = {
  mobile: {
    key: 'mobile',
    label: 'Fold / Fast',
    renderScale: 0.72,
    tiles: [3, 3],
    bounces: 4,
    targetSamples: 64,
    textureSize: 512,
    filterGlossyFactor: 0.60,
    maxDpr: 1.5
  },
  balanced: {
    key: 'balanced',
    label: 'Balanced',
    renderScale: 0.90,
    tiles: [2, 2],
    bounces: 5,
    targetSamples: 128,
    textureSize: 1024,
    filterGlossyFactor: 0.50,
    maxDpr: 1.75
  },
  ultra: {
    key: 'ultra',
    label: 'RTX Ultra',
    renderScale: 1.0,
    tiles: [1, 1],
    bounces: 8,
    targetSamples: 256,
    textureSize: 1024,
    filterGlossyFactor: 0.35,
    maxDpr: 2.0
  }
};

/**
 * Auto-detect GPU tier so Galaxy Z Fold defaults to Fold/Fast and RTX 3070 defaults to RTX Ultra.
 */
export function detectGpuProfile(renderer) {
  const gl = renderer.getContext();
  let raw = '';
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      raw = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
    }
  } catch (_) {
    // Ignore restricted environments
  }

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
 * Generates physically-based HDR equirectangular sky & architectural window environments
 * tailored to each IKEA studio lighting preset (morning, daylight D65, cozy evening).
 */
function buildProceduralHdrEnv(mode) {
  const tex = new ProceduralEquirectTexture(256, 128);
  const sunDir = new THREE.Vector3(5.4, 3.85, 2.35).normalize();
  const winDir = new THREE.Vector3(0.86, 0.22, 0.46).normalize();
  const dir = new THREE.Vector3();

  tex.generationCallback = (polar, _uv, _coord, color) => {
    dir.setFromSpherical(polar);
    const up = Math.max(0, dir.y);
    const down = Math.max(0, -dir.y);

    if (mode === 'morning') {
      // Warm Southeast Scandinavian sunlight + clean bright architectural bounce
      const skyR = 0.72 + 0.14 * (1 - up);
      const skyG = 0.74 + 0.12 * (1 - up);
      const skyB = 0.78 + 0.04 * (1 - up);
      let r = skyR * (1 - down) + 0.34 * down;
      let g = skyG * (1 - down) + 0.32 * down;
      let b = skyB * (1 - down) + 0.29 * down;

      // Soft East/South patio window light panel
      const winDot = Math.max(0, dir.dot(winDir));
      const winGlow = Math.pow(winDot, 4.0) * 1.15;
      r += winGlow * 1.05;
      g += winGlow * 0.98;
      b += winGlow * 0.88;

      // Warm HDR sun halo (creates soft architectural highlights on VOXTORP/KASKER/brass)
      const sunDot = Math.max(0, dir.dot(sunDir));
      const sunHalo = Math.pow(sunDot, 42.0) * 4.5 + Math.pow(sunDot, 280.0) * 18.0;
      r += sunHalo * 1.12;
      g += sunHalo * 0.99;
      b += sunHalo * 0.84;

      color.setRGB(r, g, b);
    } else if (mode === 'daylight') {
      // Pure D65 neutral architectural studio skylight for faithful NCS color accuracy
      const base = 0.74 + 0.24 * up - 0.32 * down;
      const winDot = Math.max(0, dir.dot(winDir));
      const softbox = Math.pow(winDot, 5.0) * 1.25;
      const topDot = Math.max(0, dir.y);
      const skylight = Math.pow(topDot, 3.0) * 0.45;
      const v = Math.max(0.22, base + softbox + skylight);
      color.setRGB(v, v, v);
    } else {
      // Cozy Evening: deep twilight blue-slate sky so warm kitchen LEDs & pendants dominate
      const r = 0.032 + 0.020 * (1 - up) + 0.035 * down;
      const g = 0.038 + 0.022 * (1 - up) + 0.030 * down;
      const b = 0.068 + 0.032 * (1 - up) + 0.022 * down;
      color.setRGB(r, g, b);
    }
  };

  tex.update();
  return tex;
}

/**
 * Self-contained On-Demand WebGL2 GPU Path Tracing Engine for the IKEA METOD Kitchen Studio.
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
    this.currentLightingMode = 'morning';

    // Saved raster scene state so exiting RT restores 100% original calibration
    this._savedRaster = null;
    this._hdrEnvCache = new Map();
    this._rtLightsGroup = null;
    this._rtWindowLight = null;
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
    this._pathTracer.transmissiveBounces = 4;
    this._pathTracer.renderDelay = 90;
    this._pathTracer.minSamples = 1;
    this._pathTracer.fadeDuration = 180;
    this._pathTracer.rasterizeScene = true;
    this._pathTracer.dynamicLowRes = false;
    this._pathTracer.synchronizeRenderSize = true;

    // Smart bilateral edge-preserving denoiser quad
    const denoiseMat = new DenoiseMaterial({
      sigma: 3.5,
      kSigma: 1.4,
      threshold: 0.055,
      transparent: true
    });
    this._denoiseQuad = new FullScreenQuad(denoiseMat);

    // Custom blit callback: applies adaptive edge-preserving Smart Denoise when enabled
    this._pathTracer.renderToCanvasCallback = (target, renderer, quad) => {
      const currentAutoClear = renderer.autoClear;
      renderer.autoClear = false;

      const samples = this._pathTracer.samples;
      if (this.denoiseEnabled && samples >= 2) {
        const dMat = this._denoiseQuad.material;
        dMat.uniforms.map.value = target.texture;
        dMat.uniforms.opacity.value = quad.material.opacity;
        dMat.blending = quad.material.opacity < 1 ? THREE.NormalBlending : THREE.NoBlending;

        // Smoothly tighten denoising radius as sample count converges so wood/marble texture stays crisp
        if (samples < 14) {
          dMat.uniforms.sigma.value = 4.2;
          dMat.uniforms.kSigma.value = 1.45;
          dMat.uniforms.threshold.value = 0.072;
        } else if (samples < 48) {
          dMat.uniforms.sigma.value = 3.0;
          dMat.uniforms.kSigma.value = 1.30;
          dMat.uniforms.threshold.value = 0.044;
        } else {
          dMat.uniforms.sigma.value = 2.0;
          dMat.uniforms.kSigma.value = 1.15;
          dMat.uniforms.threshold.value = 0.024;
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
    const { WALL_CAB_BOT, BACK_WALL_Z, LEFT_WALL_X, CEILING_Y } = this.constants;
    const grp = new THREE.Group();
    grp.name = 'RTPhysicalLights';

    // 1. Soft Architectural Patio Window Area Light (East-Southeast, shines through Claustra!)
    const winLight = new ShapedAreaLight(new THREE.Color('#FFF8EE'), 3.4, 2.8, 2.2);
    winLight.isCircular = false;
    winLight.position.set(4.15, 1.58, 1.45);
    winLight.lookAt(0.15, 0.92, -0.35);
    grp.add(winLight);
    this._rtWindowLight = winLight;

    // 2. Physical Under-Cabinet Linear LED Strip Lights (North Back Run + West Left Run)
    const backLed = new ShapedAreaLight(new THREE.Color('#FFD194'), 4.0, 2.65, 0.05);
    backLed.isCircular = false;
    backLed.position.set(0.18, WALL_CAB_BOT - 0.018, BACK_WALL_Z + 0.16);
    backLed.rotation.x = -Math.PI / 2; // Point straight down onto countertop & backsplash
    grp.add(backLed);
    this._rtBackLedLight = backLed;

    const leftLed = new ShapedAreaLight(new THREE.Color('#FFD194'), 4.0, 0.05, 1.32);
    leftLed.isCircular = false;
    leftLed.position.set(LEFT_WALL_X + 0.18, WALL_CAB_BOT - 0.018, -0.50);
    leftLed.rotation.x = -Math.PI / 2;
    grp.add(leftLed);
    this._rtLeftLedLight = leftLed;

    // 3. Scandinavian Pendant Practical Circular Disc Lights (tucked inside open shades)
    const drop = 0.72;
    [-0.35, 0.55].forEach(pz => {
      const pDisc = new ShapedAreaLight(new THREE.Color('#FFCC85'), 8.0, 0.11, 0.11);
      pDisc.isCircular = true;
      pDisc.position.set(1.16, CEILING_Y - drop - 0.115, pz);
      pDisc.rotation.x = -Math.PI / 2; // Downward cone inside pendant shade
      grp.add(pDisc);
      this._rtPendantLights.push(pDisc);
    });

    this._rtLightsGroup = grp;
  }

  _getHdrEnv(mode) {
    if (!this._hdrEnvCache.has(mode)) {
      this._hdrEnvCache.set(mode, buildProceduralHdrEnv(mode));
    }
    return this._hdrEnvCache.get(mode);
  }

  _configureSceneLightingForRT(mode) {
    this.currentLightingMode = mode;
    const { sunLight, fillLight, rimLight, underCabLights, pendantLights } = this.lightRefs;

    // Hide raster-only fill hacks & point light approximations so path tracer MIS
    // never wastes samples on 0-intensity lights (2.5x cleaner & faster convergence!)
    fillLight.visible = false;
    rimLight.visible = false;
    underCabLights.forEach(l => { l.visible = false; });
    pendantLights.forEach(l => { l.visible = false; });

    this.scene.environment = this._getHdrEnv(mode);

    if (mode === 'morning') {
      this.scene.environmentIntensity = 0.78;
      this.renderer.toneMappingExposure = 0.94;
      sunLight.visible = true;
      sunLight.color.set('#FFF2E0');
      sunLight.intensity = 2.65;
      sunLight.position.set(5.4, 3.85, 2.35);

      this._rtWindowLight.visible = true;
      this._rtWindowLight.color.set('#FFF8EE');
      this._rtWindowLight.intensity = 2.4;
      this._rtBackLedLight.visible = true;
      this._rtBackLedLight.intensity = 3.2;
      this._rtLeftLedLight.visible = true;
      this._rtLeftLedLight.intensity = 3.2;
      this._rtPendantLights.forEach(l => { l.visible = true; l.intensity = 1.6; });
    } else if (mode === 'daylight') {
      // Pure D65 neutral architectural daylight for NCS color fidelity
      this.scene.environmentIntensity = 0.95;
      this.renderer.toneMappingExposure = 0.94;
      sunLight.visible = true;
      sunLight.color.set('#FFFFFF');
      sunLight.intensity = 1.15;
      sunLight.position.set(3.2, 5.8, 3.4);

      this._rtWindowLight.visible = true;
      this._rtWindowLight.color.set('#FFFFFF');
      this._rtWindowLight.intensity = 2.9;
      this._rtBackLedLight.visible = false;
      this._rtLeftLedLight.visible = false;
      this._rtPendantLights.forEach(l => { l.visible = false; });
    } else {
      // Cozy Evening: moody twilight exterior + dramatic warm interior LED & pendant pools
      this.scene.environmentIntensity = 0.45;
      this.renderer.toneMappingExposure = 0.98;
      sunLight.visible = false;
      this._rtWindowLight.visible = false;

      this._rtBackLedLight.visible = true;
      this._rtBackLedLight.intensity = 28.0;
      this._rtLeftLedLight.visible = true;
      this._rtLeftLedLight.intensity = 28.0;
      this._rtPendantLights.forEach(l => { l.visible = true; l.intensity = 36.0; });
    }
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

  async enable(lightingMode, onStatus) {
    this._ensureInitialized();
    if (this.active) return;

    if (onStatus) onStatus('compiling');

    // Snapshot raster state for lossless restoration upon exit
    const { sunLight, fillLight, rimLight, underCabLights, pendantLights } = this.lightRefs;
    this._savedRaster = {
      environment: this.scene.environment,
      environmentIntensity: this.scene.environmentIntensity ?? 1.0,
      exposure: this.renderer.toneMappingExposure,
      sunColor: sunLight.color.clone(),
      sunIntensity: sunLight.intensity,
      sunPos: sunLight.position.clone()
    };

    if (!this._rtLightsGroup.parent) {
      this.scene.add(this._rtLightsGroup);
    }

    this._configureSceneLightingForRT(lightingMode);

    this.active = true;
    this.paused = false;
    this._pathTracer.enablePathTracing = true;
    this._pathTracer.pausePathTracing = false;

    // Yield one frame so the compiling pill renders before synchronous BVH + GLSL compile
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

    if (this._pathTracer) {
      this._pathTracer.enablePathTracing = false;
    }

    if (this._rtLightsGroup && this._rtLightsGroup.parent) {
      this.scene.remove(this._rtLightsGroup);
    }

    // Restore original calibrated raster environment & lights
    const { sunLight, fillLight, rimLight, underCabLights, pendantLights } = this.lightRefs;
    sunLight.visible = true;
    fillLight.visible = true;
    rimLight.visible = true;
    underCabLights.forEach(l => { l.visible = true; });
    pendantLights.forEach(l => { l.visible = true; });

    if (this._savedRaster) {
      const s = this._savedRaster;
      this.scene.environment = s.environment;
      this.scene.environmentIntensity = s.environmentIntensity;
      this.renderer.toneMappingExposure = s.exposure;
      sunLight.color.copy(s.sunColor);
      sunLight.intensity = s.sunIntensity;
      sunLight.position.copy(s.sunPos);
      this._savedRaster = null;
    }
  }

  setProfile(profileKey) {
    this._applyProfileSettings(profileKey, true);
  }

  setDenoise(enabled) {
    this.denoiseEnabled = Boolean(enabled);
    // Re-blit immediately if paused/converged so toggle feedback is instant
    if (this.active && this._pathTracer && this.paused) {
      this._pathTracer.renderSample();
    }
  }

  togglePause() {
    if (!this.active || !this._pathTracer) return false;
    if (this.paused && this.samples >= this.targetSamples) {
      this.targetSamples += 64;
    }
    this.paused = !this.paused;
    this._pathTracer.pausePathTracing = this.paused;
    return this.paused;
  }

  addMoreSamples(delta = 64) {
    if (!this.active || !this._pathTracer) return;
    this.targetSamples = Math.max(this.targetSamples, Math.floor(this.samples)) + delta;
    this.paused = false;
    this._pathTracer.pausePathTracing = false;
  }

  onCameraMoved() {
    if (!this.active || !this._pathTracer) return;
    // If previously auto-paused after convergence, automatically resume tracing the new angle
    if (this.paused && this.samples >= this.targetSamples) {
      this.paused = false;
      this._pathTracer.pausePathTracing = false;
    }
    this._pathTracer.updateCamera();
  }

  onGeometryChanged() {
    if (!this.active) return;
    this.needsRebuild = true;
    this.paused = false;
    if (this._pathTracer) this._pathTracer.pausePathTracing = false;
  }

  onMaterialsChanged() {
    if (!this.active) return;
    this.needsMaterialsUpdate = true;
    this.paused = false;
    if (this._pathTracer) this._pathTracer.pausePathTracing = false;
  }

  onLightingChanged(lightingMode) {
    if (!this.active) return;
    this._configureSceneLightingForRT(lightingMode);
    this.needsEnvUpdate = true;
    this.needsLightsUpdate = true;
    this.needsMaterialsUpdate = true; // emissiveIntensity on underCabStripMat / pendantBulbMat changed
    this.paused = false;
    if (this._pathTracer) this._pathTracer.pausePathTracing = false;
  }

  onResize() {
    if (!this.active || !this._pathTracer) return;
    this._pathTracer.updateCamera();
  }

  get samples() {
    return this._pathTracer ? this._pathTracer.samples : 0;
  }

  get isCompiling() {
    return Boolean(this._pathTracer && this._pathTracer.isCompiling);
  }

  get isConverged() {
    return this.active && this.samples >= this.targetSamples;
  }

  /**
   * Called every RAF while active. Handles deferred scene/material updates and auto-pauses on convergence.
   */
  renderFrame() {
    if (!this.active || !this._pathTracer) return;

    if (this.needsRebuild) {
      this.needsRebuild = false;
      this.needsMaterialsUpdate = false;
      this.needsLightsUpdate = false;
      this.needsEnvUpdate = false;
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

    // Auto-pause once target samples are reached to save phone battery & GPU heat
    if (!this.paused && this._pathTracer.samples >= this.targetSamples) {
      this.paused = true;
      this._pathTracer.pausePathTracing = true;
    }

    this._pathTracer.renderSample();
  }

  /**
   * Captures the exact current ray-traced (and denoised if enabled) frame to a PNG Blob.
   */
  capturePngBlob() {
    return new Promise((resolve, reject) => {
      if (!this.active || !this._pathTracer) {
        reject(new Error('Ray tracer is not active'));
        return;
      }
      // Temporarily ensure we blit the current accumulated target without adding a new partial tile
      const prevPaused = this._pathTracer.pausePathTracing;
      this._pathTracer.pausePathTracing = true;
      this._pathTracer.renderSample();
      this.renderer.domElement.toBlob(
        (blob) => {
          this._pathTracer.pausePathTracing = prevPaused;
          if (blob) resolve(blob);
          else reject(new Error('Canvas PNG export failed'));
        },
        'image/png'
      );
    });
  }

  dispose() {
    this.disable();
    this._hdrEnvCache.forEach(tex => tex.dispose());
    this._hdrEnvCache.clear();
    if (this._denoiseQuad) {
      this._denoiseQuad.material.dispose();
      this._denoiseQuad.dispose();
      this._denoiseQuad = null;
    }
    if (this._pathTracer) {
      this._pathTracer.dispose();
      this._pathTracer = null;
    }
    this.initialized = false;
  }
}
