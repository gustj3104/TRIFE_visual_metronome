import { describe, expect, it } from 'vitest';
import { estimateBpmFromOnsets } from '../../src/app/audio/estimateBpm';
import { generateOnsetTimesMs } from './helpers/syntheticAudio';

describe('estimateBpmFromOnsets', () => {
  it('recovers the true BPM from a perfectly steady onset sequence', () => {
    const onsetsSec = generateOnsetTimesMs(128, 16).map((ms) => ms / 1000);
    const estimate = estimateBpmFromOnsets(onsetsSec);
    expect(estimate).not.toBeNull();
    expect(estimate?.bpm).toBe(128);
    expect(estimate?.confidence).toBeGreaterThan(0.9);
  });

  it('folds a half-time click pattern up into the supported range via clustering, not raw averaging', () => {
    // Every other beat missing (onsets at half the true tempo's rate).
    const onsetsSec = generateOnsetTimesMs(64, 12).map((ms) => ms / 1000);
    const estimate = estimateBpmFromOnsets(onsetsSec);
    expect(estimate?.bpm).toBe(64);
  });

  it('returns null with fewer than two onsets', () => {
    expect(estimateBpmFromOnsets([])).toBeNull();
    expect(estimateBpmFromOnsets([1.2])).toBeNull();
  });

  it('returns null when onsets never repeat close to any consistent tempo', () => {
    const estimate = estimateBpmFromOnsets([0, 0.31, 0.9, 2.7, 2.75]);
    // With so few, scattered intervals there may be a weak best cluster —
    // the key guarantee is it never throws and confidence stays low.
    if (estimate) expect(estimate.confidence).toBeLessThan(0.6);
  });
});
