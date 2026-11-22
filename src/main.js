import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/* =========================================================================
 * 1. FAITHFUL IKEA METOD BEIGE-FAMILY DOORS CATALOG (6 OFFICIAL DOORS)
 * Ordered lightest warm cream -> deepest brown-beige.
 * Calibrated under ACESFilmicToneMapping @ exposure 0.94 with RoomEnvironment.
 * ========================================================================= */
const DOORS = [
  {
    id: 'bodbyn-blanc-casse',
    name: 'BODBYN Blanc cassé',
    shortName: 'BODBYN Cream',
    ncs: 'NCS S 0502-Y',
    glossGU: 55,
    glossLabel: 'Satin-Gloss (G55)',
    lrv: 85,
    hex: '#EFEAD9',
    plinthHex: '#E0DAC8',
    thicknessMm: 19,
    profile: 'bodbyn',
    integratedHandle: false,
    tag: 'Current FR · Warm Cream',
    profileLabel: 'Bevelled Shaker Frame',
    materialParams: {
      roughness: 0.36,
      metalness: 0.0,
      clearcoat: 0.28,
      clearcoatRoughness: 0.30,
      envMapIntensity: 0.50
    },
    description: 'Warm buttery cream off-white with classic bevelled shaker frame and angled inner molding. Softly warmer than pure white walls.'
  },
  {
    id: 'stensund-beige',
    name: 'STENSUND Beige',
    shortName: 'STENSUND Beige',
    ncs: 'NCS S 2005-Y20R',
    glossGU: 25,
    glossLabel: 'Satin (G25)',
    lrv: 54,
    hex: '#C6BCAA',
    plinthHex: '#B6AC9A',
    thicknessMm: 16,
    profile: 'stensund',
    integratedHandle: false,
    tag: 'Limited FR · Light Beige',
    profileLabel: 'Shaker + Vertical Beadboard',
    materialParams: {
      roughness: 0.58,
      metalness: 0.0,
      clearcoat: 0.12,
      clearcoatRoughness: 0.45,
      envMapIntensity: 0.36
    },
    description: 'Light warm sand/oatmeal beige (one NCS step lighter than HAVSTORP in the same Y20R hue family) with shaker frame & subtle vertical beadboard grooves.'
  },
  {
    id: 'havstorp-beige',
    name: 'HAVSTORP Beige',
    shortName: 'HAVSTORP Beige',
    ncs: 'NCS S 3005-Y20R',
    glossGU: 10,
    glossLabel: 'Matte (G10)',
    lrv: 43,
    hex: '#B2A593',
    plinthHex: '#A19584',
    thicknessMm: 16,
    profile: 'flat',
    integratedHandle: false,
    tag: 'Current FR · Medium Beige',
    profileLabel: 'Smooth Flat Slab (16 mm)',
    materialParams: {
      roughness: 0.82,
      metalness: 0.0,
      clearcoat: 0.0,
      clearcoatRoughness: 0.0,
      envMapIntensity: 0.26
    },
    description: 'Grounded medium warm greige-beige with subtle taupe depth and velvety Gloss 10 matte lacquer. Unmistakably contrasted against pure white walls & tops.'
  },
  {
    id: 'upplov-mat-beige-fonce',
    name: 'UPPLÖV Mat beige foncé',
    shortName: 'UPPLÖV Dark Beige',
    ncs: 'NCS S 5005-Y20R',
    glossGU: 5,
    glossLabel: 'Ultra-Matte (G5)',
    lrv: 25,
    hex: '#8A8072',
    plinthHex: '#7B7265',
    gripHex: '#7D7366',
    thicknessMm: 19,
    profile: 'upplov',
    integratedHandle: true,
    tag: 'Current FR · Dark Matte Beige',
    profileLabel: 'Bevelled Edge + Integrated Aluminium Grip',
    materialParams: {
      roughness: 0.90,
      metalness: 0.0,
      clearcoat: 0.0,
      clearcoatRoughness: 0.0,
      envMapIntensity: 0.20
    },
    description: 'Rich deep muted dark stone-beige / warm taupe in dead-flat ultra-matte finish with 19 mm bevelled edges and matching integrated powder-coated aluminium edge grip.'
  },
  {
    id: 'voxtorp-brillant-gris-brun',
    name: 'VOXTORP Brillant gris-brun foncé',
    shortName: 'VOXTORP Gloss Taupe',
    ncs: 'IKEA FR Finitions Beiges',
    glossGU: 88,
    glossLabel: 'High-Gloss (G88)',
    lrv: 15,
    hex: '#6A6157',
    plinthHex: '#5D554C',
    thicknessMm: 21,
    profile: 'voxtorp',
    integratedHandle: true,
    tag: 'Current FR · Glossy Taupe',
    profileLabel: 'Sculpted 3D Recessed J-Pull',
    materialParams: {
      roughness: 0.10,
      metalness: 0.0,
      clearcoat: 0.92,
      clearcoatRoughness: 0.06,
      envMapIntensity: 0.95
    },
    description: 'Deep warm glossy taupe-beige with mirror-smooth Gloss 88 lacquer and a sculpted 3D recessed horizontal J-pull handle channel carved directly into the edge.'
  },
  {
    id: 'havstorp-marron-beige',
    name: 'HAVSTORP Marron beige',
    shortName: 'HAVSTORP Brown-Beige',
    ncs: 'NCS S 7005-Y20R',
    glossGU: 10,
    glossLabel: 'Matte (G10)',
    lrv: 12,
    hex: '#5C544A',
    plinthHex: '#4F483F',
    thicknessMm: 16,
    profile: 'flat',
    integratedHandle: false,
    tag: 'Current FR · Deep Brown-Beige',
    profileLabel: 'Smooth Flat Slab (16 mm)',
    materialParams: {
      roughness: 0.82,
      metalness: 0.0,
      clearcoat: 0.0,
      clearcoatRoughness: 0.0,
      envMapIntensity: 0.26
    },
    description: 'Deep warm espresso-taupe brown-beige — the darkest architectural shade in IKEA’s official Y20R beige progression, pairing dramatically with white quartz or oak.'
  }
];

/* =========================================================================
 * 2. 12 IKEA FRANCE COUNTERTOPS CATALOG (Real Thicknesses + PBR Params)
 * ========================================================================= */
const COUNTERTOPS = [
  // BLACKS & DARKS
  {
    id: 'ekbacken-noir-mat',
    name: 'EKBACKEN Noir mat',
    shortName: 'EKBACKEN Noir',
    finish: 'Deep matte black laminate',
    materialNote: 'High-pressure matte laminate · €',
    category: 'dark',
    thicknessCm: 2.8,
    baseHex: '#1E1F21',
    lrv: 5,
    roughness: 0.72,
    metalness: 0.02,
    bumpScale: 0.0020,
    normalStrength: 0.18,
    pairing: 'Strong architectural anchor that frames medium and light beige doors while blending cleanly with the black induction cooktop.'
  },
  {
    id: 'ekbacken-anthracite-pierre',
    name: 'EKBACKEN Anthracite effet pierre',
    shortName: 'Anthracite Pierre',
    finish: 'Dark speckled stone laminate',
    materialNote: 'Textured stone-effect laminate · €',
    category: 'dark',
    thicknessCm: 2.8,
    baseHex: '#313438',
    lrv: 10,
    roughness: 0.64,
    metalness: 0.03,
    bumpScale: 0.0045,
    normalStrength: 0.42,
    pairing: 'Softer mineral charcoal with fine stone flecking; hides fingerprints better than pure matte black next to beige cabinetry.'
  },
  {
    id: 'saljan-mineral-noir',
    name: 'SÄLJAN Effet minéral noir',
    shortName: 'SÄLJAN Minéral Noir',
    finish: 'Thick 3.8 cm dark mineral laminate',
    materialNote: 'Thick 3.8 cm mineral laminate · €',
    category: 'dark',
    thicknessCm: 3.8,
    baseHex: '#232527',
    lrv: 6,
    roughness: 0.58,
    metalness: 0.03,
    bumpScale: 0.0042,
    normalStrength: 0.38,
    pairing: 'Substantial 3.8 cm dark mineral slab profile adds bold horizontal weight against HAVSTORP or STENSUND doors.'
  },
  {
    id: 'kasker-quartz-noir-marbre',
    name: 'KASKER Quartz Noir marbré',
    shortName: 'KASKER Noir Marbré',
    finish: 'Slim 2.0 cm polished black quartz, fine white veins',
    materialNote: 'Bespoke 2.0 cm engineered quartz · €€€',
    category: 'dark',
    thicknessCm: 2.0,
    baseHex: '#191A1C',
    lrv: 5,
    roughness: 0.16,
    metalness: 0.05,
    bumpScale: 0.0008,
    normalStrength: 0.08,
    pairing: 'Razor-slim 2.0 cm polished black quartz with delicate white veining — luxurious contrast with UPPLÖV or HAVSTORP.'
  },
  // WHITES & MARBLES
  {
    id: 'ekbacken-blanc',
    name: 'EKBACKEN Blanc',
    shortName: 'EKBACKEN Blanc',
    finish: 'Crisp pure white laminate',
    materialNote: 'Pure white matte-satin laminate · €',
    category: 'white',
    thicknessCm: 2.8,
    baseHex: '#F6F6F4',
    lrv: 92,
    roughness: 0.44,
    metalness: 0.01,
    bumpScale: 0.0008,
    normalStrength: 0.08,
    pairing: 'Maximum bright contrast against every beige door in the Y20R family — makes HAVSTORP Beige and UPPLÖV pop cleanly.'
  },
  {
    id: 'ekbacken-blanc-marbre',
    name: 'EKBACKEN Blanc effet marbre',
    shortName: 'Blanc Marbré',
    finish: 'Pure white with delicate grey Carrara veins',
    materialNote: 'Marble-effect laminate · €',
    category: 'white',
    thicknessCm: 2.8,
    baseHex: '#F5F5F2',
    lrv: 88,
    roughness: 0.34,
    metalness: 0.02,
    bumpScale: 0.0014,
    normalStrength: 0.12,
    pairing: 'Luminous pure white surface softened by delicate Carrara veining; effortless match with BODBYN, STENSUND, and HAVSTORP.'
  },
  {
    id: 'kasker-quartz-blanc-marbre',
    name: 'KASKER Quartz Blanc marbré',
    shortName: 'KASKER Blanc Marbré',
    finish: 'Slim 2.0 cm glossy white quartz, warm-grey veins',
    materialNote: 'Bespoke 2.0 cm engineered quartz · €€€',
    category: 'white',
    thicknessCm: 2.0,
    baseHex: '#F7F7F5',
    lrv: 91,
    roughness: 0.16,
    metalness: 0.04,
    bumpScale: 0.0008,
    normalStrength: 0.08,
    pairing: 'Ultra-refined 2.0 cm architectural white quartz with subtle warm-grey veins — elevates UPPLÖV, VOXTORP, and HAVSTORP.'
  },
  // BEIGES & TERRAZZO
  {
    id: 'ekbacken-beige-pierre',
    name: 'EKBACKEN Beige effet pierre',
    shortName: 'Beige Pierre',
    finish: 'Soft warm limestone beige',
    materialNote: 'Warm limestone-effect laminate · €',
    category: 'stone',
    thicknessCm: 2.8,
    baseHex: '#CFC5B4',
    lrv: 57,
    roughness: 0.60,
    metalness: 0.02,
    bumpScale: 0.0036,
    normalStrength: 0.34,
    pairing: 'Calm tone-on-tone mineral limestone warmth that bridges HAVSTORP Beige cabinetry and taupe 60×60 floor tiles.'
  },
  {
    id: 'ekbacken-terrazzo-clair',
    name: 'EKBACKEN Effet terrazzo clair',
    shortName: 'Terrazzo Clair',
    finish: 'Light stone with beige, taupe & charcoal flecks',
    materialNote: 'Speckled terrazzo laminate · €',
    category: 'stone',
    thicknessCm: 2.8,
    baseHex: '#EAE5DC',
    lrv: 78,
    roughness: 0.44,
    metalness: 0.02,
    bumpScale: 0.0024,
    normalStrength: 0.22,
    pairing: 'Bright off-white base lifts darker beige doors while embedded taupe, sand, and charcoal chips unify the entire kitchen palette.'
  },
  // WOODS
  {
    id: 'ekbacken-frene-clair',
    name: 'EKBACKEN Effet frêne clair',
    shortName: 'Frêne Clair',
    finish: 'Pale Scandinavian ash wood grain',
    materialNote: 'Wood-effect waterproof laminate · €',
    category: 'wood',
    thicknessCm: 2.8,
    baseHex: '#D7C5AC',
    lrv: 60,
    roughness: 0.54,
    metalness: 0.02,
    bumpScale: 0.0040,
    normalStrength: 0.38,
    pairing: 'Airy Nordic ash brings organic warmth without heavy visual mass; pairs smoothly with a Natural Oak claustra.'
  },
  {
    id: 'karlby-chene',
    name: 'KARLBY Chêne',
    shortName: 'KARLBY Chêne',
    finish: 'Thick 3.8 cm warm butcher-block oak veneer',
    materialNote: 'Real 3 mm thick oak stave veneer · €€',
    category: 'wood',
    thicknessCm: 3.8,
    baseHex: '#B68C5C',
    lrv: 31,
    roughness: 0.48,
    metalness: 0.02,
    bumpScale: 0.0048,
    normalStrength: 0.46,
    pairing: 'Iconic 3.8 cm golden oak butcher-block warms up Y20R beige doors and creates cohesive rhythm with Natural Oak claustra slats.'
  },
  {
    id: 'karlby-noyer',
    name: 'KARLBY Noyer',
    shortName: 'KARLBY Noyer',
    finish: 'Thick 3.8 cm rich dark walnut veneer',
    materialNote: 'Real 3 mm thick walnut stave veneer · €€',
    category: 'wood',
    thicknessCm: 3.8,
    baseHex: '#6A4832',
    lrv: 11,
    roughness: 0.44,
    metalness: 0.03,
    bumpScale: 0.0048,
    normalStrength: 0.46,
    pairing: 'Deep chocolate-walnut contrast enriches light/medium beige fronts (BODBYN, STENSUND, HAVSTORP) and brass hardware.'
  }
];

const FLOOR_META = {
  taupe:       { label: 'Taupe 60×60',  meta: '2mm grout',   hex: '#9A9288' },
  oak:         { label: 'Oak Parquet',  meta: 'Natural wood', hex: '#C8AA82' },
  greyStone:   { label: 'Grey Stone',   meta: 'Rectified',    hex: '#C5C4C0' },
  microcement: { label: 'Microcement',  meta: 'Seamless',     hex: '#C2B9AC' }
};

/* =========================================================================
 * 3. APPLICATION STATE (Supports Simultaneous Door + Countertop A/B!)
 * ========================================================================= */
const state = {
  doorId: 'havstorp-beige',          // Default selected: HAVSTORP Beige
  countertopId: 'ekbacken-blanc',    // Default: Pure White to showcase immediate contrast
  comboA: null,                      // { doorId, countertopId }
  comboB: null,                      // { doorId, countertopId }
  tab: 'doors',                      // 'doors' | 'countertops' | 'room'
  category: 'all',
  checkOpen: false,                  // Collapsed by default so cards are immediately visible
  sidebarCollapsed: false,
  camPreset: 'perspective',
  lighting: 'morning',
  claustraHeight: 'full',
  claustraFinish: 'oak',
  backsplash: 'white',
  hardware: 'black',
  floor: 'taupe',
  rtActive: false,
  rtLoading: false
};

/* =========================================================================
 * 4. PROCEDURAL 512×512 PBR TEXTURE GENERATOR (Albedo + Roughness + Normal)
 * Generates tangent-space Normal Maps from height canvases so BOTH standard
 * Three.js rasterization AND WebGL2 GPU Path Tracing show crisp surface relief!
 * ========================================================================= */
const texCache = new Map();
const swatchUrlCache = new Map();

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeNoise2D(seed) {
  const rng = makeRng(seed);
  const N = 64;
  const grid = new Float32Array(N * N);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();
  function sample(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const x0 = ((xi % N) + N) % N, y0 = ((yi % N) + N) % N;
    const x1 = (x0 + 1) % N, y1 = (y0 + 1) % N;
    const a = grid[y0 * N + x0], b = grid[y0 * N + x1];
    const c = grid[y1 * N + x0], d = grid[y1 * N + x1];
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }
  return (x, y, oct = 4) => {
    let val = 0, amp = 0.5, freq = 1, norm = 0;
    for (let i = 0; i < oct; i++) {
      val += sample(x * freq, y * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return val / norm;
  };
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function clampByte(v) {
  return v < 0 ? 0 : (v > 255 ? 255 : v);
}

/**
 * Converts a grayscale height/bump canvas into a seamless tangent-space Normal Map CanvasTexture.
 */
function heightCanvasToNormalTexture(bumpCanvas, strength = 1.6) {
  const w = bumpCanvas.width;
  const h = bumpCanvas.height;
  const src = bumpCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;

  const nc = document.createElement('canvas');
  nc.width = w;
  nc.height = h;
  const nctx = nc.getContext('2d', { willReadFrequently: true });
  const outImg = nctx.createImageData(w, h);
  const dst = outImg.data;

  const hAt = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (hAt(x + 1, y) - hAt(x - 1, y)) * strength;
      const dy = (hAt(x, y + 1) - hAt(x, y - 1)) * strength;
      let nx = -dx;
      let ny = -dy;
      let nz = 1.0;
      const invLen = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y * w + x) * 4;
      dst[idx]     = clampByte(Math.round((nx * 0.5 + 0.5) * 255));
      dst[idx + 1] = clampByte(Math.round((ny * 0.5 + 0.5) * 255));
      dst[idx + 2] = clampByte(Math.round((nz * 0.5 + 0.5) * 255));
      dst[idx + 3] = 255;
    }
  }
  nctx.putImageData(outImg, 0, 0);

  const normalMap = new THREE.CanvasTexture(nc);
  normalMap.colorSpace = THREE.NoColorSpace;
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.anisotropy = 4;
  return normalMap;
}

function getCountertopTextures(item) {
  if (texCache.has(item.id)) return texCache.get(item.id);

  const size = 512;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });

  const bc = document.createElement('canvas');
  bc.width = size; bc.height = size;
  const bctx = bc.getContext('2d', { willReadFrequently: true });

  const rc = document.createElement('canvas');
  rc.width = size; rc.height = size;
  const rctx = rc.getContext('2d', { willReadFrequently: true });

  const seed = item.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0) * 41, 17);
  const rng = makeRng(seed);
  const fbm = makeNoise2D(seed + 113);
  const [br, bg, bb] = hexToRgb(item.baseHex);

  ctx.fillStyle = item.baseHex;
  ctx.fillRect(0, 0, size, size);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, size, size);
  const baseRoughByte = clampByte(Math.round(item.roughness * 255));
  rctx.fillStyle = `rgb(${baseRoughByte},${baseRoughByte},${baseRoughByte})`;
  rctx.fillRect(0, 0, size, size);

  const id = item.id;

  if (id === 'ekbacken-blanc' || id === 'ekbacken-noir-mat') {
    const img = ctx.getImageData(0, 0, size, size);
    const bImg = bctx.getImageData(0, 0, size, size);
    const rImg = rctx.getImageData(0, 0, size, size);
    const d = img.data, bd = bImg.data, rd = rImg.data;
    const isWhite = id === 'ekbacken-blanc';
    const grain = isWhite ? 2.0 : 4.5;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const n = (rng() - 0.5) * grain + (fbm(x * 0.02, y * 0.02, 2) - 0.5) * (isWhite ? 1.8 : 4.5);
        d[i] = clampByte(br + n);
        d[i + 1] = clampByte(bg + n);
        d[i + 2] = clampByte(bb + n);
        const bv = clampByte(128 + n * 3);
        bd[i] = bd[i + 1] = bd[i + 2] = bv; bd[i + 3] = 255;
        const rv = clampByte(baseRoughByte + n * 2.5);
        rd[i] = rd[i + 1] = rd[i + 2] = rv; rd[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    bctx.putImageData(bImg, 0, 0);
    rctx.putImageData(rImg, 0, 0);
  } else if (id === 'ekbacken-anthracite-pierre' || id === 'saljan-mineral-noir' || id === 'ekbacken-beige-pierre') {
    const img = ctx.getImageData(0, 0, size, size);
    const bImg = bctx.getImageData(0, 0, size, size);
    const rImg = rctx.getImageData(0, 0, size, size);
    const d = img.data, bd = bImg.data, rd = rImg.data;
    const isDark = id !== 'ekbacken-beige-pierre';

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const cloud = (fbm(x * 0.016, y * 0.016, 4) - 0.5) * (id === 'ekbacken-anthracite-pierre' ? 24 : 20);
        const micro = (fbm(x * 0.075, y * 0.075, 3) - 0.5) * 14;
        const grit = (rng() - 0.5) * 7;
        const delta = cloud + micro + grit;
        d[i] = clampByte(br + delta);
        d[i + 1] = clampByte(bg + delta * 0.98);
        d[i + 2] = clampByte(bb + delta * 0.96);
        const bv = clampByte(128 + (micro + grit) * 4.0);
        bd[i] = bd[i + 1] = bd[i + 2] = bv; bd[i + 3] = 255;
        const rv = clampByte(baseRoughByte - cloud * 1.1 + grit * 2.0);
        rd[i] = rd[i + 1] = rd[i + 2] = rv; rd[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    bctx.putImageData(bImg, 0, 0);
    rctx.putImageData(rImg, 0, 0);

    const count = id === 'ekbacken-anthracite-pierre' ? 1400 : 1050;
    for (let s = 0; s < count; s++) {
      const sx = rng() * size, sy = rng() * size, r = 0.6 + rng() * 1.4;
      ctx.fillStyle = rng() > 0.45
        ? (isDark ? 'rgba(188,194,204,0.16)' : 'rgba(255,253,248,0.34)')
        : (isDark ? 'rgba(8,10,12,0.34)' : 'rgba(118,110,98,0.18)');
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'kasker-quartz-noir-marbre') {
    const img = ctx.getImageData(0, 0, size, size);
    const rImg = rctx.getImageData(0, 0, size, size);
    const d = img.data, rd = rImg.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const nx = x / size, ny = y / size;
        const warp = fbm(nx * 5.2, ny * 5.2, 4) * 2.1;
        const w1 = Math.sin((nx * 2.8 + ny * 2.2 + warp) * Math.PI);
        const v1 = Math.pow(1 - Math.abs(w1), 24);
        const w2 = Math.sin((nx * 5.0 - ny * 3.4 + warp * 1.25) * Math.PI);
        const v2 = Math.pow(1 - Math.abs(w2), 30) * 0.65;
        const vein = Math.min(1, v1 * 0.85 + v2 * 0.55);
        const mist = (fbm(nx * 6, ny * 6, 3) - 0.5) * 6;
        d[i] = clampByte(br + mist + vein * 178);
        d[i + 1] = clampByte(bg + mist + vein * 176);
        d[i + 2] = clampByte(bb + mist + vein * 172);
        const rv = clampByte(baseRoughByte + vein * 22);
        rd[i] = rd[i + 1] = rd[i + 2] = rv; rd[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    rctx.putImageData(rImg, 0, 0);
  } else if (id === 'ekbacken-blanc-marbre' || id === 'kasker-quartz-blanc-marbre') {
    const isQuartz = id === 'kasker-quartz-blanc-marbre';
    const img = ctx.getImageData(0, 0, size, size);
    const rImg = rctx.getImageData(0, 0, size, size);
    const d = img.data, rd = rImg.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const nx = x / size, ny = y / size;
        const warp = fbm(nx * 5.0, ny * 5.0, 4) * 2.2;
        const w1 = Math.sin((nx * 3.0 + ny * 2.4 + warp) * Math.PI);
        const v1 = Math.pow(1 - Math.abs(w1), isQuartz ? 16 : 11);
        const w2 = Math.sin((nx * 5.2 - ny * 3.2 + warp * 1.3) * Math.PI);
        const v2 = Math.pow(1 - Math.abs(w2), isQuartz ? 22 : 15) * 0.55;
        const mist = (fbm(nx * 7.0, ny * 7.0, 3) - 0.5) * (isQuartz ? 7 : 12);
        const v = Math.min(1, v1 * (isQuartz ? 0.44 : 0.64) + v2 * (isQuartz ? 0.30 : 0.44));

        d[i] = clampByte(br + mist - v * (isQuartz ? 46 : 64));
        d[i + 1] = clampByte(bg + mist - v * (isQuartz ? 46 : 63));
        d[i + 2] = clampByte(bb + mist - v * (isQuartz ? 44 : 58));
        const rv = clampByte(baseRoughByte + v * 16);
        rd[i] = rd[i + 1] = rd[i + 2] = rv; rd[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    rctx.putImageData(rImg, 0, 0);
  } else if (id === 'ekbacken-terrazzo-clair') {
    const img = ctx.getImageData(0, 0, size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const n = (fbm(x * 0.03, y * 0.03, 3) - 0.5) * 10 + (rng() - 0.5) * 4;
        d[i] = clampByte(br + n);
        d[i + 1] = clampByte(bg + n);
        d[i + 2] = clampByte(bb + n);
      }
    }
    ctx.putImageData(img, 0, 0);

    const chips = ['#FAF8F4', '#DFD5C6', '#C6B8A3', '#A69887', '#797166', '#42403E', '#D2C1A8'];
    for (let k = 0; k < 680; k++) {
      const cx = rng() * size, cy = rng() * size;
      const rad = 1.8 + rng() * 8.2;
      const sides = 4 + Math.floor(rng() * 4);
      ctx.fillStyle = chips[Math.floor(rng() * chips.length)];
      bctx.fillStyle = rng() > 0.5 ? '#969696' : '#6E6E6E';
      rctx.fillStyle = rng() > 0.5 ? '#5E5E5E' : '#808080';
      ctx.beginPath(); bctx.beginPath(); rctx.beginPath();
      for (let p = 0; p < sides; p++) {
        const ang = (p / sides) * Math.PI * 2 + rng() * 0.5;
        const r = rad * (0.55 + rng() * 0.52);
        const px = cx + Math.cos(ang) * r, py = cy + Math.sin(ang) * r;
        if (p === 0) { ctx.moveTo(px, py); bctx.moveTo(px, py); rctx.moveTo(px, py); }
        else { ctx.lineTo(px, py); bctx.lineTo(px, py); rctx.lineTo(px, py); }
      }
      ctx.closePath(); ctx.fill();
      bctx.closePath(); bctx.fill();
      rctx.closePath(); rctx.fill();
    }
  } else if (id === 'ekbacken-frene-clair' || id === 'karlby-chene' || id === 'karlby-noyer') {
    const isAsh = id === 'ekbacken-frene-clair';
    const isWalnut = id === 'karlby-noyer';
    const rows = isAsh ? 6 : 9;
    const rowH = size / rows;

    for (let r = 0; r < rows; r++) {
      const y0 = Math.floor(r * rowH);
      const y1 = Math.floor((r + 1) * rowH);
      const h = y1 - y0;
      const splits = isAsh
        ? [0, Math.floor(size * (0.35 + rng() * 0.30)), size]
        : [0, Math.floor(size * (0.24 + rng() * 0.25)), Math.floor(size * (0.64 + rng() * 0.22)), size];

      for (let s = 0; s < splits.length - 1; s++) {
        const x0 = splits[s], x1 = splits[s + 1], w = x1 - x0;
        if (w <= 0) continue;

        const staveShift = (rng() - 0.5) * (isAsh ? 22 : (isWalnut ? 32 : 36));
        const img = ctx.createImageData(w, h);
        const bImg = bctx.createImageData(w, h);
        const rImg = rctx.createImageData(w, h);
        const d = img.data, bd = bImg.data, rd = rImg.data;
        const off = rng() * 55;

        for (let yy = 0; yy < h; yy++) {
          for (let xx = 0; xx < w; xx++) {
            const idx = (yy * w + xx) * 4;
            const gx = (xx + x0) * 0.012 + off;
            const gy = yy * 0.16 + off;
            const grain = Math.sin(gy + fbm(gx, yy * 0.04, 3) * 7.2) * (isAsh ? 9.5 : 12);
            const pore = (rng() - 0.5) * 4.5;
            const delta = staveShift + grain + pore;
            d[idx] = clampByte(br + delta);
            d[idx + 1] = clampByte(bg + delta * 0.84);
            d[idx + 2] = clampByte(bb + delta * 0.66);
            d[idx + 3] = 255;

            const bv = clampByte(128 + grain * 2.4 + pore * 2.4);
            bd[idx] = bd[idx + 1] = bd[idx + 2] = bv; bd[idx + 3] = 255;

            const rv = clampByte(baseRoughByte - grain * 1.4);
            rd[idx] = rd[idx + 1] = rd[idx + 2] = rv; rd[idx + 3] = 255;
          }
        }
        ctx.putImageData(img, x0, y0);
        bctx.putImageData(bImg, x0, y0);
        rctx.putImageData(rImg, x0, y0);

        ctx.strokeStyle = isWalnut ? 'rgba(22,12,6,0.45)' : (isAsh ? 'rgba(115,96,74,0.22)' : 'rgba(72,48,24,0.34)');
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);

        bctx.strokeStyle = '#3A3A3A';
        bctx.lineWidth = 1.2;
        bctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
      }
    }
  }

  // Generate miniature card preview data URL
  const sw = document.createElement('canvas');
  sw.width = 160; sw.height = 84;
  sw.getContext('2d', { willReadFrequently: true }).drawImage(c, 0, 0, 160, 84);
  swatchUrlCache.set(item.id, sw.toDataURL('image/jpeg', 0.90));

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;

  const normalMap = heightCanvasToNormalTexture(bc, 2.0);

  const roughnessMap = new THREE.CanvasTexture(rc);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = 4;

  const out = { map, normalMap, roughnessMap };
  texCache.set(item.id, out);
  return out;
}

// Procedural Claustra Finishes
const claustraCache = new Map();
function getClaustraFinishData(finish) {
  if (claustraCache.has(finish)) return claustraCache.get(finish);
  const cfgMap = {
    oak:    { hex: '#B58A5B', grain: 14, rough: 0.58 },
    walnut: { hex: '#5C3D2A', grain: 13, rough: 0.50 },
    black:  { hex: '#1F2023', grain: 4,  rough: 0.68 },
    white:  { hex: '#F7F7F5', grain: 2,  rough: 0.78 }
  };
  const cfg = cfgMap[finish] || cfgMap.oak;

  const w = 128, h = 512;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const [br, bg, bb] = hexToRgb(cfg.hex);
  const fbm = makeNoise2D(finish.charCodeAt(0) * 131 + 11);
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const g = Math.sin(x * 0.24 + fbm(x * 0.06, y * 0.012, 3) * 6.5) * cfg.grain;
      const fine = (fbm(x * 0.26, y * 0.05, 2) - 0.5) * cfg.grain * 0.65;
      const delta = g + fine;
      d[idx] = clampByte(br + delta);
      d[idx + 1] = clampByte(bg + delta * 0.88);
      d[idx + 2] = clampByte(bb + delta * 0.76);
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;

  const out = { map, roughness: cfg.rough };
  claustraCache.set(finish, out);
  return out;
}

// Procedural Floor Textures (Taupe 60x60 Série Kevin 2mm, Oak Parquet, Light Grey Stone, Warm Microcement)
const floorCache = new Map();
function getFloorTextures(mode) {
  if (floorCache.has(mode)) return floorCache.get(mode);

  const size = 512;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const bc = document.createElement('canvas');
  bc.width = size; bc.height = size;
  const bctx = bc.getContext('2d', { willReadFrequently: true });

  const fbm = makeNoise2D(mode.charCodeAt(0) * 73 + 23);
  const rng = makeRng(mode.length * 617 + 7);

  if (mode === 'taupe' || mode === 'greyStone') {
    const isTaupe = mode === 'taupe';
    const [br, bg, bb] = isTaupe ? [154, 146, 136] : [197, 196, 192];
    const img = ctx.createImageData(size, size);
    const bImg = bctx.createImageData(size, size);
    const d = img.data, bd = bImg.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const cloud = (fbm(x * 0.015, y * 0.015, 4) - 0.5) * 18;
        const grit = (rng() - 0.5) * 5;
        const delta = cloud + grit;
        d[i] = clampByte(br + delta);
        d[i + 1] = clampByte(bg + delta * 0.98);
        d[i + 2] = clampByte(bb + delta * 0.96);
        d[i + 3] = 255;
        const bv = clampByte(132 + grit * 4);
        bd[i] = bd[i + 1] = bd[i + 2] = bv; bd[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    bctx.putImageData(bImg, 0, 0);

    // Rectified 2mm matching grout (1 tile = 60x60cm)
    ctx.strokeStyle = isTaupe ? 'rgba(116,109,101,0.52)' : 'rgba(155,154,150,0.50)';
    ctx.lineWidth = 2.4;
    ctx.strokeRect(1.2, 1.2, size - 2.4, size - 2.4);
    bctx.strokeStyle = '#3A3A3A';
    bctx.lineWidth = 2.8;
    bctx.strokeRect(1.4, 1.4, size - 2.8, size - 2.8);
  } else if (mode === 'microcement') {
    const [br, bg, bb] = [194, 185, 172];
    const img = ctx.createImageData(size, size);
    const bImg = bctx.createImageData(size, size);
    const d = img.data, bd = bImg.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const trowel = (fbm(x * 0.012, y * 0.012, 4) - 0.5) * 24;
        const fine = (fbm(x * 0.05, y * 0.05, 3) - 0.5) * 8;
        const delta = trowel + fine;
        d[i] = clampByte(br + delta);
        d[i + 1] = clampByte(bg + delta * 0.98);
        d[i + 2] = clampByte(bb + delta * 0.95);
        d[i + 3] = 255;
        const bv = clampByte(128 + fine * 3);
        bd[i] = bd[i + 1] = bd[i + 2] = bv; bd[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    bctx.putImageData(bImg, 0, 0);
  } else {
    // Natural Oak Parquet
    const [br, bg, bb] = [200, 170, 130];
    const rows = 4, rh = size / rows;
    for (let r = 0; r < rows; r++) {
      const y0 = Math.floor(r * rh), h = Math.ceil(rh);
      const shift = (rng() - 0.5) * 22;
      const img = ctx.createImageData(size, h);
      const bImg = bctx.createImageData(size, h);
      const d = img.data, bd = bImg.data;
      const off = rng() * 35;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          const g = Math.sin(y * 0.14 + fbm(x * 0.01 + off, y * 0.04, 3) * 6.5) * 10;
          const delta = shift + g + (rng() - 0.5) * 4;
          d[i] = clampByte(br + delta);
          d[i + 1] = clampByte(bg + delta * 0.85);
          d[i + 2] = clampByte(bb + delta * 0.68);
          d[i + 3] = 255;
          const bv = clampByte(128 + g * 2);
          bd[i] = bd[i + 1] = bd[i + 2] = bv; bd[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, y0);
      bctx.putImageData(bImg, 0, y0);

      ctx.fillStyle = 'rgba(108,82,50,0.32)';
      ctx.fillRect(0, y0, size, 2);
      bctx.fillStyle = '#404040';
      bctx.fillRect(0, y0, size, 2);
      const jx = Math.floor(((r * 0.37 + 0.22) % 1) * size);
      ctx.fillRect(jx, y0, 2, h);
      bctx.fillRect(jx, y0, 2, h);
    }
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const rep = mode === 'oak' ? 7 : (mode === 'microcement' ? 4 : 14); // 8.4m / 0.60m = 14 tiles
  map.repeat.set(rep, rep);
  map.anisotropy = 4;

  const normalMap = heightCanvasToNormalTexture(bc, 2.2);
  normalMap.repeat.set(rep, rep);

  const out = {
    map,
    normalMap,
    normalScale: mode === 'microcement' ? 0.22 : 0.35,
    roughness: mode === 'oak' ? 0.58 : (mode === 'microcement' ? 0.66 : 0.74)
  };
  floorCache.set(mode, out);
  return out;
}

// Procedural Backsplash Textures (White Subway Tile, Warm Stone)
const bsCache = new Map();
function getBacksplashTextures(mode) {
  if (bsCache.has(mode)) return bsCache.get(mode);

  const size = 512;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const bc = document.createElement('canvas');
  bc.width = size; bc.height = size;
  const bctx = bc.getContext('2d', { willReadFrequently: true });
  const rng = makeRng(mode === 'subway' ? 404 : 808);

  if (mode === 'subway') {
    const rows = 8, cols = 4;
    const rh = size / rows, cw = size / cols;
    ctx.fillStyle = '#D9D6D0';
    ctx.fillRect(0, 0, size, size);
    bctx.fillStyle = '#2E2E2E';
    bctx.fillRect(0, 0, size, size);

    for (let r = 0; r < rows; r++) {
      const shift = (r % 2) * (cw / 2);
      for (let col = -1; col <= cols; col++) {
        const x = col * cw + shift + 2.4;
        const y = r * rh + 2.4;
        const w = cw - 4.8;
        const h = rh - 4.8;
        const lum = 247 + Math.floor((rng() - 0.5) * 6);
        const g = ctx.createLinearGradient(x, y, x, y + h);
        g.addColorStop(0, `rgb(${lum}, ${lum}, ${lum - 2})`);
        g.addColorStop(1, `rgb(${lum - 5}, ${lum - 5}, ${lum - 7})`);
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
        bctx.fillStyle = '#CACACA';
        bctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      }
    }
  } else {
    // Warm Stone backsplash
    const fbm = makeNoise2D(719);
    const [br, bg, bb] = [206, 198, 186];
    const img = ctx.createImageData(size, size);
    const bImg = bctx.createImageData(size, size);
    const d = img.data, bd = bImg.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const stone = (fbm(x * 0.015, y * 0.024, 4) - 0.5) * 20;
        const grain = (rng() - 0.5) * 5;
        const delta = stone + grain;
        d[i] = clampByte(br + delta);
        d[i + 1] = clampByte(bg + delta * 0.98);
        d[i + 2] = clampByte(bb + delta * 0.96);
        d[i + 3] = 255;
        const bv = clampByte(128 + stone * 2.4 + grain * 3);
        bd[i] = bd[i + 1] = bd[i + 2] = bv; bd[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    bctx.putImageData(bImg, 0, 0);
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;

  const normalMap = heightCanvasToNormalTexture(bc, mode === 'subway' ? 2.6 : 1.8);

  const out = {
    map,
    normalMap,
    roughness: mode === 'subway' ? 0.18 : 0.76,
    normalScale: mode === 'subway' ? 0.55 : 0.28
  };
  bsCache.set(mode, out);
  return out;
}

/* =========================================================================
 * 5. THREE.JS SCENE, ROOMENVIRONMENT, RAY TRACER HOOK & FOLDABLE-SAFE SIZING
 * ========================================================================= */
let renderer, scene, camera, controls;
let viewportEl;
let camAnim = null;
let rafId = null;
let isContextLost = false;
let cachedW = 0, cachedH = 0, cachedDprKey = 0;

// Lazy-loaded On-Demand GPU Path Tracer instance
let rayTracer = null;
const lastRtCamPos = new THREE.Vector3();
const lastRtCamQuat = new THREE.Quaternion();
let lastHudSamples = -1;
let lastHudPaused = null;
let lastHudConverged = null;

// Materials & Dynamic Groups
let doorMaterial;
let doorAccentMaterial;   // Slightly shaded bevel/groove accent for authentic shadow depth
let doorGripMaterial;     // Matching powder-coated aluminium grip for UPPLÖV
let plinthMaterial;
let hardwareMaterial;
let faucetMaterial;
let countertopMaterial;
let claustraMaterial;
let backsplashMaterial;
let floorMaterial;

let frontsGroup;          // Dynamically rebuilt on door profile changes
let frontSpecs = [];      // Complete catalog of doors, drawers, cover panels
let handleGroups = [];    // External handles (auto-hidden for UPPLÖV & VOXTORP)
let countertopSlabs = [];
let surfaceGroup;
let claustraGroup;
let backsplashMeshes = [];

// Lighting handles
let hemiLight, sunLight, fillLight, rimLight;
let underCabLights = [];
let underCabStripMat;
let pendantLights = [];
let pendantBulbMat;

// Architectural Constants (1 unit = 1 meter)
const PLINTH_H = 0.08;
const CAB_BASE_H = 0.88;     // 8 cm plinth + 80 cm METOD base cabinet
const WALL_CAB_BOT = 1.44;
const WALL_CAB_TOP = 2.24;
const CEILING_Y = 2.55;
const BACK_WALL_Z = -1.60;   // North back wall (bottom of U is at top)
const LEFT_WALL_X = -1.55;   // West arm (tall oven/fridge column + prep)
const RIGHT_EDGE_X = 1.55;   // East peninsula outer edge (sink + claustra)
const COUNTER_DEPTH = 0.635; // Standard 63.5 cm IKEA depth
const PENINSULA_DEPTH = 0.675; // Slightly wider East peninsula to support sink + claustra cleanly

const CAMERA_PRESETS = {
  perspective: { pos: new THREE.Vector3(3.38, 1.98, 3.08), target: new THREE.Vector3(0.05, 0.96, -0.22) },
  inside:      { pos: new THREE.Vector3(0.04, 1.54, 1.38), target: new THREE.Vector3(-0.04, 1.02, -1.25) },
  topdown:     { pos: new THREE.Vector3(0.00, 5.10, 0.22), target: new THREE.Vector3(0.00, 0.85, -0.18) },
  closeup:     { pos: new THREE.Vector3(0.32, 1.03, 1.52), target: new THREE.Vector3(1.16, 0.86, 0.04) }
};

const isCoarsePointer = () => window.matchMedia('(pointer: coarse)').matches;

function detectQuickGpuLabel(glRenderer) {
  try {
    const gl = glRenderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return 'WebGL2 GPU';
    const raw = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
    const m = raw.match(/(RTX\s*\d{4}\s*(?:Ti|SUPER)?|GTX\s*\d{4}\s*(?:Ti|SUPER)?|RX\s*\d{4}\s*(?:XT|XTX)?|Adreno\s*(?:\(TM\)\s*)?\d+|Apple\s*M\d+(?:\s*(?:Pro|Max|Ultra))?)/i);
    if (m) return m[1].replace(/\(TM\)\s*/i, '').replace(/\s+/g, ' ').trim();
    if (/MALI/i.test(raw)) return 'ARM Mali GPU';
    if (/XCLIPSE/i.test(raw)) return 'Samsung Xclipse';
    return 'WebGL2 GPU';
  } catch (_) {
    return 'WebGL2 GPU';
  }
}

function computeSafeDpr(w, h) {
  const rawDpr = window.devicePixelRatio || 1;
  const maxProfileDpr = (state.rtActive && rayTracer) ? rayTracer.getMaxDpr() : 1.75;
  let dpr = Math.min(rawDpr, maxProfileDpr);
  // Clamp max backing-store dimensions <= 2048px on mobile (<= 2560px on RTX Ultra) to prevent Adreno OOM
  const maxBackDim = (state.rtActive && rayTracer && rayTracer.profileKey === 'ultra') ? 2560 : 2048;
  const maxDim = Math.max(w, h);
  if (maxDim * dpr > maxBackDim) {
    dpr = Math.max(0.75, maxBackDim / maxDim);
  }
  return dpr;
}

function syncRendererSize(force = false) {
  if (!viewportEl || !renderer || !camera || isContextLost) return;
  const w = Math.round(viewportEl.clientWidth);
  const h = Math.round(viewportEl.clientHeight);
  if (w < 4 || h < 4) return; // Guard transient 0x0 during fold/unfold animation

  const dpr = computeSafeDpr(w, h);
  const dprKey = Math.round(dpr * 100);
  if (!force && w === cachedW && h === cachedH && dprKey === cachedDprKey) return;

  cachedW = w;
  cachedH = h;
  cachedDprKey = dprKey;

  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  if (state.rtActive && rayTracer) {
    rayTracer.onResize();
  }
}

function scheduleFoldResync() {
  syncRendererSize(true);
  setTimeout(() => syncRendererSize(true), 150);
  setTimeout(() => syncRendererSize(true), 400);
  setTimeout(() => syncRendererSize(true), 750);
}

function buildRoomEnvironment() {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  if (scene.environment) scene.environment.dispose();
  scene.environment = envTex;
  pmrem.dispose();
}

function initThree() {
  viewportEl = document.getElementById('viewport');
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
  } catch (err) {
    document.getElementById('webgl-error').classList.remove('hidden');
    console.error('WebGL init failed:', err);
    return false;
  }

  // Color-accurate ACES Filmic @ 0.94 + sRGB output
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  viewportEl.insertBefore(renderer.domElement, viewportEl.firstChild);

  const sidebarGpuEl = document.getElementById('sidebar-rt-gpu');
  if (sidebarGpuEl) {
    sidebarGpuEl.textContent = detectQuickGpuLabel(renderer);
  }

  // WebGL context loss & restoration (crucial on Galaxy Z Fold fold/unfold)
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    isContextLost = true;
    if (state.rtActive && rayTracer) {
      rayTracer.dispose();
      rayTracer = null;
      state.rtActive = false;
      state.rtLoading = false;
      renderRayTraceUI();
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    document.getElementById('context-pill').classList.remove('hidden');
  }, false);

  renderer.domElement.addEventListener('webglcontextrestored', () => {
    isContextLost = false;
    document.getElementById('context-pill').classList.add('hidden');
    buildRoomEnvironment();
    applyLighting(state.lighting);
    syncRendererSize(true);
    startLoop();
  }, false);

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#EAE7E1');
  scene.fog = new THREE.Fog('#EAE7E1', 11.5, 25);

  const initW = Math.max(1, viewportEl.clientWidth || window.innerWidth);
  const initH = Math.max(1, viewportEl.clientHeight || window.innerHeight);
  camera = new THREE.PerspectiveCamera(42, initW / initH, 0.06, 45);
  camera.position.copy(CAMERA_PRESETS.perspective.pos);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.minDistance = 0.58;
  controls.maxDistance = 8.6;
  controls.maxPolarAngle = Math.PI * 0.492;
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
  };
  controls.target.copy(CAMERA_PRESETS.perspective.target);
  controls.addEventListener('start', () => { camAnim = null; });

  buildRoomEnvironment();
  setupLights();
  buildRoom();
  buildCabinetStructureAndSpecs();
  buildCountertopAndSurface();
  buildClaustra();
  buildPendants();

  // Apply default state
  applyDoor(state.doorId, false);
  applyCountertop(state.countertopId, false);
  applyLighting(state.lighting);
  applyBacksplash(state.backsplash);
  applyHardware(state.hardware);
  applyFloor(state.floor);

  // Multi-layered foldable & responsive listeners
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => syncRendererSize(false));
    ro.observe(viewportEl);
  }
  window.addEventListener('resize', scheduleFoldResync);
  window.addEventListener('orientationchange', scheduleFoldResync);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleFoldResync);
  }

  syncRendererSize(true);
  return true;
}

function setupLights() {
  hemiLight = new THREE.HemisphereLight('#FFFFFF', '#9E958A', 1.05);
  scene.add(hemiLight);

  const shadowRes = isCoarsePointer() ? 1024 : 2048;
  sunLight = new THREE.DirectionalLight('#FFF5E8', 2.20);
  sunLight.position.set(5.4, 3.85, 2.35);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(shadowRes, shadowRes);
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 16;
  sunLight.shadow.camera.left = -3.8;
  sunLight.shadow.camera.right = 3.8;
  sunLight.shadow.camera.top = 3.5;
  sunLight.shadow.camera.bottom = -3.5;
  sunLight.shadow.bias = -0.00045;
  sunLight.shadow.normalBias = 0.012;
  scene.add(sunLight);

  fillLight = new THREE.DirectionalLight('#F2F6FF', 0.58);
  fillLight.position.set(-4.2, 3.1, 3.2);
  scene.add(fillLight);

  rimLight = new THREE.DirectionalLight('#FFFFFF', 0.36);
  rimLight.position.set(0.5, 4.6, 4.0);
  scene.add(rimLight);

  // Under-cabinet warm LED task lights
  [
    [-0.82, 1.40, -1.24],
    [ 0.00, 1.40, -1.24],
    [ 0.82, 1.40, -1.24],
    [-1.22, 1.40, -0.35]
  ].forEach(([lx, ly, lz]) => {
    const pt = new THREE.PointLight('#FFD399', 0.42, 2.6, 2);
    pt.position.set(lx, ly, lz);
    scene.add(pt);
    underCabLights.push(pt);
  });
}

/* =========================================================================
 * 6. ROOM SHELL (Pure Clean Architectural White Walls #F7F7F5)
 * ========================================================================= */
function buildRoom() {
  floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    roughness: 0.74,
    metalness: 0.01,
    envMapIntensity: 0.30,
    normalScale: new THREE.Vector2(0.35, 0.35)
  });
  const floorGeo = new THREE.PlaneGeometry(8.4, 8.4);
  floorGeo.computeTangents();
  const floor = new THREE.Mesh(floorGeo, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0.4, 0, 0.6);
  floor.receiveShadow = true;
  scene.add(floor);

  // Pure matte architectural white walls (#F7F7F5) for faithful beige contrast
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xF7F7F5,
    roughness: 0.92,
    metalness: 0.0,
    envMapIntensity: 0.24
  });

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(8.4, CEILING_Y + 0.08, 0.14), wallMat);
  backWall.position.set(0.4, (CEILING_Y + 0.08) / 2, BACK_WALL_Z - 0.07);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.14, CEILING_Y + 0.08, 6.4), wallMat);
  leftWall.position.set(LEFT_WALL_X - 0.07, (CEILING_Y + 0.08) / 2, 1.45);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const skirting = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 0.015), wallMat);
  skirting.position.set(3.05, 0.04, BACK_WALL_Z + 0.008);
  scene.add(skirting);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(8.4, 8.4),
    new THREE.MeshStandardMaterial({ color: 0xFAFAFA, roughness: 0.94, side: THREE.FrontSide })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0.4, CEILING_Y, 0.6);
  scene.add(ceiling);

  // Minimalist framed artwork on adjacent living wall
  const frameGroup = new THREE.Group();
  frameGroup.position.set(2.55, 1.52, BACK_WALL_Z + 0.016);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.92, 0.022),
    new THREE.MeshStandardMaterial({ color: '#B58D62', roughness: 0.6 })
  );
  const ac = document.createElement('canvas');
  ac.width = 256; ac.height = 320;
  const actx = ac.getContext('2d');
  actx.fillStyle = '#F7F6F2'; actx.fillRect(0, 0, 256, 320);
  actx.fillStyle = '#B2A593'; actx.beginPath(); actx.arc(118, 174, 70, 0, Math.PI * 2); actx.fill();
  actx.fillStyle = '#DFD9CE'; actx.fillRect(114, 86, 72, 146);
  actx.strokeStyle = '#2B2825'; actx.lineWidth = 3;
  actx.beginPath(); actx.arc(146, 130, 38, 0.25, Math.PI * 1.6); actx.stroke();
  const artTex = new THREE.CanvasTexture(ac);
  artTex.colorSpace = THREE.SRGBColorSpace;
  const art = new THREE.Mesh(
    new THREE.PlaneGeometry(0.66, 0.86),
    new THREE.MeshStandardMaterial({ map: artTex, roughness: 0.88 })
  );
  art.position.z = 0.013;
  frameGroup.add(frame, art);
  scene.add(frameGroup);
}

/* =========================================================================
 * 7. METOD CARCASSES, REVEALS & DYNAMIC 3D DOOR PROFILE GENERATOR
 * ========================================================================= */
function buildCabinetStructureAndSpecs() {
  // Dynamic Physical Door Material (updated per selected IKEA METOD door)
  doorMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xB2A593,
    roughness: 0.82,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 0.0,
    envMapIntensity: 0.26
  });

  // Subtle shaded bevel/groove material for beadboard & J-pull shadow depth
  doorAccentMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x8F8374,
    roughness: 0.86,
    metalness: 0.0,
    clearcoat: 0.0,
    envMapIntensity: 0.18
  });

  // Powder-coated matching dark-beige aluminium grip strip for UPPLÖV
  doorGripMaterial = new THREE.MeshStandardMaterial({
    color: 0x7D7366,
    roughness: 0.44,
    metalness: 0.46,
    envMapIntensity: 0.55
  });

  plinthMaterial = new THREE.MeshStandardMaterial({
    color: 0xA19584,
    roughness: 0.86,
    metalness: 0.0,
    envMapIntensity: 0.20
  });

  // Crisp 3 mm dark door reveals behind all doors & drawers
  const revealDarkMat = new THREE.MeshStandardMaterial({
    color: 0x3A352F,
    roughness: 0.96,
    metalness: 0.0,
    envMapIntensity: 0.10
  });

  // Recessed dark shadow gap directly beneath countertop overhang
  const overhangShadowMat = new THREE.MeshStandardMaterial({
    color: 0x26221E,
    roughness: 0.96,
    metalness: 0.0,
    envMapIntensity: 0.08
  });

  hardwareMaterial = new THREE.MeshStandardMaterial({
    color: 0x1E1F22,
    roughness: 0.34,
    metalness: 0.62
  });

  faucetMaterial = new THREE.MeshStandardMaterial({
    color: 0x1E1F22,
    roughness: 0.34,
    metalness: 0.62
  });

  const baseH = CAB_BASE_H - PLINTH_H; // 0.80 m
  const baseY = PLINTH_H + baseH / 2;  // 0.48 m
  const cabD = 0.60;
  const wallH = WALL_CAB_TOP - WALL_CAB_BOT; // 0.80 m
  const wallY = WALL_CAB_BOT + wallH / 2;    // 1.84 m
  const wallD = 0.37;

  const regFront = (spec) => frontSpecs.push(spec);

  /* ---- A. NORTH BACK WALL RUN (Bottom of U is at Top, z = -1.60) ---- */
  const backCore = new THREE.Mesh(new THREE.BoxGeometry(3.06, baseH - 0.003, cabD - 0.02), revealDarkMat);
  backCore.position.set(-0.02, baseY, BACK_WALL_Z + (cabD - 0.02) / 2);
  backCore.castShadow = true; backCore.receiveShadow = true;
  scene.add(backCore);

  const backPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.94, PLINTH_H, 0.02), plinthMaterial);
  backPlinth.position.set(0, PLINTH_H / 2, BACK_WALL_Z + cabD - 0.06);
  scene.add(backPlinth);

  // Recessed dark overhang shadow strip under back countertop
  const backOverhang = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.0055, 0.028), overhangShadowMat);
  backOverhang.position.set(0, CAB_BASE_H - 0.0028, BACK_WALL_Z + cabD + 0.008);
  scene.add(backOverhang);

  const backFZ = BACK_WALL_Z + cabD - 0.01;
  regFront({ w: 0.60, h: 0.20, x: -0.65, y: PLINTH_H + 0.70, z: backFZ, rotY: 0, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.04 } });
  regFront({ w: 0.60, h: 0.20, x: -0.65, y: PLINTH_H + 0.50, z: backFZ, rotY: 0, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.04 } });
  regFront({ w: 0.60, h: 0.40, x: -0.65, y: PLINTH_H + 0.20, z: backFZ, rotY: 0, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.13 } });
  regFront({ w: 0.70, h: 0.40, x:  0.00, y: PLINTH_H + 0.60, z: backFZ, rotY: 0, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.13 } });
  regFront({ w: 0.70, h: 0.40, x:  0.00, y: PLINTH_H + 0.20, z: backFZ, rotY: 0, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.13 } });
  regFront({ w: 0.60, h: 0.80, x:  0.65, y: baseY,           z: backFZ, rotY: 0, kind: 'door',   gripEdge: 'top', handle: { dir: 'h', oy: 0.33 } });

  // Back Upper Wall Cabinets + Minimalist Integrated Hood over Induction Cooktop
  const backUpCore = new THREE.Mesh(new THREE.BoxGeometry(3.06, wallH - 0.003, wallD - 0.02), revealDarkMat);
  backUpCore.position.set(-0.02, wallY, BACK_WALL_Z + (wallD - 0.02) / 2);
  backUpCore.castShadow = true; backUpCore.receiveShadow = true;
  scene.add(backUpCore);

  regFront({ w: wallD, h: wallH, x: RIGHT_EDGE_X - 0.009, y: wallY, z: BACK_WALL_Z + wallD / 2, rotY: Math.PI / 2, kind: 'cover', gripEdge: 'none', handle: null });

  [
    { x: -0.90, w: 0.56, side: 1 },
    { x: -0.34, w: 0.56, side: -1 },
    { x:  0.22, w: 0.56, side: 1 },
    { x:  0.78, w: 0.56, side: -1 },
    { x:  1.30, w: 0.48, side: -1 }
  ].forEach(c => {
    regFront({
      w: c.w, h: wallH, x: c.x, y: wallY, z: BACK_WALL_Z + wallD - 0.01, rotY: 0,
      kind: 'wallDoor', gripEdge: 'bottom',
      handle: { dir: 'v', len: 0.14, ox: c.side * (c.w / 2 - 0.045), oy: -0.28 }
    });
  });

  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(0.74, 0.024, 0.30),
    new THREE.MeshStandardMaterial({ color: '#222428', roughness: 0.32, metalness: 0.65 })
  );
  hood.position.set(0.0, WALL_CAB_BOT - 0.012, BACK_WALL_Z + 0.20);
  scene.add(hood);

  underCabStripMat = new THREE.MeshStandardMaterial({
    color: '#FFF6E6',
    emissive: '#FFD08E',
    emissiveIntensity: 0.8,
    roughness: 0.2
  });
  const backLed = new THREE.Mesh(new THREE.BoxGeometry(2.70, 0.008, 0.016), underCabStripMat);
  backLed.position.set(0.18, WALL_CAB_BOT - 0.004, BACK_WALL_Z + 0.14);
  scene.add(backLed);

  /* ---- B. WEST LEFT ARM (Prep Base + Tall Built-in Oven/Microwave & Fridge Columns) ---- */
  const leftBaseLen = 1.235;
  const leftBaseCore = new THREE.Mesh(new THREE.BoxGeometry(cabD - 0.02, baseH - 0.003, leftBaseLen), revealDarkMat);
  leftBaseCore.position.set(LEFT_WALL_X + (cabD - 0.02) / 2, baseY, -1.00 + leftBaseLen / 2);
  leftBaseCore.castShadow = true; leftBaseCore.receiveShadow = true;
  scene.add(leftBaseCore);

  const leftOverhang = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.0055, leftBaseLen), overhangShadowMat);
  leftOverhang.position.set(LEFT_WALL_X + cabD + 0.008, CAB_BASE_H - 0.0028, -1.00 + leftBaseLen / 2);
  scene.add(leftOverhang);

  const leftPlinth = new THREE.Mesh(new THREE.BoxGeometry(0.02, PLINTH_H, 2.45), plinthMaterial);
  leftPlinth.position.set(LEFT_WALL_X + cabD - 0.06, PLINTH_H / 2, 0.22);
  scene.add(leftPlinth);

  const leftFX = LEFT_WALL_X + cabD - 0.01;
  regFront({ w: 0.80, h: 0.20, x: leftFX, y: PLINTH_H + 0.70, z: -0.38, rotY: Math.PI / 2, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.04 } });
  regFront({ w: 0.80, h: 0.30, x: leftFX, y: PLINTH_H + 0.45, z: -0.38, rotY: Math.PI / 2, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.09 } });
  regFront({ w: 0.80, h: 0.30, x: leftFX, y: PLINTH_H + 0.15, z: -0.38, rotY: Math.PI / 2, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.09 } });
  regFront({ w: 0.22, h: 0.80, x: leftFX, y: baseY,           z: -0.89, rotY: Math.PI / 2, kind: 'cover',  gripEdge: 'none', handle: null });
  regFront({ w: 0.215, h: 0.80, x: leftFX, y: baseY,          z: 0.128, rotY: Math.PI / 2, kind: 'door',   gripEdge: 'top', handle: { dir: 'v', oy: 0.25, len: 0.14 } });

  const leftUpLen = 1.465;
  const leftUpCore = new THREE.Mesh(new THREE.BoxGeometry(wallD - 0.02, wallH - 0.003, leftUpLen), revealDarkMat);
  leftUpCore.position.set(LEFT_WALL_X + (wallD - 0.02) / 2, wallY, -1.23 + leftUpLen / 2);
  leftUpCore.castShadow = true;
  scene.add(leftUpCore);

  const leftUpFX = LEFT_WALL_X + wallD - 0.01;
  regFront({ w: 0.42,  h: wallH, x: leftUpFX, y: wallY, z: -1.02, rotY: Math.PI / 2, kind: 'wallDoor', gripEdge: 'bottom', handle: { dir: 'v', len: 0.14, ox: 0.15, oy: -0.28 } });
  regFront({ w: 0.80,  h: wallH, x: leftUpFX, y: wallY, z: -0.41, rotY: Math.PI / 2, kind: 'wallDoor', gripEdge: 'bottom', handle: { dir: 'h', len: 0.16, oy: -0.32 } });
  regFront({ w: 0.245, h: wallH, x: leftUpFX, y: wallY, z: 0.112, rotY: Math.PI / 2, kind: 'wallDoor', gripEdge: 'bottom', handle: { dir: 'v', len: 0.14, ox: -0.07, oy: -0.28 } });

  const leftLed = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.008, 1.35), underCabStripMat);
  leftLed.position.set(LEFT_WALL_X + 0.16, WALL_CAB_BOT - 0.004, -0.50);
  scene.add(leftLed);

  const towerH = WALL_CAB_TOP - PLINTH_H;
  const towerCore = new THREE.Mesh(new THREE.BoxGeometry(cabD - 0.02, towerH - 0.003, 1.20), revealDarkMat);
  towerCore.position.set(LEFT_WALL_X + (cabD - 0.02) / 2, PLINTH_H + towerH / 2, 0.835);
  towerCore.castShadow = true; towerCore.receiveShadow = true;
  scene.add(towerCore);

  regFront({ w: cabD, h: WALL_CAB_TOP, x: LEFT_WALL_X + cabD / 2, y: WALL_CAB_TOP / 2, z: 1.445, rotY: 0, kind: 'cover', gripEdge: 'none', handle: null });
  regFront({ w: cabD, h: WALL_CAB_TOP - CAB_BASE_H, x: LEFT_WALL_X + cabD / 2, y: CAB_BASE_H + (WALL_CAB_TOP - CAB_BASE_H) / 2, z: 0.235, rotY: Math.PI, kind: 'cover', gripEdge: 'none', handle: null });

  regFront({ w: 0.60, h: 0.40, x: leftFX, y: PLINTH_H + 0.20, z: 0.535, rotY: Math.PI / 2, kind: 'drawer',   gripEdge: 'top',    handle: { dir: 'h', oy: 0.13 } });
  regFront({ w: 0.60, h: 0.40, x: leftFX, y: PLINTH_H + 0.60, z: 0.535, rotY: Math.PI / 2, kind: 'drawer',   gripEdge: 'top',    handle: { dir: 'h', oy: 0.13 } });
  regFront({ w: 0.60, h: 0.36, x: leftFX, y: PLINTH_H + 1.98, z: 0.535, rotY: Math.PI / 2, kind: 'wallDoor', gripEdge: 'bottom', handle: { dir: 'h', oy: -0.11 } });

  const ovenGrp = new THREE.Group();
  ovenGrp.position.set(leftFX + 0.005, 1.18, 0.535);
  const appFrameMat = new THREE.MeshStandardMaterial({ color: '#1A1B1E', roughness: 0.32, metalness: 0.42 });
  const appGlassMat = new THREE.MeshStandardMaterial({ color: '#0D0F12', roughness: 0.06, metalness: 0.24 });
  const appBarMat   = new THREE.MeshStandardMaterial({ color: '#26272B', roughness: 0.28, metalness: 0.72 });
  const ovenFrame   = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.592, 0.592), appFrameMat);
  const ovenGlass   = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.41, 0.52), appGlassMat);
  ovenGlass.position.y = -0.05;
  const ovenHandle  = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.018, 0.46), appBarMat);
  ovenHandle.position.set(0.024, 0.145, 0);
  const ovenDisplay = new THREE.Mesh(new THREE.BoxGeometry(0.027, 0.022, 0.10), new THREE.MeshStandardMaterial({ color: '#111111', emissive: '#D8ECFF', emissiveIntensity: 0.6 }));
  ovenDisplay.position.set(0.002, 0.24, 0);
  ovenGrp.add(ovenFrame, ovenGlass, ovenHandle, ovenDisplay);
  scene.add(ovenGrp);

  const microGrp = new THREE.Group();
  microGrp.position.set(leftFX + 0.005, 1.68, 0.535);
  const microFrame  = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.392, 0.592), appFrameMat);
  const microGlass  = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.26, 0.50), appGlassMat);
  microGlass.position.y = -0.02;
  const microBar    = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.014, 0.42), appBarMat);
  microBar.position.set(0.020, 0.115, 0);
  microGrp.add(microFrame, microGlass, microBar);
  scene.add(microGrp);

  regFront({ w: 0.60, h: 0.80, x: leftFX, y: PLINTH_H + 0.40, z: 1.135, rotY: Math.PI / 2, kind: 'door', gripEdge: 'top', handle: { dir: 'v', len: 0.20, ox: -0.24, oy: 0.22 } });
  regFront({ w: 0.60, h: 1.36, x: leftFX, y: PLINTH_H + 1.48, z: 1.135, rotY: Math.PI / 2, kind: 'door', gripEdge: 'bottom', handle: { dir: 'v', len: 0.24, ox: -0.24, oy: -0.46 } });

  /* ---- C. EAST RIGHT PENINSULA RUN (Base Elements + Sink + Right Claustra) ---- */
  const rightLen = 2.14;
  const rightCenterZ = -1.00 + rightLen / 2;
  const rightCore = new THREE.Mesh(new THREE.BoxGeometry(cabD - 0.04, baseH - 0.003, rightLen), revealDarkMat);
  rightCore.position.set(RIGHT_EDGE_X - 0.02 - (cabD - 0.04) / 2, baseY, rightCenterZ);
  rightCore.castShadow = true; rightCore.receiveShadow = true;
  scene.add(rightCore);

  const rightInnerOverhang = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.0055, rightLen), overhangShadowMat);
  rightInnerOverhang.position.set(RIGHT_EDGE_X - cabD - 0.008, CAB_BASE_H - 0.0028, rightCenterZ);
  scene.add(rightInnerOverhang);

  const rightOuterOverhang = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.0055, 2.75), overhangShadowMat);
  rightOuterOverhang.position.set(RIGHT_EDGE_X + 0.005, CAB_BASE_H - 0.0028, -1.60 + 2.75 / 2);
  scene.add(rightOuterOverhang);

  const rightEndOverhang = new THREE.Mesh(new THREE.BoxGeometry(cabD + 0.024, 0.0055, 0.024), overhangShadowMat);
  rightEndOverhang.position.set(RIGHT_EDGE_X - cabD / 2, CAB_BASE_H - 0.0028, 1.148);
  scene.add(rightEndOverhang);

  const rightPlinth = new THREE.Mesh(new THREE.BoxGeometry(0.02, PLINTH_H, rightLen), plinthMaterial);
  rightPlinth.position.set(RIGHT_EDGE_X - cabD + 0.06, PLINTH_H / 2, rightCenterZ);
  scene.add(rightPlinth);

  const rightFX = RIGHT_EDGE_X - cabD + 0.01;
  regFront({ w: 0.34, h: 0.80, x: rightFX, y: baseY,           z: -0.83, rotY: -Math.PI / 2, kind: 'cover',  gripEdge: 'none', handle: null });
  regFront({ w: 0.60, h: 0.40, x: rightFX, y: PLINTH_H + 0.60, z: -0.36, rotY: -Math.PI / 2, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.13 } });
  regFront({ w: 0.60, h: 0.40, x: rightFX, y: PLINTH_H + 0.20, z: -0.36, rotY: -Math.PI / 2, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.13 } });
  regFront({ w: 0.60, h: 0.20, x: rightFX, y: PLINTH_H + 0.70, z:  0.24, rotY: -Math.PI / 2, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.04 } });
  regFront({ w: 0.60, h: 0.20, x: rightFX, y: PLINTH_H + 0.50, z:  0.24, rotY: -Math.PI / 2, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.04 } });
  regFront({ w: 0.60, h: 0.40, x: rightFX, y: PLINTH_H + 0.20, z:  0.24, rotY: -Math.PI / 2, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.13 } });
  regFront({ w: 0.60, h: 0.80, x: rightFX, y: baseY,           z:  0.84, rotY: -Math.PI / 2, kind: 'door',   gripEdge: 'top', handle: { dir: 'v', len: 0.16, ox: -0.24, oy: 0.26 } });

  [
    { z: -1.14, w: 0.91 },
    { z: -0.23, w: 0.91 },
    { z:  0.68, w: 0.92 }
  ].forEach(p => {
    regFront({ w: p.w, h: CAB_BASE_H - 0.004, x: RIGHT_EDGE_X - 0.01, y: (CAB_BASE_H - 0.004) / 2, z: p.z, rotY: Math.PI / 2, kind: 'cover', gripEdge: 'none', handle: null });
  });

  regFront({ w: cabD, h: CAB_BASE_H - 0.004, x: RIGHT_EDGE_X - cabD / 2, y: (CAB_BASE_H - 0.004) / 2, z: 1.14, rotY: 0, kind: 'cover', gripEdge: 'none', handle: null });

  const outerBack = new THREE.Mesh(new THREE.BoxGeometry(0.02, CAB_BASE_H - 0.006, 2.73), revealDarkMat);
  outerBack.position.set(RIGHT_EDGE_X - 0.022, (CAB_BASE_H - 0.006) / 2, -1.60 + 2.74 / 2);
  scene.add(outerBack);

  frontsGroup = new THREE.Group();
  scene.add(frontsGroup);
}

/**
 * Rebuilds all METOD doors, drawer fronts, and cover panels with authentic 3D profile geometry:
 * - flat     (HAVSTORP Beige / Marron beige): 16 mm smooth minimalist slab
 * - bodbyn   (BODBYN Blanc cassé): 19 mm classic bevelled shaker frame + angled inner bevel molding
 * - stensund (STENSUND Beige): 16 mm shaker frame + recessed center panel with vertical beadboard grooves
 * - upplov   (UPPLÖV Mat beige foncé): 19 mm bevelled slab + integrated matching powder-coated aluminium grip strip
 * - voxtorp  (VOXTORP Brillant gris-brun foncé): 21 mm glossy slab + sculpted 3D recessed horizontal J-pull channel
 */
function rebuildAllDoorFronts(doorDef) {
  frontsGroup.traverse(obj => {
    if (obj.isMesh && obj.geometry) obj.geometry.dispose();
  });
  while (frontsGroup.children.length > 0) {
    frontsGroup.remove(frontsGroup.children[0]);
  }
  handleGroups = [];

  const gap = 0.0032; // Crisp 3.2 mm dark METOD shadow reveal
  const prof = doorDef.profile;
  const thickM = doorDef.thicknessMm / 1000;

  frontSpecs.forEach(spec => {
    const w = spec.w - gap;
    const h = spec.h - gap;
    const grp = new THREE.Group();
    grp.position.set(spec.x, spec.y, spec.z);
    grp.rotation.y = spec.rotY;

    const addBox = (bw, bh, bd, bx, by, bz, mat = doorMaterial, rx = 0, ry = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
      m.position.set(bx, by, bz);
      if (rx) m.rotation.x = rx;
      if (ry) m.rotation.y = ry;
      m.castShadow = true;
      m.receiveShadow = true;
      grp.add(m);
      return m;
    };

    if (spec.kind === 'cover' || prof === 'flat') {
      addBox(w, h, thickM, 0, 0, 0, doorMaterial);
    } else if (prof === 'bodbyn') {
      const frameW = Math.min(0.056, w * 0.22);
      const frameH = h < 0.26 ? 0.036 : 0.056;
      const innerW = Math.max(0.04, w - frameW * 2);
      const innerH = Math.max(0.04, h - frameH * 2);

      addBox(innerW + 0.008, innerH + 0.008, 0.010, 0, 0, -0.004, doorMaterial);
      addBox(frameW, h, thickM, -(w - frameW) / 2, 0, 0, doorMaterial);
      addBox(frameW, h, thickM,  (w - frameW) / 2, 0, 0, doorMaterial);
      addBox(innerW, frameH, thickM, 0,  (h - frameH) / 2, 0, doorMaterial);
      addBox(innerW, frameH, thickM, 0, -(h - frameH) / 2, 0, doorMaterial);

      const bev = 0.011;
      addBox(innerW, bev, 0.008, 0,  innerH / 2 - bev * 0.35, 0.004, doorAccentMaterial,  0.65, 0);
      addBox(innerW, bev, 0.008, 0, -innerH / 2 + bev * 0.35, 0.004, doorAccentMaterial, -0.65, 0);
      addBox(bev, innerH, 0.008, -innerW / 2 + bev * 0.35, 0, 0.004, doorAccentMaterial, 0, -0.65);
      addBox(bev, innerH, 0.008,  innerW / 2 - bev * 0.35, 0, 0.004, doorAccentMaterial, 0,  0.65);
    } else if (prof === 'stensund') {
      const frameW = Math.min(0.050, w * 0.22);
      const frameH = h < 0.26 ? 0.032 : 0.050;
      const innerW = Math.max(0.04, w - frameW * 2);
      const innerH = Math.max(0.04, h - frameH * 2);

      addBox(innerW + 0.006, innerH + 0.006, 0.010, 0, 0, -0.003, doorMaterial);
      addBox(frameW, h, thickM, -(w - frameW) / 2, 0, 0, doorMaterial);
      addBox(frameW, h, thickM,  (w - frameW) / 2, 0, 0, doorMaterial);
      addBox(innerW, frameH, thickM, 0,  (h - frameH) / 2, 0, doorMaterial);
      addBox(innerW, frameH, thickM, 0, -(h - frameH) / 2, 0, doorMaterial);

      const pitch = 0.058;
      const numGrooves = Math.max(1, Math.floor(innerW / pitch) - 1);
      const step = innerW / (numGrooves + 1);
      for (let g = 1; g <= numGrooves; g++) {
        const gx = -innerW / 2 + g * step;
        addBox(0.0026, innerH - 0.002, 0.0018, gx, 0, 0.0024, doorAccentMaterial);
      }
    } else if (prof === 'upplov') {
      const gripH = 0.022;
      const hasTopGrip = spec.gripEdge === 'top';
      const hasBotGrip = spec.gripEdge === 'bottom';

      if (hasTopGrip || hasBotGrip) {
        const bodyH = h - gripH;
        const bodyY = hasTopGrip ? -gripH / 2 : gripH / 2;
        const gripY = hasTopGrip ? (h / 2 - gripH / 2) : (-h / 2 + gripH / 2);

        addBox(w, bodyH, thickM * 0.58, 0, bodyY, -thickM * 0.21, doorMaterial);
        addBox(w - 0.007, bodyH - 0.007, thickM * 0.46, 0, bodyY, thickM * 0.27, doorMaterial);

        addBox(w - 0.002, gripH, thickM * 0.45, 0, gripY, -thickM * 0.26, doorAccentMaterial);
        addBox(w, gripH * 0.42, thickM * 0.96, 0, gripY + (hasTopGrip ? gripH * 0.29 : -gripH * 0.29), 0, doorGripMaterial);
        addBox(w, gripH * 0.88, 0.0032, 0, gripY, thickM * 0.46, doorGripMaterial);
      } else {
        addBox(w, h, thickM * 0.58, 0, 0, -thickM * 0.21, doorMaterial);
        addBox(w - 0.007, h - 0.007, thickM * 0.46, 0, 0, thickM * 0.27, doorMaterial);
      }
    } else if (prof === 'voxtorp') {
      const chanH = 0.030;
      const hasTopJ = spec.gripEdge === 'top';
      const hasBotJ = spec.gripEdge === 'bottom';

      if (hasTopJ || hasBotJ) {
        const bodyH = h - chanH;
        const bodyY = hasTopJ ? -chanH / 2 : chanH / 2;
        const chanY = hasTopJ ? (h / 2 - chanH / 2) : (-h / 2 + chanH / 2);

        addBox(w, bodyH, thickM, 0, bodyY, 0, doorMaterial);
        addBox(w, chanH, thickM * 0.44, 0, chanY, -thickM * 0.28, doorAccentMaterial);
        addBox(
          w, 0.015, 0.011,
          0,
          hasTopJ ? (bodyY + bodyH / 2 + 0.003) : (bodyY - bodyH / 2 - 0.003),
          thickM * 0.14,
          doorMaterial,
          hasTopJ ? 0.72 : -0.72,
          0
        );
        addBox(
          w, 0.0045, thickM * 0.68,
          0,
          hasTopJ ? (h / 2 - 0.00225) : (-h / 2 + 0.00225),
          -thickM * 0.16,
          doorMaterial
        );
      } else {
        addBox(w, h, thickM, 0, 0, 0, doorMaterial);
      }
    }

    if (spec.handle) {
      const hGrp = new THREE.Group();
      const len = spec.handle.len || 0.16;
      const thk = 0.009;
      const proj = 0.022;
      const isH = spec.handle.dir === 'h';
      const faceZ = thickM / 2;

      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(isH ? len : thk, isH ? thk : len, thk),
        hardwareMaterial
      );
      bar.position.set(spec.handle.ox || 0, spec.handle.oy || 0, faceZ + proj);
      bar.castShadow = true;

      const pGeo = new THREE.BoxGeometry(thk, thk, proj);
      const p1 = new THREE.Mesh(pGeo, hardwareMaterial);
      const p2 = new THREE.Mesh(pGeo, hardwareMaterial);
      const off = len * 0.36;
      p1.position.set((spec.handle.ox || 0) + (isH ? -off : 0), (spec.handle.oy || 0) + (isH ? 0 : -off), faceZ + proj / 2);
      p2.position.set((spec.handle.ox || 0) + (isH ?  off : 0), (spec.handle.oy || 0) + (isH ? 0 :  off), faceZ + proj / 2);

      hGrp.add(bar, p1, p2);
      hGrp.visible = !doorDef.integratedHandle;
      grp.add(hGrp);
      handleGroups.push(hGrp);
    }

    frontsGroup.add(grp);
  });
}

/* =========================================================================
 * 8. U-SHAPED COUNTERTOP (DYNAMIC 2.0 / 2.8 / 3.8 CM), COOKTOP, SINK & PROPS
 * ========================================================================= */
function buildCountertopAndSurface() {
  countertopMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    roughness: 1.0, // Driven by roughnessMap
    metalness: 0.02,
    envMapIntensity: 0.52,
    normalScale: new THREE.Vector2(0.18, 0.18)
  });

  function addSlab(w, d, x, z, rotGrain90 = false) {
    const geo = new THREE.BoxGeometry(w, 1, d);
    const uv = geo.attributes.uv;
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const uvScale = 0.85;

    for (let i = 0; i < pos.count; i++) {
      const nx = Math.abs(norm.getX(i));
      const ny = Math.abs(norm.getY(i));
      const px = pos.getX(i) + x;
      const py = pos.getY(i);
      const pz = pos.getZ(i) + z;

      if (ny > 0.5) {
        uv.setXY(i, rotGrain90 ? pz * uvScale : px * uvScale, rotGrain90 ? px * uvScale : pz * uvScale);
      } else if (nx > 0.5) {
        uv.setXY(i, pz * uvScale, py * 0.08);
      } else {
        uv.setXY(i, px * uvScale, py * 0.08);
      }
    }
    uv.needsUpdate = true;
    geo.computeTangents();

    const mesh = new THREE.Mesh(geo, countertopMaterial);
    mesh.position.set(x, CAB_BASE_H + 0.014, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    countertopSlabs.push(mesh);
  }

  const backZMin = BACK_WALL_Z;
  const backZMax = BACK_WALL_Z + COUNTER_DEPTH;

  const backWidth = (RIGHT_EDGE_X + 0.025) - LEFT_WALL_X;
  addSlab(backWidth, COUNTER_DEPTH, LEFT_WALL_X + backWidth / 2, (backZMin + backZMax) / 2, false);

  const leftSpanZ = 0.235 - backZMax;
  addSlab(COUNTER_DEPTH, leftSpanZ, LEFT_WALL_X + COUNTER_DEPTH / 2, backZMax + leftSpanZ / 2, true);

  const penXMax = RIGHT_EDGE_X + 0.025;
  const penXMin = penXMax - PENINSULA_DEPTH;
  const penXMid = (penXMin + penXMax) / 2;
  const penZEnd = 1.165;

  const sinkCenterX = 1.21;
  const sinkCenterZ = -0.34;
  const sinkCutX = 0.40;
  const sinkCutZ = 0.56;
  const sXMin = sinkCenterX - sinkCutX / 2;
  const sXMax = sinkCenterX + sinkCutX / 2;
  const sZMin = sinkCenterZ - sinkCutZ / 2;
  const sZMax = sinkCenterZ + sinkCutZ / 2;

  const segNorthD = sZMin - backZMax;
  addSlab(PENINSULA_DEPTH, segNorthD, penXMid, backZMax + segNorthD / 2, true);

  const segSouthD = penZEnd - sZMax;
  addSlab(PENINSULA_DEPTH, segSouthD, penXMid, sZMax + segSouthD / 2, true);

  const innerStripW = sXMin - penXMin;
  addSlab(innerStripW, sinkCutZ, penXMin + innerStripW / 2, sinkCenterZ, true);

  const outerStripW = penXMax - sXMax;
  addSlab(outerStripW, sinkCutZ, sXMax + outerStripW / 2, sinkCenterZ, true);

  surfaceGroup = new THREE.Group();
  surfaceGroup.position.y = CAB_BASE_H + 0.028;
  scene.add(surfaceGroup);

  /* --- 4-Zone Black Glass Induction Cooktop (North Back Wall, Centered) --- */
  const hobGrp = new THREE.Group();
  hobGrp.position.set(0.0, 0.003, BACK_WALL_Z + 0.32);
  const hobGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.006, 0.51),
    new THREE.MeshStandardMaterial({ color: '#101114', roughness: 0.07, metalness: 0.24 })
  );
  hobGlass.receiveShadow = true;
  hobGrp.add(hobGlass);

  // Use MeshStandardMaterial (not MeshBasicMaterial) for accurate PBR & GPU Path Tracing compatibility
  const ringMat = new THREE.MeshStandardMaterial({ color: '#616670', roughness: 0.35, metalness: 0.15 });
  [
    [-0.20, -0.10, 0.095],
    [-0.20,  0.10, 0.078],
    [ 0.20, -0.10, 0.086],
    [ 0.19,  0.10, 0.106]
  ].forEach(([zx, zz, r]) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.004, r, 32), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(zx, 0.004, zz);
    hobGrp.add(ring);
  });
  surfaceGroup.add(hobGrp);

  /* --- Undermount / Inset Sink + Gooseneck Faucet (East Peninsula) --- */
  const sinkMat = new THREE.MeshStandardMaterial({ color: '#24262A', roughness: 0.38, metalness: 0.24 });
  const rimMat  = new THREE.MeshStandardMaterial({ color: '#2C2E33', roughness: 0.28, metalness: 0.48 });
  const sinkGrp = new THREE.Group();
  sinkGrp.position.set(sinkCenterX, 0, sinkCenterZ);

  const rimShape = new THREE.Shape();
  rimShape.moveTo(-0.22, -0.30); rimShape.lineTo(0.22, -0.30);
  rimShape.lineTo(0.22, 0.30);   rimShape.lineTo(-0.22, 0.30); rimShape.closePath();
  const rimHole = new THREE.Path();
  rimHole.moveTo(-0.195, -0.275); rimHole.lineTo(0.195, -0.275);
  rimHole.lineTo(0.195, 0.275);   rimHole.lineTo(-0.195, 0.275); rimHole.closePath();
  rimShape.holes.push(rimHole);
  const rimGeo = new THREE.ExtrudeGeometry(rimShape, { depth: 0.0035, bevelEnabled: false });
  rimGeo.rotateX(Math.PI / 2);
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.y = 0.0035;
  sinkGrp.add(rimMesh);

  const bd = 0.18;
  const bot = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.012, 0.56), sinkMat); bot.position.y = -bd;
  const wW  = new THREE.Mesh(new THREE.BoxGeometry(0.012, bd, 0.56), sinkMat); wW.position.set(-0.20, -bd / 2, 0);
  const wE  = new THREE.Mesh(new THREE.BoxGeometry(0.012, bd, 0.56), sinkMat); wE.position.set( 0.20, -bd / 2, 0);
  const wN  = new THREE.Mesh(new THREE.BoxGeometry(0.40, bd, 0.012), sinkMat); wN.position.set(0, -bd / 2, -0.28);
  const wS  = new THREE.Mesh(new THREE.BoxGeometry(0.40, bd, 0.012), sinkMat); wS.position.set(0, -bd / 2,  0.28);
  const drain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.004, 24),
    new THREE.MeshStandardMaterial({ color: '#B8BDC2', roughness: 0.20, metalness: 0.85 })
  );
  drain.position.set(0.02, -bd + 0.008, 0);
  sinkGrp.add(bot, wW, wE, wN, wS, drain);

  const faucetGrp = new THREE.Group();
  faucetGrp.position.set(0.24, 0, 0);
  const fBase = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.018, 20), faucetMaterial);
  fBase.position.y = 0.009;
  const fCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.015, 0),
    new THREE.Vector3(0, 0.24, 0),
    new THREE.Vector3(-0.04, 0.34, 0),
    new THREE.Vector3(-0.12, 0.35, 0),
    new THREE.Vector3(-0.175, 0.29, 0),
    new THREE.Vector3(-0.18, 0.24, 0)
  ]);
  const spout = new THREE.Mesh(new THREE.TubeGeometry(fCurve, 26, 0.0115, 12, false), faucetMaterial);
  spout.castShadow = true;
  const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.006, 0.075, 10), faucetMaterial);
  lever.rotation.x = Math.PI / 2.2;
  lever.position.set(0, 0.095, 0.045);
  faucetGrp.add(fBase, spout, lever);
  sinkGrp.add(faucetGrp);
  surfaceGroup.add(sinkGrp);

  /* --- Backsplash (Crédence) along North & West Walls --- */
  backsplashMaterial = new THREE.MeshStandardMaterial({
    color: 0xF7F7F5,
    roughness: 0.86,
    metalness: 0.0,
    envMapIntensity: 0.28,
    normalScale: new THREE.Vector2(0.35, 0.35)
  });
  const baseBsH = WALL_CAB_BOT - (CAB_BASE_H + 0.028);
  const backBsGeo = new THREE.BoxGeometry(3.10, baseBsH, 0.014);
  backBsGeo.computeTangents();
  const backBS = new THREE.Mesh(backBsGeo, backsplashMaterial);
  backBS.position.set(0, WALL_CAB_BOT - baseBsH / 2, BACK_WALL_Z + 0.008);
  backBS.receiveShadow = true;
  scene.add(backBS);

  const leftBsGeo = new THREE.BoxGeometry(0.014, baseBsH, 1.835);
  leftBsGeo.computeTangents();
  const leftBS = new THREE.Mesh(leftBsGeo, backsplashMaterial);
  leftBS.position.set(LEFT_WALL_X + 0.008, WALL_CAB_BOT - baseBsH / 2, BACK_WALL_Z + 1.835 / 2);
  leftBS.receiveShadow = true;
  scene.add(leftBS);
  backsplashMeshes.push(backBS, leftBS);

  buildProps(surfaceGroup);
}

function buildProps(parent) {
  // 1. Ceramic Mug on East Peninsula (framed nicely in Edge Close-Up)
  const mugGrp = new THREE.Group();
  mugGrp.position.set(1.22, 0, 0.42);
  const mugMat = new THREE.MeshStandardMaterial({ color: '#EAE5DC', roughness: 0.52 });
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.036, 0.088, 22), mugMat);
  mug.position.y = 0.044; mug.castShadow = true; mug.receiveShadow = true;
  const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.004, 18), new THREE.MeshStandardMaterial({ color: '#3B2516', roughness: 0.14 }));
  coffee.position.y = 0.082;
  const mHandle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 8, 16, Math.PI), mugMat);
  mHandle.rotation.z = -Math.PI / 2;
  mHandle.position.set(0.038, 0.046, 0);
  mugGrp.add(mug, coffee, mHandle);
  parent.add(mugGrp);

  // 2. Small Potted Herb on East Peninsula South Prep Area
  const herbGrp = new THREE.Group();
  herbGrp.position.set(1.24, 0, 0.78);
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.064, 0.050, 0.105, 22),
    new THREE.MeshStandardMaterial({ color: '#D6CEC2', roughness: 0.78 })
  );
  pot.position.y = 0.0525; pot.castShadow = true; pot.receiveShadow = true;
  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.058, 0.058, 0.01, 18),
    new THREE.MeshStandardMaterial({ color: '#3D3229', roughness: 0.95 })
  );
  soil.position.y = 0.098;
  herbGrp.add(pot, soil);

  const leafMat = new THREE.MeshStandardMaterial({ color: '#4E6B47', roughness: 0.68 });
  [
    [0, 0.145, 0, 0.042], [-0.032, 0.132, 0.02, 0.034], [0.030, 0.135, -0.018, 0.035],
    [0.018, 0.140, 0.030, 0.032], [-0.022, 0.138, -0.026, 0.033], [0, 0.172, 0.005, 0.028]
  ].forEach(([lx, ly, lz, r]) => {
    const lf = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), leafMat);
    lf.scale.set(1.0, 0.85, 1.0);
    lf.position.set(lx, ly, lz);
    lf.castShadow = true;
    herbGrp.add(lf);
  });
  parent.add(herbGrp);

  // 3. Wood Cutting Board + Olive Oil Bottle near Back Cooktop
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.36, 0.018),
    new THREE.MeshStandardMaterial({ color: '#BA9064', roughness: 0.62 })
  );
  board.position.set(-0.66, 0.176, -1.53);
  board.rotation.x = -0.13;
  board.castShadow = true;
  parent.add(board);

  const oilGrp = new THREE.Group();
  oilGrp.position.set(0.56, 0, -1.44);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#5A4A1E', roughness: 0.12, metalness: 0.06, clearcoat: 0.7, clearcoatRoughness: 0.08 });
  const bBody = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.165, 20), glassMat);
  bBody.position.y = 0.0825; bBody.castShadow = true;
  const bNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.028, 0.055, 18), glassMat);
  bNeck.position.y = 0.19;
  const bCork = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.028, 14), new THREE.MeshStandardMaterial({ color: '#C69D52', roughness: 0.25, metalness: 0.85 }));
  bCork.position.y = 0.23;
  const bLabel = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.068, 20), new THREE.MeshStandardMaterial({ color: '#F3EFE6', roughness: 0.85 }));
  bLabel.position.y = 0.085;
  oilGrp.add(bBody, bNeck, bCork, bLabel);
  parent.add(oilGrp);

  // 4. Matte Black Espresso Machine on West Prep Arm
  const espGrp = new THREE.Group();
  espGrp.position.set(LEFT_WALL_X + 0.24, 0, -0.44);
  espGrp.rotation.y = Math.PI / 2;
  const mBlk = new THREE.MeshStandardMaterial({ color: '#1E1F23', roughness: 0.38, metalness: 0.35 });
  const mChr = new THREE.MeshStandardMaterial({ color: '#C8CCD0', roughness: 0.22, metalness: 0.85 });
  const cBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.31, 0.28), mBlk);
  cBody.position.y = 0.155; cBody.castShadow = true;
  const cHead = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.09), mBlk);
  cHead.position.set(0, 0.265, 0.14); cHead.castShadow = true;
  const cTray = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.024, 0.11), mChr);
  cTray.position.set(0, 0.012, 0.14);
  espGrp.add(cBody, cHead, cTray);
  parent.add(espGrp);
}

/* =========================================================================
 * 9. ARCHITECTURAL RIGHT-SIDE CLAUSTRA (Stands Flush on East Countertop)
 * ========================================================================= */
function buildClaustra() {
  if (claustraGroup) surfaceGroup.remove(claustraGroup);
  claustraGroup = new THREE.Group();

  const fin = getClaustraFinishData(state.claustraFinish);
  claustraMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    map: fin.map,
    roughness: fin.roughness,
    metalness: 0.02,
    envMapIntensity: 0.30
  });

  rebuildClaustraGeometry();
  surfaceGroup.add(claustraGroup);
}

function rebuildClaustraGeometry() {
  while (claustraGroup.children.length > 0) {
    const ch = claustraGroup.children[0];
    if (ch.geometry) ch.geometry.dispose();
    claustraGroup.remove(ch);
  }
  if (state.claustraHeight === 'off') return;

  const thickM = (COUNTERTOPS.find(c => c.id === state.countertopId)?.thicknessCm || 2.8) / 100;
  const counterTopY = CAB_BASE_H + thickM;
  const fullH = CEILING_Y - counterTopY;
  const claustraH = state.claustraHeight === 'half' ? 0.86 : fullH;

  const zStart = -1.52;
  const zEnd = 1.13;
  const spanZ = zEnd - zStart;
  const centerZ = (zStart + zEnd) / 2;
  const xPos = RIGHT_EDGE_X - 0.022;

  const railH = 0.026;
  const railDepthX = 0.064;

  const botRail = new THREE.Mesh(new THREE.BoxGeometry(railDepthX, railH, spanZ), claustraMaterial);
  botRail.position.set(xPos, railH / 2, centerZ);
  botRail.castShadow = true; botRail.receiveShadow = true;
  claustraGroup.add(botRail);

  const topRailH = state.claustraHeight === 'half' ? 0.032 : railH + 0.01;
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(railDepthX, topRailH, spanZ), claustraMaterial);
  topRail.position.set(xPos, claustraH - topRailH / 2, centerZ);
  topRail.castShadow = true; topRail.receiveShadow = true;
  claustraGroup.add(topRail);

  const slatThickZ = 0.034;
  const slatDepthX = 0.058;
  const targetPitch = 0.094;
  const count = Math.max(6, Math.round(spanZ / targetPitch));
  const actualPitch = (spanZ - slatThickZ) / (count - 1);
  const slatH = claustraH - railH - topRailH;
  const slatGeo = new THREE.BoxGeometry(slatDepthX, slatH, slatThickZ);

  for (let i = 0; i < count; i++) {
    const z = zStart + slatThickZ / 2 + i * actualPitch;
    const slat = new THREE.Mesh(slatGeo, claustraMaterial);
    slat.position.set(xPos, railH + slatH / 2, z);
    slat.castShadow = true; slat.receiveShadow = true;
    claustraGroup.add(slat);
  }
}

/* =========================================================================
 * 10. SCANDINAVIAN PENDANTS OVER EAST PENINSULA
 * ========================================================================= */
function buildPendants() {
  const shadeMat = new THREE.MeshStandardMaterial({ color: '#F3F2EE', roughness: 0.55, side: THREE.DoubleSide });
  const cordMat  = new THREE.MeshStandardMaterial({ color: '#262523', roughness: 0.85 });
  pendantBulbMat = new THREE.MeshStandardMaterial({
    color: '#FFF6E5',
    emissive: '#FFC978',
    emissiveIntensity: 0.4,
    roughness: 0.2
  });

  [-0.35, 0.55].forEach(pz => {
    const pGrp = new THREE.Group();
    pGrp.position.set(1.16, CEILING_Y, pz);

    const drop = 0.72;
    const cord  = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, drop, 8), cordMat);
    cord.position.y = -drop / 2;
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.125, 0.14, 26, 1, true), shadeMat);
    shade.position.y = -drop - 0.05; shade.castShadow = true;
    const bulb  = new THREE.Mesh(new THREE.SphereGeometry(0.032, 14, 12), pendantBulbMat);
    bulb.position.y = -drop - 0.08;

    const pLight = new THREE.PointLight('#FFD093', 0.12, 3.2, 2);
    pLight.position.y = -drop - 0.14;
    pendantLights.push(pLight);

    pGrp.add(cord, shade, bulb, pLight);
    scene.add(pGrp);
  });
}

/* =========================================================================
 * 11. REAL-TIME UPDATERS (DOORS, COUNTERTOPS, LIGHTING, STYLING)
 * ========================================================================= */
function syncComboBIfNeeded() {
  if (state.comboA) {
    const sameAsA = (state.doorId === state.comboA.doorId && state.countertopId === state.comboA.countertopId);
    if (!sameAsA) {
      state.comboB = { doorId: state.doorId, countertopId: state.countertopId };
    }
  }
}

function applyDoor(id, trackB = true) {
  const def = DOORS.find(d => d.id === id);
  if (!def) return;

  state.doorId = id;
  if (trackB) syncComboBIfNeeded();

  doorMaterial.color.set(def.hex);
  doorMaterial.roughness = def.materialParams.roughness;
  doorMaterial.metalness = def.materialParams.metalness;
  doorMaterial.clearcoat = def.materialParams.clearcoat;
  doorMaterial.clearcoatRoughness = def.materialParams.clearcoatRoughness;
  doorMaterial.envMapIntensity = def.materialParams.envMapIntensity;
  doorMaterial.needsUpdate = true;

  const accentCol = new THREE.Color(def.hex).multiplyScalar(def.profile === 'voxtorp' ? 0.52 : 0.80);
  doorAccentMaterial.color.copy(accentCol);
  doorAccentMaterial.roughness = Math.min(0.95, def.materialParams.roughness + 0.10);
  doorAccentMaterial.clearcoat = def.materialParams.clearcoat * 0.4;
  doorAccentMaterial.needsUpdate = true;

  if (def.gripHex) {
    doorGripMaterial.color.set(def.gripHex);
    doorGripMaterial.needsUpdate = true;
  }

  plinthMaterial.color.set(def.plinthHex);
  plinthMaterial.roughness = Math.min(0.92, def.materialParams.roughness + 0.06);
  plinthMaterial.needsUpdate = true;

  rebuildAllDoorFronts(def);
  if (state.rtActive && rayTracer) rayTracer.onGeometryChanged();

  renderUI();
}

function applyCountertop(id, trackB = true) {
  const item = COUNTERTOPS.find(c => c.id === id);
  if (!item) return;

  state.countertopId = id;
  if (trackB) syncComboBIfNeeded();

  const tex = getCountertopTextures(item);
  countertopMaterial.map = tex.map;
  countertopMaterial.normalMap = tex.normalMap;
  countertopMaterial.normalScale.set(item.normalStrength || 0.2, item.normalStrength || 0.2);
  countertopMaterial.roughnessMap = tex.roughnessMap;
  countertopMaterial.roughness = 1.0; // Modulated by roughnessMap
  countertopMaterial.metalness = item.metalness;
  countertopMaterial.envMapIntensity = item.category === 'white' ? 0.46 : (item.thicknessCm === 2.0 ? 0.65 : 0.38);
  countertopMaterial.needsUpdate = true;

  const thickM = item.thicknessCm / 100;
  countertopSlabs.forEach(slab => {
    slab.scale.y = thickM;
    slab.position.y = CAB_BASE_H + thickM / 2;
  });

  const topY = CAB_BASE_H + thickM;
  surfaceGroup.position.y = topY;

  const baseBsH = WALL_CAB_BOT - (CAB_BASE_H + 0.028);
  const newBsH = WALL_CAB_BOT - topY;
  backsplashMeshes.forEach(bs => {
    bs.scale.y = newBsH / baseBsH;
    bs.position.y = topY + newBsH / 2;
  });

  rebuildClaustraGeometry();

  if (state.backsplash === 'matching') {
    applyBacksplash('matching');
  }

  if (state.rtActive && rayTracer) rayTracer.onGeometryChanged();
  renderUI();
}

function applyLighting(mode) {
  state.lighting = mode;
  if (mode === 'morning') {
    scene.background.set('#EAE7E1');
    scene.fog.color.set('#EAE7E1');
    renderer.toneMappingExposure = 0.94;
    hemiLight.color.set('#FFFFFF');
    hemiLight.groundColor.set('#9E958A');
    hemiLight.intensity = 1.05;
    sunLight.color.set('#FFF5E8');
    sunLight.intensity = 2.20;
    sunLight.position.set(5.4, 3.85, 2.35);
    fillLight.color.set('#F2F6FF');
    fillLight.intensity = 0.58;
    rimLight.intensity = 0.36;
    underCabLights.forEach(l => l.intensity = 0.36);
    underCabStripMat.emissiveIntensity = 0.85;
    pendantLights.forEach(l => l.intensity = 0.10);
    pendantBulbMat.emissiveIntensity = 0.35;
  } else if (mode === 'daylight') {
    scene.background.set('#ECECEB');
    scene.fog.color.set('#ECECEB');
    renderer.toneMappingExposure = 0.94;
    hemiLight.color.set('#FFFFFF');
    hemiLight.groundColor.set('#B4B2AE');
    hemiLight.intensity = 1.38;
    sunLight.color.set('#FFFFFF');
    sunLight.intensity = 1.40;
    sunLight.position.set(3.2, 5.8, 3.4);
    fillLight.color.set('#FFFFFF');
    fillLight.intensity = 0.72;
    rimLight.intensity = 0.42;
    underCabLights.forEach(l => l.intensity = 0.10);
    underCabStripMat.emissiveIntensity = 0.35;
    pendantLights.forEach(l => l.intensity = 0.05);
    pendantBulbMat.emissiveIntensity = 0.15;
  } else if (mode === 'evening') {
    scene.background.set('#201E1C');
    scene.fog.color.set('#201E1C');
    renderer.toneMappingExposure = 0.92;
    hemiLight.color.set('#7A7D92');
    hemiLight.groundColor.set('#2D2722');
    hemiLight.intensity = 0.48;
    sunLight.color.set('#9AA8C7');
    sunLight.intensity = 0.28;
    sunLight.position.set(4.5, 3.5, 3.0);
    fillLight.intensity = 0.15;
    rimLight.intensity = 0.10;
    underCabLights.forEach(l => l.intensity = 3.2);
    underCabStripMat.emissiveIntensity = 3.6;
    pendantLights.forEach(l => l.intensity = 2.8);
    pendantBulbMat.emissiveIntensity = 3.2;
  }

  if (state.rtActive && rayTracer) {
    rayTracer.onLightingChanged(mode);
  }
  renderRoomButtons();
}

function applyClaustraHeight(h) {
  state.claustraHeight = h;
  rebuildClaustraGeometry();
  if (state.rtActive && rayTracer) rayTracer.onGeometryChanged();
  renderRoomButtons();
}

function applyClaustraFinish(fin) {
  state.claustraFinish = fin;
  const data = getClaustraFinishData(fin);
  claustraMaterial.map = data.map;
  claustraMaterial.roughness = data.roughness;
  claustraMaterial.needsUpdate = true;
  if (state.rtActive && rayTracer) rayTracer.onMaterialsChanged();
  renderRoomButtons();
}

function applyBacksplash(mode) {
  state.backsplash = mode;
  if (mode === 'matching') {
    const item = COUNTERTOPS.find(c => c.id === state.countertopId);
    const tex = getCountertopTextures(item);
    const m = tex.map.clone();
    m.needsUpdate = true;
    m.repeat.set(2.4, 0.55);
    const nm = tex.normalMap.clone();
    nm.needsUpdate = true;
    nm.repeat.copy(m.repeat);
    backsplashMaterial.map = m;
    backsplashMaterial.normalMap = nm;
    backsplashMaterial.normalScale.set(item.normalStrength || 0.2, item.normalStrength || 0.2);
    backsplashMaterial.color.set(0xFFFFFF);
    backsplashMaterial.roughness = item.roughness;
  } else if (mode === 'white') {
    backsplashMaterial.map = null;
    backsplashMaterial.normalMap = null;
    backsplashMaterial.color.set(0xF7F7F5);
    backsplashMaterial.roughness = 0.88;
  } else {
    const t = getBacksplashTextures(mode);
    const m = t.map.clone();
    m.needsUpdate = true;
    m.repeat.set(mode === 'subway' ? 4.8 : 2.5, mode === 'subway' ? 1.15 : 0.6);
    const nm = t.normalMap.clone();
    nm.needsUpdate = true;
    nm.repeat.copy(m.repeat);
    backsplashMaterial.map = m;
    backsplashMaterial.normalMap = nm;
    backsplashMaterial.normalScale.set(t.normalScale, t.normalScale);
    backsplashMaterial.color.set(0xFFFFFF);
    backsplashMaterial.roughness = t.roughness;
  }
  backsplashMaterial.needsUpdate = true;
  if (state.rtActive && rayTracer) rayTracer.onMaterialsChanged();
  renderRoomButtons();
}

function applyHardware(mode) {
  state.hardware = mode;
  let col = 0x1E1F22, rough = 0.34, metal = 0.60;
  if (mode === 'brass') {
    col = 0xC8A156; rough = 0.26; metal = 0.86;
  } else if (mode === 'steel') {
    col = 0xCED2D7; rough = 0.22; metal = 0.88;
  }

  hardwareMaterial.color.setHex(col);
  hardwareMaterial.roughness = rough;
  hardwareMaterial.metalness = metal;
  hardwareMaterial.needsUpdate = true;

  faucetMaterial.color.setHex(col);
  faucetMaterial.roughness = rough;
  faucetMaterial.metalness = metal;
  faucetMaterial.needsUpdate = true;

  if (state.rtActive && rayTracer) rayTracer.onMaterialsChanged();
  renderRoomButtons();
}

function applyFloor(mode) {
  state.floor = mode;
  const t = getFloorTextures(mode);
  floorMaterial.map = t.map;
  floorMaterial.normalMap = t.normalMap;
  floorMaterial.normalScale.set(t.normalScale, t.normalScale);
  floorMaterial.roughness = t.roughness;
  floorMaterial.needsUpdate = true;
  if (state.rtActive && rayTracer) rayTracer.onMaterialsChanged();
  renderUI();
}

/* =========================================================================
 * 11B. ON-DEMAND GPU RAY TRACING CONTROLLER (LAZY LOADED)
 * ========================================================================= */
async function toggleRayTracing() {
  if (state.rtLoading || isContextLost) return;

  if (state.rtActive) {
    // Exit Ray Trace -> Instant return to 60fps interactive WebGL
    state.rtActive = false;
    if (rayTracer) rayTracer.disable();
    syncRendererSize(true);
    renderRayTraceUI();
    showToast('Returned to 60fps Realtime 3D');
    return;
  }

  // Enter On-Demand GPU Ray Tracing
  const compilePill = document.getElementById('rt-compiling-pill');
  const compileText = document.getElementById('rt-compiling-text');
  state.rtLoading = true;
  compileText.textContent = rayTracer
    ? 'Rebuilding GPU Ray Tracing BVH…'
    : 'Loading GPU Path Tracer & compiling shaders…';
  compilePill.classList.remove('hidden');
  renderRayTraceUI();

  try {
    if (!rayTracer) {
      const { KitchenRayTracer } = await import('./raytracer.js');
      rayTracer = new KitchenRayTracer({
        renderer,
        scene,
        camera,
        controls,
        lightRefs: { sunLight, fillLight, rimLight, underCabLights, pendantLights },
        constants: { WALL_CAB_BOT, BACK_WALL_Z, LEFT_WALL_X, CEILING_Y }
      });
    }

    await rayTracer.enable(state.lighting, (phase) => {
      if (phase === 'compiling') {
        compileText.textContent = 'Building BVH & compiling Ray Tracing shaders…';
      }
    });

    state.rtActive = true;
    lastRtCamPos.copy(camera.position);
    lastRtCamQuat.copy(camera.quaternion);
    lastHudSamples = -1;
    syncRendererSize(true);

    showToast(`Ray Tracing ON (${rayTracer.gpuLabel} · ${rayTracer.profileKey === 'ultra' ? 'RTX Ultra' : rayTracer.profileKey === 'mobile' ? 'Fold / Fast' : 'Balanced'})`);
  } catch (err) {
    console.error('Ray tracing failed to start:', err);
    state.rtActive = false;
    if (rayTracer) rayTracer.disable();
    showToast('Ray Tracing unavailable on this browser/GPU');
  } finally {
    state.rtLoading = false;
    compilePill.classList.add('hidden');
    renderRayTraceUI();
  }
}

function renderRayTraceUI() {
  const btn = document.getElementById('btn-toggle-rt');
  const dot = document.getElementById('rt-btn-dot');
  const lbl = document.getElementById('rt-btn-label');
  const hud = document.getElementById('rt-hud');
  const sidebarBtnLbl = document.getElementById('sidebar-rt-label');

  if (state.rtLoading) {
    lbl.textContent = 'Starting…';
    dot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0';
    if (sidebarBtnLbl) sidebarBtnLbl.textContent = 'Starting Ray Tracer…';
    return;
  }

  if (state.rtActive && rayTracer) {
    btn.className = 'min-h-[36px] sm:min-h-[38px] px-2.5 sm:px-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 backdrop-blur-md border border-amber-500/40 shadow-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap';
    dot.className = 'w-2 h-2 rounded-full bg-emerald-700 rt-dot-active shrink-0';
    lbl.textContent = 'Exit RT';
    hud.classList.remove('hidden');
    if (sidebarBtnLbl) sidebarBtnLbl.textContent = 'Exit Ray Tracing (Back to 60fps)';

    const gpuBadge = document.getElementById('rt-gpu-badge');
    if (gpuBadge) gpuBadge.textContent = rayTracer.gpuLabel;

    // Denoise button state
    const denoiseBtn = document.getElementById('btn-rt-denoise');
    denoiseBtn.textContent = rayTracer.denoiseEnabled ? 'Denoise: ON' : 'Denoise: OFF';
    denoiseBtn.className = rayTracer.denoiseEnabled
      ? 'min-h-[30px] px-2 rounded-lg text-[10px] font-semibold bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 hover:bg-emerald-500/35 transition-all cursor-pointer whitespace-nowrap'
      : 'min-h-[30px] px-2 rounded-lg text-[10px] font-semibold bg-white/15 text-white/75 border border-white/15 hover:bg-white/25 transition-all cursor-pointer whitespace-nowrap';

    // Profile pills
    document.querySelectorAll('.rt-profile-btn').forEach(b => {
      const active = b.dataset.rtProfile === rayTracer.profileKey;
      b.className = `rt-profile-btn min-h-[28px] px-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer truncate ${
        active
          ? 'bg-white text-studio-ink shadow-xs'
          : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
      }`;
    });

    updateRayTraceProgressHUD(true);
  } else {
    btn.className = 'min-h-[36px] sm:min-h-[38px] px-2.5 sm:px-3 rounded-2xl bg-studio-ink/95 hover:bg-studio-ink text-white backdrop-blur-md border border-white/15 shadow-md text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap';
    dot.className = 'w-2 h-2 rounded-full bg-amber-400 shrink-0';
    lbl.textContent = 'Ray Trace';
    hud.classList.add('hidden');
    if (sidebarBtnLbl) sidebarBtnLbl.textContent = 'Render with Ray Tracing';
  }
}

function updateRayTraceProgressHUD(force = false) {
  if (!state.rtActive || !rayTracer) return;
  const rawSpp = rayTracer.samples;
  const compiling = rayTracer.isCompiling;
  const sppKey = compiling ? -2 : (rawSpp < 1 ? Math.round(rawSpp * 10) : Math.floor(rawSpp) * 10);
  const target = rayTracer.targetSamples;
  const paused = rayTracer.paused;
  const converged = rayTracer.isConverged;

  if (!force && sppKey === lastHudSamples && paused === lastHudPaused && converged === lastHudConverged) {
    return;
  }
  lastHudSamples = sppKey;
  lastHudPaused = paused;
  lastHudConverged = converged;

  const sppDisplay = rawSpp < 1 && rawSpp > 0 ? rawSpp.toFixed(1) : String(Math.floor(rawSpp));
  const pct = Math.min(100, Math.round((rawSpp / Math.max(1, target)) * 100));
  document.getElementById('rt-progress-bar').style.width = `${pct}%`;

  const statusText = document.getElementById('rt-status-text');
  const statusDot = document.getElementById('rt-status-dot');
  const pauseBtn = document.getElementById('btn-rt-pause');
  const moreBtn = document.getElementById('btn-rt-more');

  if (compiling) {
    statusText.textContent = 'Compiling GPU Ray Tracing shaders…';
    statusDot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0';
    pauseBtn.textContent = 'Pause';
    moreBtn.classList.add('hidden');
  } else if (converged) {
    statusText.textContent = `Converged · ${Math.floor(rawSpp)} spp ✓`;
    statusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 shrink-0';
    pauseBtn.textContent = 'Resume';
    moreBtn.classList.remove('hidden');
  } else if (paused) {
    statusText.textContent = `Paused · ${sppDisplay} / ${target} spp`;
    statusDot.className = 'w-2 h-2 rounded-full bg-white/50 shrink-0';
    pauseBtn.textContent = 'Resume';
    moreBtn.classList.add('hidden');
  } else {
    statusText.textContent = `Tracing · ${sppDisplay} / ${target} spp`;
    statusDot.className = 'w-2 h-2 rounded-full bg-amber-400 rt-dot-active shrink-0';
    pauseBtn.textContent = 'Pause';
    moreBtn.classList.add('hidden');
  }
}

async function saveRayTracedPng() {
  if (!state.rtActive || !rayTracer) return;
  try {
    const blob = await rayTracer.capturePngBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const spp = Math.max(1, Math.floor(rayTracer.samples));
    a.href = url;
    a.download = `ikea-metod-${state.doorId}-${state.countertopId}-${spp}spp.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast(`Saved ${spp} spp Ray Traced PNG`);
  } catch (err) {
    console.error('PNG save failed:', err);
    showToast('Could not save PNG snapshot');
  }
}

/* =========================================================================
 * 12. CAMERA PRESETS, FULL 3D TOGGLE & SIMULTANEOUS COMBO A/B COMPARE
 * ========================================================================= */
function setCameraPreset(key) {
  const p = CAMERA_PRESETS[key];
  if (!p) return;
  state.camPreset = key;
  camAnim = {
    startPos: camera.position.clone(),
    startTarget: controls.target.clone(),
    endPos: p.pos.clone(),
    endTarget: p.target.clone(),
    startTime: performance.now(),
    duration: 540
  };
  renderCameraButtons();
}

function toggleSidebar() {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  document.getElementById('app').classList.toggle('sidebar-collapsed', state.sidebarCollapsed);
  document.getElementById('toggle-sidebar-label').textContent = state.sidebarCollapsed ? 'Controls ▸' : '✕ Full 3D';
  scheduleFoldResync();
}

function isViewingComboA() {
  return Boolean(
    state.comboA &&
    state.doorId === state.comboA.doorId &&
    state.countertopId === state.comboA.countertopId
  );
}

function togglePinComboA() {
  if (isViewingComboA()) {
    state.comboA = null;
    state.comboB = null;
    showToast('Cleared Combo A/B comparison');
  } else {
    state.comboA = { doorId: state.doorId, countertopId: state.countertopId };
    if (!state.comboB || (state.comboB.doorId === state.comboA.doorId && state.comboB.countertopId === state.comboA.countertopId)) {
      const altDoor = state.doorId === 'havstorp-beige' ? 'upplov-mat-beige-fonce' : 'havstorp-beige';
      const altTop  = state.countertopId === 'ekbacken-blanc' ? 'karlby-chene' : 'ekbacken-blanc';
      state.comboB = { doorId: altDoor, countertopId: altTop };
    }
    showToast('Pinned Combo A — change Door or Countertop, then Swap A ↔ B');
  }
  renderUI();
}

function swapComboAB() {
  if (!state.comboA) {
    showToast('Tap "Pin Combo A" first to compare two Door + Countertop combos');
    return;
  }
  if (isViewingComboA()) {
    if (state.comboB) {
      applyDoor(state.comboB.doorId, false);
      applyCountertop(state.comboB.countertopId, false);
    }
  } else {
    state.comboB = { doorId: state.doorId, countertopId: state.countertopId };
    applyDoor(state.comboA.doorId, false);
    applyCountertop(state.comboA.countertopId, false);
  }
  renderUI();
}

/* =========================================================================
 * 13. UI RENDERING (DOORS, COUNTERTOPS, 4-CHIP CALIBRATION & ROOM)
 * ========================================================================= */
let toastTimer = null;
function showToast(text) {
  const el = document.getElementById('toast-box');
  el.textContent = text;
  el.classList.remove('hidden', 'toast-anim');
  void el.offsetWidth;
  el.classList.add('toast-anim');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}

function profileIconSvg(profile, hex) {
  if (profile === 'bodbyn') {
    return `<svg viewBox="0 0 36 44" class="w-8 h-10 shrink-0 rounded-md border border-black/15 shadow-inner" style="background:${hex}">
      <rect x="6" y="6" width="24" height="32" fill="none" stroke="rgba(0,0,0,0.22)" stroke-width="1.6"/>
      <rect x="9" y="9" width="18" height="26" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="1"/>
    </svg>`;
  }
  if (profile === 'stensund') {
    return `<svg viewBox="0 0 36 44" class="w-8 h-10 shrink-0 rounded-md border border-black/15 shadow-inner" style="background:${hex}">
      <rect x="6" y="6" width="24" height="32" fill="none" stroke="rgba(0,0,0,0.24)" stroke-width="1.4"/>
      <line x1="12" y1="6.5" x2="12" y2="37.5" stroke="rgba(0,0,0,0.18)" stroke-width="0.9"/>
      <line x1="18" y1="6.5" x2="18" y2="37.5" stroke="rgba(0,0,0,0.18)" stroke-width="0.9"/>
      <line x1="24" y1="6.5" x2="24" y2="37.5" stroke="rgba(0,0,0,0.18)" stroke-width="0.9"/>
    </svg>`;
  }
  if (profile === 'upplov') {
    return `<svg viewBox="0 0 36 44" class="w-8 h-10 shrink-0 rounded-md border border-black/20 shadow-inner" style="background:${hex}">
      <rect x="0" y="0" width="36" height="5" fill="rgba(0,0,0,0.22)"/>
      <line x1="0" y1="5" x2="36" y2="5" stroke="rgba(255,255,255,0.22)" stroke-width="1"/>
      <rect x="2.5" y="7" width="31" height="34.5" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1"/>
    </svg>`;
  }
  if (profile === 'voxtorp') {
    return `<svg viewBox="0 0 36 44" class="w-8 h-10 shrink-0 rounded-md border border-black/20 shadow-inner" style="background:${hex}">
      <defs>
        <linearGradient id="vg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(255,255,255,0.34)"/>
          <stop offset="50%" stop-color="rgba(255,255,255,0.03)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.15)"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="36" height="44" fill="url(#vg)"/>
      <rect x="0" y="2" width="36" height="5.5" fill="rgba(0,0,0,0.38)"/>
      <line x1="0" y1="8" x2="36" y2="8" stroke="rgba(255,255,255,0.45)" stroke-width="1.2"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 36 44" class="w-8 h-10 shrink-0 rounded-md border border-black/15 shadow-inner" style="background:${hex}">
    <rect x="1.5" y="1.5" width="33" height="41" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="0.9"/>
  </svg>`;
}

function renderDoorList() {
  const container = document.getElementById('door-list');
  container.innerHTML = '';

  DOORS.forEach(door => {
    const active = door.id === state.doorId;
    const isInA = state.comboA && state.comboA.doorId === door.id;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `w-full text-left flex items-center gap-2.5 p-2 rounded-2xl border transition-all cursor-pointer bg-white ${
      active
        ? 'border-studio-ink ring-2 ring-studio-ink shadow-sm'
        : 'border-studio-border hover:border-[#B2A593] hover:shadow-xs'
    }`;

    btn.innerHTML = `
      <div class="relative shrink-0">
        ${profileIconSvg(door.profile, door.hex)}
        ${isInA ? `<span class="absolute -top-1 -left-1 text-[8.5px] font-bold px-1 py-0.5 rounded bg-amber-400 text-amber-950 leading-none shadow-xs">A</span>` : ''}
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between gap-1.5">
          <span class="text-[11.5px] font-bold text-studio-ink truncate">${door.name}</span>
          <span class="text-[9.5px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-studio-subtle text-studio-ink shrink-0">
            LRV ${door.lrv}%
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
          <span class="text-[10px] font-mono text-studio-muted">${door.ncs}</span>
          <span class="text-[10px] text-studio-muted">·</span>
          <span class="text-[10px] text-studio-muted">${door.glossLabel}</span>
        </div>
        <div class="flex items-center justify-between gap-1.5 mt-1">
          <span class="text-[9.5px] font-medium px-1.5 py-0.5 rounded-md bg-studio-bg border border-studio-border text-studio-muted truncate">
            ${door.profileLabel}
          </span>
          <span class="text-[9px] font-semibold text-studio-muted shrink-0">${door.tag.split('·')[1]?.trim() || door.tag}</span>
        </div>
      </div>
    `;

    btn.addEventListener('click', () => applyDoor(door.id, true));
    container.appendChild(btn);
  });
}

function renderCountertopGrid() {
  const grid = document.getElementById('countertop-grid');
  grid.innerHTML = '';

  const list = COUNTERTOPS.filter(c => state.category === 'all' || c.category === state.category);
  list.forEach(item => {
    getCountertopTextures(item);
    const url = swatchUrlCache.get(item.id);
    const isActive = item.id === state.countertopId;
    const isInA = state.comboA && state.comboA.countertopId === item.id;

    const card = document.createElement('button');
    card.type = 'button';
    card.className = `group relative flex flex-col text-left rounded-2xl overflow-hidden border transition-all cursor-pointer bg-white ${
      isActive
        ? 'border-studio-ink ring-2 ring-studio-ink shadow-sm'
        : 'border-studio-border hover:border-[#B2A593] hover:shadow-xs'
    }`;

    card.innerHTML = `
      <div class="relative w-full h-16 overflow-hidden bg-stone-200">
        <img src="${url}" alt="${item.name}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <span class="absolute top-1.5 right-1.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-black/75 text-white">
          ${item.thicknessCm.toFixed(1)} cm
        </span>
        ${isInA ? `<span class="absolute top-1.5 left-1.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-amber-400 text-amber-950 shadow-xs">A</span>` : ''}
        ${isActive ? `
          <span class="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-full bg-studio-ink text-white flex items-center justify-center shadow">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          </span>` : ''}
      </div>
      <div class="px-2.5 py-2">
        <div class="text-[11px] font-bold text-studio-ink leading-snug truncate">${item.name}</div>
        <div class="text-[9.5px] text-studio-muted truncate">${item.finish}</div>
      </div>
    `;

    card.addEventListener('click', () => applyCountertop(item.id, true));
    grid.appendChild(card);
  });
}

function renderCameraButtons() {
  document.querySelectorAll('.cam-btn').forEach(btn => {
    const active = btn.dataset.cam === state.camPreset;
    btn.className = `cam-btn min-h-[34px] sm:min-h-[38px] px-2.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
      active ? 'bg-studio-ink text-white shadow-sm' : 'text-studio-ink/80 hover:bg-stone-100'
    }`;
  });
}

function renderRoomButtons() {
  const isDoors = state.tab === 'doors';
  const isTops  = state.tab === 'countertops';
  const isRoom  = state.tab === 'room';

  document.getElementById('panel-doors').classList.toggle('hidden', !isDoors);
  document.getElementById('panel-countertops').classList.toggle('hidden', !isTops);
  document.getElementById('panel-room').classList.toggle('hidden', !isRoom);

  const styleTab = (id, active) => {
    document.getElementById(id).className = `min-h-[38px] px-1 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer truncate ${
      active ? 'bg-white text-studio-ink shadow-sm' : 'text-studio-muted hover:text-studio-ink'
    }`;
  };
  styleTab('tab-doors', isDoors);
  styleTab('tab-countertops', isTops);
  styleTab('tab-room', isRoom);

  const syncGroup = (selector, attr, val) => {
    document.querySelectorAll(selector).forEach(b => {
      const active = b.dataset[attr] === val;
      b.classList.toggle('bg-studio-subtle', active);
      b.classList.toggle('border-studio-ink', active);
      b.classList.toggle('ring-1', active);
      b.classList.toggle('ring-studio-ink', active);
      b.classList.toggle('text-studio-ink', active);
      b.classList.toggle('bg-white', !active);
      b.classList.toggle('border-studio-border', !active);
      b.classList.toggle('text-studio-muted', !active);
    });
  };

  syncGroup('.opt-light', 'light', state.lighting);
  syncGroup('.opt-cl-finish', 'clFinish', state.claustraFinish);
  syncGroup('.opt-bs', 'bs', state.backsplash);
  syncGroup('.opt-hw', 'hw', state.hardware);
  syncGroup('.opt-fl', 'fl', state.floor);

  document.querySelectorAll('.opt-cl-height').forEach(b => {
    const active = b.dataset.clHeight === state.claustraHeight;
    b.className = `opt-cl-height min-h-[38px] rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
      active ? 'bg-studio-ink text-white shadow-sm' : 'text-studio-muted hover:text-studio-ink'
    }`;
  });

  const curDoor = DOORS.find(d => d.id === state.doorId);
  const isIntegrated = Boolean(curDoor?.integratedHandle);
  document.getElementById('hw-integrated-badge').classList.toggle('hidden', !isIntegrated);
  document.getElementById('hw-integrated-note').classList.toggle('hidden', !isIntegrated);
}

function renderUI() {
  const door = DOORS.find(d => d.id === state.doorId);
  const top  = COUNTERTOPS.find(c => c.id === state.countertopId);
  const fl   = FLOOR_META[state.floor] || FLOOR_META.taupe;
  if (!door || !top) return;

  getCountertopTextures(top);
  const topSwatchUrl = swatchUrlCache.get(top.id);

  document.getElementById('hdr-door-dot').style.backgroundColor = door.hex;
  document.getElementById('hdr-subtitle').textContent = `${door.name} (${door.ncs}) · Gloss ${door.glossGU}`;

  document.getElementById('combo-door-swatch').style.backgroundColor = door.hex;
  document.getElementById('combo-top-swatch').style.backgroundColor = top.baseHex;
  document.getElementById('combo-top-swatch').style.backgroundImage = topSwatchUrl ? `url(${topSwatchUrl})` : 'none';
  document.getElementById('combo-top-swatch').style.backgroundSize = 'cover';
  document.getElementById('combo-door-name').textContent = door.shortName;
  document.getElementById('combo-top-name').textContent = top.shortName;
  document.getElementById('combo-subline').textContent = `${door.ncs} · LRV ${door.lrv}% · ${top.thicknessCm.toFixed(1)} cm top`;

  const deltaWhite = Math.abs(93 - door.lrv);
  document.getElementById('calib-delta').textContent = `Δ ${deltaWhite} LRV pts vs Pure White`;
  document.getElementById('chip-door-color').style.backgroundColor = door.hex;
  document.getElementById('chip-door-ncs').textContent = door.ncs.replace('NCS ', '');
  document.getElementById('chip-door-lrv').textContent = `LRV ${door.lrv}% · G${door.glossGU}`;

  const chipTop = document.getElementById('chip-top-color');
  chipTop.style.backgroundColor = top.baseHex;
  chipTop.style.backgroundImage = topSwatchUrl ? `url(${topSwatchUrl})` : 'none';
  document.getElementById('chip-top-name').textContent = top.shortName;
  document.getElementById('chip-top-meta').textContent = `${top.thicknessCm.toFixed(1)}cm · LRV ${top.lrv}%`;

  document.getElementById('chip-floor-color').style.backgroundColor = fl.hex;
  document.getElementById('chip-floor-name').textContent = fl.label;
  document.getElementById('chip-floor-meta').textContent = fl.meta;

  document.getElementById('spec-door-line1').textContent = `${door.name} — ${door.ncs} (${door.glossLabel}, LRV ${door.lrv}%, ${door.thicknessMm} mm)`;
  document.getElementById('spec-door-line2').textContent = `${door.profileLabel}. ${door.description}`;
  document.getElementById('spec-top-line1').textContent = `${top.name} — ${top.thicknessCm.toFixed(1)} cm (${top.materialNote})`;
  document.getElementById('spec-top-line2').textContent = `${top.finish}. ${top.pairing}`;

  document.getElementById('combo-drawer').classList.toggle('hidden', !state.checkOpen);
  const chkBtn = document.getElementById('btn-toggle-check');
  chkBtn.textContent = state.checkOpen ? 'Color Check ▴' : 'Color Check ▾';
  chkBtn.setAttribute('aria-expanded', String(state.checkOpen));

  const pinBtn = document.getElementById('btn-pin-a');
  const viewingA = isViewingComboA();
  pinBtn.textContent = viewingA ? 'Pinned A ✓' : 'Pin Combo A';
  pinBtn.className = `min-h-[36px] px-2 rounded-xl text-[10.5px] font-semibold border transition-all cursor-pointer whitespace-nowrap ${
    viewingA
      ? 'bg-amber-100 border-amber-400 text-amber-950'
      : 'bg-white hover:bg-studio-subtle border-studio-border text-studio-ink'
  }`;

  const abFloat = document.getElementById('ab-floating');
  const abBanner = document.getElementById('combo-ab-banner');
  if (state.comboA) {
    abFloat.classList.remove('hidden');
    const badge = document.getElementById('ab-slot-badge');
    badge.textContent = viewingA ? 'A' : 'B';
    badge.className = `inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-bold leading-none shrink-0 ${
      viewingA ? 'bg-amber-400 text-amber-950' : 'bg-white text-studio-ink'
    }`;

    const dA = DOORS.find(d => d.id === state.comboA.doorId);
    const tA = COUNTERTOPS.find(c => c.id === state.comboA.countertopId);
    const dB = state.comboB ? DOORS.find(d => d.id === state.comboB.doorId) : null;
    const tB = state.comboB ? COUNTERTOPS.find(c => c.id === state.comboB.countertopId) : null;

    document.getElementById('ab-swap-label').textContent = viewingA
      ? `Swap → B: ${dB ? dB.shortName : ''} + ${tB ? tB.shortName : ''}`
      : `Swap → A: ${dA ? dA.shortName : ''} + ${tA ? tA.shortName : ''}`;

    abBanner.classList.remove('hidden');
    abBanner.textContent = `Combo A: ${dA?.shortName} + ${tA?.shortName}  |  Combo B: ${dB?.shortName || '—'} + ${tB?.shortName || '—'}`;
  } else {
    abFloat.classList.add('hidden');
    abBanner.classList.add('hidden');
  }

  document.querySelectorAll('.cat-pill').forEach(btn => {
    const active = btn.dataset.cat === state.category;
    btn.className = `cat-pill min-h-[34px] px-2.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
      active
        ? 'bg-studio-ink text-white shadow-sm'
        : 'bg-white text-studio-muted border border-studio-border hover:text-studio-ink'
    }`;
  });

  renderDoorList();
  renderCountertopGrid();
  renderCameraButtons();
  renderRoomButtons();
}

function bindEvents() {
  document.getElementById('tab-doors').addEventListener('click', () => {
    state.tab = 'doors';
    renderRoomButtons();
  });
  document.getElementById('tab-countertops').addEventListener('click', () => {
    state.tab = 'countertops';
    renderRoomButtons();
  });
  document.getElementById('tab-room').addEventListener('click', () => {
    state.tab = 'room';
    renderRoomButtons();
  });

  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      state.category = btn.dataset.cat;
      renderUI();
    });
  });

  document.getElementById('btn-toggle-check').addEventListener('click', () => {
    state.checkOpen = !state.checkOpen;
    renderUI();
  });

  document.getElementById('btn-toggle-sidebar').addEventListener('click', toggleSidebar);

  // On-Demand GPU Ray Tracing Controls
  document.getElementById('btn-toggle-rt').addEventListener('click', toggleRayTracing);
  document.getElementById('btn-sidebar-rt').addEventListener('click', toggleRayTracing);

  document.getElementById('btn-rt-denoise').addEventListener('click', () => {
    if (!rayTracer) return;
    rayTracer.setDenoise(!rayTracer.denoiseEnabled);
    renderRayTraceUI();
  });

  document.getElementById('btn-rt-pause').addEventListener('click', () => {
    if (!rayTracer) return;
    rayTracer.togglePause();
    updateRayTraceProgressHUD(true);
  });

  document.getElementById('btn-rt-more').addEventListener('click', () => {
    if (!rayTracer) return;
    rayTracer.addMoreSamples(64);
    updateRayTraceProgressHUD(true);
  });

  document.getElementById('btn-rt-save').addEventListener('click', saveRayTracedPng);

  document.querySelectorAll('.rt-profile-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!rayTracer) return;
      rayTracer.setProfile(btn.dataset.rtProfile);
      syncRendererSize(true);
      renderRayTraceUI();
      showToast(`Ray Trace quality: ${btn.textContent.trim()}`);
    });
  });

  // Camera Presets & Reset
  document.querySelectorAll('.cam-btn').forEach(btn => {
    btn.addEventListener('click', () => setCameraPreset(btn.dataset.cam));
  });
  document.getElementById('btn-reset-cam').addEventListener('click', () => setCameraPreset('perspective'));

  // Combo A/B Compare
  document.getElementById('btn-pin-a').addEventListener('click', togglePinComboA);
  document.getElementById('btn-swap-ab').addEventListener('click', swapComboAB);
  document.getElementById('btn-clear-ab').addEventListener('click', () => {
    state.comboA = null;
    state.comboB = null;
    renderUI();
  });

  // Spacebar Instant Combo A/B Swap (Desktop)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      swapComboAB();
    }
  });

  // Room & Style Controls
  document.querySelectorAll('.opt-light').forEach(b => b.addEventListener('click', () => applyLighting(b.dataset.light)));
  document.querySelectorAll('.opt-cl-height').forEach(b => b.addEventListener('click', () => applyClaustraHeight(b.dataset.clHeight)));
  document.querySelectorAll('.opt-cl-finish').forEach(b => b.addEventListener('click', () => applyClaustraFinish(b.dataset.clFinish)));
  document.querySelectorAll('.opt-bs').forEach(b => b.addEventListener('click', () => applyBacksplash(b.dataset.bs)));
  document.querySelectorAll('.opt-hw').forEach(b => b.addEventListener('click', () => applyHardware(b.dataset.hw)));
  document.querySelectorAll('.opt-fl').forEach(b => b.addEventListener('click', () => applyFloor(b.dataset.fl)));
}

/* =========================================================================
 * 14. RENDER LOOP WITH PER-FRAME FOLD/UNFOLD GUARD + ON-DEMAND RAY TRACING
 * ========================================================================= */
function animate(now) {
  if (isContextLost) return;
  rafId = requestAnimationFrame(animate);

  // Per-frame viewport check: guarantees 3D never freezes at cover-screen dimensions after unfolding
  syncRendererSize(false);

  if (camAnim) {
    const t = Math.min(1, (now - camAnim.startTime) / camAnim.duration);
    const ease = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(camAnim.startPos, camAnim.endPos, ease);
    controls.target.lerpVectors(camAnim.startTarget, camAnim.endTarget, ease);
    if (t >= 1) camAnim = null;
  }

  controls.update();

  if (state.rtActive && rayTracer) {
    // Only reset path tracer accumulation when camera actually moved beyond damping epsilon
    const posMoved = camera.position.distanceToSquared(lastRtCamPos) > 1e-8;
    const rotMoved = 1 - Math.abs(camera.quaternion.dot(lastRtCamQuat)) > 1e-8;
    if (posMoved || rotMoved) {
      lastRtCamPos.copy(camera.position);
      lastRtCamQuat.copy(camera.quaternion);
      rayTracer.onCameraMoved();
    }

    rayTracer.renderFrame();
    updateRayTraceProgressHUD(false);
  } else {
    renderer.render(scene, camera);
  }
}

function startLoop() {
  if (rafId === null && !isContextLost) {
    rafId = requestAnimationFrame(animate);
  }
}

function boot() {
  if (initThree()) {
    bindEvents();
    renderUI();
    renderRayTraceUI();
    startLoop();
  }
}

if (document.readyState !== 'loading') {
  boot();
} else {
  window.addEventListener('DOMContentLoaded', boot);
}
