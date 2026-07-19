import { describe, expect, it } from 'vitest';
import { getCtaAriaLabel, getCtaLabel } from '../../src/app/lib/ctaLabels';

describe('CTA labels', () => {
  it('Ready -> START / "Start metronome"', () => {
    expect(getCtaLabel('Ready')).toBe('START');
    expect(getCtaAriaLabel('Ready')).toBe('Start metronome');
  });

  it('Playing -> PAUSE / "Pause metronome"', () => {
    expect(getCtaLabel('Playing')).toBe('PAUSE');
    expect(getCtaAriaLabel('Playing')).toBe('Pause metronome');
  });

  it('Paused -> RESTART / "Restart from count 1"', () => {
    expect(getCtaLabel('Paused')).toBe('RESTART');
    expect(getCtaAriaLabel('Paused')).toBe('Restart from count 1');
  });

  it('never produces the string RESUME', () => {
    for (const status of ['Ready', 'Playing', 'Paused'] as const) {
      expect(getCtaLabel(status)).not.toMatch(/resume/i);
      expect(getCtaAriaLabel(status)).not.toMatch(/resume/i);
    }
  });
});
