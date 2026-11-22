import * as THREE from 'three';
import {
  IKEA_BEDS,
  IKEA_SOFAS,
  MOBILIFIVER_TABLES,
  TMA_LIGHT_POINTS
} from '../catalogs/furniture.js';
import { WOOD_FINISHES, SOFA_FABRICS } from '../catalogs/materials.js';
import { getWoodTexture, getFabricTexture } from './textures.js';
import { buildRichComponentMesh, buildGlbItemMesh } from './richComponent3d.js';

/* =========================================================================
 * 3D FURNITURE, LIGHT FIXTURES & PARAMETRIC PROMPT-TO-3D BUILDERS
 * Every movable furniture mesh returns a Group with local origin on floor (y=0)
 * and userData.footprint = { w, d } for live wall-clearance HUD & selection!
 * ========================================================================= */

function makeWoodMat(finishKey = 'walnut', repX = 1, repY = 1) {
  const wf = WOOD_FINISHES[finishKey] || WOOD_FINISHES.walnut;
  const isSolid = finishKey === 'white';
  return new THREE.MeshStandardMaterial({
    map: isSolid ? null : getWoodTexture(finishKey, repX, repY),
    color: isSolid ? wf.hex : '#FFFFFF',
    roughness: wf.roughness,
    metalness: 0.0,
    envMapIntensity: 0.30
  });
}

function makeFabricMat(hex = '#DDD4C6', roughness = 0.90, rep = 3) {
  return new THREE.MeshStandardMaterial({
    map: getFabricTexture(hex, rep, rep),
    color: '#FFFFFF',
    roughness,
    metalness: 0.0,
    envMapIntensity: 0.18
  });
}

function addBox(parent, w, h, d, mat, x = 0, y = 0, z = 0, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/* =========================================================================
 * 1. IKEA 160x200 QUEEN SIZE BEDS BUILDER (12 MODELS)
 * Orientation: headboard at -Z, foot at +Z, width along X.
 * ========================================================================= */
export function buildIkeaBed(item) {
  const def = IKEA_BEDS.find(b => b.id === item.modelId) || IKEA_BEDS[0];
  const finObj = def.finishes.find(f => f.id === item.finish) || def.finishes[0];
  const g = new THREE.Group();

  const W = def.outerW;
  const L = def.outerL;
  const fh = def.frameH;
  const hbH = def.headboardH;
  const matW = 1.60, matL = 2.00, matH = 0.23;

  const isUpholstered = ['curved-upholstered', 'tufted-upholstered', 'slim-upholstered', 'soft-rounded'].includes(def.style);
  const isMetal = def.style === 'metal-spindle';
  const frameMat = isUpholstered
    ? makeFabricMat(finObj.hex, 0.90, 4)
    : isMetal
      ? new THREE.MeshStandardMaterial({ color: finObj.hex, roughness: 0.36, metalness: 0.65 })
      : (finObj.id === 'oak' || finObj.id === 'birch' || finObj.id === 'walnut' || finObj.id === 'brown')
        ? makeWoodMat(finObj.id === 'brown' ? 'walnut' : finObj.id, 2, 1)
        : new THREE.MeshStandardMaterial({ color: finObj.hex, roughness: 0.62 });

  const darkLegMat = new THREE.MeshStandardMaterial({ color: '#2B2622', roughness: 0.48 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#C8A156', roughness: 0.28, metalness: 0.85 });

  // ---- Bed Frame Base ----
  const baseElevation = (def.style === 'modular-drawers' || def.style === 'shelf-headboard' || def.style === 'architectural-plinth') ? 0.04 : 0.14;
  const railH = fh - baseElevation;
  addBox(g, W, railH, L - 0.06, frameMat, 0, baseElevation + railH / 2, 0.03);

  // Corner legs (if elevated)
  if (baseElevation >= 0.10) {
    const legMat = (def.style === 'birch-pillows' || def.style === 'classic-posts') ? frameMat : darkLegMat;
    [[-W / 2 + 0.06, -L / 2 + 0.08], [W / 2 - 0.06, -L / 2 + 0.08], [-W / 2 + 0.06, L / 2 - 0.08], [W / 2 - 0.06, L / 2 - 0.08]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.018, baseElevation + 0.04, 10), legMat);
      leg.position.set(lx, baseElevation / 2, lz);
      leg.castShadow = true;
      g.add(leg);
    });
  } else {
    // Under-bed storage drawer seams for NORDLI / BRIMNES / TONSTAD
    const seamMat = new THREE.MeshStandardMaterial({ color: '#78726A', roughness: 0.9 });
    for (const side of [-1, 1]) {
      for (const dz of [-0.55, 0.05, 0.65]) {
        addBox(g, 0.008, railH * 0.78, 0.56, seamMat, side * (W / 2 + 0.002), baseElevation + railH / 2, dz, false);
      }
    }
  }

  // ---- Signature Headboard per IKEA Model ----
  const hbZ = -L / 2 + 0.04;
  if (def.style === 'curved-upholstered') {
    // TUFJORD wrap-around curved wing headboard!
    addBox(g, W, hbH - 0.12, 0.11, frameMat, 0, 0.12 + (hbH - 0.12) / 2, hbZ);
    // Left & right angled curved wings
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.11, hbH - 0.14, 0.36), frameMat);
      wing.position.set(s * (W / 2 - 0.03), 0.12 + (hbH - 0.14) / 2, hbZ + 0.16);
      wing.rotation.y = -s * 0.22;
      wing.castShadow = true;
      g.add(wing);
    }
  } else if (def.style === 'tufted-upholstered') {
    // IDANÄS tall button-tufted headboard
    addBox(g, W, hbH - 0.12, 0.12, frameMat, 0, 0.12 + (hbH - 0.12) / 2, hbZ);
    const btnMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(finObj.hex).multiplyScalar(0.75), roughness: 0.9 });
    for (let row = 0; row < 2; row++) {
      for (let col = -2; col <= 2; col++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), btnMat);
        b.position.set(col * 0.30, 0.68 + row * 0.26, hbZ + 0.062);
        g.add(b);
      }
    }
  } else if (def.style === 'birch-pillows') {
    // BJÖRKSNÄS solid birch headboard + twin hanging linen pillows with leather straps
    addBox(g, W, hbH - 0.14, 0.05, frameMat, 0, 0.14 + (hbH - 0.14) / 2, hbZ);
    const pilMat = makeFabricMat('#E8E1D5', 0.92, 2);
    const strapMat = new THREE.MeshStandardMaterial({ color: '#7D4E2D', roughness: 0.55 });
    for (const s of [-0.42, 0.42]) {
      addBox(g, 0.72, 0.38, 0.10, pilMat, s, 0.80, hbZ + 0.075);
      // Two cognac leather hanging straps per cushion
      addBox(g, 0.03, 0.16, 0.08, strapMat, s - 0.22, 1.02, hbZ + 0.03);
      addBox(g, 0.03, 0.16, 0.08, strapMat, s + 0.22, 1.02, hbZ + 0.03);
    }
  } else if (def.style === 'shelf-headboard') {
    // BRIMNES deep storage headboard with side shelving niches
    addBox(g, W, hbH, 0.28, frameMat, 0, hbH / 2, -L / 2 + 0.14);
    const nicheDark = new THREE.MeshStandardMaterial({ color: '#CFCBC2', roughness: 0.88 });
    for (const s of [-1, 1]) {
      addBox(g, 0.02, 0.72, 0.22, nicheDark, s * (W / 2 + 0.002), 0.65, -L / 2 + 0.14, false);
    }
  } else if (def.style === 'classic-posts') {
    // HEMNES corner posts + paneled headboard + low footboard
    addBox(g, W - 0.08, hbH - 0.18, 0.05, frameMat, 0, 0.18 + (hbH - 0.18) / 2, hbZ);
    addBox(g, W - 0.08, 0.42, 0.05, frameMat, 0, 0.36, L / 2 - 0.03);
    for (const s of [-1, 1]) {
      addBox(g, 0.065, hbH + 0.04, 0.065, frameMat, s * (W / 2 - 0.03), (hbH + 0.04) / 2, hbZ);
      addBox(g, 0.065, 0.64, 0.065, frameMat, s * (W / 2 - 0.03), 0.32, L / 2 - 0.03);
    }
  } else if (def.style === 'metal-spindle') {
    // SAGSTUA classic black/white metal spindle bed with brass ball finials
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, hbH, 10), frameMat);
      post.position.set(s * (W / 2 - 0.03), hbH / 2, hbZ);
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 12), brassMat);
      finial.position.set(s * (W / 2 - 0.03), hbH + 0.02, hbZ);
      g.add(post, finial);
    }
    addBox(g, W - 0.06, 0.028, 0.028, frameMat, 0, hbH - 0.04, hbZ);
    addBox(g, W - 0.06, 0.024, 0.024, frameMat, 0, 0.56, hbZ);
    for (let i = -5; i <= 5; i++) {
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, hbH - 0.60, 8), frameMat);
      sp.position.set(i * 0.14, 0.56 + (hbH - 0.60) / 2, hbZ);
      g.add(sp);
    }
  } else {
    // Clean modern solid headboard (MALM, TONSTAD, NORDLI, SLATTUM, GLADSTAD, SONGESAND)
    const hbThick = isUpholstered ? 0.10 : 0.06;
    addBox(g, W, hbH - 0.06, hbThick, frameMat, 0, 0.06 + (hbH - 0.06) / 2, hbZ);
  }

  // ---- 160x200 Mattress, Crisp Duvet, Layered Pillows & Woven Throw ----
  const matY = fh + matH / 2 - 0.06;
  const sheetMat = makeFabricMat('#F4F2ED', 0.90, 3);
  const duvetMat = makeFabricMat('#EDE8DF', 0.92, 4);
  const throwMat = makeFabricMat('#C4B5A3', 0.95, 5);
  const pillowMat = makeFabricMat('#FAF8F5', 0.90, 2);

  // Mattress
  addBox(g, matW, matH, matL, sheetMat, 0, matY, 0.02);
  // Plush Duvet covering lower 72% of bed
  addBox(g, matW + 0.06, 0.10, matL * 0.72, duvetMat, 0, matY + matH / 2 + 0.02, 0.28);
  // Folded Linen Throw across the foot
  addBox(g, matW + 0.08, 0.045, 0.50, throwMat, 0, matY + matH / 2 + 0.06, 0.70);

  // 4 Layered Pillows against headboard
  const pilY = matY + matH / 2 + 0.08;
  for (const px of [-0.40, 0.40]) {
    const pBack = addBox(g, 0.68, 0.16, 0.36, pillowMat, px, pilY, -0.66);
    pBack.rotation.x = 0.28;
    const pFront = addBox(g, 0.56, 0.14, 0.28, throwMat, px, pilY - 0.01, -0.44);
    pFront.rotation.x = 0.36;
  }

  g.userData.footprint = { w: W, d: L };
  return g;
}

/* =========================================================================
 * 2. IKEA LIVING ROOM SOFAS BUILDER (8 MODELS, REVERSIBLE CHAISE)
 * Orientation: Backrest at -Z, front facing +Z, width along X.
 * ========================================================================= */
export function buildIkeaSofa(item) {
  const def = IKEA_SOFAS.find(s => s.id === item.modelId) || IKEA_SOFAS[0];
  const fabObj = SOFA_FABRICS.find(f => f.id === item.fabric) || SOFA_FABRICS[0];
  const chaise = def.supportsChaise ? (item.chaise ?? def.defaultChaise) : 'none';
  const g = new THREE.Group();

  const W = def.w;
  const D = def.d;
  const seatH = def.seatH;
  const H = def.h;

  const fabMat = makeFabricMat(fabObj.hex, fabObj.roughness, 5);
  const accentPillowMat = makeFabricMat(
    fabObj.id === 'beige-lin' ? '#A88D73' : '#E7E0D4',
    0.92,
    3
  );
  const legMat = (def.style === 'midcentury-tufted' || def.style === 'luxe-oak-base')
    ? makeWoodMat('oak', 1, 1)
    : new THREE.MeshStandardMaterial({ color: '#242528', roughness: 0.35, metalness: 0.72 });

  const armW = def.style === 'wide-arm' ? 0.24 : def.style === 'slim-architectural' ? 0.08 : def.style === 'low-modular' ? 0.12 : 0.15;
  const legH = def.style === 'low-modular' || def.style === 'slim-architectural' || def.style === 'midcentury-tufted' ? 0.15 : 0.06;
  const baseThick = seatH - legH - 0.14;

  // Main sofa chassis
  addBox(g, W, baseThick, D, fabMat, 0, legH + baseThick / 2, 0);

  // Backrest frame
  addBox(g, W, H - legH - 0.06, 0.18, fabMat, 0, legH + (H - legH - 0.06) / 2, -D / 2 + 0.09);

  // Armrests (Left & Right)
  const armH = def.style === 'wide-arm' ? 0.54 : def.style === 'low-modular' ? 0.56 : 0.62;
  addBox(g, armW, armH - legH, D - 0.04, fabMat, -W / 2 + armW / 2, legH + (armH - legH) / 2, 0.02);
  addBox(g, armW, armH - legH, D - 0.04, fabMat, W / 2 - armW / 2, legH + (armH - legH) / 2, 0.02);

  // Seat & Back Cushions (3 modular cushions across width)
  const innerW = W - armW * 2 - 0.04;
  const segCount = W >= 2.35 ? 3 : 2;
  const segW = innerW / segCount;
  for (let i = 0; i < segCount; i++) {
    const cx = -innerW / 2 + segW * (i + 0.5);
    const isChaiseSeg = (chaise === 'left' && i === 0) || (chaise === 'right' && i === segCount - 1);
    const cDepth = isChaiseSeg ? (def.chaiseD - 0.16) : (D - 0.18);
    const cZ = isChaiseSeg ? ((def.chaiseD - D) / 2 + 0.04) : 0.07;

    if (isChaiseSeg) {
      // Extended chaise deck
      addBox(g, segW + 0.04, baseThick, def.chaiseD - D, fabMat, cx, legH + baseThick / 2, D / 2 + (def.chaiseD - D) / 2);
    }

    // Seat cushion
    addBox(g, segW - 0.025, 0.15, cDepth, fabMat, cx, seatH - 0.075, cZ);

    // Back cushion (tilted comfortably)
    const backC = addBox(g, segW - 0.04, H - seatH + 0.08, 0.18, fabMat, cx, seatH + (H - seatH) / 2, -D / 2 + 0.25);
    backC.rotation.x = -0.16;
  }

  // Decorative Throw Pillows
  const p1 = addBox(g, 0.42, 0.40, 0.14, accentPillowMat, -innerW / 2 + 0.24, seatH + 0.18, -D / 2 + 0.36);
  p1.rotation.set(-0.22, 0.25, 0.08);
  const p2 = addBox(g, 0.42, 0.40, 0.14, accentPillowMat, innerW / 2 - 0.24, seatH + 0.18, -D / 2 + 0.36);
  p2.rotation.set(-0.22, -0.25, -0.08);

  // Legs
  const legPositions = [
    [-W / 2 + 0.10, -D / 2 + 0.10],
    [ W / 2 - 0.10, -D / 2 + 0.10],
    [-W / 2 + 0.10,  D / 2 - 0.10],
    [ W / 2 - 0.10,  D / 2 - 0.10]
  ];
  if (chaise === 'left') legPositions.push([-W / 2 + 0.12, def.chaiseD - D / 2 - 0.10]);
  if (chaise === 'right') legPositions.push([W / 2 - 0.12, def.chaiseD - D / 2 - 0.10]);

  for (const [lx, lz] of legPositions) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.013, legH, 10), legMat);
    leg.position.set(lx, legH / 2, lz);
    g.add(leg);
  }

  const effD = chaise === 'none' ? D : def.chaiseD;
  g.userData.footprint = { w: W, d: effD };
  return g;
}

/* =========================================================================
 * 3. MOBILI FIVER EXTENSIBLE DINING TABLES (WALNUT DEFAULT!) + DYNAMIC CHAIRS
 * ExtensionStep: 0 (Closed), 1 (Half Extended), 2 (Fully Extended)
 * ========================================================================= */
export function buildMobiliFiverTable(item) {
  const def = MOBILIFIVER_TABLES.find(t => t.id === item.modelId) || MOBILIFIVER_TABLES[0];
  const finishKey = item.finish || def.defaultFinish || 'walnut';
  const extIdx = Math.max(0, Math.min(2, item.extensionStep || 0));
  const L = def.lengths[extIdx];
  const W = def.width;
  const H = def.height;
  const g = new THREE.Group();

  const woodMat = makeWoodMat(finishKey, 2.2, 1.2);
  const darkWoodMat = makeWoodMat(finishKey === 'walnut' ? 'walnut' : finishKey, 1, 1);
  const blackSteel = new THREE.MeshStandardMaterial({ color: '#1F2022', roughness: 0.42, metalness: 0.65 });
  const seamMat = new THREE.MeshStandardMaterial({ color: '#241912', roughness: 0.9 });

  const topT = 0.042;
  const topY = H - topT / 2;

  // ---- Tabletop (Rectangular or Round-to-Oval for Angelica!) ----
  if (def.shape === 'round') {
    const r = W / 2;
    if (extIdx === 0) {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r, topT, 40), woodMat);
      top.position.y = topY;
      top.castShadow = true; top.receiveShadow = true;
      g.add(top);
    } else {
      // Stadium / Oval tabletop (two semicircles + center extension leaf!)
      const leafL = L - W;
      addBox(g, leafL, topT, W, woodMat, 0, topY, 0);
      const endL = new THREE.Mesh(new THREE.CylinderGeometry(r, r, topT, 32), woodMat);
      endL.position.set(-leafL / 2, topY, 0);
      endL.castShadow = true; endL.receiveShadow = true;
      const endR = endL.clone();
      endR.position.x = leafL / 2;
      g.add(endL, endR);
      // Extension leaf seam lines
      addBox(g, 0.004, topT + 0.002, W - 0.02, seamMat, -leafL / 2, topY, 0, false);
      addBox(g, 0.004, topT + 0.002, W - 0.02, seamMat, leafL / 2, topY, 0, false);
    }
  } else {
    addBox(g, L, topT, W, woodMat, 0, topY, 0);
    // Subtle skirt apron underneath
    addBox(g, L - 0.14, 0.055, W - 0.14, darkWoodMat, 0, topY - 0.045, 0);
    // Visible telescopic extension leaf seams when extended!
    if (extIdx > 0) {
      const leafCount = extIdx;
      const leafSpan = (L - def.lengths[0]) / leafCount;
      for (let i = 0; i <= leafCount; i++) {
        const sx = -(L - def.lengths[0]) / 2 + i * leafSpan;
        addBox(g, 0.004, topT + 0.002, W - 0.01, seamMat, sx, topY, 0, false);
      }
    }
  }

  // ---- Iconic Mobili Fiver Legs per Model ----
  const legH = H - topT;
  if (def.style === 'emma-x-legs') {
    // Signature Mobili Fiver EMMA intersecting sculptural crossed legs!
    const xMat = finishKey === 'walnut' ? woodMat : blackSteel;
    for (const [angZ, angY] of [[0.42, 0.28], [-0.42, -0.28], [0.42, -0.28], [-0.42, 0.28]]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.11, legH * 1.18, 0.09), xMat);
      strut.position.set(0, legH / 2, 0);
      strut.rotation.set(angY, 0, angZ);
      strut.castShadow = true;
      g.add(strut);
    }
    // Central architectural base plate
    addBox(g, 0.72, 0.025, 0.44, blackSteel, 0, 0.0125, 0);
  } else if (def.style === 'round-oval') {
    // ANGELICA star pedestal base
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, legH * 1.12, 0.09), woodMat);
      leg.position.set(Math.cos(a) * 0.16, legH / 2, Math.sin(a) * 0.16);
      leg.rotation.z = Math.cos(a) * 0.24;
      leg.rotation.x = -Math.sin(a) * 0.24;
      leg.castShadow = true;
      g.add(leg);
    }
  } else if (def.style === 'evolution-angled') {
    // EVOLUTION bold angled outward legs
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.095, legH * 1.04, 0.095), woodMat);
        leg.position.set(sx * (L / 2 - 0.14), legH / 2, sz * (W / 2 - 0.11));
        leg.rotation.z = -sx * 0.09;
        leg.castShadow = true;
        g.add(leg);
      }
    }
  } else {
    // FIRST / EASY / RACHELE crisp 4 corner legs (expand smoothly with table!)
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        addBox(g, 0.085, legH, 0.085, woodMat, sx * (L / 2 - 0.07), legH / 2, sz * (W / 2 - 0.07));
      }
    }
  }

  // ---- Dynamic Scandinavian Walnut/Linen Dining Chairs (4 -> 6 -> 8 chairs!) ----
  const chairPerSide = L >= 2.25 ? 3 : L >= 1.55 ? 2 : 2;
  const chairWood = makeWoodMat(finishKey === 'concrete' ? 'oak' : finishKey, 1, 1);
  const chairSeat = makeFabricMat('#E2D9CB', 0.90, 2);

  const addChair = (cx, cz, rotY) => {
    const cg = new THREE.Group();
    // 4 slender legs
    for (const lx of [-0.18, 0.18]) {
      for (const lz of [-0.18, 0.18]) {
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, 0.45, 8), chairWood);
        l.position.set(lx, 0.225, lz);
        l.castShadow = true;
        cg.add(l);
      }
    }
    // Upholstered seat
    addBox(cg, 0.44, 0.045, 0.42, chairSeat, 0, 0.46, 0);
    // Curved Scandinavian wooden backrest
    addBox(cg, 0.44, 0.20, 0.035, chairWood, 0, 0.72, -0.19);
    addBox(cg, 0.032, 0.36, 0.032, chairWood, -0.18, 0.62, -0.19);
    addBox(cg, 0.032, 0.36, 0.032, chairWood,  0.18, 0.62, -0.19);
    cg.position.set(cx, 0, cz);
    cg.rotation.y = rotY;
    g.add(cg);
  };

  // Side chairs along both long edges
  const sideSpan = L - 0.46;
  for (let i = 0; i < chairPerSide; i++) {
    const cx = chairPerSide === 1 ? 0 : -sideSpan / 2 + (sideSpan * i) / (chairPerSide - 1);
    addChair(cx, -W / 2 - 0.22, 0);
    addChair(cx,  W / 2 + 0.22, Math.PI);
  }
  // Head chairs when extended (6 or 8 guests!)
  if (extIdx >= 1) {
    addChair(-L / 2 - 0.22, 0, Math.PI / 2);
    addChair( L / 2 + 0.22, 0, -Math.PI / 2);
  }

  g.userData.footprint = { w: L + (extIdx >= 1 ? 0.50 : 0.10), d: W + 0.65 };
  return g;
}

/* =========================================================================
 * 4. SUPPORTING & QUICK-ADD FURNITURE + PARAMETRIC PROMPT BUILDER
 * ========================================================================= */
export function buildGenericFurniture(item) {
  const g = new THREE.Group();
  const w = item.w || 1.0, d = item.d || 0.5, h = item.h || 0.75;
  const fin = item.finish || 'oak';
  const woodMat = makeWoodMat(WOOD_FINISHES[fin] ? fin : 'oak', 1.5, 1);
  const darkMetal = new THREE.MeshStandardMaterial({ color: '#1F2023', roughness: 0.38, metalness: 0.68 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#C8A156', roughness: 0.28, metalness: 0.85 });

  if (item.kind === 'wardrobe') {
    const mat = makeWoodMat(fin === 'white' ? 'white' : fin, 2, 2);
    addBox(g, w, h, d, mat, 0, h / 2, 0);
    const doors = Math.max(2, Math.round(w / 0.50));
    const seamMat = new THREE.MeshStandardMaterial({ color: '#C5C0B8', roughness: 0.9 });
    for (let i = 1; i < doors; i++) {
      const sx = -w / 2 + (w * i) / doors;
      addBox(g, 0.008, h - 0.06, 0.01, seamMat, sx, h / 2, d / 2 + 0.002, false);
    }
    for (let i = 0; i < doors; i++) {
      const hx = -w / 2 + (w * (i + 0.5)) / doors + (i % 2 === 0 ? 0.14 : -0.14);
      addBox(g, 0.014, 0.22, 0.025, darkMetal, hx, 1.15, d / 2 + 0.015, false);
    }
  } else if (item.kind === 'tvUnit') {
    addBox(g, w, h - 0.14, d, woodMat, 0, 0.14 + (h - 0.14) / 2, 0);
    for (const lx of [-w / 2 + 0.10, 0, w / 2 - 0.10]) {
      for (const lz of [-d / 2 + 0.08, d / 2 - 0.08]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.14, 8), darkMetal);
        leg.position.set(lx, 0.07, lz);
        g.add(leg);
      }
    }
    // 55" Slim OLED TV mounted above TV console
    const tvMat = new THREE.MeshStandardMaterial({ color: '#111215', roughness: 0.12, metalness: 0.3 });
    addBox(g, Math.min(1.24, w * 0.72), 0.70, 0.024, tvMat, 0, h + 0.44, -0.02);
    addBox(g, 0.36, 0.02, 0.20, darkMetal, 0, h + 0.01, -0.02);
    addBox(g, 0.05, 0.12, 0.04, darkMetal, 0, h + 0.07, -0.02);
  } else if (item.kind === 'coffeeTable') {
    addBox(g, w, 0.036, d, woodMat, 0, h - 0.018, 0);
    for (const lx of [-w / 2 + 0.08, w / 2 - 0.08]) {
      for (const lz of [-d / 2 + 0.08, d / 2 - 0.08]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.013, h - 0.03, 10), darkMetal);
        leg.position.set(lx, (h - 0.03) / 2, lz);
        g.add(leg);
      }
    }
  } else if (item.kind === 'nightstand') {
    addBox(g, w, h - 0.14, d, woodMat, 0, 0.14 + (h - 0.14) / 2, 0);
    for (const lx of [-w / 2 + 0.05, w / 2 - 0.05]) {
      for (const lz of [-d / 2 + 0.05, d / 2 - 0.05]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.010, 0.14, 8), darkMetal);
        leg.position.set(lx, 0.07, lz);
        g.add(leg);
      }
    }
    // Small ceramic bedside lamp
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.14, 12), new THREE.MeshStandardMaterial({ color: '#EAE5DC', roughness: 0.6 }));
    lampBase.position.set(0, h + 0.07, -0.02);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.14, 14), new THREE.MeshStandardMaterial({ color: '#F5EFE4', emissive: '#FFD699', emissiveIntensity: 0.35, roughness: 0.9 }));
    shade.position.set(0, h + 0.20, -0.02);
    g.add(lampBase, shade);
  } else if (item.kind === 'desk') {
    addBox(g, w, 0.032, d, woodMat, 0, h - 0.016, 0);
    for (const lx of [-w / 2 + 0.06, w / 2 - 0.06]) {
      addBox(g, 0.035, h - 0.03, d - 0.08, darkMetal, lx, (h - 0.03) / 2, 0);
    }
    // Minimalist desk chair tucked in
    const chSeat = makeFabricMat('#D5CCC0', 0.9, 2);
    addBox(g, 0.44, 0.05, 0.42, chSeat, 0, 0.45, 0.28);
    addBox(g, 0.44, 0.34, 0.05, chSeat, 0, 0.64, 0.48);
  } else if (item.kind === 'sideboard') {
    addBox(g, w, h - 0.18, d, woodMat, 0, 0.18 + (h - 0.18) / 2, 0);
    for (const lx of [-w / 2 + 0.10, w / 2 - 0.10]) {
      for (const lz of [-d / 2 + 0.07, d / 2 - 0.07]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, 0.18, 8), darkMetal);
        leg.position.set(lx, 0.09, lz);
        g.add(leg);
      }
    }
  } else if (item.kind === 'armchair') {
    const fabObj = SOFA_FABRICS.find(f => f.id === fin) || SOFA_FABRICS[2];
    const fMat = makeFabricMat(fabObj.hex, 0.92, 3);
    addBox(g, w, 0.18, d, fMat, 0, 0.34, 0);
    addBox(g, w, 0.48, 0.16, fMat, 0, 0.62, -d / 2 + 0.09);
    addBox(g, 0.10, 0.34, d - 0.08, fMat, -w / 2 + 0.05, 0.50, 0);
    addBox(g, 0.10, 0.34, d - 0.08, fMat,  w / 2 - 0.05, 0.50, 0);
    for (const lx of [-w / 2 + 0.08, w / 2 - 0.08]) {
      for (const lz of [-d / 2 + 0.08, d / 2 - 0.08]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.013, 0.25, 8), woodMat);
        leg.position.set(lx, 0.125, lz);
        g.add(leg);
      }
    }
  } else if (item.kind === 'rug') {
    const fabObj = SOFA_FABRICS.find(f => f.id === fin) || SOFA_FABRICS[0];
    const rugMat = makeFabricMat(fabObj.hex, 0.98, 6);
    addBox(g, w, 0.012, d, rugMat, 0, 0.007, 0, false);
  } else if (item.kind === 'plant') {
    const potMat = new THREE.MeshStandardMaterial({ color: '#B87654', roughness: 0.82 });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.13, 0.34, 16), potMat);
    pot.position.y = 0.17; pot.castShadow = true;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.036, h * 0.55, 8), new THREE.MeshStandardMaterial({ color: '#614732', roughness: 0.9 }));
    trunk.position.y = 0.30 + h * 0.26;
    const leafMat = new THREE.MeshStandardMaterial({ color: '#5D7452', roughness: 0.78 });
    g.add(pot, trunk);
    [[0, h * 0.76, 0, 0.26], [-0.14, h * 0.68, 0.10, 0.19], [0.15, h * 0.72, -0.09, 0.20], [0.06, h * 0.88, 0.06, 0.18]].forEach(([x, y, z, r]) => {
      const f = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), leafMat);
      f.position.set(x, y, z);
      f.castShadow = true;
      g.add(f);
    });
  } else if (item.kind === 'floorLamp') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 20), brassMat);
    base.position.y = 0.015;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, h - 0.20, 10), brassMat);
    pole.position.y = (h - 0.20) / 2;
    const shade = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 14), new THREE.MeshStandardMaterial({ color: '#FFF7E8', emissive: '#FFD699', emissiveIntensity: 0.65, roughness: 0.3 }));
    shade.position.set(0.10, h - 0.12, 0);
    g.add(base, pole, shade);
  } else if (item.kind === 'customParametric') {
    return buildParametricPromptComponent(item);
  }

  g.userData.footprint = { w, d };
  return g;
}

/**
 * PARAMETRIC PROMPT-TO-3D COMPONENT BUILDER (THE GRAIL — PHASE 1 ENGINE!)
 * Turns a declarative JSON spec { archetype, w, d, h, material, colorHex, shape }
 * into a clean PBR 3D mesh that can be moved, rotated, duplicated, and ray-traced!
 */
export function buildParametricPromptComponent(item) {
  const spec = item.spec || {};
  const g = new THREE.Group();
  const w = spec.w || item.w || 1.20;
  const d = spec.d || item.d || 0.50;
  const h = spec.h || item.h || 0.75;
  const archetype = spec.archetype || 'cabinet';

  let mainMat;
  if (spec.woodFinish && WOOD_FINISHES[spec.woodFinish]) {
    mainMat = makeWoodMat(spec.woodFinish, 1.5, 1.2);
  } else if (spec.isFabric) {
    mainMat = makeFabricMat(spec.colorHex || '#CFC6B8', 0.92, 4);
  } else if (spec.isMarble) {
    mainMat = new THREE.MeshStandardMaterial({ color: spec.colorHex || '#F2F0EB', roughness: 0.22, metalness: 0.02 });
  } else if (spec.isMetal) {
    mainMat = new THREE.MeshStandardMaterial({ color: spec.colorHex || '#C8A156', roughness: 0.30, metalness: 0.85 });
  } else {
    mainMat = new THREE.MeshStandardMaterial({ color: spec.colorHex || '#C29B6C', roughness: 0.55 });
  }

  const legMat = new THREE.MeshStandardMaterial({ color: '#222326', roughness: 0.38, metalness: 0.65 });

  if (archetype === 'table') {
    if (spec.shape === 'round') {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.04, 32), mainMat);
      top.position.y = h - 0.02; top.castShadow = true; top.receiveShadow = true;
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, h - 0.04, 20), legMat);
      ped.position.y = (h - 0.04) / 2; ped.castShadow = true;
      g.add(top, ped);
    } else {
      addBox(g, w, 0.04, d, mainMat, 0, h - 0.02, 0);
      for (const lx of [-w / 2 + 0.07, w / 2 - 0.07]) {
        for (const lz of [-d / 2 + 0.07, d / 2 - 0.07]) {
          addBox(g, 0.045, h - 0.04, 0.045, legMat, lx, (h - 0.04) / 2, lz);
        }
      }
    }
  } else if (archetype === 'bookcase') {
    // Open shelving unit
    addBox(g, 0.03, h, d, mainMat, -w / 2 + 0.015, h / 2, 0);
    addBox(g, 0.03, h, d, mainMat,  w / 2 - 0.015, h / 2, 0);
    addBox(g, w, h, 0.02, mainMat, 0, h / 2, -d / 2 + 0.01);
    const shelves = Math.max(3, Math.round(h / 0.38));
    for (let i = 0; i <= shelves; i++) {
      const sy = 0.06 + ((h - 0.08) * i) / shelves;
      addBox(g, w - 0.04, 0.026, d - 0.02, mainMat, 0, sy, 0.01);
    }
  } else if (archetype === 'seat') {
    addBox(g, w, 0.22, d, mainMat, 0, 0.32, 0);
    addBox(g, w, h - 0.40, 0.14, mainMat, 0, 0.42 + (h - 0.40) / 2, -d / 2 + 0.07);
    for (const lx of [-w / 2 + 0.06, w / 2 - 0.06]) {
      for (const lz of [-d / 2 + 0.06, d / 2 - 0.06]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, 0.22, 8), legMat);
        leg.position.set(lx, 0.11, lz);
        g.add(leg);
      }
    }
  } else {
    // Sideboard / Cabinet / Console / Credenza
    const legH = 0.15;
    addBox(g, w, h - legH, d, mainMat, 0, legH + (h - legH) / 2, 0);
    for (const lx of [-w / 2 + 0.08, w / 2 - 0.08]) {
      for (const lz of [-d / 2 + 0.06, d / 2 - 0.06]) {
        addBox(g, 0.03, legH, 0.03, legMat, lx, legH / 2, lz);
      }
    }
  }

  g.userData.footprint = { w, d };
  return g;
}

/* =========================================================================
 * 5. MASTER MOVABLE ITEM DISPATCHER
 * ========================================================================= */
export function buildFurnitureItemMesh(item) {
  let group;
  if (item.kind === 'bed') group = buildIkeaBed(item);
  else if (item.kind === 'sofa') group = buildIkeaSofa(item);
  else if (item.kind === 'diningTable') group = buildMobiliFiverTable(item);
  else if (item.kind === 'customParametric') group = buildRichComponentMesh(item);
  else if (item.kind === 'customGlb') group = buildGlbItemMesh(item);
  else group = buildGenericFurniture(item);

  group.position.set(item.x, 0, item.z);
  group.rotation.y = item.rotY || 0;
  group.userData.uid = item.uid;
  group.userData.movable = true;
  group.name = `movable-${item.uid}`;
  return group;
}

/* =========================================================================
 * 6. TMA LIGHT FIXTURES BUILDER (CEILING DCLs + CH.3 WALL SCONCES!)
 * ========================================================================= */
export function buildLightFixtures(parentGroup, roomFixtureStyles, lightingMode) {
  while (parentGroup.children.length) parentGroup.remove(parentGroup.children[0]);

  const isEvening = lightingMode === 'evening';
  const bulbEmissiveIntensity = isEvening ? 2.4 : lightingMode === 'morning' ? 0.55 : 0.35;
  const pointLightIntensity = isEvening ? 1.85 : 0.0;

  const brassMat = new THREE.MeshStandardMaterial({ color: '#C8A156', roughness: 0.26, metalness: 0.88 });
  const blackMat = new THREE.MeshStandardMaterial({ color: '#212225', roughness: 0.40, metalness: 0.65 });
  const linenMat = new THREE.MeshStandardMaterial({ color: '#EFE8DA', emissive: '#FFCF8B', emissiveIntensity: isEvening ? 0.55 : 0.12, roughness: 0.90, side: THREE.DoubleSide });
  const rattanMat = new THREE.MeshStandardMaterial({ color: '#C79B65', emissive: '#E8A856', emissiveIntensity: isEvening ? 0.40 : 0.08, roughness: 0.86, side: THREE.DoubleSide });
  const opalMat = new THREE.MeshStandardMaterial({ color: '#FFFBF2', emissive: '#FFD699', emissiveIntensity: bulbEmissiveIntensity, roughness: 0.20 });

  const dynamicLights = [];

  for (const pt of TMA_LIGHT_POINTS) {
    const style = roomFixtureStyles[pt.room] || pt.defaultStyle || 'scandi-linen';
    const g = new THREE.Group();
    g.position.set(pt.x, pt.y, pt.z);

    if (pt.kind === 'sconce') {
      // Chambre 3 TMA #2 Wall Sconces on North wall (facing +Z)
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 16), style === 'matte-black' ? blackMat : brassMat);
      plate.rotation.x = Math.PI / 2;
      plate.position.z = 0.012;
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.10, 8), style === 'matte-black' ? blackMat : brassMat);
      arm.rotation.x = Math.PI / 2;
      arm.position.z = 0.06;
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 14), opalMat);
      globe.position.set(0, 0.04, 0.105);
      g.add(plate, arm, globe);

      if (isEvening) {
        const pl = new THREE.PointLight(0xFFD296, 0.85, 3.5, 1.8);
        pl.position.set(0, 0.04, 0.18);
        g.add(pl);
        dynamicLights.push(pl);
      }
    } else if (pt.kind === 'flush' || style === 'flush-minimal') {
      // Clean architectural ceiling flush mount (WC, SDB, Entrée, Kitchen)
      const trim = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.035, 22), style === 'brass-opal' ? brassMat : style === 'matte-black' ? blackMat : new THREE.MeshStandardMaterial({ color: '#F2F0EB', roughness: 0.5 }));
      trim.position.y = -0.02;
      const diffuser = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.025, 22), opalMat);
      diffuser.position.y = -0.045;
      g.add(trim, diffuser);
      if (isEvening) {
        const pl = new THREE.PointLight(0xFFE0B2, pointLightIntensity * 0.75, 4.5, 1.7);
        pl.position.y = -0.18;
        g.add(pl);
        dynamicLights.push(pl);
      }
    } else {
      // Ceiling Pendant (Drop cord + signature shade per style!)
      const drop = pt.kind === 'dining-pendant' ? 0.82 : 0.48;
      const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.025, 16), style === 'matte-black' ? blackMat : brassMat);
      canopy.position.y = -0.012;
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, drop, 8), style === 'brass-opal' ? brassMat : blackMat);
      cord.position.y = -drop / 2;
      g.add(canopy, cord);

      if (pt.kind === 'dining-pendant' && (style === 'brass-opal' || style === 'matte-black')) {
        // Sculptural linear dining pendant bar (aligned N-S over Mobili Fiver table!)
        const barMat = style === 'brass-opal' ? brassMat : blackMat;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.028, 1.05), barMat);
        bar.position.y = -drop;
        g.add(bar);
        [-0.36, 0, 0.36].forEach(dz => {
          const globe = new THREE.Mesh(new THREE.SphereGeometry(0.078, 16, 14), opalMat);
          globe.position.set(0, -drop - 0.07, dz);
          g.add(globe);
        });
      } else if (style === 'brass-opal') {
        const globe = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), opalMat);
        globe.position.y = -drop - 0.10;
        g.add(globe);
      } else if (style === 'matte-black') {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.19, 24, 1, true), blackMat);
        cone.position.y = -drop - 0.06;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), opalMat);
        bulb.position.y = -drop - 0.11;
        g.add(cone, bulb);
      } else if (style === 'natural-rattan') {
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.24, 0.24, 24, 1, true), rattanMat);
        drum.position.y = -drop - 0.08;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), opalMat);
        bulb.position.y = -drop - 0.10;
        g.add(drum, bulb);
      } else {
        // Default: Scandinavian Linen Dome
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.56), linenMat);
        dome.position.y = -drop - 0.02;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), opalMat);
        bulb.position.y = -drop - 0.04;
        g.add(dome, bulb);
      }

      if (isEvening) {
        const pl = new THREE.PointLight(0xFFD699, pointLightIntensity, 6.2, 1.7);
        pl.position.y = -drop - 0.20;
        g.add(pl);
        dynamicLights.push(pl);
      }
    }

    parentGroup.add(g);
  }

  return dynamicLights;
}
