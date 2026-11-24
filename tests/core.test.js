import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeRoomWallAreaM2,
  clampAndSnapItemToRoom,
  checkDoorSwingCollisions,
  evaluateErgonomics,
  detectRoomAt
} from '../src/core/floorplan.js';
import { computeApartmentBudget, exportBudgetCsv } from '../src/core/budget.js';
import {
  createDefaultState,
  mergeAndValidateState,
  serializeDesignPayload,
  createUndoManager
} from '../src/core/state.js';
import { computeAmbillySun } from '../src/environment/ambillySun.js';

test('computeRoomWallAreaM2 calculates exact net paintable area subtracting openings', () => {
  // Chambre 3: accent wall is north (5.45 m x 2.50 m = 13.625 -> 13.63 m², zero openings)
  const ch3Accent = computeRoomWallAreaM2('ch3', 'accent');
  assert.equal(ch3Accent, 13.63);

  // Chambre 3 all walls = (5.45*2 + 2.76*2)*2.5 - (0.83*2.04 + 1.40*1.70) = 41.05 - 4.0732 = 36.98 m²
  const ch3All = computeRoomWallAreaM2('ch3', 'all');
  assert.ok(ch3All > 36.9 && ch3All < 37.1, `Expected ~36.98, got ${ch3All}`);

  // WC accent wall = 0.82 * 2.50 = 2.05 m²
  assert.equal(computeRoomWallAreaM2('wc', 'accent'), 2.05);
});

test('clampAndSnapItemToRoom snaps flush to walls and prevents kitchen overlap', () => {
  // Place a 1.80 x 2.00 bed close to North wall of Chambre 3 (minZ = 0.26)
  const res = clampAndSnapItemToRoom(
    { x: 2.0, z: 1.32, rotY: 0, kind: 'bed' },
    { w: 1.80, d: 2.00 },
    { gridSnap: false, wallSnap: true, wallSnapDist: 0.12, preventCollisions: true }
  );
  // Expected snapped center Z = 0.26 + 1.00 + 0.015 = 1.275
  assert.equal(res.z, 1.275);
  assert.equal(res.snappedWall, 'north');

  // Dragging a chair inside the IKEA METOD U-Kitchen (X: 1.92..5.49, Z: 3.12..5.48) pushes it out!
  const pushed = clampAndSnapItemToRoom(
    { x: 3.5, z: 5.2, rotY: 0, kind: 'armchair' },
    { w: 0.80, d: 0.80 },
    { gridSnap: false, wallSnap: false, preventCollisions: true }
  );
  assert.ok(pushed.z >= 5.88 || pushed.x <= 1.52, `Expected chair pushed outside kitchen, got (${pushed.x}, ${pushed.z})`);
});

test('checkDoorSwingCollisions flags furniture placed directly inside Chambre 1 door swing', () => {
  const defaultItems = createDefaultState().items;
  const getFp = (it) => ({ w: it.w || 1.6, d: it.d || 2.0 });

  // Place a blocking cabinet right behind Chambre 1 door (hinge at x=8.42, z=6.75, swings +X/+Z)
  const blockedItems = [
    ...defaultItems,
    { uid: 'blocker-1', kind: 'sideboard', room: 'ch1', label: 'Blocking Cabinet', w: 0.8, d: 0.4, x: 8.8, z: 7.05, rotY: 0 }
  ];
  const collisions = checkDoorSwingCollisions(blockedItems, getFp);
  assert.ok(collisions.some(c => c.doorId === 'door-ch1' && c.itemUid === 'blocker-1'));

  const ergo = evaluateErgonomics(blockedItems, getFp);
  assert.ok(Array.isArray(ergo.warnings));
  assert.ok(Array.isArray(ergo.occludedOutlets));
});

test('computeApartmentBudget computes accurate totals, Dulux paint pots, and valid CSV', () => {
  const st = createDefaultState();
  // Default all white -> 0 paint cost
  const b0 = computeApartmentBudget(st);
  assert.equal(b0.totals.paintEur, 0);
  assert.ok(b0.totals.furnitureEur > 2000);
  assert.ok(b0.totals.kitchenEur > 4000);
  assert.equal(
    b0.totals.grandTotalEur,
    b0.totals.furnitureEur + b0.totals.kitchenEur + b0.totals.paintEur + b0.totals.lightingEur
  );

  // Paint Chambre 3 all walls (~37 m² -> 2 coats + 10% = ~8.1 L -> 4 pots of 2.5 L @ 42€ = 168€)
  st.roomPaints.ch3 = { paintId: 'dv-taupe-clair', coverage: 'all' };
  const b1 = computeApartmentBudget(st);
  assert.equal(b1.paintSummary.length, 1);
  assert.equal(b1.paintSummary[0].pots, 4);
  assert.equal(b1.totals.paintEur, 168);

  const csv = exportBudgetCsv(b1);
  assert.ok(csv.startsWith('Category,Room,Item,Detail,Qty,Unit Price (EUR),Total (EUR)'));
  assert.ok(csv.includes('Dulux Valentine'));
  assert.ok(csv.includes(`TOTAL,,All Categories,,,,${b1.totals.grandTotalEur}`));
});

test('state serialization, JSON import validation, and undo/redo work reliably', () => {
  const st = createDefaultState();
  st.kitchen.doorId = 'voxtorp-brillant-gris-brun';
  const payload = serializeDesignPayload(st);
  const restored = mergeAndValidateState(JSON.parse(JSON.stringify(payload)));
  assert.equal(restored.kitchen.doorId, 'voxtorp-brillant-gris-brun');
  assert.equal(restored.items.length, st.items.length);

  assert.throws(() => mergeAndValidateState(null), /Invalid JSON/);

  const undo = createUndoManager(10);
  undo.snapshot(st);
  st.kitchen.doorId = 'bodbyn-blanc-casse';
  undo.snapshot(st);
  const prev = undo.undo();
  assert.equal(prev.kitchen.doorId, 'voxtorp-brillant-gris-brun');
  const next = undo.redo();
  assert.equal(next.kitchen.doorId, 'bodbyn-blanc-casse');
});

test('computeAmbillySun produces valid normalized 3D vectors for day & night', () => {
  const summerAfternoon = computeAmbillySun('summer', 16.0);
  assert.equal(summerAfternoon.isNight, false);
  assert.ok(summerAfternoon.elevationDeg > 35);
  assert.ok(Math.abs(summerAfternoon.dir.length() - 1) < 1e-5);

  const winterNight = computeAmbillySun('winter', 21.5);
  assert.equal(winterNight.isNight, true);
  assert.equal(winterNight.lightsRecommendedOn, true);

  // Room detection sanity check
  assert.equal(detectRoomAt(2.5, 1.5)?.id, 'ch3');
  assert.equal(detectRoomAt(3.0, 7.0)?.id, 'sejour');
});
