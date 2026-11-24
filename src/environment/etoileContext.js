import * as THREE from 'three';
import {
  getExteriorConcreteTextures,
  getCourtyardPaverTexture,
  getGroundSurfaceTexture
} from '../builders/textures.js';

/* =========================================================================
 * ZAC DE L'ÉTOILE (AMBILLY / ANNEMASSE) — SCHEMATIC URBAN MASTERPLAN CONTEXT
 * Modeled faithfully from ecoquartier-etoile.fr, Atelier LJN, SA Mont-Blanc,
 * Devillers & Associés (D&A), and Annemasse Agglo masterplan documents.
 *
 * Coordinate System (anchored to Cassiopée Lot 17 @ R+4, y = 0.0 m):
 *   -Z = NNE (17° E of North) -> Atelier LJN Cœur d'Îlot & Andromède (B3.3)
 *   +Z = SSW (197°)           -> Av. Marguerite Yourcenar, Jardin Ferroviaire,
 *                                Voie Verte, Railway, Passerelle, Gare, Salève
 *   -X = WNW (287°)           -> Rue de la Fraternité, DiverCity (B3.1),
 *                                Place Rosa Parks, Archipel, ICONE, Jura
 *   +X = ESE (107°)           -> Cassiopée East Wing, LOCO (A1), Mimèsis/Artéo,
 *                                Voirons & distant Mont-Blanc
 * ========================================================================= */

function markHideInRT(obj) {
  obj.traverse((child) => {
    child.userData.hideInRT = true;
  });
  return obj;
}

/**
 * Helper: builds a clean schematic architectural building mass with horizontal
 * floor cornices, recessed glazed openings (instanced per building), optional
 * timber cladding or active ground-floor retail base, and roof parapet/PV panels.
 */
function buildSchematicResidence({
  name,
  x,
  z,
  w,
  d,
  floors,
  floorH = 2.85,
  groundH = 3.4,
  groundY,
  facadeMat,
  trimMat,
  glassMat,
  woodMat,
  roofMat,
  pvMat = null,
  activeGround = false,
  timberUpper = false,
  deepLoggias = false,
  pvPanels = false,
  skipEastWindows = false,
  hideInRT = true
}) {
  const g = new THREE.Group();
  g.name = name;

  const totalH = groundH + Math.max(0, floors - 1) * floorH;
  const bodyMat = timberUpper ? woodMat : facadeMat;

  // Ground-floor plinth (socle)
  const socle = new THREE.Mesh(
    new THREE.BoxGeometry(w, groundH, d),
    activeGround ? trimMat : facadeMat
  );
  socle.position.y = groundH / 2;
  socle.receiveShadow = true;
  g.add(socle);

  // Active ground-floor shopfront glazing strip
  if (activeGround) {
    const shopfrontS = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, groundH * 0.72, d + 0.08), glassMat);
    shopfrontS.position.y = groundH * 0.44;
    const shopfrontW = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, groundH * 0.72, d * 0.80), glassMat);
    shopfrontW.position.y = groundH * 0.44;
    g.add(shopfrontS, shopfrontW);
  }

  // Upper residential body
  const upperH = totalH - groundH;
  if (upperH > 0.2) {
    const upper = new THREE.Mesh(new THREE.BoxGeometry(w, upperH, d), bodyMat);
    upper.position.y = groundH + upperH / 2;
    upper.receiveShadow = true;
    g.add(upper);
  }

  // Horizontal cornice bands (air de famille ZAC de l'Étoile)
  for (let f = 1; f <= floors; f++) {
    const fy = groundH + (f - 1) * floorH;
    const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, 0.20, d + 0.16), trimMat);
    band.position.y = fy;
    g.add(band);
  }

  // Roof parapet & gravel/green terrace slab
  const parapetH = 0.65;
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, parapetH, d + 0.14), trimMat);
  parapet.position.y = totalH + parapetH / 2;
  const roofInner = new THREE.Mesh(new THREE.BoxGeometry(Math.max(1, w - 0.5), 0.12, Math.max(1, d - 0.5)), roofMat);
  roofInner.position.y = totalH + 0.24;
  g.add(parapet, roofInner);

  // Instanced schematic facade openings (South/North & West/East faces)
  const bayStep = deepLoggias ? 3.8 : 3.2;
  const colsX = Math.max(2, Math.floor((w - 1.6) / bayStep));
  const colsZ = Math.max(2, Math.floor((d - 1.6) / bayStep));
  const upperFloors = Math.max(0, floors - 1);

  if (upperFloors > 0) {
    const winW = deepLoggias ? 2.15 : 1.35;
    const winH = deepLoggias ? 1.95 : 1.55;
    const winD = deepLoggias ? 0.24 : 0.08;

    const zSides = skipEastWindows ? [-1] : [1, -1];
    const totalXWins = colsX * upperFloors * 2;
    const xInst = new THREE.InstancedMesh(new THREE.BoxGeometry(winW, winH, winD), glassMat, totalXWins);
    const totalZWins = colsZ * upperFloors * zSides.length;
    const zInst = new THREE.InstancedMesh(new THREE.BoxGeometry(winD, winH, winW), glassMat, totalZWins);

    const dummy = new THREE.Object3D();
    let xi = 0, zi = 0;

    for (let f = 0; f < upperFloors; f++) {
      const cy = groundH + f * floorH + floorH * 0.52;
      for (let c = 0; c < colsX; c++) {
        const cx = -w / 2 + ((c + 0.5) * w) / colsX;
        // South (+Z) and North (-Z)
        for (const sign of [1, -1]) {
          dummy.position.set(cx, cy, sign * (d / 2 + 0.02));
          dummy.updateMatrix();
          xInst.setMatrixAt(xi++, dummy.matrix);
        }
      }
      for (let c = 0; c < colsZ; c++) {
        const cz = -d / 2 + ((c + 0.5) * d) / colsZ;
        // East (+X) and/or West (-X)
        for (const sign of zSides) {
          dummy.position.set(sign * (w / 2 + 0.02), cy, cz);
          dummy.updateMatrix();
          zInst.setMatrixAt(zi++, dummy.matrix);
        }
      }
    }
    xInst.instanceMatrix.needsUpdate = true;
    zInst.instanceMatrix.needsUpdate = true;
    g.add(xInst, zInst);
  }

  // Optional rooftop photovoltaic panels (ZAC Étoile TEPCV energy-positive roofs)
  if (pvPanels && pvMat && w >= 8 && d >= 6) {
    const rows = Math.min(3, Math.max(1, Math.floor((d - 2.5) / 2.6)));
    const pvW = Math.min(w - 2.6, 12);
    for (let r = 0; r < rows; r++) {
      const pz = -((rows - 1) * 2.2) / 2 + r * 2.2;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(pvW, 0.08, 1.35), pvMat);
      panel.position.set(0, totalH + 0.72, pz);
      panel.rotation.x = 0.24; // Tilted toward SSW sun
      g.add(panel);
    }
  }

  g.position.set(x, groundY, z);
  if (hideInRT) markHideInRT(g);
  return { group: g, totalH };
}

/**
 * Helper: builds a clean 3D faceted architectural-maquette mountain ridge
 * so the distant Alpine horizon catches directional sunlight and twilight mist.
 */
function buildAlpineRidge3D(profile, { depth = 42, heightScale = 30, material, ridgeShiftZ = 0 }) {
  const n = profile.length;
  const positions = [];
  const indices = [];

  // 3 rows along Z: front foothill (-depth/2), main crest (ridgeShiftZ), back base (+depth/2)
  for (let i = 0; i < n; i++) {
    const [px, py] = profile[i];
    const hCrest = py * heightScale;
    const hFront = Math.max(0, hCrest * 0.22 - 1.2);
    const frontJitter = ((i * 7) % 5 - 2) * 1.8;

    // Row 0: front toe
    positions.push(px, 0, -depth * 0.55 + frontJitter);
    // Row 1: mid-escarpment shelf (creates Mont Salève's iconic cliff band!)
    positions.push(px, hFront + (hCrest - hFront) * 0.55, -depth * 0.20 + frontJitter * 0.5);
    // Row 2: summit crest
    positions.push(px, hCrest, ridgeShiftZ);
    // Row 3: back slope toe
    positions.push(px, 0, depth * 0.55);
  }

  for (let i = 0; i < n - 1; i++) {
    const a = i * 4;
    const b = (i + 1) * 4;
    for (let r = 0; r < 3; r++) {
      const i0 = a + r;
      const i1 = a + r + 1;
      const i2 = b + r;
      const i3 = b + r + 1;
      indices.push(i0, i2, i1);
      indices.push(i1, i2, i3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, material);
  mesh.userData.hideInRT = true;
  return mesh;
}

/**
 * Builds the complete schematic ZAC de l'Étoile urban context around Cassiopée (B3.2).
 * Returns { group, updateAtmosphere(sunData) }.
 */
export function buildEtoileContext(groundY) {
  const ctxGroup = new THREE.Group();
  ctxGroup.name = 'zac-etoile-context';

  /* =====================================================================
   * SHARED PROCEDURAL ARCHITECTURAL MATERIALS (MUTED MAQUETTE PALETTE)
   * ===================================================================== */
  const smoothConcTex = getExteriorConcreteTextures('smooth', 3, 1);
  const roughConcTex = getExteriorConcreteTextures('rough', 3, 2);
  const paverTex = getCourtyardPaverTexture(10, 8);
  const asphaltTex = getGroundSurfaceTexture('asphalt', 12, 12);
  const voieVerteTex = getGroundSurfaceTexture('voieVerte', 18, 2);
  const ballastTex = getGroundSurfaceTexture('ballast', 24, 3);

  const paleConcreteMat = new THREE.MeshStandardMaterial({
    map: smoothConcTex.map,
    normalMap: smoothConcTex.normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    color: '#E6E1D7',
    roughness: 0.82,
    metalness: 0.02
  });
  const warmStoneMat = new THREE.MeshStandardMaterial({
    map: roughConcTex.map,
    normalMap: roughConcTex.normalMap,
    normalScale: new THREE.Vector2(0.45, 0.45),
    color: '#DAD2C4',
    roughness: 0.88,
    metalness: 0.01
  });
  const tintedMineralMat = new THREE.MeshStandardMaterial({ color: '#D3C5B7', roughness: 0.88 }); // Artéo / ICONE mineral concrete
  const coolConcreteMat = new THREE.MeshStandardMaterial({ color: '#CFD3D4', roughness: 0.84 });  // Constellation / Le HUB / Halle Taponnier
  const trimConcreteMat = new THREE.MeshStandardMaterial({ color: '#CCC5B8', roughness: 0.80 });
  const timberFacadeMat = new THREE.MeshStandardMaterial({ color: '#B58D63', roughness: 0.78 });  // Archipel / Campus / LOCO / ICONE timber
  const woodAccentMat = new THREE.MeshStandardMaterial({ color: '#9E7B54', roughness: 0.72 });
  const roofGravelMat = new THREE.MeshStandardMaterial({ color: '#B8B4AC', roughness: 0.94 });
  const roofGreenMat = new THREE.MeshStandardMaterial({ color: '#7D9566', roughness: 0.95 });
  const pvPanelMat = new THREE.MeshStandardMaterial({ color: '#243447', roughness: 0.22, metalness: 0.55 });
  const novotelCrownMat = new THREE.MeshStandardMaterial({ color: '#AEB8C2', roughness: 0.24, metalness: 0.78 });
  const steelMat = new THREE.MeshStandardMaterial({ color: '#7B828A', roughness: 0.42, metalness: 0.65 });
  const darkRailMat = new THREE.MeshStandardMaterial({ color: '#3E4349', roughness: 0.48, metalness: 0.55 });

  // Dynamic dusk/night glowing materials (updated smoothly in updateAtmosphere)
  const neighborGlassMat = new THREE.MeshStandardMaterial({
    color: '#46525E',
    roughness: 0.22,
    metalness: 0.38,
    emissive: new THREE.Color('#FFCF8B'),
    emissiveIntensity: 0.0
  });
  const bollardGlowMat = new THREE.MeshStandardMaterial({
    color: '#E8DEC8',
    roughness: 0.35,
    emissive: new THREE.Color('#FFD18C'),
    emissiveIntensity: 0.0
  });

  /* =====================================================================
   * 1. BASE TERRAIN, STREETS (AV. M. YOURCENAR & RUE DE LA FRATERNITÉ)
   * ===================================================================== */
  const terrainMat = new THREE.MeshStandardMaterial({ color: '#9FA992', roughness: 0.96 });
  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), terrainMat);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.set(10, groundY, 20);
  terrain.receiveShadow = true;
  terrain.userData.hideInRT = true;
  ctxGroup.add(terrain);

  const asphaltMat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.92 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: '#D3CEC4', roughness: 0.88 });
  const cycleLaneMat = new THREE.MeshStandardMaterial({ color: '#B7A78F', roughness: 0.88 });
  const swaleMat = new THREE.MeshStandardMaterial({ color: '#6E8859', roughness: 0.96 });

  const streetsGroup = new THREE.Group();
  streetsGroup.name = 'streets-etoile';

  // Avenue Marguerite Yourcenar (WSW-ENE directly south of Cassiopée & DiverCity, Z = 16.2..23.8)
  const avRoad = new THREE.Mesh(new THREE.BoxGeometry(280, 0.07, 7.6), asphaltMat);
  avRoad.position.set(0, groundY + 0.035, 20.0);
  avRoad.receiveShadow = true;
  // North sidewalk split cleanly at Rue de la Fraternité (X = -33.6..-26.4)
  const avSidewalkNW = new THREE.Mesh(new THREE.BoxGeometry(106.4, 0.11, 4.4), sidewalkMat);
  avSidewalkNW.position.set(-86.8, groundY + 0.055, 13.8);
  const avSidewalkNE = new THREE.Mesh(new THREE.BoxGeometry(166.4, 0.11, 4.4), sidewalkMat);
  avSidewalkNE.position.set(56.8, groundY + 0.055, 13.8);
  avSidewalkNE.receiveShadow = true;
  // South promenade sidewalk bordering Jardin Ferroviaire (continuous pedestrian promenade)
  const avSidewalkS = new THREE.Mesh(new THREE.BoxGeometry(280, 0.11, 3.2), sidewalkMat);
  avSidewalkS.position.set(0, groundY + 0.055, 25.4);
  // Vegetated stormwater swale (noue végétalisée) along Av. Marguerite Yourcenar
  const avSwale = new THREE.Mesh(new THREE.BoxGeometry(260, 0.08, 1.8), swaleMat);
  avSwale.position.set(0, groundY + 0.04, 27.9);
  streetsGroup.add(avRoad, avSidewalkNW, avSidewalkNE, avSidewalkS, avSwale);

  // Landscaped pedestrian venelle & shared Îlot B3 access lane between Cassiopée (X=0) & DiverCity (X=-11.5)
  const venellePath = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.11, 32.0), sidewalkMat);
  venellePath.position.set(-5.6, groundY + 0.055, -2.5);
  venellePath.receiveShadow = true;
  const venelleCycle = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.09, 28.0), cycleLaneMat);
  venelleCycle.position.set(-2.5, groundY + 0.045, -1.5);
  streetsGroup.add(venellePath, venelleCycle);

  // Rue de la Fraternité (NNE-SSW along West side of DiverCity / Îlot B3, X = -33.6..-26.4)
  const fratRoad = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.07, 162), asphaltMat);
  fratRoad.position.set(-30.0, groundY + 0.035, -54.0);
  fratRoad.receiveShadow = true;
  const fratSidewalkEN = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.11, 146), sidewalkMat);
  fratSidewalkEN.position.set(-25.1, groundY + 0.055, -61.2);
  fratSidewalkEN.receiveShadow = true;
  const fratSidewalkWN = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.11, 146), sidewalkMat);
  fratSidewalkWN.position.set(-35.5, groundY + 0.055, -61.2);
  const fratCycle = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.085, 146), cycleLaneMat);
  fratCycle.position.set(-26.1, groundY + 0.042, -61.2);
  streetsGroup.add(fratRoad, fratSidewalkEN, fratSidewalkWN, fratCycle);

  // Crisp schematic pedestrian crosswalk stripes (passages piétons) at Fraternité × Yourcenar
  const crosswalkMat = new THREE.MeshStandardMaterial({ color: '#EAE7DF', roughness: 0.86 });
  for (let s = 0; s < 5; s++) {
    // North crosswalk across Rue de la Fraternité
    const stN = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.085, 2.2), crosswalkMat);
    stN.position.set(-32.4 + s * 1.2, groundY + 0.043, 14.5);
    // East crosswalk across Av. Marguerite Yourcenar
    const stE = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.085, 0.55), crosswalkMat);
    stE.position.set(-24.8, groundY + 0.043, 17.6 + s * 1.2);
    streetsGroup.add(stN, stE);
  }

  // Rue du Jura (East flank of Îlot B3 / North collector street)
  const juraRoad = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.06, 152), asphaltMat);
  juraRoad.position.set(62.5, groundY + 0.03, -60.0);
  const nordRue = new THREE.Mesh(new THREE.BoxGeometry(190, 0.06, 7.0), asphaltMat);
  nordRue.position.set(-20.0, groundY + 0.03, -55.5);
  streetsGroup.add(juraRoad, nordRue);

  markHideInRT(streetsGroup);
  ctxGroup.add(streetsGroup);

  /* =====================================================================
   * 2. ÎLOT B3 — SHARED COURTYARD (ATELIER LJN) + DIVERCITY + ANDROMÈDE
   * ===================================================================== */
  // 2A. Atelier LJN Cœur d'Îlot Végétalisé (directly North of Cassiopée, X=0..58, Z=-48..0)
  const courtyardGroup = new THREE.Group();
  courtyardGroup.name = 'courtyard-ljn';

  const courtyardLawnMat = new THREE.MeshStandardMaterial({ color: '#718D5B', roughness: 0.96 });
  const meadowPatchMat = new THREE.MeshStandardMaterial({ color: '#869B66', roughness: 0.96 });
  const paverMat = new THREE.MeshStandardMaterial({
    map: paverTex.map,
    normalMap: paverTex.normalMap,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.88
  });

  // Full-soil (pleine terre) lush courtyard lawn
  const ilotGarden = new THREE.Mesh(new THREE.BoxGeometry(56, 0.14, 48), courtyardLawnMat);
  ilotGarden.position.set(29, groundY + 0.07, -24);
  ilotGarden.receiveShadow = true;
  courtyardGroup.add(ilotGarden);

  // Soft perennial meadow pockets inside the courtyard
  const meadowSpecs = [
    [10, -10, 12, 9], [28, -16, 15, 11], [18, -28, 14, 10], [42, -24, 10, 12]
  ];
  meadowSpecs.forEach(([mx, mz, mw, md]) => {
    const patch = new THREE.Mesh(new THREE.BoxGeometry(mw, 0.16, md), meadowPatchMat);
    patch.position.set(mx, groundY + 0.08, mz);
    courtyardGroup.add(patch);
  });

  // Atelier LJN structured 20×20 paver spines connecting Cassiopée, DiverCity & Andromède
  const pathMainNS = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 36), paverMat);
  pathMainNS.position.set(17.5, groundY + 0.08, -18.5);
  const pathMainEW = new THREE.Mesh(new THREE.BoxGeometry(38, 0.16, 2.8), paverMat);
  pathMainEW.position.set(18.5, groundY + 0.08, -14.5);
  const cassiopeeNorthTerrace = new THREE.Mesh(new THREE.BoxGeometry(24, 0.16, 4.2), paverMat);
  cassiopeeNorthTerrace.position.set(11.8, groundY + 0.08, -2.0);
  courtyardGroup.add(pathMainNS, pathMainEW, cassiopeeNorthTerrace);

  // Atelier LJN signature dissolving 20×20 paver transition (scattered stepping pavers)
  const paverGeo = new THREE.BoxGeometry(0.62, 0.17, 0.62);
  const scatteredPaverCoords = [
    [4.2, -5.2], [5.8, -6.1], [7.4, -4.9], [9.2, -6.8], [11.5, -5.6],
    [13.6, -7.2], [14.8, -9.4], [15.2, -11.2], [19.8, -8.5], [21.2, -10.4],
    [22.6, -12.1], [25.0, -16.8], [27.4, -17.4], [29.8, -16.4], [14.6, -17.2],
    [12.4, -18.8], [10.8, -16.9], [20.4, -20.5], [22.1, -22.4], [14.8, -25.2],
    [16.2, -27.8], [19.6, -28.4], [23.5, -26.8], [26.4, -22.2], [31.2, -12.8],
    [33.4, -16.6], [8.2, -12.4], [6.4, -14.8], [20.8, -5.8], [24.2, -7.2]
  ];
  const scatteredInst = new THREE.InstancedMesh(paverGeo, sidewalkMat, scatteredPaverCoords.length);
  const dummy = new THREE.Object3D();
  scatteredPaverCoords.forEach(([px, pz], idx) => {
    dummy.position.set(px, groundY + 0.085, pz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    scatteredInst.setMatrixAt(idx, dummy.matrix);
  });
  scatteredInst.instanceMatrix.needsUpdate = true;
  courtyardGroup.add(scatteredInst);

  // Shared garden planters (bacs potagers / composteurs) & timber courtyard benches
  const planterSoilMat = new THREE.MeshStandardMaterial({ color: '#5A493A', roughness: 0.96 });
  const planterSpecs = [[9.5, -9.5], [12.0, -9.5], [24.5, -19.5], [27.0, -19.5]];
  planterSpecs.forEach(([px, pz]) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 0.9), woodAccentMat);
    box.position.set(px, groundY + 0.40, pz);
    const soil = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.12, 0.74), planterSoilMat);
    soil.position.set(px, groundY + 0.65, pz);
    courtyardGroup.add(box, soil);
  });
  [[15.2, -13.0, 0], [20.0, -16.2, Math.PI / 2], [7.2, -4.4, 0]].forEach(([bx, bz, rot]) => {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 0.52), woodAccentMat);
    bench.position.set(bx, groundY + 0.34, bz);
    bench.rotation.y = rot;
    courtyardGroup.add(bench);
  });

  markHideInRT(courtyardGroup);
  ctxGroup.add(courtyardGroup);

  // 2B. DiverCity (Lot B3.1 — Comte & Vollenweider Architectes / Bouygues Immobilier)
  // Directly adjacent to Cassiopée on the West / Chambre 3 side (7–9 Av. Marguerite Yourcenar):
  // monolithic pale concrete carved by deep loggias with warm timber accents, clearly visible
  // from Chambre 3's master bedroom window (in both Realtime PBR and GPU Path Tracing!),
  // plus a connected North wing with DiverCity's communal planted rooftop terrace!
  const diverCityGroup = new THREE.Group();
  diverCityGroup.name = 'divercity-b31';

  const dcMain = buildSchematicResidence({
    name: 'divercity-ch3-wing',
    x: -18.0,
    z: -5.5,
    w: 13.0,
    d: 22.0,
    floors: 6,
    groundY,
    facadeMat: paleConcreteMat,
    trimMat: trimConcreteMat,
    glassMat: neighborGlassMat,
    woodMat: timberFacadeMat,
    roofMat: roofGreenMat,
    activeGround: true,
    deepLoggias: true,
    skipEastWindows: true,
    hideInRT: false
  });
  // Architectural carved loggia balconies & warm timber accents on DiverCity's East face (X = -11.5, facing Chambre 3!)
  for (let fl = 1; fl < 6; fl++) {
    const flY = groundY + 3.4 + (fl - 1) * 2.85;
    for (const lz of [-12.2, -5.5, 1.2]) {
      const logSlab = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.18, 4.3), trimConcreteMat);
      logSlab.position.set(-11.05, flY + 0.08, lz);
      const logRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.96, 4.25), darkRailMat);
      logRail.position.set(-10.56, flY + 0.62, lz);
      const logWood = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.38, 3.85), woodAccentMat);
      logWood.position.set(-11.42, flY + 1.38, lz);
      const logGlass = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.08, 3.35), neighborGlassMat);
      logGlass.position.set(-11.34, flY + 1.38, lz);
      diverCityGroup.add(logSlab, logRail, logWood, logGlass);
    }
  }

  const dcNorthWing = buildSchematicResidence({
    name: 'divercity-north-wing',
    x: -1.5,
    z: -31.0,
    w: 22.0,
    d: 12.0,
    floors: 5,
    groundY,
    facadeMat: paleConcreteMat,
    trimMat: trimConcreteMat,
    glassMat: neighborGlassMat,
    woodMat: timberFacadeMat,
    roofMat: roofGreenMat,
    activeGround: false,
    deepLoggias: true,
    hideInRT: true
  });
  diverCityGroup.add(dcMain.group, dcNorthWing.group);

  // DiverCity's signature communal planted rooftop terrace with pergola & planter boxes on R+5 wing
  const dcTerraceGroup = new THREE.Group();
  const dcTerraceY = groundY + dcNorthWing.totalH + 0.35;
  const dcDeck = new THREE.Mesh(new THREE.BoxGeometry(17.5, 0.14, 9.0), woodAccentMat);
  dcDeck.position.set(-1.5, dcTerraceY, -31.0);
  dcTerraceGroup.add(dcDeck);
  for (let p = 0; p < 4; p++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 4.4), woodAccentMat);
    beam.position.set(-5.8 + p * 1.4, dcTerraceY + 2.4, -31.0);
    dcTerraceGroup.add(beam);
  }
  for (const [px, pz] of [[-5.8, -33.1], [-1.6, -33.1], [-5.8, -28.9], [-1.6, -28.9]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.4, 0.14), darkRailMat);
    post.position.set(px, dcTerraceY + 1.2, pz);
    dcTerraceGroup.add(post);
  }
  for (let b = 0; b < 3; b++) {
    const planter = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, 1.1), woodAccentMat);
    planter.position.set(3.2, dcTerraceY + 0.35, -33.1 + b * 2.1);
    const bush = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.9), roofGreenMat);
    bush.position.set(3.2, dcTerraceY + 0.78, -33.1 + b * 2.1);
    dcTerraceGroup.add(planter, bush);
  }
  markHideInRT(dcTerraceGroup);
  diverCityGroup.add(dcTerraceGroup);
  ctxGroup.add(diverCityGroup);

  // 2C. Andromède (Lot B3.3 — Atelier Stéphane Fernandez / SA Mont-Blanc, 1 Rue du Jura)
  // East/NE side of Îlot B3: 75 social units across offset/carved stepped 6–8 story volumes + rooftop PV
  const andromedeGroup = new THREE.Group();
  andromedeGroup.name = 'andromede-b33';

  const androNorth = buildSchematicResidence({
    name: 'andromede-north-tower',
    x: 45.5,
    z: -36.5,
    w: 19.0,
    d: 16.0,
    floors: 8,
    groundY,
    facadeMat: warmStoneMat,
    trimMat: trimConcreteMat,
    glassMat: neighborGlassMat,
    woodMat: timberFacadeMat,
    roofMat: roofGravelMat,
    pvMat: pvPanelMat,
    activeGround: true,
    pvPanels: true,
    hideInRT: true
  });
  const androMid = buildSchematicResidence({
    name: 'andromede-mid-step',
    x: 47.5,
    z: -16.5,
    w: 15.0,
    d: 18.0,
    floors: 6,
    groundY,
    facadeMat: warmStoneMat,
    trimMat: trimConcreteMat,
    glassMat: neighborGlassMat,
    woodMat: timberFacadeMat,
    roofMat: roofGreenMat,
    pvMat: pvPanelMat,
    pvPanels: true,
    hideInRT: true
  });
  const androSouth = buildSchematicResidence({
    name: 'andromede-south-step',
    x: 43.5,
    z: 2.5,
    w: 17.0,
    d: 14.0,
    floors: 7,
    groundY,
    facadeMat: warmStoneMat,
    trimMat: trimConcreteMat,
    glassMat: neighborGlassMat,
    woodMat: timberFacadeMat,
    roofMat: roofGravelMat,
    pvMat: pvPanelMat,
    activeGround: true,
    pvPanels: true,
    hideInRT: true
  });
  andromedeGroup.add(androNorth.group, androMid.group, androSouth.group);
  ctxGroup.add(andromedeGroup);

  /* =====================================================================
   * 3. PLACE ROSA PARKS (EX-PLACE DU JURA — 2,620 m² CENTRAL PLAZA)
   * ===================================================================== */
  const plazaGroup = new THREE.Group();
  plazaGroup.name = 'place-rosa-parks';

  const plazaSlab = new THREE.Mesh(
    new THREE.BoxGeometry(44, 0.14, 44),
    new THREE.MeshStandardMaterial({ color: '#DCD6CA', roughness: 0.86 })
  );
  plazaSlab.position.set(-59.0, groundY + 0.07, -30.5);
  plazaSlab.receiveShadow = true;
  plazaGroup.add(plazaSlab);

  // Dry misting fountain (fontaine sèche 24 jets) in center of Place Rosa Parks
  const fountainPlate = new THREE.Mesh(
    new THREE.BoxGeometry(10.5, 0.16, 7.5),
    new THREE.MeshStandardMaterial({ color: '#B4BCC2', roughness: 0.35, metalness: 0.15 })
  );
  fountainPlate.position.set(-58.0, groundY + 0.08, -30.5);
  plazaGroup.add(fountainPlate);

  // Subtle architectural shade canopies (marquises) on café/QG de l'Étoile terraces
  for (const [mx, mz, mw, md] of [[-38.5, -24.5, 3.6, 12.0], [-77.5, -34.0, 3.6, 11.0]]) {
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(mw, 0.12, md), steelMat);
    canopy.position.set(mx, groundY + 3.45, mz);
    plazaGroup.add(canopy);
  }
  markHideInRT(plazaGroup);
  ctxGroup.add(plazaGroup);

  /* =====================================================================
   * 4. LE JARDIN FERROVIAIRE (~2 ha LINEAR PARK) + VOIE VERTE GRAND GENÈVE
   * ===================================================================== */
  const parkGroup = new THREE.Group();
  parkGroup.name = 'jardin-ferroviaire';

  const parkGrassMat = new THREE.MeshStandardMaterial({ color: '#789460', roughness: 0.96 });
  const parkMeadowMat = new THREE.MeshStandardMaterial({ color: '#8FA26D', roughness: 0.96 });
  const voieVerteMat = new THREE.MeshStandardMaterial({ map: voieVerteTex, roughness: 0.90 });
  const sportCourtMat = new THREE.MeshStandardMaterial({ color: '#B97A5D', roughness: 0.92 });
  const playgroundSandMat = new THREE.MeshStandardMaterial({ color: '#D6C5A5', roughness: 0.95 });

  // Main 2-hectare linear park carpet running WSW-ENE along north edge of railway
  const parkBase = new THREE.Mesh(new THREE.BoxGeometry(250, 0.14, 30.0), parkGrassMat);
  parkBase.position.set(8, groundY + 0.07, 43.5);
  parkBase.receiveShadow = true;
  parkGroup.add(parkBase);

  // Vegetated meadow strips & gentle landscaped berms
  for (const [bx, bz, bw, bd] of [
    [-58, 38, 36, 11], [-8, 48, 42, 10], [42, 39, 34, 11], [86, 47, 30, 10]
  ]) {
    const meadow = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.22, bd), parkMeadowMat);
    meadow.position.set(bx, groundY + 0.11, bz);
    parkGroup.add(meadow);
  }

  // Voie Verte du Grand Genève / ViaRhôna (distinct warm ochre greenway path)
  const voieVerte1 = new THREE.Mesh(new THREE.BoxGeometry(255, 0.18, 3.8), voieVerteMat);
  voieVerte1.position.set(8, groundY + 0.09, 34.5);
  const voieVerteLink = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.18, 22.0), voieVerteMat);
  voieVerteLink.position.set(-32.0, groundY + 0.09, 44.5);
  parkGroup.add(voieVerte1, voieVerteLink);

  // City-Stade multi-sport court (schematic terracotta court + slim goal frames)
  const cityStade = new THREE.Mesh(new THREE.BoxGeometry(16.0, 0.20, 9.5), sportCourtMat);
  cityStade.position.set(16.0, groundY + 0.10, 44.5);
  const courtBorder = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.14, 10.0), sidewalkMat);
  courtBorder.position.set(16.0, groundY + 0.07, 44.5);
  parkGroup.add(courtBorder, cityStade);

  // Children's playground (aire de jeux inaugurée Oct 2026 — schematic wood play deck)
  const playgroundPad = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.19, 9.0), playgroundSandMat);
  playgroundPad.position.set(-6.0, groundY + 0.095, 43.0);
  const playTower = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 2.2), woodAccentMat);
  playTower.position.set(-8.5, groundY + 1.65, 43.0);
  const playBridge = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 1.2), woodAccentMat);
  playBridge.position.set(-5.2, groundY + 1.6, 43.0);
  parkGroup.add(playgroundPad, playTower, playBridge);

  markHideInRT(parkGroup);
  ctxGroup.add(parkGroup);

  /* =====================================================================
   * 5. LÉMAN EXPRESS / SNCF RAILWAY CORRIDOR + PASSERELLE D&A
   * ===================================================================== */
  const railGroup = new THREE.Group();
  railGroup.name = 'railway-corridor';

  const ballastMat = new THREE.MeshStandardMaterial({ map: ballastTex, roughness: 0.96 });
  const ballastBed = new THREE.Mesh(new THREE.BoxGeometry(310, 0.26, 15.0), ballastMat);
  ballastBed.position.set(10, groundY + 0.13, 66.5);
  railGroup.add(ballastBed);

  // Twin Léman Express tracks (4 steel rails)
  for (const rz of [62.5, 64.0, 68.5, 70.0]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(310, 0.16, 0.12), darkRailMat);
    rail.position.set(10, groundY + 0.34, rz);
    railGroup.add(rail);
  }

  // Schematic catenary gantries every 34 m
  for (let gx = -120; gx <= 130; gx += 34) {
    const pN = new THREE.Mesh(new THREE.BoxGeometry(0.24, 6.4, 0.24), steelMat);
    pN.position.set(gx, groundY + 3.2, 59.5);
    const pS = new THREE.Mesh(new THREE.BoxGeometry(0.24, 6.4, 0.24), steelMat);
    pS.position.set(gx, groundY + 3.2, 73.5);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.22, 14.4), steelMat);
    cross.position.set(gx, groundY + 6.1, 66.5);
    railGroup.add(pN, pS, cross);
  }
  markHideInRT(railGroup);
  ctxGroup.add(railGroup);

  // Passerelle Piétons / Vélos (Devillers & Associés — spanning over railway at X ≈ -32)
  const passerelleGroup = new THREE.Group();
  passerelleGroup.name = 'passerelle-etoile';

  const deckY = groundY + 6.8;
  const deckMat = new THREE.MeshStandardMaterial({ color: '#D8DDE0', roughness: 0.45, metalness: 0.45 });
  const glassTowerMat = new THREE.MeshStandardMaterial({
    color: '#9CB4C4',
    roughness: 0.18,
    metalness: 0.25,
    transparent: true,
    opacity: 0.65
  });

  // Main sculptural span over tracks (slight architectural crank / déhanchement)
  const span1 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.48, 22.0), deckMat);
  span1.position.set(-32.0, deckY, 64.0);
  const span2 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.48, 16.0), deckMat);
  span2.position.set(-30.5, deckY, 79.5);
  span2.rotation.y = 0.16;
  // Side architectural steel parapets
  for (const sx of [-2.0, 2.0]) {
    const railSide = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.25, 22.0), steelMat);
    railSide.position.set(-32.0 + sx, deckY + 0.85, 64.0);
    passerelleGroup.add(railSide);
  }
  // North (Jardin Ferroviaire) & South (Annemasse) glazed elevator/stair towers + approach ramps
  for (const [tx, tz] of [[-32.0, 53.5], [-29.0, 86.5]]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(3.8, 9.6, 3.8), glassTowerMat);
    tower.position.set(tx, groundY + 4.8, tz);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.35, 4.0), steelMat);
    frame.position.set(tx, groundY + 9.6, tz);
    passerelleGroup.add(tower, frame);
  }
  const rampN = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 16.0), deckMat);
  rampN.position.set(-38.0, groundY + 3.6, 52.5);
  rampN.rotation.z = -0.36;
  rampN.rotation.y = Math.PI / 2;
  passerelleGroup.add(span1, span2, rampN);
  markHideInRT(passerelleGroup);
  ctxGroup.add(passerelleGroup);

  /* =====================================================================
   * 6. SURROUNDING ÉCOQUARTIER BUILDINGS (AMBILLY & ANNEMASSE GARE)
   * ===================================================================== */
  const neighborsGroup = new THREE.Group();
  neighborsGroup.name = 'etoile-surrounding-lots';

  const surroundingSpecs = [
    // Constellation & Naos (Lot C5.1 — JBMN & SUB Architectes, 3 stepped blocks SW across Rue de la Fraternité)
    { name: 'constellation-1', x: -46, z: 6,   w: 14, d: 13, floors: 4, facadeMat: coolConcreteMat, deepLoggias: true, activeGround: true },
    { name: 'constellation-2', x: -64, z: 10,  w: 15, d: 12, floors: 5, facadeMat: coolConcreteMat, deepLoggias: true },
    { name: 'naos-3',          x: -50, z: -10, w: 13, d: 11, floors: 5, facadeMat: paleConcreteMat, pvPanels: true },

    // Archipel (Lot C9 — BAMAA & Hardel Le Bihan / Bouygues Immobilier, timber-structured volumes West of Place Rosa Parks)
    { name: 'archipel-1',      x: -91, z: -18, w: 15, d: 16, floors: 5, facadeMat: paleConcreteMat, timberUpper: true, activeGround: true },
    { name: 'archipel-2',      x: -93, z: -38, w: 16, d: 15, floors: 6, facadeMat: paleConcreteMat, timberUpper: true, pvPanels: true },

    // ICONE (Lot C10 — Nicolas Hugoo / Bouygues Immobilier, U-shaped tinted concrete & timber overlooking Place Rosa Parks North)
    { name: 'icone-west',      x: -70, z: -69, w: 12, d: 18, floors: 5, facadeMat: tintedMineralMat, timberUpper: true, activeGround: true },
    { name: 'icone-north',     x: -54, z: -74, w: 22, d: 10, floors: 6, facadeMat: tintedMineralMat, pvPanels: true },
    { name: 'icone-east',      x: -40, z: -68, w: 11, d: 16, floors: 5, facadeMat: tintedMineralMat, timberUpper: true },

    // Campus de l'Étoile (IFPS / Grand Forma — Dietmar Feichtinger, 5 Cours Gisèle Halimi)
    { name: 'campus-etoile',   x: -97, z: -66, w: 24, d: 18, floors: 5, facadeMat: timberFacadeMat, timberUpper: true, activeGround: true, pvPanels: true },

    // Le Mimèsis (Haute-Savoie Habitat / Cathrin Trebeljahr) & Artéo (Halpades / Atelier Martel — Lot C8, East of Rue du Jura)
    { name: 'mimesis-c8',      x: 78,  z: -34, w: 18, d: 14, floors: 5, facadeMat: paleConcreteMat, pvPanels: true },
    { name: 'arteo-c8',        x: 78,  z: -14, w: 16, d: 15, floors: 5, facadeMat: tintedMineralMat },

    // LOCO (Lot A1 — Giboire / WOA / TVK / Archiplein, East along Av. Marguerite Yourcenar facing Jardin Ferroviaire)
    { name: 'loco-timber',     x: 78,  z: 7,   w: 18, d: 14, floors: 6, facadeMat: paleConcreteMat, timberUpper: true, activeGround: true, pvPanels: true },
    { name: 'loco-stone',      x: 100, z: 6,   w: 16, d: 15, floors: 5, facadeMat: warmStoneMat },

    // École de la Fraternité (low-rise civic school pavilion near East Jardin Ferroviaire)
    { name: 'ecole-fraternite', x: 76, z: 38,  w: 22, d: 12, floors: 2, floorH: 3.1, groundH: 3.4, facadeMat: warmStoneMat },

    // Annemasse Gare Sector (South of railway tracks — mid-distance skyline)
    { name: 'quai-n4',         x: -26, z: 98,  w: 20, d: 14, floors: 6, facadeMat: coolConcreteMat, timberUpper: true, activeGround: true },
    { name: 'le-hub-1',        x: 68,  z: 96,  w: 16, d: 14, floors: 6, facadeMat: coolConcreteMat, pvPanels: true },
    { name: 'le-hub-2',        x: 88,  z: 100, w: 15, d: 14, floors: 5, facadeMat: paleConcreteMat },
    { name: 'halle-taponnier', x: -62, z: 92,  w: 34, d: 14, floors: 2, floorH: 3.4, groundH: 4.0, facadeMat: coolConcreteMat }
  ];

  surroundingSpecs.forEach((spec) => {
    const built = buildSchematicResidence({
      ...spec,
      groundY,
      trimMat: trimConcreteMat,
      glassMat: neighborGlassMat,
      woodMat: timberFacadeMat,
      roofMat: spec.pvPanels ? roofGravelMat : roofGreenMat,
      pvMat: pvPanelMat,
      hideInRT: true
    });
    neighborsGroup.add(built.group);
  });

  // Iconic Hôtel Novotel Annemasse Centre (6-story mineral grid + reflective metallic Rooftop 46 crown)
  const novotel = buildSchematicResidence({
    name: 'novotel-annemasse',
    x: 42,
    z: 96,
    w: 20,
    d: 15,
    floors: 6,
    groundY,
    facadeMat: paleConcreteMat,
    trimMat: trimConcreteMat,
    glassMat: neighborGlassMat,
    woodMat: timberFacadeMat,
    roofMat: roofGravelMat,
    activeGround: true,
    hideInRT: true
  });
  const novotelCrown = new THREE.Mesh(new THREE.BoxGeometry(17.5, 3.6, 12.8), novotelCrownMat);
  novotelCrown.position.set(42, groundY + novotel.totalH + 2.0, 96);
  novotelCrown.userData.hideInRT = true;
  neighborsGroup.add(novotel.group, novotelCrown);

  // Nouvelle Gare d'Annemasse (canopy + glazed hall facing railway tracks)
  const gareGroup = new THREE.Group();
  gareGroup.name = 'gare-annemasse';
  const gareHall = new THREE.Mesh(new THREE.BoxGeometry(34, 6.2, 11), coolConcreteMat);
  gareHall.position.set(8, groundY + 3.1, 86);
  const gareCanopy = new THREE.Mesh(new THREE.BoxGeometry(44, 0.45, 16), steelMat);
  gareCanopy.position.set(8, groundY + 6.9, 83);
  gareGroup.add(gareHall, gareCanopy);
  markHideInRT(gareGroup);
  neighborsGroup.add(gareGroup);

  ctxGroup.add(neighborsGroup);

  /* =====================================================================
   * 7. INSTANCED URBAN TREES & TRAME NOIRE PEDESTRIAN BOLLARDS
   * ===================================================================== */
  const treesGroup = new THREE.Group();
  treesGroup.name = 'etoile-trees';

  // [x, z, heightM, canopyColorIdx]
  // Carefully positioned across Atelier LJN courtyard, Av. Marguerite Yourcenar,
  // pedestrian venelle (leaving Ch3's window sightline to DiverCity clear!),
  // Rue de la Fraternité, Place Rosa Parks, and Jardin Ferroviaire.
  const treeList = [
    // Atelier LJN Cœur d'Îlot (North of Cassiopée — lush multi-stem grove)
    [4.5, -8.5, 9.2, 0],  [10.8, -12.5, 10.4, 1], [15.5, -7.2, 8.6, 2],
    [22.5, -9.8, 10.8, 0], [28.5, -14.5, 9.6, 1], [33.5, -8.5, 10.2, 2],
    [13.5, -21.5, 9.8, 1], [22.0, -24.5, 11.0, 0], [30.5, -26.5, 9.4, 2],
    [28.0, -33.0, 10.0, 0], [36.0, -21.0, 8.8, 1],
    // Avenue Marguerite Yourcenar & Venelle / Rue de la Fraternité street trees
    [-16.0, 14.2, 8.4, 1], [-2.5, 14.2, 8.4, 0], [9.5, 14.2, 8.8, 1], [23.0, 14.2, 8.6, 2], [38.0, 14.2, 9.0, 0], [54.0, 14.2, 8.5, 1],
    [-5.8, 9.2, 8.2, 1], [-5.8, -9.2, 8.8, 0], [-5.8, -19.5, 9.0, 2], [-25.5, -20.5, 8.8, 1], [-35.8, -1.5, 8.8, 1], [-35.8, 10.5, 8.4, 0],
    // Place Rosa Parks urban grove (~50 trees theme represented cleanly)
    [-40.0, -14.5, 8.8, 0], [-48.0, -14.5, 9.4, 1], [-66.0, -14.5, 8.6, 2], [-74.0, -16.5, 9.2, 0],
    [-41.5, -42.5, 9.0, 1], [-50.0, -45.0, 9.6, 0], [-64.0, -45.5, 8.8, 2], [-73.5, -43.0, 9.2, 1],
    [-74.5, -27.0, 8.5, 0], [-41.0, -32.0, 8.2, 2],
    // Le Jardin Ferroviaire linear park (spaced & kept <= 10.2m so Mont Salève shines!)
    [-72.0, 32.0, 9.2, 0], [-56.0, 44.0, 9.8, 1], [-42.0, 38.0, 8.6, 2],
    [-24.0, 41.0, 9.4, 0], [-14.0, 50.0, 8.8, 1], [3.5, 39.5, 9.2, 2],
    [6.5, 51.0, 9.6, 0], [28.0, 38.5, 9.0, 1], [34.0, 50.0, 9.8, 2],
    [48.0, 42.0, 9.2, 0], [62.0, 48.5, 9.4, 1], [84.0, 40.0, 9.6, 2]
  ];

  const trunkMat = new THREE.MeshStandardMaterial({ color: '#644E3C', roughness: 0.94 });
  const leafColors = ['#5B7A4A', '#6D8D57', '#4D6A3E'];
  const trunkInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.30, 1, 7), trunkMat, treeList.length);
  const crownGeo = new THREE.DodecahedronGeometry(1, 1);

  const leafInsts = leafColors.map((col, ci) => {
    const count = treeList.filter((t) => t[3] === ci).length * 2;
    return new THREE.InstancedMesh(
      crownGeo,
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.88 }),
      Math.max(1, count)
    );
  });
  const leafCursors = [0, 0, 0];

  treeList.forEach(([tx, tz, th, ci], i) => {
    // Trunk
    dummy.position.set(tx, groundY + th * 0.27, tz);
    dummy.rotation.set(0, (i * 1.1) % Math.PI, 0);
    dummy.scale.set(1, th * 0.54, 1);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);

    // Primary organic canopy lobe
    const r1 = th * 0.28;
    dummy.position.set(tx, groundY + th * 0.70, tz);
    dummy.rotation.set(0.2, i * 0.9, 0.1);
    dummy.scale.set(r1 * 1.08, r1 * 0.92, r1 * 1.02);
    dummy.updateMatrix();
    leafInsts[ci].setMatrixAt(leafCursors[ci]++, dummy.matrix);

    // Secondary offset canopy lobe for natural silhouette
    const r2 = th * 0.20;
    const ang = i * 2.1;
    dummy.position.set(tx + Math.cos(ang) * r1 * 0.48, groundY + th * 0.81, tz + Math.sin(ang) * r1 * 0.48);
    dummy.scale.set(r2, r2 * 0.88, r2);
    dummy.updateMatrix();
    leafInsts[ci].setMatrixAt(leafCursors[ci]++, dummy.matrix);
  });
  trunkInst.instanceMatrix.needsUpdate = true;
  leafInsts.forEach((inst) => { inst.instanceMatrix.needsUpdate = true; });
  treesGroup.add(trunkInst, ...leafInsts);
  markHideInRT(treesGroup);
  ctxGroup.add(treesGroup);

  // Subtle Trame Noire low-glare pedestrian light bollards along paths, venelle & Rue de la Fraternité
  const bollardCoords = [
    [-16.0, 12.2], [-4.2, 12.2], [5.5, 12.2], [16.5, 12.2], [28.0, 12.2],
    [-4.2, 2.0], [-4.2, -9.0], [17.5, -6.0], [17.5, -16.0],
    [-16.0, 32.5], [2.0, 32.5], [20.0, 32.5], [-50.0, -24.0], [-64.0, -34.0]
  ];
  const bollardPostInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.09, 0.95, 6), darkRailMat, bollardCoords.length);
  const bollardHeadInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.085, 0.085, 0.16, 6), bollardGlowMat, bollardCoords.length);
  bollardCoords.forEach(([bx, bz], i) => {
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.position.set(bx, groundY + 0.56, bz);
    dummy.updateMatrix();
    bollardPostInst.setMatrixAt(i, dummy.matrix);
    dummy.position.set(bx, groundY + 1.02, bz);
    dummy.updateMatrix();
    bollardHeadInst.setMatrixAt(i, dummy.matrix);
  });
  bollardPostInst.instanceMatrix.needsUpdate = true;
  bollardHeadInst.instanceMatrix.needsUpdate = true;
  const bollardsGroup = new THREE.Group();
  bollardsGroup.name = 'trame-noire-bollards';
  bollardsGroup.add(bollardPostInst, bollardHeadInst);
  markHideInRT(bollardsGroup);
  ctxGroup.add(bollardsGroup);

  /* =====================================================================
   * 8. 3D FACETED ALPINE PANORAMA (SALÈVE, JURA, VOIRONS & MONT-BLANC)
   * ===================================================================== */
  const alpineGroup = new THREE.Group();
  alpineGroup.name = 'alpine-horizon';

  const saleveMat = new THREE.MeshStandardMaterial({ color: '#7D8D9B', roughness: 0.94, flatShading: true });
  const juraMat = new THREE.MeshStandardMaterial({ color: '#8C9BA9', roughness: 0.95, flatShading: true });
  const voironsMat = new THREE.MeshStandardMaterial({ color: '#8395A2', roughness: 0.95, flatShading: true });
  const montBlancMat = new THREE.MeshStandardMaterial({ color: '#D7E0EA', roughness: 0.90, flatShading: true });

  // Mont Salève (~6 km SSW): iconic broad flat-topped limestone escarpment!
  const saleve = buildAlpineRidge3D([
    [-165, 0.0], [-135, 0.28], [-100, 0.62], [-65, 0.88], [-30, 0.98],
    [0, 1.00], [32, 0.95], [64, 0.84], [96, 0.56], [130, 0.24], [165, 0.0]
  ], { depth: 52, heightScale: 38, material: saleveMat, ridgeShiftZ: 6 });
  saleve.position.set(-10, groundY - 2, 188);
  saleve.rotation.y = Math.PI + 0.14;
  alpineGroup.add(saleve);

  // Massif du Jura (distant blue-grey ridge across Lake Geneva to WNW / NW)
  const jura = buildAlpineRidge3D([
    [-175, 0.0], [-125, 0.35], [-75, 0.68], [-25, 0.80], [20, 0.76],
    [70, 0.58], [120, 0.30], [170, 0.0]
  ], { depth: 46, heightScale: 26, material: juraMat });
  jura.position.set(-185, groundY - 2, -55);
  jura.rotation.y = Math.PI / 2 - 0.24;
  alpineGroup.add(jura);

  // Massif des Voirons (ENE pre-Alps ridge)
  const voirons = buildAlpineRidge3D([
    [-160, 0.0], [-105, 0.45], [-50, 0.82], [0, 0.94], [55, 0.76], [110, 0.38], [160, 0.0]
  ], { depth: 48, heightScale: 32, material: voironsMat });
  voirons.position.set(192, groundY - 2, -18);
  voirons.rotation.y = -Math.PI / 2 + 0.08;
  alpineGroup.add(voirons);

  // Distant Mont-Blanc snowy massif peak silhouette (ESE horizon)
  const montBlanc = buildAlpineRidge3D([
    [-75, 0.0], [-45, 0.42], [-18, 0.78], [0, 1.00], [22, 0.82], [50, 0.46], [80, 0.0]
  ], { depth: 36, heightScale: 42, material: montBlancMat });
  montBlanc.position.set(175, groundY - 1, 138);
  montBlanc.rotation.y = -Math.PI * 0.72;
  alpineGroup.add(montBlanc);

  ctxGroup.add(alpineGroup);

  return {
    group: ctxGroup,
    updateAtmosphere(sunData) {
      const nightFactor = sunData.isNight ? 1.0 : (sunData.isTwilight ? 0.55 : 0.0);
      neighborGlassMat.emissiveIntensity = nightFactor * 0.48;
      bollardGlowMat.emissiveIntensity = nightFactor * 1.45;

      // Atmospheric perspective tinting synced to live Ambilly sky horizon
      saleveMat.color.copy(sunData.skyHorizon).lerp(new THREE.Color('#475666'), sunData.isNight ? 0.84 : 0.46);
      juraMat.color.copy(sunData.skyHorizon).lerp(new THREE.Color('#556678'), sunData.isNight ? 0.85 : 0.40);
      voironsMat.color.copy(sunData.skyHorizon).lerp(new THREE.Color('#4D5E6E'), sunData.isNight ? 0.84 : 0.43);
      montBlancMat.color.copy(sunData.skyHorizon).lerp(
        sunData.isNight ? new THREE.Color('#394659') : new THREE.Color('#E8EEF5'),
        sunData.isNight ? 0.80 : 0.52
      );
    }
  };
}
