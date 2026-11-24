import * as THREE from 'three';
import {
  clampAndSnapItemToRoom,
  detectRoomAt,
  getRotatedHalfExtents
} from '../core/floorplan.js';
import { clearGroupAndDispose } from '../core/dispose.js';

/* =========================================================================
 * UPGRADED DIRECT 3D FURNITURE MANIPULATOR
 * - Zero-allocation floor selection ring + draggable circular rotation handle
 * - Magnetic wall snapping (hold Alt to bypass) + room & kitchen collision clamp
 * - On-canvas 3D floor dimension arrows + live cm sprite labels (N/S/E/W)
 * - Point-and-edit raycasting on walls & kitchen cabinets!
 * ========================================================================= */

function createDimBadgeSprite(text) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 44;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(24, 22, 19, 0.88)';
  ctx.beginPath();
  ctx.roundRect(4, 4, 120, 36, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 20px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 23);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.42, 0.145, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export class FurnitureManipulator {
  constructor({
    domElement,
    getCamera,
    getControls,
    scene,
    movableGroup,
    getItems,
    onSelect,
    onTransformLive,
    onTransformEnd,
    onLiveClearance,
    onClickWall,
    onClickKitchen,
    isBlocked
  }) {
    this.dom = domElement;
    this.getCamera = getCamera;
    this.getControls = getControls;
    this.scene = scene;
    this.movableGroup = movableGroup;
    this.getItems = getItems;
    this.onSelect = onSelect;
    this.onTransformLive = onTransformLive;
    this.onTransformEnd = onTransformEnd;
    this.onLiveClearance = onLiveClearance;
    this.onClickWall = onClickWall;
    this.onClickKitchen = onClickKitchen;
    this.isBlocked = isBlocked || (() => false);

    this.selectedUid = null;
    this.snapEnabled = true;
    this.wallSnapEnabled = true;
    this.snapStep = 0.05;

    this._raycaster = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();
    this._floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._hitPoint = new THREE.Vector3();
    this._dragOffset = new THREE.Vector3();

    this._pointerDownPos = { x: 0, y: 0 };
    this._isDragging = false;
    this._isRotating = false;
    this._dragMoved = false;
    this._dragMesh = null;
    this._dragItem = null;

    // Reusable zero-allocation selection ring + rotation handle!
    this._selectionRing = new THREE.Group();
    this._selectionRing.visible = false;
    this._selectionRing.userData.hideInRT = true;
    this._initReusableRing();
    this.scene.add(this._selectionRing);

    // On-canvas 3D floor dimension arrows + cm sprites
    this._dimOverlay = new THREE.Group();
    this._dimOverlay.visible = false;
    this._dimOverlay.userData.hideInRT = true;
    this.scene.add(this._dimOverlay);
    this._lastDimSig = '';

    this._bindEvents();
  }

  _initReusableRing() {
    // Unit 1x1 border line scaled in place -> ZERO allocations per drag frame!
    const pts = [
      new THREE.Vector3(-0.5, 0.025, -0.5),
      new THREE.Vector3( 0.5, 0.025, -0.5),
      new THREE.Vector3( 0.5, 0.025,  0.5),
      new THREE.Vector3(-0.5, 0.025,  0.5),
      new THREE.Vector3(-0.5, 0.025, -0.5)
    ];
    this._ringBorder = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: '#D97706' })
    );
    this._ringFill = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: '#F59E0B', transparent: true, opacity: 0.13, depthWrite: false })
    );
    this._ringFill.rotation.x = -Math.PI / 2;
    this._ringFill.position.y = 0.02;

    // Front orientation chevron (+Z local)
    this._ringArrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.14, 3),
      new THREE.MeshBasicMaterial({ color: '#D97706' })
    );
    this._ringArrow.rotation.x = Math.PI / 2;

    // Interactive Circular Rotate Handle (drag to rotate smoothly!)
    this._rotateHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.025, 20),
      new THREE.MeshBasicMaterial({ color: '#F59E0B' })
    );
    this._rotateHandle.userData.isRotateHandle = true;
    const innerDot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.03, 14),
      new THREE.MeshBasicMaterial({ color: '#1E1C19' })
    );
    innerDot.userData.isRotateHandle = true;
    this._rotateHandle.add(innerDot);

    this._selectionRing.add(this._ringFill, this._ringBorder, this._ringArrow, this._rotateHandle);
  }

  _updateNdc(e) {
    const rect = this.dom.getBoundingClientRect();
    this._ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _findMovableRoot(obj) {
    let cur = obj;
    while (cur) {
      if (cur.userData && cur.userData.movable && cur.userData.uid) return cur;
      cur = cur.parent;
    }
    return null;
  }

  _pickRotateHandle(e) {
    if (!this._selectionRing.visible || !this.selectedUid) return false;
    this._updateNdc(e);
    this._raycaster.setFromCamera(this._ndc, this.getCamera());
    const hits = this._raycaster.intersectObject(this._rotateHandle, true);
    return hits.length > 0;
  }

  _pickMovable(e) {
    this._updateNdc(e);
    this._raycaster.setFromCamera(this._ndc, this.getCamera());
    const hits = this._raycaster.intersectObjects(this.movableGroup.children, true);
    for (const h of hits) {
      const root = this._findMovableRoot(h.object);
      if (root) return root;
    }
    return null;
  }

  _pickStaticContext(e) {
    this._updateNdc(e);
    this._raycaster.setFromCamera(this._ndc, this.getCamera());
    const hits = this._raycaster.intersectObjects(this.scene.children, true);
    for (const h of hits) {
      if (!h.object.visible) continue;
      if (h.object.userData?.clickableKitchen) return { kind: 'kitchen' };
      if (h.object.userData?.clickableWall && h.object.userData?.paintRoom) {
        return { kind: 'wall', roomId: h.object.userData.paintRoom, isAccent: h.object.userData.isAccent };
      }
      if (this._findMovableRoot(h.object)) return null;
    }
    return null;
  }

  _intersectFloor(e) {
    this._updateNdc(e);
    this._raycaster.setFromCamera(this._ndc, this.getCamera());
    return this._raycaster.ray.intersectPlane(this._floorPlane, this._hitPoint);
  }

  _bindEvents() {
    this.dom.addEventListener('pointerdown', (e) => {
      if (this.isBlocked()) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      this._pointerDownPos = { x: e.clientX, y: e.clientY };
      this._dragMoved = false;

      // 1. Check drag-to-rotate handle first!
      if (this._pickRotateHandle(e)) {
        const mesh = this.movableGroup.children.find(m => m.userData.uid === this.selectedUid);
        const item = this.getItems().find(it => it.uid === this.selectedUid);
        if (mesh && item) {
          this._isRotating = true;
          this._dragMesh = mesh;
          this._dragItem = item;
          this.getControls().enabled = false;
          this.dom.style.cursor = 'alias';
          this.dom.setPointerCapture?.(e.pointerId);
          return;
        }
      }

      // 2. Check movable furniture pick
      const hitRoot = this._pickMovable(e);
      if (hitRoot) {
        const uid = hitRoot.userData.uid;
        if (this.selectedUid !== uid) {
          this.select(uid);
        }
        if (this._intersectFloor(e)) {
          this._isDragging = true;
          this._dragMesh = hitRoot;
          this._dragItem = this.getItems().find(it => it.uid === uid) || null;
          this._dragOffset.set(
            hitRoot.position.x - this._hitPoint.x,
            0,
            hitRoot.position.z - this._hitPoint.z
          );
          this.getControls().enabled = false;
          this.dom.style.cursor = 'grabbing';
          this.dom.setPointerCapture?.(e.pointerId);
        }
      }
    });

    this.dom.addEventListener('pointermove', (e) => {
      if (this.isBlocked()) return;

      // Live circular drag-to-rotate!
      if (this._isRotating && this._dragMesh && this._dragItem) {
        if (this._intersectFloor(e)) {
          this._dragMoved = true;
          const dx = this._hitPoint.x - this._dragMesh.position.x;
          const dz = this._hitPoint.z - this._dragMesh.position.z;
          let angle = Math.atan2(dx, dz);
          // Snap to 15° increments unless Alt is held
          if (!e.altKey) {
            const step = Math.PI / 12;
            angle = Math.round(angle / step) * step;
          }
          this._dragMesh.rotation.y = angle;
          this._dragItem.rotY = angle;
          this.updateSelectionVisual();
          const cl = this.computeClearance(this._dragItem, this._dragMesh);
          this._updateDimensionArrows(this._dragItem, this._dragMesh, cl);
          this.onLiveClearance?.(cl);
          this.onTransformLive?.();
        }
        return;
      }

      // Live floor drag with magnetic wall snap & collision clamping!
      if (this._isDragging && this._dragMesh && this._dragItem) {
        const dx = e.clientX - this._pointerDownPos.x;
        const dy = e.clientY - this._pointerDownPos.y;
        if (Math.hypot(dx, dy) > 4) this._dragMoved = true;

        if (this._intersectFloor(e)) {
          const rawX = this._hitPoint.x + this._dragOffset.x;
          const rawZ = this._hitPoint.z + this._dragOffset.z;
          const fp = this._dragMesh.userData.footprint || { w: this._dragItem.w || 1, d: this._dragItem.d || 1 };

          const snapped = clampAndSnapItemToRoom(
            { x: rawX, z: rawZ, rotY: this._dragItem.rotY || 0, kind: this._dragItem.kind },
            fp,
            {
              gridSnap: this.snapEnabled && !e.altKey,
              gridStep: this.snapStep,
              wallSnap: this.wallSnapEnabled && !e.altKey,
              wallSnapDist: 0.12,
              preventCollisions: !e.shiftKey
            }
          );

          this._dragMesh.position.x = snapped.x;
          this._dragMesh.position.z = snapped.z;
          this._dragItem.x = snapped.x;
          this._dragItem.z = snapped.z;
          if (snapped.room) this._dragItem.room = snapped.room.id;

          this.updateSelectionVisual();
          const cl = this.computeClearance(this._dragItem, this._dragMesh, snapped.snappedWall);
          this._updateDimensionArrows(this._dragItem, this._dragMesh, cl);
          this.onLiveClearance?.(cl);
          this.onTransformLive?.();
        }
        return;
      }

      if (e.pointerType === 'mouse') {
        if (this._pickRotateHandle(e)) {
          this.dom.style.cursor = 'alias';
        } else {
          const hovered = this._pickMovable(e);
          this.dom.style.cursor = hovered ? 'pointer' : 'grab';
        }
      }
    });

    const finishDrag = (e) => {
      if (this._isDragging || this._isRotating) {
        const moved = this._dragMoved;
        const item = this._dragItem;
        this._isDragging = false;
        this._isRotating = false;
        this._dragMesh = null;
        this._dragItem = null;
        this.getControls().enabled = true;
        this.dom.style.cursor = 'grab';
        try { this.dom.releasePointerCapture?.(e.pointerId); } catch (_) {}
        if (moved && item) {
          this.onTransformEnd?.(item);
        }
      } else if (!this.isBlocked()) {
        const dist = Math.hypot(e.clientX - this._pointerDownPos.x, e.clientY - this._pointerDownPos.y);
        if (dist < 5 && !this._pickMovable(e)) {
          if (this.selectedUid) {
            this.select(null);
          } else {
            // Point-and-edit: clicking a wall or kitchen cabinet directly opens its panel!
            const ctx = this._pickStaticContext(e);
            if (ctx?.kind === 'kitchen') this.onClickKitchen?.();
            else if (ctx?.kind === 'wall') this.onClickWall?.(ctx.roomId, ctx.isAccent);
          }
        }
      }
    };

    this.dom.addEventListener('pointerup', finishDrag);
    this.dom.addEventListener('pointercancel', finishDrag);
  }

  computeClearance(item, mesh, snappedWall = null) {
    if (!item || !mesh) return null;
    const room = detectRoomAt(item.x, item.z);
    const fp = mesh.userData.footprint || { w: item.w || 1, d: item.d || 1 };
    const { halfX, halfZ } = getRotatedHalfExtents(fp.w, fp.d, item.rotY || 0);

    if (!room) {
      return { roomName: 'Apartment', wCm: Math.round(fp.w * 100), dCm: Math.round(fp.d * 100), snappedWall };
    }
    const b = room.bounds;
    return {
      roomName: room.shortName,
      roomBounds: b,
      halfX,
      halfZ,
      wCm: Math.round(fp.w * 100),
      dCm: Math.round(fp.d * 100),
      northCm: Math.max(0, Math.round((item.z - halfZ - b.minZ) * 100)),
      southCm: Math.max(0, Math.round((b.maxZ - (item.z + halfZ)) * 100)),
      westCm:  Math.max(0, Math.round((item.x - halfX - b.minX) * 100)),
      eastCm:  Math.max(0, Math.round((b.maxX - (item.x + halfX)) * 100)),
      snappedWall
    };
  }

  _updateDimensionArrows(item, mesh, cl) {
    if (!item || !mesh || !cl || !cl.roomBounds) {
      this._dimOverlay.visible = false;
      return;
    }
    const sig = `${item.uid}:${cl.northCm}:${cl.southCm}:${cl.westCm}:${cl.eastCm}`;
    if (sig === this._lastDimSig && this._dimOverlay.visible) return;
    this._lastDimSig = sig;

    clearGroupAndDispose(this._dimOverlay);
    const b = cl.roomBounds;
    const y = 0.04;
    const lineMat = new THREE.LineBasicMaterial({ color: '#F59E0B' });

    const addRay = (x1, z1, x2, z2, cm) => {
      if (cm < 6) return;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x1, y, z1),
        new THREE.Vector3(x2, y, z2)
      ]);
      this._dimOverlay.add(new THREE.Line(geo, lineMat));
      const badge = createDimBadgeSprite(`${cm} cm`);
      badge.position.set((x1 + x2) / 2, 0.14, (z1 + z2) / 2);
      this._dimOverlay.add(badge);
    };

    // Draw N / S / W / E visual floor clearance arrows
    addRay(item.x, item.z - cl.halfZ, item.x, b.minZ, cl.northCm);
    addRay(item.x, item.z + cl.halfZ, item.x, b.maxZ, cl.southCm);
    addRay(item.x - cl.halfX, item.z, b.minX, item.z, cl.westCm);
    addRay(item.x + cl.halfX, item.z, b.maxX, item.z, cl.eastCm);

    this._dimOverlay.visible = true;
  }

  select(uid) {
    this.selectedUid = uid;
    this.updateSelectionVisual();
    const item = uid ? this.getItems().find(i => i.uid === uid) : null;
    const mesh = uid ? this.movableGroup.children.find(m => m.userData.uid === uid) : null;
    const cl = item && mesh ? this.computeClearance(item, mesh) : null;
    if (cl) {
      this._updateDimensionArrows(item, mesh, cl);
    } else {
      this._dimOverlay.visible = false;
      this._lastDimSig = '';
    }
    this.onSelect?.(item || null, cl);
  }

  updateSelectionVisual() {
    if (!this.selectedUid) {
      this._selectionRing.visible = false;
      this._dimOverlay.visible = false;
      return;
    }
    const mesh = this.movableGroup.children.find(m => m.userData.uid === this.selectedUid);
    if (!mesh) {
      this._selectionRing.visible = false;
      this._dimOverlay.visible = false;
      return;
    }
    const fp = mesh.userData.footprint || { w: 1.0, d: 1.0 };
    const pad = 0.08;
    const rw = fp.w + pad * 2;
    const rd = fp.d + pad * 2;

    // Update scale/positions in place — ZERO geometry/material allocations!
    this._ringBorder.scale.set(rw, 1, rd);
    this._ringFill.scale.set(rw, rd, 1);
    this._ringArrow.position.set(0, 0.03, rd / 2 + 0.09);
    this._rotateHandle.position.set(0, 0.03, rd / 2 + 0.28);

    this._selectionRing.position.set(mesh.position.x, 0, mesh.position.z);
    this._selectionRing.rotation.y = mesh.rotation.y;
    this._selectionRing.visible = true;
  }
}
