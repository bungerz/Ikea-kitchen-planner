import * as THREE from 'three';
import { AMBILLY_LOCATION } from './ambillySun.js';

/* =========================================================================
 * RÉSIDENCE CASSIOPÉE (R+4 / 4ÈME ÉTAGE) & AMBILLY ÉCOQUARTIER CONTEXT
 * 7 rue de la Fraternité, 74100 Ambilly (46.1941° N, 6.2230° E)
 * - Apartment floor slab is at y = 0.0 m (= +11.6 m above Rue de la Fraternité)
 * - Lower 4 stories (RDC, R+1, R+2, R+3) in Clément Vergely gridded limestone
 * - Landscaped Écoquartier courtyard, tall trees, neighboring blocks
 * - Mont Salève (SSW), Jura (NW), and Voirons/Alps (E) distant horizon ridges
 * - Dynamic physical Sky Dome shader synchronized to live Ambilly NOAA sun!
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
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(240, 32, 20), skyMat);
  skyDome.position.set(5.6, 0, 5.6);
  // CRITICAL for WebGL2 GPU Path Tracing: ShaderMaterial sky sphere must be hidden in BVH
  // so it never occludes HDR ProceduralEquirectTexture sky & real Ambilly sunlight!
  skyDome.userData.hideInRT = true;
  envGroup.add(skyDome);

  /* =====================================================================
   * 2. CASSIOPÉE BUILDING LOWER 4 STORIES (RDC, R+1, R+2, R+3 BELOW R+4!)
   * Clément Vergely architectural grid: pale limestone concrete piers & slabs
   * ===================================================================== */
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#DFDAD0', roughness: 0.86, metalness: 0.02 });
  const slabTrimMat = new THREE.MeshStandardMaterial({ color: '#CCC6BA', roughness: 0.82 });
  const darkRecessMat = new THREE.MeshStandardMaterial({ color: '#454C54', roughness: 0.28, metalness: 0.35 });
  const lowerLoggiaMat = new THREE.MeshStandardMaterial({ color: '#C5C0B6', roughness: 0.88 });

  const buildingH = Math.abs(GROUND_Y) - 0.14; // 11.46 m down from floor slab bottom

  // Main L-shaped Cassiopée tower volume directly beneath our Lot 17 footprint
  // Wing A (main body X=0..11.37, Z=2.86..11.25)
  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(11.37, buildingH, 8.39), stoneMat);
  mainBody.position.set(11.37 / 2, -0.14 - buildingH / 2, 2.86 + 8.39 / 2);
  mainBody.receiveShadow = true;
  mainBody.castShadow = true;
  envGroup.add(mainBody);

  // Wing B (north-west Chambre 3 wing X=0..5.97, Z=0..2.86)
  const nwBody = new THREE.Mesh(new THREE.BoxGeometry(5.97, buildingH, 2.86), stoneMat);
  nwBody.position.set(5.97 / 2, -0.14 - buildingH / 2, 2.86 / 2);
  nwBody.receiveShadow = true;
  nwBody.castShadow = true;
  envGroup.add(nwBody);

  // Adjacent neighbor apartment wing on East/North-East of Cassiopée (same R+4 building massing!)
  const adjWing = new THREE.Mesh(new THREE.BoxGeometry(10.5, buildingH + 2.64, 9.8), stoneMat);
  adjWing.position.set(11.37 + 5.25, (2.50 + GROUND_Y) / 2, 5.2);
  adjWing.receiveShadow = true;
  adjWing.castShadow = true;
  envGroup.add(adjWing);

  // Architectural Clément Vergely horizontal floor cornices & recessed window bays (RDC..R+3)
  const floorStep = 2.85;
  for (let fl = 0; fl < 4; fl++) {
    const fy = -0.14 - fl * floorStep;
    // South & West crisp concrete floor slab bands
    const bandS = new THREE.Mesh(new THREE.BoxGeometry(22.0, 0.24, 0.16), slabTrimMat);
    bandS.position.set(10.9, fy, 11.28);
    const bandW = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 11.35), slabTrimMat);
    bandW.position.set(-0.04, fy, 5.62);
    envGroup.add(bandS, bandW);

    // Lower-floor recessed windows on West facade (x = -0.02)
    [1.6, 4.55, 6.9, 9.9].forEach(wz => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.65, 1.45), darkRecessMat);
      win.position.set(-0.02, fy - 1.45, wz);
      envGroup.add(win);
    });
    // Lower-floor recessed loggia & bedroom windows on South facade (z = 11.27)
    const lowLog = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.65, 0.18), lowerLoggiaMat);
    lowLog.position.set(2.75, fy - 1.45, 11.24);
    const lowW1 = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.65, 0.06), darkRecessMat);
    lowW1.position.set(6.9, fy - 1.45, 11.27);
    const lowW2 = lowW1.clone();
    lowW2.position.x = 9.7;
    envGroup.add(lowLog, lowW1, lowW2);
  }

  /* =====================================================================
   * 3. ÉCOQUARTIER DE L'ÉTOILE GROUND, STREET, COURTYARD & TREES (y = -11.6m)
   * ===================================================================== */
  const terrainMat = new THREE.MeshStandardMaterial({ color: '#9BA88C', roughness: 0.96 });
  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(360, 360), terrainMat);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.set(5.6, GROUND_Y, 5.6);
  terrain.receiveShadow = true;
  terrain.userData.hideInRT = true;
  envGroup.add(terrain);

  // Rue de la Fraternité (asphalt street running alongside the Ecoquartier)
  const roadMat = new THREE.MeshStandardMaterial({ color: '#585A5E', roughness: 0.92 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: '#CBC7BE', roughness: 0.90 });

  const roadW = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.08, 180), roadMat);
  roadW.position.set(-14.5, GROUND_Y + 0.04, 10);
  const roadS = new THREE.Mesh(new THREE.BoxGeometry(180, 0.08, 9.0), roadMat);
  roadS.position.set(10, GROUND_Y + 0.04, 28);
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(36, 0.10, 34), sidewalkMat);
  plaza.position.set(8, GROUND_Y + 0.05, 8);
  envGroup.add(roadW, roadS, plaza);

  // Landscaped Ecoquartier Green Lawns (Îlot Végétalisé)
  const lawnMat = new THREE.MeshStandardMaterial({ color: '#748E5D', roughness: 0.96 });
  const lawnSW = new THREE.Mesh(new THREE.BoxGeometry(20, 0.14, 16), lawnMat);
  lawnSW.position.set(-1.5, GROUND_Y + 0.07, 19.5);
  const lawnNW = new THREE.Mesh(new THREE.BoxGeometry(16, 0.14, 16), lawnMat);
  lawnNW.position.set(-3.0, GROUND_Y + 0.07, -12.0);
  envGroup.add(lawnSW, lawnNW);

  // Tall Mature Trees in the Îlot Végétalisé (canopies gently visible from R+4!)
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#614A38', roughness: 0.95 });
  const leafMats = [
    new THREE.MeshStandardMaterial({ color: '#5D7B4A', roughness: 0.88 }),
    new THREE.MeshStandardMaterial({ color: '#6C8B56', roughness: 0.88 }),
    new THREE.MeshStandardMaterial({ color: '#4E6B3E', roughness: 0.90 })
  ];
  const treeCoords = [
    [-6.5, 16.5, 10.5], [-2.0, 21.0, 11.2], [5.5, 19.5, 10.0], [12.0, 22.0, 11.8],
    [-8.0, 6.0, 10.8],  [-7.5, -2.5, 11.5], [-4.5, -9.5, 10.2], [4.0, -11.0, 11.0],
    [-19.5, 12.0, 9.8], [-19.0, 2.0, 10.6], [19.0, 21.0, 10.4], [25.0, 15.0, 11.0]
  ];
  treeCoords.forEach(([tx, tz, th], idx) => {
    const tg = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, th * 0.55, 7), trunkMat);
    trunk.position.y = th * 0.275;
    const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(th * 0.30, 1), leafMats[idx % 3]);
    crown1.position.set(0, th * 0.70, 0);
    const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(th * 0.22, 1), leafMats[(idx + 1) % 3]);
    crown2.position.set(0.9, th * 0.82, -0.6);
    tg.add(trunk, crown1, crown2);
    tg.position.set(tx, GROUND_Y, tz);
    envGroup.add(tg);
  });

  // Neighboring Contemporary Écoquartier de l'Étoile Residential Blocks (Ambilly)
  const nbColors = ['#E5E1D8', '#D8D2C7', '#CFC7BA', '#DCE0E2', '#DDD2C5'];
  const neighbors = [
    // Across Rue de la Fraternité (West)
    { x: -32, z: 4,   w: 16, d: 22, h: 14.5 },
    { x: -34, z: 32,  w: 18, d: 16, h: 13.0 },
    { x: -30, z: -24, w: 18, d: 18, h: 16.0 },
    // South across the landscaped courtyard / street (kept low/spaced so Mont Salève shines!)
    { x: -10, z: 46,  w: 22, d: 14, h: 13.5 },
    { x: 22,  z: 48,  w: 20, d: 15, h: 14.0 },
    // North & East Ecoquartier blocks
    { x: 6,   z: -30, w: 24, d: 15, h: 15.0 },
    { x: 38,  z: 8,   w: 18, d: 24, h: 16.5 },
    { x: 36,  z: -22, w: 20, d: 16, h: 14.0 }
  ];
  neighbors.forEach((nb, i) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(nb.w, nb.h, nb.d),
      new THREE.MeshStandardMaterial({ color: nbColors[i % nbColors.length], roughness: 0.90 })
    );
    m.position.set(nb.x, GROUND_Y + nb.h / 2, nb.z);
    m.receiveShadow = true;
    m.userData.hideInRT = true; // Keep golden-hour Ambilly sun unobstructed in path tracer!
    envGroup.add(m);
  });

  /* =====================================================================
   * 4. DISTANT HAUTE-SAVOIE PANORAMA: MONT SALÈVE (SSW), JURA (NW), VOIRONS (E)
   * ===================================================================== */
  const mountainMat = new THREE.MeshStandardMaterial({
    color: '#8D9AA8',
    roughness: 0.96,
    metalness: 0.0,
    fog: true
  });
  const saleveMat = new THREE.MeshStandardMaterial({
    color: '#7F8F9D',
    roughness: 0.94,
    metalness: 0.0
  });

  function addMountainRidge(points, radius, heightScale, mat) {
    // Creates a faceted distant Alpine silhouette strip around the horizon
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], 0);
    for (const [px, py] of points) shape.lineTo(px, py * heightScale);
    shape.lineTo(points[points.length - 1][0], 0);
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    const mesh = new THREE.Mesh(geo, mat);
    return mesh;
  }

  // Mont Salève (iconic flat-topped limestone cliff ridge ~6km South-Southwest of Ambilly!)
  const saleve = addMountainRidge([
    [-120, 0.0], [-95, 0.38], [-65, 0.72], [-30, 0.95], [0, 1.0],
    [35, 0.88], [70, 0.58], [105, 0.25], [130, 0.0]
  ], 165, 34, saleveMat);
  saleve.position.set(-12, GROUND_Y - 2, 165);
  saleve.rotation.y = Math.PI + 0.16; // Faces back toward our Loggia & SSW windows!
  saleve.userData.hideInRT = true;
  envGroup.add(saleve);

  // Massif du Jura (distant blue-grey ridge across Lake Geneva to the North-West)
  const jura = addMountainRidge([
    [-130, 0], [-85, 0.45], [-40, 0.70], [10, 0.78], [60, 0.55], [115, 0.22], [140, 0]
  ], 175, 24, mountainMat);
  jura.position.set(-155, GROUND_Y - 2, -45);
  jura.rotation.y = Math.PI / 2 - 0.25;
  jura.userData.hideInRT = true;
  envGroup.add(jura);

  // Les Voirons / Pre-Alps (East-Northeast horizon)
  const voirons = addMountainRidge([
    [-120, 0], [-70, 0.55], [-20, 0.85], [25, 0.92], [75, 0.62], [125, 0]
  ], 170, 28, mountainMat);
  voirons.position.set(165, GROUND_Y - 2, -10);
  voirons.rotation.y = -Math.PI / 2;
  voirons.userData.hideInRT = true;
  envGroup.add(voirons);

  return {
    group: envGroup,
    updateSky(sunData) {
      skyUniforms.uZenith.value.copy(sunData.skyZenith);
      skyUniforms.uHorizon.value.copy(sunData.skyHorizon);
      skyUniforms.uSunDir.value.copy(sunData.dir);
      skyUniforms.uSunCol.value.copy(sunData.sunColor);
      skyUniforms.uSunVis.value = sunData.isNight ? 0.0 : (sunData.isTwilight ? 0.65 : 1.0);
      // Tint distant mountains gently with sky horizon light for atmospheric perspective
      saleveMat.color.copy(sunData.skyHorizon).lerp(new THREE.Color('#4B5A6B'), sunData.isNight ? 0.82 : 0.48);
      mountainMat.color.copy(sunData.skyHorizon).lerp(new THREE.Color('#5A6A7C'), sunData.isNight ? 0.84 : 0.42);
    },
    setVisible(v) {
      envGroup.visible = Boolean(v);
    }
  };
}
