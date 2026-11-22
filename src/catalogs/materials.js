/* =========================================================================
 * CATALOGS: IKEA METOD DOORS, COUNTERTOPS, DULUX VALENTINE PAINTS & FINISHES
 * Calibrated for ACESFilmicToneMapping @ exposure 0.96 with RoomEnvironment.
 * ========================================================================= */

export const DOORS = [
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
    tag: 'Warm Cream',
    profileLabel: 'Bevelled Shaker Frame',
    materialParams: { roughness: 0.36, metalness: 0.0, clearcoat: 0.28, clearcoatRoughness: 0.30, envMapIntensity: 0.50 },
    description: 'Warm buttery cream off-white with classic bevelled shaker frame.'
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
    tag: 'Light Beige',
    profileLabel: 'Shaker + Beadboard',
    materialParams: { roughness: 0.58, metalness: 0.0, clearcoat: 0.12, clearcoatRoughness: 0.45, envMapIntensity: 0.36 },
    description: 'Light warm sand/oatmeal beige with shaker frame & subtle vertical beadboard grooves.'
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
    tag: 'Medium Beige',
    profileLabel: 'Smooth Flat Slab (16 mm)',
    materialParams: { roughness: 0.82, metalness: 0.0, clearcoat: 0.0, clearcoatRoughness: 0.0, envMapIntensity: 0.26 },
    description: 'Grounded medium warm greige-beige with velvety Gloss 10 matte lacquer.'
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
    tag: 'Dark Matte Beige',
    profileLabel: 'Bevelled Edge + Grip',
    materialParams: { roughness: 0.90, metalness: 0.0, clearcoat: 0.0, clearcoatRoughness: 0.0, envMapIntensity: 0.20 },
    description: 'Deep muted dark stone-beige / warm taupe in dead-flat ultra-matte with integrated grip.'
  },
  {
    id: 'voxtorp-brillant-gris-brun',
    name: 'VOXTORP Brillant gris-brun',
    shortName: 'VOXTORP Gloss Taupe',
    ncs: 'IKEA FR Beiges',
    glossGU: 88,
    glossLabel: 'High-Gloss (G88)',
    lrv: 15,
    hex: '#6A6157',
    plinthHex: '#5D554C',
    thicknessMm: 21,
    profile: 'voxtorp',
    integratedHandle: true,
    tag: 'Glossy Taupe',
    profileLabel: '3D Recessed J-Pull',
    materialParams: { roughness: 0.10, metalness: 0.0, clearcoat: 0.92, clearcoatRoughness: 0.06, envMapIntensity: 0.95 },
    description: 'Deep warm glossy taupe-beige with sculpted 3D recessed horizontal J-pull.'
  },
  {
    id: 'havstorp-marron-beige',
    name: 'HAVSTORP Marron beige',
    shortName: 'HAVSTORP Brown',
    ncs: 'NCS S 7005-Y20R',
    glossGU: 10,
    glossLabel: 'Matte (G10)',
    lrv: 12,
    hex: '#5C544A',
    plinthHex: '#4F483F',
    thicknessMm: 16,
    profile: 'flat',
    integratedHandle: false,
    tag: 'Deep Brown-Beige',
    profileLabel: 'Smooth Flat Slab (16 mm)',
    materialParams: { roughness: 0.82, metalness: 0.0, clearcoat: 0.0, clearcoatRoughness: 0.0, envMapIntensity: 0.26 },
    description: 'Deep warm espresso-taupe brown-beige, pairing dramatically with white quartz or oak.'
  }
];

export const COUNTERTOPS = [
  { id: 'ekbacken-noir-mat', name: 'EKBACKEN Noir mat', shortName: 'EKBACKEN Noir', finish: 'Deep matte black laminate', category: 'dark', thicknessCm: 2.8, baseHex: '#1E1F21', lrv: 5, roughness: 0.72, metalness: 0.02 },
  { id: 'ekbacken-anthracite-pierre', name: 'EKBACKEN Anthracite pierre', shortName: 'Anthracite Pierre', finish: 'Dark speckled stone laminate', category: 'dark', thicknessCm: 2.8, baseHex: '#313438', lrv: 10, roughness: 0.64, metalness: 0.03 },
  { id: 'saljan-mineral-noir', name: 'SÄLJAN Minéral noir', shortName: 'SÄLJAN Noir', finish: 'Thick 3.8 cm dark mineral laminate', category: 'dark', thicknessCm: 3.8, baseHex: '#232527', lrv: 6, roughness: 0.58, metalness: 0.03 },
  { id: 'kasker-quartz-noir-marbre', name: 'KASKER Quartz Noir marbré', shortName: 'KASKER Noir Marbré', finish: 'Slim 2.0 cm polished black quartz', category: 'dark', thicknessCm: 2.0, baseHex: '#191A1C', lrv: 5, roughness: 0.16, metalness: 0.05 },
  { id: 'ekbacken-blanc', name: 'EKBACKEN Blanc', shortName: 'EKBACKEN Blanc', finish: 'Crisp pure white laminate', category: 'white', thicknessCm: 2.8, baseHex: '#F6F6F4', lrv: 92, roughness: 0.44, metalness: 0.01 },
  { id: 'ekbacken-blanc-marbre', name: 'EKBACKEN Blanc marbré', shortName: 'Blanc Marbré', finish: 'White with soft Carrara veins', category: 'white', thicknessCm: 2.8, baseHex: '#F2F1ED', lrv: 88, roughness: 0.36, metalness: 0.01 },
  { id: 'saljan-blanc-pierre', name: 'SÄLJAN Effet pierre blanc', shortName: 'SÄLJAN Pierre Blanc', finish: '3.8 cm warm white stone laminate', category: 'white', thicknessCm: 3.8, baseHex: '#ECEAE4', lrv: 84, roughness: 0.48, metalness: 0.01 },
  { id: 'kasker-quartz-blanc-marbre', name: 'KASKER Quartz Blanc marbré', shortName: 'KASKER Blanc Marbré', finish: '2.0 cm polished white quartz', category: 'white', thicknessCm: 2.0, baseHex: '#F5F4F0', lrv: 90, roughness: 0.14, metalness: 0.03 },
  { id: 'ekbacken-beige-pierre', name: 'EKBACKEN Beige effet pierre', shortName: 'Beige Pierre', finish: 'Warm sand stone-effect laminate', category: 'stone', thicknessCm: 2.8, baseHex: '#D8CFC2', lrv: 65, roughness: 0.62, metalness: 0.01 },
  { id: 'ekbacken-terrazzo-clair', name: 'EKBACKEN Terrazzo clair', shortName: 'Terrazzo Clair', finish: 'Cream terrazzo speckled laminate', category: 'stone', thicknessCm: 2.8, baseHex: '#E5DFD5', lrv: 74, roughness: 0.54, metalness: 0.01 },
  { id: 'karlby-chene', name: 'KARLBY Chêne', shortName: 'KARLBY Chêne', finish: '3.8 cm thick natural oak veneer', category: 'wood', thicknessCm: 3.8, baseHex: '#C29B6C', lrv: 39, roughness: 0.52, metalness: 0.0 },
  { id: 'karlby-noyer', name: 'KARLBY Noyer', shortName: 'KARLBY Noyer', finish: '3.8 cm thick rich walnut veneer', category: 'wood', thicknessCm: 3.8, baseHex: '#63432E', lrv: 14, roughness: 0.48, metalness: 0.0 }
];

/* =========================================================================
 * DULUX VALENTINE WALL PAINTS + ORIGINAL PROMOTEUR WHITE (DEFAULT)
 * ========================================================================= */
export const DULUX_PAINTS = [
  // ORIGINAL / WHITES
  {
    id: 'original-white',
    brand: 'SA Mont-Blanc (Origine)',
    name: 'Blanc Lisse Promoteur',
    shortName: 'Original White',
    category: 'white',
    hex: '#F6F6F3',
    lrv: 92,
    finish: 'Mat Lisse (Par défaut)',
    roughness: 0.92,
    recommendedFor: ['all'],
    note: 'Peinture lisse blanche d’origine (fiche de choix signée) — sans Dulux Valentine.'
  },
  {
    id: 'dv-blanc-craie',
    brand: 'Dulux Valentine',
    name: 'Blanc Craie',
    shortName: 'Blanc Craie',
    category: 'white',
    hex: '#F2EFE8',
    lrv: 87,
    finish: 'Crème de Couleur · Velours',
    roughness: 0.86,
    recommendedFor: ['sejour', 'ch1', 'ch2', 'entree'],
    note: 'Soft chalky warm white, gentler than clinical white.'
  },

  // LIGHT BEIGE & LINEN (Chambre 1 & Chambre 2)
  {
    id: 'dv-lin-naturel',
    brand: 'Dulux Valentine',
    name: 'Lin Naturel',
    shortName: 'Lin Naturel',
    category: 'linen',
    hex: '#E6DFD1',
    lrv: 75,
    finish: 'Crème de Couleur · Velours',
    roughness: 0.86,
    recommendedFor: ['ch1', 'ch2', 'sejour'],
    note: 'Airy French linen beige that pairs effortlessly with Chêne du Nord oak flooring.'
  },
  {
    id: 'dv-avoine',
    brand: 'Dulux Valentine',
    name: 'Crème d’Avoine',
    shortName: 'Crème d’Avoine',
    category: 'linen',
    hex: '#EBE4D6',
    lrv: 79,
    finish: 'Architecte · Mat Velouté',
    roughness: 0.88,
    recommendedFor: ['ch1', 'ch2'],
    note: 'Ultra-light oat-cream beige, keeps north/south bedrooms luminous.'
  },
  {
    id: 'dv-beige-cachemire',
    brand: 'Dulux Valentine',
    name: 'Beige Cachemire',
    shortName: 'Beige Cachemire',
    category: 'linen',
    hex: '#DDD3C2',
    lrv: 68,
    finish: 'Crème de Couleur · Velours',
    roughness: 0.85,
    recommendedFor: ['ch1', 'ch2'],
    note: 'Warm enveloping cashmere beige — cozy bedroom feel without darkening.'
  },
  {
    id: 'dv-sable-doux',
    brand: 'Dulux Valentine',
    name: 'Sable Doux',
    shortName: 'Sable Doux',
    category: 'linen',
    hex: '#E2D6C1',
    lrv: 70,
    finish: 'Crème de Couleur · Mat',
    roughness: 0.90,
    recommendedFor: ['ch1', 'ch2'],
    note: 'Sunlit warm sand undertone, flatters white & birch IKEA beds.'
  },
  {
    id: 'dv-ficelle',
    brand: 'Dulux Valentine',
    name: 'Ficelle',
    shortName: 'Ficelle',
    category: 'linen',
    hex: '#D4C7B4',
    lrv: 61,
    finish: 'Crème de Couleur · Velours',
    roughness: 0.86,
    recommendedFor: ['ch1', 'ch2', 'ch3'],
    note: 'Refined mid-light linen twine beige, timeless Scandinavian neutral.'
  },

  // LIGHT TAUPE (Main Bedroom / Chambre 3)
  {
    id: 'dv-nuage-taupe',
    brand: 'Dulux Valentine',
    name: 'Nuage de Taupe',
    shortName: 'Nuage de Taupe',
    category: 'taupe',
    hex: '#CFC6BC',
    lrv: 59,
    finish: 'Architecte · Mat Velouté',
    roughness: 0.88,
    recommendedFor: ['ch3'],
    note: 'Delicate powdery light taupe — ideal for Master Suite (Chambre 3) headboard or all walls.'
  },
  {
    id: 'dv-taupe-clair',
    brand: 'Dulux Valentine',
    name: 'Taupe Clair',
    shortName: 'Taupe Clair',
    category: 'taupe',
    hex: '#C4B8AC',
    lrv: 51,
    finish: 'Crème de Couleur · Velours',
    roughness: 0.86,
    recommendedFor: ['ch3'],
    note: 'Classic Dulux Valentine light taupe with warm mineral depth; echoes the Kevin Taupe floor.'
  },
  {
    id: 'dv-cachemire-taupe',
    brand: 'Dulux Valentine',
    name: 'Cachemire Taupe',
    shortName: 'Cachemire Taupe',
    category: 'taupe',
    hex: '#B7AA9D',
    lrv: 44,
    finish: 'Crème de Couleur · Velours',
    roughness: 0.86,
    recommendedFor: ['ch3'],
    note: 'Richer boutique-hotel taupe — gorgeous behind the two Chambre 3 wall sconces.'
  },
  {
    id: 'dv-gris-galet',
    brand: 'Dulux Valentine',
    name: 'Gris Galet (Greige)',
    shortName: 'Gris Galet',
    category: 'taupe',
    hex: '#C8C2B9',
    lrv: 56,
    finish: 'Architecte · Mat',
    roughness: 0.90,
    recommendedFor: ['ch3', 'sejour', 'entree'],
    note: 'Balanced stone greige between taupe and soft grey.'
  },

  // TOILETS (WC) & STATEMENT / ACCENT SHADES
  {
    id: 'dv-vert-sauge',
    brand: 'Dulux Valentine',
    name: 'Vert Sauge Doux',
    shortName: 'Vert Sauge',
    category: 'accent',
    hex: '#B7C2B2',
    lrv: 53,
    finish: 'Color Resist · Velours',
    roughness: 0.84,
    recommendedFor: ['wc', 'ch2', 'sdb'],
    note: 'Calm botanical sage green — ultra popular for modern French WC & guest rooms.'
  },
  {
    id: 'dv-vert-eucalyptus',
    brand: 'Dulux Valentine',
    name: 'Vert Eucalyptus',
    shortName: 'Eucalyptus',
    category: 'accent',
    hex: '#899D8E',
    lrv: 34,
    finish: 'Color Resist · Velours',
    roughness: 0.82,
    recommendedFor: ['wc', 'entree'],
    note: 'Deeper architectural eucalyptus green for a boutique WC statement.'
  },
  {
    id: 'dv-terracotta-douce',
    brand: 'Dulux Valentine',
    name: 'Terracotta Douce',
    shortName: 'Terracotta',
    category: 'accent',
    hex: '#C78A73',
    lrv: 34,
    finish: 'Crème de Couleur · Velours',
    roughness: 0.86,
    recommendedFor: ['wc', 'ch3'],
    note: 'Warm Mediterranean clay terracotta that pops against white WC ceramics & brass.'
  },
  {
    id: 'dv-argile-rosee',
    brand: 'Dulux Valentine',
    name: 'Argile Rosée',
    shortName: 'Argile Rosée',
    category: 'accent',
    hex: '#D4B6A8',
    lrv: 52,
    finish: 'Crème de Couleur · Velours',
    roughness: 0.86,
    recommendedFor: ['wc', 'ch1'],
    note: 'Muted dusty rose-clay plaster tone, soft and warm.'
  },
  {
    id: 'dv-bleu-nuit',
    brand: 'Dulux Valentine',
    name: 'Bleu Paon / Nuit',
    shortName: 'Bleu Nuit',
    category: 'accent',
    hex: '#384F60',
    lrv: 10,
    finish: 'Color Resist · Velours',
    roughness: 0.80,
    recommendedFor: ['wc', 'entree'],
    note: 'Deep dramatic slate-navy blue — stunning jewel-box effect in small WC with warm brass light.'
  },
  {
    id: 'dv-anthracite',
    brand: 'Dulux Valentine',
    name: 'Charbon / Anthracite',
    shortName: 'Anthracite',
    category: 'accent',
    hex: '#46494D',
    lrv: 11,
    finish: 'Architecte · Mat',
    roughness: 0.88,
    recommendedFor: ['wc', 'entree'],
    note: 'Architectural dark charcoal grey for bold graphic contrast.'
  }
];

export const WOOD_FINISHES = {
  walnut: { id: 'walnut', name: 'Noyer (Walnut)', hex: '#5E3E29', accentHex: '#432B1B', roughness: 0.46 },
  oak: { id: 'oak', name: 'Chêne Naturel', hex: '#C49F72', accentHex: '#A68154', roughness: 0.54 },
  birch: { id: 'birch', name: 'Bouleau Clair', hex: '#DFC7A2', accentHex: '#C5AA82', roughness: 0.58 },
  whiteOak: { id: 'whiteOak', name: 'Chêne Blanchi', hex: '#D8CDBB', accentHex: '#BEB29F', roughness: 0.56 },
  white: { id: 'white', name: 'Blanc Mat', hex: '#F2F0EB', accentHex: '#E0DDD6', roughness: 0.62 },
  blackAsh: { id: 'blackAsh', name: 'Frêne Noir', hex: '#282726', accentHex: '#1B1A19', roughness: 0.52 },
  concrete: { id: 'concrete', name: 'Effet Béton', hex: '#A9A59E', accentHex: '#8C8881', roughness: 0.72 }
};

export const SOFA_FABRICS = [
  { id: 'beige-lin', name: 'Lin Beige Clair', hex: '#DDD4C6', roughness: 0.90 },
  { id: 'greige-tisse', name: 'Viarp Beige-Brun', hex: '#BEB3A4', roughness: 0.92 },
  { id: 'boucle-creme', name: 'Bouclé Crème', hex: '#EAE3D6', roughness: 0.95 },
  { id: 'gris-clair', name: 'Gunnared Gris Clair', hex: '#B8B8B5', roughness: 0.88 },
  { id: 'gris-fonce', name: 'Anthracite Tissé', hex: '#5A5B5E', roughness: 0.88 },
  { id: 'vert-sauge', name: 'Velours Sauge / Vert', hex: '#637568', roughness: 0.80 },
  { id: 'terracotta', name: 'Velours Terracotta', hex: '#A8624D', roughness: 0.82 },
  { id: 'cognac-cuir', name: 'Cuir Cognac', hex: '#9D613A', roughness: 0.42 }
];
