import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { WOOD_FINISHES } from '../catalogs/materials.js';
import { getWoodTexture, getFabricTexture } from './textures.js';

/* =========================================================================
 * PHASE 2 RICH MULTI-PART 3D COMPONENT BUILDER + GLB/GLTF MODEL LOADER
 * Renders declarative JSON Schema v2 (`parts[]`) from either:
 * - Built-in Designer Recipes (zero API key, instant)
 * - Live Gemini / OpenAI LLM JSON-to-3D generation (BYOK)
 * - Imported .glb / .gltf 3D models (IKEA, SketchUp, Tripo3D, Meshy, etc.)
 * ========================================================================= */

const gltfLoader = new GLTFLoader();
const glbCache = new Map(); // uid/dataUrl -> parsed GLTF scene

function buildPbrMaterial(matSpec = {}) {
  const type = matSpec.type || 'matte';
  const color = matSpec.color || '#C4B5A0';

  if (type === 'wood') {
    const fk = (matSpec.finish && WOOD_FINISHES[matSpec.finish]) ? matSpec.finish : 'walnut';
    const wf = WOOD_FINISHES[fk];
    return new THREE.MeshStandardMaterial({
      map: fk === 'white' ? null : getWoodTexture(fk, 1.5, 1.2),
      color: fk === 'white' ? wf.hex : '#FFFFFF',
      roughness: wf.roughness,
      metalness: 0.0,
      envMapIntensity: 0.32
    });
  }
  if (type === 'fabric') {
    return new THREE.MeshStandardMaterial({
      map: getFabricTexture(color, 3, 3),
      color: '#FFFFFF',
      roughness: 0.92,
      metalness: 0.0,
      envMapIntensity: 0.18
    });
  }
  if (type === 'metal') {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: matSpec.roughness ?? 0.28,
      metalness: 0.86,
      envMapIntensity: 0.85
    });
  }
  if (type === 'marble') {
    return new THREE.MeshStandardMaterial({
      color: color || '#F3F1EC',
      roughness: 0.18,
      metalness: 0.03,
      envMapIntensity: 0.55
    });
  }
  if (type === 'mirror') {
    return new THREE.MeshStandardMaterial({
      color: '#DCE5EB',
      roughness: 0.05,
      metalness: 0.95,
      envMapIntensity: 1.0
    });
  }
  if (type === 'glass') {
    return new THREE.MeshPhysicalMaterial({
      color: color || '#E2F1F8',
      roughness: 0.06,
      metalness: 0.0,
      transparent: true,
      opacity: 0.34,
      transmission: 0.72
    });
  }
  if (type === 'emissive') {
    return new THREE.MeshStandardMaterial({
      color: '#FFF9ED',
      emissive: color || '#FFD699',
      emissiveIntensity: 1.25,
      roughness: 0.25
    });
  }
  return new THREE.MeshStandardMaterial({
    color,
    roughness: matSpec.roughness ?? 0.65,
    metalness: 0.0
  });
}

function createPartGeometry(part) {
  const s = Array.isArray(part.size) ? part.size : [0.5, 0.5, 0.5];
  const sx = Math.max(0.01, Math.min(4.0, Number(s[0]) || 0.3));
  const sy = Math.max(0.01, Math.min(2.5, Number(s[1]) || 0.3));
  const sz = Math.max(0.01, Math.min(4.0, Number(s[2]) || 0.3));

  switch (part.shape) {
    case 'cylinder':
      return new THREE.CylinderGeometry(sx / 2, (part.radiusBottom ? part.radiusBottom : sx / 2), sy, 24);
    case 'sphere': {
      const geo = new THREE.SphereGeometry(0.5, 20, 14);
      geo.scale(sx, sy, sz);
      return geo;
    }
    case 'cone':
      return new THREE.ConeGeometry(sx / 2, sy, 20);
    case 'torus':
      return new THREE.TorusGeometry(sx / 2, Math.max(0.012, sz / 2), 12, 28, part.arc || Math.PI * 2);
    case 'arch': {
      // Rounded-top architectural panel (great for arched mirrors, headboards, niches!)
      const r = sx / 2;
      const straightH = Math.max(0.05, sy - r);
      const sh = new THREE.Shape();
      sh.moveTo(-r, -sy / 2);
      sh.lineTo(r, -sy / 2);
      sh.lineTo(r, -sy / 2 + straightH);
      sh.absarc(0, -sy / 2 + straightH, r, 0, Math.PI, false);
      sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: sz, bevelEnabled: false, curveSegments: 24 });
      geo.translate(0, 0, -sz / 2);
      return geo;
    }
    case 'box':
    default:
      return new THREE.BoxGeometry(sx, sy, sz);
  }
}

/**
 * Generates a rich declarative Schema v2 `parts[]` array for a named designer recipe!
 */
export function buildRecipeParts(recipe, { w, d, h, mainMat, accentMetal, fabricMat }) {
  const parts = [];
  const legMat = accentMetal || { type: 'metal', color: '#C8A156' };
  const bodyMat = mainMat || { type: 'wood', finish: 'walnut' };
  const softMat = fabricMat || { type: 'fabric', color: '#E5DDD0' };

  if (recipe === 'fluted-sideboard' || recipe === 'tv-slatted-console') {
    const legH = 0.17;
    const bodyH = Math.max(0.25, h - legH);
    const bodyY = legH + bodyH / 2;
    // Main cabinet carcass
    parts.push({ shape: 'box', pos: [0, bodyY, 0], size: [w, bodyH, d - 0.02], mat: bodyMat });
    // Top beveled slab
    parts.push({ shape: 'box', pos: [0, h - 0.015, 0], size: [w + 0.02, 0.03, d + 0.01], mat: bodyMat });
    // Architectural fluted vertical slats across front!
    const slatCount = Math.max(8, Math.min(34, Math.floor(w / 0.055)));
    for (let i = 0; i < slatCount; i++) {
      const sx = -w / 2 + 0.04 + ((w - 0.08) * i) / (slatCount - 1);
      parts.push({ shape: 'box', pos: [sx, bodyY, d / 2 - 0.002], size: [0.022, bodyH - 0.06, 0.018], mat: bodyMat });
    }
    // 4 slender tapered legs + brass caps
    for (const lx of [-w / 2 + 0.12, w / 2 - 0.12]) {
      for (const lz of [-d / 2 + 0.07, d / 2 - 0.07]) {
        parts.push({ shape: 'cylinder', pos: [lx, legH / 2, lz], size: [0.028, legH, 0.028], mat: legMat });
      }
    }
    // Ceramic sculptural vase + decorative art book on top!
    parts.push({ shape: 'cylinder', pos: [w * 0.28, h + 0.13, -0.02], size: [0.13, 0.26, 0.13], mat: { type: 'matte', color: '#EAE4DA' } });
    parts.push({ shape: 'box', pos: [-w * 0.22, h + 0.02, 0.02], size: [0.28, 0.035, 0.22], mat: { type: 'matte', color: '#383430' } });
  } else if (recipe === 'arched-mirror') {
    const mw = Math.max(0.55, w);
    const mh = Math.max(1.55, h);
    // Outer arched brass/black frame
    parts.push({ shape: 'arch', pos: [0, mh / 2, 0], size: [mw, mh, 0.035], mat: legMat });
    // Inner reflective arched mirror glass
    parts.push({ shape: 'arch', pos: [0, mh / 2, 0.014], size: [mw - 0.045, mh - 0.045, 0.016], mat: { type: 'mirror' } });
    // Rear easel support leg
    parts.push({ shape: 'box', pos: [0, mh * 0.35, -0.22], size: [0.03, mh * 0.72, 0.03], rot: [0.28, 0, 0], mat: legMat });
  } else if (recipe === 'curved-armchair') {
    const seatH = 0.42;
    // 4 slender legs
    for (const lx of [-w * 0.34, w * 0.34]) {
      for (const lz of [-d * 0.32, d * 0.32]) {
        parts.push({ shape: 'cylinder', pos: [lx, 0.14, lz], size: [0.032, 0.28, 0.032], mat: legMat });
      }
    }
    // Plush rounded seat cushion
    parts.push({ shape: 'cylinder', pos: [0, seatH - 0.08, 0.02], size: [w * 0.88, 0.18, d * 0.86], mat: softMat });
    // Sculptural curved barrel backrest & armrests
    const segs = 7;
    const rad = w * 0.42;
    for (let i = 0; i < segs; i++) {
      const a = -Math.PI * 0.82 + (Math.PI * 0.64 * i) / (segs - 1);
      const bx = Math.cos(a) * rad;
      const bz = Math.sin(a) * rad * 0.85;
      parts.push({
        shape: 'cylinder',
        pos: [bx, seatH + 0.16, bz],
        size: [0.18, 0.42, 0.18],
        mat: softMat
      });
    }
    // Warm accent lumbar pillow
    parts.push({ shape: 'box', pos: [0, seatH + 0.12, -d * 0.16], size: [0.36, 0.24, 0.11], rot: [-0.2, 0, 0], mat: { type: 'fabric', color: '#B58468' } });
  } else if (recipe === 'designer-bookcase') {
    // Architectural side uprights & shelves
    parts.push({ shape: 'box', pos: [-w / 2 + 0.018, h / 2, 0], size: [0.035, h, d], mat: bodyMat });
    parts.push({ shape: 'box', pos: [ w / 2 - 0.018, h / 2, 0], size: [0.035, h, d], mat: bodyMat });
    parts.push({ shape: 'box', pos: [0, h / 2, -d / 2 + 0.01], size: [w, h, 0.018], mat: bodyMat });
    const shelfCount = Math.max(4, Math.min(7, Math.round(h / 0.36)));
    const bookColors = ['#D6CEC2', '#8E9E8F', '#C48B73', '#3D4854', '#EAE4D8', '#A6886D'];
    for (let i = 0; i <= shelfCount; i++) {
      const sy = 0.08 + ((h - 0.12) * i) / shelfCount;
      parts.push({ shape: 'box', pos: [0, sy, 0.01], size: [w - 0.04, 0.028, d - 0.02], mat: bodyMat });
      // Style shelves with minimalist books & ceramic bowls!
      if (i > 0 && i < shelfCount) {
        const bx = (i % 2 === 0 ? -w * 0.26 : w * 0.18);
        for (let b = 0; b < 4; b++) {
          parts.push({
            shape: 'box',
            pos: [bx + b * 0.036, sy + 0.12, 0.02],
            size: [0.028, 0.20 + (b % 2) * 0.03, 0.17],
            mat: { type: 'matte', color: bookColors[(i + b) % bookColors.length] }
          });
        }
        parts.push({
          shape: 'sphere',
          pos: [-bx * 0.85, sy + 0.09, 0.02],
          size: [0.14, 0.15, 0.14],
          mat: { type: 'matte', color: '#E8E2D7' }
        });
      }
    }
  } else if (recipe === 'marble-coffee-table') {
    const topMat = mainMat?.type === 'marble' ? mainMat : { type: 'marble', color: '#F3F1EC' };
    if (Math.abs(w - d) < 0.15) {
      // Sculptural round coffee table with fluted wood/stone pedestal!
      parts.push({ shape: 'cylinder', pos: [0, h - 0.02, 0], size: [w, 0.04, w], mat: topMat });
      parts.push({ shape: 'cylinder', pos: [0, (h - 0.04) / 2, 0], size: [w * 0.36, h - 0.04, w * 0.36], mat: bodyMat });
      parts.push({ shape: 'cylinder', pos: [0, 0.015, 0], size: [w * 0.52, 0.03, w * 0.52], mat: legMat });
    } else {
      parts.push({ shape: 'box', pos: [0, h - 0.02, 0], size: [w, 0.04, d], mat: topMat });
      parts.push({ shape: 'box', pos: [-w * 0.34, (h - 0.04) / 2, 0], size: [0.08, h - 0.04, d * 0.72], mat: bodyMat });
      parts.push({ shape: 'box', pos: [ w * 0.34, (h - 0.04) / 2, 0], size: [0.08, h - 0.04, d * 0.72], mat: bodyMat });
    }
  } else if (recipe === 'vanity-desk') {
    // Bedroom dressing table + backlit round LED mirror + bouclé pouf!
    parts.push({ shape: 'box', pos: [0, h - 0.07, 0], size: [w, 0.14, d], mat: bodyMat });
    for (const lx of [-w / 2 + 0.06, w / 2 - 0.06]) {
      for (const lz of [-d / 2 + 0.06, d / 2 - 0.06]) {
        parts.push({ shape: 'cylinder', pos: [lx, (h - 0.14) / 2, lz], size: [0.028, h - 0.14, 0.028], mat: legMat });
      }
    }
    // Round backlit mirror above desk
    parts.push({ shape: 'cylinder', pos: [0, h + 0.36, -d / 2 + 0.03], size: [0.58, 0.022, 0.58], rot: [Math.PI / 2, 0, 0], mat: { type: 'emissive', color: '#FFE0B0' } });
    parts.push({ shape: 'cylinder', pos: [0, h + 0.36, -d / 2 + 0.045], size: [0.54, 0.018, 0.54], rot: [Math.PI / 2, 0, 0], mat: { type: 'mirror' } });
    // Bouclé round ottoman pouf tucked in front
    parts.push({ shape: 'cylinder', pos: [0, 0.22, d / 2 + 0.16], size: [0.40, 0.44, 0.40], mat: softMat });
  } else if (recipe === 'bar-stools') {
    // Pair of designer 65cm kitchen counter stools!
    const offsets = w >= 0.95 ? [-w * 0.28, w * 0.28] : [0];
    for (const ox of offsets) {
      parts.push({ shape: 'cylinder', pos: [ox, 0.65, 0], size: [0.36, 0.06, 0.36], mat: softMat });
      parts.push({ shape: 'box', pos: [ox, 0.78, -0.15], size: [0.34, 0.16, 0.04], mat: bodyMat });
      for (const lx of [-0.14, 0.14]) {
        for (const lz of [-0.14, 0.14]) {
          parts.push({ shape: 'cylinder', pos: [ox + lx, 0.32, lz], size: [0.02, 0.64, 0.02], mat: legMat });
        }
      }
      parts.push({ shape: 'torus', pos: [ox, 0.22, 0], size: [0.28, 0.02, 0.02], rot: [Math.PI / 2, 0, 0], mat: legMat });
    }
  } else if (recipe === 'arc-floor-lamp') {
    parts.push({ shape: 'cylinder', pos: [0, 0.04, -0.22], size: [0.34, 0.08, 0.34], mat: { type: 'marble', color: '#F2EFEA' } });
    parts.push({ shape: 'cylinder', pos: [0, h * 0.48, -0.22], size: [0.024, h * 0.88, 0.024], mat: legMat });
    parts.push({ shape: 'box', pos: [0, h - 0.12, 0.05], size: [0.022, 0.022, 0.56], rot: [-0.15, 0, 0], mat: legMat });
    parts.push({ shape: 'sphere', pos: [0, h - 0.18, 0.30], size: [0.24, 0.24, 0.24], mat: { type: 'emissive', color: '#FFD89E' } });
  } else if (recipe === 'entry-bench') {
    parts.push({ shape: 'box', pos: [0, h - 0.08, 0], size: [w, 0.05, d], mat: bodyMat });
    parts.push({ shape: 'box', pos: [0, h - 0.025, 0], size: [w - 0.04, 0.07, d - 0.04], mat: softMat });
    parts.push({ shape: 'box', pos: [0, 0.14, 0], size: [w - 0.14, 0.025, d - 0.08], mat: bodyMat });
    for (const lx of [-w / 2 + 0.06, w / 2 - 0.06]) {
      for (const lz of [-d / 2 + 0.05, d / 2 - 0.05]) {
        parts.push({ shape: 'cylinder', pos: [lx, (h - 0.08) / 2, lz], size: [0.032, h - 0.08, 0.032], mat: bodyMat });
      }
    }
  } else if (recipe === 'wine-cabinet') {
    parts.push({ shape: 'box', pos: [0, h / 2, 0], size: [w, h, d], mat: bodyMat });
    parts.push({ shape: 'box', pos: [0, h * 0.62, d / 2 + 0.004], size: [w - 0.08, h * 0.56, 0.015], mat: { type: 'glass', color: '#D4E4EC' } });
    // Subtle dark wine bottles inside
    for (let r = 0; r < 3; r++) {
      for (let c = -2; c <= 2; c++) {
        parts.push({ shape: 'cylinder', pos: [c * (w * 0.14), h * 0.42 + r * 0.22, 0.02], size: [0.055, 0.22, 0.055], rot: [Math.PI / 2, 0, 0], mat: { type: 'matte', color: '#243528' } });
      }
    }
  } else {
    // Fallback refined cabinet/table
    const legH = 0.16;
    parts.push({ shape: 'box', pos: [0, legH + (h - legH) / 2, 0], size: [w, h - legH, d], mat: bodyMat });
    for (const lx of [-w / 2 + 0.08, w / 2 - 0.08]) {
      for (const lz of [-d / 2 + 0.06, d / 2 - 0.06]) {
        parts.push({ shape: 'cylinder', pos: [lx, legH / 2, lz], size: [0.026, legH, 0.026], mat: legMat });
      }
    }
  }
  return parts;
}

/**
 * Builds a Three.js Group from a declarative Schema v2 `spec` (`parts[]`).
 */
export function buildRichComponentMesh(item) {
  const spec = item.spec || {};
  const g = new THREE.Group();
  const w = Math.max(0.20, Number(spec.w || item.w || 1.2));
  const d = Math.max(0.20, Number(spec.d || item.d || 0.45));
  const h = Math.max(0.15, Number(spec.h || item.h || 0.78));

  const parts = Array.isArray(spec.parts) && spec.parts.length
    ? spec.parts
    : buildRecipeParts(spec.recipe || 'fluted-sideboard', {
        w, d, h,
        mainMat: spec.mainMat,
        accentMetal: spec.accentMetal,
        fabricMat: spec.fabricMat
      });

  for (const part of parts) {
    try {
      const geo = createPartGeometry(part);
      const mat = buildPbrMaterial(part.mat);
      const mesh = new THREE.Mesh(geo, mat);
      const p = Array.isArray(part.pos) ? part.pos : [0, 0.5, 0];
      mesh.position.set(Number(p[0]) || 0, Number(p[1]) || 0, Number(p[2]) || 0);
      if (Array.isArray(part.rot)) {
        mesh.rotation.set(Number(part.rot[0]) || 0, Number(part.rot[1]) || 0, Number(part.rot[2]) || 0);
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
    } catch (_) {
      // Skip malformed individual part cleanly
    }
  }

  g.userData.footprint = { w, d };
  return g;
}

/**
 * Loads a user-imported .GLB / .GLTF file (ArrayBuffer or ObjectURL) into a normalized Group!
 */
export async function parseGlbFile(file) {
  const buf = await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    gltfLoader.parse(buf, '', (gltf) => {
      const root = gltf.scene;
      // Compute bounding box & normalize floor alignment (y=0)
      const box = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      // Auto-convert cm/mm exports if model is huge (> 6m) or tiny (< 0.05m)
      let scale = 1.0;
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 8) scale = 1.0 / (maxDim > 80 ? 100 : 10);
      else if (maxDim > 0 && maxDim < 0.08) scale = 1.0 / maxDim * 0.85;

      root.scale.multiplyScalar(scale);
      root.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(root);
      const size2 = new THREE.Vector3();
      const center2 = new THREE.Vector3();
      box2.getSize(size2);
      box2.getCenter(center2);

      // Center XZ at 0 and sit bottom cleanly on floor y=0
      root.position.x -= center2.x;
      root.position.z -= center2.z;
      root.position.y -= box2.min.y;

      root.traverse(obj => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      const cacheId = `glb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      glbCache.set(cacheId, root);
      resolve({
        glbId: cacheId,
        w: Math.max(0.25, Math.round(size2.x * 100) / 100),
        d: Math.max(0.25, Math.round(size2.z * 100) / 100),
        h: Math.max(0.15, Math.round(size2.y * 100) / 100)
      });
    }, reject);
  });
}

export function buildGlbItemMesh(item) {
  const g = new THREE.Group();
  const cached = glbCache.get(item.glbId);
  if (cached) {
    const clone = cached.clone(true);
    if (item.scaleFactor && item.scaleFactor !== 1) {
      clone.scale.multiplyScalar(item.scaleFactor);
    }
    g.add(clone);
  } else {
    // Graceful placeholder if page reloaded (browser can't keep huge binary GLB in localStorage)
    const ph = new THREE.Mesh(
      new THREE.BoxGeometry(item.w || 0.8, item.h || 0.8, item.d || 0.6),
      new THREE.MeshStandardMaterial({ color: '#B5A898', roughness: 0.7, wireframe: false })
    );
    ph.position.y = (item.h || 0.8) / 2;
    g.add(ph);
  }
  const s = item.scaleFactor || 1;
  g.userData.footprint = { w: (item.w || 0.8) * s, d: (item.d || 0.6) * s };
  return g;
}
