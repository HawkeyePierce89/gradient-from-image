import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initZoom } from '../js/zoom.js';

function createMockViewport(width = 800, height = 600) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: height, configurable: true });
  el.getBoundingClientRect = () => ({
    left: 0, top: 0, width, height, right: width, bottom: height, x: 0, y: 0,
  });
  return el;
}

function createMockContainer() {
  const el = document.createElement('div');
  el.style.transform = '';
  return el;
}

describe('initZoom', () => {
  let viewport, container, callbacks, zm;

  beforeEach(() => {
    viewport = createMockViewport(800, 600);
    container = createMockContainer();
    callbacks = { onZoomChange: vi.fn() };
  });

  function init() {
    zm = initZoom(viewport, container, callbacks);
    return zm;
  }

  describe('setCanvasSize + fitToView', () => {
    it('sets transform on container after setCanvasSize', async () => {
      init();
      zm.setCanvasSize(400, 300);
      // fitToView is called via rAF, trigger it
      await new Promise(r => requestAnimationFrame(r));
      expect(container.style.transform).toContain('translate');
      expect(container.style.transform).toContain('scale');
    });

    it('calls onZoomChange callback after fit', async () => {
      init();
      zm.setCanvasSize(400, 300);
      await new Promise(r => requestAnimationFrame(r));
      expect(callbacks.onZoomChange).toHaveBeenCalled();
    });

    it('fits a large canvas to viewport', async () => {
      init();
      zm.setCanvasSize(1600, 1200);
      await new Promise(r => requestAnimationFrame(r));
      // fitZoom should be min(800/1600, 600/1200, 1) = 0.5
      const [zoom, fitZoom] = callbacks.onZoomChange.mock.calls[0];
      expect(fitZoom).toBe(0.5);
      expect(zoom).toBe(fitZoom);
    });

    it('does not zoom beyond 1x for small canvas', async () => {
      init();
      zm.setCanvasSize(200, 100);
      await new Promise(r => requestAnimationFrame(r));
      const [zoom, fitZoom] = callbacks.onZoomChange.mock.calls[0];
      expect(fitZoom).toBe(1);
      expect(zoom).toBe(1);
    });
  });

  describe('zoomIn / zoomOut', () => {
    it('zoomIn increases zoom level', async () => {
      init();
      zm.setCanvasSize(1600, 1200);
      await new Promise(r => requestAnimationFrame(r));
      const [initialZoom] = callbacks.onZoomChange.mock.calls[0];

      zm.zoomIn();
      const [newZoom] = callbacks.onZoomChange.mock.calls.at(-1);
      expect(newZoom).toBeGreaterThan(initialZoom);
    });

    it('zoomOut decreases zoom level', async () => {
      init();
      zm.setCanvasSize(1600, 1200);
      await new Promise(r => requestAnimationFrame(r));
      // First zoom in to have room to zoom out
      zm.zoomIn();
      zm.zoomIn();
      const [afterZoomIn] = callbacks.onZoomChange.mock.calls.at(-1);

      zm.zoomOut();
      const [afterZoomOut] = callbacks.onZoomChange.mock.calls.at(-1);
      expect(afterZoomOut).toBeLessThan(afterZoomIn);
    });

    it('zoomIn keeps image centered (no drift)', async () => {
      init();
      zm.setCanvasSize(1600, 1200);
      await new Promise(r => requestAnimationFrame(r));

      zm.zoomIn();
      const transform = container.style.transform;
      // Parse translate values
      const match = transform.match(/translate\((.+?)px,\s*(.+?)px\)/);
      expect(match).not.toBeNull();
      const panX = parseFloat(match[1]);
      const panY = parseFloat(match[2]);

      // After zoom in from fit, image should still be centered
      // For centered: panX = (viewportW - canvasW * zoom) / 2
      const scaleMatch = transform.match(/scale\((.+?)\)/);
      const zoom = parseFloat(scaleMatch[1]);
      const scaledW = 1600 * zoom;
      const scaledH = 1200 * zoom;

      if (scaledW <= 800) {
        expect(panX).toBeCloseTo((800 - scaledW) / 2, 1);
      }
      if (scaledH <= 600) {
        expect(panY).toBeCloseTo((600 - scaledH) / 2, 1);
      }
    });
  });

  describe('fitToView', () => {
    it('resets zoom to fit level', async () => {
      init();
      zm.setCanvasSize(1600, 1200);
      await new Promise(r => requestAnimationFrame(r));

      zm.zoomIn();
      zm.zoomIn();
      zm.zoomIn();

      zm.fitToView();
      const [zoom, fitZoom] = callbacks.onZoomChange.mock.calls.at(-1);
      expect(zoom).toBe(fitZoom);
    });
  });

  describe('getZoom', () => {
    it('returns current zoom level', async () => {
      init();
      zm.setCanvasSize(1600, 1200);
      await new Promise(r => requestAnimationFrame(r));
      expect(zm.getZoom()).toBe(0.5);
    });
  });

  describe('viewportToCanvas', () => {
    it('converts viewport coords to canvas coords', async () => {
      init();
      zm.setCanvasSize(1600, 1200);
      await new Promise(r => requestAnimationFrame(r));
      // At fit zoom 0.5, canvas is centered
      // panX = (800 - 1600*0.5)/2 = 0, panY = (600 - 1200*0.5)/2 = 0
      const pt = zm.viewportToCanvas(400, 300);
      // x = (400 - 0) / 0.5 = 800, y = (300 - 0) / 0.5 = 600
      expect(pt.x).toBe(800);
      expect(pt.y).toBe(600);
    });
  });
});
