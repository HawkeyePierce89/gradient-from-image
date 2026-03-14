/**
 * Zoom & pan for the canvas viewport.
 * Scroll wheel zooms toward cursor. Drag to pan (when zoomed in).
 */

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.15;

export function initZoom(viewport, container, callbacks) {
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let fitZoom = 1; // the zoom level that fits the image in the viewport
  let canvasW = 0;
  let canvasH = 0;
  let panning = false;
  let panStartX = 0;
  let panStartY = 0;
  let panStartPanX = 0;
  let panStartPanY = 0;

  function setCanvasSize(w, h) {
    canvasW = w;
    canvasH = h;
    // Delay fitToView so the browser has time to lay out the viewport
    requestAnimationFrame(() => fitToView());
  }

  function fitToView() {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    if (canvasW === 0 || canvasH === 0) return;
    fitZoom = Math.min(vw / canvasW, vh / canvasH, 1);
    zoom = fitZoom;
    // Center
    panX = (vw - canvasW * zoom) / 2;
    panY = (vh - canvasH * zoom) / 2;
    applyTransform();
  }

  function applyTransform() {
    container.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    if (callbacks.onZoomChange) {
      callbacks.onZoomChange(zoom, fitZoom);
    }
  }

  function clampPan() {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const scaledW = canvasW * zoom;
    const scaledH = canvasH * zoom;

    if (scaledW <= vw) {
      panX = (vw - scaledW) / 2;
    } else {
      panX = Math.min(0, Math.max(vw - scaledW, panX));
    }
    if (scaledH <= vh) {
      panY = (vh - scaledH) / 2;
    } else {
      panY = Math.min(0, Math.max(vh - scaledH, panY));
    }
  }

  function zoomTo(newZoom, pivotX, pivotY) {
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    // Zoom toward pivot point (in viewport coords)
    const scale = newZoom / zoom;
    panX = pivotX - (pivotX - panX) * scale;
    panY = pivotY - (pivotY - panY) * scale;
    zoom = newZoom;
    clampPan();
    applyTransform();
  }

  function zoomCentered(newZoom) {
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    zoom = newZoom;
    // Always center the image after button zoom
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const scaledW = canvasW * zoom;
    const scaledH = canvasH * zoom;
    panX = (vw - scaledW) / 2;
    panY = (vh - scaledH) / 2;
    // If image overflows, clamp so edges don't show gaps
    if (scaledW > vw) panX = Math.min(0, Math.max(vw - scaledW, panX));
    if (scaledH > vh) panY = Math.min(0, Math.max(vh - scaledH, panY));
    applyTransform();
  }

  function zoomIn() {
    zoomCentered(zoom * (1 + ZOOM_STEP));
  }

  function zoomOut() {
    zoomCentered(zoom * (1 - ZOOM_STEP));
  }

  // Scroll wheel zoom
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? (1 + ZOOM_STEP) : (1 - ZOOM_STEP);
    zoomTo(zoom * factor, px, py);
  }, { passive: false });

  // Pan with mouse drag
  viewport.addEventListener('mousedown', (e) => {
    // Don't pan if crop overlay is active and handling its own events
    if (e.target.closest('#overlayCanvas.crop-active')) return;
    // Left button or middle button
    if (e.button === 0 || e.button === 1) {
      panning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      panStartPanX = panX;
      panStartPanY = panY;
      viewport.classList.add('panning');
      e.preventDefault();
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!panning) return;
    panX = panStartPanX + (e.clientX - panStartX);
    panY = panStartPanY + (e.clientY - panStartY);
    clampPan();
    applyTransform();
  });

  window.addEventListener('mouseup', () => {
    if (panning) {
      panning = false;
      viewport.classList.remove('panning');
    }
  });

  // Keyboard shortcuts: + / - / 0
  viewport.setAttribute('tabindex', '0');
  viewport.addEventListener('keydown', (e) => {
    if (e.key === '+' || e.key === '=') { zoomIn(); e.preventDefault(); }
    if (e.key === '-') { zoomOut(); e.preventDefault(); }
    if (e.key === '0') { fitToView(); e.preventDefault(); }
  });

  return {
    setCanvasSize,
    fitToView,
    zoomIn,
    zoomOut,
    getZoom: () => zoom,
    /** Convert viewport coordinates to canvas pixel coordinates */
    viewportToCanvas(vx, vy) {
      return {
        x: (vx - panX) / zoom,
        y: (vy - panY) / zoom,
      };
    },
  };
}
