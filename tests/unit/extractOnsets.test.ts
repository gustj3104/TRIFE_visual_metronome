import { describe, expect, it } from 'vitest';
import { extractOnsets } from '../../src/app/audio/extractOnsets';
import { generateClickTrack, generateSilence } from './helpers/syntheticAudio';

describe('extractOnsets', () => {
  it('finds onsets close to the true click times of a steady click track', () => {
    const sampleRate = 44100;
    const bpm = 120;
    const samples = generateClickTrack(bpm, 8, sampleRate);
    const onsets = extractOnsets(samples, sampleRate);

    expect(onsets.length).toBeGreaterThanOrEqual(6);

    const beatIntervalSec = 60 / bpm;
    for (let i = 1; i < onsets.length; i++) {
      const interval = (onsets[i] ?? 0) - (onsets[i - 1] ?? 0);
      // Each detected inter-onset interval should be close to a whole
      // multiple of the true beat interval (missed onsets are tolerated).
      const ratio = interval / beatIntervalSec;
      expect(Math.abs(ratio - Math.round(ratio))).toBeLessThan(0.15);
    }
  });

  it('finds no onsets in silence', () => {
    const onsets = extractOnsets(generateSilence(4), 44100);
    expect(onsets).toEqual([]);
  });

  it('returns an empty array for a signal shorter than one frame', () => {
    const onsets = extractOnsets(new Float32Array(10), 44100);
    expect(onsets).toEqual([]);
  });
});
