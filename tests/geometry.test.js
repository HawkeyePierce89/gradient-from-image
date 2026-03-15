import { describe, it, expect } from 'vitest';
import {
  buildLineFromSettings,
  clampLineToBounds,
  clipLineToRect,
  getSamplingPercents,
  getPointOnLine,
} from '../js/geometry.js';

describe('getSamplingPercents', () => {
  it('returns correct percents for step=10', () => {
    const result = getSamplingPercents(10);
    expect(result).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  });

  it('returns correct percents for step=25', () => {
    const result = getSamplingPercents(25);
    expect(result).toEqual([0, 25, 50, 75, 100]);
  });

  it('returns correct percents for step=50', () => {
    const result = getSamplingPercents(50);
    expect(result).toEqual([0, 50, 100]);
  });

  it('returns [0, 100] for step=100', () => {
    const result = getSamplingPercents(100);
    expect(result).toEqual([0, 100]);
  });

  it('always includes 100% even if step does not divide evenly', () => {
    const result = getSamplingPercents(30);
    expect(result[result.length - 1]).toBe(100);
    expect(result).toEqual([0, 30, 60, 90, 100]);
  });

  it('defaults to step=10 for invalid values', () => {
    expect(getSamplingPercents(0)).toEqual(getSamplingPercents(10));
    expect(getSamplingPercents(-5)).toEqual(getSamplingPercents(10));
    expect(getSamplingPercents(NaN)).toEqual(getSamplingPercents(10));
    expect(getSamplingPercents(Infinity)).toEqual(getSamplingPercents(10));
  });

  it('clamps step to 1-100 range', () => {
    const result = getSamplingPercents(1);
    expect(result.length).toBe(101); // 0,1,2,...,100
    expect(result[0]).toBe(0);
    expect(result[100]).toBe(100);
  });
});

describe('getPointOnLine', () => {
  const line = { x1: 0, y1: 0, x2: 100, y2: 200 };

  it('returns start point at t=0', () => {
    expect(getPointOnLine(line, 0)).toEqual({ x: 0, y: 0 });
  });

  it('returns end point at t=1', () => {
    expect(getPointOnLine(line, 1)).toEqual({ x: 100, y: 200 });
  });

  it('returns midpoint at t=0.5', () => {
    expect(getPointOnLine(line, 0.5)).toEqual({ x: 50, y: 100 });
  });

  it('rounds coordinates to integers', () => {
    const l = { x1: 0, y1: 0, x2: 10, y2: 10 };
    const pt = getPointOnLine(l, 0.33);
    expect(Number.isInteger(pt.x)).toBe(true);
    expect(Number.isInteger(pt.y)).toBe(true);
  });

  it('works with a horizontal line', () => {
    const h = { x1: 0, y1: 50, x2: 200, y2: 50 };
    const pt = getPointOnLine(h, 0.5);
    expect(pt).toEqual({ x: 100, y: 50 });
  });

  it('works with a vertical line', () => {
    const v = { x1: 50, y1: 0, x2: 50, y2: 200 };
    const pt = getPointOnLine(v, 0.25);
    expect(pt).toEqual({ x: 50, y: 50 });
  });
});

describe('clampLineToBounds', () => {
  it('does not change a line already within bounds', () => {
    const line = { x1: 10, y1: 20, x2: 90, y2: 80 };
    expect(clampLineToBounds(line, 100, 100)).toEqual(line);
  });

  it('clips line preserving angle when endpoints are outside', () => {
    const line = { x1: -10, y1: -5, x2: 50, y2: 50 };
    const result = clampLineToBounds(line, 100, 100);
    // Clipped at the boundary, angle preserved
    expect(result.x1).toBeGreaterThanOrEqual(0);
    expect(result.y1).toBeGreaterThanOrEqual(0);
    expect(result.x2).toBe(50);
    expect(result.y2).toBe(50);
    // Verify angle is preserved
    const origSlope = (line.y2 - line.y1) / (line.x2 - line.x1);
    const clipSlope = (result.y2 - result.y1) / (result.x2 - result.x1);
    expect(clipSlope).toBeCloseTo(origSlope, 0);
  });

  it('clips line preserving angle when exceeding image dimensions', () => {
    const line = { x1: 50, y1: 50, x2: 200, y2: 150 };
    const result = clampLineToBounds(line, 100, 100);
    expect(result.x1).toBe(50);
    expect(result.y1).toBe(50);
    expect(result.x2).toBeLessThanOrEqual(99);
    expect(result.y2).toBeLessThanOrEqual(99);
    // Verify angle is preserved
    const origSlope = (line.y2 - line.y1) / (line.x2 - line.x1);
    const clipSlope = (result.y2 - result.y1) / (result.x2 - result.x1);
    expect(clipSlope).toBeCloseTo(origSlope, 0);
  });
});

describe('clipLineToRect', () => {
  it('does not change a line already within bounds', () => {
    const line = { x1: 10, y1: 20, x2: 90, y2: 80 };
    expect(clipLineToRect(line, 100, 100)).toEqual(line);
  });

  it('clips a diagonal line extending beyond bounds while preserving angle', () => {
    // Line from (-50, -50) to (150, 150) through a 100x100 image
    const line = { x1: -50, y1: -50, x2: 150, y2: 150 };
    const result = clipLineToRect(line, 100, 100);
    // Should clip to the rectangle, preserving 45-degree angle
    expect(result.x1).toBe(0);
    expect(result.y1).toBe(0);
    expect(result.x2).toBe(99);
    expect(result.y2).toBe(99);
  });

  it('preserves angle for offset diagonal lines', () => {
    // A diagonal line shifted up: one end out of bounds more than the other
    // Line from (-20, -30) to (180, 70) in 200x100 image
    const line = { x1: -20, y1: -30, x2: 180, y2: 70 };
    const result = clipLineToRect(line, 200, 100);
    // The clipped line should maintain the same slope
    const originalSlope = (line.y2 - line.y1) / (line.x2 - line.x1);
    const clippedSlope = (result.y2 - result.y1) / (result.x2 - result.x1);
    expect(clippedSlope).toBeCloseTo(originalSlope, 1);
  });

  it('handles horizontal line outside bounds', () => {
    const line = { x1: -10, y1: 50, x2: 110, y2: 50 };
    const result = clipLineToRect(line, 100, 100);
    expect(result.x1).toBe(0);
    expect(result.y1).toBe(50);
    expect(result.x2).toBe(99);
    expect(result.y2).toBe(50);
  });

  it('handles vertical line outside bounds', () => {
    const line = { x1: 50, y1: -10, x2: 50, y2: 110 };
    const result = clipLineToRect(line, 100, 100);
    expect(result.x1).toBe(50);
    expect(result.y1).toBe(0);
    expect(result.x2).toBe(50);
    expect(result.y2).toBe(99);
  });

  it('handles line entirely outside bounds', () => {
    const line = { x1: -50, y1: -50, x2: -10, y2: -10 };
    const result = clipLineToRect(line, 100, 100);
    // Degenerate case — endpoints clamped
    expect(result.x1).toBeGreaterThanOrEqual(0);
    expect(result.y1).toBeGreaterThanOrEqual(0);
  });
});

describe('buildLineFromSettings', () => {
  const imgW = 200;
  const imgH = 100;

  it('builds a horizontal line at 50% offset', () => {
    const line = buildLineFromSettings(imgW, imgH, {
      direction: 'horizontal',
      traversalDirection: 'forward',
      offsetPercent: 50,
      stepPercent: 10,
    });
    expect(line.x1).toBe(0);
    expect(line.x2).toBe(199);
    expect(line.y1).toBe(line.y2); // horizontal
    expect(line.y1).toBe(50); // 50% of 99
  });

  it('builds a horizontal line at 0% offset (top)', () => {
    const line = buildLineFromSettings(imgW, imgH, {
      direction: 'horizontal',
      traversalDirection: 'forward',
      offsetPercent: 0,
    });
    expect(line.y1).toBe(0);
    expect(line.y2).toBe(0);
  });

  it('builds a horizontal line at 100% offset (bottom)', () => {
    const line = buildLineFromSettings(imgW, imgH, {
      direction: 'horizontal',
      traversalDirection: 'forward',
      offsetPercent: 100,
    });
    expect(line.y1).toBe(99);
    expect(line.y2).toBe(99);
  });

  it('builds a vertical line at 50% offset', () => {
    const line = buildLineFromSettings(imgW, imgH, {
      direction: 'vertical',
      traversalDirection: 'forward',
      offsetPercent: 50,
    });
    expect(line.y1).toBe(0);
    expect(line.y2).toBe(99);
    expect(line.x1).toBe(line.x2);
    expect(line.x1).toBe(100); // 50% of 199
  });

  it('reverses traversal direction', () => {
    const forward = buildLineFromSettings(imgW, imgH, {
      direction: 'horizontal',
      traversalDirection: 'forward',
      offsetPercent: 50,
    });
    const reverse = buildLineFromSettings(imgW, imgH, {
      direction: 'horizontal',
      traversalDirection: 'reverse',
      offsetPercent: 50,
    });
    expect(reverse.x1).toBe(forward.x2);
    expect(reverse.y1).toBe(forward.y2);
    expect(reverse.x2).toBe(forward.x1);
    expect(reverse.y2).toBe(forward.y1);
  });

  it('builds a diagonal TL-BR line at 50% offset (no shift)', () => {
    const line = buildLineFromSettings(imgW, imgH, {
      direction: 'diagonal-tl-br',
      traversalDirection: 'forward',
      offsetPercent: 50,
    });
    // At 50% offset, no shift is applied
    expect(line.x1).toBe(0);
    expect(line.y1).toBe(0);
    expect(line.x2).toBe(199);
    expect(line.y2).toBe(99);
  });

  it('builds a diagonal TR-BL line at 50% offset', () => {
    const line = buildLineFromSettings(imgW, imgH, {
      direction: 'diagonal-tr-bl',
      traversalDirection: 'forward',
      offsetPercent: 50,
    });
    expect(line.x1).toBe(199);
    expect(line.y1).toBe(0);
    expect(line.x2).toBe(0);
    expect(line.y2).toBe(99);
  });

  it('shifts diagonal line with non-50% offset', () => {
    const line = buildLineFromSettings(imgW, imgH, {
      direction: 'diagonal-tl-br',
      traversalDirection: 'forward',
      offsetPercent: 0,
    });
    // At 0% offset, line is shifted by negative normal
    // Should still be clamped to bounds
    expect(line.x1).toBeGreaterThanOrEqual(0);
    expect(line.y1).toBeGreaterThanOrEqual(0);
  });

  it('defaults to horizontal midline for unknown direction', () => {
    const line = buildLineFromSettings(imgW, imgH, {
      direction: 'unknown',
      traversalDirection: 'forward',
      offsetPercent: 50,
    });
    expect(line.y1).toBe(line.y2);
    expect(line.x1).toBe(0);
    expect(line.x2).toBe(199);
  });

  it('diagonal lines maintain consistent angle across offsets', () => {
    const imgW = 200;
    const imgH = 100;
    // Get the angle at offset 50 (baseline)
    const baseLine = buildLineFromSettings(imgW, imgH, {
      direction: 'diagonal-tl-br',
      traversalDirection: 'forward',
      offsetPercent: 50,
    });
    const baseAngle = Math.atan2(baseLine.y2 - baseLine.y1, baseLine.x2 - baseLine.x1);

    // Test several offsets — they should all have the same angle
    for (const offset of [0, 10, 25, 75, 90, 100]) {
      const line = buildLineFromSettings(imgW, imgH, {
        direction: 'diagonal-tl-br',
        traversalDirection: 'forward',
        offsetPercent: offset,
      });
      // Skip degenerate lines (fully clipped to a point)
      if (line.x1 === line.x2 && line.y1 === line.y2) continue;
      const angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1);
      expect(angle).toBeCloseTo(baseAngle, 1);
    }
  });

  it('clamps offset to 0-100 range', () => {
    const lineNeg = buildLineFromSettings(imgW, imgH, {
      direction: 'horizontal',
      traversalDirection: 'forward',
      offsetPercent: -10,
    });
    expect(lineNeg.y1).toBe(0);

    const lineOver = buildLineFromSettings(imgW, imgH, {
      direction: 'horizontal',
      traversalDirection: 'forward',
      offsetPercent: 200,
    });
    expect(lineOver.y1).toBe(99);
  });
});
