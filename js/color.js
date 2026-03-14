/**
 * Pixel color reading, averaging, and sampling orchestration.
 */

import { getSamplingPercents, getPointOnLine } from './geometry.js';

export function getPixelColor(imageData, x, y, width) {
  const i = (y * width + x) * 4;
  return {
    r: imageData.data[i],
    g: imageData.data[i + 1],
    b: imageData.data[i + 2],
  };
}

export function getAverageColor(imageData, cx, cy, imgWidth, imgHeight, areaSize) {
  if (areaSize <= 1) {
    return getPixelColor(imageData, cx, cy, imgWidth);
  }

  const half = Math.floor(areaSize / 2);
  let rSum = 0, gSum = 0, bSum = 0, count = 0;

  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const px = cx + dx;
      const py = cy + dy;
      if (px >= 0 && px < imgWidth && py >= 0 && py < imgHeight) {
        const c = getPixelColor(imageData, px, py, imgWidth);
        rSum += c.r;
        gSum += c.g;
        bSum += c.b;
        count++;
      }
    }
  }

  if (count === 0) return { r: 0, g: 0, b: 0 };

  return {
    r: Math.round(rSum / count),
    g: Math.round(gSum / count),
    b: Math.round(bSum / count),
  };
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function sampleColorsAlongLine(imageData, imgWidth, imgHeight, line, settings) {
  const percents = getSamplingPercents(settings.stepPercent);
  const points = [];

  for (const percent of percents) {
    const t = percent / 100;
    const { x, y } = getPointOnLine(line, t);

    // Clamp to image bounds
    const cx = Math.max(0, Math.min(imgWidth - 1, x));
    const cy = Math.max(0, Math.min(imgHeight - 1, y));

    const color = getAverageColor(imageData, cx, cy, imgWidth, imgHeight, settings.sampleAreaSize);
    const hex = rgbToHex(color.r, color.g, color.b);

    points.push({
      percent,
      t,
      x: cx,
      y: cy,
      r: color.r,
      g: color.g,
      b: color.b,
      hex,
    });
  }

  return points;
}
