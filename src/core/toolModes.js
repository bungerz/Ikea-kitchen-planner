/* =========================================================================
 * SPATIAL STUDIO TOOL MODES STATE MACHINE
 * Solves accidental furniture drags by making 'navigate' (safe orbit) the
 * default mode and routing pointer events explicitly per tool mode.
 * Pure JS (zero DOM/WebGL dependency) so Node unit tests verify every rule!
 * ========================================================================= */

export const TOOL_MODES = {
  navigate: {
    id: 'navigate',
    label: 'Navigate',
    shortLabel: 'Orbit',
    key: '1',
    icon: '🖐',
    cursor: 'grab',
    hint: 'Drag anywhere to orbit · Click any item, kitchen, or wall to inspect'
  },
  arrange: {
    id: 'arrange',
    label: 'Arrange',
    shortLabel: 'Move',
    key: '2',
    icon: '✥',
    cursor: 'default',
    hint: 'Drag furniture to move (wall-snaps) · Drag orange knob to rotate · Right-drag to orbit'
  },
  paint: {
    id: 'paint',
    label: 'Paint',
    shortLabel: 'Paint',
    key: '3',
    icon: '🎨',
    cursor: 'cell',
    hint: 'Hover & click any interior wall to brush with active Dulux color · Right-drag to orbit'
  },
  measure: {
    id: 'measure',
    label: 'Measure',
    shortLabel: 'Measure',
    key: '4',
    icon: '📏',
    cursor: 'crosshair',
    hint: 'Click point A then B to measure exact cm · Right-drag to orbit'
  },
  studio: {
    id: 'studio',
    label: 'Studio',
    shortLabel: 'Studio',
    key: '5',
    icon: '📷',
    cursor: 'grab',
    hint: 'Frame your shot, scrub Ambilly sun, and launch Photo Render (RT)'
  }
};

export const TOOL_MODE_ORDER = ['navigate', 'arrange', 'paint', 'measure', 'studio'];

/**
 * Pure pointer-routing decision table.
 * @param {object} params
 * @param {'navigate'|'arrange'|'paint'|'measure'|'studio'} params.mode
 * @param {'pointerdown'|'click'} params.phase
 * @param {number} params.button - 0 = left, 1 = middle, 2 = right
 * @param {'none'|'movable'|'rotateHandle'|'kitchen'|'wall'} params.hitKind
 * @returns {'orbit'|'drag-furniture'|'rotate-furniture'|'select-movable'|'select-kitchen'|'select-wall'|'paint-wall'|'measure-point'|'deselect'|'noop'}
 */
export function resolvePointerAction({ mode = 'navigate', phase = 'pointerdown', button = 0, hitKind = 'none' }) {
  // Non-left mouse buttons ALWAYS belong to camera orbit/pan
  if (button !== 0) return 'orbit';

  if (mode === 'studio') {
    return phase === 'pointerdown' ? 'orbit' : 'noop';
  }

  if (mode === 'measure') {
    return phase === 'click' ? 'measure-point' : 'orbit';
  }

  if (mode === 'paint') {
    if (phase === 'pointerdown') return 'orbit';
    if (hitKind === 'wall') return 'paint-wall';
    return 'noop';
  }

  if (mode === 'navigate') {
    // CRITICAL SAFETY RULE: In Navigate mode, pointerdown NEVER grabs furniture!
    if (phase === 'pointerdown') return 'orbit';
    if (hitKind === 'movable') return 'select-movable';
    if (hitKind === 'kitchen') return 'select-kitchen';
    if (hitKind === 'wall') return 'select-wall';
    return 'deselect';
  }

  if (mode === 'arrange') {
    if (phase === 'pointerdown') {
      if (hitKind === 'rotateHandle') return 'rotate-furniture';
      if (hitKind === 'movable') return 'drag-furniture';
      return 'orbit';
    }
    if (hitKind === 'movable') return 'select-movable';
    if (hitKind === 'kitchen') return 'select-kitchen';
    if (hitKind === 'wall') return 'select-wall';
    return 'deselect';
  }

  return 'orbit';
}
