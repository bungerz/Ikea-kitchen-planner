/* =========================================================================
 * GPU MEMORY MANAGEMENT UTILITIES
 * Recursively disposes Three.js geometries & materials when clearing groups,
 * while preserving cached procedural textures (tagged userData.shared = true).
 * ========================================================================= */

const TEXTURE_KEYS = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'bumpMap',
  'emissiveMap',
  'alphaMap',
  'clearcoatNormalMap'
];

export function disposeMaterial(mat, { keepSharedTextures = true } = {}) {
  if (!mat) return;
  if (mat.userData?.shared) return;
  for (const key of TEXTURE_KEYS) {
    const tex = mat[key];
    if (tex && typeof tex.dispose === 'function') {
      if (keepSharedTextures && tex.userData?.shared) continue;
      tex.dispose();
    }
  }
  if (typeof mat.dispose === 'function') {
    mat.dispose();
  }
}

export function disposeObject3D(root, { keepSharedTextures = true } = {}) {
  if (!root) return;
  root.traverse((obj) => {
    if (obj.geometry && !obj.geometry.userData?.shared && typeof obj.geometry.dispose === 'function') {
      obj.geometry.dispose();
    }
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        for (const m of obj.material) disposeMaterial(m, { keepSharedTextures });
      } else {
        disposeMaterial(obj.material, { keepSharedTextures });
      }
    }
  });
}

export function clearGroupAndDispose(group, options = {}) {
  if (!group) return;
  while (group.children.length > 0) {
    const child = group.children[group.children.length - 1];
    group.remove(child);
    disposeObject3D(child, options);
  }
}
