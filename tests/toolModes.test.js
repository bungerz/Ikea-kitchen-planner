import test from 'node:test';
import assert from 'node:assert/strict';

import { TOOL_MODES, TOOL_MODE_ORDER, resolvePointerAction } from '../src/core/toolModes.js';
import { createDefaultState } from '../src/core/state.js';

test('default app state boots into safe Navigate mode with drawers collapsed', () => {
  const st = createDefaultState();
  assert.equal(st.toolMode, 'navigate');
  assert.equal(st.openDrawer, null);
  assert.equal(st.theme, 'light');
  assert.deepEqual(TOOL_MODE_ORDER, ['navigate', 'arrange', 'paint', 'measure', 'studio']);
  for (const id of TOOL_MODE_ORDER) {
    assert.ok(TOOL_MODES[id], `Missing TOOL_MODES definition for ${id}`);
    assert.ok(TOOL_MODES[id].label && TOOL_MODES[id].hint && TOOL_MODES[id].key);
  }
});

test('Navigate mode NEVER drags furniture on pointerdown, while short clicks open inspector', () => {
  for (const hitKind of ['none', 'movable', 'rotateHandle', 'kitchen', 'wall']) {
    assert.equal(
      resolvePointerAction({ mode: 'navigate', phase: 'pointerdown', button: 0, hitKind }),
      'orbit',
      `Navigate pointerdown on ${hitKind} must orbit camera, never grab furniture`
    );
  }
  assert.equal(resolvePointerAction({ mode: 'navigate', phase: 'click', button: 0, hitKind: 'movable' }), 'select-movable');
  assert.equal(resolvePointerAction({ mode: 'navigate', phase: 'click', button: 0, hitKind: 'kitchen' }), 'select-kitchen');
  assert.equal(resolvePointerAction({ mode: 'navigate', phase: 'click', button: 0, hitKind: 'wall' }), 'select-wall');
  assert.equal(resolvePointerAction({ mode: 'navigate', phase: 'click', button: 0, hitKind: 'none' }), 'deselect');
});

test('Arrange mode drags furniture on left-drag, rotates on handle, and ALWAYS orbits on right-drag or empty floor', () => {
  assert.equal(resolvePointerAction({ mode: 'arrange', phase: 'pointerdown', button: 0, hitKind: 'movable' }), 'drag-furniture');
  assert.equal(resolvePointerAction({ mode: 'arrange', phase: 'pointerdown', button: 0, hitKind: 'rotateHandle' }), 'rotate-furniture');
  assert.equal(resolvePointerAction({ mode: 'arrange', phase: 'pointerdown', button: 0, hitKind: 'none' }), 'orbit');
  assert.equal(resolvePointerAction({ mode: 'arrange', phase: 'pointerdown', button: 0, hitKind: 'wall' }), 'orbit');

  // Right-click (button 2) and middle-click (button 1) ALWAYS orbit regardless of hit target
  for (const mode of TOOL_MODE_ORDER) {
    for (const hitKind of ['none', 'movable', 'rotateHandle', 'kitchen', 'wall']) {
      assert.equal(resolvePointerAction({ mode, phase: 'pointerdown', button: 2, hitKind }), 'orbit');
      assert.equal(resolvePointerAction({ mode, phase: 'pointerdown', button: 1, hitKind }), 'orbit');
    }
  }
});

test('Paint, Measure, and Studio modes route pointer actions cleanly without accidental furniture grabs', () => {
  // Paint mode
  assert.equal(resolvePointerAction({ mode: 'paint', phase: 'pointerdown', button: 0, hitKind: 'movable' }), 'orbit');
  assert.equal(resolvePointerAction({ mode: 'paint', phase: 'click', button: 0, hitKind: 'wall' }), 'paint-wall');
  assert.equal(resolvePointerAction({ mode: 'paint', phase: 'click', button: 0, hitKind: 'movable' }), 'noop');

  // Measure mode
  assert.equal(resolvePointerAction({ mode: 'measure', phase: 'pointerdown', button: 0, hitKind: 'movable' }), 'orbit');
  assert.equal(resolvePointerAction({ mode: 'measure', phase: 'click', button: 0, hitKind: 'none' }), 'measure-point');

  // Studio mode (framing & photo render only)
  assert.equal(resolvePointerAction({ mode: 'studio', phase: 'pointerdown', button: 0, hitKind: 'movable' }), 'orbit');
  assert.equal(resolvePointerAction({ mode: 'studio', phase: 'click', button: 0, hitKind: 'movable' }), 'noop');
  assert.equal(resolvePointerAction({ mode: 'studio', phase: 'click', button: 0, hitKind: 'wall' }), 'noop');
});
