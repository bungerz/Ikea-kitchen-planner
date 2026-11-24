import * as THREE from 'three';
import {
  ROOMS,
  DOOR_SWINGS,
  APPLIANCE_ZONES,
  TMA_TECHNICAL_POINTS,
  checkDoorSwingCollisions,
  evaluateErgonomics
} from '../core/floorplan.js';
import { clearGroupAndDispose } from '../core/dispose.js';

/* =========================================================================
 * ARCHITECTURAL & TECHNICAL 3D OVERLAYS
 * 1. 2D Blueprint Room Labels (Name + m² area, visible in 2D Plan mode)
 * 2. Door & Appliance Swing Arcs (green = clear, red = furniture collision!)
 * 3. TMA Technical Overlay (16A outlets, TV/RJ45, switches, plumbing, radiators)
 * ========================================================================= */

function createBadgeSprite(text, bg = 'rgba(30,28,25,0.88)', fg = '#FFFFFF', border = '#D97706', scaleX = 0.85) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 68;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(4, 4, 248, 60, 14);
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.font = 'bold 24px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 35);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(scaleX, scaleX * (68 / 256), 1);
  sp.renderOrder = 15;
  return sp;
}

export class ArchitecturalOverlays {
  constructor(scene) {
    this.scene = scene;

    this.planLabelsGroup = new THREE.Group();
    this.planLabelsGroup.name = 'blueprint-room-labels';
    this.planLabelsGroup.visible = false;
    this.planLabelsGroup.userData.hideInRT = true;

    this.doorSwingsGroup = new THREE.Group();
    this.doorSwingsGroup.name = 'door-swing-overlay';
    this.doorSwingsGroup.visible = false;
    this.doorSwingsGroup.userData.hideInRT = true;

    this.tmaGroup = new THREE.Group();
    this.tmaGroup.name = 'tma-technical-overlay';
    this.tmaGroup.visible = false;
    this.tmaGroup.userData.hideInRT = true;

    this.scene.add(this.planLabelsGroup, this.doorSwingsGroup, this.tmaGroup);
    this._buildRoomLabels();
  }

  _buildRoomLabels() {
    clearGroupAndDispose(this.planLabelsGroup);
    for (const r of ROOMS) {
      if (r.id === 'kitchen') continue;
      const cx = (r.bounds.minX + r.bounds.maxX) / 2;
      const cz = (r.bounds.minZ + r.bounds.maxZ) / 2;
      const sp = createBadgeSprite(
        `${r.shortName} · ${r.areaM2}m²`,
        'rgba(255, 255, 255, 0.90)',
        '#1E1C19',
        '#8B6B4E',
        1.45
      );
      sp.position.set(cx, 2.75, cz);
      this.planLabelsGroup.add(sp);
    }
  }

  setPlanLabelsVisible(visible) {
    this.planLabelsGroup.visible = Boolean(visible);
  }

  /**
   * Rebuilds Door Swing & Appliance Clearance arcs and returns live ergonomic & collision diagnostics!
   */
  updateDoorSwings(visible, items, getFootprint) {
    this.doorSwingsGroup.visible = Boolean(visible);
    const collisions = checkDoorSwingCollisions(items, getFootprint);
    const ergo = evaluateErgonomics(items, getFootprint);

    if (!visible) return { collisions, ...ergo };

    clearGroupAndDispose(this.doorSwingsGroup);
    const collidedDoors = new Set(collisions.map(c => c.doorId));

    for (const door of DOOR_SWINGS) {
      const hit = collidedDoors.has(door.id);
      const col = hit ? '#EF4444' : '#10B981';

      // Filled 90° quarter-circle floor sector
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      const steps = 18;
      for (let i = 0; i <= steps; i++) {
        const a = door.startAngle + ((door.endAngle - door.startAngle) * i) / steps;
        shape.lineTo(Math.cos(a) * door.radius, Math.sin(a) * door.radius);
      }
      shape.closePath();

      const sectorGeo = new THREE.ShapeGeometry(shape);
      const sector = new THREE.Mesh(
        sectorGeo,
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: hit ? 0.34 : 0.16, side: THREE.DoubleSide, depthWrite: false })
      );
      sector.rotation.x = Math.PI / 2;
      sector.position.set(door.hx, 0.032, door.hz);

      // Crisp arc perimeter line
      const pts = [];
      pts.push(new THREE.Vector3(door.hx, 0.036, door.hz));
      for (let i = 0; i <= steps; i++) {
        const a = door.startAngle + ((door.endAngle - door.startAngle) * i) / steps;
        pts.push(new THREE.Vector3(door.hx + Math.cos(a) * door.radius, 0.036, door.hz + Math.sin(a) * door.radius));
      }
      pts.push(new THREE.Vector3(door.hx, 0.036, door.hz));
      const arcLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: col })
      );
      this.doorSwingsGroup.add(sector, arcLine);

      if (hit) {
        const midA = (door.startAngle + door.endAngle) / 2;
        const warnSp = createBadgeSprite('⚠ Door Blocked', 'rgba(185,28,28,0.92)', '#FFF', '#FCA5A5', 0.92);
        warnSp.position.set(door.hx + Math.cos(midA) * (door.radius * 0.6), 0.35, door.hz + Math.sin(midA) * (door.radius * 0.6));
        this.doorSwingsGroup.add(warnSp);
      }
    }

    // Kitchen fridge & oven pull-out clearance rectangles
    for (const z of APPLIANCE_ZONES) {
      const w = z.maxX - z.minX;
      const d = z.maxZ - z.minZ;
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        new THREE.MeshBasicMaterial({ color: '#0EA5E9', transparent: true, opacity: 0.15, depthWrite: false })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set((z.minX + z.maxX) / 2, 0.03, (z.minZ + z.maxZ) / 2);
      this.doorSwingsGroup.add(m);
    }

    return { collisions, ...ergo };
  }

  /**
   * Rebuilds TMA Technical Overlay (16A outlets, TV/RJ45, switches, plumbing, radiators).
   */
  updateTmaOverlay(visible, occludedOutlets = []) {
    this.tmaGroup.visible = Boolean(visible);
    if (!visible) return;

    clearGroupAndDispose(this.tmaGroup);
    const occludedSet = new Set(occludedOutlets.map(o => o.pointId));

    const palette = {
      outlet:   { color: '#F59E0B', icon: '⚡' },
      tv:       { color: '#8B5CF6', icon: '📺' },
      rj45:     { color: '#3B82F6', icon: '🌐' },
      switch:   { color: '#10B981', icon: '🔘' },
      plumbing: { color: '#06B6D4', icon: '💧' },
      radiator: { color: '#EF4444', icon: '🔥' },
      sconce:   { color: '#FBBF24', icon: '💡' }
    };

    for (const pt of TMA_TECHNICAL_POINTS) {
      const style = palette[pt.kind] || palette.outlet;
      const isBlocked = occludedSet.has(pt.id);
      const col = isBlocked ? '#EF4444' : style.color;

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 14, 12),
        new THREE.MeshBasicMaterial({ color: col, depthTest: false })
      );
      dot.position.set(pt.x, pt.y, pt.z);
      dot.renderOrder = 14;

      const label = isBlocked ? `⚠ ${pt.label}` : `${style.icon} ${pt.label}`;
      const badge = createBadgeSprite(
        label,
        isBlocked ? 'rgba(185,28,28,0.92)' : 'rgba(24,22,19,0.88)',
        '#FFFFFF',
        col,
        1.05
      );
      badge.position.set(pt.x, pt.y + 0.22, pt.z);
      this.tmaGroup.add(dot, badge);
    }
  }
}
