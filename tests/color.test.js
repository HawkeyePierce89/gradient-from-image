import { describe, it, expect } from 'vitest';
import {
  getPixelColor,
  getAverageColor,
  rgbToHex,
  sampleColorsAlongLine,
} from '../js/color.js';

// Helper: create a fake ImageData-like object
function createImageData(width, height, fillFn) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const { r, g, b, a } = fillFn(x, y);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a !== undefined ? a : 255;
    }
  }
  return { data, width, height };
}

describe('rgbToHex', () => {
  it('converts black', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
  });

  it('converts white', () => {
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
  });

  it('converts red', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
  });

  it('converts a mid-range color', () => {
    expect(rgbToHex(171, 205, 239)).toBe('#abcdef');
  });

  it('pads single-digit hex values with zero', () => {
    expect(rgbToHex(1, 2, 3)).toBe('#010203');
  });
});

describe('getPixelColor', () => {
  const imageData = createImageData(10, 10, (x, y) => ({
    r: x * 25,
    g: y * 25,
    b: 100,
  }));

  it('reads pixel at (0, 0)', () => {
    const c = getPixelColor(imageData, 0, 0, 10);
    expect(c).toEqual({ r: 0, g: 0, b: 100 });
  });

  it('reads pixel at (5, 3)', () => {
    const c = getPixelColor(imageData, 5, 3, 10);
    expect(c).toEqual({ r: 125, g: 75, b: 100 });
  });

  it('reads pixel at bottom-right corner', () => {
    const c = getPixelColor(imageData, 9, 9, 10);
    expect(c).toEqual({ r: 225, g: 225, b: 100 });
  });
});

describe('getAverageColor', () => {
  // Solid red image
  const solidRed = createImageData(10, 10, () => ({ r: 200, g: 50, b: 30 }));

  it('returns exact color for areaSize=1', () => {
    const c = getAverageColor(solidRed, 5, 5, 10, 10, 1);
    expect(c).toEqual({ r: 200, g: 50, b: 30 });
  });

  it('returns same color for uniform image with areaSize=3', () => {
    const c = getAverageColor(solidRed, 5, 5, 10, 10, 3);
    expect(c).toEqual({ r: 200, g: 50, b: 30 });
  });

  it('returns same color for uniform image with areaSize=5', () => {
    const c = getAverageColor(solidRed, 5, 5, 10, 10, 5);
    expect(c).toEqual({ r: 200, g: 50, b: 30 });
  });

  it('handles edge pixels correctly (clamps to bounds)', () => {
    // At corner (0,0) with areaSize=3, only 4 pixels are in bounds
    const c = getAverageColor(solidRed, 0, 0, 10, 10, 3);
    expect(c).toEqual({ r: 200, g: 50, b: 30 });
  });

  it('averages different colors correctly', () => {
    // Create 2x2 image with known colors
    const img = createImageData(2, 2, (x, y) => {
      if (x === 0 && y === 0) return { r: 100, g: 0, b: 0 };
      if (x === 1 && y === 0) return { r: 200, g: 0, b: 0 };
      if (x === 0 && y === 1) return { r: 0, g: 100, b: 0 };
      return { r: 0, g: 200, b: 0 };
    });
    // Average of all 4 pixels centered at (0,0) with area 3
    // In-bounds: (0,0), (1,0), (0,1), (1,1)
    const c = getAverageColor(img, 0, 0, 2, 2, 3);
    expect(c.r).toBe(Math.round((100 + 200 + 0 + 0) / 4));
    expect(c.g).toBe(Math.round((0 + 0 + 100 + 200) / 4));
    expect(c.b).toBe(0);
  });
});

describe('sampleColorsAlongLine', () => {
  // Horizontal gradient: red on left, blue on right
  const width = 100;
  const height = 10;
  const gradientImg = createImageData(width, height, (x) => ({
    r: Math.round((x / (width - 1)) * 255),
    g: 0,
    b: Math.round(((width - 1 - x) / (width - 1)) * 255),
  }));

  const horizontalLine = { x1: 0, y1: 5, x2: 99, y2: 5 };

  it('returns correct number of sample points', () => {
    const points = sampleColorsAlongLine(gradientImg, width, height, horizontalLine, {
      stepPercent: 25,
      sampleAreaSize: 1,
    });
    expect(points.length).toBe(5); // 0, 25, 50, 75, 100
  });

  it('each point has required fields', () => {
    const points = sampleColorsAlongLine(gradientImg, width, height, horizontalLine, {
      stepPercent: 50,
      sampleAreaSize: 1,
    });
    for (const p of points) {
      expect(p).toHaveProperty('percent');
      expect(p).toHaveProperty('t');
      expect(p).toHaveProperty('x');
      expect(p).toHaveProperty('y');
      expect(p).toHaveProperty('r');
      expect(p).toHaveProperty('g');
      expect(p).toHaveProperty('b');
      expect(p).toHaveProperty('hex');
    }
  });

  it('first point is at the start of the line', () => {
    const points = sampleColorsAlongLine(gradientImg, width, height, horizontalLine, {
      stepPercent: 50,
      sampleAreaSize: 1,
    });
    expect(points[0].percent).toBe(0);
    expect(points[0].x).toBe(0);
    expect(points[0].y).toBe(5);
  });

  it('last point is at the end of the line', () => {
    const points = sampleColorsAlongLine(gradientImg, width, height, horizontalLine, {
      stepPercent: 50,
      sampleAreaSize: 1,
    });
    const last = points[points.length - 1];
    expect(last.percent).toBe(100);
    expect(last.x).toBe(99);
  });

  it('samples correct colors from a gradient', () => {
    const points = sampleColorsAlongLine(gradientImg, width, height, horizontalLine, {
      stepPercent: 50,
      sampleAreaSize: 1,
    });
    // At 0%: should be red-ish (r=0, b=255)
    expect(points[0].r).toBe(0);
    expect(points[0].b).toBe(255);
    // At 50%: should be purple-ish
    const mid = points[1];
    expect(mid.r).toBeGreaterThan(100);
    expect(mid.b).toBeGreaterThan(100);
    // At 100%: should be blue-ish (r=255, b=0)
    const last = points[2];
    expect(last.r).toBe(255);
    expect(last.b).toBe(0);
  });

  it('hex values are valid', () => {
    const points = sampleColorsAlongLine(gradientImg, width, height, horizontalLine, {
      stepPercent: 25,
      sampleAreaSize: 1,
    });
    for (const p of points) {
      expect(p.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('works with larger sample area', () => {
    const points = sampleColorsAlongLine(gradientImg, width, height, horizontalLine, {
      stepPercent: 50,
      sampleAreaSize: 3,
    });
    expect(points.length).toBe(3);
    // Colors should be slightly averaged but similar
    expect(points[0].r).toBeGreaterThanOrEqual(0);
    expect(points[0].r).toBeLessThanOrEqual(10); // near 0 at left edge
  });
});
