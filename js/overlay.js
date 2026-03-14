/**
 * Overlay: draw analysis line and sample points on the display canvas.
 */

export function renderOverlay(overlayCanvas, displayScale, line, sampledPoints, imageWidth, imageHeight) {
  const ctx = overlayCanvas.getContext('2d');
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  if (!line || !sampledPoints || sampledPoints.length === 0) return;

  const s = displayScale;

  // Draw line with shadow for contrast
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 3;
  ctx.beginPath();
  ctx.moveTo(line.x1 * s, line.y1 * s);
  ctx.lineTo(line.x2 * s, line.y2 * s);
  ctx.stroke();
  ctx.restore();

  // Draw sample points
  for (const point of sampledPoints) {
    const px = point.x * s;
    const py = point.y * s;
    const radius = 5;

    // Outer ring (white)
    ctx.beginPath();
    ctx.arc(px, py, radius + 1.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();

    // Inner circle (sampled color)
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fillStyle = point.hex;
    ctx.fill();

    // Percent label
    ctx.save();
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 3;
    ctx.textAlign = 'center';
    ctx.fillText(`${point.percent}%`, px, py - 10);
    ctx.restore();
  }
}

export function renderCropOverlay(overlayCanvas, displayScale, cropRect, imageWidth, imageHeight) {
  const ctx = overlayCanvas.getContext('2d');
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  if (!cropRect) return;

  const s = displayScale;
  const cx = cropRect.x * s;
  const cy = cropRect.y * s;
  const cw = cropRect.width * s;
  const ch = cropRect.height * s;

  // Dim area outside crop
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  // Top
  ctx.fillRect(0, 0, overlayCanvas.width, cy);
  // Bottom
  ctx.fillRect(0, cy + ch, overlayCanvas.width, overlayCanvas.height - cy - ch);
  // Left
  ctx.fillRect(0, cy, cx, ch);
  // Right
  ctx.fillRect(cx + cw, cy, overlayCanvas.width - cx - cw, ch);

  // Crop border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 3]);
  ctx.strokeRect(cx, cy, cw, ch);
  ctx.setLineDash([]);

  // Resize handles
  const handleSize = 8;
  const handles = getCropHandles(cx, cy, cw, ch, handleSize);
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'var(--accent)';
  for (const h of handles) {
    ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
  }

  // Dimensions label
  ctx.save();
  ctx.font = '11px -apple-system, sans-serif';
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 3;
  ctx.textAlign = 'center';
  ctx.fillText(
    `${cropRect.width} × ${cropRect.height}`,
    cx + cw / 2,
    cy - 8
  );
  ctx.restore();
}

function getCropHandles(cx, cy, cw, ch, _size) {
  return [
    { x: cx, y: cy, cursor: 'nw-resize' },
    { x: cx + cw / 2, y: cy, cursor: 'n-resize' },
    { x: cx + cw, y: cy, cursor: 'ne-resize' },
    { x: cx + cw, y: cy + ch / 2, cursor: 'e-resize' },
    { x: cx + cw, y: cy + ch, cursor: 'se-resize' },
    { x: cx + cw / 2, y: cy + ch, cursor: 's-resize' },
    { x: cx, y: cy + ch, cursor: 'sw-resize' },
    { x: cx, y: cy + ch / 2, cursor: 'w-resize' },
  ];
}

export { getCropHandles };
