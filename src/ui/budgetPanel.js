import { computeApartmentBudget, exportBudgetCsv } from '../core/budget.js';

/* =========================================================================
 * BUDGET & SHOPPING LIST (BOM / DEVIS) UI PANEL
 * Live itemized breakdown + Dulux paint m² -> liters -> 2.5L pots + CSV export
 * + Live Door-Swing / Ergonomic Clearance Alerts!
 * ========================================================================= */

export function renderBudgetPanel(state, diagnostics = null) {
  const host = document.getElementById('budget-content');
  if (!host) return;

  const budget = computeApartmentBudget(state);
  const { totals, paintSummary, lines } = budget;

  const diagAlerts = [];
  if (diagnostics) {
    for (const c of diagnostics.collisions || []) {
      diagAlerts.push({ level: 'error', text: `🚪 ${c.doorLabel} blocked by ${c.itemLabel}` });
    }
    for (const w of diagnostics.warnings || []) {
      diagAlerts.push({ level: w.severity, text: `📐 ${w.message}` });
    }
    for (const o of diagnostics.occludedOutlets || []) {
      diagAlerts.push({ level: 'warn', text: `⚡ ${o.pointLabel} behind ${o.itemLabel}` });
    }
  }

  const fmt = (n) => `${Math.round(n).toLocaleString('fr-FR')} €`;

  const alertsHtml = diagAlerts.length
    ? `<div class="bg-red-50/90 border border-red-200 rounded-2xl p-3 space-y-1.5">
        <div class="text-[11px] font-bold text-red-900 flex items-center justify-between">
          <span>Ergonomic & Clearance Alerts (${diagAlerts.length})</span>
        </div>
        <div class="space-y-1">
          ${diagAlerts.slice(0, 6).map(a => `
            <div class="text-[10px] ${a.level === 'error' ? 'text-red-800 font-semibold' : 'text-amber-900'}">${a.text}</div>
          `).join('')}
        </div>
      </div>`
    : `<div class="bg-emerald-50/90 border border-emerald-200 rounded-2xl px-3 py-2 text-[10.5px] font-semibold text-emerald-900">
        ✓ Zero door-swing collisions or tight walkway alerts!
      </div>`;

  const paintHtml = paintSummary.length
    ? paintSummary.map(p => `
        <div class="flex items-start justify-between gap-2 py-1.5 border-b border-studio-border/60 last:border-0">
          <div class="flex items-start gap-2 min-w-0">
            <span class="w-4 h-4 rounded-md border border-black/15 mt-0.5 shrink-0" style="background:${p.hex}"></span>
            <div class="min-w-0 leading-tight">
              <div class="text-[10.5px] font-bold text-studio-ink truncate">${p.name}</div>
              <div class="text-[9.5px] text-studio-muted">${p.areaM2} m² (2 coats+10%) → <strong>${p.liters} L</strong> · ${p.pots}×2.5L</div>
              <div class="text-[9px] text-studio-muted truncate">${p.rooms.join(' · ')}</div>
            </div>
          </div>
          <span class="text-[10.5px] font-mono font-bold text-studio-ink shrink-0">${fmt(p.costEur)}</span>
        </div>
      `).join('')
    : `<div class="text-[10px] text-studio-muted">All rooms are currently Original Promoteur White (0 € extra paint).</div>`;

  const grouped = ['Furniture', 'Kitchen', 'Lighting'];
  const itemsHtml = grouped.map(cat => {
    const catLines = lines.filter(l => l.category === cat);
    const catSum = catLines.reduce((s, l) => s + l.totalEur, 0);
    return `
      <details class="bg-white rounded-2xl border border-studio-border p-3" ${cat === 'Furniture' ? 'open' : ''}>
        <summary class="flex items-center justify-between text-xs font-bold text-studio-ink cursor-pointer select-none">
          <span>${cat} (${catLines.length})</span>
          <span class="font-mono text-studio-accent">${fmt(catSum)}</span>
        </summary>
        <div class="mt-2 space-y-1.5">
          ${catLines.map(l => `
            <div class="flex items-start justify-between gap-2 text-[10.5px] border-t border-studio-border/50 pt-1.5">
              <div class="min-w-0 leading-tight">
                <div class="font-semibold text-studio-ink truncate">${l.name}</div>
                <div class="text-[9.5px] text-studio-muted truncate">${l.room}${l.detail ? ` · ${l.detail}` : ''}</div>
              </div>
              <span class="font-mono text-studio-ink shrink-0">${fmt(l.totalEur)}</span>
            </div>
          `).join('')}
        </div>
      </details>
    `;
  }).join('');

  host.innerHTML = `
    <div class="bg-studio-ink text-white rounded-2xl p-3.5 space-y-2.5">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-amber-300 font-bold">Estimated Total (BOM)</div>
          <div class="text-xl font-bold tracking-tight font-mono">${fmt(totals.grandTotalEur)}</div>
        </div>
        <button id="btn-export-csv" type="button" class="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-[10.5px] font-bold cursor-pointer">
          ↓ Export CSV
        </button>
      </div>
      <div class="grid grid-cols-4 gap-1.5 pt-1 border-t border-white/15 text-center">
        <div><div class="text-[9px] text-white/60">Furniture</div><div class="text-[10.5px] font-mono font-bold">${fmt(totals.furnitureEur)}</div></div>
        <div><div class="text-[9px] text-white/60">Kitchen</div><div class="text-[10.5px] font-mono font-bold">${fmt(totals.kitchenEur)}</div></div>
        <div><div class="text-[9px] text-white/60">Paint</div><div class="text-[10.5px] font-mono font-bold">${fmt(totals.paintEur)}</div></div>
        <div><div class="text-[9px] text-white/60">Lights</div><div class="text-[10.5px] font-mono font-bold">${fmt(totals.lightingEur)}</div></div>
      </div>
    </div>

    ${alertsHtml}

    <div class="bg-white rounded-2xl border border-studio-border p-3 space-y-1.5">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-bold text-studio-ink">Dulux Valentine Paint Calculator</h3>
        <span class="text-[10px] font-mono font-bold text-studio-accent">${fmt(totals.paintEur)}</span>
      </div>
      ${paintHtml}
    </div>

    ${itemsHtml}
  `;

  const csvBtn = document.getElementById('btn-export-csv');
  if (csvBtn) {
    csvBtn.onclick = () => {
      const csv = exportBudgetCsv(budget);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'cassiopee-ambilly-lot17-budget.csv';
      a.click();
    };
  }
}
