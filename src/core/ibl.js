import * as THREE from 'three';

/* =========================================================================
 * DYNAMIC SKY-SYNCED PMREM IBL GENERATOR
 * Keeps metallic faucets, mirrors, appliances, and glossy VOXTORP doors
 * reflecting the live Ambilly sky & warm architectural floor bounce instead
 * of a static white studio room!
 * ========================================================================= */

export class DynamicSkyIBL {
  constructor(renderer) {
    this.renderer = renderer;
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
    this._currentRT = null;
    this._lastSignature = '';

    // Reusable tiny offscreen sky + warm interior room rig for fast PMREM baking
    this._envScene = new THREE.Scene();

    // Sky hemisphere dome
    this._skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        uZenith: { value: new THREE.Color('#4D88D1') },
        uHorizon: { value: new THREE.Color('#E0EBF5') },
        uGround: { value: new THREE.Color('#B5AA9C') },
        uSunDir: { value: new THREE.Vector3(-0.5, 0.5, 0.7).normalize() },
        uSunCol: { value: new THREE.Color('#FFF4DE') },
        uSunPower: { value: 3.5 }
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uZenith;
        uniform vec3 uHorizon;
        uniform vec3 uGround;
        uniform vec3 uSunDir;
        uniform vec3 uSunCol;
        uniform float uSunPower;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = h >= 0.0
            ? mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.55))
            : mix(uHorizon, uGround, pow(clamp(-h * 2.5, 0.0, 1.0), 0.7));
          float sunDot = max(0.0, dot(d, normalize(uSunDir)));
          col += uSunCol * (pow(sunDot, 12.0) * 0.65 + pow(sunDot, 96.0) * uSunPower);
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(20, 24, 16), this._skyMat);
    this._envScene.add(dome);

    // Subtle warm interior ceiling/window bounce cards so metals have rich architectural reflections
    this._bounceMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFF6E8') });
    const card1 = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), this._bounceMat);
    card1.position.set(0, 3.2, 9.0);
    card1.lookAt(0, 0, 0);
    const card2 = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), this._bounceMat);
    card2.position.set(-9.0, 2.5, 0);
    card2.lookAt(0, 0, 0);
    this._envScene.add(card1, card2);
  }

  update(sunData, d65Override = false) {
    const key = d65Override
      ? 'd65'
      : `${sunData.isNight ? 'N' : sunData.isTwilight ? 'T' : 'D'}_${Math.round(sunData.elevationDeg / 4)}_${Math.round(sunData.azimuthDeg / 8)}`;
    if (key === this._lastSignature && this._currentRT) {
      return this._currentRT.texture;
    }
    this._lastSignature = key;

    const u = this._skyMat.uniforms;
    if (d65Override) {
      u.uZenith.value.set('#DCDCDC');
      u.uHorizon.value.set('#F2F2F2');
      u.uGround.value.set('#A8A8A8');
      u.uSunDir.value.set(0.2, 0.85, 0.45).normalize();
      u.uSunCol.value.set('#FFFFFF');
      u.uSunPower.value = 1.4;
      this._bounceMat.color.set('#F5F5F5');
    } else if (sunData.isNight) {
      u.uZenith.value.set('#0E1626');
      u.uHorizon.value.set('#222C3E');
      u.uGround.value.set('#3A3128');
      u.uSunDir.value.set(0, 1, 0);
      u.uSunCol.value.set('#FFD49A');
      u.uSunPower.value = 0.0;
      this._bounceMat.color.set('#E0B27A'); // Warm indoor lamp bounce at night!
    } else {
      u.uZenith.value.copy(sunData.skyZenith);
      u.uHorizon.value.copy(sunData.skyHorizon);
      u.uGround.value.set('#B0A699').lerp(sunData.skyHorizon, 0.25);
      u.uSunDir.value.copy(sunData.dir);
      u.uSunCol.value.copy(sunData.sunColor);
      u.uSunPower.value = sunData.isTwilight ? 1.8 : 3.2;
      this._bounceMat.color.copy(sunData.sunColor).lerp(new THREE.Color('#FFF8EE'), 0.45);
    }

    const nextRT = this.pmrem.fromScene(this._envScene, 0.035);
    if (this._currentRT) this._currentRT.dispose();
    this._currentRT = nextRT;
    return this._currentRT.texture;
  }

  dispose() {
    if (this._currentRT) this._currentRT.dispose();
    this.pmrem.dispose();
  }
}
