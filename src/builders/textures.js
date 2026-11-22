import * as THREE from 'three';

/* =========================================================================
 * PROCEDURAL PBR TEXTURES ENGINE (CACHED)
 * Generates faithful architectural materials for CASSIOPÉE Lot 17:
 * - Kevin Taupe 60x60 concrete-effect porcelain tile (Réf. 4880309)
 * - Egger Chêne du Nord Naturel (EL 2970) bedroom laminate planks
 * - SDB Faïence Kevin Taupe 25x40 & Kevin Decor Chaud Mat 25x40
 * - Rich Mobili Fiver Walnut, Natural Oak, Birch, Woven Fabric & Countertops
 * ========================================================================= */

const texCache = new Map();

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeNoise2D(seed) {
  const rng = makeRng(seed);
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = perm[i]; perm[i] = perm[j]; perm[j] = t;
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];

  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const grad = (hash, x, y) => {
    const h = hash & 3;
    return ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
  };

  function noise(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
    return lerp(
      lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
      lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
      v
    );
  }

  return function fbm(x, y, octaves = 4) {
    let val = 0, amp = 0.5, freq = 1, max = 0;
    for (let i = 0; i < octaves; i++) {
      val += noise(x * freq, y * freq) * amp;
      max += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return (val / max) * 0.5 + 0.5;
  };
}

function clampByte(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function finalizeTexture(canvas, { srgb = true, repX = 1, repY = 1 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repX, repY);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * 1. Floor: Grès Cérame Rectifié Effet Béton Taupe 60x60 (Réf. 4880309) + Joint 113 Gris Ciment
 */
export function getTaupeTileTextures(repX = 10, repY = 10) {
  const key = `taupeTile:${repX.toFixed(1)}:${repY.toFixed(1)}`;
  if (texCache.has(key)) return texCache.get(key);

  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const fbm = makeNoise2D(4880309);
  const img = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const isGrout = x < 3 || y < 3;
      if (isGrout) {
        img.data[idx] = 122; img.data[idx + 1] = 117; img.data[idx + 2] = 111; img.data[idx + 3] = 255;
      } else {
        const n = fbm(x * 0.015, y * 0.015, 4);
        const fine = fbm(x * 0.09, y * 0.09, 2);
        const delta = (n - 0.5) * 20 + (fine - 0.5) * 6;
        // Concrete-effect warm taupe (approx #9D958B)
        img.data[idx]     = clampByte(158 + delta);
        img.data[idx + 1] = clampByte(150 + delta * 0.96);
        img.data[idx + 2] = clampByte(140 + delta * 0.92);
        img.data[idx + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);

  const map = finalizeTexture(c, { srgb: true, repX, repY });
  const res = { map };
  texCache.set(key, res);
  return res;
}

/**
 * 2. Floor: Egger Natur Sense 8/32 Classic — Chêne du Nord Naturel (EL 2970)
 */
export function getOakLaminateTextures(repX = 3, repY = 4) {
  const key = `oakLam:${repX.toFixed(1)}:${repY.toFixed(1)}`;
  if (texCache.has(key)) return texCache.get(key);

  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const fbm = makeNoise2D(2970);
  const rng = makeRng(2970);

  const planks = 6;
  const pw = size / planks;
  const offsets = Array.from({ length: planks }, () => Math.floor(rng() * size));
  const tones = Array.from({ length: planks }, () => (rng() - 0.5) * 16);

  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = Math.min(planks - 1, Math.floor(x / pw));
      const lx = x - p * pw;
      const ly = (y + offsets[p]) % size;
      const idx = (y * size + x) * 4;
      const seam = lx < 1.5 || ly < 1.5;

      const grain = Math.sin((lx * 0.25 + fbm(lx * 0.04, ly * 0.008, 3) * 10)) * 0.5 + 0.5;
      const streak = fbm(lx * 0.16, ly * 0.014, 3);
      const t = tones[p] + (grain - 0.5) * 16 + (streak - 0.5) * 14;
      const seamDark = seam ? -34 : 0;

      // Egger Chêne du Nord Naturel: light warm Nordic oak (#CBB18D)
      img.data[idx]     = clampByte(203 + t + seamDark);
      img.data[idx + 1] = clampByte(176 + t * 0.88 + seamDark);
      img.data[idx + 2] = clampByte(139 + t * 0.72 + seamDark);
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const map = finalizeTexture(c, { srgb: true, repX, repY });
  const res = { map };
  texCache.set(key, res);
  return res;
}

/**
 * 3. Loggia Outdoor Concrete Paving Tile
 */
export function getLoggiaTileTextures(repX = 8, repY = 4) {
  const key = `loggia:${repX}:${repY}`;
  if (texCache.has(key)) return texCache.get(key);
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const fbm = makeNoise2D(9011);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const seam = x < 3 || y < 3;
      const n = (fbm(x * 0.04, y * 0.04, 3) - 0.5) * 20;
      const base = seam ? 115 : 172 + n;
      img.data[idx] = clampByte(base);
      img.data[idx + 1] = clampByte(base - 2);
      img.data[idx + 2] = clampByte(base - 5);
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const map = finalizeTexture(c, { srgb: true, repX, repY });
  const res = { map };
  texCache.set(key, res);
  return res;
}

/**
 * 4. SDB Faïence 25x40: Kevin Taupe (4880347) & Kevin Decor Chaud Mat (4880348)
 */
export function getBathroomTileTexture(mode = 'taupe', repX = 4, repY = 6) {
  const key = `sdbTile:${mode}:${repX}:${repY}`;
  if (texCache.has(key)) return texCache.get(key);
  const w = 512, h = 320;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const fbm = makeNoise2D(mode === 'decor' ? 4880348 : 4880347);

  // Base color: warm concrete taupe
  ctx.fillStyle = mode === 'decor' ? '#B5AAA0' : '#A99F95';
  ctx.fillRect(0, 0, w, h);

  const img = ctx.getImageData(0, 0, w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const isGrout = x < 3 || y < 3;
      if (isGrout) {
        // White grout Réf. 100 blanc
        img.data[idx] = 240; img.data[idx + 1] = 239; img.data[idx + 2] = 235;
      } else {
        let d = (fbm(x * 0.02, y * 0.02, 3) - 0.5) * 16;
        if (mode === 'decor') {
          // Subtle warm geometric diagonal/chevron matte decor relief (Kevin Decor Chaud Mat)
          const diag = Math.sin((x + y) * 0.085) * 0.5 + Math.sin((x - y) * 0.085) * 0.5;
          const band = ((Math.floor(x / 64) + Math.floor(y / 64)) % 2 === 0) ? 7 : -6;
          d += diag * 9 + band;
        }
        img.data[idx]     = clampByte((mode === 'decor' ? 182 : 168) + d);
        img.data[idx + 1] = clampByte((mode === 'decor' ? 171 : 158) + d * 0.94);
        img.data[idx + 2] = clampByte((mode === 'decor' ? 159 : 147) + d * 0.88);
      }
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const map = finalizeTexture(c, { srgb: true, repX, repY });
  texCache.set(key, map);
  return map;
}

/**
 * 5. Wood Grain Texture (Walnut for Mobili Fiver, Oak, Birch, Black Ash, White)
 */
export function getWoodTexture(finishKey = 'walnut', repX = 1, repY = 1) {
  const key = `wood:${finishKey}:${repX}:${repY}`;
  if (texCache.has(key)) return texCache.get(key);

  const palettes = {
    walnut:   { base: [96, 62, 40],   dark: [56, 33, 20],   seed: 701 },
    oak:      { base: [198, 160, 114], dark: [158, 121, 78], seed: 702 },
    birch:    { base: [224, 200, 163], dark: [194, 168, 130], seed: 703 },
    whiteOak: { base: [216, 205, 187], dark: [186, 173, 154], seed: 704 },
    blackAsh: { base: [42, 40, 39],   dark: [24, 23, 22],   seed: 705 },
    white:    { base: [243, 241, 236], dark: [232, 229, 223], seed: 706 },
    concrete: { base: [168, 164, 158], dark: [138, 134, 128], seed: 707 }
  };
  const pal = palettes[finishKey] || palettes.walnut;
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const fbm = makeNoise2D(pal.seed);
  const img = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let t;
      if (finishKey === 'concrete') {
        t = fbm(x * 0.03, y * 0.03, 4);
      } else {
        const warp = fbm(x * 0.015, y * 0.05, 3) * 14;
        const ring = Math.sin(y * 0.16 + warp) * 0.5 + 0.5;
        const streak = fbm(x * 0.012, y * 0.14, 3);
        t = ring * 0.58 + streak * 0.42;
      }
      img.data[idx]     = clampByte(pal.dark[0] + (pal.base[0] - pal.dark[0]) * t);
      img.data[idx + 1] = clampByte(pal.dark[1] + (pal.base[1] - pal.dark[1]) * t);
      img.data[idx + 2] = clampByte(pal.dark[2] + (pal.base[2] - pal.dark[2]) * t);
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const map = finalizeTexture(c, { srgb: true, repX, repY });
  texCache.set(key, map);
  return map;
}

/**
 * 6. Woven Upholstery / Linen / Rug Fabric Texture
 */
export function getFabricTexture(hex = '#DDD4C6', repX = 4, repY = 4) {
  const key = `fab:${hex}:${repX}:${repY}`;
  if (texCache.has(key)) return texCache.get(key);
  const [r, g, b] = hexToRgb(hex);
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const fbm = makeNoise2D(r * 31 + g * 17 + b);
  const img = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const weave = ((x % 4 < 2) ^ (y % 4 < 2)) ? 5 : -5;
      const n = (fbm(x * 0.08, y * 0.08, 2) - 0.5) * 12;
      const d = weave + n;
      img.data[idx]     = clampByte(r + d);
      img.data[idx + 1] = clampByte(g + d);
      img.data[idx + 2] = clampByte(b + d);
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const map = finalizeTexture(c, { srgb: true, repX, repY });
  texCache.set(key, map);
  return map;
}

/**
 * 7. Kitchen Countertop Procedural Texture (12 IKEA France worktops)
 */
export function getCountertopTexture(item) {
  const key = `ct:${item.id}`;
  if (texCache.has(key)) return texCache.get(key);

  if (item.id === 'karlby-chene') return getWoodTexture('oak', 2, 1);
  if (item.id === 'karlby-noyer') return getWoodTexture('walnut', 2, 1);

  const [r0, g0, b0] = hexToRgb(item.baseHex);
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const fbm = makeNoise2D(item.id.split('').reduce((a, ch) => a + ch.charCodeAt(0) * 19, 100));
  const rng = makeRng(item.id.length * 919);
  const img = ctx.createImageData(size, size);

  const isMarble = item.id.includes('marbre');
  const isTerrazzo = item.id.includes('terrazzo');
  const isDark = item.category === 'dark';

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let d = (fbm(x * 0.025, y * 0.025, 4) - 0.5) * (isDark ? 14 : 10);
      if (isMarble) {
        const warp = fbm(x * 0.018, y * 0.018, 4) * 12;
        const vein = Math.pow(1 - Math.abs(Math.sin((x * 0.022 + y * 0.014) + warp)), 12);
        d += isDark ? vein * 72 : -vein * 38;
      }
      img.data[idx]     = clampByte(r0 + d);
      img.data[idx + 1] = clampByte(g0 + d);
      img.data[idx + 2] = clampByte(b0 + d);
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  if (isTerrazzo) {
    const chips = ['#B8ADA0', '#968B7E', '#CFC7BC', '#7A7268', '#F2EEE6'];
    for (let i = 0; i < 240; i++) {
      ctx.fillStyle = chips[Math.floor(rng() * chips.length)];
      ctx.beginPath();
      const cx = rng() * size, cy = rng() * size, rad = 1.5 + rng() * 4;
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const map = finalizeTexture(c, { srgb: true, repX: 2, repY: 1 });
  texCache.set(key, map);
  return map;
}

/**
 * 8. Kitchen Backsplash Texture
 */
export function getBacksplashTexture(mode) {
  const key = `bs:${mode}`;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');

  if (mode === 'subway') {
    ctx.fillStyle = '#F5F5F2';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#D8D5CE';
    ctx.lineWidth = 2;
    for (let row = 0; row < 4; row++) {
      const y = row * 32;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
      const off = (row % 2) * 32;
      for (let x = off; x < 256; x += 64) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 32); ctx.stroke();
      }
    }
  } else if (mode === 'warmStone') {
    ctx.fillStyle = '#DFD8CC';
    ctx.fillRect(0, 0, 256, 128);
  } else {
    ctx.fillStyle = '#F7F7F5';
    ctx.fillRect(0, 0, 256, 128);
  }

  const map = finalizeTexture(c, { srgb: true, repX: 4, repY: 1.5 });
  texCache.set(key, map);
  return map;
}

/**
 * 9. Minimalist Scandinavian Framed Wall Artwork
 */
export function getArtworkTexture(variant = 0) {
  const key = `art:${variant}`;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = 256; c.height = 320;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#F5F2EC';
  ctx.fillRect(0, 0, 256, 320);

  if (variant === 0) {
    ctx.fillStyle = '#C4B39E';
    ctx.beginPath(); ctx.arc(118, 174, 70, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E2DACF';
    ctx.fillRect(114, 82, 74, 148);
    ctx.strokeStyle = '#2A2622'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(146, 130, 38, 0.25, Math.PI * 1.6); ctx.stroke();
  } else if (variant === 1) {
    ctx.fillStyle = '#5E422E';
    ctx.beginPath(); ctx.arc(128, 145, 58, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#D9CFC1';
    ctx.beginPath(); ctx.arc(128, 210, 62, Math.PI, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1E1C19'; ctx.lineWidth = 2.5;
    ctx.strokeRect(42, 42, 172, 236);
  } else {
    ctx.fillStyle = '#97A496';
    ctx.fillRect(46, 56, 164, 118);
    ctx.fillStyle = '#D2B59A';
    ctx.beginPath(); ctx.arc(128, 198, 52, 0, Math.PI * 2); ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  texCache.set(key, tex);
  return tex;
}
