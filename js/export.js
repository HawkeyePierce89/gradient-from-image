/**
 * Export: CSS gradient, color list, JSON. Clipboard + toast.
 */

export function buildCssGradient(points) {
  if (!points || points.length === 0) return '';
  const stops = points.map(p => `${p.hex} ${p.percent}%`).join(', ');
  return `linear-gradient(to right, ${stops})`;
}

export function buildColorsList(points) {
  if (!points || points.length === 0) return '';
  return points.map(p => p.hex).join(', ');
}

export function buildJson(points) {
  if (!points || points.length === 0) return '[]';
  const data = points.map(p => ({
    percent: p.percent,
    x: p.x,
    y: p.y,
    hex: p.hex,
    r: p.r,
    g: p.g,
    b: p.b,
  }));
  return JSON.stringify(data, null, 2);
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

let toastTimer = null;

export function showToast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}
