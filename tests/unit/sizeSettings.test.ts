import { describe, expect, it } from 'vitest';
import { clampShapeScale, clampVisualScale, formatScalePercent } from '../../src/app/lib/sizeSettings';
import { DEFAULT_VISUAL_SIZE_SETTINGS } from '../../src/app/engine/types';

describe('default size settings', () => {
  it('defaults both scales to 1 (100%)', () => {
    expect(DEFAULT_VISUAL_SIZE_SETTINGS).toEqual({ visualScale: 1, shapeScale: 1 });
  });
});

describe('clampVisualScale', () => {
  it('clamps to the 70%-130% range', () => {
    expect(clampVisualScale(0.5)).toBe(0.7);
    expect(clampVisualScale(2)).toBe(1.3);
    expect(clampVisualScale(1.1)).toBe(1.1);
  });
});

describe('clampShapeScale', () => {
  it('clamps to the 60%-160% range', () => {
    expect(clampShapeScale(0.1)).toBe(0.6);
    expect(clampShapeScale(3)).toBe(1.6);
    expect(clampShapeScale(1.2)).toBe(1.2);
  });
});

describe('formatScalePercent', () => {
  it('formats a scale factor as a rounded percent string', () => {
    expect(formatScalePercent(1)).toBe('100%');
    expect(formatScalePercent(0.7)).toBe('70%');
    expect(formatScalePercent(1.6)).toBe('160%');
  });
});
