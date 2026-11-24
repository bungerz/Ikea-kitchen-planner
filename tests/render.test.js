import test from 'node:test';
import assert from 'node:assert/strict';

import { RT_PROFILES } from '../src/raytracer.js';
import { puForward, puInverse } from '../src/core/denoise.js';

test('every path tracing profile renders one full sample per frame and stays short', () => {
  for (const p of Object.values(RT_PROFILES)) {
    assert.deepEqual(p.tiles, [1, 1], `${p.key} tiles`);
    assert.ok(p.targetSamples > 0 && p.targetSamples <= 256, `${p.key} spp`);
    assert.ok(['fast', 'balanced', 'high'].includes(p.denoiseQuality), `${p.key} denoise quality`);
  }
});

test('OIDN PU transfer function round-trips across the HDR range', () => {
  for (const y of [0, 1e-7, 1e-4, 0.02, 0.18, 1, 5, 100, 10000]) {
    const back = puInverse(puForward(y));
    assert.ok(Math.abs(back - y) <= Math.max(1e-9, y * 1e-6), `y=${y} -> ${back}`);
  }
  // monotonic
  assert.ok(puForward(0.1) < puForward(0.2) && puForward(1) < puForward(10));
});
