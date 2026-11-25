import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findUrl,
  extractJson,
  callGemini,
  listGeminiModels,
  resolvePlacement,
  importProductFromUrl,
  applyImportPlacement,
  getReplacedLightPointIds,
  CEILING_HEIGHT_M
} from '../src/productImport.js';
import { createDefaultState } from '../src/core/state.js';
import { computeApartmentBudget } from '../src/core/budget.js';

const MDM_URL = 'https://www.maisonsdumonde.com/FR/fr/p/suspension-en-lin-beige-creme-oe85-cm-mirave-246899.htm';

const jsonResp = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body
});
const geminiText = (text, extra = {}) => jsonResp({ candidates: [{ content: { parts: [{ text }] }, ...extra }] });

test('findUrl extracts a product link and strips trailing punctuation', () => {
  assert.equal(findUrl(`${MDM_URL}, replace the dining pendant`), MDM_URL);
  assert.equal(findUrl('add a walnut sideboard'), null);
});

test('extractJson handles fences, prose and nested braces', () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Here you go: {"a":{"b":"}"}} hope it helps'), { a: { b: '}' } });
  assert.throws(() => extractJson('no json here'), /no JSON/);
});

test('callGemini surfaces the API error message instead of swallowing it', async () => {
  const fetchImpl = async () => jsonResp({ error: { message: 'models/gemini-old is not found' } }, 404);
  await assert.rejects(
    callGemini({ apiKey: 'k', model: 'gemini-old', system: 's', user: 'u' }, fetchImpl),
    /Gemini 404: models\/gemini-old is not found/
  );
});

test('callGemini drops JSON mode when tools are used', async () => {
  let sent;
  const fetchImpl = async (_url, init) => { sent = JSON.parse(init.body); return geminiText('{}'); };
  await callGemini({ apiKey: 'k', model: 'm', system: 's', user: 'u', tools: [{ url_context: {} }] }, fetchImpl);
  assert.deepEqual(sent.tools, [{ url_context: {} }]);
  assert.equal(sent.generationConfig.responseMimeType, undefined);
  await callGemini({ apiKey: 'k', model: 'm', system: 's', user: 'u' }, fetchImpl);
  assert.equal(sent.generationConfig.responseMimeType, 'application/json');
});

test('listGeminiModels keeps generateContent Gemini models, Flash first', async () => {
  const fetchImpl = async () => jsonResp({
    models: [
      { name: 'models/gemini-3-pro', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
      { name: 'models/gemini-3-flash', supportedGenerationMethods: ['generateContent'] }
    ]
  });
  assert.deepEqual(await listGeminiModels('k', fetchImpl), ['gemini-3-flash', 'gemini-3-pro']);
});

test('resolvePlacement validates ids and falls back to add', () => {
  const state = createDefaultState();
  const sofa = state.items.find(i => i.kind === 'sofa');
  assert.deepEqual(
    resolvePlacement({ action: 'replace', target: { type: 'lightPoint', id: 'dcl-sejour-dining' } }, state),
    { action: 'replace', room: 'sejour', target: { type: 'lightPoint', id: 'dcl-sejour-dining' } }
  );
  assert.equal(resolvePlacement({ action: 'replace', target: { type: 'item', id: sofa.uid } }, state).target.id, sofa.uid);
  assert.deepEqual(
    resolvePlacement({ action: 'replace', room: 'nowhere', target: { type: 'item', id: 'ghost' } }, state, 'ch2'),
    { action: 'add', room: 'ch2', target: null }
  );
});

test('importProductFromUrl: Mirave pendant replaces the dining light, price goes to the budget', async () => {
  const state = createDefaultState();
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    if (body.tools) {
      return geminiText(
        'Found it: ```json\n' + JSON.stringify({
          name: 'Suspension en lin beige crème D85 MIRAVE', vendor: 'Maisons du Monde', priceEur: 149.99,
          dimensionsCm: { diameter: 85, h: 40 }, materials: ['linen'], mount: 'ceiling'
        }) + '\n```',
        { urlContextMetadata: { urlMetadata: [{ retrievedUrl: MDM_URL, urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_SUCCESS' }] } }
      );
    }
    return geminiText(JSON.stringify({
      name: 'Mirave', w: 0.85, d: 0.85, h: 0.9,
      parts: [
        { shape: 'cylinder', pos: [0, 0.89, 0], size: [0.12, 0.02, 0.12], mat: { type: 'metal', color: '#EEE' } },
        { shape: 'cylinder', pos: [0, 0.6, 0], size: [0.01, 0.6, 0.01], mat: { type: 'matte', color: '#EEE' } },
        { shape: 'dome', pos: [0, 0.15, 0], size: [0.85, 0.3, 0.85], mat: { type: 'fabric', color: '#E8E1D5' } }
      ],
      placement: { action: 'replace', room: 'sejour', target: { type: 'lightPoint', id: 'dcl-sejour-dining' } }
    }));
  };

  const res = await importProductFromUrl(`${MDM_URL} replace the pendant above the dining table`, MDM_URL,
    { provider: 'gemini', apiKey: 'test-key-123456', model: 'gemini-3-flash' }, { state, fetchImpl });

  assert.equal(calls.length, 2);
  assert.equal(res.type, 'importProduct');
  assert.equal(res.item.priceEur, 149.99);
  assert.equal(res.item.sourceUrl, MDM_URL);
  assert.match(res.message, /149\.99 €/);

  const before = computeApartmentBudget(state);
  const { item } = applyImportPlacement(state, res, () => { throw new Error('should not search for a free spot'); });
  assert.equal(item.replacesLightPoint, 'dcl-sejour-dining');
  assert.equal(item.x, 1.55);
  assert.equal(item.z, 6.40);
  assert.ok(Math.abs(item.y - (CEILING_HEIGHT_M - 0.9)) < 1e-9);
  assert.ok(getReplacedLightPointIds(state.items).has('dcl-sejour-dining'));

  const after = computeApartmentBudget(state);
  const line = after.lines.find(l => l.url === MDM_URL);
  assert.equal(line.totalEur, 149.99);
  assert.ok(!after.lines.some(l => l.category === 'Lighting' && l.detail === 'dcl-sejour-dining'));
  // stock fixture removed from Lighting, 149.99€ product added under Furniture
  const stockFixture = before.lines.find(l => l.category === 'Lighting' && l.detail === 'dcl-sejour-dining');
  assert.ok(Math.abs((after.totals.grandTotalEur - before.totals.grandTotalEur) - (149.99 - stockFixture.totalEur)) < 0.01);
});

test('applyImportPlacement: replacing an item keeps its position and removes it', () => {
  const state = createDefaultState();
  const sofa = state.items.find(i => i.kind === 'sofa');
  const res = {
    item: { uid: 'url-x', kind: 'customParametric', room: 'sejour', mount: 'floor', w: 2, d: 0.9, h: 0.8, x: 0, z: 0, rotY: 0, spec: { parts: [] } },
    placement: { action: 'replace', room: 'sejour', target: { type: 'item', id: sofa.uid } }
  };
  const { item, removed } = applyImportPlacement(state, res, () => ({ x: 0, z: 0 }));
  assert.equal(removed[0].uid, sofa.uid);
  assert.deepEqual([item.x, item.z, item.rotY], [sofa.x, sofa.z, sofa.rotY || 0]);
  assert.ok(!state.items.some(i => i.uid === sofa.uid));
  assert.equal(item.y, undefined);
});

test('importProductFromUrl: missing price stays null and budget falls back to the estimate', async () => {
  const state = createDefaultState();
  const fetchImpl = async (_u, init) => JSON.parse(init.body).tools
    ? geminiText(JSON.stringify({ name: 'Chaise <b>X</b>', priceEur: null, mount: 'floor' }))
    : geminiText(JSON.stringify({ w: 0.5, d: 0.5, h: 0.8, parts: [{ shape: 'box', pos: [0, 0.4, 0], size: [0.5, 0.8, 0.5] }], placement: { action: 'add', room: 'ch2' } }));
  const res = await importProductFromUrl(`${MDM_URL} add it in chambre 2`, MDM_URL, { provider: 'gemini', apiKey: 'k', model: 'm' }, { state, fetchImpl });
  assert.equal(res.item.priceEur, undefined);
  assert.equal(res.item.label, 'Chaise bX/b');
  assert.equal(res.placement.room, 'ch2');
  assert.match(res.message, /price not found/);
  applyImportPlacement(state, res, () => ({ x: 7, z: 8.5, rotY: 0 }));
  const line = computeApartmentBudget(state).lines.find(l => l.url === MDM_URL);
  assert.equal(line.totalEur, 350);
  assert.match(line.detail, /price not found/);
});
