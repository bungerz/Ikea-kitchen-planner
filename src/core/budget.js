/* =========================================================================
 * LIVE APARTMENT BUDGET & SHOPPING LIST (BOM / DEVIS) CALCULATOR
 * Computes itemized furniture, IKEA METOD kitchen estimate, TMA light fixtures,
 * and exact Dulux Valentine paint m² -> liters -> 2.5L pots + CSV export.
 * ========================================================================= */

import {
  ROOMS,
  IKEA_BEDS,
  IKEA_SOFAS,
  MOBILIFIVER_TABLES,
  LIGHT_FIXTURES,
  TMA_LIGHT_POINTS
} from '../catalogs/furniture.js';
import { DOORS, COUNTERTOPS, DULUX_PAINTS } from '../catalogs/materials.js';
import { computeRoomWallAreaM2 } from './floorplan.js';

const GENERIC_PRICES_EUR = {
  wardrobe: 690,
  tvUnit: 349,
  coffeeTable: 199,
  desk: 249,
  nightstand: 89,
  armchair: 279,
  sideboard: 449,
  plant: 85,
  rug: 229,
  floorLamp: 129,
  customParametric: 350,
  customGlb: 0
};

const FIXTURE_UNIT_PRICE_EUR = {
  'scandi-linen': 79,
  'brass-opal': 119,
  'matte-black': 95,
  'natural-rattan': 69,
  'flush-minimal': 49
};

const DOOR_SERIES_ESTIMATE_EUR = {
  'bodbyn-blanc-casse': 4450,
  'stensund-beige': 4150,
  'havstorp-beige': 3850,
  'upplov-mat-beige-fonce': 4350,
  'voxtorp-brillant-gris-brun': 4690,
  'havstorp-marron-beige': 3850
};

const COUNTERTOP_LINEAR_M = 5.2; // North 1.83 + East 0.94 + Peninsula 2.50
const PAINT_COVERAGE_M2_PER_LITER = 10; // Dulux Valentine Crème de Couleur ~10 m²/L per coat
const PAINT_COATS = 2;
const PAINT_MARGIN = 1.10; // +10% safety margin
const PAINT_POT_LITERS = 2.5;
const PAINT_POT_PRICE_EUR = 42;

export function estimateItemPriceEur(item) {
  if (!item) return 0;
  if (typeof item.priceEur === 'number') return item.priceEur;
  if (item.kind === 'bed') {
    const def = IKEA_BEDS.find(b => b.id === item.modelId) || IKEA_BEDS[0];
    return def?.priceEur || 399;
  }
  if (item.kind === 'sofa') {
    const def = IKEA_SOFAS.find(s => s.id === item.modelId) || IKEA_SOFAS[0];
    return def?.priceEur || 999;
  }
  if (item.kind === 'diningTable') {
    const def = MOBILIFIVER_TABLES.find(t => t.id === item.modelId) || MOBILIFIVER_TABLES[0];
    return def?.priceEur || 599;
  }
  return GENERIC_PRICES_EUR[item.kind] ?? 150;
}

export function computeApartmentBudget(state) {
  const lines = [];

  // 1. Movable Furniture (grouped by room)
  let furnitureTotal = 0;
  for (const item of state.items || []) {
    const price = estimateItemPriceEur(item);
    furnitureTotal += price;
    const roomObj = ROOMS.find(r => r.id === item.room);
    let detail = item.finish || '';
    if (item.kind === 'bed') {
      const def = IKEA_BEDS.find(b => b.id === item.modelId);
      detail = `${def?.name || item.modelId} · ${item.finish || ''}`;
    } else if (item.kind === 'sofa') {
      const def = IKEA_SOFAS.find(s => s.id === item.modelId);
      detail = `${def?.name || item.modelId} · ${item.fabric || ''} · chaise:${item.chaise || 'none'}`;
    } else if (item.kind === 'diningTable') {
      const def = MOBILIFIVER_TABLES.find(t => t.id === item.modelId);
      detail = `${def?.name || item.modelId} · ${item.finish || ''}`;
    }
    lines.push({
      category: 'Furniture',
      room: roomObj?.shortName || item.room || 'Apartment',
      name: item.label || item.kind,
      detail,
      qty: 1,
      unitPriceEur: price,
      totalEur: price
    });
  }

  // 2. IKEA METOD U-Kitchen Estimate (Doors + Carcasses + Countertop + Claustra)
  const k = state.kitchen || {};
  const doorDef = DOORS.find(d => d.id === k.doorId) || DOORS[2];
  const ctDef = COUNTERTOPS.find(c => c.id === k.countertopId) || COUNTERTOPS[4];
  const doorPkgPrice = DOOR_SERIES_ESTIMATE_EUR[doorDef.id] || 3950;
  const ctPerM = ctDef.id.startsWith('karlby') ? 165 : (ctDef.id.startsWith('salian') || ctDef.id.includes('quartz')) ? 135 : 85;
  const ctTotal = Math.round(COUNTERTOP_LINEAR_M * ctPerM);
  const claustraPrice = k.claustraHeight === 'off' ? 0 : (k.claustraHeight === 'full' ? 490 : 320);

  lines.push({
    category: 'Kitchen',
    room: 'Cuisine',
    name: `IKEA METOD U-Kitchen (${doorDef.name})`,
    detail: 'Carcasses, drawers, fronts, plinths & hardware (excl. appliances)',
    qty: 1,
    unitPriceEur: doorPkgPrice,
    totalEur: doorPkgPrice
  });
  lines.push({
    category: 'Kitchen',
    room: 'Cuisine',
    name: `Worktop ${ctDef.name}`,
    detail: `~${COUNTERTOP_LINEAR_M.toFixed(1)} linear meters`,
    qty: 1,
    unitPriceEur: ctTotal,
    totalEur: ctTotal
  });
  if (claustraPrice > 0) {
    lines.push({
      category: 'Kitchen',
      room: 'Cuisine',
      name: `Claustra (${k.claustraHeight === 'full' ? 'Full Ceiling' : 'Half Height'})`,
      detail: `Finish: ${k.claustraFinish || 'oak'} on 120 cm half-wall`,
      qty: 1,
      unitPriceEur: claustraPrice,
      totalEur: claustraPrice
    });
  }
  const kitchenTotal = doorPkgPrice + ctTotal + claustraPrice;

  // 3. Dulux Valentine Wall Paints (Exact Net m² -> Liters -> 2.5L Pots)
  const paintSummary = [];
  const paintGroups = new Map(); // paintId -> { paintDef, areaM2, rooms[] }
  for (const [roomId, cfg] of Object.entries(state.roomPaints || {})) {
    if (!cfg || cfg.paintId === 'original-white') continue;
    const pDef = DULUX_PAINTS.find(p => p.id === cfg.paintId);
    if (!pDef) continue;
    const areaM2 = computeRoomWallAreaM2(roomId, cfg.coverage || 'all');
    if (areaM2 <= 0) continue;
    const roomObj = ROOMS.find(r => r.id === roomId);
    const label = `${roomObj?.shortName || roomId} (${cfg.coverage === 'accent' ? 'Accent' : 'All'} · ${areaM2.toFixed(1)} m²)`;

    if (!paintGroups.has(pDef.id)) {
      paintGroups.set(pDef.id, { paintDef: pDef, areaM2: 0, rooms: [] });
    }
    const g = paintGroups.get(pDef.id);
    g.areaM2 += areaM2;
    g.rooms.push(label);
  }

  let paintTotal = 0;
  for (const g of paintGroups.values()) {
    const liters = Math.round(((g.areaM2 * PAINT_COATS * PAINT_MARGIN) / PAINT_COVERAGE_M2_PER_LITER) * 10) / 10;
    const pots = Math.max(1, Math.ceil(liters / PAINT_POT_LITERS));
    const cost = pots * PAINT_POT_PRICE_EUR;
    paintTotal += cost;
    paintSummary.push({
      paintId: g.paintDef.id,
      name: g.paintDef.name,
      hex: g.paintDef.hex,
      areaM2: Math.round(g.areaM2 * 10) / 10,
      liters,
      pots,
      costEur: cost,
      rooms: g.rooms
    });
    lines.push({
      category: 'Paint',
      room: g.rooms.join(', '),
      name: `Dulux Valentine — ${g.paintDef.name}`,
      detail: `${g.areaM2.toFixed(1)} m² (2 coats + 10%) = ${liters} L → ${pots}×2.5L`,
      qty: pots,
      unitPriceEur: PAINT_POT_PRICE_EUR,
      totalEur: cost
    });
  }

  // 4. TMA Light Fixtures
  let lightsTotal = 0;
  for (const pt of TMA_LIGHT_POINTS) {
    const styleId = (state.roomFixtures && state.roomFixtures[pt.room]) || pt.defaultStyle || 'scandi-linen';
    const fixDef = LIGHT_FIXTURES.find(f => f.id === styleId) || LIGHT_FIXTURES[0];
    const price = FIXTURE_UNIT_PRICE_EUR[styleId] || 75;
    lightsTotal += price;
    const roomObj = ROOMS.find(r => r.id === pt.room);
    lines.push({
      category: 'Lighting',
      room: roomObj?.shortName || pt.room,
      name: `${fixDef.shortName} (${pt.kind})`,
      detail: pt.id,
      qty: 1,
      unitPriceEur: price,
      totalEur: price
    });
  }

  const grandTotalEur = furnitureTotal + kitchenTotal + paintTotal + lightsTotal;

  return {
    lines,
    paintSummary,
    totals: {
      furnitureEur: furnitureTotal,
      kitchenEur: kitchenTotal,
      paintEur: paintTotal,
      lightingEur: lightsTotal,
      grandTotalEur
    }
  };
}

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportBudgetCsv(budget) {
  const header = ['Category', 'Room', 'Item', 'Detail', 'Qty', 'Unit Price (EUR)', 'Total (EUR)'];
  const rows = [header.join(',')];
  for (const l of budget.lines) {
    rows.push([
      csvEscape(l.category),
      csvEscape(l.room),
      csvEscape(l.name),
      csvEscape(l.detail),
      l.qty,
      l.unitPriceEur,
      l.totalEur
    ].join(','));
  }
  rows.push(['TOTAL', '', 'All Categories', '', '', '', budget.totals.grandTotalEur].join(','));
  return rows.join('\n');
}
