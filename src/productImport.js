import { ROOMS, TMA_LIGHT_POINTS } from './catalogs/furniture.js';

/* =========================================================================
 * GEMINI BYOK HELPERS + PRODUCT-LINK IMPORT
 * Paste a shop URL (Maisons du Monde, IKEA, La Redoute…) plus an instruction
 * ("replace the pendant above the dining table", "add it in chambre 2").
 *   Step A — Gemini reads the page (url_context + google_search tools) and
 *            returns facts: name, vendor, price, dimensions, materials, mount.
 *   Step B — Gemini (JSON mode) builds a multi-part 3D model from the facts
 *            and picks a placement against a compact scene description.
 * Placement is then validated locally so a hallucinated id can't break state.
 * ========================================================================= */

export const CEILING_HEIGHT_M = 2.50;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export const PARTS_SCHEMA_PROMPT = `JSON schema for the 3D model (units: meters):
{
  "name": "Short descriptive name",
  "w": 1.2, "d": 0.5, "h": 0.8,
  "parts": [
    {
      "shape": "box" | "cylinder" | "sphere" | "torus" | "cone" | "arch" | "dome",
      "pos": [x, y, z],          // CENTER of the part
      "size": [sx, sy, sz],      // full extents; cylinder/cone/dome: sx = diameter, sy = height
      "rot": [rx, ry, rz],       // radians, optional
      "open": true,              // optional: hollow cylinder/cone (lamp shades, drums)
      "radiusBottom": 0.2,       // optional: cylinder bottom radius (tapered shades)
      "mat": {
        "type": "wood" | "fabric" | "metal" | "marble" | "glass" | "mirror" | "emissive" | "matte",
        "finish": "walnut" | "oak" | "birch" | "white" | "blackAsh",
        "color": "#HEX"
      }
    }
  ]
}
The object is centered at X=0, Z=0 and its lowest point rests on Y=0; every part must stay inside 0 <= y <= h.
Use 8 to 40 well-proportioned parts (legs, frame, top, cushions, slats, handles, pleats, decor).`;

/* ---------------- generic helpers ---------------- */

export function findUrl(text) {
  const m = (text || '').match(/https?:\/\/[^\s<>"')]+/i);
  return m ? m[0].replace(/[.,;:!?]+$/, '') : null;
}

/** Extract the first JSON object from an LLM reply (handles ```json fences and prose around it). */
export function extractJson(text) {
  const cleaned = String(text || '').replace(/```(?:json)?/gi, '').trim();
  try { return JSON.parse(cleaned); } catch (_) { /* fall through */ }
  const start = cleaned.indexOf('{');
  if (start < 0) throw new Error('AI reply contained no JSON');
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return JSON.parse(cleaned.slice(start, i + 1));
  }
  throw new Error('AI reply contained incomplete JSON');
}

async function readApiError(resp, label) {
  let detail = '';
  try {
    const body = await resp.json();
    detail = body?.error?.message || '';
  } catch (_) { /* ignore */ }
  return new Error(`${label} ${resp.status}${detail ? `: ${detail}` : ''}`);
}

/** Lists generateContent-capable models available to this key (Flash first). */
export async function listGeminiModels(apiKey, fetchImpl = globalThis.fetch) {
  const resp = await fetchImpl(`${GEMINI_BASE}/models?pageSize=200&key=${encodeURIComponent(apiKey)}`);
  if (!resp.ok) throw await readApiError(resp, 'Gemini');
  const data = await resp.json();
  const names = (data.models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map(m => String(m.name || '').replace(/^models\//, ''))
    .filter(n => /^gemini-/.test(n) && !/(embedding|tts|image|audio|live|vision)/.test(n));
  const rank = n => (/flash/.test(n) && !/lite/.test(n) ? 0 : /pro/.test(n) ? 1 : 2) + (/(preview|exp)/.test(n) ? 0.5 : 0);
  return names.sort((a, b) => rank(a) - rank(b) || b.localeCompare(a, undefined, { numeric: true }));
}

/** Uses the configured model, or the best Flash model the key can access. */
export async function resolveGeminiModel(aiConfig, fetchImpl = globalThis.fetch) {
  if (aiConfig.model && aiConfig.model.trim()) return aiConfig.model.trim();
  const models = await listGeminiModels(aiConfig.apiKey, fetchImpl);
  if (!models.length) throw new Error('No Gemini models available for this API key');
  return models[0];
}

/**
 * Single Gemini generateContent call. JSON mode can't be combined with tools,
 * so with tools the JSON is parsed out of the text instead.
 */
export async function callGemini({ apiKey, model, system, user, tools = null, json = true, temperature = 0.3 }, fetchImpl = globalThis.fetch) {
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { temperature }
  };
  if (tools) body.tools = tools;
  else if (json) body.generationConfig.responseMimeType = 'application/json';

  const url = `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const resp = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) throw await readApiError(resp, 'Gemini');
  const data = await resp.json();
  if (data?.promptFeedback?.blockReason) throw new Error(`Gemini blocked the request (${data.promptFeedback.blockReason})`);
  const cand = data?.candidates?.[0];
  const text = (cand?.content?.parts || []).map(p => p.text || '').join('');
  if (!text) throw new Error(`Gemini returned no text${cand?.finishReason ? ` (${cand.finishReason})` : ''}`);
  const urlMeta = cand?.urlContextMetadata?.urlMetadata || cand?.url_context_metadata?.url_metadata || [];
  return { text, urlMeta, data };
}

/* ---------------- scene context ---------------- */

const LIGHT_POINT_DESCRIPTIONS = {
  'dcl-ch3': 'ceiling pendant, centre of chambre 3 (master bedroom)',
  'sconce-ch3-l': 'left wall sconce above the bed in chambre 3',
  'sconce-ch3-r': 'right wall sconce above the bed in chambre 3',
  'dcl-sejour-dining': 'ceiling pendant above the dining table (séjour)',
  'dcl-sejour-lounge': 'ceiling pendant above the sofa / lounge area (séjour)',
  'dcl-cuisine': 'ceiling light in the kitchen',
  'dcl-ch2': 'ceiling pendant, chambre 2',
  'dcl-ch1': 'ceiling pendant, chambre 1',
  'dcl-sdb': 'ceiling light, bathroom',
  'dcl-wc': 'ceiling light, WC',
  'dcl-entree': 'ceiling light, entrance',
  'dcl-dgt': 'ceiling light, corridor'
};

export function buildSceneContext(state) {
  return {
    rooms: ROOMS.map(r => ({ id: r.id, name: r.name })),
    lightPoints: TMA_LIGHT_POINTS.map(p => ({
      id: p.id, room: p.room, kind: p.kind, description: LIGHT_POINT_DESCRIPTIONS[p.id] || `${p.kind} in ${p.room}`
    })),
    items: (state?.items || []).map(i => ({ uid: i.uid, kind: i.kind, label: i.label || i.kind, room: i.room }))
  };
}

/* ---------------- product import ---------------- */

const READ_SYSTEM = `You extract product facts from an online shop product page.
Open the given URL (use the URL context tool; if the page cannot be read, use Google Search for the exact product).
Reply with ONLY one JSON object, no prose:
{
  "name": "product name as on the page",
  "vendor": "shop / brand",
  "priceEur": 129.99,                  // current selling price in EUR as shown on the page; null if you cannot find it. NEVER estimate.
  "dimensionsCm": { "w": 85, "d": 85, "h": 40, "diameter": 85, "drop": null },   // null for unknown values
  "materials": ["linen", "metal"],
  "colors": ["#E8E1D5"],
  "category": "pendant lamp | sofa | chair | table | rug | mirror | ...",
  "mount": "floor" | "ceiling" | "wall",
  "description": "one sentence describing the shape (pleats, layers, legs…)",
  "imageUrl": "main product image URL or null"
}`;

const BUILD_SYSTEM = `You are a 3D interior furniture CAD modeliser for Three.js and an interior placement assistant.
You receive product facts, the user's instruction, and a description of the apartment scene.
Reply with ONLY one JSON object:
{
  "name": "...", "w": 0.85, "d": 0.85, "h": 0.6, "parts": [ ... ],
  "placement": {
    "action": "add" | "replace",
    "room": "<room id>",
    "target": { "type": "item" | "lightPoint", "id": "<item uid or light point id>" } | null
  }
}
Rules:
- Match the product's real dimensions. For ceiling lights, "h" is the total height from the shade bottom up to the ceiling canopy
  (include the cord: default overall drop 0.9 m above a dining table, 0.6 m elsewhere); the canopy sits at y = h.
- Use "open": true cylinders/cones and "dome" shapes for lamp shades; add an "emissive" bulb inside.
- placement.action = "replace" only if the user asks to replace/swap something; pick the best matching target from the scene
  (existing ceiling lights are light points, furniture are items). Otherwise "add" with target null and the room the user named
  (default "sejour").
${PARTS_SCHEMA_PROMPT}`;

const clamp = (v, lo, hi, dflt) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
};

/**
 * Validates the LLM's placement against the real scene. Unknown ids / rooms fall back to
 * an "add" in `fallbackRoom`.
 */
export function resolvePlacement(rawPlacement, state, fallbackRoom = 'sejour') {
  const p = rawPlacement && typeof rawPlacement === 'object' ? rawPlacement : {};
  const roomOk = id => ROOMS.some(r => r.id === id);
  const room = roomOk(p.room) ? p.room : fallbackRoom;
  if (p.action === 'replace' && p.target && typeof p.target.id === 'string') {
    if (p.target.type === 'lightPoint') {
      const pt = TMA_LIGHT_POINTS.find(lp => lp.id === p.target.id);
      if (pt) return { action: 'replace', room: pt.room, target: { type: 'lightPoint', id: pt.id } };
    } else {
      const it = (state?.items || []).find(i => i.uid === p.target.id);
      if (it) return { action: 'replace', room: it.room || room, target: { type: 'item', id: it.uid } };
    }
  }
  return { action: 'add', room, target: null };
}

/**
 * Reads the product page and builds a placed, priced customParametric item.
 * Returns { type: 'importProduct', item, placement, product, message }.
 */
export async function importProductFromUrl(prompt, url, aiConfig, { state = null, fallbackRoom = 'sejour', fetchImpl = globalThis.fetch } = {}) {
  const apiKey = aiConfig.apiKey;
  const model = await resolveGeminiModel(aiConfig, fetchImpl);

  // Step A — read the product page
  const read = await callGemini({
    apiKey, model,
    system: READ_SYSTEM,
    user: `Product page: ${url}`,
    tools: [{ url_context: {} }, { google_search: {} }],
    temperature: 0.1
  }, fetchImpl);
  const product = extractJson(read.text);
  const pageRead = !read.urlMeta.length || read.urlMeta.some(m => /SUCCESS/i.test(m.urlRetrievalStatus || m.url_retrieval_status || ''));

  // Step B — model + placement
  const instruction = prompt.replace(url, '').trim() || 'add it to the living room';
  const scene = buildSceneContext(state);
  const build = await callGemini({
    apiKey, model,
    system: BUILD_SYSTEM,
    user: JSON.stringify({ product, instruction, scene }),
    json: true,
    temperature: 0.35
  }, fetchImpl);
  const spec = extractJson(build.text);
  if (!Array.isArray(spec.parts) || !spec.parts.length) throw new Error('AI returned a model with no parts');

  const w = clamp(spec.w, 0.1, 3.5, 0.8);
  const d = clamp(spec.d, 0.1, 3.0, 0.8);
  const h = clamp(spec.h, 0.05, 2.45, 0.8);
  const placement = resolvePlacement(spec.placement, state, fallbackRoom);
  const mount = ['floor', 'ceiling', 'wall'].includes(product.mount) ? product.mount : 'floor';
  const priceNum = Number(product.priceEur);
  const priceEur = product.priceEur !== null && product.priceEur !== '' && Number.isFinite(priceNum) && priceNum > 0
    ? Math.round(priceNum * 100) / 100 : null;

  const name = cleanText(product.name || spec.name || 'Imported product', 80);
  const item = {
    uid: `url-${Date.now().toString(36)}`,
    kind: 'customParametric',
    room: placement.room,
    label: name,
    promptSource: prompt,
    sourceUrl: url,
    vendor: cleanText(product.vendor || hostLabel(url), 40),
    mount,
    w, d, h,
    x: 0, z: 0, rotY: 0,
    spec: { w, d, h, parts: spec.parts }
  };
  if (priceEur !== null) item.priceEur = priceEur;

  const priceTxt = priceEur !== null ? `${priceEur.toFixed(2).replace(/\.00$/, '')} €` : 'price not found';
  const where = placement.action === 'replace' ? `replacing ${placement.target.id}` : `in ${placement.room.toUpperCase()}`;
  return {
    type: 'importProduct',
    item,
    placement,
    product,
    message: `🔗 ${name} (${item.vendor}) · ${priceTxt} · ${spec.parts.length} parts ${where}${pageRead ? '' : ' — page not readable, used web search'}`
  };
}

/** Web-sourced strings end up in innerHTML — strip markup characters. */
function cleanText(v, max) {
  return String(v).replace(/[<>"'`&]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) || 'Imported product';
}

function hostLabel(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch (_) { return 'web'; }
}

/**
 * Applies an importProduct result to state (pure, no Three.js).
 * `findFreeSpot(roomId, w, d)` → { x, z, rotY } is injected by main.js.
 * Returns { item, removed: [items removed from state] }.
 */
export function applyImportPlacement(state, res, findFreeSpot) {
  const { item, placement } = res;
  const removed = [];
  const removeWhere = pred => {
    for (let i = state.items.length - 1; i >= 0; i--) {
      if (pred(state.items[i])) removed.push(...state.items.splice(i, 1));
    }
  };

  if (placement.action === 'replace' && placement.target?.type === 'item') {
    const target = state.items.find(i => i.uid === placement.target.id);
    if (target) {
      item.x = target.x; item.z = target.z; item.rotY = target.rotY || 0; item.room = target.room;
      if (target.replacesLightPoint) item.replacesLightPoint = target.replacesLightPoint;
      removeWhere(i => i.uid === target.uid);
    }
  } else if (placement.action === 'replace' && placement.target?.type === 'lightPoint') {
    const pt = TMA_LIGHT_POINTS.find(lp => lp.id === placement.target.id);
    if (pt) {
      item.x = pt.x; item.z = pt.z; item.rotY = 0; item.room = pt.room;
      item.replacesLightPoint = pt.id;
      removeWhere(i => i.replacesLightPoint === pt.id);
    }
  } else {
    const spot = findFreeSpot(item.room, item.w, item.d);
    item.x = spot.x; item.z = spot.z; item.rotY = spot.rotY || 0;
  }

  if (item.mount === 'ceiling' || item.replacesLightPoint) {
    item.y = Math.max(0, CEILING_HEIGHT_M - item.h);
  } else if (item.mount === 'wall') {
    item.y = Math.max(0, 1.55 - item.h / 2);
  }

  state.items.push(item);
  return { item, removed };
}

/** Light points whose stock fixture is hidden because an imported item replaced it. */
export function getReplacedLightPointIds(items) {
  return new Set((items || []).map(i => i.replacesLightPoint).filter(Boolean));
}
