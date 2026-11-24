import * as THREE from 'three';
import { clearGroupAndDispose } from '../core/dispose.js';

/* =========================================================================
 * INTERACTIVE 3D TAPE MEASURE TOOL (Shortcut: M)
 * Click any two 3D points (floor, wall, furniture) to draw persistent
 * laser measurement lines with exact cm / m distance badges.
 * ========================================================================= */

function createMeasureSprite(label) {
  const c = document.createElement('canvas');
  c.width = 180;
  c.height = 52;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.beginPath();
  ctx.roundRect(4, 4, 172, 44, 12);
  ctx.fill();
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#E0F2FE';
  ctx.font = 'bold 22px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 90, 27);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set(0.58, 0.17, 1);
  sprite.renderOrder = 20;
  return sprite;
}

export class TapeMeasureTool {
  constructor({ domElement, getCamera, scene, onChange }) {
    this.dom = domElement;
    this.getCamera = getCamera;
    this.scene = scene;
    this.onChange = onChange;

    this.active = false;
    this._startPoint = null;
    this._raycaster = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();
    this._floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.group = new THREE.Group();
    this.group.name = 'tape-measure-overlay';
    this.group.userData.hideInRT = true;
    this.scene.add(this.group);

    this._pendingDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 14, 12),
      new THREE.MeshBasicMaterial({ color: '#38BDF8', depthTest: false })
    );
    this._pendingDot.visible = false;
    this._pendingDot.renderOrder = 19;
    this.group.add(this._pendingDot);

    this._linesGroup = new THREE.Group();
    this.group.add(this._linesGroup);

    this._bindEvents();
  }

  setActive(enabled) {
    this.active = Boolean(enabled);
    this._startPoint = null;
    this._pendingDot.visible = false;
    this.dom.style.cursor = this.active ? 'crosshair' : 'grab';
    this.onChange?.();
  }

  clearAll() {
    this._startPoint = null;
    this._pendingDot.visible = false;
    clearGroupAndDispose(this._linesGroup);
    this.onChange?.();
  }

  _pickSurfacePoint(e) {
    const rect = this.dom.getBoundingClientRect();
    this._ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._ndc, this.getCamera());

    const hits = this._raycaster.intersectObjects(this.scene.children, true);
    for (const h of hits) {
      if (!h.object.visible) continue;
      if (h.object.userData?.hideInRT) continue;
      if (h.object.isSprite || h.object.isLine) continue;
      return h.point.clone();
    }
    const p = new THREE.Vector3();
    if (this._raycaster.ray.intersectPlane(this._floorPlane, p)) return p;
    return null;
  }

  _bindEvents() {
    let downPos = { x: 0, y: 0 };
    let downBtn = 0;

    this.dom.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      downPos = { x: e.clientX, y: e.clientY };
      downBtn = e.pointerType === 'mouse' ? e.button : 0;
    });

    this.dom.addEventListener('pointerup', (e) => {
      if (!this.active || downBtn !== 0) return;
      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) >= 5) return;

      const pt = this._pickSurfacePoint(e);
      if (!pt) return;

      if (!this._startPoint) {
        this._startPoint = pt;
        this._pendingDot.position.copy(pt);
        this._pendingDot.visible = true;
        this.onChange?.('First point set — click second point to measure');
      } else {
        const distM = this._startPoint.distanceTo(pt);
        const distCm = Math.round(distM * 100);
        const label = distCm >= 100 ? `${distM.toFixed(2)} m` : `${distCm} cm`;

        const geo = new THREE.BufferGeometry().setFromPoints([this._startPoint, pt]);
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#38BDF8', depthTest: false }));
        line.renderOrder = 18;

        const d1 = new THREE.Mesh(
          new THREE.SphereGeometry(0.036, 12, 10),
          new THREE.MeshBasicMaterial({ color: '#38BDF8', depthTest: false })
        );
        d1.position.copy(this._startPoint);
        const d2 = d1.clone();
        d2.position.copy(pt);

        const mid = this._startPoint.clone().add(pt).multiplyScalar(0.5);
        mid.y += 0.12;
        const badge = createMeasureSprite(label);
        badge.position.copy(mid);

        this._linesGroup.add(line, d1, d2, badge);
        this._startPoint = null;
        this._pendingDot.visible = false;
        this.onChange?.(`Measured ${label}`);
      }
    });
  }
}
