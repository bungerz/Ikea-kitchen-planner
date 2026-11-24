/* =========================================================================
 * MODULAR STUDIO UI RENDERERS (Furniture, Paint, Kitchen, Lights, Prompt, HUD)
 * Extracted cleanly out of main.js for maintainability.
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
import { SEASON_PRESETS } from '../environment/ambillySun.js';
import { loadAiConfig } from '../promptStudio.js';
import { loadScenarios } from '../core/state.js';
import { computeRoomWallAreaM2 } from '../core/floorplan.js';
import { renderBudgetPanel } from './budgetPanel.js';

export function getAddTargetRoom(state) {
  if (['ch3', 'ch1', 'ch2', 'sejour', 'entree', 'loggia'].includes(state.activeView)) return state.activeView;
  return 'sejour';
}

export function renderRoomNav(state) {
  const nav = document.getElementById('room-nav');
  if (!nav) return;
  const entries = [
    { key: 'cutaway', label: '3D Cutaway' },
    { key: 'plan2d',  label: '2D Plan' },
    ...ROOMS.map(r => ({ key: r.id, label: r.shortName }))
  ];
  nav.innerHTML = entries.map(e => {
    const active = state.activeView === e.key;
    return `<button data-view="${e.key}" type="button" class="shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
      active ? 'bg-studio-ink text-white shadow-sm' : 'text-studio-ink hover:bg-black/5'
    }">${e.label}</button>`;
  }).join('');
}

export function renderTabs(state) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const active = btn.dataset.tab === state.activeTab;
    btn.className = `tab-btn py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
      active ? 'bg-white text-studio-ink shadow-sm' : 'text-studio-muted hover:text-studio-ink'
    }`;
  });
  ['furniture', 'paint', 'kitchen', 'lights', 'prompt', 'budget'].forEach(t => {
    const el = document.getElementById(`panel-${t}`);
    if (el) el.classList.toggle('hidden', t !== state.activeTab);
  });
}

export function renderCameraModeButtons(state) {
  document.querySelectorAll('.cam-mode-btn').forEach(btn => {
    const active = btn.dataset.camMode === state.cameraMode;
    btn.className = `cam-mode-btn px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
      active ? 'bg-studio-ink text-white shadow-sm' : 'text-studio-ink hover:bg-black/5'
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
    btn.title = hasSaved ? `Load/Save Scenario ${slot} (saved)` : `Save current design to Slot ${slot}`;
    btn.className = `scenario-btn w-6 h-6 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
      active ? 'bg-studio-ink text-white' : hasSaved ? 'bg-amber-100 text-amber-900 hover:bg-amber-200' : 'text-studio-muted hover:bg-black/5'
    }`;
  });
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
    const active = s === step;
    btn.textContent = `${Math.round(def.lengths[s] * 100)} cm`;
    btn.className = `ext-btn py-1.5 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
      active ? 'bg-studio-ink text-white border-studio-ink' : 'bg-white text-studio-ink border-studio-border hover:bg-studio-subtle'
    }`;
  });

  document.getElementById('table-finishes').innerHTML = def.finishes.map(fk => {
    const wf = WOOD_FINISHES[fk] || WOOD_FINISHES.walnut;
    const active = tb.finish === fk;
    return `<button data-tb-fin="${fk}" type="button" class="flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer ${
      active ? 'border-studio-ink bg-studio-subtle ring-1 ring-studio-ink' : 'border-studio-border bg-white hover:bg-studio-bg'
    }"><span class="w-3 h-3 rounded-full border border-black/15" style="background:${wf.hex}"></span>${wf.name.split(' ')[0]}</button>`;
  }).join('');

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

export function renderBedSection(state) {
  document.querySelectorAll('.bed-room-btn').forEach(btn => {
    const active = btn.dataset.bedRoom === state.activeBedRoom;
    btn.className = `bed-room-btn py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer ${
      active ? 'bg-white text-studio-ink shadow-sm' : 'text-studio-muted hover:text-studio-ink'
    }`;
  });

  const bed = state.items.find(i => i.kind === 'bed' && i.room === state.activeBedRoom);
  const activeDef = bed ? (IKEA_BEDS.find(b => b.id === bed.modelId) || IKEA_BEDS[0]) : null;
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

export function renderSofaSection(state) {
  const sofa = state.items.find(i => i.kind === 'sofa');
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

export function renderQuickAddGrid(state) {
  const targetRoom = getAddTargetRoom(state);
  const r = ROOMS.find(rm => rm.id === targetRoom) || ROOMS[0];
  document.getElementById('add-room-badge').textContent = `→ ${r.shortName}`;
  document.getElementById('quick-add-grid').innerHTML = QUICK_ADD_ITEMS.map(q => `
    <button data-quick-add="${q.id}" type="button" class="text-left px-2.5 py-2 rounded-xl border border-studio-border bg-studio-bg hover:bg-studio-subtle transition-all cursor-pointer">
      <div class="text-[10.5px] font-semibold text-studio-ink truncate">+ ${q.label.split('(')[0].trim()}</div>
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
    const active = state.activePaintRoom === rid;
    const area = computeRoomWallAreaM2(rid, cfg.coverage);
    return `<button data-paint-room="${rid}" type="button" class="flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
      active ? 'border-studio-ink bg-studio-subtle ring-1 ring-studio-ink' : 'border-studio-border bg-white hover:bg-studio-bg'
    }">
      <span class="w-5 h-5 rounded-lg border border-black/15 shrink-0" style="background:${pDef.hex}"></span>
      <div class="min-w-0 leading-tight">
        <div class="text-[11px] font-bold text-studio-ink truncate">${r.shortName}</div>
        <div class="text-[9.5px] text-studio-muted truncate">${pDef.shortName} · ${area.toFixed(0)}m²</div>
      </div>
    </button>`;
  }).join('');

  const curRoom = ROOMS.find(x => x.id === state.activePaintRoom) || ROOMS[2];
  const curCfg = state.roomPaints[state.activePaintRoom];
  const netM2 = computeRoomWallAreaM2(state.activePaintRoom, curCfg.coverage);
  document.getElementById('paint-active-room-lbl').textContent = `${curRoom.shortName} (${netM2.toFixed(1)} m²)`;
  document.getElementById('paint-room-hint').textContent = curRoom.recommendedPaintHint
    ? `Suggested: ${curRoom.recommendedPaintHint} · Tip: click any wall in 3D to jump directly to it!`
    : 'Tip: click any wall in 3D to jump directly to its paint controls.';

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

export function renderKitchenPanel(state) {
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

export function renderLightsPanel(state) {
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

export function renderPromptPanel(state) {
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

export function renderAllPanels(state, diagnostics = null) {
  renderRoomNav(state);
  renderTabs(state);
  renderCameraModeButtons(state);
  renderScenarioButtons(state);
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
