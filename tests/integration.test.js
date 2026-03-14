import { describe, it, expect } from 'vitest';
import { buildLineFromSettings, getSamplingPercents, getPointOnLine } from '../js/geometry.js';
import { getPixelColor, getAverageColor, rgbToHex, sampleColorsAlongLine } from '../js/color.js';
import { buildCssGradient, buildColorsList, buildJson } from '../js/export.js';

// Helper: create a fake ImageData
function createImageData(width, height, fillFn) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const { r, g, b } = fillFn(x, y);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

describe('Full pipeline: image → line → sample → export', () => {
  // 200x100 image with horizontal red-to-blue gradient
  const width = 200;
  const height = 100;
  const imageData = createImageData(width, height, (x) => ({
    r: Math.round((x / (width - 1)) * 255),
    g: 0,
    b: Math.round(((width - 1 - x) / (width - 1)) * 255),
  }));

  it('horizontal line at 50% offset produces correct gradient', () => {
    const settings = {
      direction: 'horizontal',
      traversalDirection: 'forward',
      offsetPercent: 50,
      stepPercent: 25,
      sampleAreaSize: 1,
    };

    const line = buildLineFromSettings(width, height, settings);
    expect(line.y1).toBe(50);
    expect(line.y2).toBe(50);

    const points = sampleColorsAlongLine(imageData, width, height, line, settings);
    expect(points.length).toBe(5);

    // First point should be mostly blue (left edge)
    expect(points[0].r).toBe(0);
    expect(points[0].b).toBe(255);

    // Last point should be mostly red (right edge)
    const last = points[points.length - 1];
    expect(last.r).toBe(255);
    expect(last.b).toBe(0);

    // CSS gradient should be valid
    const css = buildCssGradient(points);
    expect(css).toContain('linear-gradient');
    expect(css).toContain('0%');
    expect(css).toContain('100%');

    // Colors list should have 5 colors
    const colors = buildColorsList(points);
    expect(colors.split(', ').length).toBe(5);

    // JSON should be valid
    const json = buildJson(points);
    const parsed = JSON.parse(json);
    expect(parsed.length).toBe(5);
  });

  it('reverse traversal swaps start and end colors', () => {
    const forwardSettings = {
      direction: 'horizontal',
      traversalDirection: 'forward',
      offsetPercent: 50,
      stepPercent: 50,
      sampleAreaSize: 1,
    };
    const reverseSettings = { ...forwardSettings, traversalDirection: 'reverse' };

    const forwardLine = buildLineFromSettings(width, height, forwardSettings);
    const reverseLine = buildLineFromSettings(width, height, reverseSettings);

    const forwardPoints = sampleColorsAlongLine(imageData, width, height, forwardLine, forwardSettings);
    const reversePoints = sampleColorsAlongLine(imageData, width, height, reverseLine, reverseSettings);

    // First color of forward should match last color of reverse
    expect(forwardPoints[0].hex).toBe(reversePoints[reversePoints.length - 1].hex);
    expect(forwardPoints[forwardPoints.length - 1].hex).toBe(reversePoints[0].hex);
  });

  it('vertical line samples along height', () => {
    // Create image with vertical gradient
    const vImgData = createImageData(width, height, (_, y) => ({
      r: Math.round((y / (height - 1)) * 255),
      g: 0,
      b: 0,
    }));

    const settings = {
      direction: 'vertical',
      traversalDirection: 'forward',
      offsetPercent: 50,
      stepPercent: 50,
      sampleAreaSize: 1,
    };

    const line = buildLineFromSettings(width, height, settings);
    const points = sampleColorsAlongLine(vImgData, width, height, line, settings);

    // At top (0%): r should be 0
    expect(points[0].r).toBe(0);
    // At bottom (100%): r should be 255
    expect(points[points.length - 1].r).toBe(255);
  });

  it('changing step affects number of sampled points', () => {
    const settings10 = {
      direction: 'horizontal',
      traversalDirection: 'forward',
      offsetPercent: 50,
      stepPercent: 10,
      sampleAreaSize: 1,
    };
    const settings25 = { ...settings10, stepPercent: 25 };

    const line = buildLineFromSettings(width, height, settings10);
    const points10 = sampleColorsAlongLine(imageData, width, height, line, settings10);
    const points25 = sampleColorsAlongLine(imageData, width, height, line, settings25);

    expect(points10.length).toBe(11); // 0,10,20,...,100
    expect(points25.length).toBe(5);  // 0,25,50,75,100
  });

  it('3x3 sample area averages nearby pixels', () => {
    // Create image where center pixel differs from neighbors
    const size = 5;
    const spotImg = createImageData(size, size, (x, y) => {
      if (x === 2 && y === 2) return { r: 255, g: 0, b: 0 };
      return { r: 0, g: 0, b: 0 };
    });

    // Sample at the center pixel
    const color1x1 = getAverageColor(spotImg, 2, 2, size, size, 1);
    const color3x3 = getAverageColor(spotImg, 2, 2, size, size, 3);

    // 1x1 should be the red pixel
    expect(color1x1.r).toBe(255);
    // 3x3 averages 9 pixels: 1 red + 8 black = 255/9 ≈ 28
    expect(color3x3.r).toBe(Math.round(255 / 9));
    expect(color3x3.r).toBeLessThan(color1x1.r);
  });
});
