import { DULUX_PAINTS, DOORS } from './catalogs/materials.js';
import { IKEA_BEDS, IKEA_SOFAS, MOBILIFIVER_TABLES, ROOMS } from './catalogs/furniture.js';

/* =========================================================================
 * PROMPT COMPONENT STUDIO (PHASE 1 LIVE ENGINE + PHASE 2 LLM SPEC READY)
 * Parses natural English/French prompts to either:
 * 1) Modify rooms, Dulux Valentine paint, IKEA beds/sofas, Mobili Fiver table, kitchen
 * 2) Modelise a brand-new parametric 3D furniture component & place it in the apartment!
 * ========================================================================= */

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
  // Match "180x45x80", "180 x 45", "1.6m", "90cm"
  const tri = text.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)(?:\s*[x×]\s*(\d+(?:[.,]\d+)?))?\s*(cm|m)?/i);
  const toM = (valStr, unit) => {
    const v = parseFloat(valStr.replace(',', '.'));
    if (unit && unit.toLowerCase() === 'm') return v;
    return v > 6 ? v / 100 : v; // numbers > 6 assumed cm
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
    const val = Math.max(0.30, Math.min(3.2, toM(single[1], single[2])));
    return { w: val, d: defaults.round ? val : defaults.d, h: defaults.h };
  }
  return { w: defaults.w, d: defaults.d, h: defaults.h };
}

function parseMaterialSpec(text) {
  const t = text.toLowerCase();
  if (/noyer|walnut/.test(t)) return { woodFinish: 'walnut', label: 'Walnut' };
  if (/ch[eê]ne|oak/.test(t)) return { woodFinish: 'oak', label: 'Oak' };
  if (/bouleau|birch/.test(t)) return { woodFinish: 'birch', label: 'Birch' };
  if (/marbre|marble/.test(t)) return { isMarble: true, colorHex: '#F3F1EC', label: 'Marble' };
  if (/laiton|brass|gold|dor[eé]/.test(t)) return { isMetal: true, colorHex: '#C8A156', label: 'Brass' };
  if (/sauge|sage|eucalyptus|vert|green/.test(t)) return { isFabric: true, colorHex: '#8E9F90', label: 'Sage' };
  if (/terracotta|argile|clay/.test(t)) return { isFabric: true, colorHex: '#C5846D', label: 'Terracotta' };
  if (/taupe/.test(t)) return { isFabric: true, colorHex: '#B8ACA0', label: 'Taupe' };
  if (/bleu|navy|blue/.test(t)) return { isFabric: true, colorHex: '#3E5568', label: 'Navy' };
  if (/lin|linen|beige|cr[eè]me|boucl[eé]/.test(t)) return { isFabric: true, colorHex: '#DFD6C7', label: 'Linen Beige' };
  if (/noir|black|anthracite|charcoal/.test(t)) return { woodFinish: 'blackAsh', label: 'Black Ash' };
  if (/blanc|white/.test(t)) return { woodFinish: 'white', label: 'Matte White' };
  return { woodFinish: 'walnut', label: 'Walnut' };
}

/**
 * Evaluates a user prompt and returns a structured command object for main.js to execute.
 */
export function interpretPrompt(rawPrompt, activeRoom = 'sejour') {
  const prompt = (rawPrompt || '').trim();
  const t = prompt.toLowerCase();
  if (!prompt) return { type: 'noop', message: 'Enter a prompt to modelise or edit a component.' };

  const targetRoom = detectRoomFromPrompt(t, activeRoom);

  // 1. Paint wall command? ("paint ch3 light taupe", "peindre wc vert sauge")
  if (/(paint|peind|peinture|mur|wall|dulux|couleur|color)/.test(t)) {
    const accentOnly = /(accent|headboard|t[eê]te de lit|un mur|one wall)/.test(t);
    let paint = DULUX_PAINTS.find(p =>
      t.includes(p.name.toLowerCase()) ||
      t.includes(p.shortName.toLowerCase()) ||
      t.includes(p.id.replace('dv-', ''))
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

  // 2. Extend / retract Mobili Fiver table?
  if (/(extend|rallong|agrand|table|mobilifiver|mobili fiver|retract|fermer)/.test(t) && !/(add|create|cr[eé]er|ajout|coffee|basse)/.test(t)) {
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
        message: `Updated Mobili Fiver table${matchedModel ? ` to ${matchedModel.name}` : ''}${extStep !== null ? ` (extension step ${extStep}/2)` : ''}`
      };
    }
  }

  // 3. Swap IKEA Bed model?
  const matchedBed = IKEA_BEDS.find(b => t.includes(b.id) || t.includes(b.series.toLowerCase()));
  if (matchedBed) {
    const bedRoom = ['ch3', 'ch1', 'ch2'].includes(targetRoom) ? targetRoom : 'ch3';
    return {
      type: 'updateBed',
      roomId: bedRoom,
      modelId: matchedBed.id,
      message: `Swapped ${bedRoom.toUpperCase()} Queen Bed → IKEA ${matchedBed.name}`
    };
  }

  // 4. Swap IKEA Sofa model?
  const matchedSofa = IKEA_SOFAS.find(s => t.includes(s.id) || t.includes(s.name.toLowerCase()));
  if (matchedSofa) {
    return {
      type: 'updateSofa',
      modelId: matchedSofa.id,
      message: `Swapped Living Room Sofa → IKEA ${matchedSofa.name}`
    };
  }

  // 5. Swap Kitchen Door?
  const matchedDoor = DOORS.find(d => t.includes(d.id.split('-')[0]));
  if (matchedDoor && /(kitchen|cuisine|door|porte|fa[cç]ade|metod)/.test(t)) {
    return {
      type: 'updateKitchenDoor',
      doorId: matchedDoor.id,
      message: `Swapped IKEA METOD Kitchen Fronts → ${matchedDoor.name}`
    };
  }

  // 6. GENERATE NEW PARAMETRIC 3D COMPONENT FROM PROMPT!
  const isRound = /round|rond|circul|oval/.test(t);
  let archetype = 'cabinet';
  let defaults = { w: 1.40, d: 0.44, h: 0.78, round: isRound };
  let noun = 'Sideboard';

  if (/(bookcase|biblioth|etag[eè]re|shelf|shelving|billy)/.test(t)) {
    archetype = 'bookcase';
    defaults = { w: 1.20, d: 0.34, h: 2.02, round: false };
    noun = 'Bookcase';
  } else if (/(table|console|bureau|desk)/.test(t)) {
    archetype = 'table';
    const isCoffee = /(coffee|basse)/.test(t);
    defaults = isCoffee
      ? { w: isRound ? 0.90 : 1.15, d: isRound ? 0.90 : 0.60, h: 0.40, round: isRound }
      : { w: 1.35, d: 0.65, h: 0.75, round: isRound };
    noun = isCoffee ? 'Coffee Table' : 'Table';
  } else if (/(bench|banc|pouf|stool|chair|fauteuil|seat|ottoman)/.test(t)) {
    archetype = 'seat';
    defaults = { w: 1.20, d: 0.45, h: 0.46, round: false };
    noun = 'Bench / Seat';
  } else if (/(dresser|commode|buffet|credenza|sideboard|tv|meuble|cabinet|closet|wardrobe)/.test(t)) {
    archetype = 'cabinet';
    defaults = { w: 1.50, d: 0.45, h: 0.80, round: false };
    noun = 'Cabinet';
  }

  const dims = parseDimensions(t, defaults);
  const matSpec = parseMaterialSpec(t);
  const roomObj = ROOMS.find(r => r.id === targetRoom) || ROOMS[0];
  const cx = (roomObj.bounds.minX + roomObj.bounds.maxX) / 2;
  const cz = (roomObj.bounds.minZ + roomObj.bounds.maxZ) / 2;

  const item = {
    uid: `prompt-${Date.now().toString(36)}`,
    kind: 'customParametric',
    room: targetRoom,
    label: `${matSpec.label} ${noun} (${Math.round(dims.w * 100)}×${Math.round(dims.d * 100)})`,
    promptSource: prompt,
    w: dims.w,
    d: dims.d,
    h: dims.h,
    x: Math.round(cx * 20) / 20,
    z: Math.round(cz * 20) / 20,
    rotY: 0,
    spec: {
      archetype,
      shape: isRound ? 'round' : 'rect',
      w: dims.w,
      d: dims.d,
      h: dims.h,
      ...matSpec
    }
  };

  return {
    type: 'spawnComponent',
    item,
    message: `Modelised "${item.label}" and placed it in ${roomObj.shortName} — drag to position!`
  };
}
