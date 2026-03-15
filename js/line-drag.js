/**
 * Line drag: drag the sampling line directly on the canvas to change offset.
 *
 * The overlay canvas has pointer-events:none by default, so we listen on the
 * viewport for hover detection and mousedown.  During an active drag we
 * capture moves/up on window so the drag continues even outside the viewport.
 */

/**
 * @param {Object} opts
 * @param {HTMLCanvasElement} opts.overlayCanvas
 * @param {Function} opts.getState - returns { direction, displayScale, imageWidth, imageHeight, cropMode, offsetPercent, line }
 * @param {Function} opts.viewportToCanvas - (vx, vy) => { x, y } in canvas pixel coords
 * @param {Function} opts.onOffsetChange - (newOffsetPercent) => void
 * @param {HTMLElement} opts.viewport - the canvasViewport element
 * @returns {{ destroy(): void }}
 */
export function initLineDrag({ overlayCanvas, getState, viewportToCanvas, onOffsetChange, viewport }) {
  const HIT_THRESHOLD_PX = 8;
  let dragging = false;

  /** Convert viewport mouse event to image-space coordinates */
  function mouseToImage(e) {
    const rect = viewport.getBoundingClientRect();
    const vx = e.clientX - rect.left;
    const vy = e.clientY - rect.top;
    const canvasCoords = viewportToCanvas(vx, vy);
    const s = getState();
    return {
      x: canvasCoords.x / s.displayScale,
      y: canvasCoords.y / s.displayScale,
    };
  }

  /** Distance from point to line segment */
  function distToLine(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function isNearLine(e) {
    const s = getState();
    if (s.cropMode || !s.line) return false;
    const imgPt = mouseToImage(e);
    const dist = distToLine(imgPt.x, imgPt.y, s.line.x1, s.line.y1, s.line.x2, s.line.y2);
    const thresholdInImage = HIT_THRESHOLD_PX / s.displayScale;
    return dist <= thresholdInImage;
  }

  function getCursor(direction) {
    switch (direction) {
      case 'horizontal': return 'ns-resize';
      case 'vertical': return 'ew-resize';
      default: return 'move';
    }
  }

  function mouseToOffset(e) {
    const s = getState();
    const imgPt = mouseToImage(e);

    switch (s.direction) {
      case 'horizontal':
        return (imgPt.y / (s.imageHeight - 1)) * 100;
      case 'vertical':
        return (imgPt.x / (s.imageWidth - 1)) * 100;
      case 'diagonal-tl-br':
      case 'diagonal-tr-bl': {
        const w = s.imageWidth - 1;
        const h = s.imageHeight - 1;
        const isDiagTLBR = s.direction === 'diagonal-tl-br';
        const bx1 = isDiagTLBR ? 0 : w;
        const by1 = 0;
        const bx2 = isDiagTLBR ? w : 0;
        const by2 = h;
        const dx = bx2 - bx1;
        const dy = by2 - by1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return 50;
        const nx = -dy / len;
        const ny = dx / len;
        const midX = (bx1 + bx2) / 2;
        const midY = (by1 + by2) / 2;
        const projDist = (imgPt.x - midX) * nx + (imgPt.y - midY) * ny;
        const maxOffset = Math.min(s.imageWidth, s.imageHeight) / 2;
        return ((projDist / maxOffset) * 50) + 50;
      }
      default:
        return s.offsetPercent;
    }
  }

  function quantize(val) {
    val = Math.round(val * 10) / 10;
    return Math.max(0, Math.min(100, val));
  }

  // --- Listen on viewport (which receives pointer events) ---

  function onViewportMouseMove(e) {
    if (dragging) return; // global handler takes over during drag
    const s = getState();
    if (s.cropMode) {
      viewport.style.cursor = '';
      return;
    }
    if (isNearLine(e)) {
      viewport.style.cursor = getCursor(s.direction);
    } else {
      viewport.style.cursor = '';
    }
  }

  function onViewportMouseDown(e) {
    if (e.button !== 0) return;
    const s = getState();
    if (s.cropMode) return;
    // Check for crop-active overlay — don't interfere
    if (overlayCanvas.classList.contains('crop-active')) return;

    if (isNearLine(e)) {
      dragging = true;
      viewport.style.cursor = getCursor(s.direction);
      // Prevent zoom pan from starting
      e.stopPropagation();
      e.preventDefault();
      // Apply offset immediately
      onOffsetChange(quantize(mouseToOffset(e)));
    }
  }

  function onWindowMouseMove(e) {
    if (!dragging) return;
    onOffsetChange(quantize(mouseToOffset(e)));
  }

  function onWindowMouseUp() {
    if (dragging) {
      dragging = false;
      viewport.style.cursor = '';
    }
  }

  // Use capture phase so we intercept before the zoom pan handler
  viewport.addEventListener('mousemove', onViewportMouseMove, true);
  viewport.addEventListener('mousedown', onViewportMouseDown, true);
  window.addEventListener('mousemove', onWindowMouseMove);
  window.addEventListener('mouseup', onWindowMouseUp);

  function destroy() {
    viewport.removeEventListener('mousemove', onViewportMouseMove, true);
    viewport.removeEventListener('mousedown', onViewportMouseDown, true);
    window.removeEventListener('mousemove', onWindowMouseMove);
    window.removeEventListener('mouseup', onWindowMouseUp);
    dragging = false;
  }

  return { destroy };
}
