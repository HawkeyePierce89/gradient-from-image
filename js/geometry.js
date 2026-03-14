/**
 * Line geometry: building lines from settings, sampling percents, point interpolation.
 */

export function buildLineFromSettings(imageWidth, imageHeight, settings) {
  const w = imageWidth - 1;
  const h = imageHeight - 1;
  const offset = clampValue(settings.offsetPercent, 0, 100);
  let line;

  switch (settings.direction) {
    case 'horizontal': {
      const y = Math.round(h * offset / 100);
      line = { x1: 0, y1: y, x2: w, y2: y };
      break;
    }
    case 'vertical': {
      const x = Math.round(w * offset / 100);
      line = { x1: x, y1: 0, x2: x, y2: h };
      break;
    }
    case 'diagonal-tl-br': {
      line = applyDiagonalOffset(
        { x1: 0, y1: 0, x2: w, y2: h },
        offset, imageWidth, imageHeight
      );
      break;
    }
    case 'diagonal-tr-bl': {
      line = applyDiagonalOffset(
        { x1: w, y1: 0, x2: 0, y2: h },
        offset, imageWidth, imageHeight
      );
      break;
    }
    default:
      line = { x1: 0, y1: Math.round(h / 2), x2: w, y2: Math.round(h / 2) };
  }

  if (settings.traversalDirection === 'reverse') {
    line = { x1: line.x2, y1: line.y2, x2: line.x1, y2: line.y1 };
  }

  return clampLineToBounds(line, imageWidth, imageHeight);
}

function applyDiagonalOffset(baseLine, offsetPercent, imgW, imgH) {
  const dx = baseLine.x2 - baseLine.x1;
  const dy = baseLine.y2 - baseLine.y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return baseLine;

  // Normal vector (perpendicular to line direction)
  let nx = -dy / len;
  let ny = dx / len;

  // Max safe offset: half the shorter dimension
  const maxOffset = Math.min(imgW, imgH) / 2;

  // offsetPercent 50 = no shift, 0 = full negative, 100 = full positive
  const offsetPx = ((offsetPercent - 50) / 50) * maxOffset;

  return {
    x1: Math.round(baseLine.x1 + nx * offsetPx),
    y1: Math.round(baseLine.y1 + ny * offsetPx),
    x2: Math.round(baseLine.x2 + nx * offsetPx),
    y2: Math.round(baseLine.y2 + ny * offsetPx),
  };
}

export function clampLineToBounds(line, imageWidth, imageHeight) {
  return {
    x1: clampValue(line.x1, 0, imageWidth - 1),
    y1: clampValue(line.y1, 0, imageHeight - 1),
    x2: clampValue(line.x2, 0, imageWidth - 1),
    y2: clampValue(line.y2, 0, imageHeight - 1),
  };
}

export function getSamplingPercents(stepPercent) {
  let step = stepPercent;
  if (!step || step <= 0 || !isFinite(step)) step = 10;
  step = clampValue(step, 1, 100);

  const percents = [];
  for (let p = 0; p <= 100; p += step) {
    percents.push(Math.round(p * 100) / 100); // avoid float drift
  }
  // Always include 100%
  if (percents[percents.length - 1] < 100) {
    percents.push(100);
  }
  return percents;
}

export function getPointOnLine(line, t) {
  return {
    x: Math.round(line.x1 + t * (line.x2 - line.x1)),
    y: Math.round(line.y1 + t * (line.y2 - line.y1)),
  };
}

function clampValue(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
