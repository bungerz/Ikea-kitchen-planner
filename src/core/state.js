/* =========================================================================
 * CENTRAL APPLICATION STATE, UNDO/REDO, SCENARIOS (A/B/C) & JSON IMPORT/EXPORT
 * Pure JS state management compatible with existing v1 localStorage layouts.
 * ========================================================================= */

import { createDefaultMovableItems } from '../catalogs/furniture.js';

export const STORAGE_KEY = 'cassiopee_ambilly_lot17_v1';
export const SCENARIOS_KEY = 'cassiopee_ambilly_scenarios_v2';

export function createDefaultState() {
  return {
    activeTab: 'furniture',
    activeView: 'cutaway',
    cameraMode: 'orbit',     // 'orbit' | 'plan2d' | 'walk'
    activeBedRoom: 'ch3',
    activePaintRoom: 'ch3',
    showCeilings: false,
    showBuilding: true,      // 4th Floor (R+4) Cassiopée Ambilly surroundings
    showCurtains: true,      // Sheer linen architectural curtains
    autoHideWalls: false,    // Smart exterior wall cutaway in tight rooms
    showDoorSwings: false,   // Door & appliance swing + ergonomic overlay
    showTmaOverlay: false,   // TMA electrical/RJ45/plumbing markers
    postFxQuality: 'high',   // 'high' | 'fast' | 'off' (N8AO + subtle bloom)
    sunSeason: 'summer',     // 'summer' | 'spring' | 'autumn' | 'winter'
    sunHour: 16.0,           // 16:00 CEST
    d65Override: false,
    lightingMode: 'morning',
    activeScenario: 'A',     // 'A' | 'B' | 'C'

    roomPaints: {
      ch3:    { paintId: 'original-white', coverage: 'all' },
      ch1:    { paintId: 'original-white', coverage: 'all' },
      ch2:    { paintId: 'original-white', coverage: 'all' },
      sejour: { paintId: 'original-white', coverage: 'all' },
      wc:     { paintId: 'original-white', coverage: 'all' },
      sdb:    { paintId: 'original-white', coverage: 'all' },
      entree: { paintId: 'original-white', coverage: 'all' }
    },

    roomFixtures: {
      sejour: 'scandi-linen',
      ch3:    'brass-opal',
      ch1:    'scandi-linen',
      ch2:    'natural-rattan',
      wc:     'brass-opal',
      sdb:    'flush-minimal',
      entree: 'flush-minimal'
    },

    kitchen: {
      doorId: 'havstorp-beige',
      countertopId: 'ekbacken-blanc',
      backsplash: 'white',
      hardware: 'black',
      claustraHeight: 'half',
      claustraFinish: 'oak',
      comboA: null
    },

    items: createDefaultMovableItems(),
    customLibrary: []
  };
}

/**
 * Merges and validates an imported or stored JSON payload safely onto defaults.
 */
export function mergeAndValidateState(parsed) {
  const def = createDefaultState();
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid JSON layout object');
  }

  const roomPaints = { ...def.roomPaints };
  if (parsed.roomPaints && typeof parsed.roomPaints === 'object') {
    for (const rid of Object.keys(def.roomPaints)) {
      const rp = parsed.roomPaints[rid];
      if (rp && typeof rp.paintId === 'string') {
        roomPaints[rid] = {
          paintId: rp.paintId,
          coverage: rp.coverage === 'accent' ? 'accent' : 'all'
        };
      }
    }
  }

  const roomFixtures = { ...def.roomFixtures };
  if (parsed.roomFixtures && typeof parsed.roomFixtures === 'object') {
    for (const rid of Object.keys(def.roomFixtures)) {
      if (typeof parsed.roomFixtures[rid] === 'string') {
        roomFixtures[rid] = parsed.roomFixtures[rid];
      }
    }
  }

  const kitchen = { ...def.kitchen };
  if (parsed.kitchen && typeof parsed.kitchen === 'object') {
    Object.assign(kitchen, parsed.kitchen);
  }

  const items = Array.isArray(parsed.items) && parsed.items.length > 0
    ? parsed.items.filter(it => it && typeof it.uid === 'string' && typeof it.kind === 'string')
    : def.items;

  return {
    ...def,
    ...parsed,
    roomPaints,
    roomFixtures,
    kitchen,
    items,
    customLibrary: Array.isArray(parsed.customLibrary) ? parsed.customLibrary : []
  };
}

export function loadSavedState(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  const def = createDefaultState();
  if (!storage) return def;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return def;
    return mergeAndValidateState(JSON.parse(raw));
  } catch (_) {
    return def;
  }
}

export function serializeDesignPayload(state) {
  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    roomPaints: state.roomPaints,
    roomFixtures: state.roomFixtures,
    kitchen: state.kitchen,
    items: state.items,
    customLibrary: state.customLibrary,
    lightingMode: state.lightingMode,
    sunSeason: state.sunSeason,
    sunHour: state.sunHour,
    showBuilding: state.showBuilding,
    showCurtains: state.showCurtains
  };
}

export function saveState(state, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(serializeDesignPayload(state)));
  } catch (_) {}
}

/**
 * Full-apartment Scenario Slots (A / B / C) persisted in localStorage.
 */
export function loadScenarios(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return {};
  try {
    const raw = storage.getItem(SCENARIOS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

export function saveScenarioSlot(slotId, state, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return false;
  try {
    const all = loadScenarios(storage);
    all[slotId] = {
      savedAt: new Date().toISOString(),
      payload: serializeDesignPayload(state)
    };
    storage.setItem(SCENARIOS_KEY, JSON.stringify(all));
    return true;
  } catch (_) {
    return false;
  }
}

export function createUndoManager(maxSize = 40) {
  const undoStack = [];
  const redoStack = [];

  const capture = (state) => JSON.stringify({
    roomPaints: state.roomPaints,
    roomFixtures: state.roomFixtures,
    kitchen: state.kitchen,
    items: state.items
  });

  return {
    snapshot(state) {
      const snap = capture(state);
      if (undoStack[undoStack.length - 1] !== snap) {
        undoStack.push(snap);
        if (undoStack.length > maxSize) undoStack.shift();
        redoStack.length = 0;
      }
    },
    canUndo() { return undoStack.length >= 2; },
    canRedo() { return redoStack.length > 0; },
    undo() {
      if (undoStack.length < 2) return null;
      const cur = undoStack.pop();
      redoStack.push(cur);
      return JSON.parse(undoStack[undoStack.length - 1]);
    },
    redo() {
      if (!redoStack.length) return null;
      const next = redoStack.pop();
      undoStack.push(next);
      return JSON.parse(next);
    },
    clear() {
      undoStack.length = 0;
      redoStack.length = 0;
    }
  };
}
