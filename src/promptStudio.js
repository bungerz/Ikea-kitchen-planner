import { DULUX_PAINTS, DOORS, WOOD_FINISHES, SOFA_FABRICS } from './catalogs/materials.js';
import { IKEA_BEDS, IKEA_SOFAS, MOBILIFIVER_TABLES, ROOMS } from './catalogs/furniture.js';
import { buildRecipeParts } from './builders/richComponent3d.js';

/* =========================================================================
 * PHASE 2 PROMPT COMPONENT STUDIO (THE GRAIL!)
 * 1) Live Selected-Component Iterative Prompt Editing ("make it 20cm wider", "walnut", "brass legs")
 * 2) 12 Rich Multi-Part Designer 3D Recipes (Schema v2 `parts[]`, zero API key!)
 * 3) Optional Live LLM Modeliser (Gemini 2.5 Flash / OpenAI-compatible BYOK)
 *    that generates arbitrary multi-part 3D furniture JSON from any prompt!
 * 4) Natural Room, Paint, Bed, Sofa, Table, Kitchen & Ambilly Sun commands.
 * ========================================================================= */

const AI_CFG_KEY = 'cassiopee_ai_config_v1';

export function loadAiConfig() {
  try {
    const raw = localStorage.getItem(AI_CFG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { provider: 'local', apiKey: '', model: 'gemini-2.5-flash', endpoint: '' };
}

export function saveAiConfig(cfg) {
  try { localStorage.setItem(AI_CFG_KEY, JSON.stringify(cfg)); } catch (_) {}
}

function detectRoomFromPrompt(text, fallbackRoom = 'sejour') {
  const t = text.toLowerCase();
  if (/chambre\s*3|ch\.?\s*3|master|parental|suite/.test(t)) return 'ch3';
  if (/chambre\s*2|ch\.?\s*2|guest|bureau/.test(t)) return 'ch2';
  if (/chambre\s*1|ch\.?\s*1/.test(t)) return 'ch1';
  if (/\bwc\b|toilet/.test(t)) return 'wc';
  if (/sdb|bath|salle de bain/.test(t)) return 'sdb';
  if (/entr[eé]e|hall|couloir|dgt/.test(t)) return 'entree';
  if (/loggia|balcon|terrasse/.test(t)) return 'loggia';
  if (/s[eé]jour|living|salon|dining|cuisine|kitchen/.test(t)) return 'sejour';
  return fallbackRoom === 'kitchen' ? 'sejour' : fallbackRoom;
}

function parseDimensions(text, defaults) {
  const tri = text.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)(?:\s*[x×]\s*(\d+(?:[.,]\d+)?))?\s*(cm|m)?/i);
  const toM = (valStr, unit) => {
    const v = parseFloat(valStr.replace(',', '.'));
    if (unit && unit.toLowerCase() === 'm') return v;
    return v > 6 ? v / 100 : v;
  };
  if (tri) {
    const u = tri[4] || '';
    const w = Math.max(0.25, Math.min(3.5, toM(tri[1], u)));
    const d = Math.max(0.25, Math.min(3.0, toM(tri[2], u)));
    const h = tri[3] ? Math.max(0.15, Math.min(2.45, toM(tri[3], u))) : defaults.h;
    return { w, d, h };
  }
  const single = text.match(/(\d+(?:[.,]\d+)?)\s*(cm|m)\b/i);
  if (single) {
    const val = Math.max(0.25, Math.min(3.2, toM(single[1], single[2])));
    return { w: val, d: defaults.round ? val : defaults.d, h: defaults.h };
  }
  return { w: defaults.w, d: defaults.d, h: defaults.h };
}

function parseMaterials(text) {
  const t = text.toLowerCase();
  let mainMat = { type: 'wood', finish: 'walnut' };
  let label = 'Walnut';
  let fabricMat = { type: 'fabric', color: '#E5DDD0' };
  let accentMetal = { type: 'metal', color: '#C8A156' };

  if (/noir|black/.test(t) && /laiton|brass/.test(t) === false) {
    accentMetal = { type: 'metal', color: '#1F2023' };
  }
  if (/laiton|brass|gold|dor[eé]/.test(t)) accentMetal = { type: 'metal', color: '#C8A156' };
  if (/chrome|acier|steel|inox/.test(t)) accentMetal = { type: 'metal', color: '#C9CDD2' };

  if (/marbre|marble|travertin/.test(t)) {
    mainMat = { type: 'marble', color: /noir|black/.test(t) ? '#222427' : '#F3F1EC' };
    label = 'Marble';
  } else if (/noyer|walnut/.test(t)) {
    mainMat = { type: 'wood', finish: 'walnut' }; label = 'Walnut';
  } else if (/ch[eê]ne|oak/.test(t)) {
    mainMat = { type: 'wood', finish: 'oak' }; label = 'Oak';
  } else if (/bouleau|birch/.test(t)) {
    mainMat = { type: 'wood', finish: 'birch' }; label = 'Birch';
  } else if (/blanc|white/.test(t)) {
    mainMat = { type: 'wood', finish: 'white' }; label = 'White';
  } else if (/fr[eê]ne noir|black ash|anthracite/.test(t)) {
    mainMat = { type: 'wood', finish: 'blackAsh' }; label = 'Black Ash';
  } else if (/laiton|brass/.test(t)) {
    mainMat = { type: 'metal', color: '#C8A156' }; label = 'Brass';
  }

  if (/sauge|sage|eucalyptus|vert|green/.test(t)) {
    fabricMat = { type: 'fabric', color: '#7D9280' };
    if (!/noyer|walnut|oak|ch[eê]ne|marble|marbre/.test(t)) { mainMat = fabricMat; label = 'Sage'; }
  } else if (/terracotta|argile|cognac/.test(t)) {
    fabricMat = { type: 'fabric', color: '#BA765B' };
    if (!/noyer|walnut|oak|ch[eê]ne|marble|marbre/.test(t)) { mainMat = fabricMat; label = 'Terracotta'; }
  } else if (/taupe/.test(t)) {
    fabricMat = { type: 'fabric', color: '#B8ACA0' };
    if (!/noyer|walnut|oak|ch[eê]ne|marble|marbre/.test(t)) { mainMat = fabricMat; label = 'Taupe'; }
  } else if (/bleu|navy|nuit/.test(t)) {
    fabricMat = { type: 'fabric', color: '#3E5568' };
    if (!/noyer|walnut|oak|ch[eê]ne|marble|marbre/.test(t)) { mainMat = fabricMat; label = 'Navy'; }
  } else if (/boucl[eé]|cr[eè]me|cream|lin|linen|beige/.test(t)) {
    fabricMat = { type: 'fabric', color: '#E8E1D5' };
    if (!/noyer|walnut|oak|ch[eê]ne|marble|marbre/.test(t)) { mainMat = fabricMat; label = 'Bouclé'; }
  }

  return { mainMat, accentMetal, fabricMat, label };
}

/**
 * Checks if the prompt is an iterative modification of the CURRENTLY SELECTED component!
 * e.g. "make it 30cm wider", "change to walnut", "make legs black", "scale 120%", "make taller 95cm"
 */
function tryEditSelectedPrompt(t, selectedItem) {
  if (!selectedItem) return null;
  const isModifyIntent = /^(make|change|set|switch|turn|scale|resize|wider|narrower|taller|shorter|bigger|smaller|plus grand|plus large|modifier|changer|agrandir|r[eé]duire)/.test(t)
    || /\b(selected|this one|this|it|celui-ci|cet objet)\b/.test(t);
  if (!isModifyIntent) return null;

  // Don't hijack room paint / bed / sofa global commands if user named another room
  if (/(paint|peind|mur|wall)/.test(t)) return null;

  const patch = {};
  const changes = [];

  // Scale percentage ("scale 120%", "bigger", "smaller")
  const pct = t.match(/(\d+)\s*%/);
  if (pct) {
    const f = Math.max(0.4, Math.min(2.2, parseInt(pct[1], 10) / 100));
    patch.scaleMult = f;
    changes.push(`scale ${pct[1]}%`);
  } else if (/\b(bigger|larger|plus grand)\b/.test(t)) {
    patch.scaleMult = 1.15; changes.push('+15% size');
  } else if (/\b(smaller|plus petit)\b/.test(t)) {
    patch.scaleMult = 0.85; changes.push('-15% size');
  }

  // Delta width / height ("30cm wider", "wider", "taller 95cm")
  const deltaMatch = t.match(/(\d+(?:[.,]\d+)?)\s*(cm|m)\s*(wider|narrower|taller|shorter|deeper)/i);
  if (deltaMatch) {
    let val = parseFloat(deltaMatch[1].replace(',', '.'));
    if (deltaMatch[2].toLowerCase() === 'cm' || val > 5) val /= 100;
    const dir = deltaMatch[3].toLowerCase();
    if (dir === 'wider') { patch.dw = val; changes.push(`+${Math.round(val * 100)}cm wide`); }
    if (dir === 'narrower') { patch.dw = -val; changes.push(`-${Math.round(val * 100)}cm wide`); }
    if (dir === 'taller') { patch.dh = val; changes.push(`+${Math.round(val * 100)}cm tall`); }
    if (dir === 'shorter') { patch.dh = -val; changes.push(`-${Math.round(val * 100)}cm tall`); }
    if (dir === 'deeper') { patch.dd = val; changes.push(`+${Math.round(val * 100)}cm deep`); }
  } else if (/\b(wider|plus large)\b/.test(t)) {
    patch.dw = 0.20; changes.push('+20cm wide');
  } else if (/\b(narrower|moins large)\b/.test(t)) {
    patch.dw = -0.20; changes.push('-20cm wide');
  } else if (/\b(taller|plus haut)\b/.test(t)) {
    patch.dh = 0.15; changes.push('+15cm tall');
  }

  // Material / Finish change on selected component
  if (/noyer|walnut/.test(t)) { patch.woodFinish = 'walnut'; changes.push('Walnut'); }
  else if (/ch[eê]ne|oak/.test(t)) { patch.woodFinish = 'oak'; changes.push('Oak'); }
  else if (/bouleau|birch/.test(t)) { patch.woodFinish = 'birch'; changes.push('Birch'); }
  else if (/blanc|white/.test(t)) { patch.woodFinish = 'white'; changes.push('White'); }
  else if (/marbre|marble/.test(t)) { patch.isMarble = true; changes.push('Marble'); }
  else if (/laiton|brass/.test(t)) { patch.metalColor = '#C8A156'; changes.push('Brass'); }
  else if (/noir|black/.test(t)) { patch.woodFinish = 'blackAsh'; patch.metalColor = '#1F2023'; changes.push('Black'); }

  if (/sauge|sage|vert|green/.test(t)) { patch.fabricHex = '#7D9280'; patch.sofaFabric = 'vert-sauge'; changes.push('Sage Green'); }
  else if (/terracotta/.test(t)) { patch.fabricHex = '#BA765B'; patch.sofaFabric = 'terracotta'; changes.push('Terracotta'); }
  else if (/boucl[eé]|cr[eè]me/.test(t)) { patch.fabricHex = '#EAE3D6'; patch.sofaFabric = 'boucle-creme'; changes.push('Bouclé Cream'); }
  else if (/lin|beige/.test(t)) { patch.fabricHex = '#DDD4C6'; patch.sofaFabric = 'beige-lin'; changes.push('Linen Beige'); }

  if (changes.length === 0) return null;
  return {
    type: 'editSelected',
    uid: selectedItem.uid,
    patch,
    message: `Updated "${selectedItem.label}" → ${changes.join(', ')}`
  };
}

/**
 * LIVE LLM MODELISER (Gemini 2.5 Flash / OpenAI-compatible BYOK)
 * Generates a rich multi-part Schema v2 JSON 3D model directly from any natural prompt!
 */
const LLM_SYSTEM_PROMPT = `You are a 3D interior furniture CAD modeliser for Three.js.
Return ONLY valid JSON (no markdown fences) describing a realistic multi-part piece of furniture centered at X=0, Z=0 with bottom resting on Y=0 (units in meters).
JSON schema:
{
  "name": "Short descriptive name",
  "w": 1.2,
  "d": 0.5,
  "h": 0.8,
  "parts": [
    {
      "shape": "box" | "cylinder" | "sphere" | "torus" | "cone" | "arch",
      "pos": [x, y, z],
      "size": [sx, sy, sz],
      "rot": [rx, ry, rz],
      "mat": {
        "type": "wood" | "fabric" | "metal" | "marble" | "glass" | "mirror" | "emissive" | "matte",
        "finish": "walnut" | "oak" | "birch" | "white" | "blackAsh",
        "color": "#HEX"
      }
    }
  ]
}
Use 8 to 36 well-proportioned parts (legs, frame, top, cushions, fluted slats, handles, subtle decor). Keep all dimensions realistic (0.2m to 3.0m) and every part's bottom >= 0.`;

async function callLlmModeliser(prompt, aiConfig, selectedItem) {
  const userMsg = selectedItem && /\b(this|selected|modify|edit|refine|wider|taller|change)\b/i.test(prompt)
    ? `Modify this existing 3D furniture spec (${JSON.stringify({ name: selectedItem.label, w: selectedItem.w, d: selectedItem.d, h: selectedItem.h, spec: selectedItem.spec })}) according to: "${prompt}"`
    : `Modelise this furniture item in 3D: "${prompt}"`;

  let rawText = '';

  if (aiConfig.provider === 'gemini') {
    const model = aiConfig.model || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(aiConfig.apiKey)}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: LLM_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.35 }
      })
    });
    if (!resp.ok) throw new Error(`Gemini API HTTP ${resp.status}`);
    const data = await resp.json();
    rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else if (aiConfig.provider === 'openai') {
    const url = (aiConfig.endpoint || 'https://api.openai.com/v1/chat/completions').trim();
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: aiConfig.model || 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.35,
        messages: [
          { role: 'system', content: LLM_SYSTEM_PROMPT },
          { role: 'user', content: userMsg }
        ]
      })
    });
    if (!resp.ok) throw new Error(`LLM API HTTP ${resp.status}`);
    const data = await resp.json();
    rawText = data?.choices?.[0]?.message?.content || '';
  }

  const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || !Array.isArray(parsed.parts) || !parsed.parts.length) {
    throw new Error('LLM returned empty parts[]');
  }
  return parsed;
}

/**
 * Main Phase 2 Async Prompt Interpreter!
 */
export async function interpretPromptAsync(rawPrompt, { activeRoom = 'sejour', selectedItem = null, aiConfig = null } = {}) {
  const prompt = (rawPrompt || '').trim();
  const t = prompt.toLowerCase();
  if (!prompt) return { type: 'noop', message: 'Enter a prompt to modelise or edit a component.' };

  const targetRoom = detectRoomFromPrompt(t, activeRoom);

  // 1. Ambilly Sun & Time commands ("sunset", "winter sun 10am", "morning 9:00", "golden hour")
  if (/(sun|soleil|sunset|coucher|sunrise|lever|golden hour|winter|hiver|summer|[eé]t[eé]|noon|midi|\d{1,2}\s*(?:h|am|pm|:00|:30))/.test(t)
      && !/(cm|mm|table|sofa|bed|lit|mirror|miroir|sideboard|buffet|chair|fauteuil|lamp)/.test(t)) {
    let season = null;
    if (/winter|hiver|dec/.test(t)) season = 'winter';
    else if (/summer|[eé]t[eé]|jun|juin/.test(t)) season = 'summer';
    else if (/spring|printemps|mar/.test(t)) season = 'spring';
    else if (/autumn|automne|sep/.test(t)) season = 'autumn';

    let hour = null;
    if (/sunset|coucher|golden/.test(t)) hour = season === 'winter' ? 16.5 : 20.25;
    else if (/sunrise|lever/.test(t)) hour = season === 'winter' ? 8.3 : 6.2;
    else if (/noon|midi/.test(t)) hour = 13.0;
    else if (/night|nuit|evening|soir/.test(t)) hour = 21.5;
    else {
      const hm = t.match(/(\d{1,2})\s*(?:h|:(\d{2}))?\s*(am|pm)?/i);
      if (hm) {
        let h = parseInt(hm[1], 10);
        const m = hm[2] ? parseInt(hm[2], 10) / 60 : 0;
        if (hm[3]?.toLowerCase() === 'pm' && h < 12) h += 12;
        if (hm[3]?.toLowerCase() === 'am' && h === 12) h = 0;
        if (h >= 0 && h <= 23) hour = h + m;
      }
    }
    if (season || hour !== null) {
      return {
        type: 'setSun',
        season,
        hour,
        message: `Updated Ambilly R+4 Solar Simulation${season ? ` (${season})` : ''}${hour !== null ? ` @ ${Math.floor(hour)}h${String(Math.round((hour % 1) * 60)).padStart(2, '0')}` : ''}`
      };
    }
  }

  // 2. Wall Paint command (Dulux Valentine / Original White)
  if (/(paint|peind|peinture|mur|wall|dulux|couleur|color)/.test(t) && !/(selected|this|chair|table|cabinet|sideboard)/.test(t)) {
    const accentOnly = /(accent|headboard|t[eê]te de lit|un mur|one wall)/.test(t);
    let paint = DULUX_PAINTS.find(p =>
      t.includes(p.name.toLowerCase()) || t.includes(p.shortName.toLowerCase()) || t.includes(p.id.replace('dv-', ''))
    );
    if (!paint) {
      if (/original|origine|blanc|white|reset/.test(t)) paint = DULUX_PAINTS.find(p => p.id === 'original-white');
      else if (/taupe/.test(t)) paint = DULUX_PAINTS.find(p => p.id === 'dv-taupe-clair');
      else if (/lin|linen/.test(t)) paint = DULUX_PAINTS.find(p => p.id === 'dv-lin-naturel');
      else if (/beige|sable|cachemire/.test(t)) paint = DULUX_PAINTS.find(p => p.id === 'dv-beige-cachemire');
      else if (/sauge|sage|vert|green/.test(t)) paint = DULUX_PAINTS.find(p => p.id === 'dv-vert-sauge');
      else if (/terracotta|argile/.test(t)) paint = DULUX_PAINTS.find(p => p.id === 'dv-terracotta-douce');
      else if (/bleu|navy|nuit/.test(t)) paint = DULUX_PAINTS.find(p => p.id === 'dv-bleu-nuit');
      else if (/anthracite|charbon|noir/.test(t)) paint = DULUX_PAINTS.find(p => p.id === 'dv-anthracite');
    }
    if (paint) {
      return {
        type: 'paintRoom',
        roomId: targetRoom,
        paintId: paint.id,
        accentOnly,
        message: `Painted ${targetRoom.toUpperCase()} (${accentOnly ? 'Accent Wall' : 'All Walls'}) → ${paint.brand} ${paint.name}`
      };
    }
  }

  // 3. Extend / retract Mobili Fiver table
  if (/(extend|rallong|agrand|mobilifiver|mobili fiver|retract|fermer)/.test(t) && !/(add|create|cr[eé]er|ajout|coffee|basse)/.test(t)) {
    const matchedModel = MOBILIFIVER_TABLES.find(tb => t.includes(tb.id));
    let extStep = null;
    if (/240|220|295|full|max|complet/.test(t)) extStep = 2;
    else if (/200|180|mid|half|mi/.test(t)) extStep = 1;
    else if (/160|140|120|close|ferm|retract|compact/.test(t)) extStep = 0;
    else if (/extend|rallong|agrand/.test(t)) extStep = 2;
    if (matchedModel || extStep !== null) {
      return {
        type: 'updateTable',
        modelId: matchedModel?.id || null,
        extensionStep: extStep,
        message: `Updated Mobili Fiver table${matchedModel ? ` to ${matchedModel.name}` : ''}${extStep !== null ? ` (step ${extStep}/2)` : ''}`
      };
    }
  }

  // 4. Swap IKEA Bed / Sofa / Kitchen Door
  const matchedBed = IKEA_BEDS.find(b => t.includes(b.id) || t.includes(b.series.toLowerCase()));
  if (matchedBed) {
    const bedRoom = ['ch3', 'ch1', 'ch2'].includes(targetRoom) ? targetRoom : 'ch3';
    return { type: 'updateBed', roomId: bedRoom, modelId: matchedBed.id, message: `Swapped ${bedRoom.toUpperCase()} Queen Bed → IKEA ${matchedBed.name}` };
  }
  const matchedSofa = IKEA_SOFAS.find(s => t.includes(s.id) || t.includes(s.name.toLowerCase()));
  if (matchedSofa) {
    return { type: 'updateSofa', modelId: matchedSofa.id, message: `Swapped Living Room Sofa → IKEA ${matchedSofa.name}` };
  }
  const matchedDoor = DOORS.find(d => t.includes(d.id.split('-')[0]));
  if (matchedDoor && /(kitchen|cuisine|door|porte|fa[cç]ade|metod)/.test(t)) {
    return { type: 'updateKitchenDoor', doorId: matchedDoor.id, message: `Swapped IKEA METOD Kitchen Fronts → ${matchedDoor.name}` };
  }

  // 5. LIVE LLM BYOK MODE (Gemini 2.5 Flash / OpenAI) for arbitrary 3D modelisation!
  const cfg = aiConfig || loadAiConfig();
  if (cfg.provider !== 'local' && cfg.apiKey && cfg.apiKey.trim().length > 8) {
    try {
      const llmSpec = await callLlmModeliser(prompt, cfg, selectedItem);
      const w = Math.max(0.25, Math.min(3.5, Number(llmSpec.w) || 1.2));
      const d = Math.max(0.25, Math.min(3.0, Number(llmSpec.d) || 0.5));
      const h = Math.max(0.15, Math.min(2.45, Number(llmSpec.h) || 0.8));

      // If refining selected custom item, update in-place!
      if (selectedItem && selectedItem.kind === 'customParametric' && /\b(this|selected|modify|edit|refine|make it)\b/i.test(prompt)) {
        return {
          type: 'replaceCustomSpec',
          uid: selectedItem.uid,
          label: llmSpec.name || selectedItem.label,
          w, d, h,
          spec: { w, d, h, parts: llmSpec.parts },
          message: `✨ LLM refined "${llmSpec.name}" (${llmSpec.parts.length} parts)`
        };
      }

      const item = {
        uid: `llm-${Date.now().toString(36)}`,
        kind: 'customParametric',
        room: targetRoom,
        label: llmSpec.name || 'AI 3D Component',
        promptSource: prompt,
        w, d, h, x: 0, z: 0, rotY: 0,
        spec: { w, d, h, parts: llmSpec.parts }
      };
      return {
        type: 'spawnComponent',
        item,
        message: `✨ LLM Modelised "${item.label}" (${llmSpec.parts.length} 3D parts) in ${targetRoom.toUpperCase()}`
      };
    } catch (err) {
      console.warn('LLM API failed, falling back to Smart Local Modeliser:', err);
    }
  }

  // 6. Iterative Edit on Selected Component (Local Smart Parser)
  const localEdit = tryEditSelectedPrompt(t, selectedItem);
  if (localEdit) return localEdit;

  // 7. SMART LOCAL DESIGNER MULTI-PART MODELISER (12 Rich Schema v2 Recipes!)
  const isRound = /round|rond|circul|oval/.test(t);
  let recipe = 'fluted-sideboard';
  let noun = 'Fluted Sideboard';
  let defaults = { w: 1.60, d: 0.45, h: 0.78, round: false };

  if (/(mirror|miroir|psych[eé])/.test(t)) {
    recipe = 'arched-mirror'; noun = 'Arched Mirror'; defaults = { w: 0.72, d: 0.35, h: 1.80, round: false };
  } else if (/(vanity|coiffeuse|makeup|maquillage)/.test(t)) {
    recipe = 'vanity-desk'; noun = 'Dressing Vanity'; defaults = { w: 1.10, d: 0.48, h: 0.76, round: false };
  } else if (/(stool|tabouret|bar)/.test(t) && !/(wine|vin)/.test(t)) {
    recipe = 'bar-stools'; noun = 'Counter Bar Stools'; defaults = { w: 1.15, d: 0.42, h: 0.85, round: false };
  } else if (/(wine|vin|cave|bar cabinet)/.test(t)) {
    recipe = 'wine-cabinet'; noun = 'Wine Cabinet'; defaults = { w: 0.90, d: 0.45, h: 1.65, round: false };
  } else if (/(lamp|lampe|lampadaire|arc|light|luminaire)/.test(t)) {
    recipe = 'arc-floor-lamp'; noun = 'Arc Floor Lamp'; defaults = { w: 0.45, d: 0.65, h: 1.85, round: false };
  } else if (/(armchair|fauteuil|lounge|reading chair|chair|chaise)/.test(t)) {
    recipe = 'curved-armchair'; noun = 'Curved Lounge Chair'; defaults = { w: 0.82, d: 0.82, h: 0.80, round: true };
  } else if (/(bench|banc|entr[eé]e)/.test(t) && !/(tv|media)/.test(t)) {
    recipe = 'entry-bench'; noun = 'Entryway Bench'; defaults = { w: 1.20, d: 0.42, h: 0.48, round: false };
  } else if (/(bookcase|biblioth|etag[eè]re|shelf|shelving|billy)/.test(t)) {
    recipe = 'designer-bookcase'; noun = 'Designer Bookcase'; defaults = { w: 1.20, d: 0.35, h: 2.02, round: false };
  } else if (/(coffee|basse|table)/.test(t)) {
    recipe = 'marble-coffee-table'; noun = isRound ? 'Round Coffee Table' : 'Coffee Table';
    defaults = { w: isRound ? 0.90 : 1.15, d: isRound ? 0.90 : 0.62, h: 0.39, round: isRound };
  } else if (/(tv|media|console)/.test(t)) {
    recipe = 'tv-slatted-console'; noun = 'Slatted Media Console'; defaults = { w: 1.80, d: 0.42, h: 0.52, round: false };
  }

  const dims = parseDimensions(t, defaults);
  const mats = parseMaterials(t);
  const parts = buildRecipeParts(recipe, { ...dims, ...mats });

  const item = {
    uid: `prompt-${Date.now().toString(36)}`,
    kind: 'customParametric',
    room: targetRoom,
    label: `${mats.label} ${noun} (${Math.round(dims.w * 100)}×${Math.round(dims.d * 100)})`,
    promptSource: prompt,
    w: dims.w,
    d: dims.d,
    h: dims.h,
    x: 0,
    z: 0,
    rotY: 0,
    spec: {
      recipe,
      w: dims.w,
      d: dims.d,
      h: dims.h,
      mainMat: mats.mainMat,
      accentMetal: mats.accentMetal,
      fabricMat: mats.fabricMat,
      parts
    }
  };

  return {
    type: 'spawnComponent',
    item,
    message: `Modelised "${item.label}" (${parts.length} parts) in ${targetRoom.toUpperCase()} — drag to position!`
  };
}

/**
 * Helper to apply an iterative local `editSelected` patch onto any furniture item.
 */
export function applyLocalEditPatch(item, patch) {
  if (item.kind === 'customGlb') {
    if (patch.scaleMult) item.scaleFactor = (item.scaleFactor || 1) * patch.scaleMult;
    return;
  }
  if (item.kind === 'sofa') {
    if (patch.sofaFabric) item.fabric = patch.sofaFabric;
    return;
  }
  if (item.kind === 'diningTable' || item.kind === 'bed') {
    if (patch.woodFinish) item.finish = patch.woodFinish;
    return;
  }
  if (item.kind === 'customParametric' && item.spec) {
    const s = item.spec;
    const mult = patch.scaleMult || 1;
    const nw = Math.max(0.25, Math.min(3.5, (s.w || item.w || 1) * mult + (patch.dw || 0)));
    const nd = Math.max(0.25, Math.min(3.0, (s.d || item.d || 0.5) * mult + (patch.dd || 0)));
    const nh = Math.max(0.18, Math.min(2.45, (s.h || item.h || 0.75) * mult + (patch.dh || 0)));
    item.w = s.w = nw;
    item.d = s.d = nd;
    item.h = s.h = nh;

    if (patch.woodFinish) s.mainMat = { type: 'wood', finish: patch.woodFinish };
    if (patch.isMarble) s.mainMat = { type: 'marble', color: '#F3F1EC' };
    if (patch.metalColor) s.accentMetal = { type: 'metal', color: patch.metalColor };
    if (patch.fabricHex) s.fabricMat = { type: 'fabric', color: patch.fabricHex };

    // Regenerate multi-part recipe geometry cleanly with new dims & materials!
    if (s.recipe) {
      s.parts = buildRecipeParts(s.recipe, {
        w: nw, d: nd, h: nh,
        mainMat: s.mainMat,
        accentMetal: s.accentMetal,
        fabricMat: s.fabricMat
      });
    } else if (Array.isArray(s.parts)) {
      // Scale arbitrary LLM parts proportionally
      const sx = nw / (s.w || nw);
      const sy = nh / (s.h || nh);
      const sz = nd / (s.d || nd);
      s.parts.forEach(p => {
        if (patch.woodFinish && p.mat?.type === 'wood') p.mat.finish = patch.woodFinish;
        if (patch.metalColor && p.mat?.type === 'metal') p.mat.color = patch.metalColor;
        if (patch.fabricHex && p.mat?.type === 'fabric') p.mat.color = patch.fabricHex;
      });
    }
    item.label = item.label.replace(/\(\d+×\d+\)/, `(${Math.round(nw * 100)}×${Math.round(nd * 100)})`);
    return;
  }
  // Standard quick-add furniture (wardrobe, tvUnit, sideboard, desk, coffeeTable, etc.)
  const mult = patch.scaleMult || 1;
  item.w = Math.max(0.25, Math.min(3.5, (item.w || 1) * mult + (patch.dw || 0)));
  item.d = Math.max(0.25, Math.min(3.0, (item.d || 0.5) * mult + (patch.dd || 0)));
  item.h = Math.max(0.18, Math.min(2.45, (item.h || 0.75) * mult + (patch.dh || 0)));
  if (patch.woodFinish && WOOD_FINISHES[patch.woodFinish]) item.finish = patch.woodFinish;
  if (patch.sofaFabric && SOFA_FABRICS.find(f => f.id === patch.sofaFabric)) item.finish = patch.sofaFabric;
}
