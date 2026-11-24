import * as THREE from 'three';
import { APARTMENT_DIMS } from '../catalogs/furniture.js';
import {
  getTaupeTileTextures,
  getOakLaminateTextures,
  getLoggiaTileTextures,
  getBathroomTileTexture,
  getWoodTexture,
  getArtworkTexture
} from './textures.js';

const H = APARTMENT_DIMS.ceilingH; // 2.50 m

/**
 * Helper: creates a wall segment with rectangular openings (windows / doors)
 * along either X (horizontal E-W wall) or Z (vertical N-S wall).
 */
function addWallWithOpenings(parent, { axis, fixedCoord, start, end, thickness, height = H, openings = [], material }) {
  const sorted = [...openings].sort((a, b) => a.s - b.s);
  const makeBox = (len, h, centerAlong, centerY) => {
    if (len <= 0.004 || h <= 0.004) return;
    const geo = axis === 'x'
      ? new THREE.BoxGeometry(len, h, thickness)
      : new THREE.BoxGeometry(thickness, h, len);
    const mesh = new THREE.Mesh(geo, material);
    if (axis === 'x') {
      mesh.position.set(centerAlong, centerY, fixedCoord);
    } else {
      mesh.position.set(fixedCoord, centerY, centerAlong);
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
  };

  let cursor = start;
  for (const op of sorted) {
    if (op.s > cursor) {
      makeBox(op.s - cursor, height, (cursor + op.s) / 2, height / 2);
    }
    const opLen = op.e - op.s;
    const opMid = (op.s + op.e) / 2;
    // Below opening (sill)
    if (op.y0 > 0.005) {
      makeBox(opLen, op.y0, opMid, op.y0 / 2);
    }
    // Above opening (lintel)
    if (op.y1 < height - 0.005) {
      const lintelH = height - op.y1;
      makeBox(opLen, lintelH, opMid, op.y1 + lintelH / 2);
    }
    cursor = Math.max(cursor, op.e);
  }
  if (cursor < end) {
    makeBox(end - cursor, height, (cursor + end) / 2, height / 2);
  }
}

/**
 * Helper: builds an interior painted wall lining (thin 4 mm panel) with openings
 * so each room & its accent wall can be painted independently in Dulux Valentine colors!
 */
function addPaintedLining(parent, { roomId, side, isAccent = false, axis, faceCoord, normalSign, start, end, height = H, openings = [], materials }) {
  const mat = isAccent ? materials[roomId].accent : materials[roomId].main;
  const sorted = [...openings].sort((a, b) => a.s - b.s);
  const offset = faceCoord + normalSign * 0.004;

  const makePanel = (len, h, centerAlong, centerY) => {
    if (len <= 0.005 || h <= 0.005) return;
    const geo = axis === 'x'
      ? new THREE.BoxGeometry(len, h, 0.004)
      : new THREE.BoxGeometry(0.004, h, len);
    const mesh = new THREE.Mesh(geo, mat);
    if (axis === 'x') {
      mesh.position.set(centerAlong, centerY, offset);
    } else {
      mesh.position.set(offset, centerY, centerAlong);
    }
    mesh.receiveShadow = true;
    mesh.userData = { paintRoom: roomId, paintSide: side, isAccent };
    parent.add(mesh);
  };

  let cursor = start;
  for (const op of sorted) {
    const s = Math.max(start, op.s);
    const e = Math.min(end, op.e);
    if (e <= s) continue;
    if (s > cursor) makePanel(s - cursor, height, (cursor + s) / 2, height / 2);
    const opLen = e - s;
    const opMid = (s + e) / 2;
    if (op.y0 > 0.005) makePanel(opLen, op.y0, opMid, op.y0 / 2);
    if (op.y1 < height - 0.005) {
      const lh = height - op.y1;
      makePanel(opLen, lh, opMid, op.y1 + lh / 2);
    }
    cursor = Math.max(cursor, e);
  }
  if (cursor < end) makePanel(end - cursor, height, (cursor + end) / 2, height / 2);
}

/**
 * Helper: realistic double-glazed architectural window frame + sill + glass
 */
function addWindowUnit(parent, { axis, coord, s, e, y0, y1, depth = 0.24 }) {
  const len = e - s;
  const h = y1 - y0;
  const mid = (s + e) / 2;
  const midY = (y0 + y1) / 2;
  const group = new THREE.Group();

  const frameMat = new THREE.MeshStandardMaterial({ color: '#F2F2EF', roughness: 0.42, metalness: 0.08 });
  const extFrameMat = new THREE.MeshStandardMaterial({ color: '#4B4D50', roughness: 0.45, metalness: 0.35 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#DFF0F8',
    roughness: 0.06,
    metalness: 0.0,
    transmission: 0.78,
    transparent: true,
    opacity: 0.32,
    ior: 1.5
  });

  const frameT = 0.055;
  const frameD = 0.08;
  // Outer surround (4 bars)
  const addBar = (bx, by, bz, px, py, pz, mat = frameMat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bx, by, bz), mat);
    m.position.set(px, py, pz);
    group.add(m);
  };

  if (axis === 'x') {
    // Wall runs along X (South window)
    addBar(len, frameT, frameD, 0, h / 2 - frameT / 2, 0);
    addBar(len, frameT, frameD, 0, -h / 2 + frameT / 2, 0);
    addBar(frameT, h, frameD, -len / 2 + frameT / 2, 0, 0);
    addBar(frameT, h, frameD, len / 2 - frameT / 2, 0, 0);
    // Center mullion if wide
    if (len >= 1.15) addBar(0.045, h - frameT * 2, frameD * 0.85, 0, 0, 0);
    // Interior sill
    addBar(len + 0.04, 0.025, depth + 0.02, 0, -h / 2 - 0.012, 0, frameMat);
    // Glass pane (tagged so GPU path tracer bypasses refractive MIS blocking!)
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(len - frameT * 2, h - frameT * 2), glassMat);
    glass.material.side = THREE.DoubleSide;
    glass.userData.isWindowGlass = true;
    group.add(glass);
    // Subtle dark exterior drip trim
    addBar(len + 0.02, 0.02, 0.04, 0, h / 2 - 0.01, depth / 2 - 0.02, extFrameMat);
    group.position.set(mid, midY, coord);
  } else {
    // Wall runs along Z (West window)
    addBar(frameD, frameT, len, 0, h / 2 - frameT / 2, 0);
    addBar(frameD, frameT, len, 0, -h / 2 + frameT / 2, 0);
    addBar(frameD, h, frameT, 0, 0, -len / 2 + frameT / 2);
    addBar(frameD, h, frameT, 0, 0, len / 2 - frameT / 2);
    if (len >= 1.15) addBar(frameD * 0.85, h - frameT * 2, 0.045, 0, 0, 0);
    addBar(depth + 0.02, 0.025, len + 0.04, 0, -h / 2 - 0.012, 0, frameMat);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(len - frameT * 2, h - frameT * 2), glassMat);
    glass.rotation.y = Math.PI / 2;
    glass.material.side = THREE.DoubleSide;
    glass.userData.isWindowGlass = true;
    group.add(glass);
    group.position.set(coord, midY, mid);
  }
  parent.add(group);
}

/**
 * Helper: interior door frame + slightly ajar white leaf + brushed handle
 */
function addDoorUnit(parent, { axis, coord, s, e, height = 2.04, openAngle = 0.42, swingSign = 1, isEntry = false }) {
  const w = e - s;
  const mid = (s + e) / 2;
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: '#F4F4F1', roughness: 0.55 });
  const leafMat = new THREE.MeshStandardMaterial({
    color: isEntry ? '#E4E0D8' : '#F6F6F3',
    roughness: isEntry ? 0.50 : 0.62
  });
  const handleMat = new THREE.MeshStandardMaterial({ color: '#C5C8CC', roughness: 0.28, metalness: 0.85 });

  // Casing posts & header
  const postW = 0.045, postD = 0.095;
  const leftPost = new THREE.Mesh(new THREE.BoxGeometry(postW, height + 0.04, postD), frameMat);
  leftPost.position.set(-w / 2, (height + 0.04) / 2, 0);
  const rightPost = new THREE.Mesh(new THREE.BoxGeometry(postW, height + 0.04, postD), frameMat);
  rightPost.position.set(w / 2, (height + 0.04) / 2, 0);
  const head = new THREE.Mesh(new THREE.BoxGeometry(w + postW * 2, postW, postD), frameMat);
  head.position.set(0, height + postW / 2, 0);
  group.add(leftPost, rightPost, head);

  // Pivoted door leaf
  const pivot = new THREE.Group();
  pivot.position.set(-w / 2 + 0.02, 0, 0);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, height - 0.01, 0.038), leafMat);
  leaf.position.set((w - 0.04) / 2, (height - 0.01) / 2, 0);
  leaf.castShadow = true;
  leaf.receiveShadow = true;
  pivot.add(leaf);

  // Handles both sides
  const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.055), handleMat);
  h1.position.set(w - 0.12, 1.02, 0.035);
  const h2 = h1.clone();
  h2.position.z = -0.035;
  pivot.add(h1, h2);

  pivot.rotation.y = openAngle * swingSign;
  group.add(pivot);

  if (axis === 'x') {
    group.position.set(mid, 0, coord);
  } else {
    group.rotation.y = Math.PI / 2;
    group.position.set(coord, 0, mid);
  }
  parent.add(group);
}

/**
 * Helper: modern flat white French radiator (at TMA locations)
 */
function addRadiator(parent, { x, z, rotY = 0, w = 0.85, h = 0.65 }) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#F5F5F2', roughness: 0.38, metalness: 0.15 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.07), mat);
  body.position.y = 0.16 + h / 2;
  body.castShadow = true;
  g.add(body);
  // Subtle top grille
  const grille = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, 0.015, 0.065), new THREE.MeshStandardMaterial({ color: '#DCDCD8', roughness: 0.5 }));
  grille.position.y = 0.16 + h + 0.005;
  g.add(grille);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  parent.add(g);
}

/**
 * Builds the entire CASSIOPÉE Ambilly Lot 17 T4 architectural shell + fixed SDB/WC/Entrée elements.
 */
export function buildApartmentShell(scene) {
  const root = new THREE.Group();
  root.name = 'apartment-shell';
  scene.add(root);

  const ceilingGroup = new THREE.Group();
  ceilingGroup.name = 'apartment-ceilings';
  scene.add(ceilingGroup);

  // Per-room Dulux Valentine wall materials (main + accent wall per room!) with subtle plaster normal map
  const wallNormal = getWallPlasterNormalMap(4, 3);
  const paintRoomIds = ['sejour', 'ch3', 'ch1', 'ch2', 'sdb', 'wc', 'entree'];
  const roomPaintMaterials = {};
  for (const rid of paintRoomIds) {
    roomPaintMaterials[rid] = {
      main: new THREE.MeshStandardMaterial({
        color: '#F6F6F3',
        roughness: 0.90,
        metalness: 0.0,
        normalMap: wallNormal,
        normalScale: new THREE.Vector2(0.08, 0.08),
        envMapIntensity: 0.26
      }),
      accent: new THREE.MeshStandardMaterial({
        color: '#F6F6F3',
        roughness: 0.90,
        metalness: 0.0,
        normalMap: wallNormal,
        normalScale: new THREE.Vector2(0.08, 0.08),
        envMapIntensity: 0.26
      })
    };
  }

  // Structural shell material (neutral warm architectural plaster / concrete edge caps)
  const extWallMat = new THREE.MeshStandardMaterial({ color: '#E8E4DC', roughness: 0.88, metalness: 0.0, envMapIntensity: 0.24 });
  const intWallMat = new THREE.MeshStandardMaterial({ color: '#F1EFEA', roughness: 0.90, metalness: 0.0, envMapIntensity: 0.24 });

  /* =====================================================================
   * 1. FLOORS (EXACT SIGNED PRESTATIONS WITH PAIRED NORMAL + ROUGHNESS MAPS!)
   * - Taupe 60x60 Kevin (4880309) in Séjour/Cuisine, SDB, WC, Entrée, DGT
   * - Egger Chêne du Nord Naturel (EL 2970) in Ch1, Ch2, Ch3
   * - Outdoor paving in Loggia
   * ===================================================================== */
  const taupeTex = getTaupeTileTextures(9.5, 9.5);
  const taupeFloorMat = new THREE.MeshStandardMaterial({
    map: taupeTex.map,
    normalMap: taupeTex.normalMap,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughnessMap: taupeTex.roughnessMap,
    roughness: 1.0,
    metalness: 0.01,
    envMapIntensity: 0.42
  });

  const oakCh3Tex = getOakLaminateTextures(4.5, 2.5);
  const oakCh3Mat = new THREE.MeshStandardMaterial({
    map: oakCh3Tex.map,
    normalMap: oakCh3Tex.normalMap,
    normalScale: new THREE.Vector2(0.40, 0.40),
    roughnessMap: oakCh3Tex.roughnessMap,
    roughness: 1.0,
    metalness: 0.0,
    envMapIntensity: 0.36
  });

  const oakCh12Tex = getOakLaminateTextures(2.4, 3.6);
  const oakCh12Mat = new THREE.MeshStandardMaterial({
    map: oakCh12Tex.map,
    normalMap: oakCh12Tex.normalMap,
    normalScale: new THREE.Vector2(0.40, 0.40),
    roughnessMap: oakCh12Tex.roughnessMap,
    roughness: 1.0,
    metalness: 0.0,
    envMapIntensity: 0.36
  });

  const loggiaTex = getLoggiaTileTextures(8, 3.8);
  const loggiaFloorMat = new THREE.MeshStandardMaterial({
    map: loggiaTex.map,
    normalMap: loggiaTex.normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughnessMap: loggiaTex.roughnessMap,
    roughness: 1.0,
    metalness: 0.0
  });

  const addFloorRect = (minX, maxX, minZ, maxZ, mat, y = 0) => {
    const w = maxX - minX, d = maxZ - minZ;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), mat);
    m.position.set((minX + maxX) / 2, y - 0.07, (minZ + maxZ) / 2);
    m.receiveShadow = true;
    root.add(m);
  };

  // Living / Kitchen / Hallway / SDB / WC / Entrée tiled slab
  addFloorRect(0.20, 5.56, 3.06, 8.62, taupeFloorMat);
  addFloorRect(5.50, 11.16, 3.06, 6.76, taupeFloorMat);
  // Chambre 3 (Master Suite) Oak Laminate
  addFloorRect(0.20, 5.76, 0.20, 3.06, oakCh3Mat);
  // Chambre 2 & Chambre 1 Oak Laminate
  addFloorRect(5.52, 8.28, 6.74, 11.02, oakCh12Mat);
  addFloorRect(8.28, 11.16, 6.74, 11.02, oakCh12Mat);
  // Loggia Outdoor Terrace (slightly stepped down 2cm)
  addFloorRect(0.20, 5.34, 8.76, 11.16, loggiaFloorMat, -0.02);

  // Optional clean studio plinth (hidden when R+4 Ambilly building context is active)
  const groundMat = new THREE.MeshStandardMaterial({ color: '#DEDAD2', roughness: 0.95 });
  const groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), groundMat);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.set(5.6, -0.15, 5.6);
  groundPlane.receiveShadow = true;
  groundPlane.visible = false;
  root.add(groundPlane);

  /* =====================================================================
   * 2. EXTERIOR STRUCTURAL WALLS WITH WINDOW & LOGGIA OPENINGS
   * ===================================================================== */
  const westWallGroup = new THREE.Group();
  const southWallGroup = new THREE.Group();
  const eastWallGroup = new THREE.Group();
  const northWallGroup = new THREE.Group();
  root.add(westWallGroup, southWallGroup, eastWallGroup, northWallGroup);

  // West exterior wall (x = 0.00..0.26, center x = 0.13, z = 0.00..11.25)
  const westOpenings = [
    { s: 0.92, e: 2.32, y0: 0.45, y1: 2.15 }, // Chambre 3 window (140/all.45)
    { s: 3.85, e: 5.25, y0: 0.45, y1: 2.15 }, // Séjour North window (140/all.45)
    { s: 6.20, e: 7.60, y0: 0.45, y1: 2.15 }, // Séjour South window (140/all.45)
    { s: 8.82, e: 11.11, y0: 1.05, y1: H }    // Loggia open west side above parapet
  ];
  addWallWithOpenings(westWallGroup, { axis: 'z', fixedCoord: 0.13, start: 0, end: 11.25, thickness: 0.26, openings: westOpenings, material: extWallMat });
  addWindowUnit(westWallGroup, { axis: 'z', coord: 0.13, s: 0.92, e: 2.32, y0: 0.45, y1: 2.15, interiorSign: 1 });
  addWindowUnit(westWallGroup, { axis: 'z', coord: 0.13, s: 3.85, e: 5.25, y0: 0.45, y1: 2.15, interiorSign: 1 });
  addWindowUnit(westWallGroup, { axis: 'z', coord: 0.13, s: 6.20, e: 7.60, y0: 0.45, y1: 2.15, interiorSign: 1 });

  // North exterior wall of Chambre 3 (z = 0.00..0.26, center 0.13, x = 0.00..5.97)
  addWallWithOpenings(northWallGroup, { axis: 'x', fixedCoord: 0.13, start: 0, end: 5.97, thickness: 0.26, material: extWallMat });

  // East exterior wall of Chambre 3 wing (x = 5.71..5.97, center 5.84, z = 0.00..3.12)
  addWallWithOpenings(eastWallGroup, { axis: 'z', fixedCoord: 5.84, start: 0, end: 3.12, thickness: 0.26, material: extWallMat });

  // North exterior wall of SDB / WC / Entrée (z = 2.86..3.12, center 2.99, x = 5.71..11.37)
  addWallWithOpenings(northWallGroup, {
    axis: 'x', fixedCoord: 2.99, start: 5.71, end: 11.37, thickness: 0.26,
    openings: [{ s: 9.72, e: 10.65, y0: 0, y1: 2.04 }], // Entrance door 93/203
    material: extWallMat
  });
  addDoorUnit(northWallGroup, { axis: 'x', coord: 2.99, s: 9.72, e: 10.65, height: 2.04, openAngle: 0.08, swingSign: 1, isEntry: true });

  // East exterior wall of Entrée & Chambre 1 (x = 11.11..11.37, center 11.24, z = 2.86..11.25)
  addWallWithOpenings(eastWallGroup, { axis: 'z', fixedCoord: 11.24, start: 2.86, end: 11.25, thickness: 0.26, material: extWallMat });

  // South exterior wall of Chambre 2 & Chambre 1 (z = 10.98..11.25, center 11.115, x = 5.27..11.37)
  const southBedOpenings = [
    { s: 6.20, e: 7.60, y0: 0.45, y1: 2.15 }, // Chambre 2 window
    { s: 9.01, e: 10.41, y0: 0.45, y1: 2.15 } // Chambre 1 window
  ];
  addWallWithOpenings(southWallGroup, { axis: 'x', fixedCoord: 11.115, start: 5.27, end: 11.37, thickness: 0.27, openings: southBedOpenings, material: extWallMat });
  addWindowUnit(southWallGroup, { axis: 'x', coord: 11.115, s: 6.20, e: 7.60, y0: 0.45, y1: 2.15, interiorSign: -1 });
  addWindowUnit(southWallGroup, { axis: 'x', coord: 11.115, s: 9.01, e: 10.41, y0: 0.45, y1: 2.15, interiorSign: -1 });

  // Glazed wall between Séjour & Loggia (z = 8.56..8.82, center 8.69, x = 0.26..5.56)
  const loggiaWallOpenings = [
    { s: 0.65, e: 1.65, y0: 0.0, y1: 2.15 },  // Porte fenêtre ouvrant 90/VR
    { s: 2.00, e: 4.95, y0: 0.06, y1: 2.15 }  // Large fixed picture window
  ];
  addWallWithOpenings(southWallGroup, { axis: 'x', fixedCoord: 8.69, start: 0.26, end: 5.56, thickness: 0.26, openings: loggiaWallOpenings, material: extWallMat });
  addWindowUnit(southWallGroup, { axis: 'x', coord: 8.69, s: 0.65, e: 1.65, y0: 0.0, y1: 2.15, interiorSign: -1 });
  addWindowUnit(southWallGroup, { axis: 'x', coord: 8.69, s: 2.00, e: 4.95, y0: 0.06, y1: 2.15, interiorSign: -1 });

  // Insulated wall between Loggia & Chambre 2 (x = 5.27..5.56, center 5.415, z = 8.56..11.25)
  addWallWithOpenings(root, { axis: 'z', fixedCoord: 5.415, start: 8.56, end: 11.25, thickness: 0.29, material: extWallMat });

  // Loggia South Parapet (low 1.05m wall + minimalist dark architectural handrail)
  addWallWithOpenings(root, { axis: 'x', fixedCoord: 11.18, start: 0.0, end: 5.27, thickness: 0.14, height: 1.05, material: extWallMat });
  const railMat = new THREE.MeshStandardMaterial({ color: '#3B3D40', roughness: 0.42, metalness: 0.6 });
  const southRail = new THREE.Mesh(new THREE.BoxGeometry(5.28, 0.035, 0.055), railMat);
  southRail.position.set(2.64, 1.07, 11.18);
  root.add(southRail);

  /* =====================================================================
   * 3. INTERIOR PARTITION WALLS (EXACT TMA PLAN!)
   * ===================================================================== */
  // Ch3 / Séjour-Cuisine partition (z = 3.02..3.12, center 3.07, x = 0.26..5.71)
  const ch3DoorOp = [{ s: 0.42, e: 1.25, y0: 0, y1: 2.04 }];
  addWallWithOpenings(root, { axis: 'x', fixedCoord: 3.07, start: 0.26, end: 5.71, thickness: 0.10, openings: ch3DoorOp, material: intWallMat });
  addDoorUnit(root, { axis: 'x', coord: 3.07, s: 0.42, e: 1.25, height: 2.04, openAngle: 0.55, swingSign: -1 });

  // Kitchen / SDB partition (x = 5.49..5.56, center 5.525, z = 3.12..5.48)
  addWallWithOpenings(root, { axis: 'z', fixedCoord: 5.525, start: 3.12, end: 5.48, thickness: 0.07, material: intWallMat });

  // SDB / WC partition (x = 8.28..8.35, center 8.315, z = 3.12..5.48)
  addWallWithOpenings(root, { axis: 'z', fixedCoord: 8.315, start: 3.12, end: 5.48, thickness: 0.07, material: intWallMat });

  // WC north plumbing shaft GT block (x = 8.35..9.17, z = 3.12..3.60)
  const gtWc = new THREE.Mesh(new THREE.BoxGeometry(0.82, H, 0.48), intWallMat);
  gtWc.position.set(8.76, H / 2, 3.36);
  root.add(gtWc);

  // WC / Entrée partition (x = 9.17..9.24, center 9.205, z = 3.12..5.48)
  addWallWithOpenings(root, { axis: 'z', fixedCoord: 9.205, start: 3.12, end: 5.48, thickness: 0.07, material: intWallMat });

  // South wall of SDB & WC facing DGT (z = 5.41..5.48, center 5.445, x = 5.49..9.88)
  const sdbWcDoorOps = [
    { s: 7.36, e: 8.19, y0: 0, y1: 2.04 }, // SDB door 83/203
    { s: 8.40, e: 9.13, y0: 0, y1: 2.04 }  // WC door 73/203
  ];
  addWallWithOpenings(root, { axis: 'x', fixedCoord: 5.445, start: 5.49, end: 9.88, thickness: 0.07, openings: sdbWcDoorOps, material: intWallMat });
  addDoorUnit(root, { axis: 'x', coord: 5.445, s: 7.36, e: 8.19, height: 2.04, openAngle: 0.48, swingSign: -1 });
  addDoorUnit(root, { axis: 'x', coord: 5.445, s: 8.40, e: 9.13, height: 2.04, openAngle: 0.55, swingSign: 1 });

  // North wall of Chambre 2 & Chambre 1 facing DGT (z = 6.71..6.78, center 6.745, x = 5.49..11.11)
  const ch12DoorOps = [
    { s: 7.30, e: 8.13, y0: 0, y1: 2.04 }, // Chambre 2 door 83/203
    { s: 8.40, e: 9.23, y0: 0, y1: 2.04 }  // Chambre 1 door 83/203
  ];
  addWallWithOpenings(root, { axis: 'x', fixedCoord: 6.745, start: 5.49, end: 11.11, thickness: 0.07, openings: ch12DoorOps, material: intWallMat });
  addDoorUnit(root, { axis: 'x', coord: 6.745, s: 7.30, e: 8.13, height: 2.04, openAngle: 0.48, swingSign: 1 });
  addDoorUnit(root, { axis: 'x', coord: 6.745, s: 8.40, e: 9.23, height: 2.04, openAngle: 0.48, swingSign: 1 });

  // Séjour / Chambre 2 TV partition wall (x = 5.49..5.56, center 5.525, z = 6.71..8.56)
  addWallWithOpenings(root, { axis: 'z', fixedCoord: 5.525, start: 6.71, end: 8.56, thickness: 0.07, material: intWallMat });

  // Chambre 2 / Chambre 1 partition wall (x = 8.24..8.31, center 8.275, z = 6.78..10.98)
  addWallWithOpenings(root, { axis: 'z', fixedCoord: 8.275, start: 6.78, end: 10.98, thickness: 0.07, material: intWallMat });

  // Small vertical duct column visible on plan between Ch2 & Ch1 (around z = 8.95)
  const ductCol = new THREE.Mesh(new THREE.BoxGeometry(0.24, H, 0.24), intWallMat);
  ductCol.position.set(8.22, H / 2, 8.98);
  root.add(ductCol);

  /* =====================================================================
   * 4. PER-ROOM PAINTED WALL LININGS (DULUX VALENTINE ENGINE!)
   * Each room has 4 faces + designated Accent Wall (e.g. headboard wall!)
   * ===================================================================== */
  // ---- CHAMBRE 3 (Master Suite): Accent = North headboard wall ----
  addPaintedLining(root, { roomId: 'ch3', side: 'north', isAccent: true,  axis: 'x', faceCoord: 0.26, normalSign:  1, start: 0.26, end: 5.71, materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'ch3', side: 'south', isAccent: false, axis: 'x', faceCoord: 3.02, normalSign: -1, start: 0.26, end: 5.71, openings: ch3DoorOp, materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'ch3', side: 'west',  isAccent: false, axis: 'z', faceCoord: 0.26, normalSign:  1, start: 0.26, end: 3.02, openings: [westOpenings[0]], materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'ch3', side: 'east',  isAccent: false, axis: 'z', faceCoord: 5.71, normalSign: -1, start: 0.26, end: 3.02, materials: roomPaintMaterials });

  // ---- SÉJOUR & CUISINE: Accent = East TV wall backing Ch.2 ----
  addPaintedLining(root, { roomId: 'sejour', side: 'north', isAccent: false, axis: 'x', faceCoord: 3.12, normalSign:  1, start: 0.26, end: 5.49, openings: ch3DoorOp, materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'sejour', side: 'west',  isAccent: false, axis: 'z', faceCoord: 0.26, normalSign:  1, start: 3.12, end: 8.56, openings: [westOpenings[1], westOpenings[2]], materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'sejour', side: 'south', isAccent: false, axis: 'x', faceCoord: 8.56, normalSign: -1, start: 0.26, end: 5.49, openings: loggiaWallOpenings, materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'sejour', side: 'east-kitchen', isAccent: false, axis: 'z', faceCoord: 5.49, normalSign: -1, start: 3.12, end: 5.48, materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'sejour', side: 'east',  isAccent: true,  axis: 'z', faceCoord: 5.49, normalSign: -1, start: 6.71, end: 8.56, materials: roomPaintMaterials });

  // ---- CHAMBRE 1 (South-East): Accent = East headboard wall ----
  addPaintedLining(root, { roomId: 'ch1', side: 'east',  isAccent: true,  axis: 'z', faceCoord: 11.11, normalSign: -1, start: 6.78, end: 10.98, materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'ch1', side: 'west',  isAccent: false, axis: 'z', faceCoord: 8.31,  normalSign:  1, start: 6.78, end: 10.98, materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'ch1', side: 'north', isAccent: false, axis: 'x', faceCoord: 6.78,  normalSign:  1, start: 8.31, end: 11.11, openings: [ch12DoorOps[1]], materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'ch1', side: 'south', isAccent: false, axis: 'x', faceCoord: 10.98, normalSign: -1, start: 8.31, end: 11.11, openings: [southBedOpenings[1]], materials: roomPaintMaterials });

  // ---- CHAMBRE 2 (South-Center): Accent = West headboard wall ----
  addPaintedLining(root, { roomId: 'ch2', side: 'west',  isAccent: true,  axis: 'z', faceCoord: 5.56,  normalSign:  1, start: 6.78, end: 10.98, materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'ch2', side: 'east',  isAccent: false, axis: 'z', faceCoord: 8.24,  normalSign: -1, start: 6.78, end: 10.98, materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'ch2', side: 'north', isAccent: false, axis: 'x', faceCoord: 6.78,  normalSign:  1, start: 5.56, end: 8.24, openings: [ch12DoorOps[0]], materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'ch2', side: 'south', isAccent: false, axis: 'x', faceCoord: 10.98, normalSign: -1, start: 5.56, end: 8.24, openings: [southBedOpenings[0]], materials: roomPaintMaterials });

  // ---- WC (Toilets): Accent = North behind toilet, plus full room paintable! ----
  addPaintedLining(root, { roomId: 'wc', side: 'north', isAccent: true,  axis: 'x', faceCoord: 3.60, normalSign:  1, start: 8.35, end: 9.17, materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'wc', side: 'west',  isAccent: false, axis: 'z', faceCoord: 8.35, normalSign:  1, start: 3.60, end: 5.41, materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'wc', side: 'east',  isAccent: false, axis: 'z', faceCoord: 9.17, normalSign: -1, start: 3.60, end: 5.41, materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'wc', side: 'south', isAccent: false, axis: 'x', faceCoord: 5.41, normalSign: -1, start: 8.35, end: 9.17, openings: [sdbWcDoorOps[1]], materials: roomPaintMaterials });

  // ---- SDB (non-tiled walls) ----
  addPaintedLining(root, { roomId: 'sdb', side: 'west',  isAccent: false, axis: 'z', faceCoord: 5.56, normalSign:  1, start: 3.92, end: 5.41, materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'sdb', side: 'east',  isAccent: false, axis: 'z', faceCoord: 8.28, normalSign: -1, start: 3.92, end: 5.41, materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'sdb', side: 'south', isAccent: true,  axis: 'x', faceCoord: 5.41, normalSign: -1, start: 5.56, end: 8.28, openings: [sdbWcDoorOps[0]], materials: roomPaintMaterials });

  // ---- ENTRÉE & DÉGAGEMENT ----
  addPaintedLining(root, { roomId: 'entree', side: 'east',  isAccent: true,  axis: 'z', faceCoord: 11.11, normalSign: -1, start: 3.12, end: 6.71, materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'entree', side: 'north-ent', isAccent: false, axis: 'x', faceCoord: 3.12, normalSign: 1, start: 9.24, end: 11.11, openings: [{ s: 9.72, e: 10.65, y0: 0, y1: 2.04 }], materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'entree', side: 'north-dgt', isAccent: false, axis: 'x', faceCoord: 5.48, normalSign: 1, start: 5.49, end: 9.88, openings: sdbWcDoorOps, materials: roomPaintMaterials });
  addPaintedLining(root, { roomId: 'entree', side: 'south-dgt', isAccent: false, axis: 'x', faceCoord: 6.71, normalSign: -1, start: 5.49, end: 11.11, openings: ch12DoorOps, materials: roomPaintMaterials });

  /* =====================================================================
   * 5. SIGNED SALLE DE BAINS (SDB): BATHTUB + KEVIN TAUPE & DECOR CHAUD MAT
   * ===================================================================== */
  buildBathroomFixed(root);

  /* =====================================================================
   * 6. WC + TMA #21 LAVE-MAINS + ENTRÉE PLACARD/ETEL + RADIATORS
   * ===================================================================== */
  buildWcFixed(root);
  buildEntreeCloset(root);

  // Radiators at exact TMA positions
  addRadiator(root, { x: 5.45, z: 6.12, rotY: -Math.PI / 2, w: 0.72, h: 0.75 }); // TMA #11 Séjour
  addRadiator(root, { x: 8.19, z: 8.25, rotY: -Math.PI / 2, w: 0.80, h: 0.65 }); // TMA #15 Ch2 east
  addRadiator(root, { x: 8.36, z: 8.25, rotY:  Math.PI / 2, w: 0.80, h: 0.65 }); // TMA #17 Ch1 west
  addRadiator(root, { x: 1.78, z: 2.97, rotY:  Math.PI,     w: 0.90, h: 0.62 }); // Ch3 south

  // Minimalist Scandinavian Framed Art in Séjour & Entrée
  addFramedArt(root, { x: 11.09, y: 1.50, z: 4.95, rotY: -Math.PI / 2, w: 0.65, h: 0.85, variant: 1 });
  addFramedArt(root, { x: 3.15,  y: 1.54, z: 3.14, rotY: 0,            w: 0.56, h: 0.72, variant: 0 });

  /* =====================================================================
   * 6B. ARCHITECTURAL BASEBOARDS (PLINTHES 7 cm) & SHEER LINEN CURTAINS
   * ===================================================================== */
  buildBaseboards(root);
  const curtainGroup = buildSheerCurtains(scene);

  /* =====================================================================
   * 7. CEILINGS (Toggleable for Cutaway vs Eye-Level / Ray-Tracing!)
   * ===================================================================== */
  const ceilMat = new THREE.MeshStandardMaterial({ color: '#FAFAFA', roughness: 0.94, side: THREE.DoubleSide });
  const addCeil = (minX, maxX, minZ, maxZ) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX, maxZ - minZ), ceilMat);
    m.rotation.x = Math.PI / 2;
    m.position.set((minX + maxX) / 2, H, (minZ + maxZ) / 2);
    ceilingGroup.add(m);
  };
  addCeil(0.24, 5.73, 0.24, 3.08);   // Chambre 3
  addCeil(0.24, 5.54, 3.08, 8.60);   // Séjour & Cuisine
  addCeil(5.52, 11.13, 3.08, 11.00); // SDB, WC, Entrée, DGT, Ch1, Ch2
  ceilingGroup.visible = false;      // Starts in Cutaway mode for great apartment overview!

  return {
    root,
    ceilingGroup,
    curtainGroup,
    exteriorWallGroups: { west: westWallGroup, south: southWallGroup, east: eastWallGroup, north: northWallGroup },
    roomPaintMaterials,
    studioGroundPlane: groundPlane
  };
}

function buildBaseboards(parent) {
  const g = new THREE.Group();
  g.name = 'architectural-baseboards';
  const oakTex = getWoodPbrTextures('oak', 2, 0.5);
  const oakPlinth = new THREE.MeshStandardMaterial({
    map: oakTex.map, normalMap: oakTex.normalMap, normalScale: new THREE.Vector2(0.3, 0.3), roughness: 0.58
  });
  const tilePlinth = new THREE.MeshStandardMaterial({ color: '#A59D93', roughness: 0.65 });
  const ph = 0.072;
  const pt = 0.012;

  const addRun = (axis, fixed, s, e, sign, mat) => {
    const len = e - s;
    if (len < 0.05) return;
    const geo = axis === 'x' ? new THREE.BoxGeometry(len, ph, pt) : new THREE.BoxGeometry(pt, ph, len);
    const m = new THREE.Mesh(geo, mat);
    if (axis === 'x') m.position.set((s + e) / 2, ph / 2, fixed + sign * (pt / 2 + 0.003));
    else m.position.set(fixed + sign * (pt / 2 + 0.003), ph / 2, (s + e) / 2);
    m.receiveShadow = true;
    g.add(m);
  };

  // Chambre 3 Oak Baseboards
  addRun('x', 0.26, 0.26, 5.71,  1, oakPlinth);
  addRun('x', 3.02, 1.27, 5.71, -1, oakPlinth);
  addRun('z', 0.26, 0.26, 3.02,  1, oakPlinth);
  addRun('z', 5.71, 0.26, 3.02, -1, oakPlinth);

  // Séjour Taupe Tile Baseboards (skipping kitchen cabinetry & French door opening)
  addRun('z', 0.26, 3.12, 8.56,  1, tilePlinth);
  addRun('z', 5.49, 6.71, 8.56, -1, tilePlinth);
  addRun('x', 3.12, 1.27, 1.94,  1, tilePlinth);

  // Chambre 1 & 2 Oak Baseboards
  addRun('z', 11.11, 6.78, 10.98, -1, oakPlinth);
  addRun('z', 8.31,  6.78, 10.98,  1, oakPlinth);
  addRun('x', 10.98, 8.31, 11.11, -1, oakPlinth);
  addRun('z', 5.56,  6.78, 10.98,  1, oakPlinth);
  addRun('z', 8.24,  6.78, 10.98, -1, oakPlinth);
  addRun('x', 10.98, 5.56, 8.24,  -1, oakPlinth);

  // Entrée / DGT Baseboards
  addRun('z', 11.11, 3.12, 6.71, -1, tilePlinth);
  addRun('x', 6.71, 5.56, 7.28, -1, tilePlinth);
  addRun('x', 6.71, 9.25, 11.11, -1, tilePlinth);

  parent.add(g);
}

function buildSheerCurtains(scene) {
  const g = new THREE.Group();
  g.name = 'sheer-curtains';
  const railMat = new THREE.MeshStandardMaterial({ color: '#26272A', roughness: 0.35, metalness: 0.72 });
  const sheerMat = new THREE.MeshStandardMaterial({
    color: '#F5F1E9',
    roughness: 0.94,
    metalness: 0.0,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide
  });

  const addCurtainSet = ({ axis, wallCoord, inwardSign, s, e }) => {
    const len = e - s;
    const mid = (s + e) / 2;
    const railY = 2.42;
    const cH = 2.38;
    const offset = wallCoord + inwardSign * 0.14;

    // Slender matte black architectural curtain rail
    const railGeo = axis === 'x'
      ? new THREE.CylinderGeometry(0.008, 0.008, len + 0.32, 10)
      : new THREE.CylinderGeometry(0.008, 0.008, len + 0.32, 10);
    const rail = new THREE.Mesh(railGeo, railMat);
    if (axis === 'x') {
      rail.rotation.z = Math.PI / 2;
      rail.position.set(mid, railY, offset);
    } else {
      rail.rotation.x = Math.PI / 2;
      rail.position.set(offset, railY, mid);
    }
    g.add(rail);

    // Soft pleated side panels framing each window without blocking sunlight!
    const panelW = Math.min(0.42, len * 0.22);
    for (const side of [-1, 1]) {
      const center = mid + side * (len / 2 + 0.02);
      const folds = 4;
      for (let i = 0; i < folds; i++) {
        const fOff = (i - (folds - 1) / 2) * (panelW / folds);
        const foldGeo = new THREE.CylinderGeometry(0.028, 0.036, cH, 8, 1, true);
        const fold = new THREE.Mesh(foldGeo, sheerMat);
        fold.castShadow = false;
        fold.receiveShadow = true;
        if (axis === 'x') {
          fold.position.set(center + fOff, cH / 2 + 0.02, offset + (i % 2 === 0 ? 0.015 : -0.015));
        } else {
          fold.position.set(offset + (i % 2 === 0 ? 0.015 : -0.015), cH / 2 + 0.02, center + fOff);
        }
        g.add(fold);
      }
    }
  };

  // Séjour Loggia large glazing + West windows + Bedroom windows
  addCurtainSet({ axis: 'x', wallCoord: 8.56,  inwardSign: -1, s: 0.62, e: 4.98 });
  addCurtainSet({ axis: 'z', wallCoord: 0.26,  inwardSign:  1, s: 6.18, e: 7.62 });
  addCurtainSet({ axis: 'z', wallCoord: 0.26,  inwardSign:  1, s: 0.90, e: 2.34 });
  addCurtainSet({ axis: 'x', wallCoord: 10.98, inwardSign: -1, s: 6.18, e: 7.62 });
  addCurtainSet({ axis: 'x', wallCoord: 10.98, inwardSign: -1, s: 9.00, e: 10.42 });

  scene.add(g);
  return g;
}

function addFramedArt(parent, { x, y, z, rotY, w, h, variant }) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, 0.022),
    new THREE.MeshStandardMaterial({ color: '#A9845B', roughness: 0.58 })
  );
  const art = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.06, h - 0.06),
    new THREE.MeshStandardMaterial({ map: getArtworkTexture(variant), roughness: 0.88 })
  );
  art.position.z = 0.013;
  g.add(frame, art);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  parent.add(g);
}

/**
 * Signed SDB Prestations:
 * - Bathtub along north wall (x=5.92..7.66, z=3.13..3.88)
 * - Side walls + tub apron: Faïence KEVIN TAUPE 25x40 (Réf. 4880347) full height
 * - Central back wall of tub: Faïence KEVIN DECOR CHAUD MAT 25x40 (Réf. 4880348) full height
 * - Meuble Vasque Blanc + mirror + LL washing machine + towel rail
 */
function buildBathroomFixed(parent) {
  const g = new THREE.Group();
  const ceramicMat = new THREE.MeshStandardMaterial({ color: '#F9F9F7', roughness: 0.12, metalness: 0.02 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#D4D8DC', roughness: 0.14, metalness: 0.94 });
  const ktTex = getBathroomTileTextures('taupe', 3, 6);
  const kdTex = getBathroomTileTextures('decor', 4.5, 6);
  const kevinTaupeMat = new THREE.MeshStandardMaterial({
    map: ktTex.map, normalMap: ktTex.normalMap, normalScale: new THREE.Vector2(0.45, 0.45), roughnessMap: ktTex.roughnessMap, roughness: 1.0
  });
  const kevinDecorMat = new THREE.MeshStandardMaterial({
    map: kdTex.map, normalMap: kdTex.normalMap, normalScale: new THREE.Vector2(0.60, 0.60), roughnessMap: kdTex.roughnessMap, roughness: 1.0
  });

  // Full-height bathtub surround tiles (north wall + two side walls)
  const backDecor = new THREE.Mesh(new THREE.BoxGeometry(2.70, H, 0.012), kevinDecorMat);
  backDecor.position.set(6.92, H / 2, 3.13);
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.012, H, 0.80), kevinTaupeMat);
  sideL.position.set(5.57, H / 2, 3.52);
  const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.012, H, 0.80), kevinTaupeMat);
  sideR.position.set(8.27, H / 2, 3.52);
  g.add(backDecor, sideL, sideR);

  // Bathtub body + Kevin Taupe tiled apron (tablier)
  const tubLen = 1.72, tubD = 0.74, tubH = 0.54;
  const tubX = 7.40;
  const apron = new THREE.Mesh(new THREE.BoxGeometry(tubLen, tubH, 0.04), kevinTaupeMat);
  apron.position.set(tubX, tubH / 2, 3.14 + tubD);
  const tubRim = new THREE.Mesh(new THREE.BoxGeometry(tubLen, 0.05, tubD), ceramicMat);
  tubRim.position.set(tubX, tubH, 3.14 + tubD / 2);
  const tubBasin = new THREE.Mesh(new THREE.BoxGeometry(tubLen - 0.14, tubH - 0.08, tubD - 0.14), new THREE.MeshStandardMaterial({ color: '#EAECEB', roughness: 0.16 }));
  tubBasin.position.set(tubX, tubH / 2 + 0.02, 3.14 + tubD / 2);
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 1.40, 0.75),
    new THREE.MeshPhysicalMaterial({ color: '#E2F2F8', roughness: 0.04, transmission: 0.85, ior: 1.5, transparent: true, opacity: 0.25 })
  );
  screen.position.set(tubX - tubLen / 2 + 0.02, tubH + 0.70, 3.14 + tubD / 2);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.35, 10), chromeMat);
  rod.position.set(tubX + tubLen / 2 - 0.08, 1.45, 3.14 + tubD / 2);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.02, 16), chromeMat);
  head.position.set(tubX + tubLen / 2 - 0.24, 2.08, 3.14 + tubD / 2);
  g.add(apron, tubRim, tubBasin, screen, rod, head);

  // White Vanity Unit (Meuble Vasque Blanc) on west wall of SDB
  const vanMat = new THREE.MeshStandardMaterial({ color: '#F5F5F2', roughness: 0.35 });
  const vanBody = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.90), vanMat);
  vanBody.position.set(5.80, 0.56, 4.35);
  vanBody.castShadow = true;
  const basinTop = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.045, 0.92), ceramicMat);
  basinTop.position.set(5.80, 0.86, 4.35);
  const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.14, 10), chromeMat);
  tap.position.set(5.65, 0.94, 4.35);
  const mirror = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.80, 0.86),
    new THREE.MeshStandardMaterial({ color: '#F0F4F6', roughness: 0.015, metalness: 1.0, envMapIntensity: 1.2 })
  );
  mirror.position.set(5.58, 1.48, 4.35);
  const mirLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.03, 0.60),
    new THREE.MeshStandardMaterial({ color: '#FFF8EB', emissive: '#FFE4B5', emissiveIntensity: 1.25 })
  );
  mirLight.position.set(5.60, 1.92, 4.35);
  g.add(vanBody, basinTop, tap, mirror, mirLight);

  // Washing Machine (LL) in SW corner of SDB
  const wm = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.85, 0.60), vanMat);
  wm.position.set(5.88, 0.425, 5.10);
  wm.castShadow = true;
  const wmDoor = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 20), new THREE.MeshStandardMaterial({ color: '#2B2D30', roughness: 0.22, metalness: 0.55 }));
  wmDoor.rotation.z = Math.PI / 2;
  wmDoor.position.set(6.19, 0.45, 5.10);
  g.add(wm, wmDoor);

  // Heated Towel Rail on East wall of SDB
  const towelRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.25, 0.52), vanMat);
  towelRail.position.set(8.24, 1.32, 4.55);
  g.add(towelRail);

  parent.add(g);
}

/**
 * WC (82 x 181 cm): Suspended/floor toilet + TMA #21 Lave-mains + Mirror!
 */
function buildWcFixed(parent) {
  const g = new THREE.Group();
  const ceramic = new THREE.MeshStandardMaterial({ color: '#FAF9F6', roughness: 0.12 });
  const oakTex = getWoodPbrTextures('oak', 1, 1);
  const woodOak = new THREE.MeshStandardMaterial({ map: oakTex.map, normalMap: oakTex.normalMap, roughnessMap: oakTex.roughnessMap, roughness: 1.0 });
  const blackMat = new THREE.MeshStandardMaterial({ color: '#1E1F22', roughness: 0.35, metalness: 0.65 });

  // Toilet bowl & cistern against north GT wall (z = 3.60)
  const cistern = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.16), ceramic);
  cistern.position.set(8.76, 0.64, 3.70);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.40, 16), ceramic);
  base.position.set(8.76, 0.20, 3.92);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.10, 18), ceramic);
  bowl.scale.set(1, 1, 1.25);
  bowl.position.set(8.76, 0.41, 3.96);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.025, 18), ceramic);
  lid.scale.set(1, 1, 1.22);
  lid.position.set(8.76, 0.47, 3.96);
  g.add(cistern, base, bowl, lid);

  // TMA #21 Future Lave-Mains (compact hand-wash basin on east wall of WC!)
  const lmCab = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.48, 0.42), woodOak);
  lmCab.position.set(9.05, 0.62, 4.68);
  const lmBasin = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.06, 0.44), ceramic);
  lmBasin.position.set(9.05, 0.89, 4.68);
  const lmTap = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.11, 10), blackMat);
  lmTap.position.set(9.11, 0.96, 4.60);
  const lmMirror = new THREE.Mesh(
    new THREE.CylinderGeometry(0.21, 0.21, 0.015, 24),
    new THREE.MeshStandardMaterial({ color: '#F0F4F6', roughness: 0.015, metalness: 1.0, envMapIntensity: 1.2 })
  );
  lmMirror.rotation.z = Math.PI / 2;
  lmMirror.position.set(9.15, 1.42, 4.68);
  g.add(lmCab, lmBasin, lmTap, lmMirror);

  parent.add(g);
}

/**
 * Entrée Built-in Closet & ETEL electrical cabinet (west side of Entrée)
 */
function buildEntreeCloset(parent) {
  const g = new THREE.Group();
  const whiteDoor = new THREE.MeshStandardMaterial({ color: '#F3F2EE', roughness: 0.55 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#D4D0C8', roughness: 0.6 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.60, H - 0.04, 2.24), whiteDoor);
  body.position.set(9.54, (H - 0.04) / 2, 4.26);
  body.castShadow = true;
  body.receiveShadow = true;
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.015, H - 0.08, 0.012), trimMat);
  seam.position.set(9.845, (H - 0.04) / 2, 4.26);
  g.add(body, seam);
  parent.add(g);
}
