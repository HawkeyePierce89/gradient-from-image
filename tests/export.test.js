import { describe, it, expect } from 'vitest';
import { buildCssGradient, buildColorsList, buildJson } from '../js/export.js';

const samplePoints = [
  { percent: 0, x: 0, y: 50, r: 255, g: 0, b: 0, hex: '#ff0000' },
  { percent: 50, x: 100, y: 50, r: 0, g: 255, b: 0, hex: '#00ff00' },
  { percent: 100, x: 200, y: 50, r: 0, g: 0, b: 255, hex: '#0000ff' },
];

describe('buildCssGradient', () => {
  it('returns empty string for empty array', () => {
    expect(buildCssGradient([])).toBe('');
  });

  it('returns empty string for null', () => {
    expect(buildCssGradient(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(buildCssGradient(undefined)).toBe('');
  });

  it('builds correct CSS gradient string', () => {
    const result = buildCssGradient(samplePoints);
    expect(result).toBe('linear-gradient(to right, #ff0000 0%, #00ff00 50%, #0000ff 100%)');
  });

  it('works with a single point', () => {
    const result = buildCssGradient([samplePoints[0]]);
    expect(result).toBe('linear-gradient(to right, #ff0000 0%)');
  });

  it('includes all stops', () => {
    const result = buildCssGradient(samplePoints);
    expect(result).toContain('#ff0000 0%');
    expect(result).toContain('#00ff00 50%');
    expect(result).toContain('#0000ff 100%');
  });
});

describe('buildColorsList', () => {
  it('returns empty string for empty array', () => {
    expect(buildColorsList([])).toBe('');
  });

  it('returns empty string for null', () => {
    expect(buildColorsList(null)).toBe('');
  });

  it('returns comma-separated hex values', () => {
    const result = buildColorsList(samplePoints);
    expect(result).toBe('#ff0000, #00ff00, #0000ff');
  });

  it('works with a single point', () => {
    const result = buildColorsList([samplePoints[0]]);
    expect(result).toBe('#ff0000');
  });
});

describe('buildJson', () => {
  it('returns "[]" for empty array', () => {
    expect(buildJson([])).toBe('[]');
  });

  it('returns "[]" for null', () => {
    expect(buildJson(null)).toBe('[]');
  });

  it('returns valid JSON', () => {
    const result = buildJson(samplePoints);
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('includes correct fields in JSON output', () => {
    const result = JSON.parse(buildJson(samplePoints));
    expect(result.length).toBe(3);
    expect(result[0]).toEqual({
      percent: 0,
      x: 0,
      y: 50,
      hex: '#ff0000',
      r: 255,
      g: 0,
      b: 0,
    });
  });

  it('does not include extra fields like t', () => {
    const pointsWithT = [{ ...samplePoints[0], t: 0 }];
    const result = JSON.parse(buildJson(pointsWithT));
    expect(result[0]).not.toHaveProperty('t');
  });

  it('is pretty-printed with 2-space indent', () => {
    const result = buildJson(samplePoints);
    expect(result).toContain('\n');
    expect(result).toContain('  ');
  });
});
