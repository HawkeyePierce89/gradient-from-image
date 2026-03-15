/**
 * Main entry point: state management, event wiring, reactive updates.
 */
import { loadImage, setupDisplayCanvas, setupAnalysisCanvas, applyCrop, getImageOrientation } from './canvas.js';
import { buildLineFromSettings } from './geometry.js';
import { sampleColorsAlongLine } from './color.js';
import { buildCssGradient, buildColorsList, buildJson, copyToClipboard, showToast } from './export.js';
import { renderOverlay } from './overlay.js';
import { initCrop } from './crop.js';
import { initZoom } from './zoom.js';

// ── State ──
const state = {
  originalImage: null,
  workingImage: null,  // after crop, or same as original
  imageData: null,
  imageWidth: 0,
  imageHeight: 0,
  displayScale: 1,
  settings: {
    direction: 'horizontal',
    traversalDirection: 'forward',
    offsetPercent: 50,
    stepPercent: 10,
    sampleAreaSize: 1,
  },
  cropMode: false,
  sampledPoints: [],
};

// ── DOM refs ──
const $ = id => document.getElementById(id);
const uploadZone = $('uploadZone');
const uploadBtn = $('uploadBtn');
const fileInput = $('fileInput');
const canvasViewport = $('canvasViewport');
const canvasContainer = $('canvasContainer');
const displayCanvas = $('displayCanvas');
const overlayCanvas = $('overlayCanvas');
const imageToolbar = $('imageToolbar');
const imageDimensions = $('imageDimensions');
const imageOrientationEl = $('imageOrientation');
const startCropBtn = $('startCropBtn');
const applyCropBtn = $('applyCropBtn');
const resetCropBtn = $('resetCropBtn');
const zoomInBtn = $('zoomInBtn');
const zoomOutBtn = $('zoomOutBtn');
const zoomResetBtn = $('zoomResetBtn');
const zoomLevelEl = $('zoomLevel');
const gradientPreview = $('gradientPreview');
const colorList = $('colorList');
const copyCssBtn = $('copyCssBtn');
const copyColorsBtn = $('copyColorsBtn');
const copyJsonBtn = $('copyJsonBtn');
const offsetSlider = $('offsetSlider');
const offsetInput = $('offsetInput');
const offsetValue = $('offsetValue');
const stepSlider = $('stepSlider');
const stepInput = $('stepInput');
const stepValue = $('stepValue');

// ── Crop manager + Zoom ──
let cropManager = null;
let zoomManager = null;

// ── Image Loading ──
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

// Drag & drop
uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

async function handleFile(file) {
  try {
    const img = await loadImage(file);
    state.originalImage = img;
    state.workingImage = img;
    showImageUI(img);
    updateAnalysis();
  } catch (err) {
    showToast(err.message);
  }
}

function showImageUI(img) {
  uploadZone.hidden = true;
  canvasViewport.hidden = false;
  imageToolbar.hidden = false;

  // Use native resolution for display canvas (no downscaling — zoom handles fitting)
  const maxDisplayW = Math.min(img.width, 2000);
  const displayScale = maxDisplayW / img.width;
  const width = Math.round(img.width * displayScale);
  const height = Math.round(img.height * displayScale);

  const { scale } = setupDisplayCanvas(img, displayCanvas, maxDisplayW, maxDisplayW);
  overlayCanvas.width = displayCanvas.width;
  overlayCanvas.height = displayCanvas.height;
  state.displayScale = scale;
  state.imageWidth = img.width;
  state.imageHeight = img.height;

  const analysis = setupAnalysisCanvas(img);
  state.imageData = analysis.imageData;

  imageDimensions.textContent = `${img.width} × ${img.height}px`;
  imageOrientationEl.textContent = getImageOrientation(img.width, img.height);

  // Init or update zoom
  if (!zoomManager) {
    zoomManager = initZoom(canvasViewport, canvasContainer, {
      onZoomChange: (zoom, fitZoom) => {
        zoomLevelEl.textContent = `${Math.round(zoom * 100 / fitZoom * fitZoom / fitZoom * 100)}%`;
        // Show actual zoom relative to fit
        const pct = Math.round((zoom / fitZoom) * 100);
        zoomLevelEl.textContent = `${pct}%`;
      }
    });
  }
  zoomManager.setCanvasSize(displayCanvas.width, displayCanvas.height);

  // Re-init crop manager
  cropManager = initCrop(
    overlayCanvas,
    () => state.displayScale,
    () => ({ width: state.imageWidth, height: state.imageHeight }),
    zoomManager.viewportToCanvas,
    canvasViewport,
    {
      onCropChange: () => {},
      onCropReset: () => {
        state.workingImage = state.originalImage;
        showImageUI(state.originalImage);
        updateAnalysis();
      }
    }
  );
}

// ── Crop ──
startCropBtn.addEventListener('click', () => {
  if (!state.originalImage) return;
  state.cropMode = true;
  cropManager.start();
  startCropBtn.hidden = true;
  applyCropBtn.hidden = false;
  resetCropBtn.hidden = false;
});

applyCropBtn.addEventListener('click', () => {
  if (!cropManager) return;
  const rect = cropManager.getCropRect();
  if (!rect) return;

  cropManager.stop();
  state.cropMode = false;

  // Apply crop: create a new image from cropped canvas
  const croppedCanvas = applyCrop(state.originalImage, rect);
  const croppedImg = new Image();
  croppedImg.onload = () => {
    state.workingImage = croppedImg;
    showImageUI(croppedImg);
    updateAnalysis();
    startCropBtn.hidden = false;
    applyCropBtn.hidden = true;
    resetCropBtn.hidden = false;
  };
  croppedImg.src = croppedCanvas.toDataURL();
});

resetCropBtn.addEventListener('click', () => {
  if (cropManager) cropManager.reset();
  state.cropMode = false;
  state.workingImage = state.originalImage;
  showImageUI(state.originalImage);
  updateAnalysis();
  startCropBtn.hidden = false;
  applyCropBtn.hidden = true;
  resetCropBtn.hidden = true;
});

// ── Zoom ──
zoomInBtn.addEventListener('click', () => { if (zoomManager) zoomManager.zoomIn(); });
zoomOutBtn.addEventListener('click', () => { if (zoomManager) zoomManager.zoomOut(); });
zoomResetBtn.addEventListener('click', () => { if (zoomManager) zoomManager.fitToView(); });

// ── Settings ──
// Direction
document.querySelectorAll('input[name="direction"]').forEach(radio => {
  radio.addEventListener('change', () => {
    state.settings.direction = radio.value;
    updateAnalysis();
  });
});

// Traversal
document.querySelectorAll('input[name="traversal"]').forEach(radio => {
  radio.addEventListener('change', () => {
    state.settings.traversalDirection = radio.value;
    updateAnalysis();
  });
});

// Offset
offsetSlider.addEventListener('input', () => {
  const v = parseFloat(offsetSlider.value);
  offsetInput.value = v;
  offsetValue.textContent = `${v}%`;
  state.settings.offsetPercent = v;
  updateAnalysis();
});
offsetInput.addEventListener('input', () => {
  let v = parseFloat(offsetInput.value);
  if (isNaN(v)) v = 50;
  v = Math.max(0, Math.min(100, v));
  offsetSlider.value = v;
  offsetValue.textContent = `${v}%`;
  state.settings.offsetPercent = v;
  updateAnalysis();
});

// Step
stepSlider.addEventListener('input', () => {
  const v = parseInt(stepSlider.value, 10);
  stepInput.value = v;
  stepValue.textContent = `${v}%`;
  state.settings.stepPercent = v;
  updateAnalysis();
});
stepInput.addEventListener('input', () => {
  let v = parseInt(stepInput.value, 10);
  if (isNaN(v) || v < 1) v = 10;
  v = Math.max(1, Math.min(100, v));
  stepSlider.value = Math.min(v, 50);
  stepValue.textContent = `${v}%`;
  state.settings.stepPercent = v;
  updateAnalysis();
});

// Sample size
document.querySelectorAll('input[name="sampleSize"]').forEach(radio => {
  radio.addEventListener('change', () => {
    state.settings.sampleAreaSize = parseInt(radio.value, 10);
    updateAnalysis();
  });
});

// ── Core Analysis ──
function updateAnalysis() {
  if (!state.imageData || state.cropMode) return;

  const line = buildLineFromSettings(state.imageWidth, state.imageHeight, state.settings);
  const points = sampleColorsAlongLine(state.imageData, state.imageWidth, state.imageHeight, line, state.settings);
  state.sampledPoints = points;

  renderGradient(points);
  renderColorList(points);
  renderOverlay(overlayCanvas, state.displayScale, line, points, state.imageWidth, state.imageHeight);
  updateCopyButtons(points.length > 0);
}

function renderGradient(points) {
  if (!points || points.length === 0) {
    gradientPreview.style.background = '';
    gradientPreview.innerHTML = '<span class="placeholder-text">No colors sampled</span>';
    return;
  }
  gradientPreview.innerHTML = '';
  gradientPreview.style.background = buildCssGradient(points);
}

function renderColorList(points) {
  if (!points || points.length === 0) {
    colorList.innerHTML = '<span class="placeholder-text">No colors sampled yet</span>';
    return;
  }
  colorList.innerHTML = points.map(p =>
    `<div class="color-row">
      <span class="color-swatch" style="background: ${p.hex}"></span>
      <span>${p.percent}% — (${p.x}, ${p.y}) — ${p.hex} — rgb(${p.r}, ${p.g}, ${p.b})</span>
    </div>`
  ).join('');
}

function updateCopyButtons(enabled) {
  copyCssBtn.disabled = !enabled;
  copyColorsBtn.disabled = !enabled;
  copyJsonBtn.disabled = !enabled;
}

// ── Copy ──
copyCssBtn.addEventListener('click', async () => {
  const css = buildCssGradient(state.sampledPoints);
  await copyToClipboard(css);
  showToast('Copied CSS gradient!');
});

copyColorsBtn.addEventListener('click', async () => {
  const colors = buildColorsList(state.sampledPoints);
  await copyToClipboard(colors);
  showToast('Copied colors!');
});

copyJsonBtn.addEventListener('click', async () => {
  const json = buildJson(state.sampledPoints);
  await copyToClipboard(json);
  showToast('Copied JSON!');
});
