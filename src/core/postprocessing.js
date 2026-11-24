import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { N8AOPass } from 'n8ao';

/* =========================================================================
 * REALTIME ARCHITECTURAL POST-PROCESSING PIPELINE
 * - Single-pass scene render (N8AOPass autoRenderBeauty when AO is active,
 *   or RenderPass when in 2D Plan / AO-bypass) -> ZERO duplicate scene draws!
 * - N8AOPass (contact ambient occlusion tuned in meters for 2.50m ceilings)
 * - UnrealBloomPass (subtle warm glow strictly on emissive bulbs/LEDs > 1.08)
 * - OutputPass (THREE.AgXToneMapping + sRGB output)
 * - SMAAPass (crisp edge anti-aliasing in High quality)
 * ========================================================================= */

export class RealtimePostPipeline {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.quality = 'high'; // 'high' | 'fast' | 'off'
    this._width = 800;
    this._height = 600;
    this._failed = false;

    try {
      const rt = new THREE.WebGLRenderTarget(this._width, this._height, {
        type: THREE.HalfFloatType
      });

      this.composer = new EffectComposer(renderer, rt);
      this.renderPass = new RenderPass(scene, camera);

      this.n8aoPass = new N8AOPass(scene, camera, this._width, this._height);
      this.n8aoPass.configuration.gammaCorrection = false; // OutputPass handles AgX + sRGB!
      this.n8aoPass.configuration.aoRadius = 0.55;
      this.n8aoPass.configuration.distanceFalloff = 0.72;
      this.n8aoPass.configuration.intensity = 2.05;
      this.n8aoPass.configuration.color = new THREE.Color('#2A241E');
      this.n8aoPass.configuration.aoSamples = 16;
      this.n8aoPass.configuration.denoiseSamples = 8;
      this.n8aoPass.configuration.denoiseRadius = 6;
      this.n8aoPass.configuration.halfRes = false;

      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this._width, this._height),
        0.16,
        0.38,
        1.08
      );

      this.outputPass = new OutputPass();
      this.smaaPass = new SMAAPass();

      this.composer.addPass(this.renderPass);
      this.composer.addPass(this.n8aoPass);
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(this.smaaPass);
      this.composer.addPass(this.outputPass);

      this._syncPassStates();
    } catch (err) {
      console.warn('Post-processing init failed, falling back to direct render:', err);
      this._failed = true;
    }
  }

  _syncPassStates() {
    if (this._failed || !this.n8aoPass) return;
    const isOrtho = Boolean(this.camera && this.camera.isOrthographicCamera);
    const useAo = this.quality !== 'off' && !isOrtho;

    // N8AOPass renders beauty itself (autoRenderBeauty: true), so disable RenderPass when AO is active!
    this.n8aoPass.enabled = useAo;
    this.renderPass.enabled = !useAo;
    this.bloomPass.enabled = useAo;
    this.smaaPass.enabled = this.quality === 'high' && !isOrtho;
  }

  setCamera(camera) {
    this.camera = camera;
    if (this._failed || !this.renderPass) return;
    this.renderPass.camera = camera;
    this.n8aoPass.camera = camera;
    this._syncPassStates();
  }

  setQuality(quality = 'high') {
    this.quality = quality;
    if (this._failed || !this.n8aoPass) return;
    if (quality === 'fast') {
      this.n8aoPass.configuration.halfRes = true;
      this.n8aoPass.configuration.aoSamples = 8;
      this.n8aoPass.configuration.denoiseSamples = 4;
      this.n8aoPass.configuration.intensity = 1.85;
    } else if (quality === 'high') {
      this.n8aoPass.configuration.halfRes = false;
      this.n8aoPass.configuration.aoSamples = 16;
      this.n8aoPass.configuration.denoiseSamples = 8;
      this.n8aoPass.configuration.intensity = 2.05;
    }
    this._syncPassStates();
  }

  setSize(width, height, pixelRatio = 1) {
    this._width = Math.max(64, Math.floor(width));
    this._height = Math.max(64, Math.floor(height));
    if (this._failed || !this.composer) return;
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(this._width, this._height);
    this.bloomPass.resolution.set(this._width, this._height);
  }

  render() {
    if (this.quality === 'off' || this._failed) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    try {
      this.composer.render();
    } catch (err) {
      console.warn('Post-processing fallback to direct render:', err);
      this._failed = true;
      this._syncPassStates();
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    this.composer.dispose();
  }
}
