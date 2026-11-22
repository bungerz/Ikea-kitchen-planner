import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import {
  DOORS,
  COUNTERTOPS,
  DULUX_PAINTS,
  WOOD_FINISHES,
  SOFA_FABRICS
} from './catalogs/materials.js';
import {
  ROOMS,
  OVERVIEW_CAMERAS,
  IKEA_BEDS,
  IKEA_SOFAS,
  MOBILIFIVER_TABLES,
  LIGHT_FIXTURES,
  QUICK_ADD_ITEMS,
  createDefaultMovableItems
} from './catalogs/furniture.js';
import { buildApartmentShell } from './builders/apartment.js';
import { KitchenBuilder } from './builders/kitchen.js';
import { buildFurnitureItemMesh, buildLightFixtures } from './builders/furniture3d.js';
import { parseGlbFile } from './builders/richComponent3d.js';
import { FurnitureManipulator } from './interaction/manipulator.js';
import {
  interpretPromptAsync,
  applyLocalEditPatch,
  loadAiConfig,
  saveAiConfig
} from './promptStudio.js';
import {
  SEASON_PRESETS,
  computeAmbillySun,
  formatHour,
  compassLabel
} from './environment/ambillySun.js';
import { buildCassiopeeEnvironment } from './environment/cassiopeeBuilding.js';

const STORAGE_KEY = 'cassiopee_ambilly_lot17_v1';

/* =========================================================================
 * 1. CENTRAL APPLICATION STATE (WITH LOCALSTORAGE AUTO-SAVE + UNDO/REDO)
 * ========================================================================= */
function createDefaultState() {
  return {
    activeTab: 'furniture',
    activeView: 'cutaway',
    activeBedRoom: 'ch3',
    activePaintRoom: 'ch3',
    showCeilings: false,
    showBuilding: true,      // 4th Floor (R+4) Cassiopée Ambilly surroundings ON by default!
    sunSeason: 'summer',     // 'summer' | 'spring' | 'autumn' | 'winter'
    sunHour: 16.0,           // 16:00 CEST — glorious SSW/WNW Ambilly afternoon sun!
    d65Override: false,      // Optional Neutral D65 studio color-check override
    lightingMode: 'morning', // Derived for raytracer/fixtures ('morning' | 'daylight' | 'evening')

    // Per-room wall paints: ORIGINAL WHITE BY DEFAULT (no Dulux Valentine until chosen!)
    roomPaints: {
      ch3:    { paintId: 'original-white', coverage: 'all' },
      ch1:    { paintId: 'original-white', coverage: 'all' },
      ch2:    { paintId: 'original-white', coverage: 'all' },
      sejour: { paintId: 'original-white', coverage: 'all' },
      wc:     { paintId: 'original-white', coverage: 'all' },
      sdb:    { paintId: 'original-white', coverage: 'all' },
      entree: { paintId: 'original-white', coverage: 'all' }
    },

    // Per-room TMA light fixture styles (default proposals included!)
    roomFixtures: {
      sejour: 'scandi-linen',
      ch3:    'brass-opal',
      ch1:    'scandi-linen',
      ch2:    'natural-rattan',
      wc:     'brass-opal',
      sdb:    'flush-minimal',
      entree: 'flush-minimal'
    },

    // Exact IKEA METOD Kitchen State
    kitchen: {
      doorId: 'havstorp-beige',
      countertopId: 'ekbacken-blanc',
      backsplash: 'white',
      hardware: 'black',
      claustraHeight: 'half',
      claustraFinish: 'oak',
      comboA: null
    },

    // All movable furniture across the entire apartment
    items: createDefaultMovableItems(),

    // Reusable Prompted Components Library
    customLibrary: []
  };
}

let state = loadSavedState();
const undoStack = [];
const redoStack = [];

function loadSavedState() {
  const def = createDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return def;
    const parsed = JSON.parse(raw);
    return {
      ...def,
      ...parsed,
      roomPaints: { ...def.roomPaints, ...(parsed.roomPaints || {}) },
      roomFixtures: { ...def.roomFixtures, ...(parsed.roomFixtures || {}) },
      kitchen: { ...def.kitchen, ...(parsed.kitchen || {}) },
      items: Array.isArray(parsed.items) && parsed.items.length ? parsed.items : def.items,
      customLibrary: Array.isArray(parsed.customLibrary) ? parsed.customLibrary : []
    };
  } catch (_) {
    return def;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      roomPaints: state.roomPaints,
      roomFixtures: state.roomFixtures,
      kitchen: state.kitchen,
      items: state.items,
      customLibrary: state.customLibrary,
      lightingMode: state.lightingMode,
      sunSeason: state.sunSeason,
      sunHour: state.sunHour,
      showBuilding: state.showBuilding
    }));
  } catch (_) {}
}

function snapshotForUndo() {
  const snap = JSON.stringify({
    roomPaints: state.roomPaints,
    roomFixtures: state.roomFixtures,
    kitchen: state.kitchen,
    items: state.items
  });
  if (undoStack[undoStack.length - 1] !== snap) {
    undoStack.push(snap);
    if (undoStack.length > 40) undoStack.shift();
    redoStack.length = 0;
  }
}

function applySnapshot(snapStr) {
  const parsed = JSON.parse(snapStr);
  state.roomPaints = parsed.roomPaints;
  state.roomFixtures = parsed.roomFixtures;
  state.kitchen = parsed.kitchen;
  state.items = parsed.items;
  rebuildAllMovables();
  applyAllRoomPaints();
  kitchenBuilder.applyAll(state.kitchen);
  rebuildLights();
  saveState();
  renderAllUI();
  notifyRayTracerGeometryChange();
}

function undo() {
  if (undoStack.length < 2) { showToast('Nothing to undo'); return; }
  const cur = undoStack.pop();
  redoStack.push(cur);
  applySnapshot(undoStack[undoStack.length - 1]);
  showToast('Undone');
}

function redo() {
  if (!redoStack.length) { showToast('Nothing to redo'); return; }
  const next = redoStack.pop();
  undoStack.push(next);
  applySnapshot(next);
  showToast('Redone');
}

/* =========================================================================
 * 2. THREE.JS SCENE, RENDERER, LIGHTS & CAMERA ANIMATION
 * ========================================================================= */
let renderer, scene, camera, controls;
let apartmentShell, cassiopeeEnv, kitchenBuilder, manipulator;
let movableGroup, fixturesGroup;
let sunLight, hemiLight, fillLight;
let dynamicFixtureLights = [];
let sunPlaying = false;
let lastSunAnimTs = 0;

// Smooth camera tween
let camTween = null;

// On-Demand GPU Ray Tracer (lazy-loaded!)
let rayTracer = null;
let rtActive = false;
let rtLastHudTs = 0;

function initThree() {
  const host = document.getElementById('canvas-host');
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.96;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#E6E2DA');

  // Calibrated neutral studio IBL environment
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();

  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 420);
  camera.position.set(...OVERVIEW_CAMERAS.cutaway.pos);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.maxPolarAngle = Math.PI * 0.56; // Allows looking slightly up from 4th-floor Loggia toward sky & Salève!
  controls.minDistance = 0.85;
  controls.maxDistance = 32;
  controls.target.set(...OVERVIEW_CAMERAS.cutaway.target);
  controls.update();

  controls.addEventListener('start', () => { camTween = null; });
  controls.addEventListener('change', () => {
    if (rtActive && rayTracer) rayTracer.notifyCameraChanged();
  });

  // Base Architectural Lighting
  hemiLight = new THREE.HemisphereLight(0xFFFDF8, 0xCCC5BA, 0.72);
  scene.add(hemiLight);

  sunLight = new THREE.DirectionalLight(0xFFF3E2, 1.85);
  sunLight.position.set(-4.5, 11.5, 13.5); // Warm South-West daylight through Loggia & West windows
  sunLight.target.position.set(5.5, 0, 5.5);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 34;
  sunLight.shadow.camera.left = -10;
  sunLight.shadow.camera.right = 10;
  sunLight.shadow.camera.top = 10;
  sunLight.shadow.camera.bottom = -10;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight, sunLight.target);

  fillLight = new THREE.DirectionalLight(0xE8F0FA, 0.48);
  fillLight.position.set(14, 7, -4);
  scene.add(fillLight);

  // Build 4th-Floor (R+4) Cassiopée Ambilly Surroundings + Apartment Shell + Exact IKEA METOD Kitchen
  cassiopeeEnv = buildCassiopeeEnvironment(scene);
  apartmentShell = buildApartmentShell(scene);
  kitchenBuilder = new KitchenBuilder(scene);
  kitchenBuilder.applyAll(state.kitchen);

  movableGroup = new THREE.Group();
  movableGroup.name = 'movable-furniture';
  scene.add(movableGroup);

  fixturesGroup = new THREE.Group();
  fixturesGroup.name = 'tma-light-fixtures';
  scene.add(fixturesGroup);

  rebuildAllMovables();
  applyAllRoomPaints();
  setBuildingContextVisible(state.showBuilding);
  applyAmbillySun();

  // Direct 3D Furniture Manipulator (Click/Tap & Drag!)
  manipulator = new FurnitureManipulator({
    domElement: renderer.domElement,
    camera,
    controls,
    scene,
    movableGroup,
    getItems: () => state.items,
    onSelect: (item, clearance) => updateSelectionHUD(item, clearance),
    onTransformEnd: () => {
      snapshotForUndo();
      saveState();
      notifyRayTracerGeometryChange();
    },
    onLiveClearance: (clearance) => {
      const item = state.items.find(i => i.uid === manipulator.selectedUid);
      updateSelectionHUD(item, clearance);
    }
  });

  // Responsive ResizeObserver (safe for Galaxy Z Fold & Desktop)
  const syncSize = () => {
    const vp = document.getElementById('viewport');
    const w = Math.max(100, vp.clientWidth);
    const h = Math.max(100, vp.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (rtActive && rayTracer) rayTracer.notifyResize();
  };
  new ResizeObserver(syncSize).observe(document.getElementById('viewport'));
  syncSize();
}

function rebuildAllMovables() {
  while (movableGroup.children.length) movableGroup.remove(movableGroup.children[0]);
  for (const item of state.items) {
    movableGroup.add(buildFurnitureItemMesh(item));
  }
  if (manipulator) manipulator.updateSelectionVisual();
}

function rebuildSingleMovable(uid) {
  const old = movableGroup.children.find(m => m.userData.uid === uid);
  if (old) movableGroup.remove(old);
  const item = state.items.find(i => i.uid === uid);
  if (item) {
    const mesh = buildFurnitureItemMesh(item);
    movableGroup.add(mesh);
    if (manipulator && manipulator.selectedUid === uid) {
      manipulator.updateSelectionVisual();
      updateSelectionHUD(item, manipulator.computeClearance(item, mesh));
    }
  }
}

function rebuildLights() {
  dynamicFixtureLights = buildLightFixtures(fixturesGroup, state.roomFixtures, state.lightingMode);
}

function applyAllRoomPaints() {
  const whiteDef = DULUX_PAINTS[0];
  for (const [roomId, cfg] of Object.entries(state.roomPaints)) {
    const mats = apartmentShell.roomPaintMaterials[roomId];
    if (!mats) continue;
    const pDef = DULUX_PAINTS.find(p => p.id === cfg.paintId) || whiteDef;
    if (cfg.coverage === 'accent') {
      mats.main.color.set(whiteDef.hex);
      mats.main.roughness = whiteDef.roughness;
      mats.accent.color.set(pDef.hex);
      mats.accent.roughness = pDef.roughness;
    } else {
      mats.main.color.set(pDef.hex);
      mats.main.roughness = pDef.roughness;
      mats.accent.color.set(pDef.hex);
      mats.accent.roughness = pDef.roughness;
    }
    mats.main.needsUpdate = true;
    mats.accent.needsUpdate = true;
  }
}

function setBuildingContextVisible(visible) {
  state.showBuilding = Boolean(visible);
  if (cassiopeeEnv) cassiopeeEnv.setVisible(state.showBuilding);
  if (apartmentShell?.studioGroundPlane) apartmentShell.studioGroundPlane.visible = !state.showBuilding;
  const lbl = document.getElementById('lbl-building');
  if (lbl) lbl.textContent = state.showBuilding ? 'R+4 View ✓' : 'Studio Plinth';
  notifyRayTracerGeometryChange();
}

function applyAmbillySun() {
  const sunData = computeAmbillySun(state.sunSeason, state.sunHour);
  const prevLightingMode = state.lightingMode;

  if (state.d65Override) {
    state.lightingMode = 'daylight';
    scene.background.set('#ECECE9');
    scene.environmentIntensity = 0.62;
    hemiLight.intensity = 0.90;
    sunLight.color.set('#FFFFFF');
    sunLight.intensity = 1.35;
    sunLight.position.set(2.0, 14.0, 8.0);
    fillLight.intensity = 0.65;
    renderer.toneMappingExposure = 0.95;
  } else {
    state.lightingMode = sunData.lightsRecommendedOn ? 'evening' : 'morning';
    scene.background.copy(sunData.skyHorizon);
    scene.environmentIntensity = sunData.envIntensity;
    hemiLight.intensity = sunData.hemiIntensity;
    sunLight.color.copy(sunData.sunColor);
    sunLight.intensity = sunData.sunIntensity;
    // Place directional sun 24 m from apartment center (5.6, 1.2, 5.6) along true NOAA vector
    sunLight.position.set(
      5.6 + sunData.dir.x * 24,
      Math.max(2.2, sunData.dir.y * 24),
      5.6 + sunData.dir.z * 24
    );
    fillLight.intensity = sunData.isNight ? 0.12 : 0.42;
    renderer.toneMappingExposure = sunData.isNight ? 1.02 : 0.96;
  }

  if (cassiopeeEnv) cassiopeeEnv.updateSky(sunData);

  // Rebuild indoor lights only when crossing day <-> twilight/night threshold
  if (prevLightingMode !== state.lightingMode || !fixturesGroup.children.length) {
    rebuildLights();
  }

  // Update top-left viewport solar HUD & Lights tab readouts
  const timeStr = formatHour(state.sunHour);
  const dirLbl = compassLabel(sunData.azimuthDeg);
  const hudLine = document.getElementById('sun-hud-line');
  if (hudLine) {
    hudLine.textContent = state.d65Override
      ? `7 rue de la Fraternité · Neutral D65 Color Check`
      : `7 rue de la Fraternité · ${sunData.isNight ? '🌙' : '☀️'} ${timeStr} · ${dirLbl} (${Math.round(sunData.elevationDeg)}°)`;
  }
  const tVal = document.getElementById('sun-time-val');
  if (tVal) tVal.textContent = timeStr;
  const aVal = document.getElementById('sun-angles-val');
  if (aVal) aVal.textContent = `Az ${Math.round(sunData.azimuthDeg)}° (${dirLbl}) · Elev ${Math.round(sunData.elevationDeg)}°`;
  const srLbl = document.getElementById('sun-sunrise-lbl');
  if (srLbl) srLbl.textContent = `Sunrise ${formatHour(sunData.sunriseHour)}`;
  const ssLbl = document.getElementById('sun-sunset-lbl');
  if (ssLbl) ssLbl.textContent = `Sunset ${formatHour(sunData.sunsetHour)}`;
  const slider = document.getElementById('sun-hour-slider');
  if (slider && Number(slider.value) !== state.sunHour) slider.value = String(state.sunHour);

  if (rtActive && rayTracer) rayTracer.setLightingMode(state.lightingMode);
}

function setCeilingsVisible(visible) {
  state.showCeilings = Boolean(visible);
  apartmentShell.ceilingGroup.visible = state.showCeilings;
  document.getElementById('lbl-roof').textContent = state.showCeilings ? 'Ceilings ON' : 'Cutaway';
  notifyRayTracerGeometryChange();
}

function flyToView(viewKey) {
  state.activeView = viewKey;
  let camSpec;
  let wantCeilings = false;

  if (viewKey === 'cutaway') {
    camSpec = OVERVIEW_CAMERAS.cutaway;
    wantCeilings = false;
  } else if (viewKey === 'plan2d') {
    camSpec = OVERVIEW_CAMERAS.plan2d;
    wantCeilings = false;
  } else {
    const r = ROOMS.find(rm => rm.id === viewKey);
    if (!r) return;
    camSpec = r.camera;
    wantCeilings = true;
    // Sync room context smoothly for painting / adding items / beds!
    if (['ch3', 'ch1', 'ch2'].includes(viewKey)) state.activeBedRoom = viewKey;
    if (state.roomPaints[viewKey]) state.activePaintRoom = viewKey;
  }

  setCeilingsVisible(wantCeilings);

  camTween = {
    startPos: camera.position.clone(),
    endPos: new THREE.Vector3(...camSpec.pos),
    startTarget: controls.target.clone(),
    endTarget: new THREE.Vector3(...camSpec.target),
    t: 0
  };
  renderRoomNav();
  renderQuickAddHeader();
  renderPaintPanel();
  renderBedSection();
}

/* =========================================================================
 * 3. ON-DEMAND GPU RAY TRACING INTEGRATION
 * ========================================================================= */
function notifyRayTracerGeometryChange() {
  if (rtActive && rayTracer) rayTracer.notifyGeometryChanged();
}

function notifyRayTracerMaterialChange() {
  if (rtActive && rayTracer) rayTracer.notifyMaterialsChanged();
}

async function toggleRayTracing() {
  const btnLabel = document.getElementById('rt-btn-label');
  const sideBtn = document.getElementById('btn-sidebar-rt');
  const hud = document.getElementById('rt-hud');

  if (rtActive && rayTracer) {
    rayTracer.disable();
    rtActive = false;
    hud.classList.add('hidden');
    btnLabel.textContent = 'Ray Trace';
    sideBtn.textContent = 'Render with Ray Tracing';
    showToast('Switched to 60fps Realtime 3D');
    return;
  }

  btnLabel.textContent = 'Loading BVH…';
  sideBtn.textContent = 'Building BVH Scene…';

  try {
    const mod = await import('./raytracer.js');
    if (!rayTracer) {
      rayTracer = new mod.KitchenRayTracer({
        renderer,
        scene,
        camera,
        controls,
        lightRefs: {
          sunLight,
          fillLight,
          rimLight: hemiLight,
          underCabLights: [],
          pendantLights: dynamicFixtureLights
        },
        constants: { WALL_CAB_BOT: 1.48, BACK_WALL_Z: 3.13, LEFT_WALL_X: 0.26, CEILING_Y: 2.50 }
      });
      document.getElementById('sidebar-rt-gpu').textContent = rayTracer.gpuLabel;
    }

    // Hide selection ring & ensure ceilings match view for physically accurate GI
    const prevSel = manipulator.selectedUid;
    if (prevSel) manipulator.select(null);

    await rayTracer.enable(state.lightingMode, () => {});
    rtActive = true;
    hud.classList.remove('hidden');
    btnLabel.textContent = 'Exit RT';
    sideBtn.textContent = 'Exit Ray Tracing (Back to 60fps)';
    updateRtProfileButtons();
    showToast(`GPU Path Tracing active (${rayTracer.gpuLabel})`);
  } catch (err) {
    console.error('Ray tracing init error:', err);
    btnLabel.textContent = 'Ray Trace';
    sideBtn.textContent = 'Render with Ray Tracing';
    showToast('Ray tracing unavailable on this GPU');
  }
}

function updateRtProfileButtons() {
  if (!rayTracer) return;
  document.querySelectorAll('.rt-prof-btn').forEach(btn => {
    const active = btn.dataset.rtProf === rayTracer.profileKey;
    btn.className = `rt-prof-btn py-1 rounded-lg text-[10px] font-semibold cursor-pointer ${
      active ? 'bg-amber-400 text-amber-950' : 'bg-white/10 hover:bg-white/20 text-white'
    }`;
  });
}

/* =========================================================================
 * 4. UI RENDERING (CLEAN, RESPONSIVE, INSTANT FEEDBACK)
 * ========================================================================= */
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2400);
}

function updateSelectionHUD(item, clearance) {
  const hud = document.getElementById('selection-hud');
  const promptPill = document.getElementById('prompt-selected-pill');
  const promptName = document.getElementById('prompt-selected-name');
  if (!item) {
    hud.classList.add('hidden');
    if (promptPill) promptPill.classList.add('hidden');
    return;
  }
  hud.classList.remove('hidden');
  if (promptPill && promptName) {
    promptName.textContent = item.label || item.kind;
    promptPill.classList.remove('hidden');
  }
  document.getElementById('sel-name').textContent = item.label || item.kind;
  const clEl = document.getElementById('sel-clearance');
  if (clearance && clearance.northCm !== undefined) {
    clEl.textContent = `${clearance.roomName} · ${clearance.wCm}×${clearance.dCm}cm · N:${clearance.northCm} S:${clearance.southCm} W:${clearance.westCm} E:${clearance.eastCm}cm`;
  } else if (clearance) {
    clEl.textContent = `${clearance.wCm} × ${clearance.dCm} cm · Drag to move`;
  } else {
    clEl.textContent = 'Drag on floor to move · R to rotate';
  }

  const extBtn = document.getElementById('sel-extend');
  if (item.kind === 'diningTable') {
    const def = MOBILIFIVER_TABLES.find(t => t.id === item.modelId) || MOBILIFIVER_TABLES[0];
    const nextStep = ((item.extensionStep || 0) + 1) % 3;
    extBtn.textContent = `↔ ${Math.round(def.lengths[nextStep] * 100)} cm`;
    extBtn.classList.remove('hidden');
  } else {
    extBtn.classList.add('hidden');
  }
}

function renderRoomNav() {
  const nav = document.getElementById('room-nav');
  const entries = [
    { key: 'cutaway', label: '3D Cutaway' },
    { key: 'plan2d',  label: 'Plan 2D' },
    ...ROOMS.map(r => ({ key: r.id, label: r.shortName }))
  ];
  nav.innerHTML = entries.map(e => {
    const active = state.activeView === e.key;
    return `<button data-view="${e.key}" type="button" class="shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
      active ? 'bg-studio-ink text-white shadow-sm' : 'text-studio-ink hover:bg-black/5'
    }">${e.label}</button>`;
  }).join('');
}

function renderTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const active = btn.dataset.tab === state.activeTab;
    btn.className = `tab-btn py-1.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
      active ? 'bg-white text-studio-ink shadow-sm' : 'text-studio-muted hover:text-studio-ink'
    }`;
  });
  ['furniture', 'paint', 'kitchen', 'lights', 'prompt'].forEach(t => {
    document.getElementById(`panel-${t}`).classList.toggle('hidden', t !== state.activeTab);
  });
}

/* ---- TAB 1: FURNITURE SECTIONS ---- */
function getDiningTableItem() {
  return state.items.find(i => i.kind === 'diningTable');
}

function renderTableSection() {
  const tb = getDiningTableItem();
  if (!tb) return;
  const def = MOBILIFIVER_TABLES.find(t => t.id === tb.modelId) || MOBILIFIVER_TABLES[0];
  const step = tb.extensionStep || 0;
  const curLen = Math.round(def.lengths[step] * 100);
  const curW = Math.round(def.width * 100);
  const guests = step === 0 ? '4–6 guests' : step === 1 ? '6–8 guests' : '8–10+ guests';
  document.getElementById('table-dim-badge').textContent = `${curLen} × ${curW} cm · ${guests}`;

  document.querySelectorAll('.ext-btn').forEach(btn => {
    const s = Number(btn.dataset.ext);
    const active = s === step;
    btn.textContent = `${Math.round(def.lengths[s] * 100)} cm`;
    btn.className = `ext-btn py-1.5 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
      active ? 'bg-studio-ink text-white border-studio-ink' : 'bg-white text-studio-ink border-studio-border hover:bg-studio-subtle'
    }`;
  });

  // Table finishes (Walnut default!)
  const finEl = document.getElementById('table-finishes');
  finEl.innerHTML = def.finishes.map(fk => {
    const wf = WOOD_FINISHES[fk] || WOOD_FINISHES.walnut;
    const active = tb.finish === fk;
    return `<button data-tb-fin="${fk}" type="button" class="flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer ${
      active ? 'border-studio-ink bg-studio-subtle ring-1 ring-studio-ink' : 'border-studio-border bg-white hover:bg-studio-bg'
    }"><span class="w-3 h-3 rounded-full border border-black/15" style="background:${wf.hex}"></span>${wf.name.split(' ')[0]}</button>`;
  }).join('');

  // 6 Mobili Fiver models
  document.getElementById('table-list').innerHTML = MOBILIFIVER_TABLES.map(m => {
    const active = m.id === tb.modelId;
    return `<button data-tb-model="${m.id}" type="button" class="text-left p-2 rounded-xl border transition-all cursor-pointer ${
      active ? 'border-studio-ink bg-studio-subtle ring-1 ring-studio-ink' : 'border-studio-border bg-white hover:bg-studio-bg'
    }">
      <div class="flex items-center justify-between gap-1">
        <span class="text-[11px] font-bold text-studio-ink truncate">${m.name.replace('Mobili Fiver ', '')}</span>
        <span class="text-[9.5px] font-mono text-studio-muted">${m.priceEur}€</span>
      </div>
      <div class="text-[9.5px] text-studio-muted truncate">${Math.round(m.lengths[0] * 100)}→${Math.round(m.lengths[2] * 100)} cm · ${m.shape === 'round' ? 'Round→Oval' : 'Rect'}</div>
    </button>`;
  }).join('');
}

function getBedForRoom(roomId) {
  return state.items.find(i => i.kind === 'bed' && i.room === roomId);
}

function renderBedSection() {
  document.querySelectorAll('.bed-room-btn').forEach(btn => {
    const active = btn.dataset.bedRoom === state.activeBedRoom;
    btn.className = `bed-room-btn py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer ${
      active ? 'bg-white text-studio-ink shadow-sm' : 'text-studio-muted hover:text-studio-ink'
    }`;
  });

  const bed = getBedForRoom(state.activeBedRoom);
  const activeDef = bed ? (IKEA_BEDS.find(b => b.id === bed.modelId) || IKEA_BEDS[0]) : null;

  // Bed finishes for currently selected bedroom's bed
  const finEl = document.getElementById('bed-finishes');
  if (bed && activeDef) {
    finEl.innerHTML = activeDef.finishes.map(f => {
      const active = bed.finish === f.id;
      return `<button data-bed-fin="${f.id}" type="button" class="flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer ${
        active ? 'border-studio-ink bg-studio-subtle ring-1 ring-studio-ink' : 'border-studio-border bg-white hover:bg-studio-bg'
      }"><span class="w-3 h-3 rounded-full border border-black/15" style="background:${f.hex}"></span>${f.label}</button>`;
    }).join('');
  } else {
    finEl.innerHTML = `<span class="text-[10px] text-studio-muted">No bed in ${state.activeBedRoom.toUpperCase()} — click a model below to add a 160×200 Queen bed!</span>`;
  }

  // All 12 IKEA Queen Beds
  document.getElementById('bed-list').innerHTML = IKEA_BEDS.map(b => {
    const active = bed && bed.modelId === b.id;
    const sw = b.finishes[0]?.hex || '#D6C6AE';
    return `<button data-bed-model="${b.id}" type="button" class="text-left p-2 rounded-xl border transition-all cursor-pointer ${
      active ? 'border-studio-ink bg-studio-subtle ring-1 ring-studio-ink' : 'border-studio-border bg-white hover:bg-studio-bg'
    }">
      <div class="flex items-center justify-between gap-1">
        <span class="flex items-center gap-1.5 min-w-0">
          <span class="w-3 h-3 rounded-full border border-black/15 shrink-0" style="background:${sw}"></span>
          <span class="text-[11px] font-bold text-studio-ink truncate">${b.series}</span>
        </span>
        <span class="text-[9.5px] font-mono text-studio-muted">${b.priceEur}€</span>
      </div>
      <div class="text-[9.5px] text-studio-muted truncate mt-0.5">${Math.round(b.outerW * 100)}×${Math.round(b.outerL * 100)} cm · ${b.tag.split('·')[0].trim()}</div>
    </button>`;
  }).join('');
}

function getSofaItem() {
  return state.items.find(i => i.kind === 'sofa');
}

function renderSofaSection() {
  const sofa = getSofaItem();
  if (!sofa) return;
  const curChaise = sofa.chaise || 'none';

  document.querySelectorAll('.chaise-btn').forEach(btn => {
    const active = btn.dataset.chaise === curChaise;
    btn.className = `chaise-btn py-1 rounded-lg text-[10.5px] font-semibold cursor-pointer ${
      active ? 'bg-white text-studio-ink shadow-sm' : 'text-studio-muted hover:text-studio-ink'
    }`;
  });

  document.getElementById('sofa-fabrics').innerHTML = SOFA_FABRICS.map(f => {
    const active = sofa.fabric === f.id;
    return `<button data-sofa-fab="${f.id}" type="button" title="${f.name}" class="flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium cursor-pointer ${
      active ? 'border-studio-ink bg-studio-subtle ring-1 ring-studio-ink' : 'border-studio-border bg-white hover:bg-studio-bg'
    }"><span class="w-3 h-3 rounded-full border border-black/15" style="background:${f.hex}"></span>${f.name.split(' ')[0]}</button>`;
  }).join('');

  document.getElementById('sofa-list').innerHTML = IKEA_SOFAS.map(s => {
    const active = sofa.modelId === s.id;
    return `<button data-sofa-model="${s.id}" type="button" class="text-left p-2 rounded-xl border transition-all cursor-pointer ${
      active ? 'border-studio-ink bg-studio-subtle ring-1 ring-studio-ink' : 'border-studio-border bg-white hover:bg-studio-bg'
    }">
      <div class="flex items-center justify-between gap-1">
        <span class="text-[11px] font-bold text-studio-ink truncate">${s.name}</span>
        <span class="text-[9.5px] font-mono text-studio-muted">${s.priceEur}€</span>
      </div>
      <div class="text-[9.5px] text-studio-muted truncate">${Math.round(s.w * 100)}×${Math.round(s.d * 100)} cm · ${s.tag.split('·')[0].trim()}</div>
    </button>`;
  }).join('');
}

function renderQuickAddHeader() {
  const targetRoom = getAddTargetRoom();
  const r = ROOMS.find(rm => rm.id === targetRoom) || ROOMS[0];
  document.getElementById('add-room-badge').textContent = `→ ${r.shortName}`;
}

function getAddTargetRoom() {
  if (['ch3', 'ch1', 'ch2', 'sejour', 'entree', 'loggia'].includes(state.activeView)) return state.activeView;
  return 'sejour';
}

function renderQuickAddGrid() {
  renderQuickAddHeader();
  document.getElementById('quick-add-grid').innerHTML = QUICK_ADD_ITEMS.map(q => `
    <button data-quick-add="${q.id}" type="button" class="text-left px-2.5 py-2 rounded-xl border border-studio-border bg-studio-bg hover:bg-studio-subtle transition-all cursor-pointer">
      <div class="text-[10.5px] font-semibold text-studio-ink truncate">+ ${q.label.split('(')[0].trim()}</div>
      <div class="text-[9.5px] text-studio-muted">${Math.round(q.w * 100)} × ${Math.round(q.d * 100)} cm</div>
    </button>
  `).join('');
}

/* ---- TAB 2: DULUX VALENTINE WALL PAINT ---- */
function renderPaintPanel() {
  const paintableRooms = ['ch3', 'ch1', 'ch2', 'wc', 'sejour', 'sdb', 'entree'];
  const grid = document.getElementById('paint-room-grid');
  grid.innerHTML = paintableRooms.map(rid => {
    const r = ROOMS.find(x => x.id === rid);
    const cfg = state.roomPaints[rid];
    const pDef = DULUX_PAINTS.find(p => p.id === cfg.paintId) || DULUX_PAINTS[0];
    const active = state.activePaintRoom === rid;
    return `<button data-paint-room="${rid}" type="button" class="flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
      active ? 'border-studio-ink bg-studio-subtle ring-1 ring-studio-ink' : 'border-studio-border bg-white hover:bg-studio-bg'
    }">
      <span class="w-5 h-5 rounded-lg border border-black/15 shrink-0" style="background:${pDef.hex}"></span>
      <div class="min-w-0 leading-tight">
        <div class="text-[11px] font-bold text-studio-ink truncate">${r.shortName}</div>
        <div class="text-[9.5px] text-studio-muted truncate">${pDef.shortName}${cfg.coverage === 'accent' ? ' (Accent)' : ''}</div>
      </div>
    </button>`;
  }).join('');

  const curRoom = ROOMS.find(x => x.id === state.activePaintRoom) || ROOMS[2];
  const curCfg = state.roomPaints[state.activePaintRoom];
  document.getElementById('paint-active-room-lbl').textContent = curRoom.shortName;
  document.getElementById('paint-room-hint').textContent = curRoom.recommendedPaintHint
    ? `Suggested: ${curRoom.recommendedPaintHint}`
    : 'Original Promoteur White by default — choose any Dulux Valentine tone below.';

  document.querySelectorAll('.cov-btn').forEach(btn => {
    const active = btn.dataset.cov === curCfg.coverage;
    btn.className = `cov-btn py-1.5 rounded-lg text-[10.5px] font-bold border cursor-pointer ${
      active ? 'bg-studio-ink text-white border-studio-ink' : 'bg-white text-studio-ink border-studio-border hover:bg-studio-subtle'
    }`;
  });

  const sections = [
    { key: 'white',  title: 'Original Promoteur White & Chalk' },
    { key: 'linen',  title: 'Dulux Valentine · Light Beige & Linen (Ch. 1 & Ch. 2)' },
    { key: 'taupe',  title: 'Dulux Valentine · Light Taupe (Ch. 3 Master)' },
    { key: 'accent', title: 'Dulux Valentine · WC / Toilets & Statement Accents' }
  ];

  document.getElementById('paint-swatch-sections').innerHTML = sections.map(sec => {
    const list = DULUX_PAINTS.filter(p => p.category === sec.key);
    return `<div class="bg-white rounded-2xl border border-studio-border p-3 space-y-2">
      <div class="text-[10.5px] font-bold text-studio-ink">${sec.title}</div>
      <div class="grid grid-cols-2 gap-1.5">
        ${list.map(p => {
          const active = curCfg.paintId === p.id;
          return `<button data-paint-id="${p.id}" type="button" class="flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
            active ? 'border-studio-ink bg-studio-subtle ring-1 ring-studio-ink' : 'border-studio-border bg-white hover:bg-studio-bg'
          }">
            <span class="w-6 h-6 rounded-lg border border-black/15 shrink-0 shadow-inner" style="background:${p.hex}"></span>
            <div class="min-w-0 leading-tight">
              <div class="text-[10.5px] font-bold text-studio-ink truncate">${p.shortName}</div>
              <div class="text-[9px] text-studio-muted truncate">LRV ${p.lrv}% · ${p.brand.includes('Dulux') ? 'Dulux' : 'Origine'}</div>
            </div>
          </button>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

/* ---- TAB 3: IKEA METOD KITCHEN ---- */
function renderKitchenPanel() {
  document.getElementById('door-list').innerHTML = DOORS.map(d => {
    const active = state.kitchen.doorId === d.id;
    return `<button data-door-id="${d.id}" type="button" class="w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
      active ? 'border-studio-ink bg-studio-subtle ring-1 ring-studio-ink' : 'border-studio-border bg-white hover:bg-studio-bg'
    }">
      <span class="w-7 h-7 rounded-lg border border-black/15 shrink-0" style="background:${d.hex}"></span>
      <div class="min-w-0 flex-1 leading-tight">
        <div class="text-[11px] font-bold text-studio-ink truncate">${d.name}</div>
        <div class="text-[9.5px] text-studio-muted truncate">${d.ncs} · ${d.glossLabel} · ${d.profileLabel}</div>
      </div>
    </button>`;
  }).join('');

  document.getElementById('countertop-grid').innerHTML = COUNTERTOPS.map(c => {
    const active = state.kitchen.countertopId === c.id;
    return `<button data-ct-id="${c.id}" type="button" class="flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
      active ? 'border-studio-ink bg-studio-subtle ring-1 ring-studio-ink' : 'border-studio-border bg-white hover:bg-studio-bg'
    }">
      <span class="w-5 h-5 rounded-md border border-black/15 shrink-0" style="background:${c.baseHex}"></span>
      <div class="min-w-0 leading-tight">
        <div class="text-[10.5px] font-bold text-studio-ink truncate">${c.shortName}</div>
        <div class="text-[9px] text-studio-muted">${c.thicknessCm} cm</div>
      </div>
    </button>`;
  }).join('');

  const pinBtn = document.getElementById('btn-pin-combo');
  const swapBtn = document.getElementById('btn-swap-combo');
  if (state.kitchen.comboA) {
    pinBtn.textContent = 'Unpin A';
    swapBtn.classList.remove('hidden');
  } else {
    pinBtn.textContent = 'Pin Combo A';
    swapBtn.classList.add('hidden');
  }

  document.querySelectorAll('.cl-h-btn').forEach(b => {
    const active = b.dataset.clH === state.kitchen.claustraHeight;
    b.className = `cl-h-btn py-1.5 rounded-lg text-[10.5px] font-semibold cursor-pointer ${active ? 'bg-white text-studio-ink shadow-sm' : 'text-studio-muted'}`;
  });
  document.querySelectorAll('.cl-f-btn').forEach(b => {
    const active = b.dataset.clF === state.kitchen.claustraFinish;
    b.className = `cl-f-btn py-1.5 rounded-lg border text-[10px] font-semibold cursor-pointer ${active ? 'border-studio-ink bg-studio-subtle ring-1 ring-studio-ink' : 'border-studio-border bg-white'}`;
  });
  document.querySelectorAll('.bs-btn').forEach(b => {
    const active = b.dataset.bs === state.kitchen.backsplash;
    b.className = `bs-btn py-1 rounded-lg border text-[10px] font-semibold cursor-pointer ${active ? 'border-studio-ink bg-studio-subtle ring-1 ring-studio-ink' : 'border-studio-border bg-white'}`;
  });
  document.querySelectorAll('.hw-btn').forEach(b => {
    const active = b.dataset.hw === state.kitchen.hardware;
    b.className = `hw-btn py-1 rounded-lg border text-[10px] font-semibold cursor-pointer ${active ? 'border-studio-ink bg-studio-subtle ring-1 ring-studio-ink' : 'border-studio-border bg-white'}`;
  });
}

/* ---- TAB 4: AMBILLY R+4 SUN & TMA LIGHT FIXTURES ---- */
function renderLightsPanel() {
  const seasonGrid = document.getElementById('season-grid');
  if (seasonGrid) {
    seasonGrid.innerHTML = SEASON_PRESETS.map(s => {
      const active = state.sunSeason === s.id;
      return `<button data-sun-season="${s.id}" type="button" class="py-1.5 px-2 rounded-xl border text-[10.5px] font-semibold cursor-pointer ${
        active ? 'border-studio-ink bg-studio-subtle ring-1 ring-studio-ink text-studio-ink' : 'border-studio-border bg-white text-studio-muted hover:bg-studio-bg'
      }">${s.label}</button>`;
    }).join('');
  }
  const d65Btn = document.getElementById('btn-d65-toggle');
  if (d65Btn) {
    d65Btn.textContent = `☁️ Neutral D65: ${state.d65Override ? 'ON' : 'OFF'}`;
    d65Btn.className = `px-2.5 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer ${
      state.d65Override ? 'bg-studio-ink text-white border-studio-ink' : 'border-studio-border hover:bg-studio-subtle text-studio-ink'
    }`;
  }
  applyAmbillySun();

  const fixtureRooms = [
    { id: 'sejour', label: 'Séjour (Dining #9 & Lounge #8)' },
    { id: 'ch3',    label: 'Chambre 3 (DCL #1 + 2 Wall Sconces #2)' },
    { id: 'ch1',    label: 'Chambre 1 (Ceiling DCL)' },
    { id: 'ch2',    label: 'Chambre 2 (Ceiling DCL)' },
    { id: 'wc',     label: 'WC / Toilets (Ceiling DCL)' },
    { id: 'sdb',    label: 'Salle de Bains (IP44 Ceiling)' },
    { id: 'entree', label: 'Entrée & Dégagement' }
  ];

  document.getElementById('fixture-room-list').innerHTML = fixtureRooms.map(fr => {
    const cur = state.roomFixtures[fr.id];
    return `<div class="bg-studio-bg rounded-xl p-2 border border-studio-border space-y-1.5">
      <div class="text-[10.5px] font-bold text-studio-ink">${fr.label}</div>
      <div class="flex flex-wrap gap-1">
        ${LIGHT_FIXTURES.map(lf => {
          const active = cur === lf.id;
          return `<button data-fix-room="${fr.id}" data-fix-style="${lf.id}" type="button" class="flex items-center gap-1 px-2 py-1 rounded-lg border text-[9.5px] font-semibold cursor-pointer ${
            active ? 'border-studio-ink bg-white text-studio-ink shadow-sm' : 'border-transparent bg-white/50 text-studio-muted hover:bg-white'
          }"><span class="w-2.5 h-2.5 rounded-full border border-black/15" style="background:${lf.swatch}"></span>${lf.shortName}</button>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

/* ---- TAB 5: PHASE 2 PROMPT 3D STUDIO ---- */
function renderPromptPanel() {
  const aiCfg = loadAiConfig();
  const badge = document.getElementById('ai-mode-badge');
  if (badge) {
    badge.textContent = aiCfg.provider === 'gemini' && aiCfg.apiKey
      ? 'Phase 2 · Gemini Live'
      : aiCfg.provider === 'openai' && aiCfg.apiKey
        ? 'Phase 2 · LLM Live'
        : 'Phase 2 · Local CAD';
  }
  const provSel = document.getElementById('ai-provider');
  const keyInp = document.getElementById('ai-api-key');
  const modInp = document.getElementById('ai-model');
  if (provSel) provSel.value = aiCfg.provider || 'local';
  if (keyInp && !keyInp.value && aiCfg.apiKey) keyInp.value = aiCfg.apiKey;
  if (modInp && !modInp.value) modInp.value = aiCfg.model || 'gemini-2.5-flash';

  const examples = [
    'Arched brass floor mirror in ch3',
    'Curved bouclé lounge chair in séjour',
    'Fluted walnut sideboard 160x45x78 in séjour',
    'Dressing vanity with mirror in ch3',
    'Pair of kitchen bar stools',
    'Designer oak bookcase 120x35x200 in ch2',
    'Round marble coffee table 85cm',
    'Golden hour summer sunset',
    'Make it 30cm wider'
  ];
  document.getElementById('prompt-examples').innerHTML = examples.map(ex => `
    <button data-prompt-ex="${ex}" type="button" class="px-2 py-1 rounded-lg bg-studio-bg hover:bg-studio-subtle border border-studio-border text-[10px] font-medium text-studio-ink cursor-pointer">${ex}</button>
  `).join('');

  document.getElementById('custom-lib-count').textContent = `${state.customLibrary.length} saved`;
  const libEl = document.getElementById('custom-lib-list');
  if (!state.customLibrary.length) {
    libEl.innerHTML = `<div class="text-[10.5px] text-studio-muted py-1">No prompted components yet — try a designer prompt above or drop a .glb file!</div>`;
  } else {
    libEl.innerHTML = state.customLibrary.map((c, idx) => `
      <div class="flex items-center justify-between gap-2 p-2 rounded-xl bg-studio-bg border border-studio-border">
        <div class="min-w-0">
          <div class="text-[11px] font-bold text-studio-ink truncate">${c.label}</div>
          <div class="text-[9.5px] text-studio-muted truncate">"${c.promptSource || 'Custom 3D'}"</div>
        </div>
        <button data-respawn-idx="${idx}" type="button" class="shrink-0 px-2 py-1 rounded-lg bg-studio-ink text-white text-[10px] font-semibold cursor-pointer">+ Spawn</button>
      </div>
    `).join('');
  }
}

function renderAllUI() {
  renderRoomNav();
  renderTabs();
  renderTableSection();
  renderBedSection();
  renderSofaSection();
  renderQuickAddGrid();
  renderPaintPanel();
  renderKitchenPanel();
  renderLightsPanel();
  renderPromptPanel();
}

/* =========================================================================
 * 5. EVENT BINDING & PROMPT EXECUTION
 * ========================================================================= */
function findFreeSpotInRoom(roomId, w, d) {
  const room = ROOMS.find(r => r.id === roomId) || ROOMS[0];
  const b = room.bounds;

  const collides = (cx, cz, fw, fd) => {
    // Also avoid the U-kitchen cabinet block inside Séjour (x > 1.85 && z < 5.52)
    if (roomId === 'sejour' && (cx + fw / 2 > 1.85) && (cz - fd / 2 < 5.52)) {
      return true;
    }
    for (const it of state.items) {
      if (it.kind === 'rug') continue;
      const mesh = movableGroup.children.find(m => m.userData.uid === it.uid);
      const fp = mesh?.userData?.footprint || { w: it.w || 0.8, d: it.d || 0.8 };
      const cos = Math.abs(Math.cos(it.rotY || 0));
      const sin = Math.abs(Math.sin(it.rotY || 0));
      const iw = fp.w * cos + fp.d * sin;
      const id = fp.w * sin + fp.d * cos;
      if (Math.abs(cx - it.x) < (fw + iw) / 2 + 0.06 && Math.abs(cz - it.z) < (fd + id) / 2 + 0.06) {
        return true;
      }
    }
    return false;
  };

  // Try natural orientations (0 and 90 deg) with priority open wall spots first!
  const orientations = [
    { rotY: 0, fw: w, fd: d },
    { rotY: Math.PI / 2, fw: d, fd: w }
  ];

  // Priority clean wall spots in Séjour (open West wall near dining / South-of-halfwall)
  if (roomId === 'sejour') {
    const priority = [
      { x: b.minX + d / 2 + 0.06, z: 4.55, rotY: Math.PI / 2, fw: d, fd: w },
      { x: 4.25, z: 5.52 + d / 2 + 0.04, rotY: 0, fw: w, fd: d },
      { x: 2.30, z: b.maxZ - d / 2 - 0.08, rotY: 0, fw: w, fd: d }
    ];
    for (const p of priority) {
      if (p.x - p.fw / 2 >= b.minX && p.x + p.fw / 2 <= b.maxX && p.z - p.fd / 2 >= b.minZ && p.z + p.fd / 2 <= b.maxZ) {
        if (!collides(p.x, p.z, p.fw, p.fd)) {
          return { x: Math.round(p.x * 20) / 20, z: Math.round(p.z * 20) / 20, rotY: p.rotY };
        }
      }
    }
  }

  for (const ori of orientations) {
    const padX = ori.fw / 2 + 0.06;
    const padZ = ori.fd / 2 + 0.06;
    for (let z = b.minZ + padZ; z <= b.maxZ - padZ; z += 0.25) {
      for (let x = b.minX + padX; x <= b.maxX - padX; x += 0.25) {
        if (!collides(x, z, ori.fw, ori.fd)) {
          return { x: Math.round(x * 20) / 20, z: Math.round(z * 20) / 20, rotY: ori.rotY };
        }
      }
    }
  }

  return {
    x: Math.round(((b.minX + b.maxX) / 2) * 20) / 20,
    z: Math.round(((b.minZ + b.maxZ) / 2) * 20) / 20,
    rotY: 0
  };
}

function flyToCustomCamera(pos, target, ceilings = true) {
  setCeilingsVisible(ceilings);
  camTween = {
    startPos: camera.position.clone(),
    endPos: new THREE.Vector3(...pos),
    startTarget: controls.target.clone(),
    endTarget: new THREE.Vector3(...target),
    t: 0
  };
}

async function executePrompt(text) {
  const submitBtn = document.getElementById('btn-prompt-submit');
  const fb = document.getElementById('prompt-feedback');
  const selectedItem = state.items.find(i => i.uid === manipulator?.selectedUid) || null;
  const aiConfig = loadAiConfig();

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = aiConfig.provider !== 'local' && aiConfig.apiKey ? '✨ LLM Modelising 3D…' : '✨ Modelising…';
  }

  let res;
  try {
    res = await interpretPromptAsync(text, {
      activeRoom: getAddTargetRoom(),
      selectedItem,
      aiConfig
    });
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '✨ Modelise & Apply';
    }
  }

  fb.textContent = res.message;
  fb.classList.remove('hidden');

  if (res.type === 'noop') return;

  if (res.type === 'setSun') {
    state.d65Override = false;
    if (res.season) state.sunSeason = res.season;
    if (res.hour !== null) state.sunHour = Math.max(5.5, Math.min(22.5, res.hour));
    applyAmbillySun();
  } else if (res.type === 'editSelected') {
    const item = state.items.find(i => i.uid === res.uid);
    if (item) {
      applyLocalEditPatch(item, res.patch);
      rebuildSingleMovable(item.uid);
      manipulator.select(item.uid);
      notifyRayTracerGeometryChange();
    }
  } else if (res.type === 'replaceCustomSpec') {
    const item = state.items.find(i => i.uid === res.uid);
    if (item) {
      item.label = res.label;
      item.w = res.w; item.d = res.d; item.h = res.h;
      item.spec = res.spec;
      rebuildSingleMovable(item.uid);
      manipulator.select(item.uid);
      notifyRayTracerGeometryChange();
    }
  } else if (res.type === 'paintRoom') {
    state.roomPaints[res.roomId] = { paintId: res.paintId, coverage: res.accentOnly ? 'accent' : 'all' };
    state.activePaintRoom = res.roomId;
    applyAllRoomPaints();
    flyToView(res.roomId);
    notifyRayTracerMaterialChange();
  } else if (res.type === 'updateTable') {
    const tb = getDiningTableItem();
    if (tb) {
      if (res.modelId) tb.modelId = res.modelId;
      if (res.extensionStep !== null) tb.extensionStep = res.extensionStep;
      rebuildSingleMovable(tb.uid);
      manipulator.select(tb.uid);
      flyToView('sejour');
      notifyRayTracerGeometryChange();
    }
  } else if (res.type === 'updateBed') {
    const bed = getBedForRoom(res.roomId);
    if (bed) {
      bed.modelId = res.modelId;
      const def = IKEA_BEDS.find(b => b.id === res.modelId);
      if (def) bed.finish = def.defaultFinish;
      rebuildSingleMovable(bed.uid);
      manipulator.select(bed.uid);
      flyToView(res.roomId);
      notifyRayTracerGeometryChange();
    }
  } else if (res.type === 'updateSofa') {
    const sofa = getSofaItem();
    if (sofa) {
      sofa.modelId = res.modelId;
      rebuildSingleMovable(sofa.uid);
      manipulator.select(sofa.uid);
      flyToView('sejour');
      notifyRayTracerGeometryChange();
    }
  } else if (res.type === 'updateKitchenDoor') {
    state.kitchen.doorId = res.doorId;
    kitchenBuilder.applyDoor(res.doorId);
    flyToView('kitchen');
    notifyRayTracerGeometryChange();
  } else if (res.type === 'spawnComponent') {
    const spot = findFreeSpotInRoom(res.item.room, res.item.w, res.item.d);
    res.item.x = spot.x;
    res.item.z = spot.z;
    res.item.rotY = spot.rotY || 0;
    state.items.push(res.item);
    state.customLibrary.unshift({ label: res.item.label, promptSource: res.item.promptSource, spec: res.item.spec, w: res.item.w, d: res.item.d, h: res.item.h });
    rebuildSingleMovable(res.item.uid);
    manipulator.select(res.item.uid);
    flyToView(res.item.room);
    notifyRayTracerGeometryChange();
  }

  snapshotForUndo();
  saveState();
  renderAllUI();
  showToast(res.message);
}

function bindEvents() {
  // Top Viewport Controls
  document.getElementById('btn-roof').addEventListener('click', () => setCeilingsVisible(!state.showCeilings));
  document.getElementById('btn-building').addEventListener('click', () => {
    setBuildingContextVisible(!state.showBuilding);
    saveState();
    showToast(state.showBuilding ? '4th Floor (R+4) Ambilly context ON' : 'Clean Studio Plinth mode');
  });
  document.getElementById('btn-snap').addEventListener('click', () => {
    manipulator.snapEnabled = !manipulator.snapEnabled;
    document.getElementById('lbl-snap').textContent = manipulator.snapEnabled ? 'Snap 5cm ✓' : 'Free Drag';
    showToast(manipulator.snapEnabled ? '5 cm grid snap enabled' : 'Free smooth dragging');
  });
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);
  document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
    document.getElementById('app').classList.toggle('sidebar-collapsed');
  });
  document.getElementById('btn-raytrace').addEventListener('click', toggleRayTracing);
  document.getElementById('btn-sidebar-rt').addEventListener('click', toggleRayTracing);

  // Ray Trace HUD controls
  document.querySelectorAll('.rt-prof-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!rayTracer) return;
      rayTracer.setProfile(btn.dataset.rtProf);
      updateRtProfileButtons();
    });
  });
  document.getElementById('btn-rt-denoise').addEventListener('click', () => {
    if (!rayTracer) return;
    rayTracer.setDenoise(!rayTracer.denoiseEnabled);
    document.getElementById('btn-rt-denoise').textContent = `Denoise: ${rayTracer.denoiseEnabled ? 'ON' : 'OFF'}`;
  });
  document.getElementById('btn-rt-save').addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `cassiopee-ambilly-${Date.now()}.png`;
    a.href = renderer.domElement.toDataURL('image/png');
    a.click();
    showToast('Saved PNG render!');
  });

  // Room Nav Delegation
  document.getElementById('room-nav').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-view]');
    if (btn) flyToView(btn.dataset.view);
  });

  // Tab Bar
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeTab = btn.dataset.tab;
      renderTabs();
    });
  });

  // Floating Contextual Selection Toolbar
  const rotateSelected = (rad) => {
    const item = state.items.find(i => i.uid === manipulator.selectedUid);
    if (!item) return;
    item.rotY = (item.rotY || 0) + rad;
    const mesh = movableGroup.children.find(m => m.userData.uid === item.uid);
    if (mesh) {
      mesh.rotation.y = item.rotY;
      manipulator.updateSelectionVisual();
      updateSelectionHUD(item, manipulator.computeClearance(item, mesh));
    }
    snapshotForUndo();
    saveState();
    notifyRayTracerGeometryChange();
  };

  document.getElementById('sel-rot-90').addEventListener('click', () => rotateSelected(Math.PI / 2));
  document.getElementById('sel-rot-15').addEventListener('click', () => rotateSelected(Math.PI / 12));
  document.getElementById('sel-extend').addEventListener('click', () => {
    const item = state.items.find(i => i.uid === manipulator.selectedUid && i.kind === 'diningTable');
    if (!item) return;
    item.extensionStep = ((item.extensionStep || 0) + 1) % 3;
    rebuildSingleMovable(item.uid);
    renderTableSection();
    snapshotForUndo();
    saveState();
    notifyRayTracerGeometryChange();
  });
  document.getElementById('sel-dup').addEventListener('click', () => {
    const item = state.items.find(i => i.uid === manipulator.selectedUid);
    if (!item) return;
    const clone = JSON.parse(JSON.stringify(item));
    clone.uid = `dup-${Date.now().toString(36)}`;
    clone.x = Math.min(10.8, item.x + 0.35);
    clone.z = Math.min(10.7, item.z + 0.35);
    state.items.push(clone);
    rebuildSingleMovable(clone.uid);
    manipulator.select(clone.uid);
    snapshotForUndo();
    saveState();
    notifyRayTracerGeometryChange();
    showToast(`Duplicated ${item.label}`);
  });
  document.getElementById('sel-del').addEventListener('click', () => {
    const uid = manipulator.selectedUid;
    if (!uid) return;
    const idx = state.items.findIndex(i => i.uid === uid);
    if (idx >= 0) {
      const removed = state.items.splice(idx, 1)[0];
      manipulator.select(null);
      rebuildAllMovables();
      snapshotForUndo();
      saveState();
      renderAllUI();
      notifyRayTracerGeometryChange();
      showToast(`Removed ${removed.label}`);
    }
  });
  document.getElementById('sel-close').addEventListener('click', () => manipulator.select(null));

  // ---- TAB 1: MOBILI FIVER TABLE, IKEA BEDS, IKEA SOFAS, QUICK ADD ----
  document.getElementById('btn-focus-table').addEventListener('click', () => {
    const tb = getDiningTableItem();
    state.activeView = 'sejour';
    renderRoomNav();
    if (tb) {
      manipulator.select(tb.uid);
      flyToCustomCamera([0.45, 2.25, 8.40], [tb.x + 0.15, 0.72, tb.z - 0.15], true);
    } else {
      flyToView('sejour');
    }
  });
  document.getElementById('btn-focus-sofa').addEventListener('click', () => {
    const sf = getSofaItem();
    state.activeView = 'sejour';
    renderRoomNav();
    if (sf) {
      manipulator.select(sf.uid);
      flyToCustomCamera([2.15, 1.95, 8.42], [sf.x + 0.85, 0.72, sf.z - 0.10], true);
    } else {
      flyToView('sejour');
    }
  });

  document.getElementById('panel-furniture').addEventListener('click', (e) => {
    const extBtn = e.target.closest('[data-ext]');
    if (extBtn) {
      const tb = getDiningTableItem();
      if (!tb) return;
      tb.extensionStep = Number(extBtn.dataset.ext);
      rebuildSingleMovable(tb.uid);
      renderTableSection();
      snapshotForUndo(); saveState(); notifyRayTracerGeometryChange();
      return;
    }

    const tbFin = e.target.closest('[data-tb-fin]');
    if (tbFin) {
      const tb = getDiningTableItem();
      if (!tb) return;
      tb.finish = tbFin.dataset.tbFin;
      rebuildSingleMovable(tb.uid);
      renderTableSection();
      snapshotForUndo(); saveState(); notifyRayTracerMaterialChange();
      return;
    }

    const tbModel = e.target.closest('[data-tb-model]');
    if (tbModel) {
      const tb = getDiningTableItem();
      if (!tb) return;
      tb.modelId = tbModel.dataset.tbModel;
      rebuildSingleMovable(tb.uid);
      renderTableSection();
      snapshotForUndo(); saveState(); notifyRayTracerGeometryChange();
      return;
    }

    const bedRoomBtn = e.target.closest('[data-bed-room]');
    if (bedRoomBtn) {
      state.activeBedRoom = bedRoomBtn.dataset.bedRoom;
      renderBedSection();
      flyToView(state.activeBedRoom);
      return;
    }

    const bedFinBtn = e.target.closest('[data-bed-fin]');
    if (bedFinBtn) {
      const bed = getBedForRoom(state.activeBedRoom);
      if (!bed) return;
      bed.finish = bedFinBtn.dataset.bedFin;
      rebuildSingleMovable(bed.uid);
      renderBedSection();
      snapshotForUndo(); saveState(); notifyRayTracerMaterialChange();
      return;
    }

    const bedModelBtn = e.target.closest('[data-bed-model]');
    if (bedModelBtn) {
      const modelId = bedModelBtn.dataset.bedModel;
      const def = IKEA_BEDS.find(b => b.id === modelId);
      let bed = getBedForRoom(state.activeBedRoom);
      if (!bed) {
        const rm = ROOMS.find(r => r.id === state.activeBedRoom);
        bed = {
          uid: `bed-${state.activeBedRoom}-${Date.now().toString(36)}`,
          kind: 'bed',
          room: state.activeBedRoom,
          label: `Queen Bed (${rm.shortName})`,
          modelId,
          finish: def.defaultFinish,
          x: (rm.bounds.minX + rm.bounds.maxX) / 2,
          z: (rm.bounds.minZ + rm.bounds.maxZ) / 2,
          rotY: 0
        };
        state.items.push(bed);
      } else {
        bed.modelId = modelId;
        bed.finish = def.defaultFinish;
      }
      rebuildSingleMovable(bed.uid);
      manipulator.select(bed.uid);
      renderBedSection();
      snapshotForUndo(); saveState(); notifyRayTracerGeometryChange();
      showToast(`${state.activeBedRoom.toUpperCase()} → IKEA ${def.name}`);
      return;
    }

    const chaiseBtn = e.target.closest('[data-chaise]');
    if (chaiseBtn) {
      const sofa = getSofaItem();
      if (!sofa) return;
      sofa.chaise = chaiseBtn.dataset.chaise;
      rebuildSingleMovable(sofa.uid);
      renderSofaSection();
      snapshotForUndo(); saveState(); notifyRayTracerGeometryChange();
      return;
    }

    const sofaFab = e.target.closest('[data-sofa-fab]');
    if (sofaFab) {
      const sofa = getSofaItem();
      if (!sofa) return;
      sofa.fabric = sofaFab.dataset.sofaFab;
      rebuildSingleMovable(sofa.uid);
      renderSofaSection();
      snapshotForUndo(); saveState(); notifyRayTracerMaterialChange();
      return;
    }

    const sofaModel = e.target.closest('[data-sofa-model]');
    if (sofaModel) {
      const sofa = getSofaItem();
      if (!sofa) return;
      const def = IKEA_SOFAS.find(s => s.id === sofaModel.dataset.sofaModel);
      sofa.modelId = def.id;
      if (!def.supportsChaise) sofa.chaise = 'none';
      rebuildSingleMovable(sofa.uid);
      renderSofaSection();
      snapshotForUndo(); saveState(); notifyRayTracerGeometryChange();
      showToast(`Living Sofa → IKEA ${def.name}`);
      return;
    }

    const qBtn = e.target.closest('[data-quick-add]');
    if (qBtn) {
      const tpl = QUICK_ADD_ITEMS.find(q => q.id === qBtn.dataset.quickAdd);
      if (!tpl) return;
      const rId = getAddTargetRoom();
      const r = ROOMS.find(rm => rm.id === rId) || ROOMS[0];
      const spot = findFreeSpotInRoom(rId, tpl.w, tpl.d);
      const newItem = {
        uid: `${tpl.kind}-${Date.now().toString(36)}`,
        kind: tpl.kind,
        room: rId,
        label: tpl.label.split('(')[0].trim(),
        w: tpl.w, d: tpl.d, h: tpl.h, finish: tpl.finish,
        x: spot.x,
        z: spot.z,
        rotY: spot.rotY || 0
      };
      state.items.push(newItem);
      rebuildSingleMovable(newItem.uid);
      manipulator.select(newItem.uid);
      snapshotForUndo(); saveState(); notifyRayTracerGeometryChange();
      showToast(`Added ${newItem.label} to ${r.shortName}`);
    }
  });

  // ---- TAB 2: DULUX VALENTINE PAINTS ----
  document.getElementById('btn-paint-reset-all').addEventListener('click', () => {
    Object.keys(state.roomPaints).forEach(k => {
      state.roomPaints[k] = { paintId: 'original-white', coverage: 'all' };
    });
    applyAllRoomPaints();
    renderPaintPanel();
    snapshotForUndo(); saveState(); notifyRayTracerMaterialChange();
    showToast('All rooms reset to Original Promoteur White');
  });

  document.getElementById('btn-paint-curated').addEventListener('click', () => {
    state.roomPaints.ch3    = { paintId: 'dv-taupe-clair', coverage: 'accent' };
    state.roomPaints.ch1    = { paintId: 'dv-lin-naturel', coverage: 'all' };
    state.roomPaints.ch2    = { paintId: 'dv-beige-cachemire', coverage: 'all' };
    state.roomPaints.wc     = { paintId: 'dv-vert-sauge', coverage: 'all' };
    state.roomPaints.sejour = { paintId: 'original-white', coverage: 'all' };
    applyAllRoomPaints();
    renderPaintPanel();
    snapshotForUndo(); saveState(); notifyRayTracerMaterialChange();
    showToast('Applied Curated Dulux Mix: Taupe Ch.3 · Linen Ch.1/2 · Sage WC');
  });

  document.getElementById('panel-paint').addEventListener('click', (e) => {
    const rBtn = e.target.closest('[data-paint-room]');
    if (rBtn) {
      state.activePaintRoom = rBtn.dataset.paintRoom;
      renderPaintPanel();
      flyToView(state.activePaintRoom);
      return;
    }
    const covBtn = e.target.closest('[data-cov]');
    if (covBtn) {
      state.roomPaints[state.activePaintRoom].coverage = covBtn.dataset.cov;
      applyAllRoomPaints();
      renderPaintPanel();
      snapshotForUndo(); saveState(); notifyRayTracerMaterialChange();
      return;
    }
    const pBtn = e.target.closest('[data-paint-id]');
    if (pBtn) {
      const pid = pBtn.dataset.paintId;
      state.roomPaints[state.activePaintRoom].paintId = pid;
      applyAllRoomPaints();
      renderPaintPanel();
      snapshotForUndo(); saveState(); notifyRayTracerMaterialChange();
      const pDef = DULUX_PAINTS.find(p => p.id === pid);
      showToast(`${state.activePaintRoom.toUpperCase()} → ${pDef.name}`);
    }
  });

  // ---- TAB 3: IKEA METOD KITCHEN ----
  document.getElementById('btn-focus-kitchen').addEventListener('click', () => flyToView('kitchen'));
  document.getElementById('btn-pin-combo').addEventListener('click', () => {
    if (state.kitchen.comboA) {
      state.kitchen.comboA = null;
      showToast('Unpinned Kitchen Combo A');
    } else {
      state.kitchen.comboA = { doorId: state.kitchen.doorId, countertopId: state.kitchen.countertopId };
      showToast('Pinned Combo A — change door/top & press Space to compare!');
    }
    renderKitchenPanel();
  });
  const swapKitchenAB = () => {
    if (!state.kitchen.comboA) return;
    const prev = { doorId: state.kitchen.doorId, countertopId: state.kitchen.countertopId };
    state.kitchen.doorId = state.kitchen.comboA.doorId;
    state.kitchen.countertopId = state.kitchen.comboA.countertopId;
    state.kitchen.comboA = prev;
    kitchenBuilder.applyDoor(state.kitchen.doorId);
    kitchenBuilder.applyCountertop(state.kitchen.countertopId);
    renderKitchenPanel();
    notifyRayTracerGeometryChange();
    showToast(`Swapped → ${DOORS.find(d => d.id === state.kitchen.doorId)?.shortName}`);
  };
  document.getElementById('btn-swap-combo').addEventListener('click', swapKitchenAB);

  document.getElementById('panel-kitchen').addEventListener('click', (e) => {
    const dBtn = e.target.closest('[data-door-id]');
    if (dBtn) {
      state.kitchen.doorId = dBtn.dataset.doorId;
      kitchenBuilder.applyDoor(state.kitchen.doorId);
      renderKitchenPanel(); snapshotForUndo(); saveState(); notifyRayTracerGeometryChange();
      return;
    }
    const cBtn = e.target.closest('[data-ct-id]');
    if (cBtn) {
      state.kitchen.countertopId = cBtn.dataset.ctId;
      kitchenBuilder.applyCountertop(state.kitchen.countertopId);
      renderKitchenPanel(); snapshotForUndo(); saveState(); notifyRayTracerGeometryChange();
      return;
    }
    const clH = e.target.closest('[data-cl-h]');
    if (clH) {
      state.kitchen.claustraHeight = clH.dataset.clH;
      kitchenBuilder.applyClaustra(state.kitchen.claustraHeight, state.kitchen.claustraFinish);
      renderKitchenPanel(); snapshotForUndo(); saveState(); notifyRayTracerGeometryChange();
      return;
    }
    const clF = e.target.closest('[data-cl-f]');
    if (clF) {
      state.kitchen.claustraFinish = clF.dataset.clF;
      kitchenBuilder.applyClaustra(state.kitchen.claustraHeight, state.kitchen.claustraFinish);
      renderKitchenPanel(); snapshotForUndo(); saveState(); notifyRayTracerMaterialChange();
      return;
    }
    const bs = e.target.closest('[data-bs]');
    if (bs) {
      state.kitchen.backsplash = bs.dataset.bs;
      kitchenBuilder.applyBacksplash(state.kitchen.backsplash);
      renderKitchenPanel(); snapshotForUndo(); saveState(); notifyRayTracerMaterialChange();
      return;
    }
    const hw = e.target.closest('[data-hw]');
    if (hw) {
      state.kitchen.hardware = hw.dataset.hw;
      kitchenBuilder.applyHardware(state.kitchen.hardware);
      renderKitchenPanel(); snapshotForUndo(); saveState(); notifyRayTracerMaterialChange();
    }
  });

  // ---- TAB 4: AMBILLY R+4 SUN, TMA LIGHTS & STORAGE ----
  document.getElementById('sun-hour-slider').addEventListener('input', (e) => {
    state.d65Override = false;
    state.sunHour = parseFloat(e.target.value);
    applyAmbillySun();
    saveState();
  });

  document.getElementById('btn-sun-play').addEventListener('click', () => {
    sunPlaying = !sunPlaying;
    state.d65Override = false;
    document.getElementById('btn-sun-play').textContent = sunPlaying ? '⏸ Pause Sun' : '▶ Play Day';
  });

  document.getElementById('btn-d65-toggle').addEventListener('click', () => {
    state.d65Override = !state.d65Override;
    sunPlaying = false;
    document.getElementById('btn-sun-play').textContent = '▶ Play Day';
    renderLightsPanel();
  });

  document.getElementById('panel-lights').addEventListener('click', (e) => {
    const sBtn = e.target.closest('[data-sun-season]');
    if (sBtn) {
      state.d65Override = false;
      state.sunSeason = sBtn.dataset.sunSeason;
      renderLightsPanel();
      saveState();
      return;
    }
    const qSun = e.target.closest('[data-sun-quick]');
    if (qSun) {
      state.d65Override = false;
      sunPlaying = false;
      document.getElementById('btn-sun-play').textContent = '▶ Play Day';
      state.sunHour = parseFloat(qSun.dataset.sunQuick);
      applyAmbillySun();
      saveState();
      return;
    }
    const fBtn = e.target.closest('[data-fix-room]');
    if (fBtn) {
      state.roomFixtures[fBtn.dataset.fixRoom] = fBtn.dataset.fixStyle;
      rebuildLights();
      renderLightsPanel();
      snapshotForUndo(); saveState(); notifyRayTracerGeometryChange();
      showToast(`Updated ${fBtn.dataset.fixRoom.toUpperCase()} light fixture`);
    }
  });

  document.getElementById('btn-export-json').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cassiopee-ambilly-lot17-layout.json`;
    a.click();
    showToast('Exported apartment layout JSON');
  });

  document.getElementById('btn-reset-layout').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    state = createDefaultState();
    rebuildAllMovables();
    applyAllRoomPaints();
    kitchenBuilder.applyAll(state.kitchen);
    setBuildingContextVisible(state.showBuilding);
    applyAmbillySun();
    manipulator.select(null);
    snapshotForUndo();
    renderAllUI();
    notifyRayTracerGeometryChange();
    showToast('Reset apartment to defaults');
  });

  // ---- TAB 5: PHASE 2 PROMPT 3D STUDIO + GLB IMPORT + BYOK LLM ----
  document.getElementById('prompt-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = document.getElementById('prompt-input');
    const val = inp.value;
    inp.value = '';
    executePrompt(val);
  });

  document.getElementById('glb-file-input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast(`Loading ${file.name}…`);
      const parsed = await parseGlbFile(file);
      const rId = getAddTargetRoom();
      const spot = findFreeSpotInRoom(rId, parsed.w, parsed.d);
      const item = {
        uid: `glb-${Date.now().toString(36)}`,
        kind: 'customGlb',
        glbId: parsed.glbId,
        room: rId,
        label: file.name.replace(/\.(glb|gltf)$/i, ''),
        w: parsed.w, d: parsed.d, h: parsed.h,
        scaleFactor: 1.0,
        x: spot.x, z: spot.z, rotY: spot.rotY || 0
      };
      state.items.push(item);
      rebuildSingleMovable(item.uid);
      manipulator.select(item.uid);
      flyToView(rId);
      snapshotForUndo(); saveState(); notifyRayTracerGeometryChange();
      showToast(`Imported 3D model "${item.label}" (${Math.round(parsed.w * 100)}×${Math.round(parsed.d * 100)} cm)`);
    } catch (err) {
      console.error('GLB import error:', err);
      showToast('Could not parse .glb/.gltf file');
    }
    e.target.value = '';
  });

  document.getElementById('btn-ai-save').addEventListener('click', () => {
    const cfg = {
      provider: document.getElementById('ai-provider').value,
      apiKey: document.getElementById('ai-api-key').value.trim(),
      model: document.getElementById('ai-model').value.trim() || 'gemini-2.5-flash'
    };
    saveAiConfig(cfg);
    renderPromptPanel();
    showToast(cfg.provider === 'local' ? 'Using Built-in Designer Modeliser' : `Saved ${cfg.provider.toUpperCase()} Live 3D Engine`);
  });

  document.getElementById('panel-prompt').addEventListener('click', (e) => {
    const exBtn = e.target.closest('[data-prompt-ex]');
    if (exBtn) {
      executePrompt(exBtn.dataset.promptEx);
      return;
    }
    const spBtn = e.target.closest('[data-respawn-idx]');
    if (spBtn) {
      const tpl = state.customLibrary[Number(spBtn.dataset.respawnIdx)];
      if (!tpl) return;
      const rId = getAddTargetRoom();
      const r = ROOMS.find(rm => rm.id === rId) || ROOMS[0];
      const spot = findFreeSpotInRoom(rId, tpl.w, tpl.d);
      const item = {
        uid: `prompt-${Date.now().toString(36)}`,
        kind: 'customParametric',
        room: rId,
        label: tpl.label,
        promptSource: tpl.promptSource,
        w: tpl.w, d: tpl.d, h: tpl.h,
        x: spot.x,
        z: spot.z,
        rotY: spot.rotY || 0,
        spec: tpl.spec
      };
      state.items.push(item);
      rebuildSingleMovable(item.uid);
      manipulator.select(item.uid);
      snapshotForUndo(); saveState(); notifyRayTracerGeometryChange();
      showToast(`Spawned ${item.label} in ${r.shortName}`);
    }
  });

  // ---- KEYBOARD SHORTCUTS ----
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
    } else if (e.key.toLowerCase() === 'r' && manipulator.selectedUid) {
      e.preventDefault();
      rotateSelected(e.shiftKey ? Math.PI / 12 : Math.PI / 2);
    } else if (e.key.toLowerCase() === 'g') {
      document.getElementById('btn-snap').click();
    } else if (e.key === 'Escape') {
      manipulator.select(null);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && manipulator.selectedUid) {
      document.getElementById('sel-del').click();
    } else if (e.code === 'Space' && state.kitchen.comboA) {
      e.preventDefault();
      swapKitchenAB();
    }
  });
}

/* =========================================================================
 * 6. ANIMATION LOOP & BOOT
 * ========================================================================= */
function animate(now) {
  requestAnimationFrame(animate);

  // Smooth Ambilly Solar Timelapse when ▶ Play Day is active
  if (sunPlaying && now - lastSunAnimTs > 45) {
    lastSunAnimTs = now;
    state.sunHour += 0.08;
    if (state.sunHour > 22.5) state.sunHour = 5.5;
    applyAmbillySun();
  }

  // Smooth camera transition
  if (camTween) {
    camTween.t = Math.min(1, camTween.t + 0.065);
    const k = 1 - Math.pow(1 - camTween.t, 3); // easeOutCubic
    camera.position.lerpVectors(camTween.startPos, camTween.endPos, k);
    controls.target.lerpVectors(camTween.startTarget, camTween.endTarget, k);
    if (camTween.t >= 1) camTween = null;
    if (rtActive && rayTracer) rayTracer.notifyCameraChanged();
  }

  controls.update();

  if (rtActive && rayTracer) {
    const info = rayTracer.renderFrame();
    if (info && now - rtLastHudTs > 120) {
      rtLastHudTs = now;
      const pct = Math.min(100, Math.round((info.samples / info.targetSamples) * 100));
      document.getElementById('rt-samples-text').textContent = `${info.samples} / ${info.targetSamples}`;
      document.getElementById('rt-progress-bar').style.width = `${pct}%`;
      document.getElementById('rt-status-text').textContent = info.converged ? 'Converged ✓' : 'Path Tracing…';
    }
  } else {
    renderer.render(scene, camera);
  }
}

function boot() {
  initThree();
  snapshotForUndo();
  renderAllUI();
  bindEvents();
  requestAnimationFrame(animate);
}

boot();
