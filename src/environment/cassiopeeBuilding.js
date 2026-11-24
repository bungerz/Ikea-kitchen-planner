import * as THREE from 'three';
import { AMBILLY_LOCATION } from './ambillySun.js';
import { getExteriorConcreteTextures } from '../builders/textures.js';
import { buildEtoileContext } from './etoileContext.js';

/* =========================================================================
 * RÉSIDENCE CASSIOPÉE (LOT B3.2 · CLÉMENT VERGÉLY ARCHITECTES · SA MONT-BLANC)
 * & ZAC DE L'ÉTOILE AMBILLY ÉCOQUARTIER CONTEXT
 * 7 rue de la Fraternité, 74100 Ambilly (46.1941° N, 6.2230° E)
 *
 * - Lot 17 floor slab sits at y = 0.0 m (= +11.6 m above Rue de la Fraternité)
 * - Alternating smooth (bandeaux lisses) & rough (béton rugueux) pale concrete
 * - Warm natural wood window frames (menuiseries extérieures châssis bois)
 * - Genuine stacked recessed SW loggias on R+1..R+3 directly beneath Lot 17
 * - Stepped setbacks (retraits successifs) with rooftop PV solar & beehives
 * - Full schematic ZAC de l'Étoile masterplan via buildEtoileContext()
 * - Dynamic physical Sky Dome shader synchronized to live Ambilly NOAA sun
 * ========================================================================= */

const GROUND_Y = -AMBILLY_LOCATION.floorHeightM; // -11.6 m

export function buildCassiopeeEnvironment(scene) {
  const envGroup = new THREE.Group();
  envGroup.name = 'cassiopee-ambilly-r4';
  scene.add(envGroup);

  /* =====================================================================
   * 1. DYNAMIC PHYSICAL SKY DOME SHADER (LIVE AMBILLY SUN DISC + HORIZON)
   * ===================================================================== */
  const skyUniforms = {
    uZenith:  { value: new THREE.Color('#4D88D1') },
    uHorizon: { value: new THREE.Color('#E0EBF5') },
    uGround:  { value: new THREE.Color('#B8B6AE') },
    uSunDir:  { value: new THREE.Vector3(-0.5, 0.5, 0.7).normalize() },
    uSunCol:  { value: new THREE.Color('#FFF4DE') },
    uSunVis:  { value: 1.0 }
  };

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: skyUniforms,
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uZenith;
      uniform vec3 uHorizon;
      uniform vec3 uGround;
      uniform vec3 uSunDir;
      uniform vec3 uSunCol;
      uniform float uSunVis;
      varying vec3 vWorldDir;
      void main() {
        vec3 d = normalize(vWorldDir);
        float h = d.y;
        vec3 col = h >= 0.0
          ? mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.52))
          : mix(uHorizon, uGround, pow(clamp(-h * 3.5, 0.0, 1.0), 0.65));

        float sunDot = max(0.0, dot(d, normalize(uSunDir)));
        float halo = pow(sunDot, 10.0) * 0.28 * uSunVis;
        float disc = smoothstep(0.9982, 0.9994, sunDot) * 2.2 * uSunVis;
        col += uSunCol * (halo + disc);
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(340, 32, 20), skyMat);
  skyDome.position.set(5.6, 0, 5.6);
  // CRITICAL for WebGL2 GPU Path Tracing: ShaderMaterial sky sphere must be hidden in BVH
  // so it never occludes HDR ProceduralEquirectTexture sky & real Ambilly sunlight!
  skyDome.userData.hideInRT = true;
  envGroup.add(skyDome);

  /* =====================================================================
   * 2. RÉSIDENCE CASSIOPÉE (LOT B3.2 — CLÉMENT VERGÉLY ARCHITECTES)
   * Alternating smooth floor bands & rough/bush-hammered mineral concrete,
   * warm wood window frames (châssis bois), recessed stacked SW loggias,
   * and stepped upper setbacks (retraits successifs) with PV solar panels.
   * ===================================================================== */
  const cassiopeeGroup = new THREE.Group();
  cassiopeeGroup.name = 'cassiopee-b32';
  envGroup.add(cassiopeeGroup);

  const roughTex = getExteriorConcreteTextures('rough', 3, 2);
  const smoothTex = getExteriorConcreteTextures('smooth', 3, 1);

  const roughConcreteMat = new THREE.MeshStandardMaterial({
    map: roughTex.map,
    normalMap: roughTex.normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    color: '#DDD7CC',
    roughness: 0.92,
    metalness: 0.01
  });
  const smoothConcreteMat = new THREE.MeshStandardMaterial({
    map: smoothTex.map,
    normalMap: smoothTex.normalMap,
    normalScale: new THREE.Vector2(0.28, 0.28),
    color: '#E6E1D7',
    roughness: 0.74,
    metalness: 0.02
  });
  const woodFrameMat = new THREE.MeshStandardMaterial({ color: '#9D7B56', roughness: 0.68, metalness: 0.02 });
  const darkRailMat = new THREE.MeshStandardMaterial({ color: '#393D42', roughness: 0.42, metalness: 0.62 });
  const loggiaDeckMat = new THREE.MeshStandardMaterial({ color: '#BFA789', roughness: 0.84 });
  const loggiaSoffitMat = new THREE.MeshStandardMaterial({ color: '#E2DDD4', roughness: 0.88 });
  const pvPanelMat = new THREE.MeshStandardMaterial({ color: '#223246', roughness: 0.22, metalness: 0.56 });
  const greenRoofMat = new THREE.MeshStandardMaterial({ color: '#7D9566', roughness: 0.95 });
  const beehiveMat = new THREE.MeshStandardMaterial({ color: '#D4B47C', roughness: 0.82 });

  const windowGlassMat = new THREE.MeshStandardMaterial({
    color: '#3D4854',
    roughness: 0.18,
    metalness: 0.42,
    emissive: new THREE.Color('#FFD292'),
    emissiveIntensity: 0.0
  });
  const lobbyGlassMat = new THREE.MeshStandardMaterial({
    color: '#4E5B66',
    roughness: 0.16,
    metalness: 0.35,
    emissive: new THREE.Color('#FFDB9E'),
    emissiveIntensity: 0.0
  });

  // Floor level elevations below Lot 17 slab bottom (y = -0.14):
  // RDC: -11.60 -> -8.24 (3.36 m civic plinth)
  // R+1: -8.24  -> -5.54 (2.70 m)
  // R+2: -5.54  -> -2.84 (2.70 m)
  // R+3: -2.84  -> -0.14 (2.70 m)
  const floorTops = [-8.24, -5.54, -2.84, -0.14];
  const floorBottoms = [GROUND_Y, -8.24, -5.54, -2.84];
  const buildingH = Math.abs(GROUND_Y) - 0.14; // 11.46 m

  // 2A. Main structural core directly beneath Lot 17 (leaving SW Loggia X=0..5.27, Z=8.75..11.25 genuinely recessed!)
  // Core A: main living/kitchen/hall/SDB/WC block (X=0..11.37, Z=2.86..8.75)
  const coreMain = new THREE.Mesh(new THREE.BoxGeometry(11.37, buildingH, 5.89), roughConcreteMat);
  coreMain.position.set(11.37 / 2, -0.14 - buildingH / 2, 2.86 + 5.89 / 2);
  coreMain.receiveShadow = true;
  coreMain.castShadow = true;
  cassiopeeGroup.add(coreMain);

  // Core B: South-East bedrooms wing (X=5.27..11.37, Z=8.75..11.25)
  const coreSE = new THREE.Mesh(new THREE.BoxGeometry(6.10, buildingH, 2.50), roughConcreteMat);
  coreSE.position.set(5.27 + 6.10 / 2, -0.14 - buildingH / 2, 8.75 + 2.50 / 2);
  coreSE.receiveShadow = true;
  coreSE.castShadow = true;
  cassiopeeGroup.add(coreSE);

  // Core C: North-West Chambre 3 wing (X=0..5.97, Z=0..2.86)
  const coreNW = new THREE.Mesh(new THREE.BoxGeometry(5.97, buildingH, 2.86), roughConcreteMat);
  coreNW.position.set(5.97 / 2, -0.14 - buildingH / 2, 2.86 / 2);
  coreNW.receiveShadow = true;
  coreNW.castShadow = true;
  cassiopeeGroup.add(coreNW);

  // Ground-floor covered pedestrian entrance porch & glazed hall (SW corner under loggias)
  const rdcLobbyBack = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.05, 0.22), lobbyGlassMat);
  rdcLobbyBack.position.set(2.7, GROUND_Y + 1.56, 8.85);
  const rdcCornerPier = new THREE.Mesh(new THREE.BoxGeometry(0.42, buildingH, 0.42), smoothConcreteMat);
  rdcCornerPier.position.set(0.21, -0.14 - buildingH / 2, 11.04);
  rdcCornerPier.castShadow = true;
  cassiopeeGroup.add(rdcLobbyBack, rdcCornerPier);

  // Stacked genuine recessed SW loggias on R+1, R+2, R+3 directly below Lot 17's loggia!
  for (let fl = 1; fl <= 3; fl++) {
    const yBot = floorBottoms[fl];
    const yTop = floorTops[fl];
    const hFl = yTop - yBot;

    // Loggia floor slab + timber/mineral paving
    const slab = new THREE.Mesh(new THREE.BoxGeometry(5.32, 0.22, 2.52), smoothConcreteMat);
    slab.position.set(2.66, yBot + 0.11, 10.00);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.95, 0.05, 2.28), loggiaDeckMat);
    deck.position.set(2.68, yBot + 0.24, 9.96);
    const soffit = new THREE.Mesh(new THREE.BoxGeometry(5.10, 0.05, 2.40), loggiaSoffitMat);
    soffit.position.set(2.66, yTop - 0.04, 9.98);

    // South & West concrete parapets (1.05 m) + slim dark architectural steel handrails
    const parapetS = new THREE.Mesh(new THREE.BoxGeometry(5.28, 1.02, 0.15), roughConcreteMat);
    parapetS.position.set(2.64, yBot + 0.72, 11.17);
    const railS = new THREE.Mesh(new THREE.BoxGeometry(5.32, 0.04, 0.06), darkRailMat);
    railS.position.set(2.64, yBot + 1.25, 11.17);

    const parapetW = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.02, 2.45), roughConcreteMat);
    parapetW.position.set(0.08, yBot + 0.72, 9.98);
    const railW = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 2.48), darkRailMat);
    railW.position.set(0.08, yBot + 1.25, 9.98);

    // Recessed glazed bay doors at back of lower loggia (with wood frame)
    const backFrame = new THREE.Mesh(new THREE.BoxGeometry(4.25, hFl - 0.42, 0.10), woodFrameMat);
    backFrame.position.set(2.75, yBot + hFl * 0.50, 8.79);
    const backGlass = new THREE.Mesh(new THREE.BoxGeometry(4.02, hFl - 0.58, 0.12), windowGlassMat);
    backGlass.position.set(2.75, yBot + hFl * 0.50, 8.80);

    cassiopeeGroup.add(slab, deck, soffit, parapetS, railS, parapetW, railW, backFrame, backGlass);
  }

  // 2B. Adjacent Eastern Cassiopée Wing (X = 11.37..23.8, stepped setbacks R+4 -> R+5 -> R+6!)
  // Steps cleanly back away from Lot 17's East wall so Cutaway & sunlight remain completely clear.
  const eastBaseH = buildingH + 2.64; // Up to R+4 roof (y = +2.50)
  const eastBase = new THREE.Mesh(new THREE.BoxGeometry(12.4, eastBaseH, 10.4), roughConcreteMat);
  eastBase.position.set(11.37 + 6.2, (2.50 + GROUND_Y) / 2, 6.05);
  eastBase.receiveShadow = true;
  eastBase.castShadow = true;
  cassiopeeGroup.add(eastBase);

  // R+5 Setback on East Wing (X = 13.8..23.6, Z = 1.1..10.6, y = 2.50..5.25)
  const eastR5 = new THREE.Mesh(new THREE.BoxGeometry(9.8, 2.75, 9.5), roughConcreteMat);
  eastR5.position.set(18.7, 2.50 + 1.375, 5.85);
  eastR5.receiveShadow = true;
  eastR5.castShadow = true;
  const eastR5TerraceRail = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.0, 0.05), darkRailMat);
  eastR5TerraceRail.position.set(12.55, 3.00, 11.18);
  cassiopeeGroup.add(eastR5, eastR5TerraceRail);

  // R+6 Attic Setback on East Wing (X = 16.2..23.4, Z = 1.8..9.4, y = 5.25..7.95)
  const eastR6 = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.70, 7.6), roughConcreteMat);
  eastR6.position.set(19.8, 5.25 + 1.35, 5.60);
  eastR6.receiveShadow = true;
  const eastR6Parapet = new THREE.Mesh(new THREE.BoxGeometry(7.36, 0.45, 7.76), smoothConcreteMat);
  eastR6Parapet.position.set(19.8, 8.15, 5.60);
  const eastR6Green = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.12, 7.0), greenRoofMat);
  eastR6Green.position.set(19.8, 8.02, 5.60);
  cassiopeeGroup.add(eastR6, eastR6Parapet, eastR6Green);

  // Rooftop Photovoltaic Solar Panels & Ecological Beehives (ruches) on East Wing attic
  for (let r = 0; r < 2; r++) {
    const pv = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.08, 1.45), pvPanelMat);
    pv.position.set(19.8, 8.45, 4.1 + r * 2.4);
    pv.rotation.x = 0.25;
    cassiopeeGroup.add(pv);
  }
  for (const bz of [8.2, 8.8]) {
    const hive = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.46), beehiveMat);
    hive.position.set(17.4, 8.32, bz);
    cassiopeeGroup.add(hive);
  }

  // 2C. Clément Vergély Alternating Smooth Horizontal Cornice Bands (bandeaux lisses)
  // & Vertical Pilaster Rhythm across RDC..R+3 (plus East Wing R+4..R+6)
  floorTops.forEach((fy, idx) => {
    const bandH = idx === 0 ? 0.30 : 0.24;
    // South face cornice spanning full Cassiopée width (X = 0..23.85)
    const bandS = new THREE.Mesh(new THREE.BoxGeometry(23.95, bandH, 0.22), smoothConcreteMat);
    bandS.position.set(11.92, fy, 11.29);
    // West face cornice along Rue de la Fraternité (Z = 0..11.35)
    const bandW = new THREE.Mesh(new THREE.BoxGeometry(0.22, bandH, 11.42), smoothConcreteMat);
    bandW.position.set(-0.06, fy, 5.64);
    // North face cornices hugging exact L-shaped footprint (Ch3 wing, SDB/Entrée recess, East wing)
    const bandN1 = new THREE.Mesh(new THREE.BoxGeometry(6.15, bandH, 0.22), smoothConcreteMat);
    bandN1.position.set(2.98, fy, -0.05);
    const bandNMid = new THREE.Mesh(new THREE.BoxGeometry(5.55, bandH, 0.22), smoothConcreteMat);
    bandNMid.position.set(8.62, fy, 2.86);
    const bandNEast = new THREE.Mesh(new THREE.BoxGeometry(12.55, bandH, 0.22), smoothConcreteMat);
    bandNEast.position.set(17.62, fy, 0.80);
    cassiopeeGroup.add(bandS, bandW, bandN1, bandNMid, bandNEast);
  });

  // East Wing R+4 top cornice (y = 2.52) stays always visible; Lot 17 top cornice moves to upperFloorsGroup
  const bandEastR4S = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.24, 0.22), smoothConcreteMat);
  bandEastR4S.position.set(17.62, 2.52, 11.29);
  const bandEastR4N = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.24, 0.22), smoothConcreteMat);
  bandEastR4N.position.set(17.62, 2.52, 0.80);
  const bandEastR5 = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.24, 9.75), smoothConcreteMat);
  bandEastR5.position.set(18.7, 5.25, 5.85);
  cassiopeeGroup.add(bandEastR4S, bandEastR4N, bandEastR5);

  // Subtle vertical smooth pilasters articulating the Clément Vergély grid on lower stories
  const pilasterSpecs = [
    [-0.04, 0.30], [-0.04, 3.05], [-0.04, 5.75], [-0.04, 8.65], // West face
    [5.36, 11.27], [8.32, 11.27], [11.32, 11.27], [15.0, 11.27], [19.2, 11.27], [23.65, 11.27] // South face
  ];
  pilasterSpecs.forEach(([px, pz]) => {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.24, buildingH, 0.14), smoothConcreteMat);
    pil.position.set(px, -0.14 - buildingH / 2, pz);
    cassiopeeGroup.add(pil);
  });

  // 2D. Instanced Recessed Window Bays with Warm Natural Wood Frames (Châssis Bois)
  // Collect all lower-floor + East Wing window positions for single-batch InstancedMesh rendering
  const winSpecs = []; // { axis: 'x'|'z', x, y, z, w, h }
  for (let fl = 0; fl < 4; fl++) {
    const cy = (floorBottoms[fl] + floorTops[fl]) / 2 + (fl === 0 ? 0.15 : 0.04);
    const wh = fl === 0 ? 2.10 : 1.68;

    // West facade windows (aligned directly below Lot 17's Ch3 & Séjour windows!)
    for (const wz of [1.62, 4.55, 6.90]) {
      winSpecs.push({ axis: 'z', x: -0.02, y: cy, z: wz, w: 1.44, h: wh });
    }
    // South facade windows (aligned below Ch2, Ch1 + East Cassiopée Wing)
    for (const sx of [6.90, 9.71, 13.20, 17.10, 21.30]) {
      winSpecs.push({ axis: 'x', x: sx, y: cy, z: 11.27, w: 1.46, h: wh });
    }
    // North facade windows overlooking Atelier LJN Cœur d'Îlot garden
    for (const nx of [1.90, 4.30]) {
      winSpecs.push({ axis: 'x', x: nx, y: cy, z: -0.02, w: 1.40, h: wh });
    }
    for (const nx of [13.50, 17.60, 21.40]) {
      winSpecs.push({ axis: 'x', x: nx, y: cy, z: 0.82, w: 1.46, h: wh });
    }
  }
  // East wing R+4, R+5, R+6 windows
  for (const [cy, xs] of [
    [1.30, [13.2, 17.1, 21.3]],
    [3.92, [15.5, 19.2, 22.1]],
    [6.60, [17.8, 21.2]]
  ]) {
    const zS = cy > 5.0 ? 9.42 : (cy > 2.6 ? 10.62 : 11.27);
    const zN = cy > 5.0 ? 1.78 : (cy > 2.6 ? 1.08 : 0.82);
    for (const sx of xs) {
      winSpecs.push({ axis: 'x', x: sx, y: cy, z: zS, w: 1.50, h: 1.72 });
      winSpecs.push({ axis: 'x', x: sx, y: cy, z: zN, w: 1.42, h: 1.68 });
    }
  }

  const frameInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), woodFrameMat, winSpecs.length);
  const glassInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), windowGlassMat, winSpecs.length);
  const sillInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), smoothConcreteMat, winSpecs.length);
  const dummy = new THREE.Object3D();

  winSpecs.forEach((ws, i) => {
    const isX = ws.axis === 'x';
    dummy.rotation.set(0, 0, 0);

    // Outer wood frame (châssis bois)
    dummy.position.set(ws.x, ws.y, ws.z);
    dummy.scale.set(isX ? ws.w : 0.11, ws.h, isX ? 0.11 : ws.w);
    dummy.updateMatrix();
    frameInst.setMatrixAt(i, dummy.matrix);

    // Inner recessed double glazing
    dummy.position.set(ws.x, ws.y, ws.z);
    dummy.scale.set(isX ? ws.w - 0.16 : 0.13, ws.h - 0.16, isX ? 0.13 : ws.w - 0.16);
    dummy.updateMatrix();
    glassInst.setMatrixAt(i, dummy.matrix);

    // Smooth concrete exterior sill
    dummy.position.set(ws.x, ws.y - ws.h / 2 - 0.04, ws.z);
    dummy.scale.set(isX ? ws.w + 0.14 : 0.22, 0.08, isX ? 0.22 : ws.w + 0.14);
    dummy.updateMatrix();
    sillInst.setMatrixAt(i, dummy.matrix);
  });
  frameInst.instanceMatrix.needsUpdate = true;
  glassInst.instanceMatrix.needsUpdate = true;
  sillInst.instanceMatrix.needsUpdate = true;
  cassiopeeGroup.add(frameInst, glassInst, sillInst);

  // 2E. Toggleable Stepped Upper Floors above Lot 17 (R+5 & R+6 setbacks + PV roof)
  // Hidden by default so 3D Cutaway & 2D Plan stay 100% unobstructed; synced with Roof toggle!
  const upperFloorsGroup = new THREE.Group();
  upperFloorsGroup.name = 'cassiopee-upper-setbacks';
  upperFloorsGroup.visible = false;

  // R+4 top cornice directly over Lot 17 (only shown when Roof is ON so Cutaway stays clean!)
  const lot17BandS = new THREE.Mesh(new THREE.BoxGeometry(11.45, 0.24, 0.22), smoothConcreteMat);
  lot17BandS.position.set(5.68, 2.52, 11.29);
  const lot17BandW = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 11.42), smoothConcreteMat);
  lot17BandW.position.set(-0.06, 2.52, 5.64);
  upperFloorsGroup.add(lot17BandS, lot17BandW);

  // R+5 stepped back slightly from South loggia (X = 0..11.37, Z = 0.2..9.2, y = 2.64..5.34)
  const r5Body = new THREE.Mesh(new THREE.BoxGeometry(11.37, 2.70, 9.0), roughConcreteMat);
  r5Body.position.set(5.685, 2.64 + 1.35, 4.70);
  const r5Band = new THREE.Mesh(new THREE.BoxGeometry(11.55, 0.24, 9.20), smoothConcreteMat);
  r5Band.position.set(5.685, 5.34, 4.70);
  const r5Terrace = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.08, 1.9), loggiaDeckMat);
  r5Terrace.position.set(5.68, 2.68, 10.18);
  const r5Rail = new THREE.Mesh(new THREE.BoxGeometry(11.2, 1.0, 0.05), darkRailMat);
  r5Rail.position.set(5.68, 3.16, 11.16);

  // R+6 attic setback (X = 1.6..11.37, Z = 0.8..7.8, y = 5.34..8.04) + solar PV array
  const r6Body = new THREE.Mesh(new THREE.BoxGeometry(9.77, 2.70, 7.0), roughConcreteMat);
  r6Body.position.set(6.485, 5.34 + 1.35, 4.30);
  const r6Parapet = new THREE.Mesh(new THREE.BoxGeometry(9.95, 0.45, 7.20), smoothConcreteMat);
  r6Parapet.position.set(6.485, 8.22, 4.30);
  const r6Green = new THREE.Mesh(new THREE.BoxGeometry(9.1, 0.12, 6.4), greenRoofMat);
  r6Green.position.set(6.485, 8.08, 4.30);
  for (let p = 0; p < 2; p++) {
    const pv = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.08, 1.45), pvPanelMat);
    pv.position.set(6.5, 8.50, 3.0 + p * 2.3);
    pv.rotation.x = 0.25;
    upperFloorsGroup.add(pv);
  }
  upperFloorsGroup.add(r5Body, r5Band, r5Terrace, r5Rail, r6Body, r6Parapet, r6Green);
  upperFloorsGroup.traverse((c) => { c.userData.hideInRT = true; });
  cassiopeeGroup.add(upperFloorsGroup);

  /* =====================================================================
   * 3. FULL SCHEMATIC ZAC DE L'ÉTOILE URBAN MASTERPLAN & ALPINE HORIZON
   * ===================================================================== */
  const etoileCtx = buildEtoileContext(GROUND_Y);
  envGroup.add(etoileCtx.group);

  return {
    group: envGroup,
    upperFloorsGroup,
    updateSky(sunData) {
      skyUniforms.uZenith.value.copy(sunData.skyZenith);
      skyUniforms.uHorizon.value.copy(sunData.skyHorizon);
      skyUniforms.uSunDir.value.copy(sunData.dir);
      skyUniforms.uSunCol.value.copy(sunData.sunColor);
      skyUniforms.uSunVis.value = sunData.isNight ? 0.0 : (sunData.isTwilight ? 0.65 : 1.0);

      // Gentle twilight/night interior glow in Cassiopée lower apartments & entrance lobby
      const nightFactor = sunData.isNight ? 1.0 : (sunData.isTwilight ? 0.55 : 0.0);
      windowGlassMat.emissiveIntensity = nightFactor * 0.42;
      lobbyGlassMat.emissiveIntensity = nightFactor * 0.85;

      etoileCtx.updateAtmosphere(sunData);
    },
    setUpperFloorsVisible(v) {
      upperFloorsGroup.visible = Boolean(v);
    },
    setVisible(v) {
      envGroup.visible = Boolean(v);
    }
  };
}
