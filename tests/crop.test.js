import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initCrop } from '../js/crop.js';

// Mock canvas 2d context for jsdom
const noop = () => {};
const mockCtx = {
  clearRect: noop, fillRect: noop, strokeRect: noop,
  beginPath: noop, moveTo: noop, lineTo: noop, arc: noop,
  fill: noop, stroke: noop, save: noop, restore: noop,
  fillText: noop, setLineDash: noop,
  fillStyle: '', strokeStyle: '', lineWidth: 1,
  font: '', textAlign: '', shadowColor: '', shadowBlur: 0,
};

function createMockOverlayCanvas(width = 800, height = 600) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext = () => mockCtx;
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, width, height, right: width, bottom: height, x: 0, y: 0,
  });
  return canvas;
}

describe('initCrop', () => {
  let canvas, cropManager;
  const getDisplayScale = () => 0.5;
  const getImageDims = () => ({ width: 1600, height: 1200 });

  beforeEach(() => {
    canvas = createMockOverlayCanvas();
    cropManager = initCrop(canvas, getDisplayScale, getImageDims, {
      onCropChange: vi.fn(),
      onCropReset: vi.fn(),
    });
  });

  describe('start', () => {
    it('adds crop-active class to canvas', () => {
      cropManager.start();
      expect(canvas.classList.contains('crop-active')).toBe(true);
    });

    it('sets default crop rect (80% centered)', () => {
      cropManager.start();
      const rect = cropManager.getCropRect();
      expect(rect).not.toBeNull();
      // Default: 10% margin
      expect(rect.x).toBe(160); // 1600 * 0.1
      expect(rect.y).toBe(120); // 1200 * 0.1
      expect(rect.width).toBe(1280); // 1600 * 0.8
      expect(rect.height).toBe(960); // 1200 * 0.8
    });
  });

  describe('stop', () => {
    it('removes crop-active class', () => {
      cropManager.start();
      cropManager.stop();
      expect(canvas.classList.contains('crop-active')).toBe(false);
    });
  });

  describe('getCropRect', () => {
    it('returns null before start', () => {
      expect(cropManager.getCropRect()).toBeNull();
    });

    it('returns rect after start', () => {
      cropManager.start();
      const rect = cropManager.getCropRect();
      expect(rect).toHaveProperty('x');
      expect(rect).toHaveProperty('y');
      expect(rect).toHaveProperty('width');
      expect(rect).toHaveProperty('height');
    });
  });

  describe('reset', () => {
    it('clears the crop rect', () => {
      cropManager.start();
      expect(cropManager.getCropRect()).not.toBeNull();
      cropManager.reset();
      expect(cropManager.getCropRect()).toBeNull();
    });

    it('removes crop-active class', () => {
      cropManager.start();
      cropManager.reset();
      expect(canvas.classList.contains('crop-active')).toBe(false);
    });
  });
});
