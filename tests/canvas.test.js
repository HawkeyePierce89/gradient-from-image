import { describe, it, expect } from 'vitest';
import { getImageOrientation } from '../js/canvas.js';

describe('getImageOrientation', () => {
  it('returns "horizontal" for landscape image', () => {
    expect(getImageOrientation(1920, 1080)).toBe('horizontal');
  });

  it('returns "vertical" for portrait image', () => {
    expect(getImageOrientation(1080, 1920)).toBe('vertical');
  });

  it('returns "square" for equal dimensions', () => {
    expect(getImageOrientation(500, 500)).toBe('square');
  });

  it('returns "horizontal" for very wide image', () => {
    expect(getImageOrientation(1634, 140)).toBe('horizontal');
  });

  it('returns "vertical" for very tall image', () => {
    expect(getImageOrientation(100, 2000)).toBe('vertical');
  });

  it('returns "square" for 1x1', () => {
    expect(getImageOrientation(1, 1)).toBe('square');
  });
});
