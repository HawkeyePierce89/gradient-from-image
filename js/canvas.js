/**
 * Image loading and canvas operations.
 */

export function loadImage(file) {
  return new Promise((resolve, reject) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      reject(new Error('Unsupported format. Use PNG, JPEG, or WEBP.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export function setupDisplayCanvas(img, canvas, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return { scale, width: w, height: h };
}

export function setupAnalysisCanvas(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  return { canvas, ctx, imageData };
}

export function applyCrop(img, cropRect) {
  const canvas = document.createElement('canvas');
  canvas.width = cropRect.width;
  canvas.height = cropRect.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    img,
    cropRect.x, cropRect.y, cropRect.width, cropRect.height,
    0, 0, cropRect.width, cropRect.height
  );
  return canvas;
}

export function getImageOrientation(w, h) {
  if (w > h) return 'horizontal';
  if (h > w) return 'vertical';
  return 'square';
}
