import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';

function installMockBrowser() {
  const makeCtx = () => ({
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '',
    fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, roundRect() {},
    fill() {}, stroke() {}, fillText() {},
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    putImageData() {}
  });

  const elCache = new Map();
  const makeEl = (id = '') => ({
    id,
    tagName: 'DIV',
    width: 256,
    height: 256,
    clientWidth: 960,
    clientHeight: 720,
    style: {},
    dataset: {},
    innerHTML: '',
    textContent: '',
    value: '',
    className: '',
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    getContext() { return makeCtx(); },
    addEventListener() {},
    removeEventListener() {},
    appendChild() {},
    setPointerCapture() {},
    releasePointerCapture() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 720 }; }
  });

  globalThis.document = {
    createElement(tag) {
      const el = makeEl();
      el.tagName = tag.toUpperCase();
      return el;
    },
    getElementById(id) {
      if (!elCache.has(id)) elCache.set(id, makeEl(id));
      return elCache.get(id);
    },
    querySelectorAll() { return []; }
  };

  globalThis.window = {
    devicePixelRatio: 1,
    addEventListener() {},
    removeEventListener() {},
    matchMedia() { return { matches: false }; }
  };

  globalThis.localStorage = {
    _data: new Map(),
    getItem(k) { return this._data.get(k) ?? null; },
    setItem(k, v) { this._data.set(k, String(v)); },
    removeItem(k) { this._data.delete(k); }
  };
}

installMockBrowser();

test('every 3D builder, kitchen variant, furniture model, overlay, and raytracer module runs without ReferenceError or TypeError', async () => {
  const { buildCassiopeeEnvironment } = await import('../src/environment/cassiopeeBuilding.js');
  const { buildApartmentShell } = await import('../src/builders/apartment.js');
  const { KitchenBuilder } = await import('../src/builders/kitchen.js');
  const { buildFurnitureItemMesh, buildLightFixtures } = await import('../src/builders/furniture3d.js');
  const { ArchitecturalOverlays } = await import('../src/builders/overlays.js');
  const { createDefaultState } = await import('../src/core/state.js');
  const { DOORS, COUNTERTOPS } = await import('../src/catalogs/materials.js');
  const { IKEA_BEDS, IKEA_SOFAS, MOBILIFIVER_TABLES } = await import('../src/catalogs/furniture.js');
  const { computeAmbillySun } = await import('../src/environment/ambillySun.js');
  const { disposeObject3D, clearGroupAndDispose } = await import('../src/core/dispose.js');

  const scene = new THREE.Scene();
  const state = createDefaultState();

  const env = buildCassiopeeEnvironment(scene);
  env.updateSky(computeAmbillySun('summer', 16.0));
  env.updateSky(computeAmbillySun('winter', 21.5));

  const shell = buildApartmentShell(scene);
  assert.ok(shell.roomPaintMaterials.ch3.main.normalMap, 'Wall materials should have plaster normalMap');
  assert.ok(shell.curtainGroup, 'Sheer curtain group should exist');
  assert.ok(shell.exteriorWallGroups.south, 'Exterior wall groups should exist');

  // Test every kitchen door, countertop, backsplash, hardware & claustra option
  const kb = new KitchenBuilder(scene);
  for (const d of DOORS) kb.applyDoor(d.id);
  for (const c of COUNTERTOPS) kb.applyCountertop(c.id);
  for (const bs of ['white', 'subway', 'matching', 'warmStone']) kb.applyBacksplash(bs);
  for (const hw of ['black', 'brass', 'steel']) kb.applyHardware(hw);
  for (const ch of ['full', 'half', 'off']) kb.applyClaustra(ch, 'walnut');

  // Test every default movable item + every IKEA bed, sofa, and Mobili Fiver table extension
  const mg = new THREE.Group();
  for (const it of state.items) mg.add(buildFurnitureItemMesh(it));
  for (const b of IKEA_BEDS) {
    mg.add(buildFurnitureItemMesh({ uid: `t-${b.id}`, kind: 'bed', modelId: b.id, finish: b.defaultFinish, x: 2, z: 2, rotY: 0 }));
  }
  for (const s of IKEA_SOFAS) {
    mg.add(buildFurnitureItemMesh({ uid: `t-${s.id}`, kind: 'sofa', modelId: s.id, fabric: s.defaultFabric, chaise: s.defaultChaise, x: 3, z: 6, rotY: 0 }));
  }
  for (const t of MOBILIFIVER_TABLES) {
    for (const step of [0, 1, 2]) {
      mg.add(buildFurnitureItemMesh({ uid: `t-${t.id}-${step}`, kind: 'diningTable', modelId: t.id, finish: t.defaultFinish, extensionStep: step, x: 2, z: 6, rotY: 0 }));
    }
  }
  assert.ok(mg.children.length > 30);
  clearGroupAndDispose(mg);
  assert.equal(mg.children.length, 0);

  // Test lights in morning & evening
  const fg = new THREE.Group();
  const lightsDay = buildLightFixtures(fg, state.roomFixtures, 'morning');
  const lightsEve = buildLightFixtures(fg, state.roomFixtures, 'evening');
  assert.equal(lightsDay.length, 0);
  assert.ok(lightsEve.length > 0);
  disposeObject3D(fg);

  // Test overlays
  const ov = new ArchitecturalOverlays(scene);
  ov.setPlanLabelsVisible(true);
  const diag = ov.updateDoorSwings(true, state.items, () => ({ w: 1, d: 1 }));
  ov.updateTmaOverlay(true, diag.occludedOutlets);
});

test('all UI panel renderers & interaction controllers instantiate cleanly and match index.html IDs', async () => {
  const { renderAllPanels } = await import('../src/ui/panels.js');
  const { createDefaultState } = await import('../src/core/state.js');
  const { FurnitureManipulator } = await import('../src/interaction/manipulator.js');
  const { TapeMeasureTool } = await import('../src/interaction/tapeMeasure.js');

  const st = createDefaultState();
  renderAllPanels(st, { collisions: [], warnings: [], occludedOutlets: [] });

  const dom = globalThis.document.createElement('canvas');
  const cam = new THREE.PerspectiveCamera();
  const scene = new THREE.Scene();
  const mg = new THREE.Group();
  const fakeControls = { enabled: true };

  const manip = new FurnitureManipulator({
    domElement: dom,
    getCamera: () => cam,
    getControls: () => fakeControls,
    scene,
    movableGroup: mg,
    getItems: () => st.items
  });
  manip.select(null);

  const tm = new TapeMeasureTool({ domElement: dom, getCamera: () => cam, scene });
  tm.setActive(true);
  tm.clearAll();
  tm.setActive(false);

  // Verify every static getElementById in main.js & panels.js exists in index.html
  const html = fs.readFileSync('index.html', 'utf8');
  const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  for (const f of ['src/main.js', 'src/ui/panels.js']) {
    const code = fs.readFileSync(f, 'utf8');
    for (const m of code.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)) {
      assert.ok(htmlIds.has(m[1]), `Missing DOM id="${m[1]}" in index.html (referenced in ${f})`);
    }
  }
});

test('raytracer module imports cleanly and profiles/HDRI config are valid', async () => {
  const mod = await import('../src/raytracer.js');
  assert.ok(mod.RT_PROFILES.fast);
  assert.ok(mod.RT_PROFILES.balanced);
  assert.ok(mod.RT_PROFILES.photo);
  assert.equal(mod.RT_PROFILES.photo.bounces, 8);
  assert.equal(typeof mod.KitchenRayTracer, 'function');
});
