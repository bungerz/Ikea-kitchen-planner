import './styles/main.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { DOORS, DULUX_PAINTS } from './catalogs/materials.js';
import {
  ROOMS,
  OVERVIEW_CAMERAS,
  IKEA_BEDS,
  IKEA_SOFAS,
  MOBILIFIVER_TABLES,
  QUICK_ADD_ITEMS
} from './catalogs/furniture.js';
import { buildApartmentShell } from './builders/apartment.js';
import { KitchenBuilder } from './builders/kitchen.js';
import { buildFurnitureItemMesh, buildLightFixtures } from './builders/furniture3d.js';
import { parseGlbFile, hydrateGlbCache } from './builders/richComponent3d.js';
import { ArchitecturalOverlays } from './builders/overlays.js';
import { FurnitureManipulator } from './interaction/manipulator.js';
import { CameraModeController } from './interaction/cameraModes.js';
import { TapeMeasureTool } from './interaction/tapeMeasure.js';
import {
  interpretPromptAsync,
  applyLocalEditPatch,
  loadAiConfig,
  saveAiConfig
} from './promptStudio.js';
import {
  computeAmbillySun,
  formatHour,
  compassLabel
} from './environment/ambillySun.js';
import { buildCassiopeeEnvironment } from './environment/cassiopeeBuilding.js';
import { DynamicSkyIBL } from './core/ibl.js';
import { RealtimePostPipeline } from './core/postprocessing.js';
import { clearGroupAndDispose, disposeObject3D } from './core/dispose.js';
import { TOOL_MODES } from './core/toolModes.js';
import {
  STORAGE_KEY,
  createDefaultState,
  loadSavedState,
  saveState,
  mergeAndValidateState,
  serializeDesignPayload,
  loadScenarios,
  saveScenarioSlot,
  createUndoManager
} from './core/state.js';
import {
  renderAllPanels,
  renderTheme,
  renderTopBar,
  renderCameraModeButtons,
  renderScenarioButtons,
  renderLeftRailAndDrawer,
  renderModeDockAndSubbar,
  renderTableSection,
  renderBedSection,
  renderSofaSection,
  renderQuickAddGrid,
  renderPaintPanel,
  renderKitchenPanel,
  renderLightsPanel,
  renderPromptPanel,
  getAddTargetRoom
} from './ui/panels.js';
import { renderBudgetPanel } from './ui/budgetPanel.js';
import { renderContextualInspector } from './ui/inspector.js';

/* =========================================================================
 * 1. STATE, SELECTION, UNDO & ON-DEMAND RENDERING ENGINE
 * ========================================================================= */
let state = loadSavedState();
const undoMgr = createUndoManager(40);

let renderer, scene, camera, controls;
let postPipeline, skyIBL, camModes, tapeMeasure, overlays;
let apartmentShell, cassiopeeEnv, kitchenBuilder, manipulator;
let movableGroup, fixturesGroup;
let sunLight, hemiLight, fillLight;
let dynamicFixtureLights = [];
let lastDiagnostics = null;

// Unified Contextual Selection: null | { kind: 'movable', uid } | { kind: 'kitchen' } | { kind: 'wall', roomId, isAccent }
let currentSelection = null;
let currentClearance = null;
let hoveredWallRoom = null;

let sunPlaying = false;
let lastSunAnimTs = 0;
let camTween = null;
let needsRender = true;
let lastFrameTs = performance.now();

// On-Demand GPU Ray Tracer (lazy-loaded!)
let rayTracer = null;
let rtActive = false;
let rtLastHudTs = 0;

function requestRender() {
  needsRender = true;
}

function getMeasureCount() {
  return Math.floor((tapeMeasure?._linesGroup?.children?.length || 0) / 4);
}

function getDockExtra() {
  return {
    hoveredWallRoom,
    rtActive,
    measureCount: getMeasureCount()
  };
}

function refreshInspector() {
  if (currentSelection?.kind === 'movable') {
    const item = state.items.find(i => i.uid === currentSelection.uid);
    const mesh = movableGroup?.children.find(m => m.userData.uid === currentSelection.uid);
    currentClearance = item && mesh && manipulator ? manipulator.computeClearance(item, mesh) : null;
  }
  renderContextualInspector(state, currentSelection, currentClearance);
}

function updateInspectorClearanceText(clearance) {
  currentClearance = clearance;
  const subEl = document.getElementById('insp-subtitle');
  if (!subEl || !clearance) return;
  if (clearance.northCm !== undefined) {
    const snapTag = clearance.snappedWall ? ` · 🧲 ${clearance.snappedWall}` : '';
    subEl.textContent = `${clearance.roomName} · ${clearance.wCm}×${clearance.dCm} cm · N:${clearance.northCm} S:${clearance.southCm} W:${clearance.westCm} E:${clearance.eastCm}${snapTag}`;
  } else {
    subEl.textContent = `${clearance.wCm} × ${clearance.dCm} cm`;
  }
}

function setSelection(sel, clearance = null) {
  currentSelection = sel;
  currentClearance = clearance;
  renderContextualInspector(state, currentSelection, currentClearance);
}

function setToolMode(mode, { silent = false } = {}) {
  if (!TOOL_MODES[mode]) return;
  state.toolMode = mode;

  if (camModes) camModes.setToolMode(mode);
  if (manipulator) manipulator.syncToolMode(mode);
  if (tapeMeasure) {
    tapeMeasure.setActive(mode === 'measure');
  }

  // In Studio mode, hide editing drawers/selection cleanly so the scene shines
  if (mode === 'studio') {
    if (manipulator?.selectedUid) manipulator.select(null, { silent: true });
    currentSelection = null;
  } else if (mode === 'paint') {
    if (manipulator?.selectedUid) manipulator.select(null, { silent: true });
    currentSelection = null;
  } else if (mode === 'measure') {
    if (manipulator?.selectedUid) manipulator.select(null, { silent: true });
    currentSelection = null;
  }

  renderTopBar(state);
  renderLeftRailAndDrawer(state);
  renderModeDockAndSubbar(state, getDockExtra());
  refreshInspector();
  requestRender();

  if (!silent) {
    const def = TOOL_MODES[mode];
    showToast(`${def.icon} ${def.label} — ${def.hint}`);
  }
}

function openDrawer(drawerId) {
  state.openDrawer = state.openDrawer === drawerId ? null : drawerId;
  if (state.openDrawer && state.toolMode === 'studio') {
    setToolMode('navigate', { silent: true });
  }
  renderLeftRailAndDrawer(state);
  if (state.openDrawer === 'budget') {
    renderBudgetPanel(state, lastDiagnostics);
  }
}

function getFootprintForItem(item) {
  const mesh = movableGroup?.children.find(m => m.userData.uid === item.uid);
  if (mesh?.userData?.footprint) return mesh.userData.footprint;
  if (item.kind === 'bed') {
    const d = IKEA_BEDS.find(b => b.id === item.modelId) || IKEA_BEDS[0];
    return { w: d.outerW, d: d.outerL };
  }
  if (item.kind === 'sofa') {
    const d = IKEA_SOFAS.find(s => s.id === item.modelId) || IKEA_SOFAS[0];
    return { w: d.w, d: item.chaise && item.chaise !== 'none' ? d.chaiseD : d.d };
  }
  if (item.kind === 'diningTable') {
    const d = MOBILIFIVER_TABLES.find(t => t.id === item.modelId) || MOBILIFIVER_TABLES[0];
    const step = Math.max(0, Math.min(2, item.extensionStep || 0));
    return { w: d.lengths[step] + 0.56, d: d.width + 0.56 };
  }
  return { w: item.w || 0.8, d: item.d || 0.8 };
}

function refreshOverlaysAndDiagnostics() {
  if (!overlays) return;
  lastDiagnostics = overlays.updateDoorSwings(state.showDoorSwings, state.items, getFootprintForItem);
  overlays.updateTmaOverlay(state.showTmaOverlay, lastDiagnostics.occludedOutlets);
  renderTopBar(state);
  if (state.openDrawer === 'budget') {
    renderBudgetPanel(state, lastDiagnostics);
  }
  requestRender();
}

/* =========================================================================
 * 2. THREE.JS INITIALIZATION (AgX + N8AO + DYNAMIC SKY IBL + SHADOWS)
 * ========================================================================= */
function initThree() {
  const host = document.getElementById('canvas-host');
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#E6E2DA');

  skyIBL = new DynamicSkyIBL(renderer);

  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 560);
  camera.position.set(...OVERVIEW_CAMERAS.cutaway.pos);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.56;
  controls.minDistance = 0.85;
  controls.maxDistance = 72;
  controls.target.set(...OVERVIEW_CAMERAS.cutaway.target);
  controls.update();

  controls.addEventListener('start', () => { camTween = null; requestRender(); });
  controls.addEventListener('change', () => {
    requestRender();
    if (rtActive && rayTracer) rayTracer.notifyCameraChanged();
  });

  // Base Architectural Lighting with apartment-fitted shadow frustum & normalBias
  hemiLight = new THREE.HemisphereLight(0xFFFDF8, 0xCCC5BA, 0.68);
  scene.add(hemiLight);

  sunLight = new THREE.DirectionalLight(0xFFF3E2, 2.0);
  sunLight.position.set(-4.5, 11.5, 13.5);
  sunLight.target.position.set(5.6, 0.6, 5.6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 2;
  sunLight.shadow.camera.far = 42;
  sunLight.shadow.camera.left = -8.2;
  sunLight.shadow.camera.right = 8.2;
  sunLight.shadow.camera.top = 8.2;
  sunLight.shadow.camera.bottom = -8.2;
  sunLight.shadow.bias = -0.0003;
  sunLight.shadow.normalBias = 0.022;
  scene.add(sunLight, sunLight.target);

  fillLight = new THREE.DirectionalLight(0xE8F0FA, 0.42);
  fillLight.position.set(14, 7, -4);
  scene.add(fillLight);

  // Build 4th-Floor Context + Architectural Shell + Exact IKEA METOD Kitchen
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

  overlays = new ArchitecturalOverlays(scene);

  // Post-processing (N8AO Contact AO + subtle emissive Bloom + SMAA + AgX OutputPass)
  postPipeline = new RealtimePostPipeline(renderer, scene, camera);
  postPipeline.setQuality(state.postFxQuality || 'high');

  // Multi-mode Camera Controller (3D Orbit / True 2D Ortho Plan / 1.65m Walk)
  camModes = new CameraModeController({
    domElement: renderer.domElement,
    perspCamera: camera,
    controls,
    apartmentShell,
    onCameraMove: () => {
      requestRender();
      if (rtActive && rayTracer) rayTracer.notifyCameraChanged();
    },
    onModeChange: (mode) => {
      state.cameraMode = mode;
      postPipeline.setCamera(camModes.activeCamera);
      overlays.setPlanLabelsVisible(mode === 'plan2d');
      document.getElementById('walk-hint')?.classList.toggle('hidden', mode !== 'walk');
      if (mode === 'plan2d') {
        setCeilingsVisible(false);
        state.activeView = 'plan2d';
      } else if (mode === 'walk') {
        setCeilingsVisible(true);
      }
      renderCameraModeButtons(state);
      renderTopBar(state);
      requestRender();
    }
  });
  camModes.setToolMode(state.toolMode);

  // 3D Tape Measure Tool (Mode 4 / M)
  tapeMeasure = new TapeMeasureTool({
    domElement: renderer.domElement,
    getCamera: () => camModes.activeCamera,
    scene,
    onChange: (msg) => {
      renderModeDockAndSubbar(state, getDockExtra());
      requestRender();
      if (msg) showToast(msg);
    }
  });

  // Mode-Aware Direct 3D Furniture Manipulator & Paint Brush Picker
  manipulator = new FurnitureManipulator({
    domElement: renderer.domElement,
    getCamera: () => camModes.activeCamera,
    getControls: () => camModes.activeControls,
    getToolMode: () => state.toolMode,
    scene,
    movableGroup,
    getItems: () => state.items,
    isBlocked: () => camModes.mode === 'walk',
    onSelect: (item, clearance) => {
      if (item) {
        if (item.kind === 'bed' && ['ch3', 'ch1', 'ch2'].includes(item.room)) {
          state.activeBedRoom = item.room;
          renderBedSection(state);
        }
        setSelection({ kind: 'movable', uid: item.uid }, clearance);
      } else if (currentSelection?.kind === 'movable') {
        setSelection(null);
      }
      requestRender();
    },
    onSelectContext: (ctx) => {
      if (!ctx) {
        setSelection(null);
        return;
      }
      if (ctx.kind === 'wall' && state.roomPaints[ctx.roomId]) {
        state.activePaintRoom = ctx.roomId;
        renderPaintPanel(state);
        setSelection(ctx);
      } else if (ctx.kind === 'kitchen') {
        setSelection({ kind: 'kitchen' });
      }
      requestRender();
    },
    onPaintWall: (roomId) => {
      if (!state.roomPaints[roomId]) return;
      state.activePaintRoom = roomId;
      state.roomPaints[roomId] = {
        paintId: state.activeBrushPaintId,
        coverage: state.activeBrushCoverage
      };
      applyAllRoomPaints();
      renderPaintPanel(state);
      renderTopBar(state);
      if (state.openDrawer === 'budget') renderBudgetPanel(state, lastDiagnostics);
      undoMgr.snapshot(state);
      saveState(state);
      notifyRayTracerMaterialChange();
      const pDef = DULUX_PAINTS.find(p => p.id === state.activeBrushPaintId);
      const rm = ROOMS.find(r => r.id === roomId);
      showToast(`🎨 Painted ${rm?.shortName || roomId} → ${pDef?.shortName || state.activeBrushPaintId}`);
    },
    onHoverWall: (roomId) => {
      if (hoveredWallRoom !== roomId) {
        hoveredWallRoom = roomId;
        if (state.toolMode === 'paint') {
          renderModeDockAndSubbar(state, getDockExtra());
        }
      }
    },
    onTransformLive: () => {
      requestRender();
    },
    onTransformEnd: () => {
      undoMgr.snapshot(state);
      saveState(state);
      refreshOverlaysAndDiagnostics();
      notifyRayTracerGeometryChange();
    },
    onLiveClearance: (clearance) => {
      updateInspectorClearanceText(clearance);
    }
  });
  manipulator.syncToolMode(state.toolMode);

  rebuildAllMovables();
  applyAllRoomPaints();
  setBuildingContextVisible(state.showBuilding);
  setCurtainsVisible(state.showCurtains);
  setCeilingsVisible(state.showCeilings);
  applyAmbillySun();
  refreshOverlaysAndDiagnostics();

  // Responsive ResizeObserver
  const syncSize = () => {
    const vp = document.getElementById('viewport');
    const w = Math.max(100, vp.clientWidth);
    const h = Math.max(100, vp.clientHeight);
    const maxDpr = (rtActive && rayTracer) ? rayTracer.getMaxDpr() : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camModes.setAspect(w, h);
    postPipeline.setSize(w, h, dpr);
    if (rtActive && rayTracer) rayTracer.notifyResize();
    requestRender();
  };
  new ResizeObserver(syncSize).observe(document.getElementById('viewport'));
  syncSize();
}

function rebuildAllMovables() {
  clearGroupAndDispose(movableGroup);
  for (const item of state.items) {
    movableGroup.add(buildFurnitureItemMesh(item));
  }
  if (manipulator) manipulator.updateSelectionVisual();
  requestRender();
}

function rebuildSingleMovable(uid) {
  const old = movableGroup.children.find(m => m.userData.uid === uid);
  if (old) {
    movableGroup.remove(old);
    disposeObject3D(old);
  }
  const item = state.items.find(i => i.uid === uid);
  if (item) {
    const mesh = buildFurnitureItemMesh(item);
    movableGroup.add(mesh);
    if (manipulator && manipulator.selectedUid === uid) {
      manipulator.updateSelectionVisual();
      currentClearance = manipulator.computeClearance(item, mesh);
      renderContextualInspector(state, currentSelection, currentClearance);
    }
  }
  refreshOverlaysAndDiagnostics();
  requestRender();
}

function rebuildLights() {
  dynamicFixtureLights = buildLightFixtures(fixturesGroup, state.roomFixtures, state.lightingMode);
  requestRender();
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
  requestRender();
}

function setBuildingContextVisible(visible) {
  state.showBuilding = Boolean(visible);
  if (cassiopeeEnv) cassiopeeEnv.setVisible(state.showBuilding);
  if (apartmentShell?.studioGroundPlane) apartmentShell.studioGroundPlane.visible = !state.showBuilding;
  const lbl = document.getElementById('lbl-building');
  if (lbl) lbl.textContent = state.showBuilding ? 'ON' : 'Plinth';
  notifyRayTracerGeometryChange();
  requestRender();
}

function setCurtainsVisible(visible) {
  state.showCurtains = Boolean(visible);
  if (apartmentShell?.curtainGroup) apartmentShell.curtainGroup.visible = state.showCurtains;
  const lbl = document.getElementById('lbl-curtains');
  if (lbl) lbl.textContent = state.showCurtains ? 'ON' : 'OFF';
  notifyRayTracerGeometryChange();
  requestRender();
}

function setCeilingsVisible(visible) {
  state.showCeilings = Boolean(visible);
  if (apartmentShell?.ceilingGroup) apartmentShell.ceilingGroup.visible = state.showCeilings;
  if (cassiopeeEnv?.setUpperFloorsVisible) cassiopeeEnv.setUpperFloorsVisible(state.showCeilings);
  const lbl = document.getElementById('lbl-roof');
  if (lbl) lbl.textContent = state.showCeilings ? 'ON' : 'Cutaway';
  notifyRayTracerGeometryChange();
  requestRender();
}

function applyAmbillySun() {
  const sunData = computeAmbillySun(state.sunSeason, state.sunHour);
  const prevLightingMode = state.lightingMode;

  if (state.d65Override) {
    state.lightingMode = 'daylight';
    scene.background = new THREE.Color('#ECECE9');
    scene.environmentIntensity = 0.65;
    hemiLight.intensity = 0.85;
    sunLight.color.set('#FFFFFF');
    sunLight.intensity = 1.45;
    sunLight.position.set(2.0, 14.0, 8.0);
    fillLight.intensity = 0.55;
    renderer.toneMappingExposure = 1.00;
  } else {
    state.lightingMode = sunData.lightsRecommendedOn ? 'evening' : 'morning';
    scene.background = sunData.skyHorizon.clone();
    scene.environmentIntensity = sunData.envIntensity * 1.15;
    hemiLight.intensity = sunData.hemiIntensity;
    sunLight.color.copy(sunData.sunColor);
    sunLight.intensity = sunData.sunIntensity * 1.08;
    sunLight.position.set(
      5.6 + sunData.dir.x * 24,
      Math.max(2.2, sunData.dir.y * 24),
      5.6 + sunData.dir.z * 24
    );
    fillLight.intensity = sunData.isNight ? 0.14 : 0.38;
    renderer.toneMappingExposure = sunData.isNight ? 1.08 : 1.02;
  }

  // Update dynamic sky-synced IBL reflections (when not in RT mode)
  if (!rtActive && skyIBL) {
    scene.environment = skyIBL.update(sunData, state.d65Override);
  }

  if (cassiopeeEnv) cassiopeeEnv.updateSky(sunData);

  if (prevLightingMode !== state.lightingMode || !fixturesGroup.children.length) {
    rebuildLights();
  }

  const timeStr = formatHour(state.sunHour);
  const dirLbl = compassLabel(sunData.azimuthDeg);
  const tVal = document.getElementById('sun-time-val');
  if (tVal) tVal.textContent = timeStr;
  const subTime = document.getElementById('sub-sun-time');
  if (subTime) subTime.textContent = timeStr;
  const subSlider = document.getElementById('sub-sun-slider');
  if (subSlider && Number(subSlider.value) !== state.sunHour) subSlider.value = String(state.sunHour);
  const aVal = document.getElementById('sun-angles-val');
  if (aVal) aVal.textContent = `Az ${Math.round(sunData.azimuthDeg)}° (${dirLbl}) · Elev ${Math.round(sunData.elevationDeg)}°`;
  const srLbl = document.getElementById('sun-sunrise-lbl');
  if (srLbl) srLbl.textContent = `Sunrise ${formatHour(sunData.sunriseHour)}`;
  const ssLbl = document.getElementById('sun-sunset-lbl');
  if (ssLbl) ssLbl.textContent = `Sunset ${formatHour(sunData.sunsetHour)}`;
  const slider = document.getElementById('sun-hour-slider');
  if (slider && Number(slider.value) !== state.sunHour) slider.value = String(state.sunHour);

  if (rtActive && rayTracer) rayTracer.syncAmbillySun(sunData, state.d65Override);
  requestRender();
}

function flyToView(viewKey) {
  state.activeView = viewKey;
  if (viewKey === 'plan2d') {
    camTween = null;
    if (rtActive) toggleRayTracing();
    camModes.setMode('plan2d');
    renderTopBar(state);
    return;
  }

  if (camModes.mode !== 'orbit') {
    camModes.setMode('orbit');
  }

  let camSpec;
  let wantCeilings = false;

  if (viewKey === 'cutaway') {
    camSpec = OVERVIEW_CAMERAS.cutaway;
    wantCeilings = false;
  } else {
    const r = ROOMS.find(rm => rm.id === viewKey);
    if (!r) return;
    camSpec = r.camera;
    wantCeilings = true;
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
  renderTopBar(state);
  renderQuickAddGrid(state);
  renderPaintPanel(state);
  renderBedSection(state);
  requestRender();
}

function flyToCustomCamera(pos, target, ceilings = true) {
  if (camModes.mode !== 'orbit') camModes.setMode('orbit');
  setCeilingsVisible(ceilings);
  camTween = {
    startPos: camera.position.clone(),
    endPos: new THREE.Vector3(...pos),
    startTarget: controls.target.clone(),
    endTarget: new THREE.Vector3(...target),
    t: 0
  };
  requestRender();
}

/* =========================================================================
 * 3. UNDO / REDO / SCENARIOS / FULL STATE APPLY
 * ========================================================================= */
function applyFullDesignPayload(parsed) {
  state.roomPaints = parsed.roomPaints || state.roomPaints;
  state.roomFixtures = parsed.roomFixtures || state.roomFixtures;
  state.kitchen = parsed.kitchen || state.kitchen;
  state.items = parsed.items || state.items;
  if (Array.isArray(parsed.customLibrary)) state.customLibrary = parsed.customLibrary;
  if (typeof parsed.sunSeason === 'string') state.sunSeason = parsed.sunSeason;
  if (typeof parsed.sunHour === 'number') state.sunHour = parsed.sunHour;
  if (parsed.theme === 'light' || parsed.theme === 'dark') state.theme = parsed.theme;

  rebuildAllMovables();
  applyAllRoomPaints();
  kitchenBuilder.applyAll(state.kitchen);
  rebuildLights();
  applyAmbillySun();
  refreshOverlaysAndDiagnostics();
  saveState(state);
  renderAllPanels(state, lastDiagnostics, getDockExtra());
  refreshInspector();
  notifyRayTracerGeometryChange();
}

function undo() {
  const prev = undoMgr.undo();
  if (!prev) { showToast('Nothing to undo'); return; }
  applyFullDesignPayload(prev);
  showToast('Undone');
}

function redo() {
  const next = undoMgr.redo();
  if (!next) { showToast('Nothing to redo'); return; }
  applyFullDesignPayload(next);
  showToast('Redone');
}

/* =========================================================================
 * 4. ON-DEMAND PHOTO RENDER (OVERHAULED WEBGL2 GPU PATH TRACER)
 * ========================================================================= */
function notifyRayTracerGeometryChange() {
  if (rtActive && rayTracer) rayTracer.notifyGeometryChanged();
}

function notifyRayTracerMaterialChange() {
  if (rtActive && rayTracer) rayTracer.notifyMaterialsChanged();
}

async function renderAndSavePhoto() {
  if (!rtActive || !rayTracer) return saveViewportPng();
  const btn = document.getElementById('btn-rt-photo');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Rendering photo…'; }
  showToast('Rendering high-res photo… keep the camera still');
  try {
    await rayTracer.renderPhoto();
    saveViewportPng();
  } catch (err) {
    showToast(`Photo cancelled: ${err?.message || err}`);
  } finally {
    rayTracer.endPhoto();
    if (btn) { btn.disabled = false; btn.textContent = '📸 Render & Save Photo'; }
    requestRender();
  }
}

function saveViewportPng() {
  const a = document.createElement('a');
  a.download = `cassiopee-ambilly-render-${Date.now()}.png`;
  a.href = renderer.domElement.toDataURL('image/png');
  a.click();
  showToast('Saved high-res PNG render!');
}

async function toggleRayTracing() {
  const hud = document.getElementById('rt-hud');
  const launchBtn = document.getElementById('sub-launch-rt');

  if (rtActive && rayTracer) {
    rayTracer.disable();
    rtActive = false;
    hud.classList.add('hidden');
    renderModeDockAndSubbar(state, getDockExtra());
    applyAmbillySun();
    showToast('Returned to 60fps Realtime PBR + N8AO');
    return;
  }

  // Ensure Perspective camera for Path Tracing
  if (camModes.mode === 'plan2d') camModes.setMode('orbit');
  if (launchBtn) launchBtn.textContent = '⏳ Building BVH…';

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
      window.__rt = rayTracer;
    }

    rayTracer.lightRefs.pendantLights = dynamicFixtureLights;
    if (manipulator.selectedUid) manipulator.select(null);
    setSelection(null);

    const sunData = computeAmbillySun(state.sunSeason, state.sunHour);
    await rayTracer.enable({ sunData, d65Override: state.d65Override }, () => {});
    rtActive = true;
    hud.classList.remove('hidden');
    renderModeDockAndSubbar(state, getDockExtra());
    updateRtHudControls();
    requestRender();
    showToast(`Photo Path Tracing active (${rayTracer.gpuLabel} · ${rayTracer.profileKey.toUpperCase()})`);
  } catch (err) {
    console.error('Ray tracing init error:', err);
    renderModeDockAndSubbar(state, getDockExtra());
    showToast(`Ray tracing failed: ${err?.message || err}`);
  }
}

function updateRtHudControls() {
  if (!rayTracer) return;
  document.querySelectorAll('.rt-prof-btn').forEach(btn => {
    const active = btn.dataset.rtProf === rayTracer.profileKey;
    btn.className = `rt-prof-btn py-1 rounded-lg text-[10px] font-semibold cursor-pointer ${
      active ? 'bg-amber-400 text-amber-950' : 'bg-white/10 hover:bg-white/20 text-white'
    }`;
  });
  const dLabels = { off: 'Off', ai: 'AI' };
  document.getElementById('btn-rt-denoise').textContent = `Denoise: ${dLabels[rayTracer.denoiseMode]}`;
  const lLabels = { auto: 'Auto', on: 'ON', off: 'OFF' };
  document.getElementById('btn-rt-lamps').textContent = `Lamps: ${lLabels[rayTracer.lampsMode]}`;
  document.getElementById('rt-ev-slider').value = String(rayTracer.exposureEv);
  document.getElementById('rt-ev-val').textContent = `${rayTracer.exposureEv >= 0 ? '+' : ''}${rayTracer.exposureEv.toFixed(1)} EV`;
}

/* =========================================================================
 * 5. TOAST, ITEM ACTIONS & PROMPT EXECUTION
 * ========================================================================= */
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2400);
}

function rotateSelected(rad) {
  const item = state.items.find(i => i.uid === manipulator.selectedUid);
  if (!item) return;
  item.rotY = (item.rotY || 0) + rad;
  const mesh = movableGroup.children.find(m => m.userData.uid === item.uid);
  if (mesh) {
    mesh.rotation.y = item.rotY;
    manipulator.updateSelectionVisual();
    updateInspectorClearanceText(manipulator.computeClearance(item, mesh));
  }
  undoMgr.snapshot(state);
  saveState(state);
  refreshOverlaysAndDiagnostics();
  notifyRayTracerGeometryChange();
}

function duplicateSelected() {
  const item = state.items.find(i => i.uid === manipulator.selectedUid);
  if (!item) return;
  const clone = JSON.parse(JSON.stringify(item));
  clone.uid = `dup-${Date.now().toString(36)}`;
  clone.x = Math.min(10.8, item.x + 0.35);
  clone.z = Math.min(10.7, item.z + 0.35);
  state.items.push(clone);
  rebuildSingleMovable(clone.uid);
  manipulator.select(clone.uid);
  undoMgr.snapshot(state);
  saveState(state);
  notifyRayTracerGeometryChange();
  showToast(`Duplicated ${item.label}`);
}

function deleteSelected() {
  const uid = manipulator.selectedUid;
  if (!uid) return;
  const idx = state.items.findIndex(i => i.uid === uid);
  if (idx >= 0) {
    const removed = state.items.splice(idx, 1)[0];
    manipulator.select(null);
    setSelection(null);
    rebuildAllMovables();
    undoMgr.snapshot(state);
    saveState(state);
    refreshOverlaysAndDiagnostics();
    renderAllPanels(state, lastDiagnostics, getDockExtra());
    notifyRayTracerGeometryChange();
    showToast(`Removed ${removed.label}`);
  }
}

function findFreeSpotInRoom(roomId, w, d) {
  const room = ROOMS.find(r => r.id === roomId) || ROOMS[0];
  const b = room.bounds;

  const collides = (cx, cz, fw, fd) => {
    if (roomId === 'sejour' && (cx + fw / 2 > 1.85) && (cz - fd / 2 < 5.52)) return true;
    for (const it of state.items) {
      if (it.kind === 'rug') continue;
      const fp = getFootprintForItem(it);
      const cos = Math.abs(Math.cos(it.rotY || 0));
      const sin = Math.abs(Math.sin(it.rotY || 0));
      const iw = fp.w * cos + fp.d * sin;
      const id = fp.w * sin + fp.d * cos;
      if (Math.abs(cx - it.x) < (fw + iw) / 2 + 0.06 && Math.abs(cz - it.z) < (fd + id) / 2 + 0.06) return true;
    }
    return false;
  };

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

  for (const ori of [{ rotY: 0, fw: w, fd: d }, { rotY: Math.PI / 2, fw: d, fd: w }]) {
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
  return { x: Math.round(((b.minX + b.maxX) / 2) * 20) / 20, z: Math.round(((b.minZ + b.maxZ) / 2) * 20) / 20, rotY: 0 };
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
    res = await interpretPromptAsync(text, { activeRoom: getAddTargetRoom(state), selectedItem, aiConfig });
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '✨ Modelise & Apply';
    }
  }

  if (fb) {
    fb.textContent = res.message;
    fb.classList.remove('hidden');
  }
  if (res.type === 'noop') {
    showToast(res.message);
    return;
  }

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
    const tb = state.items.find(i => i.kind === 'diningTable');
    if (tb) {
      if (res.modelId) tb.modelId = res.modelId;
      if (res.extensionStep !== null) tb.extensionStep = res.extensionStep;
      rebuildSingleMovable(tb.uid);
      manipulator.select(tb.uid);
      flyToView('sejour');
      notifyRayTracerGeometryChange();
    }
  } else if (res.type === 'updateBed') {
    const bed = state.items.find(i => i.kind === 'bed' && i.room === res.roomId);
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
    const sofa = state.items.find(i => i.kind === 'sofa');
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

  undoMgr.snapshot(state);
  saveState(state);
  renderAllPanels(state, lastDiagnostics, getDockExtra());
  refreshInspector();
  showToast(res.message);
}

/* =========================================================================
 * 6. SHARED MATERIAL / FURNITURE MUTATION HELPERS (DRAWER + INSPECTOR)
 * ========================================================================= */
function applyKitchenAction(target) {
  const dBtn = target.closest('[data-door-id]');
  if (dBtn) {
    state.kitchen.doorId = dBtn.dataset.doorId;
    kitchenBuilder.applyDoor(state.kitchen.doorId);
    renderKitchenPanel(state);
    refreshInspector();
    renderTopBar(state);
    undoMgr.snapshot(state); saveState(state); notifyRayTracerGeometryChange(); requestRender();
    return true;
  }
  const cBtn = target.closest('[data-ct-id]');
  if (cBtn) {
    state.kitchen.countertopId = cBtn.dataset.ctId;
    kitchenBuilder.applyCountertop(state.kitchen.countertopId);
    renderKitchenPanel(state);
    refreshInspector();
    renderTopBar(state);
    undoMgr.snapshot(state); saveState(state); notifyRayTracerGeometryChange(); requestRender();
    return true;
  }
  const clH = target.closest('[data-cl-h]');
  if (clH) {
    state.kitchen.claustraHeight = clH.dataset.clH;
    kitchenBuilder.applyClaustra(state.kitchen.claustraHeight, state.kitchen.claustraFinish);
    renderKitchenPanel(state);
    refreshInspector();
    renderTopBar(state);
    undoMgr.snapshot(state); saveState(state); notifyRayTracerGeometryChange(); requestRender();
    return true;
  }
  const clF = target.closest('[data-cl-f]');
  if (clF) {
    state.kitchen.claustraFinish = clF.dataset.clF;
    kitchenBuilder.applyClaustra(state.kitchen.claustraHeight, state.kitchen.claustraFinish);
    renderKitchenPanel(state);
    refreshInspector();
    undoMgr.snapshot(state); saveState(state); notifyRayTracerMaterialChange(); requestRender();
    return true;
  }
  const bs = target.closest('[data-bs]');
  if (bs) {
    state.kitchen.backsplash = bs.dataset.bs;
    kitchenBuilder.applyBacksplash(state.kitchen.backsplash);
    renderKitchenPanel(state);
    refreshInspector();
    undoMgr.snapshot(state); saveState(state); notifyRayTracerMaterialChange(); requestRender();
    return true;
  }
  const hw = target.closest('[data-hw]');
  if (hw) {
    state.kitchen.hardware = hw.dataset.hw;
    kitchenBuilder.applyHardware(state.kitchen.hardware);
    renderKitchenPanel(state);
    refreshInspector();
    undoMgr.snapshot(state); saveState(state); notifyRayTracerMaterialChange(); requestRender();
    return true;
  }
  return false;
}

function applySofaOrTableAction(target) {
  const extBtn = target.closest('[data-ext]');
  if (extBtn) {
    const tb = state.items.find(i => i.kind === 'diningTable');
    if (!tb) return true;
    tb.extensionStep = Number(extBtn.dataset.ext);
    rebuildSingleMovable(tb.uid);
    renderTableSection(state);
    refreshInspector();
    undoMgr.snapshot(state); saveState(state); notifyRayTracerGeometryChange();
    return true;
  }
  const tbFin = target.closest('[data-tb-fin]');
  if (tbFin) {
    const tb = state.items.find(i => i.kind === 'diningTable');
    if (!tb) return true;
    tb.finish = tbFin.dataset.tbFin;
    rebuildSingleMovable(tb.uid);
    renderTableSection(state);
    refreshInspector();
    undoMgr.snapshot(state); saveState(state); notifyRayTracerMaterialChange();
    return true;
  }
  const tbModel = target.closest('[data-tb-model]');
  if (tbModel) {
    const tb = state.items.find(i => i.kind === 'diningTable');
    if (!tb) return true;
    tb.modelId = tbModel.dataset.tbModel;
    rebuildSingleMovable(tb.uid);
    renderTableSection(state);
    refreshInspector();
    undoMgr.snapshot(state); saveState(state); notifyRayTracerGeometryChange();
    return true;
  }
  const chaiseBtn = target.closest('[data-chaise]');
  if (chaiseBtn) {
    const sofa = state.items.find(i => i.kind === 'sofa');
    if (!sofa) return true;
    sofa.chaise = chaiseBtn.dataset.chaise;
    rebuildSingleMovable(sofa.uid);
    renderSofaSection(state);
    refreshInspector();
    undoMgr.snapshot(state); saveState(state); notifyRayTracerGeometryChange();
    return true;
  }
  const sofaFab = target.closest('[data-sofa-fab]');
  if (sofaFab) {
    const sofa = state.items.find(i => i.kind === 'sofa');
    if (!sofa) return true;
    sofa.fabric = sofaFab.dataset.sofaFab;
    rebuildSingleMovable(sofa.uid);
    renderSofaSection(state);
    refreshInspector();
    undoMgr.snapshot(state); saveState(state); notifyRayTracerMaterialChange();
    return true;
  }
  const sofaModel = target.closest('[data-sofa-model]');
  if (sofaModel) {
    const sofa = state.items.find(i => i.kind === 'sofa');
    if (!sofa) return true;
    const def = IKEA_SOFAS.find(s => s.id === sofaModel.dataset.sofaModel);
    if (!def) return true;
    sofa.modelId = def.id;
    if (!def.supportsChaise) sofa.chaise = 'none';
    rebuildSingleMovable(sofa.uid);
    renderSofaSection(state);
    refreshInspector();
    undoMgr.snapshot(state); saveState(state); notifyRayTracerGeometryChange();
    showToast(`Living Sofa → IKEA ${def.name}`);
    return true;
  }
  return false;
}

/* =========================================================================
 * 7. EVENT BINDING
 * ========================================================================= */
function bindEvents() {
  // ---- TOP HEADER BAR ----
  document.getElementById('room-jump-select').addEventListener('change', (e) => {
    flyToView(e.target.value);
  });

  document.querySelectorAll('.cam-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (rtActive && btn.dataset.camMode === 'plan2d') toggleRayTracing();
      camModes.setMode(btn.dataset.camMode);
      showToast(
        btn.dataset.camMode === 'plan2d'
          ? 'True 2D Orthographic Blueprint mode'
          : btn.dataset.camMode === 'walk'
            ? 'Eye-Level Walkthrough (1.65 m) — use WASD + drag to look'
            : '3D Orbit mode'
      );
    });
  });

  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);

  document.querySelectorAll('.scenario-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const slot = btn.dataset.scenario;
      const all = loadScenarios();
      if (all[slot]?.payload && slot !== state.activeScenario) {
        state.activeScenario = slot;
        applyFullDesignPayload(mergeAndValidateState(all[slot].payload));
        undoMgr.snapshot(state);
        renderScenarioButtons(state);
        showToast(`Loaded Scenario ${slot}`);
      } else {
        state.activeScenario = slot;
        saveScenarioSlot(slot, state);
        renderScenarioButtons(state);
        showToast(`Saved current design to Scenario ${slot}`);
      }
    });
  });

  document.getElementById('top-budget-pill').addEventListener('click', () => openDrawer('budget'));

  document.getElementById('btn-theme').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    renderTheme(state);
    saveState(state);
    showToast(state.theme === 'dark' ? '🌙 Dark ArchViz Obsidian Studio' : '☀️ Warm Alabaster Light Studio');
  });

  const shortcutsModal = document.getElementById('shortcuts-modal');
  document.getElementById('btn-shortcuts').addEventListener('click', () => {
    shortcutsModal.classList.toggle('hidden');
  });
  document.getElementById('btn-close-shortcuts').addEventListener('click', () => {
    shortcutsModal.classList.add('hidden');
  });
  shortcutsModal.addEventListener('click', (e) => {
    if (e.target === shortcutsModal) shortcutsModal.classList.add('hidden');
  });

  // ---- LAYERS & DISPLAY OVERLAYS POPOVER ----
  document.getElementById('btn-roof').addEventListener('click', () => setCeilingsVisible(!state.showCeilings));
  document.getElementById('btn-building').addEventListener('click', () => {
    setBuildingContextVisible(!state.showBuilding);
    saveState(state);
    showToast(state.showBuilding ? '4th Floor (R+4) Ambilly view ON' : 'Studio Plinth mode');
  });
  document.getElementById('btn-curtains').addEventListener('click', () => {
    setCurtainsVisible(!state.showCurtains);
    saveState(state);
  });
  document.getElementById('btn-autowalls').addEventListener('click', () => {
    state.autoHideWalls = !state.autoHideWalls;
    camModes.setAutoHideWalls(state.autoHideWalls);
    document.getElementById('lbl-autowalls').textContent = state.autoHideWalls ? 'ON' : 'OFF';
    requestRender();
    showToast(state.autoHideWalls ? 'Auto-Hide exterior walls ON' : 'Auto-Hide exterior walls OFF');
  });
  document.getElementById('btn-door-swings').addEventListener('click', () => {
    state.showDoorSwings = !state.showDoorSwings;
    document.getElementById('lbl-door-swings').textContent = state.showDoorSwings ? 'ON' : 'OFF';
    refreshOverlaysAndDiagnostics();
    showToast(state.showDoorSwings ? 'Door & Appliance Swing Overlay ON' : 'Door Swings OFF');
  });
  document.getElementById('btn-tma-overlay').addEventListener('click', () => {
    state.showTmaOverlay = !state.showTmaOverlay;
    document.getElementById('lbl-tma-overlay').textContent = state.showTmaOverlay ? 'ON' : 'OFF';
    refreshOverlaysAndDiagnostics();
    showToast(state.showTmaOverlay ? 'TMA Electrical & Plumbing Plan ON' : 'TMA Overlay OFF');
  });
  document.getElementById('btn-snap').addEventListener('click', () => {
    manipulator.snapEnabled = !manipulator.snapEnabled;
    manipulator.wallSnapEnabled = manipulator.snapEnabled;
    document.getElementById('lbl-snap').textContent = manipulator.snapEnabled ? 'ON' : 'OFF';
    showToast(manipulator.snapEnabled ? '5 cm Grid & Magnetic Wall Snap ON' : 'Free Dragging ON');
  });
  document.getElementById('btn-postfx').addEventListener('click', () => {
    const order = ['high', 'fast', 'off'];
    const next = order[(order.indexOf(state.postFxQuality) + 1) % order.length];
    state.postFxQuality = next;
    postPipeline.setQuality(next);
    document.getElementById('lbl-postfx').textContent = next.toUpperCase();
    requestRender();
    showToast(`Realtime AO & Bloom FX: ${next.toUpperCase()}`);
  });

  // ---- LEFT ICON RAIL & LIBRARY DRAWER ----
  document.getElementById('left-rail').addEventListener('click', (e) => {
    const btn = e.target.closest('.rail-btn');
    if (btn?.dataset.drawer) openDrawer(btn.dataset.drawer);
  });
  document.getElementById('btn-close-drawer').addEventListener('click', () => {
    state.openDrawer = null;
    renderLeftRailAndDrawer(state);
  });

  // ---- BOTTOM 5-MODE DOCK & CONTEXTUAL SUB-BAR ----
  document.getElementById('mode-dock').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tool-mode]');
    if (btn?.dataset.toolMode) setToolMode(btn.dataset.toolMode);
  });

  const subbar = document.getElementById('mode-subbar');
  subbar.addEventListener('click', (e) => {
    const paintBtn = e.target.closest('[data-brush-paint]');
    if (paintBtn) {
      state.activeBrushPaintId = paintBtn.dataset.brushPaint;
      renderModeDockAndSubbar(state, getDockExtra());
      return;
    }
    const covBtn = e.target.closest('[data-brush-cov]');
    if (covBtn) {
      state.activeBrushCoverage = covBtn.dataset.brushCov;
      renderModeDockAndSubbar(state, getDockExtra());
      return;
    }
    if (e.target.closest('#sub-measure-clear')) {
      tapeMeasure.clearAll();
      showToast('Cleared measurements');
      return;
    }
    if (e.target.closest('#sub-photo-grid')) {
      state.showPhotoGrid = !state.showPhotoGrid;
      renderModeDockAndSubbar(state, getDockExtra());
      return;
    }
    if (e.target.closest('#sub-launch-rt')) {
      toggleRayTracing();
      return;
    }
    if (e.target.closest('#sub-snap-png')) {
      if (rtActive) renderAndSavePhoto(); else saveViewportPng();
    }
  });
  subbar.addEventListener('input', (e) => {
    if (e.target.id === 'sub-sun-slider') {
      state.d65Override = false;
      state.sunHour = parseFloat(e.target.value);
      applyAmbillySun();
      saveState(state);
    }
  });

  // ---- RIGHT FLOATING CONTEXTUAL INSPECTOR ----
  document.getElementById('btn-close-inspector').addEventListener('click', () => {
    manipulator.select(null);
    setSelection(null);
  });

  const inspBody = document.getElementById('insp-body');
  inspBody.addEventListener('click', (e) => {
    if (e.target.closest('#insp-move-btn')) {
      const next = state.toolMode === 'arrange' ? 'navigate' : 'arrange';
      setToolMode(next);
      return;
    }
    const rotBtn = e.target.closest('[data-insp-rot]');
    if (rotBtn) {
      const deg = Number(rotBtn.dataset.inspRot);
      rotateSelected(deg === 15 ? Math.PI / 12 : Math.PI / 2);
      return;
    }
    const actBtn = e.target.closest('[data-insp-action]');
    if (actBtn) {
      if (actBtn.dataset.inspAction === 'dup') duplicateSelected();
      else if (actBtn.dataset.inspAction === 'del') deleteSelected();
      return;
    }
    const openDrBtn = e.target.closest('[data-open-drawer]');
    if (openDrBtn) {
      state.openDrawer = openDrBtn.dataset.openDrawer;
      renderLeftRailAndDrawer(state);
      return;
    }

    // Wall Inspector paint & coverage controls
    const inspCov = e.target.closest('[data-insp-cov]');
    if (inspCov) {
      const rid = inspCov.dataset.inspRoom;
      if (state.roomPaints[rid]) {
        state.roomPaints[rid].coverage = inspCov.dataset.inspCov;
        state.activeBrushCoverage = inspCov.dataset.inspCov;
        applyAllRoomPaints();
        renderPaintPanel(state);
        refreshInspector();
        renderTopBar(state);
        undoMgr.snapshot(state); saveState(state); notifyRayTracerMaterialChange();
      }
      return;
    }
    const inspPaint = e.target.closest('[data-insp-paint]');
    if (inspPaint) {
      const rid = inspPaint.dataset.inspRoom;
      const pid = inspPaint.dataset.inspPaint;
      if (state.roomPaints[rid]) {
        state.roomPaints[rid].paintId = pid;
        state.activeBrushPaintId = pid;
        applyAllRoomPaints();
        renderPaintPanel(state);
        refreshInspector();
        renderTopBar(state);
        undoMgr.snapshot(state); saveState(state); notifyRayTracerMaterialChange();
      }
      return;
    }

    // Bed Inspector controls
    const inspBedFin = e.target.closest('[data-insp-bed-fin]');
    if (inspBedFin) {
      const bed = state.items.find(i => i.uid === inspBedFin.dataset.inspUid);
      if (bed) {
        bed.finish = inspBedFin.dataset.inspBedFin;
        rebuildSingleMovable(bed.uid);
        renderBedSection(state);
        refreshInspector();
        undoMgr.snapshot(state); saveState(state); notifyRayTracerMaterialChange();
      }
      return;
    }
    const inspBedModel = e.target.closest('[data-insp-bed-model]');
    if (inspBedModel) {
      const bed = state.items.find(i => i.uid === inspBedModel.dataset.inspUid);
      const def = IKEA_BEDS.find(b => b.id === inspBedModel.dataset.inspBedModel);
      if (bed && def) {
        bed.modelId = def.id;
        bed.finish = def.defaultFinish;
        rebuildSingleMovable(bed.uid);
        renderBedSection(state);
        refreshInspector();
        undoMgr.snapshot(state); saveState(state); notifyRayTracerGeometryChange();
      }
      return;
    }

    // Kitchen / Sofa / Dining Table shared actions inside Inspector
    if (applyKitchenAction(e.target)) return;
    if (applySofaOrTableAction(e.target)) return;
  });

  inspBody.addEventListener('input', (e) => {
    if (e.target.id === 'insp-y-slider') {
      const item = state.items.find(i => i.uid === manipulator.selectedUid);
      if (!item) return;
      const cm = parseInt(e.target.value, 10) || 0;
      item.y = cm / 100;
      const valEl = document.getElementById('insp-y-val');
      if (valEl) valEl.textContent = `${cm}cm`;
      const mesh = movableGroup.children.find(m => m.userData.uid === item.uid);
      if (mesh) mesh.position.y = item.y;
      requestRender();
      notifyRayTracerGeometryChange();
    }
  });
  inspBody.addEventListener('change', (e) => {
    if (e.target.id === 'insp-y-slider') {
      undoMgr.snapshot(state);
      saveState(state);
    }
  });
  inspBody.addEventListener('submit', (e) => {
    if (e.target.id === 'insp-refine-form') {
      e.preventDefault();
      const inp = document.getElementById('insp-refine-input');
      const val = inp?.value?.trim();
      if (val) {
        inp.value = '';
        executePrompt(val);
      }
    }
  });

  // ---- PHOTO RENDER (RT) FLOATING HUD CONTROLS ----
  document.querySelectorAll('.rt-prof-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!rayTracer) return;
      rayTracer.setProfile(btn.dataset.rtProf);
      updateRtHudControls();
      requestRender();
    });
  });
  document.getElementById('rt-ev-slider').addEventListener('input', (e) => {
    if (!rayTracer) return;
    rayTracer.setExposureEv(parseFloat(e.target.value));
    updateRtHudControls();
  });
  document.getElementById('btn-rt-denoise').addEventListener('click', () => {
    if (!rayTracer) return;
    rayTracer.setDenoiseMode(rayTracer.denoiseMode === 'ai' ? 'off' : 'ai');
    requestRender();
    updateRtHudControls();
  });
  document.getElementById('btn-rt-photo').addEventListener('click', () => {
    renderAndSavePhoto();
  });
  document.getElementById('btn-rt-lamps').addEventListener('click', () => {
    if (!rayTracer) return;
    const modes = ['auto', 'on', 'off'];
    const next = modes[(modes.indexOf(rayTracer.lampsMode) + 1) % modes.length];
    rayTracer.setLampsMode(next);
    updateRtHudControls();
    requestRender();
  });

  // ---- DRAWER 1: CATALOG (FURNITURE) ----
  document.getElementById('btn-focus-table').addEventListener('click', () => {
    const tb = state.items.find(i => i.kind === 'diningTable');
    state.activeView = 'sejour';
    renderTopBar(state);
    if (tb) {
      manipulator.select(tb.uid);
      flyToCustomCamera([0.45, 2.25, 8.40], [tb.x + 0.15, 0.72, tb.z - 0.15], true);
    } else flyToView('sejour');
  });
  document.getElementById('btn-focus-sofa').addEventListener('click', () => {
    const sf = state.items.find(i => i.kind === 'sofa');
    state.activeView = 'sejour';
    renderTopBar(state);
    if (sf) {
      manipulator.select(sf.uid);
      flyToCustomCamera([2.15, 1.95, 8.42], [sf.x + 0.85, 0.72, sf.z - 0.10], true);
    } else flyToView('sejour');
  });

  document.getElementById('panel-catalog').addEventListener('click', (e) => {
    if (applySofaOrTableAction(e.target)) return;

    const bedRoomBtn = e.target.closest('[data-bed-room]');
    if (bedRoomBtn) {
      state.activeBedRoom = bedRoomBtn.dataset.bedRoom;
      renderBedSection(state);
      flyToView(state.activeBedRoom);
      return;
    }
    const bedFinBtn = e.target.closest('[data-bed-fin]');
    if (bedFinBtn) {
      const bed = state.items.find(i => i.kind === 'bed' && i.room === state.activeBedRoom);
      if (!bed) return;
      bed.finish = bedFinBtn.dataset.bedFin;
      rebuildSingleMovable(bed.uid);
      renderBedSection(state);
      refreshInspector();
      undoMgr.snapshot(state); saveState(state); notifyRayTracerMaterialChange();
      return;
    }
    const bedModelBtn = e.target.closest('[data-bed-model]');
    if (bedModelBtn) {
      const modelId = bedModelBtn.dataset.bedModel;
      const def = IKEA_BEDS.find(b => b.id === modelId);
      let bed = state.items.find(i => i.kind === 'bed' && i.room === state.activeBedRoom);
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
      renderBedSection(state);
      undoMgr.snapshot(state); saveState(state); notifyRayTracerGeometryChange();
      showToast(`${state.activeBedRoom.toUpperCase()} → IKEA ${def.name}`);
      return;
    }
    const qBtn = e.target.closest('[data-quick-add]');
    if (qBtn) {
      const tpl = QUICK_ADD_ITEMS.find(q => q.id === qBtn.dataset.quickAdd);
      if (!tpl) return;
      const rId = getAddTargetRoom(state);
      const r = ROOMS.find(rm => rm.id === rId) || ROOMS[0];
      const spot = findFreeSpotInRoom(rId, tpl.w, tpl.d);
      const newItem = {
        uid: `${tpl.kind}-${Date.now().toString(36)}`,
        kind: tpl.kind,
        room: rId,
        label: tpl.label.split('(')[0].trim(),
        w: tpl.w, d: tpl.d, h: tpl.h, finish: tpl.finish,
        x: spot.x, z: spot.z, rotY: spot.rotY || 0
      };
      state.items.push(newItem);
      rebuildSingleMovable(newItem.uid);
      manipulator.select(newItem.uid);
      undoMgr.snapshot(state); saveState(state); notifyRayTracerGeometryChange();
      showToast(`Added ${newItem.label} to ${r.shortName}`);
    }
  });

  // ---- DRAWER 2: IKEA METOD KITCHEN ----
  document.getElementById('btn-focus-kitchen').addEventListener('click', () => flyToView('kitchen'));
  document.getElementById('btn-pin-combo').addEventListener('click', () => {
    if (state.kitchen.comboA) {
      state.kitchen.comboA = null;
      showToast('Unpinned Kitchen Combo A');
    } else {
      state.kitchen.comboA = { doorId: state.kitchen.doorId, countertopId: state.kitchen.countertopId };
      showToast('Pinned Combo A — press Space to compare!');
    }
    renderKitchenPanel(state);
  });
  const swapKitchenAB = () => {
    if (!state.kitchen.comboA) return;
    const prev = { doorId: state.kitchen.doorId, countertopId: state.kitchen.countertopId };
    state.kitchen.doorId = state.kitchen.comboA.doorId;
    state.kitchen.countertopId = state.kitchen.comboA.countertopId;
    state.kitchen.comboA = prev;
    kitchenBuilder.applyDoor(state.kitchen.doorId);
    kitchenBuilder.applyCountertop(state.kitchen.countertopId);
    renderKitchenPanel(state);
    refreshInspector();
    notifyRayTracerGeometryChange();
    requestRender();
    showToast(`Swapped → ${DOORS.find(d => d.id === state.kitchen.doorId)?.shortName}`);
  };
  document.getElementById('btn-swap-combo').addEventListener('click', swapKitchenAB);
  document.getElementById('panel-kitchen').addEventListener('click', (e) => {
    applyKitchenAction(e.target);
  });

  // ---- DRAWER 3: DULUX WALL PAINTS ----
  document.getElementById('btn-paint-reset-all').addEventListener('click', () => {
    Object.keys(state.roomPaints).forEach(k => { state.roomPaints[k] = { paintId: 'original-white', coverage: 'all' }; });
    applyAllRoomPaints();
    renderPaintPanel(state);
    renderTopBar(state);
    refreshInspector();
    undoMgr.snapshot(state); saveState(state); notifyRayTracerMaterialChange();
    showToast('All rooms reset to Original Promoteur White');
  });
  document.getElementById('btn-paint-curated').addEventListener('click', () => {
    state.roomPaints.ch3    = { paintId: 'dv-taupe-clair', coverage: 'accent' };
    state.roomPaints.ch1    = { paintId: 'dv-lin-naturel', coverage: 'all' };
    state.roomPaints.ch2    = { paintId: 'dv-beige-cachemire', coverage: 'all' };
    state.roomPaints.wc     = { paintId: 'dv-vert-sauge', coverage: 'all' };
    state.roomPaints.sejour = { paintId: 'original-white', coverage: 'all' };
    applyAllRoomPaints();
    renderPaintPanel(state);
    renderTopBar(state);
    refreshInspector();
    undoMgr.snapshot(state); saveState(state); notifyRayTracerMaterialChange();
    showToast('Applied Curated Dulux Mix');
  });
  document.getElementById('panel-paint').addEventListener('click', (e) => {
    const rBtn = e.target.closest('[data-paint-room]');
    if (rBtn) {
      state.activePaintRoom = rBtn.dataset.paintRoom;
      renderPaintPanel(state);
      flyToView(state.activePaintRoom);
      return;
    }
    const covBtn = e.target.closest('[data-cov]');
    if (covBtn) {
      state.roomPaints[state.activePaintRoom].coverage = covBtn.dataset.cov;
      state.activeBrushCoverage = covBtn.dataset.cov;
      applyAllRoomPaints();
      renderPaintPanel(state);
      renderTopBar(state);
      refreshInspector();
      undoMgr.snapshot(state); saveState(state); notifyRayTracerMaterialChange();
      return;
    }
    const pBtn = e.target.closest('[data-paint-id]');
    if (pBtn) {
      const pid = pBtn.dataset.paintId;
      state.roomPaints[state.activePaintRoom].paintId = pid;
      state.activeBrushPaintId = pid;
      applyAllRoomPaints();
      renderPaintPanel(state);
      renderTopBar(state);
      refreshInspector();
      undoMgr.snapshot(state); saveState(state); notifyRayTracerMaterialChange();
      const pDef = DULUX_PAINTS.find(p => p.id === pid);
      showToast(`${state.activePaintRoom.toUpperCase()} → ${pDef.name}`);
    }
  });

  // ---- DRAWER 4: AMBILLY SUN & TMA LIGHTS ----
  document.getElementById('sun-hour-slider').addEventListener('input', (e) => {
    state.d65Override = false;
    state.sunHour = parseFloat(e.target.value);
    applyAmbillySun();
    saveState(state);
  });
  document.getElementById('btn-sun-play').addEventListener('click', () => {
    sunPlaying = !sunPlaying;
    state.d65Override = false;
    document.getElementById('btn-sun-play').textContent = sunPlaying ? '⏸ Pause' : '▶ Play';
    requestRender();
  });
  document.getElementById('btn-d65-toggle').addEventListener('click', () => {
    state.d65Override = !state.d65Override;
    sunPlaying = false;
    document.getElementById('btn-sun-play').textContent = '▶ Play';
    renderLightsPanel(state);
    applyAmbillySun();
  });
  document.getElementById('panel-lights').addEventListener('click', (e) => {
    const sBtn = e.target.closest('[data-sun-season]');
    if (sBtn) {
      state.d65Override = false;
      state.sunSeason = sBtn.dataset.sunSeason;
      renderLightsPanel(state);
      applyAmbillySun();
      saveState(state);
      return;
    }
    const qSun = e.target.closest('[data-sun-quick]');
    if (qSun) {
      state.d65Override = false;
      sunPlaying = false;
      document.getElementById('btn-sun-play').textContent = '▶ Play';
      state.sunHour = parseFloat(qSun.dataset.sunQuick);
      applyAmbillySun();
      saveState(state);
      return;
    }
    const fBtn = e.target.closest('[data-fix-room]');
    if (fBtn) {
      state.roomFixtures[fBtn.dataset.fixRoom] = fBtn.dataset.fixStyle;
      rebuildLights();
      renderLightsPanel(state);
      renderTopBar(state);
      undoMgr.snapshot(state); saveState(state); notifyRayTracerGeometryChange();
      showToast(`Updated ${fBtn.dataset.fixRoom.toUpperCase()} light fixture`);
    }
  });

  // ---- DRAWER 5: PROMPT STUDIO & INDEXEDDB GLB IMPORT ----
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
      showToast(`Importing & saving ${file.name}…`);
      const parsed = await parseGlbFile(file);
      const rId = getAddTargetRoom(state);
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
      undoMgr.snapshot(state); saveState(state); notifyRayTracerGeometryChange();
      showToast(`Saved "${item.label}" to IndexedDB (${Math.round(parsed.w * 100)}×${Math.round(parsed.d * 100)} cm)`);
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
    renderPromptPanel(state);
    showToast(cfg.provider === 'local' ? 'Using Built-in Designer Modeliser' : `Saved ${cfg.provider.toUpperCase()} Live 3D Engine`);
  });

  document.getElementById('panel-prompt').addEventListener('click', (e) => {
    const exBtn = e.target.closest('[data-prompt-ex]');
    if (exBtn) { executePrompt(exBtn.dataset.promptEx); return; }
    const spBtn = e.target.closest('[data-respawn-idx]');
    if (spBtn) {
      const tpl = state.customLibrary[Number(spBtn.dataset.respawnIdx)];
      if (!tpl) return;
      const rId = getAddTargetRoom(state);
      const r = ROOMS.find(rm => rm.id === rId) || ROOMS[0];
      const spot = findFreeSpotInRoom(rId, tpl.w, tpl.d);
      const item = {
        uid: `prompt-${Date.now().toString(36)}`,
        kind: 'customParametric',
        room: rId,
        label: tpl.label,
        promptSource: tpl.promptSource,
        w: tpl.w, d: tpl.d, h: tpl.h,
        x: spot.x, z: spot.z, rotY: spot.rotY || 0,
        spec: tpl.spec
      };
      state.items.push(item);
      rebuildSingleMovable(item.uid);
      manipulator.select(item.uid);
      undoMgr.snapshot(state); saveState(state); notifyRayTracerGeometryChange();
      showToast(`Spawned ${item.label} in ${r.shortName}`);
    }
  });

  // ---- DRAWER 7: SCENARIOS & JSON BACKUP ----
  document.getElementById('btn-save-scenario').addEventListener('click', () => {
    saveScenarioSlot(state.activeScenario, state);
    renderScenarioButtons(state);
    showToast(`Updated Scenario ${state.activeScenario}`);
  });

  document.getElementById('btn-export-json').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(serializeDesignPayload(state), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cassiopee-ambilly-lot17-layout.json';
    a.click();
    showToast('Exported apartment layout JSON');
  });

  document.getElementById('json-import-input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const validated = mergeAndValidateState(JSON.parse(text));
      applyFullDesignPayload(validated);
      undoMgr.snapshot(state);
      showToast(`Imported layout from ${file.name}`);
    } catch (err) {
      console.error('JSON import error:', err);
      showToast('Invalid layout JSON file');
    }
    e.target.value = '';
  });

  document.getElementById('btn-reset-layout').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    state = createDefaultState();
    applyFullDesignPayload(state);
    setBuildingContextVisible(state.showBuilding);
    setCurtainsVisible(state.showCurtains);
    manipulator.select(null);
    setSelection(null);
    setToolMode('navigate', { silent: true });
    undoMgr.snapshot(state);
    showToast('Reset apartment to defaults');
  });

  // ---- GLOBAL KEYBOARD SHORTCUTS ----
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    const key = e.key.toLowerCase();

    if ((e.ctrlKey || e.metaKey) && key === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    } else if ((e.ctrlKey || e.metaKey) && key === 'y') {
      e.preventDefault();
      redo();
    } else if (!e.ctrlKey && !e.metaKey && !e.altKey && ['1', '2', '3', '4', '5'].includes(e.key)) {
      const map = { '1': 'navigate', '2': 'arrange', '3': 'paint', '4': 'measure', '5': 'studio' };
      setToolMode(map[e.key]);
    } else if (key === 'm') {
      setToolMode(state.toolMode === 'measure' ? 'navigate' : 'measure');
    } else if (key === 'r' && manipulator.selectedUid) {
      e.preventDefault();
      rotateSelected(e.shiftKey ? Math.PI / 12 : Math.PI / 2);
    } else if (key === 'g') {
      document.getElementById('btn-snap').click();
    } else if (e.key === '?') {
      shortcutsModal.classList.toggle('hidden');
    } else if (e.key === 'Escape') {
      if (!shortcutsModal.classList.contains('hidden')) {
        shortcutsModal.classList.add('hidden');
      } else if (currentSelection) {
        manipulator.select(null);
        setSelection(null);
      } else if (state.openDrawer) {
        state.openDrawer = null;
        renderLeftRailAndDrawer(state);
      } else if (state.toolMode !== 'navigate') {
        setToolMode('navigate');
      }
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && manipulator.selectedUid) {
      deleteSelected();
    } else if (e.code === 'Space' && state.kitchen.comboA) {
      e.preventDefault();
      swapKitchenAB();
    }
  });
}

/* =========================================================================
 * 8. ON-DEMAND ANIMATION LOOP (0% IDLE GPU USAGE!) & BOOT
 * ========================================================================= */
function animate(now) {
  requestAnimationFrame(animate);
  const dtSec = Math.min(0.1, (now - lastFrameTs) / 1000);
  lastFrameTs = now;

  // Ambilly Solar Timelapse
  if (sunPlaying && now - lastSunAnimTs > 45) {
    lastSunAnimTs = now;
    state.sunHour += 0.08;
    if (state.sunHour > 22.5) state.sunHour = 5.5;
    applyAmbillySun();
  }

  // Smooth Camera Tween
  if (camTween) {
    camTween.t = Math.min(1, camTween.t + 0.065);
    const k = 1 - Math.pow(1 - camTween.t, 3);
    camera.position.lerpVectors(camTween.startPos, camTween.endPos, k);
    controls.target.lerpVectors(camTween.startTarget, camTween.endTarget, k);
    if (camTween.t >= 1) camTween = null;
    needsRender = true;
    if (rtActive && rayTracer) rayTracer.notifyCameraChanged();
  }

  if (camModes.update(dtSec)) {
    needsRender = true;
  }

  if (rtActive && rayTracer) {
    if (!rayTracer.paused || needsRender || rayTracer.hudDirty) {
      needsRender = false;
      const info = rayTracer.renderFrame();
      if (info && now - rtLastHudTs > 140) {
        rtLastHudTs = now;
        const pct = Math.min(100, Math.round((info.samples / info.targetSamples) * 100));
        const rateStr = info.samplesPerSec > 0 && !info.converged ? ` (${info.samplesPerSec}/s)` : '';
        document.getElementById('rt-samples-text').textContent = info.isCompiling
          ? 'Compiling…'
          : `${info.samples} / ${info.targetSamples}${rateStr}`;
        document.getElementById('rt-progress-bar').style.width = `${pct}%`;
        const denoiseLabel = {
          running: 'AI Denoising…',
          done: `Clean Render Ready ✓ (AI ${Math.max(0.1, info.denoiseMs / 1000).toFixed(1)}s)`,
          failed: 'Ready (AI denoise failed, raw)',
          off: 'Render Ready ✓',
          idle: 'AI Denoising…'
        };
        document.getElementById('rt-status-text').textContent = info.isCompiling
          ? 'Compiling GPU Shader…'
          : info.converged
            ? denoiseLabel[info.denoiseState] || 'Render Ready ✓'
            : (info.photo ? 'Rendering Photo…' : 'Path Tracing…');
      }
    }
    return;
  }

  // On-demand realtime render (skips GPU work completely when idle!)
  if (needsRender) {
    needsRender = false;
    postPipeline.render();
  }
}

async function boot() {
  initThree();
  undoMgr.snapshot(state);
  renderAllPanels(state, lastDiagnostics, getDockExtra());
  refreshInspector();
  bindEvents();
  requestRender();
  requestAnimationFrame(animate);

  // Rehydrate any persisted .GLB models from IndexedDB asynchronously after UI is interactive!
  try {
    const hydrated = await hydrateGlbCache(state.items);
    if (hydrated > 0) rebuildAllMovables();
  } catch (err) {
    console.warn('IndexedDB GLB hydration skipped:', err);
  }
}

boot();
