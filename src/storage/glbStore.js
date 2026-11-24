/* =========================================================================
 * INDEXEDDB PERSISTENCE FOR USER-IMPORTED .GLB / .GLTF BINARY MODELS
 * Keeps imported 3D assets across browser reloads without localStorage limits.
 * ========================================================================= */

const DB_NAME = 'cassiopee_glb_assets_v1';
const STORE_NAME = 'models';

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveGlbBuffer(glbId, arrayBuffer) {
  try {
    const db = await openDb();
    if (!db) return false;
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(arrayBuffer, glbId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (_) {
    return false;
  }
}

export async function loadGlbBuffer(glbId) {
  try {
    const db = await openDb();
    if (!db) return null;
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(glbId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    return null;
  }
}

export async function deleteGlbBuffer(glbId) {
  try {
    const db = await openDb();
    if (!db) return false;
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(glbId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (_) {
    return false;
  }
}
