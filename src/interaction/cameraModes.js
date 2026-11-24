import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { APARTMENT_DIMS } from '../core/floorplan.js';

/* =========================================================================
 * MULTI-MODE CAMERA CONTROLLER
 * - 'orbit'  : 3D Perspective OrbitControls + optional Smart Auto-Hide Walls
 * - 'plan2d' : True OrthographicCamera top-down Blueprint mode (zero distortion)
 * - 'walk'   : First-Person Eye-Level (1.65 m) WASD + Drag-to-Look Walkthrough
 * ========================================================================= */

export class CameraModeController {
  constructor({ domElement, perspCamera, controls, apartmentShell, onCameraMove, onModeChange }) {
    this.dom = domElement;
    this.perspCamera = perspCamera;
    this.controls = controls;
    this.apartmentShell = apartmentShell;
    this.onCameraMove = onCameraMove;
    this.onModeChange = onModeChange;

    this.mode = 'orbit'; // 'orbit' | 'plan2d' | 'walk'
    this.autoHideWalls = false;

    // True Orthographic Camera for 2D Blueprint Mode
    this.orthoFrustum = 13.8;
    this.orthoCamera = new THREE.OrthographicCamera(-7, 7, 7, -7, 0.1, 80);
    this.orthoCamera.position.set(5.68, 18, 5.62);
    this.orthoCamera.lookAt(5.68, 0, 5.62);
    this.orthoCamera.zoom = 1.0;

    this.orthoControls = new OrbitControls(this.orthoCamera, domElement);
    this.orthoControls.enableRotate = false;
    this.orthoControls.enableDamping = true;
    this.orthoControls.dampingFactor = 0.09;
    this.orthoControls.screenSpacePanning = true;
    this.orthoControls.minZoom = 0.55;
    this.orthoControls.maxZoom = 4.2;
    this.orthoControls.target.set(5.68, 0, 5.62);
    this.orthoControls.enabled = false;
    this.orthoControls.addEventListener('change', () => this.onCameraMove?.());

    // First-person walkthrough state
    this._walkYaw = Math.PI * 0.15;
    this._walkPitch = -0.05;
    this._walkDragging = false;
    this._walkLast = { x: 0, y: 0 };
    this._keys = new Set();

    this._bindWalkEvents();
  }

  get activeCamera() {
    return this.mode === 'plan2d' ? this.orthoCamera : this.perspCamera;
  }

  get activeControls() {
    return this.mode === 'plan2d' ? this.orthoControls : this.controls;
  }

  _bindWalkEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'z', 'q', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        this._keys.add(k);
      }
    });
    window.addEventListener('keyup', (e) => {
      this._keys.delete(e.key.toLowerCase());
    });

    this.dom.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'walk') return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      this._walkDragging = true;
      this._walkLast = { x: e.clientX, y: e.clientY };
    });

    this.dom.addEventListener('pointermove', (e) => {
      if (this.mode !== 'walk' || !this._walkDragging) return;
      const dx = e.clientX - this._walkLast.x;
      const dy = e.clientY - this._walkLast.y;
      this._walkLast = { x: e.clientX, y: e.clientY };
      this._walkYaw -= dx * 0.0042;
      this._walkPitch = Math.max(-0.75, Math.min(0.65, this._walkPitch - dy * 0.0036));
      this._syncWalkLook();
      this.onCameraMove?.();
    });

    const endDrag = () => { this._walkDragging = false; };
    this.dom.addEventListener('pointerup', endDrag);
    this.dom.addEventListener('pointercancel', endDrag);
  }

  _syncWalkLook() {
    const dir = new THREE.Vector3(
      Math.sin(this._walkYaw) * Math.cos(this._walkPitch),
      Math.sin(this._walkPitch),
      -Math.cos(this._walkYaw) * Math.cos(this._walkPitch)
    );
    this.perspCamera.lookAt(this.perspCamera.position.clone().add(dir));
    this.controls.target.copy(this.perspCamera.position).addScaledVector(dir, 2.0);
  }

  setAspect(width, height) {
    const aspect = Math.max(0.2, width / Math.max(1, height));
    this.perspCamera.aspect = aspect;
    this.perspCamera.updateProjectionMatrix();

    const halfH = this.orthoFrustum / 2;
    const halfW = halfH * aspect;
    this.orthoCamera.left = -halfW;
    this.orthoCamera.right = halfW;
    this.orthoCamera.top = halfH;
    this.orthoCamera.bottom = -halfH;
    this.orthoCamera.updateProjectionMatrix();
  }

  setMode(newMode) {
    if (!['orbit', 'plan2d', 'walk'].includes(newMode)) return;
    this.mode = newMode;

    if (newMode === 'plan2d') {
      this.controls.enabled = false;
      this.orthoControls.enabled = true;
      this.orthoCamera.position.set(5.68, 18, 5.62);
      this.orthoControls.target.set(5.68, 0, 5.62);
      this.orthoCamera.zoom = 1.0;
      this.orthoCamera.updateProjectionMatrix();
      this.orthoControls.update();
      this._restoreExteriorWalls();
    } else if (newMode === 'walk') {
      this.orthoControls.enabled = false;
      this.controls.enabled = false;
      // Start eye-level (1.65 m) inside Séjour looking toward Kitchen & Loggia if currently outside
      const p = this.perspCamera.position;
      const inside = p.x > 0.4 && p.x < 11.0 && p.z > 0.4 && p.z < 10.9 && p.y < 2.3;
      if (!inside) {
        p.set(2.2, 1.65, 7.6);
        this._walkYaw = 0.55;
        this._walkPitch = -0.06;
      } else {
        p.y = 1.65;
        const lookDir = this.controls.target.clone().sub(p).normalize();
        this._walkYaw = Math.atan2(lookDir.x, -lookDir.z);
        this._walkPitch = Math.max(-0.5, Math.min(0.5, Math.asin(Math.max(-1, Math.min(1, lookDir.y)))));
      }
      this._syncWalkLook();
      this._restoreExteriorWalls();
    } else {
      // 'orbit'
      this.orthoControls.enabled = false;
      this.controls.enabled = true;
      this.controls.update();
    }

    this.onModeChange?.(newMode);
    this.onCameraMove?.();
  }

  setAutoHideWalls(enabled) {
    this.autoHideWalls = Boolean(enabled);
    if (!this.autoHideWalls) this._restoreExteriorWalls();
    this.updateAutoHideWalls();
  }

  _restoreExteriorWalls() {
    const g = this.apartmentShell?.exteriorWallGroups;
    if (!g) return;
    g.west.visible = true;
    g.south.visible = true;
    g.east.visible = true;
    g.north.visible = true;
  }

  updateAutoHideWalls() {
    const g = this.apartmentShell?.exteriorWallGroups;
    if (!g) return;
    if (!this.autoHideWalls || this.mode !== 'orbit') {
      this._restoreExteriorWalls();
      return;
    }
    const p = this.perspCamera.position;
    const t = this.controls.target;
    // Hide exterior walls sitting directly between an outside orbit camera and the apartment interior
    g.south.visible = !(p.z > t.z + 2.2 && p.z > 10.5);
    g.north.visible = !(p.z < t.z - 2.2 && p.z < 0.8);
    g.west.visible  = !(p.x < t.x - 2.2 && p.x < 0.6);
    g.east.visible  = !(p.x > t.x + 2.2 && p.x > 10.8);
  }

  /**
   * Called per animation frame; returns true if camera moved (for on-demand rendering!).
   */
  update(dtSec = 0.016) {
    let moved = false;

    if (this.mode === 'plan2d') {
      const prevP = this.orthoCamera.position.clone();
      const prevZ = this.orthoCamera.zoom;
      this.orthoControls.update();
      if (prevP.distanceToSquared(this.orthoCamera.position) > 1e-8 || Math.abs(prevZ - this.orthoCamera.zoom) > 1e-6) {
        moved = true;
      }
      return moved;
    }

    if (this.mode === 'walk') {
      if (this._keys.size > 0) {
        const speed = 2.6 * Math.min(dtSec, 0.05);
        const fwd = new THREE.Vector3(Math.sin(this._walkYaw), 0, -Math.cos(this._walkYaw));
        const right = new THREE.Vector3(Math.cos(this._walkYaw), 0, Math.sin(this._walkYaw));
        const delta = new THREE.Vector3();

        if (this._keys.has('w') || this._keys.has('z') || this._keys.has('arrowup')) delta.add(fwd);
        if (this._keys.has('s') || this._keys.has('arrowdown')) delta.sub(fwd);
        if (this._keys.has('d') || this._keys.has('arrowright')) delta.add(right);
        if (this._keys.has('a') || this._keys.has('q') || this._keys.has('arrowleft')) delta.sub(right);

        if (delta.lengthSq() > 0) {
          delta.normalize().multiplyScalar(speed);
          const next = this.perspCamera.position.clone().add(delta);
          next.x = Math.max(0.45, Math.min(APARTMENT_DIMS.totalW - 0.45, next.x));
          next.z = Math.max(0.45, Math.min(APARTMENT_DIMS.totalD - 0.45, next.z));
          next.y = 1.65;
          this.perspCamera.position.copy(next);
          this._syncWalkLook();
          moved = true;
        }
      }
      return moved;
    }

    // Orbit mode
    const prevP = this.perspCamera.position.clone();
    const prevT = this.controls.target.clone();
    this.controls.update();
    if (prevP.distanceToSquared(this.perspCamera.position) > 1e-8 || prevT.distanceToSquared(this.controls.target) > 1e-8) {
      moved = true;
      this.updateAutoHideWalls();
    }
    return moved;
  }
}
