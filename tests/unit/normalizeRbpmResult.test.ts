import { describe, expect, it } from 'vitest';
import { normalizeRbpmResult } from '../../src/app/audio/rbpm/normalizeRbpmResult';

describe('normalizeRbpmResult', () => {
  it('normalizes a valid ranked candidate list', () => {
    const result = normalizeRbpmResult(
      [
        { tempo: 128, count: 20, confidence: 0.9 },
        { tempo: 96, count: 5, confidence: 0.3 },
      ],
      20,
    );
    expect(result).toMatchObject({ engine: 'rbpm', bpm: 128, sampleCount: 20, analyzedDurationSeconds: 20 });
    expect(result?.rawCandidates).toHaveLength(2);
    expect(result?.dominance).toBeCloseTo((20 - 5) / 20);
  });

  it('returns null for an empty candidate list', () => {
    expect(normalizeRbpmResult([], 10)).toBeNull();
  });

  it('filters out NaN/zero/negative tempo or count entries', () => {
    const result = normalizeRbpmResult(
      [
        { tempo: NaN, count: 10, confidence: 0.5 },
        { tempo: 0, count: 10, confidence: 0.5 },
        { tempo: -20, count: 10, confidence: 0.5 },
        { tempo: 120, count: 0, confidence: 0.5 },
        { tempo: 128, count: 12, confidence: 0.8 },
      ],
      10,
    );
    expect(result?.bpm).toBe(128);
    expect(result?.rawCandidates).toHaveLength(1);
  });

  it('returns null when every candidate is invalid', () => {
    expect(normalizeRbpmResult([{ tempo: NaN, count: 10, confidence: 0.5 }], 10)).toBeNull();
  });

  it('defaults a missing/non-finite confidence field to 0 instead of throwing', () => {
    const result = normalizeRbpmResult(
      [{ tempo: 120, count: 10 } as unknown as { tempo: number; count: number; confidence: number }],
      10,
    );
    expect(result?.rawCandidates[0]?.confidence).toBe(0);
  });

  it('treats a single candidate (no runner-up) as fully dominant', () => {
    const result = normalizeRbpmResult([{ tempo: 120, count: 10, confidence: 0.8 }], 10);
    expect(result?.dominance).toBe(1);
  });
});
