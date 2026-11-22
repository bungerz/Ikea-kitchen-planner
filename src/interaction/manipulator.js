import * as THREE from 'three';
import { ROOMS } from '../catalogs/furniture.js';

/* =========================================================================
 * DIRECT 3D FURNITURE MANIPULATOR (SELECT, FLOOR-DRAG, SNAP, CLEARANCE HUD)
 * Seamless mouse & touch support with OrbitControls locking & live cm clearances.
 * ========================================================================= */

export class FurnitureManipulator {
  constructor({ domElement, camera, controls, scene, movableGroup, getItems, onSelect, onTransformEnd, onLiveClearance }) {
    this.dom = domElement;
    this.camera = camera;
    this.controls = controls;
    this.scene = scene;
    this.movableGroup = movableGroup;
    this.getItems = getItems;
    this.onSelect = onSelect;
    this.onTransformEnd = onTransformEnd;
    this.onLiveClearance = onLiveClearance;

    this.selectedUid = null;
    this.snapEnabled = true;
    this.snapStep = 0.05; // 5 cm architectural grid snap

    this._raycaster = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();
    this._floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._hitPoint = new THREE.Vector3();
    this._dragOffset = new THREE.Vector3();

    this._pointerDownPos = { x: 0, y: 0 };
    this._isDragging = false;
    this._dragMoved = false;
    this._dragMesh = null;
    this._dragItem = null;

    // Crisp warm architectural selection ring on floor
    this._selectionRing = new THREE.Group();
    this._selectionRing.visible = false;
    this.scene.add(this._selectionRing);

    this._bindEvents();
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

  _pickMovable(e) {
    this._updateNdc(e);
    this._raycaster.setFromCamera(this._ndc, this.camera);
    const hits = this._raycaster.intersectObjects(this.movableGroup.children, true);
    for (const h of hits) {
      const root = this._findMovableRoot(h.object);
      if (root) return root;
    }
    return null;
  }

  _intersectFloor(e) {
    this._updateNdc(e);
    this._raycaster.setFromCamera(this._ndc, this.camera);
    return this._raycaster.ray.intersectPlane(this._floorPlane, this._hitPoint);
  }

  _bindEvents() {
    this.dom.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      this._pointerDownPos = { x: e.clientX, y: e.clientY };
      this._dragMoved = false;

      const hitRoot = this._pickMovable(e);
      if (hitRoot) {
        const uid = hitRoot.userData.uid;
        if (this.selectedUid !== uid) {
          this.select(uid);
        }
        // Start direct drag immediately!
        if (this._intersectFloor(e)) {
          this._isDragging = true;
          this._dragMesh = hitRoot;
          this._dragItem = this.getItems().find(it => it.uid === uid) || null;
          this._dragOffset.set(
            hitRoot.position.x - this._hitPoint.x,
            0,
            hitRoot.position.z - this._hitPoint.z
          );
          this.controls.enabled = false;
          this.dom.style.cursor = 'grabbing';
          this.dom.setPointerCapture?.(e.pointerId);
        }
      }
    });

    this.dom.addEventListener('pointermove', (e) => {
      if (this._isDragging && this._dragMesh && this._dragItem) {
        const dx = e.clientX - this._pointerDownPos.x;
        const dy = e.clientY - this._pointerDownPos.y;
        if (Math.hypot(dx, dy) > 4) this._dragMoved = true;

        if (this._intersectFloor(e)) {
          let nx = this._hitPoint.x + this._dragOffset.x;
          let nz = this._hitPoint.z + this._dragOffset.z;
          if (this.snapEnabled) {
            nx = Math.round(nx / this.snapStep) * this.snapStep;
            nz = Math.round(nz / this.snapStep) * this.snapStep;
          }
          // Soft clamp inside apartment outer walls
          nx = Math.max(0.32, Math.min(11.05, nx));
          nz = Math.max(0.32, Math.min(10.95, nz));

          this._dragMesh.position.x = nx;
          this._dragMesh.position.z = nz;
          this._dragItem.x = nx;
          this._dragItem.z = nz;

          // Auto-update item's room tag if dragged into another room
          const detectedRoom = this._detectRoom(nx, nz);
          if (detectedRoom) this._dragItem.room = detectedRoom.id;

          this.updateSelectionVisual();
          this.onLiveClearance?.(this.computeClearance(this._dragItem, this._dragMesh));
        }
        return;
      }

      // Subtle hover cursor cue on desktop
      if (e.pointerType === 'mouse') {
        const hovered = this._pickMovable(e);
        this.dom.style.cursor = hovered ? 'pointer' : 'grab';
      }
    });

    const finishDrag = (e) => {
      if (this._isDragging) {
        const moved = this._dragMoved;
        const item = this._dragItem;
        this._isDragging = false;
        this._dragMesh = null;
        this._dragItem = null;
        this.controls.enabled = true;
        this.dom.style.cursor = 'grab';
        try { this.dom.releasePointerCapture?.(e.pointerId); } catch (_) {}
        if (moved && item) {
          this.onTransformEnd?.(item);
        }
      } else {
        // Click on empty space -> deselect
        const dist = Math.hypot(e.clientX - this._pointerDownPos.x, e.clientY - this._pointerDownPos.y);
        if (dist < 5 && !this._pickMovable(e) && this.selectedUid) {
          this.select(null);
        }
      }
    };

    this.dom.addEventListener('pointerup', finishDrag);
    this.dom.addEventListener('pointercancel', finishDrag);
  }

  _detectRoom(x, z) {
    // Check specific non-overlapping rooms first (skip 'kitchen' sub-zone)
    for (const r of ROOMS) {
      if (r.id === 'kitchen') continue;
      const b = r.bounds;
      if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) return r;
    }
    return null;
  }

  computeClearance(item, mesh) {
    if (!item || !mesh) return null;
    const room = this._detectRoom(item.x, item.z);
    const fp = mesh.userData.footprint || { w: item.w || 1, d: item.d || 1 };
    const cos = Math.abs(Math.cos(item.rotY || 0));
    const sin = Math.abs(Math.sin(item.rotY || 0));
    const halfX = (fp.w * cos + fp.d * sin) / 2;
    const halfZ = (fp.w * sin + fp.d * cos) / 2;

    if (!room) {
      return { roomName: 'Apartment', wCm: Math.round(fp.w * 100), dCm: Math.round(fp.d * 100) };
    }
    const b = room.bounds;
    return {
      roomName: room.shortName,
      wCm: Math.round(fp.w * 100),
      dCm: Math.round(fp.d * 100),
      northCm: Math.max(0, Math.round((item.z - halfZ - b.minZ) * 100)),
      southCm: Math.max(0, Math.round((b.maxZ - (item.z + halfZ)) * 100)),
      westCm:  Math.max(0, Math.round((item.x - halfX - b.minX) * 100)),
      eastCm:  Math.max(0, Math.round((b.maxX - (item.x + halfX)) * 100))
    };
  }

  select(uid) {
    this.selectedUid = uid;
    this.updateSelectionVisual();
    const item = uid ? this.getItems().find(i => i.uid === uid) : null;
    const mesh = uid ? this.movableGroup.children.find(m => m.userData.uid === uid) : null;
    this.onSelect?.(item || null, item && mesh ? this.computeClearance(item, mesh) : null);
  }

  updateSelectionVisual() {
    while (this._selectionRing.children.length) this._selectionRing.remove(this._selectionRing.children[0]);
    if (!this.selectedUid) {
      this._selectionRing.visible = false;
      return;
    }
    const mesh = this.movableGroup.children.find(m => m.userData.uid === this.selectedUid);
    if (!mesh) {
      this._selectionRing.visible = false;
      return;
    }
    const fp = mesh.userData.footprint || { w: 1.0, d: 1.0 };
    const pad = 0.08;
    const rw = fp.w + pad * 2;
    const rd = fp.d + pad * 2;

    // Warm architectural amber border rectangle on the floor + corner handles
    const pts = [
      new THREE.Vector3(-rw / 2, 0.025, -rd / 2),
      new THREE.Vector3( rw / 2, 0.025, -rd / 2),
      new THREE.Vector3( rw / 2, 0.025,  rd / 2),
      new THREE.Vector3(-rw / 2, 0.025,  rd / 2),
      new THREE.Vector3(-rw / 2, 0.025, -rd / 2)
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#D97706' }));
    const fill = new THREE.Mesh(
      new THREE.PlaneGeometry(rw, rd),
      new THREE.MeshBasicMaterial({ color: '#F59E0B', transparent: true, opacity: 0.14, depthWrite: false })
    );
    fill.rotation.x = -Math.PI / 2;
    fill.position.y = 0.02;

    // Subtle front direction arrow (+Z local)
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.14, 3),
      new THREE.MeshBasicMaterial({ color: '#D97706' })
    );
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(0, 0.03, rd / 2 + 0.09);

    this._selectionRing.add(fill, line, arrow);
    this._selectionRing.position.set(mesh.position.x, 0, mesh.position.z);
    this._selectionRing.rotation.y = mesh.rotation.y;
    this._selectionRing.visible = true;
  }
}
