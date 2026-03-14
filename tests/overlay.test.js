import { describe, it, expect } from 'vitest';
import { getCropHandles } from '../js/overlay.js';

describe('getCropHandles', () => {
  it('returns 8 handles', () => {
    const handles = getCropHandles(10, 20, 100, 80, 8);
    expect(handles.length).toBe(8);
  });

  it('places handles at correct positions', () => {
    const cx = 10, cy = 20, cw = 100, ch = 80;
    const handles = getCropHandles(cx, cy, cw, ch, 8);

    // NW corner
    expect(handles[0]).toMatchObject({ x: 10, y: 20 });
    // N center
    expect(handles[1]).toMatchObject({ x: 60, y: 20 });
    // NE corner
    expect(handles[2]).toMatchObject({ x: 110, y: 20 });
    // E center
    expect(handles[3]).toMatchObject({ x: 110, y: 60 });
    // SE corner
    expect(handles[4]).toMatchObject({ x: 110, y: 100 });
    // S center
    expect(handles[5]).toMatchObject({ x: 60, y: 100 });
    // SW corner
    expect(handles[6]).toMatchObject({ x: 10, y: 100 });
    // W center
    expect(handles[7]).toMatchObject({ x: 10, y: 60 });
  });

  it('each handle has a cursor property', () => {
    const handles = getCropHandles(0, 0, 200, 200, 8);
    const expectedCursors = [
      'nw-resize', 'n-resize', 'ne-resize', 'e-resize',
      'se-resize', 's-resize', 'sw-resize', 'w-resize',
    ];
    handles.forEach((h, i) => {
      expect(h.cursor).toBe(expectedCursors[i]);
    });
  });

  it('works with zero-position crop', () => {
    const handles = getCropHandles(0, 0, 50, 50, 8);
    expect(handles[0]).toMatchObject({ x: 0, y: 0 });
    expect(handles[4]).toMatchObject({ x: 50, y: 50 });
  });
});
