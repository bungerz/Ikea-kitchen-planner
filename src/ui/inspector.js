/* =========================================================================
 * FLOATING CONTEXTUAL INSPECTOR (RIGHT EDGE, 300px)
 * Appears ONLY when an item, kitchen, or wall is selected — keeps 95%+ of
 * the 3D apartment completely unobstructed when exploring!
 * ========================================================================= */

import { DOORS, COUNTERTOPS, DULUX_PAINTS, WOOD_FINISHES, SOFA_FABRICS } from '../catalogs/materials.js';
import { ROOMS, IKEA_BEDS, IKEA_SOFAS, MOBILIFIVER_TABLES } from '../catalogs/furniture.js';
import { computeRoomWallAreaM2 } from '../core/floorplan.js';

export function renderContextualInspector(state, selection, clearance = null) {
  const panel = document.getElementById('contextual-inspector');
  const titleEl = document.getElementById('insp-title');
  const subEl = document.getElementById('insp-subtitle');
  const bodyEl = document.getElementById('insp-body');
  if (!panel || !bodyEl) return;

  if (!selection || state.toolMode === 'studio') {
    panel.classList.add('inspector-closed');
    return;
  }

  panel.classList.remove('inspector-closed');

  // ---- 1. INTERIOR WALL INSPECTOR ----
  if (selection.kind === 'wall') {
    const roomId = selection.roomId || state.activePaintRoom;
    const room = ROOMS.find(r => r.id === roomId) || ROOMS[0];
    const cfg = state.roomPaints[roomId] || { paintId: 'original-white', coverage: 'all' };
    const netM2 = computeRoomWallAreaM2(roomId, cfg.coverage);
    titleEl.textContent = `${room.shortName} Walls`;
    subEl.textContent = `Paintable area: ${netM2.toFixed(1)} m² · Dulux Valentine`;

    bodyEl.innerHTML = `
      <div class="grid grid-cols-2 gap-1 p-1 rounded-xl studio-subtle">
        <button data-insp-cov="all" data-insp-room="${roomId}" type="button" class="py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer ${cfg.coverage === 'all' ? 'studio-btn-active' : 'text-studio-muted'}">All Walls</button>
        <button data-insp-cov="accent" data-insp-room="${roomId}" type="button" class="py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer ${cfg.coverage === 'accent' ? 'studio-btn-active' : 'text-studio-muted'}">Accent Only</button>
      </div>
      <div class="grid grid-cols-2 gap-1.5 max-h-[48dvh] overflow-y-auto studio-scroll pr-0.5">
        ${DULUX_PAINTS.map(p => {
          const active = cfg.paintId === p.id;
          return `<button data-insp-paint="${p.id}" data-insp-room="${roomId}" type="button" class="flex items-center gap-2 p-1.5 rounded-xl studio-surface text-left cursor-pointer ${active ? 'studio-card-active' : ''}">
            <span class="w-5 h-5 rounded-md border border-black/15 shrink-0" style="background:${p.hex}"></span>
            <div class="min-w-0 leading-tight">
              <div class="text-[10px] font-bold truncate">${p.shortName}</div>
              <div class="text-[9px] text-studio-muted">LRV ${p.lrv}%</div>
            </div>
          </button>`;
        }).join('')}
      </div>
    `;
    return;
  }

  // ---- 2. IKEA METOD KITCHEN INSPECTOR ----
  if (selection.kind === 'kitchen') {
    const k = state.kitchen;
    titleEl.textContent = 'IKEA METOD Kitchen';
    subEl.textContent = 'U-Kitchen · Doors, Worktop & Claustra';

    bodyEl.innerHTML = `
      <div class="space-y-3">
        <div class="space-y-1.5">
          <div class="text-[10px] font-bold uppercase tracking-wider text-studio-muted">Beige Doors (6)</div>
          <div class="space-y-1">
            ${DOORS.map(d => `
              <button data-door-id="${d.id}" type="button" class="w-full flex items-center gap-2 p-1.5 rounded-xl studio-surface text-left cursor-pointer ${k.doorId === d.id ? 'studio-card-active' : ''}">
                <span class="w-5 h-5 rounded-md border border-black/15 shrink-0" style="background:${d.hex}"></span>
                <div class="min-w-0 leading-tight">
                  <div class="text-[10.5px] font-bold truncate">${d.shortName}</div>
                  <div class="text-[9px] text-studio-muted truncate">${d.glossLabel} · ${d.profileLabel}</div>
                </div>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="space-y-1.5">
          <div class="text-[10px] font-bold uppercase tracking-wider text-studio-muted">Countertop</div>
          <div class="grid grid-cols-2 gap-1">
            ${COUNTERTOPS.slice(0, 8).map(c => `
              <button data-ct-id="${c.id}" type="button" class="flex items-center gap-1.5 p-1.5 rounded-xl studio-surface text-left cursor-pointer ${k.countertopId === c.id ? 'studio-card-active' : ''}">
                <span class="w-4 h-4 rounded border border-black/15 shrink-0" style="background:${c.baseHex}"></span>
                <span class="text-[10px] font-semibold truncate">${c.shortName}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="space-y-1.5">
          <div class="text-[10px] font-bold uppercase tracking-wider text-studio-muted">Claustra & Hardware</div>
          <div class="grid grid-cols-3 gap-1 p-1 rounded-xl studio-subtle">
            ${['full', 'half', 'off'].map(h => `
              <button data-cl-h="${h}" type="button" class="py-1 rounded-lg text-[10px] font-bold cursor-pointer ${k.claustraHeight === h ? 'studio-btn-active' : 'text-studio-muted'}">${h === 'full' ? 'Full' : h === 'half' ? 'Half' : 'Off'}</button>
            `).join('')}
          </div>
          <div class="grid grid-cols-3 gap-1">
            ${[['black', 'Black'], ['brass', 'Brass'], ['steel', 'Steel']].map(([id, lbl]) => `
              <button data-hw="${id}" type="button" class="py-1 rounded-lg studio-surface text-[10px] font-semibold cursor-pointer ${k.hardware === id ? 'studio-card-active' : ''}">${lbl}</button>
            `).join('')}
          </div>
        </div>

        <button data-open-drawer="kitchen" type="button" class="w-full py-1.5 rounded-xl studio-subtle text-[10.5px] font-bold cursor-pointer">
          Open Full Kitchen Studio →
        </button>
      </div>
    `;
    return;
  }

  // ---- 3. MOVABLE FURNITURE ITEM INSPECTOR ----
  const item = state.items.find(i => i.uid === selection.uid);
  if (!item) {
    panel.classList.add('inspector-closed');
    return;
  }

  titleEl.textContent = item.label || item.kind;
  const clText = clearance && clearance.northCm !== undefined
    ? `${clearance.roomName} · ${clearance.wCm}×${clearance.dCm} cm · N:${clearance.northCm} S:${clearance.southCm} W:${clearance.westCm} E:${clearance.eastCm}`
    : clearance
      ? `${clearance.wCm} × ${clearance.dCm} cm`
      : 'Selected furniture';
  subEl.textContent = clText;

  const isArrange = state.toolMode === 'arrange';
  const yCm = Math.round((item.y || 0) * 100);

  // Common Transform Action Bar (with 1-click "Move in 3D" when in Navigate mode!)
  const transformBar = `
    <div class="space-y-2 pb-2.5 border-b border-studio-border">
      <div class="flex items-center gap-1.5">
        <button id="insp-move-btn" type="button" class="flex-1 py-1.5 px-2.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${isArrange ? 'studio-btn-active' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35 hover:bg-amber-500/25'}">
          ${isArrange ? '✥ Moving Mode Active' : '✥ Move in 3D (2)'}
        </button>
        <button data-insp-rot="90" type="button" title="Rotate 90° (R)" class="px-2.5 py-1.5 rounded-xl studio-subtle text-[11px] font-bold cursor-pointer">↻ 90°</button>
        <button data-insp-rot="15" type="button" title="Rotate 15° (Shift+R)" class="px-2 py-1.5 rounded-xl studio-subtle text-[10.5px] font-semibold cursor-pointer">15°</button>
      </div>
      <div class="flex items-center justify-between gap-2 text-[10px]">
        <label class="flex items-center gap-1.5 flex-1 studio-subtle rounded-lg px-2 py-1">
          <span class="font-semibold text-studio-muted">Height Y</span>
          <input id="insp-y-slider" type="range" min="0" max="180" step="5" value="${yCm}" class="flex-1 accent-amber-500 cursor-pointer" />
          <span id="insp-y-val" class="font-mono font-bold w-8 text-right">${yCm}cm</span>
        </label>
        <button data-insp-action="dup" type="button" title="Duplicate" class="px-2 py-1.5 rounded-lg studio-subtle text-[11px] cursor-pointer">⧉</button>
        <button data-insp-action="del" type="button" title="Delete (Del)" class="px-2 py-1.5 rounded-lg bg-red-500/15 text-red-600 border border-red-500/30 hover:bg-red-500/25 text-[11px] cursor-pointer">🗑</button>
      </div>
    </div>
  `;

  let specificHtml = '';

  if (item.kind === 'sofa') {
    const curChaise = item.chaise || 'none';
    specificHtml = `
      <div class="space-y-2.5">
        <div class="grid grid-cols-3 gap-1 p-1 rounded-xl studio-subtle">
          ${[['none', '3-Seat'], ['left', 'Chaise L'], ['right', 'Chaise R']].map(([id, lbl]) => `
            <button data-chaise="${id}" type="button" class="py-1 rounded-lg text-[10px] font-bold cursor-pointer ${curChaise === id ? 'studio-btn-active' : 'text-studio-muted'}">${lbl}</button>
          `).join('')}
        </div>
        <div class="flex flex-wrap gap-1">
          ${SOFA_FABRICS.map(f => `
            <button data-sofa-fab="${f.id}" type="button" class="flex items-center gap-1 px-2 py-1 rounded-lg studio-surface text-[10px] font-semibold cursor-pointer ${item.fabric === f.id ? 'studio-card-active' : ''}">
              <span class="w-3 h-3 rounded-full border border-black/15" style="background:${f.hex}"></span>${f.name.split(' ')[0]}
            </button>
          `).join('')}
        </div>
        <div class="grid grid-cols-2 gap-1.5">
          ${IKEA_SOFAS.map(s => `
            <button data-sofa-model="${s.id}" type="button" class="p-1.5 rounded-xl studio-surface text-left cursor-pointer ${item.modelId === s.id ? 'studio-card-active' : ''}">
              <div class="text-[10.5px] font-bold truncate">${s.name}</div>
              <div class="text-[9px] text-studio-muted">${Math.round(s.w * 100)}×${Math.round(s.d * 100)} · ${s.priceEur}€</div>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  } else if (item.kind === 'diningTable') {
    const def = MOBILIFIVER_TABLES.find(t => t.id === item.modelId) || MOBILIFIVER_TABLES[0];
    const step = item.extensionStep || 0;
    specificHtml = `
      <div class="space-y-2.5">
        <div class="space-y-1">
          <div class="text-[10px] font-bold uppercase tracking-wider text-studio-muted">Extension (${Math.round(def.lengths[step] * 100)} × ${Math.round(def.width * 100)} cm)</div>
          <div class="grid grid-cols-3 gap-1 p-1 rounded-xl studio-subtle">
            ${[0, 1, 2].map(s => `
              <button data-ext="${s}" type="button" class="py-1 rounded-lg text-[10px] font-bold cursor-pointer ${step === s ? 'studio-btn-active' : 'text-studio-muted'}">${Math.round(def.lengths[s] * 100)} cm</button>
            `).join('')}
          </div>
        </div>
        <div class="flex flex-wrap gap-1">
          ${def.finishes.map(fk => {
            const wf = WOOD_FINISHES[fk] || WOOD_FINISHES.walnut;
            return `<button data-tb-fin="${fk}" type="button" class="flex items-center gap-1 px-2 py-1 rounded-lg studio-surface text-[10px] font-semibold cursor-pointer ${item.finish === fk ? 'studio-card-active' : ''}">
              <span class="w-3 h-3 rounded-full border border-black/15" style="background:${wf.hex}"></span>${wf.name.split(' ')[0]}
            </button>`;
          }).join('')}
        </div>
        <div class="grid grid-cols-2 gap-1.5">
          ${MOBILIFIVER_TABLES.map(m => `
            <button data-tb-model="${m.id}" type="button" class="p-1.5 rounded-xl studio-surface text-left cursor-pointer ${item.modelId === m.id ? 'studio-card-active' : ''}">
              <div class="text-[10.5px] font-bold truncate">${m.name.replace('Mobili Fiver ', '')}</div>
              <div class="text-[9px] text-studio-muted">${Math.round(m.lengths[0] * 100)}→${Math.round(m.lengths[2] * 100)} · ${m.priceEur}€</div>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  } else if (item.kind === 'bed') {
    const def = IKEA_BEDS.find(b => b.id === item.modelId) || IKEA_BEDS[0];
    specificHtml = `
      <div class="space-y-2.5">
        <div class="flex flex-wrap gap-1">
          ${def.finishes.map(f => `
            <button data-insp-bed-fin="${f.id}" data-insp-uid="${item.uid}" type="button" class="flex items-center gap-1 px-2 py-1 rounded-lg studio-surface text-[10px] font-semibold cursor-pointer ${item.finish === f.id ? 'studio-card-active' : ''}">
              <span class="w-3 h-3 rounded-full border border-black/15" style="background:${f.hex}"></span>${f.label}
            </button>
          `).join('')}
        </div>
        <div class="grid grid-cols-2 gap-1.5 max-h-[34dvh] overflow-y-auto studio-scroll pr-0.5">
          ${IKEA_BEDS.map(b => `
            <button data-insp-bed-model="${b.id}" data-insp-uid="${item.uid}" type="button" class="p-1.5 rounded-xl studio-surface text-left cursor-pointer ${item.modelId === b.id ? 'studio-card-active' : ''}">
              <div class="text-[10.5px] font-bold truncate">${b.series}</div>
              <div class="text-[9px] text-studio-muted">${Math.round(b.outerW * 100)}×${Math.round(b.outerL * 100)} · ${b.priceEur}€</div>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    specificHtml = `
      <form id="insp-refine-form" class="space-y-1.5">
        <div class="text-[10px] font-bold uppercase tracking-wider text-studio-muted">✨ Quick AI Refine</div>
        <div class="flex gap-1">
          <input id="insp-refine-input" type="text" placeholder='e.g. "30cm wider", "walnut", "brass legs"' class="flex-1 rounded-xl studio-subtle px-2.5 py-1.5 text-[11px] focus:outline-none" />
          <button type="submit" class="px-2.5 py-1.5 rounded-xl studio-btn-active text-[10.5px] font-bold cursor-pointer">Apply</button>
        </div>
      </form>
    `;
  }

  const sourceHtml = item.sourceUrl && /^https?:\/\//i.test(item.sourceUrl)
    ? `<div class="pt-2.5 flex items-center justify-between gap-2 text-[10.5px]">
        <a href="${item.sourceUrl.replace(/"/g, '%22')}" target="_blank" rel="noopener noreferrer" class="font-semibold text-studio-accent hover:underline truncate">🔗 ${item.vendor || 'Product page'} ↗</a>
        <span class="font-mono shrink-0">${typeof item.priceEur === 'number' ? `${item.priceEur} €` : 'price n/a'}</span>
      </div>`
    : '';
  bodyEl.innerHTML = transformBar + sourceHtml + `<div class="pt-2.5">${specificHtml}</div>`;
}
