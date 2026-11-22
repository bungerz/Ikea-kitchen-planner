/* =========================================================================
 * CATALOGS: APARTMENT ROOMS (CASSIOPÉE AMBILLY LOT 17 T4),
 * IKEA QUEEN BEDS (160x200), IKEA SOFAS, MOBILI FIVER EXTENSIBLE TABLES,
 * LIGHT FIXTURES & DEFAULT MOVABLE LAYOUT
 * ========================================================================= */

/**
 * Exact architectural bounds (meters) derived from CASSIOPÉE Lot 17 plans:
 * Footprint: X = 0.00 -> 11.37 m (West -> East), Z = 0.00 -> 11.25 m (North -> South), H = 2.50 m
 * TMA #4 applied: Chambre 3 merged with former SDE (5.45 m x 2.76 m).
 */
export const APARTMENT_DIMS = {
  totalW: 11.37,
  totalD: 11.25,
  ceilingH: 2.50,
  extWallT: 0.26,
  intWallT: 0.07,
  ch3SouthWallT: 0.10
};

export const ROOMS = [
  {
    id: 'sejour',
    name: 'Séjour & Cuisine',
    shortName: 'Séjour',
    areaM2: 28.6,
    floorType: 'taupeTile',
    bounds: { minX: 0.26, maxX: 5.49, minZ: 3.12, maxZ: 8.56 },
    accentWall: 'east', // TV wall backing Chambre 2
    camera: { pos: [0.60, 2.08, 8.42], target: [3.25, 0.85, 5.75] },
    paintDefault: 'original-white'
  },
  {
    id: 'kitchen',
    name: 'Cuisine IKEA METOD',
    shortName: 'Cuisine',
    areaM2: 9.2,
    floorType: 'taupeTile',
    bounds: { minX: 1.75, maxX: 5.49, minZ: 3.12, maxZ: 5.55 },
    accentWall: 'north',
    camera: { pos: [1.15, 1.78, 6.35], target: [4.10, 1.05, 4.35] },
    paintDefault: 'original-white',
    sharesPaintWith: 'sejour'
  },
  {
    id: 'ch3',
    name: 'Chambre 3 (Suite Parentale)',
    shortName: 'Ch. 3 Master',
    areaM2: 14.5,
    floorType: 'oakLaminate',
    bounds: { minX: 0.26, maxX: 5.71, minZ: 0.26, maxZ: 3.02 },
    accentWall: 'north', // Headboard wall with 2 TMA sconces!
    camera: { pos: [4.95, 1.62, 2.55], target: [1.85, 0.85, 1.10] },
    paintDefault: 'original-white',
    recommendedPaintHint: 'Original White or Dulux Light Taupe'
  },
  {
    id: 'ch1',
    name: 'Chambre 1 (Sud-Est)',
    shortName: 'Chambre 1',
    areaM2: 11.9,
    floorType: 'oakLaminate',
    bounds: { minX: 8.31, maxX: 11.11, minZ: 6.78, maxZ: 10.98 },
    accentWall: 'east', // Headboard wall (TMA #19 bedside outlets)
    camera: { pos: [8.85, 1.58, 7.35], target: [10.05, 0.82, 9.20] },
    paintDefault: 'original-white',
    recommendedPaintHint: 'Original White or Light Beige / Linen'
  },
  {
    id: 'ch2',
    name: 'Chambre 2 (Sud-Centre)',
    shortName: 'Chambre 2',
    areaM2: 11.3,
    floorType: 'oakLaminate',
    bounds: { minX: 5.56, maxX: 8.24, minZ: 6.78, maxZ: 10.98 },
    accentWall: 'west', // Headboard wall
    camera: { pos: [7.80, 1.58, 7.35], target: [6.65, 0.82, 9.15] },
    paintDefault: 'original-white',
    recommendedPaintHint: 'Original White or Light Beige / Linen'
  },
  {
    id: 'sdb',
    name: 'Salle de Bains',
    shortName: 'SdB',
    areaM2: 5.5,
    floorType: 'taupeTile',
    bounds: { minX: 5.56, maxX: 8.28, minZ: 3.12, maxZ: 5.41 },
    accentWall: 'north', // Kevin Decor Chaud Mat wall
    camera: { pos: [7.85, 1.58, 5.10], target: [6.75, 0.95, 3.65] },
    paintDefault: 'original-white'
  },
  {
    id: 'wc',
    name: 'WC & Lave-Mains',
    shortName: 'WC',
    areaM2: 1.3,
    floorType: 'taupeTile',
    bounds: { minX: 8.35, maxX: 9.17, minZ: 3.60, maxZ: 5.41 },
    accentWall: 'north',
    camera: { pos: [8.76, 1.55, 5.85], target: [8.76, 1.00, 4.10] },
    paintDefault: 'original-white',
    recommendedPaintHint: 'Original White or Sage / Terracotta / Deep Navy'
  },
  {
    id: 'entree',
    name: 'Entrée & Dégagement',
    shortName: 'Entrée',
    areaM2: 10.3,
    floorType: 'taupeTile',
    bounds: { minX: 5.49, maxX: 11.11, minZ: 3.12, maxZ: 6.71 },
    accentWall: 'east',
    camera: { pos: [10.45, 1.62, 4.20], target: [7.40, 1.05, 6.05] },
    paintDefault: 'original-white'
  },
  {
    id: 'loggia',
    name: 'Loggia Extérieure',
    shortName: 'Loggia',
    areaM2: 11.5,
    floorType: 'loggiaTile',
    bounds: { minX: 0.26, maxX: 5.27, minZ: 8.82, maxZ: 11.11 },
    accentWall: 'north',
    camera: { pos: [4.65, 1.62, 10.65], target: [1.80, 0.85, 9.65] },
    paintDefault: 'original-white'
  }
];

export const OVERVIEW_CAMERAS = {
  cutaway: { label: '3D Cutaway', pos: [5.7, 11.8, 15.6], target: [5.6, 0.6, 5.7] },
  plan2d:  { label: 'Plan 2D',    pos: [5.68, 17.5, 5.63], target: [5.68, 0.0, 5.62] }
};

/* =========================================================================
 * 1. IKEA QUEEN SIZE BEDS CATALOG (160 × 200 cm ONLY)
 * ========================================================================= */
export const IKEA_BEDS = [
  {
    id: 'malm',
    name: 'MALM 160×200',
    series: 'MALM',
    style: 'low-clean',
    outerW: 1.76, outerL: 2.09, headboardH: 1.00, frameH: 0.38,
    defaultFinish: 'oak',
    finishes: [
      { id: 'oak', label: 'Chêne blanchi', hex: '#D6C6AE' },
      { id: 'white', label: 'Blanc', hex: '#F3F1EC' },
      { id: 'walnut', label: 'Noyer brun', hex: '#5E412D' },
      { id: 'black', label: 'Brun-noir', hex: '#2B2826' }
    ],
    priceEur: 349,
    tag: 'Iconic Minimalist · Storage Option',
    description: 'Clean-lined Scandinavian veneer frame with solid wide headboard & optional under-bed drawers.'
  },
  {
    id: 'tufjord',
    name: 'TUFJORD 160×200',
    series: 'TUFJORD',
    style: 'curved-upholstered',
    outerW: 1.82, outerL: 2.24, headboardH: 1.09, frameH: 0.42,
    defaultFinish: 'beige',
    finishes: [
      { id: 'beige', label: 'Tallmyra Beige', hex: '#CFC5B6' },
      { id: 'green', label: 'Djuparp Vert foncé', hex: '#395247' },
      { id: 'blue', label: 'Gunnared Bleu', hex: '#4B5D70' },
      { id: 'grey', label: 'Gunnared Gris', hex: '#888A8C' }
    ],
    priceEur: 649,
    tag: 'Boutique Hotel · Curved Wing',
    description: 'Sculptural wrap-around curved upholstered headboard — centerpiece for a Master Suite.'
  },
  {
    id: 'idanas',
    name: 'IDANÄS 160×200',
    series: 'IDANÄS',
    style: 'tufted-upholstered',
    outerW: 1.74, outerL: 2.24, headboardH: 1.21, frameH: 0.43,
    defaultFinish: 'beige',
    finishes: [
      { id: 'beige', label: 'Gunnared Rose-Beige', hex: '#D5C7BD' },
      { id: 'grey', label: 'Gunnared Gris foncé', hex: '#5D5F62' },
      { id: 'white', label: 'Blanc boisé', hex: '#F2EFEA' }
    ],
    priceEur: 549,
    tag: 'Soft Tufted · Angled Legs',
    description: 'Button-tufted tall padded headboard with warm tapered wooden legs.'
  },
  {
    id: 'bjorksnas',
    name: 'BJÖRKSNÄS 160×200',
    series: 'BJÖRKSNÄS',
    style: 'birch-pillows',
    outerW: 1.80, outerL: 2.14, headboardH: 1.09, frameH: 0.44,
    defaultFinish: 'birch',
    finishes: [
      { id: 'birch', label: 'Bouleau massif', hex: '#DEC7A3' },
      { id: 'oak', label: 'Chêne clair', hex: '#C7A67C' }
    ],
    priceEur: 599,
    tag: 'Solid Birch · Leather Straps',
    description: 'Crafted Scandinavian solid birch frame with twin linen headboard pillows suspended on leather straps.'
  },
  {
    id: 'tonstad',
    name: 'TONSTAD 160×200',
    series: 'TONSTAD',
    style: 'architectural-plinth',
    outerW: 1.74, outerL: 2.08, headboardH: 1.06, frameH: 0.42,
    defaultFinish: 'oak',
    finishes: [
      { id: 'oak', label: 'Placage Chêne', hex: '#C5A276' },
      { id: 'offwhite', label: 'Blanc cassé', hex: '#EAE5DA' },
      { id: 'brown', label: 'Chêne brun', hex: '#6E523C' }
    ],
    priceEur: 499,
    tag: 'New Collection · Recessed Plinth',
    description: 'Architectural brushed oak veneer with crisp beveled edges and deep integrated storage.'
  },
  {
    id: 'hemnes',
    name: 'HEMNES 160×200',
    series: 'HEMNES',
    style: 'classic-posts',
    outerW: 1.74, outerL: 2.11, headboardH: 1.20, frameH: 0.46,
    defaultFinish: 'white',
    finishes: [
      { id: 'white', label: 'Teinté Blanc', hex: '#F4F2ED' },
      { id: 'darkgrey', label: 'Gris foncé', hex: '#4F5154' },
      { id: 'blackbrown', label: 'Brun-noir', hex: '#2F2A26' }
    ],
    priceEur: 399,
    tag: 'Solid Pine · Classic Nordic',
    description: 'Timeless paneled headboard and footboard with distinctive solid wood corner posts.'
  },
  {
    id: 'nordli',
    name: 'NORDLI 160×200',
    series: 'NORDLI',
    style: 'modular-drawers',
    outerW: 1.60, outerL: 2.02, headboardH: 0.98, frameH: 0.36,
    defaultFinish: 'white',
    finishes: [
      { id: 'white', label: 'Blanc Mat', hex: '#F4F3EF' },
      { id: 'anthracite', label: 'Anthracite', hex: '#3B3D40' }
    ],
    priceEur: 579,
    tag: 'Compact 160 cm · 6 Drawers',
    description: 'Zero-overhang 160 cm wide floating platform with 6 recessed drawers + modular slatted headboard.'
  },
  {
    id: 'slattum',
    name: 'SLATTUM 160×200',
    series: 'SLATTUM',
    style: 'slim-upholstered',
    outerW: 1.64, outerL: 2.06, headboardH: 0.85, frameH: 0.40,
    defaultFinish: 'lightgrey',
    finishes: [
      { id: 'lightgrey', label: 'Vissle Gris clair', hex: '#BEBDB9' },
      { id: 'darkgrey', label: 'Knisa Gris foncé', hex: '#636568' },
      { id: 'beige', label: 'Beige doux', hex: '#D4CBBF' }
    ],
    priceEur: 199,
    tag: 'Ultra-Compact · Soft Padded',
    description: 'Slim footprint upholstered headboard & steel-framed base — maximizes circulation in 2.68 m bedrooms.'
  },
  {
    id: 'brimnes',
    name: 'BRIMNES 160×200',
    series: 'BRIMNES',
    style: 'shelf-headboard',
    outerW: 1.66, outerL: 2.34, headboardH: 1.11, frameH: 0.47,
    defaultFinish: 'white',
    finishes: [
      { id: 'white', label: 'Blanc', hex: '#F4F3F0' },
      { id: 'black', label: 'Noir', hex: '#28292B' }
    ],
    priceEur: 449,
    tag: 'Integrated Shelf Headboard',
    description: 'Deep headboard with built-in side shelving niches (replaces nightstands!) + 4 large drawers.'
  },
  {
    id: 'gladstad',
    name: 'GLADSTAD 160×200',
    series: 'GLADSTAD',
    style: 'soft-rounded',
    outerW: 1.72, outerL: 2.10, headboardH: 0.92, frameH: 0.41,
    defaultFinish: 'beige',
    finishes: [
      { id: 'beige', label: 'Kabusa Beige clair', hex: '#D8D0C3' },
      { id: 'grey', label: 'Kabusa Gris clair', hex: '#B4B4B0' }
    ],
    priceEur: 299,
    tag: 'Soft Cushioned · Cozy',
    description: 'Gently padded upholstered frame with rounded edges and warm woven fabric.'
  },
  {
    id: 'songesand',
    name: 'SONGESAND 160×200',
    series: 'SONGESAND',
    style: 'paneled-classic',
    outerW: 1.73, outerL: 2.07, headboardH: 0.95, frameH: 0.41,
    defaultFinish: 'white',
    finishes: [
      { id: 'white', label: 'Blanc', hex: '#F3F2EE' },
      { id: 'brown', label: 'Brun', hex: '#5A4334' }
    ],
    priceEur: 279,
    tag: 'Classic Paneled',
    description: 'Traditional recessed-panel headboard with slightly curved top molding.'
  },
  {
    id: 'sagstua',
    name: 'SAGSTUA 160×200',
    series: 'SAGSTUA',
    style: 'metal-spindle',
    outerW: 1.68, outerL: 2.08, headboardH: 1.40, frameH: 0.39,
    defaultFinish: 'black',
    finishes: [
      { id: 'black', label: 'Noir + Laiton', hex: '#222326' },
      { id: 'white', label: 'Blanc + Laiton', hex: '#F2F1EC' }
    ],
    priceEur: 249,
    tag: 'Airy Metal · Brass Details',
    description: 'Classic arched black/white steel spindle frame with warm brass finial accents — visually light.'
  }
];

/* =========================================================================
 * 2. IKEA LIVING ROOM SOFAS CATALOG
 * ========================================================================= */
export const IKEA_SOFAS = [
  {
    id: 'soderhamn',
    name: 'SÖDERHAMN',
    style: 'low-modular',
    w: 2.85, d: 0.99, chaiseD: 1.51, h: 0.83, seatH: 0.39,
    supportsChaise: true,
    defaultChaise: 'right',
    defaultFabric: 'beige-lin',
    priceEur: 1149,
    tag: 'Deep Lounge · Airy Legs',
    description: 'Signature low-profile modular IKEA lounge sofa with thin chrome/black legs and plush loose cushions.'
  },
  {
    id: 'kivik',
    name: 'KIVIK',
    style: 'wide-arm',
    w: 2.80, d: 0.95, chaiseD: 1.63, h: 0.83, seatH: 0.45,
    supportsChaise: true,
    defaultChaise: 'right',
    defaultFabric: 'greige-tisse',
    priceEur: 1099,
    tag: 'Wide Armrests · Memory Foam',
    description: 'Generous low wide armrests and deep pocket-spring cushions — IKEA’s comfort bestseller.'
  },
  {
    id: 'vimle',
    name: 'VIMLE',
    style: 'structured-l',
    w: 2.52, d: 0.98, chaiseD: 1.64, h: 0.83, seatH: 0.45,
    supportsChaise: true,
    defaultChaise: 'left',
    defaultFabric: 'beige-lin',
    priceEur: 1199,
    tag: 'Tailored Modern · Storage Chaise',
    description: 'Crisp tailored silhouette with firm supportive cushions and hidden storage under the chaise.'
  },
  {
    id: 'jattebo',
    name: 'JÄTTEBO',
    style: 'corduroy-modular',
    w: 2.40, d: 0.95, chaiseD: 1.55, h: 0.71, seatH: 0.42,
    supportsChaise: true,
    defaultChaise: 'right',
    defaultFabric: 'boucle-creme',
    priceEur: 1499,
    tag: 'Trendy Low-Block · Storage',
    description: 'Contemporary rounded-block modular sofa with ribbed corduroy/bouclé look and deep storage.'
  },
  {
    id: 'landskrona',
    name: 'LANDSKRONA',
    style: 'midcentury-tufted',
    w: 2.04, d: 0.89, chaiseD: 1.58, h: 0.78, seatH: 0.44,
    supportsChaise: true,
    defaultChaise: 'none',
    defaultFabric: 'vert-sauge',
    priceEur: 749,
    tag: 'Mid-Century · Oak Legs',
    description: 'Compact tufted seat & back cushions lifted on slender natural oak legs — ideal for open flow.'
  },
  {
    id: 'stockholm',
    name: 'STOCKHOLM 2025',
    style: 'luxe-oak-base',
    w: 2.38, d: 0.96, chaiseD: 0.96, h: 0.80, seatH: 0.43,
    supportsChaise: false,
    defaultChaise: 'none',
    defaultFabric: 'boucle-creme',
    priceEur: 1699,
    tag: 'Design Flagship · Deep Cushions',
    description: 'Refined Scandinavian flagship 3-seater with plush feather-soft look and warm architectural presence.'
  },
  {
    id: 'applaryd',
    name: 'ÄPPLARYD',
    style: 'slim-architectural',
    w: 2.31, d: 0.93, chaiseD: 1.62, h: 0.82, seatH: 0.47,
    supportsChaise: true,
    defaultChaise: 'none',
    defaultFabric: 'gris-clair',
    priceEur: 899,
    tag: 'Slim Arms · Tall Legs',
    description: 'Ultra-thin armrests and slender dark steel legs give maximum seating width in a light footprint.'
  },
  {
    id: 'friheten',
    name: 'FRIHETEN',
    style: 'corner-sleeper',
    w: 2.30, d: 0.90, chaiseD: 1.51, h: 0.86, seatH: 0.44,
    supportsChaise: true,
    defaultChaise: 'right',
    defaultFabric: 'gris-fonce',
    priceEur: 599,
    tag: 'Convertible Sofa-Bed',
    description: 'Practical compact L-shaped sleeper sofa with reversible chaise and full pull-out guest bed.'
  }
];

/* =========================================================================
 * 3. MOBILI FIVER EXTENSIBLE DINING TABLES (WALNUT DEFAULT!)
 * ========================================================================= */
export const MOBILIFIVER_TABLES = [
  {
    id: 'emma',
    name: 'Mobili Fiver EMMA',
    style: 'emma-x-legs',
    shape: 'rect',
    width: 0.90,
    lengths: [1.60, 2.00, 2.40],
    height: 0.76,
    defaultFinish: 'walnut',
    finishes: ['walnut', 'oak', 'blackAsh', 'concrete'],
    priceEur: 699,
    tag: 'Bestseller · Sculptural X-Cross Legs',
    description: 'Iconic Mobili Fiver intersecting crossed legs with smooth aluminum telescopic rail (160 → 200 → 240 cm).'
  },
  {
    id: 'first',
    name: 'Mobili Fiver FIRST',
    style: 'first-4-legs',
    shape: 'rect',
    width: 0.90,
    lengths: [1.40, 1.80, 2.20],
    height: 0.76,
    defaultFinish: 'walnut',
    finishes: ['walnut', 'oak', 'white', 'concrete'],
    priceEur: 499,
    tag: 'Classic 4-Leg · 140→220 cm',
    description: 'Clean Italian minimalist rectangular silhouette with corner legs that slide out with the leaves.'
  },
  {
    id: 'evolution',
    name: 'Mobili Fiver EVOLUTION',
    style: 'evolution-angled',
    shape: 'rect',
    width: 0.90,
    lengths: [1.60, 2.00, 2.40],
    height: 0.76,
    defaultFinish: 'walnut',
    finishes: ['walnut', 'oak', 'blackAsh'],
    priceEur: 649,
    tag: 'Architectural Angled Legs',
    description: 'Bold chamfered architectural legs & heavy-duty telescopic extension up to 10 guests.'
  },
  {
    id: 'easy',
    name: 'Mobili Fiver EASY',
    style: 'easy-compact',
    shape: 'rect',
    width: 0.85,
    lengths: [1.20, 1.60, 2.00],
    height: 0.76,
    defaultFinish: 'walnut',
    finishes: ['walnut', 'oak', 'white'],
    priceEur: 429,
    tag: 'Compact Daily · 120→200 cm',
    description: 'Space-saving 120 cm daily table that expands cleanly to 200 cm for dinner parties.'
  },
  {
    id: 'angelica',
    name: 'Mobili Fiver ANGELICA',
    style: 'round-oval',
    shape: 'round',
    width: 1.20,
    lengths: [1.20, 1.60, 2.00],
    height: 0.76,
    defaultFinish: 'walnut',
    finishes: ['walnut', 'oak', 'blackAsh'],
    priceEur: 749,
    tag: 'Round Ø120 → Oval 200 cm',
    description: 'Sculptural central star pedestal — round Ø120 cm day-to-day, expands into a grand 200 cm oval.'
  },
  {
    id: 'rachele',
    name: 'Mobili Fiver RACHELE',
    style: 'console-extend',
    shape: 'rect',
    width: 0.90,
    lengths: [0.95, 1.95, 2.95],
    height: 0.76,
    defaultFinish: 'walnut',
    finishes: ['walnut', 'oak', 'white'],
    priceEur: 579,
    tag: 'Mega-Extend · up to 295 cm',
    description: 'Ultra-versatile console-to-banquet extensible table reaching nearly 3 meters for 12 guests.'
  }
];

/* =========================================================================
 * 4. LIGHT FIXTURE STYLES (MAPPED TO EXACT TMA DCL & SCONCE POSITIONS)
 * ========================================================================= */
export const LIGHT_FIXTURES = [
  {
    id: 'scandi-linen',
    name: 'Scandinavian Linen Dome',
    shortName: 'Linen Dome',
    tag: 'Warm & Airy (Default)',
    swatch: '#EAE2D3',
    description: 'Soft pleated warm linen shade with brushed brass canopy & warm 2700K glow.'
  },
  {
    id: 'brass-opal',
    name: 'Brushed Brass & Opal Globe',
    shortName: 'Brass Opal',
    tag: 'Boutique Hotel',
    swatch: '#C8A156',
    description: 'Frosted milk-glass opal spheres suspended on slender satin-brass stems.'
  },
  {
    id: 'matte-black',
    name: 'Architectural Matte Black',
    shortName: 'Matte Black',
    tag: 'Contemporary Linear',
    swatch: '#232427',
    description: 'Crisp matte black spun-metal cones and sculptural linear pendant bars.'
  },
  {
    id: 'natural-rattan',
    name: 'Woven Natural Rattan',
    shortName: 'Rattan',
    tag: 'Organic Warmth',
    swatch: '#C99F6D',
    description: 'Hand-woven bamboo/rattan openwork drum casting gentle warm ambient light.'
  },
  {
    id: 'flush-minimal',
    name: 'Architectural Flush Opal',
    shortName: 'Flush Opal',
    tag: 'Clean Ceiling',
    swatch: '#F3F1EB',
    description: 'Low-profile architectural matte-white and frosted glass ceiling diffusers.'
  }
];

/**
 * Exact TMA DCL & wall sconce coordinates in apartment meters!
 */
export const TMA_LIGHT_POINTS = [
  // Chambre 3: TMA #1 DCL (236cm from west interior wall, 138cm from north interior wall)
  { id: 'dcl-ch3', room: 'ch3', kind: 'pendant', x: 0.26 + 2.36, z: 0.26 + 1.38, y: 2.50, defaultStyle: 'scandi-linen' },
  // Chambre 3: TMA #2 Two wall sconces on North wall (47cm & 257cm from west wall, h=1.55m)
  { id: 'sconce-ch3-l', room: 'ch3', kind: 'sconce', wall: 'north', x: 0.26 + 0.47, z: 0.26, y: 1.52, defaultStyle: 'brass-opal' },
  { id: 'sconce-ch3-r', room: 'ch3', kind: 'sconce', wall: 'north', x: 0.26 + 2.57, z: 0.26, y: 1.52, defaultStyle: 'brass-opal' },
  // Séjour Dining: TMA #9 DCL (over Mobili Fiver dining table)
  { id: 'dcl-sejour-dining', room: 'sejour', kind: 'dining-pendant', x: 1.55, z: 6.40, y: 2.50, defaultStyle: 'brass-opal' },
  // Séjour Lounge: TMA #8 DCL (over IKEA sofa lounge area)
  { id: 'dcl-sejour-lounge', room: 'sejour', kind: 'pendant', x: 3.85, z: 7.05, y: 2.50, defaultStyle: 'scandi-linen' },
  // Cuisine: ceiling flush spots
  { id: 'dcl-cuisine', room: 'sejour', kind: 'flush', x: 3.70, z: 4.15, y: 2.50, defaultStyle: 'flush-minimal' },
  // Chambre 2 DCL
  { id: 'dcl-ch2', room: 'ch2', kind: 'pendant', x: 6.90, z: 8.85, y: 2.50, defaultStyle: 'natural-rattan' },
  // Chambre 1 DCL
  { id: 'dcl-ch1', room: 'ch1', kind: 'pendant', x: 9.71, z: 8.85, y: 2.50, defaultStyle: 'scandi-linen' },
  // SDB DCL + mirror bar
  { id: 'dcl-sdb', room: 'sdb', kind: 'flush', x: 6.95, z: 4.35, y: 2.50, defaultStyle: 'flush-minimal' },
  // WC DCL
  { id: 'dcl-wc', room: 'wc', kind: 'flush', x: 8.76, z: 4.55, y: 2.50, defaultStyle: 'brass-opal' },
  // Entrée & DGT DCLs
  { id: 'dcl-entree', room: 'entree', kind: 'flush', x: 10.18, z: 4.85, y: 2.50, defaultStyle: 'flush-minimal' },
  { id: 'dcl-dgt', room: 'entree', kind: 'flush', x: 7.65, z: 6.08, y: 2.50, defaultStyle: 'flush-minimal' }
];

/* =========================================================================
 * 5. QUICK-ADD EXTRA FURNITURE TEMPLATES
 * ========================================================================= */
export const QUICK_ADD_ITEMS = [
  { id: 'pax-wardrobe', label: 'IKEA PAX Wardrobe (150×60)', category: 'storage', kind: 'wardrobe', w: 1.50, d: 0.60, h: 2.36, finish: 'white' },
  { id: 'besta-tv', label: 'IKEA BESTÅ TV Bench (180×42)', category: 'living', kind: 'tvUnit', w: 1.80, d: 0.42, h: 0.50, finish: 'walnut' },
  { id: 'coffee-table', label: 'Oak Coffee Table (110×60)', category: 'living', kind: 'coffeeTable', w: 1.10, d: 0.60, h: 0.40, finish: 'walnut' },
  { id: 'desk-home', label: 'Home Office Desk (140×65)', category: 'bedroom', kind: 'desk', w: 1.40, d: 0.65, h: 0.75, finish: 'oak' },
  { id: 'nightstand', label: 'Bedside Nightstand (45×40)', category: 'bedroom', kind: 'nightstand', w: 0.45, d: 0.40, h: 0.52, finish: 'oak' },
  { id: 'armchair', label: 'IKEA STRANDMON / Lounge Chair', category: 'living', kind: 'armchair', w: 0.80, d: 0.84, h: 0.86, finish: 'boucle-creme' },
  { id: 'sideboard', label: 'Walnut Sideboard (160×42)', category: 'living', kind: 'sideboard', w: 1.60, d: 0.42, h: 0.78, finish: 'walnut' },
  { id: 'plant-olive', label: 'Potted Olive / Ficus Tree', category: 'decor', kind: 'plant', w: 0.52, d: 0.52, h: 1.55, finish: 'terracotta' },
  { id: 'rug-linen', label: 'Woven Area Rug (200×300)', category: 'decor', kind: 'rug', w: 2.00, d: 3.00, h: 0.015, finish: 'beige-lin' },
  { id: 'floor-lamp', label: 'Brass Arc Floor Lamp', category: 'lighting', kind: 'floorLamp', w: 0.45, d: 0.45, h: 1.75, finish: 'brass' }
];

/* =========================================================================
 * 6. DEFAULT MOVABLE ITEMS LAYOUT (CALIBRATED TO PLAN TMA!)
 * ========================================================================= */
export function createDefaultMovableItems() {
  return [
    // ---- CHAMBRE 3 (MASTER SUITE, 5.45m x 2.76m) ----
    // Queen Bed centered cleanly between the two TMA #2 sconces (47cm & 257cm -> center at x=0.26+1.52 = 1.78m!)
    {
      uid: 'bed-ch3',
      kind: 'bed',
      room: 'ch3',
      label: 'Master Bed (Ch. 3)',
      modelId: 'tufjord',
      finish: 'beige',
      x: 1.78,
      z: 1.38,
      rotY: 0, // Headboard against North wall!
      lockedRoom: false
    },
    {
      uid: 'ns-ch3-l',
      kind: 'nightstand',
      room: 'ch3',
      label: 'Nightstand L (Ch. 3)',
      w: 0.42, d: 0.38, h: 0.50,
      finish: 'oak',
      x: 0.58,
      z: 0.48,
      rotY: 0
    },
    {
      uid: 'ns-ch3-r',
      kind: 'nightstand',
      room: 'ch3',
      label: 'Nightstand R (Ch. 3)',
      w: 0.42, d: 0.38, h: 0.50,
      finish: 'oak',
      x: 2.98,
      z: 0.48,
      rotY: 0
    },
    // Large PAX Dressing wardrobe in the former-SDE eastern wing of Chambre 3!
    {
      uid: 'pax-ch3',
      kind: 'wardrobe',
      room: 'ch3',
      label: 'PAX Dressing (Ch. 3)',
      w: 2.00, d: 0.60, h: 2.36,
      finish: 'white',
      x: 4.55,
      z: 0.58,
      rotY: 0
    },
    // Compact vanity / desk by east wall of Chambre 3 (near TMA #3 16A + 2 RJ45!)
    {
      uid: 'desk-ch3',
      kind: 'desk',
      room: 'ch3',
      label: 'Desk / Vanity (Ch. 3)',
      w: 1.15, d: 0.52, h: 0.75,
      finish: 'oak',
      x: 4.90,
      z: 2.68,
      rotY: Math.PI
    },

    // ---- CHAMBRE 1 (SOUTH-EAST, 2.80m x 4.20m) ----
    // Queen Bed with headboard against East wall (TMA #19 bedside outlets at 257cm from south!)
    {
      uid: 'bed-ch1',
      kind: 'bed',
      room: 'ch1',
      label: 'Queen Bed (Ch. 1)',
      modelId: 'malm',
      finish: 'oak',
      x: 10.05,
      z: 8.65,
      rotY: -Math.PI / 2 // Headboard against East wall (facing West)
    },
    {
      uid: 'ns-ch1-s',
      kind: 'nightstand',
      room: 'ch1',
      label: 'Nightstand (Ch. 1)',
      w: 0.42, d: 0.38, h: 0.50,
      finish: 'oak',
      x: 10.88,
      z: 9.82,
      rotY: -Math.PI / 2
    },
    {
      uid: 'pax-ch1',
      kind: 'wardrobe',
      room: 'ch1',
      label: 'PAX Wardrobe (Ch. 1)',
      w: 1.50, d: 0.58, h: 2.36,
      finish: 'white',
      x: 10.18,
      z: 7.09,
      rotY: 0
    },

    // ---- CHAMBRE 2 (SOUTH-CENTER, 2.68m x 4.20m) ----
    // Queen Bed (compact SLATTUM / BJÖRKSNÄS) against West wall, leaving clearance for door & window
    {
      uid: 'bed-ch2',
      kind: 'bed',
      room: 'ch2',
      label: 'Queen Bed (Ch. 2)',
      modelId: 'bjorksnas',
      finish: 'birch',
      x: 6.64,
      z: 9.15,
      rotY: Math.PI / 2 // Headboard against West wall (facing East)
    },
    {
      uid: 'pax-ch2',
      kind: 'wardrobe',
      room: 'ch2',
      label: 'Wardrobe (Ch. 2)',
      w: 1.40, d: 0.58, h: 2.36,
      finish: 'white',
      x: 6.28,
      z: 7.09,
      rotY: 0
    },

    // ---- SÉJOUR (LIVING + DINING, 5.23m x 5.44m) ----
    // IKEA Sofa facing TV Wall (TMA #10 on east partition backing Ch.2)
    {
      uid: 'sofa-sejour',
      kind: 'sofa',
      room: 'sejour',
      label: 'IKEA Sofa (Séjour)',
      modelId: 'soderhamn',
      fabric: 'beige-lin',
      chaise: 'right',
      x: 3.12,
      z: 7.06,
      rotY: Math.PI / 2
    },
    // TV Bench + Slim OLED TV against East wall (TMA #10 TV block!)
    {
      uid: 'tv-sejour',
      kind: 'tvUnit',
      room: 'sejour',
      label: 'TV Console & OLED TV',
      w: 1.80, d: 0.42, h: 0.50,
      finish: 'walnut',
      x: 5.26,
      z: 7.08,
      rotY: -Math.PI / 2
    },
    // Coffee Table in front of sofa
    {
      uid: 'coffee-sejour',
      kind: 'coffeeTable',
      room: 'sejour',
      label: 'Walnut Coffee Table',
      w: 1.05, d: 0.58, h: 0.39,
      finish: 'walnut',
      x: 4.22,
      z: 7.05,
      rotY: Math.PI / 2
    },
    // Area Rug under sofa & coffee table
    {
      uid: 'rug-sejour',
      kind: 'rug',
      room: 'sejour',
      label: 'Living Area Rug',
      w: 2.00, d: 2.80, h: 0.014,
      finish: 'beige-lin',
      x: 3.92,
      z: 7.08,
      rotY: 0
    },
    // Mobili Fiver Extensible Walnut Dining Table under DCL #9!
    {
      uid: 'table-sejour',
      kind: 'diningTable',
      room: 'sejour',
      label: 'Mobili Fiver Dining Table',
      modelId: 'emma',
      finish: 'walnut',
      extensionStep: 0, // 0 = closed (160cm), 1 = mid (200cm), 2 = full (240cm)
      x: 1.48,
      z: 6.38,
      rotY: Math.PI / 2
    },
    // Potted Olive Tree by the Loggia glazing
    {
      uid: 'plant-sejour',
      kind: 'plant',
      room: 'sejour',
      label: 'Olive Tree',
      w: 0.52, d: 0.52, h: 1.65,
      finish: 'terracotta',
      x: 0.68,
      z: 8.15,
      rotY: 0
    },

    // ---- LOGGIA (OUTDOOR TERRACE, 5.01m x 2.29m) ----
    {
      uid: 'loggia-chair-1',
      kind: 'armchair',
      room: 'loggia',
      label: 'Loggia Lounge Chair 1',
      w: 0.72, d: 0.74, h: 0.78,
      finish: 'beige-lin',
      x: 3.95,
      z: 10.15,
      rotY: -Math.PI * 0.72
    },
    {
      uid: 'loggia-chair-2',
      kind: 'armchair',
      room: 'loggia',
      label: 'Loggia Lounge Chair 2',
      w: 0.72, d: 0.74, h: 0.78,
      finish: 'beige-lin',
      x: 2.65,
      z: 10.15,
      rotY: Math.PI * 0.72
    },
    {
      uid: 'loggia-table',
      kind: 'coffeeTable',
      room: 'loggia',
      label: 'Loggia Bistro Table',
      w: 0.65, d: 0.65, h: 0.45,
      finish: 'oak',
      x: 3.30,
      z: 9.85,
      rotY: 0
    }
  ];
}
