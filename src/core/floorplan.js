/* =========================================================================
 * SINGLE SOURCE OF TRUTH: CASSIOPÉE AMBILLY LOT 17 (T4 · 83.4 m² + 11.5 m²)
 * Centralizes room bounds, wall openings, paintable surface areas, door swings,
 * kitchen exclusion zones, and TMA electrical/plumbing points.
 * Pure JS (zero DOM/WebGL dependency) so Node unit tests verify every rule!
 * ========================================================================= */

import { ROOMS, APARTMENT_DIMS } from '../catalogs/furniture.js';

export { ROOMS, APARTMENT_DIMS };

const H = APARTMENT_DIMS.ceilingH; // 2.50 m

/**
 * Interior wall segments per room used for exact paintable area (m²) calculation
 * and magnetic wall snapping.
 * Each entry: { side, isAccent, length, openings: [{ w, h }] }
 */
export const ROOM_WALL_SPECS = {
  ch3: [
    { side: 'north', isAccent: true,  length: 5.45, openings: [] },
    { side: 'south', isAccent: false, length: 5.45, openings: [{ w: 0.83, h: 2.04 }] },
    { side: 'west',  isAccent: false, length: 2.76, openings: [{ w: 1.40, h: 1.70 }] },
    { side: 'east',  isAccent: false, length: 2.76, openings: [] }
  ],
  sejour: [
    { side: 'north',        isAccent: false, length: 5.23, openings: [{ w: 0.83, h: 2.04 }] },
    { side: 'west',         isAccent: false, length: 5.44, openings: [{ w: 1.40, h: 1.70 }, { w: 1.40, h: 1.70 }] },
    { side: 'south',        isAccent: false, length: 5.23, openings: [{ w: 1.00, h: 2.15 }, { w: 2.95, h: 2.09 }] },
    { side: 'east-kitchen', isAccent: false, length: 2.36, openings: [] },
    { side: 'east',         isAccent: true,  length: 1.85, openings: [] }
  ],
  ch1: [
    { side: 'east',  isAccent: true,  length: 4.20, openings: [] },
    { side: 'west',  isAccent: false, length: 4.20, openings: [] },
    { side: 'north', isAccent: false, length: 2.80, openings: [{ w: 0.83, h: 2.04 }] },
    { side: 'south', isAccent: false, length: 2.80, openings: [{ w: 1.40, h: 1.70 }] }
  ],
  ch2: [
    { side: 'west',  isAccent: true,  length: 4.20, openings: [] },
    { side: 'east',  isAccent: false, length: 4.20, openings: [] },
    { side: 'north', isAccent: false, length: 2.68, openings: [{ w: 0.83, h: 2.04 }] },
    { side: 'south', isAccent: false, length: 2.68, openings: [{ w: 1.40, h: 1.70 }] }
  ],
  wc: [
    { side: 'north', isAccent: true,  length: 0.82, openings: [] },
    { side: 'west',  isAccent: false, length: 1.81, openings: [] },
    { side: 'east',  isAccent: false, length: 1.81, openings: [] },
    { side: 'south', isAccent: false, length: 0.82, openings: [{ w: 0.73, h: 2.04 }] }
  ],
  sdb: [
    // Non-tiled walls only (bathtub north/sides are tiled full height in Kevin Faïence)
    { side: 'west',  isAccent: false, length: 1.49, openings: [] },
    { side: 'east',  isAccent: false, length: 1.49, openings: [] },
    { side: 'south', isAccent: true,  length: 2.72, openings: [{ w: 0.83, h: 2.04 }] }
  ],
  entree: [
    { side: 'east',      isAccent: true,  length: 3.59, openings: [] },
    { side: 'north-ent', isAccent: false, length: 1.87, openings: [{ w: 0.93, h: 2.04 }] },
    { side: 'north-dgt', isAccent: false, length: 4.39, openings: [{ w: 0.83, h: 2.04 }, { w: 0.73, h: 2.04 }] },
    { side: 'south-dgt', isAccent: false, length: 5.62, openings: [{ w: 0.83, h: 2.04 }, { w: 0.83, h: 2.04 }] }
  ]
};

/**
 * Computes net paintable wall area (m²) for a given room & coverage ('all' | 'accent').
 */
export function computeRoomWallAreaM2(roomId, coverage = 'all') {
  const specs = ROOM_WALL_SPECS[roomId];
  if (!specs) return 0;
  let total = 0;
  for (const wall of specs) {
    if (coverage === 'accent' && !wall.isAccent) continue;
    let area = wall.length * H;
    for (const op of wall.openings) {
      area -= op.w * op.h;
    }
    total += Math.max(0, area);
  }
  return Math.round(total * 100) / 100;
}

/**
 * Fixed interior door & kitchen appliance swing clearance zones (exact PLAN TMA).
 * For doors: hinge (hx, hz), radius (leaf width), startAngle & endAngle in XZ plane (0 = +X, PI/2 = +Z).
 */
export const DOOR_SWINGS = [
  { id: 'door-ch3',   label: 'Chambre 3 Door',   room: 'ch3',    hx: 0.44, hz: 3.07, radius: 0.83, startAngle: -Math.PI / 2, endAngle: 0 },
  { id: 'door-sdb',   label: 'SDB Door',         room: 'sdb',    hx: 7.38, hz: 5.44, radius: 0.83, startAngle: -Math.PI / 2, endAngle: 0 },
  { id: 'door-wc',    label: 'WC Door',          room: 'wc',     hx: 8.42, hz: 5.44, radius: 0.73, startAngle: 0, endAngle: Math.PI / 2 },
  { id: 'door-ch2',   label: 'Chambre 2 Door',   room: 'ch2',    hx: 7.32, hz: 6.75, radius: 0.83, startAngle: 0, endAngle: Math.PI / 2 },
  { id: 'door-ch1',   label: 'Chambre 1 Door',   room: 'ch1',    hx: 8.42, hz: 6.75, radius: 0.83, startAngle: 0, endAngle: Math.PI / 2 },
  { id: 'door-entry', label: 'Entrance Door',    room: 'entree', hx: 9.74, hz: 2.99, radius: 0.93, startAngle: 0, endAngle: Math.PI / 2 }
];

/**
 * Fixed kitchen appliance clearance zones (fridge door, dishwasher/oven pull-out).
 */
export const APPLIANCE_ZONES = [
  { id: 'zone-fridge', label: 'Fridge Door Clearance', minX: 1.95, maxX: 2.55, minZ: 3.74, maxZ: 4.35 },
  { id: 'zone-oven',   label: 'Oven Door Clearance',   minX: 4.35, maxX: 4.98, minZ: 3.74, maxZ: 4.35 }
];

/**
 * Fixed IKEA METOD kitchen footprint in Séjour so movable furniture cannot clip inside cabinetry.
 */
export const FIXED_OBSTACLES = [
  { id: 'kitchen-u', label: 'IKEA METOD Kitchen', room: 'sejour', minX: 1.92, maxX: 5.49, minZ: 3.12, maxZ: 5.48 },
  { id: 'entree-closet', label: 'Entrée Placard', room: 'entree', minX: 9.24, maxX: 9.86, minZ: 3.12, maxZ: 5.42 }
];

/**
 * Exact TMA Technical Points (Electrical outlets, TV/RJ45, switches, plumbing, radiators).
 * Mapped directly from PLAN TMA du 16/06/2026.
 */
export const TMA_TECHNICAL_POINTS = [
  // Chambre 3 (Master Suite)
  { id: 'tma-ch3-sconce-l', room: 'ch3', kind: 'sconce', label: 'TMA #2 Sconce L', x: 0.73, y: 1.52, z: 0.27 },
  { id: 'tma-ch3-sconce-r', room: 'ch3', kind: 'sconce', label: 'TMA #2 Sconce R', x: 2.83, y: 1.52, z: 0.27 },
  { id: 'tma-ch3-bed-l',    room: 'ch3', kind: 'outlet', label: 'Bedside 16A L',   x: 0.65, y: 0.30, z: 0.27 },
  { id: 'tma-ch3-bed-r',    room: 'ch3', kind: 'outlet', label: 'Bedside 16A R',   x: 2.91, y: 0.30, z: 0.27 },
  { id: 'tma-ch3-desk',     room: 'ch3', kind: 'rj45',   label: 'TMA #3 16A+2×RJ45', x: 5.68, y: 0.35, z: 2.45 },
  { id: 'tma-ch3-sw',       room: 'ch3', kind: 'switch', label: 'Entry Switch',    x: 1.38, y: 1.15, z: 3.00 },

  // Séjour & Kitchen
  { id: 'tma-sej-tv',       room: 'sejour', kind: 'tv',     label: 'TMA #10 TV + 2×RJ45 + 3×16A', x: 5.47, y: 0.40, z: 7.15 },
  { id: 'tma-sej-west-1',   room: 'sejour', kind: 'outlet', label: 'Séjour West 16A', x: 0.28, y: 0.30, z: 5.75 },
  { id: 'tma-sej-west-2',   room: 'sejour', kind: 'outlet', label: 'Séjour SW 16A',   x: 0.28, y: 0.30, z: 7.95 },
  { id: 'tma-kit-pen',      room: 'sejour', kind: 'outlet', label: 'TMA #5 Peninsula 2×16A', x: 3.70, y: 1.05, z: 5.46 },
  { id: 'tma-kit-water',    room: 'sejour', kind: 'plumbing', label: 'Sink Water/Drain', x: 3.47, y: 0.55, z: 3.16 },
  { id: 'tma-kit-cook',     room: 'sejour', kind: 'outlet', label: '32A Induction',   x: 5.46, y: 0.45, z: 4.30 },
  { id: 'tma-sej-rad',      room: 'sejour', kind: 'radiator', label: 'TMA #11 Radiator', x: 5.44, y: 0.50, z: 6.12 },

  // Chambre 1 (South-East)
  { id: 'tma-ch1-bed-1',    room: 'ch1', kind: 'outlet', label: 'TMA #19 Bedside 16A N', x: 11.09, y: 0.30, z: 7.80 },
  { id: 'tma-ch1-bed-2',    room: 'ch1', kind: 'outlet', label: 'TMA #19 Bedside 16A S', x: 11.09, y: 0.30, z: 9.60 },
  { id: 'tma-ch1-rj45',     room: 'ch1', kind: 'rj45',   label: 'Ch. 1 RJ45 + 16A', x: 8.33, y: 0.30, z: 9.50 },

  // Chambre 2 (South-Center)
  { id: 'tma-ch2-bed-1',    room: 'ch2', kind: 'outlet', label: 'Ch. 2 Bedside 16A', x: 5.58, y: 0.30, z: 8.20 },
  { id: 'tma-ch2-bed-2',    room: 'ch2', kind: 'outlet', label: 'Ch. 2 Bedside 16A', x: 5.58, y: 0.30, z: 10.10 },
  { id: 'tma-ch2-rj45',     room: 'ch2', kind: 'rj45',   label: 'Ch. 2 RJ45 + 16A',  x: 8.22, y: 0.30, z: 9.60 },

  // WC & SDB
  { id: 'tma-wc-basin',     room: 'wc',  kind: 'plumbing', label: 'TMA #21 Lave-Mains Cold Water', x: 9.15, y: 0.55, z: 4.68 },
  { id: 'tma-sdb-wm',       room: 'sdb', kind: 'plumbing', label: 'Washing Machine Water + 16A', x: 5.58, y: 0.55, z: 5.10 },

  // Loggia
  { id: 'tma-loggia-out',   room: 'loggia', kind: 'outlet', label: 'Waterproof Exterior 16A', x: 0.30, y: 0.45, z: 9.35 }
];

/**
 * Returns the specific room containing point (x, z), skipping the 'kitchen' sub-zone.
 */
export function detectRoomAt(x, z) {
  for (const r of ROOMS) {
    if (r.id === 'kitchen') continue;
    const b = r.bounds;
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) return r;
  }
  return null;
}

/**
 * Computes world-space axis-aligned half-extents (halfX, halfZ) for a rotated footprint.
 */
export function getRotatedHalfExtents(w, d, rotY = 0) {
  const cos = Math.abs(Math.cos(rotY));
  const sin = Math.abs(Math.sin(rotY));
  return {
    halfX: (w * cos + d * sin) / 2,
    halfZ: (w * sin + d * cos) / 2
  };
}

/**
 * Applies optional 5cm grid snap, magnetic wall snapping (within snapWallDist),
 * room boundary clamping, and fixed kitchen/closet obstacle collision prevention.
 */
export function clampAndSnapItemToRoom(
  { x, z, rotY = 0, kind = '' },
  footprint = { w: 1, d: 1 },
  { gridSnap = true, gridStep = 0.05, wallSnap = true, wallSnapDist = 0.12, preventCollisions = true } = {}
) {
  let nx = x;
  let nz = z;

  if (gridSnap) {
    nx = Math.round(nx / gridStep) * gridStep;
    nz = Math.round(nz / gridStep) * gridStep;
  }

  const { halfX, halfZ } = getRotatedHalfExtents(footprint.w, footprint.d, rotY);
  const isRug = kind === 'rug';
  const room = detectRoomAt(nx, nz);

  let snappedWall = null;

  if (room && preventCollisions) {
    const b = room.bounds;
    const margin = 0.015;
    const minCenterX = b.minX + halfX + margin;
    const maxCenterX = b.maxX - halfX - margin;
    const minCenterZ = b.minZ + halfZ + margin;
    const maxCenterZ = b.maxZ - halfZ - margin;

    // Only clamp if the item actually fits inside the room along that axis
    if (minCenterX <= maxCenterX) {
      nx = Math.max(minCenterX, Math.min(maxCenterX, nx));
    }
    if (minCenterZ <= maxCenterZ) {
      nz = Math.max(minCenterZ, Math.min(maxCenterZ, nz));
    }

    // Magnetic wall snapping (skip rugs so rugs can float freely under sofas)
    if (wallSnap && !isRug) {
      if (Math.abs(nx - minCenterX) <= wallSnapDist) { nx = minCenterX; snappedWall = 'west'; }
      else if (Math.abs(nx - maxCenterX) <= wallSnapDist) { nx = maxCenterX; snappedWall = 'east'; }

      if (Math.abs(nz - minCenterZ) <= wallSnapDist) { nz = minCenterZ; snappedWall = snappedWall ? `${snappedWall}+north` : 'north'; }
      else if (Math.abs(nz - maxCenterZ) <= wallSnapDist) { nz = maxCenterZ; snappedWall = snappedWall ? `${snappedWall}+south` : 'south'; }
    }

    // Push out of fixed obstacles (e.g. IKEA METOD U-Kitchen in Séjour)
    if (!isRug) {
      for (const obs of FIXED_OBSTACLES) {
        if (obs.room !== room.id) continue;
        const oMinX = obs.minX - halfX - 0.02;
        const oMaxX = obs.maxX + halfX + 0.02;
        const oMinZ = obs.minZ - halfZ - 0.02;
        const oMaxZ = obs.maxZ + halfZ + 0.02;
        if (nx > oMinX && nx < oMaxX && nz > oMinZ && nz < oMaxZ) {
          // Minimum penetration axis push-out
          const dLeft = Math.abs(nx - oMinX);
          const dRight = Math.abs(oMaxX - nx);
          const dTop = Math.abs(nz - oMinZ);
          const dBot = Math.abs(oMaxZ - nz);
          const m = Math.min(dLeft, dRight, dTop, dBot);
          if (m === dBot) nz = oMaxZ;
          else if (m === dLeft) nx = oMinX;
          else if (m === dTop) nz = oMinZ;
          else nx = oMaxX;
        }
      }
    }
  } else {
    // Fallback soft outer apartment envelope
    nx = Math.max(0.32, Math.min(APARTMENT_DIMS.totalW - 0.32, nx));
    nz = Math.max(0.32, Math.min(APARTMENT_DIMS.totalD - 0.32, nz));
  }

  return {
    x: Math.round(nx * 1000) / 1000,
    z: Math.round(nz * 1000) / 1000,
    room: detectRoomAt(nx, nz) || room,
    snappedWall
  };
}

/**
 * Checks whether any placed movable item intersects a door swing arc.
 * Returns an array of collision records: [{ doorId, doorLabel, itemUid, itemLabel }]
 */
export function checkDoorSwingCollisions(items, getFootprint) {
  const collisions = [];
  for (const door of DOOR_SWINGS) {
    for (const item of items) {
      if (item.kind === 'rug' || (item.y && item.y > 2.05)) continue;
      const fp = getFootprint(item);
      const { halfX, halfZ } = getRotatedHalfExtents(fp.w, fp.d, item.rotY || 0);
      const minX = item.x - halfX;
      const maxX = item.x + halfX;
      const minZ = item.z - halfZ;
      const maxZ = item.z + halfZ;

      // Closest point on item AABB to door hinge
      const cx = Math.max(minX, Math.min(door.hx, maxX));
      const cz = Math.max(minZ, Math.min(door.hz, maxZ));
      const dx = cx - door.hx;
      const dz = cz - door.hz;
      const dist = Math.hypot(dx, dz);

      if (dist < door.radius - 0.04) {
        // Also verify angle falls inside the door's quadrant sweep
        const ang = Math.atan2(dz, dx);
        const midAng = (door.startAngle + door.endAngle) / 2;
        let diff = Math.abs(ang - midAng);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        const halfSweep = Math.abs(door.endAngle - door.startAngle) / 2 + 0.15;
        if (dist < 0.05 || diff <= halfSweep) {
          collisions.push({
            doorId: door.id,
            doorLabel: door.label,
            itemUid: item.uid,
            itemLabel: item.label || item.kind
          });
        }
      }
    }
  }
  return collisions;
}

/**
 * Evaluates ergonomic walkways & occluded TMA outlets across the apartment.
 */
export function evaluateErgonomics(items, getFootprint) {
  const warnings = [];
  const occludedOutlets = [];

  for (const item of items) {
    if (item.kind === 'rug') continue;
    const fp = getFootprint(item);
    const { halfX, halfZ } = getRotatedHalfExtents(fp.w, fp.d, item.rotY || 0);
    const room = detectRoomAt(item.x, item.z);

    // 1. Extended dining table chair clearance (< 80 cm to west/south/north walls)
    if (item.kind === 'diningTable' && room) {
      const b = room.bounds;
      const clearances = [
        { side: 'West', cm: Math.round((item.x - halfX - b.minX) * 100) },
        { side: 'South', cm: Math.round((b.maxZ - (item.z + halfZ)) * 100) }
      ];
      for (const c of clearances) {
        if (c.cm < 75) {
          warnings.push({
            severity: c.cm < 55 ? 'error' : 'warn',
            itemUid: item.uid,
            message: `${item.label}: only ${c.cm} cm clearance on ${c.side} side (rec. ≥ 80 cm for chairs)`
          });
        }
      }
    }

    // 2. Bed foot passage clearance
    if (item.kind === 'bed' && room) {
      const b = room.bounds;
      // Foot of bed is local +Z
      const fx = Math.sin(item.rotY || 0);
      const fz = Math.cos(item.rotY || 0);
      let footClearCm = 999;
      if (fz > 0.7) footClearCm = Math.round((b.maxZ - (item.z + halfZ)) * 100);
      else if (fz < -0.7) footClearCm = Math.round((item.z - halfZ - b.minZ) * 100);
      else if (fx > 0.7) footClearCm = Math.round((b.maxX - (item.x + halfX)) * 100);
      else if (fx < -0.7) footClearCm = Math.round((item.x - halfX - b.minX) * 100);

      if (footClearCm < 60) {
        warnings.push({
          severity: footClearCm < 45 ? 'error' : 'warn',
          itemUid: item.uid,
          message: `${item.label}: tight ${footClearCm} cm walkway at foot of bed (rec. ≥ 60 cm)`
        });
      }
    }

    // 3. Check occluded TMA electrical outlets/switches
    for (const pt of TMA_TECHNICAL_POINTS) {
      if (pt.kind === 'sconce' || pt.kind === 'plumbing') continue;
      if (pt.room !== item.room) continue;
      const inX = pt.x >= item.x - halfX - 0.06 && pt.x <= item.x + halfX + 0.06;
      const inZ = pt.z >= item.z - halfZ - 0.06 && pt.z <= item.z + halfZ + 0.06;
      const itemH = item.h || (item.kind === 'wardrobe' ? 2.36 : 0.85);
      if (inX && inZ && pt.y <= itemH && item.kind !== 'tvUnit' && item.kind !== 'nightstand' && item.kind !== 'desk') {
        occludedOutlets.push({
          pointId: pt.id,
          pointLabel: pt.label,
          itemUid: item.uid,
          itemLabel: item.label || item.kind
        });
      }
    }
  }

  return { warnings, occludedOutlets };
}
