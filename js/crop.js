/**
 * Crop UI: mouse-based crop rectangle creation, resizing, moving.
 */

import { renderCropOverlay, getCropHandles } from './overlay.js';

const HANDLE_HIT = 10;

export function initCrop(overlayCanvas, getDisplayScale, getImageDims, callbacks) {
  let active = false;
  let cropRect = null; // in image coordinates
  let dragging = null; // { type: 'move' | 'create' | handle-index, startX, startY, startRect }

  function toImage(canvasX, canvasY) {
    const s = getDisplayScale();
    return { x: canvasX / s, y: canvasY / s };
  }

  function getCanvasPos(e) {
    const rect = overlayCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function hitTestHandle(px, py) {
    if (!cropRect) return -1;
    const s = getDisplayScale();
    const cx = cropRect.x * s;
    const cy = cropRect.y * s;
    const cw = cropRect.width * s;
    const ch = cropRect.height * s;
    const handles = getCropHandles(cx, cy, cw, ch, 8);
    for (let i = 0; i < handles.length; i++) {
      if (Math.abs(px - handles[i].x) < HANDLE_HIT && Math.abs(py - handles[i].y) < HANDLE_HIT) {
        return i;
      }
    }
    return -1;
  }

  function isInsideCrop(px, py) {
    if (!cropRect) return false;
    const s = getDisplayScale();
    const cx = cropRect.x * s;
    const cy = cropRect.y * s;
    const cw = cropRect.width * s;
    const ch = cropRect.height * s;
    return px >= cx && px <= cx + cw && py >= cy && py <= cy + ch;
  }

  function clampRect(r) {
    const { width: imgW, height: imgH } = getImageDims();
    let x = Math.max(0, Math.round(r.x));
    let y = Math.max(0, Math.round(r.y));
    let w = Math.round(r.width);
    let h = Math.round(r.height);
    if (x + w > imgW) w = imgW - x;
    if (y + h > imgH) h = imgH - y;
    if (w < 10) w = 10;
    if (h < 10) h = 10;
    return { x, y, width: w, height: h };
  }

  function onMouseDown(e) {
    if (!active) return;
    const pos = getCanvasPos(e);
    const handleIdx = hitTestHandle(pos.x, pos.y);

    if (handleIdx >= 0) {
      dragging = { type: handleIdx, startX: pos.x, startY: pos.y, startRect: { ...cropRect } };
    } else if (isInsideCrop(pos.x, pos.y)) {
      dragging = { type: 'move', startX: pos.x, startY: pos.y, startRect: { ...cropRect } };
    } else {
      const imgPt = toImage(pos.x, pos.y);
      cropRect = clampRect({ x: imgPt.x, y: imgPt.y, width: 10, height: 10 });
      dragging = { type: 'create', startX: pos.x, startY: pos.y, startRect: { ...cropRect } };
    }
    redraw();
  }

  function onMouseMove(e) {
    if (!active) return;
    const pos = getCanvasPos(e);

    if (!dragging) {
      // Update cursor
      const handleIdx = hitTestHandle(pos.x, pos.y);
      if (handleIdx >= 0) {
        const cursors = ['nw-resize', 'n-resize', 'ne-resize', 'e-resize', 'se-resize', 's-resize', 'sw-resize', 'w-resize'];
        overlayCanvas.style.cursor = cursors[handleIdx];
      } else if (isInsideCrop(pos.x, pos.y)) {
        overlayCanvas.style.cursor = 'move';
      } else {
        overlayCanvas.style.cursor = 'crosshair';
      }
      return;
    }

    const s = getDisplayScale();
    const dx = (pos.x - dragging.startX) / s;
    const dy = (pos.y - dragging.startY) / s;
    const sr = dragging.startRect;

    if (dragging.type === 'move') {
      cropRect = clampRect({ x: sr.x + dx, y: sr.y + dy, width: sr.width, height: sr.height });
    } else if (dragging.type === 'create') {
      const imgPt = toImage(pos.x, pos.y);
      const startImg = toImage(dragging.startX, dragging.startY);
      const x1 = Math.min(startImg.x, imgPt.x);
      const y1 = Math.min(startImg.y, imgPt.y);
      const x2 = Math.max(startImg.x, imgPt.x);
      const y2 = Math.max(startImg.y, imgPt.y);
      cropRect = clampRect({ x: x1, y: y1, width: x2 - x1, height: y2 - y1 });
    } else {
      // Handle resize
      cropRect = resizeByHandle(dragging.type, sr, dx, dy);
    }

    redraw();
    if (callbacks.onCropChange) callbacks.onCropChange(cropRect);
  }

  function onMouseUp() {
    dragging = null;
  }

  function resizeByHandle(handleIdx, sr, dx, dy) {
    let { x, y, width, height } = sr;
    switch (handleIdx) {
      case 0: // NW
        x += dx; y += dy; width -= dx; height -= dy; break;
      case 1: // N
        y += dy; height -= dy; break;
      case 2: // NE
        width += dx; y += dy; height -= dy; break;
      case 3: // E
        width += dx; break;
      case 4: // SE
        width += dx; height += dy; break;
      case 5: // S
        height += dy; break;
      case 6: // SW
        x += dx; width -= dx; height += dy; break;
      case 7: // W
        x += dx; width -= dx; break;
    }
    return clampRect({ x, y, width, height });
  }

  function redraw() {
    const s = getDisplayScale();
    const dims = getImageDims();
    renderCropOverlay(overlayCanvas, s, cropRect, dims.width, dims.height);
  }

  function start() {
    active = true;
    const dims = getImageDims();
    // Default crop: 80% centered
    const margin = 0.1;
    cropRect = clampRect({
      x: dims.width * margin,
      y: dims.height * margin,
      width: dims.width * (1 - 2 * margin),
      height: dims.height * (1 - 2 * margin),
    });
    overlayCanvas.classList.add('crop-active');
    overlayCanvas.addEventListener('mousedown', onMouseDown);
    overlayCanvas.addEventListener('mousemove', onMouseMove);
    overlayCanvas.addEventListener('mouseup', onMouseUp);
    overlayCanvas.addEventListener('mouseleave', onMouseUp);
    redraw();
    if (callbacks.onCropChange) callbacks.onCropChange(cropRect);
  }

  function stop() {
    active = false;
    overlayCanvas.classList.remove('crop-active');
    overlayCanvas.removeEventListener('mousedown', onMouseDown);
    overlayCanvas.removeEventListener('mousemove', onMouseMove);
    overlayCanvas.removeEventListener('mouseup', onMouseUp);
    overlayCanvas.removeEventListener('mouseleave', onMouseUp);
    overlayCanvas.style.cursor = '';
  }

  function getCropRect() {
    return cropRect;
  }

  function reset() {
    cropRect = null;
    stop();
    const ctx = overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    if (callbacks.onCropReset) callbacks.onCropReset();
  }

  return { start, stop, getCropRect, reset };
}
