/* =========================================================================
 * CANVAS-FIRST SPATIAL STUDIO UI RENDERERS
 * Renders: Top Header, Left Icon Rail & Slide-Out Library Drawer,
 * Bottom Tool Mode Dock & Contextual Mode Sub-Bar, and all Drawer Panels.
 * ========================================================================= */

import { DOORS, COUNTERTOPS, DULUX_PAINTS, WOOD_FINISHES, SOFA_FABRICS } from '../catalogs/materials.js';
import {
  ROOMS,
  IKEA_BEDS,
  IKEA_SOFAS,
  MOBILIFIVER_TABLES,
  LIGHT_FIXTURES,
  QUICK_ADD_ITEMS
} from '../catalogs/furniture.js';
import { SEASON_PRESETS, formatHour } from '../environment/ambillySun.js';
import { loadAiConfig } from '../promptStudio.js';
import { loadScenarios } from '../core/state.js';
import { computeRoomWallAreaM2 } from '../core/floorplan.js';
import { computeApartmentBudget } from '../core/budget.js';
import { TOOL_MODES, TOOL_MODE_ORDER } from '../core/toolModes.js';
import { renderBudgetPanel } from './budgetPanel.js';

export function getAddTargetRoom(state) {
  if (['ch3', 'ch1', 'ch2', 'sejour', 'entree', 'loggia'].includes(state.activeView)) return state.activeView;
  return 'sejour';
}

export function renderTheme(state) {
  const root = document.documentElement;
  if (root?.setAttribute) {
    root.setAttribute('data-theme', state.theme === 'dark' ? 'dark' : 'light');
  }
  const btn = document.getElementById('btn-theme');
  if (btn) {
    btn.textContent = state.theme === 'dark' ? '☀️' : '🌙';
    btn.title = state.theme === 'dark' ? 'Switch to Warm Light Studio' : 'Switch to Dark ArchViz Studio';
  }
}

export function renderTopBar(state) {
  // Room dropdown options
  const sel = document.getElementById('room-jump-select');
  if (sel) {
    const entries = [
      { key: 'cutaway', label: '🏠 3D Cutaway (All)' },
      { key: 'plan2d',  label: '📐 2D Blueprint Plan' },
      ...ROOMS.map(r => ({ key: r.id, label: `${r.shortName} (${r.areaM2} m²)` }))
    ];
    if (!sel.dataset.populated) {
      sel.innerHTML = entries.map(e => `<option value="${e.key}">${e.label}</option>`).join('');
      sel.dataset.populated = '1';
    }
    sel.value = state.activeView;
  }

  // Live Budget Total pill in top bar
  const budgetPill = document.getElementById('top-budget-pill');
  if (budgetPill) {
    const { totals } = computeApartmentBudget(state);
    budgetPill.textContent = `€ ${(totals.grandTotalEur / 1000).toFixed(1)}k`;
    budgetPill.title = `Estimated Total: ${Math.round(totals.grandTotalEur).toLocaleString('fr-FR')} € — Click to open Budget BOM`;
  }

  // Active Mode Hint in center of top bar
  const hintEl = document.getElementById('top-mode-hint');
  if (hintEl) {
    const def = TOOL_MODES[state.toolMode] || TOOL_MODES.navigate;
    hintEl.textContent = `${def.icon} ${def.label} — ${def.hint}`;
  }
}

export function renderCameraModeButtons(state) {
  document.querySelectorAll('.cam-mode-btn').forEach(btn => {
    const active = btn.dataset.camMode === state.cameraMode;
    btn.className = `cam-mode-btn px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
      active ? 'studio-btn-active' : 'text-studio-muted hover:text-studio-ink'
    }`;
  });
}

export function renderScenarioButtons(state) {
  const saved = loadScenarios();
  document.querySelectorAll('.scenario-btn').forEach(btn => {
    const slot = btn.dataset.scenario;
    const active = state.activeScenario === slot;
    const hasSaved = Boolean(saved[slot]);
    btn.textContent = hasSaved ? `${slot}•` : slot;
    btn.title = hasSaved ? `Load/Save Scenario ${slot}` : `Save current design to Slot ${slot}`;
    btn.className = `scenario-btn w-6 h-6 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
      active ? 'studio-btn-active' : hasSaved ? 'bg-amber-500/20 text-studio-accent' : 'text-studio-muted hover:text-studio-ink'
    }`;
  });
}

export function renderLeftRailAndDrawer(state) {
  const drawer = document.getElementById('library-drawer');
  const drawerTitle = document.getElementById('drawer-title');
  const titles = {
    catalog: 'Catalog & Furniture',
    kitchen: 'IKEA METOD Kitchen',
    paint:   'Dulux Wall Paints',
    lights:  'Ambilly Sun & Lights',
    prompt:  '✨ Prompt 3D & .GLB',
    budget:  'Budget & Shopping BOM',
    storage: 'Scenarios & JSON Storage'
  };

  document.querySelectorAll('.rail-btn').forEach(btn => {
    const active = btn.dataset.drawer === state.openDrawer;
    btn.className = `rail-btn w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold transition-all cursor-pointer ${
      active ? 'studio-btn-active' : 'text-studio-muted hover:text-studio-ink hover:bg-black/5'
    }`;
  });

  if (!drawer) return;
  if (!state.openDrawer || state.toolMode === 'studio') {
    drawer.classList.add('drawer-closed');
  } else {
    drawer.classList.remove('drawer-closed');
    if (drawerTitle) drawerTitle.textContent = titles[state.openDrawer] || 'Studio';
    Object.keys(titles).forEach(k => {
      const el = document.getElementById(`panel-${k}`);
      if (el) el.classList.toggle('hidden', k !== state.openDrawer);
    });
  }
}

export function renderModeDockAndSubbar(state, { hoveredWallRoom = null, rtActive = false, measureCount = 0 } = {}) {
  const appEl = document.getElementById('app');
  if (appEl) appEl.classList.toggle('studio-mode', state.toolMode === 'studio');

  const gridEl = document.getElementById('photo-grid-overlay');
  if (gridEl) gridEl.classList.toggle('hidden', !(state.toolMode === 'studio' && state.showPhotoGrid));

  // Primary 5-Mode Dock
  const dock = document.getElementById('mode-dock');
  if (dock) {
    dock.innerHTML = TOOL_MODE_ORDER.map(id => {
      const m = TOOL_MODES[id];
      const active = state.toolMode === id;
      return `<button data-tool-mode="${id}" type="button" title="${m.label} (${m.key}) — ${m.hint}"
        class="px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
          active ? 'studio-btn-active' : 'text-studio-muted hover:text-studio-ink hover:bg-black/5'
        }">
        <span>${m.icon}</span>
        <span class="hidden sm:inline">${m.label}</span>
        <kbd class="hidden md:inline text-[9px] opacity-60 font-mono">${m.key}</kbd>
      </button>`;
    }).join('');
  }

  // Contextual Mode Sub-Bar directly above the Dock
  const subbar = document.getElementById('mode-subbar');
  if (!subbar) return;

  if (state.toolMode === 'paint') {
    const activeP = DULUX_PAINTS.find(p => p.id === state.activeBrushPaintId) || DULUX_PAINTS[1];
    const quickSwatches = DULUX_PAINTS.slice(0, 10);
    const hoverLbl = hoveredWallRoom ? `→ Paint ${hoveredWallRoom.toUpperCase()}` : 'Click any wall';
    subbar.classList.remove('hidden');
    subbar.innerHTML = `
      <div class="flex flex-wrap items-center justify-center gap-2">
        <span class="text-[10.5px] font-bold flex items-center gap-1.5">
          <span class="w-3.5 h-3.5 rounded border border-black/20" style="background:${activeP.hex}"></span>
          <span>${activeP.shortName}</span>
          <span class="text-studio-muted font-normal">${hoverLbl}</span>
        </span>
        <div class="flex items-center gap-1">
          ${quickSwatches.map(p => `
            <button data-brush-paint="${p.id}" type="button" title="${p.name}"
              class="w-5 h-5 rounded-full border cursor-pointer transition-transform ${state.activeBrushPaintId === p.id ? 'scale-125 ring-2 ring-amber-500 border-white' : 'border-black/20 hover:scale-110'}"
              style="background:${p.hex}"></button>
          `).join('')}
        </div>
        <div class="flex items-center gap-0.5 p-0.5 rounded-lg studio-subtle">
          <button data-brush-cov="all" type="button" class="px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${state.activeBrushCoverage === 'all' ? 'studio-btn-active' : 'text-studio-muted'}">All</button>
          <button data-brush-cov="accent" type="button" class="px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${state.activeBrushCoverage === 'accent' ? 'studio-btn-active' : 'text-studio-muted'}">Accent</button>
        </div>
      </div>
    `;
  } else if (state.toolMode === 'measure') {
    subbar.classList.remove('hidden');
    subbar.innerHTML = `
      <div class="flex items-center gap-2.5 text-[11px]">
        <span class="font-semibold">📏 Click 2 points in 3D to measure distance</span>
        ${measureCount > 0 ? `<button id="sub-measure-clear" type="button" class="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-600 border border-red-500/30 text-[10px] font-bold cursor-pointer">Clear (${measureCount})</button>` : ''}
      </div>
    `;
  } else if (state.toolMode === 'studio') {
    subbar.classList.remove('hidden');
    subbar.innerHTML = `
      <div class="flex flex-wrap items-center justify-center gap-2.5">
        <div class="flex items-center gap-1.5 text-[10.5px]">
          <span class="font-bold">☀️ <span id="sub-sun-time" class="font-mono">${formatHour(state.sunHour)}</span></span>
          <input id="sub-sun-slider" type="range" min="5.5" max="22.5" step="0.25" value="${state.sunHour}" class="w-28 sm:w-36 accent-amber-500 cursor-pointer" />
        </div>
        <button id="sub-photo-grid" type="button" class="px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${state.showPhotoGrid ? 'studio-btn-active' : 'studio-subtle'}">⊞ Grid</button>
        <button id="sub-launch-rt" type="button" class="px-3 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer ${rtActive ? 'bg-red-500 text-white' : 'bg-amber-400 text-amber-950 hover:bg-amber-300'}">
          ${rtActive ? '⏹ Exit Path Tracing' : '✨ Photo Render (RT)'}
        </button>
        <button id="sub-snap-png" type="button" class="px-2.5 py-1 rounded-lg studio-subtle text-[10px] font-bold cursor-pointer">📷 Save PNG</button>
      </div>
    `;
  } else {
    subbar.classList.add('hidden');
    subbar.innerHTML = '';
  }
}

export function renderTableSection(state) {
  const tb = state.items.find(i => i.kind === 'diningTable');
  if (!tb) return;
  const def = MOBILIFIVER_TABLES.find(t => t.id === tb.modelId) || MOBILIFIVER_TABLES[0];
  const step = tb.extensionStep || 0;
  const curLen = Math.round(def.lengths[step] * 100);
  const curW = Math.round(def.width * 100);
  const guests = step === 0 ? '4–6 guests' : step === 1 ? '6–8 guests' : '8–10+ guests';
  document.getElementById('table-dim-badge').textContent = `${curLen} × ${curW} cm · ${guests}`;

  document.querySelectorAll('.ext-btn').forEach(btn => {
    const s = Number(btn.dataset.ext);
    btn.textContent = `${Math.round(def.lengths[s] * 100)} cm`;
    btn.className = `ext-btn py-1.5 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
      s === step ? 'studio-btn-active' : 'studio-surface'
    }`;
  });

  document.getElementById('table-finishes').innerHTML = def.finishes.map(fk => {
    const wf = WOOD_FINISHES[fk] || WOOD_FINISHES.walnut;
    return `<button data-tb-fin="${fk}" type="button" class="flex items-center gap-1.5 px-2 py-1 rounded-lg studio-surface text-[10px] font-semibold cursor-pointer ${
      tb.finish === fk ? 'studio-card-active' : ''
    }"><span class="w-3 h-3 rounded-full border border-black/15" style="background:${wf.hex}"></span>${wf.name.split(' ')[0]}</button>`;
  }).join('');

  document.getElementById('table-list').innerHTML = MOBILIFIVER_TABLES.map(m => `
    <button data-tb-model="${m.id}" type="button" class="text-left p-2 rounded-xl studio-surface transition-all cursor-pointer ${m.id === tb.modelId ? 'studio-card-active' : ''}">
      <div class="flex items-center justify-between gap-1">
        <span class="text-[11px] font-bold truncate">${m.name.replace('Mobili Fiver ', '')}</span>
        <span class="text-[9.5px] font-mono text-studio-muted">${m.priceEur}€</span>
      </div>
      <div class="text-[9.5px] text-studio-muted truncate">${Math.round(m.lengths[0] * 100)}→${Math.round(m.lengths[2] * 100)} cm</div>
    </button>
  `).join('');
}

export function renderBedSection(state) {
  document.querySelectorAll('.bed-room-btn').forEach(btn => {
    const active = btn.dataset.bedRoom === state.activeBedRoom;
    btn.className = `bed-room-btn py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer ${
      active ? 'studio-btn-active' : 'text-studio-muted hover:text-studio-ink'
    }`;
  });

  const bed = state.items.find(i => i.kind === 'bed' && i.room === state.activeBedRoom);
  const activeDef = bed ? (IKEA_BEDS.find(b => b.id === bed.modelId) || IKEA_BEDS[0]) : null;
  const finEl = document.getElementById('bed-finishes');

  if (bed && activeDef) {
    finEl.innerHTML = activeDef.finishes.map(f => `
      <button data-bed-fin="${f.id}" type="button" class="flex items-center gap-1.5 px-2 py-1 rounded-lg studio-surface text-[10px] font-semibold cursor-pointer ${
        bed.finish === f.id ? 'studio-card-active' : ''
      }"><span class="w-3 h-3 rounded-full border border-black/15" style="background:${f.hex}"></span>${f.label}</button>
    `).join('');
  } else {
    finEl.innerHTML = `<span class="text-[10px] text-studio-muted">Click any bed below to add a 160×200 Queen bed in ${state.activeBedRoom.toUpperCase()}.</span>`;
  }

  document.getElementById('bed-list').innerHTML = IKEA_BEDS.map(b => {
    const active = bed && bed.modelId === b.id;
    const sw = b.finishes[0]?.hex || '#D6C6AE';
    return `<button data-bed-model="${b.id}" type="button" class="text-left p-2 rounded-xl studio-surface transition-all cursor-pointer ${active ? 'studio-card-active' : ''}">
      <div class="flex items-center justify-between gap-1">
        <span class="flex items-center gap-1.5 min-w-0">
          <span class="w-3 h-3 rounded-full border border-black/15 shrink-0" style="background:${sw}"></span>
          <span class="text-[11px] font-bold truncate">${b.series}</span>
        </span>
        <span class="text-[9.5px] font-mono text-studio-muted">${b.priceEur}€</span>
      </div>
      <div class="text-[9.5px] text-studio-muted truncate mt-0.5">${Math.round(b.outerW * 100)}×${Math.round(b.outerL * 100)} cm</div>
    </button>`;
  }).join('');
}

export function renderSofaSection(state) {
  const sofa = state.items.find(i => i.kind === 'sofa');
  if (!sofa) return;
  const curChaise = sofa.chaise || 'none';

  document.querySelectorAll('.chaise-btn').forEach(btn => {
    btn.className = `chaise-btn py-1 rounded-lg text-[10.5px] font-semibold cursor-pointer ${
      btn.dataset.chaise === curChaise ? 'studio-btn-active' : 'text-studio-muted hover:text-studio-ink'
    }`;
  });

  document.getElementById('sofa-fabrics').innerHTML = SOFA_FABRICS.map(f => `
    <button data-sofa-fab="${f.id}" type="button" title="${f.name}" class="flex items-center gap-1 px-2 py-1 rounded-lg studio-surface text-[10px] font-medium cursor-pointer ${
      sofa.fabric === f.id ? 'studio-card-active' : ''
    }"><span class="w-3 h-3 rounded-full border border-black/15" style="background:${f.hex}"></span>${f.name.split(' ')[0]}</button>
  `).join('');

  document.getElementById('sofa-list').innerHTML = IKEA_SOFAS.map(s => `
    <button data-sofa-model="${s.id}" type="button" class="text-left p-2 rounded-xl studio-surface transition-all cursor-pointer ${sofa.modelId === s.id ? 'studio-card-active' : ''}">
      <div class="flex items-center justify-between gap-1">
        <span class="text-[11px] font-bold truncate">${s.name}</span>
        <span class="text-[9.5px] font-mono text-studio-muted">${s.priceEur}€</span>
      </div>
      <div class="text-[9.5px] text-studio-muted truncate">${Math.round(s.w * 100)}×${Math.round(s.d * 100)} cm</div>
    </button>
  `).join('');
}

export function renderQuickAddGrid(state) {
  const targetRoom = getAddTargetRoom(state);
  const r = ROOMS.find(rm => rm.id === targetRoom) || ROOMS[0];
  document.getElementById('add-room-badge').textContent = `→ ${r.shortName}`;
  document.getElementById('quick-add-grid').innerHTML = QUICK_ADD_ITEMS.map(q => `
    <button data-quick-add="${q.id}" type="button" class="text-left px-2.5 py-2 rounded-xl studio-subtle hover:opacity-90 transition-all cursor-pointer">
      <div class="text-[10.5px] font-semibold truncate">+ ${q.label.split('(')[0].trim()}</div>
      <div class="text-[9.5px] text-studio-muted">${Math.round(q.w * 100)} × ${Math.round(q.d * 100)} cm</div>
    </button>
  `).join('');
}

export function renderPaintPanel(state) {
  const paintableRooms = ['ch3', 'ch1', 'ch2', 'wc', 'sejour', 'sdb', 'entree'];
  document.getElementById('paint-room-grid').innerHTML = paintableRooms.map(rid => {
    const r = ROOMS.find(x => x.id === rid);
    const cfg = state.roomPaints[rid];
    const pDef = DULUX_PAINTS.find(p => p.id === cfg.paintId) || DULUX_PAINTS[0];
    const area = computeRoomWallAreaM2(rid, cfg.coverage);
    return `<button data-paint-room="${rid}" type="button" class="flex items-center gap-2 p-2 rounded-xl studio-surface text-left transition-all cursor-pointer ${
      state.activePaintRoom === rid ? 'studio-card-active' : ''
    }">
      <span class="w-5 h-5 rounded-lg border border-black/15 shrink-0" style="background:${pDef.hex}"></span>
      <div class="min-w-0 leading-tight">
        <div class="text-[11px] font-bold truncate">${r.shortName}</div>
        <div class="text-[9.5px] text-studio-muted truncate">${pDef.shortName} · ${area.toFixed(0)}m²</div>
      </div>
    </button>`;
  }).join('');

  const curRoom = ROOMS.find(x => x.id === state.activePaintRoom) || ROOMS[2];
  const curCfg = state.roomPaints[state.activePaintRoom];
  const netM2 = computeRoomWallAreaM2(state.activePaintRoom, curCfg.coverage);
  document.getElementById('paint-active-room-lbl').textContent = `${curRoom.shortName} (${netM2.toFixed(1)} m²)`;

  document.querySelectorAll('.cov-btn').forEach(btn => {
    btn.className = `cov-btn py-1.5 rounded-lg text-[10.5px] font-bold border cursor-pointer ${
      btn.dataset.cov === curCfg.coverage ? 'studio-btn-active' : 'studio-surface'
    }`;
  });

  const sections = [
    { key: 'white',  title: 'Original Promoteur White & Chalk' },
    { key: 'linen',  title: 'Dulux · Light Beige & Linen (Ch. 1 & 2)' },
    { key: 'taupe',  title: 'Dulux · Light Taupe (Ch. 3 Master)' },
    { key: 'accent', title: 'Dulux · WC & Statement Accents' }
  ];

  document.getElementById('paint-swatch-sections').innerHTML = sections.map(sec => {
    const list = DULUX_PAINTS.filter(p => p.category === sec.key);
    return `<div class="studio-surface rounded-2xl p-2.5 space-y-2">
      <div class="text-[10.5px] font-bold">${sec.title}</div>
      <div class="grid grid-cols-2 gap-1.5">
        ${list.map(p => `
          <button data-paint-id="${p.id}" type="button" class="flex items-center gap-2 p-1.5 rounded-xl studio-surface text-left transition-all cursor-pointer ${curCfg.paintId === p.id ? 'studio-card-active' : ''}">
            <span class="w-5 h-5 rounded-md border border-black/15 shrink-0" style="background:${p.hex}"></span>
            <div class="min-w-0 leading-tight">
              <div class="text-[10px] font-bold truncate">${p.shortName}</div>
              <div class="text-[9px] text-studio-muted">LRV ${p.lrv}%</div>
            </div>
          </button>
        `).join('')}
      </div>
    </div>`;
  }).join('');
}

export function renderKitchenPanel(state) {
  document.getElementById('door-list').innerHTML = DOORS.map(d => `
    <button data-door-id="${d.id}" type="button" class="w-full flex items-center gap-2.5 p-2 rounded-xl studio-surface text-left transition-all cursor-pointer ${state.kitchen.doorId === d.id ? 'studio-card-active' : ''}">
      <span class="w-6 h-6 rounded-lg border border-black/15 shrink-0" style="background:${d.hex}"></span>
      <div class="min-w-0 flex-1 leading-tight">
        <div class="text-[11px] font-bold truncate">${d.name}</div>
        <div class="text-[9.5px] text-studio-muted truncate">${d.glossLabel} · ${d.profileLabel}</div>
      </div>
    </button>
  `).join('');

  document.getElementById('countertop-grid').innerHTML = COUNTERTOPS.map(c => `
    <button data-ct-id="${c.id}" type="button" class="flex items-center gap-2 p-2 rounded-xl studio-surface text-left transition-all cursor-pointer ${state.kitchen.countertopId === c.id ? 'studio-card-active' : ''}">
      <span class="w-5 h-5 rounded-md border border-black/15 shrink-0" style="background:${c.baseHex}"></span>
      <div class="min-w-0 leading-tight">
        <div class="text-[10.5px] font-bold truncate">${c.shortName}</div>
        <div class="text-[9px] text-studio-muted">${c.thicknessCm} cm</div>
      </div>
    </button>
  `).join('');

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
    b.className = `cl-h-btn py-1.5 rounded-lg text-[10.5px] font-semibold cursor-pointer ${b.dataset.clH === state.kitchen.claustraHeight ? 'studio-btn-active' : 'text-studio-muted'}`;
  });
  document.querySelectorAll('.cl-f-btn').forEach(b => {
    b.className = `cl-f-btn py-1.5 rounded-lg studio-surface text-[10px] font-semibold cursor-pointer ${b.dataset.clF === state.kitchen.claustraFinish ? 'studio-card-active' : ''}`;
  });
  document.querySelectorAll('.bs-btn').forEach(b => {
    b.className = `bs-btn py-1 rounded-lg studio-surface text-[10px] font-semibold cursor-pointer ${b.dataset.bs === state.kitchen.backsplash ? 'studio-card-active' : ''}`;
  });
  document.querySelectorAll('.hw-btn').forEach(b => {
    b.className = `hw-btn py-1 rounded-lg studio-surface text-[10px] font-semibold cursor-pointer ${b.dataset.hw === state.kitchen.hardware ? 'studio-card-active' : ''}`;
  });
}

export function renderLightsPanel(state) {
  const seasonGrid = document.getElementById('season-grid');
  if (seasonGrid) {
    seasonGrid.innerHTML = SEASON_PRESETS.map(s => `
      <button data-sun-season="${s.id}" type="button" class="py-1.5 px-2 rounded-xl studio-surface text-[10.5px] font-semibold cursor-pointer ${
        state.sunSeason === s.id ? 'studio-card-active' : 'text-studio-muted'
      }">${s.label}</button>
    `).join('');
  }
  const d65Btn = document.getElementById('btn-d65-toggle');
  if (d65Btn) {
    d65Btn.textContent = `☁️ Neutral D65: ${state.d65Override ? 'ON' : 'OFF'}`;
    d65Btn.className = `px-2.5 py-1 rounded-lg text-[10px] font-semibold cursor-pointer ${
      state.d65Override ? 'studio-btn-active' : 'studio-surface'
    }`;
  }

  const fixtureRooms = [
    { id: 'sejour', label: 'Séjour (Dining #9 & Lounge #8)' },
    { id: 'ch3',    label: 'Chambre 3 (DCL #1 + 2 Sconces #2)' },
    { id: 'ch1',    label: 'Chambre 1' },
    { id: 'ch2',    label: 'Chambre 2' },
    { id: 'wc',     label: 'WC / Toilets' },
    { id: 'sdb',    label: 'Salle de Bains' },
    { id: 'entree', label: 'Entrée & Dégagement' }
  ];

  document.getElementById('fixture-room-list').innerHTML = fixtureRooms.map(fr => {
    const cur = state.roomFixtures[fr.id];
    return `<div class="studio-subtle rounded-xl p-2 space-y-1.5">
      <div class="text-[10.5px] font-bold">${fr.label}</div>
      <div class="flex flex-wrap gap-1">
        ${LIGHT_FIXTURES.map(lf => `
          <button data-fix-room="${fr.id}" data-fix-style="${lf.id}" type="button" class="flex items-center gap-1 px-2 py-1 rounded-lg studio-surface text-[9.5px] font-semibold cursor-pointer ${
            cur === lf.id ? 'studio-card-active' : 'opacity-75 hover:opacity-100'
          }"><span class="w-2.5 h-2.5 rounded-full border border-black/15" style="background:${lf.swatch}"></span>${lf.shortName}</button>
        `).join('')}
      </div>
    </div>`;
  }).join('');
}

export function renderPromptPanel(state) {
  const aiCfg = loadAiConfig();
  const badge = document.getElementById('ai-mode-badge');
  if (badge) {
    badge.textContent = aiCfg.provider === 'gemini' && aiCfg.apiKey
      ? 'Gemini Live'
      : aiCfg.provider === 'openai' && aiCfg.apiKey
        ? 'LLM Live'
        : 'Local CAD';
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
    'Golden hour summer sunset'
  ];
  document.getElementById('prompt-examples').innerHTML = examples.map(ex => `
    <button data-prompt-ex="${ex}" type="button" class="px-2 py-1 rounded-lg studio-subtle text-[10px] font-medium cursor-pointer">${ex}</button>
  `).join('');

  document.getElementById('custom-lib-count').textContent = `${state.customLibrary.length} saved`;
  const libEl = document.getElementById('custom-lib-list');
  if (!state.customLibrary.length) {
    libEl.innerHTML = `<div class="text-[10.5px] text-studio-muted py-1">No prompted components yet — try a recipe above or drop a .glb file!</div>`;
  } else {
    libEl.innerHTML = state.customLibrary.map((c, idx) => `
      <div class="flex items-center justify-between gap-2 p-2 rounded-xl studio-subtle">
        <div class="min-w-0">
          <div class="text-[11px] font-bold truncate">${c.label}</div>
          <div class="text-[9.5px] text-studio-muted truncate">"${c.promptSource || 'Custom 3D'}"</div>
        </div>
        <button data-respawn-idx="${idx}" type="button" class="shrink-0 px-2 py-1 rounded-lg studio-btn-active text-[10px] font-semibold cursor-pointer">+ Spawn</button>
      </div>
    `).join('');
  }
}

export function renderAllPanels(state, diagnostics = null, extra = {}) {
  renderTheme(state);
  renderTopBar(state);
  renderCameraModeButtons(state);
  renderScenarioButtons(state);
  renderLeftRailAndDrawer(state);
  renderModeDockAndSubbar(state, extra);
  renderTableSection(state);
  renderBedSection(state);
  renderSofaSection(state);
  renderQuickAddGrid(state);
  renderPaintPanel(state);
  renderKitchenPanel(state);
  renderLightsPanel(state);
  renderPromptPanel(state);
  renderBudgetPanel(state, diagnostics);
}
